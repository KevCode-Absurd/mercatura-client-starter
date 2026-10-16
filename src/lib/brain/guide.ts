import fs from "node:fs";
import path from "node:path";
import { brandBrainDir } from "../brand-brain";
import { loadBrandLook, type BrandLook } from "../brand-look";
import { getBrandRow } from "../brands";
import { readDoc, sec, today, writeDoc } from "./docs";
import { fieldValue, fieldsOf, itemsOf, plainText, setField, tableOf, textOf, type Block, type Doc } from "./md";
export interface GuideColor {
    name: string;
    hex: string;
    role: string;
    use: string;
}
export interface GuideFont {
    role: string;
    family: string;
    weight: string;
    letterCase: string;
    tracking: string;
    stack: string;
    note: string;
}
export interface GuideModel {
    brand: string;
    site: string;
    date: string;
    colors: GuideColor[];
    fonts: GuideFont[];
    button: string;
    aesthetic: string;
    paletteStory: string;
    typeStory: string;
    personality: string;
    writesLike: string;
    dos: string[];
    donts: string[];
    tone: {
        context: string;
        tone: string;
    }[];
    neverSay: string;
    neverShow: string;
    always: string;
    phrases: string[];
    usps: string[];
    imagery: string[];
}
const HEX = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i;
const title = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
export function inkOn(hex: string): "#000000" | "#ffffff" {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
}
function colorsOf(doc: Doc, look: BrandLook | null): GuideColor[] {
    const fromLook: GuideColor[] = (look?.palette ?? []).map((c) => ({ name: title(c.name), hex: c.hex.toLowerCase(), role: c.role, use: c.use }));
    const rows = tableOf(sec(doc, "palette"))?.rows ?? [];
    const fromDoc: GuideColor[] = rows
        .filter((r) => HEX.test(r[1] ?? ""))
        .map((r) => {
        const role = plainText(r[2] ?? "");
        return { name: plainText(r[0] ?? ""), hex: HEX.exec(r[1])![0].toLowerCase(), role: role.split(":")[0].toLowerCase(), use: role.includes(":") ? role.split(":").slice(1).join(":").trim() : role };
    });
    const seen = new Set(fromDoc.map((c) => c.hex));
    return [...fromDoc, ...fromLook.filter((c) => !seen.has(c.hex))];
}
export function buildGuide(brand: string, doc: Doc, look: BrandLook | null): GuideModel {
    const voice = sec(doc, "voice");
    const rails = sec(doc, "guardrails");
    const colors = colorsOf(doc, look);
    const fonts: GuideFont[] = (look?.fonts ?? []).map((f) => ({ role: f.role, family: f.family, weight: f.weight, letterCase: f.letter_case, tracking: f.tracking, stack: f.stack, note: f.attributes }));
    if (!fonts.length)
        for (const f of fieldsOf(sec(doc, "typography")))
            if (f.value.trim() && !/not captured/i.test(f.value))
                fonts.push({ role: f.key.toLowerCase(), family: f.value.split(",")[0].trim(), weight: "", letterCase: "", tracking: "", stack: f.value.split(",")[0].trim(), note: f.value });
    const primary = colors.find((c) => /primary/.test(c.role)) ?? colors[0];
    const action = colors.find((c) => /cta|accent|action/.test(c.role) && c !== primary);
    const written = textOf(sec(doc, "palette"));
    const families = [...new Set(fonts.map((f) => f.family))];
    const head = fonts.find((f) => /head/.test(f.role));
    const body = fonts.find((f) => /body/.test(f.role));
    return {
        brand,
        site: look?.site_url ?? fieldValue(sec(doc, "overview"), "Website"),
        date: today(),
        colors,
        fonts,
        button: look?.button ?? "",
        aesthetic: look?.aesthetic ?? "",
        paletteStory: written || (primary ? `${primary.name} carries the brand${primary.use ? ` (${primary.use})` : ""}.${action ? ` ${action.name} is for action${action.use ? `: ${action.use}` : ""}.` : ""}` : "The colours have not been read yet."),
        typeStory: textOf(sec(doc, "typography")) || (head && body && head.family === body.family ? `1 family does both jobs: ${head.family} at ${head.weight} for headings, at ${body.weight} for reading.` : head && body ? `${head.family} speaks first; ${body.family} does the explaining.` : "The typefaces have not been read yet."),
        personality: fieldValue(voice, "Personality"),
        writesLike: fieldValue(voice, "Writes like"),
        dos: itemsOf(sec(doc, "voiceDo")).map(plainText),
        donts: itemsOf(sec(doc, "voiceDont")).map(plainText),
        tone: (tableOf(sec(doc, "tone"))?.rows ?? []).filter((r) => (r[1] ?? "").trim()).map((r) => ({ context: plainText(r[0]), tone: plainText(r[1]) })),
        neverSay: plainText(fieldValue(rails, "Never say")),
        neverShow: plainText(fieldValue(rails, "Never show")),
        always: plainText(fieldValue(rails, "Always")),
        phrases: itemsOf(sec(doc, "phrases")).map((p) => plainText(p).replace(/^["“]|["”]$/g, "")),
        usps: itemsOf(sec(doc, "usps")).map((u) => plainText(u).split(/(?<=[.!?])\s/)[0]),
        imagery: [...itemsOf(sec(doc, "photography")), ...itemsOf(sec(doc, "imagery"))].map(plainText),
    };
}
export const guideModel = (brandId: string): GuideModel => buildGuide(getBrandRow(brandId)?.name ?? "Brand", readDoc(brandId, "guidelines").doc, loadBrandLook(brandId));
const varName = (c: GuideColor, taken: Set<string>) => {
    let n = `--${(c.role && c.role !== "other" ? c.role : c.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "color"}`;
    let k = 2;
    const base = n;
    while (taken.has(n))
        n = `${base}-${k++}`;
    taken.add(n);
    return n;
};
export function tokensMd(m: GuideModel): string {
    const taken = new Set<string>();
    const vars = m.colors.map((c) => ({ c, v: varName(c, taken) }));
    const fams = [...new Set(m.fonts.map((f) => f.family))];
    return [
        `# Brand tokens: ${m.brand}`,
        `> Made on ${m.date} from the brand look read off ${m.site || "the site"} and the brand guidelines.`,
        "## Colours",
        vars.map(({ c }) => `- ${c.name}: \`${c.hex}\` (${[c.role, c.use].filter(Boolean).join(": ")})`).join("\n") || "- None read yet.",
        "## CSS variables",
        "```css\n:root {\n" + [...vars.map(({ c, v }) => `  ${v}: ${c.hex}; /* ${c.name} */`), ...m.fonts.map((f) => `  --font-${f.role}: ${f.stack};`)].join("\n") + "\n}\n```",
        "## Fonts",
        m.fonts.map((f) => `- ${title(f.role)}: ${f.family}, weight ${f.weight || "regular"}${f.letterCase ? `, ${f.letterCase} case` : ""}${f.tracking && f.tracking !== "normal" ? `, tracking ${f.tracking}` : ""}`).join("\n") || "- None read yet.",
        fams.length ? `Font families to load: ${fams.join(", ")}` : "",
        "## Buttons",
        m.button ? `- Primary: ${m.button}` : "- Not read yet.",
        "## Voice in 1 line",
        m.personality ? `${title(m.personality.split(",")[0].trim())}${m.personality.split(",").slice(1).map((x) => `. ${title(x.trim())}`).join("")}.` : "Not written yet.",
        m.writesLike ? `Writes like ${m.writesLike}.` : "",
        "## Guardrails",
        [m.neverSay && `- Never say: ${m.neverSay}`, m.neverShow && `- Never show: ${m.neverShow}`, m.always && `- Always: ${m.always}`].filter(Boolean).join("\n") || "- Not written yet.",
    ]
        .filter(Boolean)
        .join("\n\n") + "\n";
}
export function writeTokens(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error("Unknown brand.");
    const file = path.join(brandBrainDir(row.dir), "brand-tokens.md");
    fs.writeFileSync(file, tokensMd(guideModel(brandId)), "utf-8");
    return file;
}
export function lookIntoGuidelines(brandId: string): {
    colors: number;
    fonts: number;
} {
    const look = loadBrandLook(brandId);
    if (!look)
        throw new Error("The brand look has not been read yet. Read it from the site first.");
    const { doc } = readDoc(brandId, "guidelines");
    const pal = sec(doc, "palette");
    const typo = sec(doc, "typography");
    if (!pal || !typo)
        throw new Error("The guidelines have no Visual identity section yet.");
    const t = pal.blocks.find((b): b is Extract<Block, {
        kind: "table";
    }> => b.kind === "table") ?? { kind: "table" as const, head: ["Color", "Hex", "Role"], rows: [] };
    if (!pal.blocks.includes(t))
        pal.blocks.push(t);
    const kept = t.rows.filter((r) => HEX.test(r[1] ?? ""));
    const have = new Set(kept.map((r) => HEX.exec(r[1])![0].toLowerCase()));
    const fresh = look.palette.filter((c) => !have.has(c.hex.toLowerCase())).map((c) => [title(c.name), c.hex.toLowerCase(), `${title(c.role)}: ${c.use}`]);
    t.rows = [...kept, ...fresh];
    const line = (role: string) => {
        const f = look.fonts.find((x) => x.role === role);
        return f ? `${f.family}, ${f.weight}, ${f.letter_case} case${f.tracking !== "normal" ? `, tracking ${f.tracking}` : ""} (${f.attributes})${f.use ? `. On the site: ${f.use}` : ""}` : "";
    };
    typo.blocks = typo.blocks.filter((b) => !((b.kind === "para" || b.kind === "list") && /not captured/i.test(b.kind === "para" ? b.text : b.items.join(" "))));
    let fonts = 0;
    for (const [key, role] of [["Headings", "heading"], ["Display", "display"], ["Body", "body"], ["Accent and labels", "accent"]] as const) {
        const v = line(role);
        if (!v)
            continue;
        setField(typo, key, v);
        fonts++;
    }
    writeDoc(brandId, "guidelines", doc);
    return { colors: fresh.length, fonts };
}
