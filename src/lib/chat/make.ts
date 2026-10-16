import { eq } from "drizzle-orm";
import { analysisDirection, readReferenceAnalysis } from "../references/analysis";
import { clampHooks } from "../scripts/versions";
import { db, schema } from "@/db";
import type { AskIntent, ChatActionResult } from "@/db/schema";
import { brandCode } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { listAngles } from "../builder/store";
import { ALL_BUYERS, NO_OFFER, WHOLE_BRAND, isAllBuyers, isWholeBrand } from "../choices";
import { adType } from "../library/taxonomy";
import { galleryFormat } from "../format-gallery";
import { picksFor } from "../format-picks";
import { angleFor } from "../format-start";
import type { MinedAngle } from "../angles/library";
import { reviewNote } from "../studio/review-ads";
import { BANK_ASPECTS, BANK_NOTE } from "../studio/offer-bank";
import { BudgetExceededError, llmEnabled } from "../llm/gateway";
import { RunStoppedError } from "../llm/run-control";
import { mediaUsage } from "../media/providers";
import { adsetName } from "../naming";
import { offerForPersona } from "../offers/book";
import { getPersona } from "../personas/store";
import { loadCreativeKit } from "../production/kit";
import { rankThemes } from "../ranking";
import { pickAxes, pickNativePlans, pickPlans } from "../scripts/axes";
import { recentAxes } from "../scripts/hand";
import { indirectOptions } from "../scripts/indirect";
import { generateScript } from "../scripts/engine";
import { getSetting } from "../settings";
import { createRun, getRun, planRun, renderRun } from "../studio/engine";
import { distinctRefs, productProfile, rankRefs, suggestLayouts, suggestSet, suggestTemplate } from "../studio/select";
import { conceptsInLook, lookNote, worldOf } from "../studio/worlds";
import { AWARENESS_INFO, AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import type { OutputType } from "../taxonomy";
import { scriptFields, studioFields } from "../taste/apply";
import { decide } from "../taste/decisions";
import { parseTaste } from "../taste/schema";
import type { ContextPlan, ReferenceText, Surface, Taste } from "../taste/types";
import { ASK_KINDS } from "./request-types";
export interface Sink {
    had: ChatActionResult;
    save: (patch: Partial<ChatActionResult>) => void;
}
export type ReferenceUse = "attach" | "build_on" | "describe" | "function" | "none";
export function referenceUse(plan: ContextPlan, ref: {
    image: boolean;
} | null, adSet: boolean): ReferenceUse {
    if (!ref)
        return "none";
    const usable = ref.image && adSet;
    if (plan.attach.referenceImage)
        return usable ? "attach" : "describe";
    if (plan.text.referenceDescription === "detailed")
        return usable ? "build_on" : "describe";
    return plan.text.referenceDescription === "function" ? "function" : "none";
}
export function imagesPlan(surface: Surface, taste: Taste | null | undefined, hasReference: boolean): ContextPlan {
    return decide({ surface, hasReference }, taste);
}
export function referenceDirection(id: string | null, level: ReferenceText = "detailed"): string {
    if (!id || level === "none")
        return "";
    const r = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!r)
        return "";
    const a = readReferenceAnalysis(r.analysis);
    if (level === "function") {
        const kindOfAd = (r.tags?.format ?? []).filter(Boolean)[0];
        return `The person tagged a reference ad, "${r.title}". Only its kind is given${kindOfAd ? `: ${String(kindOfAd).slice(0, 120)}` : ""}. Its layout, its words and its look are left out on purpose: do not guess at them.`;
    }
    const found = analysisDirection(a);
    return `A reference ad the person tagged: "${r.title}".${r.notes ? ` Their note: ${r.notes.slice(0, 300)}` : ""}${found ? ` What it does: ${found}.` : ""} Take its idea and its structure. Never its words, its claims or its brand.`;
}
export async function makeImages(brandId: string, i: AskIntent & {
    kind: "image_ads" | "product_page" | "photoshoot";
}, sink: Sink): Promise<void> {
    const brand = loadBrandBrain(brandId);
    const kind = ASK_KINDS[i.kind].library!;
    if (!i.product_id)
        throw new Error("Say which product it is for.");
    const had = sink.had.set_id ? getRun(sink.had.set_id) : undefined;
    if (had)
        return finishImages(had.id, sink);
    const profile = { ...productProfile(brandId, brand, loadCreativeKit(brandId), i.product_id), stage: i.stage };
    let picks: {
        refId?: string | null;
        bucket?: string;
        reason?: string;
        world?: string;
        mode?: string;
        archetype?: string;
        fidelity?: "exact" | "structure" | "loose";
        direction?: string;
    }[];
    const look = kind === "ad" ? worldOf(i.look) : undefined;
    let mined: MinedAngle | undefined;
    const chosen = galleryFormat(i.format_id ?? "");
    const format = chosen && chosen.start.via === "studio" && chosen.start.kind === kind ? chosen : undefined;
    const layout = kind === "ad" && i.layout_type ? adType(i.layout_type) : undefined;
    if (look) {
        picks = conceptsInLook(look.id, i.count, { offer: !!i.offer_id });
    }
    else if (format) {
        const review = format.start.via === "studio" && format.start.picks === "review";
        mined = review ? angleFor(brandId, null, i.angle_id) : undefined;
        if (review && !mined)
            throw new Error("The angle library is empty: bring in customer sources, extract and sort them into themes first.");
        picks = picksFor(brandId, format, i.product_id, Math.min(i.count, format.count?.max ?? i.count), { ...(mined ? { angle: mined } : {}), stage: i.stage });
    }
    else if (layout) {
        const own = brand.brand.name.toLowerCase();
        picks = rankRefs("ad", profile, { type: layout.id, limit: 80 }).filter((s) => s.ref.brand?.toLowerCase() !== own).slice(0, i.count).map((s) => ({ refId: s.ref.id, reason: s.reason }));
        if (!picks.length)
            throw new Error(`The library has no ${layout.label.toLowerCase()} layout that fits this product. Choose another creative type, or leave it to me.`);
    }
    else if (kind === "pdp") {
        picks = suggestTemplate(profile).slice(0, i.count).map((s) => ({ refId: s.pick?.ref.id ?? null, bucket: s.bucket, reason: s.pick?.reason }));
    }
    else {
        const own = brand.brand.name.toLowerCase();
        const first = kind === "ad" ? suggestLayouts(profile, i.count, { stage: i.stage, skipBrand: own }) : suggestSet(kind, profile).filter((s) => s.ref.brand?.toLowerCase() !== own);
        const more = rankRefs(kind, profile, { limit: 80 }).filter((s) => s.ref.brand?.toLowerCase() !== own && !first.some((f) => f.ref.id === s.ref.id));
        picks = distinctRefs([...first, ...more], i.count).map((s) => ({ refId: s.ref.id, reason: s.reason }));
    }
    if (!picks.length)
        throw new Error(`The library has no ${ASK_KINDS[i.kind].many} layouts to build on yet. Import the layout library first (the Guide says how).`);
    const taste = parseTaste(i.taste);
    const refRow = i.reference_id ? db.select().from(schema.adReferences).where(eq(schema.adReferences.id, i.reference_id)).get() : undefined;
    const surface: Surface = kind === "pdp" ? "pdp" : kind === "photoshoot" ? "photoshoot" : format?.id.includes("native") ? "native_ad" : "image_ad";
    const plan = imagesPlan(surface, taste, !!refRow);
    const use = referenceUse(plan, refRow ? { image: refRow.kind === "image" && !!refRow.media_path } : null, kind === "ad");
    const said: string[] = [...plan.warnings];
    if (refRow && (use === "attach" || use === "build_on")) {
        const n = Math.max(1, i.count);
        picks = Array.from({ length: n }, (_, k) => ({ refId: refRow.id, fidelity: use === "attach" ? ("exact" as const) : ("structure" as const), reason: use === "attach" ? "The reference you tagged, rebuilt with your product and your words" : "Built on the layout of the reference you tagged", ...(n > 1 ? { direction: `Variant ${k + 1} of ${n} on this reference: keep its structure, and take a different angle, headline and picture from the other variants.` } : {}) }));
    }
    else if (refRow && plan.taste.look === "reference")
        said.push("That reference is a video, or its picture is not on this computer, so the picture itself could not be sent. Its structure was described in words instead.");
    const fields = studioFields({ ...taste, ...(taste.look ? { look: plan.taste.look } : {}) }, use === "attach" || use === "build_on");
    const refText = use === "describe" ? referenceDirection(i.reference_id, "detailed") : use === "function" ? referenceDirection(i.reference_id, "function") : "";
    const angle = angleLine(brandId, i.angle_id);
    const notes = [look && use !== "attach" ? lookNote(look.id) : "", format?.start.via === "studio" ? (format.start.look ?? "") : "", format?.id === "ad-offer" ? BANK_NOTE : "", mined ? reviewNote(mined) : angle ? `The angle: ${angle}` : "", i.brief, i.audience ? `Written for: ${i.audience}.` : "", refText].filter(Boolean).join(" ").slice(0, 1900);
    const setId = createRun({ brandId, kind, productId: i.product_id, picks, aspects: format?.id === "ad-offer" && !i.aspects?.length ? [...BANK_ASPECTS] : i.aspects, notes, title: i.title, buyers: i.persona_ids, ...(i.stage && kind === "ad" ? { stage: i.stage } : {}), ...(fields.variety ? { variety: fields.variety } : {}), ...(fields.fidelity ? { fidelity: fields.fidelity } : {}), ...(fields.productInPicture ? { productInPicture: fields.productInPicture } : {}), ...(fields.textOnImage === false ? { textOnImage: false } : {}), ...(i.offer_id ? { offer: i.offer_id } : {}), ...(typeof i.claim_checks === "boolean" ? { claimChecks: i.claim_checks } : {}) });
    const short = picks.length < i.count ? `The library had ${picks.length} layouts that fit, so this is ${picks.length}.` : "";
    sink.save({ set_id: setId, ...(short || said.length ? { note: [short, ...said].filter(Boolean).join(" ") } : {}) });
    await finishImages(setId, sink);
}
export async function finishImages(setId: string, sink: Sink): Promise<void> {
    if (!getRun(setId)?.items.every((x) => x.plan))
        await planRun(setId);
    const planned = getRun(setId);
    if (!planned || !planned.items.some((x) => x.plan))
        throw new Error(planned?.error || "The plan could not be written.");
    const flagged = planned.audit.filter((a) => a.status === "fail");
    const failed = flagged;
    if (failed.length) {
        sink.save({ note: `The plan is written, but ${failed.length === 1 ? "1 check" : `${failed.length} checks`} on it failed, so no image was made. Open the set to edit the plan or override the checks as the human reviewer.` });
        return;
    }
    const u = mediaUsage();
    const need = planned.items.filter((x) => x.plan).length * planned.aspects.length;
    if (u.images + need > u.imageCap) {
        sink.save({ note: `The plan is written. The images were not made: this needs ${need} and ${Math.max(0, u.imageCap - u.images)} are left under the image cap. Raise the cap in Settings, then render from the set.` });
        return;
    }
    await renderRun(setId);
    const done = getRun(setId);
    if (!done || !done.items.some((x) => x.outputs.length))
        throw new Error(done?.error || "No image could be made.");
}
const DESIRE = new Set(["desire", "accommodation", "trigger_moment"]);
function angleLine(brandId: string, angleId: string | null | undefined): string {
    if (!angleId)
        return "";
    const a = listAngles(brandId).find((x) => x.id === angleId);
    return a ? [a.name, a.line].filter(Boolean).join(": ").slice(0, 300) : "";
}
const wordsOf = (s: string) => new Set(s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []);
export function conceptFromRequest(brandId: string, i: AskIntent, over: {
    stage?: AwarenessStage;
    sophistication?: number;
} = {}): string {
    const brand = loadBrandBrain(brandId);
    const personaId = isAllBuyers(i.persona_ids[0]) ? ALL_BUYERS : (i.persona_ids[0] ?? brand.personas[0]?.id);
    const whole = isWholeBrand(i.product_id);
    if (!personaId)
        throw new Error("This brand has no persona in use yet. Add one on the Personas screen, then ask again.");
    const offerId = i.offer_id ?? offerForPersona(brandId, { persona_id: personaId, product_id: whole ? null : i.product_id, angle: i.brief })?.id ?? brand.offers[0]?.id ?? NO_OFFER;
    const said = wordsOf(`${i.brief} ${i.audience} ${i.title}`);
    const near = (t: {
        label: string;
        summary: string;
    }) => [...wordsOf(`${t.label} ${t.summary}`)].filter((w) => said.has(w)).length;
    const themes = rankThemes(db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all(), getSetting(brandId, "rank_weights")).filter((t) => t.beat !== "guardrail").map((t, rank) => ({ t, rank, mine: t.personas.includes(personaId) ? 1 : 0, near: near(t) }));
    const order = (a: (typeof themes)[number], b: (typeof themes)[number]) => b.mine - a.mine || b.near - a.near || a.rank - b.rank;
    const desire = themes.filter((x) => DESIRE.has(x.t.type)).sort(order).slice(0, 3).map((x) => x.t.id);
    const rest = themes.filter((x) => !DESIRE.has(x.t.type)).sort(order).slice(0, 4).map((x) => x.t.id);
    const profile = getPersona(brandId, personaId);
    const stage: AwarenessStage = over.stage ?? ((AWARENESS_STAGES as readonly string[]).includes(profile?.awareness ?? "") ? (profile!.awareness as AwarenessStage) : "problem_aware");
    const sophistication = over.sophistication && over.sophistication >= 1 && over.sophistication <= 5 ? Math.round(over.sophistication) : brand.market_sophistication_stage;
    const all = db.select({ id: schema.concepts.id }).from(schema.concepts).all();
    const id = `con_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    const name = (i.title || "From the chat").slice(0, 80);
    db.insert(schema.concepts)
        .values({
        id,
        brand_id: brandId,
        name,
        persona_id: personaId,
        angle: [angleLine(brandId, i.angle_id), i.brief, i.audience ? `For ${i.audience}.` : ""].filter(Boolean).join(" ").slice(0, 600) || name,
        offer_id: offerId,
        product_id: whole ? WHOLE_BRAND : brand.products.some((p) => p.id === i.product_id) ? i.product_id : null,
        awareness_stage: stage,
        sophistication_stage: sophistication,
        theme_ids: [...new Set([...desire, ...rest])],
        desire_evidence_theme_ids: desire,
        differentiator_test: { claim: i.brief.slice(0, 200), is_proposition: false, unavailable_to_competitors: false, moves_a_stranger: false },
        formats_planned: [],
        status: "draft",
        meta_adset_name: adsetName(getSetting(brandId, "naming").adset, { brandCode: brandCode(brand), conceptId: id, personaId, conceptName: name, offerId, awarenessCode: AWARENESS_INFO[stage].code }),
        parent_concept_id: null,
    })
        .run();
    return id;
}
export async function writeScripts(brandId: string, i: AskIntent, sink: Sink, opts: {
    format?: OutputType;
} = {}): Promise<void> {
    if (!llmEnabled())
        throw new Error("Writing scripts needs live mode. In mock mode, ask for images: they are made as placeholders.");
    const existing = i.concept_id ? db.select().from(schema.concepts).where(eq(schema.concepts.id, i.concept_id)).get() : undefined;
    const kept = sink.had.concept_id ? db.select().from(schema.concepts).where(eq(schema.concepts.id, sink.had.concept_id)).get() : undefined;
    const conceptId = existing && existing.brand_id === brandId ? existing.id : (kept?.id ?? conceptFromRequest(brandId, i, i.stage ? { stage: i.stage } : {}));
    const before = sink.had.script_ids ?? [];
    let written = [...before];
    sink.save({ concept_id: conceptId, script_ids: written });
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, conceptId)).get()!;
    const used = recentAxes(brandId, concept.awareness_stage, conceptId);
    const length = i.length ?? "30s";
    const taste = parseTaste(i.taste);
    const bridge = scriptFields(taste, !!i.reference_id, i.reference_mode === "exact");
    const mode = i.reference_id ? (i.reference_mode === "exact" ? "exact" : (bridge.mode ?? i.reference_mode ?? "structure")) : undefined;
    const count = Math.max(0, (mode === "exact" ? 1 : i.count) - before.length);
    const native = i.skill === "native-ad-copy" && !i.reference_id;
    const indirect = i.skill === "indirect-ads" && !i.reference_id;
    const plans = indirect ? pickNativePlans(count, used, indirectOptions(`${i.brief} ${concept.angle} ${concept.name}`)) : native ? pickNativePlans(count, used) : mode && mode !== "principles" ? pickAxes(count, length, used) : pickPlans(count, length, used, { stage: concept.awareness_stage });
    const said = !!i.length && !native && !indirect;
    const hooks = clampHooks(i.hooks);
    const errors: string[] = [];
    for (let at = 0; at < plans.length; at += 3) {
        await Promise.all(plans.slice(at, at + 3).map((axes, k) => generateScript({ conceptId, axes: { ...axes, ...(said ? { length_chosen: true } : {}), ...(typeof i.claim_checks === "boolean" ? { claim_checks: i.claim_checks } : {}), ...(hooks > 1 && mode !== "exact" ? { hooks } : {}), ...(concept.offer_id === NO_OFFER ? { no_offer: true } : {}), ...(bridge.variety ? { variety: bridge.variety } : {}), ...(Object.keys(taste).length ? { taste } : {}) }, turn: at + k, ...(opts.format ? { format: opts.format } : {}), ...(i.reference_id ? { referenceId: i.reference_id, referenceMode: mode } : {}) })
            .then((id) => {
            written = [...written, id];
            sink.save({ script_ids: written });
        })
            .catch((e: Error) => {
            if (e instanceof RunStoppedError || e instanceof BudgetExceededError)
                throw e;
            errors.push(e.message);
        })));
    }
    if (!written.length)
        throw new Error(errors[0] ?? "No script could be written.");
    if (errors.length)
        sink.save({ note: `${written.length} of ${before.length + plans.length} were written. ${errors.length === 1 ? "1 failed" : `${errors.length} failed`}: ${errors[0]}` });
}
