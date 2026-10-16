import { SHARED_BRAND, env } from "../env";
import { getSetting } from "../settings";
import { forcedLevel, type ContextLevel } from "./context";
import { FAMILIES, MODELS, modelInfo, resolveModel, type Provider } from "./models";
import { STEPS, stepOf, writerSteps, type Effort, type ExtraContext, type Step, type StepChoices } from "./steps";
import type { WriterStep } from "./writer";
export type { Effort, Provider };
export { STEPS };
export interface Route {
    model: string;
    effort?: Effort;
    maxTokens?: number;
    maxTokensLocked?: boolean;
}
export const providerOf = (model: string): Provider => (model.startsWith("gemini") ? "gemini" : model.startsWith("deepseek") ? "deepseek" : model.startsWith("gpt") || /^o\d/.test(model) ? "openai" : "claude");
export const seesImages = (model: string) => modelInfo(model)?.vision ?? !/^deepseek-v4-pro/.test(model);
export const ROUTES: Record<string, Route> = Object.fromEntries(STEPS.filter((s) => s.model).flatMap((s) => [s.task, ...(s.also ?? [])].map((task) => [task, { model: s.model!, effort: s.efforts?.[task] ?? s.effort, maxTokens: s.maxTokens }])));
let fromEnv: Record<string, Route> | null = null;
function envRoutes(): Record<string, Route> {
    if (fromEnv)
        return fromEnv;
    try {
        fromEnv = env.MODEL_ROUTES ? (JSON.parse(env.MODEL_ROUTES) as Record<string, Route>) : {};
    }
    catch {
        fromEnv = {};
    }
    return fromEnv;
}
let forProcess: Record<string, Route> | null = null;
export function setRoutes(routes: Record<string, Route> | null) {
    forProcess = routes;
}
let saved: {
    at: number;
    value: StepChoices;
} | null = null;
export function stepChoices({ fresh = false }: {
    fresh?: boolean;
} = {}): StepChoices {
    if (!fresh && saved && Date.now() - saved.at < 1000)
        return saved.value;
    let value: StepChoices = {};
    try {
        value = getSetting(SHARED_BRAND, "steps") ?? {};
    }
    catch {
        value = {};
    }
    saved = { at: Date.now(), value };
    return value;
}
export function forgetStepChoices() {
    saved = null;
}
export const baseModel = (step: Step): string => env[step.base];
export function recommended(step: Step): {
    model: string;
    effort?: Effort;
    context: ContextLevel | null;
} {
    return { model: step.model ?? baseModel(step), effort: step.effort, context: step.context[0] ?? null };
}
export const writerRows = (): WriterStep[] => writerSteps().map((s) => ({ task: s.task, label: s.label, vision: !!s.vision, recommended: recommended(s).model }));
export const writerChoices = (): {
    id: string;
    vision: boolean;
}[] => [...MODELS, ...FAMILIES.map((f) => ({ id: f.id, vision: f.versions[0].vision }))];
export function routeFor(task: string, asked: {
    model: string;
    effort?: Effort;
    maxTokens?: number;
    pin?: boolean;
}): Required<Pick<Route, "model">> & Route {
    if (asked.pin)
        return { ...asked, maxTokensLocked: asked.maxTokens != null };
    const once = forProcess?.[task];
    if (once)
        return { model: once.model, effort: once.effort ?? asked.effort, maxTokens: once.maxTokens ?? asked.maxTokens, maxTokensLocked: once.maxTokens != null };
    const step = stepOf(task);
    const choice = step ? stepChoices()[step.task] : undefined;
    const row = envRoutes()[task] ?? ROUTES[task];
    const model = (choice?.model ? resolveModel(choice.model) : undefined) ?? row?.model ?? asked.model;
    const cap = model === row?.model ? row.maxTokens : undefined;
    return { model, effort: choice?.effort ?? row?.effort ?? asked.effort, maxTokens: cap ?? asked.maxTokens, maxTokensLocked: !!envRoutes()[task]?.maxTokens && cap != null };
}
export function extraContext(task: string): ExtraContext | null {
    const step = stepOf(task);
    if (!step || step.context.length)
        return null;
    return stepChoices()[step.task]?.extra ?? null;
}
export const modelOf = (task: string, asked: string) => routeFor(task, { model: asked }).model;
export function contextLevel(task: string): ContextLevel {
    const step = stepOf(task);
    const levels = step?.context ?? [];
    const choice = step ? stepChoices()[step.task]?.context : undefined;
    const want = forcedLevel() ?? choice ?? levels[0] ?? "focused";
    return !levels.length || levels.includes(want) ? want : levels[0];
}
