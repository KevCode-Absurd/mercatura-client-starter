import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AskIntent, ScriptAxes } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { formatById } from "../catalogue";
import { conceptFromRequest } from "../chat/make";
import { enqueue } from "../jobs/queue";
import { llmEnabled } from "../llm/gateway";
import { pickPlans } from "../scripts/axes";
import { recentAxes } from "../scripts/hand";
import { scriptFields } from "../taste/apply";
import { decide } from "../taste/decisions";
import { compactTaste } from "../taste/schema";
import type { ContextPlan, Taste } from "../taste/types";
import { AWARENESS_INFO } from "../taxonomy";
import { ARGUES, coverageFormat, type ScriptBrief } from "./model";
export const MAX_BRIEFS = 24;
export interface Started {
    concepts: number;
    scripts: number;
    said: string;
}
export interface StartOptions {
    produce?: boolean;
    claimChecks?: boolean;
    hooks?: number;
    taste?: Taste;
}
export function briefTaste(b: Pick<ScriptBrief, "source" | "part">, moved: Taste | null | undefined = {}): Taste {
    const keepsBody = b.source === "winner" || (b.source === "fix" && b.part === "opening");
    return compactTaste({ ...(keepsBody ? { spread: "openings" as const } : {}), ...compactTaste(moved) });
}
export const briefPlan = (b: Pick<ScriptBrief, "source" | "part" | "awareness">, referenceId: string | null, moved?: Taste | null): ContextPlan => decide({ surface: "script", stage: b.awareness, hasReference: !!referenceId }, briefTaste(b, moved));
export function winnerReference(brandId: string, b: Pick<ScriptBrief, "source" | "from_ad">): string | null {
    if (b.source === "gap" || !b.from_ad)
        return null;
    const row = db.select({ id: schema.adReferences.id, analyzed: schema.adReferences.analyzed, by: schema.adReferences.added_by_brand }).from(schema.adReferences).where(eq(schema.adReferences.id, b.from_ad)).get();
    return row && row.analyzed && (!row.by || row.by === brandId) ? row.id : null;
}
const conceptKey = (b: ScriptBrief) => [b.source, b.part ?? "", b.from_ad ?? "", b.persona_id, b.awareness, b.sophistication, b.offer_id ?? ""].join("|");
function angleOf(b: ScriptBrief): string {
    if (b.source === "fix") {
        const opens = b.hook ? ` It opens "${b.hook}".` : "";
        return b.part === "opening"
            ? [b.angle, `An ad with this argument is running.${opens} People who start watching it stay, and too few start.`, "Keep the argument and the body. Open it a different way: a different first line, first picture and way in."].filter(Boolean).join(" ")
            : [b.angle, `An ad with this argument is running.${opens} That opening stops people, and they leave before the end.`, "Keep the idea of that opening. Rebuild what follows it so every line earns the next, and the product arrives without a jolt."].filter(Boolean).join(" ");
    }
    if (b.source !== "winner")
        return b.angle;
    return [b.angle, b.hook ? `This argument is working in an ad that opens "${b.hook}".` : "This argument is working in an ad that is running.", "Keep the argument and write a new ad from it."].filter(Boolean).join(" ");
}
export function startBriefs(brandId: string, briefs: ScriptBrief[], opts: StartOptions = {}): Started {
    if (!briefs.length)
        throw new Error("Tick at least 1 script.");
    if (briefs.length > MAX_BRIEFS)
        throw new Error(`At most ${MAX_BRIEFS} scripts at a time.`);
    const brand = loadBrandBrain(brandId);
    for (const b of briefs) {
        if (!brand.personas.some((p) => p.id === b.persona_id))
            throw new Error("A script is planned for a buyer who is no longer in use. Open the screen again.");
        const f = coverageFormat(b.format);
        if (!f?.write || formatById(f.write)?.start.how !== "script")
            throw new Error(`A script can't be written for "${b.format}".`);
    }
    const n = briefs.length;
    if (!llmEnabled())
        return { concepts: 0, scripts: 0, said: `Mock mode: ${n === 1 ? "1 script is" : `${n} scripts are`} planned and none is written. Writing a script needs live mode.` };
    return queueBriefs(brandId, briefs, opts);
}
export function queueBriefs(brandId: string, briefs: ScriptBrief[], opts: StartOptions = {}): Started {
    const brand = loadBrandBrain(brandId);
    const concepts = new Map<string, {
        id: string;
    }>();
    const usedAt = new Map<string, ScriptAxes[]>();
    let scripts = 0;
    for (const b of briefs) {
        const persona = brand.personas.find((p) => p.id === b.persona_id)!;
        const format = coverageFormat(b.format)!;
        const start = formatById(format.write!)!.start;
        if (start.how !== "script")
            continue;
        const referenceId = winnerReference(brandId, b);
        const plan0 = briefPlan(b, referenceId, opts.taste);
        const taste = briefTaste(b, opts.taste);
        const bridge = scriptFields({ ...taste, look: plan0.taste.look }, !!referenceId);
        const mode = bridge.mode ?? "principles";
        let concept = concepts.get(conceptKey(b));
        if (!concept) {
            const title = b.source === "fix" ? `${b.part === "opening" ? "New openings" : "A new body"}: ${persona.name}, ${AWARENESS_INFO[b.awareness].label.toLowerCase()}` : b.source === "winner" ? `More of what works: ${persona.name}, ${AWARENESS_INFO[b.awareness].label.toLowerCase()}` : `${persona.name}: ${AWARENESS_INFO[b.awareness].label.toLowerCase()}, ${ARGUES[b.sophistication]?.label.toLowerCase() ?? `stage ${b.sophistication}`}`;
            const intent: AskIntent = { kind: "scripts", count: 1, product_id: null, persona_ids: [b.persona_id], offer_id: b.offer_id, concept_id: null, reference_id: referenceId, reference_mode: referenceId ? mode : null, length: b.length, aspects: [], audience: "", brief: angleOf(b), title };
            const id = conceptFromRequest(brandId, intent, { stage: b.awareness, sophistication: b.sophistication });
            concept = { id };
            concepts.set(conceptKey(b), concept);
        }
        const used = usedAt.get(b.awareness) ?? usedAt.set(b.awareness, recentAxes(brandId, b.awareness)).get(b.awareness)!;
        const plan = pickPlans(1, b.length, used, { stage: b.awareness })[0];
        if (!plan)
            continue;
        used.push(plan);
        const axes: ScriptAxes = { ...plan, ...(typeof opts.claimChecks === "boolean" ? { claim_checks: opts.claimChecks } : {}), ...(opts.hooks && opts.hooks > 1 ? { hooks: Math.min(5, Math.round(opts.hooks)) } : {}), ...(taste.look ? { variety: bridge.variety } : {}), ...(Object.keys(taste).length ? { taste } : {}) };
        enqueue(brandId, "script", concept.id, { axes, turn: scripts, format: start.type, ...(referenceId ? { referenceId, referenceMode: mode } : {}), ...(opts.produce ? { then: { type: start.type, recipe: start.recipe, ...(Object.keys(taste).length ? { taste } : {}) } } : {}) });
        scripts++;
    }
    if (!scripts)
        throw new Error("No script could be planned for those lengths.");
    return { concepts: concepts.size, scripts, said: `${scripts === 1 ? "1 script is" : `${scripts} scripts are`} being written. ${opts.produce ? "Each one's job appears on the Production board with its plan to approve." : "They appear on the Scripts screen as they finish."}` };
}
