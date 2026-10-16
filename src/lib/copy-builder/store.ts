import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "../env";
import { CopyRunSchema, type CopyRun, type CopySource } from "./types";
const directory = (brandId: string) => path.join(env.DATA_DIR, "copy-builder", createHash("sha256").update(brandId).digest("hex"));
const idSchema = z.string().uuid();
export function recordPath(brandId: string, id: string, suffix: string) {
    return path.join(directory(brandId), `${idSchema.parse(id)}${suffix}`);
}
function writeJson(file: string, data: unknown) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2));
    fs.renameSync(temp, file);
}
export function saveRun(brandId: string, run: CopyRun) {
    if (run.request.brandId !== brandId)
        throw new Error("This copy belongs to another brand.");
    writeJson(recordPath(brandId, run.id, ".run.json"), CopyRunSchema.parse(run));
}
export function readRun(brandId: string, id: string): CopyRun {
    return CopyRunSchema.parse(JSON.parse(fs.readFileSync(recordPath(brandId, id, ".run.json"), "utf8")));
}
export function listRuns(brandId: string): CopyRun[] {
    const dir = directory(brandId);
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(".run.json")).flatMap((f) => {
        try {
            return [readRun(brandId, f.replace(".run.json", ""))];
        }
        catch {
            return [];
        }
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
}
export function saveUpload(brandId: string, source: CopySource, ext: string, bytes: Buffer) {
    const id = source.id.replace(/^upload:/, "");
    const file = recordPath(brandId, id, ext);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    writeJson(recordPath(brandId, id, ".upload.json"), { source, ext });
    return file;
}
export function readUpload(brandId: string, id: string): {
    source: CopySource;
    file: string;
} {
    const record = JSON.parse(fs.readFileSync(recordPath(brandId, id, ".upload.json"), "utf8")) as {
        source: CopySource;
        ext: string;
    };
    if (!/^\.(jpg|jpeg|png|webp|mp4|mov|webm)$/.test(record.ext))
        throw new Error("Unsupported media.");
    return { source: record.source, file: recordPath(brandId, id, record.ext) };
}
