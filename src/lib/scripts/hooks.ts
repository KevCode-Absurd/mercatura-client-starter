import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem, HookVariant, ScriptLine, ScriptRow } from "@/db/schema";
import { brandVoiceText } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { listOfferFits } from "../builder/store";
import { env } from "../env";
import { lessonsFor } from "../lessons";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { getPersona } from "../personas/store";
import { bankBlock } from "../hooks/bank";
import { bankForScript } from "../hooks/for-script";
import { renderPrompt } from "../prompts";
import { readSeconds } from "../script-metrics";
import { getSetting } from "../settings";
import { AWARENESS_INFO } from "../taxonomy";
import { clampVariety, varietyNote, varietyTemperature } from "../variety";
import { termsBlock } from "./fact-rules";
import { tasteBlock } from "../taste/apply";
import type { Taste } from "../taste/types";
import { HOW_CUSTOMERS_TALK, adviceBlock, briefFromNotes, customerWords, offerSaidAt, tellingFromNotes, wordsPlan } from "./flow";
import { termsRule } from "../copy/stage";
import { floorText } from "../copy/words-read";
import { readingGradeOf } from "./voice-rules";
import { checkHandoffs, handoffAudit, type HandoffRow } from "./hook-handoff";
import { speakerOfScript } from "./pace";
import { MAX_HOOKS, acceptHooks, makeMain, versionsOf } from "./versions";
import { buyerOf } from "../choices";
const HooksOut = z.object({
    leans_on: z.array(z.string()).default([]),
    own_image: z.string().default(""),
    hooks: z
        .array(z.object({ way: z.string().default(""), image: z.string().default(""), text: z.string(), overlay: z.string().default(""), first_frame: z.string().default(""), replaces: z.number().int().default(1), then: z.string().default(""), bridge_line: z.number().int().default(0), bridge_text: z.string().default("") }))
        .max(8),
});
const NEUTRAL = { clarity: 3, relevance: 3, novelty: 3, specificity: 3, credibility: 3 };
export function keptHooks(script: Pick<ScriptRow, "lines" | "hook_variants">): HookVariant[] {
    const first = script.lines[0];
    const own: HookVariant = { ...(script.hook_variants[0] ?? { id: "hk_1", type: "opening", grades: NEUTRAL }), text: first?.text ?? "", overlay: first?.on_screen ?? script.hook_variants[0]?.overlay ?? "" };
    return [own, ...script.hook_variants.slice(1).filter((h) => h.whole && h.text.trim())];
}
export function hookBrief(script: ScriptRow): {
    brief: string;
    brandName: string;
} {
    const brand = loadBrandBrain(script.brand_id);
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    const persona = concept ? buyerOf(brand, concept.persona_id) : undefined;
    const profile = concept ? getPersona(script.brand_id, concept.persona_id) : undefined;
    const phrases = customerWords(persona?.language ?? []).phrases;
    const told = tellingFromNotes(script.notes);
    const fit = concept ? listOfferFits(script.brand_id).find((f) => f.offer_id === concept.offer_id) : undefined;
    const terms = concept ? termsBlock(brand, concept.offer_id).split("\n").filter((l) => l.startsWith("- ")) : [];
    const brief = [
        persona ? `Who it is for: ${persona.name}. ${persona.summary}` : "",
        profile?.identity ? `How they see themselves: ${profile.identity}` : "",
        persona ? `What they live with (the before): ${persona.problem}` : "",
        persona?.wants ? `Where they want to be (the after): ${persona.wants}` : "",
        persona?.trigger ? `What makes them buy now: ${persona.trigger}` : "",
        phrases.length ? `${HOW_CUSTOMERS_TALK} ${phrases.map((l) => `"${l}"`).join(", ")}` : "",
        concept ? `The idea of the ad: ${concept.angle}` : "",
        `Where they are: ${AWARENESS_INFO[script.awareness_stage].label}. Who speaks: ${script.axes.person} person, ${script.axes.tense} tense.`,
        told ? `How it is told: ${told}` : "",
        briefFromNotes(script.notes),
        profile?.tried?.length ? `What they tried before (the only products a hook may name): ${profile.tried.join("; ")}` : "What they tried before: nothing is recorded. A hook may picture what they tried, and names no product or brand and gives no price or figure.",
        profile?.notes ? `Also known about them: ${profile.notes}` : "",
        offerSaidAt(script.awareness_stage, !!script.axes.no_offer) === "full" && terms.length ? `The offer's facts, for accuracy only. A hook states none the ad does not:\n${terms.join("\n")}` : "A hook states no price and no term of the deal.",
    ]
        .filter(Boolean)
        .join("\n");
    return { brief, brandName: brand.brand.name };
}
export interface HooksWritten {
    written: number;
    total: number;
    refused: string[];
    handoff: HandoffRow[];
}
export function storeHooks(script: ScriptRow, next: {
    hook_variants: HookVariant[];
    lines?: ScriptLine[];
    audit?: AuditItem[];
}, bump: boolean): void {
    const lines = next.lines ?? script.lines;
    const audit = next.audit ?? script.audit;
    const est_seconds = next.lines && script.reference_mode !== "exact" ? readSeconds(lines, speakerOfScript(script)) : script.est_seconds;
    const snap = { title: script.title, lines, hook_variants: next.hook_variants, audit, est_seconds };
    if (bump) {
        const version = script.version + 1;
        db.update(schema.scripts).set({ lines, hook_variants: next.hook_variants, audit, est_seconds, version, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, script.id)).run();
        db.insert(schema.scriptVersions).values({ id: `sv_${Math.random().toString(16).slice(2, 14)}`, brand_id: script.brand_id, script_id: script.id, version, source: "edit", snapshot: snap }).run();
        return;
    }
    db.update(schema.scripts).set({ lines, hook_variants: next.hook_variants, audit, est_seconds, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, script.id)).run();
    const last = db.select().from(schema.scriptVersions).where(eq(schema.scriptVersions.script_id, script.id)).orderBy(desc(schema.scriptVersions.version)).limit(1).get();
    if (last)
        db.update(schema.scriptVersions).set({ snapshot: { ...last.snapshot, hook_variants: next.hook_variants } }).where(eq(schema.scriptVersions.id, last.id)).run();
}
export async function writeHooks(scriptId: string, more: number, opts: {
    bump?: boolean;
    variety?: number;
    taste?: Taste | null;
} = {}): Promise<HooksWritten> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error(`Script ${scriptId} not found`);
    if (!llmEnabled())
        throw new Error("Writing hooks needs live mode.");
    if (script.lines.length < 2)
        throw new Error("This script is 1 line: there is no body for another hook to lead into.");
    const kept = keptHooks(script);
    const want = Math.min(Math.max(0, Math.round(more) || 0), MAX_HOOKS - kept.length);
    if (want < 1)
        throw new Error(`This script already has ${kept.length} hooks. ${MAX_HOOKS} is the most 1 script keeps.`);
    const { brief: own, brandName } = hookBrief(script);
    const brief = [own, bankBlock(bankForScript(script))].filter(Boolean).join("\n\n");
    const brand = loadBrandBrain(script.brand_id);
    const variety = clampVariety(opts.variety ?? script.axes.variety);
    const plan = wordsPlan("hooks", { stage: script.awareness_stage, format: script.format_target, taste: { ...(script.axes.taste ?? {}), ...(opts.taste ?? {}) }, variety: opts.variety ?? script.axes.variety });
    const sameWay = plan.text.hookAnchor === "device" && plan.taste.hooks === "device" && !!(opts.taste?.hooks || script.axes.taste?.hooks);
    const anchor = plan.taste.length === "short" ? "Each opening is 10 words or fewer." : "";
    const voice = getSetting(script.brand_id, "voice");
    const ask = (count: number, have: string[], note = "") => {
        const p = renderPrompt("script-hooks", {
            floor: floorText(),
            grade: String(readingGradeOf(voice)),
            terms: termsRule(script.awareness_stage, voice.terms),
            brand_name: brandName,
            count: String(count),
            plural: count === 1 ? "" : "s",
            brief,
            ways: renderPrompt(sameWay ? "script-hooks-same" : "script-hooks-different", {}).system,
            variety: [`**How far to go.** ${varietyNote(variety)} At every setting each opening reads aloud, makes sense and hands off to the same body.${anchor ? ` ${anchor}` : ""}`, tasteBlock(plan)].filter(Boolean).join("\n\n"),
            brand_voice: brandVoiceText(script.brand_id, { surfaces: [], brand, story: true }),
            lessons: adviceBlock(lessonsFor(script.brand_id, { area: "words" }).filter((l) => l.category !== "product_use")),
            have: have.map((h, i) => `${i + 1}. ${h}`).join("\n") + note,
            script: script.lines.map((l, i) => `${i + 1} | ${l.text}`).join("\n"),
        });
        return structuredJson({ brandId: script.brand_id, task: "script_hooks", model: env.MODEL_SCRIPT, system: p.system, user: p.user, schema: HooksOut, effort: "low", maxTokens: 6000, temperature: plan.temperature, refType: "script", refId: scriptId });
    };
    const out = await ask(want, kept.map((h) => h.text));
    const taken = acceptHooks(script.lines, kept, out.hooks, want, out.own_image, script.axes.person, { sameWay });
    const missing = want - taken.hooks.length;
    if (missing > 0 && taken.sameWay > 0) {
        try {
            const note = "\n\nRefused a moment ago. Do not write these again, or anything that opens on " + (sameWay ? "" : "the same picture or ") + "the same first words, or in another speaker than the ad:\n" + taken.refused.map((r) => "- " + r).join("\n");
            const again = await ask(missing, [...kept, ...taken.hooks].map((h) => h.text), note);
            const second = acceptHooks(script.lines, [...kept, ...taken.hooks], again.hooks, missing, out.own_image || again.own_image, script.axes.person, { sameWay });
            taken.hooks.push(...second.hooks);
            if (second.hooks.length >= missing)
                taken.refused = [];
            else
                taken.refused.push(...second.refused);
        }
        catch {
        }
    }
    if (!taken.hooks.length)
        throw new Error(`No hook that came back could be kept. ${taken.refused[0] ?? ""}`.trim());
    let hooks = taken.hooks;
    let handoff: HandoffRow[] = [];
    let handoffNote: AuditItem | null = null;
    try {
        const read = await checkHandoffs({ brandId: script.brand_id, brandName, refId: scriptId, speaker: [`${script.axes.person} person, ${script.axes.tense} tense.`, tellingFromNotes(script.notes)].filter(Boolean).join(" "), lines: script.lines, hooks, others: [script.lines[0]?.text ?? "", ...kept.map((h) => h.text)].filter(Boolean) });
        hooks = read.hooks;
        handoff = read.rows;
        handoffNote = handoffAudit(handoff, hooks, kept.length + 1);
    }
    catch (e) {
        handoffNote = { check: "hook_handoff", status: "warn", message: `The hand-off of the new hooks was not checked: ${(e as Error).message.slice(0, 140)}` };
    }
    try {
        const { gradeHooks } = await import("./engine");
        const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
        if (concept) {
            const grades = await gradeHooks(script.brand_id, brand, concept, hooks, script.lines[1]?.text ?? "", scriptId);
            hooks = hooks.map((h, i) => ({ ...h, grades: grades[i] ?? h.grades }));
        }
    }
    catch {
    }
    const hook_variants = [...kept, ...hooks];
    const short = hooks.length < want;
    const audit: AuditItem[] = [
        ...script.audit.filter((a) => a.check !== "hooks" && a.check !== "hook_handoff"),
        ...(handoffNote ? [handoffNote] : []),
        ...(short ? [{ check: "hooks", status: "warn" as const, message: `${want} more hooks were asked for and ${hooks.length} ${hooks.length === 1 ? "was" : "were"} kept. ${taken.refused.join(" ")} Write more from the script's page.` }] : []),
    ];
    storeHooks(script, { hook_variants, audit }, !!opts.bump);
    if (script.kit?.primary_text) {
        try {
            const { writeHookTexts } = await import("../builder/kit");
            await writeHookTexts(scriptId);
        }
        catch {
        }
    }
    return { written: hooks.length, total: versionsOf({ lines: script.lines, hook_variants }).length, refused: taken.refused, handoff };
}
export function editHook(scriptId: string, hookId: string, edit: {
    text: string;
    overlay?: string;
}): void {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error("Script not found");
    const text = edit.text.replace(/\s+/g, " ").trim();
    if (!text)
        throw new Error("A hook needs words. To drop it, remove it instead.");
    const at = script.hook_variants.findIndex((h) => h.id === hookId);
    if (at < 1)
        throw new Error("That hook is the script's own first line: change it in the script.");
    const hook_variants = script.hook_variants.map((h, i) => (i === at ? { ...h, text, ...(edit.overlay !== undefined ? { overlay: edit.overlay.trim() } : {}) } : h));
    storeHooks(script, { hook_variants }, true);
}
export function removeHook(scriptId: string, hookId: string): void {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error("Script not found");
    const at = script.hook_variants.findIndex((h) => h.id === hookId);
    if (at < 1)
        throw new Error("That hook is the script's own first line.");
    storeHooks(script, { hook_variants: script.hook_variants.filter((_, i) => i !== at) }, true);
}
export function useHookAsMain(scriptId: string, hookId: string): void {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error("Script not found");
    const at = script.hook_variants.findIndex((h) => h.id === hookId);
    if (at < 1)
        throw new Error("That version is already the main one.");
    const first = script.hook_variants[0];
    const synced = { lines: script.lines, hook_variants: [{ ...first, text: script.lines[0]?.text ?? first.text }, ...script.hook_variants.slice(1)] };
    const next = makeMain(synced, at + 1);
    storeHooks(script, { hook_variants: next.hook_variants, lines: next.lines }, true);
}
