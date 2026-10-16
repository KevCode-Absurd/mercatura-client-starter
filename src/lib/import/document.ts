import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { db, schema } from "@/db";
import { env } from "../env";
import { BudgetExceededError, LlmDisabledError, budgetStatus } from "../llm/gateway";
import { costUsd } from "../llm/pricing";
import { gemini } from "../references/analyze";
export const DOC_TYPES = [".docx", ".pdf", ".txt", ".md"] as const;
export const MAX_DOC_BYTES = 12 * 1024 * 1024;
function unzip(buf: Buffer, want: (name: string) => boolean): Map<string, Buffer> {
    const out = new Map<string, Buffer>();
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0)
        throw new Error("This doesn't look like a Word file.");
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    for (let n = 0; n < count && p + 46 <= buf.length; n++) {
        if (buf.readUInt32LE(p) !== 0x02014b50)
            break;
        const method = buf.readUInt16LE(p + 10);
        const size = buf.readUInt32LE(p + 20);
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const local = buf.readUInt32LE(p + 42);
        const name = buf.toString("utf-8", p + 46, p + 46 + nameLen);
        if (want(name)) {
            const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
            const data = buf.subarray(start, start + size);
            out.set(name, method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data));
        }
        p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
export function docxText(buf: Buffer): string {
    const xml = unzip(buf, (n) => n === "word/document.xml").get("word/document.xml")?.toString("utf-8");
    if (!xml)
        throw new Error("This Word file has no readable text.");
    const text = xml
        .replace(/<\/w:tc>/g, " | ")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:(br|cr)[^>]*\/>/g, "\n")
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<[^>]+>/g, "");
    return decode(text)
        .split("\n")
        .map((l) => l.replace(/(\s*\|\s*)+$/g, "").replace(/[ \t]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
async function pdfText(brandId: string, buf: Buffer): Promise<string> {
    if (env.LLM_MODE !== "live" || !env.GEMINI_API_KEY)
        throw new LlmDisabledError("Reading a PDF needs live mode (LLM_MODE=live and GEMINI_API_KEY). Upload the script as a Word or text file instead.");
    const b = budgetStatus();
    if (b.spent >= b.cap)
        throw new BudgetExceededError(`Spend cap reached ($${b.spent.toFixed(2)} of $${b.cap}). Raise the text cap in Settings to continue.`);
    const model = env.MODEL_REFERENCE;
    const prompt = "Copy out all the text of this document, word for word, in reading order. Keep paragraph breaks, headings, speaker labels and scene or shot labels as they are. For a table, write 1 row per line with cells separated by ' | '. Do not summarise, correct, translate or add anything. Return only the text.";
    const started = Date.now();
    let usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
    let text = "";
    let error: string | null = null;
    try {
        const res = await gemini(`/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } }, { text: prompt }] }], generationConfig: { candidateCount: 1, maxOutputTokens: 16000, temperature: 0, thinkingConfig: { thinkingLevel: "low" } } }),
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
        text = (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    }
    catch (e) {
        error = (e as Error).message;
    }
    finally {
        db.insert(schema.llmCalls)
            .values({ id: randomUUID(), brand_id: brandId, task: "document_text", model, ref_type: "upload", ref_id: null, attempt: 1, system_prompt: "", user_prompt: `[pdf, ${Math.round(buf.length / 1024)} KB]\n${prompt}`, response_text: text.slice(0, 20000), ...usage, cost_usd: costUsd(model, usage), duration_ms: Date.now() - started, status: error ? "error" : "ok", error })
            .run();
    }
    if (error)
        throw new Error(error);
    return text;
}
export async function documentText(brandId: string, name: string, buf: Buffer): Promise<string> {
    if (buf.length > MAX_DOC_BYTES)
        throw new Error("That file is over 12 MB. Upload just the script.");
    const ext = name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
    let text: string;
    if (ext === ".docx")
        text = docxText(buf);
    else if (ext === ".pdf")
        text = await pdfText(brandId, buf);
    else if (ext === ".txt" || ext === ".md")
        text = buf.toString("utf-8").replace(/^﻿/, "");
    else if (ext === ".doc")
        throw new Error("Old .doc files can't be read. Save it as .docx or PDF and upload that.");
    else
        throw new Error("Upload a Word file (.docx), a PDF, or a text file.");
    text = text.replace(/\r\n?/g, "\n").trim();
    if (text.replace(/\s/g, "").length < 40)
        throw new Error("There is almost no text in that file. If it is a scan, upload a clearer copy.");
    return text.slice(0, 40000);
}
