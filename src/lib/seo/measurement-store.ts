import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MeasurementData, SearchImport, LabImport } from "./measurement";
const key = "seo:v1:measurement";
export function loadMeasurement(brandId: string): MeasurementData {
    return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, key))).get()?.value as MeasurementData ?? { search: [], lab: [] };
}
export function saveMeasurementImport(value: SearchImport | LabImport) {
    const data = loadMeasurement(value.brandId);
    if ("rows" in value)
        data.search = [value, ...data.search.filter((v) => v.id !== value.id)].slice(0, 20);
    else
        data.lab = [value, ...data.lab.filter((v) => v.id !== value.id)].slice(0, 30);
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: value.brandId, key, value: data, updated_at }).onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value: data, updated_at } }).run();
}
