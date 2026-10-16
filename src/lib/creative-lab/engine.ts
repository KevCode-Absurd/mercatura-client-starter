import type { ArtDirection, Card, ComparisonArm, Finding, LabDraft, Scene } from "./types";
export const ART_FIELDS: (keyof ArtDirection)[] = ["mood", "palette", "typography", "lighting", "prominence", "composition", "setting", "style", "camera"];
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
export const words = (s: string) => (s.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []).length;
const tokens = (s: string) => new Set(norm(s).split(" ").filter(w => w.length > 3));
export function overlap(a: string, b: string) { const x = tokens(a), y = tokens(b); return x.size && y.size ? [...x].filter(w => y.has(w)).length / Math.min(x.size, y.size) : 0; }
export function fingerprint(value: unknown): string {
    const canonical = (v: unknown): string => Array.isArray(v) ? `[${v.map(canonical).join(",")}]` : v && typeof v === "object" ? `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`).join(",")}}` : JSON.stringify(v) ?? "null";
    const text = typeof value === "string" ? value : canonical(value);
    let n = 2166136261;
    for (let i = 0; i < text.length; i++)
        n = Math.imul(n ^ text.charCodeAt(i), 16777619);
    return (n >>> 0).toString(16).padStart(8, "0");
}
const find = (id: string, region: string, observation: string, correction: string, severity: Finding["severity"] = "fix"): Finding => ({ id, region, observation, correction, severity });
export function emptyDraft(defaults?: Partial<LabDraft>): LabDraft {
    const art: ArtDirection = { mood: "Calm", palette: "#f5f1e8, #24392c", typography: "system-ui", lighting: "Window daylight", prominence: "Product clear and unobscured", composition: "product-led", setting: "A relevant everyday surface", style: "Natural product photography", camera: "Eye-level three-quarter" };
    return { name: "Untitled creative", productId: "", sourceScriptId: "", buyer: "", argument: "", facts: "", qualification: "", mode: "static", body: "", lockedBody: "", bodyLocked: false,
        hooks: [{ id: "hook-1", spoken: "", visual: "", overlay: "", promise: "", deliveredIn: "", bodyStart: 0 }], selectedHook: "hook-1", imageJob: "", headline: "", caption: "", proofPlacement: "", textMode: "image_first", approvedHandoff: "", cards: [],
        targetSeconds: 30, wordsPerMinute: 145, measuredSeconds: null, measuredReadName: "", readTimings: [], grammar: "talking", speaker: "illustrative", scenes: [], mediaUrl: "", mediaKind: "image", playback: [], cutdowns: [], displayReviews: [], art, artBaseline: { ...art }, locks: [], aspects: ["1:1", "4:5", "9:16"],
        world: { location: "", surfaces: "", props: "", casting: "", productReferences: "", illustrationReferences: "", parentVersion: "" }, photoReferences: "", selectedPhotoJobs: ["identity", "detail", "use"],
        reference: { source: "", fidelity: "structure", device: "", reason: "", preserve: "", change: "", cannotTransfer: "Quotes, authority, product claims and alleged performance", outputObservation: "" },
        repair: { region: "trigger", before: "", after: "", observed: "", support: "", preserved: "", applied: false },
        comparison: { hypothesis: "", variable: "headline", baseline: { headline: "", opening: "", proof: "", layout: "", argument: "", product: "", offer: "", qualification: "" }, variant: { headline: "", opening: "", proof: "", layout: "", argument: "", product: "", offer: "", qualification: "" }, assets: { baseline: "", variant: "" }, preference: "", reason: "" }, ...defaults };
}
export function handoff(d: LabDraft) {
    return { argument: d.argument, product: d.productId, facts: d.facts, qualification: d.qualification, imageJob: d.imageJob, headline: d.textMode === "text_free" ? "" : d.headline, caption: d.caption, proofPlacement: d.proofPlacement, textMode: d.textMode };
}
export function hookBody(d: Pick<LabDraft, "body">, h: LabDraft["hooks"][number]) { return d.body.split("\n").slice(h.bodyStart).join("\n"); }
export function hookReview(d: LabDraft): Finding[] {
    const findings: Finding[] = [];
    if (d.bodyLocked && d.body !== d.lockedBody)
        findings.push(find("body-lock", "Body", "The locked body changed.", "Restore the locked body or deliberately unlock it."));
    for (const h of d.hooks) {
        const continuation = hookBody(d, h);
        const region = `Opening ${d.hooks.indexOf(h) + 1}`;
        if (h.promise && (!h.deliveredIn.trim() || !norm(continuation).includes(norm(h.deliveredIn))))
            findings.push(find(`${h.id}-promise`, region, `Promise “${h.promise}” has no located delivery in the actual body.`, "Select the exact body passage that delivers this promise, or narrow the opening."));
        else if (h.promise && overlap(h.promise, h.deliveredIn) === 0)
            findings.push(find(`${h.id}-meaning`, region, "A delivery passage is located, but its meaning has no literal link to the curiosity promise.", "Inspect whether this exact passage resolves the opening; a located quotation alone does not prove delivery.", "review"));
        if (overlap(h.spoken, continuation.split(/\n|(?<=[.!?])\s/)[0] ?? "") > .8 && words(h.spoken) > 4)
            findings.push(find(`${h.id}-repeat`, region, "The next line repeats the spoken opening.", "Keep the body fixed and make the hook add a different trigger."));
        if (d.mode !== "static" && h.spoken && h.overlay && overlap(h.spoken, h.overlay) > .8)
            findings.push(find(`${h.id}-redundant`, region, "Speech and on-screen text repeat the same message.", "Give the text an identification or qualification job instead of transcribing the hook.", "review"));
        if (!h.visual.trim())
            findings.push(find(`${h.id}-visual`, region, "First-frame action has not been selected.", "Name the visible action that bridges into the actual next line.", "pending"));
        if (d.mode === "silent_video" && !h.overlay.trim() && !h.visual.trim())
            findings.push(find(`${h.id}-silent`, region, "The silent opening has no visible message.", "Add the visual action and an exact text line that carry the argument."));
        if (h.visual && h.spoken && overlap(h.visual, `${h.spoken} ${d.body}`) === 0)
            findings.push(find(`${h.id}-bridge`, region, "No literal link is visible between the described action and the words. Meaning needs inspection.", "Review the first frame with its next lines; clarify the action or spoken bridge.", "review"));
    }
    return findings;
}
export function argumentReview(d: LabDraft): Finding[] {
    const f: Finding[] = [];
    if (!d.argument.trim())
        f.push(find("argument-missing", "Argument", "No approved buying argument is recorded.", "State what the buyer should understand before making a layout."));
    if (!d.imageJob.trim())
        f.push(find("visual-job", "Image", "The picture has no stated communication job.", "Describe what the buyer can infer from the picture alone."));
    if (d.textMode === "text_free" && d.headline.trim())
        f.push(find("text-free", "Headline", "Text-free was selected; the headline is excluded from the render handoff.", "Keep the headline in the caption or deliberately change the selected mode.", "review"));
    if (d.textMode === "text_free" && d.qualification.trim())
        f.push(find("text-free-qualifier", "Image", "This execution has a required qualification and no text on the image.", "Use a factual picture that makes no qualified claim, or choose a text-bearing layout.", "review"));
    if (d.approvedHandoff && fingerprint(handoff(d)) !== d.approvedHandoff)
        f.push(find("handoff-changed", "Render handoff", "The argument, product facts, text choice or essential copy changed after approval.", "Review and approve this handoff revision before using it for production."));
    return f;
}
export function carouselReview(cards: Card[], qualification: string): Finding[] {
    const f: Finding[] = [];
    cards.forEach((c, i) => {
        const r = `Card ${i + 1}`;
        if (!c.question.trim() || !c.newInformation.trim())
            f.push(find(`${c.id}-empty`, r, "This card has no distinct question or new answer.", "Give it one buyer question and new information, or remove it."));
        if (qualification && !norm(c.qualification).includes(norm(qualification)))
            f.push(find(`${c.id}-qualifier`, r, "The required qualification is not present on this independent entry point.", "Put the qualification on this card or remove the claim that needs it."));
        if (i < cards.length - 1 && !c.transition.trim())
            f.push(find(`${c.id}-transition`, r, "No reason to continue is recorded.", "Link this answer to the next buyer question.", "review"));
        for (let j = 0; j < i; j++)
            if (overlap(c.newInformation, cards[j].newInformation) >= .8)
                f.push(find(`${c.id}-repeat-${j}`, r, `This repeats the information on card ${j + 1}.`, "Merge the repeated cards or answer a different buying question.", "review"));
        if (!c.proof.trim())
            f.push(find(`${c.id}-proof`, r, "No supporting fact or asset is attached.", "Use a supplied feature explanation, or attach the specific supporting asset.", "pending"));
    });
    return f;
}
export const GRAMMARS = {
    talking: { label: "Talking explanation", camera: "Medium shot, direct explanation; cut to the product at the feature being explained", proof: "Show the selected product view alongside factual explanation", speaker: "Illustrative presenter: no invented ownership or result" },
    demonstration: { label: "Hands-on demonstration", camera: "Hands close-up; setup → continuous action → observable result", proof: "Actual use asset and instructions; generated staging is illustrative", speaker: "Describe the observable action, not a fictional personal result" },
    b_roll: { label: "Narrated B-roll", camera: "Context wide → detail insert → product-use view; voice links the shots", proof: "Each image has a distinct explanatory job and reference", speaker: "Narrator explains supplied facts without implying first-hand use" },
    conversation: { label: "Staged conversation", camera: "Establish two speakers; matched eyelines, question/reverse answer, product insert", proof: "Label the exchange staged; no fabricated buyer quotation", speaker: "Illustrative roles with question and answer, not a testimonial" },
} as const;
export function shotPlan(d: LabDraft): Scene[] {
    const lines = d.body.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const coverage = {
        talking: ["Medium direct-to-camera explanation; product rests visibly beside the presenter", "Close product insert matching the feature being explained", "Return to the same presenter and camera position; bridge to the next action"],
        demonstration: ["Wide hands-only setup: establish the product, starting state and real use conditions", "Uninterrupted hands close-up of the actual use step; keep the relevant mechanism in frame", "Hold the observable end state and its limitation; leave time to inspect the product"],
        b_roll: ["Context wide shot establishes the buyer situation; narration carries the argument", "Macro material/detail insert; narration explains only the supplied fact", "Medium product-use illustration, clearly staged; narration connects it to the next action"],
        conversation: ["Two-person establishing shot; label the exchange staged and use the supplied line for speaker A", "Reverse angle on speaker B with matched eyeline; respond with the next supplied line", "Product insert under the continued staged exchange; no invented purchase or personal result"],
    };
    return lines.map((speech, i) => ({ id: `scene-${i + 1}`, visual: `${coverage[d.grammar][i % 3]}. ${i === 0 ? d.imageJob || "Establish the selected product" : `Show the detail described in line ${i + 1}`}`, speech, overlay: "", seconds: Math.max(3, Math.ceil(words(speech) / d.wordsPerMinute * 60) + 1), pause: 1, proof: "", objects: [] }));
}
export function pacing(d: LabDraft) {
    const rows = d.scenes.map(s => { const measured = d.readTimings.find(t => t.sceneId === s.id); const spoken = measured?.speechSeconds ?? words(s.speech) / d.wordsPerMinute * 60; const pause = measured?.pauseSeconds ?? s.pause; return { id: s.id, spokenWords: words(s.speech), overlayWords: words(s.overlay), spokenSeconds: spoken, pauseSeconds: pause, allocatedSeconds: s.seconds, crowded: spoken + pause > s.seconds + .1, basis: measured ? "measured segment" : "estimated" }; });
    const estimate = rows.length ? rows.reduce((n, s) => n + s.spokenSeconds + s.pauseSeconds, 0) : words(d.body) / d.wordsPerMinute * 60;
    return { rows, totalSeconds: d.measuredSeconds ?? estimate, basis: d.measuredSeconds !== null ? "measured media duration; speech/pause segmentation requires marked segments" : "estimated from supplied speaking pace", targetSeconds: d.targetSeconds, overBy: Math.max(0, (d.measuredSeconds ?? estimate) - d.targetSeconds) };
}
export function cutdown(d: LabDraft, target: number) {
    const lines = d.body.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const selected = new Set<number>();
    if (lines.length)
        selected.add(0);
    lines.forEach((s, i) => { if ((d.qualification && norm(s).includes(norm(d.qualification))) || /\b(shop|choose|see|explore|order|find|learn)\b/i.test(s) && i === lines.length - 1)
        selected.add(i); });
    const budget = Math.floor(target * d.wordsPerMinute / 60);
    for (let i = 1; i < lines.length; i++)
        if ([...selected].reduce((n, k) => n + words(lines[k]), 0) + words(lines[i]) <= budget)
            selected.add(i);
    const body = [...selected].sort((a, b) => a - b).map(i => lines[i]).join("\n");
    return { body, estimatedSeconds: words(body) / d.wordsPerMinute * 60, basis: "estimated complete-line assembly; editorial rewrite candidate", findings: [...(words(body) > budget ? ["Essential opening, action and qualification exceed the target; rewrite them together rather than truncating."] : []), ...(d.qualification && !norm(body).includes(norm(d.qualification)) ? ["Add the required qualification before production."] : []), "Review this shorter argument for product explanation, proof and hook-to-body continuity before keeping it."] };
}
export function reviewCutdown(d: LabDraft, targetSeconds: number, out: {
    hook: string;
    visual: string;
    body: string;
    qualification: string;
}) {
    const findings: string[] = [];
    if (d.qualification && !`${out.body} ${out.qualification}`.includes(d.qualification))
        findings.push("The required qualification was not preserved verbatim.");
    const duration = words(`${out.hook} ${out.body} ${out.qualification}`) / d.wordsPerMinute * 60;
    if (duration > targetSeconds)
        findings.push(`Estimated spoken duration ${duration.toFixed(1)}s exceeds ${targetSeconds}s; measured read still needed.`);
    const allowed: string[] = `${d.body} ${d.facts} ${d.qualification}`.match(/\d+(?:\.\d+)?/g) ?? [];
    const used: string[] = `${out.hook} ${out.body}`.match(/\d+(?:\.\d+)?/g) ?? [];
    for (const n of used)
        if (!allowed.includes(n))
            findings.push(`New number “${n}” needs source inspection.`);
    findings.push(...hookReview({ ...d, bodyLocked: false, body: out.body, hooks: [{ id: "cutdown", spoken: out.hook, overlay: "", visual: out.visual, promise: "", deliveredIn: "", bodyStart: 0 }] }).map(f => f.observation));
    findings.push("Editorial rewrite: review product explanation, factual support and the next action. Timing remains estimated until a read is supplied.");
    return { targetSeconds, ...out, findings, sourceBodyHash: fingerprint(d.body) };
}
export const ARCHETYPES = [
    { id: "annotation", label: "Product annotation", job: "Identify a physical feature and explain its use", asset: "Product photo or accurate reference", test: "photo" },
    { id: "objection", label: "Objection answer", job: "Answer the selected buyer's specific hesitation", asset: "An actual objection and supporting product fact", test: "facts" },
    { id: "comparison", label: "Fair comparison", job: "Show matched decision criteria under the same conditions", asset: "Matched comparison evidence", test: "comparison" },
    { id: "value", label: "Value explanation", job: "Explain contents or a real commercial term", asset: "Product contents or current offer terms", test: "facts" },
    { id: "identity", label: "Buyer situation", job: "Place the product in a relevant buyer situation", asset: "Buyer brief; staged scene stays illustrative", test: "buyer" },
    { id: "demonstration", label: "Visible demonstration", job: "Show the action that resolves the buying question", asset: "Actual use reference and instructions", test: "demo" },
] as const;
export function archetypes(d: LabDraft) {
    return ARCHETYPES.map(a => { const eligible = a.test === "photo" ? !!d.photoReferences.trim() : a.test === "facts" ? !!d.facts.trim() : a.test === "buyer" ? !!d.buyer.trim() : a.test === "comparison" ? !!d.scenes.find(s => /comparison|matched/i.test(s.proof)) : !!d.scenes.find(s => s.proof.trim()); return { ...a, eligible, reason: eligible ? `${a.asset} is supplied for ${d.buyer || "the selected buyer"}; review product applicability.` : `Missing: ${a.asset.toLowerCase()}.`, alternative: eligible ? "" : "Use a supplied factual explanation or illustrative buyer situation." }; });
}
export const COMPOSITIONS = ["product-led", "editorial", "explanatory", "context-led"] as const;
export function compositions(d: LabDraft) {
    return d.aspects.flatMap(aspect => COMPOSITIONS.map(layout => ({ aspect, layout, fixed: { product: d.productId, argument: d.argument, facts: d.facts, qualification: d.qualification, typography: d.art.typography, palette: d.art.palette }, readingOrder: layout === "product-led" ? ["product", "headline", "proof", "qualification"] : layout === "editorial" ? ["headline", "product", "qualification", "proof"] : layout === "explanatory" ? ["headline", "proof", "product", "qualification"] : ["context", "headline", "product", "qualification"], text: d.textMode === "text_free" ? "" : d.headline, caption: d.caption })));
}
export function artChanges(d: LabDraft) {
    const changes = ART_FIELDS.filter(k => d.art[k] !== d.artBaseline[k]).map(k => ({ field: k, before: d.artBaseline[k], after: d.art[k], locked: d.locks.includes(k) }));
    return { changes, violatedLocks: changes.filter(c => c.locked), empty: ART_FIELDS.filter(k => !d.art[k].trim()) };
}
export const PHOTO_JOBS = [
    { id: "identity", question: "What exactly am I buying?", shot: "Front three-quarter product view", requirement: "Actual product identity reference" },
    { id: "scale", question: "How big is it?", shot: "Product beside a verified measurement guide", requirement: "Dimensions and actual size reference" },
    { id: "detail", question: "What is it made from?", shot: "Material or construction close-up", requirement: "Actual material detail reference" },
    { id: "use", question: "How do I use it?", shot: "Relevant use step with the visible product", requirement: "Actual use reference and product instructions" },
    { id: "contents", question: "What comes with it?", shot: "Complete contents laid out separately", requirement: "Confirmed pack contents reference" },
    { id: "fit", question: "Will it fit my situation?", shot: "Verified fit condition shown with measurements", requirement: "Compatibility facts and actual fit reference" },
    { id: "care", question: "How do I look after it?", shot: "The permitted care step and relevant detail", requirement: "Selected product care instructions" },
] as const;
export function photoSet(d: LabDraft) { return PHOTO_JOBS.filter(j => d.selectedPhotoJobs.includes(j.id)).map(j => ({ ...j, reference: d.photoReferences.split("\n").find(s => s.toLowerCase().startsWith(`${j.id}:`))?.split(":").slice(1).join(":").trim() || "", status: d.photoReferences.split("\n").some(s => s.toLowerCase().startsWith(`${j.id}:`) && s.split(":").slice(1).join(":").trim()) ? "reference supplied; verify applicability" : "needs reference; plan only" })); }
export function continuity(scenes: Scene[]): Finding[] {
    const states = new Map<string, {
        state: string;
        scene: string;
    }>();
    const f: Finding[] = [];
    scenes.forEach(s => s.objects.forEach(o => { const key = norm(o.name); const prev = states.get(key); if (prev && norm(prev.state) !== norm(o.entering))
        f.push(find(`state-${s.id}-${key}`, `Shot ${s.id}, ${o.name}`, `${prev.scene} leaves it “${prev.state}”; this shot starts “${o.entering}”.`, `Change only this entering state to “${prev.state}”, or add the visible transition.`)); if (!o.entering.trim() || !o.leaving.trim())
        f.push(find(`state-empty-${s.id}-${key}`, `Shot ${s.id}, ${o.name}`, "Entry or exit state is missing.", "Record both states before producing this shot.", "pending")); states.set(key, { state: o.leaving, scene: s.id }); }));
    return f;
}
export function repairContinuity(scenes: Scene[], sceneId: string, object: string): Scene[] {
    let state: string | undefined;
    return scenes.map(s => ({ ...s, objects: s.objects.map(o => { if (norm(o.name) !== norm(object))
            return { ...o }; const next = s.id === sceneId && state ? { ...o, entering: state } : { ...o }; state = next.leaving; return next; }) }));
}
export function playbackReview(d: LabDraft): Finding[] {
    const f: Finding[] = [];
    for (const mode of ["silent", "listening"] as const) {
        if (mode === "listening" && d.mode === "static")
            continue;
        const actual = d.playback.filter(p => p.mode === mode && p.actualPlayback && p.media === d.mediaUrl && p.observation.trim());
        if (!actual.length)
            f.push(find(`playback-${mode}`, mode === "silent" ? "Silent viewing" : "Listening", "No observation is recorded from this delivered media version.", "Play the media in this mode, then record a timestamp and what the buyer can understand.", "pending"));
        actual.filter(a => a.issue.trim()).forEach((a, i) => f.push(find(`playback-${mode}-${i}`, `${mode} at ${a.at}s`, a.issue, a.observation, "review")));
    }
    return f;
}
export function referenceReview(d: LabDraft): Finding[] {
    if (!d.reference.source)
        return [find("reference-none", "Reference", "No reference selected; this remains a reference-free brief.", "Proceed from the current argument or add a reference deliberately.", "pending")];
    const f: Finding[] = [];
    for (const k of ["device", "reason", "preserve", "change", "cannotTransfer"] as const)
        if (!d.reference[k].trim())
            f.push(find(`reference-${k}`, "Transfer note", `${k} is not specified.`, "Describe the selected transferable device and adaptation, excluding borrowed claims and authority."));
    if (!d.reference.outputObservation.trim())
        f.push(find("reference-output", "Transfer review", "The finished output has not been compared with the selected transfer.", "Inspect the output and locate what was preserved and adapted.", "pending"));
    return f;
}
export function applyRepair(d: LabDraft): LabDraft {
    const r = d.repair;
    if (!r.before || !r.after || !r.observed || !r.preserved)
        throw new Error("Record the observed defect, exact before/after text and preserved strengths.");
    if (d.bodyLocked)
        throw new Error("Deliberately unlock the body before applying a body repair.");
    const at = d.body.indexOf(r.before);
    if (at < 0 || d.body.indexOf(r.before, at + r.before.length) >= 0)
        throw new Error("The before passage must occur exactly once in this body version.");
    const beforeNumbers: string[] = r.before.match(/\d+(?:\.\d+)?/g) ?? [], afterNumbers: string[] = r.after.match(/\d+(?:\.\d+)?/g) ?? [];
    if (afterNumbers.some(n => !beforeNumbers.includes(n)) && !r.support.trim())
        throw new Error("The repair adds a numerical assertion; attach its exact support first.");
    if (d.qualification && norm(r.before).includes(norm(d.qualification)) && !norm(r.after).includes(norm(d.qualification)))
        throw new Error("This repair removes a required qualification. Preserve it in the corrected passage.");
    return { ...d, body: d.body.slice(0, at) + r.after + d.body.slice(at + r.before.length), scenes: d.scenes.map(s => s.speech.includes(r.before) ? { ...s, speech: s.speech.replace(r.before, r.after) } : s), measuredSeconds: null, readTimings: [], repair: { ...r, applied: true } };
}
export function comparisonChanges(a: ComparisonArm, b: ComparisonArm) { return (Object.keys(a) as (keyof ComparisonArm)[]).filter(k => a[k] !== b[k]); }
export function comparisonReview(d: LabDraft) {
    const c = d.comparison;
    const changed = comparisonChanges(c.baseline, c.variant);
    const extra = changed.filter(k => k !== c.variable);
    return { changed, extra, valid: !!c.hypothesis.trim() && changed.includes(c.variable) && !extra.length, limits: "This pack records an editorial hypothesis and preference. Market effect, lift and statistical significance are unknown.", findings: [...(!c.hypothesis.trim() ? ["Record a learning question before comparing."] : []), ...(!changed.includes(c.variable) ? [`The selected ${c.variable} variable has not changed.`] : []), ...extra.map(k => `${k} also changed; restore it or disclose a broader comparison.`)] };
}
export function reviewDraft(d: LabDraft): Finding[] {
    const a = artChanges(d);
    const p = pacing(d);
    return [...hookReview(d), ...argumentReview(d), ...carouselReview(d.cards, d.qualification), ...continuity(d.scenes), ...playbackReview(d), ...referenceReview(d), ...displayReview(d),
        ...(d.mode !== "static" && d.qualification && !norm(d.body).includes(norm(d.qualification)) ? [find("body-qualification", "Video body", "The body does not include the required qualification.", "Place the full qualification with the relevant spoken or visible assertion, then recheck the shortened version.")] : []),
        ...(d.scenes.length && norm(d.scenes.map(s => s.speech).join(" ")) !== norm(d.body) ? [find("scene-body-mismatch", "Shot dialogue", "The scene dialogue and current body are different versions.", "Update only the affected shot lines or replan deliberately before exporting a production version.")] : []),
        ...(d.repair.after && d.qualification && norm(d.repair.before).includes(norm(d.qualification)) && !norm(d.repair.after).includes(norm(d.qualification)) ? [find("repair-qualification", "Proposed repair", "The proposed edit drops the required qualification.", "Preserve the full qualification in this passage before applying the repair.")] : []),
        ...(d.speaker === "illustrative" && /\b(I (?:bought|purchased|tried)|my (?:results|purchase)|after I used)\b/i.test(d.body) ? [find("illustrative-testimonial", "Speaker", "An illustrative presenter has first-person purchase or result wording.", "Use factual explanation, or attach an original real speaker passage and change the speaker status.")] : []),
        ...a.violatedLocks.map(c => find(`lock-${c.field}`, "Art direction", `Locked ${c.field} changed.`, `Restore “${c.before}” or deliberately unlock it.`)), ...p.rows.filter(r => r.crowded).map(r => find(`pace-${r.id}`, r.id, `Speech and pause need ${(r.spokenSeconds + r.pauseSeconds).toFixed(1)}s in a ${r.allocatedSeconds}s shot (${r.basis}).`, "Lengthen the shot or rewrite its complete line while preserving the qualification."))];
}
export function displayReview(d: LabDraft): Finding[] {
    const reviews = d.displayReviews.filter(r => r.assetUrl === d.mediaUrl).slice(-1);
    if (!reviews.length)
        return [find("raster-pending", "Finished image", "No raster text/contrast review is recorded for this image.", "Inspect the actual selected image at its intended width.", "pending")];
    return reviews.flatMap((r, i) => [
        ...(r.addedText === undefined || r.classification !== "clear" ? [find(`raster-classification-${i}`, r.region || "Image text", "Packaging markings and added ad copy have not been confidently separated.", "Reinspect this image; retain packaging transcription separately from approved ad wording.", "review")] : []),
        ...(norm(r.expectedText) !== norm(r.addedText ?? r.observedText) ? [find(`raster-text-${i}`, r.region || "Added ad copy", "Observed added raster text differs from the approved text.", "Correct this image region or deliberately update the approved wording. Product packaging text is retained separately.")] : []),
        ...(norm(r.expectedText) !== norm(d.textMode === "text_free" ? "" : [d.headline, d.qualification].filter(Boolean).join("\n")) ? [find(`raster-stale-${i}`, "Approved wording", "The approved wording changed after this raster review.", "Inspect the image again against the current headline and complete qualification.", "pending")] : []),
        ...(r.clipped ? [find(`raster-clip-${i}`, r.region, "Raster text is clipped at the selected display width.", "Reflow the text or repair only the clipped region.")] : []),
        ...(r.collision ? [find(`raster-collision-${i}`, r.region, "Text collides with an essential product or picture region.", "Move this overlay while preserving the argument and product view.")] : []),
        ...(r.contrast !== "readable" ? [find(`raster-contrast-${i}`, r.region, `Contrast is ${r.contrast} at ${r.width}px.`, "Inspect this background and choose a readable text treatment.", "review")] : []),
        ...(d.qualification && !r.qualificationVisible ? [find(`raster-qualifier-${i}`, r.region, "The required qualification is not legible in the actual image.", "Restore the complete qualification at a readable size.")] : []),
    ]);
}
export function exportPack(d: LabDraft) { return { schema: "creative-lab-handoff/1", media: { url: d.mediaUrl, kind: d.mediaKind }, productId: d.productId, argument: handoff(d), bodyHash: fingerprint(d.body), body: d.body, hooks: d.hooks.map(h => ({ ...h, continuation: hookBody(d, h) })), cards: d.cards, scenes: d.scenes, cutdowns: d.cutdowns, grammar: GRAMMARS[d.grammar], timing: pacing(d), compositions: compositions(d), art: d.art, artChanges: artChanges(d), photoSet: photoSet(d), campaignWorld: d.world, reference: d.reference, repair: d.repair, comparison: { ...d.comparison, review: comparisonReview(d) }, playback: d.playback, displayReviews: d.displayReviews, findings: reviewDraft(d), platformPerformanceData: "Not required; market performance unknown" }; }
