import type { AuditItem, StudioItem } from "@/db/schema";
import { getFounderAnswers, loadQuestionnaire } from "./founder";
import { isAnswered } from "./founder-questions";
const STORY = /^F(1\.[1-4]|2\.[1-35])$/;
const LIMITS = "F1.5";
export interface FounderWords {
    answers: {
        id: string;
        question: string;
        answer: string;
    }[];
    limits: string;
}
export function founderWords(brandId: string): FounderWords | null {
    const got = getFounderAnswers(brandId);
    const answers = loadQuestionnaire()
        .flatMap((s) => s.questions)
        .filter((q) => STORY.test(q.id) && isAnswered(got[q.id]))
        .map((q) => ({ id: q.id, question: q.text, answer: got[q.id].answer.trim() }));
    if (!answers.length)
        return null;
    return { answers, limits: isAnswered(got[LIMITS]) ? got[LIMITS].answer.trim() : "" };
}
export function founderBlock(w: FounderWords, max = 1400): string {
    const said = w.answers.map((a) => `- "${a.answer.replace(/\s+/g, " ")}"`).join("\n");
    return [
        "The founder's own words, from the founder questionnaire. A founder ad is made of these: quote them, or cut them down, keeping their meaning. Never write a new sentence, a new fact or a new feeling in the founder's voice.",
        said.length > max ? `${said.slice(0, max).trimEnd()}…` : said,
        w.limits ? `What the founder said about using their story: "${w.limits.replace(/\s+/g, " ").slice(0, 300)}"` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
const plain = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => plain(s).split(" ").filter((w) => w.length > 3);
export function inFounderWords(line: string, w: FounderWords): boolean {
    const want = tokens(line);
    if (want.length < 3)
        return true;
    return w.answers.some((a) => {
        const text = plain(a.answer);
        if (text.includes(plain(line)))
            return true;
        const have = new Set(tokens(a.answer));
        return want.filter((t) => have.has(t)).length / want.length >= 0.6;
    });
}
export const isFounderAd = (item: Pick<StudioItem, "label" | "person">) => /^founder\b/i.test(item.label.trim());
export function founderChecks(brandId: string, item: StudioItem, i: number): AuditItem[] {
    const p = item.plan;
    if (!p || !isFounderAd(item))
        return [];
    const w = founderWords(brandId);
    const n = i + 1;
    const signed = p.text_elements.find((t) => t.role === "attribution");
    if (!w) {
        return [{ check: "founder_words", status: "warn", message: `Image ${n} is a founder ad${signed ? `, signed "${signed.text}"` : ""}, and the founder's own words are not on file: every line of it was written by the app. Have the founder answer the first 2 sections of the questionnaire, or rewrite this as the brand speaking and take the signature off.`, line_index: i }];
    }
    const firstPerson = /\b(I|I'm|I've|I'd|my|me|we|we're|we've|our)\b/;
    const lines = [...p.text_elements.filter((t) => t.role !== "attribution" && t.role !== "label").map((t) => t.text), ...(p.ad_copy ? p.ad_copy.primary_text.split(/(?<=[.!?])\s+/).slice(0, 4) : [])].filter((t) => firstPerson.test(t));
    const loose = lines.filter((t) => !inFounderWords(t, w));
    return loose.length ? [{ check: "founder_words", status: "warn", message: `Image ${n} puts words in the founder's mouth that are not in the founder's answers: ${loose.slice(0, 3).map((t) => `"${t.slice(0, 70)}"`).join("; ")}. Use what the founder said, or say it as the brand.`, line_index: i }] : [];
}
