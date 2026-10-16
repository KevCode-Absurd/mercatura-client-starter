import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AskIntent, ScriptAxes } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { formatById } from "../catalogue";
import { conceptFromRequest } from "../chat/make";
import { enqueue } from "../jobs/queue";
import { llmEnabled } from "../llm/gateway";
import { pickNativePlans, pickPlans } from "../scripts/axes";
import { recentAxes } from "../scripts/hand";
import { INDIRECT_FORMAT_ID, indirectOptions } from "../scripts/indirect";
import { clampHooks } from "../scripts/versions";
import { lookToVariety } from "../taste/compat";
import { compactTaste } from "../taste/schema";
import { AWARENESS_INFO, LENGTH_PRESETS, type OutputType } from "../taxonomy";
import { listPersonas } from "../personas/store";
import { offerProduct } from "../production/kit";
import { match, totalOf, unknownRows, type MatchData } from "./plan";
import { builderFormats, listAngles, listBrandOffers, listCustomFormats } from "./store";
import { picturesOf } from "./kit";
import { MAX_PICTURES, MAX_SCRIPTS, MAX_TEXTS, NO_OFFER, NO_OFFER_STAGES, type BuilderPick, type ScriptKit } from "./types";
export interface BuilderStarted {
    run: string;
    scripts: number;
    concepts: number;
    said: string;
}
export function matchData(brandId: string): MatchData {
    const brand = loadBrandBrain(brandId);
    const profiles = listPersonas(brandId);
    const known = new Set(brand.products.map((p) => p.id));
    const offers: MatchData["offers"] = [{ id: NO_OFFER, persona_ids: [] as string[], stages: [...NO_OFFER_STAGES] as string[], product_id: null as string | null }, ...listBrandOffers(brandId).map((o) => ({ id: o.id, persona_ids: o.persona_ids, stages: o.stages, product_id: offerProduct(brand, o.id), fitted: o.fitted }))];
    const buys = (personaId: string) => {
        const named = (profiles.find((x) => x.id === personaId)?.product_ids ?? []).filter((id) => known.has(id));
        return named.length ? named : [...new Set(offers.filter((o) => o.product_id && o.persona_ids.includes(personaId)).map((o) => o.product_id!))];
    };
    return {
        products: brand.products.map((p) => ({ id: p.id })),
        personas: brand.personas.map((p) => ({ id: p.id, awareness: profiles.find((x) => x.id === p.id)?.awareness ?? "problem_aware", product_ids: buys(p.id) })),
        angles: listAngles(brandId).map((a) => ({ id: a.id, persona_ids: a.persona_ids, stages: a.stages ?? [] })),
        offers,
        formats: builderFormats(brandId).map((f) => ({ id: f.id, stages: f.stages })),
    };
}
export function startBuilder(brandId: string, pick: BuilderPick): BuilderStarted {
    const brand = loadBrandBrain(brandId);
    const angles = listAngles(brandId);
    const formats = builderFormats(brandId);
    const custom = listCustomFormats(brandId);
    const data = matchData(brandId);
    const lacking = [brand.products.length > 0 && !Object.keys(pick.products).length && "a product", !Object.keys(pick.stages).length && "a stage", !Object.keys(pick.personas).length && "a persona", !Object.keys(pick.angles).length && "an angle", !Object.keys(pick.offers).length && "an offer", !Object.keys(pick.formats).length && "a format"].filter(Boolean);
    if (lacking.length)
        throw new Error(`Keep at least ${lacking.join(", ")}.`);
    if (totalOf(pick) > MAX_SCRIPTS)
        throw new Error(`The numbers you set add up to ${totalOf(pick)} scripts. 1 go writes ${MAX_SCRIPTS} at most.`);
    const chosen = pick.rows?.length ? pick.rows.slice(0, MAX_SCRIPTS) : match(pick, data);
    const n = chosen.length;
    const gone = unknownRows(chosen, data);
    if (!n || gone.length)
        throw new Error(`${gone.length ? `Row ${gone.join(", ")} names something` : "Something you chose is"} no longer on its list. Reload the page and choose again.`);
    if (!llmEnabled())
        return { run: "", scripts: 0, concepts: 0, said: `Mock mode: ${n === 1 ? "1 script is" : `${n} scripts are`} planned and none is written. Writing a script needs live mode.` };
    const run = `bld_${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
    const texts = Math.max(0, Math.min(MAX_TEXTS, Math.round(pick.texts) || 0));
    const pictures = Math.max(0, Math.min(MAX_PICTURES, Math.round(pick.pictures) || 0));
    const want: ScriptKit["want"] = { primary_text: texts > 0, image_prompts: pictures > 0, images: pictures > 0, texts, pictures, words: pick.words };
    const concepts = new Map<string, {
        id: string;
    }>();
    const usedAt = new Map<string, ScriptAxes[]>();
    const usedFor = (stage: string) => usedAt.get(stage) ?? usedAt.set(stage, recentAxes(brandId, stage)).get(stage)!;
    let scripts = 0;
    const hooks = clampHooks(pick.hooks);
    const length = pick.length && (LENGTH_PRESETS as readonly string[]).includes(pick.length) ? pick.length : null;
    const taste = compactTaste(pick.taste);
    const moved = Object.keys(taste).length > 0;
    const variety = taste.look ? lookToVariety(taste.look === "reference" ? "between" : taste.look) : pick.variety ? Math.min(5, Math.max(1, Math.round(pick.variety))) : undefined;
    for (const c of chosen) {
        const persona = brand.personas.find((p) => p.id === c.persona_id)!;
        const angle = angles.find((a) => a.id === c.angle_id)!;
        const own = custom.find((f) => f.id === c.format_id);
        const cold = c.format_id === INDIRECT_FORMAT_ID;
        const native = c.format_id === "native" || cold;
        const start = native ? null : formatById(own?.base ?? c.format_id)?.start;
        if (!native && start?.how !== "script")
            continue;
        const product = brand.products.find((p) => p.id === c.product_id);
        const key = [c.product_id, c.persona_id, c.stage, c.angle_id, c.offer_id].join("|");
        const none = c.offer_id === NO_OFFER;
        const offerId = none ? ((brand.offers.find((o) => product && offerProduct(brand, o.id) === product.id) ?? brand.offers[0])?.id ?? NO_OFFER) : c.offer_id;
        if (!offerId)
            continue;
        let concept = concepts.get(key);
        if (!concept) {
            const title = `${persona.name}: ${angle.name} (${AWARENESS_INFO[c.stage].label.toLowerCase()})`;
            const intent: AskIntent = { kind: "scripts", count: 1, product_id: product?.id ?? null, persona_ids: [c.persona_id], offer_id: offerId, concept_id: null, reference_id: null, reference_mode: null, length: "30s", aspects: [], audience: "", brief: angle.line, title };
            const id = conceptFromRequest(brandId, intent, { stage: c.stage });
            if (!pick.research)
                db.update(schema.concepts).set({ theme_ids: [], desire_evidence_theme_ids: [] }).where(eq(schema.concepts.id, id)).run();
            concept = { id };
            concepts.set(key, concept);
        }
        const used = usedFor(c.stage);
        const plan = cold ? pickNativePlans(1, used, indirectOptions(`${persona.problem ?? ""} ${angle.line} ${angle.name}`))[0] : native ? pickNativePlans(1, used)[0] : pickPlans(1, length ?? (start?.how === "script" ? start.lengths[0] : "30s"), used, { stage: c.stage })[0];
        if (!plan)
            continue;
        used.push(plan);
        const said = [pick.notes?.trim(), c.note?.trim()].filter(Boolean).join(" ");
        const asked = [own ? `The format is "${own.name}". How it plays: ${own.how}` : "", said].filter(Boolean).join(" ");
        const axes: ScriptAxes = { ...plan, ...(native ? {} : { flow: true }), ...(length && !native ? { length_chosen: true } : {}), ...(hooks > 1 ? { hooks } : {}), ...(variety ? { variety } : {}), ...(moved ? { taste } : {}), ...(asked ? { asked } : {}), ...(none ? { no_offer: true } : {}) };
        const format: OutputType | undefined = !native && start?.how === "script" ? start.type : undefined;
        const kit: ScriptKit = { run, ...(product ? { product: product.name } : {}), angle: angle.name, offer: none ? "No offer" : brand.offers.find((o) => o.id === c.offer_id)?.name, ...(none ? { no_offer: true } : {}), ...(said ? { asked: said } : {}), ...(variety ? { variety } : {}), ...(moved ? { taste } : {}), format: formats.find((f) => f.id === c.format_id)?.name ?? c.format_id, want };
        enqueue(brandId, "script", concept.id, { axes, turn: scripts, ...(format ? { format } : {}), kit });
        scripts++;
    }
    if (!scripts)
        throw new Error("No script could be planned for those formats.");
    const made = picturesOf(want);
    const extras = [hooks > 1 ? `${hooks} hooks` : "", texts === 1 ? "primary text" : texts > 1 ? `${texts} versions of the primary text` : "", made === 1 ? "1 picture" : made > 1 ? `${made} pictures` : ""].filter(Boolean).join(" and ");
    return { run, scripts, concepts: concepts.size, said: `${scripts === 1 ? "1 script is" : `${scripts} scripts are`} being written${extras ? `, each with ${extras}` : ""}. They appear below as they finish.` };
}
