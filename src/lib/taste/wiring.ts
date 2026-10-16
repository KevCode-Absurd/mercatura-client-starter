import type { Surface } from "./types";
export interface WiringPoint {
    area: string;
    file: string;
    line: string;
    fn: string;
    surface: Surface | "all";
    replaces: string;
}
export const WIRING: WiringPoint[] = [
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "196-248", fn: "createRun", surface: "all", replaces: "Stores variety, fidelity, product_in_picture, text_on_image in the set's context. Store `taste` beside them (context is JSON, no migration)." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "157-177", fn: "wordsOn, feedCopyOn, placeOf, fidelityFor, varietyFor, productPlanRule", surface: "image_ad", replaces: "6 small helpers that each read 1 old field. Replace with 1 decide() per item, kept on the loaded plan. plan.text.pictureWords replaces wordsOn; plan.attach.productPhotos replaces placeOf." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "339", fn: "kindSkill", surface: "all", replaces: "Skill by kind. Keep, and append the files of plan.skillPath." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "441-492", fn: "refBrief", surface: "image_ad", replaces: "passesReference, the loose function line, referencePlanRule. Use plan.text.referenceDescription (none, function, detailed)." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "619-663", fn: "renderRefs", surface: "image_ad", replaces: "sendsReferenceImage, lookRefCount, sendsProductPhoto, productPhotoRole, and when the logo rides. Use plan.attach in full." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "697-741", fn: "planLoaded", surface: "image_ad", replaces: "No product photo at none; brand_refs inventory; lookRefCount; brandLookPassed; varietyNote and varietyPictureNote. Use plan.attach.brandDesignedImages, plan.attach.pastAds, plan.text.brandLook, plan.notes." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "757-812", fn: "planLoaded, brandBlock", surface: "image_ad", replaces: "brandVoicePack surfaces by kind and the visual fields gate (passed !== basics). Use plan.text.voice and plan.text.brandLook (none sends no visual field at all)." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "781, 825", fn: "callPlanner", surface: "image_ad", replaces: "plannerSeesReference, and temperature from varietyTemperature. Use plan.attach.referenceImage or plan.text.referenceDescription === detailed, and plan.temperature." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "876-894", fn: "writeWords", surface: "image_ad", replaces: "varietyNote with no temperature. Use plan.notes, plan.temperature and plan.text.pictureWords for which slots are asked for." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "1165-1196", fn: "referenceForPrompt, writePrompts", surface: "image_ad", replaces: "Truth sheet left out when no picture shows the product; productRule per plan. Use plan.attach.productPhotos and the product note." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "1384-1435, 1571", fn: "renderRequest, fixRequest, renderRun", surface: "image_ad", replaces: "Hero photo gated by sendsProductPhoto; referenceLine. Use plan.attach.productPhotos and plan.attach.referenceImage." },
    { area: "Studio", file: "src/lib/studio/engine.ts", line: "1687-1691", fn: "planScriptAd", surface: "image_ad", replaces: "Production's adapter passes product_in_picture and variety, fidelity unset. Pass the job's taste through." },
    { area: "Studio", file: "src/lib/studio/request.ts", line: "89-123", fn: "imageRequest", surface: "image_ad", replaces: "productRule in the request. Use the product note from plan.notes." },
    { area: "Studio", file: "src/lib/studio/forms.ts", line: "59, 71", fn: "formRule, formFault", surface: "image_ad", replaces: "The form menu by variety. Key it on plan.taste.look === new." },
    { area: "Studio", file: "src/lib/studio/reference.ts", line: "40-75", fn: "closenessFields, closenessOf, whatIsSent, lookRefCount, brandLookPassed, passesReference", surface: "image_ad", replaces: "The first version of this table. Once the engine reads the plan, these become thin wrappers over decide() or are removed." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "511-524", fn: "generateScript", surface: "script", replaces: "Reference mode choice and the flow switch. taste.look decides: reference keeps the structure (exact when keepWords), others send plan.text.referenceDescription." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "542", fn: "generateScript (composeSkill)", surface: "script", replaces: "TASK_SKILL by start. Keep, and append plan.skillPath." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "544-589", fn: "generateScript (blocks)", surface: "script", replaces: "brandVoiceText surfaces (own ads as the model), offer and terms, varietyNote, referenceBlock, siblingBrief. Use plan.text.voice, offer, referenceDescription, siblings, facts, customerWords." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "597-622", fn: "generateScript (flow)", surface: "script", replaces: "customerWords by reasonBlock, voice with no own ads, flowControls. Same plan fields as above, so flow and non-flow send the same things." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "627-633", fn: "generateScript (model call)", surface: "script", replaces: "Temperature only off Claude. Use plan.temperature on every model that accepts one." },
    { area: "Scripts", file: "src/lib/scripts/engine.ts", line: "678", fn: "generateScript", surface: "script", replaces: "variety >= 4 frees the speaker. Use plan.taste.look === new." },
    { area: "Scripts", file: "src/lib/scripts/flow.ts", line: "309-318", fn: "flowControls", surface: "script", replaces: "variety >= 4 and varietyNote. Use plan.notes and plan.taste.look." },
    { area: "Scripts", file: "src/lib/scripts/skills.ts", line: "16, 71", fn: "TASK_SKILL, composeSkill", surface: "script", replaces: "Add a `taste: string[]` request field: the files of plan.skillPath, read after the task skill." },
    { area: "Hooks", file: "src/lib/scripts/hooks.ts", line: "120-133", fn: "writeHooks", surface: "hooks", replaces: "varietyNote, voice with story on, temperature. Use the hooks plan: siblings body, hookAnchor, voice, temperature." },
    { area: "Hooks", file: "src/lib/references/hooks.ts", line: "93-113", fn: "writeHooks (new hooks for a winning ad)", surface: "hooks", replaces: "Voice surfaces [script], no variety and no temperature. Call decide({ surface: hooks, hasReference: true }) and send by plan.text.hookAnchor." },
    { area: "Scripts", file: "src/lib/scripts/copy-pass.ts", line: "142", fn: "copyPass", surface: "script", replaces: "Voice surfaces default to [script]. Take plan.text.voice from the script's plan, so the editor is sent what the writer was." },
    { area: "Builder", file: "src/lib/builder/start.ts", line: "78-112", fn: "startBuilder", surface: "script", replaces: "Variety copied onto axes and kit. Put the taste on scripts.axes.taste and scripts.kit.taste (both JSON)." },
    { area: "Builder", file: "src/lib/builder/kit.ts", line: "84-101", fn: "hookTexts", surface: "hooks", replaces: "varietyNote and temperature. Use the hooks plan." },
    { area: "Builder", file: "src/lib/builder/kit.ts", line: "142, 177-201", fn: "writeKit (primary text)", surface: "caption", replaces: "customerWords phrases, the offer-fit line, voice with story on, varietyNote, temperature. Use the caption plan." },
    { area: "Builder", file: "src/lib/builder/kit.ts", line: "225-250", fn: "writeKit (pictures)", surface: "image_ad", replaces: "productPlace(auto, stage, native) ignores the person's choice. Use plan.attach.productPhotos from the kit's taste (native_ad when the format is native)." },
    { area: "Builder", file: "src/app/builder/actions.ts", line: "329", fn: "the start action", surface: "script", replaces: "Read the taste with tasteFromFormData(formData) and pass it to startBuilder." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "237-262", fn: "createJob", surface: "all", replaces: "reference_mode from the script, product_in_picture only for non-video jobs. Store `taste` on output_jobs.production (JSON)." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "342", fn: "jobSkillText", surface: "all", replaces: "Exact skill, native skill, format skill. Keep, and append plan.skillPath." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "385", fn: "jobProductPlace", surface: "image_ad", replaces: "exact means shown, else productPlace. Use plan.taste.product." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "422-463", fn: "planWithStudio", surface: "image_ad", replaces: "Reference image only for static-remix or structure; passes axes.variety. Pass the taste to planScriptAd." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "509-558", fn: "stepImagePlan", surface: "image_ad", replaces: "Own planner for native, exact or no photo; images, voice pack, mode rules. decide() with surface native_ad or image_ad; plan.warnings covers the no-photo case." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "787", fn: "cardRefs", surface: "carousel", replaces: "Hero and extras by place, no specimen for native, reference image by mode. Use plan.attach." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "822-851, 900", fn: "imagePrompts, stepRender", surface: "image_ad", replaces: "Native means no brand fingerprint; truth sheet by place. Use plan.text.brandLook === none and plan.attach.productPhotos." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "982-1019", fn: "stepShotPlan", surface: "shot_plan", replaces: "Mode rules, referenceText, voice surfaces. Use the shot_plan plan (pace, product, people)." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "1196, 1270", fn: "storyRefs, stepPrep", surface: "storyboard", replaces: "The hero photo is always sent, with no product rule. Use plan.attach.productPhotos: Not shown sends none." },
    { area: "Production", file: "src/lib/production/engine.ts", line: "1895", fn: "drawCastPortraits", surface: "cast", replaces: "The hero photo is always sent. The cast plan sends no product photo; people and finish come from the plan." },
    { area: "Production", file: "src/lib/production/kit.ts", line: "226", fn: "contextFor", surface: "all", replaces: "Per-step brand slices. Gate the look slice by plan.text.brandLook and the copy slice by plan.text.voice." },
    { area: "Sprint", file: "src/lib/sprint/engine.ts", line: "143, 397, 475", fn: "assignRefs, slotDirection, writeBriefs", surface: "sprint_ad", replaces: "createRun with no variety, fidelity or product choice. decide() per slot with the slot's stage (native_ad for the native format) and the sprint's taste." },
    { area: "Chat", file: "src/lib/chat/make.ts", line: "51-96", fn: "referenceDirection, makeImages", surface: "image_ad", replaces: "A reference goes only as words, no variety or fidelity. Read intent.taste with parseTaste and pass it to createRun." },
    { area: "Chat", file: "src/lib/chat/make.ts", line: "190-201", fn: "writeScripts", surface: "script", replaces: "Mode defaults to structure. Take the mode from lookToScript(taste.look)." },
    { area: "Chat", file: "src/lib/chat/write.ts", line: "42-74", fn: "COPY_SURFACES, writeCopy", surface: "caption", replaces: "Voice-pack surfaces by copy kind. Use the caption plan (landing for page copy)." },
    { area: "References", file: "src/lib/references/build.ts", line: "143", fn: "scriptsFromReference", surface: "script", replaces: "Variety and mode put on the job. Put the taste on the job payload." },
    { area: "References", file: "src/lib/references/build.ts", line: "187", fn: "buildFromReferences", surface: "image_ad", replaces: "createRun ignores input.variety and fidelity. Pass the taste (hasReference is true here)." },
    { area: "References", file: "src/app/references/build-actions.ts", line: "31, 57", fn: "buildFromReferencesAction, makeFromReferenceAction", surface: "all", replaces: "Add `taste: tasteSchema.optional()` to the Build and FromReference inputs and pass it on." },
    { area: "Formats", file: "src/lib/format-start.ts", line: "64, 72-86", fn: "the script path, the studio path", surface: "all", replaces: "The script path passes variety, the studio path drops it. Pass the taste on both." },
    { area: "Formats", file: "src/app/formats/actions.ts", line: "31", fn: "startFormatAction", surface: "all", replaces: "Add `taste: tasteSchema.optional()` to the Start input and pass it to format-start." },
    { area: "Coverage", file: "src/lib/coverage/start.ts", line: "89", fn: "queueBriefs", surface: "script", replaces: "No variety. Queue with {} so each brief follows the defaults of its own stage; a variant of a winner uses { spread: openings }." },
    { area: "Landing", file: "src/lib/landing/write.ts", line: "114-136", fn: "writePage", surface: "landing", replaces: "Voice surfaces [site], quotes, no temperature. Use the landing plan." },
    { area: "Jobs", file: "src/lib/jobs/worker.ts", line: "132", fn: "then.productInPicture", surface: "all", replaces: "The product choice carried on a queued job. Carry `taste` on jobs.payload instead." },
    { area: "CLI", file: "src/scripts/studio.ts", line: "39, 50", fn: "main", surface: "image_ad", replaces: "createRun with no lever. Add a --taste '<json>' flag read with parseTaste." },
    { area: "CLI", file: "src/scripts/generate-scripts.ts", line: "49", fn: "main", surface: "script", replaces: "Calls the engine directly. Add the same --taste flag." },
    { area: "CLI", file: "src/scripts/format-scripts.ts", line: "40", fn: "main", surface: "script", replaces: "Calls the engine directly. Add the same --taste flag." },
    { area: "CLI", file: "src/scripts/produce.ts", line: "33", fn: "main", surface: "all", replaces: "Calls the engine directly. Add the same --taste flag." },
    { area: "Screens", file: "src/app/studio/look-controls.tsx", line: "ClosenessPicker", fn: "ClosenessPicker", surface: "image_ad", replaces: "Replace with <TasteBar>. Its stop order (brand, between, new, reference) becomes the order of the taste bar (brand, between, reference, new)." },
    { area: "Screens", file: "src/components/variety-lever.tsx", line: "VarietyLever", fn: "VarietyLever", surface: "script", replaces: "Replace with <TasteBar surface=\"script\">. Stored variety loads through lookFromVariety." },
    { area: "Screens", file: "src/components/output-options.tsx", line: "ProductInPicturePicker, OutputOptionsPicker", fn: "ProductInPicturePicker", surface: "image_ad", replaces: "The product select and the words-on-image switch become the Product and Words levers of the taste bar. Feed copy and the copy without words stay as they are." },
];
export const STORAGE: {
    where: string;
    file: string;
    today: string;
}[] = [
    { where: "scripts.axes (ScriptAxes)", file: "src/db/schema.ts:248-271", today: "variety, native" },
    { where: "scripts.kit (ScriptKit)", file: "src/lib/builder/types.ts:161", today: "variety" },
    { where: "studio_runs.context", file: "src/db/schema.ts:882 (item fidelity at 864)", today: "variety, fidelity, product_in_picture, text_on_image, feed_copy, brand_refs" },
    { where: "output_jobs.production (ProductionState)", file: "src/db/schema.ts:487-493", today: "reference_mode, product_in_picture, product_place" },
    { where: "jobs.payload", file: "src/db/schema.ts:590", today: "axes, kit, then.productInPicture" },
];
