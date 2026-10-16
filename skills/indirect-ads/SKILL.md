---
name: indirect-ads
title: Cold-Traffic Native Ad Writer
description: The cold-traffic variant of the native ad. The image is a moment from the buyer's life, usually the problem, chosen from the pain by asking what it looks like from the outside; it plants one question and the copy answers it in 150 to 400 words from 5 leads on a 6-part spine; the click always goes to an advertorial. The 9 image types, the 2 tests, the image rules, the copy, the headline shapes, the lines that cannot be crossed, and how to test one.
includes: native-ads
---

# Indirect ads

Written for this app from the playbook page "Indirect Ads: The Top-of-Funnel Creative That Doesn't Look Like an Ad" (`docs/ecommerce-playbook/paid/indirect-ads-the-top-of-b314`). In this app an indirect ad is a native ad (skills/native-ads) with its own image types, its own copy form (`native-ad-copy/forms/indirect-story.md`) and its own destination. The app calls it a **native ad for cold traffic**, which says who it is for; "indirect ad" is the playbook's name for the same thing. It is written from Scripts → Write scripts → "Native ads for cold traffic" (Advanced view), and by name in the chat ("/" → Cold-Traffic Native Ad Writer); the data is `src/lib/scripts/indirect.ts`.

## 1. Two ads, two jobs

Most accounts run one kind of static: the product in frame, a benefit, an offer, a button. That is a **direct** ad. It works on people who already know the brand and need a reason to buy today.

Cold traffic is not those people. A stranger scrolling at 11pm has never heard of the brand and is not shopping. Show them a product and they read it as an ad in a quarter of a second and keep going.

An **indirect** ad does not look like an ad. The image is a moment from the customer's life, usually the problem: an X-ray, a hallway, a shower drain, a sweat stain. It stops the scroll because it looks like something a friend posted. Then the copy, 150 to 400 words, tells the story and sells. The click goes to a page that keeps teaching.

| | Direct | Indirect |
|---|---|---|
| Who sees it | People who already know you | Cold strangers |
| The image | Product, benefit, offer, button | A real moment that does not look like an ad |
| Who sells | The image | The copy, then the page |
| The copy | 2 to 4 lines | 150 to 400 words, a story |
| The click | Product page | An advertorial that teaches first |
| It needs | A product people already want | A pain people already feel |

A healthy account runs both: indirect ads find new people, direct ads close the people who now know you. **Not every product has an indirect ad.** It needs a pain the customer already feels. A pure fashion piece bought because it is beautiful does not; clothing works the moment the garment fixes something (sweat-proof undershirts, compression, insoles). With no pain, say so and write a direct ad instead.

## 2. The mechanism: the image asks, the copy answers

1. **It stops the scroll by not looking like an ad.** A candid photo, a scan or a strange object gets the half second a product shot does not.
2. **It plants one question.** Why is that knee circled? Why is the pillow on the couch? Why is the dog at the bottom of the stairs? The image never answers it.
3. **The copy answers it.** The first line of the copy picks up the question the image asked; from there it is a story the reader recognises as their own.

If the image does not plant a question, it is a nice photo. If the copy does not pick the question up in its first line, the image was wasted.

## 3. The image types

Every indirect ad uses one of these (each is a type in `skills/native-ad-types`). They are not equal: some suit almost any problem product, some only one category. Four have a plainer name in the picker: Test result (medical imaging), Feared future (nightmare scenario), Headline over a photo, Drawn panels (illustration and chronicle).

| Type | What the image is | Works best for |
|---|---|---|
| Candid moment | A found phone photo of the customer's life, no product | Almost anything. The most common by far |
| Curiosity object | A strange or gross object that begs "what is that?" | Hair, gut, skin, feet, cleaning |
| Medical imaging | An X-ray, scan or lab result, with one red mark | Joints, heart, liver, sleep, anything with a test |
| Emotional scene | The feeling from the research, staged as a real scene, nobody in frame | Sleep, relationships, confidence, pets |
| Symptom close-up | The body part or the symptom, real and unflattering | Skin, nails, swelling, pain |
| Nightmare scenario | The feared future, staged as a real moment | Beauty, aging, health, safety |
| Hook headline over photo | One advertorial headline over a real photo | Pet, supplements, anything with a strong headline |
| Illustration and chronicle | Vintage ink or comic panels telling the problem's story | Pain, digestion, anything hard to photograph |
| Annotated photo | A real photo where a red circle or a handwritten note does the talking | Apparel, body, home, anything with one visible flaw |

