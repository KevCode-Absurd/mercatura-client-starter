import type { ModelInfo } from "./models";
import type { StepChoice, StepChoices } from "./steps";
export interface WriterStep {
    task: string;
    label: string;
    vision: boolean;
    recommended: string;
}
type Writer = Pick<ModelInfo, "id" | "vision">;
const takes = (step: WriterStep, model: Writer) => !step.vision || model.vision;
export function setWriter(steps: WriterStep[], choices: StepChoices, model: Writer | null): {
    choices: StepChoices;
    kept: WriterStep[];
} {
    const next: StepChoices = { ...choices };
    const kept: WriterStep[] = [];
    for (const step of steps) {
        if (model && !takes(step, model)) {
            kept.push(step);
            continue;
        }
        const choice: StepChoice = { ...next[step.task] };
        if (model && model.id !== step.recommended)
            choice.model = model.id;
        else
            delete choice.model;
        if (Object.keys(choice).length)
            next[step.task] = choice;
        else
            delete next[step.task];
    }
    return { choices: next, kept };
}
export type WriterShows = {
    kind: "recommended";
} | {
    kind: "mixed";
} | {
    kind: "model";
    model: string;
    kept: WriterStep[];
};
export function writerShows(steps: WriterStep[], choices: StepChoices, models: Writer[]): WriterShows {
    if (!steps.some((s) => choices[s.task]?.model))
        return { kind: "recommended" };
    const runsOn = (s: WriterStep) => choices[s.task]?.model ?? s.recommended;
    for (const id of new Set(steps.map(runsOn))) {
        const model = models.find((m) => m.id === id) ?? { id, vision: true };
        const can = steps.filter((s) => takes(s, model));
        if (can.length && can.every((s) => runsOn(s) === id))
            return { kind: "model", model: id, kept: steps.filter((s) => !takes(s, model)) };
    }
    return { kind: "mixed" };
}
