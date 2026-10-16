---
version: 0.3.0
name: realistic-ai-ugc
description: Make a generated UGC video ad look like 1 real person filmed it on their phone - a fictional adult presenter, 1 real room, the brand's real product with approved handling, in supported short clips joined with hard cuts. Starts from an approved script. Built from the brand's tagged product photos, an approved presenter, an opening still approved before any clip, consistent scene and product state across clips, and named voice and sound. Use for "AI UGC ad", "realistic UGC video", "make this script as UGC". Not for writing the script (script-format-ugc, ugc-script), a hook pack (ai-ugc-hooks), or a real creator's shoot.
---

# Realistic AI UGC

This skill is the look and the making of a generated UGC ad: what makes a clip pass for a phone video by a real person, and what keeps the person, the room and the product the same from the first clip to the last. It is judged on 4 things: a stranger takes the first frame for a phone video, the product is the brand's product in every frame, every word of the script is said and sounds said, and the demonstration can be seen.

It rests on `skills/production-principles/SKILL.md`. Read that first. Facts about a named model, tool or price (clip lengths, how speech and timing are written, how many references it takes) are in `skills/production-principles/models.md` and nowhere in this skill.

It starts from an **approved script**. The words are not changed here. Writing them is `script-format-ugc` (in the app) or `ugc-script` (by hand). The hook's own craft is `ai-ugc-hooks`.

Approved handling and reference evidence override this method's lift/use/demonstration defaults. With `handling=display`, keep the verified sealed front or detail visible on a support; nobody holds, opens or uses it. Do not infer absolute scale from a front-only pack photo. If approved words require unavailable use evidence, return to the writer for a revised, approved line. The close may keep the product on its support rather than beside the face.

For production through final handoff, read [UGC production and delivery](../../production-principles/references/ugc-production-delivery.md). Settle requested ratio, duration, caption/overlay and audio choices and approved hook versions before rendering. Approve the combined creator/product scene before motion, inspect actual clips, then review each edited export. Clean means no added captions/editorial text, not muted speech or erased packaging. Deliver only requested versions through available controls; no compulsory batch or automatic publication.

## The rules that define it

1. **A phone video, not a film.** 1 person, 1 real room, the room's own light, a phone at arm's length or propped up. Every word that belongs to film-making is left out (list below).
2. **The presenter is a fictional adult,** approved as 1 picture before any clip, and the same person in every clip. Never built from a real person's photo; a real person appears only from their own upload, with their say. No children. Never presented as a customer, a founder or an expert.
3. **The product comes from its photos,** each attached and named with its job, and is handled the way `How it is used` and the lessons say. A product that is worn is on the presenter from the first frame, and its photo is named as what the presenter wears. A product that is applied goes onto the back of a hand or a forearm unless the lessons say more.
4. **1 shot, 1 permitted action.** Use the actual route's supported clip durations and shot/cut mode. Divide the approved words and hand work where they fit naturally; a generation boundary is not an ad boundary. Do not prescribe N/10 clips or a fixed ten-second duration.
5. **Clips preserve state.** An uninterrupted continuation starts on the preceding last frame or extends it. A deliberate cut to new coverage uses its approved starting still and a coherent state handoff.
6. **Voice and sound are named in every clip.** No music. Captions and overlays are added afterwards.
7. **A still first, then clip 1, then the rest.**

## The method

### 1. Read the brain and the script

Read the fields under "What this reads from the brand brain" below. A blank field is a question for the brand. What stops the work when blank: `Reference photos` (pack front, plus scale/handling evidence when held), `Looks like`, `How it is used` when the script shows the product in use. A front-only photo supports display, not guessed handling or contents.

Read the script as a viewer. Mark the line that shows the product in use (the demonstration), and any line a fictional person could not say truthfully: that line goes back to the writer; it is not fixed here.

If opening or dispensing reveals something packaging hides, use an actual out-of-pack or in-use photo, named for that job, alongside the pack and scale references. Establish the contents' shape, colour, texture and opening mechanism before showing them. A label illustration does not establish what is inside. If that evidence is absent, keep the product displayed or revise the planned demonstration; do not invent contents.

### 2. The presenter and the room

For new candidate selection or a recurring presenter, use [Casting, appearance and performance](../../production-principles/references/recurring-character-motion.md): retain a stable selected ID, isolate its face and use consistent body/wardrobe views only as needed. Reuse an already approved identity. Keep this format's ordinary buyer fit, clothing and phone setup; a numbered casting grid or eccentric reference outfit is not the scene. A supported performance source must fit the available hands, product handling and camera support, with scene/voice authority explicit.

