import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db, schema } from "@/db";
import { env } from "../env";
import { BudgetExceededError, LlmCallError, LlmDisabledError, budgetStatus, llmEnabled } from "../llm/gateway";
import { costUsd } from "../llm/pricing";
import { modelOf } from "../llm/routing";
import { callSignal, checkpoint } from "../llm/run-control";
import { renderPrompt } from "../prompts";
import { ResearchSchema, getIndustry, readResearch, writeResearch, type IndustryResearch } from "./data";
const SEARCH_USD = 0.01;
const MAX_SEARCHES = 4;
const Out = z.object({
    summary: z.string().min(10),
    patterns: z.array(z.object({ name: z.string().min(2), how: z.string().min(8), example: z.string().default(""), source: z.string().default("") })).min(1),
});
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ maxRetries: 2 }));
export function lastJson(text: string): unknown {
    const t = text.replace(/```(?:json)?/gi, "");
    const start = t.search(/\{\s*"summary"/);
    const at = start >= 0 ? start : t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (at < 0 || end <= at)
        throw new SyntaxError("No JSON object in the answer.");
    return JSON.parse(t.slice(at, end + 1));
}
const clip = (s: string, n: number) => (s.trim().length > n ? `${s.trim().slice(0, n - 1).trimEnd()}…` : s.trim());
const isUrl = (s: string) => /^https?:\/\/[^\s]+$/i.test(s.trim());
export interface ResearchResult {
    research: IndustryResearch;
    searches: number;
    costUsd: number;
}
export async function researchIndustry(brandId: string, industryId: string): Promise<ResearchResult> {
    if (!llmEnabled())
        throw new LlmDisabledError("Researching an industry needs live mode.");
    const industry = getIndustry(industryId);
    if (!industry)
        throw new Error("That industry is not in the list.");
    const { spent, cap } = budgetStatus();
    if (spent >= cap)
        throw new BudgetExceededError(`Spend cap reached: $${spent.toFixed(2)} of $${cap.toFixed(2)}.`);
    checkpoint();
    const had = readResearch(industryId);
    const seeded = industry.patterns.filter((p) => !had?.patterns.some((x) => x.name === p.name));
    const p = renderPrompt("offer-research", { industry: industry.name, known: seeded.map((x) => `- ${x.name}: ${x.how}`).join("\n") || "(nothing yet)" });
    const routed = modelOf("offer_research", env.MODEL_EXTRACT);
    const model = routed.startsWith("claude-") ? routed : env.MODEL_EXTRACT;
    const id = randomUUID();
    const started = Date.now();
    const usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
    let searches = 0;
    let text = "";
    let status: "ok" | "invalid" | "error" = "ok";
    let error: string | null = null;
    let parsed: z.infer<typeof Out> | null = null;
    try {
        const messages: Anthropic.MessageParam[] = [{ role: "user", content: p.user }];
        for (let turn = 0; turn < 3; turn++) {
            const msg = await anthropic()
                .messages.stream({ model, max_tokens: 6000, system: p.system, messages, tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }] }, { signal: callSignal(300000) })
                .finalMessage();
            usage.input_tokens += msg.usage.input_tokens;
            usage.output_tokens += msg.usage.output_tokens;
            usage.cache_read_tokens += msg.usage.cache_read_input_tokens ?? 0;
            usage.cache_write_tokens += msg.usage.cache_creation_input_tokens ?? 0;
            searches += msg.usage.server_tool_use?.web_search_requests ?? 0;
            text += msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
            if (msg.stop_reason !== "pause_turn")
                break;
            messages.push({ role: "assistant", content: msg.content });
        }
        const check = Out.safeParse(lastJson(text));
        if (check.success)
            parsed = check.data;
        else {
            status = "invalid";
            error = check.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        }
    }
    catch (e) {
        status = e instanceof SyntaxError ? "invalid" : "error";
        error = e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : (e as Error).message;
    }
    const cost = costUsd(model, usage) + searches * SEARCH_USD;
    db.insert(schema.llmCalls)
        .values({ id, brand_id: brandId, task: "offer_research", model, ref_type: "industry", ref_id: industryId, attempt: 1, system_prompt: p.system, user_prompt: p.user, response_text: text || null, ...usage, cost_usd: cost, duration_ms: Date.now() - started, status, error })
        .run();
    if (!parsed)
        throw new LlmCallError(`offer_research failed: ${error ?? "no answer"}`, id);
    const patterns = parsed.patterns.slice(0, 8).map((x) => ({ name: clip(x.name, 60), how: clip(x.how, 260), ...(x.example.trim() ? { example: clip(x.example, 260) } : {}), ...(isUrl(x.source) ? { source: x.source.trim() } : {}) }));
    const research = ResearchSchema.parse({ at: new Date().toISOString().slice(0, 10), model, summary: clip(parsed.summary, 500), sources: [...new Set(patterns.map((x) => x.source).filter((s): s is string => !!s))], patterns });
    writeResearch(industryId, research);
    return { research, searches, costUsd: cost };
}
