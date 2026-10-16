import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
const TRANSCRIPT_SEARCH_CHARS = 400;
export function referenceCardRows() {
    const t = schema.adReferences;
    return db
        .select({
        id: t.id, kind: t.kind, title: t.title, categories: t.categories, tags: t.tags, awareness: t.awareness, sophistication: t.sophistication, duration: t.duration, media_path: t.media_path, analyzed: t.analyzed, source: t.source, analysis_status: t.analysis_status, analysis_error: t.analysis_error, synced_at: t.synced_at, updated_at: t.updated_at, notes: t.notes,
        advertiser: sql<string | null> `json_extract(${t.analysis}, '$.advertiser')`,
        mechanism: sql<string | null> `json_extract(${t.analysis}, '$.mechanism')`,
        transcript: sql<string | null> `substr(json_extract(${t.analysis}, '$.transcript'), 1, ${TRANSCRIPT_SEARCH_CHARS})`,
    })
        .from(t)
        .all();
}
