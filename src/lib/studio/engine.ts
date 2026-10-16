import { observeStructuredItems, observedItemAllowance } from "./batch-budget";
import { studioAllocation } from "../production-portfolio/store";
import { traced } from "../production-ops/metrics";
import { readCheckpoint, saveCheckpoint, fingerprint as productionFingerprint } from "../production-ops/store";
import { hashMediaFile } from "../production-evidence/media-server";
import { reviewSnapshotBatch } from "./review-batch";
import { adaptiveBatches } from "../production-portfolio/core";
import { studioPortfolioDirective } from "../production-portfolio/runtime";
import { avatarFile, getAvatar } from "../avatars/store";
import { currentOutputs } from "./outputs";
import { BRAND_PRODUCTS_SHOWN, WHOLE_BRAND, brandProducts, isWholeBrand } from "../choices";
import { founderChecks } from "../founder-words";
import { sharedRules, skillFor } from "../skills/card";
import { sellingText } from "../skills/selling";
import { CRAFT_FOR_SET, CRAFT_FOR_WORDS, copyCraftOn, craftText } from "../skills/craft";
import { DEVICES, archetypeOf, conceptBrief, lookBrief, modeOf, ruledOut, worldOf } from "./worlds";
import { REVIEW_AD_RULES, REVIEW_WORDS_RULE, lockedPhrase, reviewFaults } from "./review-ads";
import { OFFER_BANK_RULES, bankChecks, isBank } from "./offer-bank";
import { cutRule, logCuts } from "../formats/claim-log";
import { formatLookReferences, formatLookText } from "./format-look";
import { studioFeedPrompt } from "./feed";
import { assertCompleteCopyRenderApproval, completeCopyAudit, copyAuthorityForBrand, copyDocumentForItem, copyHoldReason, copyRequirementsForItem, invalidateCopyApproval, reviewCompleteCopy } from "./copy-gate";
import { completeCopyFields, completeCopyHash, type CopyAuthority } from "../evaluation/copy-repair";
import { customerVoice } from "../customer-voice";
import { formatLook, formatLookNamed, lookLettering, type LookType } from "../format-media";
import { getSetting } from "../settings";
import { imageQuality } from "../media/chosen";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem, LibraryKind, LibraryRefRow, PlacedLine, StudioItem, StudioItemPlan, StudioOutput, StudioRunRow, StudioText } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { brandLookState, loadBrandLook, lookContext, lookFile, lookFingerprint, lookWarnings, specimenMissing, type BrandLook } from "../brand-look";
import { loadBrandBrain } from "../brands";
import { conflictChecks, conflictNote } from "../claim-conflicts";
import { env } from "../env";
import { lessonBlock, lessonImages, lessonRules, lessonsFor, useFacts } from "../lessons";
import { auditPoints, copyPoints, logFailures } from "../failures";
import { ROLE_LABEL, personById } from "../people";
import { pdpBucket } from "../library/buckets";
import { KIND_INFO, STUDIO_ASPECTS, pdpType, typeJob, typeLabel } from "../library/taxonomy";
import { templateFrame } from "../library/templates";
import { brandPack, onlySections, ownId, withoutSections, type ContextLevel } from "../llm/context";
import { withBrain } from "../brain/brief";
import { brandOwnWords, brandVoiceApart, brandVoiceText, buyerText, type Surface } from "../brand-voice";
import { countedOf } from "../copy/figures";
import { PLACES, dealSeeds, rotated, seedBlock, spentLine } from "../copy/seeds";
import { recentTexts, spentFor, worldFor } from "../copy/spent";
import { PRIMARY_WORDS, headlinesByStageLine, isStoryStage, primaryLengthText, primaryLengthsLine, termsByStageLine, termsRule } from "../copy/stage";
import { lengthFault, type WordLine } from "../copy/word-faults";
import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { checkWords, floorText, leftLine } from "../copy/words-read";
import { contextLevel, modelOf, routeFor } from "../llm/routing";
import { RunStoppedError } from "../llm/run-control";
import { geminiJson } from "../llm/gemini";
import { structuredJson } from "../llm/structured";
import { assetPath, generateImage, imageModel, mediaLive } from "../media/providers";
import { ensureCreativeKit, productImages, type CreativeKit } from "../production/kit";
import { brandWorld } from "../brain/on-camera";
import { productTruthSheet } from "../product-truth";
import { sendsProductPhoto, type ProductInPicture, type ProductPlace } from "../product-in-picture";
import { asksForProduct } from "./ask-product";
import { buyerFrom, buyerSaid, fixedByHand, personMismatch, personOnSheet, recheckPerson } from "./buyer";
import { listPersonas } from "../personas/store";
import { budgetOf, cutLayoutNote, cutLine, disclosureNote, fitItem, mayBeEmpty, wordBudgetLine, wordBudgetRule, wordsOnPicture } from "./word-budget";
import { splitDisclosure } from "../brand-voice";
import { afterMend, figureAsk, figuresOn, heldMaterial, ledWith, notFound, relist, settleQuotes, type FigureRow, type HeldMaterial } from "./figures";
import { againBlock } from "./word-budget";
import { budgetAsk, isOver, isThread } from "./word-budget";
import { ownHand, unawareWords } from "./word-budget";
import { WORD_BUDGET } from "../taste/defaults";
import { LED_MOST, ledLine, quotesOnFile } from "./dealt";
import { renderPrompt } from "../prompts";
import { boundRuntimeContext } from "../standalone/runtime";
import { bindCopyAuthority, writingAuthority, buildEvidencePacket } from "../standalone/evidence";
import { labHandoffForSet, labPlanAgreement, labReferenceAttachments } from "../creative-lab/handoff";
import { phraseRegex } from "../scripts/audit";
import { activeGuardrails } from "../scripts/guardrails";
import { brandVoicePack, voiceCheck } from "../scripts/voice";
import { copyPass } from "../scripts/copy-pass";
import { mustFix } from "./must-fix";
import { voiceRulesText } from "../scripts/voice-rules";
import { placeholderSvg } from "../skills/placeholder";
import { listSkills } from "../skills/registry";
import { copyChecks, feedChecks, judgeWords, languageLine, pictureWordFaults, quoteChecks, quotedIn, researchLines, researchRows, researchText, reviewAds, type CopyText } from "./checks";
import { OWN_MATERIAL_RULE, dealtBlock, handsOfSet, poolsOfSet, saidLine, saidOn, siblingPhrases, spentOnPictures, SAID_MOST, type DealtHand } from "./dealt";
import { capRefs, changeRequest, imageRequest, splitRatios, swapWords, wordChanges } from "./request";
import { AD_REFERENCE_TYPE, adReferencesAsLibrary } from "./ad-refs";
import { makeReel } from "./reel";
import { inspectImage } from "./inspect";
import { faultNotes, unreadQa, type ImageQa } from "./inspect";
import { statesDisclosed } from "./checks";
import { contentsWords, showsContents, strayAmong } from "./photos";
import { seeLines } from "./layout-read";
import { MUST_DIFFER, PICTURE_AXES, buyerId, pictureLine, setChecks } from "./set-checks";
import { productProfile, scoreRef } from "./select";
import { assetAbs, inventory, ownDesigned } from "../sprint/assets";
import { DEAL_RULE, HAND_PARTS, dealHands, deckStart, handLine, ownPlaces, peopleOf, placesOf, showsNoLow, type Hand } from "./deal";
import { faceForPrompt } from "./deal";
import { agesOfSet } from "./buyer";
import { castOver } from "./buyer";
import { DEFAULT_CAST_BRIEF } from "../sprint/cast";
import { MAX_PRODUCT_PHOTOS, VIEW_INFO, atHome, brandImageKind, clearPhotoSheets, dealFrom, leadIndex, opensWithoutPhoto, unitIndex, pickLooks, pickWorld, productFolders, productPhotoSheet, splitBrandImages, type PhotoView } from "./photos";
import { senseCheck, senseLine, type SenseProblem } from "./sense";
import { truthChecks } from "./truth-checks";
import { fidelityOf, followsReference, logoRole, referenceFunction, referenceLine, referencePlanRule, referenceRole as roleOfReference, type Fidelity } from "./reference";
import { recordReferenceUse } from "../references/choose";
import { imageLessons } from "../references/learning-context";
import { LEARNING_RULE, learningAllowed } from "../references/learning";
import { clampVariety } from "../variety";
import { tasteBlock, tasteSkillsUsed } from "../taste/apply";
import { lookToVariety } from "../taste/compat";
import { LENGTH, NO_PRODUCT_WORDS_NOTE, PRODUCT, decide } from "../taste/decisions";
import { PRODUCT_BY_STAGE } from "../taste/defaults";
import { compactTaste } from "../taste/schema";
import { STAGES, type ContextPlan, type ProductStop, type Taste } from "../taste/types";
import { HERO_NOTE, HERO_PICTURES, STRUCTURE_RULE, formsOfKept, heroLine, keptKey, pdpFormFault, pdpFormId, pdpNewRule, placeOfStop, planFor, lookDropsLayout, productFrameRule, productPhotoRoleFor, productSizeLine, productViewRole, stageFor, stageId, structureText, stripColours, surfaceOf, tasteOf, type HeroPicture } from "./taste";
import { AD_FORMS, USUAL_FORM, dealForms, formFault, formId, formLabel, formLine, formNamed, formOfAsset, formRule, formsAllowed, formsUsed, planForm, type AdForm, type FormAd } from "./forms";
import { MAX_TRIES, doItThisWay, mendRoute, oneClause, redrawWhy } from "./mend";
import { writingBrain } from "../claims-through";
import { STATIC_TEMPLATE_METHOD, TEMPLATE_AUTHORITY, staticFeedLines, staticTemplateContract, staticTemplateMethod, staticTemplatePreflight } from "./static-template";
import { claimsOfProduct, offersFor } from "../llm/context";
const stripFrontMatter = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
function skillText(name: string, ...rest: string[]): string {
    const hit = listSkills().find((s) => s.name === name || s.path.split("/").pop() === name);
    if (!hit)
        return "";
    const file = path.join(env.SKILLS_DIR, hit.path, ...(rest.length ? rest : ["SKILL.md"]));
    return fs.existsSync(file) ? stripFrontMatter(fs.readFileSync(file, "utf-8")) : "";
}
function section(md: string, start: RegExp, end: RegExp): string {
    const lines = md.split(/\r?\n/);
    const a = lines.findIndex((l) => start.test(l));
    if (a < 0)
        return "";
    const b = lines.findIndex((l, i) => i > a && end.test(l));
    return lines.slice(a, b < 0 ? undefined : b).join("\n").trim();
}
export function getRun(id: string): StudioRunRow | undefined {
    return db.select().from(schema.studioRuns).where(eq(schema.studioRuns.id, id)).get();
}
export function listRuns(brandId: string, kind?: LibraryKind): StudioRunRow[] {
    const t = schema.studioRuns;
    return db.select().from(t).where(kind ? and(eq(t.brand_id, brandId), eq(t.kind, kind)) : eq(t.brand_id, brandId)).orderBy(desc(t.created_at)).all();
}
function save(run: StudioRunRow, set: Partial<typeof schema.studioRuns.$inferInsert> = {}) {
    db.update(schema.studioRuns)
        .set({ items: run.items, audit: run.audit, log: run.log, context: run.context, status: run.status, error: run.error, updated_at: new Date().toISOString(), ...set })
        .where(eq(schema.studioRuns.id, run.id))
        .run();
}
const note = (run: StudioRunRow, message: string) => run.log.push({ at: new Date().toISOString(), message });
export const saveRun = (run: StudioRunRow) => save(run);
export const refsById = (ids: string[]): Map<string, LibraryRefRow> => new Map([...(ids.length ? db.select().from(schema.libraryRefs).where(inArray(schema.libraryRefs.id, ids)).all() : []), ...adReferencesAsLibrary(ids)].map((r) => [r.id, r]));
export interface NewRun {
    brandId: string;
    kind: LibraryKind;
    productId: string;
    picks: {
        refId?: string | null;
        bucket?: string;
        direction?: string;
        reason?: string;
        fidelity?: Fidelity;
        stage?: string;
        taste?: Taste;
        world?: string;
        mode?: string;
        archetype?: string;
        slot?: number;
        type?: string;
        label?: string;
        photo?: string;
        photoExtras?: string[];
        person?: string;
        avatar?: string;
        form?: string;
    }[];
    aspects?: string[];
    notes?: string;
    title?: string;
    productImages?: string[];
    brandImages?: string[];
    sprint?: string;
    buyers?: string[];
    offer?: string;
    noOffer?: boolean;
    claimChecks?: boolean;
    adReview?: boolean;
    auto?: boolean;
    textOnImage?: boolean;
    feedCopy?: boolean;
    baseImage?: boolean;
    reel?: boolean;
    productInPicture?: ProductInPicture;
    fidelity?: Fidelity;
    variety?: number;
    taste?: Taste;
    stage?: string;
    surface?: string;
    formatLook?: string;
    lookType?: LookType;
}
export const wordsOn = (run: Pick<StudioRunRow, "kind" | "context">) => run.kind !== "photoshoot" && planFor(run).text.pictureWords !== "none";
export const feedCopyOn = (run: Pick<StudioRunRow, "kind" | "context">) => run.kind === "ad" && run.context.feed_copy !== false;
export function picturesFor(run: Pick<StudioRunRow, "kind" | "context" | "aspects">, items: Pick<StudioItem, "plan">[]): number {
    const withBase = run.context.base_image === true && wordsOn(run);
    return items.reduce((n, i) => n + run.aspects.length * (withBase && (!i.plan || i.plan.text_elements.length) ? 2 : 1), 0);
}
type RunOf = Pick<StudioRunRow, "kind" | "context">;
export const stopOf = (run: RunOf, item: StudioItem): ProductStop => planFor(run, item).taste.product;
export const placeOf = (run: RunOf, item: StudioItem): ProductPlace => placeOfStop(stopOf(run, item));
export function heroOf(run: Pick<StudioRunRow, "id" | "kind" | "items">, item: Pick<StudioItem, "id"> & Partial<Pick<StudioItem, "person" | "avatar" | "plan">>): HeroPicture | undefined {
    if (run.kind !== "ad")
        return undefined;
    if (item.plan)
        return HERO_PICTURES.find((h) => h.id === (item.plan as {
            hero?: string;
        }).hero) ?? HERO_PICTURES[0];
    if (item.person || item.avatar)
        return HERO_PICTURES[2];
    const at = Math.max(0, run.items.findIndex((i) => i.id === item.id));
    return HERO_PICTURES[(deckStart(run.id) + at) % HERO_PICTURES.length];
}
export function fidelityOfPlan(plan: ContextPlan, hasRef: boolean): Fidelity | null {
    if (!hasRef)
        return null;
    return plan.attach.referenceImage ? "exact" : plan.text.referenceDescription === "detailed" ? "structure" : "loose";
}
export const fidelityFor = (run: RunOf, item: StudioItem): Fidelity | null => fidelityOfPlan(planFor(run, item), !!item.ref_id);
const sendsReference = (plan: ContextPlan) => plan.attach.referenceImage || plan.text.referenceDescription !== "none";
const lookCount = (plan: ContextPlan) => plan.attach.brandDesignedImages + plan.attach.pastAds;
const lessonFormat = (l: Pick<Loaded, "run" | "script">): string => l.script?.format ?? (l.run.kind === "ad" ? "static_image" : l.run.kind);
export function productPlanRule(run: RunOf): string {
    const first = "This comes before any rule above, and before a reference, that puts the product in the frame; say what you changed in `adaptation`. Where the product is in the picture, `product_spot` says where it sits in the scene, in a few words.";
    const chosen = tasteOf(run).product;
    const rule = (stop: ProductStop) => (stop === "hero" ? HERO_NOTE : productFrameRule(stop));
    if (chosen)
        return `- **The product in the picture.** The person chose this for every ad of the set, whatever its stage. ${rule(chosen)} ${first}`;
    if (stageFor(run))
        return `- **The product in the picture.** ${rule(planFor(run).taste.product)} ${first}`;
    const by = new Map<ProductStop, string[]>();
    for (const s of STAGES)
        by.set(PRODUCT_BY_STAGE[s], [...(by.get(PRODUCT_BY_STAGE[s]) ?? []), s.replace("_", " ")]);
    return `- **The product in the picture** follows the stage you name for the ad. ${[...by].map(([stop, stages]) => `For ${stages.join(" or ")} (${PRODUCT[stop].label.toLowerCase()}): ${rule(stop)}`).join(" ")} A native-format ad: ${productFrameRule("none")} Where the choices for a piece already say where the product is, that is decided, and this table does not apply to it. ${first}`;
}
const NO_WORDS_NOTE = "No words on these images. `text_elements` is an empty list for every image and `layout` says where clean space is left for a designer to set type later. The picture makes the argument alone. The only words in the frame are the ones printed on the product.";
const AD_COPY_RULE = /\n- Also return `ad_copy` for each ad[^\n]*/;
export const claimChecksOn = (run: Pick<StudioRunRow, "context">) => run.context.claim_checks === true;
const CLAIM_RULES = new Set(["forbidden_claims", "guardrails", "number_source", "figure_disagrees", "claims_and_guardrails"]);
const CLAIMS_OFF: AuditItem = { check: "claim_checks", status: "pass", message: "Claim checks are off for this set: it was written freely. Check its facts yourself, or press Check claims." };
const claimRules = (strict: boolean) => fs.readFileSync(path.join(process.cwd(), "prompts", strict ? "studio-rules-strict.md" : "studio-rules-free.md"), "utf-8").trim();
const setProduct = (brand: BrandBrain, productId: string): {
    id: string;
    name: string;
} | undefined => (isWholeBrand(productId) ? { id: WHOLE_BRAND, name: brand.brand.name } : brand.products.find((p) => p.id === productId));
export const wholeBrandNote = (brand: BrandBrain) => `These ads are about the whole brand, not 1 product. The product photos attached are the products that stand for it: ${brandProducts(brand.products).map((p) => p.name).join("; ")}. Each ad shows them together as a range, or 1 of them standing for the brand, or no product, whichever its idea and its reference call for. A fact of 1 product is never said of another: a claim names the product it is true of, or is one the brand makes of itself.`;
export const NO_OFFER_NOTE = "These ads make no offer. No price, no discount, no gift, no deal, no deadline and no guarantee is written, on the picture or beside it, and no ad asks for the sale.";
export function createRun(n: NewRun): string {
    const brand = loadBrandBrain(n.brandId);
    const product = setProduct(brand, n.productId);
    if (!product)
        throw new Error("Pick a product this brand sells.");
    const whole = isWholeBrand(n.productId);
    if (whole && n.kind !== "ad")
        throw new Error("Pick a product: product page images and photoshoots are made for 1 product. Ads can be for the whole brand.");
    if (!n.picks.length)
        throw new Error("Pick at least 1 reference.");
    if (n.picks.length > 12)
        throw new Error("A set holds 12 images at most. Make a second set for more.");
    const info = KIND_INFO[n.kind];
    const aspects = (n.aspects ?? info.defaultAspects).filter((a) => info.aspects.includes(a));
    if (!aspects.length)
        throw new Error("Pick at least 1 size.");
    const refs = refsById(n.picks.map((p) => p.refId).filter((x): x is string => !!x));
    if ([...refs.values()].some(r => r.tags.owner_brand_id && r.tags.owner_brand_id !== n.brandId))
        throw new Error("A selected reference belongs to another brand.");
    const profile = productProfile(n.brandId, brand, null, n.productId);
    const checks = getSetting(n.brandId, "checks");
    const buyers = brand.personas.filter((p) => n.buyers?.includes(p.id));
    const stated = n.offer && !n.noOffer ? brand.offers.find((o) => o.id === n.offer) : undefined;
    const taste = compactTaste(n.taste);
    const noWords = (n.textOnImage === false || taste.words === "none") && n.kind !== "photoshoot";
    const notes = [n.notes ?? "", whole ? wholeBrandNote(brand) : "", n.noOffer ? NO_OFFER_NOTE : "", noWords ? NO_WORDS_NOTE : "", buyers.length ? `Write these for: ${buyers.map((p) => `${p.id} (${p.name})`).join("; ")}.` : "", stated ? `The offer these state, exactly as given: ${stated.id}, "${stated.name}", ${brand.brand.currency} ${stated.price}.${stated.notes ? ` ${stated.notes}` : ""}` : ""].filter(Boolean).join("\n");
    const items: StudioItem[] = n.picks.map((p, i) => {
        const id = `img_${String(i + 1).padStart(2, "0")}`;
        const bucket = n.kind === "pdp" ? pdpBucket(p.bucket) : undefined;
        const ref = p.refId ? refs.get(p.refId) : undefined;
        if (p.refId && (!ref || ref.library !== n.kind))
            throw new Error(`Reference ${p.refId} is not in the ${info.label.toLowerCase()} library.`);
        const extra = { ...(stageId(p.stage) ? { stage: stageId(p.stage)! } : {}), ...(p.taste && Object.keys(compactTaste(p.taste)).length ? { taste: compactTaste(p.taste) } : {}), ...(p.slot ? { slot: p.slot } : {}), ...(p.photo ? { photo: p.photo } : {}), ...(p.photoExtras?.length ? { photo_extras: p.photoExtras.slice(0, 2) } : {}), ...(p.person ? { person: p.person } : {}), ...(p.avatar && getAvatar(n.brandId, p.avatar) ? { avatar: p.avatar } : {}), ...(n.kind === "ad" && formId(p.form) ? { dealt_form: formId(p.form) } : {}) };
        const direction = (p.direction ?? "").trim();
        if (p.world) {
            const w = worldOf(p.world);
            if (!w || n.kind !== "ad")
                throw new Error("Pick a visual world for every concept ad.");
            const kindOfAd = archetypeOf(p.archetype);
            return { id, ref_id: null, type: "conceptual-and-scale", label: p.label || (kindOfAd ? `${kindOfAd.label} · ${w.label}` : w.label), reason: p.reason || (kindOfAd ? `${kindOfAd.label}: 1 kind of proof or offer in 1 visual world, with no layout to follow` : "A concept ad: built from 1 idea in 1 visual world, with no layout to follow"), direction, status: "chosen", outputs: [], world: w.id, mode: modeOf(p.mode)?.id ?? kindOfAd?.mode ?? w.modes[0], ...(kindOfAd ? { archetype: kindOfAd.id } : {}), ...extra };
        }
        if (!ref && !bucket && p.slot && p.type)
            return { id, ref_id: null, type: p.type, label: p.label || typeLabel(n.kind, p.type), reason: "No library example of this layout: built from the format and the brand look", direction, status: "chosen", outputs: [], ...extra };
        if (!ref && !bucket)
            throw new Error("Every image needs a reference from the library.");
        if (!ref)
            return { id, ref_id: null, type: bucket!.type, bucket: bucket!.id, label: bucket!.title, reason: "Built from the template frame, with no library reference", direction, status: "chosen", outputs: [], ...extra };
        return { id, ref_id: ref.id, type: ref.type, ...(p.fidelity ? { fidelity: fidelityOf(p.fidelity) } : {}), ...(bucket ? { bucket: bucket.id } : {}), label: bucket ? bucket.title : p.label || typeLabel(n.kind, ref.type), reason: p.reason || scoreRef(ref, profile).reason, direction, status: "chosen", outputs: [], ...extra };
    });
    const lookId = n.kind !== "ad" || n.formatLook === "none" || n.sprint ? null : (formatLook(n.formatLook)?.id ?? formatLookNamed(`${n.notes ?? ""} ${n.picks.map((p) => p.direction ?? "").join(" ")}`));
    const brandImages = n.brandImages && n.kind !== "photoshoot" ? splitBrandImages(n.brandId, n.brandImages) : null;
    const all = db.select({ id: schema.studioRuns.id }).from(schema.studioRuns).all();
    const id = `set_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    db.insert(schema.studioRuns)
        .values({
        id,
        brand_id: n.brandId,
        kind: n.kind,
        product_id: n.productId,
        title: (n.title || `${product.name}: ${info.noun}`).slice(0, 120),
        notes: notes.slice(0, 2000),
        aspects,
        status: "draft",
        items,
        audit: [],
        log: [{ at: new Date().toISOString(), message: `Set created with ${items.length} reference${items.length === 1 ? "" : "s"}` }],
        context: { skills: [], fields: [], models: {}, ...(n.productImages?.length ? { product_images: n.productImages.slice(0, 4) } : {}), ...(brandImages ? { brand_refs: brandImages.looks, world_refs: brandImages.world } : {}), ...(n.sprint ? { sprint: n.sprint } : {}), claim_checks: n.claimChecks ?? checks.claims, ad_review: n.adReview ?? checks.ad_review, sources: n.claimChecks ?? checks.claims, ...(n.auto ? { auto: true } : {}), ...(noWords ? { text_on_image: false } : {}), ...(n.noOffer ? { no_offer: true } : {}), ...(n.feedCopy === false ? { feed_copy: false } : {}), ...(n.baseImage && !noWords && n.kind !== "photoshoot" ? { base_image: true } : {}), ...(n.reel ? { reel: true } : {}), ...(n.kind === "ad" && n.productInPicture && n.productInPicture !== "auto" ? { product_in_picture: n.productInPicture } : {}), ...(n.variety != null && n.kind !== "photoshoot" ? { variety: clampVariety(n.variety) } : {}), ...(n.fidelity && n.kind !== "photoshoot" ? { fidelity: fidelityOf(n.fidelity) } : {}), ...(Object.keys(taste).length ? { taste } : {}), ...(stageId(n.stage) && n.kind === "ad" ? { stage: stageId(n.stage)! } : {}), ...(n.surface ? { surface: n.surface } : {}), ...(lookId ? { format_look: lookId } : {}), ...(lookId && lookLettering(lookId) ? { look_type: n.lookType === "look" ? "look" as const : "brand" as const } : {}) },
    })
        .run();
    return id;
}
export function deleteRun(id: string) {
    db.delete(schema.studioRuns).where(eq(schema.studioRuns.id, id)).run();
    try {
        fs.rmSync(path.join(env.DATA_DIR, "assets", id), { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
    }
    catch {
    }
}
function brandContext(brandId: string, brand: BrandBrain, kit: CreativeKit) {
    const claims = brand.claims.filter((c) => c.status === "substantiated").map((c) => ({ id: c.id, text: c.text, source: c.source }));
    const rules = activeGuardrails(brandId).filter((g) => g.guardrail.applies).map((g) => splitDisclosure(g.guardrail.rule).rule).filter(Boolean);
    return {
        brand: brand.brand,
        language: languageLine(brand),
        market_sophistication_stage: brand.market_sophistication_stage,
        offers: brand.offers,
        guarantee: brand.guarantee,
        approved_claims: claims,
        forbidden_claims: brand.forbidden_claims,
        proof_assets: brand.proof_assets,
        voice: brand.voice,
        guardrails: rules,
        personas: brand.personas.map((p) => ({ id: p.id, name: p.name, summary: p.summary, problem: p.problem, language: p.language })),
        imagery_style: kit.visual.imagery_style,
        visual_do: kit.visual.do,
        visual_avoid: kit.visual.avoid,
    };
}
export const disclosuresOf = (brandId: string): string[] => [...new Set(activeGuardrails(brandId).filter((g) => g.guardrail.applies).flatMap((g) => splitDisclosure(g.guardrail.rule).disclosures))];
function productGuide(brand: BrandBrain, kit: CreativeKit, productId: string) {
    if (isWholeBrand(productId)) {
        const range = brandProducts(brand.products).map((p) => ({ p, g: kit.products.find((k) => k.product_id === p.id) }));
        const said = (pick: (g: NonNullable<(typeof range)[number]["g"]>) => string) => range.map(({ p, g }) => (g && pick(g) ? `${p.name}: ${pick(g)}` : "")).filter(Boolean).join(" ");
        return { id: WHOLE_BRAND, name: brand.brand.name, format: `The whole brand, not 1 product. It sells: ${brand.products.map((p) => p.name).join("; ")}`, ingredients: [], specs: [], variants: [], packaging: said((g) => g.packaging), details: said((g) => g.details), handling: range[0]?.g?.handling ?? "display", handling_notes: "" };
    }
    const product = brand.products.find((p) => p.id === productId);
    if (!product)
        throw new Error("This set's product is no longer in the brand brain. Add it back, or make a new set.");
    const guide = kit.products.find((p) => p.product_id === productId);
    return { id: product.id, name: product.name, format: product.format, ingredients: product.ingredients ?? [], specs: product.specs ?? [], variants: product.variants ?? [], packaging: guide?.packaging ?? "", details: guide?.details ?? "", handling: guide?.handling ?? "display", handling_notes: guide?.handling_notes ?? "" };
}
const SHOWS_USE = /\b(hands?|hold\w*|held|grip\w*|fingers?|palm|open\w*|tear\w*|torn|rip\w*|pour\w*|tip\w*|person|woman|man|model|child|kid)\b/i;
const HOOK_RULE = "- The hook starts from this ad's own dealt lines or its buyer's moment. A number leads only where the number is the argument.";
const HANDLING_FOR_PICTURE = "For the picture only (how it is opened and used; the words need not describe it):";
const KIND_RULES: Record<LibraryKind, string> = {
    pdp: `## Rules for product-page images

- Each image answers 1 question a shopper has on the product page. 2 images in a set never answer the same question.
- The hero is never a bare packshot: it carries a headline claim, or 2 to 4 ticked benefits, or a badge the brand has earned.
- Text is short enough to read on a phone at 390 pixels wide: a headline of 3 to 8 words, at most 4 points of 6 words or fewer, about 30 words on the whole image. A facts or ingredients panel may run to 45.
- Certifications, press and expert names appear only if they are in the brand's claims or proof assets.
- A review image quotes 1 customer from the research word for word. If the research has no usable quote, write the quote as "[REAL REVIEW NEEDED]".
- Scale in hand: describe size against the hand ("fits in a closed palm"), never in units.
- Write for both ratios: say in \`layout\` what moves between 1:1 and 4:5.
- **The template.** An item with a template frame fills 1 of the frames of a product page. Its wireframe (attached) gives the job and the structure: what sits where, how many points, what kind of proof. It is a guide, never a drawing to copy. Keep the job. Change the number of points, the split of the frame and the content to what this product can truthfully fill ("How it bends" says how). Grey boxes on the wireframe are photographs for you to plan; its placeholder words are text for you to write.
- Where an item has both a wireframe and a library reference, the wireframe sets the job and the structure, and the reference shows how a real brand dressed that frame: its light, its styling, how its type sits. Where they disagree on structure, follow the wireframe. An item marked EXACT or STRUCTURE is the other way round: its template frame gives only the job (the question to answer), and the reference gives the structure.
- If the brand cannot fill a frame truthfully even after bending it, say so in \`adaptation\` and plan the nearest honest image that does the same job for the shopper.`,
    photoshoot: `## Rules for photoshoot frames

- These are photographs. \`text_elements\` is always an empty list and \`layout\` is an empty string. The only words in the frame are the ones printed on the product.
- Rebuild the reference's composition, camera and light on this product. Adjust the composition to this product's real proportions; do not force the product into a shape it does not have.
- If the reference shows more pieces than this product has, repeat the real product or simplify the frame. Never invent a second product.
- Where the reference's palette fights the brand's, the brand wins. Say so in \`adaptation\`.
- People are fictional adults, cast differently from anyone in the reference, described neutrally. Hands hold the product the way it is really used.
- No frame in the set repeats another's composition.
- \`argument\` says what the frame is for (a hero for the top of the page, a texture detail, a moment of use).`,
    ad: `## Rules for static ads

- 1 ad, 1 job. Each ad makes 1 argument to 1 kind of buyer. Name the buyer (\`buyer\`: a persona id from the brand context) and where they are in the decision (\`awareness\`: unaware, problem_aware, solution_aware, product_aware or most_aware) before you write a word, and write to that. Across a set, vary both: do not write every ad for the same buyer at the same stage unless the user's notes say to.
- Fit the ad to the stage. Unaware and problem aware: lead with the buyer's situation in their own words; the product arrives as the answer, and the price and offer stay out of the headline. Solution and product aware: lead with what makes this product different, with proof. Most aware: lead with the offer and a reason to act now.
- \`market_sophistication_stage\` says how many promises like this the buyer has already heard. At 3 or above a bare promise is not enough: the ad needs the mechanism or a new angle on it.
- Every claim passes "so what?": tie a feature to what the buyer feels or stops doing. A feature alone fails ("6g of fibre", "5-ply steel"); what it changes in their day passes.
- The headline, the picture, the points, the feed copy and the button all make the same 1 argument. A second argument is a second ad.
${HOOK_RULE}
${OWN_MATERIAL_RULE}
${wordBudgetRule()}
- A native-format ad (a note, a message, a post) carries no logo and no brand colours; that is the point of the format. It must not imitate a real platform, outlet or person.
- An offer ad states the offer exactly as the brand's \`offers\` give it.
- Also return \`ad_copy\` for each ad, written for the feed: primary text in the brand voice, a headline of 40 characters or fewer, a description and a call to action.`,
};
const SCRIPT_AD_RULES = `## Rules for a static ad cut from a script

- The ad makes the script's 1 argument, to the buyer and the stage the notes name. A second argument is a second ad.
- The picture is the moment of the script a stranger would stop on, as a still. The words on it are the script's own lines, picked or shortened.
${wordBudgetRule()}
- A native-format ad (a note, a message, a post) carries no logo and no brand colours. It must not imitate a real platform, outlet or person.
- An offer is stated as the script states it, with its conditions, once.`;
const WORDS_RULES_AD = `## Rules for the words of static ads

- The plan decided each ad's buyer, stage, picture and slots. Write to that buyer at that stage; do not re-plan the ad.
${OWN_MATERIAL_RULE}
- Fit the words to the stage. Unaware and problem aware: the buyer's situation in their own words; the price and the offer stay out of the headline. Solution and product aware: what makes this product different, with proof. Most aware: the offer and a reason to act now.
- Every claim passes "so what?": a feature alone fails ("6g of fibre"); what it changes in the buyer's day passes.
- The headline, the points, the feed copy and the button all make the same 1 argument. A second argument is a second ad.
- An offer ad states the offer exactly as \`offers\` gives it, with its conditions.
- Few words on the picture. Each item gives the most words its picture may carry. That is a ceiling, not a target: most good ads sit well under it, and 1 line is a complete ad. A caption, a point, a badge, a subhead or a label that adds nothing to the 1 idea is returned as an empty text, and is left off the picture.`;
const SCRIPT_WORDS_RULE = `- The source is the approved script in the notes: its on-screen lines, its hooks and its headlines. Write the words on the picture from them with the craft below: tighter, sharper, in the buyer's words. No fact, figure, claim or offer term the script does not state.`;
const AD_COPY_FIELD = `- \`buyer\`: the persona id this ad is written for.
- \`awareness\`: unaware, problem_aware, solution_aware, product_aware or most_aware.
- \`ad_copy\`: \`{ "primary_text", "headline", "headlines", "description", "cta" }\`: the copy that runs with the image in the feed. \`primary_text\` is as long as the ad's stage asks: ${primaryLengthsLine()}. For an unaware or a problem aware ad the full text is written in a later step of its own, so give its first 2 or 3 sentences here and no more. It is whole sentences a person would say, never a row of fragments, a list of counts or a run of "no this, no that"; the brand's own ad copy, shown under "How the brand writes ad primary text", shows the tone, the words, the emoji and how it opens and closes, never how long this one runs. Its first sentence is 125 characters or fewer and earns the tap on "See more" without repeating the image headline. \`headline\` is 40 characters or fewer: a plain sentence or a phrase a person would say that gives this buyer a reason to look, never a label, a count or a clever turn. \`headlines\` is 3 more of the same, each a different reason and not the same one reworded. \`description\` is 30 characters or fewer of extra detail, or empty; it is not shown in every placement, so it is never the only place the price, the guarantee or an offer term appears. \`cta\` is 1 of: Shop now, Learn more, Get offer, Order now, Sign up. Same facts and sources as the image.`;
export function kindSkill(kind: LibraryKind, types: string[], level: ContextLevel = "focused", concept = false, fromScript = false): {
    text: string;
    used: string[];
} {
    if (kind === "pdp") {
        const laws = skillText("pdp-image-factory", "references", "02-gallery-laws.md");
        const lib = skillText("pdp-image-factory", "references", "03-type-library.md");
        const entries = types.map((t) => section(lib, new RegExp(`^###\\s+(★\\s*)?${t}\\s*$`), /^(###|##|---)\s*/)).filter(Boolean);
        const cats = section(lib, /^## Category adaptations/, /^## Known gaps/);
        return { text: [laws, "# The types in this set", ...entries, cats].filter(Boolean).join("\n\n") || "(pdp-image-factory skill not installed)", used: ["pdp-image-factory"] };
    }
    if (kind === "photoshoot") {
        const plan = skillText("photoshoot-factory", "references", "04-study-and-plan.md");
        const gen = skillText("photoshoot-factory", "references", "05-generate.md");
        const truth = section(skillText("flash-photography"), /product truth sheet/i, /^##\s/);
        return { text: [section(plan, /^## Step 3/, /^## Step 4/) || plan.slice(0, 5000), section(gen, /^## The method/, /^## Settings that worked/), truth].filter(Boolean).join("\n\n") || "(photoshoot-factory skill not installed)", used: ["photoshoot-factory", ...(truth ? ["flash-photography"] : [])] };
    }
    const compact = level !== "full" ? skillFor("operator-creative/static-plan", level) : "";
    if (compact) {
        const idea = concept && !fromScript ? skillFor("operator-creative/concept", level) : "";
        return {
            text: [compact, idea, fromScript ? "The approved script fixes the buyer, argument, facts and words. Adapt only its visual execution; do not discover a new argument or add a proof or offer." : ""].filter(Boolean).join("\n\n"),
            used: ["operator-creative/static-plan", ...(idea ? ["operator-creative/concept"] : [])],
        };
    }
    let copy = skillText("image-ad-copy");
    let patterns = skillText("image-ad-copy", "references", "winning-ad-patterns.md");
    let playbook = skillText("image-ad-copy", "references", "performance-playbook.md");
    if (level !== "full") {
        copy = withoutSections(copy, /^(Reference files|Match effort to the ask|What this skill produces|Inputs|Carousels|Variants|Output format|Ad \[n\]|Worked example)/i);
        patterns = withoutSections(patterns, /^What this is and how to use it/i);
        playbook = withoutSections(playbook, /^(2\. Read the numbers|4\. Writing prompts)/i);
    }
    if (level === "minimal") {
        copy = onlySections(copy, /^(How image ads differ|Non-negotiable rules|Workflow)/i);
        playbook = onlySections(playbook, /^3\. What Meta/i);
        patterns = onlySections(patterns, /^(Layout archetypes|Patterns by awareness stage|Do not transfer)/i);
    }
    if (fromScript) {
        copy = onlySections(copy, /^(How image ads differ|Non-negotiable rules)/i);
        patterns = onlySections(patterns, /^(Layout archetypes|Do not transfer)/i);
    }
    const card = concept ? skillFor("tof-statics/tof-statics", "focused") : "";
    return { text: [copy, playbook && `# Performance playbook\n${playbook}`, patterns && `# Winning ad patterns\n${patterns}`, card].filter(Boolean).join("\n\n") || "(image-ad-copy skill not installed)", used: ["image-ad-copy", "static-ad-factory", ...(card ? ["tof-statics"] : [])] };
}
export function studioWordsSkill(kind: LibraryKind, level: ContextLevel): {
    text: string;
    used: string[];
} {
    if (!copyCraftOn())
        return { text: "", used: [] };
    const compact = kind === "ad" && level !== "full" ? skillFor("operator-creative/static-copy", level) : "";
    if (compact)
        return { text: compact, used: ["operator-creative/static-copy"] };
    const text = craftText(CRAFT_FOR_WORDS[kind] ?? []);
    return { text, used: text ? ["copy-craft"] : [] };
}
export function studioPromptSkill(kind: LibraryKind, level: ContextLevel): {
    text: string;
    used: string[];
} {
    const folder = kind === "ad" ? "operator-creative/image-prompt" : "image-prompt-craft";
    const compact = level !== "full" ? skillFor(folder, level) : "";
    if (compact)
        return { text: compact, used: [folder] };
    return { text: `${skillText("image-prompt-craft")}${sharedRules()}` || "(image-prompt-craft skill not installed)", used: ["image-prompt-craft", "production-principles"] };
}
const MORE_COPY = { primary_text_medium: z.string().optional(), primary_text_long: z.string().optional(), headlines: z.array(z.string()).max(4).optional() };
type CopyOut = {
    primary_text: string;
    headline: string;
    description: string;
    cta: string;
    primary_text_medium?: string;
    primary_text_long?: string;
    headlines?: string[];
};
function adCopyOf(o: CopyOut): NonNullable<StudioItemPlan["ad_copy"]> {
    const more = o.primary_text_medium || o.primary_text_long || o.headlines?.length ? { medium: o.primary_text_medium ?? "", long: o.primary_text_long ?? "", headlines: (o.headlines ?? []).map((h) => h.trim()).filter((h) => h && h !== o.headline.trim()).slice(0, 3) } : null;
    return { primary_text: o.primary_text, headline: o.headline, description: o.description, cta: o.cta, ...(more ? { more } : {}) };
}
const SCRIPT_COPY_FIELD = "\n- This ad is made from a script, and its plan shows the feed copy at 3 lengths. `ad_copy` also carries `primary_text_medium` and `primary_text_long`: the same claim and the same offer as `primary_text`, each longer than the one before, and longer only by what this buyer still needs to hear (never padding, never a second argument).";
const TextOut = z.object({ role: z.string().default("text"), text: z.string().min(1), placement: z.string().default(""), source: z.string().default("") });
const without = <T extends Record<string, unknown>>(o: T, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const ItemOut = z.object({
    id: z.string(),
    title: z.string(),
    argument: z.string(),
    scene: z.string().min(10),
    layout: z.string().default(""),
    text_elements: z.array(TextOut).max(16).default([]),
    adaptation: z.string().default(""),
    watch_outs: z.array(z.string()).max(6).default([]),
    alt_text: z.string().default(""),
    expression: z.string().default(""),
    words_budget: z.union([z.number(), z.string()]).nullish(),
    reference_read: z.string().default(""),
    reference_structure: z.object({ zones: z.array(z.object({ where: z.string().default(""), share: z.string().default(""), holds: z.string().default(""), size: z.string().default("") })).max(12).default([]), camera: z.string().default(""), light: z.string().default(""), type: z.string().default("") }).nullish(),
    product_spot: z.string().default(""),
    logo: z.string().default(""),
    forms_used: z.array(z.string()).max(10).default([]),
    form: z.string().default(""),
    picture: z.object({ setting: z.string().default(""), light: z.string().default(""), camera: z.string().default("") }).nullish(),
    buyer: z.string().optional(),
    awareness: z.string().optional(),
    ad_copy: z.object({ primary_text: z.string(), headline: z.string(), description: z.string().default(""), cta: z.string().default(""), ...MORE_COPY }).optional(),
});
const PlanOut = z.preprocess((v) => (Array.isArray(v) ? { items: v } : v), z.object({ items: z.array(ItemOut).min(1) }));
const WordsOut = z.preprocess((v) => (Array.isArray(v) ? { items: v } : v), z.object({ items: z.array(z.object({ id: z.string(), argument: z.string().default(""), texts: z.array(z.object({ text: z.string().default(""), source: z.string().default("") })).max(16).default([]), ad_copy: z.object({ primary_text: z.string().min(1), headline: z.string().min(1), description: z.string().default(""), cta: z.string().default(""), ...MORE_COPY }).optional() })).min(1) }));
const ROLE_ROOM: [
    RegExp,
    number
][] = [[/quote|review|testimonial/i, 150]];
export const slotRoom = (draft: string, role = "") => Math.max(Math.ceil(draft.length * 1.2), draft.length + 6, ROLE_ROOM.find(([r]) => r.test(role))?.[1] ?? 0);
const slotHolds = (draft: string, text: string, role = "") => text.length <= Math.max(Math.ceil(slotRoom(draft, role) * 1.15), draft.length + 12);
const asStage = (s: string | null | undefined): AwarenessStage | null => ((AWARENESS_STAGES as readonly string[]).includes(s ?? "") ? (s as AwarenessStage) : null);
const PLACEHOLDER = /\[[^\]]+\]/;
export function applyWords(plan: StudioItemPlan, o: z.infer<typeof WordsOut>["items"][number], strict = false): boolean {
    const slots = plan.text_elements;
    if (o.texts.length !== slots.length)
        return false;
    const left = (s: StudioText, i: number) => !PLACEHOLDER.test(s.text) && !o.texts[i].text.trim() && mayBeEmpty(s.role);
    if (slots.some((s, i) => !PLACEHOLDER.test(s.text) && !left(s, i) && (!o.texts[i].text.trim() || !slotHolds(s.text, o.texts[i].text.trim(), s.role))))
        return false;
    const empty = slots.filter(left);
    if (empty.length)
        Object.assign(plan, { words_cut: [...(plan.words_cut ?? []), ...empty.map((s) => cutLine(s, "left empty by the writer of the words"))], layout: `${plan.layout}${cutLayoutNote(empty)}`.trim() });
    plan.text_elements = cleanTexts(slots.map((s, i) => (PLACEHOLDER.test(s.text) ? s : { ...s, text: o.texts[i].text, ...(strict ? { source: o.texts[i].source } : {}) })));
    if (o.argument.trim())
        plan.argument = o.argument.trim();
    if (plan.ad_copy && o.ad_copy)
        plan.ad_copy = { ...plan.ad_copy, ...adCopyOf({ ...o.ad_copy, cta: o.ad_copy.cta || plan.ad_copy.cta }) };
    return true;
}
const PromptsOut = z.object({ prompts: z.array(z.object({ id: z.string(), prompt: z.string().min(40), ratio_notes: z.record(z.string(), z.string()).default({}), lessons: z.array(z.string()).default([]) })).min(1) });
const refFile = (ref: LibraryRefRow) => (path.isAbsolute(ref.file) ? ref.file : path.join(env.SKILLS_DIR, ref.file));
function refBrief(kind: LibraryKind, item: StudioItem, refGiven: LibraryRefRow | undefined, images: {
    frame?: number;
    ref?: number;
}, script: string[] | undefined, plan: ContextPlan, inLook = false): string {
    const drop = !!refGiven && !sendsReference(plan);
    const ref = drop ? undefined : refGiven;
    const fidelity = drop ? null : fidelityOfPlan(plan, !!refGiven);
    const a = ref?.analysis;
    const isNew = plan.taste.look === "new";
    const ownForm = kind === "ad" && isNew && !item.world && !script;
    const b = kind === "pdp" ? pdpBucket(item.bucket) : undefined;
    const freeFrame = !!b && isNew;
    const stage = stageId(item.stage);
    const forStage = kind === "ad" && stage ? `This ad is for a ${stage.replace("_", " ")} buyer: \`awareness\` is "${stage}".` : "";
    const follows = !!images.ref && !!fidelity && followsReference(fidelity);
    const functionOnly = !!ref && plan.text.referenceDescription === "function";
    const structure = !!ref && plan.text.referenceDescription === "detailed";
    if (functionOnly)
        return [
            `### ${item.id}: ${item.label} (${[images.frame ? `its template wireframe is image ${images.frame}` : "", "its reference is not attached: only its function is given"].filter(Boolean).join("; ")})`,
            b ? `Template frame ${b.n}: "${b.title}". It answers: ${b.question}` : "",
            b ? `Wireframe structure: ${b.layout}` : "",
            b ? `What it needs from the brand: ${b.needs}` : "",
            b ? `How it bends: ${b.flex}` : "",
            forStage,
            referencePlanRule("loose", kind),
            `Reference, its function: ${referenceFunction(a?.format, typeLabel(kind, item.type) || item.label)}.`,
            ...(script ?? []),
            kind === "pdp" && !b && pdpType(item.type) ? `What it needs from the brand: ${pdpType(item.type)!.needs}` : "",
            `The user's direction: ${item.direction || "(none)"}`,
        ]
            .filter(Boolean)
            .join("\n");
    const lines = [
        `### ${item.id}: ${ownForm ? "Static ad" : item.label} (${[images.frame ? `its template wireframe is image ${images.frame}` : "", images.ref ? `its library reference is image ${images.ref}` : item.world ? "a concept ad: no reference" : script ? "cut from an approved script: no layout to follow" : inLook ? "made in the format of this set: no layout to follow, and its type says only what the ad argues" : "no library reference: build it from the wireframe and the brand look"].filter(Boolean).join("; ")})`,
        b ? `Template frame ${b.n}: "${b.title}". It answers: ${b.question}` : "",
        b && !follows && !freeFrame ? `Wireframe structure: ${b.layout}` : "",
        b ? `What it needs from the brand: ${b.needs}` : "",
        b && !follows && !freeFrame ? `How it bends: ${b.flex}` : "",
        freeFrame && !follows ? pdpNewRule(b!.layout) : "",
        forStage,
        images.ref && fidelity ? (structure ? STRUCTURE_RULE : referencePlanRule(fidelity, kind, images.ref)) : "",
        ...(script ?? []),
        ...(item.world ? (item.slot ? lookBrief(item.world) : conceptBrief(item.world, item.mode, item.archetype)) : script && !ref ? [] : ownForm ? ["Job: 1 ad for this product, to the user's direction and the notes. No type of layout is given: the form is yours to choose, as the rule on the form says."] : drop && item.type === AD_REFERENCE_TYPE ? ["Job: 1 ad for this product, to the user's direction and the notes. No reference is given."] : item.type === AD_REFERENCE_TYPE ? ["The person picked this exact ad as the reference. Build on what makes it work: its structure, its reading order, its visual device and the job each piece of text does. The words, the product, the people and the brand are this brand's own."] : [`Job of this type: ${typeJob(kind, item.type)}`]),
        item.world ? `Devices to choose from: ${DEVICES.join("; ")}.` : "",
        kind === "pdp" && !b && pdpType(item.type) ? `What it needs from the brand: ${pdpType(item.type)!.needs}` : "",
        !structure && a?.format ? `Reference format: ${a.format}` : "",
        structure ? "" : a?.why_it_works ? `Why the reference works: ${a.why_it_works}` : ref?.note ? `Curator's note: ${ref.note}` : "",
        !structure && a?.layout ? `Reference layout: ${a.layout.slice(0, 900)}` : "",
        a?.text_roles?.length ? `Text on the reference (roles only; the words are not yours to use): ${a.text_roles.map((t) => `${t.role} at ${structure ? stripColours(t.placement) : t.placement}`).join("; ")}` : "",
        !structure && a?.type_notes ? `How the reference sets its type: ${a.type_notes.slice(0, 500)}` : "",
        !structure && a?.needs?.length ? `To build it truthfully a brand needs: ${a.needs.join("; ")}` : "",
        !structure && a?.rebuild_prompt ? `Recipe for the photograph: ${a.rebuild_prompt.slice(0, 900)}` : "",
        a?.light_setup ? `Light: ${structure ? stripColours(a.light_setup) : a.light_setup}` : "",
        a?.camera ? `Camera: ${structure ? stripColours(a.camera) : a.camera}` : "",
        kind === "photoshoot" && a?.set_build ? `Set construction: ${a.set_build.slice(0, 700)}` : "",
        kind === "photoshoot" && a?.styling_notes ? `Styling: ${a.styling_notes.slice(0, 700)}` : "",
        !structure && a?.watch_outs?.length ? `Watch out for: ${a.watch_outs.join("; ")}` : "",
        `The user's direction: ${item.direction || "(none: rebuild it for this product)"}`,
    ];
    return lines.filter(Boolean).join("\n");
}
function mockPlan(kind: LibraryKind, item: StudioItem, productName: string): StudioItemPlan {
    const text: StudioText[] = kind === "photoshoot" ? [] : [{ role: "headline", text: `${item.label}: ${productName}`.slice(0, 60), placement: "top", source: "" }];
    return { title: item.label, argument: typeJob(kind, item.type), scene: `Mock plan (no model was called): ${productName} rebuilt from the chosen ${item.label.toLowerCase()} reference.`, layout: text.length ? "Headline across the top, product centred." : "", text_elements: text, prompt: `Placeholder prompt for ${item.label} (mock mode).`, adaptation: "Mock mode: placeholder plan.", watch_outs: [], alt_text: `${productName}, ${item.label.toLowerCase()}` };
}
export const WORDS_CUT = "words_cut";
export const DISCLOSURE = "disclosure";
export const TYPEFACE_LIMIT = "typeface_limit";
export function typefaceFinding(run: Pick<StudioRunRow, "items">): AuditItem | null {
    const off = run.items.filter((i) => currentOutputs(i.outputs).some((o) => (o.qa as ImageQa | undefined)?.typeface)).length;
    return off ? { check: TYPEFACE_LIMIT, status: "pass", message: `On ${off} picture${off === 1 ? "" : "s"} of this set the added type is not in the brand's typefaces. The picture model does not set a typeface exactly: a known limit of it, said once here and not on each picture. For exact type, set the words as type in the words editor.` } : null;
}
function sayTypefaceOnce(run: Pick<StudioRunRow, "items" | "audit">): void {
    const said = typefaceFinding(run);
    run.audit = [...run.audit.filter((a) => a.check !== TYPEFACE_LIMIT), ...(said ? [said] : [])];
}
export const PERSON_NOTE = "person_fits_buyer";
export function cleanTexts(texts: StudioText[]): StudioText[] {
    return texts
        .filter((t) => !(t.source === "label" && /\b(pouch|pack|product|label|bottle|sachet|jar|tub|box|can)\b/i.test(t.placement)))
        .map((t) => ({ ...t, text: t.text.replace(/\s*\n\s*/g, " ").trim() }))
        .filter((t) => t.text);
}
function lookChecks(run: Pick<StudioRunRow, "kind" | "items" | "brand_id"> & Partial<Pick<StudioRunRow, "context">>): AuditItem[] {
    if (run.context && planFor({ kind: run.kind, context: run.context }).text.brandLook === "none")
        return [];
    const words = run.kind !== "photoshoot" && run.items.some((i) => !!i.plan?.text_elements.length);
    return lookWarnings(run.brand_id, { words }).map((message): AuditItem => ({ check: "brand_look", status: "warn", message }));
}
export function auditRun(run: Pick<StudioRunRow, "kind" | "items" | "brand_id"> & Partial<Pick<StudioRunRow, "context">>, brand: BrandBrain): AuditItem[] {
    const all = [...ruleAudit(run, brand).filter((a) => a.check !== "number_source" || run.context?.sources !== false), ...lookChecks(run)];
    return !run.context || claimChecksOn({ context: run.context }) ? all : [...all.filter((a) => !CLAIM_RULES.has(a.check)), CLAIMS_OFF];
}
function ruleAudit(run: Pick<StudioRunRow, "kind" | "items" | "brand_id">, brand: BrandBrain): AuditItem[] {
    const out: AuditItem[] = [];
    const guard = activeGuardrails(run.brand_id);
    for (const [i, item] of run.items.entries()) {
        const p = item.plan;
        if (!p)
            continue;
        const n = i + 1;
        const texts = [...p.text_elements.map((t) => ({ text: t.text, where: `image ${n} ${t.role}`, source: t.source ?? "" })), ...(p.ad_copy ? [{ text: `${p.ad_copy.primary_text} ${p.ad_copy.headline} ${p.ad_copy.description}`, where: `image ${n} ad copy`, source: "copy" }] : [])];
        if (run.kind === "photoshoot" && p.text_elements.length)
            out.push({ check: "photoshoot_text", status: "fail", message: `Image ${n} is a photograph but its plan has text on it.`, line_index: i });
        out.push(...founderChecks(run.brand_id, item, i));
        for (const t of texts) {
            for (const phrase of brand.forbidden_claims)
                if (phraseRegex(phrase).test(t.text))
                    out.push({ check: "forbidden_claims", status: "fail", message: `Forbidden claim "${phrase}" in ${t.where}.`, line_index: i });
            for (const g of guard)
                for (const phrase of g.guardrail.banned)
                    if (phraseRegex(phrase).test(t.text))
                        out.push({ check: "guardrails", status: "fail", message: `"${phrase}" in ${t.where} breaks the guardrail from "${g.label}".`, line_index: i });
        }
        const copy: CopyText[] = [...p.text_elements.map((t): CopyText => ({ text: t.text, where: `image ${n} ${t.role}`, surface: "image", index: i })), ...(p.ad_copy ? [{ text: p.ad_copy.primary_text, where: `image ${n} primary text`, surface: "feed" as const, index: i }, { text: `${p.ad_copy.headline}. ${p.ad_copy.description}`, where: `image ${n} ad headline`, surface: "feed" as const, index: i }] : [])];
        out.push(...copyChecks(copy, getSetting(run.brand_id, "voice"), brandOwnWords(run.brand_id)), ...quoteChecks(run.brand_id, copy), ...conflictChecks(run.brand_id, copy));
        if (p.ad_copy)
            out.push(...feedChecks({ primary: [{ text: p.ad_copy.primary_text, where: "primary text" }], headlines: [p.ad_copy.headline], description: p.ad_copy.description, cta: p.ad_copy.cta }, i));
        out.push(...truthChecks(run.brand_id, brand, item, i, (run as {
            notes?: string;
        }).notes ?? ""));
        for (const f of pictureWordFaults(p.text_elements, brandOwnWords(run.brand_id)))
            out.push({ check: f.check, status: "warn", message: `Image ${n} ${p.text_elements[f.index]?.role ?? "text"}: ${f.what}.`, line_index: i });
        if (archetypeOf(item.archetype)?.funnel === "review")
            for (const f of reviewFaults(lockedPhrase((run as {
                notes?: string | null;
            }).notes), p))
                out.push({ check: f.check, status: "warn", message: `Image ${n} ${f.what}.`, line_index: i });
        for (const t of p.text_elements) {
            const hasNumber = /\d/.test(t.text.replace(/\b[1-9]\b(?=\s*(pack|step|sachet|scoop|a day|daily))/gi, ""));
            if (hasNumber && !t.source && !["label", "caption"].includes(t.role))
                out.push({ check: "number_source", status: "warn", message: `Image ${n} ${t.role} "${t.text.slice(0, 50)}" has a number with no source. Check it against the brand's claims.`, line_index: i });
        }
        const words = p.text_elements.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0);
        const ceiling = run.kind === "ad" && p.words_budget && p.words_budget.words > 0 ? p.words_budget.words : 0;
        const limit = run.kind === "ad" ? ceiling || 20 : /facts-panel|ingredient|replacement|versus|variant/.test(item.type) ? 45 : 30;
        if (run.kind !== "photoshoot" && words > limit)
            out.push({ check: "image_words", status: "warn", message: ceiling ? `Image ${n} has ${words} words on it, over its ceiling of ${ceiling}. What is left could not be taken off (the headline, a price or offer, a quote, a button): shorten a line.` : `Image ${n} has ${words} words on it; ${limit} or fewer render and read best.`, line_index: i });
        if (p.words_cut?.length)
            out.push({ check: WORDS_CUT, status: "warn", message: `Image ${n}: ${p.words_cut.length} piece${p.words_cut.length === 1 ? "" : "s"} of text left off the picture to keep it sparse${ceiling ? ` (at most ${ceiling} words)` : ""}: ${p.words_cut.join("; ")}. Put one back in the words editor if the ad needs it.`, line_index: i });
        if (run.kind === "ad" && p.person_note)
            out.push({ check: PERSON_NOTE, status: "warn", message: `Image ${n}: ${p.person_note}`, line_index: i });
        const stated = `${p.text_elements.map((t) => t.text).join(" ")} ${p.ad_copy ? `${p.ad_copy.primary_text} ${p.ad_copy.headline} ${p.ad_copy.description}` : ""}`;
        for (const d of run.kind === "ad" ? (p.disclosures ?? []) : [])
            if (statesDisclosed(d, stated))
                out.push({ check: DISCLOSURE, status: "warn", message: `Image ${n}: ${disclosureNote(d)}`, line_index: i });
        const head = p.text_elements.find((t) => t.role === "headline");
        if (head && head.text.split(/\s+/).length > 10)
            out.push({ check: "headline_length", status: "warn", message: `Image ${n} headline is ${head.text.split(/\s+/).length} words. 8 or fewer renders reliably.`, line_index: i });
    }
    for (const d of run.kind === "ad" ? [...new Set(run.items.flatMap((i) => i.plan?.disclosures ?? []))] : [])
        out.push({ check: DISCLOSURE, status: "warn", message: `${disclosureNote(d)} Said once for this set: it is on an ad only where that ad states what it is about.` });
    const offType = typefaceFinding(run);
    if (offType)
        out.push(offType);
    out.push(...setChecks(run, brand));
    out.push(...bankChecks(run as Parameters<typeof bankChecks>[0]));
    if (!out.some((x) => x.status === "fail"))
        out.unshift({ check: "claims_and_guardrails", status: "pass", message: "No forbidden claims or banned phrases" });
    return out;
}
interface Loaded {
    run: StudioRunRow;
    brand: BrandBrain;
    kit: CreativeKit;
    look: BrandLook | null;
    refs: Map<string, LibraryRefRow>;
    script?: ScriptAdOptions;
}
interface ScriptAdOptions {
    jobId: string;
    briefs: Map<string, string[]>;
    roles: (item: StudioItem) => string[];
    carousel: boolean;
    format?: string;
}
const booked = (l: Pick<Loaded, "run" | "script">): {
    refType: string;
    refId: string;
} => (l.script ? { refType: "job", refId: l.script.jobId } : { refType: "studio", refId: l.run.id });
async function load(runId: string): Promise<Loaded> {
    const run = getRun(runId);
    if (!run)
        throw new Error(`Set ${runId} not found`);
    const brand = writingBrain(run.brand_id, claimChecksOn(run));
    const kit = await ensureCreativeKit(run.brand_id, mediaLive());
    return { run, brand, kit, look: loadBrandLook(run.brand_id), refs: refsById(run.items.map((i) => i.ref_id).filter((x): x is string => !!x)) };
}
function itemPlan(l: Pick<Loaded, "run" | "refs">, item: StudioItem, stage?: string | null): ContextPlan {
    const ref = item.ref_id ? l.refs.get(item.ref_id) : undefined;
    const facts = { stage, refOk: !item.ref_id || (!!ref && fs.existsSync(refFile(ref))), ...(l.run.context.brand_refs === undefined || l.run.kind === "photoshoot" ? {} : { hasBrandRefs: lookFiles(l.run).length > 0 }) };
    const asLevers = planFor(l.run, item, facts);
    const words = unawareWords(l.run, item, stageId(stage) ?? stageFor(l.run, item), asLevers.text.pictureWords, tasteOf(l.run, item).words === "none");
    const plan = words ? planFor(l.run, { ...item, taste: { ...item.taste, words } }, facts) : asLevers;
    if (l.run.kind !== "ad" || plan.taste.product !== "hero")
        return plan;
    return { ...plan, notes: plan.notes.map((n) => (n === PRODUCT.hero.note ? HERO_NOTE : n)), skillPath: plan.skillPath.filter((s) => s !== PRODUCT.hero.skill) };
}
function batchesBy(items: StudioItem[], planOf: (i: StudioItem) => ContextPlan, size = 6, budget = 24000, observed?: {
    brandId: string;
    stage: string;
}): StudioItem[][] {
    const groups = new Map<string, StudioItem[]>();
    for (const it of items) {
        const p = planOf(it);
        const key = JSON.stringify([p.skillPath, p.notes, p.temperature, p.text, p.attach.brandDesignedImages + p.attach.pastAds, p.attach.productPhotos === "none"]);
        groups.set(key, [...(groups.get(key) ?? []), it]);
    }
    return [...groups.values()].flatMap((g) => {
        const n = planOf(g[0]).text.siblings === "none" ? 1 : size;
        return adaptiveBatches(g, (it) => { const requested = 2600 + Buffer.byteLength(JSON.stringify(it.plan?.text_elements ?? []), "utf8") + (it.plan?.ad_copy ? Math.ceil(Buffer.byteLength(JSON.stringify(it.plan.ad_copy), "utf8") / 2) : 800); return observed ? observedItemAllowance(observed.brandId, observed.stage, requested) : requested; }, budget, n);
    });
}
function keptPictures(brandId: string): Set<string> {
    const keeps = new Set(lessonsFor(brandId, { area: "pictures" }, 200).filter((x) => x.kind === "keep").map((x) => x.id));
    if (!keeps.size)
        return new Set();
    const rows = db.select().from(schema.feedback).where(and(eq(schema.feedback.brand_id, brandId), eq(schema.feedback.ref_type, "studio"))).all();
    return new Set(rows.filter((r) => r.asset && r.lesson_ids.some((x) => keeps.has(x))).map((r) => keptKey(r.asset!)).filter(Boolean));
}
function rangePhotos(l: Pick<Loaded, "run" | "kit" | "brand">): {
    file: string;
    name: string;
}[] {
    return brandProducts(l.brand.products, 8)
        .map((p) => ({ file: productImages(l.run.brand_id, l.kit, p.id).hero, name: p.name }))
        .filter((x): x is {
        file: string;
        name: string;
    } => !!x.file)
        .slice(0, BRAND_PRODUCTS_SHOWN);
}
interface ProductView {
    file: string;
    view: PhotoView;
}
function productViews(l: Pick<Loaded, "run" | "kit">): ProductView[] {
    const sheet = productPhotoSheet(l.run.brand_id, l.kit, l.run.product_id);
    const byName = new Map(sheet.photos.map((p) => [p.name, p]));
    const named = (names: string[]) => names.map((n) => byName.get(n)).filter((p): p is NonNullable<typeof p> => !!p && !p.locked && fs.existsSync(p.abs)).map((p): ProductView => ({ file: p.abs, view: p.view }));
    const chosen = named(l.run.context.product_images ?? []);
    if (chosen.length)
        return chosen;
    const picked = named(sheet.picked);
    if (picked.length)
        return picked;
    const imgs = productImages(l.run.brand_id, l.kit, l.run.product_id);
    return [imgs.hero, ...imgs.extras].filter((f): f is string => !!f && fs.existsSync(f)).map((file, i): ProductView => ({ file, view: i === 0 ? "pack front" : "other" }));
}
function productRefs(l: Pick<Loaded, "run" | "kit" | "brand">, item?: StudioItem): {
    hero: string | null;
    extras: string[];
    truth: string | null;
    views: ProductView[];
    unit?: boolean;
} {
    if (item?.photo && placeOf(l.run, item) !== "none" && !fs.existsSync(assetAbs(l.run.brand_id, item.photo)))
        throw new Error(`The selected product photo for ${item.label} is missing. Restore it before planning or rendering; another SKU is not a substitute.`);
    if (item?.photo && fs.existsSync(assetAbs(l.run.brand_id, item.photo))) {
        const hero = assetAbs(l.run.brand_id, item.photo);
        const stray = new Set(item.photo_extras?.length ? strayAmong(l.run.brand_id, l.kit, l.run.product_id, item.photo_extras) : []);
        const extras = (item.photo_extras ?? []).filter((f) => !stray.has(f)).map((f) => assetAbs(l.run.brand_id, f)).filter((f) => fs.existsSync(f));
        return { hero, extras, truth: hero, views: [{ file: hero, view: "pack front" }, ...extras.map((file): ProductView => ({ file, view: "other" }))] };
    }
    if (isWholeBrand(l.run.product_id)) {
        const range = rangePhotos(l);
        return { hero: range[0]?.file ?? null, extras: range.slice(1).map((x) => x.file), truth: range[0]?.file ?? null, views: [] };
    }
    const all = productViews(l);
    if (!all.length)
        return { hero: null, extras: [], truth: null, views: [] };
    const kinds = all.map((v) => v.view);
    const front = leadIndex(kinds, "");
    const stop = item?.plan ? stopOf(l.run, item) : null;
    const seen = item?.plan && (stop === "clear" || stop === "hero") ? `${item.plan.scene} ${item.plan.product_spot ?? ""}` : null;
    const unit = seen === null ? -1 : unitIndex(kinds, item!.plan!.text_elements.map((t) => t.text).join(". "), seen, l.brand.products.find((p) => p.id === l.run.product_id)?.format);
    const at = unit > -1 ? unit : seen === null ? front : leadIndex(kinds, seen);
    const views = [all[at], ...all.filter((_, i) => i !== at)];
    return { hero: views[0].file, extras: views.slice(1).map((v) => v.file), truth: all[unit > -1 ? unit : front].file, views, ...(unit > -1 ? { unit: true } : {}) };
}
function templateContractFor(l: Loaded, item: StudioItem, opts: {
    authorityApart?: boolean;
} = {}): string {
    if (l.run.kind !== "ad")
        return "";
    const plan = itemPlan(l, item);
    const ref = item.ref_id && sendsReference(plan) ? l.refs.get(item.ref_id) : undefined;
    return staticTemplateContract({ productId: l.run.product_id, item, reference: ref ? { id: ref.id, fidelity: fidelityOfPlan(plan, true) ?? "loose" } : null, look: l.run.context.format_look, stage: stageFor(l.run, item) ?? undefined, scripted: !!l.script || l.run.context.from_script === true, freeLayout: plan.taste.look === "new" && !item.world && !l.script && !l.run.context.from_script, requirements: ref?.analysis?.needs }, opts);
}
const PRODUCT_IDENTITY = (() => {
    const tail = productPhotoRoleFor("hero", "the product").split(" It is the subject of the picture: ")[1] ?? "";
    return tail.split(". ").slice(1).join(". ");
})();
const IDENTITY_MARK = "[the identity sentence, stated once under Rules for this set and these plans]";
export const OPEN_STATE = "open_state";
function openStateFindings(l: Loaded, items: StudioItem[]): AuditItem[] {
    const product = l.brand.products.find((p) => p.id === l.run.product_id);
    let taught = false;
    try {
        taught = lessonImages(l.run.brand_id, l.run.product_id).length > 0;
    }
    catch {
        taught = false;
    }
    if (taught)
        return [];
    const out: AuditItem[] = [];
    for (const item of items) {
        if (!item.plan || placeOf(l.run, item) === "none")
            continue;
        let views: PhotoView[] = [];
        try {
            views = productRefs(l, item).views.map((v) => v.view);
        }
        catch {
            continue;
        }
        const said = opensWithoutPhoto(item.plan.scene, views, { name: product?.name, format: product?.format });
        const at = l.run.items.findIndex((i) => i.id === item.id);
        const inside = said ? null : contentsShownUnseen(l, item, product);
        if (inside)
            out.push({ check: OPEN_STATE, status: "warn", message: `Image ${at + 1} shows what is inside the product, out of its pack ("${inside.slice(0, 140)}"), and no real photo of this product shows that. The picture may draw it wrong. Add a photo of what is inside to the product's photos, or plan the picture without it.`, line_index: at });
        if (said)
            out.push({ check: OPEN_STATE, status: "warn", message: `Image ${at + 1} shows the product being opened or poured ("${said.slice(0, 140)}"), and it has no real photo of the product open or in use. The picture is then drawn from a guess at how it opens. Add a photo of it open or in use to the product's photos, or plan it closed.`, line_index: at });
    }
    return out;
}
function contentsShownUnseen(l: Loaded, item: StudioItem, product: {
    format?: string | null;
} | undefined): string | null {
    const sheet = productPhotoSheet(l.run.brand_id, l.kit, l.run.product_id);
    const lines = (l.kit?.products ?? []).filter((k) => k.product_id === l.run.product_id || (!!sheet.folder && k.asset_folder === sheet.folder)).flatMap((k) => [k.details, k.handling_notes, k.packaging]);
    const shown = showsContents(item.plan?.scene ?? "", contentsWords([product?.format, ...lines], product?.format));
    if (!shown)
        return null;
    const refs = productRefs(l, item);
    const sent = new Set([refs.hero, ...refs.extras].filter((x): x is string => !!x).map((x) => path.resolve(x)));
    const outOfPack = refs.views.some((v) => v.view === "out of pack") || sheet.photos.some((p) => p.shows && p.view === "out of pack" && sent.has(path.resolve(p.abs)));
    return outOfPack ? null : shown;
}
function templatePreflightFor(l: Loaded): AuditItem[] {
    if (l.run.kind !== "ad")
        return [];
    const customerQuotes = researchRows(l.run.brand_id, 40, 1).some((r) => r.quotes.some((q) => q.trim()));
    const offers = !l.run.context.no_offer && offersFor(l.brand, l.run.product_id).length > 0;
    const earnedProof = claimsOfProduct(l.brand, l.run.product_id).some((c) => /\b(?:certified|certification|award|press|expert|clinical|clinically)\b/i.test(c.text) && !!c.source);
    return l.run.items.flatMap((item, index) => {
        const ref = item.ref_id && sendsReference(itemPlan(l, item)) ? l.refs.get(item.ref_id) : undefined;
        return staticTemplatePreflight({ analysis: ref?.analysis, type: item.type, customerQuotes, offers, earnedProof, singleProduct: !isWholeBrand(l.run.product_id), index });
    });
}
const worldFiles = (run: Pick<StudioRunRow, "brand_id" | "context">): string[] => (run.context.world_refs ?? []).map((f) => assetAbs(run.brand_id, f)).filter((f) => fs.existsSync(f));
const placeInSet = (run: Pick<StudioRunRow, "items">, item: Pick<StudioItem, "id">) => Math.max(0, run.items.findIndex((i) => i.id === item.id));
const brandRefFiles = (run: Pick<StudioRunRow, "brand_id" | "context">): string[] => (run.context.brand_refs ?? []).map((f) => assetAbs(run.brand_id, f)).filter((f) => fs.existsSync(f));
function lookFiles(run: Pick<StudioRunRow, "brand_id" | "context" | "product_id" | "id">): string[] {
    return [...new Set([...brandRefFiles(run), ...praisedPictures(run.brand_id, run.product_id, run.id)])];
}
export function praisedPictures(brandId: string, productId: string, notSet = ""): string[] {
    const keeps = new Set(lessonsFor(brandId, { productId, area: "pictures" }, 50).filter((x) => x.kind === "keep").map((x) => x.id));
    if (!keeps.size)
        return [];
    const rows = db.select().from(schema.feedback).where(and(eq(schema.feedback.brand_id, brandId), eq(schema.feedback.ref_type, "studio"))).all();
    return rows
        .filter((r) => r.asset && r.ref_id !== notSet && r.lesson_ids.some((x) => keeps.has(x)))
        .sort((a, b) => Number(b.product_id === productId) - Number(a.product_id === productId) || b.created_at.localeCompare(a.created_at))
        .map((r) => path.join(env.DATA_DIR, "assets", r.asset!))
        .filter((f) => fs.existsSync(f))
        .slice(0, 2);
}
export function referenceRole(kind: LibraryKind, hasFrame = false, fidelity: Fidelity = "loose"): string {
    return roleOfReference(kind, hasFrame, fidelity);
}
const MAX_PLAN_REFS = 7;
const WORLD_ROLE = "A photograph from this brand's own pictures. For 1 thing only: the kind of people, places and light its real pictures have, and how finished they look. It is not this picture's scene, nobody in it is drawn, and no product is drawn from it";
function renderRefs(l: Loaded, item: StudioItem, o: {
    held?: boolean;
} = {}): {
    files: string[];
    roles: string[];
    dropped: string[];
    refAt: number;
    productAt: number;
} {
    const imgs = productRefs(l, item);
    const product = setProduct(l.brand, l.run.product_id);
    if (!product)
        throw new Error("This set's product is no longer in the brand brain. Add it back, or make a new set.");
    const range = isWholeBrand(l.run.product_id) ? rangePhotos(l) : null;
    const person = item.person ? personById(l.run.brand_id, item.person) : null;
    const avatar = item.avatar ? getAvatar(l.run.brand_id, item.avatar) : undefined;
    const portrait = avatarFile(avatar?.portrait);
    if (item.avatar && !portrait)
        throw new Error("The selected character reference is missing. Restore it before rendering.");
    const withText = l.run.kind !== "photoshoot" && !!item.plan?.text_elements.length;
    const ref = item.ref_id ? l.refs.get(item.ref_id) : undefined;
    const plan = itemPlan(l, item);
    const sent = plan.attach.productPhotos !== "none";
    const stop: ProductStop = sent ? plan.taste.product : "none";
    const fidelity = fidelityOfPlan(plan, !!item.ref_id);
    const refOk = !!ref && fs.existsSync(refFile(ref));
    const sendRef = refOk && plan.attach.referenceImage;
    const wantsRef = !lookDropsLayout(l.run, item) && tasteOf(l.run, item).look === "reference";
    const follows = !!ref && !!fidelity && followsReference(fidelity) && (refOk || !!item.plan?.reference_read);
    const frame = l.run.kind === "pdp" && item.bucket && !follows && plan.taste.look !== "new" ? templateFrame(item.bucket) : null;
    const nth = placeInSet(l.run, item);
    const looks = withText ? dealFrom(lookFiles(l.run), nth, lookCount(plan)) : [];
    const logo = item.plan?.logo && plan.attach.logo ? lookFile(l.run.brand_id, l.look?.logo ?? "") : null;
    const styled = plan.text.brandLook !== "none";
    const specimen = withText && styled ? lookFile(l.run.brand_id, l.look?.specimen ?? "") : null;
    const shown = stop === "clear" || stop === "hero";
    const world = l.run.kind === "ad" && lookCount(plan) > 0 && stop !== "hero" && !sendRef ? dealFrom(worldFiles(l.run), nth, 1) : [];
    const list: [
        string | null | undefined,
        string,
        number
    ][] = [
        [sent ? imgs.hero : null, productPhotoRoleFor(stop, range?.[0]?.name ?? product.name, item.plan?.product_spot, { view: imgs.views[0]?.view, held: o.held, hero: heroOf(l.run, item) }), 9],
        ...(shown && range ? imgs.extras.slice(0, 2) : []).map((f, i): [
            string,
            string,
            number
        ] => [f, `${range!.find((x) => x.file === f)?.name ?? "Another product of the brand"}: another product of this brand, exactly as photographed. It is in the picture only where the picture shows the range`, i === 0 ? 4 : 2]),
        ...(shown && !range ? imgs.views.slice(1, MAX_PRODUCT_PHOTOS) : []).map((v, i): [
            string,
            string,
            number
        ] => [v.file, productViewRole(product.name, v.view), v.file === imgs.truth || v.view === "pack front" ? 9 : ([4, 2, 1][i] ?? 1)]),
        [person?.abs, person ? `A real person: ${person.name}, the brand's ${ROLE_LABEL[person.role].toLowerCase()}${person.note ? ` (${person.note})` : ""}. Where the picture shows the ${ROLE_LABEL[person.role].toLowerCase()}, it is this person: keep the face, hair, skin and build exactly as photographed. Nobody else is shown in that role` : "", 9],
        [portrait, "Fictional character identity and scene reference. Preserve this face, age, hair, skin texture and build. The expression, the gaze and the pose come from the prompt, not from this portrait. Match the planned scene lighting and camera texture naturally; no pasted-on face. This is a fictional actor, never a real customer or expert. Ignore any unrelated product or lettering", 9],
        ...(l.run.kind === "ad" ? formatLookReferences(l.run.context.format_look) : []).map((r): [
            string,
            string,
            number
        ] => [r.file, r.role, 9]),
        [specimen, "Brand type and colour specimen. A style guide only: set added words in these typefaces and colours. It never appears in the picture", 9],
        ...looks.map((f, i): [
            string,
            string,
            number
        ] => [f, "An image this brand designed itself. A style guide only: match how it dresses an image (its colours, how its type sits, how busy it is, its mood). Never copy its words, its layout or its picture", i === 0 ? 5 : 3]),
        ...world.map((f): [
            string,
            string,
            number
        ] => [f, WORLD_ROLE, 2]),
        [logo, logoRole(item.plan?.logo ?? ""), 9],
        [frame, "Layout wireframe for this image: where the photo areas, the headline and the points sit. Structure only. Its grey boxes, placeholder icons and placeholder words never appear in the picture, and nothing is drawn in its grey style", 9],
        ...(shown && SHOWS_USE.test(`${item.plan?.scene ?? ""} ${item.plan?.layout ?? ""} ${item.direction}`) ? lessonImages(l.run.brand_id, l.run.product_id).map((x, i): [
            string,
            string,
            number
        ] => [x.file, x.role, i === 0 ? 3 : 1]) : []),
        [sendRef ? refFile(ref!) : null, referenceRole(l.run.kind, !!frame, fidelity ?? "loose"), 9],
    ];
    const ok = list.filter(([f]) => !!f && fs.existsSync(f!)).map(([file, role, keep]) => ({ file: file!, role, keep }));
    const { kept, dropped } = capRefs(ok, MAX_PLAN_REFS);
    const missing = [
        ref && !fs.existsSync(refFile(ref)) && wantsRef ? `the chosen reference ${ref.id}, whose file is not on this computer (${path.basename(refFile(ref))})` : "",
        l.run.kind === "pdp" && item.bucket && !frame && !follows ? `the template wireframe of "${item.label}", whose file is not on this computer` : "",
        styled && !l.look && brandLookState(l.run.brand_id) === "unreadable" ? "the brand's fonts and colours, which are on file and could not be read" : "",
        withText && styled && !specimen && specimenMissing(l.run.brand_id, l.look) ? "the picture of the brand's typefaces, which is not on this computer" : "",
    ].filter(Boolean);
    const at = (file: string | null | undefined) => (file ? kept.findIndex((x) => x.file === file) + 1 : 0);
    return { files: kept.map((x) => x.file), roles: kept.map((x, i) => `${i + 1}. ${x.role}`), dropped: [...dropped.map((x) => path.basename(x.file)), ...missing], refAt: sendRef ? at(refFile(ref!)) : 0, productAt: sent ? at(imgs.hero) : 0 };
}
export async function planRun(runId: string, opts: PlanOptions = {}): Promise<void> {
    return planLoaded(await load(runId), opts);
}
interface PlanOptions {
    redo?: boolean;
    itemIds?: string[];
    draftOnly?: boolean;
    mendWords?: Record<string, string[]>;
}
async function planLoaded(l: Loaded, opts: PlanOptions = {}): Promise<void> {
    const { run, brand, kit } = l;
    const learnedExamples = imageLessons(l.refs, run.brand_id);
    const exampleFor = (item: StudioItem, plan: ContextPlan, words: boolean) => {
        const lesson = item.ref_id && learningAllowed(plan) ? learnedExamples.get(item.ref_id) : null;
        return lesson ? `\n\n${LEARNING_RULE}\n${words ? lesson.words : lesson.plan}` : "";
    };
    const ledger = booked(l);
    const product = setProduct(brand, run.product_id);
    if (!product)
        throw new Error("The set's product is no longer in the brand brain.");
    const todo = run.items.filter((i) => (opts.itemIds ? opts.itemIds.includes(i.id) : opts.redo || !i.plan || !i.plan.prompt));
    const fresh = todo.filter((i) => !!opts.itemIds || !!opts.redo || !i.plan);
    if (!todo.length)
        return;
    if (opts.mendWords && !mediaLive())
        return;
    for (const item of todo)
        if (item.photo && itemPlan(l, { ...item, plan: undefined }).attach.productPhotos !== "none")
            productRefs(l, { ...item, plan: undefined });
    for (const item of todo)
        if (item.ref_id && !lookDropsLayout(run, item) && tasteOf(run, item).look === "reference") {
            const ref = l.refs.get(item.ref_id);
            if (!ref || !fs.existsSync(refFile(ref)))
                throw new Error(`The selected reference for ${item.label} is missing. Restore it before planning an exact adaptation.`);
        }
    const templateFindings = templatePreflightFor(l);
    run.status = "planning";
    run.error = null;
    save(run);
    let judgedNow: {
        points: AuditItem[];
        fresh: StudioItem[];
    } | null = null;
    try {
        if (!mediaLive()) {
            for (const item of todo)
                Object.assign(item, { plan: { ...mockPlan(run.kind, item, product.name), ...(wordsOn(run) ? {} : { text_elements: [], layout: "" }), ...(run.kind === "ad" ? { product: placeOfStop(planFor(run, { ...item, plan: undefined }).taste.product), product_stop: planFor(run, { ...item, plan: undefined }).taste.product } : {}) }, status: "planned" });
            const stated = isBank(run.notes) && wordsOn(run) ? /The offer these state, exactly as given: (\S+), "([^"]+)"/.exec(run.notes ?? "") : null;
            if (stated)
                for (const item of todo)
                    if (item.plan && !item.plan.text_elements.some((t) => t.role === "offer"))
                        item.plan.text_elements.push({ role: "offer", text: stated[2], placement: "a band along the bottom", source: stated[1] });
            note(run, `Mock plan written for ${todo.length} image${todo.length === 1 ? "" : "s"}. Live mode writes the real one.`);
        }
        else {
            let imgs = productRefs(l);
            const bare = (i: StudioItem): StudioItem => ({ ...i, plan: undefined });
            let plans = new Map(todo.map((i) => [i.id, itemPlan(l, bare(i))] as const));
            const planOf = (i: StudioItem) => plans.get(i.id) ?? itemPlan(l, bare(i));
            const noPhoto = todo.every((i) => planOf(i).attach.productPhotos === "none");
            if (!imgs.hero && !noPhoto)
                throw new Error(`There is no product photo for ${product.name}. Add its images to the brand folder and rebuild the creative kit: every image is anchored on a real photo of the real product.`);
            if (run.kind === "pdp" && run.context.brand_refs === undefined) {
                let own: string[] = [];
                try {
                    own = ownDesigned(await inventory(run.brand_id, brand, kit, run.id), run.product_id);
                }
                catch (e) {
                    if (e instanceof RunStoppedError)
                        throw e;
                }
                run.context = { ...run.context, brand_refs: own };
                if (own.length)
                    note(run, `${own.length} of the brand's own designed image${own.length === 1 ? "" : "s"} given as the look to match`);
                save(run);
            }
            if (run.kind === "ad" && (run.context.brand_refs === undefined || run.context.world_refs === undefined)) {
                let own: string[] = [];
                let world: string[] = [];
                try {
                    const read = await inventory(run.brand_id, brand, kit, run.id);
                    const assets = isWholeBrand(run.product_id) ? read : atHome(read, productFolders(run.brand_id), run.product_id);
                    own = pickLooks(assets, run.product_id);
                    world = pickWorld(assets.flatMap((a) => {
                        const kind = brandImageKind(a);
                        return kind ? [{ rel: a.file, kind, productId: a.product_id, note: "" }] : [];
                    }), run.product_id);
                }
                catch (e) {
                    if (e instanceof RunStoppedError)
                        throw e;
                }
                run.context = { ...run.context, brand_refs: run.context.brand_refs ?? own, world_refs: run.context.world_refs ?? world };
                save(run);
            }
            plans = new Map(todo.map((i) => [i.id, itemPlan(l, bare(i))] as const));
            clearPhotoSheets();
            imgs = productRefs(l);
            const world = brandWorld(run.brand_id);
            const sheets = new Map(listPersonas(run.brand_id).map((x) => [x.id, x.who] as const));
            const buyerIdOf = (it: StudioItem): string => {
                const named = brand.personas.filter((x) => it.direction.includes(x.id));
                const set = brand.personas.filter((x) => (run.notes ?? "").includes(x.id));
                return named.length === 1 ? named[0].id : set.length === 1 ? set[0].id : (it.plan?.buyer ?? "");
            };
            const chosenAges = chosenCastAges(run);
            const buyerOf = (it: StudioItem, id = buyerIdOf(it)) => castOver(buyerFrom(sheets.get(id)), chosenAges);
            const castAges = run.context.sprint && !chosenAges ? (DEFAULT_CAST_BRIEF.ages ?? null) : null;
            const setAges = agesOfSet({ people: world?.people, cast: castAges });
            const dealWith = (buyers: ReturnType<typeof buyerOf>[]) => dealHands(run.brand_id, run.items.length, imgs.views.map((v) => v.view), ownPlaces(world?.places), { everyday: PLACES, start: deckStart(run.id), people: peopleOf(world?.people), props: placesOf(world?.surfaces_and_props), colours: (l.look?.palette ?? []).filter((c) => c.role !== "text").map((c) => `${c.name} (${c.hex.toUpperCase()})`), noLow: showsNoLow(neverShown(run.brand_id, kit, run.product_id)), buyers, market: brand.brand.market, ages: setAges });
            const hands = run.kind === "ad" && !l.script?.carousel && tasteOf(run).spread !== "openings" ? dealWith(run.items.map((it) => buyerOf(it))) : null;
            const handOf = (it: StudioItem): string => {
                const h = hands?.[run.items.indexOf(it)];
                if (!h)
                    return "";
                const p = planOf(it);
                const fid = it.ref_id ? fidelityOfPlan(p, true) : null;
                if (fid === "exact")
                    return "";
                const not = new Set<keyof Hand>([
                    ...(fid === "structure" ? (["camera", "light", "headline"] as const) : []),
                    ...(run.context.sprint ? (["seen"] as const) : []),
                    ...(it.person || it.avatar ? (["person", "place"] as const) : []),
                    ...(p.text.brandLook === "none" ? (["ground"] as const) : []),
                    ...(p.text.pictureWords === "none" ? (["headline"] as const) : []),
                    ...(p.taste.product === "hero" ? (heroOf(run, bare(it))?.id === "in_hand" ? (["seen"] as const) : heroOf(run, bare(it))?.id === "in_place" ? (["seen", "person"] as const) : (["seen", "person", "place", "prop"] as const)) : []),
                    ...(p.taste.product === "hero" && !it.world ? (["expression"] as const) : []),
                ]);
                return `\n${handLine(h, HAND_PARTS.filter((k) => !not.has(k)), l.script ? "This ad is cut from a script: where the script's own moment names the place, the person or a thing in it, the script stands." : "")}`;
            };
            const allLooks = lookFiles(run);
            let ownAssets: {
                type: string;
                has_added_text: boolean;
                description: string;
                product_id: string;
            }[] = [];
            if (run.kind !== "photoshoot") {
                try {
                    ownAssets = (await inventory(run.brand_id, brand, kit, run.id)).filter((a) => a.has_added_text && a.type !== "merch").sort((a, b) => Number(b.product_id === run.product_id) - Number(a.product_id === run.product_id));
                }
                catch (e) {
                    if (e instanceof RunStoppedError)
                        throw e;
                }
            }
            const ownText = ownAssets.length ? ownAssets.slice(0, 4).map((a) => `- ${a.description.slice(0, 260)}`).join("\n") : "";
            const ownRuns: string[] = [];
            const formsBefore: string[] = run.kind === "ad" ? [...new Set([...ownAssets.map((a) => formOfAsset(a) as string), ...formsOfKept(listRuns(run.brand_id, "ad").filter((r) => r.id !== run.id), keptPictures(run.brand_id))].filter(Boolean))] : [];
            const stageOpen = run.kind === "ad" && !tasteOf(run).product && !stageFor(run);
            const formAds: FormAd[] | null = run.kind === "ad" && !l.script && tasteOf(run).spread !== "openings"
                ? run.items.map((it): FormAd => {
                    const made = planForm(it.plan);
                    if (!fresh.includes(it))
                        return made ? { allowed: [], fixed: made } : { allowed: [], open: true };
                    if (run.context.sprint)
                        return formId(it.dealt_form) ? { allowed: [], fixed: formId(it.dealt_form) } : { allowed: [], open: true, expect: made };
                    const named = formNamed(it.direction);
                    if (named)
                        return { allowed: [], fixed: named };
                    const p = planOf(it);
                    const v = lookToVariety(p.taste.look);
                    if (v <= 2 || it.archetype || formNamed(run.notes) || (it.ref_id && followsReference(fidelityOfPlan(p, true) ?? "loose")))
                        return { allowed: [], open: true, expect: made };
                    if (p.taste.product === "hero")
                        return { allowed: [], open: true, expect: USUAL_FORM };
                    const stage = stageFor(run, bare(it));
                    const allowed = formsAllowed({ types: it.world ? [] : [it.type], world: it.world, stage, product: stage || tasteOf(run, bare(it)).product ? p.taste.product : null });
                    const taken: string[] = v >= 4 ? [...formsUsed(formsBefore), ...(v >= 5 ? [USUAL_FORM] : [])] : [];
                    const free = allowed.filter((f) => !taken.includes(f));
                    return { allowed: free.length ? free : allowed };
                })
                : null;
            const formsDealt = formAds ? dealForms(formAds, run.brand_id, deckStart(run.id)) : [];
            const formSaid = (it: StudioItem): AdForm | "" => {
                const at = run.items.indexOf(it);
                const ad = formAds?.[at];
                if (!ad || !fresh.includes(it) || (ad.fixed && !formId(it.dealt_form)))
                    return "";
                return formsDealt[at] ?? "";
            };
            const formLineOf = (it: StudioItem): string => (formSaid(it) ? `\n${formLine(formSaid(it) as AdForm)}` : "");
            const dealtFormOf = (it: StudioItem): string => formId(it.dealt_form) || formSaid(run.items.find((x) => x.id === it.id) ?? it) || (run.context.sprint ? "" : formNamed(it.direction) || formNamed(run.notes));
            const withForm = (it: StudioItem): StudioItem => (!formId(it.dealt_form) && !planForm(it.plan) && dealtFormOf(it) ? { ...it, dealt_form: dealtFormOf(it) } : it);
            if (run.kind === "ad")
                for (const it of todo) {
                    const known = (fresh.includes(it) ? "" : planForm(it.plan)) || dealtFormOf(it);
                    if (known)
                        plans.set(it.id, itemPlan(l, { ...bare(it), dealt_form: known }));
                }
            const heroLineOf = (it: StudioItem): string => {
                if (run.kind !== "ad")
                    return "";
                const open = stageOpen && !stageFor(run, bare(it)) && !tasteOf(run, bare(it)).product;
                return open || planOf(it).taste.product === "hero" ? `\n${heroLine(heroOf(run, bare(it))!, open)}` : "";
            };
            const budgetLineOf = (it: StudioItem, stage: string | null | undefined = stageFor(run, bare(it))): string => {
                const words = planOf(it).text.pictureWords;
                if (run.kind !== "ad" || !stage)
                    return "";
                if (words === "none")
                    return stageId(stage) === "unaware" && !ownHand(withForm(it)) ? wordBudgetLine(WORD_BUDGET.unaware) : "";
                const b = budgetOf(run, withForm(it), stage, words);
                return b ? wordBudgetLine(b, { ownHand: stageId(stage) === "unaware" && b.words > 0 }) : "Words on the picture: the person chose the full layout for this ad, so the stage's ceiling does not apply to it. Still no more than its 1 idea needs.";
            };
            const holdToBudget = (item: StudioItem, pictureWords: ContextPlan["text"]["pictureWords"], planned?: number | string | null, count = true) => {
                const d = item.plan;
                if (!d || run.kind !== "ad")
                    return;
                const fit = fitItem(run, item, d.text_elements, d.awareness ?? stageFor(run, item), pictureWords);
                if (!fit.budget)
                    return;
                const said = Number.parseInt(String(planned ?? ""), 10);
                d.words_budget = { ...fit.budget, ...(d.words_budget?.planned != null ? { planned: d.words_budget.planned } : {}), ...(Number.isFinite(said) ? { planned: said } : {}) };
                if (!count)
                    return;
                if (fit.over)
                    note(run, `${item.id}: left over its ceiling of ${fit.budget.words} words in ${fit.budget.lines} line${fit.budget.lines === 1 ? "" : "s"} (it carries ${wordsOnPicture(fit.texts)} in ${fit.texts.length}): what is left is the headline, a price, a quote, or a line another line points to`);
                if (!fit.cut.length)
                    return;
                d.text_elements = fit.texts;
                d.words_cut = [...(d.words_cut ?? []), ...fit.cut.map((t) => cutLine(t))];
                d.layout = `${d.layout}${cutLayoutNote(fit.cut)}`.trim();
                note(run, `${item.id}: ${fit.cut.map((t) => t.role).join(", ")} left off the picture to keep it to ${fit.budget.words} words in ${fit.budget.lines} line${fit.budget.lines === 1 ? "" : "s"} (it now carries ${wordsOnPicture(fit.texts)})`);
            };
            const askedBy = (it: StudioItem): string => (run.context.sprint ? (/The user's direction for the sprint: ([^\n]*)/.exec(run.notes ?? "")?.[1] ?? "") : it.direction);
            const checkPerson = (item: StudioItem) => {
                const d = item.plan;
                if (!d || run.kind !== "ad" || l.script || item.person)
                    return;
                const buyer = buyerOf(item, d.buyer && sheets.has(d.buyer) ? d.buyer : buyerIdOf(item));
                if (!buyer || fixedByHand(askedBy(item)))
                    return;
                if (item.avatar) {
                    const cast = getAvatar(run.brand_id, item.avatar)?.presenter;
                    const off = cast ? personMismatch(personOnSheet(cast), buyer) : "";
                    if (off)
                        d.person_note = `The cast character is ${off} (this ad is for ${buyerSaid(buyer)}). Nothing was changed: cast another person for this ad, or keep this one.`;
                    return;
                }
                const at = run.items.indexOf(item);
                const fixed = recheckPerson({ said: `${d.scene} ${d.expression ?? ""}`, buyer, direction: askedBy(item), redeal: () => dealWith(run.items.map((_, i) => (i === at ? buyer : null)))[at].person });
                if (!fixed)
                    return;
                d.person = fixed.person;
                note(run, `${item.id}: the plan described ${fixed.why}. The person was dealt again from the buyer's sheet (${buyerSaid(buyer)}), and the image prompt is written from that line`);
            };
            let owed: string[] | null = null;
            const notices = (): string[] => (owed ??= run.kind === "ad" ? [...new Set([...voice.disclosures, ...disclosuresOf(run.brand_id)])] : []);
            const forPlanner = (p: ContextPlan, it: StudioItem): ContextPlan => (stageOpen && !stageFor(run, bare(it)) && !tasteOf(run, bare(it)).product ? { ...p, notes: p.notes.filter((n) => n !== PRODUCT[p.taste.product].note && n !== HERO_NOTE), skillPath: p.skillPath.filter((s) => !s.includes("/product/")) } : p);
            const offerOf = (p: ContextPlan, it: StudioItem): ContextPlan["text"]["offer"] => (run.context.no_offer ? "none" : run.kind === "ad" && !stageFor(run, bare(it)) ? itemPlan(l, bare(it), "most_aware").text.offer : p.text.offer);
            const choicesText = (p: ContextPlan, batch: StudioItem[], shown: number) => {
                if (run.kind === "photoshoot")
                    return tasteBlock(p) || "(none: a photograph follows its reference)";
                const followsAny = batch.some((i) => followsReference(fidelityOfPlan(planOf(i), !!i.ref_id) ?? "loose"));
                const full = p.text.brandLook === "full";
                const v = lookToVariety(p.taste.look);
                return [
                    tasteBlock(forPlanner(p, batch[0]), { always: true }),
                    followsAny ? "Where an item follows a reference (EXACT or STRUCTURE), the reference decides the layout whatever this says." : "",
                    shown ? `${shown} of the brand's own images ${shown === 1 ? "is" : "are"} attached as the look.` : p.text.brandLook === "none" ? "Nothing of the brand's design is sent, and none is used." : "None of the brand's own images is attached.",
                    full && ownText ? `What the brand's own images look like (in words):\n${ownText}` : "",
                    p.text.siblings === "body" && batch.length > 1 ? "The ads of this set are 1 ad with new openings: the same buyer, the same argument and the same picture idea in every one. Only the headline and the first line of the feed copy change." : "",
                    run.kind === "ad" ? formRule(v, formsBefore, shown, batch.some((it) => !!formSaid(it))) : "",
                    hands ? DEAL_RULE : "",
                    l.script ? "No logo file rides with this ad. Leave `logo` empty and plan no logo in the layout: the product in the picture carries the brand's name." : "",
                ]
                    .filter(Boolean)
                    .join("\n\n");
            };
            const routed = run.kind === "ad";
            const strict = claimChecksOn(run);
            const level: ContextLevel = routed ? contextLevel("studio_plan") : "full";
            const lean = !!l.script && planFor(run).text.wordsFrom === "script";
            const skill = kindSkill(run.kind, [...new Set(todo.map((i) => i.type))], lean ? "minimal" : level, todo.some((i) => !!i.world), lean);
            const fmt = run.kind === "ad" ? formatLookText(run.context.format_look, { lookType: run.context.look_type }) : null;
            const guide = productGuide(brand, kit, run.product_id);
            const ctx = brandContext(run.brand_id, brand, kit);
            const buyersIn = (items: StudioItem[]) => brand.personas.filter((p) => items.some((it) => `${it.direction} ${run.notes}`.includes(p.id))).map((p) => p.id);
            const packFor = (items: StudioItem[]) => (level === "full" ? null : brandPack(brand, level, { productId: run.product_id, personaIds: buyersIn(todo).length ? buyersIn(items) : [], about: `${run.notes} ${items.map((it) => `${it.label} ${it.direction}`).join(" ")}` }));
            const stablePack = packFor(todo)?.stable;
            const asTone = run.kind === "ad" && !lean ? ({ toneOnly: true, buyerApart: true } as const) : {};
            const planSurfaces: Surface[] = run.kind === "ad" && !lean && !feedCopyOn(run) ? ["on_image"] : surfacesOf(run.kind);
            const voice = brandVoicePack(run.brand_id, brand, [], level === "full" ? { surfaces: planSurfaces, personaIds: buyersIn(todo), ...asTone } : { level, personaIds: buyersIn(todo), surfaces: planSurfaces, ...asTone });
            const voiceBasics = brandVoicePack(run.brand_id, brand, [], { level: "minimal", personaIds: buyersIn(todo), surfaces: [], ...asTone });
            const VISUAL = ["imagery_style", "visual_do", "visual_avoid"];
            const brandSource = (): Record<string, unknown> => {
                const src: Record<string, unknown> = stablePack ? { ...without(stablePack, ["product", "voice"]), language: ctx.language, ...(strict ? { guardrails: ctx.guardrails } : {}) } : { ...without(ctx, [...(strict ? [] : ["guardrails"]), ...VISUAL]), approved_claims: claimsOfProduct(brand, run.product_id).map((c) => ({ id: c.id, text: c.text, source: c.source })) };
                if (Array.isArray(src.other_products_not_the_subject))
                    src.other_products_not_the_subject = `The brand also sells (not the subject of these): ${(src.other_products_not_the_subject as string[]).join("; ")}.`;
                const bound = boundRuntimeContext(run.brand_id, { productId: run.product_id, market: brand.brand.market }, { set: run.id });
                if (bound) {
                    Object.assign(src, writingAuthority(bound.packet), { bound_evidence: bound.prompt });
                    delete src.guarantee;
                }
                const lab = labHandoffForSet(run.brand_id, run.product_id, run.notes);
                if (lab)
                    src.creative_lab_handoff = lab;
                return src;
            };
            const brandAbout = `${run.notes} ${todo.map((it) => `${it.label} ${it.direction}`).join(" ")}`;
            const brandStable = () => lean
                ? JSON.stringify({ brand: ctx.brand, language: ctx.language, ...(strict ? { guardrails: ctx.guardrails, forbidden_claims: ctx.forbidden_claims } : {}), note: "The offers, the claims and the buyers are not sent: the script in the notes states every fact, figure and offer term this ad may use." })
                : JSON.stringify(withBrain(run.brand_id, without(brandSource(), ["offers", "guarantee"]), brandAbout, { forWriter: true, dealt: run.kind === "ad" }));
            const brandForWords = () => {
                if (lean)
                    return brandStable();
                const src = brandSource();
                const brain = (withBrain(run.brand_id, {}, brandAbout, { forWriter: true, dealt: run.kind === "ad" }) as {
                    from_the_brand_brain?: Record<string, unknown>;
                }).from_the_brand_brain;
                return JSON.stringify({ brand: ctx.brand, language: ctx.language, forbidden_claims: ctx.forbidden_claims, ...(src.bound_evidence ? { bound_evidence: src.bound_evidence } : {}), ...(src.creative_lab_handoff ? { creative_lab_handoff: src.creative_lab_handoff } : {}), ...(strict ? { approved_claims: src.approved_claims, guardrails: ctx.guardrails } : {}), ...(brain?.guardrails ? { from_the_brand_brain: { guardrails: brain.guardrails } } : {}), note: "The brand's wider facts and the buyers' sheets are not sent again: the plan fixed each item's argument and facts, and the product block below is the product." });
            };
            const brandBatch = (visual: boolean, offer: ContextPlan["text"]["offer"]): string => {
                const src = brandSource();
                const light = Array.isArray(src.offers) ? (src.offers as Record<string, unknown>[]).map((x) => ({ id: x.id, name: x.name, what: x.includes ?? x.what ?? x.notes ?? "" })) : undefined;
                const offerPart = lean ? {} : offer === "full" ? { offers: src.offers, guarantee: src.guarantee } : offer === "light" && light ? { offers: light, offer_note: "The offer is sent lightly: what it is. Its price, discount and deadline are not sent, and are not written." } : {};
                const o = { ...offerPart, ...(visual ? { imagery_style: ctx.imagery_style, visual_do: ctx.visual_do, visual_avoid: ctx.visual_avoid } : {}) };
                return Object.keys(o).length ? JSON.stringify(o) : JSON.stringify({ note: "Nothing further: no offer is stated in these, and the brand block above is complete." });
            };
            const rulesOfVoice = `## Writing rules for every word a customer reads (each is checked afterwards)\n${voiceRulesText(getSetting(run.brand_id, "voice"), false)}`;
            const voicePacks = new Map<string, ReturnType<typeof brandVoicePack>>();
            const voiceFor = (surfaces: Surface[]) => {
                const key = surfaces.join(",");
                if (!voicePacks.has(key))
                    voicePacks.set(key, brandVoicePack(run.brand_id, brand, [], level === "full" ? { surfaces, personaIds: buyersIn(todo), ...asTone } : { level, personaIds: buyersIn(todo), surfaces, ...asTone }));
                return voicePacks.get(key)!;
            };
            const voiceBlockFor = (p: ContextPlan, surfaces?: Surface[]) => `${(p.text.voice === "basics" ? voiceBasics : surfaces ? voiceFor(surfaces) : voice).text}\n\n${rulesOfVoice}`;
            const researchFor = (p: ContextPlan, batch: StudioItem[]) => (lean ? "(Not sent: the script was written from the customers' words.)" : p.text.customerWords === "none" ? "(Not sent: these pictures carry no words.)" : level === "full" ? researchText(run.brand_id) : researchText(run.brand_id, level === "minimal" ? 4 : 6, level === "minimal" ? 1 : 2, `${run.notes} ${batch.map((it) => `${it.label} ${it.direction}`).join(" ")}`));
            const dealtOn = run.kind === "ad" && !lean;
            const researchSection = (p: ContextPlan, batch: StudioItem[]) => (dealtOn ? "" : `## Research: what customers say (theme id, summary, their words)\n${researchFor(p, batch)}`);
            const pools = dealtOn ? poolsOfSet(run, brand) : null;
            const handsFor = (planned: boolean): DealtHand[] => (pools ? handsOfSet(run, brand, pools, planned) : []);
            let handsAtPlan: DealtHand[] | null = null;
            let spentLines: string[] | null = null;
            const spentPictures = (): string[] => (spentLines ??= spentOnPictures(run.brand_id, brand));
            const saidAround = (waiting: StudioItem[], first: string[] = []): string[] => siblingPhrases({ first, others: run.items.filter((x) => x.plan && !waiting.includes(x)).flatMap((x) => saidOn(x.plan!.text_elements)), spent: spentPictures(), most: SAID_MOST });
            const ledAround = (waiting: StudioItem[]): string[] => [...new Set(run.items.filter((x) => x.plan && !waiting.includes(x)).flatMap((x) => ledWith(x.plan!.text_elements)))].slice(0, LED_MOST);
            const ledUnder = (batch: StudioItem[], waiting: StudioItem[] = batch): string[] => (batch.length > 1 ? [] : ledAround(waiting));
            const saidAbove = (batch: StudioItem[], waiting: StudioItem[] = batch): string => {
                const lines = dealtOn && batch.length > 1 ? [saidLine(saidAround(waiting)), ledLine(ledAround(waiting))].filter(Boolean) : [];
                return lines.length ? `${lines.join("\n")}\n\n` : "";
            };
            const saidUnder = (batch: StudioItem[], first: string[] = [], waiting: StudioItem[] = batch): string[] => (batch.length > 1 ? first : saidAround(waiting, first));
            const dealtFor = (it: StudioItem, hands: DealtHand[], siblings: string[], led: string[] = []): string => {
                if (!dealtOn)
                    return "";
                const block = dealtBlock(hands[run.items.indexOf(it)], { siblings, themeId: strict, led });
                return block ? `\n${block}` : "";
            };
            const wordless = (it: StudioItem) => planOf(it).text.customerWords === "none" && !feedCopyOn(run);
            const dealtAtPlan = (batch: StudioItem[], it: StudioItem): string => (wordless(it) ? "" : dealtFor(it, (handsAtPlan ??= handsFor(false)), saidUnder(batch), ledUnder(batch)));
            const saidAbovePlan = (batch: StudioItem[]): string => (batch.every(wordless) ? "" : saidAbove(batch));
            const review = run.kind === "ad" && !!lockedPhrase(run.notes) && run.items.some((it) => archetypeOf(it.archetype)?.funnel === "review");
            const bank = run.kind === "ad" && isBank(run.notes);
            const kindRules = `${lean ? SCRIPT_AD_RULES : feedCopyOn(run) || run.kind !== "ad" ? KIND_RULES[run.kind] : KIND_RULES.ad.replace(AD_COPY_RULE, "")}${review ? `\n\n${REVIEW_AD_RULES}` : ""}${bank ? `\n\n${OFFER_BANK_RULES}` : ""}${run.context.claims_cut?.length ? `\n\n${cutRule(run.context.claims_cut)}` : ""}`;
            const setStage = stageFor(run);
            const planRules = run.kind === "ad" ? `${kindRules}\n${productPlanRule(run)}${setStage ? `\n- Every ad of this set is for a ${setStage.replace("_", " ")} buyer: \`awareness\` is "${setStage}".` : ""}${run.context.sprint || tasteOf(run).spread === "openings" ? "" : `\n- A set is looked at side by side. 2 ads count as 2 only when they differ on at least ${MUST_DIFFER} of these 5: ${PICTURE_AXES.join(", ")}. A new colour or a new prop is not a difference. So no 2 ads you plan here share 4 of the 5.`}` : `${kindRules}\n- **The product in the picture.** ${productFrameRule(planFor(run).taste.product)} \`product_spot\` says where it sits, in a few words.`;
            const sourceField = strict ? '`source` is the claim id, offer id, theme id or "label" a fact came from, or "" for plain words.' : '`source` is "" (sources are not checked on this set).';
            const alreadyPlanned = (p: ContextPlan, batch: StudioItem[]) => {
                if (run.kind !== "ad" || run.context.sprint || p.text.siblings !== "briefs")
                    return "";
                const earlier = run.items.filter((it) => it.plan && !batch.includes(it)).map(pictureLine).filter(Boolean);
                if (!earlier.length)
                    return "";
                return `**Already planned in this set, by other calls** (${PICTURE_AXES.join(", ")}):\n${earlier.map((x) => `- ${x}`).join("\n")}\nAn ad you plan now differs from each of these on at least ${MUST_DIFFER} of the 5. A new colour or a new prop is not a difference. A reference followed EXACT or STRUCTURE keeps its own camera and light: change what the reference leaves open.`;
            };
            const callPlanner = async (items: StudioItem[], mustFix?: Map<string, string[]>) => {
                for (const batch of batchesBy(items, planOf, 6, routeFor(mustFix ? "studio_plan_revise" : lean ? "studio_plan_script" : "studio_plan", { model: env.MODEL_COPY, maxTokens: 24000 }).maxTokens ?? 24000, { brandId: run.brand_id, stage: "plan" })) {
                    const plan = planOf(batch[0]);
                    const noProduct = plan.attach.productPhotos === "none" || !imgs.hero;
                    const files = noProduct ? [] : [imgs.hero!];
                    const range = isWholeBrand(run.product_id) && !noProduct ? rangePhotos(l) : null;
                    const legendLines = [noProduct ? "(No product photo is attached: the product is not in these pictures.)" : range ? `1. ${range[0].name}: a real photo of 1 of the products that stand for the brand.` : `1. The product ${VIEW_INFO[imgs.views[0]?.view ?? "other"].is}: a real photo of it. The product photos say what the product is (its shape, colours, label and wording), and that never changes. How it is seen in each image is yours to plan.`];
                    for (const r of range?.slice(1) ?? [])
                        legendLines.push(`${files.push(r.file)}. ${r.name}: a real photo of another product of the brand.`);
                    if (!noProduct && !range)
                        for (const v of imgs.views.slice(1, MAX_PRODUCT_PHOTOS))
                            legendLines.push(`${files.push(v.file)}. The same product ${VIEW_INFO[v.view].is}: a real photo. A view the photos show can be planned large. A view none of them shows cannot.`);
                    const ownLook = allLooks.slice(0, lookCount(plan));
                    for (const f of ownLook)
                        legendLines.push(`${files.push(f)}. An image ${brand.brand.name} designed itself: how this brand dresses an image (its colours, how its type sits, how much it says, its mood). Plan every image so it belongs beside this one. Its words and its layout are not yours to reuse.`);
                    for (const f of ownRuns)
                        legendLines.push(`${files.push(f)}. An image ${brand.brand.name} already runs. It is here for 1 thing: read its form into \`forms_used\`. It is not a look to match and not a layout to follow.`);
                    const numbers = new Map<string, {
                        frame?: number;
                        ref?: number;
                    }>();
                    for (const it of batch) {
                        const n: {
                            frame?: number;
                            ref?: number;
                        } = {};
                        const ref = it.ref_id ? l.refs.get(it.ref_id) : undefined;
                        const itsPlan = planOf(it);
                        const hasRef = !!ref && fs.existsSync(refFile(ref)) && (itsPlan.attach.referenceImage || itsPlan.text.referenceDescription === "detailed");
                        const follows = hasRef && followsReference(fidelityOfPlan(itsPlan, true) ?? "loose");
                        const frame = run.kind === "pdp" && it.bucket && !follows && itsPlan.taste.look !== "new" ? templateFrame(it.bucket) : null;
                        if (frame) {
                            n.frame = files.push(frame);
                            legendLines.push(`${n.frame}. Template wireframe for ${it.id} (${it.label}): structure only.`);
                        }
                        if (ref && hasRef) {
                            n.ref = files.push(refFile(ref));
                            legendLines.push(`${n.ref}. The reference for ${it.id} (${it.label})${follows ? ": read it first, then plan the image as it" : ""}.`);
                        }
                        numbers.set(it.id, n);
                    }
                    const draft = (it: StudioItem) => {
                        const fix = mustFix?.get(it.id);
                        if (!fix?.length || !it.plan)
                            return "";
                        const d = it.plan;
                        return `\n\nYOUR FIRST DRAFT of ${it.id} was read by a reviewer and a compliance reader. Write it again so every point under "Must fix" is resolved. Keep what was not criticised. Never resolve a point by inventing a fact, a number, a quote or an offer term: if the brand's material does not have it, cut the line or argue something the brand can prove.\nFirst draft: ${JSON.stringify({ buyer: d.buyer, awareness: d.awareness, argument: d.argument, scene: d.scene, layout: d.layout, text_elements: d.text_elements, ad_copy: d.ad_copy })}\nMust fix:\n${fix.map((x) => `- ${x}`).join("\n")}`;
                    };
                    const p = renderPrompt("studio-plan", {
                        selling_principles: run.kind === "photoshoot" ? "" : sellingText("planning"),
                        kind_label: KIND_INFO[run.kind].noun,
                        brand_name: brand.brand.name,
                        kind_rules: dealtOn && todo.every(wordless) ? planRules.replace(`${OWN_MATERIAL_RULE}\n`, "") : planRules,
                        claim_rules: claimRules(strict),
                        source_field: sourceField,
                        skill: `${skill.text}${fmt?.planner ?? ""}${run.kind === "ad" ? `\n\n${staticTemplateMethod("Plan")}` : ""}${review ? `\n\n${skillFor("review-ads", "focused")}` : ""}${bank ? `\n\n${skillFor("offer-ad-bank", "focused")}` : ""}`,
                        copy_craft: craftText(CRAFT_FOR_SET[run.kind] ?? []),
                        ad_copy_field: run.kind === "ad" ? (feedCopyOn(run) ? `${AD_COPY_FIELD}${l.script ? SCRIPT_COPY_FIELD : ""}` : AD_COPY_FIELD.split("\n").slice(0, 2).join("\n")) : "",
                        brand_context: brandStable(),
                        brand_batch: brandBatch(plan.text.brandLook === "full" || run.kind === "photoshoot", Math.max(...batch.map((it) => ["none", "light", "full"].indexOf(offerOf(planOf(it), it)))) === 2 ? "full" : batch.some((it) => offerOf(planOf(it), it) === "light") ? "light" : "none"),
                        brand_own: lean ? "(Not sent: the script is the source.)" : stablePack ? JSON.stringify(packFor(batch)!.own) : "(nothing further: the brand block above is complete)",
                        product: JSON.stringify(guide.handling_notes ? { ...guide, handling_notes: `${HANDLING_FOR_PICTURE} ${guide.handling_notes}` } : guide),
                        look: plan.text.brandLook === "none" ? JSON.stringify({ note: "Not sent: these pictures carry no brand design. No brand colours, no brand typefaces, no logo." }) : JSON.stringify(level === "full" ? (lookContext(l.look) ?? { note: "The brand's site has not been scanned. Use the brand's colours from the product photo and keep type plain." }) : { summary: lookFingerprint(l.look) || "Not scanned: take colours from the product photo and keep type plain." }),
                        research: researchSection(plan, batch),
                        brand_voice: voiceBlockFor(plan),
                        lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: level === "minimal" ? ["words"] : ["words", "pictures"], format: lessonFormat(l) }) || "(none yet)",
                        notes: run.notes || "(none)",
                        choices: [choicesText(plan, batch, ownLook.length), alreadyPlanned(plan, batch)].filter(Boolean).join("\n\n"),
                        image_legend: legendLines.join("\n"),
                        items: saidAbovePlan(batch) + batch.map((it) => refBrief(run.kind, it, it.ref_id ? l.refs.get(it.ref_id) : undefined, numbers.get(it.id) ?? {}, l.script?.briefs.get(it.id), planOf(it), lookDropsLayout(run, it)) + (run.kind === "ad" ? `\nTemplate contract: ${templateContractFor(l, it)}${templateFindings.filter((f) => f.line_index === run.items.indexOf(it)).map((f) => `\nEvidence gap: ${f.message}`).join("")}` : "") + studioPortfolioDirective(run.brand_id, run.id, run.items.indexOf(it)) + exampleFor(it, planOf(it), false) + heroLineOf(it) + formLineOf(it) + handOf(it) + dealtAtPlan(batch, it) + (budgetLineOf(bare(it)) ? `\n${budgetLineOf(bare(it))}` : "") + draft(it)).join("\n\n"),
                    });
                    recordReferenceUse(run.brand_id, batch.filter((it) => it.ref_id && sendsReference(planOf(it))).map((it) => it.ref_id!), `studio:${run.id}`);
                    const out = await geminiJson({ brandId: run.brand_id, task: mustFix ? "studio_plan_revise" : lean ? "studio_plan_script" : "studio_plan", model: env.MODEL_COPY, pin: !routed, system: p.system, user: p.user, schema: PlanOut, images: files, effort: "high", maxTokens: 24000, ...(routed ? { resultBudget: { profile: "static-plan" as const, items: batch.length, ...(feedCopyOn(run) && l.script ? { textTokens: batch.length * 2400 } : {}) } } : {}), ...(run.kind === "photoshoot" ? {} : { temperature: plan.temperature }), ...ledger });
                    observeStructuredItems(run.brand_id, "plan", out.items);
                    planned.push(...out.items);
                    applyPlans(batch);
                    save(run);
                }
            };
            const planned: z.infer<typeof ItemOut>[] = [];
            const applyPlans = (items: StudioItem[]) => {
                for (const item of items) {
                    const o = planned.find((x) => ownId(x.id, [item.id]) === item.id);
                    if (!o)
                        continue;
                    planned.splice(planned.indexOf(o), 1);
                    const awareness = run.kind === "ad" ? (stageFor(run, bare(item)) ?? o.awareness) : undefined;
                    const itsForm = run.kind === "ad" ? formId(o.form) || dealtFormOf(item) : "";
                    const itsPlan = itemPlan(l, itsForm ? { ...bare(item), dealt_form: itsForm } : bare(item), awareness);
                    plans.set(item.id, itsPlan);
                    const stop: ProductStop = itsPlan.taste.product;
                    const fid = fidelityOfPlan(itsPlan, !!item.ref_id);
                    const read = fid === "structure" ? structureText(o.reference_structure) || stripColours((o.reference_read ?? "").trim()) : (o.reference_read ?? "").trim();
                    const typed = itsPlan.text.pictureWords === "none" || run.kind === "photoshoot" ? [] : cleanTexts(o.text_elements);
                    const texts = itsPlan.text.pictureWords === "headline" ? typed.filter((t, i, all) => t === (all.find((x) => x.role === "headline") ?? all[0])) : typed;
                    const freeFrame = run.kind === "pdp" && !!item.bucket && itsPlan.taste.look === "new";
                    item.plan = { title: o.title, argument: o.argument, scene: o.scene, layout: run.kind === "photoshoot" ? "" : o.layout, text_elements: texts, prompt: "", adaptation: o.adaptation, watch_outs: o.watch_outs, alt_text: o.alt_text, ...(item.ref_id && read && fid && followsReference(fid) ? { reference_read: read.slice(0, 2400) } : {}), ...(texts.length && itsPlan.attach.logo && !l.script && stop !== "none" && (o.logo ?? "").trim() && !/^(none|no|n\/a|false)\b/i.test((o.logo ?? "").trim()) ? { logo: (o.logo ?? "").trim().slice(0, 120) } : {}), ...(feedCopyOn(run) && o.ad_copy && !(l.script?.carousel && item !== run.items[0]) ? { ad_copy: adCopyOf(o.ad_copy) } : {}), ...(run.kind === "ad" && formId(o.form) ? { form: formId(o.form), forms_used: formsUsed(formsBefore, o.forms_used ?? []) } : {}), ...(freeFrame && pdpFormId(o.form) ? { form: pdpFormId(o.form), forms_used: (o.forms_used ?? []).map(pdpFormId).filter(Boolean) } : {}), ...(run.kind === "ad" && o.picture && (o.picture.setting || o.picture.light || o.picture.camera) ? { picture: { setting: o.picture.setting.trim().slice(0, 40), light: o.picture.light.trim().slice(0, 40), camera: o.picture.camera.trim().slice(0, 40) } } : {}), ...(run.kind === "ad" && o.buyer ? { buyer: buyerId(o.buyer, brand) } : {}), ...(awareness ? { awareness } : {}), product: placeOfStop(stop), product_stop: stop, ...(stop === "hero" && run.kind === "ad" ? { hero: heroOf(run, bare(item))!.id } : {}), ...(stop !== "none" && (o.product_spot ?? "").trim() ? { product_spot: (o.product_spot ?? "").trim().slice(0, 160) } : {}) };
                    const face = (o.expression ?? "").trim();
                    if (run.kind === "ad" && face && !/^(none|no face|no|n\/a|empty)\b/i.test(face))
                        item.plan.expression = face.slice(0, 260);
                    if (notices().length)
                        item.plan.disclosures = notices();
                    if (itsForm && !planForm(item.plan))
                        Object.assign(item.plan, { form: itsForm });
                    holdToBudget(item, itsPlan.text.pictureWords, o.words_budget, false);
                    checkPerson(item);
                    item.status = "planned";
                    item.error = undefined;
                }
            };
            const wordsSkill = studioWordsSkill(run.kind, lean ? "minimal" : level);
            const stageOf = (d: {
                awareness?: string;
            } | undefined) => asStage(d?.awareness);
            const writesFeed = (batch: StudioItem[]) => feedCopyOn(run) && batch.some((i) => i.plan?.ad_copy);
            const statesOffer = (batch: StudioItem[]) => writesFeed(batch) || batch.some((i) => (i.plan?.text_elements ?? []).some((t) => /offer|price|deal|discount|guarantee|cta|button/i.test(t.role)));
            const wordsRules = run.kind === "ad" ? `${WORDS_RULES_AD}${bank ? `\n\n${OFFER_BANK_RULES}` : ""}${run.context.claims_cut?.length ? `\n\n${cutRule(run.context.claims_cut)}` : ""}` : kindRules;
            const WITH_FEED = { customerWords: "full", voice: "full" } as const;
            const wordsGuide = JSON.stringify(without(guide, ["handling", "handling_notes"]));
            const counted = countedOf(brand, run.product_id);
            let craftWords = 0;
            const writeWords = async (items: StudioItem[], found?: Map<string, string[]>, textsOnly = false, said?: Record<string, string[]>, again?: Map<string, string>) => {
                const craft = wordsSkill.text;
                const withWords = items.filter((i) => i.plan && (i.plan.text_elements.length || (i.plan.ad_copy && !textsOnly)));
                if (!craft || !withWords.length)
                    return;
                const hands = handsFor(true);
                let nowWriting: StudioItem[] = withWords;
                let waiting: StudioItem[] = withWords;
                const brief = (it: StudioItem) => {
                    const d = it.plan!;
                    return [
                        `### ${it.id}: ${it.label}`,
                        d.buyer || d.awareness ? `For: ${[d.buyer, d.awareness].filter(Boolean).join(", ")}` : "",
                        `The user's direction: ${it.direction || "(none)"}`,
                        `argument: ${d.argument}`,
                        d.picture && (d.picture.setting || d.picture.light || d.picture.camera) ? `picture (fixed): ${[d.picture.setting, d.picture.light, d.picture.camera].filter(Boolean).join("; ")}` : "",
                        run.kind === "ad" ? `Template contract: ${templateContractFor(l, it)}` : "",
                        exampleFor(it, planOf(it), true),
                        dealtFor(it, hands, saidUnder(nowWriting, said?.[it.id], waiting), ledUnder(nowWriting, waiting)).trim(),
                        wordLimits(run, it, planOf(it)),
                        d.text_elements.length ? budgetLineOf(it, d.awareness ?? stageFor(run, it)) : "",
                        d.text_elements.length ? "slots (role | where it sits | max):" : "slots: none, this image carries no words",
                        ...d.text_elements.map((t, i) => `${i + 1}. ${t.role} | ${t.placement || "-"} | ${PLACEHOLDER.test(t.text) ? `keep ${JSON.stringify(t.text)}` : `max ${slotRoom(t.text, t.role)} characters${mayBeEmpty(t.role) ? ", or empty" : ""}`}`),
                        d.ad_copy && !textsOnly ? (isStoryStage(stageOf(d)) ? "feed copy: write the headline, the 3 further headlines, the description and the button. Its long primary text is written in the next step: give only its first 2 or 3 sentences here" : "feed copy: write it") : "",
                        found?.get(it.id)?.length ? `Found on the last version of this image. Do not repeat any of it:\n${found.get(it.id)!.map((x) => `- ${x}`).join("\n")}` : "",
                        again?.get(it.id) ?? "",
                    ]
                        .filter(Boolean)
                        .join("\n");
                };
                const kept: string[] = [];
                try {
                    for (const batch of batchesBy(withWords, planOf, 6, routeFor("studio_words", { model: env.MODEL_COPY, maxTokens: 16000 }).maxTokens ?? 16000, { brandId: run.brand_id, stage: "words" })) {
                        const plan = planOf(batch[0]);
                        nowWriting = batch;
                        const moved = tasteOf(run, batch[0]).length;
                        const caption = feedCopyOn(run) && moved ? decide({ surface: "caption", stage: stageFor(run, batch[0]) }, { length: moved }) : null;
                        const forWords: ContextPlan = { ...plan, skillPath: [...plan.skillPath.filter((s) => /\/(sell|words|spread)\//.test(s)), ...(caption?.skillPath.filter((s) => s.includes("/length/")) ?? [])], notes: [...plan.notes, ...(caption && LENGTH[caption.taste.length].note ? [`The feed copy: ${LENGTH[caption.taste.length].note}`] : [])] };
                        const p = renderPrompt("studio-words", {
                            kind_label: KIND_INFO[run.kind].noun,
                            brand_name: brand.brand.name,
                            kind_rules: lean ? `${kindRules}\n${SCRIPT_WORDS_RULE}` : review ? `${wordsRules}\n${REVIEW_WORDS_RULE}` : wordsRules,
                            claim_rules: claimRules(strict),
                            source_field: sourceField,
                            copy_craft: `${craft}${fmt?.words ?? ""}${run.kind === "ad" ? `\n\n${staticTemplateMethod("Words")}` : ""}`,
                            ad_copy_field: feedCopyOn(run) && !textsOnly ? `${AD_COPY_FIELD.split("\n").slice(2).join("\n")}${l.script ? SCRIPT_COPY_FIELD : ""}` : "",
                            brand_context: brandForWords(),
                            brand_batch: statesOffer(batch) ? brandBatch(false, run.context.no_offer ? "none" : batch.some((it) => planOf(it).text.offer === "full") ? "full" : plan.text.offer) : JSON.stringify({ note: "No offer is sent: no slot of these items states an offer or a price." }),
                            brand_own: lean ? "(Not sent: the script is the source.)" : stablePack ? JSON.stringify(packFor(batch)!.own) : "(nothing further: the brand block above is complete)",
                            product: wordsGuide,
                            counted: counted.block,
                            research: researchSection(caption ? { ...plan, text: { ...plan.text, customerWords: caption.text.customerWords } } : writesFeed(batch) ? { ...plan, text: { ...plan.text, customerWords: WITH_FEED.customerWords } } : plan, batch),
                            brand_voice: voiceBlockFor(writesFeed(batch) ? { ...plan, text: { ...plan.text, voice: WITH_FEED.voice } } : plan, writesFeed(batch) ? undefined : ["on_image"]),
                            floor: floorText(),
                            terms_rule: termsByStageLine(getSetting(run.brand_id, "voice").terms),
                            headline_rule: headlinesByStageLine(),
                            lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: ["words"], format: lessonFormat(l), wordsOnly: true }) || "(none yet)",
                            notes: run.notes || "(none)",
                            choices: tasteBlock(forWords, { always: true }) || "(none: every lever is where this kind of piece starts)",
                            items: `${saidAbove(batch, waiting)}${batch.map(it => brief(it) + studioPortfolioDirective(run.brand_id, run.id, run.items.indexOf(it))).join("\n\n")}`,
                        });
                        const textTokens = feedCopyOn(run) && !textsOnly ? batch.reduce((n, it) => {
                            const stage = stageOf(it.plan);
                            return n + (stage && !isStoryStage(stage) ? PRIMARY_WORDS[stage][1] * 2 : 400) + (l.script ? 2400 : 0);
                        }, 0) : 0;
                        const out = await geminiJson({ brandId: run.brand_id, task: "studio_words", model: env.MODEL_COPY, pin: !routed, system: p.system, user: p.user, schema: WordsOut, effort: "high", maxTokens: 16000, ...(routed ? { resultBudget: { profile: "static-words" as const, items: batch.length, textTokens, verbatim: batch.flatMap((it) => it.plan!.text_elements.filter((t) => PLACEHOLDER.test(t.text)).map((t) => t.text)) } } : {}), temperature: plan.temperature, ...ledger });
                        observeStructuredItems(run.brand_id, "words", out.items);
                        for (const item of batch) {
                            const o = out.items.find((x) => ownId(x.id, [item.id]) === item.id);
                            if (o && applyWords(item.plan!, textsOnly ? { ...o, ad_copy: undefined } : o, strict))
                                craftWords++;
                            else
                                kept.push(item.id);
                            holdToBudget(item, planOf(item).text.pictureWords, undefined, false);
                        }
                        waiting = waiting.filter((x) => !batch.includes(x));
                        save(run);
                    }
                    const n = withWords.length - kept.length;
                    note(run, `Words ${textsOnly ? "on the picture written again after a check" : "written again with the copy craft"} for ${n} image${n === 1 ? "" : "s"} by ${routed ? modelOf("studio_plan", env.MODEL_COPY) : env.MODEL_COPY}${kept.length ? `. ${kept.join(", ")} kept the first draft: the new words did not fit the layout` : ""}`);
                }
                catch (e) {
                    if (e instanceof RunStoppedError)
                        throw e;
                    note(run, `The words pass with the copy craft didn't run: ${(e as Error).message.slice(0, 120)}. The first draft's words are kept.`);
                }
            };
            const FeedOut = z.object({ primary_text: z.string().min(200) });
            const feedMethods = new Set<string>();
            const writeFeed = async (items: StudioItem[]) => {
                const long = items.filter((i) => i.plan?.ad_copy && isStoryStage(stageOf(i.plan)));
                if (!long.length || !feedCopyOn(run) || lean)
                    return;
                const level = getSetting(run.brand_id, "voice");
                const offerSaid = /The offer these state/i.test(run.notes);
                const wordsIn = (s: string) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
                const told = run.items.filter((i) => i.plan?.ad_copy && isStoryStage(stageOf(i.plan)));
                const rowsOf = new Map(told.map((i) => [i.id, researchRows(run.brand_id, 10, 3, `${i.plan!.argument} ${i.direction} ${run.notes}`)] as const));
                const recent = recentTexts(run.brand_id);
                const seeds = dealSeeds({ count: told.length, seed: run.brand_id, start: deckStart(run.id), quotes: told.map((i) => (rowsOf.get(i.id) ?? []).map((r) => ({ theme: r.label, quote: r.quotes[0] }))), ...worldFor(run.brand_id), spent: spentFor(run.brand_id, brand, [], recent) });
                const one = async (it: StudioItem) => {
                    const d = it.plan!;
                    const c = d.ad_copy!;
                    const stage = stageOf(d)!;
                    const at = told.indexOf(it);
                    const rows = rowsOf.get(it.id) ?? [];
                    const siblings = told.filter((x) => x !== it).map((x) => x.plan!.ad_copy!.primary_text).filter((t) => wordsIn(t) > 150);
                    const seed = [seedBlock(seeds, at), spentLine(spentFor(run.brand_id, brand, siblings, recent))].filter(Boolean).join("\n\n");
                    const about = [`For: ${[d.buyer, stage.replace("_", " ")].filter(Boolean).join(", ")}`, `What the ad argues: ${d.argument}`, it.direction ? `The direction given for it: ${it.direction}` : ""].filter(Boolean).join("\n");
                    const ask = async (redo: string) => {
                        const p = studioFeedPrompt({
                            brand_name: brand.brand.name,
                            floor: floorText(),
                            length: primaryLengthText(stage),
                            product_rule: stage === "unaware"
                                ? "It is not named, shown or hinted at before the last fifth of the text. Then it comes in as the next thing this person did: named once or twice, said to be what it is in 1 plain sentence, with at most 1 fact."
                                : "It is not named in the first two thirds. Then it arrives as the way from where this person is to where they want to be: what it is in 1 plain sentence, what changed for them, and at most 2 facts.",
                            terms_rule: termsRule(stage, level.terms),
                            offer_rule: offerSaid ? "The notes state the offer for this ad. Say it once, exactly as given, with its conditions, in the last part. Nowhere earlier." : stage === "unaware" ? "No price, no discount, no deadline. The next step is to take a look." : "No price and no discount. The brand's guarantee may be said once, exactly as the product block gives it, where it answers this person's last doubt.",
                            language: languageLine(brand),
                            brand_voice: brandVoiceText(run.brand_id, { surfaces: ["primary_text"], personaIds: d.buyer ? [d.buyer] : [], brand, story: true, long: true }),
                            voice_rules: voiceRulesText(level, false, true),
                            lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: ["words"], format: lessonFormat(l), wordsOnly: true }) || "(none yet)",
                            about,
                            picture: [`Scene: ${d.scene}`, d.text_elements.length ? `Words on it: ${d.text_elements.map((t) => `${t.role}: "${t.text}"`).join("; ")}` : "It carries no words.", wordLimits(run, it, planOf(it))].filter(Boolean).join("\n"),
                            headlines: [c.headline, ...(c.more?.headlines ?? [])].map((h) => `- ${h}`).join("\n"),
                            product: wordsGuide,
                            counted: counted.block,
                            research: researchLines(rotated(rows, Math.max(0, rows.findIndex((r) => r.label === seeds[at]?.theme)))),
                            seed,
                            notes: run.notes || "(none)",
                            redo,
                        }, contextLevel("studio_feed"), stage);
                        const out = await geminiJson({ brandId: run.brand_id, task: "studio_feed", model: env.MODEL_COPY, pin: !routed, system: p.system, user: p.user, schema: FeedOut, effort: "high", maxTokens: 12000, ...(routed ? { resultBudget: { profile: "static-feed" as const, items: 1, textTokens: PRIMARY_WORDS[stage][1] * 2 } } : {}), temperature: planOf(it).temperature, ...ledger });
                        p.used.forEach((method) => feedMethods.add(method));
                        return out.primary_text.trim();
                    };
                    let text = await ask("");
                    const off = lengthFault(text, stage);
                    if (off) {
                        const extension = contextLevel("studio_feed") === "full"
                            ? " More of what this person does to live with the problem, each fix they tried and why it let them down, and what it goes on costing them: scenes, not summary."
                            : " Develop the current brief's illustrative scenes, practical friction, supported tradeoffs, objections and explanation. Keep the same conditional or brand-authored perspective; add no invented customer history, first use or personal product results.";
                        const again = await ask(`## Your last answer was not the length this buyer needs\n${off.why}${off.side === "short" ? extension : ""}`);
                        if (!lengthFault(again, stage) || (off.side === "short" ? wordsIn(again) > wordsIn(text) : wordsIn(again) < wordsIn(text)))
                            text = again;
                    }
                    c.primary_text = text;
                    return wordsIn(text);
                };
                let done = 0;
                const counts: number[] = [];
                for (let i = 0; i < long.length; i += 3) {
                    const got = await Promise.allSettled(long.slice(i, i + 3).map(one));
                    for (const g of got) {
                        if (g.status === "fulfilled")
                            counts.push(g.value), done++;
                        else if (g.reason instanceof RunStoppedError)
                            throw g.reason;
                        else
                            note(run, `A long primary text didn't get written: ${String((g.reason as Error)?.message ?? g.reason).slice(0, 120)}. The short one is kept.`);
                    }
                    save(run);
                }
                if (done)
                    note(run, `Long primary text written for ${done} ad${done === 1 ? "" : "s"} for a buyer high in the funnel (${counts.join(", ")} words) by ${routed ? modelOf("studio_feed", env.MODEL_COPY) : env.MODEL_COPY}`);
            };
            let heldNow: HeldMaterial | null = null;
            const heldOf = (): HeldMaterial => (heldNow ??= heldMaterial(brand, run.product_id, l.script ? run.notes.split(/\n+/).filter((x) => /\d/.test(x)) : []));
            let onFile: string[] | null = null;
            const sentBack = new Set<string>();
            const refitted = new Set<string>();
            const numbersOn = async (items: StudioItem[]) => {
                const mine = run.kind === "ad" ? items.filter((i) => i.plan?.text_elements.length) : [];
                if (!mine.length)
                    return;
                for (const it of mine) {
                    const q = settleQuotes(it.plan!.text_elements, (onFile ??= quotesOnFile(run.brand_id, brand)));
                    if (!q.notes.length)
                        continue;
                    Object.assign(it.plan!, { text_elements: q.texts, quote_notes: [...(it.plan!.quote_notes ?? []), ...q.notes] });
                    note(run, `${it.id}: ${q.notes.join(" ")}`);
                }
                const first = new Map(mine.map((it) => [it.id, figuresOn(it.plan!.text_elements, heldOf())] as const));
                const was = new Map(mine.map((it) => [it.id, it.plan!.text_elements.map((t) => ({ role: t.role, text: t.text }))] as const));
                const again = new Map<string, string>();
                const forFigure: string[] = [];
                const toFit: string[] = [];
                const overNow = (it: StudioItem) => {
                    const b = budgetOf(run, it, it.plan!.awareness ?? stageFor(run, it), planOf(it).text.pictureWords);
                    return b && b.words > 0 && isOver(it.plan!.text_elements, b) ? b : null;
                };
                for (const it of mine) {
                    if (it.plan!.copy_locked)
                        continue;
                    const bad = sentBack.has(it.id) ? [] : notFound(first.get(it.id)!);
                    const over = refitted.has(it.id) ? null : overNow(it);
                    if (!bad.length && !over)
                        continue;
                    const texts = it.plan!.text_elements;
                    again.set(it.id, againBlock(texts, [...bad.map((r) => figureAsk(r, texts.findIndex((t) => t.text === r.text) + 1, heldOf())), ...(over ? [budgetAsk(texts, over, isThread(it))] : [])], !over));
                    if (bad.length)
                        forFigure.push(it.id), sentBack.add(it.id);
                    if (over)
                        toFit.push(it.id), refitted.add(it.id);
                }
                if (again.size) {
                    await writeWords(mine.filter((it) => again.has(it.id)), undefined, true, undefined, again);
                    if (forFigure.length)
                        note(run, `A figure the brand's material does not hold was on ${forFigure.length} ad${forFigure.length === 1 ? "" : "s"} (${forFigure.join(", ")}): each went back to the writer once, and both versions are kept on the ad`);
                    if (toFit.length)
                        note(run, `Words over their ceiling on ${toFit.length} ad${toFit.length === 1 ? "" : "s"} (${toFit.join(", ")}): each was written again once to fit, before anything is taken off`);
                }
                const listed = new Map(mine.map((it) => [it.id, forFigure.includes(it.id) ? afterMend(first.get(it.id)!, was.get(it.id)!, it.plan!.text_elements, heldOf()) : relist(it.plan!.figures as FigureRow[] | undefined, it.plan!.text_elements, heldOf())] as const));
                for (const it of mine)
                    if (!it.plan!.copy_locked)
                        holdToBudget(it, planOf(it).text.pictureWords);
                for (const it of mine)
                    it.plan!.figures = listed.get(it.id)!.filter((r) => !!r.was || it.plan!.text_elements.some((t) => t.text === r.text));
                save(run);
            };
            const settleWords = async (items: StudioItem[]) => {
                try {
                    await numbersOn(items);
                }
                catch (e) {
                    if (e instanceof RunStoppedError)
                        throw e;
                    note(run, `The numbers on the ads could not be listed: ${(e as Error).message.slice(0, 120)}. The words stand as written.`);
                }
            };
            const points: AuditItem[] = [];
            const mendTwins = async (said: Record<string, string[]>) => {
                const mine = fresh.filter((i) => i.plan?.text_elements.length && !i.plan.copy_locked);
                for (const i of mine)
                    plans.set(i.id, itemPlan(l, { ...bare(i), dealt_form: planForm(i.plan) || i.dealt_form }, run.kind === "ad" ? (stageFor(run, bare(i)) ?? i.plan!.awareness) : undefined));
                const before = new Map(mine.map((i) => [i.id, i.plan!.text_elements.map((t) => ({ role: t.role, text: t.text, placement: t.placement }))] as const));
                await writeWords(mine, undefined, true, said);
                await settleWords(mine.filter((i) => JSON.stringify(before.get(i.id)!.map((t) => t.text)) !== JSON.stringify(i.plan!.text_elements.map((t) => t.text))));
                const changed = mine.filter((i) => JSON.stringify(before.get(i.id)!.map((t) => t.text)) !== JSON.stringify(i.plan!.text_elements.map((t) => t.text)));
                if (changed.length)
                    points.push(...(await wordsCheck(l, changed)), ...(strict ? await judgeClaims(l, changed) : []));
                for (const i of changed) {
                    if (!i.plan!.prompt)
                        continue;
                    const swapped = swapWords(i.plan!.prompt, before.get(i.id)!, i.plan!.text_elements);
                    i.plan!.prompt = swapped.prompt;
                    if (swapped.clean)
                        delete i.plan!.prompt_stale;
                    else
                        i.plan!.prompt_stale = true;
                }
                points.push(...run.audit.filter((a) => JUDGED.includes(a.check) && a.line_index != null && fresh.includes(run.items[a.line_index]) && !changed.includes(run.items[a.line_index])));
                note(run, `Words written again for ${changed.length} of ${mine.length} ad${mine.length === 1 ? "" : "s"} found too close to another: 1 words call, no new plan`);
                save(run);
            };
            if (opts.mendWords)
                await mendTwins(opts.mendWords);
            if (fresh.length && !opts.mendWords) {
                const found = new Map<string, string[]>();
                for (const it of fresh) {
                    if (!it.plan)
                        continue;
                    const at = run.items.indexOf(it);
                    const onPlan = run.audit.filter((a) => a.line_index === at && a.status !== "pass" && a.check !== DISCLOSURE).map((a) => a.message.replace(/^Image \d+,?\s*/, ""));
                    const onPicture = lastFindings(it).map((x) => `The last picture made from this plan failed its check: ${x}`);
                    if (onPlan.length || onPicture.length)
                        found.set(it.id, [...onPlan, ...onPicture].slice(0, 12));
                }
                await callPlanner(fresh, found.size ? found : undefined);
                const missing = fresh.filter((i) => !i.plan);
                if (missing.length)
                    throw new Error(`The planner returned no plan for ${missing.map((i) => i.id).join(", ")}. Plan the set again.`);
                if (run.kind === "ad") {
                    const usedOf = (i: StudioItem) => (i.plan as {
                        forms_used?: string[];
                    } | undefined)?.forms_used ?? formsBefore;
                    const free = (i: StudioItem) => !(i.ref_id && followsReference(fidelityFor(run, i) ?? "loose"));
                    const off = new Map(fresh.filter(free).map((i) => [i.id, [formFault(lookToVariety(planOf(i).taste.look), planForm(i.plan), usedOf(i))].filter(Boolean)] as [
                        string,
                        string[]
                    ]).filter(([, f]) => f.length));
                    if (off.size) {
                        await callPlanner(fresh.filter((i) => off.has(i.id)), off);
                        note(run, `${off.size} plan${off.size === 1 ? " was" : "s were"} in a form the brand already runs and went back to the planner for a new one`);
                    }
                    const forms = fresh.filter((i) => planForm(i.plan)).map((i) => `${i.id} ${formLabel(planForm(i.plan)).toLowerCase()}`);
                    if (forms.length)
                        note(run, `Form of each ad (the brand already runs: ${formsUsed(...fresh.map(usedOf)).map((f) => formLabel(f).toLowerCase()).join(", ")}): ${forms.join("; ")}`);
                    const moved = fresh.filter((i) => formSaid(i) && planForm(i.plan) && planForm(i.plan) !== formSaid(i));
                    if (moved.length)
                        note(run, `Dealt 1 form and planned in another: ${moved.map((i) => `${i.id} was dealt ${formLabel(formSaid(i)).toLowerCase()} and is ${formLabel(planForm(i.plan)).toLowerCase()}`).join("; ")}`);
                }
                if (run.kind === "pdp") {
                    const free = fresh.filter((i) => i.bucket && planOf(i).taste.look === "new" && !(i.ref_id && followsReference(fidelityOfPlan(planOf(i), true) ?? "loose")));
                    const off = new Map(free.map((i) => [i.id, [pdpFormFault((i.plan as {
                                form?: string;
                            } | undefined)?.form ?? "", (i.plan as {
                                forms_used?: string[];
                            } | undefined)?.forms_used ?? [])].filter(Boolean)] as [
                        string,
                        string[]
                    ]).filter(([, f]) => f.length));
                    if (off.size) {
                        await callPlanner(fresh.filter((i) => off.has(i.id)), off);
                        note(run, `${off.size} frame${off.size === 1 ? "" : "s"} kept the usual layout and went back to the planner for a new one`);
                    }
                    if (free.length)
                        note(run, `New layout for ${free.map((i) => `${i.id} ${(i.plan as {
                            form?: string;
                        } | undefined)?.form ?? "?"}`).join("; ")}: the frame's job is kept, its wireframe is not sent`);
                }
                const warned = [...new Set(fresh.flatMap((i) => planOf(i).warnings))];
                for (const w of warned)
                    note(run, `Note: ${w}`);
                note(run, `Strategy and copy written for ${fresh.length} image${fresh.length === 1 ? "" : "s"} by ${routed ? modelOf("studio_plan", env.MODEL_COPY) : env.MODEL_COPY}`);
                save(run);
                const leftOut = fresh.filter((i) => placeOf(run, i) === "none").length;
                const behind = fresh.filter((i) => placeOf(run, i) === "background").length;
                if (leftOut || behind)
                    note(run, `The product in the picture (${tasteOf(run).product ? "your choice" : "decided by each ad's stage"}): ${[leftOut ? `left out of ${leftOut}, with no product photo sent` : "", behind ? `in the scene of ${behind}, small` : ""].filter(Boolean).join("; ")}`);
                await writeWords(fresh, found.size ? found : undefined);
                await writeFeed(fresh);
                if (lean)
                    note(run, "Cut from a script: the words on the picture are written from the script's lines by the craft writer. The brand's offers, claims, buyers and research are not sent again, and the copy pass runs only where a check finds a fault");
                if (opts.draftOnly) {
                    for (const it of fresh)
                        holdToBudget(it, planOf(it).text.pictureWords);
                    run.status = "planned";
                    save(run);
                    return;
                }
                const ownLines = brandOwnWords(run.brand_id);
                const faultsOf = (i: StudioItem) => pictureWordFaults(i.plan?.text_elements ?? [], ownLines);
                const asWritten = new Map(fresh.map((i) => [i.id, (i.plan?.text_elements ?? []).map((t) => t.text)] as const));
                const clean = new Map(fresh.map((i) => [i.id, new Set(faultsOf(i).map((f) => f.index))] as const));
                let readPoints: AuditItem[] = [];
                if (process.env.STUDIO_EDITORS === "on") {
                    if (!lean)
                        await copyEdit(l, fresh);
                    const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
                    const source = lean ? plain(run.notes) : "";
                    const BUTTON = /^(cta|button)$/i;
                    const newLines = fresh.flatMap((i) => i.plan?.text_elements ?? []).filter((t) => !BUTTON.test(t.role) && !source.includes(plain(t.text)));
                    if (!lean || newLines.length)
                        await voicePass(l, fresh);
                    else
                        note(run, "Brand voice check: not run. Every line on the picture is the script's own, which was checked with the script");
                }
                else
                    readPoints = await wordsCheck(l, fresh);
                for (const it of fresh) {
                    const was = asWritten.get(it.id) ?? [];
                    const texts = it.plan?.text_elements ?? [];
                    const undone = faultsOf(it).filter((f) => !clean.get(it.id)?.has(f.index) && was[f.index] && texts[f.index] && was[f.index] !== texts[f.index].text);
                    for (const f of undone)
                        texts[f.index].text = was[f.index];
                    if (undone.length)
                        note(run, `${it.id}: ${undone.length} edit${undone.length === 1 ? "" : "s"} taken back (${undone[0].what})`);
                }
                const faulty = new Map(fresh.map((i) => [i.id, faultsOf(i).map((f) => f.what)] as [
                    string,
                    string[]
                ]).filter(([, f]) => f.length));
                if (faulty.size) {
                    await writeWords(fresh.filter((i) => faulty.has(i.id)), faulty, true);
                    const left = fresh.filter((i) => faultsOf(i).length).length;
                    note(run, `Words on ${faulty.size} picture${faulty.size === 1 ? "" : "s"} went back to the writer (${[...faulty.values()][0][0]})${left ? `; ${left} still ${left === 1 ? "has" : "have"} it` : ""}`);
                }
                save(run);
                await settleWords(fresh);
                const claims = strict ? await judgeClaims(l, fresh) : [];
                const review = run.kind === "ad" && run.context.ad_review !== false ? await adReview(l, fresh) : [];
                const raised = (strict ? [...claims.filter((a) => a.status === "fail"), ...auditRun(run, brand).filter((a) => a.check === "quote_source")] : []).filter((a) => a.line_index != null && fresh.includes(run.items[a.line_index]));
                const mustFix = new Map<string, string[]>();
                for (const a of raised) {
                    const id = run.items[a.line_index!]?.id;
                    if (id)
                        mustFix.set(id, [...(mustFix.get(id) ?? []), a.message.replace(/^Image \d+, /, "")]);
                }
                const flagged = fresh.filter((i) => mustFix.has(i.id));
                if (mustFix.size)
                    run.context = { ...run.context, claims_cut: logCuts(run.context.claims_cut, [...mustFix].flatMap(([item, points]) => points.map((point) => ({ item, point })))) };
                const rewritten = new Set<string>();
                if (flagged.length) {
                    try {
                        await callPlanner(flagged, mustFix);
                        if (process.env.STUDIO_EDITORS === "on")
                            await voicePass(l, flagged);
                        else
                            readPoints = [...readPoints.filter((a) => a.line_index == null || !flagged.includes(run.items[a.line_index])), ...(await wordsCheck(l, flagged))];
                        await settleWords(flagged);
                        save(run);
                        for (const i of flagged)
                            rewritten.add(i.id);
                        note(run, `${raised.length} compliance point${raised.length === 1 ? "" : "s"} on ${flagged.length} image${flagged.length === 1 ? "" : "s"} went back to the writer, and ${flagged.length === 1 ? "it was" : "they were"} written again`);
                    }
                    catch (e) {
                        if (e instanceof RunStoppedError)
                            throw e;
                        note(run, `The rewrite after the claims read didn't run: ${(e as Error).message.slice(0, 120)}. The first draft is kept, with its points.`);
                    }
                }
                const still = (a: AuditItem) => a.line_index == null || !rewritten.has(run.items[a.line_index]?.id ?? "");
                points.push(...claims.filter(still), ...review.filter(still), ...readPoints);
                if (rewritten.size)
                    points.push(...(await judgeClaims(l, flagged)));
            }
            const needPrompt = todo.filter((i) => i.plan && !i.plan.prompt);
            if (needPrompt.length)
                await writePrompts(l, needPrompt);
            save(run);
            const needSense = todo.filter((i) => i.plan?.prompt && !i.plan.sense);
            if (needSense.length)
                await sensePass(l, needSense);
            save(run);
            judgedNow = { points, fresh };
            const learned = lessonsFor(run.brand_id, { productId: run.product_id, area: "pictures" }).length;
            run.context = { ...run.context, skills: [...skill.used, ...(run.kind === "ad" && staticTemplateMethod("Plan") ? [STATIC_TEMPLATE_METHOD] : []), ...(fmt?.used ?? []), ...(craftWords ? wordsSkill.used : []), ...feedMethods, ...studioPromptSkill(run.kind, contextLevel("studio_prompt")).used, "creative-lessons", "brand-voice-check", ...new Set(todo.flatMap((i) => tasteSkillsUsed(planOf(i))))], fields: [...(lean ? ["brand (name, market, language)", "the approved script", "voice: the do and don't, and the writing rules"] : [...Object.keys(ctx).filter((k) => (ctx as Record<string, unknown>)[k] != null), "research", ...voice.sources.map((x) => `voice: ${x}`)]), "product", l.look ? "brand look (fonts and colours)" : "", learned ? `${learned} lesson${learned === 1 ? "" : "s"} from feedback` : ""].filter(Boolean), models: { strategy_and_copy: routed ? modelOf("studio_plan", env.MODEL_COPY) : env.MODEL_COPY, ...(craftWords ? { words_with_the_copy_craft: routed ? modelOf("studio_plan", env.MODEL_COPY) : env.MODEL_COPY } : {}), copy_pass: modelOf("copy_pass", env.MODEL_EDIT), prompt: modelOf("studio_prompt", env.MODEL_PLAN), sense_check: modelOf("sense_check", env.MODEL_COPY), voice: modelOf("voice_check", env.MODEL_VOICE), ...(strict ? { claims_read: modelOf("studio_claims", env.MODEL_VOICE) } : {}), ...(run.kind === "ad" && run.context.ad_review !== false ? { ad_review: modelOf("ad_review", env.MODEL_VOICE) } : {}), image: imageModel(), check: modelOf("studio_check", env.MODEL_REFERENCE) } };
        }
        const redone = new Set((judgedNow?.fresh ?? []).map((i) => i.id));
        const kept = run.audit.filter((a) => JUDGED.includes(a.check) && a.line_index != null && run.items[a.line_index] && !redone.has(run.items[a.line_index].id));
        const judged = judgedNow?.points ?? [];
        run.audit = [...auditRun(run, brand), ...templateFindings, ...openStateFindings(l, run.items), ...kept, ...judged];
        logFailures({ brandId: run.brand_id, ...ledger, productId: run.product_id }, auditPoints(run.audit.filter((a) => !kept.includes(a) && a.check !== OPEN_STATE && a.check !== WORDS_CUT && a.check !== DISCLOSURE && a.check !== PERSON_NOTE)));
        run.status = run.items.some((i) => i.outputs.length) ? "review" : "planned";
        save(run);
    }
    catch (e) {
        run.status = run.items.some((i) => i.plan) ? "planned" : "failed";
        run.error = (e as Error).message;
        note(run, `Planning stopped: ${run.error.slice(0, 200)}`);
        save(run);
        throw e;
    }
}
export function lastFindings(item: Pick<StudioItem, "outputs">, aspect?: string): string[] {
    const newest = new Map<string, StudioOutput>();
    for (const o of item.outputs)
        if ((!aspect || o.aspect === aspect) && (newest.get(o.aspect)?.version ?? 0) < o.version)
            newest.set(o.aspect, o);
    return [...new Set([...newest.values()].flatMap((o) => (o.qa && o.qa.status !== "pass" ? o.qa.notes : [])))].filter((x) => !/automatic check didn't run/i.test(x)).map((x) => x.slice(0, 300)).slice(0, 6);
}
const surfacesOf = (kind: string): Surface[] => (kind === "ad" ? ["on_image", "headline", "primary_text"] : kind === "pdp" ? ["on_image", "site"] : ["on_image"]);
const buyersOf = (items: StudioItem[]) => [...new Set(items.map((i) => i.plan?.buyer).filter((x): x is string => !!x))];
function wordLimits(run: RunOf, item: StudioItem, plan: ContextPlan): string {
    const place = placeOf(run, item);
    if (place === "none")
        return `the product (fixed): not in this picture. No word points at a pack the reader cannot see.${plan.notes.includes(NO_PRODUCT_WORDS_NOTE) ? ` ${NO_PRODUCT_WORDS_NOTE}` : ""}`;
    if (place === "background")
        return "the product (fixed): only small, in the background. No word points at it.";
    return "";
}
async function copyEdit(l: Loaded, items: StudioItem[]) {
    if (l.run.kind === "photoshoot")
        return;
    const slots: {
        set: (v: string) => void;
        text: string;
        label: string;
    }[] = [];
    for (const item of items) {
        for (const t of item.plan?.text_elements ?? [])
            if (!/\[[^\]]+\]/.test(t.text) && t.role !== "quote")
                slots.push({ text: t.text, label: `${item.id} on-image ${t.role}`, set: (v) => void (t.text = v) });
        const c = item.plan?.ad_copy;
        if (c) {
            slots.push({ text: c.primary_text, label: `${item.id} primary text`, set: (v) => void (c.primary_text = v) });
            slots.push({ text: c.headline, label: `${item.id} headline field (40 characters at most)`, set: (v) => void (c.headline = v.slice(0, 60)) });
        }
    }
    if (!slots.length)
        return;
    const product = l.brand.products.find((p) => p.id === l.run.product_id);
    const res = await copyPass({ brandId: l.run.brand_id, brand: l.brand, what: `the words of ${items.length} ${KIND_INFO[l.run.kind].noun} for ${product?.name ?? "the product"}: each item's on-image text${l.run.kind === "ad" ? ", its primary text and its headline field" : ""}. ${l.script?.carousel ? "Items are the cards of 1 carousel, read in order: they make 1 argument between them" : "Items are separate ads: do not make them agree with each other"}`, context: `${items.map((i) => `${i.id}: ${i.plan?.argument ?? ""}${i.plan?.buyer ? ` For ${i.plan.buyer}, ${i.plan.awareness ?? ""}.` : ""}${wordLimits(l.run, i, itemPlan(l, i)) ? ` Fixed, and no edit may break it: ${wordLimits(l.run, i, itemPlan(l, i))}` : ""}`).join("\n")}\nOn 1 image a price or a figure is set once: no edit adds one to a second line, and a button says what happens next.`, lines: slots.map((s) => ({ text: s.text, beat: s.label })), hooks: [], ...booked(l), productId: l.run.product_id, surfaces: surfacesOf(l.run.kind), personaIds: buyersOf(items) });
    if (res.status === "skipped")
        return void (res.summary.startsWith("Mock") ? null : note(l.run, res.summary));
    logFailures({ brandId: l.run.brand_id, ...booked(l), productId: l.run.product_id }, copyPoints(res.issues));
    const applied = res.issues.filter((i) => i.applied && i.where === "line" && i.field === "text");
    for (const i of applied)
        slots[i.index]?.set(res.lines[i.index].text);
    note(l.run, `Copy pass by ${res.model}: ${applied.length ? `${applied.length} line${applied.length === 1 ? "" : "s"} sharpened (${applied.slice(0, 3).map((i) => i.why).join("; ")})` : "nothing to change"}. ${res.summary}`.slice(0, 500));
}
async function voicePass(l: Loaded, items: StudioItem[]) {
    const slots: {
        set: (v: string) => void;
        text: string;
        label: string;
    }[] = [];
    for (const item of items) {
        const place = placeOf(l.run, item);
        const limit = place === "none" ? (itemPlan(l, item).notes.includes(NO_PRODUCT_WORDS_NOTE) ? " (no product in this picture: a fix never names the product, what it is made as or how it is used)" : " (no product in this picture: a fix never points at a pack)") : "";
        for (const t of item.plan?.text_elements ?? [])
            if (!/\[[^\]]+\]/.test(t.text) && t.role !== "quote")
                slots.push({ text: t.text, label: `${item.id} ${t.role}${limit}`, set: (v) => void (t.text = v) });
        const c = item.plan?.ad_copy;
        if (c) {
            slots.push({ text: c.primary_text, label: `${item.id} primary text`, set: (v) => void (c.primary_text = v) });
            slots.push({ text: c.headline, label: `${item.id} ad headline`, set: (v) => void (c.headline = v) });
        }
    }
    if (!slots.length)
        return;
    try {
        const res = await voiceCheck({ brandId: l.run.brand_id, brand: l.brand, lines: slots.map((s) => ({ text: s.text, beat: s.label })), hooks: [], themeIds: [], fix: true, refId: booked(l).refId, readCopy: true, personaIds: buyersOf(items), surfaces: surfacesOf(l.run.kind), productId: l.run.product_id, log: booked(l) });
        const changed = res.check.issues.filter((i) => i.applied && i.where === "line" && i.field === "text");
        for (const i of changed)
            slots[i.index]?.set(res.lines[i.index].text);
        note(l.run, `Brand voice check: ${res.check.status === "clean" ? "on voice" : `${changed.length} wording fix${changed.length === 1 ? "" : "es"} applied, ${res.check.issues.length - changed.length} suggested`}. ${res.check.summary}`.slice(0, 400));
    }
    catch (e) {
        note(l.run, `Brand voice check didn't run: ${(e as Error).message.slice(0, 120)}`);
    }
}
const brandVoiceApartFor = (brandId: string, opts: Parameters<typeof brandVoiceApart>[1]): {
    brandVoice: string;
    buyer: string;
} => {
    const v = brandVoiceApart(brandId, opts);
    return { brandVoice: v.text, buyer: v.buyer };
};
async function wordsCheck(l: Loaded, items: StudioItem[]): Promise<AuditItem[]> {
    const { run, brand } = l;
    if (run.kind === "photoshoot")
        return [];
    const voice = getSetting(run.brand_id, "voice");
    const own = brandOwnWords(run.brand_id);
    const product = brand.products.find((p) => p.id === run.product_id);
    const points: AuditItem[] = [];
    let found = 0;
    let said = 0;
    const one = async (item: StudioItem) => {
        const d = item.plan;
        if (!d)
            return;
        const stage = asStage(d.awareness);
        const lines: WordLine[] = [];
        const set = new Map<string, (v: string) => void>();
        const max: Record<string, number> = {};
        d.text_elements.forEach((t, i) => {
            if (PLACEHOLDER.test(t.text))
                return;
            const id = `p${i + 1}`;
            const quote = /quote|review|testimonial/i.test(t.role) && !/^["“]/.test(t.text.trim());
            lines.push({ id, surface: "picture", role: t.role, text: quote ? `"${t.text.trim()}"` : t.text });
            set.set(id, (v) => void (t.text = quote ? v.replace(/^["“]|["”]$/g, "") : v));
            max[id] = Math.ceil(slotRoom(t.text, t.role) * 1.15) + (quote ? 2 : 0);
        });
        const c = d.ad_copy;
        if (c) {
            lines.push({ id: "headline", surface: "headline", text: c.headline });
            set.set("headline", (v) => void (c.headline = v));
            max.headline = 50;
            (c.more?.headlines ?? []).forEach((h, i) => {
                const id = `headline${i + 2}`;
                lines.push({ id, surface: "headline", text: h });
                set.set(id, (v) => void (c.more!.headlines[i] = v));
                max[id] = 50;
            });
            lines.push({ id: "primary", surface: "primary", text: c.primary_text });
            set.set("primary", (v) => void (c.primary_text = v));
        }
        if (!lines.length)
            return;
        const plan = itemPlan(l, item);
        const research = researchText(run.brand_id, 6, 3, `${d.argument} ${item.direction}`);
        const res = await checkWords({
            brandId: run.brand_id,
            brandName: brand.brand.name,
            ...booked(l),
            stage,
            voice,
            about: [`For: ${[d.buyer, stage?.replace("_", " ")].filter(Boolean).join(", ") || "the brand's usual buyer"}`, `The product: ${product?.name ?? brand.brand.name}`, `What the ad argues: ${d.argument}`, run.notes ? `Notes for the set: ${run.notes.slice(0, 600)}` : ""].filter(Boolean).join("\n"),
            scene: [d.scene, d.layout ? `Layout: ${d.layout}` : "", wordLimits(run, item, plan)].filter(Boolean).join("\n"),
            ...brandVoiceApartFor(run.brand_id, { surfaces: surfacesOf(run.kind), personaIds: d.buyer ? [d.buyer] : [], brand, long: isStoryStage(stage) }),
            lines,
            own,
            buyerWords: research,
            facts: [run.notes, product ? JSON.stringify(product).slice(0, 2400) : ""].filter(Boolean).join("\n"),
            counted: countedOf(brand, run.product_id),
            max,
        });
        for (const line of res.lines)
            if (res.changed.some((ch) => ch.id === line.id))
                set.get(line.id)?.(line.text);
        const open = (id: string) => res.left.some((f) => f.id === id);
        const clean = c?.more?.headlines.findIndex((_, i) => !open(`headline${i + 2}`)) ?? -1;
        if (c?.more && clean >= 0 && open("headline")) {
            [c.headline, c.more.headlines[clean]] = [c.more.headlines[clean]!, c.headline];
            for (const f of res.left)
                f.id = f.id === "headline" ? `headline${clean + 2}` : f.id;
        }
        found += res.found.length;
        said += res.changed.length;
        const index = run.items.indexOf(item);
        const whereOf = (id: string) => (id === "primary" ? "primary text" : id.startsWith("headline") ? "feed headline" : `on the picture (${d.text_elements[Number(id.slice(1)) - 1]?.role ?? "text"})`);
        const truth = new Set(truthChecks(run.brand_id, brand, item, index, run.notes).map((a) => a.check));
        const twice = (f: (typeof res.left)[number]) => f.by === "fact_figure" && ((truth.has("qualifier_dropped") && f.why.startsWith("It states ")) || (truth.has("price_source") && /^"[$£€₹¥]/.test(f.why)));
        for (const f of res.left)
            if (!twice(f))
                points.push({ check: "words_read", status: "warn", message: `Image ${index + 1}, ${whereOf(f.id)}: ${leftLine(f)}`.slice(0, 400), line_index: index });
    };
    for (let i = 0; i < items.length; i += 3) {
        const got = await Promise.allSettled(items.slice(i, i + 3).map(one));
        for (const g of got) {
            if (g.status === "fulfilled")
                continue;
            if (g.reason instanceof RunStoppedError)
                throw g.reason;
            note(run, `The reading of the words didn't run for 1 image: ${String((g.reason as Error)?.message ?? g.reason).slice(0, 120)}`);
        }
        save(run);
    }
    note(run, `Words read before any picture is made, by ${modelOf("words_read", env.MODEL_REFERENCE)}: ${found ? `${found} point${found === 1 ? "" : "s"} found, ${said} line${said === 1 ? "" : "s"} said again by ${modelOf("words_fix", env.MODEL_EDIT)}, ${points.length} left for you to look at` : "every line passed"}`);
    return points;
}
const JUDGED = ["claims_judge", "ad_review", "words_read"];
const HELD = [...JUDGED, OPEN_STATE];
export async function checkRun(runId: string, which: "claims" | "review"): Promise<number> {
    const first = await load(runId);
    if (!first.run.items.some((i) => i.plan))
        throw new Error("Write the plan first.");
    if (which === "claims")
        first.run.context = { ...first.run.context, sources: first.run.context.sources ?? claimChecksOn(first.run), claim_checks: true };
    else
        first.run.context = { ...first.run.context, ad_review: true };
    save(first.run);
    const l = await load(runId);
    const { run, brand } = l;
    const items = run.items.filter((i) => i.plan);
    const check = which === "claims" ? "claims_judge" : "ad_review";
    const points = which === "claims" ? await judgeClaims(l, items) : await adReview(l, items);
    run.audit = [...auditRun(run, brand), ...run.audit.filter((a) => HELD.includes(a.check) && a.check !== check), ...points];
    save(run);
    return points.length;
}
async function judgeClaims(l: Loaded, items: StudioItem[], draft = false): Promise<AuditItem[]> {
    if (l.run.kind === "ad" && mediaLive()) {
        const points: AuditItem[] = [];
        if (!claimChecksOn(l.run))
            return [];
        points.push(...await traced(l.run.brand_id, l.run.id, "validation", () => reviewSnapshotBatch(items.filter(i => i.plan && completeCopyFields(copyDocumentForItem(i)).length), { limit: 3, index: item => l.run.items.indexOf(item), authority: item => completeAuthorityForItem(l, item), persisted: item => getRun(l.run.id)?.items.find(i => i.id === item.id), service: { brandId: l.run.brand_id, ...booked(l) } })));
        if (!draft)
            note(l.run, `Complete copy read: ${points.filter(p => p.status === "fail").length} failing or unverified fields; all overlays, feed choices and editable variants covered. Approval is bound to the current copy and factual authority.`);
        return points;
    }
    const lines = items.flatMap((item) => [...(item.plan?.text_elements ?? []).map((t) => ({ id: item.id, where: t.role, text: t.text, source: t.source ?? "" })), ...staticFeedLines(item.plan?.ad_copy).map((t) => ({ id: item.id, ...t, source: "" }))]);
    if (!lines.length)
        return [];
    try {
        const found = await judgeWords({ brandId: l.run.brand_id, brand: l.brand, what: "ecommerce images", lines, ...booked(l), productId: l.run.product_id });
        const index = (id: string) => l.run.items.findIndex((i) => i.id === id);
        const issues = found.map((x): AuditItem => ({ check: "claims_judge", status: x.severity, message: `Image ${index(x.id) + 1}, "${x.text.slice(0, 70)}": ${x.problem}`, line_index: index(x.id) }));
        if (!draft)
            note(l.run, `Claims read by ${modelOf("studio_claims", env.MODEL_VOICE)}: ${issues.length ? `${issues.filter((x) => x.status === "fail").length} to fix, ${issues.filter((x) => x.status === "warn").length} to check` : "nothing to flag"}`);
        return issues;
    }
    catch (e) {
        if (draft)
            return [];
        return [{ check: "claims_judge", status: "warn", message: `The claims read didn't run: ${(e as Error).message.slice(0, 120)}. Check the words against the brand's claims yourself.` }];
    }
}
export function studioCopyAuthority(run: StudioRunRow, item: StudioItem): CopyAuthority {
    const brand = loadBrandBrain(run.brand_id);
    const requestedQuotes = [...new Set(completeCopyFields(copyDocumentForItem(item)).flatMap(f => quotedIn(f.text)))];
    const normal = (text: string) => text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
    const corpus = requestedQuotes.length ? db.select({ id: schema.insights.id, quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.brand_id, run.brand_id), customerVoice)).all() : [];
    const verified = requestedQuotes.flatMap((text, i) => {
        const source = corpus.find(row => normal(row.quote).includes(normal(text)));
        return source ? [{ id: `verified-quote/${i + 1}`, text, source: `Customer research insight ${source.id}; exact attributed excerpt` }] : [];
    });
    const legacy = copyAuthorityForBrand(brand, run.product_id, activeGuardrails(run.brand_id).filter(g => g.guardrail.applies && g.guardrail.rule.trim()).map(g => ({ id: g.theme_id, rule: g.guardrail.rule })), verified);
    const bound = boundRuntimeContext(run.brand_id, { productId: run.product_id, market: brand.brand.market }, { set: run.id });
    const allocation = studioAllocation(run.brand_id, run.id, run.items.findIndex(i => i.id === item.id));
    const authority = bound ? bindCopyAuthority(legacy, allocation ? buildEvidencePacket(bound.packet.scope, bound.packet.records.filter(r => allocation.slot.evidenceIds.includes(r.id))) : bound.packet) : legacy;
    const buyer = item.plan?.buyer ? buyerText(brand, [item.plan.buyer]) : "";
    return { ...authority, sources: [...authority.sources,
            { id: "creative/brand-voice", kind: "brand_guardrail", text: brandVoiceText(run.brand_id, { surfaces: ["on_image", "headline", "primary_text"], brand, buyerApart: true }) },
            ...(buyer ? [{ id: "creative/buyer", kind: "brief" as const, text: buyer }] : []),
            { id: "creative/buyer-argument", kind: "brief", text: `Buyer: ${item.plan?.buyer || "the supplied audience"}. Awareness: ${item.plan?.awareness || "not specified"}. Argument: ${item.plan?.argument || item.direction || "Use the supported selected-product reason to buy"}. Match the CTA to the supplied destination; do not invent an offer or destination.` },
        ] };
}
const completeAuthorityForItem = (l: Loaded, item: StudioItem) => studioCopyAuthority(l.run, item);
async function adReview(l: Loaded, items: StudioItem[], draft = false): Promise<AuditItem[]> {
    const ads = items.filter((i) => i.plan).map((i) => ({ id: i.id, format: i.label, ...(l.run.kind === "ad" ? { templateContract: templateContractFor(l, i) } : {}), buyer: i.plan!.buyer, awareness: i.plan!.awareness, argument: i.plan!.argument, picture: i.plan!.scene, layout: i.plan!.layout, texts: i.plan!.text_elements.map((t) => ({ role: t.role, text: t.text })), feed: i.plan!.ad_copy }));
    try {
        const { issues, ready } = await reviewAds({ brandId: l.run.brand_id, brand: l.brand, ads, ...booked(l), productId: l.run.product_id, strict: claimChecksOn(l.run) });
        const index = (id: string) => l.run.items.findIndex((i) => i.id === id);
        if (!draft)
            note(l.run, `Ad review by ${modelOf("ad_review", env.MODEL_VOICE)}: ${ready} of ${ads.length} ready as written${issues.length ? `, ${issues.length} point${issues.length === 1 ? "" : "s"} to look at` : ""}`);
        return issues.map((x): AuditItem => ({ check: "ad_review", status: draft && x.blocking ? "fail" : "warn", message: `Image ${index(x.id) + 1}, ${x.test}: ${x.problem}${x.fix ? ` Fix: ${x.fix}` : ""}`, line_index: index(x.id) }));
    }
    catch (e) {
        if (draft)
            return [];
        return [{ check: "ad_review", status: "warn", message: `The ad review didn't run: ${(e as Error).message.slice(0, 120)}.` }];
    }
}
export function neverShown(brandId: string, kit?: Pick<CreativeKit, "visual"> | null, productId?: string | null): string {
    const rules = lessonRules(brandId, { productId: productId ?? undefined, area: "pictures" }, 50).split("\n").filter((r) => /\bnever\b|\bdo not show\b|\bnot shown\b/i.test(r));
    return [brandWorld(brandId)?.never_in_frame ?? "", ...(kit?.visual.avoid ?? []), ...rules].filter(Boolean).join("\n");
}
const truthSheet = (l: Loaded): string => productTruthSheet(l.run.brand_id, l.brand, l.kit, l.run.product_id);
async function sensePass(l: Loaded, items: StudioItem[]) {
    const { run } = l;
    const imgs = productRefs(l);
    const base = { brandId: run.brand_id, brandName: l.brand.brand.name, ...booked(l), truthSheet: truthSheet(l), lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: "pictures" }), images: [imgs.hero, ...imgs.extras].filter((f): f is string => !!f) };
    const planned = (i: StudioItem) => (placeOf(run, i) === "none" ? "(Planned with no product in the picture. That is deliberate: never a problem, and never fixed by adding the product.) " : placeOf(run, i) === "background" ? "(The product is planned only small and in the background. That is deliberate.) " : "");
    const cited = (i: StudioItem) => {
        const roles = (l.script ? l.script.roles(i) : renderRefs(l, i).roles).map((r) => r.split(". ").slice(0, 2).join(". ").slice(0, 110));
        return roles.length ? `(The images this prompt cites by number, as the renderer lists them for the image model: ${roles.join("; ")}.)\n` : "";
    };
    const asItems = (xs: StudioItem[]) => xs.map((i) => ({ id: i.id, argument: i.plan!.argument, scene: `${planned(i)}${i.plan!.scene}`, prompt: `${cited(i)}${i.plan!.prompt}` }));
    try {
        const first = await senseCheck({ ...base, items: asItems(items) });
        for (const item of items)
            item.plan!.sense = { status: "ok", notes: [] };
        const flagged = items.filter((i) => first.has(i.id));
        if (!flagged.length) {
            note(run, `Read before rendering by ${modelOf("sense_check", env.MODEL_COPY)}: every picture makes sense`);
            return;
        }
        await writePrompts(l, flagged, first);
        const second = await senseCheck({ ...base, items: asItems(flagged) });
        for (const item of flagged) {
            const left = second.get(item.id);
            item.plan!.sense = left ? { status: "check", notes: left.map(senseLine) } : { status: "fixed", notes: first.get(item.id)!.map((x) => x.problem) };
        }
        const open = flagged.filter((i) => i.plan!.sense!.status === "check").length;
        note(run, `Read before rendering by ${modelOf("sense_check", env.MODEL_COPY)}: ${flagged.length} prompt${flagged.length === 1 ? "" : "s"} had a problem and ${flagged.length === 1 ? "was" : "were"} rewritten${open ? `; ${open} still ${open === 1 ? "has" : "have"} something to look at` : ""}`);
    }
    catch (e) {
        note(run, `The read before rendering didn't run: ${(e as Error).message.slice(0, 120)}`);
    }
}
function referenceForPrompt(l: Loaded, item: StudioItem): {
    reference?: {
        image?: number;
        follow: Fidelity;
        read: string;
    };
} {
    const fidelity = fidelityFor(l.run, item);
    if (!fidelity || !followsReference(fidelity) || l.run.kind === "photoshoot" || l.script)
        return {};
    const at = renderRefs(l, item).refAt;
    const read = item.plan?.reference_read ?? "";
    return at ? { reference: { image: at, follow: fidelity, read } } : fidelity === "structure" && read ? { reference: { follow: fidelity, read } } : {};
}
async function writePrompts(l: Loaded, items: StudioItem[], fixes?: Map<string, SenseProblem[]>) {
    const { run } = l;
    const method = studioPromptSkill(run.kind, contextLevel("studio_prompt"));
    const kindRule = run.kind === "photoshoot"
        ? "These are photographs: no added text, no captions, no logos, no watermarks. Only the printing on the product itself."
        : run.kind === "pdp"
            ? "These are product-page gallery images: a photograph with a designed type layer, rendered as 1 finished image."
            : "These are static ads: finished artwork, ready to run. No fake buttons unless the plan has a cta element.";
    const planOf = (i: StudioItem) => itemPlan(l, i);
    for (const batch of batchesBy(items, planOf, 6, routeFor("studio_prompt", { model: env.MODEL_PLAN, maxTokens: 16000 }).maxTokens ?? 16000, { brandId: run.brand_id, stage: "prompt" })) {
        const plan = planOf(batch[0]);
        const frameOf = (b: StudioItem) => productFrameRule(stopOf(run, b), heroOf(run, b));
        const stops = [...new Set(batch.map(frameOf))];
        const oneStop = stops.length === 1 ? stopOf(run, batch[0]) : null;
        const rolesByItem = new Map(batch.map((b) => [b.id, l.script ? l.script.roles(b) : renderRefs(l, b).roles] as const));
        const hasIdentity = !!PRODUCT_IDENTITY && [...rolesByItem.values()].some((rs) => rs.some((r) => r.includes(PRODUCT_IDENTITY)));
        const once = [
            oneStop ? `The product in every picture of this batch (this is each plan's \`product_in_picture\`, and it comes before anything else, the skill included; a plan then gives only where the product sits): ${frameOf(batch[0])}` : "",
            hasIdentity ? `Every product photo's role in a plan's \`images\` ends with the same identity sentence, written once here and marked "${IDENTITY_MARK}" below: ${PRODUCT_IDENTITY}` : "",
            run.kind === "ad" ? `Every template contract below carries this authority line, left out of each: ${TEMPLATE_AUTHORITY}` : "",
        ];
        const p = renderPrompt("studio-prompt", {
            selling_principles: run.kind === "photoshoot" ? "" : sellingText("visuals"),
            skill: [method.text, run.kind === "ad" ? staticTemplateMethod("Prompt") : ""].filter(Boolean).join("\n\n"),
            kind_rule: [kindRule, ...once, tasteBlock(plan), run.kind === "ad" ? formatLookText(run.context.format_look, { lookType: run.context.look_type })?.prompt : ""].filter(Boolean).join("\n\n"),
            fingerprint: plan.text.brandLook === "none" ? "(Not sent: these pictures carry no brand design. Name no brand colour and no brand typeface, and place no logo.)" : lookFingerprint(l.look) || "(The brand's site has not been scanned. Take colours from the product photo; describe type as clean bold sans-serif.)",
            truth_sheet: batch.every((b) => placeOf(run, b) === "none") ? "(Not sent: no picture of this batch has the product in it.)" : truthSheet(l),
            lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: "pictures", format: lessonFormat(l) }, true) || "(none yet)",
            image_roles: "Each plan lists the images attached to its own render in `images`, numbered. Use those numbers for that plan, and name each image by its role as well as its number. A layout wireframe, where there is one, gives structure only: say so, and say that its grey boxes and placeholder words are never drawn.",
            aspects: run.aspects.map((a) => `${a} (${STUDIO_ASPECTS[a]?.use ?? ""})`).join("; "),
            plans: JSON.stringify(batch.map((b) => ({ id: b.id, reserved_portfolio: studioPortfolioDirective(run.brand_id, run.id, run.items.indexOf(b)), type: run.kind === "ad" && planForm(b.plan) && plan.taste.look === "new" ? formLabel(planForm(b.plan)) : b.label, ...(run.kind === "pdp" && plan.taste.look === "new" && b.bucket && pdpFormId((b.plan as {
                    form?: string;
                }).form) ? { layout_form: `${pdpFormId((b.plan as {
                        form?: string;
                    }).form)}: a new layout for this frame. No wireframe is attached, and its usual layout is not used.` } : {}), ...(planForm(b.plan) ? { form: `${formLabel(planForm(b.plan))}: ${AD_FORMS.find((f) => f.id === planForm(b.plan))!.what}. The picture is this form. Where \`type\` suggests another layout, the form wins.` } : {}), ...referenceForPrompt(l, b), ...(run.kind === "ad" ? { template_contract: templateContractFor(l, b, { authorityApart: true }) } : {}), ...(b.plan!.logo ? { logo: `The brand's real logo is attached as a file (see \`images\`). It sits ${b.plan!.logo}. Say that it is placed exactly as the file shows it and never redrawn or retyped.` } : {}), title: b.plan!.title, argument: b.plan!.argument, ...(b.plan!.expression ? { expression: faceForPrompt(b.plan!.expression, { drawn: !!b.world && stopOf(run, b) === "hero" }) } : {}), ...(b.plan!.person ? { person: b.plan!.person } : {}), scene: visualReviewPlan(b).scene, layout: visualReviewPlan(b).layout, text_elements: b.plan!.text_elements.map((t) => ({ role: t.role, text: t.text, placement: t.placement })), watch_outs: b.plan!.watch_outs, ...(b.world && worldOf(b.world) ? { look: `${worldOf(b.world)!.label}. ${worldOf(b.world)!.look}` } : {}), ...(contextLevel("studio_prompt") === "full" ? { direction: b.direction } : {}), product_in_picture: oneStop ? (b.plan!.product_spot && oneStop !== "none" ? `As stated once above. It sits ${b.plan!.product_spot}.` : "As stated once above.") : `${frameOf(b)}${b.plan!.product_spot && stopOf(run, b) !== "none" ? ` It sits ${b.plan!.product_spot}.` : ""}`, images: rolesByItem.get(b.id)!.map((r) => (hasIdentity ? r.replace(PRODUCT_IDENTITY, IDENTITY_MARK) : r)), ...(fixes?.get(b.id) ? { previous_prompt: b.plan!.prompt, must_fix: fixes.get(b.id)!.map((x) => `${x.problem} ${x.fix}`.trim()) } : {}) }))),
        });
        const out = await structuredJson({ brandId: run.brand_id, task: "studio_prompt", model: env.MODEL_PLAN, system: p.system, user: p.user, schema: PromptsOut, effort: "medium", maxTokens: 16000, ...(run.kind === "ad" ? { resultBudget: { profile: "static-prompt" as const, items: batch.length, verbatim: batch.flatMap((it) => it.plan!.text_elements.map((t) => t.text)) } } : {}), ...booked(l) });
        observeStructuredItems(run.brand_id, "prompt", out.prompts);
        for (const b of batch) {
            const hit = out.prompts.find((x) => ownId(x.id, [b.id]) === b.id);
            if (hit) {
                Object.assign(b.plan!, { prompt: hit.prompt.trim(), ratio_notes: hit.ratio_notes, lesson_ids: hit.lessons });
                delete b.plan!.prompt_stale;
                delete b.plan!.prompt_edited;
            }
        }
    }
    const missing = items.filter((i) => !i.plan?.prompt);
    if (missing.length)
        throw new Error(`No prompt came back for ${missing.map((i) => i.id).join(", ")}. Plan the set again.`);
    if (!fixes)
        note(run, `Image prompts written by ${modelOf("studio_prompt", env.MODEL_PLAN)}`);
}
export function saveItemPlan(runId: string, itemId: string, patch: {
    text_elements?: StudioText[];
    prompt?: string;
    direction?: string;
    scene?: string;
    ad_copy?: StudioItemPlan["ad_copy"];
}): StudioRunRow {
    const run = getRun(runId);
    if (!run)
        throw new Error("Set not found");
    const item = run.items.find((i) => i.id === itemId);
    if (!item)
        throw new Error("Image not found in this set");
    const priorCopyHash = completeCopyHash(copyDocumentForItem(item), copyRequirementsForItem(item));
    if (patch.direction !== undefined)
        item.direction = patch.direction.trim();
    if (item.plan) {
        const before = item.plan.text_elements.map((t) => ({ role: t.role, text: t.text, placement: t.placement }));
        if (patch.text_elements || patch.ad_copy)
            item.plan.copy_locked = true;
        if (patch.text_elements)
            item.plan.text_elements = run.kind === "photoshoot" ? [] : patch.text_elements.filter((t) => t.text.trim()).slice(0, 16).map((t) => ({ ...t, role: t.role || "text", text: t.text.trim(), placement: t.placement ?? "", source: t.source ?? "" }));
        if (patch.prompt !== undefined && patch.prompt.trim().length >= 40 && patch.prompt.trim() !== item.plan.prompt) {
            item.plan.prompt = patch.prompt.trim();
            item.plan.prompt_edited = true;
            delete item.plan.sense;
            delete item.plan.prompt_stale;
        }
        else if (patch.text_elements && item.plan.prompt && JSON.stringify(before.map((t) => t.text)) !== JSON.stringify(item.plan.text_elements.map((t) => t.text))) {
            const swapped = swapWords(item.plan.prompt, before, item.plan.text_elements);
            item.plan.prompt = swapped.prompt;
            if (swapped.clean)
                delete item.plan.prompt_stale;
            else
                item.plan.prompt_stale = true;
        }
        if (patch.text_elements && patch.prompt === undefined && item.plan.prompt && JSON.stringify(before.map(t => t.placement)) !== JSON.stringify(item.plan.text_elements.map(t => t.placement)))
            item.plan.prompt_stale = true;
        if (patch.scene !== undefined)
            item.plan.scene = patch.scene.trim();
        if (patch.ad_copy && item.plan.ad_copy)
            item.plan.ad_copy = patch.ad_copy;
        if (patch.text_elements && run.kind === "ad" && item.plan.figures)
            item.plan.figures = relist(item.plan.figures as FigureRow[], item.plan.text_elements, heldMaterial(writingBrain(run.brand_id, claimChecksOn(run)), run.product_id));
    }
    if (priorCopyHash !== completeCopyHash(copyDocumentForItem(item), copyRequirementsForItem(item)))
        invalidateCopyApproval(item);
    const at = run.items.indexOf(item);
    const textChanged = !!(patch.text_elements || patch.ad_copy);
    run.audit = [...auditRun(run, writingBrain(run.brand_id, claimChecksOn(run))), ...run.audit.filter((a) => (a.check === OPEN_STATE ? !(patch.scene !== undefined && a.line_index === at) : JUDGED.includes(a.check) && !(textChanged && a.line_index === at)))];
    save(run);
    return run;
}
export function setItemTaste(runId: string, itemId: string, taste: Taste): boolean {
    const run = getRun(runId);
    if (!run)
        throw new Error("Set not found");
    const item = run.items.find((i) => i.id === itemId);
    if (!item)
        throw new Error("Image not found in this set");
    const next = compactTaste(taste);
    if (JSON.stringify(next) === JSON.stringify(compactTaste(item.taste)))
        return false;
    if (Object.keys(next).length)
        item.taste = next;
    else
        delete item.taste;
    save(run);
    return true;
}
export function removeItem(runId: string, itemId: string) {
    const run = getRun(runId);
    if (!run)
        throw new Error("Set not found");
    if (run.items.length <= 1)
        throw new Error("A set needs at least 1 image. Delete the set instead.");
    const at = run.items.findIndex((i) => i.id === itemId);
    run.items = run.items.filter((i) => i.id !== itemId);
    const judged = run.audit.filter((a) => HELD.includes(a.check) && a.line_index !== at).map((a) => (a.line_index != null && a.line_index > at ? { ...a, line_index: a.line_index - 1, message: a.message.replace(/^Image \d+/, `Image ${a.line_index}`) } : a));
    run.audit = [...auditRun(run, writingBrain(run.brand_id, claimChecksOn(run))), ...judged];
    save(run);
}
const KIND_OPENING: Record<LibraryKind, string> = {
    pdp: "product-page gallery image, ready to upload to the store",
    photoshoot: "brand photograph",
    ad: "ecommerce advertisement, the complete final artwork",
};
const RATIO_NOTE: Record<string, string> = {
    "1:1": "Square. Keep every element inside the frame with a clear margin.",
    "4:5": "Portrait. Use the extra height: let the product and the type breathe.",
    "9:16": "Tall. Keep text and logos out of the top 14%, the bottom 35% and 6% at each side of the frame.",
    "3:2": "Landscape. Product to one side, empty space or type on the other.",
};
export function finalPrompt(l: Pick<Loaded, "run" | "look">, item: StudioItem, aspect: string, roles: string[], corrections = "", rules = "", alsoRoles: string[] = [], lead = ""): string {
    const p = item.plan!;
    const photo = l.run.kind === "photoshoot";
    const old = splitRatios(p.prompt, aspect);
    return imageRequest({
        opening: `A finished ${aspect} ${KIND_OPENING[l.run.kind]}. ${RATIO_NOTE[aspect] ?? ""} This is the ${aspect} version: compose for this shape, do not crop another ratio.`,
        ratioNote: p.prompt_edited ? "" : p.ratio_notes?.[aspect] ?? old.note,
        lead: [p.prompt_edited ? "The saved manually edited prompt below defines the current scene and composition. Earlier layout references and generated scene notes cannot override it. Preserve the actual product identity and exact current copy." : "", lead].filter(Boolean).join("\n\n"),
        logo: !!p.logo,
        roles,
        alsoRoles,
        body: old.body,
        texts: photo ? [] : p.text_elements,
        noText: photo || !p.text_elements.length,
        fingerprint: planFor(l.run, item).text.brandLook === "none" ? "" : lookFingerprint(l.look),
        rules,
        corrections,
        product: placeOf(l.run, item),
        productSize: p.prompt_edited ? "" : productSizeLine(stopOf(l.run, item), p.product_spot, heroOf(l.run, item)),
    });
}
export function basePrompt(texts: {
    role: string;
    text: string;
}[], hasProduct: boolean): string {
    return [
        "IMAGES ATTACHED, by role.",
        "1. A finished advertisement. Return this same picture with its added words and graphic overlays taken off.",
        hasProduct ? "2. The product as photographed. The product in the result matches it exactly: shape, colours, label and the words printed on it." : "",
        "",
        `REMOVE every piece of added copy and every graphic that exists to carry that copy: ${texts.map((t) => `the ${t.role} ("${t.text.slice(0, 80)}")`).join(", ")}, and any button, price flag, sticker, star row, arrow, underline or text chip carrying it. Preserve the actual brand logo and product marks exactly in their original positions, including a standalone brand wordmark. A badge, circle or panel that holds the product (and not copy) is part of the picture: it stays exactly where it is, with the product in it.`,
        "KEEP everything else exactly as it is: the scene, the product and where it sits, the people, the props, the light, the colours, the crop and the camera. Do not move, restyle or redraw anything that is not being removed.",
        "Where something was removed, continue the surface or background that was behind it, so the space is clean and a designer can set new type there.",
        "NO ADDED COPY of any kind in the result. Keep the original actual brand logo and the words printed on the product exactly as in the supplied references; do not add a logo where the original has none.",
    ]
        .filter((x, i) => x || i === 3)
        .join("\n");
}
async function withoutWords(l: Loaded, item: StudioItem, aspect: string, picture: string, baseName: string, texts: {
    role: string;
    text: string;
}[], quality: "medium" | "high"): Promise<string> {
    const { run } = l;
    const size = STUDIO_ASPECTS[aspect]?.size ?? "1024x1024";
    const baseFile = assetPath(run.id, baseName);
    if (!mediaLive()) {
        const [w, h] = size.split("x").map(Number);
        await sharp(Buffer.from(placeholderSvg({ text: "Without words", label: `${item.label} · ${aspect} · mock`, color: "#475569", width: w, height: h }))).png().toFile(baseFile.abs);
    }
    else {
        const hero = sendsProductPhoto(placeOf(run, item)) ? productRefs(l, item).truth : null;
        await generateImage({ brandId: run.brand_id, jobId: run.id, purpose: `${item.id} ${aspect} without words`, prompt: basePrompt(texts, !!hero), refs: [picture, ...(hero ? [hero] : [])], size, quality, out: baseFile.abs });
    }
    return `${run.id}/${baseName}`;
}
export async function makeBase(runId: string, itemId: string, aspect: string): Promise<string> {
    const l = await load(runId);
    const { run } = l;
    const item = run.items.find((i) => i.id === itemId);
    const last = item ? latestOutput(item, aspect) : null;
    if (!item?.plan || !last)
        throw new Error("That picture is not made yet.");
    if (last.base_path && fs.existsSync(path.join(env.DATA_DIR, "assets", last.base_path)))
        return last.base_path;
    const texts = last.texts ?? item.plan.text_elements.map((t) => ({ role: t.role, text: t.text }));
    const base = await withoutWords(l, item, aspect, last.abs, path.basename(last.path).replace(/\.png$/, "_base.png"), texts, "high");
    item.outputs.find((o) => o.path === last.path)!.base_path = base;
    note(run, `${item.id} ${aspect}: a copy without words was made, so its words can be edited as type`);
    save(run);
    await readPlaces(runId, itemId, aspect).catch((e) => {
        if (e instanceof RunStoppedError)
            throw e;
    });
    return base;
}
export async function readPlaces(runId: string, itemId: string, aspect: string): Promise<PlacedLine[] | null> {
    const run = getRun(runId);
    const item = run?.items.find((i) => i.id === itemId);
    const last = item ? latestOutput(item, aspect) : null;
    if (!run || !item || !last)
        throw new Error("That picture is not made yet.");
    if (last.placed)
        return last.placed;
    if (!mediaLive())
        return null;
    const texts = last.texts ?? (run.kind === "photoshoot" ? [] : (item.plan?.text_elements ?? []).map((t) => ({ role: t.role, text: t.text })));
    let placed: PlacedLine[] = [];
    let failed = "";
    try {
        placed = await seeLines({ brandId: run.brand_id, refId: run.id, file: last.abs, texts, palette: (loadBrandLook(run.brand_id)?.palette ?? []).map((c) => c.hex) });
    }
    catch (e) {
        if (e instanceof RunStoppedError)
            throw e;
        failed = (e as Error).message.slice(0, 120);
    }
    const now = getRun(runId);
    const o = now?.items.find((i) => i.id === itemId)?.outputs.find((x) => x.path === last.path);
    if (!now || !o)
        return placed;
    o.placed = placed;
    note(now, failed ? `${itemId} ${aspect}: where its lines sit could not be read (${failed}). They start placed by rule.` : `${itemId} ${aspect}: ${placed.length} of ${texts.length} line${texts.length === 1 ? "" : "s"} found on the picture, for the words editor`);
    save(now);
    return placed;
}
export async function productFor(runId: string): Promise<{
    run: StudioRunRow;
    brand: BrandBrain;
    guide: ReturnType<typeof productGuide>;
    templates: Record<string, string>;
}> {
    const l = await load(runId);
    return { run: l.run, brand: l.brand, guide: productGuide(l.brand, l.kit, l.run.product_id), templates: Object.fromEntries(l.run.items.map((item) => [item.id, templateContractFor(l, item)])) };
}
function chosenCastAges(run: Pick<StudioRunRow, "context">): [
    number,
    number
] | null {
    if (!run.context.sprint)
        return null;
    try {
        return db.select({ options: schema.sprints.options }).from(schema.sprints).where(eq(schema.sprints.id, run.context.sprint)).get()?.options?.cast_brief?.ages ?? null;
    }
    catch {
        return null;
    }
}
function buyerAsked(l: Loaded, item: StudioItem): string {
    if (l.run.kind !== "ad" || item.person || l.script || !item.plan?.buyer || fixedByHand(l.run.context.sprint ? "" : item.direction))
        return "";
    return buyerSaid(castOver(buyerFrom(listPersonas(l.run.brand_id).find((x) => x.id === item.plan!.buyer)?.who), chosenCastAges(l.run)));
}
export function visualReviewPlan(item: StudioItem): {
    scene: string;
    layout: string;
    expression?: string;
} {
    const plan = item.plan!;
    return plan.prompt_edited ? { scene: plan.prompt, layout: "Use the composition in the saved manually edited prompt; superseded generated scene/layout notes do not apply." } : { scene: plan.scene, layout: plan.layout, ...(plan.expression ? { expression: plan.expression } : {}) };
}
function checkOutput(l: Loaded, item: StudioItem, file: string, hero: string): Promise<NonNullable<StudioOutput["qa"]>> {
    const fmt = l.run.kind === "ad" ? formatLookText(l.run.context.format_look, { lookType: l.run.context.look_type }) : null;
    const refs = productRefs(l, item);
    const visual = visualReviewPlan(item);
    return inspectImage({
        ...(fmt?.check ? { format: { label: fmt.label, is: fmt.check } } : {}),
        ...(refs.unit && refs.truth === hero ? { heroIsUnit: true } : {}),
        brandId: l.run.brand_id,
        refType: "studio",
        refId: l.run.id,
        itemId: item.id,
        lookType: l.run.context.look_type,
        productId: l.run.product_id,
        one: KIND_INFO[l.run.kind].one,
        productName: l.brand.products.find((p) => p.id === l.run.product_id)?.name ?? l.brand.brand.name,
        truth: truthSheet(l),
        scene: visual.scene,
        ...(l.run.kind === "ad" ? { ...(!item.plan!.prompt_edited ? { templateContract: templateContractFor(l, item) } : {}), layout: visual.layout } : {}),
        texts: l.run.kind === "photoshoot" ? [] : item.plan!.text_elements,
        look: planFor(l.run, item).text.brandLook === "none" ? "" : lookFingerprint(l.look),
        rules: lessonRules(l.run.brand_id, { productId: l.run.product_id, area: "pictures", format: lessonFormat(l) }),
        file,
        hero,
        product: placeOf(l.run, item),
        logo: item.plan!.logo,
        ...(visual.expression ? { expression: visual.expression } : {}),
        ...(!item.plan!.prompt_edited && buyerAsked(l, item) ? { buyer: buyerAsked(l, item) } : {}),
        ...(!item.plan!.prompt_edited && buyerAsked(l, item) && item.plan!.person ? { subject: item.plan!.person.split(". ")[0] } : {}),
        ...(l.run.kind === "ad" && ruledOut(worldOf(item.world), neverShown(l.run.brand_id, l.kit, l.run.product_id)) ? { lookAsked: `${worldOf(item.world)!.label}: ${worldOf(item.world)!.look}` } : {}),
    });
}
export interface RenderOptions {
    itemIds?: string[];
    feedback?: string;
    redo?: boolean;
    quality?: "medium" | "high";
    skipFailed?: boolean;
    force?: boolean;
    keep?: boolean;
    mend?: boolean;
    noRetry?: boolean;
}
function latestOutput(item: Pick<StudioItem, "outputs">, aspect: string): (StudioOutput & {
    abs: string;
}) | null {
    const o = currentOutputs(item.outputs).find((x) => x.aspect === aspect);
    const abs = o ? path.join(env.DATA_DIR, "assets", o.path) : "";
    return o && fs.existsSync(abs) ? { ...o, abs } : null;
}
const wordsNow = (run: Pick<StudioRunRow, "kind" | "context">, item: StudioItem) => (run.kind === "photoshoot" || (run.context.sprint && !wordsOn(run)) ? [] : (item.plan?.text_elements ?? []).map((t) => ({ role: t.role, text: t.text, placement: t.placement })));
export interface RenderRequest {
    prompt: string;
    refs: string[];
    mode: "change" | "fresh" | "fix" | "redraw";
    changedFrom?: number;
    dropped: string[];
}
function currentRenderIdentity(run: StudioRunRow, item: StudioItem) { return productionFingerprint({ product: run.product_id, prompt: item.plan?.prompt, texts: wordsNow(run, item) }); }
function freshOutputContext(run: StudioRunRow, item: StudioItem, out: StudioOutput) { const cp = readCheckpoint<{
    promptHash: string;
    sha256: string;
}>(run.brand_id, "studio-render-context", `${run.id}:${item.id}:${out.aspect}:v${out.version}`); if (!cp || cp.value.promptHash !== currentRenderIdentity(run, item))
    return false; try {
    return hashMediaFile(path.join(env.DATA_DIR, "assets", out.path), [path.join(env.DATA_DIR, "assets")]).sha256 === cp.value.sha256;
}
catch {
    return false;
} }
function currentPromptFaults(run: StudioRunRow, item: StudioItem) { return mustFix(item.plan?.prompt_edited ? { outputs: currentOutputs(item.outputs).filter(out => freshOutputContext(run, item, out)) } : item); }
function baseRenderRequest(l: Loaded, item: StudioItem, aspect: string, o: {
    keep?: boolean;
    feedback?: string;
    retry?: string[];
    redraw?: string[];
} = {}): RenderRequest {
    const { run } = l;
    const place = placeOf(run, item);
    const texts = wordsNow(run, item);
    const last = latestOutput(item, aspect);
    const prev = run.context.sprint && !wordsOn(run) && last?.base_path
        ? { ...last, path: last.base_path, abs: path.join(env.DATA_DIR, "assets", last.base_path), texts: [] }
        : last;
    if (o.keep && prev) {
        const edits = wordChanges(prev.texts, texts);
        const words = edits.length || prev.texts || !texts.length ? edits : ["Set the added words to exactly the lines listed below, each in the place, the typeface and the colour the image already uses for it. Take off any added line that is not in the list."];
        if (o.feedback?.trim() || words.length) {
            const product = l.brand.products.find((p) => p.id === run.product_id);
            const hero = sendsProductPhoto(place) ? productRefs(l, item).truth : null;
            const changesType = /\b(font|typeface|typography|lettering|headline|body copy|text size|text weight|specimen)\b/i.test(o.feedback ?? "");
            const specimen = (words.length || changesType) && texts.length ? lookFile(run.brand_id, l.look?.specimen ?? "") : null;
            const also: [
                string | null,
                string
            ][] = [
                [hero, `The product as photographed${product ? `: ${product.name}` : ""}. Wherever the product is in the picture, already there or added by the change, it is exactly this: shape, colours, materials, label and the words printed on it. Never a pack drawn from memory`],
                [specimen, "Brand type and colour specimen. A style guide only, for any word that is set again. It never appears in the picture"],
            ];
            const ok = also.filter(([f]) => !!f && fs.existsSync(f!)) as [
                string,
                string
            ][];
            return {
                mode: "change",
                changedFrom: prev.version,
                refs: [prev.abs, ...ok.map(([f]) => f)],
                dropped: [],
                prompt: changeRequest({ one: run.kind === "ad" ? "static ad" : run.kind === "pdp" ? "product page image" : "photograph", aspect, ask: o.feedback?.slice(0, 800), words, fix: currentPromptFaults(run, item), texts, roles: ok.map(([, r]) => r), product: place, corrections: (o.retry ?? []).join("\n") }),
            };
        }
    }
    const refs = renderRefs(l, item, { held: !!o.redraw?.length });
    const first = aspect !== run.aspects[0] ? latestOutput(item, run.aspects[0]) : null;
    const sibling = first && first.qa?.status !== "fail" && refs.files.length < 8 && (!item.plan?.prompt_edited || freshOutputContext(run, item, first)) ? first : null;
    const redraw = o.redraw?.length ? doItThisWay(o.redraw, useFacts(run.brand_id, run.product_id), refs.productAt) : "";
    const rules = lessonRules(run.brand_id, { productId: run.product_id, area: "pictures", format: lessonFormat(l) }, 10, item.plan!.lesson_ids);
    const told = (x: string) => !redraw || mendRoute([x]) !== "redraw";
    const corrections = [...new Set([o.feedback ? `- ${o.feedback.slice(0, 800)}` : "", ...[...currentPromptFaults(run, item), ...(o.redraw ?? [])].filter(told).map((x) => `- ${x}`), ...(o.retry ?? []).filter(told)])].filter(Boolean).join("\n");
    const one = KIND_INFO[run.kind].one;
    const also = sibling ? [`This same ${one}, already finished in ${sibling.aspect}. The ${aspect} image is that picture composed again for the new shape: the same scene, people, props, product, light, colours, type styling and words. Only the arrangement changes to fit ${aspect}. Do not crop it and do not stretch it`] : [];
    const fidelity = fidelityFor(run, item);
    const lead = fidelity && run.kind !== "photoshoot" && !item.plan!.prompt_edited ? referenceLine(fidelity, refs.refAt, refs.productAt || null, item.plan?.reference_read ?? "") : "";
    return { mode: redraw ? "redraw" : "fresh", refs: [...refs.files, ...(sibling ? [sibling.abs] : [])], dropped: refs.dropped, prompt: finalPrompt(l, item, aspect, refs.roles, corrections, rules, also, [lead, redraw].filter(Boolean).join("\n\n")) };
}
function renderRequest(l: Loaded, item: StudioItem, aspect: string, o: Parameters<typeof baseRenderRequest>[3] = {}): RenderRequest {
    const request = baseRenderRequest(l, item, aspect, o);
    const selected = labHandoffForSet(l.run.brand_id, l.run.product_id, l.run.notes);
    if (!selected)
        return request;
    const agreementIssues = labPlanAgreement(selected, item.plan!);
    if (agreementIssues.length)
        throw new Error(agreementIssues.join(" "));
    const refs = labReferenceAttachments(l.run.brand_id, l.run.product_id, l.run.notes);
    const additions = refs.files.map((file, i) => ({ file, role: refs.roles[i] })).filter(r => !request.refs.includes(r.file));
    if (request.refs.length + additions.length > 8)
        throw new Error("The selected campaign references exceed the image model's eight-reference limit. Reduce other references explicitly; accepted casting and product references were not dropped.");
    return { ...request, refs: [...request.refs, ...additions.map(r => r.file)], prompt: `${request.prompt}\n\nSELECTED CREATIVE LAB AGREEMENT\n${JSON.stringify(selected)}\n${additions.map((r, i) => `Additional attached image ${request.refs.length + i + 1}: ${r.role}`).join("\n")}` };
}
function fixRequest(l: Loaded, item: StudioItem, aspect: string, failed: string, faults: string[]): RenderRequest {
    const { run } = l;
    const place = placeOf(run, item);
    const texts = wordsNow(run, item);
    const product = l.brand.products.find((p) => p.id === run.product_id);
    const hero = sendsProductPhoto(place) ? productRefs(l, item).truth : null;
    const specimen = texts.length ? lookFile(run.brand_id, l.look?.specimen ?? "") : null;
    const logo = item.plan?.logo && planFor(run, item).attach.logo ? lookFile(run.brand_id, l.look?.logo ?? "") : null;
    const also: [
        string | null,
        string
    ][] = [
        [hero, `The product as photographed${product ? `: ${product.name}` : ""}. Where the fault is in the product, mend it to match this photo exactly: shape, colours, materials, label and the words printed on it`],
        [specimen, "Brand type and colour specimen. A style guide only, for any word that is set again. It never appears in the picture"],
        [logo, logoRole(item.plan?.logo ?? "")],
    ];
    const ok = also.filter(([f]) => !!f && fs.existsSync(f!)) as [
        string,
        string
    ][];
    return {
        mode: "fix",
        refs: [failed, ...ok.map(([f]) => f)],
        dropped: [],
        prompt: changeRequest({ one: run.kind === "ad" ? "static ad" : run.kind === "pdp" ? "product page image" : "photograph", aspect, fix: faults.slice(0, 6), texts, roles: ok.map(([, r]) => r), product: place }),
    };
}
function mendRequest(l: Loaded, item: StudioItem, aspect: string, failed: string, faults: string[]): RenderRequest {
    return mendRoute(faults) === "redraw" && item.plan?.prompt ? renderRequest(l, item, aspect, { redraw: faults }) : fixRequest(l, item, aspect, failed, faults);
}
function bringProductIn(l: Loaded, items: StudioItem[], feedback: string | undefined): string[] {
    if (!feedback?.trim() || l.run.kind !== "ad")
        return [];
    const names = { brand: l.brand.brand.name, product: setProduct(l.brand, l.run.product_id)?.name };
    if (!asksForProduct(feedback, names))
        return [];
    const changed = items.filter((i) => placeOf(l.run, i) === "none");
    for (const i of changed)
        i.taste = { ...i.taste, product: "clear" };
    return changed.map((i) => i.id);
}
export async function requestFor(runId: string, itemId: string, aspect: string, o: {
    keep?: boolean;
    feedback?: string;
    mend?: boolean;
} = {}): Promise<RenderRequest> {
    const l = await load(runId);
    const item = l.run.items.find((i) => i.id === itemId);
    if (!item?.plan)
        throw new Error("That image has no plan yet.");
    const last = o.mend ? latestOutput(item, aspect) : null;
    if (last?.qa?.status === "fail" && faultNotes(last.qa).length)
        return mendRequest(l, item, aspect, last.abs, faultNotes(last.qa));
    bringProductIn(l, [item], o.feedback);
    return renderRequest(l, item, aspect, o);
}
export async function renderRun(runId: string, opts: RenderOptions = {}): Promise<void> {
    const l = await load(runId);
    const { run } = l;
    const failedAt = new Set(run.audit.filter((a) => a.status === "fail").map((a) => a.line_index));
    let items = run.items.filter((i, at) => i.plan && (!opts.itemIds || opts.itemIds.includes(i.id)) && !(opts.skipFailed && !opts.force && failedAt.has(at)));
    if (!items.length)
        throw new Error(opts.skipFailed ? "Every ad in this set has a failed check on its plan." : "Plan the set before rendering.");
    if (!opts.force && (opts.skipFailed ? failedAt.has(undefined) : failedAt.size > 0))
        throw new Error("Fix the failed checks on the plan before rendering.");
    if (run.kind === "ad" && mediaLive()) {
        const points = await judgeClaims(l, items);
        const reviewedIndices = new Set(items.map(item => run.items.indexOf(item)));
        run.audit = [...run.audit.filter(a => a.check !== "claims_judge" || a.line_index === undefined || !reviewedIndices.has(a.line_index)), ...points];
        save(run);
        const strict = claimChecksOn(run);
        const held = items.filter((item) => copyHoldReason(item, completeAuthorityForItem(l, item), strict));
        if (held.length === items.length)
            assertCompleteCopyRenderApproval(held[0], completeAuthorityForItem(l, held[0]), true, opts.force, strict);
        if (held.length) {
            note(run, `${held.length} ad${held.length === 1 ? " waits" : "s wait"} for the claims read (${held.map((i) => i.id).join(", ")}): ${copyHoldReason(held[0], completeAuthorityForItem(l, held[0]), strict)}. The rest of the set is made.`);
            items = items.filter((i) => !held.includes(i));
        }
    }
    if (mediaLive() && !productRefs(l).hero)
        throw new Error("There is no product photo for this product. Every image is anchored on a real photo of the real product.");
    run.status = "rendering";
    run.error = null;
    for (const i of items)
        i.status = "rendering";
    for (const id of bringProductIn(l, items, opts.feedback))
        note(run, `${id}: your note asks for the product, and this picture was planned without it. The product's own photos are sent with it now, and the picture is checked against them`);
    save(run);
    const quality = opts.quality ?? run.context.picture_quality ?? (run.kind === "photoshoot" ? "medium" : imageQuality());
    let failures = 0;
    const stale = items.filter((i) => i.plan?.prompt_stale && !(opts.keep && run.aspects.every((a) => latestOutput(i, a))));
    if (mediaLive() && stale.length) {
        try {
            await writePrompts(l, stale);
            note(run, `${stale.length} image prompt${stale.length === 1 ? "" : "s"} written again: the words were edited, or the images attached have changed since it was written`);
        }
        catch (e) {
            if (e instanceof RunStoppedError)
                throw e;
            note(run, `The prompt was not written again after the words were edited (${(e as Error).message.slice(0, 100)}). The edited words are sent as the final words.`);
        }
        save(run);
    }
    const one = async (item: StudioItem) => {
        try {
            for (const aspect of run.aspects) {
                const have = item.outputs.filter((o) => o.aspect === aspect);
                const failedLast = opts.mend ? latestOutput(item, aspect) : null;
                if (opts.mend && (!failedLast || failedLast.qa?.status !== "fail" || !faultNotes(failedLast.qa).length))
                    continue;
                if (have.length && !opts.redo && !opts.feedback && !opts.keep && !opts.mend)
                    continue;
                const version = Math.max(0, ...have.map((o) => o.version)) + 1;
                const size = STUDIO_ASPECTS[aspect]?.size ?? "1024x1024";
                const name = `${item.id}_${aspect.replace(":", "x")}_v${version}.png`;
                const file = assetPath(run.id, name);
                let qa: StudioOutput["qa"];
                let req: RenderRequest;
                try {
                    req = failedLast ? mendRequest(l, item, aspect, failedLast.abs, faultNotes(failedLast.qa)) : renderRequest(l, item, aspect, { keep: opts.keep, feedback: opts.feedback });
                }
                catch (e) {
                    if (mediaLive())
                        throw e;
                    req = { prompt: "", refs: [], mode: "fresh", dropped: [] };
                }
                if (!mediaLive()) {
                    const [w, h] = size.split("x").map(Number);
                    await sharp(Buffer.from(placeholderSvg({ text: item.plan!.text_elements[0]?.text ?? item.plan!.title, label: `${item.label} · ${aspect} · mock`, color: ["#0f766e", "#334155", "#9f1239", "#1d4ed8", "#92400e", "#4d7c0f"][run.items.indexOf(item) % 6], width: w, height: h }))).png().toFile(file.abs);
                }
                else {
                    if (req.dropped.length && aspect === run.aspects[0])
                        note(run, `${item.id}: not sent to the image model: ${req.dropped.join(", ")}`);
                    const mended: string[] = [];
                    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
                        await generateImage({ brandId: run.brand_id, jobId: run.id, purpose: `${item.id} ${aspect}${req.mode === "change" ? " change" : ""}${attempt > 1 ? (req.mode === "fix" ? " mend" : " retry") : ""}`, prompt: req.prompt, refs: req.refs, size, quality, ...(typeof run.context.image_model === "string" ? { model: run.context.image_model, strictModel: true } : {}), holdUnsure: true, out: file.abs });
                        try {
                            qa = await checkOutput(l, item, file.abs, productRefs(l, item).truth!);
                        }
                        catch (e) {
                            qa = unreadQa((e as Error).message);
                        }
                        if (qa.status !== "fail" || attempt === MAX_TRIES || opts.noRetry || req.mode === "redraw")
                            break;
                        const faults = faultNotes(qa);
                        if ((req.mode === "fresh" || req.mode === "fix") && faults.length) {
                            const tried = file.abs.replace(/\.png$/, `_try${attempt}.png`);
                            fs.copyFileSync(file.abs, tried);
                            const clause = oneClause(faults, mended);
                            if (req.mode === "fix" && !clause)
                                break;
                            if (req.mode === "fresh" && mendRoute(faults) === "redraw") {
                                req = mendRequest(l, item, aspect, tried, faults);
                                note(run, `${item.id} ${aspect}: first render failed the check (${faults[0] ?? "see notes"}); ${redrawWhy(faults)}, so the picture is drawn again with the right way written first`);
                            }
                            else {
                                mended.push(clause!);
                                req = fixRequest(l, item, aspect, tried, [clause!]);
                                note(run, `${item.id} ${aspect}: ${attempt === 1 ? "first render" : `mend ${attempt - 1}`} failed the check (${qa.notes[0] ?? "see notes"}); mending 1 thing on that picture and keeping the rest: ${clause}`);
                            }
                        }
                        else {
                            req = renderRequest(l, item, aspect, { keep: opts.keep, feedback: opts.feedback, retry: faults.map((n) => `- ${n}`) });
                            note(run, `${item.id} ${aspect}: first render failed the check (${qa.notes[0] ?? "see notes"}); rendering once more`);
                        }
                    }
                }
                let base: string | undefined;
                if (run.context.base_image === true && wordsOn(run) && item.plan!.text_elements.length) {
                    try {
                        base = await withoutWords(l, item, aspect, file.abs, name.replace(/\.png$/, "_base.png"), item.plan!.text_elements, quality);
                    }
                    catch (e) {
                        if (e instanceof RunStoppedError)
                            throw e;
                        note(run, `${item.id} ${aspect}: the copy without words was not made (${(e as Error).message.slice(0, 120)})`);
                    }
                }
                if (run.context.sprint && item.copy_draft) {
                    delete item.copy_draft.approved_at;
                    delete item.copy_draft.approval_hash;
                }
                const made = wordsNow(run, item).map((t) => ({ role: t.role, text: t.text }));
                for (const prior of item.outputs)
                    if (prior.aspect === aspect)
                        delete prior.selected;
                item.outputs.push({ aspect, path: `${run.id}/${name}`, version, ...(base ? { base_path: base } : {}), ...(qa ? { qa } : {}), ...(run.kind === "ad" && mediaLive() && item.copy_review ? { copy_status: "approved" as const, copy_content_hash: item.copy_review.contentHash } : {}), ...(run.kind === "photoshoot" ? {} : { texts: made }), ...(req.mode === "change" ? { changed_from: req.changedFrom } : {}), ...(req.mode === "fix" ? { fixed: true, ...(failedLast ? { changed_from: failedLast.version } : {}) } : {}) });
                {
                    const key = `${run.id}:${item.id}:${aspect}:v${version}`, prior = readCheckpoint(run.brand_id, "studio-render-context", key);
                    saveCheckpoint(run.brand_id, "studio-render-context", key, { promptHash: currentRenderIdentity(run, item), sha256: hashMediaFile(file.abs, [path.join(env.DATA_DIR, "assets")]).sha256 }, prior?.revision ?? 0);
                }
                if (opts.mend && failedLast)
                    note(run, `${item.id} ${aspect}: ${req.mode === "redraw" ? `drawn again (${redrawWhy(faultNotes(failedLast.qa))})` : "mended on the failed picture"}; check: ${qa?.status ?? "not run"}`);
                save(run);
            }
            item.status = "done";
            item.error = undefined;
        }
        catch (e) {
            failures++;
            item.status = item.outputs.length ? "done" : "failed";
            item.error = (e as Error).message.slice(0, 300);
            note(run, `${item.id}: ${item.error}`);
        }
        save(run);
    };
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
        for (;;) {
            const item = items[next++];
            if (!item)
                return;
            await one(item);
        }
    }));
    const made = items.reduce((n, i) => n + i.outputs.length, 0);
    note(run, `${items.length - failures} of ${items.length} image${items.length === 1 ? "" : "s"} ${opts.keep ? "changed, with the rest of the picture kept" : "rendered"}${mediaLive() ? "" : " (mock placeholders)"}${opts.feedback ? " with your notes" : ""}`);
    run.status = made ? "review" : "failed";
    if (failures)
        run.error = `${failures} image${failures === 1 ? "" : "s"} could not be rendered. Open each one for the reason.`;
    sayTypefaceOnce(run);
    save(run);
    if (run.context.reel && made) {
        try {
            await makeReel(run);
        }
        catch (e) {
            const fresh = getRun(run.id);
            if (fresh) {
                note(fresh, `The reel was not made: ${(e as Error).message.slice(0, 160)}`);
                save(fresh);
            }
        }
    }
}
export function estimateRun(run: Pick<StudioRunRow, "kind" | "items" | "aspects"> & Partial<Pick<StudioRunRow, "context">>, quality?: "medium" | "high"): {
    images: number;
    usd: number;
} {
    const images = run.context ? picturesFor({ ...run, context: run.context }, run.items) : run.items.length * run.aspects.length;
    const each = (quality ?? (run.kind === "photoshoot" ? "medium" : "high")) === "high" ? 0.15 : 0.05;
    return { images, usd: Math.round(images * each * 100) / 100 };
}
export async function recheckRun(runId: string, itemIds?: string[]): Promise<{
    checked: number;
    failed: number;
}> {
    const l = await load(runId);
    if (!mediaLive() || !productRefs(l).hero)
        throw new Error("Checking images needs live mode and a product photo.");
    let checked = 0;
    let failed = 0;
    for (const item of l.run.items) {
        if (!item.plan || (itemIds && !itemIds.includes(item.id)))
            continue;
        for (const aspect of l.run.aspects) {
            const o = currentOutputs(item.outputs).find((x) => x.aspect === aspect);
            if (!o)
                continue;
            o.qa = await checkOutput(l, item, path.join(env.DATA_DIR, "assets", o.path), productRefs(l, item).truth!);
            delete o.check_override;
            checked++;
            if (o.qa.status === "fail")
                failed++;
        }
    }
    note(l.run, `Checked ${checked} image${checked === 1 ? "" : "s"} again against the current lessons: ${failed} failed`);
    sayTypefaceOnce(l.run);
    save(l.run);
    return { checked, failed };
}
export interface ScriptAd {
    jobId: string;
    brandId: string;
    productId: string;
    title: string;
    aspect: string;
    notes: string;
    claimChecks: boolean;
    place: ProductPlace;
    cards: {
        label: string;
        direction: string;
        brief: string[];
        refId: string | null;
    }[];
    roles: (plan: StudioItemPlan) => string[];
    format?: string;
    variety?: number;
    taste?: Taste;
    stage?: string;
    surface?: string;
    formatLook?: string;
    feedCopy?: NonNullable<StudioItemPlan["ad_copy"]>;
}
export async function planScriptAd(a: ScriptAd): Promise<{
    plans: StudioItemPlan[];
    judged: AuditItem[];
    log: string[];
    skills: string[];
    fields: string[];
    models: Record<string, string>;
}> {
    const now = new Date().toISOString();
    const items: StudioItem[] = a.cards.map((c, i) => ({ id: `card_${i + 1}`, ref_id: c.refId, type: c.refId ? AD_REFERENCE_TYPE : "from-script", label: c.label, reason: "Cut from an approved script", direction: c.direction, status: "chosen", outputs: [] }));
    const run: StudioRunRow = { id: `job:${a.jobId}`, brand_id: a.brandId, kind: "ad", product_id: a.productId, title: a.title, notes: a.notes, aspects: [a.aspect], status: "draft", items, audit: [], log: [], context: { skills: [], fields: [], models: {}, claim_checks: a.claimChecks, sources: a.claimChecks, ad_review: false, ...(a.feedCopy && !a.claimChecks ? { from_script: true, feed_copy: false } : {}), product_in_picture: a.place, ...(formatLook(a.formatLook) ? { format_look: formatLook(a.formatLook)!.id } : {}), ...(a.variety != null ? { variety: clampVariety(a.variety) } : {}), ...(a.taste && Object.keys(compactTaste(a.taste)).length ? { taste: compactTaste(a.taste) } : {}), ...(stageId(a.stage) ? { stage: stageId(a.stage)! } : {}), ...(a.surface ? { surface: a.surface } : a.cards.length > 1 ? { surface: "carousel" } : {}) }, error: null, created_at: now, updated_at: now };
    const l: Loaded = {
        run,
        brand: writingBrain(a.brandId, a.claimChecks),
        kit: await ensureCreativeKit(a.brandId, mediaLive()),
        look: loadBrandLook(a.brandId),
        refs: refsById(items.map((i) => i.ref_id).filter((x): x is string => !!x)),
        script: { jobId: a.jobId, briefs: new Map(items.map((it, i) => [it.id, a.cards[i].brief])), roles: (item) => a.roles(item.plan!), carousel: items.length > 1, format: a.format ?? (items.length > 1 ? "carousel" : "static_image") },
    };
    await planLoaded(l);
    if (a.feedCopy && items[0].plan)
        items[0].plan.ad_copy = a.feedCopy;
    return { plans: items.map((i) => i.plan!), judged: run.audit.filter((x) => JUDGED.includes(x.check)), log: run.log.map((x) => x.message), skills: run.context.skills, fields: run.context.fields, models: run.context.models };
}
export async function promptsForEval(runId: string, itemIds: string[]): Promise<{
    id: string;
    prompt: string;
    texts: string[];
    ratio_notes: Record<string, string>;
    lessons: string[];
    request: string;
}[]> {
    const l = await load(runId);
    const items = l.run.items.filter((i) => itemIds.includes(i.id) && i.plan);
    await writePrompts(l, items);
    const aspect = l.run.aspects[l.run.aspects.length - 1];
    return items.map((i) => ({ id: i.id, prompt: i.plan!.prompt, texts: i.plan!.text_elements.map((t) => t.text), ratio_notes: i.plan!.ratio_notes ?? {}, lessons: i.plan!.lesson_ids ?? [], request: finalPrompt(l, i, aspect, renderRefs(l, i).roles, "", lessonRules(l.run.brand_id, { productId: l.run.product_id, area: "pictures", format: lessonFormat(l) }, 10, i.plan!.lesson_ids)) }));
}
export async function senseInputForEval(runId: string) {
    const l = await load(runId);
    const imgs = productRefs(l);
    return { brandId: l.run.brand_id, brandName: l.brand.brand.name, truthSheet: truthSheet(l), lessons: lessonBlock(l.run.brand_id, { productId: l.run.product_id, area: "pictures" }), images: [imgs.hero, ...imgs.extras].filter((f): f is string => !!f), items: l.run.items.filter((i) => i.plan?.prompt).map((i) => ({ id: i.id, argument: i.plan!.argument, scene: i.plan!.scene, prompt: i.plan!.prompt })) };
}
