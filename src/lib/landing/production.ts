import { createHash } from "node:crypto";
import type { CroRun, CroSection } from "./studio-types";
import { readCroRun, saveCroRun } from "./studio-store";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function buildContract(run: CroRun) { return digest({ brand: run.brand, storyboard: run.storyboard, blueprint: run.blueprint, approval: run.approval, request: run.request }); }
export async function buildMissingSections(run: CroRun, build: (snapshot: CroRun, plan: NonNullable<CroRun["blueprint"]>["sections"][number]) => Promise<CroSection>, concurrency = 2) {
    const contract = buildContract(run), snapshot = structuredClone(run), plans = run.blueprint?.sections ?? [];
    const missing = plans.filter(plan => !run.sections.some(section => section.id === plan.id));
    const failures: unknown[] = [];
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), missing.length) }, async () => {
        for (;;) {
            const plan = missing[cursor++];
            if (!plan)
                return;
            const isolated = structuredClone(snapshot);
            isolated.costUsd = 0;
            try {
                const section = await build(isolated, plan);
                const current = readCroRun(run.brandId, run.id);
                if (buildContract(current) !== contract)
                    throw new Error("The approved design agreement changed while this section was being built. Its result cannot overwrite the new page.");
                if (current.sections.some(saved => saved.id === section.id))
                    throw new Error(`Section ${section.id} was edited or completed elsewhere. Reload the saved page.`);
                const completed = [...current.sections, section];
                current.sections = plans.flatMap(item => completed.filter(saved => saved.id === item.id));
                current.costUsd += isolated.costUsd;
                current.stage = `Completed ${current.sections.length}/${plans.length}: ${section.label}`;
                const saved = saveCroRun(current, current.revision);
                Object.assign(run, saved);
            }
            catch (error) {
                failures.push(error);
            }
        }
    }));
    if (failures.length)
        throw failures[0];
    return run;
}
export function layoutRepairIds(run: CroRun): string[] {
    return [...new Set((run.quality?.designChecks ?? []).flatMap(check => check.issues.filter(issue => ["overflow", "clipping", "collision"].includes(issue.kind)).map(issue => issue.sectionId)).filter(id => run.sections.some(section => section.id === id)))];
}
