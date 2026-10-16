---
name: image-upscaling
description: Increase the resolution of an approved image while preserving its identity, product, pose, framing, aspect ratio, lighting, text and natural texture. Use for higher-resolution ad or PDP exports and cleaner approved starting frames for video. Covers output-dimension verification and source-versus-result review. Not for changing a scene, repairing anatomy, outpainting, changing an aspect ratio or inventing missing product detail.
---

# Image upscaling

An upscale preserves the approved shot at a higher pixel resolution. A prettier face, a different grip, rewritten packaging or improved composition is a failed upscale. This skill adapts the user-supplied “Upscaling” lesson (2026-10-09), with bounded retries and verification of actual output dimensions.

Read [Production principles](../production-principles/SKILL.md) for product truth and render checks. Model preferences and the app's current resolution limits are recorded in [Models](../production-principles/models.md). Do not choose a model from the lesson without checking the available route and resolution controls.

## Establish the source and target

- Use the approved image as the primary reference. Inspect it at full size first. An unapproved face, wrong label or broken hand needs a correction workflow before upscaling.
- Record the original file, pixel width and height, aspect ratio, and requested output size or resolution tier. Keep the same orientation and aspect ratio. “4K” in a prompt does not set output dimensions; use a real resolution control where supported and report the dimensions returned.
- Keep the source untouched and save every candidate separately. A generated larger version remains a derived asset, never a new authoritative product photo.
- Upscale when delivery needs more pixels or the approved video starting frame lacks useful clarity. More pixels alone do not guarantee better video or recover details the source never contained. Use the video model's input limits when preparing a starting frame.
- A plain resize can provide dimensions without recovered detail; describe it as a resize. If the available tool cannot meet the target, report the limit rather than calling a smaller image 4K.

## Preserve the shot

Lock identity, facial structure, expression, gaze, pose, body proportions, every hand and grip, hairstyle, wardrobe, jewellery, product shape, material, colour and printing. Also lock camera angle, perspective, crop, composition, object positions, background, colour balance, lighting, exposure and shadows.

Recover visible texture cautiously: pores, fine lines, stubble, hair strands, fabric weave, seams and surface wear. Reduce compression blocks, pixelation, ringing and low-resolution softness. Preserve photographic grain and intentional phone-capture imperfections. Do not erase real texture as “noise,” add a beauty filter, invent fine print, or sharpen edges into halos. Detail that cannot be inferred reliably stays unresolved.

For exact labels, logos and typography, compare against the approved source letter by letter. Generative enhancement can alter small text. If exact preservation fails, retain the original or finish from authoritative artwork in the existing design workflow; do not silently substitute newly invented lettering.

## Prompt for a generative upscale

Use the provider's resolution and aspect controls separately from this prompt:

```text
Image 1 is the approved source photograph and the authority for this shot.
Increase resolution and clarity only. Preserve the exact shot and original aspect ratio.

KEEP: facial identity and proportions; expression, gaze and pose; body and hands;
hair, wardrobe and jewellery; the product's shape, colours, material and printed words;
camera angle, perspective, framing and crop; every object and its position;
colour balance, exposure, lighting direction, shadow softness and reflections.

RECOVER ONLY EXISTING DETAIL: natural skin texture, fine lines, individual hairs,
fabric weave, seams, existing material texture and clear object boundaries.
Use restrained sharpening and reduce compression damage and low-resolution softness.
Preserve natural photographic texture and intentional grain.

Do not reframe, redesign, retouch beauty, warp anatomy, change the product or lettering,
add gloss, invent detail, or add or remove objects, text, logos or graphics.
The result is the same photograph with more pixels and clearer recoverable detail.
```

## Compare before accepting

First read the returned file's actual dimensions: they must satisfy the requested target and preserve the source ratio. A padded, cropped or stretched export fails. Allow only documented pixel rounding where the provider's fixed output sizes require it, and disclose it.

Compare source and candidate side by side at the same displayed size, then inspect matching regions at 100%:

| Area | What must remain |
|---|---|
| Face | Eyes, nose, jaw, lips, eyebrows, proportions, expression, gaze and natural texture |
| Hands | Count, finger shapes, joints, grip, placement, jewellery and held objects |
| Text and product | Every character, logo, colour, contour, closure and material detail |
| Edges and scene | Hair, eyewear, thin objects, overlaps, reflections, background geometry and light |

Sharpening is not sufficient evidence of success. Record pass, fail or needs human review and name any drift. Do not claim a comparison happened without inspecting both images.

If a candidate drifts, discard it as the new base and retry from the untouched source with that failure addressed. Within the authorized spend, make at most two attempts before returning the source and the limitation. Do not run repeated upscales on drifting candidates. A provider error or refusal follows the existing retry policy.

Deliver the source and accepted candidate, actual before/after dimensions, preserved ratio, method and review result. Use an accepted upscale for subsequent video or export; an unreviewed candidate remains separate.
