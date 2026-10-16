---
name: production-principles
description: What a good generated picture or clip is, for any D2C brand - the product shown true from tagged reference photos, a still approved before a clip is paid for, a first frame that already holds the eye, real speed, sound said out loud, people and words handled by rule, and a check after every render. Describes, never instructs. Every production skill (UGC, hooks, podcast, claymation, comic, explainer, photoshoots, static ads, product page images) rests on this and adds only its own craft.
---

# Production principles

This is the library the visual skills share, as `ad-script-principles` is for scripts. It says what good looks like and why. A production skill adds the craft of its own format and does not repeat this. Facts about a named model (lengths, modes, prices) are in `models.md` and nowhere else, so a new model is 1 edit.

Written for D2C brands that sell a physical product: something eaten, worn, applied, held or used at home. Every rule has to hold for a serum, a jacket, a pan and a pouch of gummies.

[Commercial image treatments](references/commercial-image-treatments.md) distinguishes casual UGC, controlled luxury, seasonal context, vertical composition and evidenced result comparisons within the selected format. Capture imperfections remain restrained; seasonal styling changes no product or offer facts. An implied post-use improvement needs the same evidence as an explicit before/after. A plausible generated image is not proof of efficacy.

The creative method is shared across assistants and harnesses. Apply [Harness portability](../README.md#harness-portability): carry explicit direction/assets, discover available tools, and keep application contracts distinct from manual outputs. For image generation, edits and style reuse, [Image prompt architecture](references/image-prompt-architecture.md) separates subject/context/style, preservation and scoped locks from renderer settings. A provider switch does not approve a creative change or guarantee identical results.

For prompt preflight, use [Prompt decisions and wrong-result diagnosis](references/prompt-decisions.md): subject, visible action/expression, environment, camera, physical light and style/texture, plus timed subject/camera movement and supported sound for video. Record fixed decisions and their authority, deliberately open choices and bounds, and one tested variable. Lead with the asset's main evidence using positive concrete direction while retaining essential exclusions and format/reference/text priority. Unknown brand/product facts are not creative freedom. Before a reroll, distinguish missing direction, conflicting sources, unavailable controls, infeasible action and a clear instruction that the output failed to follow; greater prompt length does not guarantee preservation.

Keep a reusable direction brief separate from the execution prompt: purpose/feeling expressed through visible cues, approved scene/action, view/light, reference roles, fixed/open choices and review criteria. A helper organizes and proposes; it never silently replaces user intent, approved words, product truth or the format. Translate that stable brief into the route's actual controls/vocabulary rather than universal long/short prompt rules. A still is one coherent state; video directs change over time. Retain successful choices and refine one observed mismatch only when needed. The direction section of [Prompt decisions](references/prompt-decisions.md) provides the record without adding installation or generation steps.

Reuse accepted prompt structure with its actual assets/settings and observed result; rebind identity, product facts, copy and scene dependencies for the current task. Visual acceptance and measured ad performance are separate evidence. The reuse section of [Prompt decisions](references/prompt-decisions.md) covers this and one-variable refinement from supplied retention data, without requiring new library software or extra renders.

For reference-heavy video, a timed scene or a requested edit/continuation, use [Video prompt architecture](references/video-prompt-architecture.md): bind each input's role, relevant exclusion, owner and scene scope; separate global constants from timed changes; record trigger, contact/path and completion state. Keep actual route settings, output schemas, approved words and audio choices. A source package's platform conventions and feature claims do not establish controls here.

## 1. The product is shown true, from photos

A model that is told about a product in words invents one. The colour drifts, the label turns to scribble, the pack opens where it does not open. A buyer who knows the product sees a fake; a buyer who does not is shown something they will not receive.

- **Every prompt that shows the product attaches the product's own photos and names each one.** The tag and its job are written in the prompt: `@Image1 is the pack, front on: copy its shape, colours and printing exactly.` `@Image2 is the product out of its pack: copy its shape, colour and finish exactly.` An untagged photo is ignored or mixed up with another.
- **1 photo per job, not a collage.** Pack front; the product itself out of the pack; the product in a hand (for size); the product in use; a close view of its surface. The brand brain names the file for each job under the product's `Reference photos`.
- **The words agree with the photo.** The prompt repeats the 2 or 3 visible facts that matter most (from `Looks like` and `Pack` in the brain) in the same words every time. Where words and photo differ, models follow the words, so a wrong adjective undoes a right photo.
- **The colour of a thing is the colour of the thing.** A product photographed on a yellow background is not yellow.
- **It opens, pours, fastens and is worn the way it really is.** `How it is used` and the lessons give the steps. An action nobody has described is an action the model makes up.
- **A scene with no product in it still belongs to the product.** A wordless hook, a mood shot, a "world" shot: the object in focus is the product itself, something it is made of, or the thing it replaces, so the cut to the product is a continuation and not a change of subject.

Product placement follows the [reference, scale and integration method](references/product-placement.md): a sharp master reference, the approved scene, verified dimensions where available plus an evidence-based visible anchor, feasible support/grip and scene-consistent light, shadows, reflections, perspective and focus. Cleanup preserves original geometry and printing; capacity never establishes exterior dimensions. Keep product-presence choices and use the camera for prominence rather than inflating the object. Through motion, size, grip, rigid packaging and label identity remain coherent as reflections and occlusion change.

## 2. A still before a clip

A picture costs cents and a clip costs dollars. Many visual faults (the product, the place, the person, the camera position) can be found in its first frame. Timing, motion and continuity still require review of the actual clip.

- The opening frame is made and looked at first. The clip is asked for only when that frame is right, and it starts on that frame.
- A camera position that is unusual (inside a bowl looking up, under a glass table, from the back of a shelf) is not obeyed from words. It is set by the opening frame.
- A later clip starts on the last frame of the one before it, or is asked for as an extension of it.

Text-to-video is useful for exploring an uncommitted visual idea. It leaves identity, scene and first-frame composition open to interpretation; it does not replace the tagged photos required for an exact brand product. Image-to-video starts from an approved visual state, with direction focused on what changes over time. Neither mode guarantees continuity. For selecting the mode, directing motion and reviewing candidates, read [Video starting points and motion review](references/video-generation.md).

State the duration, format, main action and preservation priority before choosing a workflow. A supported performance reference supplies intended movement rather than continuation; its input role is verified separately from character appearance and product truth. Several events are planned as individual shots with recorded state handoffs and a reviewed edit.

For a scene with several references, bind labels to actual uploads and identify what each controls; resolve identity, wardrobe and state conflicts before rendering. Separate global constants from shot events. Read [Reference roles and a timed storyboard](references/reference-storyboards.md) when preparing a multi-reference scene or prompt pack. A general reference is not automatically a native first/end-frame control.

When deriving coverage from one approved image, retain that anchor and compare every angle against it and the product photos. Separate camera changes from later action states, approve each shot's still, and review its actual animation before editing. The same [storyboard guide](references/reference-storyboards.md) covers independent shot inputs, trimming repeated actions and a coherent ambience bed across cuts. Source images, motion clips and the final edit are separate checks.

When both endpoints are supplied through supported native inputs, check compatible identity, wardrobe, product state, aspect and a feasible physical path. Review the middle of the actual clip, not just its first and last frames. Read [Continuous motion between start and end frames](references/endpoint-transitions.md) for endpoint selection, prop exits, camera travel and simpler retries.

## 3. The first frame is the advert

In a feed the first frame is what is judged, in well under a second, with the sound off.

- Something is already happening in frame 1: the pour is in the air, the hand is already on the lid. A clip that opens on an empty set spends its first second on nothing.
- The frame reads at the size of a thumb: 1 subject, clear edges, the brand's colours, nothing important in the top or bottom band where the app's own buttons sit.
- If the clip is stopped at any frame, that frame is still a good picture.

## 4. Movement that could be filmed

- **Real speed.** Slow motion and time-lapse look generated and make a hard cut to the next clip jar. A slow camera is fine; slowed playback is not.
- **1 action per clip, small and continuous.** Things pour, settle, peel, click shut, fold, zip, spread. Nothing explodes.
- **Materials behave.** Liquid has weight, powder falls, fabric hangs, a lid has a thread. A viewer does not know why a clip looks wrong; they only scroll.
- **Everything a clip uses is in view when it starts.** An object fetched from off screen is invented on the spot.
- **1 name per object,** used the same way at every mention.
- **Start state and end state agree with the action.** A cup on the table must be reached for and lifted before it can be lowered. One principal visible action and one camera behaviour keep a shot readable; small supporting gaze or breathing changes do not become competing actions. A static later-moment illustration is not evidence of a successful transition.

## 5. Sound is part of the picture

A clip's sound needs its own direction and review. Confirm the route's actual audio and dialogue controls instead of assuming it will generate speech.

Separate canonical words, stable voice identity and local performance. Read [Voice identity and spoken performance](references/voice-performance.md) for compact profiles, optional intensity, emphasis, useful pause positions and complete phrase endings. Preserve an approved avatar voice. In the app, use `cast.voice_direction` for the stable voice and scene `tone` for local delivery, keeping `dialogue` exact and provider tags/settings out of it. Native audio remains the current workflow; Audio off includes speech.

Read draft copy aloud before approval. Settle script, delivery, optional music mood, meaningful effects and their balance as a repeatable brief; with native video audio these are one generation's directions, not mandatory separate tool calls. Voice carries the message, music the intended feeling and effects the important events. Respect the user's sound/BGM switches, and check the final result on headphones, laptop and phone speakers.

Plan audio with the script/scene, then finalize cue timing against the actual edit. [Audio direction, layers and selective repair](references/audio-direction.md) distinguishes generated voice, authorized voice identity, recorded-performance voice changes, native audio and independent music/effects. Preserve canonical words and format music rules; use actual pronunciation/pause controls, mend the smallest coherent weak phrase and review its joins and any new lip timing. Keep voice, room bed, cues and optional music separately editable where supported. Meaningful sound and intentional quiet serve the scene; listen to the full delivered mix on headphones and phone speakers.

- The prompt says what is heard: the tear, the pour, the click, the room. It says whether there is music. "Natural sound only, no music" is a complete instruction; silence about sound is not.
- Speech is written in the form the model reads (`models.md`), 1 speaker at a time, and short enough to say in the time.
- A reviewer that reads frames cannot hear. A person listens to every clip before it is used.

For talking shots, foreground speech remains clear above room ambience and incidental voices. Budget the approved words, useful breaths, clause pauses and reaction inside the actual duration. Listen without watching for completeness and tone, then inspect mouth timing, stable teeth and the chosen gaze target. Read [Dialogue performance and a clear voice](references/dialogue-performance.md); shortening a line belongs to script revision, not an unapproved production edit.

## 6. People

For recurring characters, read [Casting, appearance and performance](references/recurring-character-motion.md). New candidates have stable IDs; isolate the selected adult before deriving consistent views. One approved face anchors identity while body views describe build/wardrobe. Preserve existing approved casting and the app's sheet contracts. A supported performance source supplies movement/timing, with camera and environment authority explicit; it does not supply a new face, product or script. Review body weight, contacts, turns and reappearance through the actual clip.

[Identity photo libraries](references/identity-photo-library.md) extends this to authorized digital likenesses and reusable fictional presenters. Keep originals/master distinct from approved generated variants; select relevant face/body/styling/environment assets within actual route limits. Connected talking clips preserve exact words, stable voice and identity with per-shot states and explicit cut handoffs. Native audio remains current; optional voice repair needs supported controls and a new listening/lip-sync check. Sheets, fixed photo counts, eight-second clips and separate voice swaps are not compulsory stages.

- A generated person is a fictional adult and says nothing that only a real customer could say ("this worked for me").
- No generated children. A founder, a named customer or an expert appears only from that person's own photo or footage, with their say.
- A hand is told what to do: which hand, holding what, where the other one is. A hand never covers the label.

Visible hand work follows pose → anatomy → nail styling → object/accessory → contact/light. Name supporting fingers and legitimate occlusion; a complete unobscured hand has five digits, but a grip/crop need not display them all. Keep nail beds/cuticles, joint/wrist connectivity, approved polish and accessory count/placement consistent. Objects need true scale, contact/overlap and source-consistent reflections; the real product keeps its printing and handling. Read [Hands, nails and small accessories](references/hands-and-accessories.md), then review the whole grip change rather than only endpoints.

Face-led imagery uses proportionate texture and natural asymmetry, without smoothing, etched pores or sharpening halos. For portraits and small performances, read [Portrait realism in stills and motion](references/portrait-realism.md). Approve the still, then inspect eyes, visible teeth, texture and proportions through actual blinks and head adjustments. Optional AI-reveal text is set in the editor, accurately describes the process and stays separate from a brand's approved message.

In photo-to-video work, bind the clear approved reference through the actual input role and plan one readable event, with simple compatible camera/light direction. Existing local details move with facial areas through speech, turns and occlusion; inspect the whole clip for crawl/flicker, contrast pumping, multiplied marks or sudden smoothing. Natural blur, perspective and changing shape-dependent shading are not identity drift. A set of still states cannot prove continuity, and no five-second or three-motion example overrides approved words, action or format.

Skin cues belong to named zones and the intended viewing scale. Camera, lighting and texture are separately chosen, compatible decisions. For local texture modules, grounded clips/jewelry/nails/tattoos and diagnosis before retrying, read [Skin detail craft](references/skin-detail-craft.md). Personal features are optional approved casting details with stable count and placement, not additions to every face.

Assemble face-led imagery in order: establish scene/identity/crop/camera/light, select proportionate local skin cues and relevant approved physical details, then inspect the whole image and enlarged visible areas. These are decisions, not mandatory separate renders. Preserve all approved styling; one or two additions are options only for new casting, not permission to add a clip/stud or remove existing details. Recheck the whole after each local repair and approve the final anchor before optional motion. A different-looking accessory in a generated close view is a variant/conflict to resolve, not preservation proof; macro detail never becomes the feed portrait's required sharpness.

For a skin repair, name one symptom and facial area, change one controlling clause and compare that area at the same crop/display scale. Lock approved identity, complexion, age, marks, pose/expression, camera, actual light and styling, plus product/text. Recover subtle relief for waxy skin, soften dark pores or vary repetition separately, or reduce a broad clipped highlight while retaining gentle sheen and the approved makeup finish. No new marks, global sharpening or unrelated relighting. A light/exposure problem gets its own named test; illustrative crops are not matched repair evidence. Record the clause/result, keep the best version and use existing retry limits.

For approved contact details, specify position, attachment, overlap, contact and material response. Clips grip a lock with strand overlap and local compression/shadow; a piercing follows its approved anatomical contour with restrained reflection; matte tattoo ink follows skin without a raised edge or accessory shadow. Preserve count/design/scale and body-relative placement through angles, speech and occlusion. Use the physical-contact section of [Skin detail craft](references/skin-detail-craft.md); a contextual or tight study is optional, not permission to add the example details to a character.

Use the face-zone method for realistic people across UGC, podcast, native and unaware creative: zone, one or two local details, intensity, actual camera distance and light. Nose pores can be clearer than forehead/cheek texture; eye lines, brow hairs, lips and jaw keep their own softer detail. Ordinary selfies and podcast two-shots stay subtle; closer shots reveal more without changing identity. A macro isolates one feature. Preserve each format's camera, approved age/marks/makeup and light sources; a messaging stage does not call for more blemishes or a new face in an object-led concept.

Choose complexion depth, undertone, adult age and surface variation separately; none determines the others. Retain approved color/age and one or two local variations, with detail in highlights and shadows. Avoid washing out or graying deep skin, clipping light skin, exaggerated maturity or unwanted rejuvenation. Correct exposure/light response before changing complexion. Skin color and marks remain consistent across motion/cuts while responding naturally to the scene's illumination. [Skin detail craft](references/skin-detail-craft.md) covers these casting, exposure and review decisions.

Makeup coverage, finish and placement are separate from identity and texture. Retain subtle relief and only details plausible through the chosen coverage; heavier coverage need not show every mark equally. Base/concealer/blush/highlight blend at specified locations, and lips retain dimension. Preserve approved styling across cuts while highlights follow the source naturally; do not default to bare skin, lower coverage or switch finish without a styling reason. Use the makeup section of [Skin detail craft](references/skin-detail-craft.md) for choices and targeted corrections.

## 7. Words in the picture

- A video model writes no words. Captions, the overlay pill, prices and the call to action are added afterwards, in the brand's typeface.
- An image model sets words only when given the exact words, their order and the brand's type. Every word in a picture is a word somebody approved.
- No claim, price or offer appears in a picture unless it is in the brand's facts.

## 8. What it is for

Each asset has 1 job and is judged on it.

- **A hook** stops the thumb and holds the eye for 3 seconds. Judge it on the first frame and on whether the eye stays to the end of the motion.
- **A demonstration** shows what the product does. Judge it on whether a stranger could say what happened.
- **A proof picture** makes a claim believable. Judge it on whether the source is visible and real.
- **A product page image** answers 1 question a buyer has before buying. Judge it on whether the question is answered without reading the page.

## 9. A check after every render

Finishing is not passing. Each picture and clip is looked at against the same short list before anyone is shown it:

1. The product matches its reference photo: shape, colour, finish, printing, size against the hand.
2. The action asked for is the action shown, and it could happen.
3. Frame 1 already has the subject and the motion.
4. Real speed. No slowed or sped-up passage.
5. Visible hands and faces have sound anatomy; crops are intentional. No stray letters, logos or captions.
6. The camera is where it was asked to be.
7. The sound has been listened to by a person.

A failure is written down as 1 line (what was asked, what came back) so the next prompt says the thing that was left unsaid. That line is a lesson, and lessons are sent with every later job.

For video, watch the complete clip at normal speed and inspect the critical transitions frame by frame. Compare identity, action, spatial coherence, camera and light throughout, including the join to the next clip. A few sampled frames cannot prove that unseen motion is sound. When candidates share a fault, simplify the responsible action or camera instruction rather than generating an unbounded batch.

## 10. Spending

- The price is read before anything is made, and said.
- The smallest thing that answers the question is made first: 1 still, then 1 short clip, then the batch.
- A batch is 2 or 3, not 10, until the first ones have passed the check.
- A filter refusal or a failed job is not retried with the same words.

Test the hardest motion beat with the smallest useful authorized clip before scaling, after its starting image is approved. A later shot's independent test establishes feasibility, not continuity with clip 1. Save inputs, prompt, actual settings and outcome; change one controlling decision on the next bounded attempt.

## 11. The environment belongs to the photograph

The place is chosen from the brand's world and the buyer's moment. A lifestyle scene has a history: a mug left after breakfast, a bag by the door, a rubbed patch on a worktop. Details have a cause, rather than being random clutter. A clean studio hero remains a clean studio hero; ordinary phone realism, campaign photography and illustration are different looks.

The subject inherits the environment's light direction, shadow hardness, colour temperature, exposure, reflections and contact shadows. Shoes meet the ground; the product has weight on the surface. Changing the place means relighting the subject, even when its identity, pose and product details are locked. The product's own colours remain true; plausible reflections never recolour its material or printing.

For a phone look, the background remains recognisable, skin remains unretouched, and one or two subtle capture imperfections can help. They never hide the product, label, demonstration or planned words. Action, expression and gaze are separate decisions. A real-photo reference can preserve useful camera and environmental detail, while tagged product photos remain the product authority.

For environment design, location edits, selfies and photographic integration, read [Environment and photographic realism](references/environment-realism.md). When editing, name what changes and what stays locked; retain an approved reference rather than rebuilding the whole scene for a small correction.

## 12. Visual taste is a transferable decision

For original high-attention concepts inspired by a striking reference, read [Memorable visual ideas](references/memorable-visual-ideas.md). Decode one motif, readable surprise and payoff; translate them into the audience's world rather than reskinning the source. Explain the share/replay hypothesis, brand connection and production risk. Coherent repetition and contrast can support recall, but eccentricity, trend association and production quality alone do not establish viral reach or sales. Keep phone, podcast, native and unaware format choices intact.

A source story's relationship is transferable across genres: competing agendas, disproportionate effort, a reveal, reversal or callback can serve a trailer, documentary, POV, interview, animation, still or carousel. The same guide develops broad examples from the supplied human/cat story without requiring its cast, nostalgia or sitcom devices. Connect the buyer's tension and payoff to a supported selling point; a staged breakdown or amused reaction is not efficacy evidence.

A useful reference teaches a visual system: its central idea, camera behaviour, light, colour relationships, composition, materials and memorable detail. The brand supplies the product, people, language and world. A reference's beauty is not evidence that it converts.

Campaign coherence comes from a few chosen constants, with distinct compositions and jobs. Intentional fantasy can have convincing materials without claiming to be an ordinary photograph: name the invented device, and keep the real product and its capabilities true. For decoding references, reflection-led concepts and controlled variations, read [Visual taste and campaign direction](references/visual-taste.md).

## 13. Upscaling preserves an approved shot

For higher-resolution delivery or an approved video starting frame, [Image upscaling](../image-upscaling/SKILL.md) preserves the shot and its aspect ratio. The candidate is a separate file, reviewed against the source for identity, hands, product text and edges; actual output pixels establish its resolution. Natural texture stays, digital damage is reduced, and drift fails the upscale. This is finishing, not scene redesign or a substitute for correcting a bad source.

## 14. Camera coverage serves the frame's job

The shot specifies what is visible, where the camera is and what matters first. Choose the framing before styling adjectives: wide for context, full for fit, medium for a conversation or action, close for a reaction or selling detail. Height, angle, viewpoint and focus are separate decisions; a shot name alone leaves them open.

Use the Shot Architect method in [Camera shots and coverage](references/camera-shots.md): choose a physical camera location and distance, compatible perspective/lens cue, crop and focus, then name one visible consequence of that view. Describe the place rather than adding an imagined photographer. Check the sightline and product scale. For alternatives, change meaningful camera relationships rather than height alone; a controlled repair or locked reference keeps its approved setup. The requested output count and existing schemas win over a source's four-prompt default.

Related shots preserve identity, wardrobe, product, object state and the world's lighting while the framing changes intentionally. Camera changes are new coverage, not upscaling. For all 12 shot types, the supplied examples, D2C adaptations and continuity checks, read [Camera shots and coverage](references/camera-shots.md). Phone UGC uses physically achievable camera positions and its own focus and movement rules.

For video, place the camera physically and choose one main behaviour, including locked. Time the action and any move within the supported duration; inspect the first and last crops for the evidence the viewer needs. Keep the light sources in place, allowing perspective to change during a physical move. Prompt timestamps describe intended beats, not guaranteed timing controls.

## 15. A sequence changes what the viewer understands

Define the audience's starting interpretation, the intended change and the visible evidence that earns it. Each shot adds information through one main event; observable behavior replaces vague emotional direction. A purposeful detail or reaction hold can help the evidence register, with natural motion and real playback speed. It is not filler or a universal slower pace for UGC.

Plan start/end states, gaze targets and attention across cuts, then review the complete edit without dialogue before checking sound. Preserve approved script words and product truth; a staged reveal is not customer proof. Read [Scene direction and the audience's change](references/scene-direction.md) for the shot plan, D2C adaptations and limits of the café examples.

## What the brand brain must hold for this to work

From `products-and-positioning.md`, per product: `Looks like`, `Pack`, `How it is used`, `Visible result`, `Moves and sounds`, `Never show`, `Reference photos`.
From `brand-guidelines.md`: `Brand world` (places, surfaces and props, light, people, never in frame), `Motion and sound` (pace, camera, sound, on-screen text, formats in use), the colour palette and typefaces, the guardrails.
From `lessons.json`: every rule about how the product is opened, held and used.

A blank field is a question for the brand. It is never filled by guessing.
