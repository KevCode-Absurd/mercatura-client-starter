"use server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { scriptVersionById } from "@/lib/scripts/versions";
export async function scriptPreviewAction(id: string, hookId?: string) {
    const brandId = await activeBrandId();
    const script = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, id), eq(schema.scripts.brand_id, brandId))).get();
    if (!script)
        return null;
    return { lines: hookId ? scriptVersionById(script, hookId) : script.lines, status: script.status, audit: script.audit };
}
