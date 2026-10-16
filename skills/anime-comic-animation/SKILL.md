---
name: anime-comic-animation
description: Direct original 2D anime ads for brands using locked character designs, scene geography, action key frames, timed camera and animation beats. Use for cel, manga, retro OVA, cyberpunk, deadpan comedy or emotional product stories; printed comic-page ads have their own skill.
---

# Anime ad directing

Make an original animated brand story whose product earns the payoff. The drawing fills the screen. Use the supplied tutorials as craft references, not startup instructions: do not require an artist-selection questionnaire, force uncanny imagery, promise views, or change tools because an example used them. Preserve the brand's chosen concept and tone.

In the Creative Engine, `CARD.md` is supplied to the production planner and [script-format-anime](../script-format-anime/SKILL.md) to the writer. Shared [production principles](../production-principles/SKILL.md) apply, with the animation exceptions below. For manual reference and video prompting, use [scene templates](references/scene-prompts.md). Actual route capabilities and approved words remain authoritative.

For a sequence with changing contact, effects or a deliberate mid-clip hold, use [multi-clip continuity](references/multi-clip-continuity.md), adapted from the supplied GHOST HAND breakdown. It includes a state handoff and a product-led example.

## Choose a visual language

Define outline weight, shadow shapes, palette, background treatment and motion rhythm once. The selectable looks are:

| Look | Useful traits |
|---|---|
| `cel` | Clean confident line, flat fills, two-tone cel shadows, softer painted background |
| `inked` | Tapered brush outlines, spot blacks, flat colour; bold comparison or reveal |
| `manga` | Black and white, two grey screentones, product-colour accent; use only when selected |
| `graphic-novel` | Textured ink, muted palette, deep shadow shapes; intimate or premium tone |
| `pop` | Thick outlines, primary colours, restrained halftone; graphic comedy |
| `retro-ova` | Late-1980s painted cels, hard ink shadows, subtle analog grain and colour separation |
| `cyberpunk` | Precise outlines, built urban depth, mechanical detail, dusty blues and a brand-colour focal accent |
| `deadpan-comedy` | Simple adult expressions, a calm reaction against one exaggerated graphic event |

Use descriptive traits to create original designs; artist names and franchise credits in the references are not required prompt tags. An OVA finish is a choice, not the meaning of anime. Colour is the default except selected monochrome looks. Do not add a paper page, scan, panel border or VHS overlay unless that treatment is chosen. Keep texture below the level that obscures the product or expression.

## Give the story an ad purpose

Finish: "The viewer expects ___, discovers ___, and understands the product's value because ___." A reveal, routine change, old-way comparison, visual metaphor, deadpan reaction, thoughtful gesture or product ritual can carry the turn. A fight is optional. Use one clear visual question and a payoff readable on a phone.

One impossible detail can make a metaphor memorable: an inconvenience towers above an ordinary adult, while a correctly used tool solves the ordinary problem beneath it. The exaggerated world is fiction; product use, mechanism, packaging and claims stay supported. A charge of light is not evidence of body changes or efficacy. Never imply a fictional hero is a real customer or expert.

## References before motion

- **Identity:** silhouette, face proportions, hair shape/colour, outfit, palette and distinctive accessories. A six-view sheet is the app's current single-hero reference. Neutral background and poses are for identification, not scene framing.
- **Environment:** place, spatial anchors, foreground/midground/background, light sources and palette. Reuse the same geography instead of redesigning it each clip.
- **Starting composition:** the actual opening arrangement and visible cast/props. For image-to-video it controls the first composition; identity-only references do not.
- **Difficult key frame:** previsualize a complex grip, interaction, impact, reveal or final pose before animation. Name its timed role: action target, deliberate accent hold or ending pose. Animate the approach and release around a chosen hold; a target does not freeze the whole clip.
- **Product:** actual photo defines shape, proportions, colour and label; drawn treatment does not authorize redesign.

Bind only real attached files to their purpose and actual tags. Do not assume five image slots, extra end frames or video continuation are supported. The app currently uses one original animated lead in `cast.character`; leave `cast.guest` null. For a separately requested manual ensemble workflow, keep distinct identity references and explicitly name which character appears in each shot; do not merge their traits.

## Lock geography, then direct time

State where the lead, product and obstacle stand, their distance, gaze targets and travel direction. Carry changed prop states, clothing and effects into later clips. If an interaction fails, repair the spatial relationship before adding style words.

For each clip, record entry state, timed target and exit state. The next opening inherits the last visible state, including grip, support, object position and any residue or active effect. Rebind reference roles per clip: an identity image is not an opening layout, and a mid-clip composition anchor is not an initial frame. Put concise handoffs in existing shot fields; do not invent runtime schema or assume automatic memory.

