import { createHash, randomUUID } from "node:crypto";
import type { CroRun, CroSection } from "./studio-types";
import { validateSection } from "./studio-render";
import type { QualityBrief, QualityChange, QualityDocument, QualityEdit, QualityFinding, QualityQuestion, QualityTerms } from "./quality-types";
export const qualityHash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const pageFingerprint = (doc: Pick<QualityDocument, "run" | "suppliedHtml">): string => qualityHash(doc.run ? { sections: doc.run.sections, brand: doc.run.brand, quiz: doc.run.quiz, visualSpec: doc.run.storyboard?.visualSpec } : doc.suppliedHtml);
const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const contains = (haystack: string, needle: string) => Boolean(clean(needle)) && clean(haystack).includes(clean(needle));
const hasAmount = (text: string, amount: number) => [...text.matchAll(/\d+(?:,\d{3})*(?:\.\d+)?/g)].some(m => Number(m[0].replaceAll(",", "")) === amount);
const sectionText = (doc: QualityDocument, sectionId: string) => doc.rendered[0]?.fingerprint === pageFingerprint(doc)
    ? doc.rendered[0].sections.find(s => s.id === sectionId)?.text || ""
    : doc.run?.sections.find(s => s.id === sectionId)?.copy.map(c => c.text).join(" ") || "";
