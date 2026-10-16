import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { db, schema } from "@/db";
import { BrandBrainError } from "./brand-brain";
import { loadBrandBrain } from "./brands";
import { env } from "./env";
import { BudgetExceededError, LlmDisabledError, budgetStatus } from "./llm/gateway";
import { costUsd } from "./llm/pricing";
import { ffmpeg } from "./media/ffmpeg";
import { gemini } from "./references/analyze";
export const MAX_AUDIO_BYTES = 14 * 1024 * 1024;
const AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg", "audio/aac", "audio/flac"];
const LIVE_MODEL = "gemini-3.5-flash-lite";
export const transcriptionEnabled = () => env.LLM_MODE === "live" && !!env.GEMINI_API_KEY;
function spellings(brandId: string): string[] {
    try {
        const b = loadBrandBrain(brandId);
        return [b.brand.name, ...b.products.map((p) => p.name)];
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        return [];
    }
}
export async function peakVolume(audio: Buffer, mime: string): Promise<number | null> {
    const ext = mime.includes("mp4") || mime.includes("aac") ? ".m4a" : mime.includes("wav") ? ".wav" : mime.includes("ogg") ? ".ogg" : mime.includes("mpeg") ? ".mp3" : mime.includes("flac") ? ".flac" : ".webm";
    const file = path.join(os.tmpdir(), `ce-voice-${randomUUID()}${ext}`);
    try {
        fs.writeFileSync(file, audio);
        const out = await ffmpeg(["-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { allowFail: true, timeoutMs: 30000 });
        const m = out.match(/max_volume:\s*(-?[\d.]+) dB/);
        return m ? Number(m[1]) : null;
    }
    catch {
        return null;
    }
    finally {
        fs.rmSync(file, { force: true });
    }
}
const QUIET_DB = -45;
const prompt = (names: string[], question: string) => [
    'Return JSON: { "speech": true or false, "transcript": "..." }.',
    "First decide `speech`: is a person clearly speaking words in this recording? Silence, hum, hiss, clicks, music or a noise that only resembles a voice is false. If false, `transcript` is an empty string.",
    "If true, `transcript` is what is said, word for word, in the language spoken.",
    "Leave out filler sounds (um, uh) and false starts. Use normal punctuation and sentence breaks.",
    "Don't summarise, translate, answer, correct or add anything.",
    "Never write words that were not spoken, and never guess what the speaker might have said.",
    question ? `The speaker is answering this question (for context only, don't repeat it): ${question}` : "",
    names.length ? `Spell these names this way if they are said: ${names.join("; ")}.` : "",
    "Return only the JSON.",
]
    .filter(Boolean)
    .join("\n");
export async function transcribeAnswer(input: {
    brandId: string;
    questionId: string;
    question: string;
    audio: Buffer;
    mime: string;
    task?: string;
    live?: boolean;
}): Promise<string> {
    if (!transcriptionEnabled())
        throw new LlmDisabledError("Voice answers need LLM_MODE=live and GEMINI_API_KEY in .env.");
    const b = budgetStatus();
    if (b.spent >= b.cap)
        throw new BudgetExceededError(`Spend cap reached ($${b.spent.toFixed(2)} of $${b.cap}). Raise the text cap in Settings to continue.`);
    const mime = input.mime.split(";")[0].trim().toLowerCase();
    if (!AUDIO_TYPES.includes(mime))
        throw new Error(`This browser recorded ${mime || "an unknown format"}, which can't be transcribed.`);
    if (!input.audio.length)
        throw new Error("The recording was empty.");
    if (input.audio.length > MAX_AUDIO_BYTES)
        throw new Error("That recording is too long. Keep each answer under about 10 minutes.");
    const peak = await peakVolume(input.audio, mime);
    if (peak !== null && peak < QUIET_DB)
        return "";
    const model = input.live ? LIVE_MODEL : env.MODEL_REFERENCE;
    const text = prompt(spellings(input.brandId), input.question);
    const started = Date.now();
    let usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
    let responseText = "";
    let error: string | null = null;
    try {
        const res = await gemini(`/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data: input.audio.toString("base64") } }, { text }] }],
                generationConfig: { candidateCount: 1, maxOutputTokens: 8192, temperature: 0, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
            }),
        });
        const body = (await res.json()) as {
            candidates?: {
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
            };
        };
        usage = { ...usage, input_tokens: body.usageMetadata?.promptTokenCount ?? 0, output_tokens: (body.usageMetadata?.candidatesTokenCount ?? 0) + (body.usageMetadata?.thoughtsTokenCount ?? 0) };
        responseText = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    }
    catch (e) {
        error = (e as Error).message;
    }
    finally {
        db.insert(schema.llmCalls)
            .values({
            id: randomUUID(),
            brand_id: input.brandId,
            task: input.task ?? "founder_transcribe",
            model,
            ref_type: input.task ? "feedback" : "founder_answer",
            ref_id: input.questionId,
            attempt: 1,
            system_prompt: "",
            user_prompt: `[audio: ${mime}, ${Math.round(input.audio.length / 1024)} KB]\n${text}`,
            response_text: responseText,
            ...usage,
            cost_usd: costUsd(model, usage),
            duration_ms: Date.now() - started,
            status: error ? "error" : "ok",
            error,
        })
            .run();
    }
    if (error)
        throw new Error(error);
    try {
        const out = JSON.parse(responseText.replace(/^```(?:json)?\s*|\s*```$/g, "")) as {
            speech?: unknown;
            transcript?: unknown;
        };
        return out.speech === true && typeof out.transcript === "string" ? out.transcript.trim() : "";
    }
    catch {
        throw new Error("The recording couldn't be written down. Try again, or type it.");
    }
}
