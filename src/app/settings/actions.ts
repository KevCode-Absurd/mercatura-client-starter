"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { SHARED_BRAND } from "@/lib/env";
import { MODELS, PROVIDER_KEY, familyInfo, resolveModel } from "@/lib/llm/models";
import { providerEnabled } from "@/lib/llm/providers";
import { forgetStepChoices, recommended, writerRows } from "@/lib/llm/routing";
import { STEPS, type StepChoice } from "@/lib/llm/steps";
import { setWriter } from "@/lib/llm/writer";
import { getSetting, setSetting } from "@/lib/settings";
import { OUTPUT_TYPES } from "@/lib/taxonomy";
const Weights = z.object({ w_int: z.number().min(0).max(1), w_freq: z.number().min(0).max(1), w_div: z.number().min(0).max(1) });
const Naming = z.object({ adset: z.string().min(1), ad: z.string().min(1) });
const Market = z.object({ currency: z.string().min(1), accent: z.string().min(1), words_per_second: z.number().min(1).max(5) });
const SkillMap = z.record(z.enum(OUTPUT_TYPES), z.string().nullable());
type Result = {
    ok: true;
} | {
    ok: false;
    error: string;
};
function done(): Result {
    revalidatePath("/", "layout");
    return { ok: true };
}
const Checks = z.object({ claims: z.boolean(), ad_review: z.boolean() });
export async function saveChecksAction(v: unknown): Promise<Result> {
    const p = Checks.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    setSetting(await activeBrandId(), "checks", p.data);
    return done();
}
const ImpactRates = z.object({ usd_per_piece: z.number().min(0).max(100000), hours_per_piece: z.number().min(0).max(1000) });
export async function saveImpactAction(v: unknown): Promise<Result> {
    const p = ImpactRates.safeParse(v);
    if (!p.success)
        return { ok: false, error: "Both figures have to be numbers, 0 or more." };
    setSetting(await activeBrandId(), "impact", p.data);
    return done();
}
export async function checksDefaultAction(): Promise<{
    claims: boolean;
    ad_review: boolean;
}> {
    return getSetting(await activeBrandId(), "checks");
}
export async function saveWeightsAction(v: unknown): Promise<Result> {
    const p = Weights.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    const sum = p.data.w_int + p.data.w_freq + p.data.w_div;
    if (Math.abs(sum - 1) > 0.001)
        return { ok: false, error: `Weights must add up to 1 (now ${sum.toFixed(2)})` };
    setSetting(await activeBrandId(), "rank_weights", p.data);
    return done();
}
export async function saveNamingAction(v: unknown): Promise<Result> {
    const p = Naming.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    setSetting(await activeBrandId(), "naming", p.data);
    return done();
}
export async function saveMarketAction(v: unknown): Promise<Result> {
    const p = Market.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    setSetting(await activeBrandId(), "market", p.data);
    return done();
}
export async function saveSkillMapAction(v: unknown): Promise<Result> {
    const p = SkillMap.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    setSetting(await activeBrandId(), "skill_map", p.data as never);
    return done();
}
const StepChoiceIn = z.object({ model: z.string().optional(), effort: z.enum(["low", "medium", "high"]).optional(), context: z.enum(["focused", "full", "minimal"]).optional(), extra: z.enum(["brand", "brain"]).optional() });
export async function saveStepChoiceAction(task: string, v: unknown): Promise<Result> {
    const step = STEPS.find((s) => s.task === task);
    if (!step)
        return { ok: false, error: "No such step." };
    const p = StepChoiceIn.safeParse(v);
    if (!p.success)
        return { ok: false, error: p.error.message };
    const rec = recommended(step);
    const choice: StepChoice = {};
    if (p.data.model && p.data.model !== rec.model) {
        const m = MODELS.find((x) => x.id === resolveModel(p.data.model!));
        if (!m)
            return { ok: false, error: "That model is not one the app can call." };
        if (step.vision && !m.vision)
            return { ok: false, error: `${m.name} cannot be sent pictures, and this step looks at them.` };
        if (!providerEnabled(m.provider))
            return { ok: false, error: `${m.name} needs ${PROVIDER_KEY[m.provider]} in .env.` };
        choice.model = familyInfo(p.data.model) ? p.data.model : m.id;
    }
    if (p.data.effort && p.data.effort !== rec.effort)
        choice.effort = p.data.effort;
    if (p.data.context && p.data.context !== rec.context) {
        if (!step.context.includes(p.data.context))
            return { ok: false, error: "This step has no such context level." };
        choice.context = p.data.context;
    }
    if (p.data.extra) {
        if (step.context.length)
            return { ok: false, error: "This step is sent brand material already: choose how much of it." };
        choice.extra = p.data.extra;
    }
    const all = { ...getSetting(SHARED_BRAND, "steps") };
    if (Object.keys(choice).length)
        all[task] = choice;
    else
        delete all[task];
    setSetting(SHARED_BRAND, "steps", all);
    forgetStepChoices();
    return done();
}
export async function saveWriterAction(modelId: string | null): Promise<{
    ok: true;
    kept: string[];
} | {
    ok: false;
    error: string;
}> {
    const m = modelId === null ? null : MODELS.find((x) => x.id === resolveModel(modelId));
    if (m === undefined)
        return { ok: false, error: "That model is not one the app can call." };
    if (m && !providerEnabled(m.provider))
        return { ok: false, error: `${m.name} needs ${PROVIDER_KEY[m.provider]} in .env.` };
    const { choices, kept } = setWriter(writerRows(), getSetting(SHARED_BRAND, "steps"), m && { id: familyInfo(modelId!) ? modelId! : m.id, vision: m.vision });
    setSetting(SHARED_BRAND, "steps", choices);
    forgetStepChoices();
    revalidatePath("/", "layout");
    return { ok: true, kept: kept.map((s) => s.label) };
}
export async function resetStepChoicesAction(): Promise<Result> {
    setSetting(SHARED_BRAND, "steps", {});
    forgetStepChoices();
    return done();
}
