import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { brandMarkdownFiles } from "../brand-convert";
import { brandVoiceText } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { loadClaimSources } from "../claim-sources";
import { customerVoice } from "../customer-voice";
import { env } from "../env";
import { learnedRules } from "../lessons";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { freshId, listPersonas, savePersona } from "../personas/store";
import { PERSONA_AWARENESS, type PersonaProfile } from "../personas/types";
import { renderPrompt } from "../prompts";
import { isBrandSource } from "../taxonomy";
import { offerBook } from "../offers/book";
import { buildOfferSet } from "./offer-set";
import { deleteAngle, listAngles, listOfferFits, saveAngle } from "./store";
export const STARTER_BASIS = "Made from the persona's own lines, with no model";
const WEBSITE_FILE = "website.md";
const NOT_SOURCES = new Set(["readme.md"]);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const empty = (s: string | undefined | null) => !s || !s.trim() || /^not captured\.?$/i.test(s.trim());
export interface BrandSources {
    website: boolean;
    documents: number;
    customer: number;
    ads: number;
    founder: number;
    websiteOnly: boolean;
}
export function brandSources(brandId: string): BrandSources {
    const files = brandMarkdownFiles(brandId).map((f) => f.name.toLowerCase());
    const byType = db.select({ t: schema.sourceItems.source_type, n: sql<number> `count(*)` }).from(schema.sourceItems).where(eq(schema.sourceItems.brand_id, brandId)).groupBy(schema.sourceItems.source_type).all();
    const count = (keep: (t: string) => boolean) => byType.filter((r) => keep(r.t)).reduce((s, r) => s + r.n, 0);
    let ads = 0;
    try {
        ads = loadClaimSources(brandId).read.filter((r) => r.origin === "ad").length;
    }
    catch {
        ads = 0;
    }
    const website = files.includes(WEBSITE_FILE) || count((t) => t === "website") > 0;
    const documents = files.filter((f) => f !== WEBSITE_FILE && !NOT_SOURCES.has(f)).length;
    const customer = count((t) => !isBrandSource(t));
    const founder = count((t) => t === "founder");
    return { website, documents, customer, ads, founder, websiteOnly: website && !documents && !customer && !ads && !founder };
}
export interface BuilderGaps {
    personas: boolean;
    personaFields: number;
    angles: boolean;
    starterAngles: boolean;
    offers: boolean;
    any: boolean;
}
export function builderGaps(brandId: string): BuilderGaps {
    const brand = loadBrandBrain(brandId);
    const angles = listAngles(brandId);
    const gaps = {
        personas: !brand.personas.length,
        personaFields: brand.personas.filter((p) => empty(p.wants) || empty(p.trigger) || empty(p.problem)).length,
        angles: !angles.length,
        starterAngles: angles.length > 0 && angles.every((a) => a.basis === STARTER_BASIS),
        offers: !listOfferFits(brandId).length,
    };
    return { ...gaps, any: gaps.personas || gaps.personaFields > 0 || gaps.angles || gaps.starterAngles || gaps.offers };
}
export function ensureAngles(brandId: string): number {
    if (listAngles(brandId).length)
        return 0;
    const brand = loadBrandBrain(brandId);
    let made = 0;
    for (const p of brand.personas) {
        const short = clip(p.name.replace(/^the\s+/i, ""), 34);
        const lines = [
            !empty(p.problem) && { name: `${short}: the problem`, line: `Open on what this buyer lives with, then show the product as the way out. ${clip(p.problem.trim(), 300)}` },
            !empty(p.trigger) && { name: `${short}: the moment`, line: `Open on the moment that makes this buyer act, and make acting easy. ${clip(p.trigger.trim(), 300)}` },
        ].filter((x): x is {
            name: string;
            line: string;
        } => !!x);
        for (const a of lines) {
            try {
                saveAngle(brandId, { name: a.name, line: a.line, persona_ids: [p.id], basis: STARTER_BASIS });
                made++;
            }
            catch {
            }
        }
    }
    return made;
}
const Out = z.object({
    personas: z
        .array(z.object({
        key: z.string(),
        name: z.string().default(""),
        summary: z.string().default(""),
        problem: z.string().default(""),
        wants: z.string().default(""),
        trigger: z.string().default(""),
        identity: z.string().default(""),
        awareness: z.enum(PERSONA_AWARENESS).catch("problem_aware"),
        language: z.array(z.string()).default([]),
    }))
        .max(12)
        .default([]),
    angles: z.array(z.object({ name: z.string().min(2), line: z.string().min(8), personas: z.array(z.string()).default([]), basis: z.string().default("") })).max(40).default([]),
});
function documentsText(brandId: string, max = 28000): string {
    const files = brandMarkdownFiles(brandId).filter((f) => !NOT_SOURCES.has(f.name.toLowerCase()));
    if (!files.length)
        return "(none kept: work from the brand block and its voice)";
    const each = Math.max(3000, Math.floor(max / files.length));
    return files.map((f) => `### ${f.name}\n${clip(f.text.replace(/\n{3,}/g, "\n\n"), each)}`).join("\n\n");
}
function researchText(brandId: string): string {
    const themes = db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).orderBy(schema.themes.rank).limit(14).all();
    if (themes.length) {
        return themes
            .map((t) => {
            const q = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.theme_id, t.id), customerVoice)).orderBy(desc(schema.insights.intensity)).limit(3).all();
            return `${t.label}\n${q.map((x) => `  "${clip(x.quote.replace(/\s+/g, " "), 180)}"`).join("\n")}`;
        })
            .join("\n");
    }
    const items = db.select({ type: schema.sourceItems.source_type, text: schema.sourceItems.redacted_text, raw: schema.sourceItems.raw_text }).from(schema.sourceItems).where(eq(schema.sourceItems.brand_id, brandId)).orderBy(desc(schema.sourceItems.date)).limit(200).all().filter((i) => !isBrandSource(i.type));
    if (!items.length)
        return "(nothing imported yet: every `language` list is empty)";
    return items
        .slice(0, 30)
        .map((i) => `- (${i.type}) "${clip((i.text || i.raw).replace(/\s+/g, " "), 260)}"`)
        .join("\n");
}
export interface StarterResult {
    personas: number;
    filled: number;
    angles: number;
    offers: number;
    from: BrandSources;
    note: string;
}
export async function writeStarter(brandId: string, opts: {
    offers?: boolean;
} = {}): Promise<StarterResult> {
    const from = brandSources(brandId);
    if (!llmEnabled()) {
        const made = ensureAngles(brandId);
        return { personas: 0, filled: 0, angles: made, offers: 0, from, note: made ? `${made} simple angles were made from the personas. Writing fuller ones needs live mode.` : "Writing these needs live mode." };
    }
    const brand = loadBrandBrain(brandId);
    const profiles = listPersonas(brandId);
    const have = listAngles(brandId);
    const real = have.filter((a) => a.basis !== STARTER_BASIS);
    const wantNew = Math.max(0, 3 - brand.personas.length);
    const cur = brand.brand.currency;
    const p = renderPrompt("builder-start", {
        brand_name: brand.brand.name,
        brand: [
            `${brand.brand.name}: ${brand.brand.one_liner} Category: ${brand.brand.category}. Market: ${brand.brand.market}.`,
            "Products:",
            ...brand.products.map((x) => `- ${x.name}. ${clip(x.format, 160)}`),
            "What it sells them as:",
            ...offerBook(brandId, brand).slice(0, 12).map((o) => `- ${o.name}, ${cur} ${o.price}.${o.terms ? ` ${clip(o.terms, 140)}` : ""}`),
            brand.guarantee ? `Guarantee: ${brand.guarantee.text}` : "",
        ]
            .filter(Boolean)
            .join("\n"),
        brand_voice: brandVoiceText(brandId, { surfaces: ["primary_text", "headline"], brand }),
        lessons: learnedRules(brandId, "writes"),
        personas: brand.personas.map((x) => `- ${x.id}: ${x.name}. ${clip(x.summary, 220)} | ${empty(x.problem) ? "(empty)" : x.problem} | ${empty(x.wants) ? "(empty)" : x.wants} | ${empty(x.trigger) ? "(empty)" : x.trigger}`).join("\n") || "(none yet)",
        angles: real.map((a) => `- ${a.name}: ${clip(a.line, 160)}`).join("\n") || "(none yet)",
        documents: documentsText(brandId),
        research: researchText(brandId),
        ask: [
            brand.personas.length ? "Return every persona listed, with its empty lines filled." : "",
            wantNew ? `Add ${wantNew === 1 ? "1 new persona" : `up to ${wantNew} new personas`}, each a buyer the material shows and no listed persona covers. Add none the material does not show.` : "Add no new persona.",
            "Then the angles: 2 or 3 for each persona, and 1 or 2 that fit any buyer.",
        ]
            .filter(Boolean)
            .join("\n"),
    });
    const out = await structuredJson({ brandId, task: "persona_build", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, effort: "medium", maxTokens: 10000, refType: "brand", refId: brandId });
    const idOf = new Map<string, string>();
    let filled = 0;
    let added = 0;
    const one = (s: string, n = 300) => clip(s.replace(/\s+/g, " ").trim(), n);
    for (const x of out.personas) {
        const mine = profiles.find((q) => q.id === x.key && q.status === "active");
        try {
            if (mine) {
                idOf.set(x.key, mine.id);
                const next: PersonaProfile = {
                    ...mine,
                    problem: empty(mine.problem) && !empty(x.problem) ? one(x.problem) : mine.problem,
                    wants: empty(mine.wants) && !empty(x.wants) ? one(x.wants) : mine.wants,
                    trigger: empty(mine.trigger) && !empty(x.trigger) ? one(x.trigger) : mine.trigger,
                    identity: empty(mine.identity) && !empty(x.identity) ? one(x.identity) : mine.identity,
                    awareness: mine.source === "documents" && mine.awareness === "problem_aware" ? x.awareness : mine.awareness,
                };
                if (JSON.stringify(next) !== JSON.stringify(mine)) {
                    savePersona(brandId, next);
                    filled++;
                }
            }
            else if (added < wantNew && x.name.trim().length > 1 && !empty(x.problem) && !empty(x.summary)) {
                const id = freshId(brandId, x.name);
                savePersona(brandId, { id, name: one(x.name, 60), summary: one(x.summary, 400), problem: one(x.problem), trigger: one(x.trigger), wants: one(x.wants), identity: one(x.identity), language: [], who: { age: "", gender: "", life: "" }, objections: [], angle: "", awareness: x.awareness, product_ids: brand.products.length === 1 ? [brand.products[0].id] : [], offer_id: null, sounds_like: [], share: null, performance: null, source: "documents", basis: from.websiteOnly ? "Written from the brand's website alone" : "Written from the brand's own pages, ads and research", look: "", image: null, status: "active" });
                idOf.set(x.key, id);
                added++;
            }
        }
        catch {
        }
    }
    const taken = new Set(real.map((a) => a.name.toLowerCase()));
    const ids = new Set(loadBrandBrain(brandId).personas.map((q) => q.id));
    let angles = 0;
    for (const a of out.angles) {
        const name = one(a.name, 60);
        if (taken.has(name.toLowerCase()))
            continue;
        try {
            saveAngle(brandId, { name, line: one(a.line, 500), persona_ids: [...new Set(a.personas.map((k) => idOf.get(k) ?? k).filter((id) => ids.has(id)))], basis: one(a.basis || (from.websiteOnly ? "The brand's website" : "The brand's own material"), 300) });
            taken.add(name.toLowerCase());
            angles++;
        }
        catch {
        }
    }
    if (angles)
        for (const a of have.filter((x) => x.basis === STARTER_BASIS))
            deleteAngle(brandId, a.id);
    else
        ensureAngles(brandId);
    let offers = 0;
    if (opts.offers && !listOfferFits(brandId).length) {
        try {
            offers = (await buildOfferSet(brandId)).made;
        }
        catch {
        }
    }
    const parts = [added && `${added} ${added === 1 ? "persona" : "personas"} added`, filled && `${filled} ${filled === 1 ? "persona" : "personas"} filled in`, angles && `${angles} angles written`, offers && `${offers} offers written`].filter(Boolean);
    return { personas: added, filled, angles, offers, from, note: parts.length ? `${parts.join(", ")}.` : "Nothing was missing." };
}
