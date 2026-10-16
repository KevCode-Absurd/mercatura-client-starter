import fs from "node:fs";
import path from "node:path";
import { brandBrainDir, brandBrainPath, BrandBrainSchema, writeBrandBrainFile, type BrandBrain } from "./brand-brain";
import { logChange } from "./brain/docs";
import { isBrandLine } from "./personas/brand-lines";
import { getBrandRow } from "./brands";
import { env } from "./env";
import { callStructured } from "./llm/gateway";
import { renderPrompt } from "./prompts";
import { readSiteFolder, SHARED_FILE, SITE_FOLDER } from "./site-pages";
const MAX_CHARS = 120000;
const MIN_CUT = 4000;
const FIRST = ["products-and-positioning.md", "offers.md", "brand-guidelines.md", "customer-avatars.md", "winning-ads.md"];
const INDEX = "website.md";
const LEFT_OUT = new Set(["readme.md", "recent-changes.md", "brand-tokens.md"]);
export interface BrandFile {
    name: string;
    text: string;
}
export function orderBrandFiles(files: BrandFile[]): BrandFile[] {
    const kept = files.filter((f) => !LEFT_OUT.has(f.name.toLowerCase()));
    const rank = (f: BrandFile) => {
        const n = f.name.toLowerCase();
        const i = FIRST.indexOf(n);
        if (i >= 0)
            return i;
        if (n === INDEX)
            return FIRST.length;
        if (n.startsWith(`${SITE_FOLDER}/`))
            return FIRST.length + 1;
        return FIRST.length + 2;
    };
    return kept
        .map((f, i) => ({ f, i, r: rank(f) }))
        .sort((a, b) => a.r - b.r || (a.r === FIRST.length + 1 ? a.i - b.i : a.f.name.localeCompare(b.f.name)))
        .map((x) => x.f);
}
export function brandMarkdownFiles(brandId: string): BrandFile[] {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Unknown brand ${brandId}`);
    const dir = brandBrainDir(row.dir);
    if (!fs.existsSync(dir))
        return [];
    return orderBrandFiles(fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({ name: f, text: fs.readFileSync(path.join(dir, f), "utf-8") })));
}
export function brandConvertFiles(brandId: string): BrandFile[] {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Unknown brand ${brandId}`);
    const files = brandMarkdownFiles(brandId);
    const site = readSiteFolder(brandBrainDir(row.dir));
    if (site) {
        for (const p of site.pages)
            files.push({ name: p.file, text: `Page: ${p.where}\nKind: ${p.kind}\n\n${p.text}` });
        if (site.shared.length)
            files.push({ name: `${SITE_FOLDER}/${SHARED_FILE}`, text: `Lines that stood on every page of the site (the menu, the footer, notices, the standing offer), kept once:\n\n${site.shared.join("\n")}` });
    }
    return orderBrandFiles(files);
}
export interface PackedFiles {
    joined: string;
    dropped: {
        name: string;
        chars: number;
    }[];
    cut: {
        name: string;
        kept: number;
        of: number;
    } | null;
}
export function packFiles(files: BrandFile[], max = MAX_CHARS): PackedFiles {
    const parts: string[] = [];
    const dropped: PackedFiles["dropped"] = [];
    let cut: PackedFiles["cut"] = null;
    let used = 0;
    for (const f of files) {
        const block = `### ${f.name}\n\n${f.text}`;
        const need = block.length + (parts.length ? 2 : 0);
        const room = max - used;
        if (need <= room) {
            parts.push(block);
            used += need;
            continue;
        }
        if (!cut && room - (parts.length ? 2 : 0) >= MIN_CUT) {
            const keep = room - (parts.length ? 2 : 0) - 80;
            parts.push(`${block.slice(0, keep)}\n\n[${f.name}: ${(block.length - keep).toLocaleString("en-US")} more characters did not fit]`);
            cut = { name: f.name, kept: keep, of: block.length };
            used = max;
            continue;
        }
        dropped.push({ name: f.name, chars: f.text.length });
    }
    return { joined: parts.join("\n\n"), dropped, cut };
}
export function cutNote(p: PackedFiles): string {
    const bits: string[] = [];
    if (p.cut)
        bits.push(`${p.cut.name} was cut to ${p.cut.kept.toLocaleString("en-US")} of ${p.cut.of.toLocaleString("en-US")} characters`);
    if (p.dropped.length)
        bits.push(`${p.dropped.length === 1 ? "this file" : "these files"} did not fit: ${p.dropped.map((d) => `${d.name} (${d.chars.toLocaleString("en-US")} characters)`).join(", ")}`);
    return bits.length ? `Building the brand brain read ${MAX_CHARS.toLocaleString("en-US")} characters of the brand's files. ${bits.join("; ")}.` : "";
}
export async function convertBrandBrain(brandId: string): Promise<BrandBrain> {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Unknown brand ${brandId}`);
    const files = brandConvertFiles(brandId);
    if (!files.length)
        throw new Error("There is nothing to build from yet. Read the brand's website, paste what you have, or answer the founder questionnaire first.");
    const packed = packFiles(files);
    const p = renderPrompt("brand-convert", { files: packed.joined });
    const res = await callStructured({
        brandId,
        task: "brand_convert",
        model: env.MODEL_EXTRACT,
        system: p.system,
        user: p.user,
        schema: BrandBrainSchema,
        effort: "medium",
        refType: "brand",
        refId: brandId,
    });
    const personas = res.data.personas.map((x) => ({ ...x, language: x.language.filter((l) => !isBrandLine(l, row.dir)) }));
    const brain = writeBrandBrainFile(brandBrainPath(row.dir), { ...res.data, personas });
    const note = cutNote(packed);
    if (note) {
        try {
            logChange(brandId, { type: "Setup", description: note });
        }
        catch {
        }
    }
    return brain;
}
