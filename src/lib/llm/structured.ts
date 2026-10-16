import type { z } from "zod";
import { env } from "../env";
import { callStructured, type StructuredCall } from "./gateway";
export { providerOf, type Provider } from "./routing";
export type StructuredRequest<T extends z.ZodType> = StructuredCall<T>;
export async function structuredJson<T extends z.ZodType>(req: StructuredRequest<T>): Promise<z.infer<T>> {
    return (await callStructured(req)).data;
}
export const openaiEnabled = () => env.LLM_MODE === "live" && !!env.OPENAI_API_KEY;
