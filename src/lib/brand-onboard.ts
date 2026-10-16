import fs from "node:fs";
import path from "node:path";
import { brandBrainDir } from "./brand-brain";
import { getBrandRow } from "./brands";
import { readSite } from "./claim-sources";
import { redactContactPii } from "./pipeline/redact";
import { cleanSite, markHeadings, readSiteFolder, writeSiteFolder, type SiteRead } from "./site-pages";
export const WEBSITE_FILE = "website.md";
export const NOTES_FILE = "notes.md";
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    const dir = brandBrainDir(row.dir);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
export async function saveSiteAsMarkdown(brandId: string, url: string): Promise<{
    pages: number;
    chars: number;
    removed: number;
    file: string;
}> {
    const address = url.trim();
    if (!address)
        throw new Error("Give the website address.");
    const pages = await readSite(address, 8);
    if (!pages.length)
        throw new Error("The site opened, but no page had enough text to read. Check the address, or paste the brand's details instead.");
    const site = /^https?:\/\//i.test(address) ? address : `https://${address}`;
    const read = cleanSite(pages.map((p) => ({ where: p.where, title: p.title, text: markHeadings(redactContactPii(p.text).text, p.headings ?? []) })), site);
    const out = writeSiteFolder(dirOf(brandId), read, { index: WEBSITE_FILE });
    return { pages: read.pages.length, chars: out.chars, removed: out.removed, file: out.index };
}
export function storedSite(brandId: string): SiteRead | null {
    return readSiteFolder(dirOf(brandId));
}
export function saveBrandNotes(brandId: string, text: string): {
    chars: number;
} {
    const file = path.join(dirOf(brandId), NOTES_FILE);
    const clean = redactContactPii(text.trim().slice(0, 60000)).text;
    if (!clean) {
        if (fs.existsSync(file))
            fs.unlinkSync(file);
        return { chars: 0 };
    }
    fs.writeFileSync(file, `# Notes about the brand, pasted on ${new Date().toISOString().slice(0, 10)}\n\n${clean}\n`, "utf-8");
    return { chars: clean.length };
}
export function readBrandNotes(brandId: string): string {
    const file = path.join(dirOf(brandId), NOTES_FILE);
    if (!fs.existsSync(file))
        return "";
    return fs.readFileSync(file, "utf-8").replace(/^# Notes about the brand[^\n]*\n\n/, "").trim();
}
