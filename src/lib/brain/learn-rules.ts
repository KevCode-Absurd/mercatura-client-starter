import type { Cell, Coverage, Dimension } from "../coverage/model";
import type { LearningKind } from "./docs";
export const MIN_ADS = 2;
export const MIN_SHARE = 0.08;
export const STRONG = 1.25;
export const WEAK = 0.7;
export const GAP_WEIGHT = 0.5;
export const MAX_GAPS = 3;
export const MAX_FIXES = 2;
export type LearnSource = "account" | "feedback" | "winner";
export interface Proposal {
    subject: string;
    target: Extract<LearningKind, "works" | "avoid" | "ideas" | "questions">;
    text: string;
    evidence: string[];
    source: LearnSource;
    simulated: boolean;
    strength: number;
}
export interface LessonFact {
    id: string;
    rule: string;
    why: string;
    kind: "avoid" | "keep";
    times: number;
}
export interface WinnerFact {
    name: string;
    kind: string;
    result: string;
    why: string;
}
export interface LearnInput {
    coverage: Coverage | null;
    account: {
        simulated: boolean;
        period: string;
    } | null;
    lessons: LessonFact[];
    winners: WinnerFact[];
}
const pct = (n: number) => `${Math.round(n * 100)}%`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export function cellSubject(dimension: Dimension, cell: Pick<Cell, "label">): string {
    const label = cell.label.replace(/^\d\s*·\s*/, "");
    switch (dimension) {
        case "awareness":
            return `Ads for ${lower(label)} buyers`;
        case "sophistication":
            return `Ads that argue by ${lower(label)}`;
        case "format":
            return `${label}s`.replace(/ss$/, "s");
        case "persona":
            return `Ads written for ${label}`;
        case "offer":
            return `Ads with the offer "${label}"`;
        default:
            return `Ads reaching ${label}`;
    }
}
const LEARN_DIMS: Dimension[] = ["format", "awareness", "persona", "sophistication", "offer"];
export function proposeLearnings(i: LearnInput): Proposal[] {
    const out: Proposal[] = [];
    const cov = i.coverage;
    const base = cov?.totals.roas ?? null;
    if (cov && i.account && base && base > 0) {
        const from = `${i.account.simulated ? "A simulated ad account" : "The ad account"}, ${i.account.period}: ${cov.totals.ads} ads, a return of ${base.toFixed(2)} on spend.`;
        for (const dimension of LEARN_DIMS) {
            for (const cell of cov.dims[dimension] ?? []) {
                if (cell.ads < MIN_ADS || cell.spend_share < MIN_SHARE || cell.roas == null)
                    continue;
                const times = cell.roas / base;
                if (times < STRONG && times > WEAK)
                    continue;
                const subject = cellSubject(dimension, cell);
                const facts = `${cell.ads} ads, ${pct(cell.spend_share)} of spend, a return of ${cell.roas.toFixed(2)}.`;
                out.push(times >= STRONG
                    ? { subject: `account:${dimension}:${cell.key}`, target: "works", text: `${subject} return ${times.toFixed(1)} times the account's average (${cell.ads} ads, ${pct(cell.spend_share)} of spend). Make more of them.`, evidence: [from, facts], source: "account", simulated: i.account.simulated, strength: times * cell.spend_share * 10 }
                    : { subject: `account:${dimension}:${cell.key}`, target: "avoid", text: `${subject} return ${times.toFixed(1)} times the account's average on ${pct(cell.spend_share)} of spend (${cell.ads} ads). Rework them or move the spend.`, evidence: [from, facts], source: "account", simulated: i.account.simulated, strength: (1 / Math.max(0.1, times)) * cell.spend_share * 10 });
            }
        }
        for (const g of cov.gaps.filter((x) => x.weight >= GAP_WEIGHT).slice(0, MAX_GAPS))
            out.push({ subject: `gap:${g.id}`, target: "ideas", text: `Not tried yet: ${lower(g.label)} (${g.dimension}). ${g.why}`.trim(), evidence: [from], source: "account", simulated: i.account.simulated, strength: g.weight });
        for (const f of cov.fixes.slice(0, MAX_FIXES))
            out.push({ subject: `fix:${f.ad.id}`, target: "ideas", text: `"${f.ad.name}" has 1 weak part, its ${f.part}. ${f.why}`, evidence: [from, `${pct(f.hook_rate)} of people start it, ${pct(f.hold_rate)} of those stay to 15 seconds, on ${pct(f.spend_share)} of spend.`], source: "account", simulated: i.account.simulated, strength: f.spend_share * 5 });
    }
    for (const l of i.lessons) {
        if (l.kind === "avoid" && l.times < 2)
            continue;
        out.push({ subject: `lesson:${l.id}`, target: l.kind === "keep" ? "works" : "avoid", text: l.rule, evidence: [l.kind === "keep" ? "Named as a reason a piece was approved." : `Said ${l.times} times in feedback.`, ...(l.why ? [l.why] : [])], source: "feedback", simulated: false, strength: l.times });
    }
    for (const w of i.winners) {
        if (!w.result.trim() || !w.why.trim())
            continue;
        out.push({ subject: `winner:${w.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`, target: "works", text: `${w.why.replace(/\.$/, "")}. Seen in the winning ${lower(w.kind)} "${w.name}".`, evidence: [`Its result, as the team gave it: ${w.result}`], source: "winner", simulated: false, strength: 2 });
    }
    return out.sort((a, b) => b.strength - a.strength);
}
export function learningLine(p: Pick<Proposal, "text" | "simulated" | "source">, date: string): string {
    const basis = p.source === "account" ? (p.simulated ? "simulated account" : "ad account") : p.source === "feedback" ? "your feedback" : "a winner you added";
    return `${p.text.replace(/\s+/g, " ").trim()} [learned ${date}, ${basis}]`;
}
