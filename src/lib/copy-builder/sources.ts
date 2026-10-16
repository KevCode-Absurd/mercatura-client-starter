import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { readUpload } from "./store";
import type { CopySource } from "./types";
export function assetFile(relative: string): string | null {
    const root = path.resolve(env.DATA_DIR, "assets");
    const file = path.resolve(root, relative);
    return file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}
const preview = (file: string) => `/api/assets/${file.split(/[\\/]/).map(encodeURIComponent).join("/")}`;
export function listCopySources(brandId: string): (CopySource & {
    file: string;
})[] {
    const out: (CopySource & {
        file: string;
        at: string;
    })[] = [];
    for (const run of db.select().from(schema.studioRuns).where(eq(schema.studioRuns.brand_id, brandId)).all()) {
        if (run.kind !== "ad")
            continue;
        for (const item of run.items)
            for (const [index, output] of item.outputs.entries()) {
                const file = assetFile(output.path);
                if (!file || !/\.(png|jpe?g|webp)$/i.test(file))
                    continue;
                out.push({ id: `studio:${run.id}:${item.id}:${index}`, title: `${run.title}: ${item.plan?.title ?? item.id}${index ? ` (${index + 1})` : ""}`, kind: "image", preview: preview(output.path), productId: run.product_id, stage: item.plan?.awareness, file, at: run.created_at });
            }
    }
    const scripts = new Map(db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all().map((s) => [s.id, s]));
    for (const job of db.select().from(schema.outputJobs).where(eq(schema.outputJobs.brand_id, brandId)).all()) {
        const preparation = new Set([job.production?.character?.file, job.production?.look?.file, job.production?.storyboard?.file].filter(Boolean).map((p) => p!.replace(/^assets\//, "")));
        for (const [index, asset] of job.assets.entries()) {
            if (asset.kind !== "image" && asset.kind !== "video")
                continue;
            if (preparation.has(asset.path))
                continue;
            const file = assetFile(asset.path);
            if (!file || !/\.(png|jpe?g|webp|mp4|mov|webm)$/i.test(file))
                continue;
            const script = scripts.get(job.script_id);
            out.push({ id: `job:${job.id}:${index}`, title: `${script?.title ?? job.meta_ad_name ?? "Produced ad"} · ${asset.caption || `${asset.kind} ${index + 1}`}`, kind: asset.kind, preview: preview(asset.path), stage: script?.awareness_stage, file, at: job.created_at });
        }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
}
export function resolveCopySource(brandId: string, id: string) {
    if (id.startsWith("upload:")) {
        const upload = readUpload(brandId, id.slice(7));
        return { ...upload.source, file: upload.file };
    }
    const source = listCopySources(brandId).find((s) => s.id === id);
    if (!source)
        throw new Error("This ad is unavailable for the active brand. Choose another ad.");
    return source;
}
