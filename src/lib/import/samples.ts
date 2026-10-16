import fs from "node:fs";
import path from "node:path";
import { getBrandRow, loadBrandBrain } from "../brands";
import { env } from "../env";
import type { CustomerSource } from "../taxonomy";
import { callsToRecords, createImport, type ImportResult } from "./service";
import { guessMapping, parseRows, rowsToRecords } from "./tabular";
import { parseTranscriptFile, type ParsedCall } from "./transcripts";
const FOLDERS: Record<CustomerSource, string> = { call: "calls", ticket: "tickets", review: "reviews", survey: "surveys", community: "community" };
export function sampleDir(brandId: string): string | null {
    const row = getBrandRow(brandId);
    if (!row)
        return null;
    const dir = path.join(env.BRANDS_DIR, row.dir, "sample-data");
    return fs.existsSync(dir) ? dir : null;
}
export function listSampleFiles(brandId: string): {
    type: CustomerSource;
    files: string[];
}[] {
    const dir = sampleDir(brandId);
    if (!dir)
        return [];
    return (Object.keys(FOLDERS) as CustomerSource[])
        .map((type) => {
        const d = path.join(dir, FOLDERS[type]);
        const files = fs.existsSync(d) ? fs.readdirSync(d).filter((f) => !f.startsWith("_") && /\.(vtt|srt|txt|json|csv)$/i.test(f)) : [];
        return { type, files };
    })
        .filter((x) => x.files.length);
}
export function importSampleData(brandId: string, extractAfter: boolean, only?: CustomerSource[]): ImportResult[] {
    const dir = sampleDir(brandId);
    if (!dir)
        throw new Error(`No sample-data folder for brand ${brandId}.`);
    const brand = loadBrandBrain(brandId);
    const terms = [brand.brand.name, brand.brand.name.normalize("NFD").replace(/[̀-ͯ]/g, "")];
    const results: ImportResult[] = [];
    for (const { type, files } of listSampleFiles(brandId)) {
        if (only && !only.includes(type))
            continue;
        const folder = path.join(dir, FOLDERS[type]);
        if (type === "call") {
            const indexFile = path.join(folder, "_index.json");
            const index: Record<string, Partial<ParsedCall> & {
                file: string;
            }> = fs.existsSync(indexFile)
                ? Object.fromEntries(JSON.parse(fs.readFileSync(indexFile, "utf-8")).map((e: {
                    file: string;
                }) => [e.file, e]))
                : {};
            const calls = files.flatMap((f) => parseTranscriptFile(f, fs.readFileSync(path.join(folder, f), "utf-8"), terms).map((c) => {
                const meta = index[f];
                return meta ? { ...c, title: meta.title ?? c.title, date: meta.date, duration_sec: meta.duration_sec, customer_label: meta.customer_label, persona_hint: meta.persona_hint ?? null } : c;
            }));
            results.push(createImport({ brandId, sourceType: "call", origin: `sample-data/calls (${files.length} files)`, records: callsToRecords(calls), extractAfter }));
        }
        else {
            for (const f of files) {
                const { rows, columns } = parseRows(f, fs.readFileSync(path.join(folder, f), "utf-8"));
                const mapping = guessMapping(type, columns);
                const records = rowsToRecords(type, rows, mapping);
                results.push(createImport({ brandId, sourceType: type, origin: `sample-data/${FOLDERS[type]}/${f}`, records, extractAfter }));
            }
        }
    }
    return results;
}
