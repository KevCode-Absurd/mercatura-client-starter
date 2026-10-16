import path from "node:path";
import { currentOutputs } from "./outputs";
import { z } from "zod";
import type { StaticAdCopy, StudioItem, StudioText } from "@/db/schema";
import { brandVoiceApart } from "../brand-voice";
import { env } from "../env";
import { geminiJson } from "../llm/gemini";
import { contextLevel } from "../llm/routing";
import { mediaLive } from "../media/providers";
import { skillFor } from "../skills/card";
import { sellingText } from "../skills/selling";
import { stageBrief } from "../scripts/stage-brief";
import { getRun, productFor, saveRun, studioCopyAuthority } from "./engine";
import { completeCopyApprovalMatches, completeCopyHash, completeCopyPacket, type CompleteCopyDocument, type CompleteCopyRequirements } from "../evaluation/copy-repair";
import { copyRequirementsForItem, invalidateCopyApproval, reviewCompleteCopy } from "./copy-gate";
import { PRIMARY_WORDS, primaryLengthText } from "../copy/stage";
import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { STATIC_TEMPLATE_METHOD, staticTemplateContract, staticTemplateMethod } from "./static-template";
import { OWN_MATERIAL_RULE, SAID_MOST, buyerOfAd, dealtBlock, handsOfSet, layerTexts, poolsOfSet, saidByOthers, siblingPhrases, spentOnPictures } from "./dealt";
import { cutLine, fitLayer, layerBudgetOf, wordBudgetLine } from "./word-budget";
import { againBlock } from "./word-budget";
import { budgetAsk, isOver } from "./word-budget";
import { ledByOthers } from "./dealt";
import { afterMend, figureAsk, figuresOn, heldMaterial, notFound, type FigureRow, type HeldMaterial } from "./figures";
import { RunStoppedError } from "../llm/run-control";
export const StaticCopySchema = z.object({
    headline: z.string().trim().max(120),
    body: z.string().trim().max(400),
    primary_text: z.string().trim().max(30000),
    description: z.string().trim().max(200),
    cta: z.string().trim().max(40),
});
export function approvedCopyTexts(copy?: StaticAdCopy): Pick<StudioText, "role" | "text" | "placement">[] {
    if (!copy?.approved_at)
        return [];
    if (mediaLive() && copy.approval_hash !== staticCopyHash(copy))
        return [];
    return [
        { role: "headline", text: copy.headline, placement: "top center" },
        { role: "subhead", text: copy.body, placement: "bottom center" },
    ].filter((t) => t.text);
}
const staticCopyTexts = (copy: StaticAdCopy): StudioText[] => [{ role: "headline", text: copy.headline, placement: "top center" }, { role: "subhead", text: copy.body, placement: "bottom center" }].filter(t => t.text);
export const staticCopyHash = (copy: StaticAdCopy) => completeCopyHash({ text_elements: staticCopyTexts(copy), ad_copy: { primary_text: copy.primary_text, headline: copy.headline, description: copy.description, cta: copy.cta } });
export const staticCopyDocument = (item: StudioItem, copy: StaticAdCopy): CompleteCopyDocument => ({ text_elements: staticCopyTexts(copy), ad_copy: { ...item.plan?.ad_copy, primary_text: copy.primary_text, headline: copy.headline, description: copy.description, cta: copy.cta }, ...(item.variants ? { variants: item.variants } : {}) });
const staticCopyCandidate = (item: StudioItem, copy: StaticAdCopy): StudioItem => ({ ...item, plan: { ...item.plan!, text_elements: staticCopyTexts(copy), ad_copy: staticCopyDocument(item, copy).ad_copy } });
export function saveStaticCopy(runId: string, itemId: string, input: z.input<typeof StaticCopySchema>, approve = false, methods: readonly string[] = [], requirements?: CompleteCopyRequirements) {
    const copy = StaticCopySchema.parse(input);
    if (approve && !copy.headline && !copy.body && !copy.primary_text)
        throw new Error("Write or generate some copy first.");
    const run = getRun(runId);
    const item = run?.items.find((i) => i.id === itemId);
    if (!run || !item?.plan || !item.outputs.length)
        throw new Error("Make this ad's base image first.");
    const changed = !item.copy_draft || staticCopyHash(item.copy_draft) !== staticCopyHash(copy) || (requirements !== undefined && completeCopyHash(staticCopyDocument(item, copy), copyRequirementsForItem(item)) !== completeCopyHash(staticCopyDocument(item, copy), requirements));
    if (changed)
        invalidateCopyApproval(item);
    if (requirements)
        item.copy_requirements = requirements;
    const proposed = staticCopyCandidate(item, copy);
    if (approve && mediaLive() && !completeCopyApprovalMatches(staticCopyDocument(item, copy), item.copy_draft_review, studioCopyAuthority(run, proposed), copyRequirementsForItem(proposed)))
        throw new Error("Save the draft, then review its complete copy before approving editable words.");
    const { approved_at: _oldApproval, approval_hash: _oldHash, ...preserved } = item.copy_draft ?? {};
    item.copy_draft = { ...preserved, ...copy, ...(approve ? { approved_at: new Date().toISOString(), approval_hash: staticCopyHash(copy) } : {}) };
    if (approve) {
        item.plan.ad_copy = { ...item.plan.ad_copy, headline: copy.headline, primary_text: copy.primary_text, description: copy.description, cta: copy.cta };
        delete item.copy_review;
    }
    if (methods.length)
        run.context = { ...run.context, skills: [...new Set([...(Array.isArray(run.context?.skills) ? run.context.skills : []), ...methods])] };
    saveRun(run);
    return item.copy_draft;
}
export async function approveStaticCopy(runId: string, itemId: string, input: z.input<typeof StaticCopySchema>) {
    const copy = saveStaticCopy(runId, itemId, input, false);
    if (!mediaLive())
        return saveStaticCopy(runId, itemId, input, true);
    const run = getRun(runId)!;
    const item = run.items.find(i => i.id === itemId)!;
    const document = staticCopyDocument(item, copy);
    const proposed = staticCopyCandidate(item, copy);
    const checked = await reviewCompleteCopy(document, studioCopyAuthority(run, proposed), { brandId: run.brand_id, refId: run.id, requirements: copyRequirementsForItem(proposed), previousReview: item.copy_draft_review });
    const fresh = getRun(runId)!;
    const current = fresh.items.find(i => i.id === itemId)!;
    if (!current.copy_draft)
        throw new Error("The copy changed while its review ran. The newer draft is preserved; review it again.");
    const freshCandidate = staticCopyCandidate(current, current.copy_draft);
    const freshPacket = completeCopyPacket(staticCopyDocument(current, current.copy_draft), studioCopyAuthority(fresh, freshCandidate), copyRequirementsForItem(freshCandidate));
    if (freshPacket.contentHash !== checked.packet.contentHash || freshPacket.evidenceHash !== checked.packet.evidenceHash)
        throw new Error("The copy or its evidence changed while its review ran. The newer draft is preserved; review it again.");
    current.copy_draft_review = checked.review;
    saveRun(fresh);
    if (checked.review.status !== "approved")
        throw new Error(`Draft saved without approval. ${checked.review.verificationErrors.join(" ") || checked.review.issues.filter(i => i.severity !== "advisory").map(i => `${i.fieldPath}: ${i.reason}`).join(" ")}`);
    return saveStaticCopy(runId, itemId, input, true);
}
const staticCopySystem = (dealt: boolean) => [
    "Write a draft for an existing static ad. Return JSON: headline (the on-image headline, optional), body (the subhead: 1 line of on-image support, optional), primary_text (feed copy), description, cta. The headline and the body are the only words laid over the picture. The ad says how many words they may carry together (\"Words on the picture\"): that is a ceiling, never a target, 1 line is a complete ad, and either may come back empty. Match the actual image, its buyer and awareness stage. Use only supported product facts. Never invent offers, figures, testimonials or health claims. The image is already final: do not request or describe changes to it. These words will be reviewed before use.",
    dealt ? OWN_MATERIAL_RULE : "",
]
    .filter(Boolean)
    .join("\n\n");
