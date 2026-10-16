import type { AuditItem, StudioItem, StudioText } from "@/db/schema";
import { archetypeOf, WORLDS } from "./worlds";
export const OFFER_ARGUMENTS = [
    { id: "deal", label: "The deal", who: "People who already know the brand.", what: "The offer and its terms, stated plainly, with the range or the bundle shown.", kinds: ["price-anchor", "bundle-stack", "urgency-stamp"] },
    { id: "proof", label: "The proof", who: "People whose doubt is whether it is any good, not what it costs.", what: "A real review, word for word, carrying the whole frame. The offer is a small chip.", kinds: ["last-review"] },
    { id: "product", label: "The product", who: "Colder people, who need a reason it is worth the money before a discount matters.", what: "Why it is worth it at full price, in labelled callouts. The offer is a deadline, not the reason.", kinds: ["worth-it"] },
] as const;
export type OfferArgument = (typeof OFFER_ARGUMENTS)[number]["id"];
export const argumentOf = (archetype: string | null | undefined): OfferArgument | null => OFFER_ARGUMENTS.find((a) => (a.kinds as readonly string[]).includes(archetype ?? ""))?.id ?? null;
const argument = (id: OfferArgument) => OFFER_ARGUMENTS.find((a) => a.id === id)!;
export const BANK_ASPECTS = ["4:5", "9:16"] as const;
export function bankSize(i: {
    variants: number;
    sizes?: number;
    winners?: number;
    hooksEach?: number;
}): {
    base: number;
    withHooks: number;
} {
    const base = OFFER_ARGUMENTS.length * Math.max(1, i.variants) * (i.sizes ?? BANK_ASPECTS.length);
    return { base, withHooks: base + Math.max(0, i.winners ?? 0) * (i.hooksEach ?? 2) };
}
export interface BankPick {
    world: string;
    mode: string;
    archetype: string;
    label: string;
    reason: string;
    direction: string;
}
export function bankPicks(n: number): BankPick[] {
    const used = new Set<string>();
    const out: BankPick[] = [];
    const count = Math.max(1, Math.min(n, 12));
    for (let k = 0; k < count; k++) {
        const arg = OFFER_ARGUMENTS[k % OFFER_ARGUMENTS.length];
        const round = Math.floor(k / OFFER_ARGUMENTS.length);
        const kind = archetypeOf(arg.kinds[round % arg.kinds.length])!;
        const world = [...kind.worlds.slice(round % kind.worlds.length), ...kind.worlds, ...WORLDS.map((w) => w.id)].find((w) => !used.has(w))!;
        used.add(world);
        out.push({
            world,
            mode: kind.mode,
            archetype: kind.id,
            label: `${arg.label}: ${kind.label.toLowerCase()}`,
            reason: `${arg.label}. ${arg.who}`,
            direction: `ARGUMENT: ${arg.label.toUpperCase()}. For: ${arg.who} ${arg.what} This ad makes this argument and no other. FORMAT: ${kind.label}. ${kind.picture} ${kind.words}`,
        });
    }
    return out;
}
export const BANK_NOTE = "Offer ad bank: the same offer argued 3 ways (the deal, the proof, the product). The offer line is its own text on every ad, so it can be changed on all of them at once.";
export const isBank = (notes: string | null | undefined) => /^Offer ad bank:/m.test(notes ?? "");
export const OFFER_BANK_RULES = [
    "OFFER AD BANK. This set argues 1 offer 3 ways. Each ad's direction names its argument, and the ad makes only that one:",
    ...OFFER_ARGUMENTS.map((a) => `- ${a.label}: ${a.what} For: ${a.who}`),
    "THE OFFER LINE. On every ad the offer's own numbers and dates (the price, the saving, what is given, the last day) appear exactly once, as 1 text element with role `offer`, in the offer's own words, 12 words at most, with `source` set to the offer's id. No other text element repeats a number or a date of the offer. It may be the biggest text on a deal ad, a small chip on a proof ad, and a line under the callouts on a product ad, where it is the deadline if the offer has a real one and never the headline. This is what lets the offer change later without the picture being made again.",
    "THE PROOF is a real review from the research, word for word, with only the attribution its source holds. No person in the picture is shown as the reviewer.",
    "CHOOSE A SUPPORTED REASON inside the assigned argument. Deal: verified saving, included bundle or actual access. Proof: a source-backed review that answers the buyer's specific doubt. Product: a supported benefit and mechanism, an approved use, gift suitability or a verified comparison. Choose one reason per ad; do not borrow a competitor's facts. Missing review evidence is a gap to flag, never a quote to invent. Price, stock, access and delivery urgency come only from the approved offer or brand facts.",
    "TOLD APART AT A GLANCE. At 300 pixels wide a person should name the argument of each ad without reading it: give each argument its own layout, ground and dominant colour. 3 crops of 1 ad are 1 ad.",
].join("\n");
export const offerLineOf = (plan: {
    text_elements: StudioText[];
} | undefined | null) => plan?.text_elements.find((t) => t.role === "offer")?.text ?? "";
export function withOfferLine(texts: StudioText[], line: string): {
    texts: StudioText[];
    changed: boolean;
} {
    const next = line.replace(/\s+/g, " ").trim();
    let changed = false;
    const out = texts.map((t) => {
        if (t.role !== "offer" || t.text === next || !next)
            return t;
        changed = true;
        return { ...t, text: next };
    });
    return { texts: out, changed };
}
const list = (ns: number[]) => (ns.length < 2 ? String(ns[0]) : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`);
export function bankChecks(run: {
    kind: string;
    items: Pick<StudioItem, "archetype" | "world" | "plan">[];
    notes?: string | null;
}): AuditItem[] {
    if (run.kind !== "ad" || !isBank(run.notes))
        return [];
    const ads = run.items.map((item, i) => ({ n: i + 1, arg: argumentOf(item.archetype), kind: item.archetype ?? "", world: item.world ?? "", plan: item.plan }));
    const out: AuditItem[] = [];
    const made = new Map<OfferArgument, number[]>();
    for (const a of ads)
        if (a.arg)
            made.set(a.arg, [...(made.get(a.arg) ?? []), a.n]);
    if (ads.length >= 3) {
        const missing = OFFER_ARGUMENTS.filter((a) => !made.has(a.id));
        if (missing.length)
            out.push({ check: "set_variety", status: "warn", message: `No ad in this set argues ${missing.map((a) => a.label.toLowerCase()).join(" or ")}. ${missing.map((a) => a.who).join(" ")} An offer needs all 3 arguments, because the person who needs proof is not the person who needs the deal.` });
    }
    if (ads.length >= 4) {
        const [top, ns] = [...made].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
        if (top && ns.length / ads.length > 0.6)
            out.push({ check: "set_variety", status: "warn", message: `${ns.length} of ${ads.length} ads argue ${argument(top).label.toLowerCase()}. Many versions of 1 argument are still 1 ad: the point of the bank is the 3 arguments, and the count is what falls out of making them across the range.` });
    }
    const twins: [
        number,
        number
    ][] = [];
    for (let i = 0; i < ads.length; i++)
        for (let j = i + 1; j < ads.length; j++)
            if (ads[i].kind && ads[i].kind === ads[j].kind && ads[i].world && ads[i].world === ads[j].world)
                twins.push([ads[i].n, ads[j].n]);
    if (twins.length)
        out.push({ check: "set_variety", status: "warn", message: `Images ${twins.slice(0, 4).map(([a, b]) => `${a} and ${b}`).join("; ")} are the same kind of ad in the same look. At thumbnail size they are 1 ad, and a test between them shows nothing.` });
    const noLine = ads.filter((a) => a.plan && a.plan.text_elements.length > 0 && !offerLineOf(a.plan)).map((a) => a.n);
    if (noLine.length)
        out.push({ check: "offer_line", status: "warn", message: `Image${noLine.length === 1 ? "" : "s"} ${list(noLine)} ${noLine.length === 1 ? "has" : "have"} no offer line of ${noLine.length === 1 ? "its" : "their"} own (a text with the role "offer"). When the offer changes, ${noLine.length === 1 ? "that ad" : "those ads"} will not change with the rest.` });
    const lines = new Set(ads.map((a) => offerLineOf(a.plan).toLowerCase()).filter(Boolean));
    if (lines.size > 1)
        out.push({ check: "offer_line", status: "warn", message: `The ads state the offer in ${lines.size} different ways. 1 offer is said 1 way: set the line once for the whole set.` });
    return out;
}
export interface ThumbSignature {
    bits: number[];
    rgb: [
        number,
        number,
        number
    ];
}
export function signatureFrom(grey: ArrayLike<number>, rgb: [
    number,
    number,
    number
]): ThumbSignature {
    const bits: number[] = [];
    for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++)
            bits.push(grey[y * 9 + x] < grey[y * 9 + x + 1] ? 1 : 0);
    return { bits, rgb };
}
export function alike(a: ThumbSignature, b: ThumbSignature): boolean {
    let differ = 0;
    for (let i = 0; i < 64; i++)
        if (a.bits[i] !== b.bits[i])
            differ++;
    const colour = Math.hypot(a.rgb[0] - b.rgb[0], a.rgb[1] - b.rgb[1], a.rgb[2] - b.rgb[2]);
    return differ <= 8 && colour < 45;
}
export function alikePairs(sigs: {
    n: number;
    sig: ThumbSignature;
}[]): [
    number,
    number
][] {
    const out: [
        number,
        number
    ][] = [];
    for (let i = 0; i < sigs.length; i++)
        for (let j = i + 1; j < sigs.length; j++)
            if (alike(sigs[i].sig, sigs[j].sig))
                out.push([sigs[i].n, sigs[j].n]);
    return out;
}
