import fs from "node:fs";
import sharp from "sharp";
import { env } from "../../env";
import { ProviderRefused } from "../errors";
import type { ImageAdapter } from "./types";
const ASPECTS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] as const;
export function nearestAspect(size: string): string {
    const [w, h] = size.split("x").map(Number);
    if (!w || !h)
        return "1:1";
    const ratio = (a: string) => Number(a.split(":")[0]) / Number(a.split(":")[1]);
    return [...ASPECTS].sort((x, y) => Math.abs(Math.log(ratio(x) / (w / h))) - Math.abs(Math.log(ratio(y) / (w / h))))[0];
}
interface Usage {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    candidatesTokensDetails?: {
        modality: string;
        tokenCount: number;
    }[];
}
export interface GoogleImageRates {
    in: number;
    textOut: number;
    imageOut: number;
    listed: number;
}
const PRO_RATES: GoogleImageRates = { in: 2, textOut: 12, imageOut: 120, listed: 0.134 };
const RATES: Record<string, GoogleImageRates> = {
    "gemini-3-pro-image": PRO_RATES,
    "gemini-3.1-flash-image": { in: 0.5, textOut: 3, imageOut: 60, listed: 0.101 },
    "gemini-3.1-flash-lite-image": { in: 0.25, textOut: 1.5, imageOut: 30, listed: 0.0336 },
};
export const googleImageRates = (model: string): GoogleImageRates => RATES[model] ?? PRO_RATES;
export function googleImageCost(usage: Usage, model = "gemini-3-pro-image"): number | undefined {
    if (!usage.candidatesTokensDetails?.some((d) => d.modality === "IMAGE"))
        return undefined;
    const image = usage.candidatesTokensDetails.filter((d) => d.modality === "IMAGE").reduce((n, d) => n + d.tokenCount, 0);
    const r = googleImageRates(model);
    return ((usage.promptTokenCount ?? 0) * r.in + (Math.max(0, (usage.candidatesTokenCount ?? 0) - image) + (usage.thoughtsTokenCount ?? 0)) * r.textOut + image * r.imageOut) / 1000000;
}
const REFERENCE_PX = 1024;
export function googleRefusal(status: number, body: unknown): string {
    const said = typeof body === "string" ? body : JSON.stringify(body ?? {});
    if (status === 429 && /monthly|per[ _-]?month/i.test(said) && /spend|budget|billing/i.test(said) && /cap|limit|exceed|reach/i.test(said)) {
        return "The monthly spending limit of the Google account was reached, so this picture was not made and nothing was charged. The limit is set in Google AI Studio. It was not tried again.";
    }
    if (status === 429)
        return "Google's request or usage limit was reached, so this picture was not made and nothing was charged. It was not tried again.";
    return `Google could not make this picture (HTTP ${status}). It was not tried again.`;
}
const MIME: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
export const fitReference = (ref: string | Buffer): Promise<Buffer> => sharp(ref).rotate().resize({ width: REFERENCE_PX, height: REFERENCE_PX, fit: "inside", withoutEnlargement: true }).png().toBuffer();
async function part(file: string): Promise<{
    inlineData: {
        mimeType: string;
        data: string;
    };
}> {
    const bytes = fs.readFileSync(file);
    const meta = await sharp(bytes).metadata();
    const format = meta.format ?? "";
    if (MIME[format] && bytes.length <= 6 * 1024 * 1024 && Math.max(meta.width ?? 0, meta.height ?? 0) <= REFERENCE_PX)
        return { inlineData: { mimeType: MIME[format], data: bytes.toString("base64") } };
    const png = await fitReference(bytes);
    return { inlineData: { mimeType: "image/png", data: png.toString("base64") } };
}
export const googleImageSize = (model: string): "1K" | "2K" => (/lite/.test(model) ? "1K" : "2K");
export async function googleImageBody(prompt: string, refs: string[], size: string, model = "gemini-3-pro-image") {
    return { contents: [{ role: "user", parts: [{ text: prompt }, ...(await Promise.all(refs.map(part)))] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: nearestAspect(size), imageSize: googleImageSize(model) } } };
}
export const googleImages: ImageAdapter = {
    id: "google",
    key: "GEMINI_API_KEY",
    connected: () => !!env.GEMINI_API_KEY,
    async generate(model, req) {
        const body = await googleImageBody(req.prompt, req.refs, req.size, model.id);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY }, body: JSON.stringify(body), signal: AbortSignal.timeout(240000) });
        if (!res.ok) {
            let said: unknown;
            try {
                said = await res.json();
            }
            catch {
                said = undefined;
            }
            throw new ProviderRefused(googleRefusal(res.status, said), res.status);
        }
        const answer = (await res.json()) as {
            candidates?: {
                content?: {
                    parts?: {
                        thought?: boolean;
                        inlineData?: {
                            mimeType: string;
                            data: string;
                        };
                    }[];
                };
            }[];
            usageMetadata?: Usage;
        };
        const costUsd = (answer.usageMetadata ? googleImageCost(answer.usageMetadata, model.id) : undefined) ?? googleImageRates(model.id).listed;
        const image = answer.candidates?.flatMap((c) => c.content?.parts ?? []).find((v) => !v.thought && v.inlineData)?.inlineData;
        if (!image || !Object.values(MIME).includes(image.mimeType))
            throw Object.assign(new Error("The picture model answered with no picture. It was not tried again."), { costUsd });
        fs.writeFileSync(req.out, await sharp(Buffer.from(image.data, "base64")).png().toBuffer());
        return { costUsd };
    },
};
