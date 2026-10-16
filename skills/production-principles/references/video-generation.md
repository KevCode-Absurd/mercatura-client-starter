# Video starting points and motion review

Adapted from the user-supplied “How AI Video Generation Works” lesson, two workflow diagrams and two café stills (2026-10-09). Use their decisions as conditional rules and their scenes as examples. The practice exercise is not an instruction to buy a batch of clips or post to a community. No generated video accompanied these references.

Also incorporates the user's “Choose the Right Video Workflow” lesson (2026-10-09): choose by starting material and preservation needs, distinguish performance references from continuation, split separate events into shots and test the hardest beat before scaling.

For the supplied Nuova Era video prompter's reusable structure, read [Video prompt architecture](video-prompt-architecture.md): reference role/exclusion/owner/scope, global constants, timed triggers and completion states, and conditional editing/extension. It adapts craft without adopting mandatory extreme motion, unsolicited translations, no-music defaults or unsupported route features.

For the supplied *From Photo to Video: Keeping Skin Real* lesson, read [Portrait realism](portrait-realism.md): bind the approved appearance reference, choose one small readable action for a stability study, and review the entire movement for skin-pattern crawl, flicker, contrast pumping and sudden smoothing. Local features travel with the face through expression and occlusion; preserve identity/material character while allowing natural blur, perspective and light changes. Staged start/speaking/turn stills are not proof of a stable video.

## Choose what is fixed before generating

Retain the direction brief when adapting to a route: approved purpose/feeling, scene/action, view/light, reference roles, fixed/open choices and success criteria. Use the source image to carry the approved visual state, then describe the journey and preservation cues instead of rebuilding every appearance detail. Translate syntax/length into supported controls without changing words, product truth or format vocabulary. A new provider does not justify a new direction or a universal cinematic prompt. Review what worked and one observed mismatch; a first clip that passes requires no automatic refinement render.

State the goal in one sentence: “I need a [duration and aspect/format] video in which [subject] does [main visible action]. The most important thing to preserve is [identity, product, location or movement].” Inventory the approved images, movement footage and script before selecting a route. Preservation priorities guide the workflow; they never relax product truth or the approved script.

Audit subject, action/expression, environment, camera, light and style/texture using [Prompt decisions](prompt-decisions.md), then add timed subject/camera movement and supported sound. Name what the approved inputs/format fix and which nonessential choices remain deliberately open. Observable gaze/grip/state beats are clearer than “moves naturally”; positive direction still retains required exclusions and the format's exact words/prompt order. Before another attempt, check missing decisions, reference conflicts, feasibility and actual route capabilities as well as output compliance. Unchanged text does not establish a stable identity; more adjectives or “4K” do not create unsupported controls or guarantee execution.

| Starting point | Useful when | What remains open |
|---|---|---|
| Text-to-video | Exploring an idea before committing to a visual scene or composition | The model interprets the first-frame subject, layout, materials and light as well as motion. Repeated runs may differ. |
| Image-to-video | The approved person, product, wardrobe, environment or composition matters | A reference establishes the intended starting state; motion, timing and preservation still need review. |
| Native start/end frames | Both visual endpoints are approved and the route exposes those input roles | The journey between them still needs feasible action, camera travel and complete motion review; attractive endpoints do not prove a successful transition. |
| Performance or motion reference | A specific walk, gesture, performance or camera move matters, and the selected route supports that reference role | The footage supplies intended timing/movement, while a separate approved character reference supplies appearance. Transfer and identity preservation still require review. |
| Continuation from an accepted clip | Consecutive shots need to carry an existing state forward | Use an actual extracted end frame or supported extension route. A reference clip does not automatically force exact continuation. |
| Several events | The message needs separate context, handling and reaction beats | Plan individual shots, their state handoffs and the edit; choose a supported starting route for each shot rather than cramming the story into one generation. |

For D2C product work, text alone cannot establish exact product truth. Use tagged product references and an approved starting frame for a sellable demonstration. An image input is not necessarily a first-frame constraint: identify whether the route treats it as a starting frame, identity reference, product reference or general inspiration. Use supported controls, not an unsupported instruction disguised as a setting. Provider-specific facts live in [Models](../models.md).

After text exploration finds a useful direction, establish and approve the character and starting frame before producing a sequence whose identity must stay consistent. Repeated text-only outputs do not establish one reusable person. Keep exploration bounded by the existing generation and budget rules.

For multiple image references, bind actual uploads to explicit character, location, product and opening-state roles, resolve conflicting faces or wardrobe, and separate global scene rules from timed shot events. Read [Reference roles and a timed storyboard](reference-storyboards.md) for the supplied two-image example and execution/review choices.

## A movement reference is not a continuation request

For a recurring character, use [Casting, appearance and performance](recurring-character-motion.md): isolate a selected identity, separate face/body reference roles and choose compatible real movement. Record whether camera and environment follow the source or an approved replacement; select a source that fits the format's support, available hands and product mechanism. Review acceleration, weight shifts, feet/contact, blur and identity through turns/occlusion rather than assuming real source footage guarantees real-looking output.

