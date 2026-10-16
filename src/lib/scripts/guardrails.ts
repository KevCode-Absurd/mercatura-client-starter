import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { Guardrail } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { callStructured, llmEnabled } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { rankThemes } from "../ranking";
import { getSetting } from "../settings";
const TOP_N = 15;
const GuardrailsOut = z.object({
    rules: z.array(z.object({ key: z.string(), applies: z.boolean(), rule: z.string(), banned: z.array(z.string()) })),
});
function failureModes(brandId: string) {
    const rows = db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
    return rankThemes(rows, getSetting(brandId, "rank_weights")).filter((t) => t.type === "failure_mode");
}
export function activeGuardrails(brandId: string): {
    theme_id: string;
    label: string;
    guardrail: Guardrail;
}[] {
    return failureModes(brandId)
        .filter((t) => t.guardrail?.applies)
        .map((t) => ({ theme_id: t.id, label: t.label, guardrail: t.guardrail! }));
}
const inFlight = new Map<string, Promise<number>>();
const lastAsked = new Map<string, {
    keys: string;
    at: number;
}>();
const SAME_ASK_MS = 60000;
export function sharedRun<T>(runs: Map<string, Promise<T>>, key: string, make: () => Promise<T>): Promise<T> {
    const have = runs.get(key);
    if (have)
        return have;
    const p = make().finally(() => runs.delete(key));
    runs.set(key, p);
    return p;
}
export function ensureGuardrails(brandId: string): Promise<number> {
    return sharedRun(inFlight, brandId, () => writeGuardrails(brandId));
}
async function writeGuardrails(brandId: string): Promise<number> {
    const todo = failureModes(brandId).slice(0, TOP_N).filter((t) => t.guardrail == null);
    if (!todo.length || !llmEnabled())
        return 0;
    const keys = todo.map((t) => t.id).sort().join(",");
    const last = lastAsked.get(brandId);
    if (last && last.keys === keys && Date.now() - last.at < SAME_ASK_MS)
        return 0;
    lastAsked.set(brandId, { keys, at: Date.now() });
    const brand = loadBrandBrain(brandId);
    const lines = todo.map((t, n) => {
        const quotes = db.select({ quote: schema.insights.quote }).from(schema.insights).where(eq(schema.insights.theme_id, t.id)).orderBy(desc(schema.insights.intensity)).limit(3).all();
        return `g${n + 1} | ${t.label} | ${t.summary} | ${quotes.map((q) => `"${q.quote.replace(/\s+/g, " ").slice(0, 160)}"`).join(" ")}`;
    });
    const p = renderPrompt("guardrails", {
        brand_name: brand.brand.name,
        one_liner: brand.brand.one_liner,
        forbidden: brand.forbidden_claims.join("; ") || "(none)",
        themes: lines.join("\n"),
    });
    const res = await callStructured({ brandId, task: "guardrails", model: env.MODEL_FAST, system: p.system, user: p.user, schema: GuardrailsOut, maxTokens: 4000, refType: "brand", refId: brandId });
    let written = 0;
    todo.forEach((t, n) => {
        const r = res.data.rules.find((x) => x.key.trim() === `g${n + 1}`);
        if (!r)
            return;
        const guardrail: Guardrail = {
            applies: r.applies && !!r.rule.trim(),
            rule: r.rule.trim(),
            banned: r.applies ? [...new Set(r.banned.map((b) => b.trim().toLowerCase()).filter((b) => b.length > 2))].slice(0, 8) : [],
        };
        db.update(schema.themes).set({ guardrail }).where(and(eq(schema.themes.id, t.id), isNull(schema.themes.guardrail))).run();
        written++;
    });
    return written;
}
export function setGuardrail(brandId: string, themeId: string, guardrail: Guardrail | null) {
    db.update(schema.themes).set({ guardrail }).where(and(eq(schema.themes.id, themeId), eq(schema.themes.brand_id, brandId))).run();
}
