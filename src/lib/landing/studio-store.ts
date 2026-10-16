import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../env";
import type { CroRun } from "./studio-types";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const directory = (brandId: string) => path.join(env.DATA_DIR, "cro-studio", createHash("sha256").update(brandId).digest("hex"));
export type CroRunSummary = {
    id: string;
    brandId: string;
    title: string;
    status: CroRun["status"];
    stage: string;
    revision: number;
    updatedAt: string;
    productId: string;
    sectionCount: number;
    holds: string[];
};
const summarize = (run: CroRun): CroRunSummary => ({ id: run.id, brandId: run.brandId, title: run.blueprint?.title || run.brand.productName || run.brand.name, status: run.status, stage: run.stage, revision: run.revision, updatedAt: run.updatedAt, productId: run.request.productId || "", sectionCount: run.sections.length, holds: [...(run.quality?.failures ?? []), ...(run.error ? [run.error] : [])] });
function legacySummaries(brandId: string) { return fs.readdirSync(directory(brandId)).filter(name => name.endsWith(".json") && uuid.test(name.slice(0, -5))).flatMap(name => { try {
    return [summarize(readCroRun(brandId, name.slice(0, -5)))];
}
catch {
    return [];
} }); }
function saveSummary(run: CroRun) { const file = path.join(directory(run.brandId), "_index.json"); let summaries: CroRunSummary[] = []; try {
    summaries = JSON.parse(fs.readFileSync(file, "utf8"));
}
catch {
    summaries = legacySummaries(run.brandId);
} summaries = [summarize(run), ...summaries.filter(summary => summary.id !== run.id)]; const temp = `${file}.${randomUUID()}.tmp`; fs.writeFileSync(temp, JSON.stringify(summaries)); fs.renameSync(temp, file); }
function filename(brandId: string, id: string) { if (!uuid.test(id))
    throw new Error("Invalid page ID."); return path.join(directory(brandId), `${id}.json`); }
export function readCroRun(brandId: string, id: string): CroRun {
    const file = filename(brandId, id);
    if (!fs.existsSync(file))
        throw new Error("This page does not belong to the active brand.");
    const run = JSON.parse(fs.readFileSync(file, "utf8")) as CroRun;
    if (run.brandId !== brandId || run.id !== id)
        throw new Error("Invalid page record.");
    return run;
}
export function saveCroRun(run: CroRun, expectedRevision?: number): CroRun {
    if (fs.existsSync(filename(run.brandId, run.id)) && readCroRun(run.brandId, run.id).revision !== (expectedRevision ?? run.revision))
        throw new Error("The page changed during generation. Completed sections are retained; reload before continuing.");
    fs.mkdirSync(directory(run.brandId), { recursive: true });
    run.updatedAt = new Date().toISOString();
    run.revision += 1;
    const file = filename(run.brandId, run.id), temp = `${file}.${randomUUID()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(run));
    fs.renameSync(temp, file);
    saveSummary(run);
    return run;
}
export function listCroRunSummaries(brandId: string, limit = 25, cursor?: {
    updatedAt: string;
    id: string;
}): {
    items: CroRunSummary[];
    next: {
        updatedAt: string;
        id: string;
    } | null;
} {
    const dir = directory(brandId), file = path.join(dir, "_index.json");
    if (!fs.existsSync(dir))
        return { items: [], next: null };
    let summaries: CroRunSummary[] = [];
    if (!fs.existsSync(file)) {
        summaries = legacySummaries(brandId);
        fs.writeFileSync(file, JSON.stringify(summaries));
    }
    else
        summaries = JSON.parse(fs.readFileSync(file, "utf8"));
    const all = summaries.filter(summary => summary.brandId === brandId && (!cursor || summary.updatedAt < cursor.updatedAt || summary.updatedAt === cursor.updatedAt && summary.id < cursor.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id)), size = Math.min(100, Math.max(1, limit)), items = all.slice(0, size), last = items.at(-1);
    return { items, next: all.length > size && last ? { updatedAt: last.updatedAt, id: last.id } : null };
}
export function listCroRuns(brandId: string): CroRun[] {
    const dir = directory(brandId);
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => {
        try {
            return [readCroRun(brandId, f.slice(0, -5))];
        }
        catch {
            return [];
        }
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);
}
