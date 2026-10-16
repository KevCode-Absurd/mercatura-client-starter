import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { loadBrandLook, type BrandLook } from "../brand-look";
import { getBrandRow } from "../brands";
import { writingBrain } from "../claims-through";
import { customerVoice } from "../customer-voice";
import { listPersonas } from "../personas/store";
import type { PersonaProfile } from "../personas/types";
import { listProductPhotos } from "../product-photos";
import type { InsightType, ObjectionClass } from "../taxonomy";
import type { Bucket, Quote } from "./types";
export interface Photo {
    src: string;
    local: string | null;
    name: string;
    bucket: Bucket;
}
export interface DocQuote extends Quote {
    persona_id: string | null;
}
export interface Objection {
    q: string;
    a: string;
    persona_id: string | null;
    source: "documents" | "research";
    cls?: ObjectionClass | null;
}
export interface ResearchTheme {
    id: string;
    type: InsightType;
    label: string;
    summary: string;
    personas: string[];
    frequency: number;
}
export interface LandingContext {
    brandId: string;
    brand: BrandBrain;
    look: BrandLook | null;
    personas: PersonaProfile[];
    photos: Record<string, Photo[]>;
    quotes: DocQuote[];
    objections: Objection[];
    themes: ResearchTheme[];
}
export function bucketOfFile(name: string): Bucket {
    const n = name.toLowerCase();
    if (/ugc|review|testimonial|customer/.test(n))
        return "reviews-ugc";
    if (/expect|timeline|routine|how|step/.test(n))
        return "how-it-works";
    if (/clinical|study|science|ingredient|facts|label/.test(n))
        return "benefit-deep-dive";
    if (/benefit/.test(n))
        return "benefits-list";
    if (/compare|vs|versus|different/.test(n))
        return "what-makes-us-different";
    if (/before|after/.test(n))
        return "before-after";
    if (/lifestyle|hand|use|occasion|mom|kid|life/.test(n))
        return "occasions";
    if (/box|bundle|kit|included|set/.test(n))
        return "whats-included";
    if (/guarantee/.test(n))
        return "guarantee";
    return "product-shot";
}
function manifestOf(brandDir: string): Map<string, string> {
    const f = path.join(brandBrainDir(brandDir), "assets", "manifest.json");
    if (!fs.existsSync(f))
        return new Map();
    try {
        const rows = JSON.parse(fs.readFileSync(f, "utf-8")) as {
            path: string;
            source_url?: string;
        }[];
        return new Map(rows.filter((r) => r.source_url).map((r) => [r.path, r.source_url!]));
    }
    catch {
        return new Map();
    }
}
export function productPhotos(brandId: string): Record<string, Photo[]> {
    const row = getBrandRow(brandId);
    if (!row)
        return {};
    const manifest = manifestOf(row.dir);
    const out: Record<string, Photo[]> = {};
    for (const p of listProductPhotos(brandId)) {
        const seen = new Set<string>();
        const list: Photo[] = [];
        const push = (name: string, local: boolean) => {
            if (seen.has(name))
                return;
            seen.add(name);
            const rel = `${p.folder}/${name}`;
            const cdn = manifest.get(rel);
            const src = cdn ?? (local ? `/api/brand-file/assets/${rel.split("/").map(encodeURIComponent).join("/")}` : "");
            if (src)
                list.push({ src, local: local ? rel : null, name, bucket: bucketOfFile(name) });
        };
        if (p.main)
            push(p.main, true);
        for (const f of p.files)
            push(f, true);
        for (const rel of manifest.keys())
            if (rel.startsWith(`${p.folder}/`))
                push(rel.slice(p.folder.length + 1), false);
        out[p.product_id] = list;
    }
    return out;
}
const norm = (s: string) => s.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
export function documentVoice(brandDir: string, personas: {
    id: string;
    name: string;
}[]): {
    quotes: DocQuote[];
    objections: Objection[];
} {
    const f = path.join(brandBrainDir(brandDir), "customer-avatars.md");
    if (!fs.existsSync(f))
        return { quotes: [], objections: [] };
    const quotes: DocQuote[] = [];
    const objections: Objection[] = [];
    let persona: string | null = null;
    for (const line of fs.readFileSync(f, "utf-8").split(/\r?\n/)) {
        const h = line.match(/^##\s+(.*)$/);
        if (h) {
            const title = h[1].replace(/^avatar\s*\d+\s*:\s*/i, "").replace(/["“”]/g, "");
            persona = personas.find((p) => norm(p.name) === norm(title))?.id ?? null;
            continue;
        }
        const q = line.match(/^\s*-\s*["“](.+?)["”]\s*\(([^)]+)\)\s*$/);
        if (q && q[1].length >= 12) {
            quotes.push({ text: q[1].trim(), who: q[2].trim(), source: "documents", persona_id: persona });
            continue;
        }
        const row = line.match(/^\|\s*["“](.+?)["”][^|]*\|\s*(.+?)\s*\|\s*$/);
        if (row && !/^-+$/.test(row[2]) && row[2].length > 8)
            objections.push({ q: row[1].trim(), a: row[2].trim(), persona_id: persona, source: "documents" });
    }
    return { quotes, objections };
}
const QUOTE_TYPES: InsightType[] = ["proof_point", "desire", "purchase_driver"];
export function researchQuotes(brandId: string, limit = 40): DocQuote[] {
    const rows = db
        .select({ id: schema.insights.id, quote: schema.insights.quote, type: schema.insights.type, source: schema.insights.source_type, persona: schema.insights.persona_id, intensity: schema.insights.intensity })
        .from(schema.insights)
        .where(and(eq(schema.insights.brand_id, brandId), inArray(schema.insights.type, QUOTE_TYPES), customerVoice))
        .orderBy(desc(schema.insights.intensity))
        .limit(limit * 2)
        .all();
    const who: Record<string, string> = { review: "From a customer review", survey: "From a customer survey", call: "From a customer call", ticket: "From a support ticket", community: "From an online community" };
    return rows
        .filter((r) => r.quote.length >= 20 && r.quote.length <= 320)
        .sort((a, b) => (a.type === "proof_point" ? 0 : 1) - (b.type === "proof_point" ? 0 : 1) || b.intensity - a.intensity)
        .slice(0, limit)
        .map((r) => ({ text: r.quote, who: who[r.source] ?? "From a customer", source: "research" as const, ref: r.id, persona_id: r.persona }));
}
const THEME_TYPES: InsightType[] = ["objection", "final_objection", "desire", "failed_solution", "accommodation", "trigger_moment", "proof_point", "buyer_word", "failure_mode"];
export function researchThemes(brandId: string, limit = 24): ResearchTheme[] {
    return db
        .select({ id: schema.themes.id, type: schema.themes.type, label: schema.themes.label, summary: schema.themes.summary, personas: schema.themes.personas, frequency: schema.themes.frequency })
        .from(schema.themes)
        .where(and(eq(schema.themes.brand_id, brandId), inArray(schema.themes.type, THEME_TYPES)))
        .orderBy(schema.themes.rank)
        .limit(limit)
        .all();
}
export function researchObjectionClasses(brandId: string): ObjectionClass[] {
    const rows = db.select({ c: schema.insights.objection_class }).from(schema.insights).where(and(eq(schema.insights.brand_id, brandId), customerVoice)).all();
    const n = new Map<ObjectionClass, number>();
    for (const r of rows)
        if (r.c)
            n.set(r.c, (n.get(r.c) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}
export function landingContext(brandId: string): LandingContext {
    const brand = writingBrain(brandId);
    const row = getBrandRow(brandId)!;
    const personas = listPersonas(brandId);
    const docs = documentVoice(row.dir, personas);
    const research = researchQuotes(brandId);
    const seen = new Set<string>();
    const quotes = [...research, ...docs.quotes].filter((q) => {
        const k = norm(q.text);
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
    return { brandId, brand, look: loadBrandLook(brandId), personas, photos: productPhotos(brandId), quotes, objections: docs.objections, themes: researchThemes(brandId) };
}
