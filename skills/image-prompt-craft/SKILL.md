---
name: image-prompt-craft
description: Turn an approved image plan (what the image argues, its exact words if it has any, its scene and layout) into the finished prompt for an image model that takes reference images. Use for every static ad, product-page gallery image and photoshoot frame, for any D2C product, after the plan is approved and before rendering. Covers naming each attached photo by its job, holding the product to its photos and its recorded facts, type and colour from the brand look, words on the image, layout zones, whether the picture makes physical sense, and the checks an output must pass. Not for deciding what an image says (the plan does that) or for video prompts.
---

# Image prompt craft

The plan decides what the image argues and the exact words on it. This skill turns that plan into a prompt an image model can carry out. A prompt is judged on 1 thing: the picture that comes back is the plan, on the real product, the first time.

It rests on `skills/production-principles` and does not repeat it. Examples are from made-up products in different categories.

This method works independently of the assistant/harness. Discover the selected renderer's actual tools and controls; keep creative intent separate from provider settings. For generation, local edits, style extraction or reuse, read [Image prompt architecture](../production-principles/references/image-prompt-architecture.md). Use subject/context/style to organize the approved plan, describe edits as current state → target state → physical integration with explicit preservation, and store style locks with named fields and scope. Return the task's requested format; optional prose and JSON must contain the same decisions. No mandatory cinematic treatment, duplicate output, automatic batch or assumed cross-session memory. Follow [Harness portability](../README.md#harness-portability) when moving between hosts.

Before writing, audit six decisions: subject, visible action/expression, environment, camera, physical light, style/texture. Record which are fixed by the approved plan/reference/format and which nonessential choices are deliberately open. Lead with the required subject/action and product preservation, using concrete visible cues and positive construction alongside essential exclusions. Do not override this skill's reference/text priority or add lens, skin, grain and lighting synonyms indiscriminately. More detail is not a consistency guarantee. [Prompt decisions and wrong-result diagnosis](../production-principles/references/prompt-decisions.md) covers bounded exploration and separating missing direction, reference conflicts, unsupported controls and execution failures before retrying. Unknown product facts stay questions, never exploratory blanks.

When adapting a prompt bank or an assistant-expanded prompt, compare it with the approved plan before rendering. Retain only details that serve this image: remove the example's cast, fashion brands, jewellery, incidental props, labels and claims unless approved here. Resolve capture contradictions such as a direct selfie that shows its own filming phone, a mirror selfie described as front-camera capture, or casual phone depth mixed with an extreme cinema lens treatment. Preserve exact copy, product/reference roles, identity locks and requested count/ratio. A ring light is valid when the setup includes one; it is not a universal realism cue. Explicit resolution controls govern output size, not “4K/8K” adjectives. Expansion can clarify an approved choice, never silently add another render, a new brand world or an invented product result. This check adapts AI Video Bootcamp, AI Images lessons 001, 007 and 013–015 (reviewed 2026-10-11).

Keep the approved direction record distinct from the final image prompt: purpose/feeling made visible, coherent still state, scene/view/light, reference authority, fixed/open choices and success criteria. This writer translates the plan; it does not choose a new selling argument or silently accept its own cast/style suggestions. Bind useful approved references and describe the intended change using supported route controls and the format's vocabulary. Preserve the goal, exact text and product truth when shortening/reorganizing. Retain what works after review; refine one observed mismatch only when needed rather than requiring another render because the process has a refinement stage.

## 1. The product comes first

A beautiful image of a product that is not quite the real product is a failed image.

- **Every attached image is named once, by number and by job.** Use the numbers and roles the job gives. Say what to take from each and what not to:
  - pack front: "the product as it is sold. Copy its shape, colours and printing exactly."
  - out of pack: "the product itself. Copy its shape, colour and finish exactly."
  - in hand: "its true size. Take the scale only."
  - in use: "how it is held, opened, applied or worn. Take the action only."
  - close up: "its surface. Take the texture and finish only."
  - type specimen, the brand's own designed image, a layout wireframe: a style guide or a structure only; it never appears in the picture.
  - library reference: "composition, camera and light only. Never its product, brand, words or people."
- A photo whose role names no job ("another view") is used for scale and detail only. Do not say what it shows: you have not seen it.
- **"Read the images by role. Do not blend their roles."**
- **Say which form is in the picture:** the pack, the product out of it, or both, and which is the hero. A form no photo shows (a single sachet from inside a pouch, a pan out of its sleeve, a jacket's lining) is never the hero: it is small, secondary, or left out.
- **Repeat the 2 or 3 visible facts that matter most,** from `Looks like` and `Pack` in the truth sheet, in the same words in every prompt of a set, so the product looks the same in every image: "a 30 ml amber glass bottle with a black dropper cap and a white label", "a 26 cm bare steel pan, dark grey, with a long riveted handle". Models follow words over photos, so a wrong adjective undoes a right photo. If the truth sheet does not give a fact, do not supply one.
- **The colour of the product is the colour of the product.** "Take the product's colours from the product itself, never from the background it was photographed on." Name the colour only in the truth sheet's words.
- **Positive and negative, with the failure named:** "An amber glass bottle with a dropper. Not a pump, not a jar. If it reads as a pump bottle, it is wrong."
- **Size uses evidence and a visible anchor.** Pair verified exterior dimensions, when supplied, with an observed comparison from an in-hand/in-use reference at comparable depth. Capacity alone gives no height or width; palm/wrist comparisons are not universal measurements. With no dimensions, use reliable visual scale without inventing units or ratios. A close product may appear large through perspective while retaining its real size. Product prominence comes from framing, not enlargement.
- **Printing stays as printed:** "Keep the label exactly as in Image 1: same words, same typeface, same position. Do not redraw or re-letter it." A product with no printing gets none.
- What must not appear is said in full: "There is no box and no second product anywhere in this image." A frame without people says so: "No people: no face, no hands."

For product insertion or a placement repair, read [Product placement](../production-principles/references/product-placement.md): inspect the master reference, bind scene/product/identity roles, anchor size, describe actual support and inherit the scene's light, reflections, perspective and focus. Cleanup is conditional and preserves original product truth; a readable but invented label is still wrong. These decisions also apply to an approved product scene generated from scratch.

Choose the approved placement operation: existing-scene replacement, new surface hero/flat lay, macro or product-first scene. Read the applicable [Product placement technique](../production-principles/references/product-placement-techniques.md) for its contact/material checks. Garments preserve cut, pattern scale and pose-dependent drape without changing other clothing; cylindrical labels follow curvature and occlusion without changing artwork. A macro changes framing, not product proportions. Multi-product arrangements need relative size evidence per item. Preserve referenced open/closed state and verified use; no invented components, ingredients, finishes or damage. Condensation, steam, props and luxury styling are optional brief choices, not placement defaults.

## 2. Type and colour come from the brand look

Image models cannot load a font by name. They act on attributes.

- Lead with attributes in this order: weight, width, category, case, tracking. "Bold neo-grotesque sans-serif, title case, tight tracking."
- Add the family name only when it is widely known. For a custom family, name 1 well-known lookalike or nothing.
- When a type specimen is attached, point at it: "Set every added word in the typefaces shown in Image N: headline in the headline face, small labels in the label face."
- Colours are hex plus a plain name: "#007E40 (kelly green)". Only the brand palette for added type, shapes and backgrounds. The product keeps the colours it was photographed with.
- 1 dominant tone plus 1 accent. The accent is for the punchline, the badge or the price, nothing else.
- The logo is never typed. It appears on the product as photographed, or as an attached logo file used as artwork.
- A native ad (a note, a message, a plain photo) takes no brand type, colour or logo.

## 3. Words on the image

A plan may have no words at all: a photoshoot frame, an ad made with words switched off, a picture a designer will set type on. Then there is no TEXT section, and the prompt says where the clean space is: "The top third is plain wall, left empty."

When the plan has words:

- Each is given once, in quotes, exactly, with its role, position, colour and weight: `Headline, top left, #002C17, bold: "Made in small batches"`. A line written twice in a prompt is drawn twice. Never add, drop or reword one.
- Type sits in a reserved empty zone or on a panel, never over the product or a face, and never as part of the scene (written on a wall, printed on a prop) unless the plan says so. Say where the empty space is.
- Short renders best. A headline of 3 to 8 words. A label of 3 words at most. A list of 2 to 4 points of 6 words or fewer. Tables and long panels are the hardest thing to render: few rows, short cells.
- It must read on a phone at 390 pixels wide.
- A brand name or an unusual word that came back wrong is spelt letter by letter on the next attempt.
- The block closes with the line in "Shape of a prompt".

## 4. Scene and layout

For casual UGC, controlled luxury, seasonal, vertical or evidence-backed comparison direction, read [Commercial image treatments](../production-principles/references/commercial-image-treatments.md). Capture style, context, layout and comparison are distinct choices within existing formats. Keep UGC's plausible phone support and modest imperfections; luxury follows the brand world, not a fixed beige kit. A seasonal edit preserves identity/product while allowing appropriate relighting. Vertical composition uses existing safe zones. Before/after and implied post-use results need approved evidence; matching identity and lighting alone does not justify an invented improvement. A filming phone stays outside its direct selfie; a mirror establishes the reflection and actual lettering reversal.

- Start with what the image is: "A finished product-page gallery image, ready to upload." The renderer names the shape.
- Then the scene in 2 to 4 sentences, the most important thing first: surface, background, direction and quality of light, camera angle and distance, how the product is posed, props.
- Named props render; "a messy desk" does not. Name 3 to 6 that belong to the product's real use and the brand's world.
- The layout is zones of the frame in reading order, with proportions: "Top 22%: headline band. Centre: the bottle at 55% of frame height. Right third: 3 callouts with thin leader lines."
- Callouts are spread across both sides of the product. Leader lines touch what they label. Dense copy stays out of the bottom fifth.
- A newly generated person is a fictional adult, cast differently from anyone in an inspiration reference, never presented as a customer, a founder or an expert. No children. An approved identity reference retains its selected adult rather than recasting them; authorized real people follow their own-reference path.
- For an approved recurring-character plan, use [Casting, appearance and performance](../production-principles/references/recurring-character-motion.md). Stable candidate IDs are internal selection marks: isolate the chosen face before deriving consistent body views, and remove grid/number decorations from scene inputs. Assign face and body/wardrobe roles rather than blending candidates; keep existing sheet layouts and verify actual output detail before a resolution claim. Eccentric styling is optional brief direction, not a default for every presenter.
- For an approved digital likeness or reusable presenter, use [Identity photo libraries](../production-principles/references/identity-photo-library.md). Keep the face master/originals authoritative; generated angles are reviewed derivatives. Select useful coverage within actual input limits, with separate face, body, styling and environment roles. Record asset/version and permitted changes. Sheets are optional preparation: extract a clean view for a single scene and keep the app's layouts. Background-first is optional; integrate scene light, perspective, contact and focus without changing baseline identity. No mandatory photo quota, accessory pack or extra render.
- For a face-led image, keep natural texture proportionate and check eyes, hairline, visible teeth and hands at delivery size and enlarged. Avoid etched pores and sharpening halos. [Portrait realism](../production-principles/references/portrait-realism.md) covers the approved source; portrait styling does not override the selected phone, campaign or studio look.
- Specify local skin zones and compatible camera/light modules, rather than uniform sharp pores or conflicting styles. Approved accessories need count, placement and physical attachment; a tattoo follows the body, a clip grips hair and nails follow visible hand anatomy. [Skin detail craft](../production-principles/references/skin-detail-craft.md) supplies module choices and targeted troubleshooting. Macro examples never set every portrait's texture scale.
- Build the scene/identity/crop/camera/light before tiny skin cues; then select local texture and only relevant approved details. This order is a prompt-planning method, not a compulsory series of paid edits. Inspect the full image at delivery size and visible face/accessory areas enlarged; after any local fix, recheck the whole for identity, styling, product/text and capture drift. Keep the approved anchor; a new close view with changed accessories is a styling variant, not an exact crop or proof of preservation. Approve the final still before any separately authorized animation, and stop adding detail once the intended view works.
- For an approved contact detail, specify **position → attachment → overlap → contact → surface response**. A worn clip grips a named lock with strands passing beneath/around it and slight local compression/shadow; a labret follows its approved lower-lip attachment contour with a tiny reflection; tattoo ink is matte and integrated with skin curvature/texture, without a raised/decal edge or object shadow. Preserve count, design, scale and body-relative placement across views; no floating gaps, impossible overlaps or added details. Choose a contextual or tight crop only if it serves the plan, focusing on one attachment for a study. Reflections change with the actual light, not with a new accessory design.
- For realistic people in UGC, podcast, native and unaware imagery, use **zone → one or two details → intensity → distance/light**: low-contrast forehead texture, pores slightly clearer at the nose, soft cheeks with fine hairs where light catches them, delicate eye lines, varied brow hairs, fine vertical lip lines and subtle chin/jaw texture. At selfie, scene or podcast two-shot distance keep these delicate; a close portrait can reveal more, and a macro isolates one feature. Preserve approved age, complexion, marks and makeup. Match the format's camera and sources; neither phone noise nor flash is required for a podcast. No whole-face dot pattern, black pore pits, dusty fuzz, waxy shine or crunchy sharpening. For concepts without people, do not add a portrait; unaware messaging never requires exaggerated blemishes or skin shown as a problem.
- Describe complexion depth, undertone, adult age and local variation separately. Preserve approved tone/undertone and age; complexion or age does not dictate pore, freckle or line quantity. For new casting choose only one or two local variations; locked identities keep existing marks. Retain tonal depth and highlight/shadow detail: no washed-out/gray deep skin, clipped light skin, exaggerated aging or unwanted rejuvenation. Correct exposure/color response instead of changing the person's complexion; keep the chosen scene light's natural influence.
- With makeup, specify **coverage → finish → placement → one or two surviving details → crop/light**. Bare, sheer, light and medium coverage are alternatives; preserve approved styling, complexion, age and face shape. More coverage may hide color/marks while retaining subtle relief; do not force all freckles/pores to show equally. Choose soft matte, satin or restrained dewy reflection separately. Blend base along contours, localize concealer/blush/highlight with soft edges, retain plausible lip lines and align shine with the real source. No smooth mask, powdery patches, painted edges or exaggerated pores. [Skin detail craft](../production-principles/references/skin-detail-craft.md) has targeted fixes; reducing coverage or switching finish is a styling change, not an automatic correction.
- Real light and real surfaces: "photographed, not a 3D render, not illustrated", unless the plan asks for a drawn look.
- Choose the capture look deliberately: everyday phone, lifestyle campaign or clean studio hero. For everyday scenes, name a few traces of use with a reason, keep the background recognisable and use restrained capture imperfections. Do not impose clutter or phone noise on a studio hero.
- The subject inherits the place's light, reflections, exposure and contact shadows. Match perspective, scale and sharpness. For a location edit, lock identity, pose, wardrobe, product and framing while allowing relighting; otherwise the subject looks pasted onto a new background.
- For an edit, separate `CHANGE` from `KEEP`: which element changes, which reference controls it, and which elements stay. Reuse a sound approved base for a small correction; original product photos remain the authority. For detailed environment and selfie checks, read [Environment and photographic realism](../production-principles/references/environment-realism.md).
- Decode a reference into its idea, camera behaviour, light, palette, crop, materials and memorable device. Transfer that system to the approved brand plan; do not import the reference's cast or luxury styling by default. Separate observed features from guessed lens specifications. See [Visual taste and campaign direction](../production-principles/references/visual-taste.md) for worked reference analysis.
- For reflection-led concepts, state whether the reflection is optically plausible or an intentional editorial scene within a surface. Specify its viewpoint, curvature, tint, hierarchy and phone-size readability. A pasted miniature photo is a failure. Macro crops may deliberately omit part of a face; anatomy and selling details remain sound.
- A set holds a few direction constants while its frames have distinct jobs and compositions. A controlled variation names one changed axis and what stays fixed; changing a prop's material never changes the real product's material.
- State the shot and exact visible boundaries before styling: head to toe with feet clear, waist up with both working hands, or one named detail only. Then name camera height, angle, viewpoint and focus. Distinguish diagonal high angle from perpendicular overhead and exact profile from three-quarter. For shot choices and coverage continuity, read [Camera shots and coverage](../production-principles/references/camera-shots.md). New coverage may change framing; upscaling may not.
- For shot direction, pair a physical place/distance with compatible perspective, crop and focus, then describe one visible consequence of that view. Name the location, not an added photographer. For requested camera alternatives, vary distance/viewpoint/foreground/focus meaningfully instead of height alone; label each setup and preserve approved identity, product and scene constants. A fixed-detail crop, identity sheet or local correction keeps its locks. Use the requested count and existing reference/layout/text sections, not a compulsory four-prompt batch or prose-only format. Select a camera concept before any separately authorized render; keep normal phone capture language for UGC.

## 5. Ratios

The prompt holds for every shape the set is made in; a shape is recomposed, never cropped from another. What moves is said per shape, where the job asks for it: "4:5: the headline sits above the product. 1:1: it sits to the left." 9:16 keeps words and logos out of the top 14%, the bottom 35% and 6% at each side.

## 6. The picture must make sense

A prompt is read as a real scene before it is sent: could a camera photograph this?

- **The product works the way it really works.** It opens, pours, fastens and is worn only as the truth sheet says (`How it is used`, and the lessons). If the truth sheet does not say, the product is closed and at rest.
- **Say the whole action.** Which pack or part, where it opens or fastens, how, what comes out or moves, which way, where it lands: "The dropper is lifted straight out of the neck of the bottle; 3 drops fall from its tip into her left palm." "The jacket is zipped to the collar; the storm flap is pressed flat over the zip." "Being opened" on its own is unfinished.
- **A pack's top is set by its printing.** The top edge is the edge above the name when the name reads upright. A pack tipped over still opens at that edge: say so, and say how its printing now reads, because a model draws a label upright unless told otherwise.
- **Describe every hand.** Which hand, where the thumb and fingers sit, which way the front of the product faces, what the other hand is doing. A grip a real hand can make. No hand over the label, no more hands than the people in frame have.
- Use pose → visible anatomy → nails → object/accessory → contact/light. Distinct digits connect through plausible joints/palm/wrist; only an unobscured full hand must show all five. Describe naturally hidden digits instead of adding them. Preserve approved nail shape/length/color/finish, nail beds/cuticles and curved source-consistent highlights. Name supporting fingers, correct overlap, pressure and contact shadows; keep object scale/shape/printing and accessory count/position. An example's blank tube, manicure, pinch grip or macro blur is not a product/style default. [Hands and accessories](../production-principles/references/hands-and-accessories.md) gives targeted corrections; add none to a people-free concept.
- **Something worn, shown without a wearer, is said to be empty:** laid flat, folded, or on a hanger, "with no body inside it". A model fills a garment with a person unless told.
- **Things obey gravity and scale.** Every object rests on something, hangs from something or is held. Liquid has weight, fabric hangs, contents fall downward. Sizes agree, each given against the hand or the body.
- **A result is shown only if the truth sheet records one** (`Visible result`). A picture of a result is a claim.
- **Lessons from feedback are rules.** State the right way wherever the picture touches one.

## 7. What a finished image must pass

The check is in `production-principles`, section 9 (the product against its photo, the action, hands and edges). A still adds 4:

1. A planned word is missing, misspelt, reworded or drawn twice, or there is text nobody asked for. A picture meant to have no words has some.
2. Text sits over the product or a face, or the product is cropped.
3. Something leaked beyond a reference's assigned role (its product, brand, words or person), or was added (a border, a fake button, a watermark). Keeping an approved identity reference's person is intentional, not leakage.
4. Type or colours are off the brand look, or the product took its colour from a background.
5. The subject floats, has inconsistent light or reflections, or has a different camera texture from the environment. A location edit kept the old studio light, or a small correction changed locked identity, product details or framing.

When a render fails on text, shorten the line or cut a point before trying again. 2 attempts, then change the concept, not the product.

## 8. The three tells, and the one-clause re-roll

From the playbook page "Stop Your AI Ads Looking Like AI Slop" (PB-15). Most generated ads are not spotted by the face or the light. They are spotted by three small things a person notices in under a second, and none of them is a prompting-skill problem: each has a structural fix, and the app writes the fix into every image request (`src/lib/studio/request.ts`, `slopGuards`).

| The tell | Why it happens | The fix |
|---|---|---|
| A stray colon or semicolon printed at the end of a headline | Punctuation next to the words gets printed with them | Each line of text has its own place, no punctuation as a separator, and "no punctuation at the end of any line" |
| A garbled brand tag, care label or tiny logo | Small text is where image models are weakest; asking for correct spelling barely helps | Forbid it: "no woven tag, care label, fine print or small logo anywhere in frame; every tag tucked out of sight". The real logo goes on as a layer, or the real product photo is the reference so the model copies rather than invents |
| A button with no words in it | "A button that says SHOP NOW" reads as 2 things: a button, and some words | "The words are printed inside the button shape, centred, in high contrast, correctly spelled" |

And the cap that stops a fourth line appearing: "the image contains exactly N pieces of text and no other text anywhere": no fake website, slogan, signature or watermark.

**The one-clause re-roll.** When a render comes back 90% right with 1 broken detail, do not regenerate from the brief: that rolls the dice on the face, the light, the product angle and the headline all over again. Feed the flawed image back as the reference, lock everything else in words, and change only the one clause that is wrong. Two faults are two re-rolls, one at a time, each off the newest picture. After 2 or 3 edits in a row faces and textures drift, so the app caps a picture at 3 renders (the first, then 2 mends) and keeps each try beside the last. A fault in how the product is handled or shaped is the exception: the image model keeps the pose it is shown, so that picture is drawn again with the right way written first (`studio/mend.ts`).

**Skin repairs isolate a symptom.** Name the area and visible fault before editing: waxy smoothing, dark/repeated pores or a broad clipped highlight. Use [Skin detail craft](../production-principles/references/skin-detail-craft.md) to select one controlling change: remove a conflicting smoothing cue or recover subtle local relief; lower pore contrast or revise repetition separately; control excessive shine while retaining natural sheen. Lock identity, complexion, age, marks, styling, expression, pose, crop, camera and actual light, plus product/text. Preserve approved coverage/finish; no new blemishes, sharper whole-face texture or automatic matte conversion. Compare the same facial area at the same crop/display scale, record the changed clause and revert failures. Lighting/exposure changes are separate named tests, not simultaneous texture fixes. Diagnostic stills are not matched repair evidence; existing render caps apply.

**The 60-second check, at 100%.** Every tell is invisible at thumbnail size, and the customer sees the ad full screen on a phone. The inspect step reads the render at full size: every word letter by letter, including the brand name; no stray punctuation at the start or end of a line; no tags, labels or fine print on clothing or packaging; the button's words inside it; no extra text the model invented; the product matching the real one in colour, shape, hardware and logo; hands and fingers normal. A failed check mends that one element off the image, never from scratch.

## 9. Higher-resolution finishing

For resolution-only finishing of an approved image, use [Image upscaling](../image-upscaling/SKILL.md) rather than this fresh-scene prompt. Attach the approved source, preserve shot and ratio, control resolution through supported output settings, and verify returned dimensions. Compare identity, hands, product lettering and edges against the source. Upscaling is not a one-clause correction, a redraw or a way to fix unsupported product details.

## Shape of a prompt

```
A finished {kind}, ready to use.

IMAGES, by role. Do not blend their roles.
1. {job}: {name}. {what to copy from it}. {the 2 or 3 visible facts}. {negations}. {failure mode}.
2. {job}. {what to take from it, and only that}.
3. Brand type and colour specimen. A style guide only; it never appears in the picture.
4. Reference for composition, camera and light only. Never copy its product, brand, words or people.

SCENE
{2 to 4 sentences}

LAYOUT
{zones in reading order, with proportions; where the empty space is}

TEXT (exact, nothing else; left out when the plan has no words)
{role, position, colour, weight: "words"} ...
Type: {attributes per role, pointing at the specimen}
Colours: {hex (name)} ...
Render all text crisply, spelled exactly as written. Each line appears exactly once. No other text anywhere except what is printed on the product.

PRODUCT IN USE (only when the picture shows it open, held, worn or used)
{which pack or part, where it opens or fastens, what comes out or moves and where it lands; each hand and its grip}

RULES
{people, props allowed, what must not appear, photographed not rendered}
```

## What this reads from the brand brain

It reads them through the truth sheet and the brand look the job sends. A blank field means the thing that needs it is not shown; it is never guessed.

| Document | Field | Used for |
|---|---|---|
| `products-and-positioning.md` | Per product: Looks like, Pack | The 2 or 3 visible facts, in the same words every time |
| | How it is used, Never show | PRODUCT IN USE, and what must not appear |
| | Visible result | Whether a result may be shown at all |
| | Reference photos (pack front, out of pack, in hand, in use, close up) | The job each attached photo is named by |
| `brand-guidelines.md` | Color palette, Typography; Brand world (surfaces and props, light, never in frame) | Type, colour, props |
| `brand-look.json` | Fonts and colours read from the site; the type specimen | Type attributes and hex values |
| `lessons.json` | Rules about how the product is opened, held and used | Section 6 |