Split the accepted duration into purposeful beats: anticipation, readable action, consequence/reaction, payoff. Give each shot one main event, one dominant camera move, light direction and any motivated VFX. Faster action generally needs a steadier camera; a complex environment needs simpler action. A locked shot, lateral track, push or high/low angle is selected for the event, not stacked for spectacle.

Use the [Shot Architect composition method](../production-principles/references/camera-shots.md): physical viewpoint/distance, crop, depth and one visible perspective consequence. Match the sightline to scene geography and keep the product's true scale. Requested alternatives vary viewpoint, foreground or subject scale rather than height alone; continuity shots preserve state and fixed key frames retain their composition. Lens cues describe a drawn perspective, not photoreal optics, skin or mandatory blur. Keep the selected line and cel-shadow language.

Key poses, short holds, cel shadows, secondary hair/fabric movement, deliberate speed lines and a brief impact frame give 2D animation its rhythm. Walking or a short dash is allowed when its start, path and end are clear; split elaborate choreography into manageable shots. Do not demand perpetual real-life motion, photoreal skin or smooth 3D interpolation. Do not enforce a universal frame rate or exact two-frame effect that the route cannot guarantee.

Describe difficult contact as cause and consequence: approach, grip/contact, load or transfer, release, reaction. Name the affected object and what stays in place. Keep hand support and occlusion readable; split the event if the accepted duration cannot fit it. A planned freeze holds the chosen pose for a bounded interval; slow motion continues a small visible movement. Give each a clear entry and exit rather than contradictory instructions to freeze and keep moving.

Effects follow the event and selected drawing style. An emissive source lights nearby faces and surfaces from its actual position; when it fades, its light fades too. Record what persists at the cut. Keep product contact and artwork visible, and define any comedy or intensity limits from the brand's brief rather than importing the example's violence.

Generate longer ads in supported clips and edit the sequence. Each clip inherits identity, visual language and current scene state; it does not inherit all previous action automatically. Inspect joins and orientation, not only the storyboard stills. Chinese production directions are optional; translate camera/action/light/audio notes only when requested, preserving exact dialogue, brand names and real tags. Language alone is not a quality guarantee.

## Words and audio

Keep approved dialogue unchanged and within the actual clip's speech budget. Specify narrator off screen or hero speaking; never accidentally make an off-screen line move the hero's mouth. Allow a timed reaction or reveal pause rather than an unbroken voice track when the plan calls for it. Overlays are added in editing; no invented speech balloons or SFX lettering in footage.

Separate recurring voice identity (register, timbre, accent and speaking rhythm) from scene delivery (confident, breathless, surprised or quiet). Carry the signature across clips while changing performance as the story requires. Prompt consistency is a direction, not a guarantee of identical generated voices.

Native audio is generated with video in the current route. Follow Audio, Scene sounds and Background music controls, including full silence. Selective footsteps, cloth movement, clicks, impacts or ambience mark actual events. Music supports the voice and emotional turn; do not add a hit to every cut. Native combined audio is not independently editable music/SFX stems.

## Check and repair

Compare hero silhouette, face, outfit, palette, line weight, shadows, relative scale, hands, geography, props and product artwork across stills. Watch motion for jitter, flicker, reference-pose freezing, effects covering the product, unclear travel and drift into photoreal/3D. Verify the ad is understandable muted, then check voices, timing and sound choices.

Name one defect and change its controlling instruction for the affected shot. Lock the other decisions while testing: identity from the sheet, location from the environment, pose from the key frame, rhythm from the timed plan. Preserve approved words and do not regenerate everything for one faulty grip. Keep a short, current-shot correction list; retain necessary continuity constraints but retire resolved or irrelevant negatives instead of appending every historical failure to every clip.

## What this reads from the brand brain

- `products-and-positioning.md`: appearance, pack, actual use, mechanism and what it replaces. Missing facts: omit the claim or seek evidence; do not invent.
- `customer-avatars.md`: the buyer's moment and objections. Missing context: label the proposed hero and scene as inferred.
- `brand-guidelines.md`: palette, voice, motion/sound and guardrails. User-selected style and audio preferences guide the output.
- `brand.json` and `offers.json`: supported claims and actual offer. Fictional drama does not supply testimonial evidence.

Adapted from the existing Starpop anime craft, the supplied anime/reference-to-video lessons and GHOST HAND production breakdown. The breakdown's four clips (15 + 10 + 11 + 12 seconds) are an example, not required ad lengths, cast size, provider support or audio defaults; the original library files remain unchanged.
