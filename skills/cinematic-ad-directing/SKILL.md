---
name: cinematic-ad-directing
description: Direct photoreal cinematic ads with one or two adult characters, consistent scene references, timed coverage and visible performance. Use for brand films, product stories, emotional reveals, comedy or suspense; cinematic 3D animation has its own skill.
---

# Cinematic ad directing

Turn an ad's supported argument into a small film whose payoff depends on the product. The method applies to homes, workplaces, exteriors, luxury, humor and emotional stories. A bedroom, threat, weapon, particular age or horror treatment from a reference is not the format.

For manual work use this method and, when writing reference prompts, [reference and shot templates](references/scene-prompts.md). In the Creative Engine, `CARD.md` is the compact version supplied to the planner. Apply the shared [production principles](../production-principles/SKILL.md), with the cinema-specific exceptions below. The app's duration, reference inputs, cast schema and approved words remain authoritative.

## The viewer's change

Finish: "The viewer expects ___, then discovers ___, and understands the product's role because ___." Emotional shifts can be suspicion to relief, indifference to curiosity, competition to cooperation, tension to humor, or anticipation to delight. Choose a shift that serves the buyer's problem and the brand's evidence.

Open with an event already happening or a readable visual question. Do not require a slow establishing shot. Give the payoff enough recognition time, with breathing, a changed gaze or a small physical response rather than a frozen pose. A quieter beat is useful when it changes the interpretation, not a tax on every film.

## Identity and scene are different references

- **Identity:** distinct adult face, age, build, hair, skin details, wardrobe and small accessories. Neutral lighting helps inspect them; it does not light the film.
- **Scene master:** the approved opening scene defines the place, spatial anchors, product/prop states, physical light sources, shadow direction and grade. Record the characters' positions and sight lines separately from the sheet layout.
- **Matching coverage:** another setup in that same physical space. Change camera and performance while preserving the cast, set geometry, practical lights and objects' actual states.
- **Product photos:** define shape, size and artwork. Staged frames define placement and action, not product facts or proof.

Bind actual attachments by purpose, not assumed numbering. In this app one-character references have six views; a duo has three joint panels, with Character A on the sheet left and B on its right for identification. Split views are passed where the route permits. Do not prescribe a separate four-image workflow that the chosen route cannot attach. A neutral wall, panel grid or reference pose never appears in footage.

## Direct each shot

For each timed beat state its purpose, visible cast, shot size, camera height/angle, gaze target, main event, dominant camera move, light and focus. Use the existing plan's fields; put the needed specifics in the shot's visual description and tone. Do not add unsupported schema fields.

Apply the [Shot Architect camera method](../production-principles/references/camera-shots.md): camera's physical place and distance, compatible lens/perspective cue, crop and focus, plus one visible consequence. A doorway, next seat or across-table setup is more useful than height alone; do not add an imagined camera operator to the cast. Check that the visible background fits the sightline. For requested alternatives, vary camera relationships meaningfully; for matching coverage, preserve the scene and track any later action state. A locked shot or refinement keeps the approved setup. Lens numbers are direction, not guaranteed simulation; shallow focus and overhead are choices, not defaults.

Build purposeful coverage: context, a single on the acting person, listener reaction, hands or object detail, and over-the-shoulder views are choices. A single can contain one person even in a two-character film. Keep the action axis and matching eyelines; crossing the axis needs a visible motivated reset. A lamp stays fixed in the room even when its screen position changes on the reverse angle.

Describe feeling as visible behavior: fingers release their grip, the chin lowers, eyes flick to the object, shoulders ease. Give a shot one central event and one dominant camera move. Decide what is in focus; a blurred foreground and sharp face can coexist, but "everything sharp" conflicts with that plan. Give light a physical source, position, reach and falloff. Do not brighten all shadows just because the identity sheet used even light.

Let a camera move reveal one meaningful piece of information. Name the start, trigger, path, speed and arrival: a short arc can uncover the product beside the person, or a pull back can reveal the practical context of a gesture. Travel only as far as that reveal needs; reserve complex paths for wider framing and keep face close-ups short and simple. A move can settle or continue into the cut, as the next shot needs. Keep subject time at real speed unless the approved beat explicitly slows something; camera movement alone does not call for slow-motion acting. Use existing camera fields and put these specifics in `visual`, not new move enums. The bootcamp's camera guides supplement the existing camera method; [source coverage](../../docs/bootcamp-audit/video-flows-filmmaking.md) records the exact pages.

