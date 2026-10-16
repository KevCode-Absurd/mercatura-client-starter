import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SETTING_DEFAULTS, type SettingsShape } from "./settings-defaults";
export * from "./settings-defaults";
export function getSetting<K extends keyof SettingsShape>(brandId: string, key: K): SettingsShape[K] {
    const row = db
        .select()
        .from(schema.settings)
        .where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, key)))
        .get();
    return (row?.value as SettingsShape[K] | undefined) ?? SETTING_DEFAULTS[key];
}
export function setSetting<K extends keyof SettingsShape>(brandId: string, key: K, value: SettingsShape[K]): void {
    const now = new Date().toISOString();
    db.insert(schema.settings)
        .values({ brand_id: brandId, key, value, updated_at: now })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at: now } })
        .run();
}
