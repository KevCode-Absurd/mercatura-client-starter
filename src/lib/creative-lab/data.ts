import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { loadBrandLook } from "../brand-look";
import { emptyDraft } from "./engine";
import { readLab } from "./store";
import type { LabSource } from "./types";
import { qualityContext } from "../standalone/data";
import { labAcceptedRepairs } from "./feedback";
import { mediaChoices } from "./media";
export function creativeLabData(brandId: string) {
    const brand = loadBrandBrain(brandId);
    const look = loadBrandLook(brandId);
    const concepts = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    const sources: LabSource[] = db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.updated_at)).limit(80).all().map(s => ({
        id: s.id, title: s.title, body: s.lines.map(l => l.text).join("\n"), productId: concepts.find(c => c.id === s.concept_id)?.product_id ?? "",
        hooks: s.hook_variants.map(h => ({ id: h.id, spoken: h.text, visual: h.first_frame ?? "", overlay: h.overlay ?? "", promise: "", deliveredIn: "", bodyStart: h.replaces ?? 1 })),
        scenes: s.lines.map((l, i) => ({ id: `scene-${i + 1}`, visual: l.visual_note ?? "", speech: l.text, overlay: l.on_screen ?? "", seconds: Math.max(3, l.text.split(/\s/).length / 145 * 60 + 1), pause: 1, proof: l.claim_ids.join(", "), objects: [] })),
    }));
    const assets = db.select().from(schema.studioRuns).where(eq(schema.studioRuns.brand_id, brandId)).orderBy(desc(schema.studioRuns.updated_at)).limit(80).all().flatMap(r => r.items.flatMap(i => (i.outputs ?? []).map(o => ({ title: `${r.title}: ${i.label || i.id} (${o.aspect})`, url: `/api/assets/${o.path}`, kind: "image" as const, productId: r.product_id }))));
    const scriptProducts = new Map(db.select({ id: schema.scripts.id, conceptId: schema.scripts.concept_id }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all().map(s => [s.id, concepts.find(c => c.id === s.conceptId)?.product_id ?? ""]));
    const jobAssets = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.brand_id, brandId), sql `json_array_length(${schema.outputJobs.assets}) > 0`)).orderBy(desc(schema.outputJobs.updated_at)).limit(80).all().flatMap(j => j.assets.filter(a => ["image", "video"].includes(a.kind)).map(a => ({ title: a.caption ?? j.id, url: `/api/assets/${a.path.replace(/^assets\//, "")}`, kind: a.kind as "image" | "video", productId: scriptProducts.get(j.script_id) ?? "" })));
    const revisions = readLab(brandId);
    const initial = revisions.at(-1)?.draft ?? emptyDraft({ productId: brand.products[0]?.id ?? "", buyer: brand.personas[0]?.summary ?? "", art: { ...emptyDraft().art, palette: look?.palette.map(p => p.hex).join(", ") || emptyDraft().art.palette, typography: look?.fonts.find(f => f.role === "heading")?.family || "system-ui" } });
    if (!revisions.length)
        initial.artBaseline = { ...initial.art };
    return { initial, revisions, sources, live: process.env.LLM_MODE === "live", acceptedRepairs: labAcceptedRepairs(brandId, initial).map(r => `${r.diagnosis}: ${r.acceptedRepair}`).join("\n"), evidence: qualityContext(brandId).evidence, market: brand.brand.market, assets: mediaChoices([...assets, ...jobAssets]), products: brand.products.map(p => ({ id: p.id, name: p.name, facts: [...(p.specs ?? []).map(s => `${s.name}: ${s.value}`), ...(p.ingredients ?? []).map(i => `${i.name}: ${i.dose} (${i.job})`), p.counted ?? ""].filter(Boolean).join("\n") })) };
}
