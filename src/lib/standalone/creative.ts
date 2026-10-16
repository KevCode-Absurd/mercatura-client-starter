import { z } from "zod";
import type { BrandBrain } from "../brand-brain";
import { assessEvidence, contentFingerprint, type BoundEvidence, type EvidenceScope } from "./evidence";
import { CREATIVE_RELEASE_INPUTS } from "./benchmark-fixtures";
export interface ResearchPassage {
    id: string;
    sourceId: string;
    sourceType: string;
    type: string;
    quote: string;
}
export function buyingMoments(passages: ResearchPassage[], fallback: string) {
    const types: Record<string, string[]> = { coping_routine: ["accommodation"], failed_alternative: ["failed_solution"], near_objection: ["final_objection", "objection"], exact_phrase: ["buyer_word", "desire", "purchase_driver"], trigger_moment: ["trigger_moment"] };
    return Object.entries(types).map(([signal, allowed]) => {
        const evidence = passages.filter((p) => allowed.includes(p.type)).slice(0, 8);
        return { signal, evidence, scene: evidence.length ? `Stage a scene around: ${evidence[0].quote}` : `Explore this buyer situation: ${fallback || "an everyday product-use decision"}`,
            status: evidence.length ? "source_backed" : "hypothesis", staging: "Creative staging is a hypothesis. A category passage is not a testimonial for this product." };
    });
}
export const ProductionRecordSchema = z.object({ id: z.string(), source: z.enum(["concept", "script", "asset", "brief"]), productId: z.string(), buyer: z.string(), awareness: z.string(), argument: z.string(), format: z.string(), status: z.enum(["proposed", "drafted", "produced", "approved", "rejected"]), text: z.string(), execution: z.string(), imagePath: z.string().optional() });
export type ProductionRecord = z.infer<typeof ProductionRecordSchema>;
export function productionMap(records: ProductionRecord[], brief: {
    productId: string;
    buyer: string;
    awareness: string;
    arguments: string[];
}) {
    const key = (x: Pick<ProductionRecord, "productId" | "buyer" | "awareness" | "argument">) => [x.productId, x.buyer, x.awareness, x.argument].join(" · ");
    const groups = new Map<string, ProductionRecord[]>();
    for (const r of records)
        groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
    return { total: records.length, cells: [...groups].map(([cell, items]) => ({ cell, items, formats: [...new Set(items.map((r) => r.format))] })),
        suggestions: brief.arguments.filter((argument) => !records.some((r) => key(r) === key({ ...brief, argument }))).map((argument) => ({ ...brief, argument, reason: "No locally saved output occupies this brief's buyer, stage and argument cell. Check proof readiness before producing it.", performance: "unknown" })) };
}
const synonyms: [
    RegExp,
    string
][] = [[/no more rummaging|find (?:your |the )?\w+ instantly|stop searching|easy to find|keep.*?organi[sz]ed/g, " organisation "], [/save time|faster|quickly|less time|time saving/g, " speed "], [/small space|small kitchen|compact|space saving/g, " compact "], [/peace of mind|worry free|less worry/g, " reassurance "]];
export function argumentTokens(text: string) {
    let value = text.toLowerCase();
    for (const [pattern, replacement] of synonyms)
        value = value.replace(pattern, replacement);
    return new Set((value.match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !["the", "and", "for", "with", "your", "this", "that", "from", "our", "you", "can"].includes(w)));
}
export function similarity(a: string, b: string) {
    const x = argumentTokens(a), y = argumentTokens(b);
    if (!x.size || !y.size)
        return 0;
    return [...x].filter((w) => y.has(w)).length / Math.min(x.size, y.size);
}
export function duplicateCandidates(records: ProductionRecord[], keptSiblings: string[] = []) {
    const pairs = [];
    for (let i = 0; i < records.length; i++)
        for (let j = i + 1; j < records.length; j++) {
            const a = records[i], b = records[j];
            if (a.productId !== b.productId || a.buyer !== b.buyer)
                continue;
            const score = similarity(a.text, b.text), sameArgument = a.argument !== "unclassified" && a.argument === b.argument;
            if (score < .55 && !sameArgument)
                continue;
            const id = [a.id, b.id].sort().join("::");
            pairs.push({ id, a: a.id, b: b.id, label: a.execution === b.execution ? "headline variation" : "new execution", status: keptSiblings.includes(id) ? "deliberate sibling" : "needs semantic review", reason: `${sameArgument ? "Same recorded argument. " : ""}${Math.round(score * 100)}% normalized concept overlap; wording similarity alone is not a final judgment.`, visual: a.imagePath && b.imagePath ? "ready for local image comparison" : "pending: one or both renders are unavailable" });
        }
    return pairs;
}
export const STAGES = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] as const;
export function awarenessArguments(stage: string, basis: string, productFirst: boolean) {
    const index = STAGES.indexOf(stage as typeof STAGES[number]);
    if (index < 0)
        throw new Error("Unknown awareness stage.");
    const approaches = [
        { explanation: "Show a recognizable buying moment and name the unresolved problem.", proof: "Make the situation credible; do not assume a category or brand preference.", action: "Recognize the problem and inspect the explanation." },
        { explanation: "Explain why the problem persists and introduce a relevant way to solve it.", proof: "Support the proposed mechanism and its limits.", action: "Inspect how the approach fits this situation." },
        { explanation: "Compare relevant solution criteria before making the product case.", proof: "Use matched criteria; distinguish personal alternatives from measured superiority.", action: "Compare product fit against those criteria." },
        { explanation: "Resolve the product-specific doubt that blocks this purchase.", proof: "Use the exact variant, use conditions and purchase terms.", action: "Choose the supported product or variant." },
        { explanation: "Clarify the selected offer and practical next step.", proof: "Keep price, quantity, availability and terms visible.", action: "Review the offer and continue to purchase." },
    ];
    return { selected: stage, basis: basis.trim() || "An editable planning hypothesis; no research has established this stage.", productOpening: productFirst ? "Open with the product demonstration; explain it at the selected stage." : "Let the argument determine when the product appears.", ...approaches[index], alternative: { stage: STAGES[index === 4 ? 3 : index + 1], ...approaches[index === 4 ? 3 : index + 1] }, permanentPersonaChange: false };
}
export function headlineFamilies(scope: EvidenceScope, records: BoundEvidence[], promiseId: string, fixed: {
    visual: string;
    offer: string;
}) {
    const source = records.find((r) => r.id === promiseId);
    if (!source || !assessEvidence(source, scope).eligible)
        throw new Error("Select an eligible product-bound promise.");
    const promise = [source.text, ...source.qualifiers, source.kind === "offer" ? source.terms : ""].filter(Boolean).join(" ");
    const families = [
        { family: "benefit", line: promise }, { family: "question", line: `Looking for this? ${promise}` },
        { family: "callout", line: `For your next choice: ${promise}` }, { family: "curiosity", line: `A detail to look closer at: ${promise}` },
        { family: "specificity", line: promise, skip: !/\d/.test(source.text) ? "No supported numerical detail in the chosen promise." : undefined },
        { family: "authority", line: source.endorsement ? `${source.endorsement.name}, ${source.endorsement.role}: ${promise}` : promise, skip: source.kind !== "quote" || source.authenticity !== "original" || !source.endorsement?.permission ? "Requires separately verified authority and permission; a claim source is not an endorsement." : undefined },
        { family: "social_proof", line: promise, skip: source.kind !== "quote" || source.quoteRole !== "customer" || source.authenticity !== "original" ? "No applicable genuine customer quotation selected." : undefined },
        { family: "contrarian", line: source.beliefCorrection ? `${source.beliefCorrection.belief}? ${source.beliefCorrection.correction}. ${promise}` : promise, skip: !source.beliefCorrection ? "Requires a sourced belief and applicable disproof, rather than an invented myth." : undefined },
        { family: "loss", line: source.supportedLoss ? `${source.supportedLoss}. ${promise}` : promise, skip: !source.supportedLoss ? "No supported consequence or cost of the current alternative selected." : undefined },
        { family: "deadline", line: source.validUntil ? `${promise} Offer ends ${source.validUntil}.` : promise, skip: source.kind !== "offer" || !source.validUntil ? "No verified expiry attached to the chosen offer." : undefined },
    ];
    return families.map((f) => ({ ...f, framing: f.family, controlledVariable: "headline rhetoric", fixed: { ...fixed, promiseId: source.id, productId: scope.productId }, sourceId: source.id, qualifiers: source.qualifiers, semanticNote: "Same supported promise; these are rhetorical executions, not distinct concepts." }));
}
export const FeedbackSchema = z.object({ id: z.string(), artifactId: z.string().min(1), kind: z.enum(["fact", "preference", "wrong_repair", "changed_preference"]), defect: z.enum(["wrong_product", "weak_argument", "repeated_idea", "unreadable_qualifier", "disconnected_visual", "off_brand", "other"]), diagnosis: z.string().min(1), repair: z.string().min(1), replacementRepair: z.string().optional(), replacesFeedbackId: z.string().optional(), scope: z.object({ productId: z.string(), campaign: z.string(), format: z.string() }), accepted: z.boolean(), contradictedBy: z.array(z.string()), reviewAt: z.string(), createdAt: z.string() });
export type Feedback = z.infer<typeof FeedbackSchema>;
export function feedbackAction(f: Feedback) {
    const action = f.kind === "fact" ? "Correct the underlying product/source record and refresh dependent outputs." : f.kind === "wrong_repair" ? "Keep the diagnosis; replace only the failed repair." : f.kind === "changed_preference" ? "Supersede the earlier preference within this campaign and format." : "Keep this taste choice scoped to the selected campaign, product and format.";
    return { action, reusable: f.accepted && f.kind !== "fact" && !f.contradictedBy.length && (f.kind !== "wrong_repair" || !!f.replacementRepair?.trim()), selectedRepair: f.kind === "wrong_repair" ? f.replacementRepair ?? "" : f.repair, scope: f.scope, reviewAt: f.reviewAt, diagnosis: f.diagnosis };
}
export function defectSummary(feedback: Feedback[]) {
    return [...new Set(feedback.map((f) => f.defect))].map((defect) => ({ defect, occurrences: feedback.filter((f) => f.defect === defect).length, acceptedFixes: feedback.filter((f) => f.defect === defect && feedbackAction(f).reusable), unreviewed: feedback.filter((f) => f.defect === defect && !f.accepted).length, performance: "unknown" }));
}
export function seedEvidence(brand: BrandBrain): BoundEvidence[] {
    return [
        ...brand.products.filter((p) => p.format.trim()).map((p): BoundEvidence => ({ id: `format:${p.id}`, kind: "fact", productIds: [p.id], variants: [], markets: [brand.brand.market], text: p.format, qualifiers: [], source: { id: `brand:product:${p.id}:format`, excerpt: JSON.stringify({ id: p.id, name: p.name, format: p.format }) }, status: "approved", revision: 1 })),
        ...brand.products.flatMap((p) => (p.specs ?? []).map((s, i): BoundEvidence => ({ id: `spec:${p.id}:${i}`, kind: "fact", productIds: [p.id], variants: [], markets: [brand.brand.market], text: `${s.name}: ${s.value}`, qualifiers: [], source: { id: `brand:product:${p.id}`, excerpt: JSON.stringify(p) }, status: "approved", revision: 1 }))),
        ...brand.claims.map((c): BoundEvidence => ({ id: `claim:${c.id}`, kind: "claim", productIds: [], variants: [], markets: [], text: c.text, qualifiers: [], source: { id: c.source || c.id, excerpt: c.text }, status: "pending", revision: 1 })),
        ...brand.offers.map((o): BoundEvidence => ({ id: `offer:${o.id}`, kind: "offer", productIds: [], variants: [], markets: [brand.brand.market], text: `${o.name}: ${o.price} ${brand.brand.currency}`, terms: o.notes ?? "", qualifiers: o.notes ? [o.notes] : [], source: { id: `brand:offer:${o.id}`, excerpt: JSON.stringify(o) }, status: "pending", revision: 1 })),
    ];
}
export const CREATIVE_RELEASE_CASES = [
    { id: "consumable-sparse", category: "consumable", evidence: "sparse", required: ["hypothesis_label"], forbidden: ["fictional_quote"] },
    { id: "consumable-rich", category: "consumable", evidence: "rich", required: ["qualifier_preserved"], forbidden: ["lost_qualifier"] },
    { id: "apparel-sparse", category: "apparel", evidence: "sparse", required: ["variant_match"], forbidden: ["wrong_sku"] },
    { id: "apparel-rich", category: "apparel", evidence: "rich", required: ["distinct_argument"], forbidden: ["same_idea"] },
    { id: "durable-sparse", category: "durable", evidence: "sparse", required: ["hypothesis_label"], forbidden: ["fake_test"] },
    { id: "durable-rich", category: "durable", evidence: "rich", required: ["variant_match"], forbidden: ["wrong_sku"] },
    { id: "home-sparse", category: "home", evidence: "sparse", required: ["readable_qualifier"], forbidden: ["unreadable_qualifier"] },
    { id: "home-rich", category: "home", evidence: "rich", required: ["distinct_argument"], forbidden: ["same_idea"] },
] as const;
export interface BenchmarkReview {
    fixtureHash?: string;
    caseId: string;
    candidate: string;
    checks: string[];
    defects: string[];
    passage: string;
    reviewed: boolean;
    retries: number;
    cost: number;
}
export function creativeBenchmark(reviews: BenchmarkReview[]) {
    const fixtureHash = contentFingerprint({ cases: CREATIVE_RELEASE_CASES, inputs: CREATIVE_RELEASE_INPUTS });
    return { version: "1.0.0", fixtureHash, cases: CREATIVE_RELEASE_CASES.map((c) => ({ ...c, input: CREATIVE_RELEASE_INPUTS.find((f) => f.id === c.id), reviewState: reviews.some((r) => r.caseId === c.id) ? "submitted" : "unreviewed", submissions: reviews.filter((r) => r.caseId === c.id).map((r) => ({ ...r, fixtureMatches: r.fixtureHash === fixtureHash, result: !r.reviewed ? "unreviewed" : c.required.every((x) => r.checks.includes(x)) && !c.forbidden.some((x) => r.defects.includes(x)) && !r.defects.length && r.passage.trim() ? r.fixtureHash === fixtureHash ? "pass" : "unreviewed" : "fail" })) })), totalRetries: reviews.reduce((n, r) => n + r.retries, 0), totalCost: reviews.reduce((n, r) => n + r.cost, 0), marketPerformance: "unknown" };
}
