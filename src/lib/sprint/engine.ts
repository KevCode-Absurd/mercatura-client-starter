import { balancedLooks } from "./looks";
import { humanCheckOverride } from "@/lib/check-review";
import { currentOutputs } from "../studio/outputs";
import { SPRINT_MAX, dealCoverage, writingOrder } from "./diversity";
import { imageModel } from "../media/chosen";
import { castSaid, castSlots, prepareCast, readyIdentities, sprintCastBrief } from "./cast";
import { founderBlock, founderWords, type FounderWords } from "../founder-words";
import fs from "node:fs";
import path from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LibraryRefRow, SprintAngle, SprintAsset, SprintOptions, SprintRow, SprintSlot, StudioItem, StudioOutput, StudioRunRow } from "@/db/schema";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { conflictNote } from "../claim-conflicts";
import { env } from "../env";
import { adType } from "../library/taxonomy";
import { claimsOfProduct } from "../llm/context";
import { BudgetExceededError } from "../llm/gateway";
import { geminiJson } from "../llm/gemini";
import { RunStoppedError } from "../llm/run-control";
import { mediaLive } from "../media/providers";
import { personFor } from "../people";
import { redactContactPii } from "../pipeline/redact";
import { ensureCreativeKit, type CreativeKit } from "../production/kit";
import { renderPrompt } from "../prompts";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import { activeGuardrails } from "../scripts/guardrails";
import { listSkills } from "../skills/registry";
import { languageLine, researchLines, researchRows } from "../studio/checks";
import { rotated } from "../copy/seeds";
import { ownLines } from "../studio/dealt";
import { LED_MOST, ledLine } from "../studio/dealt";
import { ledWith } from "../studio/figures";
import { inOwnHand } from "../studio/forms";
import { createRun, getRun, planRun, refsById, renderRun } from "../studio/engine";
import { productProfile, rankRefs, type Scored } from "../studio/select";
import { inventory, photosFor } from "./assets";
import { AWARENESS, FORMATS, GROUPS, HOOKS, formatOf, limits, overlapOf, overlaps, planChecks, skeleton, words, type OverlapLine, type PlanIssue, type PlannedSlot } from "./formats";
import { claimsHeld, isClaimCheck, sprintHeld, writingBrain } from "../claims-through";
import { listPersonas } from "../personas/store";
import { worldOf } from "../studio/worlds";
import { LAYOUTS, dealLooks, lookMix, lookOf, looksByHand, looksRuledOut } from "./looks";
import { neverShown } from "../studio/engine";
import { studioFields } from "../taste/apply";
import { PRODUCT_BY_SURFACE, SECONDARY_BY_SURFACE, STYLING_BY_SURFACE } from "../taste/defaults";
import { compactTaste } from "../taste/schema";
import { planFor } from "../studio/taste";
import type { ContextPlan, Taste } from "../taste/types";
import { deckStart } from "../studio/deal";
import { AD_FORMS, FORMS_OF_TYPE, USUAL_FORM, dealForms, formNamed, formsAllowed, type AdForm, type FormAd } from "../studio/forms";
const SET_SIZE = 10;
export const COST = { plan: 0.15, brief: 0.02, image: 0.16 };
const note = (s: SprintRow, message: string) => s.log.push({ at: new Date().toISOString(), message });
function save(s: SprintRow) {
    db.update(schema.sprints)
        .set({ status: s.status, stage: s.stage, assets: s.assets, angles: s.angles, slots: s.slots, audit: s.audit, set_ids: s.set_ids, log: s.log, approved: s.approved, error: s.error, notes: s.notes, updated_at: new Date().toISOString() })
        .where(eq(schema.sprints.id, s.id))
        .run();
}
export const getSprint = (id: string): SprintRow | undefined => db.select().from(schema.sprints).where(eq(schema.sprints.id, id)).get();
export const listSprints = (brandId: string): SprintRow[] => db.select().from(schema.sprints).where(eq(schema.sprints.brand_id, brandId)).orderBy(desc(schema.sprints.created_at)).all();
function need(id: string): SprintRow {
    const s = getSprint(id);
    if (!s)
        throw new Error(`Sprint ${id} not found`);
    return s;
}
export const sprintClaims = (s: Pick<SprintRow, "brand_id" | "options">): boolean => s.options?.claim_checks ?? claimsHeld(s.brand_id);
export function sprintBuyers(s: Pick<SprintRow, "brand_id" | "options">, brand: BrandBrain): {
    personas: BrandBrain["personas"];
    products: Record<string, string[]>;
} {
    const picked = (s.options?.personas ?? []).filter((id) => brand.personas.some((p) => p.id === id));
    const personas = picked.length ? brand.personas.filter((p) => picked.includes(p.id)) : brand.personas;
    const profiles = new Map(listPersonas(s.brand_id).map((p) => [p.id, p.product_ids]));
    const made = new Map(brand.products.map((x) => [x.id, madeFor(x.name)]));
    return {
        personas,
        products: Object.fromEntries(personas.map((p) => {
            const sheet = (profiles.get(p.id) ?? []).filter((id) => brand.products.some((x) => x.id === id));
            if (sheet.length)
                return [p.id, sheet];
            const mine = madeFor(`${p.name} ${p.summary}`);
            const fit = brand.products.filter((x) => made.get(x.id) === mine).map((x) => x.id);
            return [p.id, fit.length ? fit : []];
        })),
    };
}
export function madeFor(text: string): "children" | "pets" | "" {
    if (/\b(kids?|child(?:ren)?|toddlers?|bab(?:y|ies)|infants?|teens?|juniors?|ages? \d+ to \d+)\b/i.test(text))
        return "children";
    if (/\b(dogs?|cats?|pets?|pupp(?:y|ies)|kittens?)\b/i.test(text))
        return "pets";
    return "";
}
export function createSprint(n: {
    brandId: string;
    size: number;
    split: Record<string, number>;
    notes?: string;
    title?: string;
    options?: SprintOptions;
}): string {
    const brand = writingBrain(n.brandId);
    const options: SprintOptions = { ...(n.options?.feed_copy !== undefined ? { feed_copy: n.options.feed_copy } : {}), ...(n.options?.picture_quality ? { picture_quality: n.options.picture_quality } : {}), ...(n.options?.cast_brief ? { cast_brief: n.options.cast_brief } : {}), ...((n.options?.cast ?? n.size >= 80) ? { cast: true } : {}), ...(n.options?.claim_checks !== undefined ? { claim_checks: n.options.claim_checks } : {}), ...(n.options?.auto ? { auto: true } : {}), ...(Object.keys(compactTaste(n.options?.taste)).length ? { taste: compactTaste(n.options?.taste) } : {}), personas: (n.options?.personas ?? []).filter((id) => brand.personas.some((p) => p.id === id)) };
    options.text_on_image = n.options?.text_on_image ?? false;
    if (n.options?.painted_words)
        options.painted_words = true;
    options.feed_copy = false;
    options.aspects = [...new Set(n.options?.aspects ?? ["4:5"])];
    if (!options.aspects.length || options.aspects.some(a => !["4:5", "1:1", "9:16"].includes(a)))
        throw new Error("Choose at least one supported image size.");
    if (n.options?.structures) {
        options.structures = [...new Set(n.options.structures)];
        if (!options.structures.length || options.structures.some(id => !formatOf(id)))
            throw new Error("Choose valid ad structures.");
        skeleton(n.size, n.split, { offer: brand.offers.length > 0, proof: brand.proof_assets.length > 0, founder: !!founderWords(n.brandId) }, options.structures);
    }
    if (n.options?.formats)
        options.formats = [...new Set(n.options.formats)];
    const asked = Object.entries(options.formats ? balancedLooks(n.size, options.formats) : n.options?.looks ?? {}).filter(([id, k]) => k > 0 && lookOf(id));
    const typed = asked.reduce((a, [, k]) => a + k, 0);
    if (asked.length && typed !== n.size)
        throw new Error(`The types of ad add up to ${typed} ads, not ${n.size}.`);
    if (asked.some(([id]) => id !== LAYOUTS))
        options.looks = Object.fromEntries(asked);
    const split = Object.fromEntries(Object.entries(n.split).filter(([id, k]) => k > 0 && brand.products.some((p) => p.id === id)));
    const total = Object.values(split).reduce((a, b) => a + b, 0);
    if (!total)
        throw new Error("Say how many ads each product gets.");
    if (total !== n.size)
        throw new Error(`The products add up to ${total} ads, not ${n.size}.`);
    if (n.size < 4 || n.size > SPRINT_MAX)
        throw new Error("A sprint is 4 to 100 ads.");
    const all = db.select({ id: schema.sprints.id }).from(schema.sprints).all();
    const id = `sprint_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    db.insert(schema.sprints)
        .values({ id, brand_id: n.brandId, title: (n.title || `${n.size} ads for ${brand.brand.name}`).slice(0, 120), size: n.size, split, notes: (n.notes ?? "").slice(0, 2000), status: "draft", stage: "plan", assets: [], angles: [], slots: [], audit: [], options, set_ids: [], log: [{ at: new Date().toISOString(), message: `Sprint created: ${n.size} ads${options.personas?.length ? `, for ${options.personas.length} chosen buyer${options.personas.length === 1 ? "" : "s"}` : ", across every buyer"}${options.looks ? `, as ${Object.entries(options.looks).map(([look, k]) => `${k} ${lookOf(look)!.label.toLowerCase()}`).join(", ")}` : ""}${options.auto ? ", made in 1 go" : ""}` }], approved: {} })
        .run();
    return id;
}
export function deleteSprint(id: string) {
    const s = need(id);
    if (s.set_ids.length)
        throw new Error("This sprint has briefs or images. Delete its sets first, from Create, if you really want it gone.");
    db.delete(schema.sprints).where(eq(schema.sprints.id, id)).run();
}
const stripFrontMatter = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
function skillFile(...rest: string[]): string {
    const hit = listSkills().find((s) => s.name === "generate-50");
    const file = hit ? path.join(env.SKILLS_DIR, hit.path, ...rest) : "";
    return file && fs.existsSync(file) ? stripFrontMatter(fs.readFileSync(file, "utf-8")) : "";
}
function brandFiles(brandId: string): string {
    const dir = brandBrainDir(getBrandRow(brandId)!.dir);
    const file = path.join(dir, "winning-ads.md");
    return fs.existsSync(file) ? `### winning-ads.md\n${redactContactPii(fs.readFileSync(file, "utf-8")).text.slice(0, 8000)}` : "(none provided)";
}
const BENCHMARK_VERTICALS: {
    heading: RegExp;
    words: RegExp;
}[] = [
    { heading: /health|wellness/i, words: /\b(health|wellness|supplement|vitamin|nutrition|gummy|gummies|protein|probiotic|fitness|sleep|greens)\b/i },
    { heading: /fashion|apparel/i, words: /\b(fashion|apparel|clothing|clothes|wear|garment|shoe|footwear|jewel+ery|bag|accessor)/i },
    { heading: /home|garden|lifestyle/i, words: /\b(home|homeware|kitchen|cookware|garden|furniture|bedding|candle|cleaning|decor)\b/i },
    { heading: /baby|family/i, words: /\b(baby|babies|infant|toddler|kids?|children|family|parent|maternity)\b/i },
    { heading: /pet/i, words: /\b(pets?|dogs?|cats?|puppy|kitten)\b/i },
    { heading: /beauty|skincare/i, words: /\b(beauty|skin ?care|cosmetic|makeup|hair|fragrance|perfume|grooming)\b/i },
];
export function benchmarksFor(markdown: string, category: string): string {
    const open = markdown.indexOf("## Vertical-Specific Formats");
    if (open < 0)
        return markdown;
    const close = markdown.indexOf("\n## ", open + 1);
    const section = markdown.slice(open, close < 0 ? undefined : close);
    const parts = section.split(/\n(?=### )/);
    const mine = BENCHMARK_VERTICALS.find((v) => v.words.test(category));
    const kept = parts.filter((p, i) => i === 0 || (mine ? mine.heading.test(p.split("\n")[0]) : false));
    return `${markdown.slice(0, open)}${kept.join("\n").trimEnd()}\n${close < 0 ? "" : markdown.slice(close)}`;
}
export function sprintClaimsFor(brand: BrandBrain, productIds: string[]): {
    id: string;
    text: string;
}[] {
    const seen = new Set<string>();
    const out: {
        id: string;
        text: string;
    }[] = [];
    for (const pid of productIds.length ? productIds : [null])
        for (const c of claimsOfProduct(brand, pid))
            if (!seen.has(c.id)) {
                seen.add(c.id);
                out.push({ id: c.id, text: c.text });
            }
    return out;
}
export function offerLines(offers: BrandBrain["offers"], currency: string): string {
    if (!offers.length)
        return "(no offers on file)";
    return offers.map((o) => `${o.id}: ${o.name}, ${o.price} ${currency}${o.per_day != null ? ` (${o.per_day} a day)` : ""}${o.notes?.trim() ? `. ${o.notes.replace(/\s+/g, " ").trim().slice(0, 160)}` : ""}`).join("\n");
}
const PlanOut = z.object({
    angles: z.array(z.object({ id: z.string(), name: z.string(), line: z.string(), persona: z.string().default(""), source: z.string().default("") })).min(1).max(24),
    slots: z.array(z.object({ n: z.coerce.number(), angle: z.string(), persona: z.string(), awareness: z.string(), hook: z.string(), idea: z.string() })).min(1),
});
const slug = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");
function mockPlan(brand: BrandBrain, skel: ReturnType<typeof skeleton>, buys: Record<string, string[]> = {}): z.infer<typeof PlanOut> {
    if (!brand.personas.length)
        throw new Error("The brand brain has no personas yet. A sprint spreads its ads across the brand's buyers: add at least 1 on the Personas screen.");
    const angles = brand.personas.flatMap((p, i) => ["what hurts today", "what they tried before"].map((k, j) => ({ id: `ang_${String(i * 2 + j + 1).padStart(2, "0")}`, name: `${p.name}: ${k}`, line: `${p.name}, on ${k} (mock plan: no model was called).`, persona: p.id, source: "mock" })));
    const fits = (personaId: string, productId: string) => !(buys[personaId] ?? []).length || buys[personaId].includes(productId);
    const pick = (i: number, productId: string) => {
        for (let k = 0; k < angles.length; k++)
            if (fits(angles[(i + k) % angles.length].persona, productId))
                return angles[(i + k) % angles.length];
        return angles[i % angles.length];
    };
    return { angles, slots: skel.map((s, i) => ({ n: s.n, angle: pick(i, s.product_id).id, persona: pick(i, s.product_id).persona, awareness: AWARENESS[i % AWARENESS.length], hook: HOOKS[i % HOOKS.length], idea: `Mock idea ${s.n}: a ${formatOf(s.format)!.label.toLowerCase()} ad for ${brand.products.find((p) => p.id === s.product_id)?.name ?? "the product"}, written when live mode is on.` })) };
}
function assignRefs(brandId: string, brand: BrandBrain, kit: CreativeKit, slots: SprintSlot[]) {
    const used = new Set<string>();
    const brands = new Map<string, number>();
    const turn = new Map<string, number>();
    const ranked = new Map<string, Scored[]>();
    const own = brand.brand.name.toLowerCase();
    for (const s of slots) {
        if (s.world) {
            s.layout = "conceptual-and-scale";
            s.ref_id = null;
            continue;
        }
        const f = formatOf(s.format)!;
        const k = turn.get(f.id) ?? 0;
        turn.set(f.id, k + 1);
        const inTurn = [...f.layouts.slice(k % f.layouts.length), ...f.layouts.slice(0, k % f.layouts.length)];
        const takes = (type: string) => !!s.form && !!FORMS_OF_TYPE[type]?.includes(s.form as AdForm);
        const order = [...inTurn.filter(takes), ...inTurn.filter((t) => !takes(t))];
        let pick: LibraryRefRow | undefined;
        for (const type of order) {
            const key = `${type}|${s.product_id}`;
            if (!ranked.has(key))
                ranked.set(key, rankRefs("ad", productProfile(brandId, brand, kit, s.product_id), { type, limit: 400 }));
            const fits = (r: LibraryRefRow) => (f.textForward ? r.tags.text_overlay === "heavy" : r.tags.text_overlay !== "heavy") && !(r.tags.has_person && s.format !== "pov" && s.format !== "montage");
            const open = ranked.get(key)!.map((x) => x.ref).filter((r) => !used.has(r.id) && r.brand?.toLowerCase() !== own && (brands.get(r.brand ?? "") ?? 0) < 2);
            pick = open.find(fits) ?? open[0];
            if (pick)
                break;
        }
        s.layout = pick?.type ?? order[0];
        s.ref_id = pick?.id ?? null;
        if (pick) {
            used.add(pick.id);
            if (pick.brand)
                brands.set(pick.brand, (brands.get(pick.brand) ?? 0) + 1);
        }
    }
}
const variantRe = (v: string) => new RegExp(`\\b${v.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]?")}\\b`, "i");
export function variantsOf(product: BrandBrain["products"][number] | undefined): string[] {
    if (!product)
        return [];
    if (product.variants?.length)
        return product.variants;
    const m = /\b([A-Z][\w-]*(?: [A-Z][\w-]*){0,2}) or ([A-Z][\w-]*(?: [A-Z][\w-]*){0,2})\b/.exec(product.format);
    return m ? [m[1], m[2]] : [];
}
export const photoFits = (idea: string, a: Pick<SprintAsset, "description">, variants: string[]) => {
    const named = variants.filter((v) => variantRe(v).test(idea));
    if (!named.length)
        return true;
    const shown = variants.filter((v) => variantRe(v).test(a.description));
    return !shown.length || named.some((v) => shown.includes(v));
};
function assignPhotos(brandId: string, brand: BrandBrain, kit: CreativeKit, assets: SprintAsset[], slots: SprintSlot[]): PlanIssue[] {
    const name = (id: string) => brand.products.find((p) => p.id === id)?.name ?? id;
    const out: PlanIssue[] = [];
    const founder = personFor(brandId, "founder");
    for (const productId of new Set(slots.map((s) => s.product_id))) {
        const mine = slots.filter((s) => s.product_id === productId);
        const { leads } = photosFor(assets, kit, productId);
        if (!leads.length) {
            out.push({ level: mediaLive() ? "fail" : "warn", ads: mine.map((x) => x.n), message: `There is no usable photo of ${name(productId)}: the product on a plain background, with no designed text over it. Add one to the brand's assets folder.` });
            continue;
        }
        const uses = new Map(leads.map((a) => [a.file, 0]));
        for (const s of mine) {
            const pool = leads.filter((a) => photoFits(s.idea, a, variantsOf(brand.products.find((p) => p.id === productId))));
            const pick = [...(pool.length ? pool : leads)].sort((a, b) => uses.get(a.file)! - uses.get(b.file)!)[0];
            s.photo = pick.file;
            uses.set(pick.file, uses.get(pick.file)! + 1);
        }
        const most = Math.max(...uses.values());
        if (most > 5)
            out.push({ level: "warn", message: `${leads.length} usable photo${leads.length === 1 ? "" : "s"} of ${name(productId)} for ${mine.length} ads: each anchors up to ${most}. Every scene is made new, so the photo only fixes what the pack looks like, but a photoshoot or more photos would widen the range.` });
    }
    for (const s of slots) {
        if (s.format === "founder" && founder)
            s.person = founder.id;
        else
            delete s.person;
    }
    return out;
}
export async function planSprint(id: string, opts: {
    notes?: string;
} = {}): Promise<void> {
    const s = need(id);
    if (s.set_ids.length)
        throw new Error("The briefs are already written. Start a new sprint to plan again.");
    if (opts.notes !== undefined)
        s.notes = opts.notes.slice(0, 2000);
    s.status = "planning";
    s.stage = "plan";
    s.error = null;
    s.approved = {};
    save(s);
    try {
        const whole = writingBrain(s.brand_id, sprintClaims(s));
        const buyers = sprintBuyers(s, whole);
        const brand = { ...whole, personas: buyers.personas };
        const kit = await ensureCreativeKit(s.brand_id, mediaLive());
        s.assets = await inventory(s.brand_id, brand, kit, s.id);
        note(s, `Photo inventory: ${s.assets.length} images filed, ${s.assets.filter((a) => a.lead).length} can lead an ad`);
        save(s);
        const hasOffer = brand.offers.length > 0;
        const hasProof = brand.proof_assets.length > 0;
        const said = founderWords(s.brand_id);
        const lookRules = { never: neverShown(s.brand_id, kit), byHand: looksByHand(s.options?.formats, s.options?.looks) };
        for (const x of looksRuledOut(lookMix(s.size, s.options?.looks), lookRules.never, lookRules.byHand))
            note(s, `Not made as "${x.look}": this brand's own rules say its pictures never show "${x.word}". Those ads are made as classic statics. Pick that type of ad yourself to have it anyway.`);
        const coverage = dealCoverage(dealLooks(skeleton(s.size, s.split, { offer: hasOffer, proof: hasProof, founder: !!said }, s.options?.structures), lookMix(s.size, s.options?.looks), lookRules), brand.personas.map(p => p.id), buyers.products);
        const skel = s.options?.cast ? castSlots(coverage, [], readyIdentities(s.brand_id), sprintCastBrief(s.options?.cast_brief, brand.brand.market, listPersonas(s.brand_id))) : coverage.map(slot => ({ ...slot, casting: undefined }));
        if (castSaid(skel))
            note(s, castSaid(skel));
        const worlds = [...new Set(skel.map((x) => x.world).filter((w): w is string => !!w))].map((w) => worldOf(w)!);
        const sprintTaste = compactTaste({ ...s.options?.taste, words: sprintWords(s.options) });
        const formOfSlot = (sprintTaste.look ?? "between") === "between" && !formNamed(s.notes) ? slotForms(skel, sprintTaste, { seed: s.brand_id, start: deckStart(s.id) }) : new Map<number, AdForm>();
        const formsDealt = AD_FORMS.filter((f) => [...formOfSlot.values()].includes(f.id));
        const lim = limits(s.size, brand.personas.length);
        const founder = personFor(s.brand_id, "founder");
        const ctx = { angles: [] as string[], personas: brand.personas.map((p) => p.id), personaProducts: buyers.products };
        const product = (pid: string) => brand.products.find((p) => p.id === pid);
        const ask = async (mustFix: string): Promise<z.infer<typeof PlanOut>> => {
            if (!mediaLive())
                return mockPlan(brand, skel, buyers.products);
            const p = renderPrompt("sprint-plan", {
                size: String(s.size),
                brand_name: brand.brand.name,
                angle_min: String(lim.angles.min),
                angle_max: String(lim.angles.max),
                angle_cap: String(lim.angles.cap),
                persona_min: String(lim.persona.min),
                stage_min: String(lim.stage.min),
                stage_max: String(lim.stage.max),
                top_min: String(lim.hook.top),
                hook_cap: String(lim.hook.cap),
                hooks: HOOKS.join(", "),
                skill: skillFile("SKILL.md") || "(generate-50 skill not installed)",
                benchmarks: benchmarksFor(skillFile("reference", "motion-benchmarks.md") || "(benchmarks not installed)", brand.brand.category),
                figures: conflictNote(s.brand_id) || "None are open.",
                founder: founder ? `The brand has uploaded a real photo of its founder, ${founder.name}: a founder ad may show that person.` : `The brand has uploaded no photo of its founder: a founder ad is the founder's words as a signed note, with no face.${said ? `\n${founderBlock(said, 900)}` : ""}`,
                notes_rule: s.notes ? `**The user's direction for this sprint wins** unless it breaks a rule above: ${s.notes}` : "The user gave no extra direction.",
                brand_context: JSON.stringify({ brand: brand.brand, language: languageLine(brand), market_sophistication_stage: brand.market_sophistication_stage, offers: offerLines(brand.offers, brand.brand.currency), guarantee: brand.guarantee, approved_claims: sprintClaimsFor(brand, Object.keys(s.split)), forbidden_claims: brand.forbidden_claims, proof_assets: brand.proof_assets, guardrails: activeGuardrails(s.brand_id).filter((g) => g.guardrail.applies).map((g) => g.guardrail.rule), personas: brand.personas.map((x) => ({ id: x.id, name: x.name, summary: x.summary, problem: x.problem, language: x.language, ...(buyers.products[x.id]?.length ? { only_for_products: buyers.products[x.id] } : {}) })) }),
                buyers_rule: s.options?.personas?.length ? `The person who started this sprint chose its buyers: every ad is written for ${brand.personas.length === 1 ? "this 1 persona" : "one of these personas"}, and no other.${brand.personas.length === 1 ? " With 1 buyer, the ads differ by angle, stage, hook and format: find as many true angles on this 1 person as the map allows." : ""}` : "Spread the ads across every persona in the brand context, so the brand learns which buyer answers.",
                brand_voice: brandVoiceText(s.brand_id, { surfaces: ["headline", "on_image"], brand, toneOnly: true }),
                lessons: learnedRules(s.brand_id, "writes"),
                products: JSON.stringify(brand.products.filter((x) => s.split[x.id]).map((x) => ({ id: x.id, name: x.name, format: x.format, ingredients: x.ingredients ?? [], ...(x.specs?.length ? { specs: x.specs } : {}), ...(x.variants?.length ? { variants: x.variants } : {}), details: kit.products.find((k) => k.product_id === x.id)?.details ?? "" }))),
                research: sprintResearch(s.brand_id, s.id),
                brand_files: brandFiles(s.brand_id),
                formats: FORMATS.filter((f) => skel.some((x) => x.format === f.id)).map((f) => `- ${f.id} (${f.label}, ${GROUPS.find((g) => g.id === f.group)!.label.toLowerCase()}${f.textForward ? ", text-forward" : ""}): ${f.how}`).join("\n"),
                slots: `${skel.map((x) => `${x.n}. ${x.format} | REQUIRED buyer ${x.persona} | REQUIRED stage ${x.awareness} | ${x.product_id} (${product(x.product_id)?.name ?? ""})${x.text_forward ? " | text-forward" : ""}${x.world ? ` | look: ${x.world}` : ""}${formOfSlot.get(x.n) ? ` | form: ${formOfSlot.get(x.n)}` : ""}${x.casting ? ` | FICTIONAL CAST: ${x.casting.description} | SETTING: ${x.casting.setting}` : ""}`).join("\n")}${worlds.length ? `\n\n## The looks (a slot marked \`look\` is drawn in that one)\n\n${worlds.map((w) => `- ${w.id} (${w.label}): ${w.look}`).join("\n")}` : ""}${formsDealt.length ? `\n\n## The forms (a slot marked \`form\` is built in that one)\n\n${formsDealt.map((f) => `- ${f.id} (${f.label}): ${f.what}`).join("\n")}` : ""}`,
                must_fix: mustFix,
            });
            return geminiJson({ brandId: s.brand_id, task: mustFix ? "sprint_plan_revise" : "sprint_plan", model: env.MODEL_COPY, system: p.system, user: p.user, schema: PlanOut, effort: "medium", maxTokens: 32000, refType: "sprint", refId: s.id });
        };
        const merge = (out: z.infer<typeof PlanOut>): {
            angles: SprintAngle[];
            planned: PlannedSlot[];
        } => {
            const ids = new Map(out.angles.map((a, i) => [a.id, `ang_${String(i + 1).padStart(2, "0")}`]));
            const angles = out.angles.map((a) => ({ id: ids.get(a.id)!, name: a.name.trim(), line: a.line.trim(), persona: a.persona, source: a.source }));
            const planned = skel.map((k): PlannedSlot => {
                const o = out.slots.find((x) => x.n === k.n);
                return { ...k, angle: ids.get(o?.angle ?? "") ?? "", persona: k.persona, awareness: k.awareness, hook: slug(o?.hook ?? ""), idea: (o?.idea ?? "").trim() };
            });
            return { angles, planned };
        };
        let plan = merge(await ask(""));
        let issues = planChecks(plan.planned, { ...ctx, angles: plan.angles.map((a) => a.id) });
        if (mediaLive() && (issues.some((i) => i.level === "fail") || issues.length > 3)) {
            note(s, `First plan missed ${issues.length} of its limits: sent back to the planner once`);
            try {
                const again = merge(await ask(`## Your first plan broke these limits. Return the whole plan again with every one fixed\n\nYour first angle map: ${JSON.stringify(plan.angles.map((a) => ({ id: a.id, name: a.name })))}\n${issues.slice(0, 30).map((i) => `- ${i.message}`).join("\n")}`));
                const next = planChecks(again.planned, { ...ctx, angles: again.angles.map((a) => a.id) });
                if (next.filter((i) => i.level === "fail").length <= issues.filter((i) => i.level === "fail").length && next.length <= issues.length)
                    [plan, issues] = [again, next];
            }
            catch (e) {
                if (e instanceof BudgetExceededError || e instanceof RunStoppedError)
                    throw e;
                note(s, `The second plan didn't come back: ${(e as Error).message.slice(0, 120)}. The first is kept.`);
            }
        }
        s.angles = plan.angles;
        s.slots = plan.planned.map((p): SprintSlot => ({ ...p, layout: "", ref_id: null, photo: "", ...(formOfSlot.get(p.n) ? { form: formOfSlot.get(p.n) } : {}) }));
        assignRefs(s.brand_id, brand, kit, s.slots);
        const photoIssues = assignPhotos(s.brand_id, brand, kit, s.assets, s.slots);
        const bare = s.slots.filter((x) => !x.ref_id && !x.world);
        const noRef = bare.length;
        s.audit = [...photoIssues, ...issues, ...(noRef ? [{ level: "warn" as const, ads: bare.map((x) => x.n), message: `${noRef} ad${noRef === 1 ? " has" : "s have"} no layout reference from the library: ${noRef === 1 ? "it is" : "they are"} built from the format and the brand look alone.` }] : [])];
        s.status = "plan_ready";
        note(s, `Plan written${mediaLive() ? ` by ${env.MODEL_COPY}` : " (mock)"}: ${s.angles.length} angles, ${s.slots.length} ads, ${s.audit.length} point${s.audit.length === 1 ? "" : "s"} to look at`);
        save(s);
    }
    catch (e) {
        s.status = "failed";
        s.error = (e as Error).message.slice(0, 400);
        note(s, `Planning stopped: ${s.error.slice(0, 200)}`);
        save(s);
        throw e;
    }
}
export async function reassignPhotos(id: string): Promise<SprintRow> {
    const s = need(id);
    if (s.set_ids.length)
        throw new Error("The briefs are already written.");
    const kit = await ensureCreativeKit(s.brand_id, false);
    const issues = assignPhotos(s.brand_id, writingBrain(s.brand_id), kit, s.assets, s.slots);
    s.audit = [...issues, ...s.audit.filter((a) => !/usable photo/.test(a.message))];
    save(s);
    return s;
}
function recheck(s: SprintRow) {
    const buyers = sprintBuyers(s, writingBrain(s.brand_id, sprintClaims(s)));
    const keep = s.audit.filter((a) => /usable photo|layout reference/.test(a.message));
    s.audit = [...keep, ...planChecks(s.slots, { angles: s.angles.map((a) => a.id), personas: buyers.personas.map((p) => p.id), personaProducts: buyers.products })];
}
export function editSlot(id: string, n: number, patch: Partial<Pick<SprintSlot, "angle" | "persona" | "awareness" | "hook" | "idea">>): SprintRow {
    const s = need(id);
    if (s.status !== "plan_ready")
        throw new Error("The plan can be changed only while it is waiting for approval.");
    const slot = s.slots.find((x) => x.n === n);
    if (!slot)
        throw new Error("That ad is not in the plan.");
    if (patch.idea !== undefined)
        slot.idea = patch.idea.trim().slice(0, 600);
    if (patch.angle && s.angles.some((a) => a.id === patch.angle))
        slot.angle = patch.angle;
    if (patch.persona)
        slot.persona = patch.persona;
    if (patch.awareness && (AWARENESS as readonly string[]).includes(patch.awareness))
        slot.awareness = patch.awareness;
    if (patch.hook && HOOKS.includes(patch.hook))
        slot.hook = patch.hook;
    recheck(s);
    save(s);
    return s;
}
export async function swapRef(id: string, n: number): Promise<SprintRow> {
    const s = need(id);
    if (s.status !== "plan_ready")
        throw new Error("The plan can be changed only while it is waiting for approval.");
    const slot = s.slots.find((x) => x.n === n);
    if (!slot)
        throw new Error("That ad is not in the plan.");
    if (slot.world) {
        const worlds = lookOf(slot.look)?.worlds ?? [];
        if (worlds.length < 2)
            throw new Error("This type of ad has 1 look, so there is no other to give it.");
        slot.world = worlds[(worlds.indexOf(slot.world) + 1) % worlds.length];
        save(s);
        return s;
    }
    const brand = writingBrain(s.brand_id);
    const kit = await ensureCreativeKit(s.brand_id, false);
    const used = new Set(s.slots.map((x) => x.ref_id));
    const f = formatOf(slot.format)!;
    const pool = f.layouts.flatMap((type) => rankRefs("ad", productProfile(s.brand_id, brand, kit, slot.product_id), { type, limit: 400 })).sort((a, b) => b.score - a.score);
    const at = pool.findIndex((x) => x.ref.id === slot.ref_id);
    const next = [...pool.slice(at + 1), ...pool.slice(0, Math.max(0, at))].find((x) => !used.has(x.ref.id) && x.ref.brand?.toLowerCase() !== brand.brand.name.toLowerCase());
    if (!next)
        throw new Error("The library has no other layout of this type that is free.");
    slot.ref_id = next.ref.id;
    slot.layout = next.ref.type;
    save(s);
    return s;
}
type PlannedOn = Pick<SprintSlot, "awareness" | "format" | "look" | "world" | "photo"> & Partial<Pick<SprintSlot, "layout" | "ref_id">>;
export function slotTaste(slot: PlannedOn, taste: Taste | null | undefined): Taste | undefined {
    if (!/native/.test(`${slot.look ?? ""} ${slot.format}`))
        return undefined;
    return compactTaste({ product: taste?.product ?? PRODUCT_BY_SURFACE.native_ad, styling: taste?.styling ?? STYLING_BY_SURFACE.native_ad, finish: taste?.finish ?? SECONDARY_BY_SURFACE.native_ad?.finish, words: taste?.words ?? "full" });
}
export const sprintWords = (o: Pick<SprintOptions, "painted_words" | "taste"> | null | undefined): Taste["words"] | undefined => (!o?.painted_words ? "none" : o.taste?.words && o.taste.words !== "none" ? o.taste.words : undefined);
export function slotPlan(slot: PlannedOn, taste: Taste | null | undefined): ContextPlan {
    const w = worldOf(slot.world);
    const own = slotTaste(slot, taste);
    const item = { ref_id: w ? null : (slot.ref_id ?? null), type: w ? "conceptual-and-scale" : slot.layout, ...(w ? { world: w.id, mode: w.modes[0] } : slot.ref_id ? { fidelity: "loose" as const } : {}), stage: slot.awareness, ...(own ? { taste: own } : {}) };
    return planFor({ kind: "ad", context: { sprint: "sprint", ...(taste ? { taste } : {}) } } as Parameters<typeof planFor>[0], item, { productHasPhoto: !!slot.photo });
}
type FormSlot = Pick<SprintSlot, "n" | "product_id" | "awareness" | "format"> & Partial<Pick<SprintSlot, "look" | "world">>;
export function slotFormAd(x: FormSlot, taste: Taste | null | undefined): FormAd {
    const stop = slotPlan({ ...x, photo: "" }, taste).taste.product;
    return stop === "hero" ? { allowed: [], open: true, expect: USUAL_FORM } : { allowed: formsAllowed({ types: formatOf(x.format)?.layouts ?? [], world: x.world, stage: x.awareness, product: stop, ledByType: !!formatOf(x.format)?.textForward }) };
}
export function slotForms(slots: FormSlot[], taste: Taste | null | undefined, from: {
    seed: string;
    start: number;
}): Map<number, AdForm> {
    const out = new Map<number, AdForm>();
    for (const productId of [...new Set(slots.map((x) => x.product_id))]) {
        const mine = writingOrder(slots.filter((x) => x.product_id === productId));
        const dealt = dealForms(mine.map((x) => slotFormAd(x, taste)), from.seed, from.start);
        mine.forEach((x, i) => {
            if (dealt[i])
                out.set(x.n, dealt[i] as AdForm);
        });
    }
    return out;
}
export function slotDirection(slot: SprintSlot, angle: SprintAngle | undefined, asset: SprintAsset | undefined, founderName: string | null, founderSaid: FounderWords | null = null, plan: ContextPlan | null = null): string {
    const f = formatOf(slot.format)!;
    const noProduct = plan?.attach.productPhotos === "none" && plan.taste.product === "none";
    return [
        `Sprint ad ${slot.n}. These are decided; write the ad they describe.`,
        `Buyer: ${slot.persona}, ${words(slot.awareness)}. Hook: ${words(slot.hook)}.`,
        slot.awareness === "unaware" ? "Cold-stage story: recognize a situation before naming a problem. No product, offer, proof badge or purchase CTA." : "",
        `Idea: ${slot.idea}`,
        "The idea and stage govern the execution. Historical ads and research language are not current offers or evidence for another SKU. Do not add prices, gifts, health outcomes or testimonials to fill a layout.",
        `Format: ${f.label}. ${f.how}`,
        slot.casting ? `CAST AND SETTING: ${slot.casting.description} Scene: ${slot.casting.setting}. Show this character naturally in that place. Preserve identity from the attached avatar; match the scene light, skin texture, camera grain and wardrobe. Never present them as a real customer, researcher, doctor or founder. The character and setting override a dealt person or place.` : "",
        slot.awareness === "unaware" && slot.form && !(plan && plan.text.pictureWords !== "none" && !/native/.test(`${slot.look ?? ""} ${slot.format}`))
            ? inOwnHand(slot.form)
                ? "Its words are the note, the message or the sign itself, written or typed as that person would. Nothing is set as a headline by a brand."
                : "This picture carries no words: say it in the scene. No headline and no caption."
            : noProduct ? (slot.text_forward ? "Led by its type: a few words, set large, are the first thing seen. Keep the picture simple." : "Picture-forward: the picture carries the ad and the words are few.") : slot.text_forward ? "Led by its type: a few words, set large, are the first thing seen. Keep the picture simple and the pack a small anchor." : "Product-forward: the picture carries the ad and the words are few.",
        "Lead with a specific buyer tension or reason to choose, in the brand voice.",
        asset && !noProduct ? `Product photo for this ad: ${asset.description}` : "",
        slot.format === "founder" ? (slot.person && founderName ? `A real photo of the founder, ${founderName}, is attached to the render: the picture may show that person and nobody else as the founder.` : "No photo of the founder exists: this is a signed note in the founder's words, with no face and no person.") : "",
        slot.format === "founder" && founderSaid ? founderBlock(founderSaid, 700) : "",
        slot.format === "testimonial" ? "Use only a sourced quote for this SKU, verbatim and without a face. If the idea calls for a brand-authored Q&A, use that instead, with no quotation marks, stars or customer attribution." : "",
        "Nobody under 18 is shown. A generated person is never a customer, an expert or the founder.",
        angle ? `Supporting angle: "${angle.name}". ${angle.line}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
const headlineOf = (item: StudioItem | undefined) => item?.plan?.text_elements.find((t) => t.role === "headline")?.text ?? item?.plan?.text_elements[0]?.text ?? "";
const PLAN_THEMES = 14;
export function sprintResearch(brandId: string, sprintId: string): string {
    const n = Number(sprintId.match(/\d+$/)?.[0] ?? 0);
    const rows = researchRows(brandId, PLAN_THEMES * 2, 3, "", { offset: 3 * n });
    return researchLines(rows.length > PLAN_THEMES ? rotated(rows, ((PLAN_THEMES / 2) * n) % rows.length).slice(0, PLAN_THEMES) : rows);
}
const MEND_MOST = 10;
function setsOf(s: SprintRow): Map<string, StudioRunRow> {
    return new Map((s.set_ids.length ? db.select().from(schema.studioRuns).where(inArray(schema.studioRuns.id, s.set_ids)).all() : []).map((r) => [r.id, r]));
}
const setNotes = (s: SprintRow, written: string[]) => {
    const head = `Part of the ${s.size}-ad sprint ${s.id}. Each ad carries its own direction: the format, angle, buyer, stage and hook are already decided, so write the ad they describe and do not re-plan it.${s.notes ? ` The user's direction for the sprint: ${s.notes.slice(0, 500)}` : ""}`;
    const led = ledLine([...new Set(written.flatMap((h) => ledWith([{ role: "headline", text: h }])))].slice(-LED_MOST));
    let list = "";
    for (const h of [...written].reverse()) {
        if ((head + led + list).length + h.length > 1850)
            break;
        list = `\n- ${h}${list}`;
    }
    return `${head}${led ? `\n${led}` : ""}${list ? `\nHeadlines already written in this sprint. Write nothing that repeats the idea or the opening words of any of them:${list}` : ""}`;
};
export function approvePlan(id: string, auto = false): SprintRow {
    const s = need(id);
    if (s.status !== "plan_ready")
        throw new Error("There is no plan waiting for approval.");
    const stop = s.audit.find((a) => a.level === "fail");
    if (auto && stop)
        throw new Error(`Human review needed: ${stop.message}`);
    const override = !auto ? humanCheckOverride("sprint plan", s.audit.map((a) => ({ check: "sprint_plan", status: a.level, message: a.message }))) : undefined;
    s.approved = { ...s.approved, plan: new Date().toISOString(), ...(override ? { check_overrides: [...(s.approved.check_overrides ?? []), override] } : {}) };
    if (override)
        note(s, `Human override: ${override.findings.map((a) => a.message).join("; ")}`);
    s.status = "briefing";
    s.stage = "briefs";
    note(s, auto ? "Plan taken as written: this sprint is made in 1 go" : "Plan approved");
    save(s);
    return s;
}
export async function writeBriefs(id: string): Promise<void> {
    const s = need(id);
    if (!s.approved.plan)
        throw new Error("Approve the plan first.");
    s.status = "briefing";
    s.stage = "briefs";
    s.error = null;
    save(s);
    try {
        const brand = writingBrain(s.brand_id, sprintClaims(s));
        const kit = await ensureCreativeKit(s.brand_id, mediaLive());
        const founder = personFor(s.brand_id, "founder");
        await prepareCast(s.brand_id, s.id, s.slots, () => save(s));
        if (!s.set_ids.length) {
            const n = s.id.match(/\d+$/)?.[0] ?? "";
            for (const productId of Object.keys(s.split)) {
                const mine = writingOrder(s.slots.filter((x) => x.product_id === productId));
                const chunks = Math.ceil(mine.length / SET_SIZE);
                const per = Math.ceil(mine.length / chunks);
                for (let c = 0; c < chunks; c++) {
                    const part = mine.slice(c * per, (c + 1) * per);
                    if (!part.length)
                        continue;
                    const extras = (lead: string) => photosFor(s.assets, kit, productId).extras.filter((a) => a.file.split("/")[0] === lead.split("/")[0]).slice(0, 2).map((a) => a.file);
                    const taste = compactTaste({ ...s.options?.taste, words: sprintWords(s.options) });
                    const fields = studioFields(taste, false);
                    const setId = createRun({
                        brandId: s.brand_id,
                        kind: "ad",
                        ...(fields.variety ? { variety: fields.variety } : {}),
                        ...(fields.fidelity ? { fidelity: fields.fidelity } : {}),
                        ...(fields.productInPicture ? { productInPicture: fields.productInPicture } : {}),
                        textOnImage: taste.words !== "none",
                        taste,
                        productId,
                        aspects: s.options?.aspects ?? ["4:5"],
                        feedCopy: false,
                        sprint: s.id,
                        ...(s.options?.claim_checks !== undefined ? { claimChecks: s.options.claim_checks } : {}),
                        title: `Sprint ${n} · ${brand.products.find((p) => p.id === productId)?.name ?? productId} (${part.length} ads${chunks > 1 ? `, part ${c + 1}` : ""})`,
                        notes: setNotes(s, []),
                        picks: part.map((slot) => {
                            const f = formatOf(slot.format)!;
                            const w = worldOf(slot.world);
                            const plan = slotPlan(slot, taste);
                            const own = slotTaste(slot, taste);
                            const direction = slotDirection(slot, s.angles.find((a) => a.id === slot.angle), s.assets.find((a) => a.file === slot.photo), founder?.name ?? null, founderWords(s.brand_id), plan);
                            const photo = plan.attach.productPhotos === "none" ? undefined : slot.photo;
                            if (w)
                                return { world: w.id, slot: slot.n, label: `${f.label} · ${w.label}`, reason: `Sprint ad ${slot.n}: ${lookOf(slot.look)?.label.toLowerCase() ?? "a look"}, drawn as ${w.label.toLowerCase()} with no layout to follow`, photo, photoExtras: photo ? extras(photo) : [], person: slot.person, avatar: slot.avatar, stage: slot.awareness, fidelity: "loose" as const, direction, ...(own ? { taste: own } : {}), ...(slot.form ? { form: slot.form } : {}) };
                            return { refId: slot.ref_id, slot: slot.n, type: slot.layout, label: `${f.label} · ${adType(slot.layout)?.label ?? slot.layout}`, reason: `Sprint ad ${slot.n}: the best free ${adType(slot.layout)?.label.toLowerCase() ?? "layout"} for this product`, photo, photoExtras: photo ? extras(photo) : [], person: slot.person, avatar: slot.avatar, stage: slot.awareness, fidelity: "loose" as const, direction, ...(own ? { taste: own } : {}), ...(slot.form ? { form: slot.form } : {}) };
                        }),
                    });
                    const run = getRun(setId)!;
                    db.update(schema.studioRuns).set({ context: { ...run.context, image_model: imageModel(), ...(s.options?.picture_quality ? { picture_quality: s.options.picture_quality } : {}) } }).where(eq(schema.studioRuns.id, setId)).run();
                    part.forEach((slot, i) => Object.assign(slot, { set_id: setId, item_id: run.items[i].id }));
                    s.set_ids.push(setId);
                }
            }
            note(s, `${s.slots.length} ads sorted into ${s.set_ids.length} sets by product`);
            save(s);
        }
        const written: string[] = [];
        const failed: string[] = [];
        let nextSet = 0;
        const chain = async () => {
            for (;;) {
                const setId = s.set_ids[nextSet++];
                if (!setId)
                    return;
                const run = getRun(setId);
                if (!run || run.items.every((i) => i.plan?.prompt))
                    continue;
                db.update(schema.studioRuns).set({ notes: setNotes(s, written) }).where(eq(schema.studioRuns.id, setId)).run();
                try {
                    await planRun(setId);
                }
                catch (e) {
                    if (e instanceof BudgetExceededError || e instanceof RunStoppedError)
                        throw e;
                    failed.push(`${setId}: ${(e as Error).message.slice(0, 140)}`);
                }
                for (const item of getRun(setId)?.items ?? [])
                    if (headlineOf(item))
                        written.push(headlineOf(item));
            }
        };
        for (const run of setsOf(s).values())
            for (const item of run.items)
                if (headlineOf(item))
                    written.push(headlineOf(item));
        const results = await Promise.allSettled(Array.from({ length: Math.min(s.size >= 80 ? 6 : 3, s.set_ids.length) }, chain));
        const stopped = results.find(result => result.status === "rejected");
        if (stopped?.status === "rejected")
            throw stopped.reason;
        const close = { shared: 3, ignore: [brand.brand.name, ...brand.products.map((p) => p.name)] };
        const lines = (): OverlapLine[] => {
            const sets = setsOf(s);
            return s.slots.map((slot) => {
                const item = sets.get(slot.set_id ?? "")?.items.find((i) => i.id === slot.item_id);
                return { n: slot.n, text: headlineOf(item), more: ownLines(item?.plan?.text_elements).filter((t) => t !== headlineOf(item)) };
            });
        };
        const twins = () => overlaps(lines(), 0.4, close);
        const closeOf = (a: number, b: number, now = lines()) => overlapOf(now.find((x) => x.n === a)!, now.find((x) => x.n === b)!, 0.4, close) ?? ["", ""];
        let alike = twins();
        if (alike.length && mediaLive()) {
            const first = lines();
            const mend = new Map<string, Record<string, string[]>>();
            for (const [a, b] of alike.slice(0, MEND_MOST)) {
                const slot = s.slots.find((x) => x.n === b)!;
                if (!slot.set_id || !slot.item_id)
                    continue;
                const item = getRun(slot.set_id)?.items.find((i) => i.id === slot.item_id);
                if (!item || item.plan?.copy_locked || item.outputs.length)
                    continue;
                const [x, y] = closeOf(a, b, first);
                const twin = first.find((o) => o.n === a);
                const other = [x, twin?.text ?? "", ...(twin?.more ?? [])].filter((t, i, all) => t && all.indexOf(t) === i);
                const told = mend.get(slot.set_id)?.[slot.item_id] ?? [];
                mend.set(slot.set_id, { ...(mend.get(slot.set_id) ?? {}), [slot.item_id]: [...told, ...other] });
                note(s, `Sprint ad ${b} says nearly what ad ${a} says ("${y}" beside "${x}"): its words are written again, told what ad ${a} says.`.slice(0, 400));
            }
            for (const [setId, said] of mend) {
                try {
                    await planRun(setId, { itemIds: Object.keys(said), mendWords: said });
                }
                catch (e) {
                    if (e instanceof BudgetExceededError || e instanceof RunStoppedError)
                        throw e;
                    failed.push(`${setId}: ${(e as Error).message.slice(0, 140)}`);
                }
            }
            const mended = [...mend.values()].reduce((n, said) => n + Object.keys(said).length, 0);
            note(s, `${alike.length} pair${alike.length === 1 ? "" : "s"} of ads said nearly the same thing: the words of ${mended} written again, 1 words call a set and no new plan`);
            alike = twins();
        }
        const sets = setsOf(s);
        const unwritten = s.slots.filter((slot) => !sets.get(slot.set_id ?? "")?.items.find((i) => i.id === slot.item_id)?.plan).map((x) => x.n);
        const still = lines();
        s.audit = [
            ...s.audit.filter((a) => /usable photo|layout reference/.test(a.message)),
            ...alike.slice(0, 12).map(([a, b]): PlanIssue => ({ level: "warn", ads: [a, b], message: `Ads ${a} and ${b} are still close: "${closeOf(a, b, still)[0]}" and "${closeOf(a, b, still)[1]}".` })),
            ...(alike.length > 12 ? [{ level: "warn" as const, ads: [...new Set(alike.slice(12).flat())], message: `${alike.length - 12} more pair${alike.length - 12 === 1 ? "" : "s"} of ads share a line or most of one.` }] : []),
            ...failed.map((f): PlanIssue => ({ level: "warn", message: `A set stopped while it was being written (${f}). Open it and plan it again.` })),
            ...(unwritten.length ? [{ level: "warn" as const, ads: unwritten, message: `${unwritten.length} ad${unwritten.length === 1 ? " has" : "s have"} no brief yet: ${unwritten.join(", ")}.` }] : []),
        ];
        s.status = "briefs_ready";
        note(s, `Briefs written: ${s.slots.length - unwritten.length} of ${s.slots.length}`);
        save(s);
    }
    catch (e) {
        s.status = "failed";
        s.error = (e as Error).message.slice(0, 400);
        note(s, `Writing the briefs stopped: ${s.error.slice(0, 200)}`);
        save(s);
        throw e;
    }
}
export async function makeSprint(id: string, opts: {
    notes?: string;
} = {}): Promise<void> {
    await planSprint(id, opts);
    let s = need(id);
    if (!s.options?.auto || s.status !== "plan_ready")
        return;
    const held = sprintClaims(s) ? sprintHeld(s.brand_id, true) : null;
    if (held)
        note(s, held.slice(0, 400));
    const failedPlan = s.audit.find((a) => a.level === "fail");
    if (failedPlan) {
        note(s, `The plan waits for you: ${failedPlan.message}`.slice(0, 400));
        save(s);
        return;
    }
    approvePlan(id, true);
    await writeBriefs(id);
    s = need(id);
    if (s.status !== "briefs_ready")
        return;
    if ([...setsOf(s).values()].some((run) => run.audit.some((a) => a.status === "fail"))) {
        note(s, "The briefs wait for human review of failed checks.");
        save(s);
        return;
    }
    approveBriefs(id);
    await renderSprint(id);
}
export function approveBriefs(id: string): SprintRow {
    const s = need(id);
    if (s.status !== "briefs_ready" && !(s.status === "done" || (s.status === "failed" && s.stage === "render")))
        throw new Error("There are no briefs waiting for approval.");
    s.approved = { ...s.approved, briefs: s.approved.briefs ?? new Date().toISOString() };
    s.status = "rendering";
    s.stage = "render";
    if (s.log.at(-1)?.message !== "Briefs approved")
        note(s, "Briefs approved");
    save(s);
    return s;
}
export async function renderSprint(id: string, opts: {
    noRetry?: boolean;
    force?: boolean;
} = {}): Promise<void> {
    const s = need(id);
    if (!s.approved.briefs)
        throw new Error("Approve the briefs first.");
    s.status = "rendering";
    s.stage = "render";
    s.error = null;
    save(s);
    try {
        const stopped: string[] = [];
        let next = 0;
        await Promise.all(Array.from({ length: Math.min(2, s.set_ids.length) }, async () => {
            for (;;) {
                const setId = s.set_ids[next++];
                if (!setId)
                    return;
                try {
                    const run = getRun(setId);
                    const out = new Set((run?.audit ?? []).filter((a) => a.status === "fail" && !isClaimCheck(a.check)).map((a) => a.line_index));
                    const ready = (run?.items ?? []).filter((i, at) => i.plan && !out.has(at)).map((i) => i.id);
                    if (opts.force || out.has(undefined) || !run?.audit.some((a) => a.status === "fail"))
                        await renderRun(setId, { skipFailed: true, force: opts.force, noRetry: opts.noRetry });
                    else if (ready.length)
                        await renderRun(setId, { itemIds: ready, force: true, noRetry: opts.noRetry });
                    else
                        throw new Error("Every ad in this set has a failed check on its plan.");
                }
                catch (e) {
                    if (e instanceof BudgetExceededError || e instanceof RunStoppedError)
                        throw e;
                    stopped.push(`${setId}: ${(e as Error).message.slice(0, 160)}`);
                }
            }
        }));
        const ads = sprintAds(s);
        const complete = (a: SprintAd) => (s.options.aspects ?? ["4:5"]).every(aspect => a.item?.outputs.some(o => o.aspect === aspect));
        const made = ads.filter(complete).length;
        const count = (st: string) => ads.filter((a) => a.output?.qa?.status === st).length;
        s.audit = [...s.audit.filter((a) => !/could not be rendered|was not rendered|were not rendered/.test(a.message)), ...stopped.map((x): PlanIssue => ({ level: "warn", message: `A set could not be rendered (${x}).` })), ...(made < ads.length ? [{ level: "warn" as const, message: `${ads.length - made} ad${ads.length - made === 1 ? " was" : "s were"} not rendered: ${ads.filter(a => !complete(a)).map((a) => a.slot.n).join(", ")}. Open each one for the reason.` }] : [])];
        s.status = "done";
        note(s, `${made} of ${ads.length} ads rendered${mediaLive() ? "" : " (mock placeholders)"}: ${count("pass")} passed the checks, ${count("warn")} to look at, ${count("fail")} failed`);
        save(s);
    }
    catch (e) {
        s.status = "failed";
        s.error = (e as Error).message.slice(0, 400);
        note(s, `Rendering stopped: ${s.error.slice(0, 200)}`);
        save(s);
        throw e;
    }
}
export interface SprintAd {
    slot: SprintSlot;
    setId: string | null;
    item: StudioItem | null;
    headline: string;
    fails: string[];
    flags: string[];
    warns: string[];
    output: StudioOutput | null;
}
export function sprintAds(s: SprintRow): SprintAd[] {
    const sets = setsOf(s);
    return s.slots.map((slot) => {
        const run = sets.get(slot.set_id ?? "");
        const at = run ? run.items.findIndex((i) => i.id === slot.item_id) : -1;
        const item = at >= 0 ? run!.items[at] : null;
        const audit = run && at >= 0 ? run.audit.filter((a) => a.line_index === at) : [];
        const output = item?.outputs.length ? currentOutputs(item.outputs)[0] : null;
        const failed = audit.filter((a) => a.status === "fail");
        return { slot, setId: run?.id ?? null, item, headline: headlineOf(item ?? undefined), fails: failed.filter((a) => !isClaimCheck(a.check)).map((a) => a.message), flags: failed.filter((a) => isClaimCheck(a.check)).map((a) => a.message), warns: audit.filter((a) => a.status === "warn").map((a) => a.message), output };
    });
}
export const sprintRefs = (s: SprintRow) => refsById(s.slots.map((x) => x.ref_id).filter((x): x is string => !!x));
