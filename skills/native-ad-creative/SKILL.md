---
name: native-ad-creative
description: Plan the image for a native image ad - a square image that looks like a person's post (a candid phone photo, a note, a message thread, a reminder, a review card) and stops the right person so they open the story. Use after the native ad copy exists, or when someone asks for a native ad image, a scroll-stopping native creative or image concepts for a story ad. Follows an image type from native-ad-types and writes the brief for the image model. Image only - the copy is a separate skill (native-ad-copy).
includes: native-ads
---

# Native ad creative

The job: 1 image that makes the right person stop and open the story. It does not sell, explain the product or carry the argument. The copy does the rest.

It is judged on 3 things: the buyer recognises the moment at a glance; it looks taken or typed by a person, not designed; the first lines of the copy make sense of it.

You are given the approved copy with its notes, the buyer, the brand's product photos, and an image type. The type's own skill (in `native-ad-types`) follows this one and says what the image is. This skill says how every native image is briefed.

## Rules every native image shares

- Square, 1:1. It looks taken or made on a phone by a person: ordinary light, a little mess, nothing retouched, no saturated or glossy look.
- No logo, no brand name, no price, no button, no badge, no brand colours or typeface, no designed layout.
- It stops the right person, not everyone. The story does the selling: the image never explains the product.
- **The product is not in the picture, unless the person asked for it.** A native picture is a moment, never a product shot: the moment the problem hurts, the moment they notice it, the workaround, the thing that failed. With no product in it, no product photo is sent to the image model.
- **When the person asked for the product,** it is the real one (`skills/production-principles`, section 1) and it is an ordinary thing in the room: small, to one side or behind the subject, never held up, centred or pointed at. The picture still works with it taken out.
- **The old way, if it is in the picture, is nobody's:** generic and unbranded, never a rival's recognisable product, pack or label.
- **A person is a fictional adult** who fits the buyer. Hands, a back or a cropped view are often enough. No children. A founder, a customer or an expert appears only in that person's own photo, supplied with their say. Nothing in the picture says the person is a customer.
- **A borrowed form uses a generic interface:** no real app's, platform's or outlet's name, logo, colours or exact layout.
- The type's own Honesty section is part of the brief, not advice.

## Where the image comes from

From the approved copy, not from the product:

- **The moment** in the opening or the breaking point. Each hook variant's `first_frame` names one, and the copy's notes list "image material".
- **An object** the copy names: what they bought and gave up on, what they hid.
- **Words the narrator wrote or was sent** in the story: a note, a list, a reminder, a message.

The place and the time come from the buyer's own moment, and the room from the brand's world, less anything the brand says is never in frame.

## When the type you were given does not fit

The type is chosen before the copy is written, so check it against the copy. A type that cannot be made honestly from this copy and this brand's facts is never forced: its skill names what to plan instead. Say in `compliance_flags` which type was asked for and why it was changed.

## Words on the image

- **Photo types:** none, or the few the type allows.
- **Types with words:** exactly the words the type's skill lists, and no others. They are lifted from the approved copy: the note, the list or the message as the story quotes it, or the story's own lines cut down without adding a fact. Give them line by line, with who wrote each, in the case and spelling a person would use.
- **If the story has no words for the type,** write the fewest that say only what the story already says, in the narrator's voice, and list them in `compliance_flags` as "words written for the image: read before it runs".
- No product name, no claim and no result on the image. A real review on a review card is the 1 exception.
- Short enough to read on a phone. No emoji: image models draw them wrong.

The 3 choices a person can make about an ad apply like this:

- **Words on the image, off.** A type with words cannot exist without them: its skill says what to plan instead. `text_elements` is empty.
- **The base image, on (the default).** The picture is also kept without its words. Say in the layout what the blank version shows (the empty sticky note, the page with nothing written), so the words can be set or changed later without a new picture.
- **Primary text, off.** A native ad is its story. Without it the image has nothing to open: say so in `compliance_flags`, and do not move the story onto the image.

## Writing the brief

Preflight the subject, observable pose/expression/gaze, environment, camera, physical light and style/texture. Use [Prompt decisions](../production-principles/references/prompt-decisions.md) to name fixed choices from the story/type/approved references and any deliberately open nonessential arrangement. Keep the image's question and exact words first; a people-free type acquires no portrait, and unknown brand facts remain questions. Describe what should be visible alongside essential exclusions, rather than relying on “aesthetic” or adding imperfections. Before retrying, distinguish missing direction, source conflicts, infeasible action, unsupported controls and a clear instruction the image did not follow. Open exploration stays bounded by existing render limits.

1. **The scene in 1 sentence.** What a person scrolling would say they saw.
2. **Where and when.** The place, the time of day, what is within reach.
3. **Phone-photo look,** said plainly: taken on a phone, ordinary indoor or daylight, slightly off-centre, a little clutter, natural colour.
4. **The person, if there is one.** Age and look that fit the buyer, ordinary clothes, caught mid-action, which hand holds what. Never theatrical pain. For a problem on the body (skin, hair, weight), show the routine or the workaround, never the body as the problem.
5. **The words, if the type has them.** Exactly, line by line.
6. **What is not there.** No logo, no brand name, no price, no button, no badge, no product hero shot.

