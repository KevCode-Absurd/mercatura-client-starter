import "server-only";
import { and, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CitationOutreachDraft } from "./citation-outreach";
const prefix = "seo:v1:citation-outreach:";
export function listCitationDrafts(brandId: string): CitationOutreachDraft[] {
    return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), like(schema.settings.key, `${prefix}%`))).all()
        .map(row => row.value as CitationOutreachDraft).filter(row => row.brandId === brandId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function readCitationDraft(brandId: string, id: string): CitationOutreachDraft | null {
    return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, prefix + id))).get()?.value as CitationOutreachDraft ?? null;
}
export function saveCitationDraft(draft: CitationOutreachDraft) {
    db.insert(schema.settings).values({ brand_id: draft.brandId, key: prefix + draft.id, value: draft, updated_at: draft.updatedAt })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value: draft, updated_at: draft.updatedAt } }).run();
}
