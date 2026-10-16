import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import https from "node:https";
import sharp from "sharp";
import { reserveSpend, settleSpend } from "../production-ops/attempts";
import { startSpan, endSpan } from "../production-ops/metrics";
import { currentJobId } from "./run-control";
import { z } from "zod";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { SHARED_BRAND, env } from "../env";
import { findContactPii } from "../pipeline/redact";
import { BudgetExceededError, LlmCallError, LlmDisabledError, PiiLeakError, budgetStatus, type StructuredCall, type StructuredResult, } from "./gateway";
import { brandPack } from "./context";
import { videoFrames, videoMime } from "../media/video-frames";
import { costUsd } from "./pricing";
import { answerRoom, providerRoom, type ProviderHeadroom } from "./packet";
import { cutForLength, moreRoom } from "./room";
import { extraContext, providerOf, routeFor, seesImages, type Effort, type Provider, } from "./routing";
import { RunStoppedError, asStop, callSignal, checkpoint } from "./run-control";
import type { ExtraContext } from "./steps";
export const PER_CALL = "=== PER CALL ===";
export function splitUser(user: string): {
    stable: string;
    perCall: string;
} {
    const at = user.indexOf(PER_CALL);
    return at < 0
        ? { stable: "", perCall: user }
        : {
            stable: user.slice(0, at).trim(),
            perCall: user.slice(at + PER_CALL.length).trim(),
        };
}
export function shapeSchema(schema: z.ZodType): unknown {
    try {
        return z.toJSONSchema(schema);
    }
    catch {
        return z.toJSONSchema(schema, { io: "input" });
    }
}
const shapeHint = (schema: z.ZodType) => `\n\nReturn 1 JSON object that matches this JSON Schema exactly. No markdown, no commentary.\n${JSON.stringify(shapeSchema(schema))}`;
interface Usage {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
}
type Status = "ok" | "invalid" | "refusal" | "error";
interface Sent {
    text: string;
    usage: Usage;
    problem?: {
        status: Exclude<Status, "ok">;
        error: string;
    };
}
interface Wire<T extends z.ZodType> {
    model: string;
    system: string;
    stable: string;
    perCall: string;
    images: {
        mime: string;
        data: string;
    }[];
    video?: {
        mime: string;
        data: string;
    };
    effort: Effort;
    maxTokens: number;
    headroom: ProviderHeadroom;
    temperature?: number;
    schema: T;
    cache: boolean;
}
const KEY: Record<Provider, () => string> = {
    claude: () => env.ANTHROPIC_API_KEY,
    gemini: () => env.GEMINI_API_KEY,
    openai: () => env.OPENAI_API_KEY,
    deepseek: () => env.DEEPSEEK_API_KEY,
};
const KEY_NAME: Record<Provider, string> = {
    claude: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    openai: "OPENAI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
};
export const providerEnabled = (p: Provider) => env.LLM_MODE === "live" && !!KEY[p]();
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ maxRetries: 3 }));
const isHaiku = (model: string) => model.startsWith("claude-haiku-4");
async function sendClaude<T extends z.ZodType>(w: Wire<T>): Promise<Sent> {
    const haiku = isHaiku(w.model);
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
        ...(w.stable
            ? [
                {
                    type: "text" as const,
                    text: w.stable,
                    ...(w.cache
                        ? { cache_control: { type: "ephemeral" as const } }
                        : {}),
                },
            ]
            : []),
        ...w.images.map((i) => ({
            type: "image" as const,
            source: {
                type: "base64" as const,
                media_type: i.mime as "image/jpeg",
                data: i.data,
            },
        })),
        { type: "text" as const, text: w.perCall },
    ];
    const ask = (strict: boolean) => anthropic()
        .beta.messages.stream({
        model: w.model,
        max_tokens: providerRoom("claude", w.model, w.maxTokens),
        system: [
            {
                type: "text",
                text: w.system,
                ...(w.cache ? { cache_control: { type: "ephemeral" } } : {}),
            },
        ],
        messages: [{ role: "user", content: strict ? content : [...content.slice(0, -1), { type: "text" as const, text: `${w.perCall}${shapeHint(w.schema)}` }] }],
        output_config: {
            ...(strict ? { format: betaZodOutputFormat(w.schema) } : {}),
            ...(haiku ? {} : { effort: w.effort }),
        },
        ...(haiku
            ? { temperature: 0 }
            : {
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default" as const,
            }),
    }, { signal: callSignal(600000) })
        .finalMessage();
    const msg = await ask(true).catch((e: unknown) => {
        if (/compiled grammar is too large/i.test(String((e as Error)?.message ?? e)))
            return ask(false);
        throw e;
    });
    const usage = {
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
        cache_read_tokens: msg.usage.cache_read_input_tokens ?? 0,
        cache_write_tokens: msg.usage.cache_creation_input_tokens ?? 0,
    };
    const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    if (msg.stop_reason === "refusal")
        return {
            text,
            usage,
            problem: {
                status: "refusal",
                error: `Model declined (${msg.stop_details?.category ?? "no category"}).`,
            },
        };
    if (msg.stop_reason === "max_tokens")
        return {
            text,
            usage,
            problem: {
                status: "invalid",
                error: "Output hit max_tokens before the JSON finished.",
            },
        };
    return { text, usage };
}
const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
const cacheMinChars = (model: string) => /^gemini-3\.1-pro/.test(model) ? 16000 : 6000;
const CACHE_TTL_S = 600;
const cacheStorageRate = (model: string) => /^gemini-3\.1-pro/.test(model) ? 4.5 : /flash-lite/.test(model) ? 1 : 0.5;
interface CacheEntry {
    until: number;
    name?: string;
    pending?: Promise<string | null>;
}
const geminiCaches = ((globalThis as unknown as {
    __ceGeminiCaches?: Map<string, CacheEntry>;
}).__ceGeminiCaches ??= new Map<string, CacheEntry>());
async function geminiCache<T extends z.ZodType>(w: Wire<T>): Promise<string | null> {
    if (w.system.length + w.stable.length < cacheMinChars(w.model))
        return null;
    const key = createHash("sha1")
        .update(`${w.model}\0${w.system}\0${w.stable}`)
        .digest("hex");
    const now = Date.now();
    const e = geminiCaches.get(key);
    if (!e || e.until < now) {
        geminiCaches.set(key, { until: now + 9 * 60000 });
        return null;
    }
    if (e.name)
        return e.name;
    e.pending ??= (async () => {
        try {
            const res = await fetch(`${GEMINI}/cachedContents`, {
                method: "POST",
                headers: {
                    "x-goog-api-key": env.GEMINI_API_KEY,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    model: `models/${w.model}`,
                    systemInstruction: { parts: [{ text: w.system }] },
                    ...(w.stable
                        ? { contents: [{ role: "user", parts: [{ text: w.stable }] }] }
                        : {}),
                    ttl: `${CACHE_TTL_S}s`,
                }),
                signal: AbortSignal.timeout(60000),
            });
            if (!res.ok)
                return null;
            const body = (await res.json()) as {
                name?: string;
                usageMetadata?: {
                    totalTokenCount?: number;
                };
            };
            if (!body.name)
                return null;
            const tokens = body.usageMetadata?.totalTokenCount ??
                Math.round((w.system.length + w.stable.length) / 4);
            db.insert(schema.llmCalls)
                .values({
                id: randomUUID(),
                brand_id: SHARED_BRAND,
                task: "prompt_cache",
                model: w.model,
                ref_type: "cache",
                ref_id: null,
                attempt: 1,
                system_prompt: "",
                user_prompt: `Stored ${tokens} tokens of repeated prompt for ${CACHE_TTL_S / 60} minutes.`,
                response_text: body.name,
                input_tokens: 0,
                output_tokens: 0,
                cache_read_tokens: 0,
                cache_write_tokens: 0,
                cost_usd: (tokens / 1000000) *
                    cacheStorageRate(w.model) *
                    (CACHE_TTL_S / 3600),
                duration_ms: 0,
                status: "ok",
                error: null,
            })
                .run();
            e.until = Date.now() + (CACHE_TTL_S - 45) * 1000;
            return body.name;
        }
        catch {
            return null;
        }
    })();
    e.name = (await e.pending) ?? undefined;
    if (!e.name)
        geminiCaches.delete(key);
    return e.name ?? null;
}
async function sendGemini<T extends z.ZodType>(w: Wire<T>): Promise<Sent> {
    const cache = await geminiCache(w);
    const images = [
        ...(w.video ? [{ inlineData: { mimeType: w.video.mime, data: w.video.data } }] : []),
        ...w.images.map((i) => ({
            inlineData: { mimeType: i.mime, data: i.data },
        })),
    ];
    const generationConfig = {
        responseMimeType: "application/json",
        maxOutputTokens: providerRoom("gemini", w.model, w.maxTokens),
        thinkingConfig: { thinkingLevel: w.effort },
        ...(w.temperature != null ? { temperature: w.temperature } : {}),
    };
    const send = (cached: string | null) => fetch(`${GEMINI}/models/${w.model}:generateContent`, {
        method: "POST",
        headers: {
            "x-goog-api-key": env.GEMINI_API_KEY,
            "content-type": "application/json",
        },
        body: JSON.stringify(cached
            ? {
                cachedContent: cached,
                contents: [
                    { role: "user", parts: [...images, { text: w.perCall }] },
                ],
                generationConfig,
            }
            :
                {
                    systemInstruction: { parts: [{ text: w.system }] },
                    contents: [
                        {
                            role: "user",
                            parts: [
                                ...(w.stable ? [{ text: w.stable }] : []),
                                ...images,
                                { text: w.perCall },
                            ],
                        },
                    ],
                    generationConfig,
                }),
        signal: callSignal(600000),
    });
    let res = await send(cache);
    if (!res.ok && cache) {
        for (const [k, v] of geminiCaches)
            if (v.name === cache)
                geminiCaches.delete(k);
        res = await send(null);
    }
    if (!res.ok)
        throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as {
        candidates?: {
            finishReason?: string;
            content?: {
                parts?: {
                    text?: string;
                }[];
            };
        }[];
        usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            thoughtsTokenCount?: number;
            cachedContentTokenCount?: number;
        };
    };
    const u = body.usageMetadata ?? {};
    const cached = u.cachedContentTokenCount ?? 0;
    const usage = {
        input_tokens: Math.max(0, (u.promptTokenCount ?? 0) - cached),
        output_tokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
        cache_read_tokens: cached,
        cache_write_tokens: 0,
    };
    const text = (body.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");
    const finish = body.candidates?.[0]?.finishReason;
    if (finish !== "STOP")
        return {
            text,
            usage,
            problem: {
                status: "invalid",
                error: `The model stopped early (${finish ?? "no answer"}).`,
            },
        };
    return { text, usage };
}
function postLong(url: string, headers: Record<string, string>, body: string, signal: AbortSignal): Promise<{
    ok: boolean;
    status: number;
    text: string;
}> {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: "POST",
            headers: { ...headers, "content-length": Buffer.byteLength(body) },
            signal,
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("error", reject);
            res.on("end", () => {
                const status = res.statusCode ?? 0;
                resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    text: Buffer.concat(chunks).toString("utf-8"),
                });
            });
        });
        req.on("error", reject);
        req.end(body);
    });
}
async function sendOpenai<T extends z.ZodType>(w: Wire<T>): Promise<Sent> {
    const res = await postLong("https://api.openai.com/v1/responses", {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
    }, JSON.stringify({
        model: w.model,
        instructions: w.system,
        input: [
            {
                role: "user",
                content: [
                    ...(w.stable ? [{ type: "input_text", text: w.stable }] : []),
                    ...w.images.map((i) => ({
                        type: "input_image",
                        image_url: `data:${i.mime};base64,${i.data}`,
                    })),
                    { type: "input_text", text: /json/i.test(`${w.stable ?? ""}${w.perCall}`) ? w.perCall : `${w.perCall}\n\nReturn the answer as 1 JSON object.` },
                ],
            },
        ],
        text: { format: { type: "json_object" } },
        reasoning: { effort: w.effort },
        max_output_tokens: providerRoom("openai", w.model, w.maxTokens),
    }), callSignal(600000));
    if (!res.ok)
        throw new Error(`OpenAI ${res.status}: ${res.text.slice(0, 300)}`);
    const body = JSON.parse(res.text) as {
        status?: string;
        output?: {
            type: string;
            content?: {
                type: string;
                text?: string;
            }[];
        }[];
        usage?: {
            input_tokens?: number;
            output_tokens?: number;
            input_tokens_details?: {
                cached_tokens?: number;
            };
        };
    };
    const cached = body.usage?.input_tokens_details?.cached_tokens ?? 0;
    const usage = {
        input_tokens: (body.usage?.input_tokens ?? 0) - cached,
        output_tokens: body.usage?.output_tokens ?? 0,
        cache_read_tokens: cached,
        cache_write_tokens: 0,
    };
    const text = (body.output ?? [])
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text ?? "")
        .join("");
    if (body.status && body.status !== "completed")
        return {
            text,
            usage,
            problem: {
                status: "invalid",
                error: `The model stopped early (${body.status}).`,
            },
        };
    return { text, usage };
}
async function sendDeepseek<T extends z.ZodType>(w: Wire<T>): Promise<Sent> {
    const userText = [w.stable, w.perCall].filter(Boolean).join("\n\n");
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: w.model,
            messages: [
                { role: "system", content: w.system },
                {
                    role: "user",
                    content: w.images.length
                        ? [
                            ...w.images.map((i) => ({
                                type: "image_url",
                                image_url: { url: `data:${i.mime};base64,${i.data}` },
                            })),
                            { type: "text", text: userText },
                        ]
                        : userText,
                },
            ],
            response_format: { type: "json_object" },
            reasoning_effort: w.effort === "low" ? "low" : "high",
            ...(w.temperature != null ? { temperature: w.temperature } : {}),
            max_tokens: providerRoom("deepseek", w.model, w.maxTokens, w.headroom),
        }),
        signal: callSignal(600000),
    });
    if (!res.ok)
        throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const body = (await res.json()) as {
        choices?: {
            finish_reason?: string;
            message?: {
                content?: string;
            };
        }[];
        usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            prompt_cache_hit_tokens?: number;
            prompt_tokens_details?: {
                cached_tokens?: number;
            };
        };
    };
    const cached = body.usage?.prompt_cache_hit_tokens ??
        body.usage?.prompt_tokens_details?.cached_tokens ??
        0;
    const usage = {
        input_tokens: Math.max(0, (body.usage?.prompt_tokens ?? 0) - cached),
        output_tokens: body.usage?.completion_tokens ?? 0,
        cache_read_tokens: cached,
        cache_write_tokens: 0,
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const finish = body.choices?.[0]?.finish_reason;
    if (finish && finish !== "stop")
        return {
            text,
            usage,
            problem: {
                status: "invalid",
                error: `The model stopped early (${finish}).`,
            },
        };
    return { text, usage };
}
const SEND: Record<Provider, <T extends z.ZodType>(w: Wire<T>) => Promise<Sent>> = {
    claude: sendClaude,
    gemini: sendGemini,
    openai: sendOpenai,
    deepseek: sendDeepseek,
};
const REPEATS_IN_A_RUN = new Set([
    "shot_plan",
    "copy_judge",
    "words_fix",
    "studio_static_copy",
    "voice_check",
    "studio_claims",
    "audit_judge",
    "line_repair",
    "extract",
    "clean",
    "name_redact",
    "cluster",
    "assign",
    "script",
    "library_analysis",
]);
const seenPrefix = ((globalThis as unknown as {
    __cePrefixSeen?: Map<string, number>;
}).__cePrefixSeen ??= new Map<string, number>());
const ANSWERED = /^(?:API|OpenAI|Gemini|DeepSeek) \d{3}\b/;
export const diedAfterSend = (error: string | null, ms: number): boolean => ms >= 60000 && !!error && !ANSWERED.test(error);
export const reserveUsd = (model: string, promptChars: number, room: number): number => costUsd(model, { input_tokens: Math.ceil(promptChars / 4), output_tokens: room, cache_read_tokens: 0, cache_write_tokens: 0 });
const NO_RETRY = /\b(?:429|402|529|rate.?limit|quota|credit|insufficient|overloaded|resource.?exhausted)\b/i;
export function worthCaching(task: string, model: string, prefix: string, now = Date.now()): boolean {
    if (REPEATS_IN_A_RUN.has(task))
        return true;
    const key = createHash("sha1").update(`${model} ${prefix}`).digest("hex");
    const last = seenPrefix.get(key);
    seenPrefix.set(key, now);
    if (seenPrefix.size > 500)
        for (const [k, t] of seenPrefix)
            if (now - t > 600000)
                seenPrefix.delete(k);
    return last !== undefined && now - last < 290000;
}
export class DryRunError extends Error {
}
export interface Tapped {
    task: string;
    model: string;
    effort: Effort;
    system: string;
    stable: string;
    perCall: string;
    images: number;
    answerRoom: number;
    providerRoom: number;
    schemaTransport: "native" | "prompt";
    schemaChars: number;
}
let tap: ((t: Tapped) => void) | null = null;
export function setTap(fn: ((t: Tapped) => void) | null) {
    tap = fn;
}
function firstObject(s: string): string {
    if (!s.startsWith("{"))
        return s;
    let depth = 0;
    let quoted = false;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (quoted) {
            if (c === "\\")
                i++;
            else if (c === '"')
                quoted = false;
        }
        else if (c === '"')
            quoted = true;
        else if (c === "{")
            depth++;
        else if (c === "}" && --depth === 0)
            return s.slice(0, i + 1);
    }
    return s;
}
const unfence = (s: string) => firstObject(s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, ""));
export function brandBackground(brandId: string, extra: ExtraContext): string {
    let body: unknown;
    try {
        const brand = loadBrandBrain(brandId);
        body = extra === "brain" ? brand : brandPack(brand, "minimal").stable;
    }
    catch {
        return "";
    }
    return `\n\n## About the brand (background)\nAdded to this step in Settings. Background only: the task above and the shape of the answer do not change.\n${JSON.stringify(body)}`;
}
export async function dispatch<T extends z.ZodType>(asked: StructuredCall<T>): Promise<StructuredResult<z.infer<T>>> {
    const extra = extraContext(asked.task);
    const req = extra
        ? { ...asked, system: asked.system + brandBackground(asked.brandId, extra) }
        : asked;
    const route = routeFor(req.task, {
        model: req.model,
        effort: req.effort,
        maxTokens: req.maxTokens,
        pin: req.pin,
    });
    const model = route.model;
    const provider = providerOf(model);
    const system = provider === "claude" ? req.system : req.system + shapeHint(req.schema);
    let room = answerRoom(req.resultBudget, route.maxTokens ?? 16000, route.maxTokensLocked);
    const headroom: ProviderHeadroom = { effort: route.effort ?? "medium", resultBudget: !!req.resultBudget, locked: !!route.maxTokensLocked };
    if (tap) {
        const cut = splitUser(req.user);
        tap({
            task: req.task,
            model,
            effort: route.effort ?? "medium",
            system,
            stable: cut.stable,
            perCall: cut.perCall,
            images: req.images?.length ?? 0,
            answerRoom: room,
            providerRoom: providerRoom(provider, model, room, headroom),
            schemaTransport: provider === "claude" ? "native" : "prompt",
            schemaChars: JSON.stringify(shapeSchema(req.schema)).length,
        });
        throw new DryRunError("Dry run: the prompt was built and not sent.");
    }
    if (!providerEnabled(provider))
        throw new LlmDisabledError(env.LLM_MODE !== "live"
            ? "LLM_MODE is mock. Set LLM_MODE=live in .env."
            : `This step runs on ${model} and needs ${KEY_NAME[provider]} in .env.`);
    const leaks = findContactPii(`${req.system}\n${req.user}`);
    if (leaks.length)
        throw new PiiLeakError(`Refusing to send unredacted ${[...new Set(leaks.map((l) => l.type))].slice(0, 3).join(", ")} to the API.`);
    let files = req.images ?? [];
    if (files.length > 16)
        throw new Error(`Too many images for 1 call (${files.length}; 16 at most).`);
    let video: Wire<T>["video"];
    let frames: Awaited<ReturnType<typeof videoFrames>> | null = null;
    if (req.video && seesImages(model)) {
        const bytes = (await stat(req.video)).size;
        if (provider === "gemini" && bytes <= 14 * 1024 * 1024)
            video = { mime: videoMime(req.video), data: (await readFile(req.video)).toString("base64") };
        else {
            frames = await videoFrames(req.video, 16 - files.length);
            files = [...files, ...frames.files];
        }
    }
    const blind = files.length > 0 && !seesImages(model);
    const images = blind
        ? []
        : await Promise.all(files.map(async (file) => ({
            mime: "image/jpeg",
            data: (await sharp(await readFile(file))
                .rotate()
                .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer()).toString("base64"),
        })));
    const { stable, perCall } = splitUser(req.user);
    const base = `${blind ? "The images this step mentions are not attached for this model. Work from the written descriptions of them.\n\n" : ""}${frames ? `The video is attached as ${frames.files.length} frames in order, taken at seconds ${frames.seconds.join(", ")} of ${Math.round(frames.duration)}, after any other images.\n\n` : ""}${perCall}`;
    frames?.done();
    const cache = provider === "claude" &&
        worthCaching(req.task, model, `${system} ${stable}`);
    let perCallText = base;
    let totalCost = 0;
    let lengthRetry = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
        checkpoint();
        const { spent, cap } = budgetStatus();
        if (spent >= cap)
            throw new BudgetExceededError(`Spend cap reached: $${spent.toFixed(2)} of $${cap.toFixed(2)}. Raise the text cap in Settings to continue.`);
        const id = randomUUID();
        const reserved = reserveUsd(model, system.length + stable.length + perCallText.length + images.length * 8000, room);
        try {
            reserveSpend(id, "text", reserved, cap, spent, req.operationBudget);
        }
        catch (error) {
            throw new BudgetExceededError(String(error));
        }
        const span = startSpan(req.brandId, currentJobId() ?? req.operationId ?? `${req.refType ?? req.task}:${req.refId ?? id}`, "provider");
        const started = Date.now();
        let status: Status = "ok";
        let error: string | null = null;
        let text: string | null = null;
        let usage: Usage = {
            input_tokens: 0,
            output_tokens: 0,
            cache_read_tokens: 0,
            cache_write_tokens: 0,
        };
        let parsed: z.infer<T> | null = null;
        let died = false;
        try {
            const sent = await SEND[provider]({
                model,
                system,
                stable,
                perCall: perCallText,
                images,
                video,
                effort: route.effort ?? "medium",
                maxTokens: room,
                headroom: { ...headroom, lengthRetry },
                temperature: req.temperature,
                schema: req.schema,
                cache,
            });
            text = sent.text;
            usage = sent.usage;
            if (sent.problem)
                ({ status, error } = sent.problem);
            else {
                const check = req.schema.safeParse(JSON.parse(unfence(sent.text)));
                if (check.success)
                    parsed = check.data;
                else {
                    status = "invalid";
                    error = check.error.issues
                        .slice(0, 6)
                        .map((i) => `${i.path.join(".")}: ${i.message}`)
                        .join("; ");
                }
            }
        }
        catch (e) {
            const stop = asStop(e);
            if (stop instanceof RunStoppedError) {
                settleSpend(id, null);
                endSpan(span, "cancelled", { cost: reserved, attempt: id, error: stop.message });
                throw stop;
            }
            if (e instanceof SyntaxError) {
                status = "invalid";
                error = `Response was not JSON: ${e.message}`;
            }
            else {
                status = "error";
                error =
                    e instanceof Anthropic.APIError
                        ? `API ${e.status}: ${e.message}`
                        : (e as Error).message;
                died = diedAfterSend(error, Date.now() - started);
            }
        }
        const cost = died ? reserved : costUsd(model, usage);
        totalCost += cost;
        db.insert(schema.llmCalls)
            .values({
            id,
            brand_id: req.brandId,
            task: req.task,
            model,
            ref_type: req.refType ?? null,
            ref_id: req.refId ?? null,
            attempt,
            system_prompt: system,
            user_prompt: [stable, perCallText]
                .filter(Boolean)
                .join(`\n\n${PER_CALL}\n\n`),
            response_text: text,
            ...usage,
            cost_usd: cost,
            duration_ms: Date.now() - started,
            status,
            error: died ? `${error} (no reply after ${Math.round((Date.now() - started) / 1000)} s: the cost on this row is an estimate, the whole prompt and the whole answer allowance)` : error,
        })
            .run();
        settleSpend(id, cost);
        endSpan(span, status === "ok" ? "passed" : "failed", { cost, attempt: id, error: error ?? undefined });
        if (status === "ok" && parsed !== null)
            return { data: parsed, callId: id, costUsd: totalCost };
        const noRetry = status === "error" && NO_RETRY.test(error ?? "");
        if (status === "refusal" ||
            noRetry ||
            (status === "error" && provider === "claude") ||
            attempt === 2)
            throw new LlmCallError(`${req.task} failed${attempt === 2 ? " after 2 attempts" : ""}: ${error ?? "LLM call failed"}`, id);
        if (cutForLength(error)) {
            if (!route.maxTokensLocked)
                room = moreRoom(room);
            lengthRetry = true;
            perCallText = base;
        }
        else
            perCallText = `${base}\n\nYour previous answer failed validation:\n${error}\nReturn JSON that matches the schema exactly.`;
    }
    throw new Error("unreachable");
}
