import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AskIntent, ReferenceMode } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { conceptFromRequest } from "../chat/make";
import { ALL_BUYERS, CHOICE_LABEL, NO_OFFER, WHOLE_BRAND, isAllBuyers, isNoOffer, isWholeBrand } from "../choices";
import { enqueue } from "../jobs/queue";
import { llmEnabled } from "../llm/gateway";
import type { ProductInPicture } from "../product-in-picture";
import { pickAxes, pickPlans } from "../scripts/axes";
import { adReferenceLabel } from "../studio/ad-refs";
import { createRun } from "../studio/engine";
import { scriptFields, studioFields } from "../taste/apply";
import { decide } from "../taste/decisions";
import { compactTaste } from "../taste/schema";
import type { Taste } from "../taste/types";
import type { AwarenessStage, LengthPreset, OutputType } from "../taxonomy";
export const MAX_VARIANTS = 4;
export const MAX_PICKS = 24;
const SET_SIZE = 12;
export interface BuildPick {
    id: string;
    note: string;
    variants: number;
    productId: string;
    personaId: string;
}
export interface BuildInput {
    picks: BuildPick[];
    productId: string;
    offerId?: string;
    aspects?: string[];
    textOnImage: boolean;
    feedCopy: boolean;
    baseImage: boolean;
    productInPicture?: ProductInPicture;
    notes?: string;
    claimChecks?: boolean;
    hooks?: number;
    variety?: number;
    taste?: Taste;
}
export interface Built {
    sets: string[];
    ads: number;
    scripts: number;
    said: string[];
}
export function buildDirection(note: string, persona: {
    id: string;
    name: string;
} | null, variant: number, of: number): string {
    return [
        note.replace(/\s+/g, " ").trim().slice(0, 380),
        persona ? `Write this one for ${persona.id} (${persona.name}).` : "",
        of > 1 ? `Variant ${variant} of ${of} on this reference: keep its structure, and take a different angle, headline and picture from the other variants.` : "",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 600);
}
const lengthFor = (seconds: number | null): LengthPreset => (!seconds || seconds <= 20 ? "15s" : seconds <= 45 ? "30s" : seconds <= 100 ? "60s" : "2-3m");
export interface FromReference {
    referenceId: string;
    mode: ReferenceMode;
    personaId: string;
    offerId: string;
    productId?: string;
    stage?: AwarenessStage;
    format?: OutputType;
    then?: {
        type: OutputType;
        recipe: string;
        aspect?: string;
    };
    note: string;
    count: number;
    length?: LengthPreset;
    productName?: string;
    model?: string;
    claimChecks?: boolean;
    hooks?: number;
    variety?: number;
    taste?: Taste;
}
export const askedOf = (note: string) => note.replace(/\s+/g, " ").trim().slice(0, 600);
export function scriptsFromReference(brandId: string, from: FromReference): {
    queued: number;
    conceptId: string;
} {
    const taste = compactTaste(from.taste);
    const bridge = scriptFields(taste, true);
    const input: FromReference = { ...from, mode: from.mode === "exact" ? "exact" : ((bridge.mode as ReferenceMode | undefined) ?? from.mode), variety: bridge.variety ?? from.variety };
    if (!llmEnabled())
        throw new Error("Script writing is not available in mock mode.");
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, input.referenceId)).get();
    if (!ref)
        throw new Error("That reference is no longer in the library.");
    if (!ref.analyzed)
        throw new Error("Analyse this reference first: the script is built on its analysed structure.");
    const brand = loadBrandBrain(brandId);
    const exact = input.mode === "exact";
    const asked = exact ? "" : askedOf(input.note);
    const count = exact ? 1 : Math.max(1, Math.min(MAX_VARIANTS, Math.round(input.count) || 1));
    const length = (input.mode === "principles" || ref.kind === "image") && input.length ? input.length : lengthFor(ref.duration);
    const whole = isWholeBrand(input.productId);
    const product = whole ? undefined : brand.products.find((p) => p.id === input.productId);
    const about = whole ? `For ${brand.brand.name} as a whole brand, not 1 product.` : product || input.productName ? `For ${product?.name ?? input.productName}.` : "";
    const intent: AskIntent = {
        kind: "scripts",
        count,
        product_id: whole ? WHOLE_BRAND : (product?.id ?? null),
        persona_ids: isAllBuyers(input.personaId) ? [ALL_BUYERS] : brand.personas.some((p) => p.id === input.personaId) ? [input.personaId] : [],
        offer_id: isNoOffer(input.offerId) ? NO_OFFER : brand.offers.some((o) => o.id === input.offerId) ? input.offerId : null,
        concept_id: null,
        reference_id: ref.id,
        reference_mode: input.mode,
        length,
        aspects: [],
        audience: "",
        brief: [about, asked].filter(Boolean).join(" ").slice(0, 600),
        title: `${whole ? `${CHOICE_LABEL[WHOLE_BRAND]}, from` : "From"} a reference: ${adReferenceLabel(ref)}`.slice(0, 80),
    };
    const conceptId = conceptFromRequest(brandId, intent, input.stage ? { stage: input.stage } : {});
    const then = input.then ? { type: input.then.type, recipe: input.then.recipe, ...(input.then.aspect ? { aspect: input.then.aspect } : {}), ...(asked ? { notes: asked } : {}), ...(product ? { productId: product.id } : {}), ...(Object.keys(taste).length ? { taste } : {}) } : null;
    const stage = db.select({ stage: schema.concepts.awareness_stage }).from(schema.concepts).where(eq(schema.concepts.id, conceptId)).get()!.stage;
    const plans = input.mode === "principles" ? pickPlans(count, length, [], { stage }) : pickAxes(count, length, []);
    plans.forEach((axes, turn) => {
        enqueue(brandId, "script", conceptId, { axes: { ...axes, ...(asked ? { asked } : {}), ...(typeof input.claimChecks === "boolean" ? { claim_checks: input.claimChecks } : {}), ...(!exact && input.hooks && input.hooks > 1 ? { hooks: Math.min(5, Math.round(input.hooks)) } : {}), ...(!exact && input.variety ? { variety: Math.min(5, Math.max(1, Math.round(input.variety))) } : {}), ...(!exact && Object.keys(taste).length ? { taste } : {}) }, turn, referenceId: ref.id, referenceMode: input.mode, ...(input.model && !exact ? { model: input.model } : {}), ...(input.format ? { format: input.format } : {}), ...(then ? { then } : {}) });
    });
    return { queued: plans.length, conceptId };
}
export function buildFromReferences(brandId: string, input: BuildInput): Built {
    if (!input.picks.length)
        throw new Error("Tick at least 1 reference.");
    if (input.picks.length > MAX_PICKS)
        throw new Error(`A build takes ${MAX_PICKS} references at most. Untick some, or build twice.`);
    const brand = loadBrandBrain(brandId);
    const productOf = (id: string): {
        id: string;
        name: string;
    } | undefined => (isWholeBrand(id || input.productId) ? { id: WHOLE_BRAND, name: brand.brand.name } : brand.products.find((p) => p.id === (id || input.productId)));
    if (!productOf(""))
        throw new Error("Pick the product these are for.");
    const noOffer = isNoOffer(input.offerId);
    const offer = noOffer ? undefined : brand.offers.find((o) => o.id === input.offerId);
    const rows = new Map(db.select().from(schema.adReferences).where(inArray(schema.adReferences.id, input.picks.map((p) => p.id))).all().map((r) => [r.id, r]));
    const said: string[] = [];
    const perProduct = new Map<string, {
        refId: string;
        direction: string;
        label: string;
        reason: string;
    }[]>();
    const videos: {
        pick: BuildPick;
        productId: string;
    }[] = [];
    for (const pick of input.picks) {
        const ref = rows.get(pick.id);
        if (!ref) {
            said.push("1 reference is no longer in the library and was left out.");
            continue;
        }
        const product = productOf(pick.productId) ?? productOf("")!;
        const persona = brand.personas.find((p) => p.id === pick.personaId) ?? null;
        const variants = Math.max(1, Math.min(MAX_VARIANTS, Math.round(pick.variants) || 1));
        if (ref.kind === "video") {
            videos.push({ pick: { ...pick, variants }, productId: product.id });
            continue;
        }
        if (!ref.media_path) {
            said.push(`"${adReferenceLabel(ref)}" has no image file on this computer and was left out.`);
            continue;
        }
        const list = perProduct.get(product.id) ?? [];
        const everyone = isAllBuyers(pick.personaId) ? " Write this one for all of the brand's buyers, not 1 persona." : "";
        for (let v = 1; v <= variants; v++)
            list.push({ refId: ref.id, direction: `${buildDirection(pick.note, persona, v, variants)}${everyone}`.trim().slice(0, 600), label: `${adReferenceLabel(ref)}${variants > 1 ? ` · ${v}` : ""}`.slice(0, 80), reason: "The reference you picked on the References screen" });
        perProduct.set(product.id, list);
    }
    const taste = compactTaste(input.taste);
    const fields = studioFields(taste, true);
    for (const w of decide({ surface: "image_ad", hasReference: true }, taste).warnings)
        if (perProduct.size && !said.includes(w))
            said.push(w);
    const sets: string[] = [];
    let ads = 0;
    for (const [productId, picks] of perProduct) {
        for (let at = 0; at < picks.length; at += SET_SIZE) {
            const batch = picks.slice(at, at + SET_SIZE);
            const product = productOf(productId)!;
            const id = createRun({ brandId, kind: "ad", productId, picks: batch, aspects: input.aspects, notes: input.notes, title: `${product.name}: from ${batch.length} reference${batch.length === 1 ? "" : "s"} you picked`, auto: true, textOnImage: fields.textOnImage ?? input.textOnImage, feedCopy: input.feedCopy, baseImage: input.baseImage, ...(fields.productInPicture ?? input.productInPicture ? { productInPicture: fields.productInPicture ?? input.productInPicture } : {}), ...(fields.fidelity ? { fidelity: fields.fidelity } : {}), ...((fields.variety ?? input.variety) ? { variety: fields.variety ?? input.variety } : {}), ...(typeof input.claimChecks === "boolean" ? { claimChecks: input.claimChecks } : {}), ...(offer ? { offer: offer.id } : {}), ...(noOffer ? { noOffer: true } : {}) });
            enqueue(brandId, "studio", id, { op: "plan" });
            sets.push(id);
            ads += batch.length;
        }
    }
    let scripts = 0;
    if (videos.length && !llmEnabled())
        said.push(`${videos.length} video reference${videos.length === 1 ? " was" : "s were"} left out: a script can't be written in mock mode.`);
    else
        for (const { pick, productId } of videos) {
            try {
                scripts += scriptsFromReference(brandId, { referenceId: pick.id, mode: "structure", personaId: pick.personaId, offerId: input.offerId ?? "", note: [pick.note.trim(), input.notes?.trim() ?? ""].filter(Boolean).join(" "), count: pick.variants, productId, claimChecks: input.claimChecks, hooks: input.hooks, variety: input.variety, taste }).queued;
            }
            catch (e) {
                said.push(`"${adReferenceLabel(rows.get(pick.id)!)}" was left out: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    if (!sets.length && !scripts)
        throw new Error(said[0] ?? "Nothing could be built from those references.");
    return { sets, ads, scripts, said };
}
