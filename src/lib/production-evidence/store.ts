import "server-only";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { readLocal, writeLocal, readEvidenceSnapshot } from "../standalone/store";
import { qualityContext } from "../standalone/data";
import { hashMediaFile } from "./media-server";
import { mediaReviewIdentity, assessDelivery, type MediaReviewInput, type DeliveryManifest } from "./media";
import { buildEvidencePacket, packetAtomicFacts } from "../standalone/evidence";
import { readArtifact } from "../seo/store";
import { receiptIsCurrent } from "./review";
import { ffmpeg, LOCAL_UPLOAD_INPUT } from "../media/ffmpeg";
export type EvidenceWorkbench = {
    revision: number;
    deliveries: unknown[];
    claimReviews: unknown[];
    derivations: unknown[];
    benchmarks: unknown[];
};
function rawWorkbench(brandId: string): EvidenceWorkbench { return readLocal(brandId, "evidence-workbench", { revision: 0, deliveries: [], claimReviews: [], derivations: [], benchmarks: [] }); }
export function readEvidenceWorkbench(brandId: string): EvidenceWorkbench {
    const saved = rawWorkbench(brandId), snapshot = readEvidenceSnapshot(brandId), media = new Map<string, ReturnType<typeof currentEvidenceMedia>>();
    return { ...saved, deliveries: saved.deliveries.map((entry: any) => { try {
            if (!media.has(entry.assetId))
                media.set(entry.assetId, currentEvidenceMedia(brandId, entry.assetId));
            const live = media.get(entry.assetId)!, scope = entry.scope;
            if (!scope)
                return { ...entry, currentState: "needs_review", currentIssue: "Historical manifest has no pinned scope." };
            const result = assessDelivery(entry.manifest, packetAtomicFacts(buildEvidencePacket(scope, snapshot.records)), scope, { ...entry.manifest.media, sha256: live.sha256 });
            for (const frame of entry.manifest.frames.filter((f: any) => f.basis === "actual_frame"))
                if (!frameReceiptMatches(brandId, entry.assetId, frame)) {
                    result.status = "held";
                    result.holds.push({ atMs: frame.atMs, reason: "Captured frame bytes changed or are missing." });
                }
            return { ...entry, currentState: result.status === "reviewed_alignment" && entry.result.status === "reviewed_alignment" ? "current_exact_review" : "needs_review", currentReview: result };
        }
        catch (error) {
            return { ...entry, currentState: "needs_review", currentIssue: String(error) };
        } }), claimReviews: saved.claimReviews.map((receipt: any) => { try {
            if (!receipt.reviewInput)
                return { ...receipt, currentState: "needs_review" };
            const input = receipt.reviewInput, artifact = readArtifact(brandId, input.artifactId);
            if (!artifact)
                return { ...receipt, currentState: "needs_review" };
            const field = input.field === "title" ? artifact.title : input.field === "description" ? artifact.description : artifact.body, records = snapshot.records.filter(r => r.atomicFacts?.some(f => input.sourceFacts.some((s: any) => s.id === f.id))), facts = packetAtomicFacts(buildEvidencePacket(receipt.scope, snapshot.records)).filter(f => input.sourceFacts.some((s: any) => s.id === f.id));
            const current = { ...input, after: field.includes(input.after) ? input.after : field, sourceFacts: facts, sourcePassage: records.some(r => r.source.excerpt === input.sourcePassage) ? input.sourcePassage : records.map(r => r.source.excerpt).join("\n\n"), sourceRevision: facts[0]?.authority.sourceRevision ?? 0 };
            return { ...receipt, currentState: receiptIsCurrent(receipt, current) ? "current_exact_review" : "needs_review" };
        }
        catch {
            return { ...receipt, currentState: "needs_review" };
        } }) };
}
export function appendEvidenceReceipt(brandId: string, field: "deliveries" | "claimReviews" | "derivations" | "benchmarks", value: unknown, expectedRevision: number) {
    return db.transaction(() => {
        const old = rawWorkbench(brandId);
        if (old.revision !== expectedRevision)
            throw new Error("Evidence review workspace changed. Reload before recording the exact revision.");
        const next = { ...old, revision: old.revision + 1, [field]: [...old[field], value] };
        writeLocal(brandId, "evidence-workbench", next);
        return next;
    }, { behavior: "immediate" });
}
export function evidenceMediaChoices(brandId: string) {
    const choices = qualityContext(brandId).records.filter(r => r.imagePath).map(r => ({ id: r.id, productId: r.productId, path: r.imagePath!, title: r.text }));
    const scripts = db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all(), concepts = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    for (const job of db.select().from(schema.outputJobs).where(eq(schema.outputJobs.brand_id, brandId)).all())
        for (let i = 0; i < job.assets.length; i++) {
            const a = job.assets[i];
            if (a.kind === "image" || a.kind === "video")
                choices.push({ id: `job:${job.id}:${i}`, productId: concepts.find(c => c.id === scripts.find(s => s.id === job.script_id)?.concept_id)?.product_id ?? "unbound", path: a.path, title: a.caption ?? job.id });
        }
    return choices;
}
export function currentEvidenceMedia(brandId: string, assetId: string) {
    const choice = evidenceMediaChoices(brandId).find(m => m.id === assetId);
    if (!choice)
        throw new Error("Choose a saved media output belonging to this brand.");
    const root = path.resolve(env.DATA_DIR, "assets"), file = path.resolve(root, choice.path);
    return { ...choice, ...hashMediaFile(file, [root]) };
}
export type CapturedEvidenceFrame = {
    identity: string;
    assetId: string;
    atMs: number;
    frameSha256: string;
    path: string;
    capturedAt: string;
};
export function readEvidenceFrames(brandId: string) { return readLocal<CapturedEvidenceFrame[]>(brandId, "evidence-frames", []); }
export function frameReceiptMatches(brandId: string, assetId: string, frame: DeliveryManifest["frames"][number]) {
    const receipt = readEvidenceFrames(brandId).find(c => c.assetId === assetId && c.identity === frame.mediaIdentity && c.atMs === frame.atMs && c.frameSha256 === frame.frameSha256);
    if (!receipt)
        return false;
    try {
        const root = path.resolve(env.DATA_DIR, "assets");
        return hashMediaFile(path.resolve(root, receipt.path), [root]).sha256 === frame.frameSha256;
    }
    catch {
        return false;
    }
}
export async function captureEvidenceFrame(brandId: string, assetId: string, atMs: number, render: Omit<MediaReviewInput, "sha256">) {
    if (!Number.isFinite(atMs) || atMs < 0 || atMs > 60 * 60 * 1000)
        throw new Error("Frame timestamp must be within one hour.");
    const media = currentEvidenceMedia(brandId, assetId), identity = mediaReviewIdentity({ ...render, sha256: media.sha256 });
    if (identity.frameRange && (atMs < identity.frameRange.startMs || atMs > identity.frameRange.endMs))
        throw new Error("Frame timestamp is outside the selected review frame range. Rebind the intended range before capturing it.");
    const root = path.resolve(env.DATA_DIR, "assets"), source = path.resolve(root, media.path);
    const relative = `evidence-review/${brandId}/${identity.identity}-${atMs}.png`, output = path.resolve(root, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const crop = identity.crop;
    if (/\.(png|jpe?g|webp|gif)$/i.test(source)) {
        let image = sharp(source).rotate();
        if (crop)
            image = image.extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: Math.round(crop.width), height: Math.round(crop.height) });
        await image.resize(identity.viewport.width, identity.viewport.height, { fit: "contain" }).png().toFile(output);
    }
    else {
        const filter = [...(crop ? [`crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`] : []), `scale=${identity.viewport.width}:${identity.viewport.height}:force_original_aspect_ratio=decrease`, `pad=${identity.viewport.width}:${identity.viewport.height}:(ow-iw)/2:(oh-ih)/2`].join(",");
        await ffmpeg([...LOCAL_UPLOAD_INPUT, "-ss", String(atMs / 1000), "-i", source, "-frames:v", "1", "-vf", filter, output], { timeoutMs: 30000 });
    }
    if (currentEvidenceMedia(brandId, assetId).sha256 !== media.sha256)
        throw new Error("Media changed during frame capture. Reopen the current byte identity.");
    const frame: CapturedEvidenceFrame = { identity: identity.identity, assetId, atMs, frameSha256: hashMediaFile(output, [root]).sha256, path: relative, capturedAt: new Date().toISOString() };
    writeLocal(brandId, "evidence-frames", [...readEvidenceFrames(brandId).filter(f => !(f.identity === frame.identity && f.atMs === atMs)), frame]);
    return frame;
}
