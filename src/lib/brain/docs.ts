import fs from "node:fs";
import path from "node:path";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { addSection, cleanBlocks, noLongDash, parseDoc, sectionById, serializeDoc, type Block, type Doc, type Section } from "./md";
export type DocId = "brain" | "guidelines" | "products" | "avatars" | "competitors" | "winning" | "changes" | "readme";
export interface DocInfo {
    id: DocId;
    file: string;
    label: string;
    job: string;
}
export const BRAIN_DOCS: DocInfo[] = [
    { id: "brain", file: "brain.md", label: "Brain", job: "What has been learned: the diagnosis, what works, what to avoid, decisions and open questions. It grows with every piece of work." },
    { id: "guidelines", file: "brand-guidelines.md", label: "Guidelines", job: "The story, the voice, the look, the selling points and the guardrails. The foundation every writer is held to." },
    { id: "products", file: "products-and-positioning.md", label: "Products", job: "Every product with its price, features, who buys it and the angle that sells it." },
    { id: "avatars", file: "customer-avatars.md", label: "Customers", job: "The buyers, each backed by what real customers said, with their objections and the openings that reach them." },
    { id: "competitors", file: "competitors.md", label: "Competitors", job: "Who else the buyer is looking at, what each does well, and the gaps this brand can own." },
    { id: "winning", file: "winning-ads.md", label: "Winning ads", job: "The ads and angles that have worked, so new work builds on them and does not repeat them." },
    { id: "changes", file: "recent-changes.md", label: "Changes", job: "Launches, promotions, stock and price changes, newest first. Read before anything is written, so nothing stale goes out." },
    { id: "readme", file: "README.md", label: "Index", job: "What is in the folder and how to hand it to any AI." },
];
export const docInfo = (id: DocId) => BRAIN_DOCS.find((d) => d.id === id)!;
export const isDocId = (v: string): v is DocId => BRAIN_DOCS.some((d) => d.id === v);
export const HEADING = {
    about: /^about( this brand)?$/i,
    diagnosis: /^brand diagnosis/i,
    decisions: /^key decisions/i,
    works: /^what we know works/i,
    questions: /^open questions/i,
    ideas: /^ideas to explore/i,
    avoid: /^what to avoid/i,
    productNotes: /^product notes/i,
    overview: /^brand overview/i,
    voice: /^brand voice/i,
    voiceDo: /^voice do['’]?s/i,
    voiceDont: /^voice don['’]?ts/i,
    tone: /^tone by context/i,
    palette: /^colou?r palette/i,
    typography: /^typography/i,
    photography: /^photography/i,
    imagery: /^imagery do/i,
    world: /^brand world/i,
    motion: /^motion and sound/i,
    proof: /^proof on file/i,
    terms: /^delivery, returns/i,
    faq: /^questions buyers ask/i,
    usps: /^unique selling/i,
    audience: /^target audience/i,
    guardrails: /^brand guardrails/i,
    phrases: /^key phrases/i,
    pricing: /^pricing summary/i,
    catalog: /^product catalog/i,
    bestSellers: /^best sellers/i,
    bundles: /^bundles/i,
    seasonal: /^seasonal/i,
    landscape: /^competitive landscape/i,
    profiles: /^competitor profiles/i,
    differentiation: /^differentiation/i,
    gaps: /^gaps worth owning/i,
    competitorAds: /^competitor ads/i,
    changeLog: /^change log/i,
    patterns: /^pattern summary/i,
    insightBank: /^ranked insight bank/i,
    languageBank: /^customer language bank/i,
} as const;
export type HeadingKey = keyof typeof HEADING;
export const sec = (doc: Doc, key: HeadingKey): Section | undefined => doc.sections.find((s) => HEADING[key].test(s.title.trim()));
export const today = () => new Date().toISOString().slice(0, 10);
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return brandBrainDir(row.dir);
}
export const brainDocPath = (brandId: string, id: DocId) => path.join(dirOf(brandId), docInfo(id).file);
const list = (...items: string[]): Block => ({ kind: "list", ordered: false, items });
const table = (head: string[], rows: string[][] = []): Block => ({ kind: "table", head, rows });
const para = (text: string): Block => ({ kind: "para", text });
const h = (level: number, title: string, ...blocks: Block[]) => ({ level, title, blocks });
export function template(id: DocId, brandName: string): Doc {
    const stamp: Block[] = [{ kind: "quote", text: `Last updated: ${today()}` }];
    const mk = (title: string, sections: ReturnType<typeof h>[]): Doc => parseDoc(serializeDoc({ title, intro: stamp, sections: sections.map((s) => ({ id: "", ...s })) }));
    switch (id) {
        case "brain":
            return mk(`${brandName} brain`, [
                h(2, "About this brand"),
                h(2, "Brand diagnosis", list("**Market awareness level**:", "**Market sophistication**:", "**Creative diversity level**:", "**Highest-intensity persona**:", "**Biggest opportunity**:")),
                h(2, "Key decisions", table(["Date", "Decision", "Why"], [[today(), "Brand brain started in the app", "Initial setup"]])),
                h(2, "What we know works"),
                h(2, "Open questions", list("No customer reviews read yet: the avatars are inferred until they are.", "No ad account connected: winning ads are not measured.", "Competitors not analysed yet.")),
                h(2, "Ideas to explore"),
                h(2, "What to avoid"),
                h(2, "Product notes"),
            ]);
        case "guidelines":
            return mk(`Brand guidelines: ${brandName}`, [
                h(2, "Brand overview", list("**Brand story**:", "**Mission**:", "**Elevator pitch**:", "**Brand promise**:", "**Category**:", "**Website**:", "**Said aloud**:", "**The old way**:")),
                h(2, "Brand voice and tone", list("**Personality**:", "**Writes like**:", "**Humour**:")),
                h(3, "Voice do's"),
                h(3, "Voice don'ts"),
                h(3, "Tone by context", table(["Context", "Tone"], [["Website headlines", ""], ["Product descriptions", ""], ["Email subject lines", ""], ["Customer support", ""], ["Social and ads", ""]])),
                h(2, "Visual identity"),
                h(3, "Color palette", table(["Color", "Hex", "Role"])),
                h(3, "Typography", list("**Headings**:", "**Body**:", "**Accent and labels**:")),
                h(3, "Photography and imagery style"),
                h(3, "Imagery do's and don'ts", list("**Do**:", "**Don't**:")),
                h(3, "Brand world", list("**Places**:", "**Surfaces and props**:", "**Light and time of day**:", "**People**:", "**People on file**:", "**Never in frame**:")),
                h(3, "Motion and sound", list("**Pace**:", "**Camera**:", "**Sound**:", "**Voice**:", "**On-screen text**:", "**Formats in use**:")),
                h(2, "Unique selling propositions"),
                h(2, "Proof on file", table(["Proof", "Exact words", "Source and date", "May be shown as"])),
                h(2, "Target audience summary"),
                h(2, "Brand guardrails", list("**Never say**:", "**Never show**:", "**Always**:")),
                h(2, "Key phrases and taglines"),
            ]);
        case "products":
            return mk(`Products and positioning: ${brandName}`, [
                h(2, "Pricing summary", table(["Metric", "Value"], [["Price range", ""], ["Positioning tier", ""], ["Entry product", ""], ["Hero product", ""], ["Estimated order value", ""]])),
                h(2, "Product catalog"),
                h(2, "Best sellers"),
                h(2, "Bundles and offers"),
                h(2, "Seasonal / limited products"),
                h(2, "Delivery, returns and guarantee", list("**Delivery**:", "**Returns**:", "**Guarantee**:", "**Warranty**:", "**Subscription**:")),
                h(2, "Questions buyers ask"),
            ]);
        case "avatars":
            return mk(`Customer avatars: ${brandName}`, []);
        case "competitors":
            return mk(`Competitors: ${brandName}`, [
                h(2, "Competitive landscape", table(["Competitor", "URL", "Positioning", "Price", "What they do well", "Gap we can own"])),
                h(2, "Competitor profiles"),
                h(2, "Differentiation summary"),
                h(2, "Gaps worth owning"),
                h(2, "Competitor ads and messaging", table(["Competitor", "Angle they push", "Hook type", "Weakness"])),
            ]);
        case "winning":
            return mk(`Winning ads: ${brandName}`, [h(2, "Pattern summary")]);
        case "changes":
            return mk(`Recent changes: ${brandName}`, [h(2, "Change log", table(["Date", "Type", "Description"], [[today(), "Setup", "Brand brain started in the app"]]))]);
        case "readme":
            return mk(`${brandName} brand brain`, [
                h(2, "Files in this folder", table(["File", "What it contains", "When to load it"], BRAIN_DOCS.filter((d) => d.id !== "readme").map((d) => [`\`${d.file}\``, d.job, d.id === "changes" ? "Read first, every session" : d.id === "brain" || d.id === "guidelines" ? "Always" : "When the work touches it"]))),
                h(2, "How to use this folder", para("Give these files to any AI as context. Read recent-changes.md first: it says what has changed since the rest was written. Everything here can be edited on the Brand screen of the app.")),
            ]);
    }
}
export interface LoadedDoc {
    info: DocInfo;
    doc: Doc;
    exists: boolean;
    updated: string;
}
const updatedOf = (doc: Doc) => /Last updated:\s*(\d{4}-\d{2}-\d{2})/.exec(serializeDoc({ title: "", intro: doc.intro, sections: [] }))?.[1] ?? "";
export function readDoc(brandId: string, id: DocId): LoadedDoc {
    const info = docInfo(id);
    const file = brainDocPath(brandId, id);
    if (!fs.existsSync(file))
        return { info, doc: template(id, getBrandRow(brandId)?.name ?? "Brand"), exists: false, updated: "" };
    const doc = parseDoc(fs.readFileSync(file, "utf-8"));
    return { info, doc, exists: true, updated: updatedOf(doc) };
}
export function readAllDocs(brandId: string): Record<DocId, LoadedDoc> {
    return Object.fromEntries(BRAIN_DOCS.map((d) => [d.id, readDoc(brandId, d.id)])) as Record<DocId, LoadedDoc>;
}
function stamp(doc: Doc): void {
    const line = `Last updated: ${today()}`;
    for (const b of doc.intro) {
        if ((b.kind === "quote" || b.kind === "para") && /Last updated:/.test(b.text)) {
            b.text = b.text.replace(/Last updated:[^\n]*/, line);
            return;
        }
    }
    doc.intro.unshift({ kind: "quote", text: line });
}
export function writeDoc(brandId: string, id: DocId, doc: Doc): void {
    stamp(doc);
    const file = brainDocPath(brandId, id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, noLongDash(serializeDoc(doc)), "utf-8");
}
export function ensureDocs(brandId: string): string[] {
    const made: string[] = [];
    for (const d of BRAIN_DOCS) {
        if (fs.existsSync(brainDocPath(brandId, d.id)))
            continue;
        writeDoc(brandId, d.id, template(d.id, getBrandRow(brandId)?.name ?? "Brand"));
        made.push(d.file);
    }
    return made;
}
export function saveSection(brandId: string, id: DocId, sectionId: string, input: {
    title?: string;
    blocks: unknown;
}): Doc {
    const { doc } = readDoc(brandId, id);
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That section is not in the document any more. Reload the page.");
    s.blocks = cleanBlocks(input.blocks);
    const title = noLongDash(String(input.title ?? s.title)).replace(/[\r\n#]+/g, " ").trim().slice(0, 160);
    if (title)
        s.title = title;
    writeDoc(brandId, id, doc);
    return doc;
}
export function addDocSection(brandId: string, id: DocId, input: {
    title: string;
    level?: number;
    under?: string;
    blocks?: unknown;
}): Doc {
    const { doc } = readDoc(brandId, id);
    const title = noLongDash(input.title).replace(/[\r\n#]+/g, " ").trim().slice(0, 160);
    if (!title)
        throw new Error("Give the section a title.");
    addSection(doc, { level: Math.min(4, Math.max(2, input.level ?? 2)), title, blocks: input.blocks ? cleanBlocks(input.blocks) : [] }, input.under);
    writeDoc(brandId, id, doc);
    return doc;
}
export function removeDocSection(brandId: string, id: DocId, sectionId: string): Doc {
    const { doc } = readDoc(brandId, id);
    const s = sectionById(doc, sectionId);
    if (!s)
        throw new Error("That section is not in the document any more.");
    const gone = new Set<Section>([s]);
    for (const x of doc.sections.slice(doc.sections.indexOf(s) + 1)) {
        if (x.level <= s.level)
            break;
        gone.add(x);
    }
    doc.sections = doc.sections.filter((x) => !gone.has(x));
    writeDoc(brandId, id, doc);
    return doc;
}
export const CHANGE_TYPES = ["Launch", "Promo", "Offer", "Stock", "Price", "Messaging", "Competitor", "Retail", "Learning", "Setup"] as const;
export function logChange(brandId: string, entry: {
    type: string;
    description: string;
    date?: string;
}): void {
    const description = noLongDash(entry.description).replace(/\s+/g, " ").trim().slice(0, 600);
    if (!description)
        throw new Error("Say what changed.");
    const { doc } = readDoc(brandId, "changes");
    let s = sec(doc, "changeLog");
    if (!s)
        s = addSection(doc, { level: 2, title: "Change log", blocks: [] });
    let t = s.blocks.find((b): b is Extract<Block, {
        kind: "table";
    }> => b.kind === "table");
    if (!t) {
        t = { kind: "table", head: ["Date", "Type", "Description"], rows: [] };
        s.blocks.push(t);
    }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? "") ? entry.date! : today();
    if (t.rows.some((r) => r[0] === date && r[2] === description))
        return;
    t.rows.unshift([date, entry.type.replace(/[|\n]/g, " ").trim().slice(0, 30) || "Change", description]);
    writeDoc(brandId, "changes", doc);
}
export type LearningKind = "works" | "avoid" | "questions" | "ideas" | "productNotes";
const LEARNING_TITLE: Record<LearningKind, string> = { works: "What we know works", avoid: "What to avoid", questions: "Open questions", ideas: "Ideas to explore", productNotes: "Product notes" };
export function addLearning(brandId: string, kind: LearningKind, text: string, opts: {
    first?: boolean;
} = {}): void {
    const line = noLongDash(text).replace(/\s+/g, " ").trim().slice(0, 500);
    if (!line)
        throw new Error("Say what was learned.");
    const { doc } = readDoc(brandId, "brain");
    let s = sec(doc, kind);
    if (!s)
        s = addSection(doc, { level: 2, title: LEARNING_TITLE[kind], blocks: [] });
    let l = s.blocks.find((b): b is Extract<Block, {
        kind: "list";
    }> => b.kind === "list");
    if (!l) {
        l = { kind: "list", ordered: false, items: [] };
        s.blocks.push(l);
    }
    if (l.items.some((it) => it.toLowerCase() === line.toLowerCase()))
        return;
    if (opts.first)
        l.items.unshift(line);
    else
        l.items.push(line);
    writeDoc(brandId, "brain", doc);
}
export function removeLearning(brandId: string, line: string): boolean {
    const want = line.replace(/s+/g, " ").trim().toLowerCase();
    const { doc, exists } = readDoc(brandId, "brain");
    if (!exists || !want)
        return false;
    let found = false;
    for (const s of doc.sections)
        for (const b of s.blocks) {
            if (b.kind !== "list")
                continue;
            const keep = b.items.filter((it) => it.replace(/s+/g, " ").trim().toLowerCase() !== want);
            if (keep.length !== b.items.length) {
                b.items = keep;
                found = true;
            }
        }
    if (found)
        writeDoc(brandId, "brain", doc);
    return found;
}
export function logDecision(brandId: string, decision: string, why: string): void {
    const { doc } = readDoc(brandId, "brain");
    let s = sec(doc, "decisions");
    if (!s)
        s = addSection(doc, { level: 2, title: "Key decisions", blocks: [] });
    let t = s.blocks.find((b): b is Extract<Block, {
        kind: "table";
    }> => b.kind === "table");
    if (!t) {
        t = { kind: "table", head: ["Date", "Decision", "Why"], rows: [] };
        s.blocks.push(t);
    }
    t.rows.push([today(), noLongDash(decision).trim().slice(0, 400), noLongDash(why).trim().slice(0, 400)]);
    writeDoc(brandId, "brain", doc);
}
