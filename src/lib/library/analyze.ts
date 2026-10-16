import path from "node:path";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LibraryAnalysis, LibraryRefRow, LibraryTags } from "@/db/schema";
import { env, SHARED_BRAND } from "../env";
import { geminiJson } from "../llm/gemini";
import { BUCKET_GUIDE, BUCKET_OTHER, pdpBucket } from "./buckets";
import { recordBuckets } from "./templates";
import { PDP_TYPES, PRODUCT_FORMATS, VERTICALS, pdpType } from "./taxonomy";
const TEXT_ROLES_MAX = 14;
const NEEDS_MAX = 8;
const Out = z.object({
    usable: z.boolean(),
    craft: z.number().int().min(1).max(5),
    vertical: z.string(),
    works_for: z.array(z.string()).max(8),
    product_format: z.string(),
    has_person: z.boolean(),
    text_overlay: z.enum(["none", "minimal", "heavy"]),
    palette_hex: z.array(z.string()).max(6),
    palette_name: z.string().default(""),
    mood: z.array(z.string()).max(5),
    why_it_works: z.string(),
    layout: z.string(),
    text_roles: z.array(z.object({ role: z.string(), example: z.string(), placement: z.string() })),
    needs: z.union([z.array(z.string()), z.string()]),
    rebuild_prompt: z.string(),
    watch_outs: z.array(z.string()).max(5),
    bucket: z.string().default(""),
    type: z.string().default(""),
    note: z.string().default(""),
});
export function needsList(v: string | string[] | undefined | null): string[] {
    const tidy = (items: string[]) => items.map((s) => s.replace(/^[\s\-\*•\d.)]+/, "").trim()).filter(Boolean);
    if (Array.isArray(v))
        return tidy(v.map(String)).slice(0, NEEDS_MAX);
    const text = String(v ?? "");
    let items = tidy(text.split(/\r?\n|;/));
    if (items.length <= 1 && text.includes(","))
        items = tidy(text.split(/,\s*/));
    return items.slice(0, NEEDS_MAX);
}
export const clipTextRoles = <T>(roles: T[]): T[] => roles.slice(0, TEXT_ROLES_MAX);
const SYSTEM = `You catalogue product-page gallery images for an ecommerce creative tool. Each image is a reference: later it will be rebuilt for a different brand's product, so describe what transfers, never the reference brand's own claims.

Return JSON with these fields:
- usable: false only if the image is unreadable, mostly cropped away, or not a product-page image at all.
- craft: 1 to 5, how well made it is (5 = a top brand's best work).
- vertical: the 1 closest of: ${VERTICALS.join("; ")}.
- works_for: up to 8 other verticals from that list where this layout would work as well.
- product_format: the pack or product format shown, 1 of: ${PRODUCT_FORMATS.join(", ")}.
- has_person: true if a face, body or hands appear.
- text_overlay: none, minimal or heavy.
- palette_hex: up to 6 dominant colours as hex. palette_name: 2 to 4 words.
- mood: up to 5 single words.
- why_it_works: 1 or 2 sentences on the persuasion device, in general terms.
- layout: where the product, headline, lists, badges, tables and logo sit, as proportions of the frame, in reading order. 2 to 4 sentences.
- text_roles: each piece of text on the image as {role, example, placement}, ${TEXT_ROLES_MAX} at most, in reading order. role is 1 of headline, subhead, point, badge, label, price, table, quote, attribution, caption, logo. example is the reference's own wording, shortened to 8 words at most.
- needs: a list of up to ${NEEDS_MAX} short items, what a brand must have to build this truthfully (for example "a real customer review", "certifications actually held", "sourced prices of what it replaces").
- rebuild_prompt: a recipe for the photograph underneath the text: set, surface, light, camera angle, how the product is posed, props. Write it for "the product", never the reference's brand. No words that appear on the image. 3 to 5 sentences.
- watch_outs: up to 5 things that go wrong when this is rebuilt.
- bucket: the template bucket this image belongs to, 1 of the ids in the guide below.
- type: the closest gallery type, 1 of: ${PDP_TYPES.map((t) => t.id).join(", ")}
- note: 1 sentence a curator would write: what the image does and the device it uses, without the brand's own claims.

${BUCKET_GUIDE}`;
export async function analyzeLibraryRef(ref: LibraryRefRow): Promise<{
    bucket: string;
}> {
    const t = pdpType(ref.type);
    const out = await geminiJson({
        brandId: SHARED_BRAND,
        task: "library_analysis",
        model: env.MODEL_REFERENCE,
        system: SYSTEM,
        user: `Gallery type: ${t?.label ?? ref.type} (${ref.group_name ?? ""}). Its job: ${t?.job ?? ""}.\nCurator's note: ${ref.note || "(none)"}`,
        schema: Out,
        images: [path.join(env.SKILLS_DIR, ref.file)],
        effort: "low",
        maxTokens: 4000,
        refType: "library",
        refId: ref.id,
    });
    const vertical = (VERTICALS as readonly string[]).includes(out.vertical) ? out.vertical : "";
    const bucket = pdpBucket(out.bucket) ? out.bucket : BUCKET_OTHER;
    const type = !pdpType(ref.type) && pdpType(out.type) ? out.type : ref.type;
    const tags: LibraryTags = {
        ...ref.tags,
        works_for: out.works_for.filter((v) => (VERTICALS as readonly string[]).includes(v) && v !== vertical),
        product_format: (PRODUCT_FORMATS as readonly string[]).includes(out.product_format) ? out.product_format : "other",
        has_person: out.has_person,
        text_overlay: out.text_overlay,
        palette_hex: out.palette_hex.filter((h) => /^#[0-9a-f]{6}$/i.test(h)),
        palette_name: out.palette_name,
        mood: out.mood,
        bucket,
    };
    const analysis: LibraryAnalysis = { rebuild_prompt: out.rebuild_prompt, why_it_works: out.why_it_works, layout: out.layout, text_roles: clipTextRoles(out.text_roles), needs: needsList(out.needs), watch_outs: out.watch_outs, model: env.MODEL_REFERENCE };
    const note = ref.note || out.note.trim();
    db.update(schema.libraryRefs).set({ vertical, tags, analysis, analyzed: true, usable: out.usable, craft: out.craft, ...(note !== ref.note ? { note } : {}), ...(type !== ref.type ? { type, group_name: pdpType(type)?.group ?? ref.group_name } : {}) }).where(eq(schema.libraryRefs.id, ref.id)).run();
    return { bucket };
}
export async function analyzePdpLibrary(opts: {
    limit?: number;
    concurrency?: number;
    onProgress?: (done: number, total: number, failed: number) => void;
} = {}): Promise<{
    done: number;
    failed: number;
    errors: string[];
}> {
    const todo = db.select().from(schema.libraryRefs).where(and(eq(schema.libraryRefs.library, "pdp"), eq(schema.libraryRefs.analyzed, false))).all().slice(0, opts.limit ?? 10000);
    let done = 0;
    let failed = 0;
    const errors: string[] = [];
    let next = 0;
    const worker = async () => {
        for (;;) {
            const ref = todo[next++];
            if (!ref)
                return;
            try {
                await analyzeLibraryRef(ref);
                done++;
            }
            catch (e) {
                failed++;
                errors.push(`${ref.id}: ${(e as Error).message.slice(0, 160)}`);
            }
            opts.onProgress?.(done, todo.length, failed);
        }
    };
    await Promise.all(Array.from({ length: opts.concurrency ?? 6 }, worker));
    if (done)
        recordBuckets();
    return { done, failed, errors };
}
