import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ComplianceCheckRow } from "@/db/schema";
import { env } from "../env";
import { NO_TIME, pastSeconds, type StepTime } from "../jobs/past-time";
import { isVideoFile } from "../media/video-frames";
import { currentOutputs } from "../studio/outputs";
import { pieceSummary, scanPiece, type Piece, type Review } from "./scan";
const getScripts = (brandId: string) => db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.created_at)).all();
const getScript = (id: string) => db.select().from(schema.scripts).where(eq(schema.scripts.id, id)).get();
const getJobs = (brandId: string) => db.select().from(schema.outputJobs).where(eq(schema.outputJobs.brand_id, brandId)).orderBy(desc(schema.outputJobs.created_at)).all();
const IMAGE = /\.(png|jpe?g|webp)$/i;
export const UPLOAD_OK = /\.(png|jpe?g|webp|mp4|mov|webm|m4v)$/i;
export const UPLOAD_MAX_BYTES = 200 * 1024 * 1024;
export const uploadDir = (brandId: string) => path.join(env.DATA_DIR, "assets", "compliance", brandId);
const safeName = (name: string) => path
    .basename(name)
    .normalize("NFD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "upload";
export function saveUpload(brandId: string, name: string, bytes: Buffer): {
    rel: string;
    kind: "image" | "video";
} {
    if (!UPLOAD_OK.test(name))
        throw new Error("Upload a picture (PNG, JPG, WebP) or a video (MP4, MOV, WebM).");
    if (bytes.length > UPLOAD_MAX_BYTES)
        throw new Error("That file is over 200 MB. Upload a smaller one.");
    if (!bytes.length)
        throw new Error("That file is empty.");
    const dir = uploadDir(brandId);
    fs.mkdirSync(dir, { recursive: true });
    const file = `${Date.now().toString(36)}-${safeName(name)}`;
    fs.writeFileSync(path.join(dir, file), bytes);
    return { rel: `compliance/${brandId}/${file}`, kind: isVideoFile(file) ? "video" : "image" };
}
export function assetFile(rel: string): string {
    const root = path.resolve(env.DATA_DIR, "assets");
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file))
        throw new Error("That file is not here any more.");
    return file;
}
export interface SourceItem {
    kind: "image" | "script" | "video";
    ref: string;
    label: string;
    thumb?: string;
    at: string;
}
export function brandSources(brandId: string, limit = 40): {
    images: SourceItem[];
    scripts: SourceItem[];
    videos: SourceItem[];
} {
    const r = schema.studioRuns;
    const sets = db.select({ id: r.id, title: r.title, items: r.items, created_at: r.created_at }).from(r).where(eq(r.brand_id, brandId)).orderBy(desc(r.created_at)).limit(60).all();
    const images: SourceItem[] = [];
    for (const s of sets) {
        for (const it of s.items) {
            if (it.status !== "done" || !it.outputs?.length)
                continue;
            const out = currentOutputs(it.outputs).find((o) => IMAGE.test(o.path)) ?? it.outputs[it.outputs.length - 1];
            if (!out || !IMAGE.test(out.path))
                continue;
            images.push({ kind: "image", ref: `${s.id}:${it.id}`, label: `${s.title.replace(/\s*\(.*$/, "")} · ${it.label}`, thumb: `/api/assets/${out.path}?w=240`, at: s.created_at });
            if (images.length >= limit)
                break;
        }
        if (images.length >= limit)
            break;
    }
    const scripts: SourceItem[] = getScripts(brandId)
        .slice(0, limit)
        .map((s) => ({ kind: "script", ref: s.id, label: s.title, at: s.created_at }));
    const videos: SourceItem[] = [];
    for (const j of getJobs(brandId)) {
        const v = (j.assets ?? []).find((a) => a.kind === "video" && isVideoFile(a.path));
        if (!v)
            continue;
        videos.push({ kind: "video", ref: j.id, label: `${j.meta_ad_name || j.id} · ${v.caption ?? "Video"}`, at: j.created_at });
        if (videos.length >= limit)
            break;
    }
    return { images, scripts, videos };
}
const productOfScript = (conceptId: string): string | null => db.select({ p: schema.concepts.product_id }).from(schema.concepts).where(eq(schema.concepts.id, conceptId)).get()?.p ?? null;
export function pieceOf(brandId: string, kind: SourceItem["kind"], ref: string): {
    piece: Piece;
    productId: string | null;
    wroteWith: string | null;
} {
    if (kind === "script") {
        const s = getScript(ref);
        if (!s || s.brand_id !== brandId)
            throw new Error("That script is not here any more.");
        return { piece: { kind: "script", title: s.title, lines: s.lines.map((l) => ({ beat: l.beat, text: l.text, on_screen: l.on_screen, visual_note: l.visual_note })) }, productId: productOfScript(s.concept_id), wroteWith: s.model ?? env.MODEL_SCRIPT };
    }
    if (kind === "image") {
        const [setId, itemId] = ref.split(":");
        const set = db.select().from(schema.studioRuns).where(and(eq(schema.studioRuns.id, setId), eq(schema.studioRuns.brand_id, brandId))).get();
        const it = set?.items.find((x) => x.id === itemId);
        const out = it ? (currentOutputs(it.outputs).find((o) => IMAGE.test(o.path)) ?? it.outputs[it.outputs.length - 1]) : undefined;
        if (!set || !it || !out)
            throw new Error("That image is not here any more.");
        return { piece: { kind: "image", file: assetFile(out.path), texts: out.texts }, productId: set.product_id, wroteWith: set.context?.models?.words_with_the_copy_craft ?? set.context?.models?.strategy_and_copy ?? null };
    }
    const job = getJobs(brandId).find((j) => j.id === ref);
    const v = job?.assets.find((a) => a.kind === "video" && isVideoFile(a.path));
    if (!job || !v)
        throw new Error("That video is not here any more.");
    const s = getScript(job.script_id);
    return { piece: { kind: "video", file: assetFile(v.path), transcript: s?.lines.map((l) => l.text).join("\n") }, productId: s ? productOfScript(s.concept_id) : null, wroteWith: null };
}
function nextId(): string {
    const all = db.select({ id: schema.complianceChecks.id }).from(schema.complianceChecks).all();
    return `chk_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
}
export function listChecks(brandId: string, limit = 50): ComplianceCheckRow[] {
    return db.select().from(schema.complianceChecks).where(eq(schema.complianceChecks.brand_id, brandId)).orderBy(desc(schema.complianceChecks.created_at)).limit(limit).all();
}
export function getCheck(brandId: string, id: string): ComplianceCheckRow | undefined {
    return db.select().from(schema.complianceChecks).where(and(eq(schema.complianceChecks.id, id), eq(schema.complianceChecks.brand_id, brandId))).get();
}
export async function runCheck(input: {
    brandId: string;
    piece: Piece;
    ref?: string;
    productId?: string | null;
    wroteWith?: string | null;
}): Promise<ComplianceCheckRow> {
    const review: Review = await scanPiece({ brandId: input.brandId, piece: input.piece, productId: input.productId, wroteWith: input.wroteWith, refId: input.ref ?? null });
    const id = nextId();
    db.insert(schema.complianceChecks)
        .values({
        id,
        brand_id: input.brandId,
        kind: input.piece.kind,
        ref: input.ref ?? "",
        summary: pieceSummary(input.piece),
        verdict: review.verdict,
        findings: review.findings,
        passed: review.passed,
        model: review.model,
        cost_usd: review.costUsd,
        policies_read_at: review.policiesReadAt,
    })
        .run();
    return getCheck(input.brandId, id)!;
}
let kept: {
    at: number;
    time: StepTime;
} | null = null;
export function checkTime(): StepTime {
    if (kept && Date.now() - kept.at < 30000)
        return kept.time;
    let time = NO_TIME;
    try {
        const t = schema.llmCalls;
        const runs = db
            .select({ ms: t.duration_ms })
            .from(t)
            .where(and(eq(t.task, "compliance_scan"), eq(t.status, "ok")))
            .orderBy(desc(t.created_at))
            .limit(8)
            .all()
            .map((r) => r.ms / 1000);
        time = pastSeconds(runs);
    }
    catch {
    }
    kept = { at: Date.now(), time };
    return time;
}
