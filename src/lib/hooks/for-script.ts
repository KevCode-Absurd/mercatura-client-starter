import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ScriptRow } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { getPersona } from "../personas/store";
import { termsBlock } from "../scripts/fact-rules";
import { AWARENESS_INFO, type AwarenessStage } from "../taxonomy";
import { rotated } from "../copy/seeds";
import { numberOfScript } from "../scripts/hand";
import { FOUNDER_FILMING, FOUNDER_HOOKS, HOOK_TYPES, HOOK_TYPE_LABEL, calloutsFor, founderHookSeconds, loadBank, occasionsFor, pickOpeners, type Callout, type Opener } from "./bank";
export interface ScriptBank {
    callouts: Callout[];
    shapes: Opener[];
    founder: boolean;
    realPerson: boolean;
    occasions: ("gifting" | "sale")[];
    stage: AwarenessStage;
}
const today = () => new Date().toISOString().slice(0, 10);
function buyer(brandId: string, personaId: string | null | undefined) {
    if (!personaId)
        return null;
    const persona = loadBrandBrain(brandId).personas.find((p) => p.id === personaId);
    if (!persona)
        return null;
    return { ...persona, identity: getPersona(brandId, personaId)?.identity };
}
export function bankForScript(script: Pick<ScriptRow, "brand_id" | "concept_id" | "awareness_stage" | "format_target" | "axes" | "notes" | "hook_variants"> & {
    id?: string;
}, n = 3): ScriptBank {
    const brand = loadBrandBrain(script.brand_id);
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    const founder = script.format_target === "human_brief_founder" || script.axes.native?.narrator === "founder";
    const realPerson = founder || script.format_target === "human_brief_ugc";
    const offer = concept && !script.axes.no_offer ? termsBlock(brand, concept.offer_id) : "";
    const occasions = occasionsFor([offer, script.axes.asked ?? "", script.notes ?? ""].join(" "), today());
    const stage = script.awareness_stage;
    const number = numberOfScript(script.id);
    const shapes = pickOpeners(loadBank(), { stage, occasions, category: `${brand.brand.category} ${brand.brand.one_liner}`, realPerson, withProof: false, seed: number, n: HOOK_TYPES.length });
    const fit = founder ? shapes : shapes.filter((s) => s.type !== "founder");
    const kinds = fit.filter((s, k) => fit.findIndex((x) => x.type === s.type) === k);
    const dealt = [...kinds.filter((s) => s.occasion), ...rotated(kinds.filter((s) => !s.occasion), number * n)].slice(0, n);
    return { callouts: calloutsFor(buyer(script.brand_id, concept?.persona_id)), shapes: dealt, founder, realPerson, occasions, stage };
}
export function hookBankReport(brandId: string, args: {
    persona_id?: string | null;
    stage?: string | null;
} = {}): {
    title: string;
    summary: string;
    sections: {
        heading: string;
        lines: string[];
    }[];
    links: {
        label: string;
        href: string;
    }[];
    asks: string[];
} {
    const brand = loadBrandBrain(brandId);
    const bank = loadBank();
    const stage = (Object.keys(AWARENESS_INFO) as AwarenessStage[]).find((s) => s === args.stage) ?? null;
    const who = buyer(brandId, args.persona_id);
    const occasions = occasionsFor("", today());
    const category = `${brand.brand.category} ${brand.brand.one_liner}`;
    const mark = (o: Opener) => `${o.line} (${HOOK_TYPE_LABEL[o.type].toLowerCase()}${o.needs === "real_person" ? "; a real person says it" : o.needs === "real_proof" ? "; needs a number the brand holds" : ""})`;
    const forAds = pickOpeners(bank, { stage, occasions, category, n: 8 });
    const forPeople = pickOpeners(bank, { stage, occasions, category, realPerson: true, withProof: true, n: 40 }).filter((o) => o.needs && o.type !== "founder").slice(0, 6);
    const callouts = calloutsFor(who);
    return {
        title: who ? `Hooks for ${who.name}` : "The hook bank",
        summary: `${bank.length} openers, each a shape to say in the buyer's own words. ${stage ? `Picked for a buyer who is ${AWARENESS_INFO[stage].label.toLowerCase()}.` : "Name a stage to narrow them."}${occasions.includes("gifting") ? " Gift lines are in: it is a gifting season." : ""} A line is never filled with a fact the ad does not state.`,
        sections: [
            ...(callouts.length ? [{ heading: "Who to name in the first 3 seconds", lines: callouts.map((c) => `${c.label}: ${c.from}`) }] : []),
            { heading: "Shapes for an ad", lines: forAds.map(mark) },
            ...(forPeople.length ? [{ heading: "Only for a real person, or with real proof", lines: forPeople.map(mark) }] : []),
            { heading: "The 5 founder hooks (a real founder films them)", lines: FOUNDER_HOOKS.map((h) => `${h.label}, ${founderHookSeconds(h)} s: "${h.formula}" ${h.when}`) },
            { heading: "Filming", lines: [...FOUNDER_FILMING] },
        ],
        links: [{ label: "Open Scripts", href: "/scripts" }],
        asks: who ? [] : ["Tag a persona to see who to name in the first 3 seconds."],
    };
}
