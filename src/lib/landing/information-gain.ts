import { randomUUID } from "node:crypto";
import { similarity } from "../standalone/creative";
import { pageFingerprint, qualityHash } from "./quality";
import type { QualityDocument } from "./quality-types";
const normalized = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const numbers = (value: string) => [...new Set(value.match(/\d+(?:[.,]\d+)?/g) ?? [])];
export function sectionInformationGain(doc: QualityDocument) {
    const seenFacts = new Set<string>(), seenQuestions = new Set<string>();
    const sections = doc.run ? doc.run.sections.filter(section => section.enabled).map(section => ({ id: section.id, text: section.copy.map(field => field.text).join(" "), destinations: [...section.html.matchAll(/href="([^"]+)"/g)].map(match => match[1]) })) : doc.rendered[0]?.sections.map(section => ({ id: section.id, text: section.text, destinations: doc.rendered[0].controls.filter(control => control.sectionId === section.id).map(control => control.href) })) ?? [];
    return sections.map(section => {
        const facts = (doc.evidence?.records ?? []).filter(record => record.eligible && (normalized(section.text).includes(normalized(record.text)) || similarity(section.text, record.text) >= .65)).map(record => record.id);
        const questions = doc.questions.filter(question => question.sectionId === section.id || question.answer && similarity(section.text, question.answer) >= .65).map(question => question.id);
        const newFacts = facts.filter(id => !seenFacts.has(id)), newQuestions = questions.filter(id => !seenQuestions.has(id));
        facts.forEach(id => seenFacts.add(id));
        questions.forEach(id => seenQuestions.add(id));
        const repeats = sections.filter(other => other.id !== section.id && sections.indexOf(other) < sections.indexOf(section) && similarity(other.text, section.text) >= .65).map(other => other.id);
        return { ...section, facts, questions, newFacts, newQuestions, repeats, status: repeats.length && !newFacts.length && !newQuestions.length ? "consolidation_candidate" : "distinct_or_unmapped", limitation: "Transparent lexical/source overlap is a review candidate; unmapped wording is not verified semantic novelty." };
    });
}
export function previewConsolidation(doc: QualityDocument, keepId: string, removeIds: string[]) {
    if (!doc.run)
        throw new Error("Consolidation edits require a structured saved page.");
    if (!removeIds.length || new Set(removeIds).size !== removeIds.length || removeIds.includes(keepId))
        throw new Error("Choose a retained section and distinct sections to consolidate.");
    const analysis = sectionInformationGain(doc), kept = analysis.find(section => section.id === keepId), holds: string[] = [];
    if (!kept)
        throw new Error("The retained enabled section is unavailable.");
    for (const id of removeIds) {
        const removed = analysis.find(section => section.id === id);
        if (!removed)
            throw new Error("A selected enabled section is unavailable.");
        if (similarity(kept.text, removed.text) < .65)
            holds.push(`${id}: the answers are not substantially repeated; retain its distinct information.`);
        const unique = removed.facts.filter(fact => !kept.facts.includes(fact));
        if (unique.length)
            holds.push(`${id}: preserve unique sourced facts ${unique.join(", ")} in the retained section first.`);
        for (const amount of numbers(removed.text))
            if (!numbers(kept.text).includes(amount))
                holds.push(`${id}: unique numeric fact ${amount} must be preserved first.`);
        for (const qualifier of [...doc.brief.qualifiers, ...(doc.evidence?.records ?? []).filter(record => record.eligible).flatMap(record => record.qualifiers), doc.brief.terms.qualification, doc.brief.terms.renewalTerms].filter(Boolean))
            if (normalized(removed.text).includes(normalized(qualifier)) && !normalized(kept.text).includes(normalized(qualifier)))
                holds.push(`${id}: a material condition is absent from the retained section: ${qualifier}`);
        for (const destination of removed.destinations)
            if (!kept.destinations.includes(destination) && !/^#/.test(destination))
                holds.push(`${id}: distinct destination ${destination} must be retained first.`);
        for (const proof of doc.brief.proofRequirements.filter(proof => proof.sectionId === id))
            if (!normalized(kept.text).includes(normalized(proof.statement)))
                holds.push(`${id}: preserve the sourced proof statement before removing its section.`);
    }
    const candidate = structuredClone(doc);
    if (!holds.length) {
        candidate.run!.sections = candidate.run!.sections.filter(section => !removeIds.includes(section.id));
        if (candidate.run!.blueprint)
            candidate.run!.blueprint.sections = candidate.run!.blueprint.sections.filter(section => !removeIds.includes(section.id));
        if (candidate.run!.storyboard) {
            candidate.run!.storyboard.sections = candidate.run!.storyboard.sections.filter(section => !removeIds.includes(section.id));
            candidate.run!.storyboard.imagePlan = candidate.run!.storyboard.imagePlan.filter(image => !removeIds.includes(image.sectionId));
        }
        for (const section of candidate.run!.sections)
            for (const id of removeIds)
                section.html = section.html.replaceAll(`href="#cro-${id}"`, `href="#cro-${keepId}"`);
        candidate.questions = candidate.questions.map(question => removeIds.includes(question.sectionId) ? { ...question, sectionId: keepId } : question);
        candidate.brief.proofRequirements = candidate.brief.proofRequirements.map(proof => removeIds.includes(proof.sectionId) ? { ...proof, sectionId: keepId } : proof);
        candidate.rendered = [];
        candidate.exportChecks = [];
        candidate.consolidations = [...(candidate.consolidations ?? []), { id: randomUUID(), at: new Date().toISOString(), keepId, removed: removeIds, beforeFingerprint: pageFingerprint(doc), afterFingerprint: pageFingerprint(candidate), preservedFacts: kept.facts, termsHash: qualityHash(doc.brief.terms) }];
    }
    return { candidate, holds, review: { keepId, removeIds, before: analysis, after: sectionInformationGain(candidate), preservedTerms: qualityHash(candidate.brief.terms) === qualityHash(doc.brief.terms), workingFragments: "Removed wrapper destinations are redirected to the retained section; re-run whole-page render checks." } };
}
