import { createHash } from "node:crypto";
import fs from "node:fs";
import { scriptVersionById } from "../scripts/versions";
import path from "node:path";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem, CardPlan, CastOption, ClipState, ConceptRow, ImagePlan, JobAsset, MotionEvent, OutputJobRow, PrepStage, ProductionState, ReferenceMode, ScriptRow, StoryFrame, StoryboardFrame, VideoPlan } from "@/db/schema";
import { humanCheckOverride, productionFindings } from "@/lib/check-review";
import { avatarDir, avatarFile, deleteAvatar, getAvatar, listAvatars, saveAvatar } from "../avatars/store";
import { avatarLine, type Avatar } from "../avatars/types";
import { resolvePackReference } from "../avatar-packs/engine";
import { avatarReferenceCompatible, type AvatarReferenceSnapshot } from "./types";
import { getPersona } from "../personas/store";
import { firstAge, paceSaid, speechPace, type SpeechPace } from "../pace";
import { speakerAge } from "../scripts/pace";
import { brandCode, type BrandBrain } from "../brand-brain";
import { loadBrandLook, lookFile, lookFingerprint } from "../brand-look";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { learnedRules, lessonBlock, lessonImages, lessonRules } from "../lessons";
import { auditPoints, logFailures } from "../failure-log";
import { conflictChecks } from "../claim-conflicts";
import { copyChecks, feedChecks, judgeWords, languageLine, pictureWordFaults, quoteChecks, researchText, reviewAds, type CopyText } from "../studio/checks";
import { planScriptAd, slotRoom } from "../studio/engine";
import { formatLook, formatLookOfType } from "../format-media";
import { formatLookReferences } from "../studio/format-look";
import { inspectImage } from "../studio/inspect";
import { changeRequest, imageRequest, splitRatios } from "../studio/request";
import { MAX_TRIES, oneClause } from "../studio/mend";
import { senseCheck, type SenseProblem } from "../studio/sense";
import { FORMAT_RECIPES, castRoles, isCinematic, type FormatRecipe } from "../formats";
import { geminiJson } from "../llm/gemini";
import { structuredJson } from "../llm/structured";
import { contextLevel } from "../llm/routing";
import { ffmpeg, grabFrame, mediaInfo, normalizeClip, overlayVideo, referenceClip, stitchClips, videoSize, type Overlay } from "../media/ffmpeg";
import { assetPath, awaitVideo, dataPath, generateImage, mediaLive, submitVideo, uid, videoCost, videoProviderProblem } from "../media/providers";
import { videoModel } from "../media/chosen";
import { videoAudioSchema, type VideoAudio } from "../video-audio";
import { acceptedLengths, lengthsText, videoModelInfo } from "../media/models";
import { adName } from "../naming";
import { renderPrompt } from "../prompts";
import { phraseRegex } from "../scripts/audit";
import { activeGuardrails } from "../scripts/guardrails";
import { getSetting } from "../settings";
import { sharedRules, skillFor } from "../skills/card";
import { listSkills } from "../skills/registry";
import { placeholderSvg } from "../skills/placeholder";
import { AWARENESS_INFO, OUTPUT_INFO, OUTPUT_TYPES, humanize, type OutputType } from "../taxonomy";
import { buildBrief } from "./brief";
import { getCreativeBrief } from "../creative-brief-store";
import { creativeBriefText } from "../creative-brief";
import { buildHandoff, clipPackage } from "./handoff";
import { contextFor, ensureCreativeKit, photoLabel, productForScript, productImages, type CreativeKit } from "./kit";
import { scriptAdBrand } from "./script-ad-brand";
import { cameraBlock, productTruthSheet } from "../product-truth";
import { productPhotoRole, productRule, sendsProductPhoto, type ProductInPicture, type ProductPlace } from "../product-in-picture";
import { tasteBlock, tasteSkillsUsed } from "../taste/apply";
import { lookToVariety, productToLegacy } from "../taste/compat";
import { compactTaste } from "../taste/schema";
import type { ContextPlan, Surface as TasteSurface, Taste } from "../taste/types";
import { jobPlan, placeOf } from "./taste";
import { addPartPhoto, partFile, photosOnFile, photosOnFileText } from "./parts";
import { MAX_CLIPS, SEGMENT_SECONDS, STORYBOARD_FRAMES, avatarBrief, avatarInFormat, avatarKindFor, sheetViews, castIsAvatar, castKindBrief, castLine, castOptions, castProblems, clampClips, clampFrames, dealScript, distinctFrames, fixedMarks, partFlag, partsWithoutPhoto, plainPartsLine, shortClipsText, drawnFrames, framesPerClip, hasStoryboard, storyboardImages, storyboardWords, withFrameWords, clipLengths, clipPrompt, clipSeconds, clipsForScript, clipsSaid, exactLayout, jobLengths, maxWords, planBlockers, planLengths, planLimits, planSeconds, productIn, propsIn, recipeUsesCharacterOnly, cuttingRule, fitSeconds, MAX_CUTS, mostShots, SHORTEST_CUT, sceneTimes, segmentSeconds, shotAt, shotPlanModeRules, coverageProblems, shotTerm, shotsFor, shotsText, framing, longestShot, cameraFeel, CAMERA_MOVES, SHOT_ANGLES, SHOT_SIZES, SHOT_SUBJECTS, spokenWords, videoPlanProblems, withAvatar, withCast } from "./prompts";
import { clipsBrief, dealFaces, dealNote, dealPlace, dealPresenter, neverShowsLowPeople, partBrief, placeBrief, placeRows, planBatches, presenterBrief, readWho, startsIn, writeInBatches, type Batch, type PlaceDeal } from "./deal";
import { PLACES } from "../copy/seeds";
import { ownPlaces } from "../studio/deal";
import { brandWorld, onCamera } from "../brain/on-camera";
import { formatBuckets } from "../references/normalize";
import { sexOf, shorten } from "./prompts";
import { storedBreakdown } from "../references/breakdown";
import { visualLesson, LEARNING_RULE } from "../references/learning";
import { recordReferenceUse } from "../references/choose";
import { productionReference } from "../scripts/reference";
import { INDIRECT_TESTS, isIndirect } from "../scripts/indirect";
import { exactSkillText, formatSkillText, nativeCreativeText } from "../scripts/skills";
import { brandVoicePack, voiceCheck } from "../scripts/voice";
import { brandOwnWords, brandVoiceText, type Surface } from "../brand-voice";
import { RunStoppedError } from "../llm/run-control";
import { voiceRulesText } from "../scripts/voice-rules";
import { motionLook } from "./motion-look";
import { captionPng, contactSheet, contrast, inLook, motionTile, splitPanels } from "./tiles";
import { claimsHeld, isClaimCheck, writingBrain } from "../claims-through";
import { checkWordsQuietly } from "../copy/checked";
import { isStoryStage, primaryLengthText, stageName } from "../copy/stage";
import { floorText } from "../copy/words-read";
import { feedLengths, fillLengths, imagePlanWords, isSpokenId, primaryTexts, readPoints, videoPlanWords, type PlanWords } from "./words";
import { CHARACTER_VIEWS, characterViewDirection, characterViewIndices, characterViewsRepairable } from "./character-view-rules";
import { characterSheetDimensions, replaceCharacterViewPixels } from "./character-view-sheet";
import { approvedSpeechProblems, exactTargetLengths, placementCaptionContract, placementCaptionProblems, requestedDurationProblems } from "./story-contract";
import { clipWords } from "./deal";
import { dealToClips, fitClipsToWords, scriptClipLayout } from "../video/clips-from-script";
const IMAGE_SIZES: Record<string, string> = { "4:5": "1024x1280", "1:1": "1024x1024", "9:16": "1008x1792", "16:9": "1792x1008" };
export const DEFAULT_RECIPE: Record<OutputType, string> = {
    human_brief_ugc: "brief",
    human_brief_founder: "brief",
    human_brief_editor: "brief",
    ai_ugc: "ugc",
    ai_claymation: "claymation",
    ai_vsl: "explainer",
    ai_podcast: "podcast",
    ai_talking_object: "talking-object",
    ai_comic: "comic",
    ai_explainer: "explainer",
    ai_satisfying: "demo",
    ai_watercolor: "watercolor",
    ai_motion_graphics: "motion-graphics",
    ai_anime: "anime",
    ai_wool: "wool",
    ai_skeleton: "skeleton",
    ai_song: "song",
    ai_collage: "collage",
    ai_paper: "paper",
    ai_clay_world: "clay-world",
    ai_cinematic_3d: "cinematic-3d",
    ai_cinematic: "cinematic",
    static_image: "static-concept",
    static_long_copy: "static-concept",
    static_advertorial: "static-concept",
    carousel: "carousel",
};
function styleSkills(recipe: FormatRecipe, preset: string, type: OutputType): string[] {
    const names = new Set<string>();
    if (recipe.base === "static" || recipe.base === "carousel") {
        for (const n of ["static-ad-factory", "photoshoot-factory"])
            names.add(n);
        const byPreset: Record<string, string> = { flash: "flash-photography", editorial: "instant-photoshoot", surreal: "scroll-stopper-static-ads", comic: "comic-book-ad" };
        if (byPreset[preset])
            names.add(byPreset[preset]);
        if (recipe.base === "carousel" && preset === "default")
            names.add("pdp-image-factory");
        if (type === "static_advertorial")
            names.add("advertorial-v1");
        if (recipe.id === "static-remix")
            names.add("recreate-winning-ads");
    }
    else {
        names.add("video-director");
        if (recipe.id === "ugc")
            for (const n of ["ugc-script", "realistic-ai-ugc", "ai-ugc-hooks"])
                names.add(n);
    }
    if (recipe.skill && recipe.skill !== "image-ad-copy")
        names.add(recipe.skill);
    return [...names];
}
const stripFrontMatter = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
function skillFile(name: string, ...rest: string[]): string {
    const hit = listSkills().find((s) => s.name === name || s.path.split("/").pop() === name);
    if (!hit)
        return "";
    const file = path.join(env.SKILLS_DIR, hit.path, ...(rest.length ? rest : ["SKILL.md"]));
    return fs.existsSync(file) ? stripFrontMatter(fs.readFileSync(file, "utf-8")) : "";
}
const withoutSections = (md: string, drop: RegExp) => md
    .split(/^(?=##? )/m)
    .filter((s) => !drop.test(s.split("\n", 1)[0].replace(/^##? /, "").trim()))
    .join("")
    .trim();
const NOT_FOR_A_PLAN = /^(After the render|What to look at after the render|Review|When the script is longer than the clips can hold)\b/i;
const WRITER_SECTIONS = /^(What it is good for|What this reads from the brand brain|Length|Rules for the words|The 5 beats|A real creator|What makes it UGC|Who the person is)$/i;
function styleText(names: string[], planner = false): {
    text: string;
    used: string[];
} {
    const card = (n: string) => skillFile(n, "CARD.md").replace(/<!--[\s\S]*?-->\s*/g, "").trim() || skillFile(n);
    const found = names.map((n) => ({ n, t: planner ? withoutSections(card(n), NOT_FOR_A_PLAN) : card(n) })).filter((x) => x.t);
    if (!found.length)
        return { text: "(none)", used: [] };
    return { text: sharedRules().trim() + "\n\n" + found.map((x) => `OPTIONAL STYLE CANDIDATE: ${x.n}\n${x.t}`).join("\n\n"), used: found.map((x) => x.n) };
}
interface Loaded {
    job: OutputJobRow;
    p: ProductionState;
    script: ScriptRow;
    concept: ConceptRow;
    brand: BrandBrain;
    kit: CreativeKit;
    recipe: FormatRecipe | null;
    claims: boolean;
}
export const jobClaims = (job: Pick<OutputJobRow, "brand_id" | "production">, script: Pick<ScriptRow, "axes">): boolean => job.production?.claim_checks ?? script.axes.claim_checks ?? claimsHeld(job.brand_id);
const CLAIMS_OFF: AuditItem = { check: "claim_checks", status: "pass", message: "Claim checks are off for this job: it was written freely. Check its facts yourself, or press Check claims." };
const shown = (l: Pick<Loaded, "claims">, items: AuditItem[]): AuditItem[] => (l.claims ? items : [CLAIMS_OFF, ...items.filter((a) => !isClaimCheck(a.check) && a.check !== CLAIMS_OFF.check)]);
async function load(jobId: string): Promise<Loaded> {
    const job = db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get();
    if (!job?.production)
        throw new Error(`Production job ${jobId} not found`);
    const stored = db.select().from(schema.scripts).where(eq(schema.scripts.id, job.script_id)).get();
    if (!stored)
        throw new Error("The job's script no longer exists");
    const script = job.production.hook_id ? { ...stored, lines: scriptVersionById(stored, job.production.hook_id) } : stored;
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    if (!concept)
        throw new Error("The script's concept no longer exists");
    const claims = jobClaims(job, script);
    const brand = writingBrain(job.brand_id, claims);
    const kit = await ensureCreativeKit(job.brand_id, mediaLive());
    return { job, p: job.production, script, concept, brand, kit, recipe: FORMAT_RECIPES.find((r) => r.id === job.production!.recipe) ?? null, claims };
}
function save(jobId: string, p: ProductionState, set: Partial<typeof schema.outputJobs.$inferInsert> = {}) {
    db.update(schema.outputJobs).set({ production: p, updated_at: new Date().toISOString(), ...set }).where(eq(schema.outputJobs.id, jobId)).run();
}
const note = (p: ProductionState, step: string, message: string) => p.log.push({ at: new Date().toISOString(), step, message });
const isVideo = (r: FormatRecipe | null) => !!r && (r.base === "ugc" || r.base === "demo");
const needsCharacter = (r: FormatRecipe | null) => !!r?.character;
function following(done: string, l: Pick<Loaded, "recipe" | "p">): string {
    if (done === "approve:script")
        return "plan";
    if (!l.recipe)
        return "done";
    if (!isVideo(l.recipe))
        return ({ plan: "approve:plan", "approve:plan": "render", render: "done" } as Record<string, string>)[done] ?? "done";
    const order = ["plan", "approve:plan", ...(needsCharacter(l.recipe) ? ["character", "approve:character"] : []), "look", "approve:look", ...(hasStoryboard(l.p) ? ["storyboard", "approve:storyboard"] : []), "clips", ...(l.p.workflow === "guided" ? ["approve:clips"] : []), "finish", "motion", "done"];
    return order[order.indexOf(done) + 1] ?? "done";
}
export interface NewJob {
    workflow?: "guided" | "automatic";
    scriptId: string;
    type: OutputType;
    recipe?: string;
    preset?: string;
    aspect?: string;
    resolution?: string;
    segments?: number;
    cards?: number;
    clipSeconds?: number;
    planModel?: string;
    claimChecks?: boolean;
    productInPicture?: ProductInPicture;
    taste?: Taste;
    notes?: string;
    referenceId?: string | null;
    tag?: "replication" | "iteration" | "net_new";
    productId?: string | null;
    burnCaptions?: boolean;
    videoAudio?: VideoAudio;
    storyboardFrames?: number;
    hookId?: string | null;
    formatLook?: string;
    avatarId?: string | null;
    avatarReferenceId?: string | null;
    targetSeconds?: number;
    captionLengths?: boolean;
}
export function avatarForJob(brandId: string, id: string, recipe: FormatRecipe): Avatar {
    const saved = getAvatar(brandId, id);
    if (!saved)
        throw new Error("That avatar is no longer saved. Pick another, or make the video with a new character.");
    const kind = avatarKindFor(recipe);
    if (!kind)
        throw new Error(`${recipe.label} has no single person or character on screen, so it can't use a saved avatar. Make it with a new character.`);
    if (!avatarLine(saved))
        throw new Error(`${saved.name} is not described yet. Describe it on the persona sheet first: a video is told who is on screen in words.`);
    const a = avatarInFormat(saved, recipe);
    if (a.kind !== kind)
        throw new Error(`${a.name} is ${a.kind === "person" ? "a person" : "a made character"}, and ${recipe.label} is made with ${kind === "person" ? "a person" : "a made character"}. Pick another avatar, or a new character.`);
    if (a.kind === "character" && a.style && a.style !== recipe.id)
        throw new Error(`${a.name} was made in another look than ${recipe.label}. Pick another avatar, or a new character.`);
    if (!avatarLine(a))
        throw new Error(`${a.name} is not described yet. Describe it on the persona sheet first: a video is told who is on screen in words.`);
    return a;
}
export function buyerAvatar(brandId: string, personaId: string | null | undefined, recipe: FormatRecipe): Avatar | null {
    if (!personaId)
        return null;
    const who = readWho(getPersona(brandId, personaId)?.who);
    const fits = (a: Avatar) => {
        if (a.kind !== "person" || !a.presenter)
            return !who.gender && !who.ages;
        const age = Number(a.presenter.age?.match(/\d{2}/)?.[0]);
        return (!who.gender || sexOf(a.presenter) === who.gender) && (!who.ages || (age >= who.ages[0] - 2 && age <= who.ages[1] + 2));
    };
    const onSheet = listAvatars(brandId, { personaId }).filter(fits);
    for (const a of [...onSheet.filter((x) => x.source !== "library"), ...onSheet.filter((x) => x.source === "library")]) {
        try {
            return avatarForJob(brandId, a.id, recipe);
        }
        catch {
        }
    }
    return null;
}
export function validFormats(): string {
    return OUTPUT_TYPES.join(", ");
}
export function checkFormat(type: string, recipeId?: string | null): void {
    if (!(OUTPUT_TYPES as readonly string[]).includes(type))
        throw new Error(`"${type}" is not an ad format the app makes. Use one of: ${validFormats()}.`);
    const t = type as OutputType;
    const group = t.startsWith("human_brief") ? "brief" : t.startsWith("ai_") ? "video" : "image";
    const id = recipeId ?? DEFAULT_RECIPE[t];
    const fits = (r: FormatRecipe) => (group === "video" ? isVideo(r) : group === "image" ? !isVideo(r) : false);
    const ok = group === "brief" ? id === "brief" : FORMAT_RECIPES.some((r) => r.id === id && fits(r));
    if (!ok)
        throw new Error(`"${id}" is not a style of ${t}. ${group === "brief" ? "A human brief has no style: leave it out." : `Use one of: ${FORMAT_RECIPES.filter(fits).map((r) => r.id).join(", ")}.`}`);
}
function speechOf(o: {
    brandId: string;
    personaId?: string | null;
    avatar?: Avatar | null;
    recipe?: Pick<FormatRecipe, "id"> | null;
    lines: {
        text: string;
    }[];
    calm?: boolean;
}): SpeechPace {
    const age = o.recipe && recipeUsesCharacterOnly(o.recipe) ? null : firstAge(o.avatar?.presenter?.age, speakerAge(o.brandId, o.personaId));
    const plain = speechPace(age, { calm: !!o.calm });
    return spokenWords(o.lines) > plain.rate * 60 ? speechPace(age, { calm: !!o.calm, long: true }) : plain;
}
function snapshotAvatarReference(jobId: string, frameId: string, reference: ReturnType<typeof resolvePackReference>, avatar: Avatar): AvatarReferenceSnapshot {
    const master = avatarFile(reference.sourcePortrait);
    if (!master || !fs.existsSync(reference.file) || createHash("sha256").update(fs.readFileSync(master)).digest("hex") !== reference.sourceSha256)
        throw new Error("The saved setting reference is no longer available. Pick a current kept frame.");
    const frameCopy = assetPath(jobId, `avatar_setting${path.extname(reference.file) || ".png"}`);
    const masterCopy = assetPath(jobId, `avatar_master${path.extname(master) || ".png"}`);
    fs.copyFileSync(reference.file, frameCopy.abs);
    fs.copyFileSync(master, masterCopy.abs);
    const sample = avatarCopy(jobId, avatar.voice.sample, "avatar_voice");
    const frozen: Avatar = { ...avatar, presenter: avatar.presenter ? { ...avatar.presenter, wardrobe: reference.setting.wardrobe || avatar.presenter.wardrobe } : undefined, portrait: masterCopy.rel.replace(/^assets\//, ""), portrait_history: undefined, sheet: null, panels: [], styled: undefined, voice: { ...avatar.voice, sample: sample?.replace(/^assets\//, "") ?? null } };
    return { id: frameId, packId: reference.packId, avatarId: reference.avatarId, file: frameCopy.rel, frameSha256: createHash("sha256").update(fs.readFileSync(frameCopy.abs)).digest("hex"), sourcePortrait: reference.sourcePortrait, sourceSha256: reference.sourceSha256, setting: reference.setting, aspect: reference.aspect, width: reference.width, height: reference.height, avatar: frozen };
}
export function createJob(n: NewJob): string {
    checkFormat(n.type, n.recipe);
    const stored = db.select().from(schema.scripts).where(eq(schema.scripts.id, n.scriptId)).get();
    if (!stored)
        throw new Error("Script not found");
    const hookId = n.hookId && stored.hook_variants.findIndex((h) => h.id === n.hookId) > 0 ? n.hookId : null;
    const script = hookId ? { ...stored, lines: scriptVersionById(stored, hookId) } : stored;
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    if (!concept)
        throw new Error("Concept not found");
    const claims = n.claimChecks ?? script.axes.claim_checks ?? claimsHeld(script.brand_id);
    const brand = writingBrain(script.brand_id, claims);
    const recipeId = n.recipe ?? DEFAULT_RECIPE[n.type];
    const recipe = FORMAT_RECIPES.find((r) => r.id === recipeId) ?? null;
    if (recipeId !== "brief" && !recipe)
        throw new Error(`Unknown format ${recipeId}`);
    const video = isVideo(recipe);
    if (!video && (n.targetSeconds !== undefined || n.captionLengths))
        throw new Error("Duration and placement-caption contracts apply to video jobs.");
    const maximumClip = Math.min(15, Math.max(4, Math.round(n.clipSeconds ?? SEGMENT_SECONDS)));
    const requestedLengths = video && n.targetSeconds !== undefined ? exactTargetLengths(n.targetSeconds, acceptedLengths(clipModel()).filter((s) => s <= maximumClip), n.segments) : null;
    const avatar = !video ? null : n.avatarId ? avatarForJob(script.brand_id, n.avatarId, recipe!) : n.avatarId === undefined ? buyerAvatar(script.brand_id, concept.persona_id, recipe!) : null;
    const mode: ReferenceMode | null = script.reference_mode ?? null;
    const referenceId = n.referenceId ?? (mode ? (script.reference_ids[0] ?? null) : null);
    const selectedReference = n.avatarReferenceId ? resolvePackReference(script.brand_id, n.avatarReferenceId) : null;
    let referenceAvatar: Avatar | null = null;
    if (selectedReference) {
        if (!n.avatarId || n.avatarId !== selectedReference.avatarId)
            throw new Error("Choose the avatar that owns this setting reference.");
        if (!recipe || !avatarReferenceCompatible(recipe.id, n.formatLook) || (video && avatarKindFor(recipe) !== "person"))
            throw new Error("This setting reference supports photographic image ads and single-person UGC or cinematic videos. Choose a compatible format.");
        const people = n.taste?.people ?? script.axes.taste?.people;
        if (people && people !== "photo")
            throw new Error("This saved setting is photographic. Choose Photo-real for People pictures to reuse it.");
        if (mode === "exact" && referenceId)
            throw new Error("An exact reference ad controls its scene. Make a new image or video to use this avatar setting.");
        if (script.axes.native)
            throw new Error("Choose a designed photographic image or compatible video script to use an avatar setting reference.");
        referenceAvatar = avatar ?? getAvatar(script.brand_id, selectedReference.avatarId) ?? null;
        if (!referenceAvatar || referenceAvatar.kind !== "person" || !avatarLine(referenceAvatar))
            throw new Error("This setting reference needs its described adult avatar. Choose another reference.");
    }
    const breakdown = mode === "exact" && referenceId ? storedBreakdown(referenceId) : null;
    const layout = video && breakdown?.duration && !(n.segments && n.clipSeconds) ? exactLayout(breakdown.duration, clipModel().seconds) : null;
    const taste = compactTaste(n.taste);
    const legacyProduct: ProductInPicture = taste.product ? productToLegacy(taste.product) : (n.productInPicture ?? "auto");
    const speechRate = video ? speechOf({ brandId: script.brand_id, personaId: concept.persona_id, avatar, recipe, lines: script.lines, calm: taste.pace === "calm" }).rate : undefined;
    const scriptClips = video && !requestedLengths && !layout && n.segments === undefined && mode !== "exact" ? scriptClipLayout(script.lines, script.est_seconds, { clip: maximumClip, rate: speechRate, mode, lengths: acceptedLengths(clipModel()) }) : null;
    const all = db.select({ id: schema.outputJobs.id }).from(schema.outputJobs).all();
    const id = `job_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    const avatarReference = selectedReference && referenceAvatar ? snapshotAvatarReference(id, n.avatarReferenceId!, selectedReference, referenceAvatar) : null;
    const skill = recipe?.skill ?? (recipeId === "brief" ? null : getSetting(script.brand_id, "skill_map")[n.type]);
    const lookId = n.formatLook === "script" ? formatLookOfType(script.format_target as OutputType | null) : (formatLook(n.formatLook)?.id ?? null);
    const p: ProductionState = {
        ...(video && n.workflow ? { workflow: n.workflow } : {}),
        recipe: recipeId,
        preset: n.preset && recipe && n.preset in recipe.presets ? n.preset : Object.keys(recipe?.presets ?? { default: "" })[0],
        aspect: n.aspect ?? (video ? "9:16" : script.axes.native ? "1:1" : "4:5"),
        resolution: video ? (n.resolution ?? "480p") : "1080",
        segments: video ? clampClips(requestedLengths?.length ?? layout?.segments ?? n.segments ?? scriptClips?.lengths.length ?? clipsForScript(script.lines, maximumClip, speechRate, acceptedLengths(clipModel()))) : 0,
        ...(scriptClips ? { script_clips: scriptClips } : {}),
        ...(video ? { clip_seconds: requestedLengths ? maximumClip : Math.min(15, Math.max(4, Math.round(layout?.clipSeconds ?? n.clipSeconds ?? SEGMENT_SECONDS))) } : {}),
        ...(requestedLengths ? { target_seconds: n.targetSeconds } : {}),
        ...(video && n.captionLengths ? { caption_lengths: true } : {}),
        cards: recipe?.base === "carousel" ? Math.min(6, Math.max(2, n.cards ?? 5)) : recipe ? 1 : 0,
        notes: (n.notes ?? "").slice(0, 2000),
        ...(hookId ? { hook_id: hookId } : {}),
        ...(avatar ? { avatar_id: avatar.id } : {}),
        ...(avatarReference ? { avatar_id: avatarReference.avatarId, avatar_reference: avatarReference } : {}),
        product_id: brand.products.find((x) => x.id === n.productId)?.id ?? productForScript(brand, concept, script),
        reference_id: referenceId,
        reference_mode: mode,
        ...(n.planModel ? { plan_model: n.planModel } : {}),
        ...(recipe && !video && legacyProduct !== "auto" ? { product_in_picture: legacyProduct } : {}),
        ...(Object.keys(taste).length ? { taste } : {}),
        ...(recipe && !video && !script.axes.native && lookId ? { format_look: lookId } : {}),
        claim_checks: claims,
        ...((video || recipeId === "brief") && n.burnCaptions ? { burn_captions: true } : {}),
        ...(video && n.videoAudio ? { video_audio: videoAudioSchema.parse(n.videoAudio) } : {}),
        ...(video ? { storyboard_frames: clampFrames(n.storyboardFrames ?? STORYBOARD_FRAMES.default) } : {}),
        context_used: {},
        skills_used: [],
        plan_status: "none",
        audit: [],
        clips: [],
        next: recipeId === "brief" ? "brief" : video && n.workflow === "guided" ? "approve:script" : "plan",
        log: [],
    };
    if (avatarReference)
        note(p, "plan", `Saved setting: ${avatarReference.setting.label} (${avatarReference.avatar.name}); one kept frame copied into this job.`);
    db.insert(schema.outputJobs)
        .values({
        id,
        brand_id: script.brand_id,
        script_id: script.id,
        output_type: n.type,
        skill,
        count: p.cards || 1,
        payload: {},
        status: p.next.startsWith("approve:") ? "in_review" : "queued",
        assets: [],
        meta_ad_name: adName(getSetting(script.brand_id, "naming").ad, {
            brandCode: brandCode(brand),
            conceptId: concept.id,
            scriptId: script.id,
            version: script.version,
            outputShort: OUTPUT_INFO[n.type].short,
            hookId: hookId ?? script.hook_variants[0]?.id ?? null,
            creatorOrSkill: recipeId === "brief" ? "creator" : (skill ?? recipeId),
        }),
        tag: n.tag ?? (mode === "exact" ? "replication" : referenceId ? "iteration" : "net_new"),
        production: p,
    })
        .run();
    return id;
}
const scriptRows = (s: ScriptRow, numbered = false, only?: Set<number> | null) => s.lines.map((l, i) => (only && !only.has(i) ? "" : `${numbered ? `${i + 1} | ` : ""}${l.beat} | ${l.text} | ${l.on_screen ?? ""} | ${l.visual_note ?? ""} | ${[...l.theme_ids, ...l.claim_ids].join(", ")}`)).filter(Boolean).join("\n");
function conceptText(l: Loaded): string {
    const persona = l.brand.personas.find((x) => x.id === l.concept.persona_id);
    return `${l.concept.name}\nPersona: ${persona ? `${persona.name}. ${persona.summary}` : l.concept.persona_id}\nAngle: ${l.concept.angle}\nAwareness stage: ${AWARENESS_INFO[l.concept.awareness_stage].label}. Sophistication stage: ${l.concept.sophistication_stage}.`;
}
function referenceText(id: string | null, mode?: ReferenceMode | null): string {
    if (!id)
        return "(none chosen)";
    const r = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    const a = r?.analysis as Record<string, unknown> | null | undefined;
    if (!r || !a)
        return "(the chosen reference has no analysis)";
    return productionReference(mode, { id: r.id, kind: r.kind, title: r.title, format: r.tags.format ?? [], hook: r.tags.hook ?? [], approach: r.tags.approach ?? [], awareness: String((r.awareness as {
            stage?: string;
        } | null)?.stage ?? ""), analysis: a }, storedBreakdown(id));
}
function referenceImage(id: string | null): string | null {
    if (!id)
        return null;
    const r = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!r || r.kind !== "image" || !r.media_path)
        return null;
    const file = path.resolve(r.media_root === "data" ? env.DATA_DIR : env.SKILLS_DIR, r.media_path);
    return fs.existsSync(file) ? file : null;
}
function auditText(l: Loaded, texts: {
    text: string;
    where: string;
}[]): AuditItem[] {
    const items: AuditItem[] = [];
    for (const phrase of l.brand.forbidden_claims)
        for (const t of texts)
            if (phraseRegex(phrase).test(t.text))
                items.push({ check: "forbidden_claims", status: "fail", message: `Forbidden claim "${phrase}" in ${t.where}.` });
    for (const g of activeGuardrails(l.job.brand_id))
        for (const phrase of g.guardrail.banned)
            for (const t of texts)
                if (phraseRegex(phrase).test(t.text))
                    items.push({ check: "guardrails", status: "fail", message: `"${phrase}" in ${t.where} breaks the guardrail from "${g.label}".` });
    if (!items.length)
        items.push({ check: "claims_and_guardrails", status: "pass", message: "No forbidden claims or banned phrases" });
    return items;
}
function jobSkillText(l: Loaded, planner = false): {
    text: string;
    used: string[];
} {
    const parts: string[] = [];
    const used: string[] = [];
    const storyboard = isVideo(l.recipe) ? skillFor("operator-creative/avatar-storyboard") : "";
    if (storyboard) {
        parts.push(`STORY METHOD: avatar identity and storyboard continuity\n${storyboard}`);
        used.push("operator-creative/avatar-storyboard");
    }
    const editing = isVideo(l.recipe) && !planner ? skillFor("operator-creative/video-editing") : "";
    if (editing) {
        parts.push(`EDITING METHOD: brand typography, readable timing and continuity\n${editing}`);
        used.push("operator-creative/video-editing");
    }
    const exact = l.p.reference_mode === "exact" ? exactSkillText() : "";
    if (exact) {
        parts.push(`TASK SKILL: ad-reference-exact (this job remakes an existing ad; these rules come first)\n${exact}`);
        used.push("ad-reference-exact");
    }
    const native = l.script.axes.native;
    const nativeImage = native && !isVideo(l.recipe) ? nativeCreativeText(native.image) : "";
    if (nativeImage) {
        parts.push(`TASK SKILL: native-ad-creative (this job is a native image ad; the image is planned with this skill and must look like a person's post, never a designed ad)\n${nativeImage}`);
        used.push("native-ad-creative", `native-ad-types/${native!.image}`);
        if (isIndirect(native)) {
            parts.push(`COLD-TRAFFIC (INDIRECT) AD: this image is shown to people who have never heard of the brand. It is a capture, not a render: a phone snapshot, mixed room light, real clutter, real skin. It plants 1 question and does not answer it. No product, no pack, no logo, no button, and no words except the few its image type allows. It must pass both tests:\n${INDIRECT_TESTS.map((t) => `- ${t}`).join("\n")}`);
            used.push("indirect-ads");
        }
    }
    const format = formatSkillText(l.job.output_type);
    const formatText = format && planner && isVideo(l.recipe) ? withoutSections(format.text, WRITER_SECTIONS) : (format?.text ?? "");
    if (format && formatText) {
        parts.push(`FORMAT SKILL: ${format.name} (how a script is fitted to this format${exact ? "; it never overrides the rule that the words stay as they are" : ""})\n${formatText}`);
        used.push(format.name);
    }
    return { text: parts.length ? `${parts.join("\n\n")}\n\n` : "", used };
}
async function stepBrief(l: Loaded) {
    const ctx = contextFor("brief", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id });
    const md = buildBrief({ type: l.job.output_type, script: l.script, concept: l.concept, creativeBrief: getCreativeBrief(l.job.brand_id, l.concept.id), brand: l.brand, kit: l.kit, guardrails: activeGuardrails(l.job.brand_id), adName: l.job.meta_ad_name ?? "", captions: !!l.p.burn_captions, wordsPerSecond: speechOf({ brandId: l.job.brand_id, personaId: l.concept?.persona_id, lines: l.script.lines }).rate });
    const file = assetPath(l.job.id, "brief.md");
    fs.writeFileSync(file.abs, md);
    l.p.brief_markdown = md;
    l.p.context_used.brief = ctx.fields;
    l.p.next = "done";
    note(l.p, "brief", "Brief written from the script, concept and brand brain");
    save(l.job.id, l.p, { status: "in_review", assets: [{ path: file.rel.replace(/^assets\//, ""), kind: "doc", caption: "Brief (markdown)" }] });
}
export function jobProductPlace(l: PlanFacts): ProductPlace {
    return placeOf(planOf(l));
}
type PlanFacts = Pick<Loaded, "p" | "concept" | "script" | "job" | "kit" | "recipe">;
export function planOf(l: PlanFacts, surface?: TasteSurface): ContextPlan {
    return jobPlan({
        stored: l.p.taste,
        scriptTaste: l.script.axes.taste,
        productInPicture: l.p.product_in_picture,
        scriptVariety: l.script.axes.variety,
        referenceMode: l.p.reference_mode,
        recipe: l.p.recipe,
        native: !!l.script.axes.native,
        cards: l.p.cards,
        video: isVideo(l.recipe),
        stage: l.concept.awareness_stage,
        format: l.job.output_type,
        hasReference: !!l.p.reference_id,
        hasReferenceImage: !!referenceImage(l.p.reference_id),
        productHasPhoto: !!productImages(l.job.brand_id, l.kit, l.p.product_id).hero,
        hasBrandRefs: !!loadBrandLook(l.job.brand_id),
    }, surface);
}
const tasteText = (plan: ContextPlan) => {
    const t = tasteBlock(plan);
    return t ? `THE CHOICES MADE FOR THIS PIECE (they come before the style guidance and the reference):\n${t}` : "";
};
const planPlace = (l: Pick<Loaded, "p">): ProductPlace => l.p.product_place ?? "shown";
const CardOut = z.object({ description: z.string().min(5), purpose: z.string(), prompt: z.string().min(20), text_elements: z.array(z.preprocess((v) => (typeof v === "string" ? { text: v, role: "text", placement: "" } : v), z.object({ text: z.string().min(1), role: z.string().default("text"), placement: z.string().default("") }))).max(12) });
const ImagePlanOut = z.object({
    title: z.string(),
    archetype: z.string(),
    concept: z.string(),
    visual_direction: z.string(),
    cards: z.array(CardOut).min(1).max(10),
    ad_copy: z.object({ primary_text: z.object({ short: z.string().min(10), medium: z.string().min(10), long: z.string().min(10) }), headlines: z.array(z.string()).min(1).max(5), description: z.string(), cta: z.string() }),
    theme_ids: z.array(z.string()),
    claim_ids: z.array(z.string()),
    placeholders: z.array(z.string()),
    compliance_flags: z.array(z.string()),
});
const ImagePlanDraft = ImagePlanOut.extend({ ad_copy: ImagePlanOut.shape.ad_copy.extend({ primary_text: z.object({ short: z.string().default(""), medium: z.string().default(""), long: z.string().min(10) }) }) });
const DRAFT_RULES = "FIRST DRAFT. Write the complete plan.";
function mockImagePlan(l: Loaded): ImagePlan {
    const hook = l.script.lines[0]?.text ?? l.script.title;
    const offer = l.script.lines.find((x) => x.beat === "offer")?.text ?? "";
    const cards: CardPlan[] = Array.from({ length: l.p.cards }, (_, i) => ({ description: `Mock card ${i + 1} for "${l.script.title}".`, purpose: i === 0 ? "hook" : "argument", prompt: `Placeholder art direction for card ${i + 1} (mock mode).`, text_elements: [{ text: (l.script.hook_variants[i]?.text ?? hook).slice(0, 80), role: "headline", placement: "top, large" }] }));
    return { title: l.script.title, archetype: "mock", concept: l.concept.name, visual_direction: "Mock mode: no model was called.", cards, ad_copy: { primary_text: { short: hook, medium: `${hook} ${offer}`.trim(), long: l.script.lines.map((x) => x.text).join(" ") }, headlines: [l.script.title.slice(0, 40)], description: "", cta: "Learn more" }, theme_ids: [...new Set(l.script.lines.flatMap((x) => x.theme_ids))], claim_ids: [...new Set(l.script.lines.flatMap((x) => x.claim_ids))], placeholders: [], compliance_flags: ["Mock mode: placeholder plan"] };
}
async function planWithStudio(l: Loaded, place: ProductPlace): Promise<{
    plan: ImagePlan;
    judged: AuditItem[];
}> {
    const recipe = l.recipe!;
    const persona = l.brand.personas.find((x) => x.id === l.concept.persona_id);
    const GENERAL_STYLE = ["static-ad-factory", "photoshoot-factory"];
    const style = styleText(styleSkills(recipe, l.p.preset, l.job.output_type).filter((n) => !!l.p.reference_id || !GENERAL_STYLE.includes(n)));
    const jobSkills = jobSkillText(l);
    const carousel = l.p.cards > 1;
    const kit = l.script.kit;
    const late = l.concept.awareness_stage === "product_aware" || l.concept.awareness_stage === "most_aware";
    const feedCopy = !l.claims && kit?.primary_text?.trim() && kit.headline?.trim() ? { primary_text: kit.primary_text.trim(), headline: kit.headline.trim(), description: "", cta: late ? "Shop now" : "Learn more", more: { medium: "", long: "", headlines: (kit.hook_texts ?? []).map((h) => h.headline?.trim() ?? "").filter(Boolean).slice(0, 2) } } : undefined;
    const taste = planOf(l);
    const refId = (taste.attach.referenceImage || taste.text.referenceDescription === "detailed") && referenceImage(l.p.reference_id) ? l.p.reference_id : null;
    const look = formatLook(l.p.format_look);
    const typeNote = l.job.output_type === "static_long_copy" ? " This is a long-copy static: a plain native photo, with the selling done in the long primary text." : l.job.output_type === "static_advertorial" ? " This is an advertorial static: an article or listicle look, honest comparisons only." : "";
    const notes = [
        l.p.notes ? `From the person: ${l.p.notes}` : "",
        creativeBriefText(getCreativeBrief(l.job.brand_id, l.concept.id)),
        avatarSettingDirection(l.p),
        `${carousel ? `These ${l.p.cards} images are the cards of 1 carousel, read in order` : "This is 1 ad"}, cut from an approved script. The script already carries the claim, the hook, the mechanism, the proof and the offer, each tied to what customers said. The picture, the words on it and the feed copy make that script's 1 argument: no second argument, and no scene the script does not lead to.`,
        carousel ? `Every card is for the same buyer at the same stage. Card 1 stops the scroll; each card after it takes the argument 1 step further; the last card makes the next action clear, with only the offer terms the brand gives, in 20 words or fewer. The cards are made 1 at a time, so each plan says what keeps them 1 set (the same surface, light, palette and type). The feed copy is written once, on card_1.` : "",
        `The buyer and the stage are decided. For every item, \`buyer\` is "${l.concept.persona_id}"${persona ? ` (${persona.name})` : ""} and \`awareness\` is "${l.concept.awareness_stage}".`,
        `Concept: ${conceptText(l)}`,
        `Format: ${recipe.label}.${typeNote} ${recipe.craft}${recipe.presets[l.p.preset] ? ` Look: ${recipe.presets[l.p.preset]}` : ""}`,
        look ? `Every picture of this job is made in the ${look.label} format, as a still: ${look.what} The rules of that format are with the planner.` : "",
        l.p.reference_mode === "structure" ? "The reference ad's structure is kept: its reading order and the job of each text. The words are the script's." : "",
        `The approved script (beat | spoken | on-screen text | visual note | evidence ids):\n${scriptRows(l.script)}`,
        l.script.hook_variants.length ? `Its hook variants:\n${l.script.hook_variants.map((h, i) => `${i + 1}. ${h.text}${h.overlay ? ` (overlay: ${h.overlay})` : ""}`).join("\n")}` : "",
        feedCopy ? `Its feed copy is written and runs with the ad as it is (none is written here). Its headlines, which the picture may also use: ${[feedCopy.headline, ...feedCopy.more.headlines].join(" | ")}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    const pictureCraft = [
        l.p.reference_id ? `The reference ad to borrow from (its persuasion structure, never its copy, product, claims or look):\n${referenceText(l.p.reference_id, l.p.reference_mode)}` : "",
        jobSkills.text || style.used.length ? `How a picture of this format is made (craft of the picture only, never a claim or a fact${carousel ? "; it holds for every card" : ""}):\n${jobSkills.text}${style.used.length ? style.text : ""}` : "",
    ].filter(Boolean);
    const out = await planScriptAd({
        jobId: l.job.id,
        brandId: l.job.brand_id,
        productId: l.p.product_id!,
        title: l.script.title,
        aspect: l.p.aspect,
        notes,
        claimChecks: l.claims,
        place,
        cards: Array.from({ length: l.p.cards }, (_, i) => ({ label: carousel ? `${recipe.label}, card ${i + 1} of ${l.p.cards}` : recipe.label, direction: l.p.notes, brief: i === 0 ? pictureCraft : [], refId })),
        roles: (plan) => cardRefs(l, plan.text_elements.length > 0).roles,
        format: l.job.output_type,
        ...(look ? { formatLook: look.id } : {}),
        variety: lookToVariety(taste.taste.look === "reference" ? "between" : taste.taste.look),
        taste: { ...taste.taste, look: taste.taste.look === "reference" ? "between" : taste.taste.look },
        stage: l.concept.awareness_stage,
        ...(feedCopy ? { feedCopy } : {}),
    });
    if (feedCopy)
        note(l.p, "plan", "Feed copy: the script's own primary text and headlines, as written and checked with it. None was written again");
    l.p.skills_used = [...new Set([...l.p.skills_used, ...tasteSkillsUsed(taste), ...(look ? [look.skill, `${look.skill}/image`] : [])])];
    for (const m of out.log)
        note(l.p, "plan", m);
    const first = out.plans[0];
    const copy = first.ad_copy ?? out.plans.find((x) => x.ad_copy)?.ad_copy;
    if (!copy)
        throw new Error("The plan came back with no feed copy. Write the plan again.");
    const ids = { themes: new Set(l.script.lines.flatMap((x) => x.theme_ids)), claims: new Set(l.script.lines.flatMap((x) => x.claim_ids)) };
    const cited = new Set(out.plans.flatMap((x) => x.text_elements.map((t) => t.source ?? "")).filter(Boolean));
    const plan: ImagePlan = {
        title: first.title,
        archetype: recipe.label,
        concept: first.argument,
        visual_direction: first.layout,
        cards: out.plans.map((x) => ({
            description: x.scene,
            purpose: x.argument,
            prompt: `${x.prompt}${x.ratio_notes?.[l.p.aspect] ? `\n\nIN THIS SHAPE (${l.p.aspect})\n${x.ratio_notes[l.p.aspect]}` : ""}`,
            text_elements: x.text_elements.map((t) => ({ text: t.text, role: t.role, placement: t.placement })),
        })),
        ad_copy: { primary_text: { short: copy.primary_text, medium: copy.more?.medium || copy.primary_text, long: copy.more?.long || copy.more?.medium || copy.primary_text }, headlines: [copy.headline, ...(copy.more?.headlines ?? [])].slice(0, 3), description: copy.description, cta: copy.cta || "Learn more" },
        theme_ids: [...ids.themes].filter((x) => !cited.size || cited.has(x)),
        claim_ids: [...ids.claims].filter((x) => !cited.size || cited.has(x)),
        placeholders: out.plans.flatMap((x) => x.text_elements.map((t) => t.text)).filter((t) => /\[[^\]]+\]/.test(t)),
        compliance_flags: out.plans.flatMap((x) => (x.sense?.status === "check" ? x.sense.notes : [])),
    };
    l.p.context_used.copy = out.fields;
    l.p.context_used.image_prompt = ["product", "brand look (fonts and colours)", "lessons"];
    l.p.skills_used = [...new Set([...out.skills, ...jobSkills.used, ...style.used])];
    return { plan, judged: out.judged.map((a) => ({ check: a.check, status: a.status, message: a.message.replace(/^Image (\d+)/, carousel ? "Card $1" : "The ad") })) };
}
async function stepImagePlan(l: Loaded) {
    avatarReferenceImageRefs(l.p);
    const recipe = l.recipe!;
    let plan: ImagePlan;
    let judged: AuditItem[] = [];
    let read: AuditItem[] = [];
    const taste = planOf(l);
    const place = placeOf(taste);
    l.p.product_place = place;
    const chose = !!(l.p.taste?.product ?? l.script.axes.taste?.product) || !!l.p.product_in_picture;
    if (place !== "shown")
        note(l.p, "plan", `The product in the picture (${chose ? "your choice" : l.script.axes.native ? "a native ad" : "decided by the concept's stage"}): ${place === "none" ? "left out, and no product photo is sent" : "only in the background"}`);
    for (const w of taste.warnings)
        note(l.p, "plan", w);
    const hasPhoto = !!productImages(l.job.brand_id, l.kit, l.p.product_id).hero || place === "none";
    const own = !!l.script.axes.native || l.p.reference_mode === "exact" || !l.brand.products.some((x) => x.id === l.p.product_id) || !hasPhoto;
    if (!mediaLive())
        plan = mockImagePlan(l);
    else if (!own)
        ({ plan, judged } = await planWithStudio(l, place));
    else {
        if (!hasPhoto)
            note(l.p, "plan", "There is no photo of this product on file, so none is sent to the image model: the product in the picture is drawn from its description. Add a product photo for a true pack.");
        const args = { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id };
        const cut = scriptAdBrand(l);
        const copy = cut.copy;
        const image = contextFor("image_prompt", args);
        const style = styleText(styleSkills(recipe, l.p.preset, l.job.output_type));
        const jobSkills = jobSkillText(l);
        const images = [taste.attach.productPhotos !== "none" ? productImages(l.job.brand_id, l.kit, l.p.product_id).hero : null, taste.attach.referenceImage ? referenceImage(l.p.reference_id) : null].filter((x): x is string => !!x);
        const selectedRefs = avatarReferenceImageRefs(l.p);
        const selectedRoles = selectedRefs.map((r, i) => `Image ${images.length + i + 1} is ${r.purpose}.`).join("\n");
        images.push(...selectedRefs.map((r) => r.file));
        const typeNote = l.job.output_type === "static_long_copy" ? " This is a long-copy static: a plain native photo, with the selling done in the long primary text." : l.job.output_type === "static_advertorial" ? " This is an advertorial static: an article or listicle look, honest comparisons only." : "";
        const stage = l.concept.awareness_stage ?? null;
        const writes = l.p.reference_mode !== "exact" && !l.script.axes.native;
        const vars = {
            floor: floorText(),
            stage_rules: stage && writes ? `## The buyer's stage: ${stageName(stage)}\n${primaryLengthText(stage)}` : "",
            feed_lengths: l.script.axes.native ? "`primary_text` is the approved script, word for word, and the app sets it: put the script's first sentence in `long` and leave `short` and `medium` as empty strings." : feedLengths(writes ? stage : null),
            ...cut.skills({ skill: skillFile("image-ad-copy"), playbook: skillFile("image-ad-copy", "references", "performance-playbook.md"), patterns: skillFile("image-ad-copy", "references", "winning-ad-patterns.md") }),
            style_skills: `${jobSkills.text}${style.text}`,
            format_label: recipe.label + typeNote,
            craft: recipe.craft,
            preset: `${l.p.preset}${recipe.presets[l.p.preset] ? `: ${recipe.presets[l.p.preset]}` : ""}`,
            cards: String(l.p.cards),
            aspect: l.p.aspect,
            notes: l.p.notes || "(none)",
            copy_context: JSON.stringify(copy.data),
            image_context: JSON.stringify(image.data),
            concept: conceptText(l),
            script_id: l.script.id,
            script: `beat | spoken | on-screen text | visual note | evidence ids\n${scriptRows(l.script)}`,
            hooks: l.script.hook_variants.map((h, i) => `${i + 1}. ${h.text}${h.overlay ? ` (overlay: ${h.overlay})` : ""}`).join("\n"),
            reference: referenceText(l.p.reference_id, l.p.reference_mode),
            lessons: lessonBlock(l.job.brand_id, { productId: l.p.product_id, area: ["words", "pictures"], format: l.job.output_type }) || "(none yet)",
            brand_voice: `${brandVoicePack(l.job.brand_id, l.brand, l.script.theme_ids, { surfaces: ["on_image", "headline", "primary_text"], personaIds: l.concept?.persona_id ? [l.concept.persona_id] : [], ...cut.voice }).text}

## Writing rules for every word a customer reads (each is checked afterwards)
${voiceRulesText(getSetting(l.job.brand_id, "voice"), false, isStoryStage(stage), stage)}`,
            language: languageLine(l.brand),
            copy_craft: "",
        };
        const modeRule = l.p.reference_mode === "exact" ? " REFERENCE MODE A, SAME AD IN A NEW FORMAT: the script is a finished ad copied word for word. The on-image text_elements are its own lines, verbatim and in order, spread across the cards by the job each line does. Do not reword, add or drop lines. The platform copy (ad_copy) restates the same lines and adds no new claim." : l.p.reference_mode === "structure" ? " REFERENCE MODE B, KEEP THE STRUCTURE: keep the reference's reading order and the job of each text element; the words are the script's." : "";
        const nativeRule = l.script.axes.native
            ? " NATIVE IMAGE AD: the script is a long story that runs as the primary text exactly as written; do not rewrite or shorten it. Plan 1 card: the image the native-ad-creative skill and its image type describe, taken from the copy's opening or breaking point (the hook variants each name a moment). text_elements holds only the words that type puts on the image (an empty list for a photo type). No logo, no price, no button, no designed layout. headlines are the 'Read this if...' lines from the hook variants."
            : "";
        const planModel = l.p.plan_model ?? env.MODEL_PLAN;
        const productLine = ` THE PRODUCT IN THE PICTURE (this comes before any line below about where the pack sits, and before the reference): ${productRule(place)}`;
        const choices = tasteText(taste);
        const draftPrompt = renderPrompt("image-plan", { ...vars, mode_rules: DRAFT_RULES + modeRule + nativeRule + productLine + (choices ? `\n\n${choices}` : "") + (selectedRefs.length ? `\n\n${avatarSettingDirection(l.p)}\n${selectedRoles}` : ""), candidate: "" });
        const draft = await geminiJson({ brandId: l.job.brand_id, task: "image_plan", model: env.MODEL_COPY, system: draftPrompt.system, user: draftPrompt.user, schema: ImagePlanDraft, images, effort: "high", maxTokens: 32000, refType: "job", refId: l.job.id });
        const edited = draft;
        const ids = new Set(l.script.lines.flatMap((x) => [...x.theme_ids, ...x.claim_ids]));
        plan = { ...edited, cards: edited.cards.slice(0, l.p.cards), theme_ids: edited.theme_ids.filter((x) => ids.has(x)), claim_ids: edited.claim_ids.filter((x) => ids.has(x)), ad_copy: { ...edited.ad_copy, primary_text: fillLengths(edited.ad_copy.primary_text), headlines: edited.ad_copy.headlines.slice(0, 3) } };
        l.p.context_used.copy = copy.fields;
        l.p.context_used.image_prompt = image.fields;
        l.p.skills_used = ["image-ad-copy", ...jobSkills.used, ...style.used, ...tasteSkillsUsed(taste)];
        const editors = process.env.STUDIO_EDITORS === "on";
        if (editors)
            plan = await voiceImagePlan(l, plan);
        if (l.script.axes.native)
            plan = nativeCopy(l.script, plan);
        if (!editors) {
            plan = JSON.parse(JSON.stringify(plan)) as ImagePlan;
            read = await readImagePlan(l, plan);
        }
        if (l.claims) {
            plan = JSON.parse(JSON.stringify(plan)) as ImagePlan;
            const claims = await claimsPass(l, imagePlanSlots(plan, !!l.script.axes.native), IMAGE_WORDS);
            judged = claims.items;
            if (claims.changed && !editors)
                read = await readImagePlan(l, plan, { report: true });
        }
        plan = await imagePrompts(l, plan, planModel);
        l.p.skills_used = [...l.p.skills_used, "image-prompt-craft"];
    }
    setImagePlan(l, plan);
    if (mediaLive())
        l.p.audit = [...l.p.audit, ...judged, ...read, ...(getSetting(l.job.brand_id, "checks").ad_review ? await reviewImagePlan(l, plan) : [])];
    logFailures({ brandId: l.job.brand_id, refType: "job", refId: l.job.id, productId: l.p.product_id }, auditPoints(l.p.audit));
    note(l.p, "plan", `Plan written: ${plan.cards.length} card${plan.cards.length === 1 ? "" : "s"}, copy in 3 lengths`);
    l.p.next = "approve:plan";
    save(l.job.id, l.p, { status: "in_review" });
}
const JUDGED = ["claims_judge", "ad_review", "words_read"];
const planWords = (plan: ImagePlan) => JSON.stringify([plan.cards.map((c) => c.text_elements.map((t) => t.text)), plan.ad_copy]);
export interface WordSlot {
    label: string;
    headline?: boolean;
    get: () => string;
    set: (v: string) => void;
}
const IMAGE_WORDS = "an image ad and its feed copy";
const VIDEO_WORDS = "a video ad: its spoken lines, its on-screen text and its feed copy";
function copySlots(c: ImagePlan["ad_copy"], opts: {
    primary?: boolean;
} = {}): WordSlot[] {
    const lengths = ["short", "medium", "long"] as const;
    const byText = new Map<string, (typeof lengths)[number][]>();
    if (opts.primary !== false)
        for (const k of lengths)
            byText.set(c.primary_text[k], [...(byText.get(c.primary_text[k]) ?? []), k]);
    return [
        ...[...byText.values()].map((aliases): WordSlot => ({ label: `Feed copy, primary text (${aliases.join(", ")})`, get: () => c.primary_text[aliases[0]], set: (v) => aliases.forEach((k) => void (c.primary_text[k] = v)) })),
        ...c.headlines.map((_, i): WordSlot => ({ label: `Feed copy, headline ${i + 1}`, headline: true, get: () => c.headlines[i], set: (v) => void (c.headlines[i] = v) })),
        { label: "Feed copy, description", get: () => c.description, set: (v) => void (c.description = v) },
        { label: "Feed copy, CTA", get: () => c.cta, set: (v) => void (c.cta = v) },
    ];
}
export function imagePlanSlots(plan: ImagePlan, native: boolean): WordSlot[] {
    return [
        ...plan.cards.flatMap((c, i) => c.text_elements.map((t): WordSlot => ({ label: `Card ${i + 1}, ${t.role}`, get: () => t.text, set: (v) => void (t.text = v) }))),
        ...copySlots(plan.ad_copy, { primary: !native }),
    ];
}
export function videoPlanSlots(plan: VideoPlan): WordSlot[] {
    return [
        ...plan.segments.flatMap((s, i) => s.scenes.flatMap((x, j): WordSlot[] => [
            { label: `Clip ${i + 1} scene ${j + 1}, spoken`, get: () => x.dialogue, set: (v) => void (x.dialogue = v) },
            { label: `Clip ${i + 1} scene ${j + 1}, on-screen text`, get: () => x.overlay, set: (v) => void (x.overlay = v) },
        ])),
        ...(plan.ad_copy ? copySlots(plan.ad_copy) : []),
    ];
}
function ruleHits(l: Pick<Loaded, "job" | "brand">, slots: WordSlot[]): {
    at: number;
    problem: string;
}[] {
    const guard = activeGuardrails(l.job.brand_id);
    return slots.flatMap((s, at) => {
        const text = s.get();
        return [
            ...l.brand.forbidden_claims.filter((phrase) => phraseRegex(phrase).test(text)).map((phrase) => ({ at, problem: `It uses the forbidden claim "${phrase}".` })),
            ...guard.flatMap((g) => g.guardrail.banned.filter((phrase) => phraseRegex(phrase).test(text)).map((phrase) => ({ at, problem: `"${phrase}" breaks the guardrail from "${g.label}": ${g.guardrail.rule}` }))),
        ];
    });
}
const PlanRepairOut = z.object({ changes: z.array(z.object({ index: z.number().int(), text: z.string().min(1) })).max(40), note: z.string().default("") });
async function repairWords(l: Pick<Loaded, "job" | "brand">, slots: WordSlot[], fails: {
    at: number;
    problem: string;
}[]): Promise<number> {
    const { brand } = l;
    const failing = new Set(fails.map((f) => f.at));
    const p = renderPrompt("plan-repair", {
        brand_name: brand.brand.name,
        claims: [...brand.claims.filter((c) => c.status === "substantiated").map((c) => `- ${c.text}`), ...(brand.guarantee ? [`- The guarantee: ${brand.guarantee.text}`] : []), ...brand.offers.map((o) => `- Offer: ${o.name}, ${o.price}${o.notes ? `. ${o.notes}` : ""}`)].join("\n") || "(none)",
        forbidden: brand.forbidden_claims.join("; ") || "(none)",
        guardrails: activeGuardrails(l.job.brand_id).filter((g) => g.guardrail.applies).map((g) => `- ${g.guardrail.rule}`).join("\n") || "(none)",
        brand_voice: brandVoiceText(l.job.brand_id, { surfaces: ["on_image", "headline", "primary_text"], brand }),
        lessons: learnedRules(l.job.brand_id, "edits", { format: l.job.output_type }),
        fails: fails.map((f) => `- [${f.at}] ${slots[f.at]?.label ?? ""}: ${f.problem}`).join("\n"),
        blocks: slots.flatMap((s, at) => (s.get().trim() ? [`[${at}] ${s.label}\n${s.get()}`] : [])).join("\n\n"),
    });
    const out = await structuredJson({ brandId: l.job.brand_id, task: "line_repair", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: PlanRepairOut, effort: "low", maxTokens: 6000, refType: "job", refId: l.job.id });
    let changed = 0;
    for (const c of out.changes) {
        const s = slots[c.index];
        const text = c.text.trim();
        if (!s || !failing.has(c.index) || !text || text === s.get() || (s.headline && text.length > 40))
            continue;
        s.set(text);
        changed++;
    }
    return changed;
}
export async function claimsPass(l: Pick<Loaded, "job" | "p" | "brand">, slots: WordSlot[], what: string, opts: {
    accept?: () => boolean;
} = {}): Promise<{
    items: AuditItem[];
    changed: number;
}> {
    const read = async () => {
        const lines = slots.flatMap((s, at) => (s.get().trim() ? [{ id: `w${at + 1}`, where: s.label, text: s.get() }] : []));
        const found = await judgeWords({ brandId: l.job.brand_id, brand: l.brand, what, lines, refType: "job", refId: l.job.id });
        return found.map((x) => ({ ...x, at: Number(x.id.slice(1)) - 1 }));
    };
    let changed = 0;
    try {
        let found = await read();
        const failing = [...found.filter((x) => x.severity === "fail").map((x) => ({ at: x.at, problem: x.problem })), ...ruleHits(l, slots)].filter((f) => slots[f.at]);
        if (failing.length && l.p.reference_mode !== "exact") {
            const before = slots.map((s) => s.get());
            const undo = (why: string) => {
                slots.forEach((s, at) => s.set(before[at]));
                changed = 0;
                note(l.p, "plan", `The rewrite after the claims read was not kept: ${why}. The first draft stands, with its points.`);
            };
            try {
                changed = await repairWords(l, slots, failing);
                if (changed && opts.accept && !opts.accept())
                    undo("the new words no longer fit the clips");
            }
            catch (e) {
                undo((e as Error).message.slice(0, 120));
            }
            if (changed) {
                note(l.p, "plan", `${failing.length} claim point${failing.length === 1 ? "" : "s"} went back to the writer: ${changed} block${changed === 1 ? " was" : "s were"} written again`);
                found = await read();
            }
        }
        note(l.p, "plan", `Claims read by ${env.MODEL_VOICE}: ${found.length ? `${found.filter((x) => x.severity === "fail").length} to fix, ${found.filter((x) => x.severity === "warn").length} to check` : "nothing to flag"}`);
        return { items: found.map((x): AuditItem => ({ check: "claims_judge", status: x.severity, message: `${slots[x.at]?.label ?? "The plan"}, "${x.text.slice(0, 70)}": ${x.problem}` })), changed };
    }
    catch (e) {
        return { items: [{ check: "claims_judge", status: "warn", message: `The claims read didn't run: ${(e as Error).message.slice(0, 120)}. Check the words against the brand's claims yourself.` }], changed };
    }
}
async function reviewImagePlan(l: Loaded, plan: ImagePlan): Promise<AuditItem[]> {
    if (l.script.axes.native)
        return [];
    try {
        const persona = l.brand.personas.find((x) => x.id === l.concept.persona_id);
        const { issues, ready } = await reviewAds({
            brandId: l.job.brand_id,
            brand: l.brand,
            ads: [{ id: "ad", format: `${l.recipe?.label ?? "static"}, ${plan.archetype}${plan.cards.length > 1 ? `, ${plan.cards.length} cards` : ""}`, buyer: persona ? `${persona.id} (${persona.name})` : l.concept.persona_id, awareness: l.concept.awareness_stage, argument: plan.concept, picture: plan.cards.map((c, i) => `Card ${i + 1}: ${c.description}`).join(" "), layout: plan.visual_direction, texts: plan.cards.flatMap((c, i) => c.text_elements.map((t) => ({ role: plan.cards.length > 1 ? `card ${i + 1} ${t.role}` : t.role, text: t.text }))), feed: { primary_text: plan.ad_copy.primary_text.medium, headline: plan.ad_copy.headlines[0] ?? "", description: plan.ad_copy.description, cta: plan.ad_copy.cta } }],
            refType: "job",
            refId: l.job.id,
        });
        note(l.p, "plan", `Ad review by ${env.MODEL_VOICE}: ${ready ? "ready as written" : `${issues.length} point${issues.length === 1 ? "" : "s"} to look at`}`);
        return issues.map((x): AuditItem => ({ check: "ad_review", status: "warn", message: `${x.test}: ${x.problem}${x.fix ? ` Fix: ${x.fix}` : ""}` }));
    }
    catch (e) {
        return [{ check: "ad_review", status: "warn", message: `The ad review didn't run: ${(e as Error).message.slice(0, 120)}.` }];
    }
}
export function nativeCopy(script: Pick<ScriptRow, "lines" | "hook_variants">, plan: ImagePlan): ImagePlan {
    const sections = script.lines.map((x) => x.text.trim()).filter(Boolean);
    const headlines = [...new Set(script.hook_variants.map((h) => (h.overlay ?? "").trim()).filter(Boolean))].slice(0, 3);
    return {
        ...plan,
        cards: plan.cards.slice(0, 1),
        ad_copy: {
            ...plan.ad_copy,
            primary_text: { short: sections.slice(0, 1).join("\n\n"), medium: sections.slice(0, 3).join("\n\n"), long: sections.join("\n\n") },
            headlines: headlines.length ? headlines : plan.ad_copy.headlines,
        },
    };
}
async function voiceImagePlan(l: Loaded, plan: ImagePlan): Promise<ImagePlan> {
    const next: ImagePlan = JSON.parse(JSON.stringify(plan));
    const slots: {
        get: () => string;
        set: (v: string) => void;
        label: string;
    }[] = [
        ...next.cards.flatMap((c, i) => c.text_elements.map((t) => ({ get: () => t.text, set: (v: string) => void (t.text = v), label: `card ${i + 1} ${t.role}` }))),
        ...(["short", "medium", "long"] as const).map((k) => ({ get: () => next.ad_copy.primary_text[k], set: (v: string) => void (next.ad_copy.primary_text[k] = v), label: `primary text ${k}` })),
        ...next.ad_copy.headlines.map((_, i) => ({ get: () => next.ad_copy.headlines[i], set: (v: string) => void (next.ad_copy.headlines[i] = v), label: `headline ${i + 1}` })),
    ];
    try {
        const fix = l.p.reference_mode !== "exact";
        const res = await voiceCheck({ brandId: l.job.brand_id, brand: l.brand, lines: slots.map((x) => ({ text: x.get(), beat: x.label })), hooks: [], themeIds: l.script.theme_ids, fix, refId: l.job.id, surfaces: ["on_image", "headline", "primary_text"], personaIds: l.concept?.persona_id ? [l.concept.persona_id] : [], productId: l.p.product_id, log: { refType: "job", refId: l.job.id } });
        const changed = res.check.issues.filter((i) => i.applied && i.where === "line" && i.field === "text");
        for (const i of changed)
            slots[i.index]?.set(res.lines[i.index].text);
        l.p.voice_check = res.check;
        l.p.context_used.voice_check = res.check.sources;
        note(l.p, "plan", `Brand voice check: ${res.check.status === "clean" ? "on voice" : res.check.status === "fixed" ? `${changed.length} wording fix${changed.length === 1 ? "" : "es"} applied` : `${res.check.issues.length} suggestion${res.check.issues.length === 1 ? "" : "s"}`}`);
        return next;
    }
    catch (e) {
        note(l.p, "plan", `Brand voice check didn't run: ${(e as Error).message.slice(0, 120)}`);
        return plan;
    }
}
async function readPlanWords(l: Loaded, w: PlanWords, o: {
    surfaces: Surface[];
    scene?: string;
    how?: string;
    report?: boolean;
    fits?: () => boolean;
}): Promise<AuditItem[]> {
    if (!w.lines.length)
        return [];
    try {
        const stage = l.concept.awareness_stage ?? null;
        const persona = l.brand.personas.find((x) => x.id === l.concept.persona_id);
        const product = l.brand.products.find((x) => x.id === l.p.product_id);
        const asWritten = new Map(w.lines.map((x) => [x.id, x.text] as const));
        const res = await checkWordsQuietly({
            brandId: l.job.brand_id,
            brandName: l.brand.brand.name,
            refType: "job",
            refId: l.job.id,
            stage,
            about: [`For: ${[persona ? `${persona.name} (${persona.problem})` : l.concept.persona_id, stage ? stageName(stage) : ""].filter(Boolean).join(", ")}`, `The product: ${product?.name ?? l.brand.brand.name}`, `What the ad argues: ${l.concept.angle}`, l.p.notes ? `Notes from the person: ${l.p.notes.slice(0, 600)}` : "", o.how ?? ""].filter(Boolean).join("\n"),
            scene: o.scene,
            brandVoice: brandVoiceText(l.job.brand_id, { surfaces: o.surfaces, personaIds: l.concept.persona_id ? [l.concept.persona_id] : [], brand: l.brand, long: isStoryStage(stage) }),
            lines: w.lines,
            buyerWords: researchText(l.job.brand_id, 6, 3, `${l.concept.angle} ${l.script.title}`),
            facts: [product ? `The product: ${JSON.stringify(product).slice(0, 2000)}` : "", ...l.brand.offers.map((x) => `Offer: ${x.name}, ${l.brand.brand.currency} ${x.price}${x.notes ? `. ${x.notes}` : ""}`), l.brand.guarantee ? `The guarantee: ${l.brand.guarantee.text}` : "", `The approved script:\n${l.script.lines.map((x) => x.text).join("\n").slice(0, 3000)}`].filter(Boolean).join("\n"),
            max: w.max,
        }, o.report ? { fix: false } : {});
        if (res.failed) {
            note(l.p, "plan", `The reading of the words didn't run: ${res.failed}. The words stand as written`);
            return [];
        }
        for (const c of res.changed)
            w.set(c.id, res.lines.find((x) => x.id === c.id)?.text ?? asWritten.get(c.id) ?? "");
        let left = res.left;
        let said = res.changed.length;
        const spoken = res.changed.filter((c) => isSpokenId(c.id));
        if (spoken.length && o.fits && !o.fits()) {
            const back = new Set(spoken.map((c) => c.id));
            for (const id of back)
                w.set(id, asWritten.get(id) ?? "");
            left = [...left.filter((f) => !back.has(f.id)), ...res.found.filter((f) => back.has(f.id))];
            said -= back.size;
            note(l.p, "plan", `${back.size} spoken line${back.size === 1 ? "" : "s"} said again after the reading no longer fit the clip, so ${back.size === 1 ? "it stands" : "they stand"} as first cut`);
        }
        const found = res.found.length;
        note(l.p, "plan", `Words read before the plan is shown, by a model that did not write them: ${found ? `${found} point${found === 1 ? "" : "s"} found, ${o.report ? "nothing changed (these words are reported on, never rewritten)" : `${said} line${said === 1 ? "" : "s"} said again`}, ${left.length} left for you to look at` : "every line passed"}`);
        return readPoints(w, left);
    }
    catch (e) {
        if (e instanceof RunStoppedError)
            throw e;
        note(l.p, "plan", `The reading of the words didn't run: ${(e as Error).message.slice(0, 120)}. The words stand as written`);
        return [];
    }
}
function readImagePlan(l: Loaded, plan: ImagePlan, o: {
    report?: boolean;
} = {}): Promise<AuditItem[]> {
    const native = !!l.script.axes.native;
    const w = imagePlanWords(plan, { room: slotRoom, native, already: native ? l.script.hook_variants.map((h) => h.overlay ?? "") : [] });
    const scene = [...plan.cards.map((c, i) => `${plan.cards.length > 1 ? `Card ${i + 1}: ` : ""}${c.description}`), plan.visual_direction ? `The look: ${plan.visual_direction}` : ""].filter(Boolean).join("\n");
    const how = "Where there is more than 1 primary text they are the same message at different lengths, and each is read on its own. The headlines are options for the feed: each is read on its own.";
    return readPlanWords(l, w, { surfaces: ["on_image", "headline", "primary_text"], scene, how, report: o.report || l.p.reference_mode === "exact" });
}
function readVideoPlan(l: Loaded, plan: VideoPlan, o: {
    report?: boolean;
    fits?: () => boolean;
} = {}): Promise<AuditItem[]> {
    const how = "A line marked script is 1 spoken line of a longer video script that was read whole when it was written: judge it as 1 line a person says, never as a whole ad. Where there is more than 1 primary text they are the same message at different lengths, and each is read on its own.";
    return readPlanWords(l, videoPlanWords(plan, l.script.lines.map((x) => x.text)), { surfaces: ["script", "primary_text", "headline"], how, report: o.report || l.p.reference_mode === "exact", fits: o.fits });
}
const productTruth = (l: Loaded): string => productTruthSheet(l.job.brand_id, l.brand, l.kit, l.p.product_id);
export function avatarReferenceImageRefs(p: Pick<ProductionState, "avatar_reference">): {
    file: string;
    purpose: string;
}[] {
    const ref = p.avatar_reference;
    if (!ref)
        return [];
    const master = avatarFile(ref.avatar.portrait);
    const frame = dataPath(ref.file);
    if (!master || !fs.existsSync(frame) || createHash("sha256").update(fs.readFileSync(master)).digest("hex") !== ref.sourceSha256 || createHash("sha256").update(fs.readFileSync(frame)).digest("hex") !== ref.frameSha256)
        throw new Error("Restore this job's copied avatar reference before generating. No image was requested.");
    return [
        { file: master, purpose: "the selected avatar's original master portrait: face identity, age, complexion, hair and marks only. Its clothing, background and crop are not scene instructions" },
        { file: frame, purpose: `the kept avatar setting frame (${ref.setting.label}): the approved wardrobe, location and physical light for this avatar. Match that person to the master face; adapt pose and crop to this shot. Product appearance and use come only from the separate brand product references, never other objects or words in this setting picture` },
    ];
}
function avatarSettingDirection(p: Pick<ProductionState, "avatar_reference">): string {
    const ref = p.avatar_reference;
    return ref ? `SELECTED AVATAR SETTING: use only ${ref.avatar.name}, the selected fictional adult, in this approved setting and wardrobe: ${JSON.stringify(ref.setting)}. Keep face identity from the master portrait; the setting frame controls wardrobe/location/light, not product facts or added words. Shot action/crop may change within that setting. Do not choose another cast, room or clothing.` : "";
}
function cardRefs(l: Loaded, withText: boolean): {
    files: string[];
    roles: string[];
} {
    const imgs = productImages(l.job.brand_id, l.kit, l.p.product_id);
    const look = loadBrandLook(l.job.brand_id);
    const mode = l.p.reference_mode;
    const taste = planOf(l);
    const refImg = taste.attach.referenceImage ? referenceImage(l.p.reference_id) : null;
    const refRole = mode === "exact"
        ? "Reference ad to remake: keep its layout, reading order, proportions and composition as they are, in this job's visual format. Show this brand's product from the product images, never the reference's own product photo"
        : mode === "structure" || l.p.recipe !== "static-remix"
            ? "Reference ad: keep its layout skeleton and reading order. The words, product and look are this brand's"
            : "Winning image: observe hierarchy and persuasion structure; never copy its product facts, identity or distinctive copy";
    const native = !!l.script.axes.native;
    const place = planPlace(l);
    const name = l.brand.products.find((x) => x.id === l.p.product_id)?.name ?? l.brand.brand.name;
    const list: [
        string | null | undefined,
        string
    ][] = [
        [sendsProductPhoto(place) ? imgs.hero : null, place === "background" ? productPhotoRole(place, name) : (photoLabel(l.job.brand_id, l.p.product_id, imgs.hero) ?? "Product identity: authoritative packaging and label. Keep it exactly as photographed")],
        ...avatarReferenceImageRefs(l.p).map((r): [
            string,
            string
        ] => [r.file, r.purpose]),
        ...formatLookReferences(l.p.format_look).map((r): [
            string,
            string
        ] => [r.file, r.role]),
        [place === "shown" ? imgs.extras[0] : null, photoLabel(l.job.brand_id, l.p.product_id, imgs.extras[0]) ?? "The same product, another view: for scale and detail"],
        [withText && !native && taste.text.brandLook !== "none" ? lookFile(l.job.brand_id, look?.specimen ?? "") : null, "Brand type and colour specimen. A style guide only: set added words in these typefaces and colours. It never appears in the picture"],
        ...(place === "shown" ? lessonImages(l.job.brand_id, l.p.product_id) : []).map((x): [
            string,
            string
        ] => [x.file, x.role]),
        [refImg, refRole],
    ];
    const ok = list.filter(([f]) => !!f && fs.existsSync(f)) as [
        string,
        string
    ][];
    return { files: ok.map(([f]) => f), roles: ok.map(([, r], i) => `${i + 1}. ${r}`) };
}
async function imagePrompts(l: Loaded, plan: ImagePlan, model: string): Promise<ImagePlan> {
    try {
        const native = !!l.script.axes.native;
        const place = planPlace(l);
        const taste = planOf(l);
        const bare = taste.text.brandLook === "none";
        const refs = cardRefs(l, plan.cards.some((c) => c.text_elements.length > 0));
        const lessons = lessonBlock(l.job.brand_id, { productId: l.p.product_id, area: "pictures", format: l.job.output_type });
        const write = async (cards: ImagePlan["cards"], fixes?: Map<string, SenseProblem[]>) => {
            const todo = cards.map((c, i) => ({ c, id: `card_${i + 1}` })).filter((x) => !fixes || fixes.has(x.id));
            const p = renderPrompt("studio-prompt", {
                skill: `${skillFor("image-prompt-craft", contextLevel("image_prompt"))}${sharedRules()}` || "(image-prompt-craft skill not installed)",
                kind_rule: native ? "This is a native image ad: it must look like a person's own photo or screenshot, never a designed ad. No brand colours, no logo, no brand typeface, no button. Ignore the brand look for type; keep the product true to its photo if it appears." : bare ? "These are static ads made with no brand design: no brand colours, no logo, no brand typeface, no layout that reads as an ad. Keep the product true to its photo if it appears. No fake buttons." : "These are static ads: finished artwork, ready to run. No fake buttons unless the plan has a cta element.",
                fingerprint: native || bare ? "(not used: this ad carries no brand styling)" : lookFingerprint(loadBrandLook(l.job.brand_id)) || "(The brand's site has not been scanned. Take colours from the product photo; describe type as clean bold sans-serif.)",
                truth_sheet: place === "none" ? "(Not sent: the product is not in this picture.)" : productTruth(l),
                lessons: lessons || "(none yet)",
                image_roles: refs.roles.join("\n") || "(no reference images)",
                aspects: l.p.aspect,
                plans: JSON.stringify(todo.map(({ c, id }) => ({ id, type: plan.archetype, title: plan.title, argument: c.purpose, scene: fixes ? plan.visual_direction : `${plan.visual_direction}\n${c.prompt}`, layout: c.description, text_elements: c.text_elements.map((t) => ({ role: t.role, text: t.text, placement: t.placement })), watch_outs: [], direction: [l.p.notes, ...taste.notes].filter(Boolean).join(" "), product_in_picture: productRule(place), ...(fixes?.get(id) ? { previous_prompt: c.prompt, must_fix: fixes.get(id)!.map((x) => `${x.problem} ${x.fix}`.trim()) } : {}) }))),
            });
            const out = await structuredJson({ brandId: l.job.brand_id, task: "image_prompt", model, system: p.system, user: p.user, schema: z.object({ prompts: z.array(z.object({ id: z.string(), prompt: z.string().min(40) })).min(1) }), effort: "medium", maxTokens: 16000, refType: "job", refId: l.job.id, resultBudget: { profile: "static-prompt", items: todo.length, verbatim: todo.flatMap(({ c }) => c.text_elements.map(t => t.text)) } });
            return cards.map((c, i) => ({ ...c, prompt: out.prompts.find((x) => x.id === `card_${i + 1}`)?.prompt.trim() || c.prompt }));
        };
        let cards = await write(plan.cards);
        note(l.p, "plan", `Image prompts written by ${model}`);
        try {
            const imgs = productImages(l.job.brand_id, l.kit, l.p.product_id);
            const planned = place === "none" ? "(Planned with no product in the picture. That is deliberate: never a problem, and never fixed by adding the product.) " : place === "background" ? "(The product is planned only small and in the background. That is deliberate.) " : "";
            const found = await senseCheck({ brandId: l.job.brand_id, brandName: l.brand.brand.name, refType: "job", refId: l.job.id, truthSheet: productTruth(l), lessons, images: sendsProductPhoto(place) ? [imgs.hero, ...imgs.extras].filter((f): f is string => !!f) : [], items: cards.map((c, i) => ({ id: `card_${i + 1}`, argument: c.purpose, scene: `${planned}${c.description}`, prompt: c.prompt })) });
            if (found.size) {
                cards = await write(cards, found);
                note(l.p, "plan", `Read before rendering: ${found.size} prompt${found.size === 1 ? "" : "s"} rewritten (${[...found.values()].flat().map((x) => x.problem).slice(0, 3).join(" ")})`.slice(0, 500));
            }
            else
                note(l.p, "plan", "Read before rendering: every picture makes sense");
        }
        catch (e) {
            note(l.p, "plan", `The read before rendering didn't run: ${(e as Error).message.slice(0, 100)}`);
        }
        return { ...plan, cards };
    }
    catch (e) {
        note(l.p, "plan", `The prompt step didn't run (${(e as Error).message.slice(0, 100)}); the plan keeps the copy model's art direction`);
        return plan;
    }
}
function setImagePlan(l: Pick<Loaded, "p" | "brand" | "job" | "claims">, plan: ImagePlan) {
    l.p.image_plan = plan;
    l.p.plan_status = "draft";
    const primary = primaryTexts(plan.ad_copy.primary_text).map((x) => ({ text: x.text, where: `primary text (${x.lengths.join(", ")})` }));
    const texts = [
        ...plan.cards.flatMap((c, i) => c.text_elements.map((t) => ({ text: t.text, where: `card ${i + 1} artwork text` }))),
        ...primary,
        ...plan.ad_copy.headlines.map((h, i) => ({ text: h, where: `headline ${i + 1}` })),
        { text: plan.ad_copy.description, where: "description" },
    ];
    const items = auditText(l as Loaded, texts);
    const copy: CopyText[] = [
        ...plan.cards.flatMap((c, i) => c.text_elements.map((t): CopyText => ({ text: t.text, where: `card ${i + 1} ${t.role}`, surface: "image" }))),
        ...primary.map((x): CopyText => ({ ...x, surface: "feed" })),
        ...plan.ad_copy.headlines.map((h, i): CopyText => ({ text: h, where: `headline ${i + 1}`, surface: "feed" })),
        { text: plan.ad_copy.description, where: "description", surface: "feed" },
    ];
    items.push(...copyChecks(copy, getSetting(l.job?.brand_id ?? "", "voice"), l.job ? brandOwnWords(l.job.brand_id) : ""), ...(l.job ? [...quoteChecks(l.job.brand_id, copy), ...conflictChecks(l.job.brand_id, copy)] : []));
    items.push(...feedChecks({ primary, headlines: plan.ad_copy.headlines, description: plan.ad_copy.description, cta: plan.ad_copy.cta }));
    for (const [i, c] of plan.cards.entries()) {
        for (const f of pictureWordFaults(c.text_elements, l.job ? brandOwnWords(l.job.brand_id) : ""))
            items.push({ check: f.check, status: "warn", message: `Card ${i + 1} ${c.text_elements[f.index]?.role ?? "text"}: ${f.what}.` });
        const words = c.text_elements.reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0);
        if (words > 25)
            items.push({ check: "artwork_words", status: "warn", message: `Card ${i + 1} has ${words} words on the image. Aim for 20 or fewer.` });
    }
    l.p.audit = shown(l, items);
}
const FINAL_IMAGE_PROMPT = (aspect: string) => `A finished ${aspect} ecommerce advertisement, the complete final artwork. This is the ${aspect} version: compose for this shape.`;
async function stepRender(l: Loaded) {
    const plan = l.p.image_plan;
    if (!plan || l.p.plan_status !== "approved")
        throw new Error("Approve the plan before rendering images.");
    const assets: JobAsset[] = [...l.job.assets.filter((a) => a.kind !== "image")];
    const done = new Set(l.job.assets.filter((a) => a.kind === "image").map((a) => a.path));
    const fingerprint = l.script.axes.native || planOf(l).text.brandLook === "none" ? "" : lookFingerprint(loadBrandLook(l.job.brand_id));
    const rules = lessonRules(l.job.brand_id, { productId: l.p.product_id, area: "pictures", format: l.job.output_type });
    for (const [i, card] of plan.cards.entries()) {
        const name = `card_${i + 1}.png`;
        const file = assetPath(l.job.id, name);
        const rel = `${l.job.id}/${name}`;
        let qa: JobAsset["qa"];
        if (done.has(rel) && fs.existsSync(file.abs)) {
            assets.push(l.job.assets.find((a) => a.path === rel) ?? { path: rel, kind: "image", caption: card.text_elements[0]?.text ?? card.description });
            continue;
        }
        if (!mediaLive()) {
            const [w, h] = (IMAGE_SIZES[l.p.aspect] ?? "1024x1280").split("x").map(Number);
            await sharp(Buffer.from(placeholderSvg({ text: card.text_elements[0]?.text ?? card.description, label: `${OUTPUT_INFO[l.job.output_type].label} · mock`, color: ["#0f766e", "#334155", "#9f1239", "#1d4ed8", "#92400e", "#4d7c0f"][i % 6], width: w, height: h }))).png().toFile(file.abs);
        }
        else {
            const { files: refs, roles } = cardRefs(l, card.text_elements.length > 0);
            const hero = productImages(l.job.brand_id, l.kit, l.p.product_id).hero;
            const old = splitRatios(card.prompt, l.p.aspect);
            const build = (corrections: string) => imageRequest({ opening: FINAL_IMAGE_PROMPT(l.p.aspect), ratioNote: old.note, roles, body: old.body, texts: card.text_elements, noText: !card.text_elements.length, fingerprint, rules, corrections, product: planPlace(l) });
            let corrections = "";
            let mend: {
                prompt: string;
                refs: string[];
            } | null = null;
            const mended: string[] = [];
            for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
                await generateImage({ brandId: l.job.brand_id, jobId: l.job.id, purpose: `card ${i + 1}${attempt > 1 ? (mend ? " mend" : " retry") : ""}`, prompt: mend ? mend.prompt : build(corrections), refs: mend ? mend.refs : refs, size: IMAGE_SIZES[l.p.aspect] ?? "1024x1280", quality: "high", out: file.abs });
                if (!hero)
                    break;
                try {
                    qa = await inspectImage({ brandId: l.job.brand_id, refType: "job", refId: l.job.id, itemId: `card_${i + 1}`, productId: l.p.product_id, one: "ad", productName: l.brand.products.find((x) => x.id === l.p.product_id)?.name ?? l.brand.brand.name, truth: productTruth(l), scene: card.description, texts: card.text_elements, look: fingerprint, rules, file: file.abs, hero, product: planPlace(l) });
                }
                catch (e) {
                    qa = { status: "warn", notes: [`The automatic check didn't run: ${(e as Error).message.slice(0, 100)}`] };
                }
                if (qa.status !== "fail" || attempt === MAX_TRIES)
                    break;
                const clause = oneClause(qa.notes, mended);
                if (clause) {
                    const tried = file.abs.replace(/\.png$/, `_try${attempt}.png`);
                    fs.copyFileSync(file.abs, tried);
                    mended.push(clause);
                    mend = { prompt: changeRequest({ one: "ad", aspect: l.p.aspect, fix: [clause], texts: card.text_elements, roles, product: planPlace(l), rules }), refs: [tried, ...refs] };
                    note(l.p, "render", `Card ${i + 1}: ${attempt === 1 ? "first render" : `mend ${attempt - 1}`} failed the check (${qa.notes[0] ?? "see notes"}); mending 1 thing on that picture and keeping the rest: ${clause}`);
                }
                else {
                    if (corrections)
                        break;
                    mend = null;
                    corrections = qa.notes.map((n) => `- ${n}`).join("\n");
                    note(l.p, "render", `Card ${i + 1}: first render failed the check (${qa.notes[0] ?? "see notes"}); the fault is in how the product is handled or shaped, so it is drawn again`);
                }
            }
        }
        assets.push({ path: rel, kind: "image", caption: card.text_elements[0]?.text ?? card.description, ...(qa ? { qa } : {}) });
        save(l.job.id, l.p, { assets });
    }
    note(l.p, "render", `${plan.cards.length} image${plan.cards.length === 1 ? "" : "s"} rendered${mediaLive() ? "" : " (mock placeholders)"}`);
    l.p.next = "done";
    save(l.job.id, l.p, { status: "in_review", assets });
}
const savedAvatar = (l: Pick<Loaded, "job" | "p">): Avatar | null => l.p.avatar_reference?.avatar ?? (l.p.avatar_id ? (getAvatar(l.job.brand_id, l.p.avatar_id) ?? null) : null);
function jobAvatar(l: Pick<Loaded, "job" | "p">): Avatar | null {
    const a = savedAvatar(l);
    const recipe = FORMAT_RECIPES.find((r) => r.id === l.p.recipe);
    return a && recipe ? avatarInFormat(a, recipe) : a;
}
const isRestyled = (l: Pick<Loaded, "job" | "p">, a: Avatar | null): boolean => !!a && a.kind === "character" && savedAvatar(l)?.kind === "person";
function castAvatar(l: Pick<Loaded, "job" | "p">): Avatar | null {
    const a = jobAvatar(l);
    return a && l.p.video_plan && castIsAvatar(l.p.video_plan, a) ? a : null;
}
function avatarCopy(jobId: string, file: string | null | undefined, name: string): string | null {
    const from = avatarFile(file);
    if (!from)
        return null;
    const to = assetPath(jobId, `${name}${path.extname(from) || ".png"}`);
    fs.copyFileSync(from, to.abs);
    return to.rel;
}
function sheetOnFile(a: Avatar): {
    sheet: string;
    views: string[];
} | null {
    const sheet = avatarFile(a.sheet);
    const views = a.panels.map((x) => avatarFile(x)).filter((x): x is string => !!x);
    if (!sheet || views.length !== a.panels.length)
        return null;
    if (a.kind === "person" && views.length < 3)
        return null;
    return { sheet, views };
}
function reuseSheet(l: Pick<Loaded, "job">, a: Avatar): PrepStage | null {
    const on = sheetOnFile(a);
    if (!on)
        return null;
    const name = `character_${uid()}`;
    const file = avatarCopy(l.job.id, a.sheet, name)!;
    const panels = on.views.length >= 3 ? a.panels.map((x, i) => avatarCopy(l.job.id, x, `${name}_p${i + 1}`)!) : [file];
    return { file, panels, selected: 0, status: "draft" };
}
function sheetToAvatar(brandId: string, avatarId: string, jobId: string, rec: Pick<PrepStage, "file" | "panels">): {
    sheet: string;
    panels: string[];
} {
    const dir = avatarDir(brandId, avatarId);
    const name = `sheet-${jobId}-${uid()}`;
    const put = (rel: string, as: string) => {
        fs.copyFileSync(dataPath(rel), path.join(dir.abs, as));
        return `${dir.rel}/${as}`;
    };
    return { sheet: put(rec.file, `${name}.png`), panels: rec.panels.length >= 3 ? rec.panels.map((x, i) => put(x, `${name}_p${i + 1}.png`)) : [] };
}
function keepSheet(l: Pick<Loaded, "job" | "p">, a: Avatar, rec: Pick<PrepStage, "file" | "panels">) {
    if (l.p.avatar_reference)
        return;
    const mine = !!a.sheet && path.basename(a.sheet).startsWith(`sheet-${l.job.id}-`);
    if (sheetOnFile(a) && !mine)
        return;
    try {
        const old = [a.sheet, ...a.panels].map((x) => avatarFile(x));
        const kept = sheetToAvatar(l.job.brand_id, a.id, l.job.id, rec);
        const person = isRestyled(l, a) ? savedAvatar(l) : null;
        saveAvatar(l.job.brand_id, { id: a.id, name: a.name, ...(person && a.style ? { styled: { ...(person.styled ?? {}), [a.style]: kept } } : kept) });
        for (const f of old)
            if (f)
                fs.rmSync(f, { force: true });
        note(l.p, "character", `Character sheet saved on the avatar ${a.name}: its next video uses it and draws none`);
    }
    catch {
    }
}
const PersonOut = z.object({ gender: z.string(), age: z.string(), skin_tone: z.string(), eyes: z.string(), hair: z.string(), wardrobe: z.string(), features: z.string().default("") });
type PersonIn = z.infer<typeof PersonOut>;
const MAX_SCENES = planLimits("exact").scenes;
const MAX_PROPS = { short: 8, long: 12 };
interface SceneIn {
    seconds: number;
    visual: string;
    dialogue?: string;
    rows?: number[];
    overlay: string;
    tone: string;
    face?: string;
    size?: string;
    angle?: string;
    move?: string;
    focus?: string;
    place?: string;
    props?: string[];
}
interface Seg {
    start: string;
    scenes: SceneIn[];
    end: string;
    key_moments?: {
        at: number;
        description: string;
    }[];
}
type Placed = Omit<Seg, "scenes"> & {
    scenes: (SceneIn & {
        dialogue: string;
    })[];
};
interface Head {
    title: string;
    visual_direction: string;
    cast: {
        presenter?: PersonIn | null;
        guest?: PersonIn | null;
        character?: string | null;
        setting: string;
        camera: string;
        voice_direction: string;
        handling: "display" | "hold" | "use";
        product_details: string;
    };
    cast_options?: {
        label: string;
        presenter?: PersonIn | null;
        character?: string | null;
    }[];
    props: {
        name: string;
        look: string;
    }[];
    places: {
        name: string;
        look: string;
    }[];
    product_parts: {
        name: string;
        photo: number;
    }[];
    ad_copy?: {
        primary_text: {
            short: string;
            medium: string;
            long: string;
        };
        headlines: string[];
        description: string;
        cta: string;
    };
    notes: string;
}
interface PlanShape {
    clips: number;
    shots: number;
    keyFrames: number;
    covered: boolean;
    dealt: boolean;
    cast: "person" | "character" | "fixed";
    people: number;
    props: number;
}
function sceneSchema(o: PlanShape) {
    const shape: Record<string, z.ZodType> = { seconds: z.number().positive(), visual: z.string().min(3) };
    if (o.dealt)
        shape.rows = z.array(z.number().int().min(1)).default([]);
    else
        shape.dialogue = z.string();
    shape.overlay = z.string();
    shape.tone = z.string().default("");
    shape.face = z.string().default("");
    if (o.covered)
        Object.assign(shape, { size: z.string(), angle: z.string(), move: z.string(), focus: z.string(), place: z.string().default(""), props: z.array(z.string()).default([]) });
    return z.object(shape);
}
function segmentsSchema(o: PlanShape) {
    const shape: Record<string, z.ZodType> = { start: z.string().default(""), scenes: z.array(sceneSchema(o)).min(1).max(o.shots), end: z.string().default("") };
    if (o.keyFrames > 0)
        shape.key_moments = z.array(z.object({ at: z.number().min(0).default(0), description: z.string().min(3) })).max(o.keyFrames).default([]);
    return z.array(z.object(shape)).min(o.clips).max(o.clips);
}
function planSchema(o: PlanShape) {
    const cast: Record<string, z.ZodType> = {};
    if (o.cast === "person")
        cast.presenter = PersonOut.nullable();
    if (o.cast === "character")
        cast.character = z.string().nullable();
    if (o.people > 1)
        cast.guest = PersonOut.nullable();
    Object.assign(cast, { setting: z.string(), camera: z.string().default(""), voice_direction: z.string(), handling: z.enum(["display", "hold", "use"]), product_details: z.string() });
    const shape: Record<string, z.ZodType> = { title: z.string(), visual_direction: z.string(), cast: z.object(cast) };
    if (o.cast !== "fixed")
        shape.cast_options = z.array(z.object({ label: z.string().default(""), ...(o.cast === "person" ? { presenter: PersonOut.nullable().default(null) } : { character: z.string().nullable().default(null) }) })).max(3).default([]);
    Object.assign(shape, {
        props: z.array(z.object({ name: z.string().min(1), look: z.string().default("") })).max(o.props).default([]),
        places: z.array(z.object({ name: z.string().min(1), look: z.string().default("") })).max(4).default([]),
        product_parts: z.array(z.object({ name: z.string().min(1), photo: z.number().int().min(0).default(0) })).max(o.props).default([]),
        segments: segmentsSchema(o),
        ad_copy: z.object({ primary_text: z.object({ short: z.string(), medium: z.string(), long: z.string() }), headlines: z.array(z.string()).max(5), description: z.string().default(""), cta: z.string().default("") }).optional(),
        notes: z.string(),
    });
    return z.object(shape);
}
const planPartSchema = (o: PlanShape) => z.object({ segments: segmentsSchema(o), notes: z.string().default("") });
const PlanPartsKept = z.object({ head: z.custom<Head>((v) => !!v && typeof v === "object" && "cast" in (v as object)), segments: z.array(z.custom<Placed>((v) => !!v && typeof v === "object" && Array.isArray((v as Placed).scenes))) });
const wordsIn = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const same = (a: string, b: string) => a.trim().toLowerCase().replace(/^(the|a|an) /, "") === b.trim().toLowerCase().replace(/^(the|a|an) /, "");
const FACE_CHARS = 110;
function recentPlaces(l: Pick<Loaded, "job">, most = 5): string[] {
    return db
        .select({ id: schema.outputJobs.id, place: sql<string | null> `coalesce(json_extract(${schema.outputJobs.production}, '$.main_place'), json_extract(${schema.outputJobs.production}, '$.video_plan.cast.setting'))` })
        .from(schema.outputJobs)
        .where(eq(schema.outputJobs.brand_id, l.job.brand_id))
        .orderBy(desc(schema.outputJobs.created_at), desc(schema.outputJobs.id))
        .limit(80)
        .all()
        .filter((j) => j.id !== l.job.id && !!j.place?.trim())
        .slice(0, most)
        .map((j) => j.place!.trim());
}
async function stepShotPlan(l: Loaded) {
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    avatarReferenceImageRefs(l.p);
    const recipe = l.recipe!;
    const mode = l.p.reference_mode === "exact" && !l.p.reference_id ? null : (l.p.reference_mode ?? null);
    const keyFrames = framesPerClip(l.p) - 1;
    const photos = photosOnFile(l.job.brand_id, l.kit, l.p.product_id);
    const hasHook = !!l.p.hook_id || (l.script.lines.length > 0 && l.script.lines.every((x) => x.beat === "hook"));
    const style = styleText(styleSkills(recipe, l.p.preset, l.job.output_type).filter((n) => n !== "ai-ugc-hooks" || hasHook), true);
    const jobSkills = jobSkillText(l, true);
    const avatar = jobAvatar(l);
    if (l.p.avatar_id && !avatar) {
        delete l.p.avatar_id;
        note(l.p, "plan", "The saved avatar picked for this video has been removed, so the plan writes a new character for it.");
    }
    const world = brandWorld(l.job.brand_id);
    const said = startsIn(l.script.notes);
    const place: PlaceDeal | null = l.p.avatar_reference
        ? null
        : said
            ? dealPlace({ seed: l.job.id, everyday: PLACES, said })
            : mode === "exact" || recipeUsesCharacterOnly(recipe) || !recipe.character
                ? null
                : l.p.main_place
                    ? { place: l.p.main_place, from: "everyday" }
                    : dealPlace({ seed: l.job.id, everyday: PLACES, own: ownPlaces(world?.places), recent: recentPlaces(l) });
    const buyer = !avatar && mode !== "exact" && recipe.character && (recipe.people ?? 1) === 1 && l.concept.persona_id ? (getPersona(l.job.brand_id, l.concept.persona_id) ?? null) : null;
    const onScreen = buyer ? dealPresenter(l.job.id, buyer.who) : null;
    const ctx = contextFor("shot_plan", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id, cited: [...new Set(l.script.lines.flatMap((x) => x.claim_ids))], cast: !!avatar || !!onScreen, placed: !!place?.place });
    const stage = mode === "exact" ? null : (l.concept.awareness_stage ?? null);
    const seconds = clipSeconds(l.p);
    const pace = planOf(l, "shot_plan").taste.pace;
    const speech = speechOf({ brandId: l.job.brand_id, personaId: l.concept?.persona_id, avatar, recipe, lines: l.script.lines, calm: pace === "calm" });
    const montage = mode !== "exact" && recipeUsesCharacterOnly(recipe);
    const shots = shotsFor(pace, seconds, true, speech.rate, montage, recipe.id);
    const cut = mode === "exact" ? undefined : { min: shots.min, pace: pace ?? ("normal" as const), cover: true, ...(montage ? { montage: true } : {}) };
    const batches = planBatches(l.p.segments);
    const laid = l.p.target_seconds === undefined && mode !== "exact" && l.p.script_clips && l.p.script_clips.lengths.length === l.p.segments ? l.p.script_clips.lengths : null;
    const deal = mode === "exact" && batches.length === 1 ? null : laid ? dealToClips(l.script.lines, { clip: seconds, rate: speech.rate, mode, clips: l.p.segments }) : dealScript(l.script.lines, { clips: l.p.segments, seconds, mode: mode, rate: speech.rate, lengths: acceptedLengths(clipModel()) });
    if (l.p.target_seconds !== undefined && deal && (deal.dropped.length || deal.cut))
        throw new Error("The requested duration cannot retain the whole approved script at this clip count. Change the timing or clip count; no script lines were changed.");
    const lengths = laid && deal ? fitClipsToWords(laid, deal.clips.map(clipWords), speech.rate, acceptedLengths(clipModel())) : l.p.target_seconds === undefined ? clipLengths(deal, { clips: l.p.segments, seconds, lengths: acceptedLengths(clipModel()), mode: mode, rate: speech.rate }) : exactTargetLengths(l.p.target_seconds, acceptedLengths(clipModel()).filter((s) => s <= seconds), l.p.segments, deal?.clips.map((c) => clipWords(c) / speech.rate));
    const told = lengths.map((s) => ({ seconds: s, shots: cut ? shotsText(shotsFor(pace, s, true, speech.rate, montage, recipe.id).range) : "as many shots as the reference has there, 1 or more" }));
    const span = [Math.min(...lengths), Math.max(...lengths)];
    const neverShown = [...l.kit.visual.avoid, world?.never_in_frame, onCamera(l.job.brand_id, l.brand.products.find((x) => x.id === l.p.product_id)?.name)?.never];
    const faces = deal && cut && recipe.character
        ? dealFaces(l.job.id, deal.clips.map((c, i) => ({ shots: Math.min(mostShots(cut), Number(shotsFor(pace, lengths[i] ?? seconds, true, speech.rate, montage, recipe.id).range.match(/\d+/g)?.pop() ?? 1)), beats: c.map((u) => l.script.lines[u.line]?.beat ?? "").filter((b, k, all) => b !== all[k - 1]) })), { noLow: neverShowsLowPeople(neverShown) })
        : undefined;
    const jobFormats = formatBuckets("video", { format: [l.job.output_type.replace(/_/g, " "), recipe.id.replace(/-/g, " ")] }, []);
    const visualExamples = !l.p.reference_id && l.p.taste?.look !== "new" && l.script.reference_ids.length
        ? db.select().from(schema.adReferences).where(inArray(schema.adReferences.id, l.script.reference_ids.slice(0, 2))).all()
            .filter((r) => r.kind === "video" && (r.brand_id === "_shared" || r.brand_id === l.job.brand_id) && r.analysis?.timeline?.length)
            .filter((r) => !jobFormats.length || formatBuckets(r.kind, r.tags, r.categories).some((b) => jobFormats.includes(b)))
        : [];
    const vars = {
        floor: floorText(),
        feed_lengths: l.p.caption_lengths ? placementCaptionContract() : feedLengths(stage),
        stage_rules: stage ? `## The buyer's stage: ${stageName(stage)}\n\n${l.p.caption_lengths ? primaryLengthText(stage).split("\n").slice(1).join("\n") : primaryLengthText(stage)}` : "",
        voice_rules: voiceRulesText(getSetting(l.job.brand_id, "voice"), false, true, stage),
        brand_name: l.brand.brand.name,
        layout: clipsSaid(lengths, "segment"),
        clip_lengths: span[0] === span[1] ? `${span[0]}-second clips` : `clips of ${span[0]} to ${span[1]} seconds`,
        visual_chars: String(planLimits(mode, !!cut, !!cut?.cover, montage).visual),
        max_scenes: String(cut ? mostShots(cut) : MAX_SCENES),
        shot_sizes: SHOT_SIZES.join(", "),
        shot_angles: SHOT_ANGLES.join(", "),
        camera_moves: CAMERA_MOVES.join(", "),
        camera_feel: cameraFeel(),
        shot_subjects: SHOT_SUBJECTS.join(", "),
        longest_shot: String(longestShot(pace, seconds, montage, cut ? recipe.id : undefined) ?? seconds),
        shot_times: !cut || pace === "calm" ? "Whole seconds only, no shot under 1 second" : `Each to a tenth of a second where the cut wants it (0.8, 1.5, 2), no shot under ${montage ? SHORTEST_CUT : 1} second${montage ? "s" : ""}`,
        cutting: cut ? recipe.id === "podcast" ? "Podcast cuts follow whole speaker turns and live listener reactions from fixed stands. Keep the actual speech pace and exact approved words; let a meaningful reaction register, without added dialogue." : cuttingRule(montage, pace) : "",
        speech_pace: `${speech.said} (${speech.band ? `a speaker aged ${speech.band}` : "an adult speaker"}, ${paceSaid(speech.rate)})`,
        max_props: String(batches.length > 1 ? MAX_PROPS.long : MAX_PROPS.short),
        mode_rules: shotPlanModeRules(mode, seconds, !!deal) || "(This script was written from research, with no reference ad.)",
        format_label: recipe.label,
        craft: recipe.craft,
        preset: `${l.p.preset}${recipe.presets[l.p.preset] ? `: ${recipe.presets[l.p.preset]}` : ""}`,
        context: JSON.stringify(ctx.data),
        brand_voice: brandVoiceText(l.job.brand_id, { surfaces: ["primary_text", "headline"], personaIds: l.concept?.persona_id ? [l.concept.persona_id] : [], brand: l.brand, long: isStoryStage(stage) }),
        aspect: l.p.aspect,
        notes: l.p.notes || "(none)",
        script_id: l.script.id,
        title: l.script.title,
        script: scriptRows(l.script, true),
        reference: visualExamples.length ? `${LEARNING_RULE}\n\n${visualExamples.map(visualLesson).join("\n\n")}` : referenceText(l.p.reference_id, l.p.reference_mode),
        lessons: [lessonBlock(l.job.brand_id, { productId: l.p.product_id, area: "video", format: l.job.output_type, factsElsewhere: true }) || "(none yet)", cameraBlock({ brandId: l.job.brand_id, brand: l.brand, kit: l.kit, productId: l.p.product_id }, "planner")].filter(Boolean).join("\n\n"),
        key_frames: String(keyFrames),
        product_photos: photosOnFileText(photos),
        people_rule: (recipe.people ?? 1) > 1 ? `This format has 2 fictional adult characters. cast.presenter is ${castRoles(recipe)[0]} and cast.guest is ${castRoles(recipe)[1]}, a plainly different adult with the same 7 fields. Dialogue uses ${castRoles(recipe)[0]}: or ${castRoles(recipe)[1]}: labels${isCinematic(recipe) ? ", or Narrator: for off-screen narration. A single, insert or reaction shows only the people named in that shot; reference-sheet positions identify the cast, while the scene master fixes actual blocking" : "; Host stays left, Guest stays right"}. Each cast_options entry is a different ${castRoles(recipe)[0]}; ${castRoles(recipe)[1]} stays.` : `This format has 1 person or character on screen.${avatar ? " This video is already cast: see who is on screen under the clips." : ""}`,
        cast_rule: avatar
            ? "The cast is fixed by the brand's saved avatar (described under the clips): the schema has no presenter, character or cast_options field."
            : recipeUsesCharacterOnly(recipe)
                ? "`cast.character`: 1 sentence a picture can be drawn from. `cast_options`: 3 distinct made characters, the first identical to the main cast, each with a short label and a `character` sentence; alternatives differ in at least 3 visible ways and work with the same script and setting."
                : "`cast.presenter`: fictional adult with gender, age, skin_tone, eyes, hair, wardrobe and distinctive features. `cast_options`: 3 distinct fictional adult options, the first identical to the main cast, each with a short label and the same presenter fields; alternatives vary at least 3 appearance dimensions and work with the same script and setting.",
        speech_rule: deal
            ? "Speech is placed by row: each shot's `rows` lists the row numbers (the first column of the approved script) of the lines whose speech begins in that shot, in order. Every row dealt to a clip is listed once, in 1 of its shots; a shot where speech only carries on lists none, and a clip with no line lists none. Code puts the words back word for word, so no line is rewritten, dropped, added or moved to another clip."
            : "Copy approved dialogue whole and in order into the shot where it begins; never rewrite, drop, add or move a line to another clip. Code restores these words. Continuous speech may run over later shots with empty dialogue. No tags, new fillers, capitalization changes or phonetic substitutions. A clip with no line has empty dialogue.",
    };
    const taste = planOf(l, "shot_plan");
    const choices = tasteText(taste);
    const planModel = l.p.plan_model ?? env.MODEL_PLAN;
    const spoken = { speech: { rate: speech.rate, band: speech.band } };
    const problemsOf = (plan: Pick<VideoPlan, "segments" | "visual_direction" | "cut"> & Partial<Pick<VideoPlan, "ad_copy">>) => [...videoPlanProblems({ ...plan, ...spoken }, l.p.segments, lengths, mode, 0, true, recipe.id), ...requestedDurationProblems({ ...plan, ...spoken }, l.p.target_seconds), ...(l.p.target_seconds !== undefined ? approvedSpeechProblems(plan, l.script.lines) : []), ...(l.p.caption_lengths ? placementCaptionProblems(plan.ad_copy?.primary_text) : [])];
    const termed = (segs: Seg[]): Seg[] => (cut ? segs.map((s) => ({ ...s, scenes: s.scenes.map((x) => ({ ...x, size: shotTerm(SHOT_SIZES, x.size ?? ""), angle: shotTerm(SHOT_ANGLES, x.angle ?? ""), move: shotTerm(CAMERA_MOVES, x.move ?? ""), focus: shotTerm(SHOT_SUBJECTS, x.focus ?? "") })) })) : segs);
    const timed = (b: Batch, segs: Seg[]): Seg[] => (cut ? segs.map((s, i) => ({ ...s, scenes: fitSeconds(s.scenes, lengths[b.first + i] ?? seconds) })) : segs);
    const fixed = (b: Batch, all: Seg[]): Placed[] => !deal
        ? timed(b, termed(all)).map((s) => ({ ...s, scenes: s.scenes.map((x) => ({ ...x, dialogue: x.dialogue ?? "" })) }))
        : timed(b, termed(all)).map((s, i) => {
            const said = placeRows(s.scenes, i < b.count ? deal.clips[b.first + i] : []);
            return { ...s, scenes: s.scenes.map((x, j) => ({ ...x, dialogue: said[j] })) };
        });
    const write = async (b: Batch, so: {
        head: Head | null;
        before: Placed | null;
        repair: {
            problems: string[];
            previous: Placed[];
        } | null;
    }) => {
        const part = batches.findIndex((x) => x.first === b.first) + 1;
        const shape: PlanShape = { clips: b.count, shots: cut ? mostShots(cut) : MAX_SCENES, keyFrames, covered: !!cut, dealt: !!deal, cast: avatar ? "fixed" : recipeUsesCharacterOnly(recipe) ? "character" : "person", people: recipe.people ?? 1, props: batches.length > 1 ? MAX_PROPS.long : MAX_PROPS.short };
        const rows = deal && so.head ? new Set(deal.clips.slice(b.first, b.first + b.count).flatMap((c) => c.map((x) => x.line))) : null;
        const brief = [
            partBrief({ part, parts: batches.length, ...(so.head ? { shared: { title: so.head.title, visual_direction: so.head.visual_direction, cast: so.head.cast, places: so.head.places, props: so.head.props }, before: so.before, beforeClip: b.first } : {}) }),
            clipsBrief(b, l.p.segments, deal, told, faces),
            so.head || !place ? "" : placeBrief(place),
            avatarSettingDirection(l.p),
            isCinematic(recipe) ? "Cinematic scene exceptions to the generic montage guidance: one consistent set is valid, with matching coverage rather than new rooms at each cut. A brief live reaction or pause may carry the reveal; do not replace it with busy action or slow motion. Camera and light are shot-specific, with physical light sources fixed in the room. Show only the cast members a shot needs. Narrator lines are off screen; character lines bind to their named speaker. Approved words and actual clip durations remain fixed." : "",
            recipe.id === "podcast" && cut ? "Podcast exceptions to generic montage coverage: fixed eye-level stands, move = locked off. Cuts switch between named Host/Guest singles, live silent reactions or relevant details; size, angle and focus may repeat when the named subject/view changes. No mandatory travelling camera, three-size/angle/subject quota or busy action. Normal turns may hold up to 6 seconds within the supplied shot range. Keep one room, Host left/Guest right, exact words and actual durations; only the named speaker's mouth moves." : "",
            recipe.id === "anime" ? "Anime exceptions to generic montage guidance: retain the selected 2D line, palette, texture and cel shadows in visual_direction. Use deliberate anticipation, action and short reaction holds with secondary movement, not perpetual real-life motion. One set is valid. Map hero, product and obstacle positions and travel direction; carry prop states across clips. Identity references define design only, the scene fixes geography, key frames fix target moments. Narrator or hero speech follows planned performance pauses. Approved words and actual clip durations remain fixed." : "",
            so.head ? "" : avatar ? avatarBrief(avatar) : onScreen && buyer ? presenterBrief(onScreen, { said: [buyer.who.gender, buyer.who.age].map((x) => (x ?? "").trim()).filter(Boolean).join(", "), market: l.brand.brand.market, made: recipeUsesCharacterOnly(recipe) }) : castKindBrief(recipe),
            so.repair ? `Your previous answer broke these rules. Fix every one and return the full answer again.\n${so.repair.problems.map((x) => `- ${x}`).join("\n")}\n\nPrevious segments:\n${JSON.stringify(so.repair.previous)}` : "",
        ];
        const p = renderPrompt("shot-plan", { ...vars, ...(rows ? { script: scriptRows(l.script, true, rows) || "(no spoken line in these clips)" } : {}), extra: brief.filter(Boolean).join("\n\n") });
        const req = { brandId: l.job.brand_id, task: "shot_plan" as const, model: planModel, system: `${p.system}\n\n${choices ? `${choices}\n\n` : ""}${jobSkills.text}STYLE GUIDANCE for this format (craft only, never claims):\n${style.text}`, user: p.user, effort: "medium" as const, temperature: taste.temperature, refType: "job" as const, refId: l.job.id,
            resultBudget: { profile: "storyboard" as const, items: b.count, textTokens: !so.head && isStoryStage(stage) && !l.p.caption_lengths ? 2400 : 1200, ...(deal ? {} : { verbatim: l.script.lines.map((x) => x.text) }) } };
        recordReferenceUse(l.job.brand_id, visualExamples.map((r) => r.id), `shot-plan:${l.job.id}`);
        if (so.head) {
            const more = (await structuredJson({ ...req, schema: planPartSchema(shape), maxTokens: 8000 })) as unknown as {
                segments: Seg[];
                notes: string;
            };
            return { head: { ...so.head, notes: [so.head.notes, more.notes].filter((x) => x.trim()).join(" ") }, segments: fixed(b, more.segments) };
        }
        const { segments, ...head } = (await structuredJson({ ...req, schema: planSchema(shape), maxTokens: isStoryStage(stage) && !l.p.caption_lengths ? 12000 : 8000 })) as unknown as Head & {
            segments: Seg[];
        };
        return { head, segments: fixed(b, segments) };
    };
    const key = createHash("sha1").update(JSON.stringify([l.p.segments, seconds, l.p.reference_mode ?? "", vars.reference, l.p.notes, l.p.product_id, l.p.recipe, l.p.preset, l.p.aspect, l.p.hook_id ?? "", keyFrames, planModel, l.p.taste ?? {}, l.claims, l.script.lines, ...(lengths.some((x) => x !== seconds) ? [lengths] : []), ...(avatar ? [avatar.id, avatar.updated_at] : []), ...(l.p.avatar_reference ? [l.p.avatar_reference.id, l.p.avatar_reference.frameSha256, l.p.avatar_reference.setting] : []), ...(recipe.id === "podcast" && cut ? ["fixed-podcast-coverage-v1"] : [])])).digest("hex");
    const kept = batches.length > 1 && l.p.plan_parts?.key === key ? PlanPartsKept.safeParse(l.p.plan_parts) : null;
    const written = await writeInBatches<Head, Placed>({
        clips: l.p.segments,
        done: kept?.success ? kept.data : null,
        write,
        problems: (b, segs, head) => [...videoPlanProblems({ segments: segs, visual_direction: head.visual_direction, ...(cut ? { cut } : {}), ...spoken }, b.count, lengths, mode, b.first, true, recipe.id), ...(b.first === 0 && !avatar ? castProblems(recipe, head.cast) : []), ...(b.first === 0 && l.p.caption_lengths ? placementCaptionProblems(head.ad_copy?.primary_text) : [])],
        ...(batches.length > 1
            ? {
                saved: (head: Head, segments: Placed[]) => {
                    l.p.plan_parts = { key, head, segments };
                    save(l.job.id, l.p);
                },
            }
            : {}),
    });
    delete l.p.plan_parts;
    const out = { ...written.head, segments: written.segments };
    const themeIds = [...new Set(l.script.lines.flatMap((x) => x.theme_ids))];
    const claimIds = [...new Set(l.script.lines.flatMap((x) => x.claim_ids))];
    const dealt = deal ? dealNote(deal, l.script.lines, lengths) : "";
    const listed = !!cut && out.segments.some((x) => x.scenes.some((sc) => (sc.props ?? []).some((n) => out.props.some((p) => same(p.name, n)))));
    const sceneOf = (x: Placed["scenes"][number]): VideoPlan["segments"][number]["scenes"][number] => ({
        seconds: x.seconds,
        visual: x.visual,
        dialogue: x.dialogue,
        overlay: x.overlay,
        tone: x.tone,
        ...(x.face?.trim() ? { face: shorten(x.face, FACE_CHARS).replace(/\.$/, "") } : {}),
        ...(cut && x.size ? { size: x.size } : {}),
        ...(cut && x.angle ? { angle: x.angle } : {}),
        ...(cut && x.move ? { move: x.move } : {}),
        ...(cut && x.focus ? { focus: x.focus } : {}),
        ...(cut && !l.p.avatar_reference && x.place?.trim() ? { place: x.place.trim() } : {}),
        ...(listed ? { props: out.props.filter((p) => (x.props ?? []).some((n) => same(p.name, n))).map((p) => p.name) } : {}),
    });
    const own: VideoPlan = {
        title: out.title,
        visual_direction: l.p.avatar_reference ? `Real photographic texture. ${l.p.avatar_reference.setting.lighting}. Match the kept setting's physical light sources, shadows and colour.` : out.visual_direction,
        cast: { ...(out.cast.presenter && !recipeUsesCharacterOnly(recipe) ? { presenter: out.cast.presenter } : {}), ...(out.cast.guest && (recipe.people ?? 1) > 1 ? { guest: out.cast.guest } : {}), ...(out.cast.character ? { character: out.cast.character } : {}), setting: l.p.avatar_reference ? `${l.p.avatar_reference.setting.location} Light: ${l.p.avatar_reference.setting.lighting}` : out.cast.setting, voice_direction: out.cast.voice_direction, handling: out.cast.handling, product_details: out.cast.product_details, ...(out.cast.camera ? { camera: out.cast.camera } : {}) },
        cast_options: castOptions({ ...(out.cast.presenter && !recipeUsesCharacterOnly(recipe) ? { presenter: out.cast.presenter } : { character: out.cast.character ?? "" }) }, (out.cast_options ?? []).map((o) => ({ label: o.label, ...(o.presenter ? { presenter: o.presenter } : {}), ...(o.character ? { character: o.character } : {}) }))),
        cast_choice: 0,
        ...(out.props.length ? { props: out.props.map((p) => ({ ...p, place: "" })) } : {}),
        ...(cut && !l.p.avatar_reference && out.places.length ? { places: out.places.map((x) => ({ name: x.name.trim(), look: x.look.trim() })) } : {}),
        ...(out.props.length && out.product_parts.length
            ? {
                product_parts: out.props
                    .filter((x) => out.product_parts.some((y) => same(y.name, x.name)))
                    .map((x) => {
                    const photo = photos[out.product_parts.find((y) => same(y.name, x.name))!.photo - 1]?.photo;
                    return { name: x.name, ...(photo ? { photo } : {}) };
                }),
            }
            : {}),
        ...(cut ? { cut } : {}),
        ...(mode === "exact" ? {} : spoken),
        segments: out.segments.map((x, i) => ({ scenes: x.scenes.map(sceneOf), seconds: lengths[i] ?? seconds, ...(x.start ? { start: x.start } : {}), ...(x.end ? { end: x.end } : {}), ...(keyFrames > 0 && x.key_moments?.length ? { frames: distinctFrames([...x.key_moments.slice(0, keyFrames).map((f): StoryFrame => ({ moment: "key", at: Math.min(lengths[i] ?? seconds, f.at), description: f.description })), { moment: "end" as const, at: lengths[i] ?? seconds, description: x.end || x.scenes[x.scenes.length - 1].visual }]), frames_for: keyFrames + 1 } : {}) })),
        ...(out.ad_copy ? { ad_copy: { ...out.ad_copy, primary_text: l.p.caption_lengths ? out.ad_copy.primary_text : fillLengths(out.ad_copy.primary_text), headlines: out.ad_copy.headlines.map((h) => h.trim()).filter((h) => h && h.length <= 40) } } : {}),
        theme_ids: themeIds,
        claim_ids: claimIds,
        notes: [dealt, out.notes].filter((x) => x.trim()).join(" "),
    };
    const plan = avatar ? withAvatar(own, avatar, avatarCopy(l.job.id, avatar.portrait, `avatar_${uid()}`)) : own;
    const readNow = (report: boolean) => readVideoPlan(l, plan, { report, fits: () => !problemsOf(plan).length });
    let read = await readNow(false);
    const claims = l.claims ? await claimsPass(l, videoPlanSlots(plan), VIDEO_WORDS, { accept: () => !problemsOf(plan).length }) : null;
    const judged = claims?.items ?? [];
    if (claims?.changed)
        read = await readNow(true);
    setVideoPlan(l, plan);
    if (place?.place)
        l.p.main_place = place.place;
    l.p.audit = [...l.p.audit, ...judged, ...read];
    logFailures({ brandId: l.job.brand_id, refType: "job", refId: l.job.id, productId: l.p.product_id }, auditPoints(l.p.audit));
    l.p.context_used.shot_plan = ctx.fields;
    l.p.skills_used = [...jobSkills.used, ...style.used];
    note(l.p, "plan", `Shot plan written: ${clipsSaid(plan.segments.map(segmentSeconds))}, by ${planModel}${batches.length > 1 ? `, in ${batches.length} parts` : ""}`);
    if (dealt)
        note(l.p, "plan", dealt);
    if (avatar)
        note(l.p, "plan", `Cast: ${avatar.name}, a saved avatar`);
    if (place?.place)
        note(l.p, "plan", `Main place: ${place.place}${place.from === "script" ? ", where the script starts" : place.from === "brand" ? ", one of the brand's own places" : ""}`);
    const short = shortClipsText(plan, framesPerClip(l.p));
    if (short)
        note(l.p, "storyboard", short);
    for (const name of partsWithoutPhoto(plan))
        note(l.p, "plan", partFlag(name));
    l.p.next = "approve:plan";
    save(l.job.id, l.p, { status: "in_review" });
}
function setVideoPlan(l: Pick<Loaded, "p" | "brand" | "job" | "claims" | "script">, plan: VideoPlan) {
    l.p.video_plan = plan;
    l.p.plan_status = "draft";
    const c = plan.ad_copy;
    const texts = [...plan.segments.flatMap((s, i) => s.scenes.flatMap((x, j) => [{ text: x.dialogue, where: `clip ${i + 1} scene ${j + 1} dialogue` }, { text: x.overlay, where: `clip ${i + 1} scene ${j + 1} overlay` }])), ...(c ? [{ text: c.primary_text.short, where: "primary text, short" }, { text: c.primary_text.medium, where: "primary text, medium" }, { text: c.primary_text.long, where: "primary text, long" }, ...c.headlines.map((h, i) => ({ text: h, where: `headline ${i + 1}` })), { text: c.description, where: "description" }] : [])];
    const lengths = planLengths(plan, clipSeconds(l.p));
    const mode = l.p.reference_mode === "exact" && !l.p.reference_id ? null : (l.p.reference_mode ?? null);
    const cover = plan.cut?.cover && mode !== "exact" ? plan.segments.flatMap((s, i) => coverageProblems(s.scenes, i, lengths[i] ?? clipSeconds(l.p), plan.cut?.pace, !!plan.cut?.montage, l.p.recipe)) : [];
    l.p.audit = shown(l, [...auditText(l as Loaded, texts), ...videoPlanProblems(plan, l.p.segments, lengths, mode, 0, false, l.p.recipe).map((m): AuditItem => ({ check: "clip_structure", status: "fail", message: m })), ...requestedDurationProblems(plan, l.p.target_seconds).map((message): AuditItem => ({ check: "requested_duration", status: "fail", message })), ...(l.p.target_seconds !== undefined ? approvedSpeechProblems(plan, l.script.lines).map((message): AuditItem => ({ check: "approved_dialogue", status: "fail", message })) : []), ...(l.p.caption_lengths ? placementCaptionProblems(plan.ad_copy?.primary_text).map((message): AuditItem => ({ check: "caption_lengths", status: "fail", message })) : []), ...cover.map((m): AuditItem => ({ check: "clip_structure", status: "warn", message: m }))]);
}
function videoContractProblems(l: Pick<Loaded, "p" | "script">): string[] {
    const plan = l.p.video_plan;
    if (!plan)
        return [];
    return [...requestedDurationProblems(plan, l.p.target_seconds), ...(l.p.target_seconds !== undefined ? approvedSpeechProblems(plan, l.script.lines) : []), ...(l.p.caption_lengths ? placementCaptionProblems(plan.ad_copy?.primary_text) : [])];
}
const PHOTOREAL = "Look: a real photograph, like an unretouched phone photo of a real person in soft window daylight. Real skin texture with visible pores, slight natural asymmetry, real fabric wrinkles. Not illustrated, not 3D, no beauty filter, no studio glamour lighting.";
const PHOTOREAL_SETTING = "Look: a real unretouched photograph with natural skin texture, slight facial asymmetry and fabric wrinkles. Match the selected setting's physical light sources, brightness, shadows and colour. Keep photographic detail within that lighting; no illustration, 3D or beauty filter.";
const dot = (s: string) => {
    const t = s.trim().replace(/\s+/g, " ");
    return !t || /[.!?]$/.test(t) ? t : `${t}.`;
};
function personLines(plan: VideoPlan, recipe?: FormatRecipe): string {
    const p = plan.cast.presenter;
    if (!p)
        return "";
    const who = [p.gender, p.age, p.skin_tone && `${p.skin_tone} skin`, p.eyes && `${p.eyes} eyes`, p.hair].filter(Boolean).join(", ");
    const one = `Who: a fictional adult. ${dot(who)}${p.features ? ` ${dot(p.features)}` : ""}\nOutfit: ${dot(p.wardrobe ?? "")} No logos and no printed words on clothing.`;
    const g = plan.cast.guest;
    if (!g)
        return one;
    const guest = [g.gender, g.age, g.skin_tone && `${g.skin_tone} skin`, g.eyes && `${g.eyes} eyes`, g.hair].filter(Boolean).join(", ");
    const [a, b] = castRoles(recipe ?? { id: "podcast" });
    const sheet = recipe && isCinematic(recipe) ? " in the identity sheet" : "";
    return `The ${a}, on the left${sheet}. ${one}\nThe ${b}, on the right${sheet}. Who: a different fictional adult. ${dot(guest)}${g.features ? ` ${dot(g.features)}` : ""}\nOutfit: ${dot(g.wardrobe ?? "")} No logos and no printed words on clothing.`;
}
const propLines = (plan: VideoPlan, places = true) => (plan.props?.length ? `${places ? "In the frame, and nothing else that is branded" : "The objects of this video, each looking exactly as in Image 1"}: ${plan.props.map((p) => `${p.name}${p.look ? ` (${p.look})` : ""}${places && p.place ? `, ${p.place}` : ""}`).join("; ")}.` : "");
const shotPlace = (plan: VideoPlan, sc: {
    place?: string;
}) => {
    const said = sc.place?.trim();
    if (!said)
        return plan.cast.setting;
    const named = plan.places?.find((p) => same(p.name, said));
    return named?.look ? `${named.name}: ${named.look}` : said;
};
const shotProps = (plan: VideoPlan, clip: number, shot: number) => {
    const inShot = propsIn(plan, clip, shot);
    if (!inShot.length)
        return "No product, no pack and no branded object is in this frame.";
    return `In the frame, and no other object of this video: ${inShot.map((p) => `${p.name}${p.look ? ` (${p.look})` : ""}`).join("; ")}.${productIn(plan, clip, shot) ? "" : " The product and its pack are not in this frame."}`;
};
const FILM_PHOTO = "Look: a photoreal cinematic film still. Natural skin variation, real fabric and believable physical materials. Preserve the scene light sources, their positions, direction and falloff; focus follows the shot. No beauty filter.";
const animeFrameStyle = (plan: VideoPlan) => `Original hand-drawn 2D anime key frame: stable line weight, cel shadows and design. No photoreal skin or 3D rendering. Preserve the approved palette and texture. ${dot(plan.visual_direction)}`;
const styleLine = (recipe: FormatRecipe, preset: string, plan: VideoPlan, settingReference = false) => [recipeUsesCharacterOnly(recipe) ? `Style: ${dot(recipe.label)} ${dot(recipe.craft)}` : isCinematic(recipe) ? FILM_PHOTO : settingReference ? PHOTOREAL_SETTING : PHOTOREAL, recipe.presets[preset] ? dot(recipe.presets[preset]) : "", plan.visual_direction ? `Light and palette: ${dot(plan.visual_direction)}` : ""].filter(Boolean).join(" ");
const imageList = (refs: {
    purpose: string;
}[]) => (refs.length ? refs.map((r, i) => `Image ${i + 1} is ${r.purpose}`).join(" ") : "");
export function characterPrompt(recipe: FormatRecipe, plan: VideoPlan, preset = "default"): string {
    const trio = "CHARACTER REFERENCE SHEET for a video shoot. Exactly 3 equal vertical panels side by side, edge to edge, no gutters, no captions, no text, no product.";
    const head = "CHARACTER REFERENCE SHEET for a video shoot. Exactly 6 equal panels in 2 rows of 3, edge to edge, no gutters, no captions, no text, no product.";
    if (isCinematic(recipe) && sheetViews(recipe) === 3)
        return `${trio} Each panel shows the same two distinct fictional adults. Character A on the left and Character B on the right identify them here, not their blocking in the final scene. Panel 1: both head and shoulders, front view. Panel 2: both waist up, three-quarter view. Panel 3: both full figure, front view. Same outfits and physical features throughout. Plain neutral wall and soft even light for identity only.\n\n${personLines(plan, recipe)}\n\nReal unretouched photographic skin and fabric. This sheet supplies identity only, not the final scene lighting.`;
    if (sheetViews(recipe) === 3)
        return `${trio} Each panel shows the same two distinct fictional adults together, from the waist up in the same outfits against a plain neutral wall; host on the left, guest on the right. Panel 1: both facing the camera. Panel 2: three-quarter view. Panel 3: side profile.\n\n${personLines(plan, recipe)}\n\n${PHOTOREAL}`;
    if (recipeUsesCharacterOnly(recipe))
        return `${head} The same single original character in all 6 panels, against a plain neutral background, identical in shape, colours, proportions and material. Top row. Panel 1: full figure, straight front view. Panel 2: full figure, three-quarter view. Panel 3: full figure, strict 90-degree right-facing profile, nose or front pointing to the panel's right edge, not a three-quarter view. Bottom row. Panel 4: full figure, straight back view. Panel 5: the face close up, straight front view. Panel 6: both hands close up, with anything it carries. Panels 1 to 4 show the whole figure from its highest point through both feet, or its entire base if it has no feet, with clear margin above and below; no part touches or crosses a panel edge.\n\nCharacter: ${dot(plan.cast.character ?? "")}\n\n${styleLine(recipe, preset, plan)} Not a photoreal human.`;
    return `${head} The same single fictional adult in all 6 panels: the same face, hair, outfit and proportions, and every mark, piece of jewellery and detail of the hair the same in number and place in each panel. Exactly 1 person per panel. Top row. Panel 1: head and shoulders, straight front view, relaxed neutral face, looking into the camera. Panel 2: waist up, three-quarter view, the same relaxed neutral face, mouth closed. Panel 3: standing full-body front view, hands at the sides, fingers together; top of head and both feet or shoes fully visible, with clear margin above the head and below both soles. Bottom row. Panel 4: head and shoulders in strict 90-degree right-facing side profile; nose points to the panel's right edge, only the near eye is visible, not a three-quarter view. Panel 5: standing full-body back view, head and torso facing directly away, showing the back of the hair and outfit; top of head and both feet or shoes fully visible, with clear margin above the head and below both soles. Panel 6: both hands close up at chest height, five fingers each, with the cuffs of the outfit.\n\n${personLines(plan, recipe)}\n\n${PHOTOREAL} Plain warm off-white wall behind.`;
}
const faceLine = (sc: {
    face?: string;
}) => (sc.face?.trim() ? `The face: ${dot(sc.face)} ` : "");
const faceIsOwn = (said: string) => `The references fix who the person is, never their expression: the expression, the gaze and the pose are what "${said}" says.`;
export function lookPrompt(a: {
    aspect: string;
    recipe: FormatRecipe;
    preset: string;
    plan: VideoPlan;
    refs: {
        purpose: string;
    }[];
    hasCharacter: boolean;
    settingReference?: boolean;
}): string {
    const { plan } = a;
    const c = plan.cast;
    if (plan.cut) {
        const first = plan.segments[0].scenes[0];
        const shown = productIn(plan, 0, 0);
        return [
            `ONE ${a.aspect} frame: the first frame of the first shot of a ${a.recipe.label} video. Not a finished ad: no captions, no added text, no graphics.`,
            imageList(a.refs),
            `The shot: ${framing(first) ? `${dot(framing(first))} ` : ""}${faceLine(first)}${dot(plan.segments[0].start || first.visual)}${c.camera ? ` Camera: ${dot(c.camera)}` : ""}`,
            first.face?.trim() && a.refs.length ? faceIsOwn("The shot") : "",
            `The place: ${dot(shotPlace(plan, first))}`,
            shotProps(plan, 0, 0),
            shown ? plainPartsLine(plan) : "",
            shown ? `Product: ${dot(c.product_details)} Its size against a hand is true to life. ${c.handling === "display" ? "Nobody holds it." : "Any hand that holds it has five fingers, grips its edges and leaves its printing uncovered."}` : "",
            a.hasCharacter ? "" : c.presenter ? personLines(plan, a.recipe) : c.character ? `Character: ${dot(c.character)}` : "",
            styleLine(a.recipe, a.preset, plan, a.settingReference),
            isCinematic(a.recipe) ? "The approved scene master fixes the room layout, practical light sources and colour grade. It depicts only the cast members this shot names. Keep the planned focal planes; shadowed areas stay shadowed." : a.settingReference ? "The kept setting fixes the room, wardrobe and physical light. Preserve its shadows and brightness; keep the planned subject readable and the action already under way." : "This still is the frame the video opens on, so it is sharp and evenly lit, the action is already under way in it, and nothing this shot needs is hidden or out of frame.",
        ]
            .filter(Boolean)
            .join("\n\n");
    }
    return [
        `ONE ${a.aspect} frame: the opening frame of a ${a.recipe.label} video. Not a finished ad: no captions, no added text, no graphics.`,
        imageList(a.refs),
        `The shot: ${dot(plan.segments[0].start || plan.segments[0].scenes[0].visual)}${c.camera ? ` Camera: ${dot(c.camera)}` : ""}`,
        `The place: ${dot(c.setting)}`,
        propLines(plan),
        plainPartsLine(plan),
        `Product: ${dot(c.product_details)} Its size against a hand is true to life. ${c.handling === "display" ? "It stands on display; nobody holds it." : "Any hand that holds it has five fingers, grips its edges and leaves its printing uncovered."}`,
        a.hasCharacter ? "" : c.presenter ? personLines(plan, a.recipe) : c.character ? `Character: ${dot(c.character)}` : "",
        styleLine(a.recipe, a.preset, plan, a.settingReference),
        isCinematic(a.recipe) ? "The scene master fixes layout, practical light sources and grade; match the planned focal planes and visible cast." : a.settingReference ? "The kept setting fixes layout, wardrobe and physical light. Preserve its shadows and brightness; keep the planned subject readable." : "This still is the first frame the video model animates from, so it is sharp, evenly lit and complete: nothing the video needs is hidden or out of frame.",
    ]
        .filter(Boolean)
        .join("\n\n");
}
export function keyframePrompt(a: {
    aspect: string;
    plan: VideoPlan;
    index: number;
    refs: {
        purpose: string;
    }[];
    photoreal: boolean;
    cinematic?: boolean;
    anime?: boolean;
}): string {
    const seg = a.plan.segments[a.index];
    return [
        `ONE ${a.aspect} frame from the same video as Image 1, a little later: the frame clip ${a.index + 1} ends on. Change only what "Now" describes. Everything else stays exactly as in Image 1: the same person with the same face, hair and outfit, the same place, light and camera position, and every object that "Now" does not mention, in the same spot.`,
        imageList(a.refs),
        a.anime ? animeFrameStyle(a.plan) : "",
        `Now: ${dot(seg.end || seg.scenes[seg.scenes.length - 1].visual)}`,
        propLines(a.plan, false),
        plainPartsLine(a.plan),
        `No captions, no added text, no graphics.${a.cinematic ? " A photoreal cinematic film still: preserve practical light, shadows and the shot focus. Show only the cast members this shot names." : a.photoreal ? " A real photograph from a phone video, not illustrated, not 3D." : ""} Hands have five fingers and a grip a real hand makes.`,
    ]
        .filter(Boolean)
        .join("\n\n");
}
export function storyFramePrompt(a: {
    aspect: string;
    plan: VideoPlan;
    clip: number;
    frame: StoryFrame;
    refs: {
        purpose: string;
    }[];
    photoreal: boolean;
    cinematic?: boolean;
    anime?: boolean;
}): string {
    const what = a.frame.moment === "end" ? `the frame clip ${a.clip + 1} ends on` : `a moment in the middle of clip ${a.clip + 1}, about ${Math.round(a.frame.at)} seconds into it, caught mid-action`;
    const sheet = a.refs.findIndex((r) => r.purpose === STORY_REF.character);
    const portrait = a.refs.findIndex((r) => r.purpose === STORY_REF.portrait);
    const marks = fixedMarks(a.plan.cast.presenter);
    const identity = a.anime ? `Identity: ${dot(a.plan.cast.character ?? "")} Match the approved identity sheet's design, not its neutral background or pose. The scene master fixes geography and palette; this shot fixes framing and action.` : a.cinematic && a.plan.cast.guest ? "Identity: use the character sheet for the two distinct faces and outfits, never blend or swap them. The scene master gives light and layout; this shot gives visible cast and framing." : portrait >= 0 && a.plan.cast.presenter ? `Identity first: Image ${portrait + 1} is the selected portrait and the authority for the face, including its shape, fullness, nose, eyes, skin and marks. The sheet supplies the matching body and wardrobe. An opening or previous frame must never override this face.${marks ? ` ${marks}` : ""}` : sheet >= 0 && a.plan.cast.presenter ? `Identity first: the person's face is the face in the front view of the character sheet (Image ${sheet + 1}, its first panel). Match that face before anything else: its shape and fullness, the nose, the eyes, the skin.${marks ? ` ${marks}` : ""}` : marks;
    if (a.plan.cut) {
        const seg = a.plan.segments[a.clip];
        const n = a.frame.moment === "end" ? seg.scenes.length - 1 : shotAt(seg, a.frame.at);
        const sc = seg.scenes[n];
        const shown = productIn(a.plan, a.clip, n);
        return [
            `ONE ${a.aspect} frame from the same video as Image 1: shot ${n + 1} of clip ${a.clip + 1}${a.frame.moment === "end" ? ", its last frame" : ", caught mid-action"}. It is a new camera set-up after a hard cut. From Image 1 it keeps the world and nothing else: the same person with the same face, hair and outfit wherever a person is in it, the same light, colours and look. The framing, the angle and what is in the frame are what "This shot" says.`,
            identity ? `${identity} ${faceIsOwn("This shot")}` : "",
            a.anime ? animeFrameStyle(a.plan) : "",
            imageList(a.refs),
            `This shot: ${framing(sc) ? `${dot(framing(sc))} ` : ""}${faceLine(sc)}${dot(a.frame.description)}`,
            `The place: ${dot(shotPlace(a.plan, sc))}`,
            shotProps(a.plan, a.clip, n),
            shown ? plainPartsLine(a.plan) : "",
            `No captions, no added text, no graphics.${a.cinematic ? " A photoreal cinematic film still: preserve practical light, shadows and the shot focus. Show only the cast members this shot names." : a.photoreal ? " A real photograph from a phone video, not illustrated, not 3D." : ""} Hands have five fingers and a grip a real hand makes.`,
        ]
            .filter(Boolean)
            .join("\n\n");
    }
    return [
        `ONE ${a.aspect} frame from the same video as Image 1, a little later: ${what}. Change only what "Now" describes. Everything else stays exactly as in Image 1: the same person with the same face, hair and outfit, the same place, light and camera position, and every object that "Now" does not mention, in the same spot.`,
        identity,
        a.anime ? animeFrameStyle(a.plan) : "",
        imageList(a.refs),
        `Now: ${dot(a.frame.description)}`,
        propLines(a.plan, false),
        plainPartsLine(a.plan),
        `No captions, no added text, no graphics.${a.cinematic ? " A photoreal cinematic film still: preserve practical light, shadows and the shot focus. Show only the cast members this shot names." : a.photoreal ? " A real photograph from a phone video, not illustrated, not 3D." : ""} Hands have five fingers and a grip a real hand makes.`,
    ]
        .filter(Boolean)
        .join("\n\n");
}
export const STORY_REF = {
    portrait: "the selected portrait: the face identity authority. Match its face shape, fullness, eyes, nose, skin, hair and marks before the opening or previous frame. The approved sheet supplies consistent body, wardrobe and accessories. Its neutral wall and portrait crop never appear.",
    animeCharacter: "the anime identity sheet: match the original lead's silhouette, face, hair, outfit, palette, line weight and cel shadows. Ignore its neutral background, panel layout and pose. The scene controls geography; the shot controls framing and action.",
    look: "the opening frame of this video: the person, the place, the light and the camera position.",
    cinematicCast: "the identity sheet: Character A is the adult on its left, Character B the adult on its right. Match each face, hair, outfit, marks and build. Its wall, lighting, panel layout and blocking never appear. Scene references control location and lighting; this shot controls who appears.",
    character: "the character sheet: views of 1 person. Its first panel, the face from the front, is the identity reference. The person in this picture is exactly that person, with the same face, hair, outfit and marks. The sheet's layout and its plain wall never appear.",
    part: (name: string) => `a photo of ${name}. ${name[0].toUpperCase()}${name.slice(1)} in this picture is exactly that: the same shape, colours and printing.`,
    previous: 'the storyboard frame just before this one. This picture continues from it: the same person, outfit, place and light, and every object where that frame left it unless "Now" moves it.',
    lookCut: "the opening shot of this video. This picture is another shot of the same video: the same light, colours and look, and the same person where both show one. Its framing is not copied.",
    previousCut: "the shot before this one. This picture comes after a hard cut from it: the same person, outfit, light and look, and each object in the state that shot left it. Its framing is not copied.",
};
function storyRefs(l: Loaded, previous: string | true | null, at?: Pick<StoryFrame, "moment" | "at"> & {
    clip: number;
}): {
    file: string | null;
    purpose: string;
}[] {
    const plan = l.p.video_plan;
    const directed = !!plan?.cut;
    const inShot = !directed || !at || productIn(plan!, at.clip, at.moment === "end" ? plan!.segments[at.clip].scenes.length - 1 : shotAt(plan!.segments[at.clip], at.at));
    const shown = inShot && planOf(l, "storyboard").attach.productPhotos !== "none";
    const all = productImages(l.job.brand_id, l.kit, l.p.product_id);
    const imgs: {
        hero: string | null;
        extras: string[];
    } = shown ? all : { hero: null, extras: [] };
    const views = imgs.extras.map((file) => ({ file, purpose: photoLabel(l.job.brand_id, l.p.product_id, file) ?? "" })).filter((r) => r.purpose && fs.existsSync(r.file)).slice(0, 1);
    return [
        { file: l.p.look ? dataPath(l.p.look.file) : null, purpose: directed ? STORY_REF.lookCut : STORY_REF.look },
        ...(imgs.hero ? [{ file: imgs.hero, purpose: PRODUCT_ROLE }] : []),
        ...views,
        ...(shown ? partRefs(l, [imgs.hero, ...views.map((v) => v.file)]) : []),
        ...identityRefs(l),
        ...(previous ? [{ file: previous === true ? null : previous, purpose: directed ? STORY_REF.previousCut : STORY_REF.previous }] : []),
    ];
}
function partRefs(l: Loaded, already: (string | null)[] = []): {
    file: string;
    purpose: string;
}[] {
    const have = new Set(already.filter((f): f is string => !!f).map((f) => path.resolve(f)));
    const out: {
        file: string;
        purpose: string;
    }[] = [];
    for (const part of l.p.video_plan?.product_parts ?? []) {
        const file = partFile(l.job.brand_id, part.photo);
        if (!file || have.has(path.resolve(file)))
            continue;
        have.add(path.resolve(file));
        out.push({ file, purpose: STORY_REF.part(/^(the|a|an) /i.test(part.name) ? part.name : `the ${part.name}`) });
    }
    return out.slice(0, 2);
}
function storyboardDraft(l: Loaded): Omit<StoryboardFrame, "file">[] {
    const plan = l.p.video_plan!;
    return storyboardWords(plan, framesPerClip(l.p)).map((f, i) => ({ ...f, prompt: storyFramePrompt({ aspect: l.p.aspect, plan, clip: f.clip, frame: f, refs: storyRefs(l, i > 0 ? true : null, f), photoreal: !recipeUsesCharacterOnly(l.recipe!), cinematic: isCinematic(l.recipe!), anime: l.recipe?.id === "anime" }) }));
}
async function drawFrame(l: Loaded, frames: StoryboardFrame[], i: number, stamp: string, change = "", keep = ""): Promise<void> {
    const f = frames[i];
    const broken = videoContractProblems(l);
    if (broken.length)
        throw new Error(broken[0]);
    identityRefs(l, true);
    const prev = i > 0 && frames[i - 1].file ? dataPath(frames[i - 1].file) : null;
    let refs = storyRefs(l, prev, f).filter((r): r is {
        file: string;
        purpose: string;
    } => !!r.file && fs.existsSync(r.file));
    let prompt = storyFramePrompt({ aspect: l.p.aspect, plan: l.p.video_plan!, clip: f.clip, frame: f, refs, photoreal: !recipeUsesCharacterOnly(l.recipe!), cinematic: isCinematic(l.recipe!), anime: l.recipe?.id === "anime" });
    const current = keep && f.file && fs.existsSync(dataPath(f.file)) ? dataPath(f.file) : null;
    if (current) {
        const fixed = keepRefs(l, { approvedIdentity: true });
        refs = [{ file: current, purpose: "" }, ...fixed];
        prompt = changeRequest({ one: "frame of a video storyboard", aspect: l.p.aspect, ask: keep, texts: [], roles: fixed.map((r) => r.purpose) });
        change = "";
    }
    const nth = frames.slice(0, i + 1).filter((x) => x.clip === f.clip).length;
    const out = assetPath(l.job.id, `storyboard_${stamp}_c${f.clip + 1}_f${nth}.png`);
    await generateImage({ brandId: l.job.brand_id, jobId: l.job.id, purpose: `storyboard clip ${f.clip + 1} frame ${nth}`, prompt: prompt + change, refs: refs.map((r) => r.file), size: singlePanelSize(l.p.aspect), out: out.abs });
    const { stale: _stale, ...kept } = f;
    frames[i] = { ...kept, prompt, file: path.relative(env.DATA_DIR, out.abs).split(path.sep).join("/") };
}
function singlePanelSize(aspect: string): string {
    const [a, b] = aspect.split(":").map(Number);
    const m = Math.max(a, b);
    return `${Math.round((1792 * a) / m / 16) * 16}x${Math.round((1792 * b) / m / 16) * 16}`;
}
type Prep = "character" | "look" | "storyboard";
function identityRefs(l: Loaded, required = false): {
    file: string;
    purpose: string;
}[] {
    const sheet = l.p.character ? dataPath(l.p.character.file) : null;
    if (required && l.recipe?.character && (!l.p.character || l.p.character.status !== "approved" || !sheet || !fs.existsSync(sheet)))
        throw new Error("Restore and approve the character reference before editing this frame. The existing image was kept and no image was requested.");
    const plan = l.p.video_plan;
    const chosen = plan?.cast_options?.[plan.cast_choice ?? 0]?.portrait;
    if (required && chosen && l.recipe && !recipeUsesCharacterOnly(l.recipe) && plan?.cast.presenter && !plan.cast.guest && !fs.existsSync(dataPath(chosen)))
        throw new Error("Restore the selected portrait before editing this frame. The existing image was kept and no image was requested.");
    const face = l.recipe && !recipeUsesCharacterOnly(l.recipe) && plan?.cast.presenter && !plan.cast.guest && chosen && fs.existsSync(dataPath(chosen)) ? dataPath(chosen) : null;
    return [
        ...(face ? [{ file: face, purpose: STORY_REF.portrait }] : []),
        ...(sheet && fs.existsSync(sheet) ? [{ file: sheet, purpose: l.recipe?.id === "anime" ? STORY_REF.animeCharacter : l.recipe && isCinematic(l.recipe) && plan?.cast.guest ? STORY_REF.cinematicCast : STORY_REF.character }] : []),
        ...avatarReferenceImageRefs(l.p).slice(1).map((r) => ({ ...r, purpose: `${r.purpose}. Show this avatar only when the shot names that person; a product insert may exclude them` })),
    ];
}
function keepRefs(l: Loaded, opts: {
    product?: boolean;
    approvedIdentity?: boolean;
} = {}): {
    file: string;
    purpose: string;
}[] {
    const hero = opts.product === false ? null : productImages(l.job.brand_id, l.kit, l.p.product_id).hero;
    return [...(hero && fs.existsSync(hero) ? [{ file: hero, purpose: "The product photo: the real product, to keep its shape, colours and label exact." }] : []), ...identityRefs(l, opts.approvedIdentity)];
}
export const PORTRAIT_REF = "Image 1 is the portrait this person was chosen from. The person in every panel is exactly the person in Image 1: the same face shape, skin, eyes, nose, hair and marks. Panel 1 matches it most closely. Its framing and wall are not copied.";
export const RESTYLE_REF = "Image 1 is a photo of the person this character is. The character in every panel is that person made in this style: the same face shape, hair, skin tone, build and outfit, carried into the style so they are known at a glance. It is not a photograph, and nothing of the photo's own look, light or background is copied.";
const PRODUCT_ROLE = "the real product. The product in this picture is exactly that: the same shape, colours, label and printed words.";
async function stepPrep(l: Loaded, stage: Prep, feedback = "", keep = false) {
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    const plan = l.p.video_plan;
    if (!plan || l.p.plan_status !== "approved")
        throw new Error("Approve the shot plan first.");
    const broken = videoContractProblems(l);
    if (broken.length)
        throw new Error(broken[0]);
    const recipe = l.recipe!;
    const imgs = productImages(l.job.brand_id, l.kit, l.p.product_id);
    const change = feedback ? `\n\nRequested change to the last version: ${feedback.slice(0, 1200)}` : "";
    const rel = (abs: string) => path.relative(env.DATA_DIR, abs).split(path.sep).join("/");
    const namedViews = imgs.extras.map((file) => ({ file, purpose: photoLabel(l.job.brand_id, l.p.product_id, file) ?? "" })).filter((r) => r.purpose && fs.existsSync(r.file)).slice(0, 2);
    const avatar = stage === "character" ? castAvatar(l) : null;
    const reused = avatar && !feedback ? reuseSheet(l, avatar) : null;
    const views = sheetViews(recipe);
    let record: PrepStage;
    if (reused)
        record = reused;
    else if (stage === "storyboard") {
        const frames: StoryboardFrame[] = storyboardDraft(l).map((f) => ({ ...f, file: "" }));
        const stamp = uid();
        const key = createHash("sha1").update(JSON.stringify([l.p.look?.file ?? "", l.p.character?.file ?? "", l.p.aspect, l.p.product_id, l.p.taste ?? {}, feedback])).digest("hex");
        const had = l.p.storyboard_parts?.key === key ? l.p.storyboard_parts.frames : [];
        for (let i = 0; i < frames.length; i++) {
            const old = had[i];
            if (!old?.file || old.clip !== frames[i].clip || old.moment !== frames[i].moment || old.description !== frames[i].description || !fs.existsSync(dataPath(old.file)))
                break;
            frames[i] = old;
        }
        for (let i = 0; i < frames.length; i++) {
            if (frames[i].file)
                continue;
            await drawFrame(l, frames, i, stamp, change);
            if (i === frames.length - 1 || frames[i + 1].clip !== frames[i].clip) {
                l.p.storyboard_parts = { key, frames: frames.slice(0, i + 1) };
                save(l.job.id, l.p);
            }
        }
        delete l.p.storyboard_parts;
        const short = shortClipsText(plan, framesPerClip(l.p));
        if (short)
            note(l.p, "storyboard", short);
        delete l.p.prompts_ready;
        record = { file: frames[0].file, panels: frames.map((f) => f.file), frames, selected: 0, status: "draft", ...(feedback ? { feedback } : {}) };
    }
    else {
        const refs: {
            file: string;
            purpose: string;
        }[] = [];
        let prompt: string;
        let size: string;
        if (stage === "character") {
            prompt = characterPrompt(recipe, plan, l.p.preset);
            const chosen = plan.cast_options?.[plan.cast_choice ?? 0]?.portrait;
            const face = avatarFile(avatar?.portrait) ?? (chosen && fs.existsSync(dataPath(chosen)) ? dataPath(chosen) : null);
            if (l.p.avatar_reference) {
                const selected = avatarReferenceImageRefs(l.p);
                refs.push(selected[0], { file: selected[1].file, purpose: "the kept setting frame: use only this avatar's approved wardrobe. Do not copy the room, scene lighting, pose, product, other objects or words into the neutral character sheet" });
                prompt += `\n\n${imageList(refs)}. Every panel matches the master face and the selected wardrobe; keep the neutral sheet background and lighting.`;
            }
            else if (face) {
                refs.push({ file: face, purpose: "" });
                prompt += `\n\n${isRestyled(l, avatar) ? RESTYLE_REF : PORTRAIT_REF}`;
            }
            size = views === 6 ? "2304x1536" : "2304x1024";
        }
        else {
            if (planOf(l, "storyboard").attach.productPhotos !== "none" && (!plan.cut || productIn(plan, 0, 0))) {
                if (imgs.hero)
                    refs.push({ file: imgs.hero, purpose: PRODUCT_ROLE });
                refs.push(...namedViews);
                refs.push(...partRefs(l, refs.map((r) => r.file)));
            }
            refs.push(...identityRefs(l, true));
            prompt = lookPrompt({ aspect: l.p.aspect, recipe, preset: l.p.preset, plan, refs, hasCharacter: !!l.p.character, settingReference: !!l.p.avatar_reference });
            size = singlePanelSize(l.p.aspect);
        }
        const sheet = assetPath(l.job.id, `${stage}_${uid()}.png`);
        const current = keep && feedback && l.p[stage] && fs.existsSync(dataPath(l.p[stage]!.file)) ? dataPath(l.p[stage]!.file) : null;
        let ask = prompt + change;
        let sent = refs;
        if (current) {
            const fixed = stage === "character" ? avatarReferenceImageRefs(l.p).map((r, i) => i === 1 ? { ...r, purpose: "the kept avatar frame's wardrobe only; keep the neutral character sheet background, pose and lighting" } : r) : keepRefs(l, { approvedIdentity: true });
            sent = [{ file: current, purpose: "" }, ...fixed];
            ask = changeRequest({ one: stage === "character" ? `character reference sheet of ${views} panels` : "opening frame of a video", aspect: stage === "character" ? "wide" : l.p.aspect, ask: feedback.slice(0, 1200), texts: [], roles: fixed.map((r) => r.purpose), ...(stage === "character" ? { product: "none" as const } : {}) });
        }
        const filmed = !recipeUsesCharacterOnly(recipe) && !!plan.cast.presenter;
        await generateImage({ brandId: l.job.brand_id, jobId: l.job.id, purpose: stage, prompt: ask, refs: sent.map((r) => r.file), size, quality: "high", ...(filmed ? { use: stage === "character" ? ("person_sheet" as const) : ("ugc_first" as const) } : {}), onOtherModel: (said) => note(l.p, stage, said), out: sheet.abs });
        const panelFiles = stage === "character" ? await splitPanels(sheet.abs, views, (i) => sheet.abs.replace(/\.png$/, `_p${i + 1}.png`)) : [sheet.abs];
        record = { file: sheet.rel, panels: panelFiles.map(rel), selected: 0, status: "draft", ...(feedback ? { feedback } : {}) };
        if (avatar)
            keepSheet(l, avatar, record);
    }
    l.p[stage] = record;
    l.p.context_used[stage] = ["shot plan (cast, props, opening and ending frames)", ...(stage === "character" ? [] : ["product photo"]), ...(stage === "look" && l.p.character ? ["character sheet"] : []), ...(stage === "storyboard" ? ["opening frame"] : [])];
    l.p.next = `approve:${stage}`;
    note(l.p, stage, reused ? `Character sheet taken from the saved avatar ${avatar!.name}: no picture was drawn` : `${humanize(stage)} ${keep && feedback ? "changed: the same picture with your change" : `generated${feedback ? " with your notes" : ""}`}`);
    save(l.job.id, l.p, { status: "in_review", assets: prepAssets(l) });
}
function prepAssets(l: Loaded): JobAsset[] {
    const strip = (rel: string) => rel.replace(/^assets\//, "");
    const out: JobAsset[] = [];
    for (const stage of ["character", "look", "storyboard"] as const)
        if (l.p[stage])
            out.push({ path: strip(l.p[stage]!.file), kind: "image", caption: humanize(stage === "look" ? "look frame" : stage === "character" ? "character sheet" : stage) });
    for (const f of [l.p.motion?.file, l.p.captioned, l.p.joined].filter(Boolean).slice(0, 1) as string[])
        out.unshift({ path: strip(f), kind: "video", caption: l.p.motion?.file ? "Final video with motion finishing" : "Video" });
    return out;
}
const clipModel = () => videoModelInfo(videoModel());
function clipInputs(l: Loaded, index: number): {
    files: string[];
    purposes: string[];
} {
    const model = clipModel();
    if (model.chain === "last_frame") {
        if (index === 0)
            return { files: [assetPath(l.job.id, "clip_1_first.png").abs], purposes: ["the first frame. Start exactly on it and keep its person, place, light and framing"] };
        return { files: [assetPath(l.job.id, `clip_${index}_last.png`).abs], purposes: ["the first frame: the last frame of the previous clip of this video. Continue directly from it with the same person, place, light, framing and voice"] };
    }
    const plan = l.p.video_plan;
    const directed = !!plan?.cut;
    const imgs = directed && !productIn(plan!, index) ? { hero: null, extras: [] } : productImages(l.job.brand_id, l.kit, l.p.product_id);
    const seg = plan?.segments[index];
    const shotOf = (f: Pick<StoryFrame, "moment" | "at">) => (f.moment === "end" ? seg!.scenes.length : shotAt(seg!, f.at) + 1);
    const list: [
        string | null | undefined,
        string
    ][] = [
        [imgs.hero, "the real product: its exact packaging, label and shape"],
        ...imgs.extras.filter((f) => /out of its packaging/.test(photoLabel(l.job.brand_id, l.p.product_id, f) ?? "")).slice(0, 1).map((f): [
            string,
            string
        ] => [f, "the product itself, out of its packaging: its exact shape, colour and finish"]),
        [l.p.look && dataPath(l.p.look.file), directed ? (index === 0 ? "the first frame of the video: shot 1 as it opens" : "the opening shot of this video: its light, colours and look only") : "the opening frame of the video: the person, the product and the place"],
        ...drawnFrames(l.p.storyboard, index).map((f): [
            string,
            string
        ] => [dataPath(f.file), directed && seg ? `a key moment of this clip: shot ${shotOf(f)}, its framing and place` : f.moment === "end" ? "the last frame: the frame this clip ends on" : `a key moment of this clip${f.at ? `, about ${Math.round(f.at)} seconds in` : ""}: the pose and where each object is`]),
    ];
    let ok = list.filter(([f]) => !!f && fs.existsSync(f)) as [
        string,
        string
    ][];
    while (ok.length > model.maxImages) {
        const key = ok.findIndex(([, p]) => p.startsWith("a key moment"));
        const drop = key >= 0 ? key : ok.findIndex(([, p]) => p.startsWith("the product itself"));
        ok = ok.filter((_, i) => i !== (drop >= 0 ? drop : ok.length - 1));
    }
    return { files: ok.map(([f]) => f), purposes: ok.map(([, p]) => p) };
}
export const promptsReady = (model: string) => `The prompts are ready. The app can't make ${model} clips itself yet, so it stops here. Open the prompt pack: for each clip, attach the numbered pictures in order, paste the prompt, and make the clip in ${model}.`;
async function stepClips(l: Loaded) {
    const plan = l.p.video_plan;
    if (!plan || !l.p.look || l.p.look.status !== "approved")
        throw new Error("Approve the look frame before generating video.");
    if (hasStoryboard(l.p) && l.p.storyboard?.status !== "approved")
        throw new Error("Approve the storyboard before generating video.");
    const recipe = l.recipe!;
    const product = l.brand.products.find((x) => x.id === l.p.product_id)?.name ?? l.brand.products[0]?.name ?? l.brand.brand.name;
    const size = videoSize(l.p.aspect, l.p.resolution);
    const model = clipModel();
    const profile = model.prompt;
    const lengthOf = (i: number) => segmentSeconds(plan.segments[i]);
    if (model.secondsOnly) {
        const odd = plan.segments.findIndex((_, i) => !model.seconds.includes(lengthOf(i)));
        if (odd >= 0)
            throw new Error(`Clip ${odd + 1} is ${lengthOf(odd)} seconds, and ${model.name} makes ${lengthsText(model.seconds)} second clips only. Write the plan again so its clips fit this video model, or choose the video model the plan was written for in Settings.`);
    }
    const full = model.chain === "extend";
    const language = l.brand.brand.locale_accent ? `English, ${l.brand.brand.locale_accent} accent` : "";
    const packageOf = (i: number) => clipPackage({ p: l.p, recipe, brandId: l.job.brand_id, brandName: l.brand.brand.name, product, kit: l.kit, language, index: i, limit: model.promptLimit, ...(i > 0 ? { startFrame: null } : {}) });
    const relOf = (abs: string | null) => (abs && path.resolve(abs).startsWith(path.resolve(env.DATA_DIR) + path.sep) ? path.relative(env.DATA_DIR, abs).split(path.sep).join("/") : "");
    if (full) {
        const packs = plan.segments.map((_, i) => packageOf(i));
        const done = l.p.clips.filter((c) => c.status !== "pending");
        if (!done.length)
            l.p.clips = packs.map((k, index): ClipState => ({ index, status: "pending", prompt: k.prompt, refs: k.refs.map((r) => ({ file: relOf(r.src), purpose: `${r.purpose}${r.detail ? `: ${r.detail}` : ""}` })) }));
        l.p.context_used.video_prompt = contextFor("video_prompt", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id }).fields;
        const unavailable = videoProviderProblem();
        if (unavailable) {
            save(l.job.id, l.p);
            const pack = await buildHandoff(l.job.id);
            for (const c of l.p.clips)
                c.prompt = pack.clips[c.index]?.prompt ?? c.prompt;
            l.p.prompts_ready = { at: new Date().toISOString(), dir: pack.dir, why: promptsReady(model.name) };
            note(l.p, "clips", `Prompts ready: ${pack.clips.length} clip prompt${pack.clips.length === 1 ? "" : "s"} written, each with its pictures (${pack.clips.map((c) => c.refs.filter((r) => r.file).length).join(", ")}). No clip was made in the app`);
            save(l.job.id, l.p, { status: "in_review", error: null });
            return;
        }
        delete l.p.prompts_ready;
    }
    const prompts = full ? l.p.clips.map((c) => c.prompt) : plan.segments.map((_, i) => clipPrompt({ index: i, count: plan.segments.length, chainByVideo: model.chain === "reference_video", aspect: l.p.aspect, resolution: l.p.resolution, recipe, preset: l.p.preset, brand: l.brand.brand.name, product, plan, images: clipInputs(l, i).purposes, timing: profile.timing, speech: profile.speech, cuts: l.p.reference_mode === "exact" && !!l.p.reference_id, audio: l.p.video_audio }));
    if (!full) {
        const unavailable = videoProviderProblem();
        if (unavailable)
            throw new Error(unavailable);
    }
    if (!l.p.clips.length)
        l.p.clips = prompts.map((prompt, index): ClipState => ({ index, status: "pending", prompt }));
    l.p.context_used.video_prompt = contextFor("video_prompt", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id }).fields;
    save(l.job.id, l.p, { status: "running" });
    for (const clip of l.p.clips) {
        if (clip.status === "completed")
            continue;
        if (clip.status === "submitting")
            throw new Error(`Clip ${clip.index + 1}: the outcome of the last submission is unknown, so it won't be sent again automatically. Check the provider, then reset this clip.`);
        const source = assetPath(l.job.id, `clip_${clip.index + 1}_source.mp4`);
        let callId = "";
        if (clip.status !== "submitted" || !clip.provider_id) {
            let inputs = full ? { files: [] as string[], purposes: [] as string[] } : clipInputs(l, clip.index);
            let referenceVideo: string | undefined;
            if (full) {
                const pack = packageOf(clip.index);
                const files: string[] = [];
                for (const r of pack.refs) {
                    if (r.src)
                        files.push(r.src);
                    else {
                        const last = assetPath(l.job.id, `clip_${clip.index}_last.png`).abs;
                        await grabFrame(dataPath(l.p.clips[clip.index - 1].file!), lengthOf(clip.index - 1) - 0.05, last, size[0]);
                        files.push(last);
                    }
                }
                inputs = { files, purposes: pack.refs.map((r) => r.purpose) };
                prompts[clip.index] = pack.prompt;
                if (clip.index > 0) {
                    referenceVideo = assetPath(l.job.id, `clip_${clip.index}_ref.mp4`).abs;
                    await referenceClip(dataPath(l.p.clips[clip.index - 1].file!), referenceVideo, lengthOf(clip.index - 1));
                }
            }
            else if (clip.index === 0 && model.chain === "last_frame") {
                await sharp(dataPath(l.p.look!.file)).resize(size[0], size[1], { fit: "cover" }).png().toFile(inputs.files[0]);
            }
            else if (clip.index > 0 && model.chain === "last_frame") {
                const prev = dataPath(l.p.clips[clip.index - 1].file!);
                await grabFrame(prev, lengthOf(clip.index - 1) - 0.05, inputs.files[0], videoSize(l.p.aspect, l.p.resolution)[0]);
            }
            else if (clip.index > 0) {
                const prev = dataPath(l.p.clips[clip.index - 1].file!);
                referenceVideo = assetPath(l.job.id, `clip_${clip.index}_ref.mp4`).abs;
                await referenceClip(prev, referenceVideo, lengthOf(clip.index - 1));
            }
            clip.prompt = prompts[clip.index];
            clip.status = "submitting";
            save(l.job.id, l.p);
            try {
                const sub = await submitVideo({ brandId: l.job.brand_id, jobId: l.job.id, purpose: `clip ${clip.index + 1}`, prompt: clip.prompt, images: inputs.files, referenceVideo, seconds: lengthOf(clip.index), resolution: l.p.resolution, aspect: l.p.aspect });
                Object.assign(clip, { status: "submitted", provider_id: sub.taskId, cost_usd: sub.cost });
                callId = sub.callId;
            }
            catch (e) {
                Object.assign(clip, { status: "failed", error: (e as Error).message });
                save(l.job.id, l.p, { status: "in_review", error: clip.error });
                throw e;
            }
            save(l.job.id, l.p);
        }
        callId ||= db.select({ id: schema.mediaCalls.id }).from(schema.mediaCalls).where(eq(schema.mediaCalls.provider_id, clip.provider_id!)).get()?.id ?? "";
        try {
            await awaitVideo(clip.provider_id!, callId, source.abs);
        }
        catch (e) {
            const msg = (e as Error).message;
            if (/reported a failure/.test(msg))
                Object.assign(clip, { status: "failed", error: msg });
            save(l.job.id, l.p, { status: "in_review", error: msg });
            throw e;
        }
        const norm = assetPath(l.job.id, `clip_${clip.index + 1}.mp4`);
        const cropped = await normalizeClip(source.abs, norm.abs, size, lengthOf(clip.index), { mute: l.p.video_audio?.enabled === false });
        Object.assign(clip, { status: "completed", file: norm.rel, error: undefined });
        note(l.p, "clips", `Clip ${clip.index + 1} of ${l.p.clips.length} generated${cropped ? `. The provider returned a different shape than ${l.p.aspect}, so the clip was cropped to fill the frame` : ""}`);
        save(l.job.id, l.p);
    }
    l.p.next = l.p.workflow === "guided" ? "approve:clips" : "finish";
    save(l.job.id, l.p, { error: null, ...(l.p.workflow === "guided" ? { status: "in_review" as const } : {}) });
}
async function stepFinish(l: Loaded) {
    const plan = l.p.video_plan!;
    if (l.p.clips.some((c) => c.status !== "completed"))
        throw new Error("Not every clip is generated yet.");
    const joined = assetPath(l.job.id, "joined.mp4");
    await stitchClips(l.p.clips.map((c) => dataPath(c.file!)), joined.abs, clipModel().chain !== "reference_video");
    l.p.joined = joined.rel;
    const [w, h] = videoSize(l.p.aspect, l.p.resolution);
    const total = planSeconds(plan);
    if (!l.p.burn_captions) {
        delete l.p.captioned;
        l.p.next = "motion";
        note(l.p, "finish", `${l.p.clips.length} clip${l.p.clips.length === 1 ? "" : "s"} joined. No captions drawn in`);
        save(l.job.id, l.p, { status: "in_review", assets: prepAssets(l) });
        return;
    }
    const overlays: Overlay[] = [];
    const captionLook = await motionLook(l.job.brand_id, [], "caption");
    for (const at of sceneTimes(plan)) {
        const s = plan.segments[at.clip].scenes[at.scene];
        if (!s.overlay.trim())
            continue;
        const png = assetPath(l.job.id, `caption_${overlays.length + 1}.png`).abs;
        await captionPng(s.overlay.trim(), w, h, png, captionLook);
        overlays.push({ png, start: at.start, end: at.end, x: 0, y: 0 });
    }
    const captioned = assetPath(l.job.id, "video.mp4");
    await overlayVideo(joined.abs, overlays, captioned.abs, total);
    l.p.captioned = captioned.rel;
    l.p.next = "motion";
    note(l.p, "finish", `${l.p.clips.length} clip${l.p.clips.length === 1 ? "" : "s"} joined, ${overlays.length} on-screen caption${overlays.length === 1 ? "" : "s"} added`);
    save(l.job.id, l.p, { status: "in_review", assets: prepAssets(l) });
}
const POSITIONS = ["top-left", "top-right", "middle-left", "middle-right", "lower-left", "lower-right"] as const;
const MotionOut = z.object({
    style: z.string(),
    rationale: z.string(),
    events: z.array(z.object({ start: z.number(), end: z.number(), kind: z.enum(["label", "badge", "underline"]), text: z.string(), position: z.enum(POSITIONS), foreground: z.string().default(""), background: z.string().default(""), purpose: z.string() })).max(400),
});
export const motionEvents = (duration: number) => Math.round(18 * Math.max(1, duration / 60));
export function motionStyle(recipeId: string): string {
    return ["claymation", "clay-world", "wool", "paper", "watercolor"].includes(recipeId) ? "tactile" : ["cartoon", "comic", "talking-object", "anime", "motion-graphics", "collage", "skeleton", "song"].includes(recipeId) ? "graphic" : recipeId === "ugc" || recipeId === "podcast" ? "clean" : "premium";
}
export function validMotionEvents(events: MotionEvent[], duration: number, allowedCopy: string, captions: {
    start: number;
    end: number;
    text?: string;
}[], most = motionEvents(duration)): MotionEvent[] {
    const hex = /^#[0-9a-fA-F]{6}$/;
    const allowed = allowedCopy.toLowerCase().replace(/\s+/g, " ");
    const out: MotionEvent[] = [];
    for (const raw of [...events].sort((a, b) => a.start - b.start)) {
        const e = { ...raw, text: raw.kind === "underline" ? "" : raw.text.trim().slice(0, 96), foreground: hex.test(raw.foreground) ? raw.foreground : "#ffffff", background: hex.test(raw.background) ? raw.background : "#234f3e" };
        if (!(e.start >= 0 && e.end > e.start && e.end <= duration + 0.01))
            continue;
        if (e.kind !== "underline") {
            if (!e.text || !allowed.includes(e.text.toLowerCase().replace(/\s+/g, " ")))
                continue;
            if (e.end - e.start < Math.max(0.8, wordsIn(e.text) / 3))
                continue;
            if (contrast(e.foreground, e.background) < 4.5)
                e.foreground = contrast("#ffffff", e.background) >= 4.5 ? "#ffffff" : "#111111";
        }
        else if (e.end - e.start < 0.8)
            continue;
        if (out.length && e.start < out[out.length - 1].end)
            continue;
        const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (e.text && captions.some((c) => c.text && e.start < c.end && e.end > c.start && norm(c.text).includes(norm(e.text))))
            continue;
        if (e.position.startsWith("lower") && captions.some((c) => e.start < c.end && e.end > c.start))
            e.position = e.position.replace("lower", "middle") as MotionEvent["position"];
        out.push(e);
    }
    return out.slice(0, most);
}
async function stepMotion(l: Loaded) {
    const plan = l.p.video_plan!;
    const joined = l.p.captioned ?? l.p.joined;
    if (!joined)
        throw new Error("Join the clips before motion finishing.");
    const source = dataPath(joined);
    const { duration, width, height } = await mediaInfo(source);
    const style = motionStyle(l.p.recipe);
    const samples = Math.min(27, Math.round(5 * Math.max(1, duration / 60)));
    const times = [0, 0.5, 1.5, ...Array.from({ length: samples }, (_, k) => (duration * (k + 1)) / (samples + 1)), duration - 0.2].filter((t, i, a) => t >= 0 && t < duration && a.indexOf(t) === i);
    const frames: {
        file: string;
        at: number;
    }[] = [];
    for (const at of times) {
        const file = assetPath(l.job.id, `motion_frame_${frames.length + 1}.jpg`).abs;
        await grabFrame(source, at, file, 360);
        frames.push({ file, at });
    }
    const sheet = assetPath(l.job.id, "motion_contact_sheet.jpg");
    await contactSheet(frames, sheet.abs);
    const allScenes = plan.segments.flatMap((s) => s.scenes);
    const allowed = allScenes.flatMap((s) => [s.dialogue, s.overlay]).join(" ");
    const captions = sceneTimes(plan).flatMap((at) => {
        const s = plan.segments[at.clip].scenes[at.scene];
        return l.p.captioned && s.overlay.trim() ? [{ start: at.start, end: at.end, text: s.overlay }] : [];
    });
    const ctx = contextFor("motion", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id });
    const p = renderPrompt("motion-plan", {
        brand_voice: brandVoiceText(l.job.brand_id, { surfaces: ["on_image"], brand: l.brand }),
        lessons: learnedRules(l.job.brand_id, "writes", { productId: l.p.product_id, format: l.job.output_type }),
        max_events: String(Math.min(motionEvents(duration), 3 * l.p.segments + 2)),
        skill: skillFor("ecommerce-motion-finishing") || "(finishing skill not installed)",
        context: JSON.stringify({ brand: ctx.data, script: plan.segments, duration, format: { aspect: l.p.aspect, recipe: l.p.recipe }, style, user_direction: l.p.notes, frame_timestamps: times, caption_times: captions, coverage: "Sampled source-video contact sheet; no full visual tracking or audio beat measurement.", allowed_copy: allowed }),
    });
    const out = await geminiJson({ brandId: l.job.brand_id, task: "motion_plan", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: MotionOut, images: [sheet.abs], effort: "low", maxTokens: Math.min(24000, Math.max(8000, motionEvents(duration) * 100)), refType: "job", refId: l.job.id });
    const look = await motionLook(l.job.brand_id, l.kit.visual.colors);
    const events = validMotionEvents(out.events as MotionEvent[], duration, allowed, captions).map((e) => inLook(e, look));
    const overlays: Overlay[] = [];
    for (const [i, ev] of events.entries()) {
        const tile = await motionTile(ev, style, width, height, assetPath(l.job.id, `motion_tile_${i + 1}.png`).abs, look);
        overlays.push({ png: tile.png, start: ev.start, end: ev.end, x: tile.x, y: tile.y, travel: Math.round(width * 0.04), stepped: style === "tactile" });
    }
    const file = assetPath(l.job.id, "video_motion.mp4");
    await overlayVideo(source, overlays, file.abs, duration);
    l.p.motion = { style, rationale: out.rationale.slice(0, 2000), events, file: file.rel, status: "rendered" };
    l.p.context_used.motion = ctx.fields;
    l.p.skills_used = [...new Set([...l.p.skills_used, "ecommerce-motion-finishing"])];
    l.p.next = "done";
    note(l.p, "motion", `Motion finishing: ${events.length} overlay${events.length === 1 ? "" : "s"} (${out.events.length - events.length} rejected by the checks)${look.notes.length ? `. ${look.notes.join(" ")}` : ""}`);
    save(l.job.id, l.p, { status: "in_review", assets: prepAssets(l) });
}
export async function runStep(jobId: string): Promise<string> {
    const l = await load(jobId);
    const step = l.p.next;
    if (step === "done" || step.startsWith("approve:"))
        return step;
    save(jobId, l.p, { status: "running", error: null });
    try {
        if (step === "brief")
            await stepBrief(l);
        else if (step === "plan")
            await (isVideo(l.recipe) ? stepShotPlan(l) : stepImagePlan(l));
        else if (step === "render")
            await stepRender(l);
        else if (step === "character" || step === "look" || step === "storyboard")
            await stepPrep(l, step);
        else if (step === "clips")
            await stepClips(l);
        else if (step === "finish")
            await stepFinish(l);
        else if (step === "motion")
            await stepMotion(l);
        else
            throw new Error(`Unknown step ${step}`);
    }
    catch (e) {
        const fresh = db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get();
        db.update(schema.outputJobs).set({ status: fresh?.production?.plan_status === "none" ? "queued" : "in_review", error: (e as Error).message.slice(0, 500), updated_at: new Date().toISOString() }).where(eq(schema.outputJobs.id, jobId)).run();
        throw e;
    }
    return db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get()!.production!.next;
}
export async function approveStage(jobId: string, opts: {
    selected?: number;
    human?: boolean;
} = {}): Promise<string> {
    const l = await load(jobId);
    if (!l.p.next.startsWith("approve:"))
        throw new Error("Nothing is waiting for approval.");
    const stage = l.p.next.slice(8);
    const findings = productionFindings(l.p, l.script.audit, l.job.assets);
    if (findings.length && !opts.human)
        throw new Error(`Human review needed: ${findings[0].message}`);
    const override = opts.human ? humanCheckOverride(stage, findings) : undefined;
    if (stage === "script") {
        if (!l.script.lines.some((line) => line.text.trim()))
            throw new Error("Add the script's words before approving it.");
    }
    else if (stage === "plan") {
        const broken = planBlockers(l.p);
        if (broken.length)
            throw new Error(`The plan doesn't fit the clips yet: ${broken[0].message} Edit it or make it again.`);
        const contract = videoContractProblems(l);
        if (contract.length)
            throw new Error(contract[0]);
        l.p.plan_status = "approved";
    }
    else if (stage === "clips") {
        if (!l.p.clips.length || l.p.clips.some((c) => c.status !== "completed" || !c.file || !fs.existsSync(dataPath(c.file))))
            throw new Error("Every clip must finish before you approve the footage.");
    }
    else {
        const rec = l.p[stage as Prep];
        if (!rec)
            throw new Error(`No ${stage} to approve`);
        rec.status = "approved";
        if (opts.selected != null && opts.selected >= 0 && opts.selected < rec.panels.length)
            rec.selected = opts.selected;
    }
    l.p.next = following(`approve:${stage}`, l);
    if (stage === "look" && l.p.storyboard && hasStoryboard(l.p))
        l.p.next = "approve:storyboard";
    while ((l.p.next === "character" || l.p.next === "look") && l.p[l.p.next]?.status === "approved")
        l.p.next = following(`approve:${l.p.next}`, l);
    note(l.p, stage, `${humanize(stage)} approved`);
    if (override) {
        l.p.check_overrides = [...(l.p.check_overrides ?? []), override];
        note(l.p, stage, `Human override: ${override.findings.map((a) => a.message).join("; ")}`);
    }
    save(jobId, l.p, { status: "queued", error: null });
    return l.p.next;
}
export async function regenerateStage(jobId: string, stage: "plan" | Prep, feedback: string, opts: {
    keep?: boolean;
} = {}): Promise<void> {
    if (stage === "look" && opts.keep)
        return redoOpeningFrame(jobId, feedback);
    const l = await load(jobId);
    if (l.p.clips.some((c) => c.status !== "pending"))
        throw new Error("Video clips already exist for this job. Start a new job to change earlier stages.");
    delete l.p.prompts_ready;
    l.p.clips = [];
    const order: ("plan" | Prep)[] = ["plan", "character", "look", "storyboard"];
    for (const later of order.slice(order.indexOf(stage) + 1))
        if (later !== "plan")
            delete l.p[later];
    if (stage === "plan") {
        l.p.notes = [l.p.notes, feedback].filter(Boolean).join("\n").slice(0, 2000);
        l.p.plan_status = "none";
        for (const s of ["character", "look", "storyboard"] as const)
            delete l.p[s];
        l.p.next = "plan";
        save(jobId, l.p);
        await runStep(jobId);
    }
    else {
        save(jobId, l.p);
        await stepPrep(l, stage, feedback, !!opts.keep && stage !== "storyboard");
    }
}
export async function redoOpeningFrame(jobId: string, feedback: string): Promise<void> {
    const l = await load(jobId);
    if (!feedback.trim())
        throw new Error("Describe the smallest correction to the opening frame.");
    if (!l.p.look || !fs.existsSync(dataPath(l.p.look.file)))
        throw new Error("Draw the opening frame before editing it.");
    if (clipsStarted(l.p))
        throw new Error("Video clips already exist for this job. Start a new job to change earlier stages.");
    identityRefs(l, true);
    await stepPrep(l, "look", feedback, true);
    if (l.p.storyboard)
        l.p.storyboard.status = "draft";
    delete l.p.prompts_ready;
    l.p.clips = [];
    note(l.p, "look", "Opening edited with the approved identity and product references. The character sheet and all existing storyboard files were retained; inspect them and repair only affected frames.");
    save(jobId, l.p, { status: "in_review", assets: prepAssets(l) });
}
export async function regenerateCharacterViews(jobId: string, selected: number[], feedback: string): Promise<void> {
    const indices = characterViewIndices(selected);
    const l = await load(jobId);
    if (!characterViewsRepairable(l.p, l.recipe))
        throw new Error("View repair requires a six-panel reference sheet of one adult presenter.");
    if (l.p.plan_status !== "approved")
        throw new Error("Approve the shot plan first.");
    if (clipsStarted(l.p))
        throw new Error("Video clips already exist for this job. Start a new job to change earlier stages.");
    const before = l.p.character!;
    const sheet = dataPath(before.file);
    await characterSheetDimensions(sheet);
    if (before.panels.some((f) => !fs.existsSync(dataPath(f))))
        throw new Error("A character view is missing. Restore the sheet files before repairing views.");
    const plan = l.p.video_plan!;
    const avatar = castAvatar(l);
    const chosen = plan.cast_options?.[plan.cast_choice ?? 0]?.portrait;
    const portrait = avatarFile(avatar?.portrait) ?? (chosen && fs.existsSync(dataPath(chosen)) ? dataPath(chosen) : null);
    if (!portrait)
        throw new Error("Choose or draw the presenter's portrait before repairing views.");
    const portraitHash = createHash("sha256").update(fs.readFileSync(portrait)).digest("hex");
    const selectedSetting = avatarReferenceImageRefs(l.p).slice(1);
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    const name = `character_views_${uid()}`;
    const replacements: {
        index: number;
        file: string;
        panelOut: string;
    }[] = [];
    try {
        for (const index of indices) {
            const image = assetPath(jobId, `${name}_view${index + 1}.png`);
            const refs = [...(index === 2 || index === 4 ? [portrait] : [portrait, dataPath(before.panels[index])]), ...selectedSetting.map((r) => r.file)];
            await generateImage({ brandId: l.job.brand_id, jobId, purpose: `character view ${index + 1}: ${CHARACTER_VIEWS[index].label}`, prompt: [characterViewDirection(index), personLines(plan, l.recipe!), PHOTOREAL, selectedSetting.length ? `Image 1 fixes face identity only. Image ${refs.length} is the kept avatar setting: match its wardrobe only; do not copy its background, lighting, pose, crop, objects or words. The required view above fixes complete framing.` : "", feedback.trim() ? `Requested correction: ${feedback.trim().slice(0, 1200)}. Keep the required view and complete framing above.` : ""].filter(Boolean).join("\n\n"), refs, size: "1024x1024", quality: "high", use: "person_sheet", onOtherModel: (said) => note(l.p, "character", `View ${index + 1} made on another image model. ${said}`), out: image.abs });
            replacements.push({ index, file: image.abs, panelOut: assetPath(jobId, `${name}_p${index + 1}.png`).abs });
        }
        const current = db.select({ production: schema.outputJobs.production }).from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get()?.production;
        if (current?.character?.file !== before.file || JSON.stringify(current.video_plan) !== JSON.stringify(plan))
            throw new Error("The cast or sheet changed while these views were drawn. Their files and costs are retained; inspect them before retrying.");
        const currentAvatar = castAvatar({ ...l, p: current });
        const currentChosen = current.video_plan?.cast_options?.[current.video_plan.cast_choice ?? 0]?.portrait;
        const currentPortrait = avatarFile(currentAvatar?.portrait) ?? (currentChosen && fs.existsSync(dataPath(currentChosen)) ? dataPath(currentChosen) : null);
        if (!currentPortrait || path.resolve(currentPortrait) !== path.resolve(portrait) || createHash("sha256").update(fs.readFileSync(currentPortrait)).digest("hex") !== portraitHash)
            throw new Error("The chosen portrait changed while these views were drawn. Their files and costs are retained; inspect them before retrying.");
        const out = assetPath(jobId, `${name}.png`);
        await replaceCharacterViewPixels(sheet, replacements, out.abs);
        const panels = [...before.panels];
        for (const r of replacements)
            panels[r.index] = path.relative(env.DATA_DIR, r.panelOut).split(path.sep).join("/");
        const record: PrepStage = { ...before, file: out.rel, panels, status: "draft", feedback: `Repaired views ${indices.map((i) => i + 1).join(", ")}: ${feedback.trim().slice(0, 1200)}` };
        l.p.character = record;
        delete l.p.look;
        delete l.p.storyboard;
        delete l.p.prompts_ready;
        l.p.clips = [];
        l.p.next = "approve:character";
        if (avatar)
            keepSheet(l, avatar, record);
        l.p.context_used.character = [...new Set([...(l.p.context_used.character ?? []), "selected_portrait", "selected_view_contract"])];
        note(l.p, "character", `Repaired views ${indices.map((i) => i + 1).join(", ")} (${indices.length} individual images); other panel files and pixels kept. Opening frame and storyboard must be made again.`);
        save(jobId, l.p, { status: "in_review", assets: prepAssets(l) });
    }
    catch (e) {
        const current = db.select({ production: schema.outputJobs.production }).from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get()?.production;
        if (current) {
            note(current, "character", `View repair did not replace the sheet: ${(e as Error).message}. ${replacements.length} completed view file(s) retained: ${replacements.map((r) => path.relative(env.DATA_DIR, r.file).split(path.sep).join("/")).join(", ") || "none"}.`);
            save(jobId, current);
        }
        throw e;
    }
}
export async function saveImageFeedCopy(jobId: string, copy: unknown, updatedAt: string): Promise<void> {
    const l = await load(jobId);
    if (!l.p.image_plan || l.p.next !== "done" || !l.job.assets.some((a) => a.kind === "image"))
        throw new Error("Feed copy can be edited after the image is finished.");
    if (["sent", "discarded"].includes(l.job.status))
        throw new Error("Move this job back to review before editing its feed copy.");
    if (l.job.updated_at !== updatedAt)
        throw new Error("This job changed. Reopen it before editing its feed copy.");
    const plan = { ...l.p.image_plan, ad_copy: ImagePlanOut.shape.ad_copy.parse(copy) };
    const approval = l.p.plan_status;
    const judged = l.p.audit.filter((a) => JUDGED.includes(a.check) && (l.claims || a.check !== "claims_judge"));
    setImagePlan(l, plan);
    l.p.plan_status = approval;
    l.p.audit.push(...judged.map((a) => ({ ...a, status: "warn" as const, message: `${a.message} (Read before the feed copy edit: review the new wording.)` })));
    note(l.p, "copy", "Feed copy edited. Rendered artwork kept; sending approval needs review again.");
    const changed = db.update(schema.outputJobs).set({ production: l.p, status: "in_review", updated_at: new Date().toISOString() }).where(and(eq(schema.outputJobs.id, jobId), eq(schema.outputJobs.updated_at, updatedAt))).run();
    if (!changed.changes)
        throw new Error("This job changed. Reopen it before editing its feed copy.");
}
export async function savePlan(jobId: string, plan: {
    image?: ImagePlan;
    video?: VideoPlan;
}): Promise<void> {
    const l = await load(jobId);
    if (l.p.next !== "approve:plan")
        throw new Error("The plan can only be edited while it is waiting for approval.");
    if (plan.image) {
        const judged = l.p.audit.filter((a) => JUDGED.includes(a.check) && (l.claims || a.check !== "claims_judge"));
        const before = l.p.image_plan ? planWords(l.p.image_plan) : "";
        setImagePlan(l, ImagePlanOut.parse(plan.image) as ImagePlan);
        const stale = !!judged.length && before !== planWords(l.p.image_plan!);
        l.p.audit = [...l.p.audit, ...judged.map((a) => (stale && (a.status === "fail" || a.check === "words_read") ? { ...a, status: "warn" as const, message: `${a.message} (Read before your edit: check it is fixed.)` } : a))];
    }
    if (plan.video) {
        const judged = l.p.audit.filter((a) => JUDGED.includes(a.check) && (l.claims || a.check !== "claims_judge"));
        const before = l.p.video_plan ? JSON.stringify(videoPlanSlots(l.p.video_plan).map((s) => s.get())) : "";
        const was = l.p.video_plan?.segments ?? [];
        const v: VideoPlan = {
            ...plan.video,
            segments: plan.video.segments.map((s, i) => {
                const { seconds: _sent, ...rest } = s;
                return was[i]?.seconds == null ? rest : { ...rest, seconds: was[i].seconds };
            }),
        };
        if (l.p.avatar_reference && (!castIsAvatar(v, l.p.avatar_reference.avatar) || v.cast.guest || v.cast_options?.length !== 1 || (v.cast_choice ?? 0) !== 0 || !castIsAvatar({ cast: { ...v.cast, ...v.cast_options[0] } }, l.p.avatar_reference.avatar) || v.cast_options[0].portrait !== l.p.video_plan?.cast_options?.[0]?.portrait || v.cast.setting !== l.p.video_plan?.cast.setting || v.visual_direction !== l.p.video_plan?.visual_direction || v.places?.length || v.segments.some((s) => s.scenes.some((x) => x.place?.trim()))))
            throw new Error("This job uses its selected avatar setting. Keep that cast, wardrobe, location and light, or start a new job with another reference.");
        const at = v.cast_choice ?? 0;
        const options = v.cast_options?.map((o, i) => {
            if (i !== at)
                return o;
            const edited = { ...o, ...(v.cast.presenter ? { presenter: v.cast.presenter } : {}), ...(!v.cast.presenter && v.cast.character ? { character: v.cast.character } : {}) };
            if (edited.portrait && castLine(edited) !== castLine(o))
                delete edited.portrait;
            return edited;
        });
        setVideoPlan(l, options ? { ...v, cast_options: options } : v);
        const stale = before !== JSON.stringify(videoPlanSlots(l.p.video_plan!).map((s) => s.get()));
        l.p.audit.push(...judged.map((a) => stale ? { ...a, status: "warn" as const, message: `${a.message} (Read before your edit: check the words again.)` } : a));
    }
    save(jobId, l.p);
}
export async function chooseCast(jobId: string, index: number): Promise<void> {
    const l = await load(jobId);
    const plan = l.p.video_plan;
    if (!plan?.cast_options?.[index])
        throw new Error("That cast option doesn't exist on this plan.");
    if (l.p.look || l.p.storyboard || l.p.clips.some((c) => c.status !== "pending"))
        throw new Error("The opening frame is already made with this cast. Start a new job to cast it differently.");
    if ((plan.cast_choice ?? 0) === index)
        return;
    const status = l.p.plan_status;
    const judged = l.p.audit.filter((a) => JUDGED.includes(a.check) && (l.claims || a.check !== "claims_judge"));
    setVideoPlan(l, withCast(plan, index));
    l.p.plan_status = status;
    l.p.audit = [...l.p.audit, ...judged];
    if (l.p.character) {
        delete l.p.character;
        l.p.next = "character";
    }
    note(l.p, "plan", `Cast: ${plan.cast_options[index].label}`);
    save(jobId, l.p, { assets: prepAssets(l), ...(l.p.next === "character" ? { status: "queued" as const } : {}) });
}
const clipsStarted = (p: ProductionState) => p.clips.some((c) => c.status !== "pending");
export async function storyboardPreview(jobId: string): Promise<{
    perClip: number;
    images: number;
    frames: (Omit<StoryboardFrame, "file"> & {
        file?: string;
    })[];
    usdEach: number;
    measured: boolean;
}> {
    const l = await load(jobId);
    const past = db.select({ c: schema.mediaCalls.cost_usd, purpose: schema.mediaCalls.purpose, status: schema.mediaCalls.status }).from(schema.mediaCalls).where(eq(schema.mediaCalls.brand_id, l.job.brand_id)).all().filter((x) => x.status === "ok" && x.purpose.startsWith("storyboard") && x.c > 0);
    const cost = { usdEach: past.length ? past.reduce((n, x) => n + x.c, 0) / past.length : 0.04, measured: past.length > 0 };
    if (!l.p.video_plan || !l.recipe)
        return { perClip: framesPerClip(l.p), images: 0, frames: [], ...cost };
    return { perClip: framesPerClip(l.p), images: storyboardImages(l.p), frames: l.p.storyboard?.frames ?? storyboardDraft(l), ...cost };
}
export async function setJobTaste(jobId: string, taste: Taste): Promise<void> {
    const l = await load(jobId);
    const next = compactTaste(taste);
    const people = next.people ?? l.script.axes.taste?.people;
    if (l.p.avatar_reference && people && people !== "photo")
        throw new Error("This job uses a photographic avatar setting. Keep People pictures at Photo-real or start another job without this reference.");
    if (Object.keys(next).length)
        l.p.taste = next;
    else
        delete l.p.taste;
    if (next.product)
        l.p.product_in_picture = productToLegacy(next.product);
    note(l.p, "plan", "The choices for this job were changed. They are used by what is made from now on.");
    save(jobId, l.p);
}
export async function setCaptions(jobId: string, on: boolean): Promise<void> {
    const l = await load(jobId);
    const brief = l.p.recipe === "brief";
    if (!brief && !isVideo(l.recipe))
        throw new Error("Only a video or a human brief has captions.");
    if (!brief && (l.p.joined || ["motion", "done"].includes(l.p.next)))
        throw new Error("The clips are already joined. Start a new job to change the captions.");
    if (on)
        l.p.burn_captions = true;
    else
        delete l.p.burn_captions;
    note(l.p, brief ? "brief" : "finish", on ? "Captions switched on" : "Captions switched off");
    save(jobId, l.p);
    if (brief && l.p.brief_markdown)
        await stepBrief(l);
}
export async function setVideoAudio(jobId: string, audio: VideoAudio): Promise<void> {
    const l = await load(jobId);
    if (!isVideo(l.recipe))
        throw new Error("Audio settings apply to video jobs only.");
    if (l.p.clips.some((c) => c.status !== "pending") || l.p.joined || ["finish", "motion", "done"].includes(l.p.next))
        throw new Error("Clips have already started. Start a new job to change their sound or music.");
    l.p.video_audio = videoAudioSchema.parse(audio);
    l.p.clips = [];
    delete l.p.prompts_ready;
    note(l.p, "clips", "Video audio settings changed. Clip prompts will use these choices.");
    save(jobId, l.p);
}
export async function setProduct(jobId: string, productId: string): Promise<void> {
    const l = await load(jobId);
    if (!isVideo(l.recipe))
        throw new Error("The product can be changed here on a video only.");
    const product = l.brand.products.find((x) => x.id === productId);
    if (!product)
        throw new Error("That product is not one of this brand's.");
    if (l.p.storyboard || clipsStarted(l.p) || ["clips", "finish", "motion", "done"].includes(l.p.next))
        throw new Error("The storyboard is already drawn with this product. Start a new job to change the product.");
    if (l.p.product_id === product.id)
        return;
    l.p.product_id = product.id;
    const hadPlan = l.p.plan_status !== "none";
    delete l.p.look;
    delete l.p.prompts_ready;
    l.p.clips = [];
    if (hadPlan) {
        l.p.plan_status = "none";
        l.p.audit = [];
        l.p.next = "plan";
    }
    else if (l.p.next === "look" || l.p.next === "approve:look")
        l.p.next = "look";
    note(l.p, "plan", `Product changed to ${product.name}${hadPlan ? ". The plan is written again for it" : ""}`);
    save(jobId, l.p, { status: "queued", error: null, assets: prepAssets(l) });
}
export async function setStoryboardFrames(jobId: string, perClip: number): Promise<void> {
    const l = await load(jobId);
    if (!Number.isFinite(Number(perClip)) || Number(perClip) < STORYBOARD_FRAMES.min || Number(perClip) > STORYBOARD_FRAMES.max)
        throw new Error(`A clip's storyboard has ${STORYBOARD_FRAMES.min} to ${STORYBOARD_FRAMES.max} frames.`);
    if (!isVideo(l.recipe))
        throw new Error("Only a video has a storyboard.");
    if (l.p.storyboard || clipsStarted(l.p) || ["clips", "finish", "motion", "done"].includes(l.p.next))
        throw new Error("The storyboard is already drawn. Make it again with notes, or start a new job, to change the number of frames.");
    l.p.storyboard_frames = clampFrames(perClip);
    note(l.p, "storyboard", `Storyboard: ${l.p.storyboard_frames} frame${l.p.storyboard_frames === 1 ? "" : "s"} a clip`);
    save(jobId, l.p);
}
export async function setFrameWords(jobId: string, index: number, description: string): Promise<void> {
    const l = await load(jobId);
    const plan = l.p.video_plan;
    if (!plan)
        throw new Error("This job has no shot plan yet.");
    if (clipsStarted(l.p))
        throw new Error("Video clips already exist for this job. Start a new job to change the storyboard.");
    delete l.p.prompts_ready;
    const text = description.trim().replace(/\s+/g, " ");
    if (text.length < 8)
        throw new Error("Say what the frame shows: the pose, what each hand holds, where each object is.");
    if (text.length > 260)
        throw new Error(`A frame's words are ${text.length} characters; keep them under 260.`);
    const all = storyboardWords(plan, framesPerClip(l.p));
    if (!all[index])
        throw new Error("That frame doesn't exist on this storyboard.");
    l.p.video_plan = withFrameWords(plan, framesPerClip(l.p), index, text);
    const sb = l.p.storyboard;
    const drawn = sb?.frames?.[index];
    let reopened = false;
    if (sb && drawn) {
        Object.assign(drawn, { description: text, stale: true });
        if (sb.status === "approved") {
            sb.status = "draft";
            l.p.next = "approve:storyboard";
            reopened = true;
        }
    }
    save(jobId, l.p, reopened ? { status: "in_review" } : {});
}
export async function redoFrame(jobId: string, index: number, feedback = "", opts: {
    keep?: boolean;
} = {}): Promise<void> {
    const l = await load(jobId);
    const sb = l.p.storyboard;
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    if (!sb?.frames?.[index])
        throw new Error("Draw the storyboard first: this frame doesn't exist yet.");
    if (clipsStarted(l.p))
        throw new Error("Video clips already exist for this job. Start a new job to change the storyboard.");
    await drawFrame(l, sb.frames, index, uid(), feedback ? `\n\nRequested change to the last version: ${feedback.slice(0, 1200)}` : "", opts.keep && feedback ? feedback.slice(0, 1200) : "");
    sb.panels = sb.frames.map((f) => f.file);
    sb.file = sb.frames[0].file;
    sb.status = "draft";
    delete l.p.prompts_ready;
    l.p.clips = [];
    l.p.next = "approve:storyboard";
    note(l.p, "storyboard", opts.keep && feedback ? `Storyboard frame ${index + 1} changed: the same picture with your change` : `Storyboard frame ${index + 1} drawn again${feedback ? " with your notes" : ""}`);
    save(jobId, l.p, { status: "in_review", assets: prepAssets(l) });
}
export const MAX_CAST_OPTIONS = 9;
export function castPortraitPrompt(recipe: FormatRecipe, plan: VideoPlan, preset = "default"): string {
    if (recipeUsesCharacterOnly(recipe) || !plan.cast.presenter)
        return `ONE square picture of 1 original character, to choose the character of a video from. Full figure, front on, centred, against a plain neutral background in soft even light. No text, no caption, no product, nothing else in the picture.\n\nCharacter: ${dot(plan.cast.character ?? "")}\n\n${styleLine(recipe, preset, plan)} Not a photoreal human.`;
    const { guest: _guest, ...solo } = plan.cast;
    return `ONE square portrait of 1 fictional adult, to choose the presenter of a video from. Head and shoulders, front on, centred, eyes into the camera, a relaxed neutral face with the mouth closed. Plain warm off-white wall behind, soft even window daylight from the left. Clear eyes and readable facial structure without close wide-angle distortion; catchlights follow that window. Local skin detail stays proportionate to this crop, without etched pores, sharpening halos or unrequested scars/freckles. Exactly 1 person. No text, no caption, no product.\n\n${personLines({ ...plan, cast: solo })}\n\n${PHOTOREAL}`;
}
export function castPortraitCost(brandId: string): {
    usdEach: number;
    measured: boolean;
} {
    const past = db.select({ c: schema.mediaCalls.cost_usd, purpose: schema.mediaCalls.purpose, status: schema.mediaCalls.status }).from(schema.mediaCalls).where(eq(schema.mediaCalls.brand_id, brandId)).all().filter((x) => x.status === "ok" && x.purpose.startsWith("cast portrait") && x.c > 0);
    return { usdEach: past.length ? past.reduce((n, x) => n + x.c, 0) / past.length : 0.04, measured: past.length > 0 };
}
const castSettled = (p: ProductionState) => !!p.look || !!p.storyboard || clipsStarted(p);
export async function drawCastPortraits(jobId: string): Promise<number> {
    const l = await load(jobId);
    if (l.p.avatar_id)
        return 0;
    const plan = l.p.video_plan;
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    if (!plan?.cast_options?.length || !l.recipe)
        throw new Error("This job has no cast options yet. Write the plan first.");
    if (castSettled(l.p))
        throw new Error("The opening frame is already made with this cast. Start a new job to cast it differently.");
    const todo = plan.cast_options.map((o, i) => ({ o, i })).filter(({ o }) => !o.portrait || !fs.existsSync(dataPath(o.portrait)));
    if (!todo.length)
        return 0;
    const stamp = uid();
    const cast = planOf(l, "cast");
    const castNotes = cast.attach.productPhotos === "none" ? cast.notes : [];
    const done = await Promise.allSettled(todo.map(async ({ o, i }) => {
        const out = assetPath(l.job.id, `cast_${stamp}_${i + 1}.png`);
        await generateImage({ brandId: l.job.brand_id, jobId: l.job.id, purpose: `cast portrait ${i + 1}`, prompt: [castPortraitPrompt(l.recipe!, withCast(plan, i), l.p.preset), ...castNotes].join("\n"), refs: [], size: "1024x1024", ...(recipeUsesCharacterOnly(l.recipe!) || !o.presenter ? {} : { use: "avatar" as const }), out: out.abs });
        return { line: castLine(o), file: path.relative(env.DATA_DIR, out.abs).split(path.sep).join("/") };
    }));
    const drawn = done.filter((d): d is PromiseFulfilledResult<{
        line: string;
        file: string;
    }> => d.status === "fulfilled").map((d) => d.value);
    if (!drawn.length)
        throw (done[0] as PromiseRejectedResult).reason;
    const now = await load(jobId);
    const options = now.p.video_plan?.cast_options;
    if (!options)
        return 0;
    for (const d of drawn) {
        const at = options.findIndex((o) => castLine(o) === d.line);
        if (at >= 0)
            options[at] = { ...options[at], portrait: d.file };
    }
    note(now.p, "plan", `Cast: ${drawn.length} portrait${drawn.length === 1 ? "" : "s"} drawn${drawn.length < todo.length ? `, ${todo.length - drawn.length} failed` : ""}`);
    save(jobId, now.p);
    return drawn.length;
}
const MoreCastOut = z.object({ cast_options: z.array(z.object({ label: z.string().default(""), why: z.string().default(""), presenter: PersonOut.nullable().default(null), character: z.string().nullable().default(null) })).max(6).default([]) });
export async function moreCastOptions(jobId: string): Promise<number> {
    const l = await load(jobId);
    if (l.p.avatar_id)
        throw new Error("This video uses a saved avatar, so there is nobody else to choose from. To try other people, start a new video with a new character.");
    const plan = l.p.video_plan;
    if (!mediaLive())
        throw new Error("Video production needs live mode (LLM_MODE=live).");
    if (!plan?.cast_options?.length || !l.recipe)
        throw new Error("This job has no cast options yet. Write the plan first.");
    if (castSettled(l.p))
        throw new Error("The opening frame is already made with this cast. Start a new job to cast it differently.");
    if (plan.cast_options.length >= MAX_CAST_OPTIONS)
        throw new Error(`This plan already has ${plan.cast_options.length} options. Pick one, or edit the person in the plan.`);
    const human = !!plan.cast.presenter;
    const ctx = contextFor("shot_plan", { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id, cited: [] });
    const system = [
        `You cast an ad video for ${l.brand.brand.name}. The video is planned: its place, its voice and every spoken line are fixed and are given below. You write exactly 3 more ${human ? "people" : "characters"} who could be on screen in it, for the person making the ad to choose from.`,
        `Each has a \`label\` (2 to 4 words that tell it apart, "The night-shift nurse"), a \`why\` (1 sentence: why the buyer in the brand context would stop for and believe this one), and ${human ? "a `presenter` with gender, age, skin_tone, eyes, hair, wardrobe and `features` (2 or 3 small visible things that make this person 1 particular person: marks on the skin, facial hair, glasses or jewellery, how the hair sits); `character` is null" : "a `character` sentence (what it is, its shape, colours and 2 or 3 fixed features); `presenter` is null"}.`,
        `Each is plainly different from every option already offered and from the other 2: change at least 3 of age band, gender where the lines allow it, skin tone, hair, build of the wardrobe and the small features. Each could honestly say these lines in this place. Every option is an adult, fictional, and never a real or famous person. No children.`,
        `Brand context:\n${JSON.stringify(ctx.data)}`,
    ].join("\n\n");
    const user = [
        `Format: ${l.recipe.label}. Place: ${plan.cast.setting} Voice: ${plan.cast.voice_direction}`,
        `Spoken lines:\n${plan.segments.flatMap((s) => s.scenes.map((x) => x.dialogue.trim())).filter(Boolean).map((d) => `- ${d}`).join("\n") || "(none: nothing is said aloud)"}`,
        `Already offered:\n${plan.cast_options.map((o, i) => `${i + 1}. ${o.label}: ${castLine(o)}`).join("\n")}`,
        `Return 1 JSON object with \`cast_options\`: the 3 new ones.`,
    ].join("\n\n");
    const out = await structuredJson({ brandId: l.job.brand_id, task: "shot_plan", model: l.p.plan_model ?? env.MODEL_PLAN, system, user, schema: MoreCastOut, effort: "low", maxTokens: 2000, refType: "job", refId: l.job.id });
    const key = (o: CastOption) => castLine(o).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const now = await load(jobId);
    const options = now.p.video_plan?.cast_options;
    if (!options)
        return 0;
    let added = 0;
    for (const o of out.cast_options) {
        const fit: CastOption = human ? { label: o.label.trim() || `Option ${options.length + 1}`, ...(o.presenter ? { presenter: o.presenter } : {}), ...(o.why ? { why: o.why } : {}) } : { label: o.label.trim() || `Option ${options.length + 1}`, ...(o.character ? { character: o.character } : {}), ...(o.why ? { why: o.why } : {}) };
        if (!key(fit) || options.some((x) => key(x) === key(fit)) || options.length >= MAX_CAST_OPTIONS)
            continue;
        options.push(fit);
        added++;
    }
    if (!added)
        throw new Error("No new option came back. Try again.");
    note(now.p, "plan", `Cast: ${added} more option${added === 1 ? "" : "s"} written`);
    save(jobId, now.p);
    return added;
}
export async function attachPartPhoto(jobId: string, name: string, file: {
    name: string;
    bytes: Buffer;
}): Promise<{
    lookIsOlder: boolean;
}> {
    const l = await load(jobId);
    const part = l.p.video_plan?.product_parts?.find((x) => x.name === name);
    if (!part)
        throw new Error("The plan does not use that object.");
    if (!l.p.product_id)
        throw new Error("This job is not about 1 product, so there is nowhere to keep the photo. Choose its product first.");
    if (l.p.storyboard || clipsStarted(l.p) || ["clips", "finish", "motion", "done"].includes(l.p.next))
        throw new Error("The storyboard is already drawn. The photo is used from the next job on: add it on the Brand brain screen.");
    part.photo = await addPartPhoto(l.job.brand_id, l.p.product_id, name, file);
    note(l.p, "plan", `Photo added for ${name}`);
    save(jobId, l.p);
    return { lookIsOlder: !!l.p.look };
}
const clipQuality = (info: {
    width: number;
    height: number;
}) => {
    const side = Math.min(info.width, info.height);
    return side >= 1000 ? "1080p" : side >= 700 ? "720p" : "480p";
};
export async function attachClip(jobId: string, index: number, file: {
    name: string;
    bytes: Buffer;
}): Promise<{
    missing: number;
}> {
    const l = await load(jobId);
    const plan = l.p.video_plan;
    if (!plan || !l.p.clips.length)
        throw new Error("This video has no clip prompts yet. Run it as far as the prompts first.");
    const clip = l.p.clips[index];
    if (!clip)
        throw new Error("That clip is not part of this video.");
    if (clip.status === "submitting" || clip.status === "submitted")
        throw new Error("The app is making this clip. Wait for it to finish first.");
    if (l.p.joined)
        throw new Error("This video's clips are already joined. Start a new video to use other clips.");
    const ext = path.extname(file.name).toLowerCase();
    if (![".mp4", ".mov", ".webm"].includes(ext))
        throw new Error("Use an MP4, MOV or WebM video.");
    if (!file.bytes.length || file.bytes.length > 300 * 1024 * 1024)
        throw new Error("That video is over 300 MB. Use a smaller one.");
    const kept = assetPath(l.job.id, `clip_${index + 1}_upload_${uid()}${ext}`);
    fs.writeFileSync(kept.abs, file.bytes);
    let info: Awaited<ReturnType<typeof mediaInfo>>;
    try {
        info = await mediaInfo(kept.abs);
    }
    catch {
        info = { duration: 0, width: 0, height: 0, hasAudio: false };
    }
    if (!info.width || !info.duration) {
        fs.rmSync(kept.abs, { force: true });
        throw new Error("That file could not be read as a video. Use an MP4, MOV or WebM video.");
    }
    const old = clip.uploaded && clip.uploaded !== kept.rel ? dataPath(clip.uploaded) : null;
    Object.assign(clip, { uploaded: kept.rel });
    const mine = l.p.clips.filter((c) => c.uploaded && fs.existsSync(dataPath(c.uploaded)));
    const order = ["480p", "720p", "1080p"];
    const qualities = await Promise.all(mine.map(async (c) => (c === clip ? clipQuality(info) : clipQuality(await mediaInfo(dataPath(c.uploaded!))))));
    const quality = order[Math.min(...qualities.map((q) => order.indexOf(q)))];
    const again = quality !== l.p.resolution ? mine : [clip];
    l.p.resolution = quality;
    const size = videoSize(l.p.aspect, l.p.resolution);
    for (const c of again) {
        const out = assetPath(l.job.id, `clip_${c.index + 1}.mp4`);
        await normalizeClip(dataPath(c.uploaded!), out.abs, size, segmentSeconds(plan.segments[c.index]), { mute: l.p.video_audio?.enabled === false });
        Object.assign(c, { status: "completed", file: out.rel, error: undefined });
    }
    if (old)
        fs.rmSync(old, { force: true });
    const planned = segmentSeconds(plan.segments[index]);
    const off = Math.abs(info.duration - planned) > 0.75;
    note(l.p, "clips", `Clip ${index + 1} of ${l.p.clips.length} added from a file${off ? `. It runs ${info.duration.toFixed(1)} seconds and the plan gives this clip ${planned}, so it was ${info.duration > planned ? "cut at" : "held on its last frame to"} ${planned}` : ""}`);
    const missing = l.p.clips.filter((c) => c.status !== "completed").length;
    if (!missing) {
        delete l.p.prompts_ready;
        l.p.next = "finish";
        note(l.p, "clips", "Every clip is in. Next: the clips are joined into 1 video");
    }
    save(l.job.id, l.p, { status: "in_review", error: null });
    return { missing };
}
export function castSheetPrompts(p: Pick<ProductionState, "recipe" | "preset" | "video_plan">): string[] {
    const recipe = FORMAT_RECIPES.find((r) => r.id === p.recipe);
    const plan = p.video_plan;
    if (!recipe || !plan?.cast_options?.length)
        return [];
    return plan.cast_options.map((_, i) => characterPrompt(recipe, withCast(plan, i), p.preset));
}
export async function saveCharacterAsAvatar(jobId: string, name: string): Promise<Avatar> {
    const job = db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).get();
    const p = job?.production;
    const plan = p?.video_plan;
    const recipe = FORMAT_RECIPES.find((r) => r.id === p?.recipe);
    if (!job || !p || !plan || !recipe)
        throw new Error("This job has no character to save.");
    if (p.avatar_id)
        throw new Error("This video already uses a saved avatar. Edit it on the persona sheet.");
    const kind = avatarKindFor(recipe);
    if (!kind)
        throw new Error("This video has no single person or character on screen, so it can't be saved as 1 avatar.");
    if (!p.character || !fs.existsSync(dataPath(p.character.file)) || p.character.panels.some((x) => !fs.existsSync(dataPath(x))))
        throw new Error("Draw the character sheet first: an avatar is saved with its pictures.");
    const already = listAvatars(job.brand_id).find((a) => a.from_job === job.id && a.source === "video");
    if (already)
        throw new Error(`This character is already saved as ${already.name}. Edit it on the persona sheet.`);
    const chosen = plan.cast_options?.[plan.cast_choice ?? 0];
    const called = name.trim() || (chosen?.label ?? "").trim();
    if (called.length < 2)
        throw new Error("Give the avatar a name first.");
    const script = db.select({ concept_id: schema.scripts.concept_id }).from(schema.scripts).where(eq(schema.scripts.id, job.script_id)).get();
    const concept = script ? db.select({ persona_id: schema.concepts.persona_id }).from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get() : undefined;
    const personaId = concept?.persona_id && getPersona(job.brand_id, concept.persona_id) ? concept.persona_id : null;
    const a = saveAvatar(job.brand_id, {
        name: called,
        persona_id: personaId,
        kind,
        style: kind === "character" ? recipe.id : null,
        ...(kind === "person" ? { presenter: plan.cast.presenter ?? {} } : { character: plan.cast.character ?? "" }),
        voice: { direction: (plan.cast.voice_direction ?? "").slice(0, 600) },
        source: "video",
        from_job: job.id,
    });
    try {
        const face = chosen?.portrait && fs.existsSync(dataPath(chosen.portrait)) ? chosen.portrait : p.character.panels[0];
        const dir = avatarDir(job.brand_id, a.id);
        const portrait = `portrait-${uid()}.png`;
        fs.copyFileSync(dataPath(face), path.join(dir.abs, portrait));
        const saved = saveAvatar(job.brand_id, { id: a.id, name: a.name, portrait: `${dir.rel}/${portrait}`, ...sheetToAvatar(job.brand_id, a.id, job.id, p.character) });
        note(p, "character", `Character saved as the avatar ${saved.name}`);
        save(job.id, p);
        return saved;
    }
    catch (e) {
        deleteAvatar(job.brand_id, a.id);
        throw e;
    }
}
export async function checkJobClaims(jobId: string): Promise<void> {
    const first = await load(jobId);
    if (first.p.next === "approve:script") {
        const { reauditScript } = await import("@/lib/scripts/engine");
        await reauditScript(first.script.id, { claimChecks: true });
        first.p.claim_checks = true;
        note(first.p, "script", "Claim checks enabled and run on the script. Human approval is still required.");
        save(jobId, first.p);
        return;
    }
    if (first.p.next !== "approve:plan")
        throw new Error("The claims are checked while the plan waits for approval.");
    save(jobId, { ...first.p, claim_checks: true });
    const l = await load(jobId);
    if (l.p.image_plan) {
        const plan = JSON.parse(JSON.stringify(l.p.image_plan)) as ImagePlan;
        const read = mediaLive() ? await claimsPass(l, imagePlanSlots(plan, !!l.script.axes.native), IMAGE_WORDS) : { items: [], changed: 0 };
        const review = l.p.audit.filter((a) => a.check === "ad_review");
        setImagePlan(l, read.changed ? await imagePrompts(l, plan, l.p.plan_model ?? env.MODEL_PLAN) : plan);
        l.p.audit = [...l.p.audit, ...read.items, ...review];
    }
    else if (l.p.video_plan) {
        const plan = JSON.parse(JSON.stringify(l.p.video_plan)) as VideoPlan;
        const read = mediaLive() ? await claimsPass(l, videoPlanSlots(plan), VIDEO_WORDS, { accept: () => !videoPlanProblems(plan, l.p.segments, planLengths(plan, clipSeconds(l.p)), l.p.reference_mode, 0, false, l.p.recipe).length && !requestedDurationProblems(plan, l.p.target_seconds).length && !(l.p.target_seconds !== undefined && approvedSpeechProblems(plan, l.script.lines).length) && !(l.p.caption_lengths && placementCaptionProblems(plan.ad_copy?.primary_text).length) }) : { items: [], changed: 0 };
        const words = mediaLive() ? await readVideoPlan(l, plan, { report: true }) : [];
        setVideoPlan(l, plan);
        l.p.audit = [...l.p.audit, ...read.items, ...words];
    }
    else
        throw new Error("This job has no plan to check.");
    note(l.p, "plan", "Claim checks turned on for this job");
    save(jobId, l.p);
}
export function settleJobClaims(): string[] {
    const changed: string[] = [];
    for (const job of db.select().from(schema.outputJobs).all()) {
        const p = job.production;
        if (!p || p.recipe === "brief" || p.claim_checks !== undefined)
            continue;
        const script = db.select({ axes: schema.scripts.axes }).from(schema.scripts).where(eq(schema.scripts.id, job.script_id)).get();
        const claims = script?.axes.claim_checks ?? claimsHeld(job.brand_id);
        const had = p.audit.some((a) => isClaimCheck(a.check));
        save(job.id, { ...p, claim_checks: claims, audit: claims || !had ? p.audit : shown({ claims }, p.audit) });
        changed.push(job.id);
    }
    return changed;
}
export async function skipMotion(jobId: string): Promise<void> {
    const l = await load(jobId);
    if (l.p.next !== "motion")
        throw new Error("Motion finishing isn't the next step.");
    l.p.motion = { style: "", rationale: "Skipped", events: [], status: "skipped" };
    l.p.next = "done";
    save(jobId, l.p, { status: "in_review", assets: prepAssets(l) });
}
export function estimate(p: ProductionState): {
    images: number;
    videoUsd: number;
    clips: number;
    seconds: number;
} {
    const recipe = FORMAT_RECIPES.find((r) => r.id === p.recipe) ?? null;
    if (!recipe)
        return { images: 0, videoUsd: 0, clips: 0, seconds: 0 };
    if (!isVideo(recipe))
        return { images: p.cards, videoUsd: 0, clips: 0, seconds: 0 };
    const later = clipModel().chain === "reference_video";
    const lengths = jobLengths(p);
    return { images: (recipe.character ? 1 : 0) + 1 + storyboardImages(p), videoUsd: Math.round(lengths.reduce((n, s, i) => n + videoCost(s, i > 0 && later, p.resolution), 0) * 100) / 100, clips: lengths.length, seconds: lengths.reduce((n, s) => n + s, 0) };
}
export { ffmpeg, SEGMENT_SECONDS, clipPrompt, clipSeconds, maxWords, planBlockers, videoPlanProblems };
