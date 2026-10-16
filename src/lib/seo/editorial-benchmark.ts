import { type EditorialEvidence } from "./editorial-quality";
export type EditorialBenchmarkCase = {
    id: string;
    task: string;
    question: string;
    decision: string;
    productId: string;
    variant: string;
    sources: EditorialEvidence[];
    expectedFacts: string[];
    forbidden: {
        pattern: string;
        reason: string;
    }[];
    reference: string;
    negativeControl: string;
};
const source = (id: string, productId: string, text: string, variant = ""): EditorialEvidence => ({ id, productId, variant, text, locator: `frozen-evaluation:${id}`, conditions: [], revision: 1, kind: "product" });
export const EDITORIAL_BENCHMARK: readonly EditorialBenchmarkCase[] = [
    { id: "fit-exact-variant", task: "compatibility", question: "Will the Mini fit a 15-inch laptop?", decision: "Choose the correct bag size", productId: "mini", variant: "mini", sources: [source("mini-spec", "mini", "Mini interior width is 28 cm. The 15-inch laptop is 34 cm wide. It does not fit the Mini.", "mini")], expectedFacts: ["28 cm", "34 cm", "does not fit"], forbidden: [{ pattern: "(?:will|does) fit(?: the)?(?: 15| Mini)|fits all|guaranteed fit", reason: "Wrong fit conclusion or universal guarantee" }], reference: "The 34 cm laptop does not fit the Mini: its interior width is 28 cm. Choose a larger variant with a verified interior measurement.", negativeControl: "The Mini will fit the 15-inch laptop. Its roomy interior guarantees fit for all laptops." },
    { id: "matched-comparison", task: "comparison", question: "Which pouch holds more, A or B?", decision: "Compare capacity on the same units", productId: "a", variant: "", sources: [source("capacity", "a", "Pouch A holds 2 litres. Pouch B holds 3 litres. Capacity was measured empty; durability was not tested.")], expectedFacts: ["2 litres", "3 litres", "durability was not tested"], forbidden: [{ pattern: "A holds (?:3|more)|more durable|strongest|lasts longer", reason: "Reversed capacity or invented durability" }], reference: "Pouch B holds 3 litres; A holds 2 litres. That answers capacity, while durability was not tested. Choose B if the extra litre is the relevant constraint.", negativeControl: "A holds more and lasts longer because its construction is stronger." },
    { id: "ordered-use", task: "use", question: "How do I prepare the filter?", decision: "Follow supplied preparation steps", productId: "filter", variant: "", sources: [source("filter-instructions", "filter", "Rinse the filter in cold water for 30 seconds. Then insert the filter before filling the jug. Do not use boiling water.")], expectedFacts: ["cold water", "30 seconds", "before filling", "Do not use boiling water"], forbidden: [{ pattern: "(?<!not )use boiling water|rinse (?:with|in) boiling water|fill (?:the jug )?first", reason: "Contradicts supplied safe sequence or conditions" }], reference: "Rinse in cold water for 30 seconds, then insert the filter before filling the jug. Do not use boiling water. Check that the filter is seated before use.", negativeControl: "Fill the jug first and use boiling water to sterilise the filter." },
    { id: "evidence-limits", task: "objection", question: "Does the cream guarantee results in 30 days?", decision: "Understand the evidence limit", productId: "cream", variant: "", sources: [source("cream-notes", "cream", "There is no evidence for guaranteed results in 30 days. Some respondents reported a change; no controlled study was supplied.")], expectedFacts: ["no evidence", "30 days", "no controlled study"], forbidden: [{ pattern: "guarantees? results|proven results|will (?:work|improve)|clinically proven", reason: "Turns an evidence limitation into a performance claim" }], reference: "There is no evidence for a guarantee in 30 days and no controlled study was supplied. Ask for the relevant controlled evidence before relying on a guaranteed result.", negativeControl: "The cream guarantees results in 30 days, proven by customer responses." },
    { id: "sparse-care", task: "care", question: "Can I machine wash the case?", decision: "Find the supported cleaning method", productId: "case", variant: "", sources: [source("case-label", "case", "The case label says wipe with a damp cloth. Machine-wash compatibility is unspecified.")], expectedFacts: ["wipe with a damp cloth", "unspecified"], forbidden: [{ pattern: "machine wash (?:it|the case)|machine.washable|safe to machine wash", reason: "Fills a missing care instruction with invented compatibility" }], reference: "The label says wipe with a damp cloth. Machine-wash compatibility is unspecified. Ask the manufacturer for the case's wash instructions before using a machine.", negativeControl: "The case is machine-washable; choose the gentle cycle for best results." },
    { id: "selection-tradeoffs", task: "selection", question: "Which bottle is lighter?", decision: "Choose between weight and capacity", productId: "small", variant: "", sources: [source("bottle-weight", "small", "Small bottle: 120 g, 400 ml. Large bottle: 180 g, 650 ml. Leak testing was not supplied.")], expectedFacts: ["120 g", "180 g", "400 ml", "650 ml"], forbidden: [{ pattern: "leak.?proof|never leaks|Large (?:bottle )?is lighter|Small (?:bottle )?holds 650", reason: "Unsupported leakage claim or reversed product facts" }], reference: "Small is lighter at 120 g and holds 400 ml; Large weighs 180 g and holds 650 ml. Choose based on the capacity you need and the weight you want to carry.", negativeControl: "The Large is lighter and both bottles are leak-proof for every journey." },
];
export const BENCHMARK_VERSION = "seo-editorial-1.0.0";
function fingerprint(text: string) { let h = 2166136261; for (const ch of text)
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0).toString(16); }
export const BENCHMARK_FINGERPRINT = fingerprint(JSON.stringify(EDITORIAL_BENCHMARK));
export function evaluateEditorialCase(test: EditorialBenchmarkCase, draft: string) {
    const exactFacts = test.expectedFacts.map(fact => ({ fact, present: draft.toLowerCase().includes(fact.toLowerCase()) }));
    const failures = test.forbidden.flatMap(rule => { const match = new RegExp(rule.pattern, "i").exec(draft); return match ? [{ passage: match[0], reason: rule.reason }] : []; });
    const paragraphs = draft.split(/\n\s*\n/).filter(Boolean), duplicates = paragraphs.filter((p, i) => paragraphs.findIndex(q => q.toLowerCase().replace(/\s+/g, " ") === p.toLowerCase().replace(/\s+/g, " ")) !== i);
    const generic = /\b(?:consider your needs|compare (?:the )?specifications|do your research|it depends on your needs)\b/i.test(paragraphs[0] ?? "");
    return { caseId: test.id, draft, sourcePacket: test.sources, missingFacts: exactFacts.filter(f => !f.present).map(f => f.fact), failures, duplicates, genericOpening: generic, automaticFailureCount: failures.length + duplicates.length + Number(generic) + exactFacts.filter(f => !f.present).length, dimensionsForHumanReview: ["Does the opening answer this exact question?", "Does every sentence follow from the frozen evidence?", "Does a concrete comparison, process or decision aid add useful value?", "Does the voice fit without invented experience?", "Do links, if any, have supplied destination bodies?", "Is any semantic duplication hidden by paraphrasing?"], limitations: "Rule-based negative controls and exact fact locations, not a semantic score or a search-performance forecast." };
}
export function runEditorialBenchmark(versions: {
    caseId: string;
    before: string;
    after: string;
    reviewerNote: string;
}[]) {
    return { version: BENCHMARK_VERSION, fingerprint: BENCHMARK_FINGERPRINT, searchPerformance: "unknown", cases: EDITORIAL_BENCHMARK.map(test => { const pair = versions.find(v => v.caseId === test.id); return { id: test.id, question: test.question, task: test.task, sources: test.sources, before: pair?.before.trim() ? evaluateEditorialCase(test, pair.before) : null, after: pair?.after.trim() ? evaluateEditorialCase(test, pair.after) : null, reviewerNote: pair?.reviewerNote ?? "", status: !pair?.before.trim() || !pair.after.trim() ? "needs_both_versions" : pair.reviewerNote.trim().length < 10 ? "needs_passage_review" : "review_recorded" }; }), negativeControls: EDITORIAL_BENCHMARK.map(test => ({ id: test.id, failuresCaught: evaluateEditorialCase(test, test.negativeControl).automaticFailureCount })) };
}
