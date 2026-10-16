import { z } from "zod";
import { contentFingerprint } from "../standalone/evidence";
import { AssertionSchema, AtomicFactSchema, MaterialConditionSchema, evaluateAssertions } from "../production-evidence/facts";
const id = z.string().trim().min(1).max(180);
const short = z.string().trim().max(2000);
export const evidenceSchema = z.object({ id, locator: short.min(1), text: z.string().trim().min(1).max(40000), productId: short, variant: short.default(""), conditions: z.array(short).max(30).default([]), revision: z.number().int().positive(), kind: z.enum(["research", "product", "expert", "instructions", "measurement"]), atomicFacts: z.array(AtomicFactSchema).optional(), typedConditions: z.array(MaterialConditionSchema).optional(), market: z.string().optional() });
export type EditorialEvidence = z.infer<typeof evidenceSchema>;
export const questionSchema = z.object({ id, question: short.min(3), productId: short, task: z.enum(["comparison", "compatibility", "use", "care", "selection", "objection"]), sourceId: short, sourceExcerpt: short, hypothesis: z.boolean(), targetUrl: short, intentAssumption: short, preferredPageId: short.default("") });
export type BuyerQuestion = z.infer<typeof questionSchema>;
const canonicalPageSchema = z.object({ revision: z.string(), body: z.string().max(120000), metadata: short.optional(), structuredData: z.string().max(120000).optional(), title: short });
export const pageSchema = z.object({ id, url: short, title: short, question: short, task: questionSchema.shape.task, productId: short, body: z.string().max(120000), metadata: short.optional(), structuredData: z.string().max(120000).optional(), inspected: z.boolean(), purpose: short.default(""), canonical: canonicalPageSchema.optional(), importConflict: canonicalPageSchema.optional() });
export type EditorialPage = z.infer<typeof pageSchema>;
export const claimSchema = z.object({ id, sentence: short.min(1), sourceId: short, excerpt: short, productId: short, variant: short.default(""), conditions: z.array(short).max(30).default([]), review: z.enum(["unreviewed", "supported", "unsupported", "uncertain"]).default("unreviewed"), reviewNote: short.default(""), sourceRevision: z.number().int().positive().optional(), assertions: z.array(AssertionSchema).optional(), market: z.string().optional() });
export type ClaimBinding = z.infer<typeof claimSchema>;
export const contributionSchema = z.object({ type: z.enum(["comparison_criteria", "fit_worksheet", "product_explanation", "measurement", "expert_clarification"]), description: short, passage: short, sourceIds: z.array(id).max(20) });
export const dependencySchema = z.object({ id, sourceId: id, sourceRevision: z.number().int().positive(), sourceText: z.string().max(40000), artifactId: id, field: z.enum(["article", "metadata", "answer", "schema"]), passage: short.min(1), reviewState: z.enum(["approved", "unreviewed"]) });
export type EvidenceDependency = z.infer<typeof dependencySchema>;
export const qualitySchema = z.object({ version: z.literal(1), working: z.record(z.string(), z.string().max(120000)).default({}), evidence: z.array(evidenceSchema).max(2000), questions: z.array(questionSchema).max(300), pages: z.array(pageSchema).max(500), claims: z.array(claimSchema).max(300), contribution: contributionSchema, dependencies: z.array(dependencySchema).max(1000), overlapReviews: z.array(z.object({ key: id, decision: z.enum(["merge", "refresh", "separate"]), preferredPageId: short, rationale: short.min(10) })).max(300), benchmark: z.array(z.object({ caseId: id, before: z.string().max(40000), after: z.string().max(40000), reviewerNote: short })).max(20) });
export type EditorialQualityState = z.infer<typeof qualitySchema>;
export function emptyEditorialQuality(): EditorialQualityState { return { version: 1, working: {}, evidence: [], questions: [], pages: [], claims: [], contribution: { type: "fit_worksheet", description: "", passage: "", sourceIds: [] }, dependencies: [], overlapReviews: [], benchmark: [] }; }
const normalized = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s: string) => normalized(s).split(" ").filter(Boolean);
const contains = (body: string, passage: string) => !!passage.trim() && body.includes(passage);
export function questionBacklog(questions: BuyerQuestion[], evidence: EditorialEvidence[]) {
    return questions.map(q => {
        const source = evidence.find(s => s.id === q.sourceId);
        const scoped = source && (!q.productId || source.productId === q.productId);
        const grounded = !q.hypothesis && !!source && !!scoped && contains(source.text, q.sourceExcerpt);
        return { ...q, grounding: grounded ? "source_linked" as const : "hypothesis" as const, locator: grounded ? source!.locator : null, measuredDemand: null, issue: grounded ? "Exact supplied passage; intent remains the editor's assumption." : "Hypothesis: supply an exact passage and matching product source before describing this as customer demand." };
    });
}
const aliases: Record<string, string> = { weekend: "twonight", "two-night": "twonight", "2-night": "twonight", two: "two", night: "night", nights: "night", bag: "bag", luggage: "bag", carryall: "bag", fit: "fit", fits: "fit", fitting: "fit", compatible: "fit", compatibility: "fit", dimensions: "size", measurement: "size", measurements: "size", measuring: "size", clean: "care", cleaning: "care", wash: "care", washing: "care", care: "care", choose: "selection", choosing: "selection", select: "selection", selecting: "selection", versus: "comparison", vs: "comparison", compare: "comparison", comparison: "comparison", laptop: "laptop", notebook: "laptop", backpack: "bag", backpacks: "bag", bags: "bag", trip: "travel", away: "travel", journey: "travel", travel: "travel" };
const stop = new Set(["a", "an", "the", "for", "of", "my", "your", "is", "are", "how", "to", "do", "does", "this", "that", "can", "i", "it", "with", "which", "best", "what", "and", "in", "on"]);
export function intentSignature(question: string) {
    const prepared = normalized(question).replace(/\b(?:two|2) night\b/g, "twonight");
    return [...new Set(words(prepared).filter(w => !stop.has(w)).map(w => aliases[w] ?? w))].sort();
}
export function intentOverlaps(pages: EditorialPage[]) {
    const result: {
        basis: "question_task_overlap" | "repeated_inspected_content";
        key: string;
        pageIds: string[];
        urls: string[];
        explanation: string;
        options: string[];
        status: "candidate_review";
    }[] = [];
    const bodyConcepts = new Map(pages.map(p => [p.id, p.inspected ? p.body.split(/\n\s*\n/).filter(v => v.length > 35 && !/^(?:#|\[Source|Evidence limits:|\[View)/.test(v)).slice(0, 12).map(intentSignature) : []]));
    for (let i = 0; i < pages.length; i++)
        for (let j = i + 1; j < pages.length; j++) {
            const a = pages[i], b = pages[j];
            if (a.id === b.id || a.url === b.url || (a.productId && b.productId && a.productId !== b.productId))
                continue;
            const x = intentSignature(a.question || a.title), y = intentSignature(b.question || b.title), shared = x.filter(t => y.includes(t));
            const overlap = shared.length / Math.max(1, Math.min(x.length, y.length));
            const sharedQuestion = a.task === b.task && shared.length >= 2 && overlap >= .6;
            const sharedBody = (bodyConcepts.get(a.id) ?? []).some(x => (bodyConcepts.get(b.id) ?? []).some(y => { const common = x.filter(t => y.includes(t)); return common.length >= 8 && common.length / Math.max(1, Math.min(x.length, y.length)) >= .6; }));
            if (!sharedQuestion && !sharedBody)
                continue;
            result.push({ basis: sharedQuestion ? "question_task_overlap" : "repeated_inspected_content", key: [a.id, b.id].sort().join("::"), pageIds: [a.id, b.id], urls: [a.url, b.url], explanation: `${sharedQuestion ? "The supplied questions share the " + a.task + " task and concepts: " + shared.join(", ") + "." : "The questions or task labels differ."} ${sharedBody ? "Inspected substantive paragraphs also repeat at least eight concepts with substantial overlap; compare the actual answers before separating these URLs." : ""} ${a.inspected && b.inspected ? "Both supplied bodies are available for editor comparison." : "At least one body is not inspected; overlap is provisional."} Transparent task/synonym and paragraph features are review candidates, not proof of identical intent or search cannibalization. Different constraints or audiences may justify separate pages.`, options: ["Merge into one preferred destination", "Refresh the existing answer", "Keep separate with an explicit different purpose"], status: "candidate_review" });
        }
    return result;
}
const negation = /\b(?:no|not|cannot|can'?t|never|won'?t|doesn'?t|without evidence|free from|outside\s+(?:(?:this|the|our)\s+)?(?:guide|scope|review))\b/i;
const independentAssertion = /^(?:(?:the|this|that|a|an|each|every|our|your|it|they|we)\b[\w\s'()-]{0,70}?\s+(?:is|are|has|have|does|do|can|will|contains?|requires?|guarantees?|provides?|delivers?|improves?|cures?|eliminates?|prevents?)\b|(?:guarantees|contains|requires|provides|delivers|improves|cures|eliminates|prevents)\b)/i;
function claimClauses(text: string) {
    return text.replace(/’/g, "'").split(/(?:[.!?]\s+|\n+|;\s*)/).flatMap(sentence => {
        const parts: string[] = [], boundary = /,\s+(?:(?:and|but|rather than)\s+)?|\s+(?:and|but)\s+|\s+rather than\s+/gi;
        let start = 0;
        for (const match of sentence.matchAll(boundary)) {
            const after = sentence.slice(match.index! + match[0].length);
            if (!/^(?:not|without)\b/i.test(after) && !independentAssertion.test(after) && !/rather than/i.test(match[0]))
                continue;
            parts.push(sentence.slice(start, match.index).trim());
            start = match.index! + match[0].length;
            if (/rather than/i.test(match[0])) {
                parts.push("not " + sentence.slice(start).trim());
                start = sentence.length;
                break;
            }
        }
        parts.push(sentence.slice(start).trim());
        return parts.filter(Boolean);
    });
}
const scopeStop = new Set(["the", "this", "that", "with", "from", "there", "what", "only", "for", "and", "not", "does", "have", "been", "has", "was", "were", "its", "our", "your", "their", "source", "notes", "claim", "record", "supplied", "documented", "worksheet", "compares", "compare", "establish", "evidence", "product"]);
function sameClaimSubject(a: string, b: string) {
    const terms = (s: string) => [...new Set(words(s).filter(w => !scopeStop.has(w)).map(w => w.replace(/(?:ing|ed|s)$/, "")))];
    const x = terms(a), y = terms(b), shared = x.filter(t => y.includes(t));
    const units = new Set(["day", "hour", "cm", "mm", "kg", "pack", "sachet", "pouch"]);
    return shared.length >= 2 && shared.some(t => !/^\d/.test(t) && !units.has(t));
}
const negativeFocusStop = new Set([...scopeStop, "a", "an", "of", "to", "in", "or", "no", "it", "is", "are", "be", "as", "at", "by", "on", "you", "will", "can", "cannot", "should", "do", "did", "than", "rather", "for", "per", "exact", "specified", "specify", "provide", "provided", "give", "given", "tell", "tells", "here", "noted", "supply", "supplies", "free"]);
function negatesSameAssertion(negative: string, positive: string) {
    const quantityUnknown = /\b(?:count|number|amount|grams?|dose|measurements?)\b/i.test(negative) && /\b(?:not|no|unknown|unspecified)\b/i.test(negative);
    if (quantityUnknown && !/\b\d|\b(?:count|number|amount|grams?|dose|measurement)\b/i.test(positive))
        return false;
    const terms = (s: string) => [...new Set(words(s).filter(w => !negativeFocusStop.has(w)).map(w => w.replace(/^guarantee(?:d|s)?$/, "guarantee").replace(/(?:ing|ed|s)$/, "")))];
    const focus = terms(negative), assertion = terms(positive), shared = focus.filter(w => assertion.includes(w));
    return focus.length >= 2 && shared.length >= 2 && shared.length / focus.length >= .85 && shared.length / Math.max(1, assertion.length) >= .6;
}
const strong = /\b(?:always|guaranteed|guarantees|proven|cures?|eliminates?|everyone|all users|100%|instantly|will prevent|will improve|will deliver)\b/i;
const tentative = /\b(?:may|might|can|could|some|limited|preliminary|reported|self.report|up to|not|only|under|when|except)\b/i;
function claimQuantities(text: string) {
    return [...text.normalize("NFKC").replace(/^\s*\d+\.\s+/gm, "").matchAll(/\b(\d+(?:\.\d+)?)(?:\s*(%|cm|mm|inches|inch|days?|hours?|kg|g|ml|litres?|liters?)(?![\p{L}\p{N}_]))?/giu)].map(m => ({ amount: m[1], unit: (m[2] ?? "").toLowerCase().replace(/^inches$/, "inch").replace(/^(day|hour)s$/, "$1") }));
}
export type ClaimDecision = {
    id: string;
    status: "supported" | "unsupported" | "uncertain";
    sentence: string;
    excerpt: string;
    locator: string | null;
    reasons: string[];
    independentVerification: false;
};
export function reviewClaim(binding: ClaimBinding, sources: EditorialEvidence[]): ClaimDecision {
    const source = sources.find(s => s.id === binding.sourceId), reasons: string[] = [];
    const result = (status: ClaimDecision["status"]): ClaimDecision => ({ id: binding.id, status, sentence: binding.sentence, excerpt: binding.excerpt, locator: source?.locator ?? null, reasons, independentVerification: false });
    if (!source || !binding.excerpt.trim()) {
        reasons.push("A source and exact excerpt are missing. Request the specific evidence for this sentence.");
        return result("uncertain");
    }
    if (!contains(source.text, binding.excerpt)) {
        reasons.push("The excerpt does not occur exactly in the current source revision.");
        return result("unsupported");
    }
    if (!binding.productId || !source.productId)
        reasons.push("Product applicability is unspecified.");
    else if (binding.productId !== source.productId) {
        reasons.push("The excerpt belongs to a different product or SKU.");
        return result("unsupported");
    }
    if (source.variant && binding.variant !== source.variant) {
        reasons.push("The selected variant does not match the source's explicit variant.");
        return result("unsupported");
    }
    if (source.atomicFacts?.length && !binding.assertions?.length) {
        reasons.push("This source contains typed facts. Map the exact atomic assertions before recording support for this revision.");
        return result("uncertain");
    }
    if (binding.assertions?.length) {
        const tuples = evaluateAssertions(binding.assertions, source.atomicFacts ?? [], { productId: binding.productId, variant: binding.variant || undefined, market: binding.market ?? source.market ?? "unspecified" });
        if (tuples.some(t => t.status === "unsupported")) {
            reasons.push(...tuples.flatMap(t => t.status === "unsupported" ? t.reasons : []));
            return result("unsupported");
        }
        if (tuples.some(t => t.status !== "supported")) {
            reasons.push(...tuples.flatMap(t => t.status !== "supported" ? t.reasons : []));
            return result("uncertain");
        }
    }
    const sourceClauses = claimClauses(binding.excerpt), outputClauses = claimClauses(binding.sentence);
    const positiveOutput = outputClauses.filter(c => !negation.test(c)), positiveSource = sourceClauses.filter(c => !negation.test(c));
    if (sourceClauses.filter(c => negation.test(c)).some(negative => positiveOutput.some(positive => negatesSameAssertion(negative, positive)))) {
        reasons.push("The source contains a negation or evidence limitation that the sentence removes for the same claim subject.");
        return result("unsupported");
    }
    if (outputClauses.filter(c => negation.test(c)).some(negative => positiveSource.some(positive => negatesSameAssertion(negative, positive)))) {
        reasons.push("The sentence negates an affirmative source statement about the same claim subject.");
        return result("unsupported");
    }
    if ((strong.test(positiveOutput.join(" ")) && (!strong.test(positiveSource.join(" ")) || tentative.test(positiveSource.join(" ")))) || sourceClauses.filter(c => /\b(?:may|might|could|some respondents|preliminary)\b/i.test(c)).some(qualified => positiveOutput.some(c => !tentative.test(c) && sameClaimSubject(qualified, c)))) {
        reasons.push("The claim is stronger or more universal than the supplied wording.");
        return result("unsupported");
    }
    const nums = claimQuantities(binding.sentence), sourceNums = claimQuantities(binding.excerpt);
    if (nums.some(n => !sourceNums.some(sourceNumber => sourceNumber.amount === n.amount && (!n.unit || sourceNumber.unit === n.unit)))) {
        reasons.push("A numeric amount, unit or timing is absent from the excerpt.");
        return result("unsupported");
    }
    for (const condition of [...source.conditions, ...binding.conditions])
        if (condition.trim() && !normalized(binding.sentence).includes(normalized(condition)))
            reasons.push(`Condition or population not carried into the sentence: ${condition}`);
    if (binding.review === "unsupported") {
        reasons.push(binding.reviewNote || "Editor rejected this support relationship.");
        return result("unsupported");
    }
    if (reasons.length) {
        reasons.push("Resolve applicability and conditions before accepting this sentence.");
        return result("uncertain");
    }
    if (binding.review === "supported" && binding.sourceRevision !== source.revision) {
        reasons.push("The source revision changed after this human support review. Review the current evidence again.");
        return result("uncertain");
    }
    if (binding.review === "supported" && binding.reviewNote.trim().length >= 10) {
        reasons.push(`Human-reviewed support relationship: ${binding.reviewNote}`, "The app has not independently verified the source's truth or quality.");
        return result("supported");
    }
    reasons.push("Exact excerpt and conservative checks passed. Semantic entailment, population, source quality and remaining conditions require an editor's reasoned review.");
    return result("uncertain");
}
export const EDITORIAL_RECIPES = {
    comparison: { title: "Matched comparison", sections: ["Direct answer and who each option suits", "Matched criteria and comparable conditions", "Evidence-backed differences", "Tradeoffs, limits and decision"], requiredFacts: ["Options identified", "Same comparison criteria", "Sources for both options", "Limits of comparison"] },
    compatibility: { title: "Compatibility answer", sections: ["Direct fit answer or precise unknown", "Exact models, variants and measurements", "How to check the fit", "Exceptions and next step"], requiredFacts: ["Selected product variant", "Object or model dimensions", "Usable interior or interface dimensions", "Fit tolerances and exclusions"] },
    use: { title: "How to use", sections: ["What the product can do", "Prerequisites and preparation", "Ordered use steps", "Checks, stop conditions and limitations"], requiredFacts: ["Selected product instructions", "Required tools or setup", "Ordered steps", "Warnings and exceptions"] },
    care: { title: "Care instructions", sections: ["Direct care method", "Material-specific preparation", "Cleaning and drying steps", "Methods to avoid and storage"], requiredFacts: ["Selected product material", "Verified care label", "Cleaning and drying limits", "Exceptions"] },
    selection: { title: "Selection guide", sections: ["Decision and short recommendation", "Buyer constraints and must-haves", "Fact-based fit checklist", "Tradeoffs and next action"], requiredFacts: ["Buyer task", "Relevant product dimensions or specifications", "Decision criteria", "Tradeoffs and limits"] },
    objection: { title: "Objection answer", sections: ["The exact concern and supported answer", "Evidence and applicable conditions", "When the concern remains valid", "Specific next step"], requiredFacts: ["Exact buyer concern", "Product-specific support", "Limitations", "Action or one missing fact"] },
} as const;
export function decisionRecipe(task: BuyerQuestion["task"], facts: string[]) { const recipe = EDITORIAL_RECIPES[task]; return { ...recipe, missing: recipe.requiredFacts.filter(f => !facts.some(v => normalized(v).includes(normalized(f)))), wordCountTarget: null, sharedBrief: { decisionType: task, sections: recipe.sections, sourceTasks: recipe.requiredFacts } }; }
export function locateContribution(body: string, contribution: EditorialQualityState["contribution"], evidence: EditorialEvidence[], decision: string) {
    const start = contribution.passage ? body.indexOf(contribution.passage) : -1;
    const sources = contribution.sourceIds.map(id => evidence.find(s => s.id === id)).filter((s): s is EditorialEvidence => !!s);
    const factual = ["measurement", "expert_clarification", "product_explanation"].includes(contribution.type);
    const inventedExperience = /\b(?:we tested|i tested|our test|we measured|in my experience|i used)\b/i.test(contribution.passage) && !sources.some(s => ["measurement", "expert"].includes(s.kind));
    return { status: start < 0 || !contribution.description.trim() || !decision.trim() || (factual && !sources.length) || inventedExperience ? "needs_revision" : "located_for_review", start, end: start < 0 ? -1 : start + contribution.passage.length, passage: contribution.passage, sourceLocators: sources.map(s => s.locator), reasons: [start < 0 ? "Locate the actual contribution by copying its exact final passage." : "The contribution occurs in the final article at the reported character range.", ...(factual && !sources.length ? ["This factual contribution needs an applicable supplied source."] : []), ...(inventedExperience ? ["First-hand testing or experience is not supported by measurement or expert material."] : []), "An editor must confirm that this adds useful value to the stated buyer decision rather than merely rephrasing a source."] };
}
export function contextualLinks(source: EditorialPage, destinations: EditorialPage[]) {
    const paragraphs = source.body.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 35 && !/^#{1,6}\s/.test(p));
    const result: {
        sourceId: string;
        paragraph: string;
        anchor: string;
        destinationId: string;
        url: string;
        destinationPassage: string;
        buyerPurpose: string;
        status: "body_matched_review";
        html: string;
    }[] = [];
    for (const dest of destinations) {
        if (dest.id === source.id || !dest.inspected || !dest.body.trim() || !/^https?:\/\//i.test(dest.url))
            continue;
        const answer = dest.body.split(/\n\s*\n/).find(p => p.length > 35 && !/^#{1,6}\s/.test(p) && !/\b(?:click here|coming soon|placeholder)\b/i.test(p));
        if (!answer)
            continue;
        const concepts = intentSignature(dest.question || dest.title).filter(t => !["selection", "comparison", "care", "fit"].includes(t));
        if (!concepts.length || concepts.filter(t => intentSignature(answer).includes(t)).length / concepts.length < .5)
            continue;
        for (const paragraph of paragraphs) {
            const tokens = [...paragraph.matchAll(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)];
            let anchor = "";
            for (let width = Math.min(6, tokens.length); width >= 2 && !anchor; width--)
                for (let i = 0; i <= tokens.length - width; i++) {
                    const first = tokens[i], last = tokens[i + width - 1];
                    const from = first.index!, to = last.index! + last[0].length;
                    const candidate = paragraph.slice(from, to), sig = intentSignature(candidate);
                    const linked = [...paragraph.matchAll(/\[[^\]]+\]\([^)]+\)/g)].some(m => from < m.index! + m[0].length && to > m.index!);
                    if (!linked && !/\n/.test(candidate) && sig.filter(t => concepts.includes(t)).length >= Math.min(2, concepts.length)) {
                        anchor = candidate;
                        break;
                    }
                }
            if (!anchor)
                continue;
            const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
            result.push({ sourceId: source.id, paragraph, anchor, destinationId: dest.id, url: dest.url, destinationPassage: answer, buyerPurpose: `Continue the ${dest.task} decision: ${dest.question || dest.title}`, status: "body_matched_review", html: `<a href="${esc(dest.url)}">${esc(anchor)}</a>` });
            break;
        }
    }
    return { inspectedPageIds: destinations.filter(d => d.inspected && d.body.trim()).map(d => d.id), suggestions: result, limitation: "Only supplied inspected bodies were compared. Matching task terms is not semantic verification; approve the quoted destination answer and natural insertion before copying the crawlable HTML." };
}
export type VisibleFact = {
    field: "name" | "sku" | "price" | "priceCurrency" | "availability" | "reviewCount" | "ratingValue" | "quantity";
    value: string;
    productId: string;
    variant: string;
    passage: string;
    sourceId: string;
};
export function reconcileVisibleSchema(input: {
    productId: string;
    variant: string;
    body: string;
    facts: VisibleFact[];
    schema: unknown;
}, evidence: EditorialEvidence[]) {
    const schema = input.schema && typeof input.schema === "object" && !Array.isArray(input.schema) ? input.schema as Record<string, unknown> : {};
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] as Record<string, unknown>[] : [schema];
    const products = graph.filter(p => p && p["@type"] === "Product");
    if (products.length !== 1)
        return { findings: [{ field: "Product", status: "uncertain", visible: null, proposed: null, reason: "Supply exactly one selected Product node. Multiple or absent product nodes need explicit selection before patching." }], patch: [], limitation: "No patch prepared for an ambiguous product identity." };
    const product = products[0], base = Array.isArray(schema["@graph"]) ? `/@graph/${graph.indexOf(product)}` : "";
    const offers = product.offers && typeof product.offers === "object" && !Array.isArray(product.offers) ? product.offers as Record<string, unknown> : {};
    const rating = product.aggregateRating && typeof product.aggregateRating === "object" && !Array.isArray(product.aggregateRating) ? product.aggregateRating as Record<string, unknown> : {};
    const properties = Array.isArray(product.additionalProperty) ? product.additionalProperty as Record<string, unknown>[] : product.additionalProperty && typeof product.additionalProperty === "object" ? [product.additionalProperty as Record<string, unknown>] : [];
    const quantityIndex = properties.findIndex(p => p?.["@type"] === "PropertyValue" && (p.propertyID === "packQuantity" || normalized(String(p.name ?? "")) === "pack quantity"));
    const patch: {
        op: "add" | "replace" | "remove";
        path: string;
        value?: unknown;
    }[] = [], findings: {
        field: string;
        status: string;
        visible: string | null;
        proposed: unknown;
        reason: string;
    }[] = [];
    if (product.numberOfItems !== undefined) {
        findings.push({ field: "numberOfItems", status: "unsupported_property", visible: null, proposed: product.numberOfItems, reason: "Schema.org numberOfItems describes an ItemList, not a Product. Pack quantity belongs in an identified additionalProperty PropertyValue." });
        patch.push({ op: "remove", path: `${base}/numberOfItems` });
    }
    for (const field of ["name", "sku", "price", "priceCurrency", "availability", "reviewCount", "ratingValue", "quantity"] as const) {
        const fact = input.facts.find(f => f.field === field), source = evidence.find(e => e.id === fact?.sourceId);
        const scoped = !!fact && fact.productId === input.productId && fact.variant === input.variant && !!source && source.productId === input.productId && (!source.variant || source.variant === input.variant);
        const grounded = scoped && contains(input.body, fact!.passage) && contains(source!.text, fact!.value) && contains(fact!.passage, fact!.value);
        const container = ["price", "priceCurrency", "availability"].includes(field) ? offers : ["reviewCount", "ratingValue"].includes(field) ? rating : product;
        const quantityProperty = quantityIndex >= 0 ? properties[quantityIndex] : undefined;
        const value = field === "quantity" ? quantityProperty?.value : container[field];
        const equal = grounded && normalized(String(value ?? "")).replace(/^https schema org /, "") === normalized(fact!.value).replace(/^https schema org /, "");
        findings.push({ field, status: grounded ? equal ? "matched" : "mismatch" : value === undefined ? "absent_unverified" : "unsupported", visible: fact?.value ?? null, proposed: value ?? null, reason: grounded ? "Exact visible passage and matching product source supplied; editor must confirm applicability." : "No applicable exact visible fact and source. Leave this field absent until reviewed." });
        if (field === "quantity") {
            if (grounded && !equal) {
                const property = { "@type": "PropertyValue", propertyID: "packQuantity", name: "Pack quantity", value: fact!.value };
                if (quantityIndex >= 0)
                    patch.push({ op: "replace", path: Array.isArray(product.additionalProperty) ? `${base}/additionalProperty/${quantityIndex}` : `${base}/additionalProperty`, value: { ...quantityProperty, ...property } });
                else if (product.additionalProperty === undefined)
                    patch.push({ op: "add", path: `${base}/additionalProperty`, value: [property] });
                else if (Array.isArray(product.additionalProperty))
                    patch.push({ op: "add", path: `${base}/additionalProperty/-`, value: property });
                else
                    patch.push({ op: "replace", path: `${base}/additionalProperty`, value: [...properties, property] });
            }
            else if (!grounded && quantityProperty)
                patch.push({ op: "remove", path: Array.isArray(product.additionalProperty) ? `${base}/additionalProperty/${quantityIndex}` : `${base}/additionalProperty` });
            continue;
        }
        const path = `${base}${container === offers ? "/offers" : container === rating ? "/aggregateRating" : ""}/${field}`;
        if (grounded && !equal) {
            if (container === offers && product.offers === undefined && !patch.some(p => p.path === `${base}/offers`))
                patch.push({ op: "add", path: `${base}/offers`, value: {} });
            if (container === rating && product.aggregateRating === undefined && !patch.some(p => p.path === `${base}/aggregateRating`))
                patch.push({ op: "add", path: `${base}/aggregateRating`, value: {} });
            patch.push({ op: value === undefined ? "add" : "replace", path, value: fact!.value });
        }
        else if (!grounded && value !== undefined)
            patch.push({ op: "remove", path });
    }
    return { findings, patch, references: ["https://schema.org/Product", "https://schema.org/additionalProperty", "https://schema.org/numberOfItems"], limitation: "Review patch paths against the exact selected Product node before applying. No rich-result or ranking guarantee is implied." };
}
export function answerUsefulness(input: {
    question: string;
    decision: string;
    answer: string;
    expectedFacts: string[];
    missingFact: string;
    nextStep: string;
}, evidence: EditorialEvidence[]) {
    const paragraphs = input.answer.split(/\n\s*\n/).filter(Boolean), first = paragraphs[0] ?? "";
    const generic = /\b(?:consider your needs|compare (?:the )?specifications|do your research|choose the right|it depends on your|when selecting|read reviews|consult a professional)\b/i.test(first);
    const locatedFacts = input.expectedFacts.filter(f => contains(input.answer, f) && evidence.some(s => contains(s.text, f)));
    const unsupportedFacts = input.expectedFacts.filter(f => !locatedFacts.includes(f));
    const repeated = paragraphs.filter((p, i) => paragraphs.findIndex(x => normalized(x) === normalized(p)) !== i);
    const honestPartial = !!input.missingFact.trim() && contains(input.answer, input.missingFact) && !!input.nextStep.trim();
    const status = !input.question.trim() || !input.decision.trim() || generic || repeated.length || !input.nextStep.trim() || (!locatedFacts.length && !honestPartial) || (unsupportedFacts.length && !honestPartial) ? "needs_revision" : honestPartial ? "partial_answer_review" : "answer_ready_for_review";
    return { status, firstAnswer: first, locatedFacts, unsupportedFacts, repeatedPassages: repeated, repairs: [...(generic ? ["Replace generic selection advice with the product-specific answer or explicit unresolved fact."] : []), ...(!input.nextStep.trim() ? ["Give a concrete next step for this exact decision."] : []), ...(unsupportedFacts.length ? [`Supply or narrow these unsupported expected facts: ${unsupportedFacts.join("; ")}`] : []), ...(repeated.length ? ["Remove the repeated paragraphs."] : []), ...(!locatedFacts.length && !honestPartial ? ["Add one sourced decision fact, or state the precise unknown and the source task."] : [])], limitation: "Offline checks locate provided facts and common filler. A human must assess whether the exact question is resolved and the answer follows from the evidence." };
}
export function refreshDependencies(dependencies: EvidenceDependency[], sources: EditorialEvidence[]) {
    return dependencies.flatMap(d => { const source = sources.find(s => s.id === d.sourceId); if (source && source.revision === d.sourceRevision && source.text === d.sourceText)
        return []; return [{ ...d, reviewState: "unreviewed" as const, oldEvidence: d.sourceText, newEvidence: source?.text ?? null, newRevision: source?.revision ?? null, reason: source ? "Source revision or content changed. Re-review only this dependent passage." : "Source removed. This passage has lost its recorded support." }]; });
}
export function trackDependency(source: EditorialEvidence, artifactId: string, field: EvidenceDependency["field"], passage: string): EvidenceDependency {
    if (!passage.trim() || !artifactId.trim())
        throw new Error("Choose an artifact and its exact dependent passage.");
    return { id: `dep:${contentFingerprint({ artifactId, field, sourceId: source.id, passage })}:${contentFingerprint({ passage, field, artifactId, source: source.id, namespace: "editorial-dependency" })}`, artifactId, field, passage, sourceId: source.id, sourceRevision: source.revision, sourceText: source.text, reviewState: "approved" };
}
export function validateEditorialQuality(raw: unknown) {
    const state = qualitySchema.parse(raw);
    for (const key of ["evidence", "questions", "pages", "claims", "dependencies"] as const)
        if (new Set(state[key].map(v => v.id)).size !== state[key].length)
            throw new Error(`Duplicate ${key} identifiers are not allowed.`);
    return state;
}
export function registerArtifactDependency(source: EditorialEvidence, page: EditorialPage, field: EvidenceDependency["field"], passage: string) {
    const content = field === "metadata" ? page.metadata ?? "" : field === "schema" ? page.structuredData ?? "" : page.body;
    if (!contains(content, passage))
        throw new Error(`The dependent ${field} passage must occur exactly in the selected saved page field. Add or revise that field first.`);
    return trackDependency(source, page.id, field, passage);
}
export function mergeEditorialImports(state: EditorialQualityState, incoming: {
    evidence: EditorialEvidence[];
    pages: EditorialPage[];
}) {
    const changedSourceIds: string[] = [];
    const evidence = [...state.evidence];
    for (const next of incoming.evidence) {
        const index = evidence.findIndex(e => e.id === next.id);
        if (index < 0) {
            evidence.push(next);
            continue;
        }
        const old = evidence[index];
        const identity = (e: EditorialEvidence) => contentFingerprint({ text: e.text, locator: e.locator, productId: e.productId, variant: e.variant, conditions: e.conditions, typedConditions: e.typedConditions, atomicFacts: e.atomicFacts, market: e.market, kind: e.kind });
        if (identity(old) !== identity(next)) {
            evidence[index] = { ...next, revision: Math.max(old.revision + 1, next.revision) };
            changedSourceIds.push(next.id);
        }
    }
    const pages = [...state.pages], changedPageIds: string[] = [], conflictedPageIds: string[] = [];
    for (const next of incoming.pages) {
        const value = { body: next.body, title: next.title, metadata: next.metadata, structuredData: next.structuredData };
        const canonical = next.canonical ?? { ...value, revision: contentFingerprint(value) };
        const index = pages.findIndex(p => p.id === next.id);
        if (index < 0) {
            pages.push({ ...next, canonical });
            continue;
        }
        const old = pages[index], oldValue = { body: old.body, title: old.title, metadata: old.metadata, structuredData: old.structuredData };
        if (old.canonical?.revision === canonical.revision)
            continue;
        if (contentFingerprint(oldValue) === contentFingerprint(value)) {
            pages[index] = { ...old, canonical, importConflict: undefined };
            continue;
        }
        const baseline = old.canonical && { body: old.canonical.body, title: old.canonical.title, metadata: old.canonical.metadata, structuredData: old.canonical.structuredData };
        if (baseline && contentFingerprint(oldValue) === contentFingerprint(baseline)) {
            pages[index] = { ...old, ...value, url: next.url, productId: next.productId, inspected: next.inspected, canonical, importConflict: undefined };
            changedPageIds.push(old.id);
        }
        else {
            pages[index] = { ...old, importConflict: canonical };
            conflictedPageIds.push(old.id);
        }
    }
    const stale = new Set(refreshDependencies(state.dependencies, evidence).map(d => d.id)), changed = new Set([...changedPageIds, ...conflictedPageIds]);
    return { changedSourceIds, changedPageIds, conflictedPageIds, state: { ...state, evidence, pages, overlapReviews: state.overlapReviews.filter(r => ![...changed].some(id => r.key.split("::").includes(id))), dependencies: state.dependencies.map(d => stale.has(d.id) || changed.has(d.artifactId) ? { ...d, reviewState: "unreviewed" as const } : d), claims: state.claims.map(c => c.review === "supported" && (evidence.find(e => e.id === c.sourceId)?.revision !== c.sourceRevision || [...changed].some(id => state.pages.find(p => p.id === id)?.body.includes(c.sentence))) ? { ...c, review: "unreviewed" as const } : c) } };
}
export function resolveEditorialImport(page: EditorialPage, decision: "use_canonical" | "keep_local") {
    if (!page.importConflict)
        throw new Error("There is no canonical import conflict to resolve.");
    return { ...page, ...(decision === "use_canonical" ? { body: page.importConflict.body, metadata: page.importConflict.metadata, structuredData: page.importConflict.structuredData, title: page.importConflict.title } : {}), canonical: page.importConflict, importConflict: undefined };
}
