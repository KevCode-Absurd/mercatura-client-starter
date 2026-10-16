import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { LibraryRefRow } from "@/db/schema";
import { SHARED_BRAND } from "../env";
import { imageLesson } from "./learning";
export function imageLessons(refs: Map<string, LibraryRefRow>, brandId: string) {
    if (![...refs.values()].some((r) => r.library === "ad"))
        return new Map<string, {
            plan: string;
            words: string;
        }>();
    const rows = db.select().from(schema.adReferences).where(eq(schema.adReferences.kind, "image")).all()
        .filter((r) => r.brand_id === SHARED_BRAND || r.brand_id === brandId)
        .sort((a, b) => a.id.localeCompare(b.id));
    const strategies = new Map(rows.map((r) => [r.analysis?.library_ref_id ?? r.id, r]));
    return new Map([...refs].filter(([, r]) => r.library === "ad").map(([id, ref]) => [id, {
            plan: imageLesson(ref, strategies.get(id), false), words: imageLesson(ref, strategies.get(id)),
        }]));
}
