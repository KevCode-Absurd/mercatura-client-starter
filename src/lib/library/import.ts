import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/db";
import type { LibraryAnalysis, LibraryTags } from "@/db/schema";
import { env } from "../env";
import { applyBuckets, importTemplateRefs } from "./templates";
export const PDP_ROOT = "PDP Image Factory/PDP Image Factory/PDP Library";
export const SHOOT_ROOT = "Photoshoot Factory/Photoshoot Factory/Photoshoot Library";
const abs = (...rel: string[]) => path.join(env.SKILLS_DIR, ...rel);
const posix = (p: string) => p.split(path.sep).join("/");
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf-8")) as T;
interface PdpEntry {
    id: number;
    type: string;
    type_name: string;
    group: string;
    brand: string;
    file: string;
    note: string;
    source: string;
}
export async function importPdpLibrary(): Promise<{
    imported: number;
    missing: number;
}> {
    const manifest = abs(PDP_ROOT, "LIBRARY.json");
    const entries = fs.existsSync(manifest) ? readJson<{
        entries: PdpEntry[];
    }>(manifest).entries : [];
    const thumbs = abs(PDP_ROOT, "_thumbs");
    fs.mkdirSync(thumbs, { recursive: true });
    let imported = 0;
    let missing = 0;
    for (const e of entries) {
        const file = abs(PDP_ROOT, e.file);
        if (!fs.existsSync(file)) {
            missing++;
            continue;
        }
        const id = `pdp_${String(e.id).padStart(3, "0")}`;
        const thumbRel = posix(path.join(PDP_ROOT, "_thumbs", `${id}.jpg`));
        let width: number | null = null;
        let height: number | null = null;
        try {
            const meta = await sharp(file).metadata();
            width = meta.width ?? null;
            height = meta.height ?? null;
            if (!fs.existsSync(abs(thumbRel)))
                await sharp(file).rotate().resize(480, 480, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(abs(thumbRel));
        }
        catch {
            missing++;
            continue;
        }
        const existing = db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.id, id)).get();
        const row = {
            library: "pdp" as const,
            file: posix(path.join(PDP_ROOT, e.file)),
            thumb: thumbRel,
            type: e.type,
            group_name: e.group,
            brand: e.brand === "Reference" ? null : e.brand,
            note: e.note ?? "",
            width,
            height,
        };
        if (existing)
            db.update(schema.libraryRefs).set(row).where(eq(schema.libraryRefs.id, id)).run();
        else
            db.insert(schema.libraryRefs).values({ id, ...row, vertical: "", tags: { source: e.source }, analysis: null, analyzed: false }).run();
        imported++;
    }
    const extra = await importTemplateRefs();
    applyBuckets();
    return { imported: imported + extra.imported, missing: missing + extra.missing };
}
interface ShootImage {
    id: string;
    file: string;
    vertical: string;
    orig_w?: number;
    orig_h?: number;
    title?: string;
}
interface ShootBreakdown {
    usable?: boolean;
    removed?: boolean;
    craft_tier?: number;
    has_watermark?: boolean;
    text_overlay?: string;
    shot_archetype?: string;
    subject?: string;
    lighting?: string;
    composition?: string;
    surface_set?: string[];
    palette_hex?: string[];
    palette_name?: string;
    mood?: string[];
    rebuild_prompt?: string;
    works_for?: string[];
    teardown?: {
        why_it_works?: string;
        light_setup?: string;
        camera?: string;
        set_build?: string;
        styling_notes?: string;
        watch_outs?: string[];
        hero_element?: string;
    };
}
export function importPhotoshootLibrary(): {
    imported: number;
    missing: number;
} {
    const manifest = abs(SHOOT_ROOT, "LIBRARY.json");
    if (!fs.existsSync(manifest))
        return { imported: 0, missing: 0 };
    const images = readJson<{
        images: ShootImage[];
    }>(manifest).images;
    const breakdown = fs.existsSync(abs(SHOOT_ROOT, "BREAKDOWN.json")) ? readJson<Record<string, ShootBreakdown>>(abs(SHOOT_ROOT, "BREAKDOWN.json")) : {};
    const have = new Set(db.select({ id: schema.libraryRefs.id }).from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "photoshoot")).all().map((r) => r.id));
    let imported = 0;
    let missing = 0;
    const rows: (typeof schema.libraryRefs.$inferInsert)[] = [];
    for (const img of images) {
        if (!fs.existsSync(abs(SHOOT_ROOT, img.file))) {
            missing++;
            continue;
        }
        const b = breakdown[img.id];
        const id = `shoot_${img.id}`;
        const thumb = path.join(SHOOT_ROOT, "_thumbs", `${path.dirname(img.file)}__${path.basename(img.file)}`);
        const tags: LibraryTags = {
            works_for: b?.works_for ?? [],
            subject: b?.subject,
            lighting: b?.lighting,
            composition: b?.composition,
            surface: b?.surface_set ?? [],
            mood: b?.mood ?? [],
            palette_hex: b?.palette_hex ?? [],
            palette_name: b?.palette_name,
            text_overlay: b?.text_overlay ?? "none",
            has_person: !!b?.subject && /model|on_body/.test(b.subject),
        };
        const analysis: LibraryAnalysis | null = b?.rebuild_prompt ? { rebuild_prompt: b.rebuild_prompt, ...b.teardown } : null;
        const row = {
            id,
            library: "photoshoot" as const,
            file: posix(path.join(SHOOT_ROOT, img.file)),
            thumb: fs.existsSync(abs(thumb)) ? posix(thumb) : null,
            vertical: img.vertical,
            type: b?.shot_archetype ?? "unsorted",
            group_name: null,
            brand: null,
            note: analysis?.why_it_works ?? img.title ?? "",
            usable: !!b && b.usable !== false && !b.removed && !b.has_watermark && b.text_overlay !== "heavy",
            craft: b?.craft_tier ?? 3,
            width: img.orig_w ?? null,
            height: img.orig_h ?? null,
            tags,
            analysis,
            analyzed: !!analysis,
        };
        if (have.has(id))
            db.update(schema.libraryRefs).set(row).where(eq(schema.libraryRefs.id, id)).run();
        else
            rows.push(row);
        imported++;
    }
    for (let i = 0; i < rows.length; i += 200)
        db.insert(schema.libraryRefs).values(rows.slice(i, i + 200)).run();
    return { imported, missing };
}
export const AD_ROOT = "Static Ad Factory/Static Ad Factory/Swipe Library";
const AD_VERTICALS: Record<string, string> = {
    Supplements: "Supplements & Wellness",
    "Health & Wellness": "Supplements & Wellness",
    "Cosmetics & Beauty": "Beauty & Skincare",
    "Home & Kitchen": "Kitchen & Cookware",
    "Home & Garden": "Home, Furniture & Candles",
    Fashion: "Fashion & Apparel",
    "Food & Beverage": "Food",
    "Food & Drink": "Food",
    Pet: "Pet",
    Accessories: "Bags & Leather Goods",
    "Leather Goods & Bags": "Bags & Leather Goods",
    Tech: "Tech & Accessories",
    Footwear: "Footwear & Sneakers",
    "Baby & Kids": "Baby & Kids",
    "Kids & Baby": "Baby & Kids",
    "Jewelry & Watches": "Jewelry & Watches",
    Fitness: "Sportswear & Activewear",
};
export const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function csvRow(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') {
                cur += '"';
                i++;
            }
            else if (c === '"')
                quoted = false;
            else
                cur += c;
        }
        else if (c === '"')
            quoted = true;
        else if (c === ",") {
            out.push(cur);
            cur = "";
        }
        else
            cur += c;
    }
    out.push(cur);
    return out;
}
interface Teardown {
    sections?: {
        format?: string;
        canvas?: string;
        zones?: string;
        copy?: string;
        type?: string;
        color?: string;
        product_staging?: string;
        why_it_works?: string;
        swap_recipe?: string;
    };
    copy_lines?: string[];
}
export async function importAdLibrary(opts: {
    thumbs?: boolean;
} = {}): Promise<{
    imported: number;
    missing: number;
}> {
    const index = abs(AD_ROOT, "Winning Static Ads", "INDEX.csv");
    if (!fs.existsSync(index))
        return { imported: 0, missing: 0 };
    const lines = fs.readFileSync(index, "utf-8").split(/\r?\n/).filter(Boolean);
    const head = csvRow(lines[0]);
    const col = (r: string[], k: string) => r[head.indexOf(k)] ?? "";
    const teardowns = fs.existsSync(abs(AD_ROOT, "TEARDOWNS.json")) ? readJson<Record<string, Teardown>>(abs(AD_ROOT, "TEARDOWNS.json")) : {};
    const funnel = fs.existsSync(abs(AD_ROOT, "FUNNEL.json")) ? readJson<{
        stages: Record<string, string>;
    }>(abs(AD_ROOT, "FUNNEL.json")).stages : {};
    fs.mkdirSync(abs(AD_ROOT, "_thumbs"), { recursive: true });
    const have = new Set(db.select({ id: schema.libraryRefs.id }).from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "ad")).all().map((r) => r.id));
    let imported = 0;
    let missing = 0;
    const rows: (typeof schema.libraryRefs.$inferInsert)[] = [];
    for (const line of lines.slice(1)) {
        const r = csvRow(line);
        const entry = col(r, "entry");
        const rel = path.join(AD_ROOT, "Winning Static Ads", col(r, "archetype"), col(r, "file"));
        if (!entry || !fs.existsSync(abs(rel))) {
            missing++;
            continue;
        }
        const id = `ad_${entry.padStart(4, "0")}`;
        const thumbRel = path.join(AD_ROOT, "_thumbs", `${id}.jpg`);
        let width: number | null = null;
        let height: number | null = null;
        if (opts.thumbs !== false) {
            try {
                const meta = await sharp(abs(rel)).metadata();
                width = meta.width ?? null;
                height = meta.height ?? null;
                if (!fs.existsSync(abs(thumbRel)))
                    await sharp(abs(rel)).rotate().resize(480, 480, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 76 }).toFile(abs(thumbRel));
            }
            catch {
                missing++;
                continue;
            }
        }
        const t = teardowns[entry]?.sections ?? {};
        const text = `${t.zones ?? ""} ${t.product_staging ?? ""}`.toLowerCase();
        const copyLines = teardowns[entry]?.copy_lines ?? [];
        const words = copyLines.join(" ").split(/\s+/).filter(Boolean).length;
        const analysis: LibraryAnalysis = {
            rebuild_prompt: t.swap_recipe,
            why_it_works: t.why_it_works,
            layout: [t.canvas, t.zones].filter(Boolean).join("\n"),
            styling_notes: t.product_staging,
            type_notes: t.type,
            color_notes: t.color,
            format: t.format || col(r, "format"),
            copy_lines: copyLines.slice(0, 14),
        };
        const tags: LibraryTags = { has_person: /\b(hand|hands|woman|man|model|face|person|people|girl|guy)\b/.test(text), text_overlay: words > 25 ? "heavy" : words > 0 ? "minimal" : "none", source: col(r, "source_vertical") };
        const row = {
            id,
            library: "ad" as const,
            file: posix(rel),
            thumb: fs.existsSync(abs(thumbRel)) ? posix(thumbRel) : null,
            vertical: AD_VERTICALS[col(r, "source_vertical")] ?? "",
            type: slug(col(r, "archetype")),
            group_name: funnel[entry] ?? null,
            brand: col(r, "brand") || null,
            note: t.format || col(r, "format"),
            usable: !!t.swap_recipe,
            craft: 4,
            width,
            height,
            tags,
            analysis,
            analyzed: !!t.swap_recipe,
        };
        if (have.has(id))
            db.update(schema.libraryRefs).set(row).where(eq(schema.libraryRefs.id, id)).run();
        else
            rows.push(row);
        imported++;
    }
    for (let i = 0; i < rows.length; i += 200)
        db.insert(schema.libraryRefs).values(rows.slice(i, i + 200)).run();
    return { imported, missing };
}
export function libraryCounts(): Record<string, {
    total: number;
    usable: number;
    analyzed: number;
}> {
    const rows = db
        .select({ library: schema.libraryRefs.library, total: sql<number> `count(*)`, usable: sql<number> `sum(${schema.libraryRefs.usable})`, analyzed: sql<number> `sum(${schema.libraryRefs.analyzed})` })
        .from(schema.libraryRefs)
        .groupBy(schema.libraryRefs.library)
        .all();
    return Object.fromEntries(rows.map((r) => [r.library, { total: r.total, usable: r.usable ?? 0, analyzed: r.analyzed ?? 0 }]));
}
