import path from "node:path";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AdReferenceRow, LibraryRefRow } from "@/db/schema";
import { env } from "../env";
import { temporaryReferences } from "../competitor-playbook/store";
export const isAdReferenceId = (id: string) => /^[0-9a-f]{32}$/.test(id);
export const AD_REFERENCE_TYPE = "your-reference";
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export const adReferenceFile = (r: Pick<AdReferenceRow, "media_root" | "media_path">): string | null => (r.media_path ? path.resolve(r.media_root === "data" ? env.DATA_DIR : env.SKILLS_DIR, r.media_path) : null);
export function adReferenceLabel(r: Pick<AdReferenceRow, "source" | "title" | "analysis">): string {
    const who = str((r.analysis ?? {}).advertiser);
    return r.source === "user" ? r.title : who ? `${who} ad` : r.title;
}
export function adReferenceAsLibrary(r: AdReferenceRow): LibraryRefRow {
    const a = (r.analysis ?? {}) as Record<string, unknown>;
    const stage = [r.awareness?.stage ? `written for a ${r.awareness.stage.replace("-", " ")} buyer` : "", r.sophistication?.stage ? `in a market at ${r.sophistication.stage.replace("stage-", "stage ")}` : ""].filter(Boolean).join(", ");
    const format = [(r.tags.format ?? []).slice(0, 4).join(", "), (r.tags.approach ?? []).slice(0, 4).join(", "), stage].filter(Boolean).join(". ");
    const works = [str(a.mechanism), str(a.transferable_principles) ? `What transfers: ${str(a.transferable_principles)}` : ""].filter(Boolean).join(" ");
    return {
        id: r.id,
        library: "ad",
        file: adReferenceFile(r) ?? "",
        thumb: null,
        vertical: r.categories[0] ?? "",
        type: AD_REFERENCE_TYPE,
        group_name: null,
        brand: str(a.advertiser) || null,
        note: r.notes,
        usable: !!r.media_path,
        craft: 4,
        width: r.width,
        height: r.height,
        tags: {},
        analysis: {
            ...(works ? { why_it_works: works.slice(0, 1400) } : {}),
            ...(str(a.observations) ? { layout: str(a.observations) } : {}),
            ...(format ? { format } : {}),
            ...(str(a.do_not_transfer) ? { watch_outs: [`Do not carry over: ${str(a.do_not_transfer).slice(0, 500)}`] } : {}),
        },
        analyzed: r.analyzed,
        created_at: r.created_at,
    };
}
export function adReferencesAsLibrary(ids: string[]): LibraryRefRow[] {
    const mine = ids.filter(isAdReferenceId);
    const temporary = temporaryReferences(ids);
    if (!mine.length)
        return temporary;
    return [...temporary, ...db
            .select()
            .from(schema.adReferences)
            .where(inArray(schema.adReferences.id, mine))
            .all()
            .filter((r) => r.kind === "image")
            .map(adReferenceAsLibrary)];
}