- The presenter: the brand's approved one, or 3 options from the avatar (`Who they are`, `The moment`, `People` under `Brand world`), 1 picked, 1 picture made and approved. Described once, in fixed words: gender, age band, hair, eyes, skin tone, wardrobe (plain, no words or logos), and 2 or 3 small things that make them 1 particular person.
- The room: 1 place from `Brand world` and the avatar's `The moment`, with the light it would have and 2 or 3 ordinary things that belong there.
- Give those objects a reason: a mug after breakfast, a towel after washing, a bag ready by the door. A little wear is plausible; random clutter and an immaculate showroom are not the default. Keep the background recognisable and the product clear. Read [Environment and photographic realism](../../production-principles/references/environment-realism.md) when building the opening still or adapting a base photo.
- The presenter and product inherit the room's light, reflections, exposure and contact shadows. Separate action, expression and gaze. A location edit may relight an approved identity without changing it. Use at most one or two subtle phone-capture imperfections, never enough to obscure the demonstration.
- The voice: age, pace, 2 or 3 traits, the accent.

### 3. Plan the clips

State duration, format, main action and what must be preserved. The approved presenter and starting still anchor the look. A performance reference is an optional movement input only when the chosen route supports that role; it is not the same as extending an accepted previous clip. Preserve product truth, approved words and feasible hand availability. For reference roles and turns or face occlusions to review, read [Video starting points](../../production-principles/references/video-generation.md).

Use [Camera shots and coverage](../../production-principles/references/camera-shots.md) to choose what each shot reveals. State its actual boundary, camera height, angle and gaze before styling. A wider context, medium action and closer selling detail can provide variety without adopting a cinematic look. POV and overhead views need a physically possible setup; the demonstration keeps all necessary hands and product parts visible. Preserve product state and lighting continuity across cuts.

Place the camera relative to the subject and choose one behaviour: locked, an achievable handheld move closer or away, or following an action. A propped camera does not move by itself. Plan action and movement onset/end as timed beats within the route's supported duration; the first and last crops must show the needed evidence. Keep physical light sources in place across angles. A timestamp in the prompt is direction to check in the rendered clip, not guaranteed timing control.

