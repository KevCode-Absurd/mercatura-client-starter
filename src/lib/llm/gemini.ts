import type { z } from "zod";
import { env } from "../env";
import { callStructured, type StructuredCall } from "./gateway";
export const geminiEnabled = () => env.LLM_MODE === "live" && !!env.GEMINI_API_KEY;
export type GeminiCall<T extends z.ZodType> = Omit<StructuredCall<T>, "model"> & {
    model?: string;
};
export async function geminiJson<T extends z.ZodType>(req: GeminiCall<T>): Promise<z.infer<T>> {
    return (await callStructured({ ...req, model: req.model ?? env.MODEL_COPY })).data;
}
