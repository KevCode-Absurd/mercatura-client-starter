export type CompositeProgress = {
    total: number;
    completed: number;
    pending: string[];
    held: {
        id: string;
        findings: string[];
    }[];
};
export function compositeProgress(variants: {
    id: string;
    path?: string;
}[], states: Record<string, {
    state?: string;
    findings?: string[];
}>): CompositeProgress { const pending: string[] = [], held: CompositeProgress["held"] = []; let completed = 0; for (const v of variants) {
    if (v.path) {
        completed++;
        continue;
    }
    const state = states[v.id];
    if (state?.state === "held")
        held.push({ id: v.id, findings: state.findings?.length ? state.findings : ["Composition is held; inspect its frozen source and font inputs."] });
    else
        pending.push(v.id);
} return { total: variants.length, completed, pending, held }; }
export function variantCompletionMessage(input: {
    operation: "write" | "composite";
    before: number;
    requested: number;
    progress: CompositeProgress;
    lastError?: string | null;
}) { const { progress: p } = input; if (input.operation === "write" && p.total <= input.before)
    return input.lastError ?? "No variant was written. Try again."; if (p.held.length)
    return p.held.map(h => `${h.id}: ${h.findings.join(" ")}`).join("\n"); if (p.pending.length)
    return input.lastError ?? `${p.pending.join(", ")}: server compositing remains pending; use Retry queued compositing after inspecting the saved inputs.`; if (input.operation === "write" && p.total - input.before < input.requested)
    return `Wrote ${p.total - input.before} of ${input.requested} requested draft variants. The remaining slots did not pass within this request's attempt or spending limit; successful variants were retained.`; return null; }
export async function pollVariantCompletion(input: {
    operation: "write" | "composite";
    before: number;
    requested: number;
}, readRun: () => Promise<{
    ok: boolean;
    busy?: boolean;
    lastError?: string | null;
}>, readComposites: () => Promise<{
    ok: true;
    progress: CompositeProgress;
} | {
    ok: false;
    error: string;
}>): Promise<{
    busy: true;
} | {
    busy: false;
    message: string | null;
}> { const run = await readRun(); if (!run.ok || run.busy)
    return { busy: true }; const status = await readComposites(); return { busy: false, message: status.ok ? variantCompletionMessage({ ...input, progress: status.progress, lastError: run.lastError }) : status.error }; }
