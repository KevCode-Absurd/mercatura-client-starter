import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { BrandBrain } from "../brand-brain";
import { getBrandRow, loadBrandBrain } from "../brands";
import { customerVoice } from "../customer-voice";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { mostRelevant, offersFor } from "../llm/context";
import { structuredJson } from "../llm/structured";
import { imageQuality } from "../media/chosen";
import { generateImage, mediaLive } from "../media/providers";
import { offerChoices } from "../offers/book";
import { renderPrompt } from "../prompts";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import { customerWords } from "../scripts/flow";
import { fillDoubts } from "./doubts-fill";
import { loadSegments, performanceOf, type Performance } from "./performance";
import { freshId, getPersona, listPersonas, savePersona } from "./store";
import { PERSONA_AWARENESS, type PersonaProfile } from "./types";
const Out = z.object({
    existing: z.array(z.object({ id: z.string(), segment_id: z.string() })).default([]),
    personas: z
        .array(z.object({
        name: z.string().min(2),
        segment_id: z.string().default(""),
        who: z.object({ age: z.string().default(""), gender: z.string().default(""), life: z.string().default("") }),
        summary: z.string().min(4),
        problem: z.string().min(4),
        trigger: z.string().default(""),
        wants: z.string().default(""),
        objections: z.array(z.string()).max(4).default([]),
        angle: z.string().default(""),
        awareness: z.enum(PERSONA_AWARENESS).catch("problem_aware"),
        product_ids: z.array(z.string()).default([]),
        offer_id: z.string().nullable().default(null),
        language: z.array(z.string()).max(6).default([]),
        sounds_like: z.array(z.string()).max(4).default([]),
        look: z.string().default(""),
    }))
        .max(12),
});
const plain = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
function brandLines(brand: BrandBrain, offers: {
    id: string;
    name: string;
    price: number;
    per_day?: number | null;
}[]): string {
    const cur = brand.brand.currency;
    return [
        `${brand.brand.name}: ${brand.brand.one_liner} Category: ${brand.brand.category}. Market: ${brand.brand.market}.`,
        "Products:",
        ...brand.products.map((p) => `- ${p.id}: ${p.name}. ${p.format}`),
        "Offers:",
        ...offers.map((o) => `- ${o.id}: ${o.name}, ${cur} ${o.price}${o.per_day ? ` (${o.per_day} a day)` : ""}`),
        brand.guarantee ? `Guarantee: ${brand.guarantee.text}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
function researchFor(brandId: string, about: string, themes = 16, quotes = 3): string {
    const pool = db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).orderBy(schema.themes.rank).limit(60).all();
    if (!pool.length)
        return "(no research imported yet: every `language` list is empty)";
    return mostRelevant(pool, (t) => `${t.label} ${t.summary}`, about, themes)
        .map((t) => {
        const q = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.theme_id, t.id), customerVoice)).orderBy(desc(schema.insights.intensity)).limit(quotes).all();
        return `${t.label}\n${q.map((x) => `  "${clip(x.quote.replace(/\s+/g, " "), 180)}"`).join("\n")}`;
    })
        .join("\n");
}
const segmentLine = (s: Performance["segments"][number]) => [s.id, `${s.gender} ${s.age}`.trim(), s.marker, `${Math.round(s.spend_share * 100)}%`, s.purchases, s.cpa.toFixed(2), s.roas.toFixed(2), s.repeat_90d != null ? `${Math.round(s.repeat_90d * 100)}%` : "-", s.top_product, s.top_offer, s.top_angle, s.top_hooks.map((h) => `"${h}"`).join(", ")].join(" | ");
export interface BuildResult {
    made: PersonaProfile[];
    matched: string[];
    note: string;
}
export async function buildPersonas(brandId: string, opts: {
    count?: number;
    notes?: string;
    replay?: string;
} = {}): Promise<BuildResult> {
    if (!opts.replay && !llmEnabled())
        throw new Error("Building personas needs live mode.");
    const brand = loadBrandBrain(brandId);
    const perf = loadSegments(brandId);
    if (!perf?.segments.length)
        throw new Error("There is no performance data for this brand yet. Put a segments file in the brand's sample-data/performance folder, or write a persona by hand.");
    const have = listPersonas(brandId);
    const count = Math.max(1, Math.min(10, opts.count ?? 7));
    const book = offerChoices(brandId, brand);
    const brandDir = getBrandRow(brandId)?.dir;
    const p = renderPrompt("persona-build", {
        brand_name: brand.brand.name,
        brand: brandLines(brand, book),
        brand_voice: brandVoiceText(brandId, { surfaces: ["headline"], brand }),
        lessons: learnedRules(brandId, "writes"),
        existing: have.map((x) => `- ${x.id}: ${x.name}. ${x.summary}`).join("\n") || "(none)",
        period: perf.period,
        simulated: perf.simulated ? "; nothing measured yet" : "",
        segments: perf.simulated
            ? `No measured performance yet: the account's figures are a stand-in. Build from the research and the brand's own material; take no number, share or result from anywhere. The segments to look for, by name only:\n${perf.segments.map((s) => `- ${s.id}: ${s.marker}`).join("\n")}`
            : perf.segments.map(segmentLine).join("\n"),
        research: researchFor(brandId, perf.segments.map((s) => `${s.marker} ${s.top_angle} ${s.top_hooks.join(" ")}`).join(" ")),
        count: String(count),
        notes: opts.notes?.trim() ? `Notes from the person asking: ${opts.notes.trim().slice(0, 600)}` : "",
    });
    const out = opts.replay ? Out.parse(JSON.parse(opts.replay)) : await structuredJson({ brandId, task: "persona_build", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: 12000, refType: "brand", refId: brandId });
    const corpus = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.brand_id, brandId), customerVoice)).all().map((r) => plain(r.quote));
    const real = (phrase: string) => plain(phrase).length > 3 && corpus.some((c) => c.includes(plain(phrase)));
    const segment = (id: string) => perf.segments.find((s) => s.id === id);
    const basis = `${perf.simulated ? "Simulated performance" : "Performance"} by segment, ${perf.period}, and the brand's research`;
    const matched: string[] = [];
    for (const m of out.existing) {
        const mine = getPersona(brandId, m.id);
        const s = segment(m.segment_id);
        if (!mine || !s)
            continue;
        savePersona(brandId, { ...mine, performance: performanceOf(perf, s), who: mine.who.age || mine.who.gender ? mine.who : { age: s.age, gender: s.gender, life: s.marker } });
        matched.push(mine.id);
    }
    const made: PersonaProfile[] = [];
    for (const x of out.personas.slice(0, count)) {
        const s = segment(x.segment_id);
        const spoken = x.language.map((l) => l.trim().replace(/^["“]|["”]$/g, "")).filter((l) => l && l.length <= 150);
        const short = (list: string[], n: number) => list.map((l) => l.trim()).filter((l) => l && l.length <= n);
        const offers = offersFor(brand, x.product_ids[0]).map((o) => o.id);
        made.push(savePersona(brandId, {
            id: freshId(brandId, x.name),
            name: x.name.trim().slice(0, 60),
            summary: clip(x.summary.trim(), 390),
            problem: clip(x.problem.trim(), 290),
            trigger: clip(x.trigger.trim(), 290),
            language: customerWords(spoken.filter(real), brandDir).phrases.slice(0, 4),
            believes: customerWords(spoken.filter(real), brandDir).facts.slice(0, 4).map((l) => `A customer, in their own words: "${l}"`),
            who: { age: clip(x.who.age || s?.age || "", 40), gender: clip(x.who.gender || s?.gender || "", 40), life: clip(x.who.life || s?.marker || "", 190) },
            wants: clip(x.wants.trim(), 290),
            objections: short(x.objections, 190).slice(0, 3),
            angle: clip(x.angle.trim(), 290),
            awareness: x.awareness,
            product_ids: x.product_ids.filter((id) => brand.products.some((pr) => pr.id === id)),
            offer_id: x.offer_id && book.some((o) => o.id === x.offer_id) ? x.offer_id : (offers.find((id) => book.some((o) => o.id === id)) ?? null),
            sounds_like: short([...x.sounds_like, ...spoken.filter((l) => !real(l))], 150).slice(0, 5),
            share: null,
            performance: s ? performanceOf(perf, s) : null,
            source: "data",
            basis,
            look: clip(x.look.trim(), 490),
            image: null,
            status: "draft",
        }));
    }
    return { made, matched, note: `${made.length} persona${made.length === 1 ? "" : "s"} built from ${perf.segments.length} segments${perf.simulated ? " (simulated data)" : ""}${matched.length ? `; ${matched.length} existing matched to a segment` : ""}.` };
}
export function portraitPrompt(p: Pick<PersonaProfile, "name" | "look" | "who" | "summary">): string {
    const who = p.look.trim() || `An adult${p.who.gender ? `, ${p.who.gender}` : ""}${p.who.age ? `, aged ${p.who.age}` : ""}. ${p.summary}${p.who.life ? ` ${p.who.life}` : ""}`;
    return [
        "A hyperrealistic candid photograph of 1 person, as a documentary photographer would take it: 50mm lens, natural light from a window, true-to-life colour.",
        `The person: ${who}`,
        "Real skin with pores, fine lines and small imperfections, real hair with stray strands, an unposed expression caught mid-moment. Everyday clothes with real fabric creases. Not retouched, not a stock photo, not an illustration, not a 3D render.",
        "Waist-up, the person in the middle of a square frame with the face clearly seen, in the everyday place the description names, the background softly out of focus.",
        "1 person only, a fictional adult. No children. No text, letters, numbers, logos or brand names anywhere. No product packaging.",
    ].join("\n");
}
export async function drawPersona(brandId: string, id: string): Promise<PersonaProfile> {
    if (!mediaLive())
        throw new Error("Drawing a persona needs live mode.");
    const all = listPersonas(brandId);
    const p = all.find((x) => x.id === id);
    if (!p)
        throw new Error("Persona not found");
    const rel = `assets/personas/${brandId}/${id}-${Date.now().toString(36)}.png`;
    const abs = path.join(env.DATA_DIR, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    await generateImage({ brandId, jobId: `personas_${brandId}`, purpose: "persona", prompt: portraitPrompt(p), refs: [], size: "1024x1024", quality: imageQuality(), out: abs });
    return savePersona(brandId, { ...p, image: rel.replace(/^assets\//, "") });
}
export async function buildAndDraw(brandId: string, opts: {
    count?: number;
    notes?: string;
    draw?: boolean;
} = {}): Promise<BuildResult> {
    const res = await buildPersonas(brandId, opts);
    for (const p of res.made)
        await fillDoubts(brandId, p.id).catch(() => null);
    if (opts.draw !== false && mediaLive())
        for (const p of res.made)
            await drawPersona(brandId, p.id).catch(() => null);
    return res;
}