Name each input's job explicitly: character appearance, product truth, opening state, body performance, camera movement or an accepted previous clip. A generic video-reference field does not establish motion-transfer support, and body performance and camera movement may need different controls. Inspect the chosen route's actual input roles before promising either. If unsupported, use the footage as planning evidence to describe simpler visible beats; do not claim its movement was transferred or pass it into an unrelated slot.

Check source movement against the character's starting pose, available hands, wardrobe, environment and the product's real mechanism. A reference walk does not make a two-handed demonstration feasible while holding a selfie camera. Keep the approved brand character and product; the movement reference's casting and location are not automatically adopted. Speech, voice and room sound also remain separate decisions unless explicitly supported and requested.

Review the entire result, especially face turns, profiles, hands or arms crossing the face, loss of visibility and reappearance. Compare recognizable identity before, during and after these moments, alongside grip, contact and product state. A good frontal frame cannot establish identity stability through a turn or occlusion. Review the intended rhythm and movement rather than assuming the source video's timing was followed exactly.

## Several events need an edit plan

Finding an object, opening it and reacting can be separate context, hand-detail and face shots when each adds needed information. Use [Scene direction](scene-direction.md) for the audience's change and [Camera shots](camera-shots.md) for coverage. For each shot record the start/end pose, object state, position, gaze and physical light sources before generating the next.

An uninterrupted action needs a compatible actual end-state handoff or supported extension. A deliberate hard cut may change the camera position while preserving established character, room and object state; do not demand identical framing across new coverage. Label planned illustrations separately from extracted video frames. Assemble the accepted clips and review the joins in the full edit.

## Describe observable motion

Read the starting image before writing the action. Record the subject's pose and gaze, each hand's position, the product state and objects available in the shot. Identify one principal action, its direction and its end condition, then one camera behaviour: locked, a modest move closer, or another movement appropriate to the format.

“More emotional” leaves the performance open. A short pause, eyes turning toward a window or a gentle breath describes something visible. Supporting expression changes should stay small enough that the viewer can follow the principal action. A compound operation is broken into sequential, feasible beats or separate shots, rather than requiring several hands or simultaneous mechanisms.

For image-to-video, spend the prompt on motion and preservation rather than redesigning the supplied scene. Keep identity, wardrobe, product geometry and printing, room layout, object count, material behaviour and physical light sources coherent. Preserve the intended framing for a locked camera. For a planned camera move, allow the corresponding perspective and parallax changes; do not also demand that every background pixel stays fixed.

Timing, duration and aspect are requested through the route's actual controls where available. A duration written in prose does not override an API setting. Speech and action fit that duration, with real playback speed. Define room sound, product sound, speech and music explicitly using the existing format rules.

For native versus independent audio, use [Audio direction](audio-direction.md): plan the sound layers early, retain approved words, and finalize cues against actual speech/edit timing. Uploaded voice samples, IDs or tags do not establish cloning, conversion or stem controls. Repair only the smallest coherent weak phrase where supported, then listen to its joins and recheck lips; review the delivered mix on headphones and phone speakers. Keep intentional quiet and format-specific music/none choices rather than adding a sound to every visible movement.

## What the café examples show

In the first supplied café still, the cup rests on the table and the subject's hand supports their cheek. In the second, a hand holds the cup near the face and the gaze has changed. This pair illustrates different visible states; it does not demonstrate how a video moved between them.

To begin from the table-cup state, a plausible plan establishes the hand leaving the cheek, reaching, gripping and lifting, with enough time for the operation. Alternatively, choose an approved starting frame already showing the cup held if the intended principal action is lowering it. Do not select the action solely from the lesson's caption when the actual source image contradicts it.

A separately generated later-moment still is a target illustration. Label it accordingly and never report it as an extracted video frame or proof of continuity. If a route supports a genuine end-frame input, an illustration may be used as that constraint only after its identity, state and geometry are compatible with the start. It still does not guarantee a natural transition.

For a continuous move constrained by both endpoints, read [Continuous motion between start and end frames](endpoint-transitions.md). Check aspect, pose, physical camera path and state compatibility before generation, then inspect the middle for geometry and identity drift. Tightening the crop lets a prop leave view; it does not authorize that prop to vanish from the room.

## Compact motion direction

For a sequence, define what each shot makes the audience understand before writing its motion prompt. [Scene direction](scene-direction.md) connects visible behavior, attention, continuity and payoff timing. One attractive clip does not establish a readable edit; review the joins and intended audience change as well.

