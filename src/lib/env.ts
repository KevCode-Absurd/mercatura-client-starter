import path from "node:path";
import { z } from "zod";
const EnvSchema = z.object({
    LLM_MODE: z.enum(["mock", "live"]).default("mock"),
    UI_MODE_DEFAULT: z.enum(["normal", "advanced"]).default("normal"),
    ANTHROPIC_API_KEY: z.string().optional().default(""),
    MODEL_EXTRACT: z.string().default("claude-sonnet-5-5"),
    MODEL_SCRIPT: z.string().default("gemini-3.1-pro-preview"),
    MODEL_VOICE: z.string().default("claude-sonnet-5-5"),
    MODEL_FAST: z.string().default("claude-haiku-4-5-20251001"),
    MODEL_EDIT: z.string().default("claude-opus-5-5"),
    GEMINI_API_KEY: z.string().optional().default(""),
    MODEL_REFERENCE: z.string().default("gemini-3.8-flash"),
    MODEL_COPY: z.string().default("gemini-3.1-pro-preview"),
    MODEL_PLAN: z.string().default("gpt-6-sol"),
    MODEL_IMAGE: z.string().default("gpt-image-2.5-sunburst"),
    OPENAI_API_KEY: z.string().optional().default(""),
    DEEPSEEK_API_KEY: z.string().optional().default(""),
    MODEL_ROUTES: z.string().optional().default(""),
    SEEDANCE_API_KEY: z.string().optional().default(""),
    SEEDANCE_BASE_URL: z.string().default("https://seedanceapi.org/v2"),
    MODEL_VIDEO: z.string().default("seedance-2.5"),
    HIGGSFIELD_API_KEY: z.string().optional().default(""),
    MEDIA_VIDEO_BUDGET_USD: z.coerce.number().nonnegative().default(0),
    MEDIA_IMAGE_CAP: z.coerce.number().int().nonnegative().default(0),
    STORAGE_ENDPOINT: z.string().optional().default(""),
    STORAGE_BUCKET: z.string().optional().default(""),
    STORAGE_ACCESS_KEY_ID: z.string().optional().default(""),
    STORAGE_SECRET_ACCESS_KEY: z.string().optional().default(""),
    STORAGE_REGION: z.string().default("auto"),
    FFMPEG_PATH: z.string().optional().default(""),
    SKILLS_DIR: z.string().default("./skills"),
    DATA_DIR: z.string().default("./data"),
    BRANDS_DIR: z.string().default("./brands"),
    LESSONS_DIR: z.string().default("./data/lessons"),
    LLM_BUDGET_USD: z.coerce.number().nonnegative().default(0),
    ABSOLUTE_BUDGET_USD: z.coerce.number().nonnegative().default(0),
    REMIX_LIBRARY_DB: z
        .string()
        .default("./data/disabled-reference-library.sqlite"),
});
const parsed = EnvSchema.parse({
    ...process.env,
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v === "").map(([k]) => [k, undefined])),
});
const root = process.cwd();
export const env = {
    ...parsed,
    SKILLS_DIR: path.resolve(root, parsed.SKILLS_DIR),
    DATA_DIR: path.resolve(root, parsed.DATA_DIR),
    BRANDS_DIR: path.resolve(root, parsed.BRANDS_DIR),
    REMIX_LIBRARY_DB: path.resolve(root, parsed.REMIX_LIBRARY_DB),
};
export const SHARED_BRAND = "_shared";
