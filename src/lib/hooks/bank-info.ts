import { z } from "zod";
import type { AwarenessStage } from "../taxonomy";
export const HOOK_TYPES = ["callout_demographic", "callout_pain", "callout_identity", "callout_situation", "skeptic", "founder", "curiosity", "contrarian", "proof", "question", "offer", "gifting", "season", "other"] as const;
export type HookType = (typeof HOOK_TYPES)[number];
export const HOOK_TYPE_LABEL: Record<HookType, string> = {
    callout_demographic: "Names who they are",
    callout_pain: "Names the pain",
    callout_identity: "Names how they see themselves",
    callout_situation: "Names the moment",
    skeptic: "A doubter, turned",
    founder: "The founder speaks",
    curiosity: "Opens a question",
    contrarian: "Goes against the usual",
    proof: "Leads with a number",
    question: "Asks",
    offer: "States the offer",
    gifting: "For a gift",
    season: "For a season",
    other: "Other",
};
export const OpenerSchema = z.object({
    id: z.string(),
    line: z.string().min(3),
    type: z.enum(HOOK_TYPES),
    stage: z.enum(["", "unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"]),
    occasion: z.enum(["", "gifting", "sale", "season"]),
    niche: z.string(),
    needs: z.enum(["", "real_person", "real_proof"]),
});
export type Opener = z.infer<typeof OpenerSchema>;
export interface FounderHook {
    id: string;
    label: string;
    what: string;
    formula: string;
    beats: {
        what: string;
        seconds: number;
    }[];
    when: string;
    needs: string;
}
export const FOUNDER_HOOKS: FounderHook[] = [
    { id: "frustration_origin", label: "The frustration origin", what: "You were a customer first, could not find what you needed, and made it.", formula: "I was sick of [problem] so I built [product].", beats: [{ what: "The frustration", seconds: 5 }, { what: "What you tried", seconds: 10 }, { what: "The moment you decided to build it", seconds: 5 }, { what: "What makes yours different", seconds: 15 }, { what: "The call to action", seconds: 5 }], when: "The founder really was a customer first. The most common, and the strongest.", needs: "The real years, the real spend, the real job left." },
    { id: "credential", label: "The credential", what: "A background that bears on the product, said first.", formula: "I've [credential] and here's what most people get wrong about [category].", beats: [{ what: "The credential", seconds: 3 }, { what: "What the trade knows and buyers do not", seconds: 10 }, { what: "What is wrong with what is sold", seconds: 10 }, { what: "How yours is different", seconds: 15 }, { what: "The call to action", seconds: 5 }], when: "Only when the founder has a background that bears on the product.", needs: "A real credential that can be checked. Never a named former employer's secrets." },
    { id: "against_the_grain", label: "Against the grain", what: "What the whole category does, and the opposite the brand really does.", formula: "Everyone in [industry] does [common practice]. We do the exact opposite.", beats: [{ what: "What everyone does", seconds: 3 }, { what: "\"We do the opposite\"", seconds: 3 }, { what: "Why the usual way is wrong", seconds: 15 }, { what: "Your way", seconds: 15 }, { what: "The call to action", seconds: 5 }], when: "The brand truly does something different. Said as \"we\", so it holds without the founder's own story.", needs: "The practice is true of the brand, and what is said of the category is fair. A kind of product, never a named one." },
    { id: "vulnerability", label: "The hard moment", what: "Plain honesty about the worst stretch. People back real brands, not perfect ones.", formula: "I almost shut down the company in [year]. Here's what saved it.", beats: [{ what: "The low point", seconds: 5 }, { what: "What went wrong", seconds: 10 }, { what: "What turned it", seconds: 10 }, { what: "Where it is now", seconds: 10 }, { what: "The call to action", seconds: 5 }], when: "There is a true low point to tell.", needs: "The real event, the real year, the real numbers." },
    { id: "process_reveal", label: "The process, shown", what: "The factory, the lab, the ingredients, the making, on camera.", formula: "Here's exactly how we make [product]. Most brands would never show you this.", beats: [{ what: "\"Most brands hide this\"", seconds: 3 }, { what: "Behind the scenes", seconds: 15 }, { what: "Why it matters to the buyer", seconds: 10 }, { what: "What it means for quality", seconds: 10 }, { what: "The call to action", seconds: 5 }], when: "The brand can film where and how the product is really made.", needs: "Real footage of the real place. Nothing staged as a lab." },
];
export const founderHookSeconds = (h: FounderHook) => h.beats.reduce((n, b) => n + b.seconds, 0);
export const FOUNDER_FILMING = ["Film the body once, then film 10 different hooks for it: the same video with 10 openings.", "Film each hook 5 ways. The first take is never the best.", "Look at the lens, not the screen.", "Speak a fifth faster than feels natural.", "Under 60 seconds. 30 to 45 is the sweet spot."] as const;
export interface Callout {
    kind: "pain" | "situation" | "identity" | "want";
    label: string;
    from: string;
}
export const CALLOUT_SECONDS = 3;
export function calloutsFor(p: {
    problem?: string;
    trigger?: string;
    summary?: string;
    wants?: string;
    identity?: string;
} | null | undefined): Callout[] {
    if (!p)
        return [];
    const one = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
    return ([
        { kind: "pain", label: "By what they live with", from: one(p.problem) },
        { kind: "situation", label: "By the moment they are in", from: one(p.trigger) },
        { kind: "identity", label: "By how they see themselves", from: one(p.identity) || one(p.summary) },
        { kind: "want", label: "By what they want instead", from: one(p.wants) },
    ] as Callout[]).filter((c) => c.from.length > 0);
}
const GIFT_WORDS = /\b(gift|gifts|gifting|present|presents|stocking|holiday|christmas|xmas|hanukkah|valentine|mother's day|father's day|birthday|anniversary)\b/i;
const SALE_WORDS = /(\d+\s*% off|\bsale\b|black friday|cyber monday|\bbfcm\b|early access|last day)/i;
const nth = (year: number, month: number, weekday: number, n: number) => 1 + ((weekday - new Date(Date.UTC(year, month, 1)).getUTCDay() + 7) % 7) + (n - 1) * 7;
export function giftingSeason(today: string): boolean {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(today);
    if (!m)
        return false;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if ((mo === 11 && d >= 15) || (mo === 12 && d <= 24))
        return true;
    if (mo === 2 && d <= 14)
        return true;
    const mothers = nth(y, 4, 0, 2);
    const fathers = nth(y, 5, 0, 3);
    const before = (month: number, day: number) => {
        const days = (Date.UTC(y, month, day) - Date.UTC(y, mo - 1, d)) / 86400000;
        return days >= 0 && days <= 14;
    };
    return before(4, mothers) || before(5, fathers);
}
export function occasionsFor(text: string, today?: string): ("gifting" | "sale")[] {
    const out: ("gifting" | "sale")[] = [];
    if (GIFT_WORDS.test(text) || (today && giftingSeason(today)))
        out.push("gifting");
    if (SALE_WORDS.test(text))
        out.push("sale");
    return out;
}
export interface PickOptions {
    stage?: AwarenessStage | null;
    occasions?: ("gifting" | "sale" | "season")[];
    category?: string;
    realPerson?: boolean;
    withProof?: boolean;
    types?: HookType[];
    seed?: number;
    n?: number;
}
const nicheFits = (niche: string, category: string) => !niche || new RegExp(`\\b${niche.replace(/s$/, "")}`, "i").test(category);
export function pickOpeners(bank: Opener[], o: PickOptions = {}): Opener[] {
    const occasions = o.occasions ?? [];
    const fits = bank.filter((b) => (o.realPerson || b.needs !== "real_person") &&
        (o.withProof || b.needs !== "real_proof") &&
        (!b.occasion || occasions.includes(b.occasion)) &&
        nicheFits(b.niche, o.category ?? "") &&
        (!o.types?.length || o.types.includes(b.type)) &&
        (!o.stage || !b.stage || b.stage === o.stage));
    const rank = (b: Opener) => (b.occasion ? 0 : o.stage && b.stage === o.stage ? 1 : 2);
    const byType = new Map<HookType, Opener[]>();
    for (const b of [...fits].sort((x, y) => rank(x) - rank(y)))
        byType.set(b.type, [...(byType.get(b.type) ?? []), b]);
    const turn = (k: HookType) => Math.min(...byType.get(k)!.map(rank)) + (k === "callout_demographic" ? 10 : 0);
    const kinds = [...byType.keys()].sort((a, b) => turn(a) - turn(b));
    const seed = Math.max(0, Math.round(o.seed ?? 0));
    const out: Opener[] = [];
    const want = Math.max(1, o.n ?? 6);
    for (let round = 0; out.length < want && round < 12; round++) {
        let took = false;
        for (const k of kinds) {
            const list = byType.get(k)!;
            const pick = list[(round + seed) % list.length];
            if (round < list.length && pick && !out.includes(pick)) {
                out.push(pick);
                took = true;
                if (out.length >= want)
                    break;
            }
        }
        if (!took)
            break;
    }
    return out;
}
export const SHAPE_RULE = "A shape is a way in, never a line to fill. Use one only where this ad can hold it, say it wholly in this buyer's own words, and put nothing in a blank that the ad does not state. Name what they do or live with, not their age or sex. No \"you\" statement about a health condition.";
export function bankBlock(i: {
    callouts: Callout[];
    shapes: Opener[];
    founder?: boolean;
}): string {
    if (!i.callouts.length && !i.shapes.length)
        return "";
    return [
        "## From the hook bank (optional ways in)",
        i.callouts.length ? `Who this ad can name in its first ${CALLOUT_SECONDS} seconds:\n${i.callouts.map((c) => `- ${c.label}: ${c.from}`).join("\n")}` : "",
        i.shapes.length ? `Shapes other ads have opened on, that suit this buyer:\n${i.shapes.map((s) => `- ${s.line} (${HOOK_TYPE_LABEL[s.type].toLowerCase()})`).join("\n")}` : "",
        i.founder ? `This is filmed by the real founder. The 5 founder hooks, each only where it is true:\n${FOUNDER_HOOKS.map((h) => `- ${h.label}: "${h.formula}" ${h.when} Needs: ${h.needs}`).join("\n")}` : "",
        SHAPE_RULE,
    ]
        .filter(Boolean)
        .join("\n\n");
}
