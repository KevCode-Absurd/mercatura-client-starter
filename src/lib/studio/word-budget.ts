import { STAGES, type Stage, type Taste } from "../taste/types";
import { WORD_BUDGET, WORD_BUDGET_CARRIED, WORD_BUDGET_OWN_WORDS, wordBudget, type WordBudget } from "../taste/defaults";
import { parseTaste } from "../taste/schema";
import { planForm } from "./forms";
import { FORMS_OF_LOOK, OWN_HAND_KINDS, formId, inOwnHand } from "./forms";
import { worldOf } from "./worlds";
type Text = {
    role: string;
    text: string;
};
export const wordsIn = (s: string): number => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%:/-]*/gu) ?? []).length;
export const wordsOnPicture = (texts: Pick<Text, "text">[]): number => texts.reduce((n, t) => n + wordsIn(t.text), 0);
const PLACEHOLDER = /\[[^\]]+\]/;
type Kind = "caption" | "point" | "badge" | "subhead" | "label" | "button" | "keep";
export function kindOf(role: string): Kind {
    const r = role.toLowerCase();
    if (/price|offer|deal|discount|guarantee|quote|review|testimonial|attribution/.test(r))
        return "keep";
    if (/sub[- ]?(head|title|line)|body|support/.test(r))
        return "subhead";
    if (/headline|hook|statement|title/.test(r))
        return "keep";
    if (/caption/.test(r))
        return "caption";
    if (/point|bullet|benefit|step|reason|chip/.test(r))
        return "point";
    if (/badge|flag|\btag\b|sticker|burst/.test(r))
        return "badge";
    if (/label/.test(r))
        return "label";
    if (/cta|button/.test(r))
        return "button";
    return "keep";
}
export const CUT_ORDER = ["caption", "point", "badge", "subhead", "label"] as const satisfies readonly Kind[];
export const mayBeEmpty = (role: string): boolean => (CUT_ORDER as readonly Kind[]).includes(kindOf(role));
const CARRIED_FORMS = new Set(["note", "testimonial", "comparison"]);
const CARRIED_TYPES = /native-format-mimicry|review-and-testimonial|comparison-and-us-vs-them|versus-comparison/;
type ItemLike = {
    type?: string;
    world?: string;
    mode?: string;
    slot?: number;
    taste?: Taste;
    plan?: object | null;
    dealt_form?: string;
};
const formOf = (item: ItemLike) => planForm(item.plan) || formId(item.dealt_form);
export function carriedByWords(item: ItemLike): boolean {
    const form = formOf(item);
    if (form)
        return CARRIED_FORMS.has(form);
    return CARRIED_TYPES.test(item.type ?? "") || item.mode === "native" || worldOf(item.world)?.family === "native";
}
export function ownHand(item: ItemLike): boolean {
    const form = formOf(item);
    if (form)
        return inOwnHand(form);
    const look = FORMS_OF_LOOK[item.world ?? ""];
    if (look)
        return look.some(inOwnHand);
    return /native-format-mimicry/.test(item.type ?? "") || item.mode === "native" || worldOf(item.world)?.family === "native";
}
export function unawareWords(run: Parameters<typeof fullByHand>[0] & {
    kind: string;
}, item: ItemLike, stage: string | null | undefined, pictureWords: "none" | "headline" | "full", saidNone = false): "none" | "full" | null {
    if (run.kind !== "ad" || asStage(stage) !== "unaware" || fullByHand(run, item) || !formOf(item))
        return null;
    if (ownHand(item))
        return pictureWords === "none" && !saidNone ? "full" : null;
    return pictureWords === "none" ? null : "none";
}
const structural = (item: ItemLike): RegExp | undefined => (planForm(item.plan) === "comparison" || /comparison|versus/.test(item.type ?? "") ? /label|column|row|table/i : undefined);
export const fullByHand = (run: {
    context?: {
        taste?: unknown;
    } | null;
}, item?: Pick<ItemLike, "slot" | "taste"> | null): boolean => parseTaste(run.context?.taste).words === "full" || (!item?.slot && parseTaste(item?.taste).words === "full");
const asStage = (s: string | null | undefined): Stage | null => {
    const t = (s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    return (STAGES as readonly string[]).includes(t) ? (t as Stage) : null;
};
export function budgetOf(run: {
    kind: string;
    context?: {
        taste?: unknown;
    } | null;
}, item: ItemLike, stage: string | null | undefined, pictureWords: "none" | "headline" | "full" = "full"): WordBudget | null {
    if (run.kind !== "ad" || fullByHand(run, item))
        return null;
    if (pictureWords === "none")
        return WORD_BUDGET.unaware;
    const st = asStage(stage);
    return wordBudget(st, { ownWords: st === "unaware" && ownHand(item), carried: carriedByWords(item) });
}
export function layerBudgetOf(run: Parameters<typeof budgetOf>[0], item: ItemLike, stage: string | null | undefined): WordBudget | null {
    if (run.kind !== "ad" || fullByHand(run, item))
        return null;
    return asStage(stage) === "unaware" && !ownHand(item) ? WORD_BUDGET.unaware : budgetOf(run, item, stage, "full");
}
export function fitLayer<T extends Text>(texts: T[], budget: WordBudget | null, stage?: string | null): {
    texts: T[];
    cut: T[];
} {
    if (!budget)
        return { texts, cut: [] };
    if (budget.words <= 0)
        return { texts: [], cut: [...texts] };
    return fitBudget(texts, budget, { stage });
}
export function fitBudget<T extends Text>(texts: T[], budget: WordBudget, o: {
    stage?: string | null;
    keep?: RegExp;
    thread?: boolean;
} = {}): {
    texts: T[];
    cut: T[];
    over: boolean;
} {
    const kept = [...texts];
    const over = () => isOver(kept, budget);
    const order: Kind[] = [...CUT_ORDER, ...(asStage(o.stage) === "most_aware" ? [] : (["button"] as const))];
    const free = (t: T) => order.includes(kindOf(t.role)) && !PLACEHOLDER.test(t.text) && !o.keep?.test(t.role);
    const lastMessage = o.thread ? [...kept].reverse().find(free) : undefined;
    const pick = (): number => {
        for (const kind of order) {
            const at = kept.map((_, i) => i).filter((i) => kindOf(kept[i].role) === kind && free(kept[i]) && kept[i] !== lastMessage && !kept.slice(i + 1).some((t) => pointsBack(t.text)));
            if (at.length)
                return o.thread ? at[0] : at[at.length - 1];
        }
        return -1;
    };
    while (over()) {
        const at = pick();
        if (at < 0)
            break;
        kept.splice(at, 1);
    }
    return { texts: kept, cut: texts.filter((x) => !kept.includes(x)), over: over() };
}
export function fitItem<T extends Text>(run: Parameters<typeof budgetOf>[0], item: ItemLike, texts: T[], stage: string | null | undefined, pictureWords: "none" | "headline" | "full" = "full"): {
    texts: T[];
    cut: T[];
    budget: WordBudget | null;
    over?: boolean;
} {
    const budget = budgetOf(run, item, stage, pictureWords);
    if (!budget || pictureWords === "none")
        return { texts, cut: [], budget };
    return { ...fitBudget(texts, budget, { stage, keep: structural(item), thread: isThread(item) }), budget };
}
export const isOver = (texts: Pick<Text, "text">[], budget: WordBudget): boolean => wordsOnPicture(texts) > budget.words || texts.length > budget.lines;
const POINTS_BACK = /\b(?:has|have|had|got|gets?|with|without|needs?|takes?|does|do|is|are)\s+(?:none|neither|both)\b|\bnone of (?:it|them|that|these|those)\b|\b(?:this|that)\s+one\b|\bthe\s+(?:other|others|rest|same|former|latter)\b|\b(?:it|its|they|them|those|these)\b|^\W*(?:and|but|so|or|because|which|then|that|this)\b/i;
export const pointsBack = (text: string): boolean => POINTS_BACK.test(text.replace(/[’‘]/g, "'"));
const THREAD = /\b(?:messages?|thread|chat|bubbles?|texts?|texting|imessage|sms|dm|repl(?:y|ies))\b/i;
export function isThread(item: ItemLike): boolean {
    const plan = item.plan as {
        layout?: string;
        scene?: string;
    } | null | undefined;
    return item.world === "message-thread" || (planForm(item.plan) === "note" && THREAD.test(`${plan?.layout ?? ""} ${plan?.scene ?? ""}`));
}
export function budgetAsk(texts: Text[], budget: WordBudget, thread = false): string {
    const n = wordsOnPicture(texts);
    return `The picture carries ${n} word${n === 1 ? "" : "s"} in ${texts.length} line${texts.length === 1 ? "" : "s"} and may carry at most ${budget.words} in at most ${budget.lines} line${budget.lines === 1 ? "" : "s"}. Say this ad inside that ceiling: make lines shorter, or hand a line back empty where its slot allows it. The ad must still make sense alone: every line that stays stands without the ones that go, and no line points at a line that is gone ("this one", "has none", "the other").${thread ? " In a thread of messages the last message stays, and it is an answer, never a question left open." : ""} A quote, a price, an offer and a placeholder come back word for word.`;
}
export const cutLine = (t: Text, why = ""): string => `${t.role}: "${t.text.slice(0, 120)}"${why ? ` (${why})` : ""}`;
export const cutLayoutNote = (cut: Text[]): string => (cut.length ? ` Left off this picture to keep it sparse: ${cut.map((t) => `the ${t.role}`).join(", ")}. Nothing is drawn or written in ${cut.length === 1 ? "its place" : "their places"}.` : "");
const said = (b: WordBudget) => `${b.words} words in ${b.lines} line${b.lines === 1 ? "" : "s"}`;
export function wordBudgetRule(): string {
    const b = WORD_BUDGET;
    return `- **Few words on the picture.** A picture carries the fewest words that land its 1 idea, never as many as fit. The ceiling follows the buyer's stage, and a line is 1 text element: unaware, no words on the picture at all: no headline, no caption, and what the ad has to say is in the scene (only an ad that is itself ${OWN_HAND_KINDS.slice(0, -1).join(", ")} or ${OWN_HAND_KINDS.at(-1)} keeps its own words, ${WORD_BUDGET_OWN_WORDS.words} at most, written or typed as that person would); problem aware, ${said(b.problem_aware)}; solution aware, ${said(b.solution_aware)}; product aware, ${said(b.product_aware)}; most aware, ${said(b.most_aware)} (the headline, the offer, the button). A form carried by its words (a note, a testimonial, a comparison) may run ${WORD_BUDGET_CARRIED.words} words and ${WORD_BUDGET_CARRIED.lines} line over. A ceiling is not a target: most good ads sit well under it, and 1 line is a complete ad. Plan the picture so it needs no more, and give the number of words you planned on it in \`words_budget\`. Text elements over the ceiling are taken off afterwards, the last of the least needed kind first (a caption, then a point, a badge, a subhead, a label), so never plan a layout that only works with all of them. The headline is the biggest text.`;
}
export const wordBudgetLine = (b: WordBudget, o: {
    ownHand?: boolean;
    layer?: boolean;
} = {}): string => b.words <= 0
    ? `Words on the picture: none. ${o.layer ? "Nothing is laid over this picture: the headline and the body come back empty, and the feed copy makes the argument." : "This picture carries no words; say it in the scene. No headline, no caption, no label: `text_elements` is empty."}`
    : `Words on the picture: at most ${b.words}, in at most ${b.lines} line${b.lines === 1 ? "" : "s"}. A ceiling, not a target: the fewest that carry the 1 idea, and 1 line is a complete ad. A caption, point, badge, subhead or label may stay empty.${o.ownHand ? " The words are the note, the message or the sign itself, written or typed as that person would: no headline set by a brand." : ""}`;
export const AGAIN = "Write these lines again.";
export function againBlock(texts: Text[], asks: string[], keepRest = true): string {
    return [`${AGAIN} This ad's lines as they stand, in the order they are returned:`, ...texts.map((t, i) => `${i + 1}. ${t.role}: ${JSON.stringify(t.text)}`), "What must change:", ...asks.map((a) => `- ${a}`), keepRest ? "Every other line comes back word for word." : "", "Add no figure, no fact and no offer term the lines did not have."].filter(Boolean).join("\n");
}
export const disclosureNote = (notice: string): string => `Disclosure to add before publishing: ${notice.trim().replace(/\s+/g, " ")}`;
