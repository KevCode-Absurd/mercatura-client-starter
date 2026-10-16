import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LibraryRefRow } from "@/db/schema";
import { env, SHARED_BRAND } from "../env";
import { geminiJson } from "../llm/gemini";
import { BUCKET_GUIDE, BUCKET_OTHER, PDP_BUCKETS, bucketFolder, bucketOf, pdpBucket } from "./buckets";
import { PDP_TYPES, pdpType } from "./taxonomy";
export const TEMPLATE_ROOT = "product-image-templates";
const abs = (...rel: string[]) => path.join(env.SKILLS_DIR, TEMPLATE_ROOT, ...rel);
const posix = (p: string) => p.split(path.sep).join("/");
export const templateFrame = (bucketId: string): string | null => {
    const b = pdpBucket(bucketId);
    const file = b ? abs("template", b.frame) : "";
    return file && fs.existsSync(file) ? file : null;
};
interface TemplateRef {
    id: string;
    file: string;
    bucket: string;
    type: string;
    brand: string;
    note: string;
    source_folder: string;
}
const readJson = <T>(file: string, fallback: T): T => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf-8")) as T) : fallback);
const writeJson = (file: string, data: unknown) => fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
const Sorted = z.object({
    bucket: z.string(),
    why: z.string().default(""),
    type: z.string().default(""),
    brand: z.string().default(""),
    note: z.string().default(""),
});
const SYSTEM = `You sort product-page gallery images into the frames of an ecommerce product page template.

${BUCKET_GUIDE}

Return JSON:
- bucket: 1 of the ids above.
- why: 1 short sentence.
- type: the closest gallery type, 1 of: ${PDP_TYPES.map((t) => t.id).join(", ")}.
- brand: the brand name visible on the image, or an empty string.
- note: 1 sentence a curator would write: what the image does and the device it uses, without the brand's own claims.`;
export const SORT_COPY_PX = 384;
export async function sortCopy(file: string, id: string): Promise<string> {
    fs.mkdirSync(abs("_thumbs"), { recursive: true });
    const out = abs("_thumbs", `${id}_sort.jpg`);
    await sharp(file).rotate().resize(SORT_COPY_PX, SORT_COPY_PX, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(out);
    return out;
}
export async function sortIntoBucket(file: string, hint: string, refId: string, opts: {
    small?: boolean;
} = {}): Promise<z.infer<typeof Sorted>> {
    const sent = opts.small ? await sortCopy(file, refId.replace(/[^\w.-]+/g, "_")) : file;
    try {
        const out = await geminiJson({ brandId: SHARED_BRAND, task: "bucket_sort", model: env.MODEL_REFERENCE, system: SYSTEM, user: hint || "Sort this image.", schema: Sorted, images: [sent], effort: "low", maxTokens: 1500, refType: "library", refId });
        return { ...out, bucket: pdpBucket(out.bucket) ? out.bucket : BUCKET_OTHER, type: pdpType(out.type) ? out.type : "" };
    }
    finally {
        if (sent !== file)
            fs.rmSync(sent, { force: true });
    }
}
async function pool<T>(items: T[], n: number, fn: (item: T, i: number) => Promise<void>) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
        for (;;) {
            const i = next++;
            if (i >= items.length)
                return;
            await fn(items[i], i);
        }
    }));
}
const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(png|jpe?g|webp)$/i.test(e.name) ? [path.join(dir, e.name)] : []));
export async function buildTemplates(source: string, log: (m: string) => void = () => undefined): Promise<{
    frames: number;
    added: number;
    failed: number;
}> {
    const dirs = fs.readdirSync(source, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(source, d.name));
    const frameDir = dirs.find((d) => fs.readdirSync(d).some((f) => /^Template Framework/i.test(f)));
    if (!frameDir)
        throw new Error(`No folder under ${source} holds a "Template Framework" image.`);
    fs.mkdirSync(abs("template"), { recursive: true });
    const frames = fs.readdirSync(frameDir).filter((f) => /^Frame \d+\.png$/i.test(f)).sort();
    if (frames.length !== PDP_BUCKETS.length)
        throw new Error(`Expected ${PDP_BUCKETS.length} frames in ${frameDir}, found ${frames.length}.`);
    frames.forEach((f, i) => fs.copyFileSync(path.join(frameDir, f), abs("template", PDP_BUCKETS[i].frame)));
    const sheet = fs.readdirSync(frameDir).find((f) => /^Template Framework/i.test(f))!;
    await sharp(path.join(frameDir, sheet), { limitInputPixels: false }).resize({ width: 4800 }).jpeg({ quality: 86 }).toFile(abs("template", "framework.jpg"));
    log(`${frames.length} frames copied`);
    const manifest = readJson<{
        references: (TemplateRef & {
            hash?: string;
        })[];
    }>(abs("REFERENCES.json"), { references: [] });
    const known = new Set(manifest.references.map((r) => r.hash));
    const fresh: {
        file: string;
        hash: string;
        folder: string;
    }[] = [];
    for (const dir of dirs.filter((d) => d !== frameDir))
        for (const file of walk(dir)) {
            const hash = crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");
            if (known.has(hash))
                continue;
            known.add(hash);
            fresh.push({ file, hash, folder: posix(path.relative(dir, path.dirname(file))) });
        }
    log(`${fresh.length} new example${fresh.length === 1 ? "" : "s"} to sort`);
    let n = Math.max(0, ...manifest.references.map((r) => Number(r.id.match(/\d+$/)?.[0] ?? 0)));
    let failed = 0;
    const added: (TemplateRef & {
        hash: string;
    })[] = [];
    await pool(fresh, 6, async (f) => {
        try {
            const s = await sortIntoBucket(f.file, f.folder ? `The curator filed this under "${f.folder}".` : "", path.basename(f.file));
            added.push({ id: "", file: f.file, bucket: s.bucket, type: s.type || pdpBucket(s.bucket)?.type || "in-use", brand: s.brand.trim(), note: s.note.trim(), source_folder: f.folder, hash: f.hash });
        }
        catch (e) {
            failed++;
            log(`  could not sort ${path.basename(f.file)}: ${(e as Error).message.slice(0, 120)}`);
        }
    });
    for (const a of added.sort((x, y) => x.file.localeCompare(y.file))) {
        a.id = `pdpt_${String(++n).padStart(3, "0")}`;
        const rel = posix(path.join("references", bucketFolder(a.bucket), `${a.id}${path.extname(a.file).toLowerCase()}`));
        fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
        fs.copyFileSync(a.file, abs(rel));
        a.file = rel;
    }
    manifest.references.push(...added);
    manifest.references.sort((a, b) => a.id.localeCompare(b.id));
    writeJson(abs("REFERENCES.json"), manifest);
    return { frames: frames.length, added: added.length, failed };
}
export async function importTemplateRefs(): Promise<{
    imported: number;
    missing: number;
}> {
    const manifest = readJson<{
        references: TemplateRef[];
    }>(abs("REFERENCES.json"), { references: [] });
    fs.mkdirSync(abs("_thumbs"), { recursive: true });
    let imported = 0;
    let missing = 0;
    for (const r of manifest.references) {
        const file = abs(r.file);
        if (!fs.existsSync(file)) {
            missing++;
            continue;
        }
        const thumb = abs("_thumbs", `${r.id}.jpg`);
        let width: number | null = null;
        let height: number | null = null;
        try {
            const meta = await sharp(file).metadata();
            width = meta.width ?? null;
            height = meta.height ?? null;
            if (!fs.existsSync(thumb))
                await sharp(file).rotate().resize(480, 480, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78 }).toFile(thumb);
        }
        catch {
            missing++;
            continue;
        }
        const t = pdpType(r.type);
        const row = { library: "pdp" as const, file: posix(path.join(TEMPLATE_ROOT, r.file)), thumb: posix(path.join(TEMPLATE_ROOT, "_thumbs", `${r.id}.jpg`)), type: r.type, group_name: t?.group ?? null, brand: r.brand || null, note: r.note, width, height };
        const existing = db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.id, r.id)).get();
        if (existing)
            db.update(schema.libraryRefs).set({ ...row, tags: { ...existing.tags, bucket: r.bucket, source: "template" } }).where(eq(schema.libraryRefs.id, r.id)).run();
        else
            db.insert(schema.libraryRefs).values({ id: r.id, ...row, vertical: "", tags: { bucket: r.bucket, source: "template" }, analysis: null, analyzed: false }).run();
        imported++;
    }
    return { imported, missing };
}
export function applyBuckets(): number {
    const map = readJson<{
        buckets: Record<string, string>;
    }>(abs("BUCKETS.json"), { buckets: {} }).buckets;
    let n = 0;
    for (const row of db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "pdp")).all()) {
        const bucket = map[row.id];
        if (!bucket || row.tags.bucket === bucket)
            continue;
        db.update(schema.libraryRefs).set({ tags: { ...row.tags, bucket } }).where(eq(schema.libraryRefs.id, row.id)).run();
        n++;
    }
    return n;
}
export function recordBuckets(): number {
    const file = abs("BUCKETS.json");
    const data = readJson<{
        buckets: Record<string, string>;
    }>(file, { buckets: {} });
    for (const r of db.select({ id: schema.libraryRefs.id, tags: schema.libraryRefs.tags }).from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "pdp")).all())
        if (r.tags.bucket)
            data.buckets[r.id] = r.tags.bucket;
    data.buckets = Object.fromEntries(Object.entries(data.buckets).sort(([a], [b]) => a.localeCompare(b)));
    writeJson(file, data);
    writeIndex();
    return Object.keys(data.buckets).length;
}
export async function sortPdpLibrary(log: (m: string) => void = () => undefined): Promise<{
    sorted: number;
    failed: number;
    waiting: number;
}> {
    const file = abs("BUCKETS.json");
    const data = readJson<{
        buckets: Record<string, string>;
    }>(file, { buckets: {} });
    const rows = db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "pdp")).all();
    for (const r of rows)
        if (r.tags.bucket)
            data.buckets[r.id] = r.tags.bucket;
    const unsorted = rows.filter((r) => !data.buckets[r.id]);
    const todo = unsorted.filter((r) => r.analyzed);
    const waiting = unsorted.length - todo.length;
    if (waiting)
        log(`  ${waiting} reference${waiting === 1 ? "" : "s"} not analysed yet: the analysis files ${waiting === 1 ? "it" : "them"}, so ${waiting === 1 ? "it is" : "they are"} not read here`);
    let failed = 0;
    let done = 0;
    await pool(todo, 6, async (r) => {
        try {
            const s = await sortIntoBucket(path.join(env.SKILLS_DIR, r.file), `Filed in the library as "${pdpType(r.type)?.label ?? r.type}". Curator's note: ${r.note || "(none)"}`, r.id, { small: true });
            data.buckets[r.id] = s.bucket;
            db.update(schema.libraryRefs).set({ tags: { ...r.tags, bucket: s.bucket } }).where(eq(schema.libraryRefs.id, r.id)).run();
        }
        catch (e) {
            failed++;
            log(`  could not sort ${r.id}: ${(e as Error).message.slice(0, 120)}`);
        }
        if (++done % 40 === 0) {
            log(`  ${done} of ${todo.length}`);
            writeJson(file, { buckets: Object.fromEntries(Object.entries(data.buckets).sort(([a], [b]) => a.localeCompare(b))) });
        }
    });
    data.buckets = Object.fromEntries(Object.entries(data.buckets).sort(([a], [b]) => a.localeCompare(b)));
    writeJson(file, data);
    applyBuckets();
    writeIndex();
    return { sorted: todo.length - failed, failed, waiting };
}
export function writeIndex() {
    const rows = db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.library, "pdp")).all();
    const by = (id: string) => rows.filter((r: LibraryRefRow) => bucketOf(r) === id).sort((a, b) => b.craft - a.craft || a.id.localeCompare(b.id));
    const section = (id: string, title: string, intro: string) => {
        const list = by(id);
        return `## ${title} (${list.length})\n\n${intro}\n\n${list.map((r) => `- \`${r.id}\` ${r.brand ? `${r.brand}. ` : ""}${pdpType(r.type)?.label ?? r.type}${r.note ? `: ${r.note.replace(/\s+/g, " ").slice(0, 160)}` : ""} (\`${r.file}\`)`).join("\n") || "(none yet)"}`;
    };
    const md = [
        "# Product page references, by template bucket",
        "Written by the app (`pnpm templates:build`). Each reference was looked at and filed under the frame whose job it does. Edit `BUCKETS.json` to move one.",
        ...PDP_BUCKETS.map((b) => section(b.id, `${b.n}. ${b.title}`, `Frame: \`template/${b.frame}\`. ${b.question}`)),
        section(BUCKET_OTHER, "Other", "Useful gallery images that are none of the 12 frames: plain packshots, facts panels, size charts, founder and sourcing stories."),
    ].join("\n\n");
    fs.writeFileSync(abs("BUCKETS.md"), `${md}\n`, "utf-8");
}
