export const ARTICLE_DEPTHS = {
    short_answer: { label: "Short answer", minWords: 0, maxWords: 450, minSections: 2, minSourceWords: 0 },
    standard: { label: "Standard article", minWords: 800, maxWords: 1400, minSections: 5, minSourceWords: 250 },
    deep: { label: "Deep guide", minWords: 1400, maxWords: 2200, minSections: 7, minSourceWords: 500 },
} as const;
export type ArticleDepth = keyof typeof ARTICLE_DEPTHS;
function prose(text: string): string {
    return text.replace(/```[^\n]*\n[\s\S]*?```/g, " ")
        .replace(/^\s*#{1,6}\s+.*$/gm, "")
        .replace(/^\s*(?:\[Source\b[^\n]*|Source\s+\d+\s*:[^\n]*)$/gim, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/[^\s<>]+/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/gm, "")
        .replace(/[*_~`|]/g, " ");
}
function tokens(text: string): string[] {
    return prose(text).normalize("NFKC").match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}’'\-]*/gu) ?? [];
}
export function articleWordCount(body: string): number { return tokens(body).length; }
export function hasStructuredDecisionAid(body: string): boolean {
    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const list = lines.filter(line => /^\s*(?:[-*+]\s+|\d+[.)]\s+)\S/.test(line));
    if (list.length >= 2 && list.every(line => articleWordCount(line) >= 5))
        return true;
    for (let i = 1; i < lines.length - 2; i++) {
        if (/^\s*\|?.+\|.+/.test(lines[i - 1]) && /^\s*\|?\s*:?-{3,}/.test(lines[i]) && lines.slice(i + 1, i + 3).every(line => /^\s*\|?.+\|.+/.test(line) && articleWordCount(line) >= 5))
            return true;
    }
    return false;
}
const key = (text: string) => tokens(text).join(" ").toLowerCase();
const headingKey = (text: string) => key(text.replace(/^\d+[.)]\s*/, "")).normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
function paragraphs(body: string): string[] { return body.split(/\n\s*\n/).map(prose).map(p => p.trim()).filter(p => articleWordCount(p) > 0); }
type DuplicatePassage = {
    passage: string;
    occurrences: number;
};
function duplicates(passages: string[], minWords: number): DuplicatePassage[] {
    const found = new Map<string, DuplicatePassage>();
    for (const passage of passages) {
        if (articleWordCount(passage) < minWords)
            continue;
        const normalized = key(passage), prior = found.get(normalized);
        if (prior)
            prior.occurrences++;
        else
            found.set(normalized, { passage, occurrences: 1 });
    }
    return [...found.values()].filter(p => p.occurrences > 1);
}
function repeatedFiveGramDensity(passages: string[]): number {
    const grams = new Map<string, number>();
    let total = 0;
    for (const paragraph of passages) {
        const words = tokens(paragraph).map(w => w.toLowerCase());
        for (let i = 0; i <= words.length - 5; i++) {
            const gram = words.slice(i, i + 5).join(" ");
            grams.set(gram, (grams.get(gram) ?? 0) + 1);
            total++;
        }
    }
    return total < 80 ? 0 : Number(([...grams.values()].reduce((sum, count) => sum + count - 1, 0) / total).toFixed(4));
}
function sections(body: string): {
    heading: string;
    body: string;
}[] {
    const lines = body.replace(/\r\n/g, "\n").split("\n");
    const levels = lines.flatMap(line => { const match = /^\s*(#{2,6})\s+/.exec(line); return match ? [match[1].length] : []; });
    const level = levels.length ? Math.min(...levels) : 2;
    const result: {
        heading: string;
        body: string;
    }[] = [];
    let current = { heading: "", body: "" }, started = false;
    for (const line of lines) {
        const match = /^\s*(#{2,6})\s+(.+?)\s*#*\s*$/.exec(line);
        if (match && match[1].length === level) {
            if (started || articleWordCount(current.body))
                result.push(current);
            current = { heading: match[2], body: "" };
            started = true;
        }
        else
            current.body += line + "\n";
    }
    if (started || articleWordCount(current.body))
        result.push(current);
    return result;
}
function editorialNotes(body: string): string[] {
    const notes: string[] = [];
    if (/\b(?:supplied record|source packet|captured page|evidence limits|internal audit|QA workflow)\b/i.test(body))
        notes.push("Move internal source/audit commentary into the editorial brief; keep material product conditions beside the claim.");
    const labelFallbacks = body.match(/\b(?:check|read|consult|confirm)\b[^.!?\n]{0,65}\b(?:current\s+)?label\b/gi) ?? [];
    if (labelFallbacks.length >= 3)
        notes.push("Repeated check-the-label advice may be replacing useful answers. Explain the available facts once, then name the precise unresolved label detail.");
    const listItems = body.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)\S/gm) ?? [];
    const table = /^\s*\|?.+\|.+\n\s*\|?\s*:?-{3}/m.test(body);
    const decisionRules = body.match(/\b(?:if|when)\b[^.!?\n]{10,110}\b(?:choose|check|use|then|compare)\b/gi) ?? [];
    if (listItems.length < 2 && !table && decisionRules.length < 2)
        notes.push("Consider a concrete decision aid: a sourced comparison table, ordered process or practical checklist. A heading that merely promises a worksheet is not an aid.");
    notes.push("Length, section breadth and phrase repetition are deterministic diagnostics, not verification of source truth, semantic entailment, originality or search performance.");
    return notes;
}
export function assessArticleDepth(body: string, depth: ArticleDepth, requiredHeadings: string[] = []) {
    const preset = ARTICLE_DEPTHS[depth], parts = sections(body), wordCount = articleWordCount(body);
    const headings = new Set([...body.matchAll(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/gm)].map(m => headingKey(m[1])));
    const missingHeadings = requiredHeadings.filter(h => h.trim() && !headings.has(headingKey(h)));
    const substantialMinimum = depth === "deep" ? 80 : 60;
    const requiredSubstantialSections = depth === "short_answer" ? 0 : preset.minSections - 1;
    const substantialSections = parts.slice(1).filter(s => articleWordCount(s.body) >= substantialMinimum).length;
    const passages = paragraphs(body), duplicateParagraphs = duplicates(passages, 12), density = repeatedFiveGramDensity(passages);
    const blockers: string[] = [], notes = editorialNotes(body);
    if (wordCount < preset.minWords)
        blockers.push(`The ${preset.label.toLowerCase()} has ${wordCount} prose words; at least ${preset.minWords} are required. Add useful sourced explanation rather than padding.`);
    if (parts.length < preset.minSections)
        blockers.push(`Provide at least ${preset.minSections} distinct sections; only ${parts.length} are present.`);
    if (substantialSections < requiredSubstantialSections)
        blockers.push(`After the opening, provide at least ${requiredSubstantialSections} substantial sections of ${substantialMinimum} prose words or more; only ${substantialSections} meet that floor.`);
    if (missingHeadings.length)
        blockers.push(`Restore the required sections or revise the reviewed brief: ${missingHeadings.join("; ")}.`);
    if (duplicateParagraphs.length)
        blockers.push(`${duplicateParagraphs.length} substantive paragraph(s) repeat. Replace duplicate passages with distinct sourced answers.`);
    if (density > .3)
        blockers.push("Repeated five-word phrases dominate the article. Remove repeated filler before assessing its depth.");
    if (wordCount > preset.maxWords)
        notes.push(`This exceeds the ${preset.maxWords}-word guidance for ${preset.label.toLowerCase()}; review focus or choose a deeper format. Length alone does not establish quality.`);
    return { depth, wordCount, blockers, notes, metrics: { sectionCount: parts.length, substantialSections, requiredSubstantialSections, substantialSectionMinimum: substantialMinimum, missingHeadings, duplicateParagraphs, duplicateParagraphCount: duplicateParagraphs.length, repeatedFiveGramDensity: density } };
}
export function assessArticleBrief(input: {
    depth?: ArticleDepth;
    sections: {
        heading: string;
        copy: string;
    }[];
    originalContribution?: {
        description: string;
    };
}) {
    const depth = input.depth ?? "standard", preset = ARTICLE_DEPTHS[depth];
    const sourceParagraphs = input.sections.flatMap(s => paragraphs(s.copy));
    const unique = new Map(sourceParagraphs.map(p => [key(p), p]));
    const sourceWordCount = [...unique.values()].reduce((sum, p) => sum + articleWordCount(p), 0);
    const duplicateSourceParagraphs = duplicates(sourceParagraphs, 1);
    const density = repeatedFiveGramDensity(sourceParagraphs), blockers: string[] = [], notes: string[] = [];
    if (input.sections.length < preset.minSections)
        blockers.push(`Plan at least ${preset.minSections} distinct sections for ${preset.label.toLowerCase()}.`);
    if (new Set(input.sections.map(s => headingKey(s.heading))).size !== input.sections.length)
        blockers.push("Give each planned section a distinct heading and purpose.");
    if (sourceWordCount < preset.minSourceWords)
        blockers.push(`The brief has ${sourceWordCount} words of unique source notes; ${preset.minSourceWords} are required for this depth. Select richer relevant evidence before a model call.`);
    if (depth !== "short_answer" && (!input.originalContribution?.description || input.originalContribution.description.trim().length < 10))
        blockers.push("Describe the concrete original contribution or decision aid this substantial article will add.");
    if (depth !== "short_answer" && density > .3)
        blockers.push("The source notes repeat the same phrases instead of supplying enough distinct evidence for a substantial article.");
    if (duplicateSourceParagraphs.length)
        notes.push("Repeated source paragraphs were counted once. Supply distinct, applicable passages for the separate questions.");
    notes.push("Source-note word counts measure available material, not independent evidence quality or product applicability.");
    return { depth, sourceWordCount, blockers, notes, metrics: { sectionCount: input.sections.length, uniqueSourceWords: sourceWordCount, duplicateSourceParagraphs, repeatedFiveGramDensity: density } };
}