const PER_CALL = "=== PER CALL ===";
const NO_CEILING_LINE = "Words on the picture: a headline under 10 words and, only where it adds something, support under 25.";
const overPicture = (c: {
    headline?: string;
    body?: string;
}): {
    role: string;
    text: string;
}[] => [{ role: "headline", text: c.headline ?? "" }, { role: "subhead", text: c.body ?? "" }];
const heldOrNone = (read: () => HeldMaterial): HeldMaterial | null => {
    try {
        return read();
    }
    catch {
        return null;
    }
};
export async function writeStaticCopy(runId: string, itemIds: string[], replace = false) {
    const { run, brand, guide, templates } = await productFor(runId);
    const methodName = contextLevel("studio_static_copy") === "full" ? "image-ad-copy" : "operator-creative/static-copy";
    const method = skillFor(methodName, contextLevel("studio_static_copy"));
    const dealt = run.kind === "ad";
    const pools = dealt ? poolsOfSet(run, brand) : null;
    const hands = pools ? handsOfSet(run, brand, pools, true) : [];
    let spent: string[] | null = null;
    let heldNow: HeldMaterial | null = null;
    const product = JSON.stringify(Object.fromEntries(Object.entries(guide).filter(([k]) => k !== "handling" && k !== "handling_notes")));
    const system = [staticCopySystem(dealt), method, staticTemplateMethod("Words"), sellingText("words")].filter(Boolean).join("\n\n");
    const left = new Set(itemIds);
    for (const itemId of itemIds) {
        left.delete(itemId);
        const now = getRun(runId);
        const item = now?.items.find((i) => i.id === itemId);
        if (!now || !item?.plan || !item.outputs.length || (!replace && item.copy_draft))
            continue;
        const output = currentOutputs(item.outputs)[0];
        const stage = (AWARENESS_STAGES as readonly string[]).includes(item.plan.awareness ?? "") ? item.plan.awareness as AwarenessStage : null;
        const range = item.copy_requirements?.primaryWords ?? (stage ? { minWords: PRIMARY_WORDS[stage][0], maxWords: PRIMARY_WORDS[stage][1] } : undefined);
        const proseRoom = range ? Math.max(800, (range.maxWords ?? range.minWords ?? 1000) * 2) : 2000;
        const buyer = buyerOfAd(run, item, brand, true);
        const voice = brandVoiceApart(run.brand_id, { surfaces: ["on_image", "headline", "primary_text"], personaIds: buyer ? [buyer] : [], brand, ...(dealt ? { toneOnly: true } : {}) });
        const siblings = dealt ? siblingPhrases({ others: saidByOthers(now.items, itemId, (id) => replace && left.has(id)), spent: (spent ??= spentOnPictures(run.brand_id, brand)), most: SAID_MOST }) : [];
        const budget = layerBudgetOf(run, item, stage);
        const ad = [
            `### ${item.id}: ${item.label}`,
            item.plan.buyer || item.plan.awareness ? `For: ${[item.plan.buyer, (item.plan.awareness ?? "").replace(/_/g, " ")].filter(Boolean).join(", ")}` : "",
            voice.buyer,
            `What this stage asks: ${stageBrief(item.plan.awareness ?? "", brand.market_sophistication_stage)}`,
            item.plan.argument ? `argument: ${item.plan.argument}` : "",
            item.plan.scene ? `The picture (final, attached): ${item.plan.scene}` : "",
            `The user's direction: ${item.direction || "(none)"}`,
            `Template contract: ${templates?.[item.id] || staticTemplateContract({ productId: run.product_id, item, reference: item.ref_id ? { id: item.ref_id, fidelity: item.fidelity ?? "structure", inspected: false } : null, look: run.context?.format_look })}`,
            dealt ? dealtBlock(hands[run.items.findIndex((i) => i.id === itemId)], { siblings, led: ledByOthers(now.items, itemId, (id) => replace && left.has(id)) }) : "",
            budget ? wordBudgetLine(budget, { layer: true, ownHand: stage === "unaware" && budget.words > 0 }) : NO_CEILING_LINE,
            range ? `Feed copy: primary_word_range ${JSON.stringify(range)}. ${item.copy_requirements?.primaryWords ? "The explicit primary_word_range is required; preserve complete supported reasoning and qualifications without padding." : primaryLengthText(stage!)}` : "",
        ]
            .filter(Boolean)
            .join("\n");
        const user = `## Product\n\`\`\`json\n${product}\n\`\`\`\n\n${voice.text}\n\n${PER_CALL}\n\n${ad}`;
        const images = [path.join(env.DATA_DIR, "assets", output.base_path ?? output.path)];
        const written = mediaLive() ? await geminiJson({
            brandId: run.brand_id,
            task: "studio_static_copy",
            model: env.MODEL_COPY,
            refType: "studio",
            refId: runId,
            schema: StaticCopySchema,
            maxTokens: Math.max(2400, proseRoom + 1600),
            resultBudget: { profile: "static-words", items: 1, textTokens: proseRoom },
            system,
            user,
            images,
        }) : { headline: `Discover ${brand.brand.name}`, body: "Made for your everyday routine.", primary_text: item.plan.argument || item.plan.scene || item.label, description: "", cta: "Learn more" };
        const held = dealt ? (heldNow ??= heldOrNone(() => heldMaterial(brand, run.product_id))) : null;
        let copy = written;
        let figures: FigureRow[] = held ? figuresOn(overPicture(written), held) : [];
        const asks = held && mediaLive() ? notFound(figures).map((r) => figureAsk(r, overPicture(written).findIndex((t) => t.text === r.text) + 1, held)) : [];
        const toFit = mediaLive() && budget && budget.words > 0 && isOver(layerTexts(written), budget) ? [budgetAsk(layerTexts(written), budget)] : [];
        if (asks.length || toFit.length) {
            try {
                const again = await geminiJson({ brandId: run.brand_id, task: "studio_static_copy", model: env.MODEL_COPY, refType: "studio", refId: runId, schema: StaticCopySchema.pick({ headline: true, body: true }), maxTokens: 1600, system, user: `${user}\n${againBlock(overPicture(written), [...asks, ...toFit], !toFit.length)}\nReturn JSON with headline and body only: the 2 lines over the picture, in that order (either may be an empty string). The feed copy stands as it was written.`, images });
                copy = { ...written, ...again };
                figures = !held ? [] : asks.length ? afterMend(figures, overPicture(written), overPicture(copy), held) : figuresOn(overPicture(copy), held);
            }
            catch (e) {
                if (e instanceof RunStoppedError)
                    throw e;
            }
        }
        const fit = mediaLive() ? fitLayer(layerTexts(copy), budget, stage) : { texts: layerTexts(copy), cut: [] };
        const kept = fit.cut.length ? { ...copy, headline: fit.texts.find((t) => t.role === "headline")?.text ?? "", body: fit.texts.find((t) => t.role === "subhead")?.text ?? "" } : copy;
        saveStaticCopy(runId, itemId, kept, false, [...(method ? [methodName] : []), ...(staticTemplateMethod("Words") ? [STATIC_TEMPLATE_METHOD] : [])], range && mediaLive() ? { ...item.copy_requirements, primary: true, primaryWords: range } : undefined);
        if (fit.cut.length && budget) {
            const after = getRun(runId);
            if (after) {
                after.log.push({ at: new Date().toISOString(), message: `${itemId}: ${fit.cut.map((t) => cutLine(t)).join(", ")} left off the words over the picture to keep them to ${budget.words <= 0 ? "none, as its buyer's stage asks" : `${budget.words} words in ${budget.lines} line${budget.lines === 1 ? "" : "s"}`}` });
                saveRun(after);
            }
        }
        if (held && !item.plan.text_elements.length) {
            const after = getRun(runId);
            const mine = after?.items.find((i) => i.id === itemId);
            const stands = (r: FigureRow) => (r.was ? true : fit.texts.some((t) => t.text === r.text));
            if (after && mine?.plan && (figures.length || mine.plan.figures?.length)) {
                mine.plan.figures = figures.filter(stands);
                saveRun(after);
            }
        }
    }
}
