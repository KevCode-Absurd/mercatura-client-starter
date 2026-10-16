# Image prompt architecture

Adapted from the supplied Nuova Era image prompter package and accompanying lesson (2026-10-09). Its cinematic portraits, jewellery, city locations, frozen motion and equipment are examples. Its mandatory prose-plus-JSON delivery and cinematic template do not override the user's format, product truth or the approved plan. Named renderer guidance lives in [Models](../models.md); [Harness portability](../../README.md#harness-portability) governs use across assistants.

## Choose the job

| Job | Deliverable |
|---|---|
| New image | One coherent still built from the approved scene and required references |
| Edit an image | Bound base, named change, preservation list and physical integration |
| Extract style | Observed visual recipe, inferred choices labelled, no generation unless requested |
| Lock and reuse style | Explicit style record, named scope, new subject/scene and retained constants |

Use the user's requested count. An edit does not require a new concept; extracting style does not authorize a render. Cropping, inpainting, compositing and outpainting require the selected route's actual controls. A reference attachment plus text does not establish a mask or exact region preservation.

## Subject, context, style

These are organizing lenses for the existing [direction brief](prompt-decisions.md), not a second source of creative decisions:

- **Subject:** who/what, count, approved identity or real product, wardrobe, pose, gaze, expression, contact and accessories. State only the still moment visible in the frame.
- **Context:** location, foreground/background, hierarchy, spatial relationships, support, source light, shadows and reflections. Put details where they belong; material response follows the source and surface.
- **Style:** intended medium/capture language, physical camera position, visible crop, focus hierarchy, palette relationships and local texture. Use compatible appearance cues rather than invented verified camera specifications.

Keep each input's role and exclusions explicit. Product photos control geometry/printing/colour; identity assets control the approved person; style inspiration controls only named visual choices. Light may influence appearance without authorizing a change to complexion or product colour. Specify atmosphere or film treatment only when it serves the chosen format. Phone UGC, clean studio photography, illustration and anime retain their own craft.

## Edits: current → target → integration

For real-product placement, [Product placement](product-placement.md) adds master-reference quality, verified dimensions plus a visible anchor, feasible support, and matched light/material/focus. It applies both to inserting a product into a supplied base and constructing the approved scene around it. Preserve product-presence choices and original product truth; cleanup and compositing are conditional workflows, not mandatory extra renders.

Inspect the supplied base before describing its current state. Name the changed element and area; describe the target visibly, then explain how it fits perspective, scale, occlusion, light, reflections and contact. List what stays. Resolve incompatible locks: changing a background may require relighting the subject; changing material changes its reflections. Preserve identity, product truth, approved copy and scene choices unless the requested edit changes them.

Example of an edit to a set prop, separate from the real product:

```text
BASE: the attached approved studio image.
CHANGE: the supporting display block is currently grey stone. Make only that block cream ceramic, keeping its size and position. Give it a restrained ceramic sheen under the existing side light, with the same contact shadow beneath the bottle.
KEEP: the bottle and its printing, background, crop, camera angle, text, light direction and other props.
CHECK: only the block's material/finish changes; the bottle remains supported and its label readable.
```

For a diagnosis, correct one observed symptom in its named area and compare at the same scale. Do not add unrelated skin, lens or wardrobe changes. Preservation instructions are acceptance criteria, not proof that untouched regions remained identical; review the returned image. Exact artwork or pixel preservation may require a supported compositing workflow.

## Extract and lock a style

Record observed source direction/hardness, palette relationships, contrast, material response, apparent perspective, focus, texture, mood and realism level. Identify each reference's contribution and conflicts. A visible look does not establish the source's actual camera, lens or settings. Reuse the recipe without copying its identity, branding or incidental objects.

When the user asks to lock a style, save a small explicit record:

```text
SCOPE: this campaign's three approved gallery frames.
LOCKED: soft window light from camera-left; warm neutral set; restrained contrast; clean photographic materials.
OPEN: composition, camera distance and supporting props according to each frame's job.
SEPARATE AUTHORITIES: supplied product photos and approved exact copy.
OVERRIDE: later explicit user changes replace the named field; unlock ends this style scope.
```

A style lock does not freeze a pose/crop unless named, recolour the real product, change complexion/age, or invent permanent memory. Carry the record and actual reference assets into the next session/harness. Within its scope, repeat the relevant constants in each standalone prompt. A new scene receives physically coherent lighting rather than a pasted copy of old shadows.

## Output and renderer handoff

Return the task's requested prose, structured record or application schema. When both prose and JSON are requested, they express identical intent, constraints and exact text; do not add accessories, lens settings or a new cast only in JSON. The structure below is an optional direction record, not a tool-call schema:

```json
{
  "mode": "edit",
  "base_reference": "approved studio image",
  "changes": [{
    "element": "supporting display block",
    "current_state": "grey stone",
    "target_state": "cream ceramic; same size and position",
    "integration": "restrained sheen under existing side light; same bottle contact shadow"
  }],
  "preserve": ["bottle and printing", "background", "crop", "camera angle", "text", "light direction", "other props"],
  "review": "Only the block material/finish changes; bottle supported and label readable."
}
```

Bind real files to their stated reference roles. Send model choice, dimensions, quality and other supported settings through the renderer's controls rather than assuming prose or this record sets them. Keep existing app schemas, authorization and retry limits. When comparing renderers, carry the same direction and reference authority; record setting differences and review the output against the same criteria. When only prompt writing is available, deliver the prompt, reference map, settings to select and checks to perform, with execution status stated accurately.
