import { randomUUID } from "node:crypto";
import type { CroRun, CroSection } from "./studio-types";
import { scopeSectionCss } from "./studio-css";
import { validateSection } from "./studio-render";
function snapshot(run: CroRun, action: string) {
    run.projectRevisions = [...(run.projectRevisions || []), { id: randomUUID(), at: new Date().toISOString(), action, sections: structuredClone(run.sections), blueprint: structuredClone(run.blueprint), storyboard: structuredClone(run.storyboard) }].slice(-30);
}
export function snapshotCroProject(run: CroRun, action: string) { snapshot(run, action); }
function invalidate(run: CroRun) { delete run.quality; delete run.visualReview; run.stage = "Section changes saved. Run the free layout check to review them."; }
export function syncCroImageAssignments(run: CroRun): void {
    for (const slot of run.storyboard?.imagePlan || []) {
        const image = run.sections.find(s => s.id === slot.sectionId)?.images.find(i => i.key === slot.slotId);
        if (!image?.assetId || !run.brand.assets.some(a => a.id === image.assetId))
            continue;
        if (slot.role === "proof" && slot.assetId !== image.assetId)
            continue;
        slot.assetId = image.assetId;
        slot.source = "existing";
    }
}
export function duplicateCroSection(run: CroRun, sectionId: string): void {
    const original = run.sections.find(s => s.id === sectionId);
    if (!original)
        throw new Error("Select a saved section to duplicate.");
    if (run.sections.length >= 20)
        throw new Error("A page supports at most 20 sections.");
    if (run.storyboard && run.storyboard.imagePlan.length + run.storyboard.imagePlan.filter(p => p.sectionId === sectionId).length > 60)
        throw new Error("The page image plan is full. Remove an unused section before duplicating.");
    const suffix = randomUUID().slice(0, 8), id = `${original.id.slice(0, 33)}-copy-${suffix}`;
    const oldRoot = `cro-${original.id}`, root = `cro-${id}`, ids: Record<string, string> = { [oldRoot]: root };
    for (const m of original.html.matchAll(/\bid\s*=\s*"([a-zA-Z][\w-]*)"/gi))
        if (m[1] !== oldRoot)
            ids[m[1]] = `${m[1]}-${suffix}`;
    const html = original.html.replace(/\bid\s*=\s*"([a-zA-Z][\w-]*)"/gi, (_, previous: string) => previous === oldRoot ? "" : `id="${ids[previous]}"`).replace(/\bhref\s*=\s*"#([\w-]+)"/gi, (full, previous: string) => ids[previous] ? `href="#${ids[previous]}"` : full);
    const clone: CroSection = { ...structuredClone(original), id, label: `${original.label.slice(0, 110)} (copy)`, version: 1, html, css: scopeSectionCss(original.css, `#${root}`, ids) };
    validateSection(clone);
    snapshot(run, `Duplicated ${original.label}`);
    run.sections.splice(run.sections.indexOf(original) + 1, 0, clone);
    const plan = run.blueprint?.sections.find(s => s.id === sectionId);
    if (plan)
        run.blueprint!.sections.splice(run.blueprint!.sections.indexOf(plan) + 1, 0, { ...structuredClone(plan), id, label: clone.label });
    const board = run.storyboard?.sections.find(s => s.id === sectionId);
    if (board) {
        run.storyboard!.sections.splice(run.storyboard!.sections.indexOf(board) + 1, 0, { ...structuredClone(board), id, label: clone.label });
        run.storyboard!.imagePlan.push(...run.storyboard!.imagePlan.filter(p => p.sectionId === sectionId).map((p, i) => ({ ...structuredClone(p), sectionId: id, slotId: `copy-${suffix}-${i}` })));
    }
    invalidate(run);
}
export function removeCroSection(run: CroRun, sectionId: string): void {
    const section = run.sections.find(s => s.id === sectionId);
    if (!section)
        throw new Error("Section not found.");
    if (run.sections.length <= 1 || section.enabled && run.sections.filter(s => s.enabled).length <= 1)
        throw new Error("Keep at least one enabled section on the page.");
    snapshot(run, `Removed ${section.label}`);
    run.sections = run.sections.filter(s => s.id !== sectionId);
    if (run.blueprint)
        run.blueprint.sections = run.blueprint.sections.filter(s => s.id !== sectionId);
    if (run.storyboard) {
        run.storyboard.sections = run.storyboard.sections.filter(s => s.id !== sectionId);
        run.storyboard.imagePlan = run.storyboard.imagePlan.filter(p => p.sectionId !== sectionId);
    }
    invalidate(run);
}
export function restoreCroProject(run: CroRun, revisionId: string): void {
    const previous = run.projectRevisions?.find(r => r.id === revisionId);
    if (!previous)
        throw new Error("Saved page version not found.");
    for (const section of previous.sections)
        validateSection(section);
    snapshot(run, "Restored saved section arrangement");
    run.sections = structuredClone(previous.sections);
    run.blueprint = structuredClone(previous.blueprint);
    run.storyboard = structuredClone(previous.storyboard);
    invalidate(run);
}
export function reorderCroPlans(run: CroRun, sectionIds: string[]): void {
    if (sectionIds.every((id, i) => run.sections[i]?.id === id))
        return;
    if (sectionIds.length !== run.sections.length || new Set(sectionIds).size !== sectionIds.length || sectionIds.some(id => !run.sections.some(s => s.id === id)))
        throw new Error("Invalid section order.");
    snapshot(run, "Reordered sections");
    const index = (id: string) => sectionIds.indexOf(id);
    if (run.blueprint)
        run.blueprint.sections.sort((a, b) => index(a.id) - index(b.id));
    if (run.storyboard)
        run.storyboard.sections.sort((a, b) => index(a.id) - index(b.id));
}
export function insertCroSectionPlan(run: CroRun, label: string, note: string, afterSectionId: string): string {
    if (!run.blueprint || !run.sections.length)
        throw new Error("Build the page before inserting a section.");
    if (run.blueprint.sections.length >= 20)
        throw new Error("A page supports at most 20 sections.");
    const index = run.blueprint.sections.findIndex(s => s.id === afterSectionId);
    if (index < 0)
        throw new Error("Choose an existing section to insert after.");
    if (!label.trim() || !note.trim())
        throw new Error("Name the section and describe what it should do.");
    snapshot(run, `Requested new section: ${label}`);
    const id = `insert-${randomUUID().slice(0, 8)}`;
    run.blueprint.sections.splice(index + 1, 0, { id, label: label.trim().slice(0, 120), purpose: note.trim(), layout: "Follow the existing page's shared visual specification, typography, spacing and mobile-first composition. Adapt a bespoke section to the customer's brief.", referenceSectionId: "", findingIds: [], knowledgeIds: [] });
    invalidate(run);
    return id;
}