```text
Start from the approved opening frame in its supported first-frame input role.
Starting state: [pose, each hand, actual product state and available objects].
Framing: [visible boundaries, camera height and physical position relative to the subject].
Main action: [one observable operation, direction and end condition].
Supporting performance: [small gaze or expression change, if needed].
Camera: [one achievable behaviour, start/end framing and movement timing; locked is valid].
Light: [physical sources, direction, softness and colour; stable positions in the scene].
Duration: [supported actual setting]; beats: [time range, visible event, end state].
Keep: [approved identity, wardrobe, product, scene geometry and physical light sources].
End state: [where subject, hands and product finish; how the next shot begins].
Sound: [room, product action, speech or none, music or none].
```

Use the format's existing prompt template for the final request; this is a planning aid. An exact product-use sequence remains governed by the truth sheet and lessons, and approved script words remain unchanged.

## Give action and camera a checkable timeline

From the user's “The Visual Language of AI Video” lesson: decide subject, visible action, shot size and camera position, one camera behaviour, physical light sources and actual duration. Read [Camera shots](camera-shots.md) for the behaviour choices. Time ranges describe the order and expected completion of events; they are direction to review, not a guarantee of frame-exact control.

For an illustrative six-second cup-lowering shot, first choose a source with the cup already held and a crop that includes the table contact. At 0–2 seconds the cup is held near the mouth; at 2–4 it lowers as the gaze turns toward the window; at 4–6 it meets the table and the grip relaxes. If a small push is useful, schedule that one move at 4–6 seconds and ensure its end crop still shows the contact. If the crop cannot support both reaction and contact, prioritize the shot's job or plan separate coverage. “Near the table” is not the same completed state as “resting on the table.”

The example's light comes from a cool overcast window with warmer lamps deeper in the room. This is an illustrative setup, not a default brand environment. Lowering happens at believable real speed, not slowed playback. Six seconds is an example: choose a supported duration, then fit any approved speech, physical action and recognition time into it. Do not request more action than fits or silently change the script to accommodate it.

At review, compare each planned beat with the actual clip: start state, onset, direction, contact, end state and camera timing. Check the first and last boundaries still reveal the necessary evidence. If the action finishes late, simplify it or change the supported duration before retrying; a valid image or written timeline does not establish that the motion succeeded.

## Test the hardest beat before scaling

Identify the smallest moment likely to fail: opening a mechanism, a face turn or occlusion, a two-handed grip, or a camera move through a constrained room. Establish its approved starting image first when the look matters, then run the smallest useful authorized motion test with the intended reference roles and route. An easy still or talking-head shot does not validate a difficult later demonstration.

If the difficult beat occurs later, its independent test establishes feasibility, not final sequence continuity. Keep its state assumptions in the shot plan, and review the final handoffs when producing the sequence. Do not replace the approved opening clip or chain an unrelated test frame into it.

Save the source inputs, prompt, route, actual settings, result and observed failure. On the next bounded attempt, change one controlling decision so the comparison is interpretable. A new pose, camera behaviour or workflow is an explicit change. Resolve the difficult beat or simplify the plan before paying for the whole sequence; this lesson does not itself authorize a new batch.

## Review candidates as complete clips

Repeated inputs can yield different timing and motion. A small, authorized comparison can help, but do not assume that more generations will repair an ambiguous direction. Begin with the smallest useful render and follow the existing budget and retry limits. Keep candidate lineage: source frame, prompt, route, actual settings, result and the one instruction changed.

Watch every candidate from beginning to end at normal speed, with sound as required. Then inspect critical transitions frame by frame:

| Area | What to inspect |
|---|---|
| Identity and product | The same face, wardrobe, hands, product shape, label and material throughout; no brief morphing between good sampled frames |
| Portrait performance | Stable eyes through blink closure/reopening, plausible mouth and visible teeth, skin detail attached to the moving face, and coherent hairline and background; no crawling texture or snap back |
| Dialogue and mix | Listen without watching for exact complete words, tone, pauses and a clear foreground voice; then inspect lip/jaw timing, teeth and gaze with sound. Quiet ambience must not mask speech. |
| Action | The intended operation actually completes at believable speed, with a clear start and finish; grip and mechanism follow the product's real use |
| Space | Objects maintain count, contact and weight; no cup-through-hand, disappearing props, stretching room or sudden state jump |
| Camera and light | The intended move has coherent perspective; a locked camera stays locked; illumination, shadows and reflections agree with physical sources |

Select a candidate that works as a whole. Preserve an attractive face only if the action and spatial coherence also pass. Sampled-frame automated checks are advisory; disclose unobserved motion and unheard audio rather than declaring a full pass.

If candidates share one failure, identify its controlling instruction: simplify hand choreography, choose a better starting pose, reduce the camera move, or split a compound operation. Change one meaningful instruction per comparison while retaining the approved source. A new starting frame is a documented change, not a hidden retry. Do not carry a failed end frame into the next clip.

Record specific findings for later work: what changed, what improved and what still needs review. An accepted clip establishes production quality for its intended job; advertising results require separate measurement.

For a face-led short Reel, read [Portrait realism](portrait-realism.md) for restrained texture, small performance, editable overlay timing and an optional truthful reveal. It supplements the format's approved message rather than inserting an AI reveal into every ad.
