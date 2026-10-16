export interface FounderQuestion {
    id: string;
    core: boolean;
    text: string;
}
export interface FounderSection {
    n: number;
    title: string;
    intro: string;
    questions: FounderQuestion[];
}
export interface FounderAnswer {
    answer: string;
    skipped: boolean;
    updated_at?: string;
}
const SECTION = /^## (\d+)\. (.+)$/;
const QUESTION = /^- \*\*(F\d+\.\d+)( \(core\))?\*\* (.+)$/;
export function parseQuestionnaire(md: string): FounderSection[] {
    const sections: FounderSection[] = [];
    for (const raw of md.split(/\r?\n/)) {
        const line = raw.trim();
        const s = line.match(SECTION);
        if (s) {
            sections.push({ n: Number(s[1]), title: s[2], intro: "", questions: [] });
            continue;
        }
        const cur = sections[sections.length - 1];
        if (!cur)
            continue;
        const q = line.match(QUESTION);
        if (q)
            cur.questions.push({ id: q[1], core: !!q[2], text: q[3] });
        else if (line && !cur.questions.length && !line.startsWith("#") && line !== "---")
            cur.intro = cur.intro ? `${cur.intro} ${line}` : line;
    }
    return sections;
}
export const isAnswered = (a?: FounderAnswer) => !!a && !a.skipped && a.answer.trim().length > 0;
export function founderProgress(sections: FounderSection[], answers: Record<string, FounderAnswer>) {
    const all = sections.flatMap((s) => s.questions);
    const core = all.filter((q) => q.core);
    const done = (qs: FounderQuestion[]) => qs.filter((q) => isAnswered(answers[q.id])).length;
    return { total: all.length, answered: done(all), core: core.length, coreAnswered: done(core), skipped: all.filter((q) => answers[q.id]?.skipped).length };
}
export function founderMarkdown(brandName: string, sections: FounderSection[], answers: Record<string, FounderAnswer>, date: string): string {
    const out = [`# Founder interview: ${brandName}`, "", `Source: founder, saved ${date}. A founder's statement is not proof: a claim stays pending until its document is on file.`, ""];
    const open: string[] = [];
    for (const s of sections) {
        const answered = s.questions.filter((q) => isAnswered(answers[q.id]));
        for (const q of s.questions)
            if (!isAnswered(answers[q.id]))
                open.push(`- ${q.id} ${q.text}${answers[q.id]?.skipped ? " (skipped)" : ""}`);
        if (!answered.length)
            continue;
        out.push(`## ${s.n}. ${s.title}`, "");
        for (const q of answered)
            out.push(`**${q.id}** ${q.text}`, "", answers[q.id].answer.trim(), "");
    }
    if (open.length)
        out.push("## Not answered", "", ...open, "");
    return out.join("\n");
}
