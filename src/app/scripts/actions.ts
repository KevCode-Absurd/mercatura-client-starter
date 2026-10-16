"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem, HookVariant, ScriptAxes, ScriptLine, ScriptVersionRow } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { noteChoice, noteFields, noteHandEdits, scriptLineEdits } from "@/lib/hand-edits";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { EMOTIONS, NATIVE_ARCS, NATIVE_FORMS, NATIVE_IMAGES, NATIVE_LENGTHS, NATIVE_NARRATORS, SCRIPT_TYPES } from "@/lib/script-types";
import { pickAxes, pickNativePlans, pickPlans } from "@/lib/scripts/axes";
import { INDIRECT_FORM, indirectOptions } from "@/lib/scripts/indirect";
import { SCRIPT_MODELS } from "@/lib/reference-modes";
import { editHook, removeHook, useHookAsMain, writeHooks } from "@/lib/scripts/hooks";
import { clampHooks } from "@/lib/scripts/versions";
import { scriptFields } from "@/lib/taste/apply";
import { compactTaste, parseTaste, tasteSchema } from "@/lib/taste/schema";
import { applyVoiceSuggestions, keepAsHookVariant, reauditScript, saveScriptEdit, scriptVersions } from "@/lib/scripts/engine";
import { checkSurfaces } from "@/lib/scripts/surfaces";
import { BEATS, ENTRIES, LENGTH_PRESETS, OUTPUT_TYPES, REGISTERS, STORY_SHAPES } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
import { humanCheckOverride } from "@/lib/check-review";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: errorText(e) });
function revalidate(id?: string) {
    if (id)
        revalidatePath(`/scripts/${id}`);
    revalidatePath("/scripts");
    revalidatePath("/concepts");
    revalidatePath("/");
}
async function ownScript(id: string) {
    const brandId = await activeBrandId();
    const script = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, id), eq(schema.scripts.brand_id, brandId))).get();
    if (!script)
        throw new Error("Script not found");
    return script;
}
export async function setScriptStatusAction(id: string, status: "draft" | "approved" | "ready_for_handoff") {
    const script = await ownScript(id);
    const choice = z.enum(["draft", "approved", "ready_for_handoff"]).parse(status);
    const override = choice !== "draft" ? humanCheckOverride("script", script.audit) : undefined;
    const axes = override ? { ...script.axes, check_overrides: [...(script.axes.check_overrides ?? []), override] } : script.axes;
    db.update(schema.scripts).set({ status: choice, axes, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, id)).run();
    revalidate(id);
}
const AxesInput = z.object({
    length: z.enum(LENGTH_PRESETS),
    length_chosen: z.boolean().optional(),
    person: z.enum(["first", "second", "third"]),
    tense: z.enum(["past", "present", "future"]),
    entry: z.enum(ENTRIES),
    story_shape: z.enum(STORY_SHAPES),
    register: z.enum(REGISTERS),
    hook_type: z.string().optional(),
    script_type: z.string().optional(),
    emotion: z.string().optional(),
    emotion_end: z.string().optional(),
    native: z.object({ arc: z.string(), image: z.string(), narrator: z.string(), form: z.string().optional(), length: z.string().optional() }).optional(),
    claim_checks: z.boolean().optional(),
    asked: z.string().max(600).optional(),
    hooks: z.number().int().min(1).max(5).optional(),
});
const EMOTION_IDS = EMOTIONS.map((e) => e.id) as [
    string,
    ...string[]
];
const GenerateInput = z.object({
    conceptId: z.string().min(1),
    scriptTypes: z.array(z.enum(SCRIPT_TYPES.map((t) => t.id) as [
        string,
        ...string[]
    ])).optional(),
    emotion: z.enum(["mix", ...EMOTION_IDS]).optional(),
    emotionEnd: z.enum(EMOTION_IDS).optional(),
    format: z.enum(OUTPUT_TYPES).optional(),
    native: z
        .object({
        arcs: z.array(z.enum(NATIVE_ARCS.map((a) => a.id) as [
            string,
            ...string[]
        ])).optional(),
        images: z.array(z.enum(NATIVE_IMAGES.map((a) => a.id) as [
            string,
            ...string[]
        ])).optional(),
        narrator: z.enum(NATIVE_NARRATORS.map((a) => a.id) as [
            string,
            ...string[]
        ]).optional(),
        forms: z.array(z.enum(NATIVE_FORMS.map((a) => a.id) as [
            string,
            ...string[]
        ])).optional(),
        length: z.enum(NATIVE_LENGTHS.map((a) => a.id) as [
            string,
            ...string[]
        ]).optional(),
    })
        .optional(),
    count: z.number().int().min(1).max(20),
    length: z.enum(LENGTH_PRESETS),
    lengthChosen: z.boolean().optional(),
    axes: AxesInput.optional(),
    themeIds: z.array(z.string()).optional(),
    referenceId: z.string().optional(),
    referenceMode: z.enum(["exact", "structure", "principles"]).optional(),
    model: z.enum(SCRIPT_MODELS.map((m) => m.id) as [
        string,
        ...string[]
    ]).optional(),
    claimChecks: z.boolean().optional(),
    hooks: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
});
function conceptPain(concept: {
    name: string;
    angle: string;
    theme_ids: string[];
}): string {
    const names = concept.theme_ids.length ? db.select({ label: schema.themes.label }).from(schema.themes).where(inArray(schema.themes.id, concept.theme_ids)).all().map((t) => t.label) : [];
    return [concept.angle, concept.name, ...names].join(". ");
}
export async function generateScriptsAction(input: z.infer<typeof GenerateInput>): Promise<Result<{
    queued: number;
}>> {
    try {
        const parsed = GenerateInput.parse(input);
        const taste = compactTaste(parsed.taste);
        const bridge = scriptFields(taste, !!parsed.referenceId, parsed.referenceMode === "exact");
        const p = { ...parsed, referenceMode: parsed.referenceMode === "exact" ? parsed.referenceMode : (bridge.mode ?? parsed.referenceMode) };
        if (!llmEnabled())
            return { ok: false, error: "Script generation needs live mode (LLM_MODE=live and an API key in .env)." };
        const brandId = await activeBrandId();
        const all = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
        const concepts = p.conceptId === "all" ? all : all.filter((c) => c.id === p.conceptId);
        if (!concepts.length)
            return { ok: false, error: "Concept not found" };
        const fixed = !!p.referenceId && (p.referenceMode ?? "structure") !== "principles";
        const count = p.referenceId && p.referenceMode === "exact" ? 1 : p.count;
        let queued = 0;
        for (const concept of concepts) {
            const used = db.select({ axes: schema.scripts.axes }).from(schema.scripts).where(eq(schema.scripts.concept_id, concept.id)).all().map((s) => s.axes);
            const nativeOpts = p.native?.forms?.length === 1 && p.native.forms[0] === INDIRECT_FORM ? indirectOptions(conceptPain(concept), p.native) : p.native;
            const plan = (n: number, taken: ScriptAxes[]) => (nativeOpts && !p.referenceId ? pickNativePlans(n, taken, nativeOpts) : fixed ? pickAxes(n, p.length, taken) : pickPlans(n, p.length, taken, { types: p.scriptTypes, stage: concept.awareness_stage, emotion: p.emotion, emotionEnd: p.emotionEnd }));
            const picks: ScriptAxes[] = p.axes ? [p.axes as ScriptAxes, ...plan(count - 1, [...used, p.axes as ScriptAxes])] : plan(count, used);
            picks.forEach((picked, turn) => {
                const hooks = clampHooks(p.hooks ?? picked.hooks);
                const axes: ScriptAxes = { ...picked, ...(p.lengthChosen && !picked.native ? { length_chosen: true } : {}), ...(bridge.variety ? { variety: bridge.variety } : {}), ...(Object.keys(taste).length ? { taste } : {}), ...(p.claimChecks ? { claim_checks: true } : {}), ...(hooks > 1 && !(p.referenceId && p.referenceMode === "exact") ? { hooks } : { hooks: undefined }) };
                enqueue(brandId, "script", concept.id, { axes, themeIds: p.conceptId === "all" ? undefined : p.themeIds, turn, referenceId: p.referenceId, referenceMode: p.referenceId ? p.referenceMode : undefined, model: p.model, format: p.format });
            });
            queued += picks.length;
        }
        if (queued > 60)
            return { ok: false, error: `That would write ${queued} scripts in one go. Keep a batch to 60 or fewer.` };
        return { ok: true, queued };
    }
    catch (e) {
        return fail(e);
    }
}
const LineInput = z.object({
    beat: z.enum(BEATS),
    text: z.string(),
    theme_ids: z.array(z.string()),
    claim_ids: z.array(z.string()),
    visual_note: z.string().optional(),
    on_screen: z.string().optional(),
});
export async function saveScriptAction(id: string, edit: {
    title?: string;
    lines: ScriptLine[];
    hook_variants?: HookVariant[];
}): Promise<Result<{
    version: number;
    audit: AuditItem[];
    asks: number;
    found: string[];
}>> {
    try {
        const before = await ownScript(id);
        const lines = z.array(LineInput).min(1).parse(edit.lines) as ScriptLine[];
        const saved = await saveScriptEdit(id, { title: edit.title, lines, hook_variants: edit.hook_variants });
        const asks = await noteHandEdits(before.brand_id, id, scriptLineEdits(before.lines, saved.lines));
        noteFields(before.brand_id, id, "hook", before.hook_variants.slice(1), saved.hook_variants);
        revalidate(id);
        return { ok: true, version: saved.version, audit: saved.audit, asks: asks.length, found: (saved.voice_check?.checks ?? []).filter((c) => !c.ok).map((c) => c.label) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function rebuildScriptAction(id: string, model: string): Promise<Result> {
    try {
        const script = await ownScript(id);
        if (!llmEnabled())
            return { ok: false, error: "Script generation needs live mode (LLM_MODE=live and an API key in .env)." };
        if (!SCRIPT_MODELS.some((m) => m.id === model))
            return { ok: false, error: "Unknown model" };
        if (script.reference_mode === "exact")
            return { ok: false, error: "This script is a copy of its reference ad, so no model wrote it. Use Keep the structure to get a written version." };
        enqueue(script.brand_id, "script", script.concept_id, { axes: script.axes, themeIds: script.theme_ids, turn: 0, referenceId: script.reference_mode ? script.reference_ids[0] : undefined, referenceMode: script.reference_mode ?? undefined, model, altOf: script.alt_of ?? script.id, format: script.format_target ?? undefined });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const VoiceTarget = z.object({ person: z.enum(["first", "second", "third"]), tense: z.enum(["past", "present", "future"]) });
export async function transposeScriptAction(id: string, voices: z.infer<typeof VoiceTarget>[], model?: string): Promise<Result<{
    queued: number;
}>> {
    try {
        const script = await ownScript(id);
        if (!llmEnabled())
            return { ok: false, error: "Converting a script needs live mode (LLM_MODE=live and an API key in .env)." };
        const targets = z.array(VoiceTarget).min(1).max(8).parse(voices).filter((v) => !(v.person === script.axes.person && v.tense === script.axes.tense));
        if (!targets.length)
            return { ok: false, error: "Pick a person and tense different from the script's own." };
        if (model && !SCRIPT_MODELS.some((m) => m.id === model))
            return { ok: false, error: "Unknown model" };
        for (const v of targets)
            enqueue(script.brand_id, "script", script.concept_id, { axes: script.axes, transposeOf: script.id, person: v.person, tense: v.tense, model });
        return { ok: true, queued: targets.length };
    }
    catch (e) {
        return fail(e);
    }
}
export async function applyVoiceAction(id: string): Promise<Result<{
    version: number;
}>> {
    try {
        await ownScript(id);
        const saved = await applyVoiceSuggestions(id);
        revalidate(id);
        return { ok: true, version: saved.version };
    }
    catch (e) {
        return fail(e);
    }
}
export async function reauditScriptAction(id: string, claimChecks = false): Promise<Result<{
    audit: AuditItem[];
}>> {
    try {
        await ownScript(id);
        const audit = await reauditScript(id, { claimChecks });
        revalidate(id);
        return { ok: true, audit };
    }
    catch (e) {
        return fail(e);
    }
}
export async function keepAsHookVariantAction(id: string, ofScriptId: string | null): Promise<Result> {
    try {
        await ownScript(id);
        keepAsHookVariant(id, ofScriptId);
        revalidate(id);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function scriptVersionsAction(id: string): Promise<Result<{
    versions: ScriptVersionRow[];
}>> {
    try {
        await ownScript(id);
        return { ok: true, versions: scriptVersions(id) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteScriptAction(id: string): Promise<Result> {
    try {
        await ownScript(id);
        const inUse = db.select({ id: schema.outputJobs.id }).from(schema.outputJobs).where(eq(schema.outputJobs.script_id, id)).get();
        if (inUse)
            return { ok: false, error: "This script has production jobs. Remove those first." };
        db.delete(schema.scriptVersions).where(eq(schema.scriptVersions.script_id, id)).run();
        db.delete(schema.scripts).where(eq(schema.scripts.id, id)).run();
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function checkSurfacesAction(id: string): Promise<Result> {
    try {
        await ownScript(id);
        await checkSurfaces(id);
        revalidate(id);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function writeMoreHooksAction(id: string, more: number, tasteIn?: unknown): Promise<Result<{
    written: number;
    total: number;
    refused: string[];
}>> {
    try {
        if (!llmEnabled())
            return { ok: false, error: "Writing hooks needs live mode (LLM_MODE=live and an API key in .env)." };
        const script = await ownScript(id);
        const taste = parseTaste(tasteIn);
        const variety = scriptFields(taste, false).variety;
        const res = await writeHooks(script.id, clampHooks(more), { bump: true, ...(variety ? { variety } : {}), taste: compactTaste(taste) });
        revalidate(id);
        revalidatePath("/builder");
        return { ok: true, ...res };
    }
    catch (e) {
        return fail(e);
    }
}
export async function editHookAction(id: string, hookId: string, text: string): Promise<Result> {
    try {
        const script = await ownScript(id);
        const before = script.hook_variants.find((h) => h.id === hookId)?.text ?? "";
        editHook(script.id, hookId, { text: text.slice(0, 600) });
        await noteHandEdits(script.brand_id, script.id, [{ surface: "hook", line: 0, before, after: text.trim() }]).catch(() => undefined);
        revalidate(id);
        revalidatePath("/builder");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function removeHookAction(id: string, hookId: string): Promise<Result> {
    try {
        const script = await ownScript(id);
        removeHook(script.id, hookId);
        revalidate(id);
        revalidatePath("/builder");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function useHookAsMainAction(id: string, hookId: string): Promise<Result> {
    try {
        const script = await ownScript(id);
        useHookAsMain(script.id, hookId);
        noteChoice(script.brand_id, script.id, "hook_choice", script.lines[0]?.text, script.hook_variants.find((h) => h.id === hookId)?.text);
        revalidate(id);
        revalidatePath("/builder");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