Two more are in the playbook and **not planned by the app**: an authority figure (a candid expert in their real setting) and then-and-now (the customer then, the customer now). Both need a real person the brand has, in that person's own photo, with their say (Brand → People); a generated person is never shown as an expert or a customer, and no before-and-after of a body is generated.

## 4. Pick the image from the pain

Do not start with the image type. Start with the pain, then ask one question: **what does this pain look like from the outside?** If the pain has a test, show the test result. If it has a symptom, show the symptom. If it changes how people live, show the room where you can see it changed.

| The pain | What it looks like from outside | Type |
|---|---|---|
| Knees that ache on the stairs | The X-ray the doctor circled | Medical imaging |
| A partner who snores | A pillow and a duvet on the couch at 2am | Emotional scene |
| An old dog who stopped coming upstairs | The dog at the bottom of the stairs, shot from the top | Candid moment |
| Hair coming out in the shower | The clump on the drain | Curiosity object |
| Sweat marks in meetings | The stain under the raised arm, circled | Annotated photo |
| Looking tired in every photo | The clinic's price list for an eye lift, on the kitchen table with the post | Nightmare scenario |

The playbook's own picture for the last row is the surgeon's marker lines on a face; the app stages the step (the price list, the appointment card) and does not mark up a body. The app suggests a type from the pain's words (`imageForPain`); a person can change it. Two tests before it is built:

- **The recognition test.** Show the image to one person who has the problem, without context. They should say "oh no, that's me" or "what happened?". If they say "nice photo", it is not working.
- **The no-product test.** Cover the product. The image still makes sense, because the product is not in it.

## 5. The image rules

The device fails the second it reads as an ad, or as AI.

- **Describe a capture, not a render.** Phone snapshot, slightly tilted, on-camera flash, mixed room light, a little motion blur, a monitor's moiré. Name the imperfections.
- **Real surfaces, real clutter.** A coffee cup on the table, shoes by the bottom step, grout that needs cleaning. No studio light, no seamless backdrop, no styling.
- **The product is not in it.** Or incidental in a real scene, never the hero.
- **No logo.** The page name on the post is the only branding; the missing logo is part of why it does not read as an ad.
- **No text in the image itself.** Red circles, arrows and handwritten notes belong on a separate layer on top; a red circle drawn on a clean photo is sharper than one an image model paints in, and AI-drawn lettering is the fastest tell there is. In this app the only words a type allows are the few its skill lists; an annotated photo's note is 4 words at most.
- **People need local, proportionate skin detail.** Use zone → one or two details → intensity → camera distance/light: soft forehead/cheeks, slightly clearer nose pores, delicate eye/lip lines, varied brow hairs and subtle jaw texture. At normal phone distance keep it restrained. Preserve approved age, complexion, marks and makeup; no whole-face pore dots, gritty sharpening, dusty fuzz or invented blemishes. Read [Skin detail craft](../production-principles/references/skin-detail-craft.md) for close-zone refinements. Unaware is a messaging stage, not a reason to intensify texture or make skin the problem. Keep the image's original job; no face is added to an object, note or illustration. A person is a fictional adult of the app's invention, never captioned as a customer.
- **Complexion, undertone, age and variation are separate choices.** Preserve approved color/age and individual marks; choose only one or two local variations for new casting. A darker complexion does not demand rougher texture, and maturity does not prescribe heavy lines or spots. Retain detail in highlights/shadows without washed-out/gray color, exaggerated aging or unwanted rejuvenation. Correct exposure/light response before changing complexion.
- **Makeup does not disqualify a candid moment.** Keep approved coverage, finish and placement, with blended edges, source-consistent highlights and subtle relief. Only selected details plausible through the base remain visible; no smooth mask, powdery patches or equally strong pores/freckles under every coverage. Do not automatically strip makeup, lower coverage or turn the image into a beauty campaign. These are styling decisions, separate from the unaware message.
- **Hands are part of the interaction, not added decoration.** Use [Hands and accessories](../production-principles/references/hands-and-accessories.md) for simple pose, plausible visible digits/joints/wrist, nail beds/cuticles and approved nail shape/color/finish. Name supporting grip, true scale, overlap and contact shadows; natural occlusion does not require five exposed digits. Keep accessory count/position and material reflections without adding a manicure, prop or product to change the unaware image's job.
- **Worn details have material-specific contact.** Name position, attachment, overlap, contact and surface response: clips grip a lock with strand overlap, studs follow the approved contour with restrained reflections, and matte tattoo ink follows skin without a raised/decal edge or object shadow. Preserve count/design/scale and body-relative position. A closer study is optional only if it serves the plan; do not add the tutorial's accessories or turn them into a body problem. [Skin detail craft](../production-principles/references/skin-detail-craft.md) provides contact-focused corrections.
- **Stills do not validate animated skin.** If a separate video task animates an approved photographic person, use [Portrait realism](../production-principles/references/portrait-realism.md). Bind the clear reference and choose one readable action with compatible camera/light direction; review actual speech/blinks/turns and occlusion for face-attached texture, no crawl/flicker, contrast pumping or sudden smoothing. Allow normal blur/perspective/shading, retain approved words/identity and avoid inferring motion continuity from posed states. This does not turn an unaware still-image job into a clip-generation task.
- **Repair a symptom without changing the story.** For a visible person, name waxy smoothing, dark/repeated pores or clipped shine and its area. Use [controlled skin repair](../production-principles/references/skin-detail-craft.md) to change one local clause while keeping identity, complexion, age, marks, makeup, expression/pose, crop, camera/light and approved lettering intact. Recover subtle relief without new marks; reduce pore contrast or repetition separately; control glare without erasing gentle sheen or changing finish. Compare the same area/scale, record the change and revert failures within render limits. Keep the image's question; add no face to an object-led concept, and never turn a texture fault into a body problem or product result.

