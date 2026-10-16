import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { StudioItem, StudioOutput, StudioRunRow, StudioVariant, TextLayer } from "@/db/schema";
import { env } from "../env";
import { assetPath, mediaLive } from "../media/providers";
import { getRun, saveItemPlan, saveRun, studioCopyAuthority } from "./engine";
import { completeCopyApprovalMatches, completeCopyHash } from "../evaluation/copy-repair";
import { copyDocumentForItem, copyRequirementsForItem, invalidateCopyApproval, reviewCompleteCopy } from "./copy-gate";
import { baseOf, layerTexts, mergeTexts, nextVariantId } from "./overlay";
import { MAX_VARIANTS } from "./variants";
const abs = (rel: string) => path.join(env.DATA_DIR, "assets", rel);
export interface OverlaySave {
    aspect: string;
    from: number;
    layers: TextLayer[];
    png: Buffer;
    variant?: string;
    approve?: boolean;
}
export const overlayPlanTexts = (layers: TextLayer[], item: StudioItem) => {
    const lines = layers.filter(l => l.text.trim());
    return mergeTexts(lines, item.plan?.text_elements ?? []).map((text, i) => ({ ...text, text: text.text.trim(), source: text.source ?? "", placement: `Editable layer: x ${lines[i].x}, y ${lines[i].y}, width ${lines[i].w}, size ${lines[i].size}, ${lines[i].align}` }));
};
export async function saveOverlay(runId: string, itemId: string, o: OverlaySave): Promise<{
    run: StudioRunRow;
    itemId: string;
    version: number;
    path: string;
    variantId?: string;
    copyStatus?: StudioOutput["copy_status"];
    reviewMessage?: string;
}> {
    let run = getRun(runId);
    if (!run)
        throw new Error("Set not found");
    let item = run.items.find((i) => i.id === itemId);
    const src = item?.outputs.find((x) => x.aspect === o.aspect && x.version === o.from);
    if (!item || !src)
        throw new Error("That picture is not in this set.");
    const base = baseOf(run.kind, item, src);
    if (!base || !fs.existsSync(abs(base)))
        throw new Error("This picture has no copy without its words yet. Make it editable first.");
    if (!o.layers.some((l) => l.text.trim()))
        throw new Error("Write at least 1 line before saving.");
    const [want, got] = await Promise.all([sharp(abs(base)).metadata(), sharp(o.png).metadata().catch(() => null)]);
    if (!got || got.format !== "png")
        throw new Error("The picture could not be read. Save it again.");
    if (got.width !== want.width || got.height !== want.height)
        throw new Error("The picture is not the size of the one it was made from. Open the editor again and save.");
    const originalState = JSON.stringify(item);
    const proposed = structuredClone(item);
    const variantId = o.variant ? (o.variant === "new" ? nextVariantId(proposed.variants ?? []) : o.variant) : undefined;
    const merged = overlayPlanTexts(o.layers, item);
    if (variantId) {
        const variants = proposed.variants ?? (proposed.variants = []);
        const index = variants.findIndex(v => v.id === variantId);
        if (o.variant !== "new" && index < 0)
            throw new Error("That variant is no longer under this ad.");
        if (index < 0 && variants.length >= MAX_VARIANTS)
            throw new Error(`This ad has ${variants.length} variants, the most it keeps. Remove some to keep more.`);
        const candidate: StudioVariant = { ...(index >= 0 ? variants[index] : {}), id: variantId, aspect: o.aspect, base_path: base, layers: o.layers.filter(l => l.text.trim()), from: index >= 0 ? variants[index].from : "editor", at: index >= 0 ? variants[index].at : new Date().toISOString() };
        if (index >= 0)
            variants[index] = candidate;
        else
            variants.push(candidate);
    }
    else if (proposed.plan)
        proposed.plan.text_elements = merged;
    let review = item.copy_review;
    let copyStatus: StudioOutput["copy_status"];
    let reviewMessage: string | undefined;
    if (run.kind === "ad" && mediaLive()) {
        let authority = studioCopyAuthority(run, proposed);
        if (o.approve) {
            const checked = await reviewCompleteCopy(copyDocumentForItem(proposed), authority, { brandId: run.brand_id, refId: run.id, requirements: copyRequirementsForItem(proposed), previousReview: review });
            review = checked.review;
            const fresh = getRun(runId);
            if (!fresh || JSON.stringify(fresh.items.find(i => i.id === itemId)) !== originalState)
                throw new Error("This ad changed during its copy review. The newer draft is preserved; save the current edit again.");
            authority = studioCopyAuthority(fresh, proposed);
            run = fresh;
            item = fresh.items.find(i => i.id === itemId)!;
        }
        const approved = completeCopyApprovalMatches(copyDocumentForItem(proposed), review, authority, copyRequirementsForItem(proposed));
        copyStatus = approved ? "approved" : review?.status === "unverified" && o.approve ? "unverified" : "draft";
        if (!approved)
            reviewMessage = o.approve ? `Draft saved without approval. ${review?.verificationErrors.join(" ") || review?.issues.filter(i => i.severity !== "advisory").map(i => `${i.fieldPath}: ${i.reason}`).join(" ") || "The complete copy or its evidence changed; review it again."}` : "Draft saved. Review the complete copy before using this as an approved ad.";
        if (!approved)
            delete item.copy_review;
    }
    if (completeCopyHash(copyDocumentForItem(item), copyRequirementsForItem(item)) !== completeCopyHash(copyDocumentForItem(proposed), copyRequirementsForItem(proposed)))
        invalidateCopyApproval(item);
    const approvalFields = copyStatus ? { copy_status: copyStatus, copy_content_hash: completeCopyHash(copyDocumentForItem(proposed), copyRequirementsForItem(proposed)) } : {};
    if (o.variant) {
        const variants = item.variants ?? (item.variants = []);
        const was = o.variant === "new" ? undefined : variants.find((v) => v.id === o.variant);
        if (o.variant !== "new" && !was)
            throw new Error("That variant is no longer under this ad.");
        if (!was && variants.length >= MAX_VARIANTS)
            throw new Error(`This ad has ${variants.length} variants, the most it keeps. Remove some to keep more.`);
        const id = variantId!;
        const file = assetPath(run.id, `${item.id}_${o.aspect.replace(":", "x")}_${id}_${Date.now().toString(36)}.png`);
        await sharp(o.png).png().toFile(file.abs);
        const rel = `${run.id}/${path.basename(file.abs)}`;
        const layers = o.layers.filter((l) => l.text.trim());
        const next: StudioVariant = { id, aspect: o.aspect, base_path: base, layers, path: rel, from: was?.from ?? "editor", at: was?.at ?? new Date().toISOString(), ...approvalFields };
        if (was)
            variants[variants.indexOf(was)] = next;
        else
            variants.push(next);
        if (copyStatus === "approved" || o.approve)
            item.copy_review = review;
        if (!was || was.path)
            run.log.push({ at: new Date().toISOString(), message: `${item.id} ${o.aspect}: variant ${id} ${was ? "changed" : "kept"} in the words editor. No image was made.` });
        saveRun(run);
        return { run, itemId: item.id, version: src.version, path: rel, variantId: id, copyStatus, reviewMessage };
    }
    const target = item;
    const version = Math.max(0, ...target.outputs.filter((x) => x.aspect === o.aspect).map((x) => x.version)) + 1;
    const file = assetPath(run.id, `${target.id}_${o.aspect.replace(":", "x")}_v${version}.png`);
    await sharp(o.png).png().toFile(file.abs);
    const rel = `${run.id}/${path.basename(file.abs)}`;
    const layers = o.layers.filter((l) => l.text.trim()).map((l, i) => ({ ...l, id: `t${i}` }));
    const output: StudioOutput = { aspect: o.aspect, path: rel, version, base_path: base, texts: layerTexts(layers), layers, changed_from: src.version, ...approvalFields, ...(copyStatus && copyStatus !== "approved" ? { qa: { status: "warn" as const, notes: [reviewMessage ?? "Editable copy is an unapproved draft."] } } : {}) };
    for (const prior of target.outputs)
        if (prior.aspect === o.aspect)
            delete prior.selected;
    target.outputs.push(output);
    run.log.push({ at: new Date().toISOString(), message: `${target.id} ${o.aspect}: words set as type in the editor (version ${version}). No image was made.` });
    saveRun(run);
    if (run.kind === "photoshoot" || !target.plan)
        return { run, itemId: target.id, version, path: rel, copyStatus, reviewMessage };
    const saved = saveItemPlan(run.id, target.id, { text_elements: merged });
    if (copyStatus === "approved" || o.approve) {
        saved.items.find(i => i.id === itemId)!.copy_review = review;
        saveRun(saved);
    }
    return { run: saved, itemId: target.id, version, path: rel, copyStatus, reviewMessage };
}
