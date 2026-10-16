import fs from "node:fs";
import sharp from "sharp";
import { env } from "../../env";
import { providerError } from "../errors";
import type { ImageAdapter } from "./types";
export const REFERENCE_PX = 1024;
export const fitReference = (ref: string | Buffer): Promise<Buffer> => sharp(ref).rotate().resize({ width: REFERENCE_PX, height: REFERENCE_PX, fit: "inside", withoutEnlargement: true }).png().toBuffer();
export const openaiImages: ImageAdapter = {
    id: "openai",
    key: "OPENAI_API_KEY",
    connected: () => !!env.OPENAI_API_KEY,
    async generate(model, req) {
        let res: Response;
        if (req.refs.length) {
            const form = new FormData();
            form.set("model", model.id);
            form.set("prompt", req.prompt);
            form.set("size", req.size);
            form.set("quality", req.quality ?? "medium");
            form.set("n", "1");
            for (const [i, ref] of req.refs.entries()) {
                const png = await fitReference(ref);
                form.append("image[]", new Blob([new Uint8Array(png)], { type: "image/png" }), `ref${i + 1}.png`);
            }
            res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(380000) });
        }
        else {
            res = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
                body: JSON.stringify({ model: model.id, prompt: req.prompt, size: req.size, quality: req.quality ?? "medium", n: 1 }),
                signal: AbortSignal.timeout(380000),
            });
        }
        if (!res.ok)
            throw providerError("Image generation", res.status);
        const body = (await res.json()) as {
            data?: {
                b64_json?: string;
            }[];
            usage?: {
                input_tokens?: number;
                output_tokens?: number;
                input_tokens_details?: {
                    text_tokens?: number;
                    image_tokens?: number;
                };
            };
        };
        const b64 = body.data?.[0]?.b64_json;
        if (!b64)
            throw new Error("Image provider did not return image bytes.");
        fs.writeFileSync(req.out, Buffer.from(b64, "base64"));
        const u = body.usage;
        return { costUsd: u ? ((u.input_tokens_details?.text_tokens ?? 0) * 5 + (u.input_tokens_details?.image_tokens ?? 0) * 8 + (u.output_tokens ?? 0) * 30) / 1e6 : 0 };
    },
};
