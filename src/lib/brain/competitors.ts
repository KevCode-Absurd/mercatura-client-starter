import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow, loadBrandBrain } from "../brands";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { redactContactPii } from "../pipeline/redact";
import { renderPrompt } from "../prompts";
import { cleanSite, markHeadings, readSiteFolder, writeSiteFolder } from "../site-pages";
import { logChange, readDoc, sec, today, writeDoc } from "./docs";
import { addSection, childrenOf, fieldItem, fieldValue, fieldsOf, itemsOf, noLongDash, plainText, sectionById, setField, slug, type Block, type Doc, type Section } from "./md";
export const PROFILE_FIELDS = [
    { key: "URL", hint: "Their website" },
    { key: "What they sell", hint: "The product, in a line" },
    { key: "Positioning", hint: "Their angle in 5 to 10 words" },
    { key: "Homepage headline", hint: "Word for word, as it stands on their site" },
    { key: "Who they sell to", hint: "Their buyer: age, sex, what that person wants" },
    { key: "Price", hint: "Per month or per serving, with the date" },
    { key: "Offer", hint: "The discount, the guarantee, the gifts" },
    { key: "Proof they use", hint: "Studies, certificates, endorsers, review counts" },
    { key: "What they do well", hint: "Their real strength" },
    { key: "Where they are weak", hint: "What they miss or do badly" },
    { key: "What their customers complain about", hint: "In customers' words, with where it was said" },
    { key: "Ad angles they push", hint: "What their ads lead with" },
    { key: "Gap we can own", hint: "What this brand can say that they can't" },
    { key: "How we answer them", hint: "The line to use when a buyer names them" },
    { key: "Sources", hint: "Where the above was read" },
    { key: "Last checked", hint: "The date" },
] as const;
export type ProfileKey = (typeof PROFILE_FIELDS)[number]["key"];
export interface Competitor {
    id: string;
    name: string;
    fields: Record<string, string>;
    filled: number;
}
export function competitorsOf(doc: Doc): Competitor[] {
    const root = sec(doc, "profiles");
    if (!root)
        return [];
    return childrenOf(doc, root)
        .filter((s) => s.level === root.level + 1)
        .map((s) => {
        const fields = Object.fromEntries(fieldsOf(s).map((f) => [f.key, f.value]));
        return { id: s.id, name: s.title, fields, filled: PROFILE_FIELDS.filter((f) => fieldValue(s, f.key).trim()).length };
    });
}
export const competitors = (brandId: string) => competitorsOf(readDoc(brandId, "competitors").doc);
const short = (s: string, n: number) => {
    const t = plainText(s).replace(/\s+/g, " ").trim();
    return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
export function syncLandscape(doc: Doc): void {
    const list = competitorsOf(doc);
    if (!list.length)
        return;
    const head = ["Competitor", "URL", "Positioning", "Price", "What they do well", "Gap we can own"];
    const rows = list.map((c) => [c.name, c.fields["URL"] ?? "", short(c.fields["Positioning"] ?? "", 140), short(c.fields["Price"] ?? "", 160), short(c.fields["What they do well"] ?? "", 200), short(c.fields["Gap we can own"] ?? "", 220)]);
    let s = sec(doc, "landscape");
    if (!s) {
        s = { id: "competitive-landscape", level: 2, title: "Competitive landscape", blocks: [] };
        doc.sections.unshift(s);
    }
    const others = s.blocks.filter((b) => b.kind !== "table");
    s.blocks = [{ kind: "table", head, rows }, ...others];
}
const blankProfile = (url: string): Block => ({ kind: "list", ordered: false, items: PROFILE_FIELDS.map((f) => fieldItem(f.key, f.key === "URL" ? url : "")) });
export function addCompetitor(brandId: string, input: {
    name: string;
    url?: string;
}): string {
    const name = noLongDash(input.name).replace(/[\r\n#|]+/g, " ").trim().slice(0, 80);
    if (!name)
        throw new Error("Give the competitor's name.");
    const url = (input.url ?? "").trim().slice(0, 200);
    const { doc } = readDoc(brandId, "competitors");
    if (competitorsOf(doc).some((c) => slug(c.name) === slug(name)))
        throw new Error(`${name} is already in the list.`);
    if (!sec(doc, "profiles")) {
        const land = sec(doc, "landscape");
        addSection(doc, { level: 2, title: "Competitor profiles", blocks: [] }, land?.title);
    }
    const s = addSection(doc, { level: 3, title: name, blocks: [blankProfile(url)] }, "Competitor profiles");
    syncLandscape(doc);
    writeDoc(brandId, "competitors", doc);
    logChange(brandId, { type: "Competitor", description: `${name} added to the competitors.` });
    return s.id;
}
export function removeCompetitor(brandId: string, sectionId: string): void {
    const { doc } = readDoc(brandId, "competitors");
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That competitor is not in the list any more.");
    doc.sections = doc.sections.filter((x) => x !== s);
    const land = sec(doc, "landscape");
    const t = land?.blocks.find((b): b is Extract<Block, {
        kind: "table";
    }> => b.kind === "table");
    if (t)
        t.rows = t.rows.filter((r) => slug(r[0] ?? "") !== slug(s.title));
    syncLandscape(doc);
    writeDoc(brandId, "competitors", doc);
}
export function saveCompetitor(brandId: string, sectionId: string, fields: Record<string, string>): void {
    const { doc } = readDoc(brandId, "competitors");
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That competitor is not in the list any more.");
    for (const f of PROFILE_FIELDS)
        if (f.key in fields)
            setField(s, f.key, noLongDash(String(fields[f.key] ?? "")).replace(/\r?\n+/g, " ").trim().slice(0, 1500));
    syncLandscape(doc);
    writeDoc(brandId, "competitors", doc);
}
const competitorsDir = (brandId: string) => path.join(brandBrainDir(getBrandRow(brandId)!.dir), "competitors");
const siteFile = (brandId: string, name: string) => path.join(competitorsDir(brandId), `${slug(name)}.md`);
const siteFolder = (name: string) => `${slug(name)}/site`;
export function competitorSite(brandId: string, name: string): {
    text: string;
    at: string;
} | null {
    const read = readSiteFolder(competitorsDir(brandId), siteFolder(name));
    if (read) {
        const pages = read.pages.map((p) => `## ${p.title}\n\nPage: ${p.where}\n\n${p.text}`);
        if (read.shared.length)
            pages.push(`## Lines on every page of the site (menu, footer, notices)\n\n${read.shared.join("\n")}`);
        return { text: pages.join("\n\n"), at: read.date };
    }
    const f = siteFile(brandId, name);
    if (!fs.existsSync(f))
        return null;
    const text = fs.readFileSync(f, "utf-8");
    return { text, at: /read on (\d{4}-\d{2}-\d{2})/.exec(text)?.[1] ?? "" };
}
export async function readCompetitorSite(brandId: string, sectionId: string): Promise<{
    pages: number;
    chars: number;
}> {
    const { doc } = readDoc(brandId, "competitors");
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That competitor is not in the list any more.");
    const url = fieldValue(s, "URL").split(/\s/)[0];
    if (!url)
        throw new Error("Give the competitor's website first.");
    const { readSite } = await import("../claim-sources");
    const pages = await readSite(url, 4);
    if (!pages.length)
        throw new Error("The site opened, but no page had enough text to read.");
    const site = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const read = cleanSite(pages.map((p) => ({ where: p.where, title: p.title, text: markHeadings(redactContactPii(p.text).text, p.headings ?? []) })), site);
    const out = writeSiteFolder(competitorsDir(brandId), read, { folder: siteFolder(s.title), index: `${slug(s.title)}.md` });
    setField(s, "Last checked", today());
    writeDoc(brandId, "competitors", doc);
    return { pages: read.pages.length, chars: out.chars };
}
const DraftOut = z.object({
    what_they_sell: z.string().default(""),
    positioning: z.string().default(""),
    homepage_headline: z.string().default(""),
    who_they_sell_to: z.string().default(""),
    price: z.string().default(""),
    offer: z.string().default(""),
    proof: z.string().default(""),
    does_well: z.string().default(""),
    weak: z.string().default(""),
    ad_angles: z.string().default(""),
    gap: z.string().default(""),
    answer: z.string().default(""),
});
const DRAFT_TO_FIELD: Record<keyof z.infer<typeof DraftOut>, ProfileKey> = {
    what_they_sell: "What they sell",
    positioning: "Positioning",
    homepage_headline: "Homepage headline",
    who_they_sell_to: "Who they sell to",
    price: "Price",
    offer: "Offer",
    proof: "Proof they use",
    does_well: "What they do well",
    weak: "Where they are weak",
    ad_angles: "Ad angles they push",
    gap: "Gap we can own",
    answer: "How we answer them",
};
function ownBrand(brandId: string): string {
    const b = loadBrandBrain(brandId);
    const usps = itemsOf(sec(readDoc(brandId, "guidelines").doc, "usps")).slice(0, 5).map((u) => `- ${short(u, 220)}`);
    return [`${b.brand.name}: ${b.brand.one_liner}`, `Category: ${b.brand.category}. Market: ${b.brand.market}.`, `Products: ${b.products.map((p) => p.name).join("; ")}`, `Prices: ${b.offers.slice(0, 4).map((o) => `${o.name} ${b.brand.currency} ${o.price}`).join("; ")}`, usps.length ? `Its selling points:\n${usps.join("\n")}` : ""].filter(Boolean).join("\n");
}
export async function draftCompetitor(brandId: string, sectionId: string): Promise<{
    filled: string[];
}> {
    if (!llmEnabled())
        throw new Error("Drafting a profile from a competitor's site needs live mode. The fields can be filled by hand.");
    const { doc } = readDoc(brandId, "competitors");
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That competitor is not in the list any more.");
    const site = competitorSite(brandId, s.title);
    if (!site)
        throw new Error("Read the competitor's site first.");
    const p = renderPrompt("competitor-profile", { competitor: s.title, brand: ownBrand(brandId), pages: site.text.slice(0, 40000) });
    const out = await structuredJson({ brandId, task: "competitor_profile", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: DraftOut, effort: "medium", maxTokens: 3000, refType: "brand", refId: brandId });
    const hay = site.text.toLowerCase().replace(/\s+/g, " ");
    const filled: string[] = [];
    for (const [k, key] of Object.entries(DRAFT_TO_FIELD) as [
        keyof z.infer<typeof DraftOut>,
        ProfileKey
    ][]) {
        let v = noLongDash(out[k] ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
        if (!v || fieldValue(s, key).trim())
            continue;
        if (k === "homepage_headline" && !hay.includes(v.toLowerCase().replace(/^["“]|["”]$/g, "")))
            continue;
        if (k === "homepage_headline")
            v = `"${v.replace(/^["“]|["”]$/g, "")}"`;
        setField(s, key, v);
        filled.push(key);
    }
    if (!fieldValue(s, "Sources").trim())
        setField(s, "Sources", `Their own website, read on ${site.at || today()}`);
    setField(s, "Last checked", today());
    syncLandscape(doc);
    writeDoc(brandId, "competitors", doc);
    return { filled };
}
export function competitorLines(doc: Doc, max = 5): string[] {
    return competitorsOf(doc)
        .slice(0, max)
        .map((c) => {
        const gap = c.fields["Gap we can own"] || "";
        const weak = c.fields["Where they are weak"] || "";
        const pos = c.fields["Positioning"] || "";
        if (!gap && !weak && !pos)
            return "";
        return `${c.name}${pos ? ` (${short(pos, 90)})` : ""}: ${short(gap || weak, 200)}`;
    })
        .filter(Boolean);
}
export const sectionOfCompetitor = (doc: Doc, id: string): Section | undefined => sectionById(doc, id);
