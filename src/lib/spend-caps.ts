import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "./env";
export interface SpendCaps {
    textUsd: number;
    videoUsd: number;
    images: number;
}
const APP = "_app";
const KEY = "caps";
const row = () => db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, APP), eq(schema.settings.key, KEY))).get();
const startingCaps = (): SpendCaps => ({ textUsd: env.LLM_BUDGET_USD, videoUsd: env.MEDIA_VIDEO_BUDGET_USD, images: env.MEDIA_IMAGE_CAP });
export const textCeiling = (): number => env.ABSOLUTE_BUDGET_USD;
const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);
export function spendCaps(): SpendCaps {
    const start = startingCaps();
    const set = row()?.value as Partial<SpendCaps> | undefined;
    if (!set)
        return start;
    return { textUsd: Math.min(num(set.textUsd, start.textUsd), textCeiling()), videoUsd: num(set.videoUsd, start.videoUsd), images: Math.round(num(set.images, start.images)) };
}
export function saveSpendCaps(input: SpendCaps): SpendCaps {
    for (const [name, v] of Object.entries(input))
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0)
            throw new Error(`The ${name === "textUsd" ? "text" : name === "videoUsd" ? "video" : "image"} cap has to be 0 or more.`);
    if (input.textUsd > textCeiling())
        throw new Error(`The text cap can't go above $${textCeiling()}: that is the limit set for this installation.`);
    if (input.videoUsd > 100000 || input.images > 1000000)
        throw new Error("That cap is too large to be meant.");
    const value: SpendCaps = { textUsd: Math.round(input.textUsd * 100) / 100, videoUsd: Math.round(input.videoUsd * 100) / 100, images: Math.round(input.images) };
    const now = new Date().toISOString();
    db.insert(schema.settings)
        .values({ brand_id: APP, key: KEY, value, updated_at: now })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at: now } })
        .run();
    return spendCaps();
}
