import fs from "node:fs";
import path from "node:path";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { brandBrainDir, type BrandBrain } from "./brand-brain";
import { childrenOf, fieldValue, itemsOf, noLongDash, plainText, tableOf, textOf } from "./brain/md";
import { readDoc, sec } from "./brain/docs";
import { getBrandRow, loadBrandBrain } from "./brands";
import { loadClaimSources, ownAdTranscripts } from "./claim-sources";
import { FORCES_FORM, customerWords } from "./scripts/flow";
import { voiceCard } from "./voice-card";
import { COPY_QUALITY_CONTRACT } from "./creative-brand-contract";
export type Surface = "script" | "primary_text" | "headline" | "on_image" | "site";
export const SURFACE_LABEL: Record<Surface, string> = {
    script: "a video script (words that are spoken, and the words on screen)",
    primary_text: "ad primary text (the copy that runs with an ad in the feed)",
    headline: "an ad headline",
    on_image: "the words on an image",
    site: "website copy",
};
export const VOICE_MARK = "This is how the brand talks to its buyer.";
const LEAD = `${VOICE_MARK} Take from it who the brand speaks to, the words it uses for its product and its buyer's life, and its tone. It comes after 2 things and never instead of them: every line is plain, correct English that a person would say and a stranger would understand, and every line gives the buyer a reason. A line is never made stranger, shorter or more clever to sound more like the brand. Where a general writing rule in this prompt differs from the brand's own choice of words, its emoji or its lists, the brand's way wins; the facts, the claims rules and the guardrails on words below outrank it.`;
const SECTION: Record<Surface, RegExp> = {
    primary_text: /primary text|ad copy|ad body|caption/i,
    headline: /headline/i,
    on_image: /on an image|on image|image copy|on the image/i,
    script: /script|video|spoken/i,
    site: /website|site|product page/i,
};
const TONE: Record<Surface, RegExp> = {
    primary_text: /social|\bads?\b/i,
    headline: /social|\bads?\b|headline/i,
    on_image: /social|\bads?\b|headline/i,
    script: /social|\bads?\b|video/i,
    site: /website|product desc/i,
};
const WRITES = /^how (the brand|we|it) writes?/i;
const clean = (s: string) => s.replace(/[ \t]+/g, " ").trim();
export const sampleFromLine = (line: string) => noLongDash(plainText(line).replace(/^["“]|["”]$/g, "")).split(/\s*\/\/\s*/).map(clean).join("\n").trim();
export const sampleToLine = (text: string) => text.split(/\n+/).map(clean).filter(Boolean).join(" // ");
export interface WritingModel {
    surface: Surface;
    notes: string;
    samples: string[];
    from: "document" | "found" | "transcripts" | "none";
}
const words = (s: string) => s.match(/[\p{L}\p{N}'’%$+]+/gu) ?? [];
const EMOJI = /\p{Extended_Pictographic}/gu;
const TICK = /^\s*(✅|✔️?|☑️?|•|[-*]\s)/u;
const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};
const range = (xs: number[]) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)} to ${Math.max(...xs)}`);
export function shapeOf(samples: string[], surface: Surface): string[] {
    const n = samples.length;
    if (n < 3)
        return [];
    const of = (k: number) => `${k} of ${n}`;
    const count = (f: (s: string) => boolean) => samples.filter(f).length;
    const lens = samples.map((s) => words(s).length);
    const out: string[] = [];
    const short = surface === "headline" || surface === "on_image";
    out.push(`Length: ${range(lens)} words, usually about ${median(lens)}.`);
    if (!short) {
        const blocks = samples.map((s) => s.split(/\n+/).filter((l) => l.trim() && !TICK.test(l)).length);
        out.push(`Blocks: ${range(blocks)} short block${Math.max(...blocks) === 1 ? "" : "s"} of 1 to 3 sentences, usually ${median(blocks)}.`);
        const lists = samples.filter((s) => s.split("\n").filter((l) => TICK.test(l)).length >= 2);
        if (lists.length)
            out.push(`${of(lists.length)} carry a tick list of ${range(lists.map((s) => s.split("\n").filter((l) => TICK.test(l)).length))} very short facts (a few words each).`);
        else
            out.push("None uses a list.");
        const q = count((s) => /\?/.test(s.split(/(?<=[.!?])\s|\n/)[0] ?? ""));
        out.push(q ? `${of(q)} open on a question to the reader. The rest open on the product or on news.` : "None opens on a question.");
    }
    else {
        const caps = count((s) => {
            const w = s.split(/\s+/).filter((x) => /^[\p{L}]{3,}/u.test(x));
            return w.length >= 2 && w.filter((x) => /^\p{Lu}/u.test(x)).length / w.length >= 0.8;
        });
        if (caps >= n / 2)
            out.push(`${of(caps)} are written In Title Case.`);
        const num = count((s) => /\d/.test(s));
        if (num)
            out.push(`${of(num)} carry a number.`);
        const q = count((s) => /\?/.test(s));
        if (q)
            out.push(`${of(q)} ${q === 1 ? "is" : "are"} a question.`);
    }
    const em = samples.map((s) => (s.replace(/[✅✔☑]️?/gu, "").match(EMOJI) ?? []).length);
    const withEm = em.filter((x) => x > 0);
    out.push(withEm.length ? `${of(withEm.length)} use emoji (${range(withEm)} each).${withEm.length < n / 3 ? " Most use none." : ""}` : "None uses emoji.");
    const bang = count((s) => s.includes("!"));
    out.push(bang ? `${of(bang)} use an exclamation mark.` : "None uses an exclamation mark.");
    return out;
}
function foundLines(brandId: string, origin: "ad" | "website"): string[] {
    let quotes: string[] = [];
    try {
        quotes = loadClaimSources(brandId).claims.filter((c) => !c.forbidden && c.origin === origin).map((c) => c.quote);
    }
    catch {
        return [];
    }
    const seen = new Set<string>();
    return quotes
        .flatMap((q) => q.split(/\n+| \/ /))
        .map((q) => noLongDash(clean(q.replace(/^["“]|["”]$/g, ""))))
        .filter((q) => q.length >= 10 && q.length <= 110 && q.split(" ").length >= 2 && /[a-z]/i.test(q))
        .filter((q) => (seen.has(q.toLowerCase()) ? false : (seen.add(q.toLowerCase()), true)));
}
function spokenSamples(brandId: string): string[] {
    try {
        return ownAdTranscripts(brandId).map((t) => noLongDash(t.text)).slice(0, 12);
    }
    catch {
        return [];
    }
}
export function writingModel(brandId: string, surface: Surface): WritingModel {
    try {
        const doc = readDoc(brandId, "guidelines").doc;
        const parent = doc.sections.find((s) => WRITES.test(s.title.trim()));
        const parts = parent ? childrenOf(doc, parent) : [];
        const part = parts.find((s) => SECTION[surface].test(s.title)) ?? (surface === "on_image" ? parts.find((s) => SECTION.headline.test(s.title)) : undefined);
        if (part) {
            const samples = itemsOf(part).map(sampleFromLine).filter(Boolean);
            if (surface === "script")
                samples.push(...spokenSamples(brandId).filter((t) => !samples.includes(t)));
            if (samples.length || textOf(part).trim())
                return { surface, notes: plainText(textOf(part)).trim(), samples, from: "document" };
        }
    }
    catch {
    }
    if (surface === "headline" || surface === "on_image") {
        const found = foundLines(brandId, "ad");
        if (found.length)
            return { surface, notes: "", samples: found.slice(0, 12), from: "found" };
    }
    if (surface === "script") {
        const spoken = spokenSamples(brandId);
        if (spoken.length)
            return { surface, notes: "", samples: spoken, from: "transcripts" };
    }
    if (surface === "site") {
        const found = foundLines(brandId, "website");
        if (found.length)
            return { surface, notes: "", samples: found.slice(0, 12), from: "found" };
    }
    return { surface, notes: "", samples: [], from: "none" };
}
export function selectVoiceSamples(samples: string[], max: number, preferredCharacters: number): string[] {
    const seen = new Set<string>();
    const first: string[] = [];
    const rest: string[] = [];
    for (const s of samples) {
        const key = (words(s)[0] ?? "").toLowerCase();
        (seen.has(key) ? rest : first).push(s);
        seen.add(key);
    }
    const ranked = [...first, ...rest];
    const manageable = ranked.filter((s) => s.length <= preferredCharacters);
    const selected = manageable.length ? manageable.slice(0, max) : ranked.slice(0, 1);
    return [...new Set(selected)].map(noFigures);
}
export const noFigures = (s: string) => s.replace(/[$£€]\s?\d+(?:[.,]\d+)*(\/day)?/g, "[price]").replace(/\d+(?:[.,]\d+)*\s?%/g, "[%]");
const QUOTED = /"[^"\n]{2,}"|“[^”\n]{2,}”|(?<![\p{L}\p{N}])'[^'\n]{2,}?(?:'[\p{L}][^'\n]*?)*'(?![\p{L}\p{N}])/gu;
const Q = "\u0001";
const B = "\u0002";
const maskQuotes = (s: string) => s.replace(QUOTED, (m) => Q.repeat(m.length));
const maskAll = (s: string) => maskQuotes(s).replace(/\([^()]*\)/g, (m) => B.repeat(m.length));
const wordsIn = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const KEPT_WHOLE = /^\s*(?:[-*]\s+)?(?:\*\*)?(?:never|avoids?|don'?t|do not|no)\b/i;
const LABEL_HEAD = /\b(?:words?|terms?|vocabulary|phrases?|spelling|wording|copy|language|units?|rules?|notes?|tone|personality|avoid)\b/i;
const BOLD_LABEL = /^(?:[-*]\s+)?\*\*[^*]+\*\*$/;
const CLAUSE_IN_BRACKET = /\b(?:is|are|was|were|will|can|should|must|never|always)\b/i;
const CLAUSE = /\b(?:is|are|was|were|will|can|should|must|never|always|don'?t|do not|not|no|instead|only|use|keep|write)\b/i;
const ASIDE = /^(?:except|unless|but|because|since|when|if|only|not|never|i\.e\.?|that is|which|see|decided|note|optional|use|keep|always)\b/i;
const EG = /^(?:e\.g\.?|eg\.?|for example|for instance|such as)(?![\p{L}\p{N}])[:,]?\s*/iu;
const EG_LABEL = /(?:\s*[,;]|\s+[-–])?\s*(?<![\p{L}\p{N}])(?:e\.g\.?|for example|for instance|such as|(?:real\s+)?examples?\s*:)(?![\p{L}\p{N}])[:,]?\s+/iu;
const LIKE_QUOTED = new RegExp(`(?:\\s*,|\\s+[-–])?\\s+(?:like|as in)\\s+${Q}+(?:\\s*(?:,|;|or|and|&)\\s*${Q}+)*`, "i");
function piecesOf(orig: string, masked: string, sep: RegExp): string[] {
    const out: string[] = [];
    let from = 0;
    for (const m of masked.matchAll(new RegExp(sep.source, sep.flags.includes("g") ? sep.flags : `${sep.flags}g`))) {
        out.push(orig.slice(from, m.index));
        from = (m.index ?? 0) + m[0].length;
    }
    out.push(orig.slice(from));
    return out.map((x) => x.trim()).filter(Boolean);
}
function onlyQuoted(text: string): boolean {
    const m = maskQuotes(text.trim().replace(/[.!?]+$/, ""));
    return m.includes(Q) && !m.replace(new RegExp(`${Q}+`, "g"), "").replace(/\b(?:and|or)\b|[,;&/\s]/gi, "");
}
function isExampleList(text: string, clause: RegExp = CLAUSE): boolean {
    const t = text.trim().replace(/[.!?]+$/, "").trim();
    if (!t)
        return false;
    const m = maskQuotes(t);
    if (onlyQuoted(t))
        return true;
    const sentences = text.trim().split(/(?<=[.!?])\s+/);
    if (sentences.length >= 2 && sentences.every((x) => wordsIn(x) >= 1 && wordsIn(x) <= 3))
        return true;
    const items = piecesOf(t, m, /\s*[,;]\s*|\s+or\s+/);
    return items.length >= 2 && items.every((x) => wordsIn(x) <= 6 && !clause.test(maskQuotes(x).replace(new RegExp(`${Q}+`, "g"), " ")));
}
function isExampleBracket(inner: string): boolean {
    const c = inner.trim();
    if (EG.test(c))
        return true;
    if (ASIDE.test(c))
        return false;
    const likeness = /^(?:like|as in)\s+/i.exec(c);
    if (likeness)
        return onlyQuoted(c.slice(likeness[0].length));
    return isExampleList(c, CLAUSE_IN_BRACKET);
}
const maskForSentences = (s: string) => s.replace(QUOTED, (m) => (/[.!?]$/.test(m.slice(0, -1)) ? `${Q.repeat(m.length - 2)}${m[m.length - 2]}${Q}` : Q.repeat(m.length))).replace(/\([^()]*\)/g, (m) => B.repeat(m.length));
function sentenceEnd(s: string, at: number): number {
    const m = /[.!?]\u0001?(?=\s+[\p{Lu}\d])/u.exec(maskForSentences(s).slice(at));
    if (!m)
        return s.length;
    return at + m.index + (m[0].length > 1 ? m[0].length : 0);
}
function sentenceStart(s: string, at: number): number {
    let start = 0;
    for (const m of maskForSentences(s).slice(0, at).matchAll(/[.!?]\u0001?\s+(?=[\p{Lu}\d])/gu))
        start = (m.index ?? 0) + m[0].length;
    return start;
}
function joinCut(head: string, rest: string): string {
    const h = head.replace(/[\s,;:–-]+$/, "");
    const r = rest.trimStart();
    if (!r)
        return h;
    if (/^[.!?,;:)]/.test(r))
        return `${h}${r}`;
    return /^[\p{Lu}\d]/u.test(r) && h && !/[.!?]$/.test(h) ? `${h}. ${r}` : `${h} ${r}`;
}
const tidy = (s: string) => s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[.!?])/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/[\s,;:–-]+$/g, "")
    .trim();
function splitExamples(line: string): {
    text: string;
    cut: string[];
} {
    const cut: string[] = [];
    let s = line.trim();
    if (!s || KEPT_WHOLE.test(s))
        return { text: s, cut };
    for (let guard = 0, from = 0; guard < 8; guard++) {
        const m = maskQuotes(s);
        const b = /\s*\(([^()]*)\)/g;
        b.lastIndex = from;
        const hit = b.exec(m);
        if (!hit)
            break;
        const open = hit.index + hit[0].indexOf("(");
        const inner = s.slice(open + 1, hit.index + hit[0].length - 1);
        if (!isExampleBracket(inner)) {
            from = hit.index + hit[0].length;
            continue;
        }
        cut.push(inner.replace(EG, "").replace(/^\s*(?:like|as in)\s+/i, ""));
        const head = s.slice(0, hit.index);
        s = joinCut(head, s.slice(hit.index + hit[0].length));
        from = Math.min(head.length, s.length);
    }
    for (let guard = 0; guard < 4; guard++) {
        const eg = EG_LABEL.exec(maskAll(s));
        if (eg) {
            const end = sentenceEnd(s, eg.index + eg[0].length);
            const chunk = s.slice(eg.index + eg[0].length, end);
            if (chunk.trim())
                cut.push(chunk);
            s = joinCut(s.slice(0, eg.index), s.slice(end));
            continue;
        }
        const like = LIKE_QUOTED.exec(maskQuotes(s));
        if (like) {
            cut.push(s.slice(like.index, like.index + like[0].length).replace(/^[\s,–-]*(?:like|as in)\s+/i, ""));
            s = joinCut(s.slice(0, like.index), s.slice(like.index + like[0].length));
            continue;
        }
        break;
    }
    let at = 0;
    for (let guard = 0; guard < 6; guard++) {
        const m = maskAll(s);
        const rel = m.slice(at).search(/:\s/);
        if (rel < 0)
            break;
        const colon = at + rel;
        const head = s.slice(sentenceStart(s, colon), colon).trim();
        at = colon + 1;
        if (wordsIn(head) < 2 || BOLD_LABEL.test(head) || LABEL_HEAD.test(plainText(head)))
            continue;
        const ends = [s.length, sentenceEnd(s, colon)];
        const end = ends.find((e) => isExampleList(s.slice(colon + 1, e)));
        if (end === undefined)
            continue;
        cut.push(s.slice(colon + 1, end));
        s = joinCut(s.slice(0, colon), s.slice(end));
        at = Math.min(colon, s.length);
    }
    {
        const m = maskQuotes(s);
        const tail = new RegExp(`^(.*?\\S)\\s*[,;]\\s*(${Q}+(?:\\s*(?:,|;|or|and|&)\\s*${Q}+)*)\\s*[.!?]?\\s*$`).exec(m);
        if (tail && wordsIn(s.slice(0, tail[1].length)) >= 2) {
            const quoted = s.slice(tail[1].length).replace(/^\s*[,;]\s*/, "");
            if ([...quoted.matchAll(QUOTED)].some((q) => wordsIn(q[0]) >= 2)) {
                cut.push(quoted);
                s = s.slice(0, tail[1].length);
            }
        }
    }
    return { text: tidy(s), cut };
}
export const withoutExamples = (line: string): string => splitExamples(line).text;
export function examplesOf(line: string): string[] {
    return splitExamples(line).cut.flatMap((chunk) => {
        const t = chunk.trim().replace(EG, "");
        const quoted = [...t.matchAll(QUOTED)].map((m) => m[0].slice(1, -1).trim());
        const rest = maskQuotes(t).replace(new RegExp(`${Q}+`, "g"), ",").replace(/\([^()]*\)/g, " ");
        const slogan = !quoted.length && t.split(/(?<=[.!?])\s+/).length >= 2 && t.split(/(?<=[.!?])\s+/).every((x) => wordsIn(x) <= 3);
        const items = slogan ? [t] : quoted.length ? rest.split(/[,;]|\s+(?:and|or)\s+/) : /\s+or\s+/.test(rest) ? rest.split(/\s+or\s+/) : rest.split(/\s*[,;]\s*/);
        return [...quoted, ...items.map((x) => x.trim().replace(/^(?:and|or)\s+/i, "")).map((x) => (/[.!?]\s/.test(x) ? x : x.replace(/[.!?]+$/, ""))).filter((x) => /[\p{L}\p{N}]/u.test(x))];
    });
}
export const forcesForm = (line: string): boolean => FORCES_FORM.test(line) && FORCES_FORM.test(line.replace(/\bcadence\b/gi, " "));
const DISCLOSES = /\b(?:must|should|has to|have to|needs? to)\s+(?:all\s+|also\s+|always\s+|clearly\s+)*(?:disclose|warn)\b|\bdisclose\s+that\b/i;
export const isDisclosure = (rule: string): boolean => DISCLOSES.test(rule);
export function splitDisclosure(rule: string): {
    rule: string;
    disclosures: string[];
} {
    const sentences = rule.trim().split(/(?<=[.!?])\s+(?=[\p{Lu}"“'])/u).map((x) => x.trim()).filter(Boolean);
    return { rule: sentences.filter((x) => !isDisclosure(x)).join(" "), disclosures: sentences.filter(isDisclosure) };
}
function researchDisclosures(brandId: string): string[] {
    try {
        return db
            .select({ guardrail: schema.themes.guardrail })
            .from(schema.themes)
            .where(and(eq(schema.themes.brand_id, brandId), isNotNull(schema.themes.guardrail)))
            .orderBy(asc(schema.themes.rank), asc(schema.themes.id))
            .all()
            .filter((t) => t.guardrail?.applies)
            .flatMap((t) => splitDisclosure(t.guardrail!.rule).disclosures);
    }
    catch {
        return [];
    }
}
export const POOLED_HEADING = /key phrases|taglines?|slogans?|language bank|hooks? that work/i;
const OWN_LINES_HEADING = /key phrases|taglines?|slogans?|hooks? that work/i;
export const POOLED_FIELD = /^\s*[-*]\s*\*{0,2}hooks? that work\*{0,2}\s*:/i;
const MD_HEADING = /^(#{1,6})\s+(.*)$/;
export function withoutPooledLines(md: string): string {
    const out: string[] = [];
    let depth = 0;
    for (const line of md.split(/\r?\n/)) {
        const h = MD_HEADING.exec(line);
        if (h) {
            if (depth && h[1].length <= depth)
                depth = 0;
            if (!depth && POOLED_HEADING.test(h[2]))
                depth = h[1].length;
        }
        if (depth || POOLED_FIELD.test(line))
            continue;
        out.push(line);
    }
    return out.join("\n");
}
export function pooledLinesIn(md: string): string[] {
    const out: string[] = [];
    let depth = 0;
    for (const line of md.split(/\r?\n/)) {
        const h = MD_HEADING.exec(line);
        if (h) {
            if (depth && h[1].length <= depth)
                depth = 0;
            if (!depth && OWN_LINES_HEADING.test(h[2]))
                depth = h[1].length;
            continue;
        }
        if (POOLED_FIELD.test(line))
            out.push(...[...line.matchAll(QUOTED)].map((m) => m[0].slice(1, -1)));
        else if (depth) {
            const item = /^\s*[-*]\s+(.*)$/.exec(line);
            if (item)
                out.push(...sampleFromLine(item[1].replace(/\s*\([^()]*\)\s*$/, "")).split("\n"));
        }
    }
    return out;
}
function documentLines(brandId: string): string[] {
    try {
        const row = getBrandRow(brandId);
        const dir = row ? brandBrainDir(row.dir) : "";
        if (!dir || !fs.existsSync(dir))
            return [];
        return fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md").sort().flatMap((f) => pooledLinesIn(fs.readFileSync(path.join(dir, f), "utf-8")));
    }
    catch {
        return [];
    }
}
export const POOL_LINE_MAX = 120;
const TERMS_LINE = /\b(renews?|auto-?renew\w*|billed|cancel(?:s|lation)?(?: any ?time)?|terms(?: and conditions| apply)?|shipping|refunds?|subscri(?:be|ption)s?|per (?:month|week|year)|every \d+ (?:weeks?|months?)|each \d+ (?:weeks?|months?)|checkout|coupon|promo code|while supplies last|exclusions apply)\b/i;
export function namesNeverUsed(brand: BrandBrain, rails: string[] = []): string[] {
    const own = new Set(brand.brand.name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    const out = new Set<string>();
    for (const line of [...brand.voice.dont, ...rails.filter((r) => /^(never|don'?t|avoid)/i.test(r))]) {
        for (const m of line.matchAll(/(?<=[\p{Ll},;]\s)\p{Lu}\p{Ll}{3,}/gu))
            if (!own.has(m[0].toLowerCase()))
                out.add(m[0].toLowerCase());
    }
    return [...out];
}
export function brandLinePool(brandId: string, surfaces: Surface[], brand?: BrandBrain): string[] {
    let b = brand;
    try {
        b = b ?? loadBrandBrain(brandId);
    }
    catch {
        return [];
    }
    const card = voiceCard(brandId, b);
    const kinds = [...new Set(surfaces)];
    const models = kinds.map((s) => writingModel(brandId, s));
    const g = fromGuidelines(brandId, kinds);
    const reads = (min: number) => (l: string) => wordsIn(l) >= min && !/^\s*[\d$£€]/.test(l) && !/[|•]/.test(l) && /\p{Ll}{4,}/u.test(l);
    const sentence = (l: string) => /^\P{L}*\p{Lu}/u.test(l) && /(?:^|\s)\p{Ll}{3,}(?=[\s,.!?]|$)/u.test(l);
    const lines = [
        ...card.examples,
        ...models.flatMap((m) => m.samples.flatMap((s) => s.split("\n"))).filter((l) => !TICK.test(l)),
        ...documentLines(brandId),
        ...foundLines(brandId, "ad").filter(reads(4)),
        ...foundLines(brandId, "website").filter(reads(5)).filter(sentence),
        ...[...card.sound, ...b.voice.do, ...g.rails, ...g.tone.map((t) => t.replace(/^[^:]*:\s*/, "")), ...models.map((m) => m.notes)].flatMap(examplesOf),
    ];
    const seen = new Set<string>();
    const out: string[] = [];
    const never = namesNeverUsed(b, g.rails);
    for (const raw of lines) {
        const line = noFigures(noLongDash(clean(raw.trim().replace(/^["“](.*)["”]$/s, "$1").replace(/^'(.*)'$/s, "$1"))));
        const key = line.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        if (line.length < 6 || line.length > POOL_LINE_MAX || key.split(" ").length < 2 || !/\p{L}/u.test(line) || seen.has(key))
            continue;
        if (TERMS_LINE.test(line) || /\[[^\]]{1,24}\]/.test(line))
            continue;
        if (/\d/.test(line) || never.some((n) => line.toLowerCase().includes(n)) || /\b(?:manufactur|facilit|registered\b|complian)/i.test(line))
            continue;
        seen.add(key);
        out.push(line);
    }
    return out;
}
function modelText(m: WritingModel, long = false, toneOnly = false): string {
    if (m.from === "none")
        return "";
    const short = m.surface === "headline" || m.surface === "on_image";
    const shape = shapeOf(m.samples, m.surface).filter((x) => !long || !/^(Length|Blocks):/.test(x));
    const shown = toneOnly ? [] : selectVoiceSamples(m.samples, short ? 8 : m.surface === "script" ? 3 : 4, m.surface === "script" ? 1100 : 520);
    const notes = toneOnly ? withoutExamples(m.notes) : m.notes;
    if (toneOnly && !notes && !shape.length)
        return "";
    return [
        `### How the brand writes ${SURFACE_LABEL[m.surface]}`,
        notes,
        shape.length
            ? `Its habits, counted from ${m.samples.length} of its own:\n${shape.map((x) => `- ${x}`).join("\n")}\nThese are habits to lean on, not limits. The length of this piece is the one given with the request${short ? ". Capital letters in the brand's way are for a headline set as type; words a person wrote or said inside the picture (a note, a message, a line of speech) are written the way that person would write them" : ""}.`
            : "",
        shown.length ? `Complete examples of its own published work, with prices and percentages masked. Take the tone and the kind of words. Take no fact, number, offer or sentence from it: the facts come only from the brand's material.\n${shown.map((s) => (short ? `- "${s}"` : `<sample>\n${s}\n</sample>`)).join("\n")}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
function fromGuidelines(brandId: string, surfaces: Surface[]): {
    rails: string[];
    tone: string[];
    notices: string[];
} {
    try {
        const g = readDoc(brandId, "guidelines").doc;
        const rails = sec(g, "guardrails");
        const say = plainText(fieldValue(rails, "Never say"));
        const always = plainText(fieldValue(rails, "Always"));
        const items = itemsOf(rails).map(plainText);
        const extra = items.filter((i) => /^never use\b/i.test(i) || /\b(copy|wording|word|words|phrase)\b/i.test(i.split(":")[0]));
        const rows = tableOf(sec(g, "tone"))?.rows ?? [];
        const tone = rows.filter((r) => (r[1] ?? "").trim() && surfaces.some((s) => TONE[s].test(r[0] ?? ""))).map((r) => `${plainText(r[0])}: ${plainText(r[1])}`);
        return { rails: [say && `Never say: ${say}`, always && `Always: ${always}`, ...extra].filter((x): x is string => !!x), tone, notices: items.filter((i) => !extra.includes(i)).flatMap((i) => splitDisclosure(i).disclosures) };
    }
    catch {
        return { rails: [], tone: [], notices: [] };
    }
}
export function buyerText(brand: BrandBrain, personaIds: string[]): string {
    const buyers = brand.personas.filter((p) => personaIds.includes(p.id));
    if (!buyers.length)
        return "";
    return [
        "### Who this is for",
        "Write to this buyer's situation in this buyer's vocabulary, in the brand's voice. A piece for one buyer must not be able to pass for a piece written for another: the opening, the example and the reason to care all change with the buyer. How they talk is for phrasing: borrow it for your own sentences, never show it as a review, and never borrow a personal fact (a length of time, a price, a named product, a result) as the narrator's own.",
        ...buyers.map((p) => `- ${p.name}. ${clean(p.summary)} Problem: ${clean(p.problem)}${p.wants ? ` Desire: ${clean(p.wants)}` : ""} Buying trigger: ${clean(p.trigger)}${customerWords(p.language).phrases.length ? ` How they talk: ${customerWords(p.language).phrases.slice(0, 5).map((w) => `"${clean(w)}"`).join(", ")}.` : ""}`),
    ].join("\n");
}
export function brandOwnWords(brandId: string): string {
    try {
        const card = voiceCard(brandId);
        const all = (["primary_text", "headline", "site", "script", "on_image"] as Surface[]).flatMap((s) => writingModel(brandId, s).samples);
        return [...card.examples, ...all].join("\n").toLowerCase();
    }
    catch {
        return "";
    }
}
export interface VoiceBlock {
    text: string;
    sources: string[];
    buyer: string;
    disclosures: string[];
}
export interface VoiceOpts {
    surfaces: Surface[];
    personaIds?: string[];
    brand?: BrandBrain;
    story?: boolean;
    long?: boolean;
    buyerApart?: boolean;
    toneOnly?: boolean;
}
export function brandVoice(brandId: string, opts: VoiceOpts): VoiceBlock {
    let brand = opts.brand;
    try {
        brand = brand ?? loadBrandBrain(brandId);
    }
    catch {
        return { text: "", sources: [], buyer: "", disclosures: [] };
    }
    const card = voiceCard(brandId, brand);
    const sources: string[] = [];
    const parts: string[] = [];
    const tone = !!opts.toneOnly;
    const shown = (lines: string[]) => (tone ? lines.map(withoutExamples).filter(Boolean) : lines);
    const sound = shown(card.sound.filter((x) => !forcesForm(x)));
    const examples = tone ? [] : card.examples;
    if (opts.story) {
        parts.push("### This piece is told by a person\nIt is spoken, or told as a story, in whole plain sentences. Take from below the brand's words for its product, its attitude, and what it never says. All of it is advice that sits below the ad principles. A slogan or catchphrase of the brand may be said where a person really would say it: at most once in the piece, and never because it is listed here.");
        if (sound.length)
            parts.push(["### How the brand sounds (attitude and words only)", ...sound.map((x) => `- ${x}`)].join("\n"));
    }
    else if (sound.length || examples.length || (!tone && card.sound.length)) {
        parts.push(["### How it sounds", ...sound.map((x) => `- ${x}`), examples.length ? "Lines the brand itself has published. Match their tone and the kind of words they use; do not reuse their words:" : "", ...examples.map((x) => `- "${x}"`)].filter(Boolean).join("\n"));
        sources.push(card.by === "written" ? "the brand's style card" : "a style card made from the voice notes");
    }
    const keys = (x: string) => [...new Set(x.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 3))];
    const inCard = new Set(keys((tone ? sound : [...card.sound, ...card.examples]).join(" ")));
    const story = (x: string) => !forcesForm(x);
    const dos = shown(brand.voice.do.filter(story)).filter((x) => {
        const k = keys(x);
        return !k.length || k.filter((w) => inCard.has(w)).length / k.length < 0.6;
    });
    const donts = brand.voice.dont.filter(story);
    if (dos.length || donts.length) {
        parts.push([dos.length ? `### ${opts.story ? "What the brand leans on (use where it fits the telling; nothing here is required)" : "Do"}\n${dos.map((x) => `- ${x}`).join("\n")}` : "", donts.length ? `### Don't\n${donts.map((x) => `- ${x}`).join("\n")}` : ""].filter(Boolean).join("\n"));
        sources.push("brand.json: voice do and don't");
    }
    const devices = opts.story ? [] : shown([...card.sound, ...brand.voice.do, ...brand.voice.dont.map((x) => `Avoids: ${x}`)].filter(forcesForm));
    const g = fromGuidelines(brandId, opts.surfaces);
    const habits = g.rails.filter((x) => x.startsWith("Always:")).map((x) => withoutExamples(x.replace(/^Always:\s*/, ""))).filter(Boolean);
    const rules = g.rails.filter((x) => !x.startsWith("Always:"));
    const disclosures = [...new Set([...g.notices, ...rules.flatMap((x) => splitDisclosure(x).disclosures), ...researchDisclosures(brandId)])];
    const rails = tone ? shown(rules.map((x) => (isDisclosure(x) ? splitDisclosure(x).rule : x))) : rules;
    if (habits.length)
        parts.push(`### The brand's habits (${opts.story ? "use where one fits the telling; none is required in every piece" : "use where one fits; none is owed in any single piece"})\n${habits.map((x) => `- ${x}`).join("\n")}`);
    if (rails.length) {
        parts.push(`### Guardrails on words (these outrank the voice)\n${rails.map((x) => `- ${x}`).join("\n")}`);
        sources.push("brand-guidelines.md: guardrails");
    }
    const toneRows = tone ? g.tone.map((x) => x.replace(/^([^:]*:\s*)(.*)$/s, (_, where: string, how: string) => `${where}${withoutExamples(how)}`)) : g.tone;
    if (toneRows.length) {
        parts.push(`### The tone here\n${toneRows.map((x) => `- ${x}`).join("\n")}`);
        sources.push("brand-guidelines.md: tone by context");
    }
    for (const s of new Set(opts.surfaces)) {
        const m = writingModel(brandId, s);
        const t = modelText(m, !!opts.long && s === "primary_text", tone);
        if (!t)
            continue;
        const cut = t.indexOf("\n");
        const twin = tone ? parts.findIndex((p) => p.startsWith("### How the brand writes ") && p.slice(p.indexOf("\n")) === t.slice(cut)) : -1;
        if (twin >= 0) {
            parts[twin] = `${parts[twin].slice(0, parts[twin].indexOf("\n"))}, and ${SURFACE_LABEL[s]}${t.slice(cut)}`;
            continue;
        }
        parts.push(t);
        sources.push(`${tone ? "the counted shape of " : ""}${m.samples.length} of the brand's own ${s === "primary_text" ? "ad texts" : s === "headline" ? "headlines" : s === "on_image" ? "on-image lines" : s === "site" ? "site lines" : "scripts"} (${m.from === "document" ? "brand-guidelines.md" : m.from === "transcripts" ? "its own video ads in References, transcribed" : "found on its site and ads"})`);
    }
    const buyer = buyerText(brand, opts.personaIds ?? []);
    if (buyer && !opts.buyerApart) {
        parts.push(buyer);
        sources.push("the buyer's own words");
    }
    if (devices.length)
        parts.push(`### Devices the brand sometimes uses (options, never rules)\nUse one only where a line that is already plain and already gives a reason takes it naturally. None is a reason to change a line that reads well, to cut a sentence down, or to drop its small words.\n${devices.map((x) => `- ${x}`).join("\n")}`);
    if (!parts.length)
        return { text: "", sources: [], buyer: opts.buyerApart ? buyer : "", disclosures };
    return { text: [`## The brand's voice\n${LEAD}`, ...parts, COPY_QUALITY_CONTRACT].join("\n\n"), sources, buyer: opts.buyerApart ? buyer : "", disclosures };
}
const NO_VOICE = `## The brand's voice\n(The brand has recorded no voice yet: write plainly, warmly and specifically, and report the missing voice input in your notes.)\n${COPY_QUALITY_CONTRACT}`;
export const brandVoiceText = (brandId: string, opts: VoiceOpts) => brandVoice(brandId, opts).text || NO_VOICE;
export function brandVoiceApart(brandId: string, opts: Omit<VoiceOpts, "buyerApart">): {
    text: string;
    buyer: string;
    disclosures: string[];
} {
    const v = brandVoice(brandId, { ...opts, buyerApart: true });
    return { text: v.text || NO_VOICE, buyer: v.buyer, disclosures: v.disclosures };
}
export const VOICE_STEPS: Record<string, {
    role: "writes" | "edits" | "judges";
    surfaces: Surface[];
    what: string;
}> = {
    script: { role: "writes", surfaces: ["script"], what: "a video or native ad script" },
    "script-flow": { role: "writes", surfaces: ["script"], what: "a script written free-flowing from the ad principles" },
    "script-readaloud": { role: "edits", surfaces: ["script"], what: "the edit pass on a script written from the ad principles (sense, story, breath, fairness)" },
    "script-hooks": { role: "writes", surfaces: ["script"], what: "more hooks for a finished script: each a different way in to the same body" },
    "script-primary-text": { role: "writes", surfaces: ["primary_text", "headline"], what: "the primary text and headline that run with a script made in the Script builder" },
    "script-hook-texts": { role: "writes", surfaces: ["primary_text", "headline"], what: "the first line of the primary text and the headline for each further hook of a script" },
    "script-patch": { role: "edits", surfaces: ["script"], what: "a patch to the faulty lines of a script: only those lines and their neighbours go out and come back" },
    "script-caption-check": { role: "edits", surfaces: ["primary_text", "headline"], what: "the check on a script's primary text, headlines and further hooks against the finished script" },
    "ad-copy-flow": { role: "writes", surfaces: ["on_image", "headline", "primary_text"], what: "an image ad written from the ad principles" },
    "copy-pass": { role: "edits", surfaces: ["script", "on_image", "primary_text", "headline"], what: "the copy pass on a script or a set of ads" },
    "voice-check": { role: "edits", surfaces: ["script", "on_image", "primary_text", "headline"], what: "the brand voice pass" },
    "words-read": { role: "judges", surfaces: ["script", "on_image", "primary_text", "headline"], what: "the reading every customer-facing line gets before it is used" },
    "words-fix": { role: "edits", surfaces: ["script", "on_image", "primary_text", "headline"], what: "the patch to the lines that reading failed: only those lines go out and come back" },
    "line-repair": { role: "edits", surfaces: ["script"], what: "the repair of script lines that failed a check" },
    "script-revise": { role: "edits", surfaces: ["script"], what: "a script changed in the chat" },
    transpose: { role: "edits", surfaces: ["script"], what: "a script converted to another person and tense" },
    "audit-judge": { role: "judges", surfaces: ["script"], what: "the script audit" },
    "hook-grade": { role: "judges", surfaces: ["script"], what: "the grading of hooks" },
    "studio-plan": { role: "writes", surfaces: ["on_image", "headline", "primary_text"], what: "image ads, product page images and photoshoots" },
    "studio-words": { role: "writes", surfaces: ["on_image", "headline", "primary_text"], what: "the words of image ads, written again with the copy craft" },
    "studio-feed": { role: "writes", surfaces: ["primary_text"], what: "the long primary text of an image ad for a buyer who does not know the problem or only feels it" },
    "studio-feed-focused": { role: "writes", surfaces: ["primary_text"], what: "evidence-matched long primary text using the selected static-copy method" },
    "studio-variants": { role: "writes", surfaces: ["on_image", "headline"], what: "more headlines and subheadlines for 1 finished image ad, each set as type over the same picture" },
    "script-image-prompts": { role: "writes", surfaces: ["on_image"], what: "the prompts of a script's pictures and, when a picture is made with words, the 1 line set on it" },
    "reference-hooks": { role: "writes", surfaces: ["script"], what: "new hooks for an ad that already runs" },
    "ad-review": { role: "judges", surfaces: ["on_image", "headline", "primary_text"], what: "the review of planned image ads" },
    "image-plan": { role: "writes", surfaces: ["on_image", "headline", "primary_text"], what: "a static ad or carousel made from a script" },
    "plan-repair": { role: "edits", surfaces: ["on_image", "headline", "primary_text"], what: "the repair of an image plan that failed a check" },
    "shot-plan": { role: "writes", surfaces: ["script", "headline", "primary_text"], what: "a video's shots and the copy that runs with it" },
    "motion-plan": { role: "writes", surfaces: ["on_image"], what: "the words in a motion ad" },
    "creative-kit": { role: "writes", surfaces: ["script"], what: "the brand's creative kit (how its videos look and sound)" },
    "sprint-plan": { role: "writes", surfaces: ["headline", "on_image"], what: "the plan of a 50-ad sprint" },
    "chat-copy": { role: "writes", surfaces: ["headline", "primary_text", "script"], what: "short copy asked for in the chat" },
    "chat-turn": { role: "writes", surfaces: ["headline", "primary_text"], what: "the chat's own replies and briefs" },
    "concept-suggest": { role: "writes", surfaces: ["headline", "script"], what: "concepts and their angles" },
    "persona-build": { role: "writes", surfaces: ["headline"], what: "personas and the angle that reaches each" },
    "offer-build": { role: "writes", surfaces: ["headline", "primary_text"], what: "offers and the way each is said" },
    "offer-set": { role: "writes", surfaces: ["headline", "primary_text"], what: "the short list of offers the Script builder ticks from" },
    "offer-words": { role: "writes", surfaces: ["headline"], what: "the name of 1 offer, its line on the page and the line a person says" },
    "builder-start": { role: "writes", surfaces: ["headline"], what: "the personas and angles the Script builder ticks from, for a brand that has none" },
    "lp-write": { role: "writes", surfaces: ["site"], what: "a landing page" },
};
export const NO_CUSTOMER_WORDS: Record<string, string> = {
    "script-fact-check": "lists the factual statements of an ad beside the held fact each rests on, and writes no word of the ad",
    "script-hook-handoff": "Configure this step with your own reviewed evidence and quality benchmark.",
    "reference-hooks-check": "reads a new hook against the body of the ad it joins, and writes no word of either",
    "reference-reading": "reads another brand's ad for a person about to rebuild it: its best parts, its weak parts and the formats that suit it. It writes no word of an ad",
    assign: "sorts research into themes",
    cluster: "groups research into themes",
    clean: "cleans a transcript",
    extract: "pulls insights from research",
    "pii-names": "finds names to redact",
    "brand-convert": "reads a brand's files into the brand brain",
    "competitor-profile": "profiles a competitor from its site",
    "feedback-learn": "turns feedback into a lesson",
    "edit-rule": "words a rule for writers from a repeated hand edit",
    "lesson-compact": "merges learned rules that say the same thing into 1; it writes rules for writers, not words for customers",
    "skill-propose": "turns a general rule from feedback into the lines it adds to a skill file, for an admin to accept; it writes rules for writers, not words for customers",
    "skill-tighten": "rewrites a skill file shorter with every rule kept, for an admin to accept; no customer reads it",
    guardrails: "writes guardrails from refunds and complaints",
    "offer-research": "researches offer mechanics in an industry",
    "persona-doubts": "pairs a buyer's doubts with the brand's own proof, for the owner and the writers to read",
    "script-surfaces": "scores which formats a script suits; it judges no wording",
    "sense-check": "checks that a planned picture makes physical sense",
    "format-example-plan": "plans the example picture of a format's tile on a plain pack with no brand: there is no brand, so no voice",
    "studio-prompt": "writes the image model's prompt; the words on the image are carried over unchanged from the plan",
    "studio-rules-free": "a rules fragment joined into the studio plan",
    "studio-rules-strict": "a rules fragment joined into the studio plan",
    "script-rules-free": "a rules fragment joined into the script prompt",
    "script-hooks-different": "a fragment joined into the hooks prompt (script-hooks, which carries the voice block): each hook a different way in",
    "script-hooks-same": "a fragment joined into the hooks prompt (script-hooks, which carries the voice block): each hook the ad's own way in said in new words (OP-03)",
    "script-rules-flow": "a rules fragment joined into the script-flow prompt",
    "script-rules-brief": "the story-brief rule, joined into the script-flow rules when SCRIPT_BRIEF is on",
    "script-rules-strict": "a rules fragment joined into the script prompt",
    "voice-card": "writes the style card itself, from the brand's own words",
};
