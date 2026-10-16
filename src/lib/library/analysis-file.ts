import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AdReferenceRow, LibraryRefRow } from "@/db/schema";
import { env } from "../env";
export const ANALYSIS_FILE = path.resolve(process.cwd(), "backup", "reference-analysis.json.gz");
export type LibraryRecord = Omit<LibraryRefRow, "created_at"> & {
    sha256: string | null;
    bytes: number | null;
};
export interface AnalysisFile {
    version: 1;
    made_at: string;
    counts: {
        library: number;
        library_analysed: number;
        ads: number;
        ads_analysed: number;
    };
    library: LibraryRecord[];
    ads: AdReferenceRow[];
}
const slash = (p: string) => p.replace(/\\/g, "/");
const sha = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
export function readAnalysisFile(file = ANALYSIS_FILE): AnalysisFile | null {
    if (!fs.existsSync(file))
        return null;
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf-8")) as AnalysisFile;
}
export function exportAnalysis(file = ANALYSIS_FILE, log: (s: string) => void = () => undefined): AnalysisFile["counts"] & {
    hashed: number;
    media_missing: number;
    bytes: number;
} {
    const before = new Map((readAnalysisFile(file)?.library ?? []).map((r) => [r.id, r]));
    const rows = db.select().from(schema.libraryRefs).orderBy(schema.libraryRefs.id).all();
    let hashed = 0;
    let missing = 0;
    const library: LibraryRecord[] = rows.map((r, i) => {
        const { created_at: _made, ...rest } = r;
        const abs = path.join(env.SKILLS_DIR, r.file);
        const was = before.get(r.id);
        let bytes: number | null = null;
        let sha256: string | null = null;
        if (fs.existsSync(abs)) {
            bytes = fs.statSync(abs).size;
            if (was && was.sha256 && was.bytes === bytes && slash(was.file) === slash(r.file))
                sha256 = was.sha256;
            else {
                sha256 = sha(abs);
                hashed++;
                if (hashed % 1000 === 0)
                    log(`read ${hashed} media files (${i + 1} of ${rows.length})`);
            }
        }
        else {
            missing++;
            bytes = was?.bytes ?? null;
            sha256 = was?.sha256 ?? null;
        }
        return { ...rest, file: slash(r.file), thumb: r.thumb ? slash(r.thumb) : r.thumb, sha256, bytes };
    });
    const ads = db.select().from(schema.adReferences).orderBy(schema.adReferences.id).all();
    const counts = { library: library.length, library_analysed: library.filter((r) => r.analysis).length, ads: ads.length, ads_analysed: ads.filter((r) => r.analysis).length };
    const out: AnalysisFile = { version: 1, made_at: new Date().toISOString(), counts, library, ads };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 });
    fs.writeFileSync(file, gz);
    return { ...counts, hashed, media_missing: missing, bytes: gz.length };
}
function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory())
            walk(p, out);
        else
            out.push(p);
    }
    return out;
}
export interface Restored {
    added: number;
    filled: number;
    kept: number;
    media: {
        same_path: number;
        moved: number;
        missing: number;
    };
    ads: {
        added: number;
        filled: number;
        kept: number;
    };
    missing: string[];
}
export function restoreAnalysis(opts: {
    file?: string;
    force?: boolean;
    dry?: boolean;
} = {}): Restored {
    const data = readAnalysisFile(opts.file ?? ANALYSIS_FILE);
    if (!data)
        throw new Error("There is no reference analysis file. Run the export on a machine that has the database.");
    const res: Restored = { added: 0, filled: 0, kept: 0, media: { same_path: 0, moved: 0, missing: 0 }, ads: { added: 0, filled: 0, kept: 0 }, missing: [] };
    let byName: Map<string, string[]> | null = null;
    const named = (name: string) => {
        if (!byName) {
            byName = new Map();
            if (fs.existsSync(env.SKILLS_DIR))
                for (const f of walk(env.SKILLS_DIR))
                    byName.set(path.basename(f), [...(byName.get(path.basename(f)) ?? []), f]);
        }
        return byName.get(name) ?? [];
    };
    const find = (r: LibraryRecord): string | null => {
        if (fs.existsSync(path.join(env.SKILLS_DIR, r.file))) {
            res.media.same_path++;
            return r.file;
        }
        const sized = named(path.basename(r.file)).filter((f) => r.bytes == null || fs.statSync(f).size === r.bytes);
        const hit = sized.length === 1 && !r.sha256 ? sized[0] : sized.find((f) => !r.sha256 || sha(f) === r.sha256);
        if (hit) {
            res.media.moved++;
            return slash(path.relative(env.SKILLS_DIR, hit));
        }
        res.media.missing++;
        if (res.missing.length < 10)
            res.missing.push(`${r.id}: ${r.file}`);
        return null;
    };
    const have = new Map(db.select({ id: schema.libraryRefs.id, analysed: schema.libraryRefs.analyzed }).from(schema.libraryRefs).all().map((r) => [r.id, r.analysed]));
    db.transaction((tx) => {
        for (const r of data.library) {
            const { sha256: _sha, bytes: _bytes, ...row } = r;
            const file = find(r) ?? r.file;
            if (!have.has(r.id)) {
                res.added++;
                if (!opts.dry)
                    tx.insert(schema.libraryRefs).values({ ...row, file }).run();
            }
            else if (!have.get(r.id) || opts.force) {
                if (r.analysis)
                    res.filled++;
                else
                    res.kept++;
                if (!opts.dry && r.analysis)
                    tx.update(schema.libraryRefs).set({ analysis: r.analysis, analyzed: r.analyzed, tags: r.tags, type: r.type, note: r.note, craft: r.craft, usable: r.usable, file }).where(eq(schema.libraryRefs.id, r.id)).run();
            }
            else
                res.kept++;
        }
        const haveAds = new Map(db.select({ id: schema.adReferences.id, analysed: schema.adReferences.analyzed }).from(schema.adReferences).all().map((r) => [r.id, r.analysed]));
        for (const a of data.ads) {
            if (!haveAds.has(a.id)) {
                res.ads.added++;
                if (!opts.dry)
                    tx.insert(schema.adReferences).values(a).run();
            }
            else if ((!haveAds.get(a.id) || opts.force) && a.analysis) {
                res.ads.filled++;
                if (!opts.dry)
                    tx.update(schema.adReferences).set({ analysis: a.analysis, analyzed: a.analyzed, analysis_status: a.analysis_status, tags: a.tags, tags_raw: a.tags_raw, awareness: a.awareness, sophistication: a.sophistication, title: a.title }).where(eq(schema.adReferences.id, a.id)).run();
            }
            else
                res.ads.kept++;
        }
    });
    return res;
}
