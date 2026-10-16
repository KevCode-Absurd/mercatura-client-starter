import { sql } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "@/db";
import { env } from "../env";
import { spendCaps } from "../spend-caps";
import type { ResultBudget } from "./packet";
import { withResourceLane } from "../production-ops/lanes";
import { assertProviderReady, deferProvider, paidAttempt } from "../production-ops/attempts";
import { fingerprint } from "../production-ops/store";
import { currentJobId, currentJobSignal, checkpoint } from "./run-control";
import { currentOperationBudget } from "../production-ops/budget-context";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
export class LlmDisabledError extends Error {
}
export class BudgetExceededError extends Error {
}
export class PiiLeakError extends Error {
}
export class LlmCallError extends Error {
    constructor(message: string, public callId: string) {
        super(message);
    }
}
export function llmEnabled(): boolean {
    return env.LLM_MODE === "live" && env.ANTHROPIC_API_KEY.length > 0;
}
export function totalSpend(): number {
    return db.select({ c: sql<number> `coalesce(sum(${schema.llmCalls.cost_usd}), 0)` }).from(schema.llmCalls).get()!.c;
}
export function budgetStatus() {
    const spent = totalSpend();
    const cap = spendCaps().textUsd;
    return { spent, cap, remaining: Math.max(0, cap - spent) };
}
export interface StructuredCall<T extends z.ZodType> {
    brandId: string;
    task: string;
    model: string;
    system: string;
    user: string;
    schema: T;
    effort?: "low" | "medium" | "high";
    maxTokens?: number;
    resultBudget?: ResultBudget;
    refType?: string;
    refId?: string;
    images?: string[];
    video?: string;
    pin?: boolean;
    temperature?: number;
    operationId?: string;
    operationBudget?: {
        id: string;
        capUsd: number;
    };
}
export interface StructuredResult<T> {
    data: T;
    callId: string;
    costUsd: number;
}
export async function callStructured<T extends z.ZodType>(req: StructuredCall<T>): Promise<StructuredResult<z.infer<T>>> {
    const budget = currentOperationBudget();
    if (budget) {
        if (req.operationBudget && (req.operationBudget.id !== budget.id || req.operationBudget.capUsd !== budget.capUsd))
            throw new Error("A helper call cannot replace its operation budget.");
        req = { ...req, operationBudget: budget };
    }
    const { dispatch } = await import("./providers");
    const { routeFor, providerOf } = await import("./routing");
    const provider = providerOf((req.pin ? req : routeFor(req.task, req)).model);
    checkpoint();
    const send = async () => {
        try {
            return await withResourceLane("text", async () => { checkpoint(); assertProviderReady(provider); return dispatch(req); }, { signal: currentJobSignal(), priority: currentJobId() ? "batch" : "interactive" });
        }
        catch (error) {
            if (/\b(?:429|529|503)\b|rate.?limit|overloaded|resource.?exhausted/i.test(String(error)))
                throw deferProvider(provider);
            throw error;
        }
    };
    const operationId = req.operationId ?? (currentJobId() ? `${currentJobId()}:${req.task}:${req.refId ?? ""}:${fingerprint({ system: req.system, user: req.user, model: req.model, images: req.images, video: req.video })}` : undefined);
    const media = operationId ? await Promise.all([...(req.images ?? []), ...(req.video ? [req.video] : [])].map(async (path) => ({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') }))) : undefined;
    const request = { task: req.task, system: req.system, user: req.user, model: req.model, maxTokens: req.maxTokens, images: req.images, video: req.video, media, temperature: req.temperature };
    let reused = false;
    const response = operationId ? await paidAttempt({ id: operationId, brandId: req.brandId, request, onReuse: () => { reused = true; } }, send) : await send();
    if (reused) {
        const raw = db.select({ text: schema.llmCalls.response_text }).from(schema.llmCalls).where(sql `${schema.llmCalls.id}=${response.callId}`).get()?.text;
        let value: unknown = response.data;
        if (raw) {
            try {
                value = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, ''));
            }
            catch {
                throw new Error("The retained raw response is unreadable; no new call was made.");
            }
        }
        const checked = req.schema.safeParse(value);
        if (!checked.success)
            throw new Error("The retained response does not meet the current schema. Review the original attempt; no new call was made.");
        response.data = checked.data;
    }
    if (/concept_suggest|^script$|studio_plan|studio_words|studio_prompt|seo_blog_draft|^lp_write$|standalone_/.test(req.task)) {
        const { recordProviderInput } = await import("../standalone/runtime");
        recordProviderInput(req.brandId, { callId: response.callId, task: req.task, refType: req.refType, refId: req.refId, system: req.system, user: req.user, images: req.images, video: req.video });
    }
    return response;
}
