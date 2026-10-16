export const GAP_MIN = 0.3;
export const WEIGHTS = { industry: 30, neighbour: 12, awareness: 25, argue: 15, heard: -10, format: 10, works: 10, avoid: -12, winner: 8 } as const;
export const INDUSTRIES: [
    string,
    RegExp
][] = [
    ["Supplements and wellness", /supplement|vitamin|nutri|wellness|\bhealth|gumm|probiotic|protein|\bgreens\b|nutraceutical/i],
    ["Beauty and personal care", /beauty|cosmetic|skin ?care|personal care|\bhair|makeup|fragrance|grooming/i],
    ["Fashion and accessories", /fashion|apparel|cloth|accessor|jewel|watch|\bbags?\b|leather|shoe|footwear|luggage/i],
    ["Food and drink", /\bfood|drink|beverage|snack|coffee|\btea\b|alcohol/i],
    ["Home and living", /\bhome|garden|bedding|decor|furniture|kitchen|cookware/i],
    ["Kids and baby", /\bkids?\b|baby|child|\btoys?\b/i],
    ["Pet", /\bpets?\b|\bdogs?\b|\bcats?\b/i],
    ["Fitness and sport", /fitness|\bsport|training|\bgym/i],
    ["Tech", /\btech|electronic|gadget|device/i],
];
export const industriesOf = (text: string): string[] => INDUSTRIES.filter(([, re]) => re.test(text)).map(([name]) => name);
export const AD_KINDS: [
    string,
    string,
    RegExp
][] = [
    ["problem", "Problem and solution", /problem|agitat|objection|pain point|symptom/i],
    ["proof", "Proof and reviews", /social proof|testimonial|review|before and after|before-after|transformation|ugc/i],
    ["offer", "Offer", /offer|promotion|discount|\bsale\b|risk reversal|direct response|bundle|gift guide/i],
    ["comparison", "Us against them", /us vs them|comparison|competitor|versus/i],
    ["product", "Product and how it works", /feature|ingredient|mechanism|demonstration|educational|product showcase|product-centric|how it works|benefit/i],
    ["brand", "Lifestyle and brand", /aesthetic|lifestyle|aspirational|identity|editorial|minimalist|sensory|humor/i],
];
export const adKindsOf = (tags: Record<string, string[]>, categories: string[]): string[] => {
    const text = [...(tags.approach ?? []), ...(tags.hook ?? []), ...categories].join(" | ");
    return AD_KINDS.filter(([, , re]) => re.test(text)).map(([id]) => id);
};
export const adKindLabel = (id: string) => AD_KINDS.find(([k]) => k === id)?.[1] ?? id;
const AS_ACCOUNT_FORMAT: Record<string, string> = { ugc: "ugc", testimonial: "ugc", static: "static", carousel: "carousel", advertorial: "advertorial-static", vsl: "edited", demo: "satisfying" };
export interface GapNote {
    weight: number;
    why: string;
}
export interface BrandFit {
    brandName: string;
    industries: string[];
    marketStage: number | null;
    gaps: {
        awareness: Record<string, GapNote>;
        sophistication: Record<string, GapNote>;
        format: Record<string, GapNote>;
    };
    winners: {
        name: string;
        awareness: string;
        format: string;
    }[];
    works: string[];
    avoid: string[];
    simulated: boolean;
    basis: string[];
}
export interface RefFacts {
    id: string;
    kind: "image" | "video";
    industryText: string;
    awareness: string | null;
    sophistication: string | null;
    formats: string[];
    tagText: string;
}
export interface FitScore {
    score: number;
    reasons: string[];
    gap: boolean;
    sameIndustry: boolean;
}
const STOP = new Set(["with", "that", "this", "from", "have", "what", "when", "your", "their", "they", "than", "then", "more", "most", "into", "over", "every", "about", "which", "while", "after", "before", "because", "should", "always", "never", "works", "work", "avoid", "brand", "product", "customers", "customer", "buyers", "buyer", "people"]);
export const keyWords = (line: string): string[] => [...new Set((line.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter((w) => !STOP.has(w)))];
const matches = (line: string, text: string): boolean => {
    const words = keyWords(line);
    return words.length >= 2 && words.filter((w) => text.includes(w.replace(/s$/, ""))).length >= 2;
};
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const STAGE_WORDS: Record<string, string> = { unaware: "unaware", problem_aware: "problem-aware", solution_aware: "solution-aware", product_aware: "product-aware", most_aware: "most-aware" };
export function scoreForBrand(ref: RefFacts, fit: BrandFit): FitScore {
    const parts: [
        number,
        string
    ][] = [];
    const mine = industriesOf(ref.industryText);
    const sameIndustry = mine.some((i) => fit.industries.includes(i));
    if (sameIndustry)
        parts.push([WEIGHTS.industry, `Your industry: ${mine.find((i) => fit.industries.includes(i))!.toLowerCase()}.`]);
    else if (mine.length === 0 && fit.industries.length)
        parts.push([WEIGHTS.neighbour, "No industry of its own: the idea carries across."]);
    let gap = false;
    const aw = ref.awareness ? fit.gaps.awareness[ref.awareness] : undefined;
    if (aw && aw.weight >= GAP_MIN) {
        gap = true;
        parts.push([Math.round(WEIGHTS.awareness * aw.weight), `Fills a gap: it speaks to ${STAGE_WORDS[ref.awareness!] ?? ref.awareness} buyers. ${aw.why}`.trim()]);
    }
    const stage = ref.sophistication ? Number(ref.sophistication) : null;
    if (stage && fit.marketStage) {
        const lacking = fit.gaps.sophistication[String(stage)];
        if (stage < fit.marketStage)
            parts.push([WEIGHTS.heard, `It argues at stage ${stage}. Your market is at stage ${fit.marketStage} and has heard that.`]);
        else if (lacking && lacking.weight >= GAP_MIN) {
            gap = true;
            parts.push([Math.round(WEIGHTS.argue * Math.max(0.6, lacking.weight)), `Argues at stage ${stage}, where you have little. ${lacking.why}`.trim()]);
        }
        else
            parts.push([Math.round(WEIGHTS.argue * 0.5), `Argues at stage ${stage}, where your market still listens.`]);
    }
    const lackedFormat = ref.formats.map((f) => [f, fit.gaps.format[AS_ACCOUNT_FORMAT[f] ?? ""]] as const).find(([, g]) => g && g.weight >= GAP_MIN);
    if (lackedFormat) {
        gap = true;
        parts.push([Math.round(WEIGHTS.format * lackedFormat[1]!.weight * 2), `A kind of ad you have not run. ${lackedFormat[1]!.why}`.trim()]);
    }
    const winner = fit.winners.find((w) => w.awareness === ref.awareness && ref.formats.some((f) => AS_ACCOUNT_FORMAT[f] === w.format));
    if (winner)
        parts.push([WEIGHTS.winner, `Same kind as an ad that works for you ("${clip(winner.name, 50)}"): a variant to try.`]);
    const text = `${ref.tagText} ${ref.industryText}`.toLowerCase();
    const works = fit.works.find((w) => matches(w, text));
    if (works)
        parts.push([WEIGHTS.works, `Matches what works for you: "${clip(works, 90)}"`]);
    const avoid = fit.avoid.find((w) => matches(w, text));
    if (avoid)
        parts.push([WEIGHTS.avoid, `Close to what you avoid: "${clip(avoid, 90)}"`]);
    const raw = parts.reduce((n, [p]) => n + p, 0);
    return { score: Math.max(0, Math.min(100, raw)), reasons: parts.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).map(([, r]) => r), gap, sameIndustry };
}
export function rankForBrand<T extends RefFacts>(refs: T[], fit: BrandFit): (T & {
    fit: FitScore;
})[] {
    return refs
        .map((r, at) => ({ ...r, fit: scoreForBrand(r, fit), at }))
        .sort((a, b) => b.fit.score - a.fit.score || a.at - b.at)
        .map(({ at: _at, ...r }) => r as unknown as T & {
        fit: FitScore;
    });
}