For photographic types with a visible person, apply [Skin detail craft](../production-principles/references/skin-detail-craft.md): **zone → one or two details → intensity → actual distance/light**. Use low-contrast forehead texture, slightly clearer nose pores, soft cheek texture with fine hairs only where light catches them, delicate eye/lip lines, varied brow hairs and subtle chin/jaw texture. Ordinary phone captures stay soft; closer portraits can reveal more. Preserve approved age, complexion, marks and makeup. No uniform dark pore dots, gritty cheeks, dusty fuzz, repeated freckles or plastic shine. Refine one selected zone when correcting a close view. Do not zoom a story moment into a macro study, add a face to a note/object type, or turn skin detail into an exaggerated body problem; this also applies to unaware creative.

Plan scene/identity/crop/camera/light before local skin and relevant approved physical details; combine compatible decisions in the initial prompt rather than requiring separate renders. Inspect the whole image at delivery size and visible face/accessory areas enlarged, then recheck the whole after one local fix. Keep the candid story and product/text; stop once the intended view works. A newly added stud or changed clip in a close view is a styling variant to resolve, not evidence that the original survived. Preserve the approved anchor; the capstone's macro hair and accessory examples add neither sharper feed texture nor features to this image type.

Separate complexion depth, undertone, adult age and one or two local variations. Preserve approved color and maturity with detail in highlights/shadows; do not wash out or gray skin, clip bright areas, over-age or rejuvenate the person. Age and complexion do not dictate texture. Fix exposure/color response before changing their look; freckles, redness and lines are individual approved details, not required flaws. Keep the candid moment and the type's original job.

Makeup can belong to an ordinary moment. Preserve the approved coverage, finish and placement; retain subtle relief and only one or two details plausible through that base at the actual distance. Blend edges and limit shine to source-lit high points, without a smooth mask, powdery patches or every pore exaggerated through foundation. Makeup is optional; do not remove it automatically to make the image candid. Changing coverage/finish belongs to a styling choice, while the image's story and identity stay intact.

For waxy skin, dark/repeated pores or clipped shine, name the affected area and use [controlled skin repair](../production-principles/references/skin-detail-craft.md). Change one local cue: recover plausible relief, reduce pore contrast or repetition separately, or control excessive shine while retaining gentle sheen. Keep the approved person, complexion, age, marks, makeup, expression/pose, crop, camera/light and product/lettering fixed; compare the same area at the same scale and record the result within existing retry limits. No new blemishes, global sharpening, matte conversion or macro reframing. The correction preserves the candid story and image type; it does not turn texture into a body problem or product result.

Where hands already belong to the scene, use [Hands and accessories](../production-principles/references/hands-and-accessories.md): simple pose, plausible visible digits/joints/wrist, approved nail beds/cuticles and polish, then purposeful object/accessory with real scale, supporting grip and contact shadows. Keep nail shape/color/finish and accessory count/position; controlled reflections follow the nail/material curvature. Hidden digits need not appear. Do not add a manicure, accessory, product or hand study to a concept that does not call for it; the object's role and the candid story stay authoritative.

Approved worn details need position, attachment, overlap, contact and material response: clips grip a lock with strand overlap, studs follow the approved contour with tiny reflections/contact shadows, and matte tattoo ink follows skin curvature without raised edges. Preserve count/design/scale and body-relative position across views, choosing a context or tight crop only when it serves the story. Use the physical-contact section of [Skin detail craft](../production-principles/references/skin-detail-craft.md); do not introduce these example details into an object/note concept or turn natural styling into a body problem.

## The headline under the image

Not on the image: it is the ad's headline field. "Read this if [something they do, or a situation they are in, in their words]." It never names a condition, a body or a trait the reader has. The copy's hook variants supply options.

## Checking the result

The list in `skills/production-principles`, section 9, and for a native image:

- [ ] Would the buyer recognise the moment at a glance?
- [ ] Does it look taken or typed by a person, not designed?
- [ ] Do the first lines of the copy explain it?
- [ ] Are the words exactly the ones given, spelled right and readable on a phone?
- [ ] Is it free of logos, prices, buttons and any real app's look?
- [ ] If skin is visible, is detail local and plausible at delivery size, with identity retained and no uniform dots, sharpening or added blemishes?

This skill makes a still image. If a separate video task animates an approved photographic person, use [Portrait realism](../production-principles/references/portrait-realism.md): bind the approved reference, choose one readable action and keep the intended camera/light simple. Review actual speech/blinks/turns and occlusion for face-attached details, no crawl/flicker, contrast pumping or sudden smoothing, allowing normal blur/perspective/shading. A posed speaking or turned-head still is not proof of motion, lip sync or continuity; no clip is generated by this lesson alone.

## What this reads from the brand brain

- **The buyer's moment.** `customer-avatars.md`, per avatar: The moment; Who they are. Blank: the moment in the copy's opening, marked "inferred".
- **The buyer's own words,** for anything typed or written in the picture. `customer-avatars.md`: Customer language bank. Blank: the copy's own lines only.
- **The room.** `brand-guidelines.md`: Brand world (Places, Surfaces and props, Light and time of day, Never in frame); Brand guardrails (Never show). Blank: an ordinary room that fits the buyer.
- **The product shown true,** only when the person asked for it in the picture. `products-and-positioning.md`, per product: Looks like, Pack, How it is used, Never show, Reference photos. `lessons.json`. Blank: leave the product out.
- **The old way.** `customer-avatars.md`: proposed `Tried before`. Blank: only an object the copy names.