Split the script at sentence ends into route-supported clips. For each shot write: the words (at the speaker's pace, which follows their age; 8 or fewer while the hands work), the 1 permitted action, what each hand holds, where the product is at the start and at the end, the sound. Give the demonstration its own readable beat; do not cram it between unrelated lines.

Each clip advances the approved ad's arc: context, a use step, the reason to believe, or the close. A new generation boundary is not a fresh hook, product reveal or CTA. Carry the unfinished thought and physical state into the next shot instead of repeating a mini-ad structure. Budget natural delivery, a breath and the necessary hand work; if words finish early, a brief live reaction or completion of the action may use the remaining time. Never stretch speech or add unscripted words to fill a clip.

Tie a compact gesture or expression to the meaning of one phrase: a glance at the cap before opening it, a small brow lift at the doubt, a restrained smile when the point lands. Let it settle; hands need not move throughout speech and the face need not smile throughout the ad. Avoid repeated nods, generic pointing, oversized reactions and over-articulated mouth movement. This supports the shot's one main action, rather than adding a checklist of simultaneous movements.

Use [Scene direction](../../production-principles/references/scene-direction.md) to name what the viewer learns from each shot and the visible evidence behind it. Keep the approved words. Give a demonstrated detail or meaningful reaction time to register when needed, with live behavior rather than a freeze; retain phone UGC pace. Record gaze targets and object count as well as product state. A silent review checks the visual argument, followed by review with the actual speech and sound.

Choose how the phone is held for the whole ad: at arm's length if 1 hand is enough for everything the script does; propped on a surface if any clip needs 2 hands.

An arm-length shot cannot show its own filming phone and leaves one hand free. A mirror selfie must establish the mirror and its reflection geometry; a propped camera leaves both hands free. Specify the setup in the plan, then use "camera" or "lens" in the shot action so the model does not draw an extra phone.

Show the plan and what it will cost, read fresh. Wait for a yes.

### 4. The opening still, approved

When combining character and location references, check that visible faces, hair, wardrobe and prop state agree. Assign explicit roles and bind them to actual uploads; the location's incidental person never overrides the approved presenter. Read [Reference roles and a timed storyboard](../../production-principles/references/reference-storyboards.md) for conflict resolution and prompt organization, retaining phone UGC styling and this format's cast rules.

Make the first frame of clip 1 with the image model from the presenter's picture and the tagged product photos. Every object the ad uses is in it. Look at it before showing it: the product against its photo, the presenter against the approved picture, whether it reads as a phone video, the top and bottom sixth clear. Remake it until it is right. Wait for a yes.

### 5. Clip 1, checked

Identify the hardest planned beat before rendering the full sequence. If it is in a later clip, test that moment independently with its approved starting image and the smallest useful authorized motion render. Record its inputs, settings and result; change one decision per bounded retry. Such a test establishes feasibility, not the final handoff from clip 1. Resolve or simplify the difficult beat before scaling.

For motion direction and candidate review, read [Video starting points and motion review](../../production-principles/references/video-generation.md). Inspect the actual opening pose before choosing the action. Give each shot one principal visible operation and one achievable camera behaviour; do not redesign the source scene. A later-moment still is an illustration until an actual video transition has been watched. Review critical movements at normal speed and frame by frame before carrying the end state into later clips.

If the selected route exposes a native end-frame input, read [Endpoint transitions](../../production-principles/references/endpoint-transitions.md) before using it. Keep the endpoint compatible with the approved person, clothing, product and achievable phone setup. A propped camera cannot travel by itself, and matching endpoints do not establish sound motion through the middle. Preserve this format's phone look rather than copying the café's cinematic framing.

If the approved opening still needs more resolution, finish it with [Image upscaling](../../image-upscaling/SKILL.md) before using it for motion. Match the video route's accepted input size, keep the same shot and ratio, and compare face, hands, product printing and edges against the original. A sharper candidate with identity drift is not a replacement for the approved still.

Write the prompt (`references/clip-prompt.md`), run its check, read the price and say it, make clip 1 starting on the still. Check it (below) before any other clip is made: clip 1 sets the person, the room and the voice for all the rest.

### 6. The other clips, in order

For uninterrupted continuation, each starts on the last frame of the one before (or extends it), with the same references. Each is checked before the next is made, because a fault carries forward. For a deliberate cut to new coverage, use that shot's approved starting still through a supported input and preserve identity, room, light and action state. Compare derived angles with the original approved anchor. Read [Reference storyboards](../../production-principles/references/reference-storyboards.md) for this separate-shot workflow; do not describe a cut as uninterrupted continuation.

### 7. Check, then deliver

The check in `skills/production-principles/SKILL.md` section 9, and for UGC also:

1. Would a stranger take it for a phone video? No film look, no glow, no smoothed face.
2. Is it the same person, room and light in every clip?
3. Is every word of the script said, word for word, at the speaker's pace? Do the lips match?
4. Can the demonstration be followed with the sound off?
5. Does each clip end on a whole word? Does each shot add information, with any brief hold serving recognition rather than padding or frozen footage?
6. Has a person listened to every clip: 1 voice throughout, the room, no music?

A fault is written down as 1 line and goes to the brand's lessons. Join the clips with hard cuts in script order. Captions, the overlay and the end card are added afterwards in the brand's typeface.

Trim duplicated visible actions at joins without dropping approved words or necessary demonstration steps. Review the full edit sound off for the visual argument, then listen to the complete mix. Keep room ambience coherent, avoid doubled background layers, preserve the one approved voice and synchronize product sounds to actual visible events. This format still uses no music.

A hand or face glitch may be trimmed only if the remaining edit still carries the whole approved line, a readable use step and a coherent product state. Hiding the opening, transfer or result can make a plausible clip into an unsupported demonstration. When the faulty moment carries that evidence, repair the affected shot within existing limits instead.

## Writing a clip prompt

For prompt preflight, audit subject, visible action/expression, environment, camera, actual light and style/texture, then timed subject/camera movement and supported sound. Record fixed approved decisions and any deliberately open nonessential choices using [Prompt decisions](../../production-principles/references/prompt-decisions.md). Lead with the shot's evidence, exact words and product truth in this format's existing priority, using positive observable gaze/grip/state cues rather than just “natural.” Keep phone focus, no-music rules and essential exclusions; unknown product facts stay questions. Before rerolling, distinguish missing direction, conflicting references, infeasible handling, unavailable controls and a compatible instruction the output failed to follow. More detail or repeated text is not a continuity guarantee; exploration still uses existing limits.

**Words that make it a phone video:** a phone video; held at arm's length (or propped on the shelf); a little hand movement; light from the window on the left; an ordinary lived-in room; slightly off-centre; everything in focus.

**Words left out, always:** cinematic, film, movie, any camera or lens maker, anamorphic, film grain, dramatic lighting, bokeh, shallow depth of field, lens flare, colour grade, crane, dolly, gimbal, steadicam, whip pan, speed ramp, slow motion, epic, stunning, breathtaking, flawless, perfect.

**The face.** Say what makes a real face: fine lines, a few flyaway hairs, uneven tone, nothing smoothed. Say it without the filter's words (`skills/production-principles/models.md`): describe the person, not their skin. With the approved picture attached: "the same person as @Image1, nothing smoothed".

Keep that detail restrained: no etched pores, sharpening halos or newly invented marks on the approved face. Use [Portrait realism](../../production-principles/references/portrait-realism.md) for small breath/blink/head-adjustment performances and checks through the moving details. These are optional supporting behavior, not three required actions in every clip. Preserve the phone setup, approved words and one clear shot event; inspect identity and texture through blink closure/reopening, visible mouth movement and head turns.

For a photo-to-video stability study, bind a clear approved still to the supported reference role and choose speaking, one small turn or a blink rather than stacking simultaneous actions. Keep the actual light sources/camera distance steady for this study and preserve exact dialogue. Existing details move with facial areas through expression and occlusion; no pattern crawl/flicker, contrast pumping, multiplied marks or sudden smoothing. Allow normal blur/perspective/shading instead of freezing pores/highlights to screen pixels. Review before/during/after speech, turns and reappearance; separate start/speaking/turn stills do not establish video continuity. Use one targeted correction within existing retry limits.

Use [Skin detail craft](../../production-principles/references/skin-detail-craft.md) when designing or correcting the presenter still: local pores and fine hairs, coherent camera/light choices, and any approved jewelry, clips, manicure or tattoos. Keep their count, position and physical contact consistent through movement. A visible hand need not expose every finger. Preserve the approved person and phone focus rules; choose one diagnosed texture/light change per comparison instead of importing every playbook feature.

Use the capstone's order of decisions: believable scene/identity/crop/camera/light first, proportionate local skin next, then only relevant approved details. It is not five required renders. For new casting, zero to two purposeful styling additions may fit; an approved presenter keeps all existing details without acquiring the example lip stud/clip. Inspect the full still at delivery size, then visible forehead/nose/cheek/brows and accessory contact enlarged. A close study's single hair and sharper pores are not feed-scale requirements. Recheck the whole after a localized repair, resolve changed accessory designs as variants, retain the approved final anchor and only then animate if requested. Keep the format's action, exact words and actual camera setup; tiny detail never compensates for wrong scene/product or authorizes extra edits.

For a flawed presenter still, use the guide's [controlled skin repair](../../production-principles/references/skin-detail-craft.md): name waxy smoothing, dark/repeated pores or clipped shine at one area. Change one relevant clause while keeping identity, complexion, age, marks, expression/pose, crop, camera, light and approved styling fixed, plus product/text. Recover plausible local relief without new blemishes; reduce pore contrast or repetition separately; control glare while keeping natural sheen and approved coverage/finish. Compare the same crop/scale, save the exact change/result and revert ineffective edits. A different light or zoom is a separate test. Keep existing render limits; a corrected still needs separate motion review.

For the still, use zone → one or two details → intensity → distance/light. Forehead texture is low contrast; nose pores slightly clearer; cheeks soft with fine hairs only where light catches them; eye lines delicate, brows made of varied hairs, lips finely lined, chin/jaw subtly textured. Selfies keep this restrained, close portraits reveal more, macros isolate one feature. Preserve approved age, complexion, marks and makeup; do not add freckles or heavy creases to make someone “real.” Check the full moving face for texture crawling or disappearing through speech and blinks; fix a diagnosed cue instead of sharpening the whole face.

Choose complexion depth, undertone, adult age and one or two local variations separately; the age or complexion does not prescribe texture. Keep approved tone/undertone, marks and maturity through speech/cuts without washing out or graying skin, clipping highlights, exaggerating age or smoothing away its natural lines. Correct exposure/light response before changing complexion. Under changing light, preserve the person rather than freezing highlight color to the frame. Use these detailed choices for the still; motion prompts retain compatible appearance-preservation wording.

Makeup is optional approved styling. Choose coverage, finish and placement separately, then retain only one or two skin details plausible beneath that base at the shot distance. Sheer/light/medium coverage may reveal different amounts of marks without changing the person; never force every freckle or pore through a polished base. Blend base and localized concealer/blush/highlight, keep lip dimension, and control matte/satin/dewy reflections under the room's real light. No smooth mask, powdery patches or excessive shine. Keep the look through motion/cuts; reducing coverage or changing finish is a styling alternative, not a silent fix. [Skin detail craft](../../production-principles/references/skin-detail-craft.md) provides the makeup choices and diagnosis.

For hand cutaways and demonstrations, plan pose → visible anatomy → nails → object/accessory → contact/light using [Hands and accessories](../../production-principles/references/hands-and-accessories.md). Name the supporting fingers and other hand; occluded digits stay hidden, while an unobscured full hand has five. Keep realistic joints, nail beds/cuticles, approved nail shape/color/finish and accessory count/position. Grip, overlap, pressure, true object scale and contact shadows must agree with actual handling; the product's label stays clear. One hand is useful for a simple study, but two-hand tasks still use a propped camera. Inspect lifts/rotations/releases through motion for fusion, polish drift, slipping or floating rather than just checking the first frame.

For approved worn details, use position → attachment → overlap → contact → surface response. A clip grips the specified lock with strand overlap/local compression; a stud follows the approved lower-lip contour; matte tattoo lines follow skin with no raised edge. Keep body-relative position, count, design and scale through speech, turns and occlusion while reflections move naturally. These details are optional styling, not extra shot events. The physical-contact section of [Skin detail craft](../../production-principles/references/skin-detail-craft.md) supplies context/tight-study choices and targeted corrections.

**What is said about each part of the clip, in this order** (the first are kept when the prompt runs long): the action and which hand does it; the spoken words; where the product is and how it faces; the face and where the eyes go; the light. What is in the room is said once, at the top, as a short list of the only objects in the scene. Anything not described is invented.

**Sound.** The voice (age, pace, traits, accent). The room, by its kind: a bathroom has a little echo off tile; a bedroom is soft and close; a kitchen is open with a faint hum; a car is close and muffled; outdoors has air and distance. The product's own sound on the beat it happens (a cap clicking, a pour, a zip) and not otherwise. No music.

For independent speech or mix control, use [Audio direction](../../production-principles/references/audio-direction.md). Bind voice identity, recorded performance and approved words to their actual roles; an uploaded sample is not a connected cloning/conversion route. Keep this format's no-music rule. Repair the smallest coherent weak line where supported, listen to neighboring joins and recheck lips when syllable timing changes. Keep the room bed/cues beneath speech; review the full export on headphones and phone speakers. Do not shorten the approved script to match a draft visual edit.

For speech performance, read [Dialogue performance](../../production-principles/references/dialogue-performance.md). Keep one clear foreground voice over quieter ambience and indistinct background conversation. Budget approved words, useful clause pauses, any breath and the final reaction; do not add an opening delay to every hook. Lens-directed gaze remains this format's default rather than adopting the café visitor target. Listen without watching, then check lip/jaw timing, visible teeth and gaze. If words need shortening, revise and approve the script first.

**References.** Each attached file is named with its job, in the order attached: the opening frame; the presenter; the pack, front on; the product in a hand; the place (the brand's own photo only). 1 view per picture.

## In the app

The app plans the clips, makes the presenter's picture and the first frame, and writes each clip prompt from the plan. The planning step is sent `CARD.md`, not this file: a rule that should reach the planner goes in both.

## Reference files

- `references/clip-prompt.md`: the opening still and the clip prompt, with a worked example for a consumable and a durable

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `products-and-positioning.md`, the product | `Looks like`, `Pack` | The words about the product | Ask |
| | `How it is used`, `Moves and sounds` | The demonstration clip and its sound | Ask before showing it in use; show it held only |
| | `Visible result` | Whether a result may be shown | Show none |
| | `Never show` | The check | Use the lessons only |
| | `Reference photos` | Pack front, in hand, in use, each tagged | Ask. No photo, no clip |
| `customer-avatars.md` | `Who they are`, `The moment` | The presenter, the room, what they are doing | Ask which avatar |
| `brand-guidelines.md` | `Brand world`: Places, Surfaces and props, Light and time of day, People, Never in frame | The room, the light, who is on screen | Use the place in the brand's own photos, marked "inferred" |
| | `Brand world`: `Presenters` (proposed) | The approved presenter to reuse | Make 3 options |
| | `Motion and sound`: Pace, Camera, Sound; `Voice` (proposed) | How the phone is held, the voice, the accent | Ask for the accent; default to arm's length |
| | `Brand guardrails`: Never show | The check | None |
| `lessons.json` | How the product is opened, held and used | Word for word in each clip that handles it | None |