## 6. The copy does the selling

On an indirect ad the copy is the ad. The form `indirect-story` gives the writer 5 leads (story, warning, authority reversal, confession, curiosity question) and the spine under every one: the relatable problem in the customer's own words; the false belief everyone holds; what they have already tried and why it did not work; the real mechanism; a hint of the answer without a hard sell; one soft call to action to the page. 150 to 400 words. Written from real words: the phrases that land ("both hands on the rail", "wear and tear") come from the research, not from a brief.

The headline under the image is a second hook, not a product name, in 1 of 4 shapes: "Before you [thing they are about to do], read this"; "Why your [problem] [keeps happening]"; "It wasn't [what they blamed]. It was [the real cause]."; "The reason you [behaviour they are embarrassed by]".

## 7. Where the click goes

A cold stranger who just read the story is not ready for a product page with a price and a cart. The click goes to an **advertorial** (Landing pages, the advertorial kind): a page that reads like an article, teaches the problem in five reasons, and reaches the product and the offer near the end. **Never send an indirect ad straight to a product page.** With no advertorial yet, build one first; in this app approving the script drafts the page for its buyer's stage, which is an advertorial for the unaware and the problem aware.

## 8. The lines that cannot be crossed

Not legal advice. Health, beauty and supplement claims are regulated; anything near a health claim is checked before it runs.

- **No invented customers.** A first-person story in a customer's voice retells a real review or a real conversation, with permission. Otherwise it is told as the founder ("My mom...") or as the brand summarising what customers say ("Almost every couple who writes to us...").
- **No invented experts.** Never "a surgeon" or "Dr. Somebody" as the narrator unless that person is real, on record and agreed.
- **No disease claims.** The copy describes a problem; it does not say the product cures, treats or reverses a disease.
- **The image cannot imply an endorsement.** No doctor holding the product.
- **Platform lines.** Before-and-after body images, "you" statements about personal health ("Do you have arthritis?") and graphic medical imagery get flagged: "Why your partner ended up on the couch", not "Do you snore?".
- **Generated people are photographs, not testimonials.** A generated adult in a scene is fine; captioning that face as a happy customer is a fabricated endorsement.

## 9. How to test it

Two moving parts, tested one at a time:

- **Same copy, different image.** Two or three image types against the same primary text: which way of showing the pain stops this audience.
- **Same image, different lead.** Keep the winning image, test a story lead against a warning lead: which way into the story holds them.
- **Judge them on the page, not just the click.** An indirect ad can have a lower click-through than a direct one and still win, because the people who click have read 300 words and already agree. Look at the advertorial and the checkout.
- **Give them time.** Cold traffic decides more slowly than retargeting. Do not kill an indirect ad on day two for not converting like the best retargeting ad.

## 10. What this will not do

It will not save a product nobody needs: no pain, no indirect ad. It will not work without the page: long copy plus a product page is half a funnel. It will not replace direct ads: it feeds them. It will not survive looking fake: one plastic face or one AI-drawn word in the image and the device collapses. The realism is the job.