One consistent set is valid. New coverage does not require new rooms, different lighting at every cut or busy actions that erase a reaction. Camera style can vary intentionally: handheld pressure followed by a locked reveal is coherent when the shot plan says so.

## Dialogue, pacing and sound

Keep approved words unchanged. Label dialogue `Character A:` or `Character B:` and off-screen voice-over `Narrator:`. Specify each voice separately in `voice_direction` and use each shot's `tone` for delivery. Only the speaking character's mouth moves. A listener's response may play under the speaker's continuing line; never make them speak that line.

Keep each character's concise voice signature—accent, register, texture and baseline cadence—worded consistently across clips. Let local delivery change through `tone`, rather than rewriting that identity for a sad, excited or whispered line. The app can shorten `voice_direction` when fitting a long clip prompt, so place the essential signature first. A repeated description helps consistency but cannot guarantee it; listen to the actual joins. Do not add fillers or rewrite approved punctuation to imitate the course's examples.

Fit dialogue, action and recognition time into actual accepted clip lengths. Use the actual speaker pace. Do not assume a 20-second generation, exact 4K output, a universal frame rate or support for start-frame extension. Prefer a clean cut between clips when continuity chaining is unavailable. Inspect the actual join rather than merely reusing a storyboard pose.

Audio generates with the video in the current route. Follow the user's Audio, Scene sounds and Background music choices, including full silence. Optional music can build or drop out before a reveal, while selective source sounds mark meaningful contact. Cuts do not automatically need impacts. Keep voices intelligible and stable; wider room acoustics must not change speaker identity. Independent music/SFX removal after generation needs separate stems, which native combined audio does not provide.

## Broad creative directions

- **The negotiation:** two adults treat a tiny routine inconvenience like a high-stakes negotiation. A supported product feature resolves it; the understated final reaction is the joke.
- **The unexpected ceremony:** a mundane product action receives immaculate cinematic coverage. Reveal its ordinary context while retaining accurate use and scale.
- **The misunderstood gesture:** a first close view suggests one intention; wider coverage reveals a useful, thoughtful action involving the product.
- **The silent handoff:** one character notices a real obstacle and passes the relevant tool/product to the other. The response carries the emotion, without a fabricated customer result.
- **The clue and callback:** an object or sound plants a question in the opening; the supported product use explains it in the final shot, creating a coherent loop.

These are selectable devices, not fixed plots, proof claims or promises of virality. Preserve the user's chosen tone and genre.

## Check and repair

Compare stills side by side before rendering: identity, relative scale, clothing, hands, accessory counts, layout, light sources, prop states, eyelines and focal planes. Read the timed sequence as a camera operator and say the dialogue aloud. Preview the film with sound off for visual comprehension, then with sound for delivery, joins and music balance.

Check the middle and final spoken beat, including lips closing on sounds, teeth/jaw stability, gaze and the listener's silent mouth. Compare the voice at joins independently from room acoustics or music. An attractive still or opening second cannot pass the whole performance. Keep a source-to-result comparison when inspecting externally edited footage; check background people, wardrobe and motion for changes outside the requested edit.

Name a specific defect and change that controlling instruction for the affected shot. Keep other cast, light, crop and action choices stable during the test. Repair an identity drift from the identity reference, a room/light drift from the master, and timing from the shot plan. Do not silently rewrite approved dialogue or regenerate an entire film for a localized defect.

## What this reads from the brand brain

- `customer-avatars.md`: the buyer, their moment and objections. Missing context: label the proposed scene as inferred.
- `products-and-positioning.md`: appearance, pack, actual use, visible result and mechanism. Missing function or proof: omit the claim or request evidence; do not invent it.
- `brand-guidelines.md`: voice, places, palette and guardrails. These guide atmosphere without overriding physical continuity.
- `brand.json` and `offers.json`: supported claims and actual offer. Fictional characters may ask, doubt or react; they do not impersonate a founder, expert or real testimonial.