const enabled = (doc: QualityDocument) => doc.run?.sections.filter(s => s.enabled) || [];
const allText = (doc: QualityDocument) => doc.rendered[0]?.fingerprint === pageFingerprint(doc) ? doc.rendered[0].text : enabled(doc).flatMap(s => s.copy.map(c => c.text)).join(" ");
const finding = (id: string, area: string, sectionId: string, status: QualityFinding["status"], observed: string, expected: string, repair: string): QualityFinding => ({ id, area, sectionId, status, observed, expected, repair });
export function promiseSection(run: Pick<CroRun, "sections">): CroSection | undefined {
    const content = run.sections.filter(s => s.enabled && !/^(?:(?:site|page|global|main)[-_ ])?(?:header|footer|nav|navigation|announcement|masthead)(?:$|[-_ ])/i.test(`${s.id} ${s.label}`));
    return content.find(s => /<h1\b/i.test(s.html)) || content.find(s => /hero|arrival|intro/i.test(`${s.id} ${s.label}`)) || content[0];
}
export function promiseHeadline(run: Pick<CroRun, "sections">): string {
    const section = promiseSection(run);
    if (!section)
        return "";
    const key = section.html.match(/<h1\b[^>]*>\s*\{\{text:([a-z][a-z0-9_-]*)\}\}/i)?.[1];
    return section.copy.find(c => c.key === key)?.text || section.copy.find(c => /^(?:headline|title|h1)$/.test(c.key))?.text || "";
}
export type BuyingOutline = {
    selected: QualityBrief["structure"];
    recommended: QualityBrief["structure"];
    reason: string;
    inferredContext: boolean;
    sections: {
        id: string;
        job: string;
        reason: string;
        questionIds: string[];
        sourceIds: string[];
        missing: string[];
    }[];
};
export function buyingTaskOutline(brief: Pick<QualityBrief, "task" | "structure" | "buyerQuestion" | "trafficContext">, questions: QualityQuestion[] = []): BuyingOutline {
    const recommended: QualityBrief["structure"] = ({ purchase: "pdp", compatibility: "pdp", explanation: "explanation", comparison: "comparison", selection: questions.length > 5 ? "quiz" : "listicle", story: "explanation" } as const)[brief.task];
    const reasons = { purchase: "The buyer needs product, variant, terms and a direct purchase action together.", compatibility: "Answer the exact fit condition early, then show the relevant product and purchase option.", explanation: "Explain the unfamiliar mechanism before asking for a purchase.", comparison: "Matched criteria and their limitations should lead the choice.", selection: "Organise the available evidence around the choices the buyer must make.", story: "An explanatory narrative needs a real source; story length follows the material available." };
    const sorted = [...questions].filter(q => q.question.trim()).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    const unique = sorted.filter((q, i) => sorted.findIndex(other => clean(other.question) === clean(q.question)) === i);
    const questionSections = unique.map((q, i) => ({ id: q.sectionId || `answer-${i + 1}`, job: q.question, reason: `Priority ${q.priority}/5 ${q.origin === "hypothesis" ? "suggested research question" : `from ${q.source || q.origin}`}; ${q.priority >= 4 ? "resolve this purchase blocker before optional storytelling" : "answer once; avoid repeating the same benefit"}.`, questionIds: [q.id], sourceIds: q.source ? [q.source] : [], missing: q.answer && q.source && q.origin !== "hypothesis" ? [] : [q.answer ? "Confirm the answer's product-specific source." : "Supply the answer and its source."] }));
    const intro = { id: "arrival", job: brief.buyerQuestion || "Identify the product and the buying question.", reason: `Orient the visitor to the selected ${brief.structure} purpose.`, questionIds: [], sourceIds: [], missing: brief.buyerQuestion ? [] : ["State the buyer's exact question."] };
    const decisionJob = brief.structure === "comparison" ? "Compare only verified like-for-like criteria." : brief.structure === "quiz" ? "Offer evidence-backed questions and explain the resulting recommendation." : brief.structure === "listicle" ? "Use only distinct supported reasons; the evidence determines the count." : brief.structure === "explanation" ? "Explain the product and its limits with supplied facts." : "Show the exact product, selected variant and useful details.";
    return { selected: brief.structure, recommended, reason: reasons[brief.task], inferredContext: !brief.trafficContext.trim() || /user-supplied|inferred/i.test(brief.trafficContext), sections: [intro, ...questionSections, { id: "decision", job: decisionJob, reason: "Resolve the stated task using available evidence; a format label does not supply facts.", questionIds: [], sourceIds: [], missing: [] }, { id: "purchase", job: "Show quantity, total price, cadence, policies and next action together.", reason: "Make the actual purchase decision inspectable.", questionIds: [], sourceIds: [], missing: [] }] };
}
export function buyingTaskPrompt(brief: Pick<QualityBrief, "task" | "structure" | "buyerQuestion" | "trafficContext">): string {
    return `AUTHORITATIVE BUYING TASK (preserve the user's chosen structure across entry paths)\n${JSON.stringify(buyingTaskOutline(brief))}\nAudience context is an editable assumption, never a performance inference. Do not pad to five reasons or add unsupported proof to complete a template.`;
}
export function auditPromiseChain(doc: QualityDocument): QualityFinding[] {
    const b = doc.brief, sections = enabled(doc), first = (doc.run ? promiseSection(doc.run)?.id : undefined) || doc.rendered[0]?.sections.find(s => s.headings.length)?.id || doc.rendered[0]?.sections[0]?.id || "arrival", hero = sectionText(doc, first), text = allText(doc), out: QualityFinding[] = [];
    const selectedProduct = doc.run?.request.productId || b.productId;
    out.push(finding("promise-product", "promise", first, !b.productId ? "missing" : selectedProduct === b.productId ? "pass" : "review", selectedProduct || "No selected product.", b.productId || "Select the advertised product.", "Use the same product identity in the ad brief, hero, buy box and destination."));
    const terms = b.promise.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [], overlap = terms.filter(t => hero.toLowerCase().includes(t)).length;
    out.push(finding("promise-hero", "promise", first, !b.promise ? "missing" : terms.length && overlap >= Math.ceil(terms.length * .6) ? "pass" : "review", hero.slice(0, 600) || "No first screen text available.", b.promise || "Type the promise or select a saved ad.", "Review the actual meaning of the headline and first screen against the selected promise. Word overlap is a bounded retrieval check, not semantic proof."));
    if (b.variant)
        out.push(finding("promise-variant", "promise", first, contains(text, b.variant) ? "pass" : "missing", contains(text, b.variant) ? `The page names ${b.variant}.` : "The selected variant is not named in visible text.", b.variant, "Name the selected variant where the shopper chooses and verify its destination."));
    for (const [i, qualifier] of b.qualifiers.entries()) {
        const locations = sections.filter(s => contains(sectionText(doc, s.id), qualifier)).map(s => s.id);
        const promiseSections = sections.filter(s => contains(sectionText(doc, s.id), b.promise));
        const omitted = promiseSections.filter(s => !contains(sectionText(doc, s.id), qualifier));
        out.push(finding(`promise-qualifier-${i}`, "promise", omitted[0]?.id || first, locations.length && !omitted.length ? "pass" : "missing", locations.length ? `Qualification appears in ${locations.join(", ")}${omitted.length ? `; omitted beside the promise in ${omitted.map(s => s.id).join(", ")}` : ""}.` : "Qualification is absent from visible page text.", qualifier, "Keep this condition beside the qualified promise, including the first screen and buy box where used."));
    }
    for (const p of b.proofRequirements) {
        const visible = sectionText(doc, p.sectionId), sourced = Boolean(p.source.trim() && p.excerpt.trim());
        out.push(finding(`promise-proof-${p.id}`, "proof", p.sectionId, sourced && contains(visible, p.statement) ? "pass" : "missing", visible.slice(0, 500) || "No answer in the assigned section.", `${p.statement} — source ${p.source || "missing"}: ${p.excerpt || "missing excerpt"}`, "Connect this proof requirement to the section that answers it. An exact excerpt is traceability; source quality and semantic support still need review."));
        const bound = doc.evidence?.records.find(r => r.id === p.source || r.source.id === p.source);
        if (bound && !bound.eligible)
            out.push(finding(`promise-scope-${p.id}`, "proof", p.sectionId, "review", bound.issues.join(" "), `${bound.id}: ${bound.text}; ${bound.qualifiers.join("; ")}`, "Bind an applicable product/variant/market source before this proof supports the page."));
    }
    if (b.terms.productId && b.terms.productId !== b.productId)
        out.push(finding("promise-offer-product", "offer", "purchase", "review", b.terms.productId, b.productId, "Bind the offer to this product before reusing its terms."));
    if (b.terms.variant && b.variant && b.terms.variant !== b.variant)
        out.push(finding("promise-offer-variant", "offer", "purchase", "review", b.terms.variant, b.variant, "The offer is bound to another variant; select the applicable terms."));
    return out;
}
export function reviewQuestions(doc: QualityDocument): QualityFinding[] {
    return [...doc.questions].sort((a, b) => b.priority - a.priority).map(q => {
        const text = sectionText(doc, q.sectionId), sourced = Boolean(q.source && q.quote && q.origin !== "hypothesis"), answered = Boolean(q.answer && contains(text, q.answer));
        return finding(`question-${q.id}`, "objection", q.sectionId, sourced && answered ? "pass" : "missing", `${q.question} (priority ${q.priority}/5)\n${answered ? "The assigned answer is present in this section." : "The exact saved answer is not in the assigned section."}\n${q.origin === "hypothesis" ? "Suggested question; not customer research." : `${q.source || "Missing source"}: ${q.quote || "Missing quotation"}`}`, q.answer || "Answer not supplied.", sourced ? "Put this supported answer in its assigned section, before optional low-priority benefits." : "Create a local source task for this specific question; do not convert an inferred question into customer testimony.");
    });
}
export function reviewImageRoles(doc: QualityDocument): QualityFinding[] {
    return doc.images.flatMap(image => {
        const out: QualityFinding[] = [], realProof = image.role === "proof" || image.role === "demonstration";
        const exists = doc.run?.brand.assets.some(a => a.id === image.assetId) ?? Boolean(image.assetId);
        const assigned = doc.run?.sections.find(s => s.id === image.sectionId)?.images.find(i => i.key === image.slotId);
        if (doc.run && assigned?.assetId !== image.assetId)
            out.push(finding(`image-assignment-${image.sectionId}-${image.slotId}`, "imagery", image.sectionId, "review", `The role plan names ${image.assetId || "no asset"}; the rendered slot uses ${assigned?.assetId || "no asset"}.`, "Role and provenance must describe the actual assigned picture.", "Assign the planned asset in CRO Studio or correct the source record before reviewing its crop."));
        const sourceOkay = !realProof || image.provenance === "real" && Boolean(image.source.trim() && image.evidence.trim());
        out.push(finding(`image-source-${image.sectionId}-${image.slotId}`, "imagery", image.sectionId, exists && sourceOkay ? "pass" : "missing", `${image.role}; ${image.provenance}; asset ${image.assetId || "not selected"}; ${image.source || "source unverified"}.`, image.question || "Assign the question this picture answers.", realProof && !sourceOkay ? "Supply a real sourced proof view, or change the role to a labelled illustration. Generated pictures cannot demonstrate a real test or customer result." : "Select a product-matched asset and confirm provenance; a filename does not authenticate proof."));
        if (image.productId && doc.brief.productId && image.productId !== doc.brief.productId)
            out.push(finding(`image-product-${image.slotId}`, "imagery", image.sectionId, "review", image.productId, doc.brief.productId, "Use the selected product's view; do not imply that another SKU is the advertised product."));
        for (const viewport of ["mobile", "desktop"] as const)
            out.push(finding(`image-crop-${image.sectionId}-${image.slotId}-${viewport}`, "crop", image.sectionId, image[`${viewport}Crop`] === "answers_question" ? "pass" : "review", `${viewport}: ${image[`${viewport}Crop`].replaceAll("_", " ")}.`, image.question || "The image must answer its section's question.", "Inspect the actual rendered crop at this viewport. Preserve the relevant product detail or scale reference; record the result beside the view."));
        return out;
    });
}
export type OfferReview = {
    firstPurchase: string;
    repeatPurchase: string;
    unitPrice: number | null;
    comparisonSaving: number | null;
    comparisonReason: string;
    missing: string[];
};
const money = (n: number, currency: string) => `${currency || "Currency unknown"} ${n.toFixed(2)}`;
export function reviewOffer(terms: QualityTerms): OfferReview {
    const missing: string[] = [];
    if (!terms.source)
        missing.push("Source for the selected commercial terms");
    if (!terms.productId)
        missing.push("Applicable product");
    if (!terms.currency)
        missing.push("Currency");
    if (terms.quantity === null)
        missing.push("Quantity");
    if (!terms.quantityUnit)
        missing.push("Quantity unit or pack contents definition");
    if (terms.price === null)
        missing.push("Total first-purchase price");
    if (!terms.cadence)
        missing.push("One-time or recurring purchase cadence");
    if (!terms.shipping)
        missing.push("Shipping eligibility and charges");
    if (!terms.returns)
        missing.push("Return conditions");
    const recurring = Boolean(terms.cadence && !/one[- ]?time|single purchase/i.test(terms.cadence));
    if (recurring && (terms.renewalPrice === null || !terms.renewalTerms))
        missing.push("Renewal amount, timing and cancellation conditions");
    const same = Boolean(terms.source && terms.comparisonSource && terms.productId && terms.productId === terms.comparisonProductId && terms.variant === terms.comparisonVariant && terms.quantity !== null && terms.quantity === terms.comparisonQuantity && terms.cadence && clean(terms.cadence) === clean(terms.comparisonCadence));
    const saving = same && terms.price !== null && terms.comparisonPrice !== null && terms.comparisonPrice > terms.price ? Math.round((terms.comparisonPrice - terms.price) * 100) / 100 : null;
    return { firstPurchase: terms.price === null ? "First purchase price unresolved." : `${terms.quantity ?? "Unknown quantity"} ${terms.quantityUnit || "units (definition unresolved)"} of ${terms.productId || "selected product"}${terms.variant ? ` (${terms.variant})` : ""}: ${money(terms.price, terms.currency)} total; ${terms.cadence || "cadence unresolved"}.`, repeatPurchase: !recurring ? terms.cadence ? "One-time purchase; no renewal stated." : "Purchase cadence unresolved." : terms.renewalPrice === null ? "Renewal charge unresolved; omit an introductory-savings promise." : `${money(terms.renewalPrice, terms.currency)} on renewal. ${terms.renewalTerms || "Timing and cancellation conditions unresolved."}`, unitPrice: terms.quantity !== null && terms.price !== null ? Math.round(terms.price / terms.quantity * 100) / 100 : null, comparisonSaving: saving, comparisonReason: saving !== null ? `Verified supplied conditions match product, variant, quantity and cadence. Difference: ${money(saving, terms.currency)}. Sources still require human verification.` : "No like-for-like saving is asserted. Supply matching product, variant, quantity, cadence and comparison source; subscription versus one-time is not an equivalent comparison.", missing };
}
export function offerFindings(doc: QualityDocument): QualityFinding[] {
    const review = reviewOffer(doc.brief.terms), out = review.missing.map((term, i) => finding(`offer-missing-${i}`, "offer", "purchase", "missing", "Unresolved in the selected offer.", term, "Supply this exact term or omit the unsupported purchase claim."));
    const text = allText(doc), t = doc.brief.terms;
    for (const [field, value] of [["shipping", t.shipping], ["returns", t.returns], ["qualification", t.qualification], ["renewal", t.renewalTerms]] as const)
        if (value && !contains(text, value))
            out.push(finding(`offer-visible-${field}`, "offer", "purchase", "missing", "Saved term is absent from visible page text.", value, "Keep this material term beside the purchase choice. A return policy is not a guarantee of product results."));
    if (t.price !== null && !hasAmount(text, t.price))
        out.push(finding("offer-visible-price", "offer", "purchase", "review", "The selected total is not located in the page text.", money(t.price, t.currency), "Verify the buy box's total price and quantity; locating a number is a bounded check, not proof of its meaning."));
    return out;
}
export function purchaseFindings(doc: QualityDocument): QualityFinding[] {
    const out: QualityFinding[] = [], fingerprint = pageFingerprint(doc), rendered = doc.rendered.filter(r => r.fingerprint === fingerprint);
    if (!rendered.length)
        return [finding("path-unchecked", "purchase path", "", "missing", "No current rendered inspection.", "Inspect the saved local page.", "Run the local audit; no analytics or conversion events are needed.")];
    for (const view of rendered) {
        const primary = view.controls.filter(c => /shop|buy|cart|choose|order|get |select|subscribe|see (?:the )?offer/i.test(c.label));
        if (!primary.length)
            out.push(finding(`path-no-action-${view.viewport.width}`, "purchase path", "", "missing", `No named purchase/discovery action found at ${view.viewport.width}px.`, doc.brief.destination, "Add a clear named action to the intended product or local buy box."));
        for (const c of view.controls) {
            if (c.status === "broken" || c.status === "unsafe" || !c.label || c.covered)
                out.push(finding(`path-${view.viewport.width}-${c.locator}`, "purchase path", c.sectionId, "review", `${c.locator}: ${c.label || "Unnamed control"} → ${c.href || "no target"}; ${c.status}${c.covered ? "; covered at centre" : ""}.`, "A named, reachable local target or an explicit external handoff.", "Repair this exact control's label, anchor or obstruction; external checkout remains unverified."));
            if (primary.includes(c) && !c.href)
                out.push(finding(`path-unverified-action-${view.viewport.width}-${c.locator}`, "purchase path", c.sectionId, "review", `${c.locator}: ${c.label} has no passive destination.`, "Verify the next purchase step in the destination runtime.", "Wire or inspect this exact control. Scripts and form submissions were disabled; an apparent button is not a verified purchase path."));
            const expected = doc.brief.destination;
            if (expected && primary.includes(c) && c.href && !c.href.startsWith("#") && c.href !== expected)
                out.push(finding(`path-destination-${view.viewport.width}-${c.locator}`, "purchase path", c.sectionId, "review", `${c.label} → ${c.href}`, expected, "Confirm whether this is a deliberate supporting action. Align purchase controls with the selected product/variant destination."));
            if (c.sticky && primary.includes(c) && (c.width < 44 || c.height < 44))
                out.push(finding(`path-sticky-${view.viewport.width}-${c.locator}`, "mobile", c.sectionId, "review", `Sticky control ${c.label}: ${c.width}×${c.height}px.`, "A usable sticky control with the same product/offer intent.", "Increase the target or remove the competing sticky action while preserving purchase terms."));
        }
        const destinations = [...new Set(primary.filter(c => !c.href.startsWith("#")).map(c => c.href))];
        if (destinations.length > 1)
            out.push(finding(`path-competing-${view.viewport.width}`, "purchase path", "", "review", `${destinations.length} purchase-labelled destinations: ${destinations.join(", ")}`, doc.brief.destination || "One selected purchase destination, with supporting actions distinguished.", "Review the named controls; multiple destinations can be deliberate but must not silently select another offer."));
        for (const l of view.layout)
            out.push(finding(`layout-${view.viewport.width}-${l.kind}-${l.sectionId}-${qualityHash(`${l.element || ""}:${l.evidence}`).slice(0, 12)}`, "layout", l.sectionId, "review", `${view.viewport.width}px: ${l.evidence}`, l.kind, "Repair the affected rendered section; record shopper comprehension separately."));
        for (const [i, image] of view.images.entries())
            if (!image.loaded)
                out.push(finding(`image-unloaded-${view.viewport.width}-${i}`, "imagery", image.sectionId, "review", `${view.viewport.width}px: image ${image.alt || i + 1} did not decode in the offline render.`, "A visible product view whose crop can be inspected.", "Supply a local image or verify the remote original separately. Do not mark this crop reviewed from a missing picture."));
    }
    return out;
}
export function qualityFindings(doc: QualityDocument): QualityFinding[] {
    const offerRecord = doc.evidence?.records.find(r => r.kind === "offer" && ((r.id === doc.brief.terms.offerId || r.id === `offer:${doc.brief.terms.offerId}`) || r.source.id === doc.brief.terms.source));
    const sourceFindings: QualityFinding[] = doc.sourceReview?.needsReview ? doc.sourceReview.findings.map((f, i) => finding(`source-changed-${i}`, "source changed", doc.brief.proofRequirements.find(p => p.source === f.id)?.sectionId || "page", "review", `${f.id}: ${f.issue}`, "The factual review was invalidated by a source change.", "Compare the previous and current evidence in the handoff, update affected facts/page text, then create a fresh review. Geometry checks remain separate from factual approval.")) : [];
    return [...sourceFindings, ...auditPromiseChain(doc), ...reviewQuestions(doc), ...reviewImageRoles(doc), ...offerFindings(doc), ...purchaseFindings(doc).filter((f, i, all) => all.findIndex(other => other.id === f.id) === i), ...(offerRecord && !offerRecord.eligible ? [finding("offer-bound-scope", "offer", "purchase", "review", offerRecord.issues.join(" "), offerRecord.text, "Use terms approved for this exact product, variant, market and validity period.")] : []), ...(offerRecord && doc.brief.terms.price !== null && !hasAmount(`${offerRecord.text} ${offerRecord.source.excerpt}`, doc.brief.terms.price) ? [finding("offer-bound-price", "offer", "purchase", "review", `Saved total ${doc.brief.terms.price} is not located in the current offer excerpt.`, offerRecord.text, "Reconcile the current bound source and visible buy box before handing off offer schema.")] : [])];
}
export function applyQualityChange(doc: QualityDocument, change: QualityChange): QualityDocument {
    if (!doc.run)
        throw new Error("Controlled editing uses the structured CRO page. Supplied HTML can be audited and exported; import it into the page builder to edit structured fields.");
    const baseline = doc.run.sections.find(s => s.id === change.sectionId);
    if (!baseline)
        throw new Error("Select an existing section.");
    if (change.intent === "repair" && !qualityFindings(doc).some(f => f.id === change.findingId && f.status !== "pass" && (!f.sectionId || f.sectionId === change.sectionId || f.sectionId === "purchase" || f.sectionId === "page")))
        throw new Error("Select a current finding in this section before applying a repair.");
    if (change.variable === "wording" && change.locks.includes("wording") || change.variable === "crop" && change.locks.includes("crop") || change.variable === "proof_order" && change.locks.includes("layout") || change.variable === "destination" && change.locks.includes("destination"))
        throw new Error("This edit conflicts with a recorded design lock.");
    const next = structuredClone(doc), section = next.run!.sections.find(s => s.id === change.sectionId)!, diff: QualityEdit["diff"] = [];
    if (change.variable === "wording") {
        const field = section.copy.find(f => f.key === change.field);
        if (!field)
            throw new Error("Choose an existing editable wording field.");
        const required = [...doc.brief.qualifiers, doc.brief.terms.qualification, doc.brief.terms.shipping, doc.brief.terms.returns, doc.brief.terms.renewalTerms].filter(Boolean);
        for (const fact of required)
            if (contains(field.text, fact) && !contains(change.replacement, fact))
                throw new Error(`The edit removes a locked commercial condition: ${fact}`);
        const numbers: string[] = field.text.match(/\d+(?:[.,]\d+)?/g) || [], nextNumbers: string[] = change.replacement.match(/\d+(?:[.,]\d+)?/g) || [];
        if (numbers.some(n => !nextNumbers.includes(n)) || nextNumbers.some(n => !numbers.includes(n)))
            throw new Error("Preserve numeric facts in a controlled wording edit. Change verified commercial facts in the brief before creating a new baseline.");
        for (const proof of doc.brief.proofRequirements)
            if (proof.sectionId === section.id && contains(field.text, proof.statement) && !contains(change.replacement, proof.statement))
                throw new Error("Preserve the selected proof statement while changing a separate persuasion variable.");
        diff.push({ field: change.field, before: field.text, after: change.replacement });
        field.text = change.replacement;
    }
    else if (change.variable === "crop") {
        if (!change.visual)
            throw new Error("Supply the crop values.");
        const old = section.visual || { spacePx: 24, readingCh: 65, imageRatio: "original" as const, focalX: 50, focalY: 50 };
        if (old.spacePx !== change.visual.spacePx || old.readingCh !== change.visual.readingCh)
            throw new Error("A crop-only edit cannot change spacing or reading measure.");
        diff.push({ field: "crop", before: JSON.stringify(old), after: JSON.stringify(change.visual) });
        section.visual = change.visual;
    }
    else if (change.variable === "treatment") {
        if (change.css === undefined)
            throw new Error("Supply the section's complete revised CSS.");
        const withoutPaint = (css: string) => css.replace(/(^|(?<=[;{]))\s*(?:color|background(?:-color)?|border-color|outline-color|text-decoration-color|box-shadow)\s*:[^;{}]*;?/gi, "").replace(/\s+/g, "").replace(/;}/g, "}").replace(/[^{}]+\{\}/g, "");
        if ((change.locks.includes("layout") || change.locks.includes("typography")) && withoutPaint(section.css) !== withoutPaint(change.css))
            throw new Error("This treatment changes more than paint while layout or typography is locked. Preserve the locked CSS or explicitly review a wider change.");
        diff.push({ field: "css", before: section.css, after: change.css });
        section.css = change.css;
    }
    else if (change.variable === "proof_order") {
        if (!change.order || new Set(change.order).size !== change.order.length || change.order.some(key => !section.copy.some(c => c.key === key)))
            throw new Error("Choose at least two distinct existing proof text fields in their intended order.");
        const keys = change.order, currentOrder = [...section.html.matchAll(/\{\{text:([a-z][a-z0-9_-]*)\}\}/g)].map(m => m[1]).filter(key => keys.includes(key));
        if (currentOrder.length !== keys.length || new Set(currentOrder).size !== keys.length)
            throw new Error("Each selected proof field must appear exactly once in the section markup.");
        let at = 0;
        section.html = section.html.replace(/\{\{text:([a-z][a-z0-9_-]*)\}\}/g, (token, key: string) => keys.includes(key) ? `{{text:${keys[at++]}}}` : token);
        diff.push({ field: "proof-field order", before: currentOrder.join(", "), after: keys.join(", ") });
    }
    else {
        if (!doc.brief.destination)
            throw new Error("Save the intended product destination in the brief first.");
        const token = change.field;
        if (!/^#[a-z0-9_-]+$/.test(token))
            throw new Error("Choose an existing local fragment target to repair; external links use the captured own-product destination.");
        if (!section.html.includes(`href="${token}"`))
            throw new Error("This section does not contain that local link.");
        const replacement = change.replacement;
        if (!/^(#[a-z0-9_-]+|\{\{link\}\})$/.test(replacement))
            throw new Error("Use a local fragment or {{link}} for the saved product destination.");
        diff.push({ field: `href=${token}`, before: token, after: replacement });
        section.html = section.html.replaceAll(`href="${token}"`, `href="${replacement}"`);
    }
    if (!diff.some(d => d.before !== d.after))
        throw new Error("The candidate must change the selected variable.");
    validateSection(section);
    const unchangedHashes: Record<string, string> = {};
    for (const other of doc.run.sections.filter(s => s.id !== change.sectionId)) {
        const after = next.run!.sections.find(s => s.id === other.id);
        if (qualityHash(after) !== qualityHash(other))
            throw new Error("An untouched section changed.");
        unchangedHashes[other.id] = qualityHash(other);
    }
    if (qualityHash(next.brief.terms) !== qualityHash(doc.brief.terms) || qualityHash(next.run!.brand) !== qualityHash(doc.run.brand))
        throw new Error("Commercial facts or brand identity changed.");
    const beforeFingerprint = pageFingerprint(doc);
    section.version += 1;
    next.run!.revisions.push({ at: new Date().toISOString(), section: structuredClone(baseline) });
    const record: QualityEdit = { id: randomUUID(), at: new Date().toISOString(), intent: change.intent, sectionId: change.sectionId, hypothesis: change.hypothesis, variable: change.variable, findingId: change.findingId, beforeFingerprint, afterFingerprint: pageFingerprint(next), unchangedHashes, diff, locks: change.locks, strengths: change.strengths, resolution: "needs_review", verification: ["All untouched section hashes match.", "Product, offer terms, asset selections and brand tokens preserved.", "Recheck mobile and desktop renders; no conversion lift is inferred."] };
    next.edits.push(record);
    next.rendered = [];
    return next;
}
export function validateCurrentObservations(doc: QualityDocument): void {
    const fingerprint = pageFingerprint(doc);
    for (const o of doc.observations) {
        if (o.result === "not_reviewed")
            continue;
        if (o.fingerprint !== fingerprint)
            throw new Error("A shopper observation belongs to another page revision. Reopen the current mobile preview and record it again.");
        if (!o.response.trim() || !o.evidence.trim() || !o.reviewer.trim())
            throw new Error("Reviewed tasks need the observed answer, specific page evidence and reviewer identity.");
        if (!doc.rendered.some(r => r.fingerprint === fingerprint && r.viewport.width === o.viewport))
            throw new Error("Inspect this revision at the recorded viewport before saving shopper observations.");
        if (!o.sectionId.trim() || !doc.rendered.some(r => r.fingerprint === fingerprint && r.viewport.width === o.viewport && r.sections.some(s => s.id === o.sectionId)))
            throw new Error("Name an inspected page section for each reviewed shopper task.");
    }
}
export function reconcileRepairChecks(doc: QualityDocument): void {
    if (doc.sourceReview?.needsReview)
        return;
    const current = pageFingerprint(doc), remaining = qualityFindings(doc).filter(f => f.status !== "pass");
    for (const edit of doc.edits)
        if (edit.afterFingerprint === current) {
            const views = doc.rendered.filter(r => r.fingerprint === current);
            if (views.some(v => v.viewport.width < 600) && views.some(v => v.viewport.width >= 1000)) {
                edit.verification = [...edit.verification.filter(v => !v.startsWith("Rendered checks:")), `Rendered checks: current mobile and desktop inspected at ${views.map(v => v.viewport.width).join(" / ")}px.`];
                if (edit.intent === "repair")
                    edit.resolution = remaining.some(f => f.id === edit.findingId) ? "unresolved" : "resolved";
            }
        }
}
export function seoHandoff(doc: QualityDocument) {
    const text = allText(doc), t = doc.brief.terms, offer = reviewOffer(t), title = doc.seo.title || doc.run?.blueprint?.title || doc.run?.brand.productName || "", unresolved: string[] = [];
    if (doc.sourceReview?.needsReview)
        unresolved.push(...doc.sourceReview.findings.map(f => `Changed source ${f.id}: ${f.issue} Factual review needs another pass.`));
    if (doc.seo.indexability === "undecided")
        unresolved.push("Choose index or noindex for this exact page; campaign purpose alone does not decide.");
    if (!doc.seo.canonical)
        unresolved.push("Confirm the canonical URL and whether this page duplicates another destination.");
    else {
        try {
            const u = new URL(doc.seo.canonical);
            if (!/^https?:$/.test(u.protocol) || u.username || u.password)
                throw new Error("invalid");
        }
        catch {
            unresolved.push("Canonical must be an absolute HTTP(S) URL without credentials; it is omitted from export until corrected.");
        }
    }
    if (!doc.seo.description)
        unresolved.push("Review a factual meta description against visible content.");
    const productName = doc.run?.brand.productName || doc.productName || "";
    if (!productName || !contains(text, productName))
        unresolved.push("Product identity is not confirmed in visible page content.");
    if (doc.seo.title && !doc.seo.title.split(/\s+/).some(word => word.length > 3 && contains(text, word)))
        unresolved.push("The proposed title is not located in the page's visible argument; review the mismatch.");
    const schema: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Product" };
    if (productName && contains(text, productName))
        schema.name = productName;
    if (doc.brief.destination && /^https?:\/\//.test(doc.brief.destination))
        schema.url = doc.brief.destination;
    const boundOffer = doc.evidence?.records.find(r => r.kind === "offer" && r.eligible && ((r.id === t.offerId || r.id === `offer:${t.offerId}`) || r.source.id === t.source));
    if (!doc.sourceReview?.needsReview && boundOffer && t.source && t.productId === doc.brief.productId && t.variant === doc.brief.variant && t.price !== null && hasAmount(`${boundOffer.text} ${boundOffer.source.excerpt}`, t.price) && t.currency && !offerFindings(doc).some(f => f.id === "offer-visible-price") && schema.name)
        schema.offers = { "@type": "Offer", price: t.price, priceCurrency: t.currency, ...(schema.url ? { url: schema.url } : {}) };
    else
        unresolved.push("Structured-data offer omitted until the selected source, product/variant and visible price match.");
    if (!schema.name)
        unresolved.push("Structured-data Product omitted until its identity is visible; no ratings, availability or review counts were invented.");
    return { version: 1, generatedAt: new Date().toISOString(), pageId: doc.id, pageFingerprint: pageFingerprint(doc), source: doc.source,
        productId: doc.brief.productId, variant: doc.brief.variant, purpose: doc.seo.purpose || doc.brief.buyerQuestion, structure: doc.brief.structure,
        metadata: { title, description: doc.seo.description, canonical: doc.seo.canonical || null, indexability: doc.seo.indexability },
        visibleFacts: { productName, promise: doc.brief.promise, qualifiers: doc.brief.qualifiers, firstPurchase: offer.firstPurchase, repeatPurchase: offer.repeatPurchase },
        imageRoles: doc.images, crawlableLinks: doc.rendered[0]?.controls.map(c => ({ sectionId: c.sectionId, label: c.label, href: c.href, status: c.status })) || [],
        reviewState: doc.sourceReview?.needsReview ? "needs_review" : "current_snapshot", sourceReview: doc.sourceReview || null, structuredDataInputs: schema.name ? schema : null, evidencePacket: doc.evidence || null, unresolved: [...unresolved, ...offer.missing.map(m => `Offer input: ${m}`)],
        preservedArgument: { sections: enabled(doc).map(s => ({ id: s.id, hash: qualityHash(s) })), fingerprint: pageFingerprint(doc) },
        limits: ["No ranking, rich-result, usability or conversion guarantee.", "Schema syntax and destination-theme deployment must be checked separately.", "External checkout and remote destination responses remain unverified."],
    };
}
