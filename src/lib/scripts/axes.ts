import type { ScriptAxes } from "@/db/schema";
import { EMOTIONS, NATIVE_ARCS, NATIVE_FORMS, NATIVE_IMAGES, SCRIPT_TYPES, typeFitsLength, typeFitsStage } from "../script-types";
import { ENTRIES, REGISTERS, type AwarenessStage, type LengthPreset } from "../taxonomy";
import { INDIRECT_FORM, INDIRECT_IMAGES, INDIRECT_LENGTH, isIndirectOnly } from "./indirect";
export const HOOK_TYPES = [
    "accommodation",
    "moment",
    "failed_solution",
    "curiosity_gap",
    "specific_proof",
    "truth_bomb",
    "confrontation",
    "founder_stakes",
    "contrarian",
    "sensory",
] as const;
export type HookType = (typeof HOOK_TYPES)[number];
export const PERSON_TENSE: Pick<ScriptAxes, "person" | "tense">[] = [
    { person: "second", tense: "present" },
    { person: "first", tense: "past" },
    { person: "third", tense: "past" },
];
export const BEAT_TABLE: Record<LengthPreset, Record<string, string>> = {
    "15s": { hook: "1 line", problem: "1 line", promise: "none (merge into the offer)", mechanism: "none", objection: "none", proof: "none", offer: "short", risk_reversal: "none", cta: "1 line" },
    "30s": { hook: "1 line", problem: "1 line", promise: "1 line", mechanism: "none or 1 sentence", objection: "none", proof: "1 short", offer: "short", risk_reversal: "none", cta: "1 line" },
    "60s": { hook: "1 line", problem: "1 to 2 lines", promise: "1 line", mechanism: "1 to 2 sentences", objection: "1 to 2 sentences", proof: "1 piece", offer: "short", risk_reversal: "1 line", cta: "1 line" },
    "2-3m": { hook: "1 line", problem: "several lines", promise: "1 to 2 sentences", mechanism: "2 to 4 sentences, can be most of the ad", objection: "several", proof: "1 to 3 pieces", offer: "short", risk_reversal: "1 line", cta: "2 to 3 lines" },
    "5-10m": { hook: "1 line", problem: "a scene, looped", promise: "2 sentences", mechanism: "large block, looped", objection: "multiple blocks", proof: "5 to 6 pieces", offer: "short", risk_reversal: "1 line", cta: "several, at intervals" },
    "10m": { hook: "1 line", problem: "a scene, looped", promise: "2 sentences", mechanism: "large block, looped", objection: "multiple blocks", proof: "5 to 6 pieces", offer: "short", risk_reversal: "1 line", cta: "several, at intervals" },
};
function shapesFor(length: LengthPreset, person: ScriptAxes["person"]): string[] {
    if (length === "15s" || length === "30s" || person === "second")
        return ["none"];
    return ["confession", "failed_solutions_journey", "discovery", "transformation_with_witness"];
}
export const axesKey = (a: ScriptAxes) => [a.length, a.person, a.tense, a.entry, a.story_shape, a.register, a.hook_type ?? "", a.script_type ?? "", a.emotion ?? "", a.native ? `${a.native.arc}/${a.native.image}/${a.native.narrator}/${a.native.form ?? ""}/${a.native.length ?? ""}` : ""].join("|");
export function pickAxes(n: number, length: LengthPreset, used: ScriptAxes[] = []): ScriptAxes[] {
    const all: ScriptAxes[] = [];
    for (const pt of PERSON_TENSE) {
        for (const entry of ENTRIES) {
            for (const story_shape of shapesFor(length, pt.person)) {
                for (const register of REGISTERS) {
                    if (register === "diary" && pt.person !== "first")
                        continue;
                    if (register === "documentary" && pt.person === "second")
                        continue;
                    all.push({ length, ...pt, entry, story_shape, register });
                }
            }
        }
    }
    const taken = new Set(used.map((u) => axesKey({ ...u, hook_type: undefined })));
    const pool = all.filter((a) => !taken.has(axesKey(a)));
    const picked: ScriptAxes[] = [];
    const diff = (a: ScriptAxes, b: ScriptAxes) => Number(a.person !== b.person) + Number(a.entry !== b.entry) + Number(a.story_shape !== b.story_shape) + Number(a.register !== b.register);
    const hooksUsed = used.map((u) => u.hook_type).filter(Boolean) as string[];
    while (picked.length < n && pool.length) {
        const others = [...used, ...picked];
        let best = 0;
        let bestScore = -1;
        pool.forEach((c, i) => {
            const score = others.length ? Math.min(...others.map((o) => diff(c, o))) * 10 + others.reduce((s, o) => s + diff(c, o), 0) / others.length : 0;
            if (score > bestScore) {
                bestScore = score;
                best = i;
            }
        });
        const [choice] = pool.splice(best, 1);
        const preferred = choice.entry === "trigger_moment" ? "moment" : choice.entry;
        const hook_type = !hooksUsed.includes(preferred) ? preferred : (HOOK_TYPES.find((h) => !hooksUsed.includes(h) && h !== "founder_stakes" && h !== "sensory") ?? HOOK_TYPES[picked.length % HOOK_TYPES.length]);
        hooksUsed.push(hook_type);
        picked.push({ ...choice, hook_type });
    }
    return picked;
}
export interface PlanOptions {
    types?: string[];
    stage?: AwarenessStage;
    emotion?: string;
    emotionEnd?: string;
}
const NATURAL_END: Record<string, string> = { "fear-of-loss": "relief", frustration: "relief", "matter-of-fact": "pride", relief: "joy", transformation: "pride", joy: "joy", pride: "pride" };
const MIX_ORDER = ["frustration", "transformation", "fear-of-loss", "relief", "matter-of-fact", "joy", "pride"];
const REGISTERS_FOR: Record<ScriptAxes["person"], string[]> = { first: ["ugc", "diary"], second: ["ugc"], third: ["documentary", "ugc"] };
export function pickPlans(n: number, length: LengthPreset, used: ScriptAxes[] = [], opts: PlanOptions = {}): ScriptAxes[] {
    const fits = SCRIPT_TYPES.filter((t) => typeFitsLength(t, length));
    let pool = opts.types?.length ? fits.filter((t) => opts.types!.includes(t.id)) : fits.filter((t) => !opts.stage || typeFitsStage(t, opts.stage));
    if (!pool.length)
        pool = fits.length ? fits : SCRIPT_TYPES.slice(0, 1);
    const count = new Map<string, number>();
    for (const u of used)
        if (u.script_type)
            count.set(u.script_type, (count.get(u.script_type) ?? 0) + 1);
    const taken = new Set(used.map((u) => axesKey({ ...u, emotion: undefined })));
    const feels = EMOTIONS.map((e) => e.id as string);
    let feelTurn = used.filter((u) => u.emotion).length;
    const picked: ScriptAxes[] = [];
    for (let k = 0; k < n; k++) {
        const t = pool.reduce((best, x) => ((count.get(x.id) ?? 0) < (count.get(best.id) ?? 0) ? x : best), pool[0]);
        const turn = count.get(t.id) ?? 0;
        count.set(t.id, turn + 1);
        let axes: ScriptAxes | null = null;
        for (let shift = 0; shift < 12; shift++) {
            const v = turn + shift;
            const voice = t.voices[v % t.voices.length];
            const registers = REGISTERS_FOR[voice.person].filter((r) => (REGISTERS as readonly string[]).includes(r));
            const entry = t.entry ?? ENTRIES[v % ENTRIES.length];
            const candidate: ScriptAxes = { length, ...voice, entry, story_shape: t.story_shape, register: registers[Math.floor(v / t.voices.length) % registers.length], hook_type: t.hook_type ?? (entry === "trigger_moment" ? "moment" : entry), script_type: t.id };
            if (!taken.has(axesKey(candidate)) || shift === 11) {
                axes = candidate;
                break;
            }
        }
        taken.add(axesKey(axes!));
        const lead = opts.emotion === "mix" ? MIX_ORDER[feelTurn++ % MIX_ORDER.length] : opts.emotion && feels.includes(opts.emotion) ? opts.emotion : undefined;
        const end = opts.emotionEnd && feels.includes(opts.emotionEnd) ? opts.emotionEnd : lead ? NATURAL_END[lead] : undefined;
        picked.push({ ...axes!, ...(lead ? { emotion: lead } : {}), ...(end ? { emotion_end: end } : {}) });
    }
    return picked;
}
export interface NativeOptions {
    arcs?: string[];
    images?: string[];
    forms?: string[];
    narrator?: string;
    length?: string;
}
export function pickNativePlans(n: number, used: ScriptAxes[] = [], opts: NativeOptions = {}): ScriptAxes[] {
    const indirect = opts.forms?.length === 1 && opts.forms[0] === INDIRECT_FORM;
    const arcs = NATIVE_ARCS.map((a) => a.id as string).filter((id) => !opts.arcs?.length || opts.arcs.includes(id));
    const known = new Set(NATIVE_IMAGES.map((a) => a.id as string));
    const images = opts.images?.length ? opts.images.filter((id) => known.has(id)) : indirect ? [...INDIRECT_IMAGES] : NATIVE_IMAGES.map((a) => a.id as string).filter((id) => !isIndirectOnly(id));
    const narrator = opts.narrator ?? (indirect ? "observer" : "customer");
    const asked = opts.length ?? (indirect ? INDIRECT_LENGTH : "standard");
    const length = indirect && !(NATIVE_FORMS.find((f) => f.id === INDIRECT_FORM)!.lengths as readonly string[]).includes(asked) ? INDIRECT_LENGTH : asked;
    const fits = NATIVE_FORMS.filter((f) => (f.lengths as readonly string[]).includes(length));
    const usual = fits.filter((f) => f.id !== "expert-voice" && f.id !== INDIRECT_FORM);
    const chosen = opts.forms?.length ? fits.filter((f) => opts.forms!.includes(f.id)) : narrator === "expert" ? fits.filter((f) => f.id === "expert-voice") : usual;
    const forms = (chosen.length ? chosen : usual).map((f) => f.id as string);
    const count = (key: "arc" | "image" | "form") => {
        const m = new Map<string, number>();
        for (const u of used)
            if (u.native?.[key])
                m.set(u.native[key]!, (m.get(u.native[key]!) ?? 0) + 1);
        return m;
    };
    const arcCount = count("arc");
    const imageCount = count("image");
    const formCount = count("form");
    const least = (pool: string[], counts: Map<string, number>) => pool.reduce((best, x) => ((counts.get(x) ?? 0) < (counts.get(best) ?? 0) ? x : best), pool[0]);
    const picked: ScriptAxes[] = [];
    for (let k = 0; k < n; k++) {
        const arc = least(arcs.length ? arcs : [NATIVE_ARCS[0].id], arcCount);
        const image = least(images.length ? images : [NATIVE_IMAGES[0].id], imageCount);
        arcCount.set(arc, (arcCount.get(arc) ?? 0) + 1);
        imageCount.set(image, (imageCount.get(image) ?? 0) + 1);
        const form = least(forms.length ? forms : ["personal-journey"], formCount);
        formCount.set(form, (formCount.get(form) ?? 0) + 1);
        const first = narrator !== "observer";
        picked.push({ length: "5-10m", person: first ? "first" : "third", tense: "past", entry: arc === "the-searcher" ? "accommodation" : "failed_solution", story_shape: "failed_solutions_journey", register: first ? "diary" : "documentary", hook_type: form === INDIRECT_FORM ? "curiosity_gap" : "accommodation", native: { arc, image, narrator, form, length }, ...(form === INDIRECT_FORM ? { no_offer: true } : {}) });
    }
    return picked;
}
