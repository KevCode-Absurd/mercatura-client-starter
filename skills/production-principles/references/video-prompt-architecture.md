# Video prompt architecture

Adapted from the user-supplied Nuova Era video prompter package and lesson. Use for reference-heavy clips, timed action, dialogue and a requested edit or continuation. This is reusable direction, not an installation of the source package or a provider connection. Route-specific facts and attributed package claims belong in [Models](../models.md).

## Pick the operation before writing the prompt

Use the approved brief, actual inputs and preservation priorities to distinguish a new clip, matching coverage, performance transfer, continuation, transition or local edit. A video reference can supply one of these roles; it does not automatically support all of them. Confirm the route's actual inputs before choosing syntax or promising preservation.

One simple event needs one concise motion prompt. A requested sequence needs shot plans and handoffs; split generations only when the route, action complexity or edit requires it. A source's “one prompt per brief” rule cannot squeeze an entire approved campaign into one render. Long-form stages organize state changes; short clips do not need a stage hierarchy or fixed beat quota.

Keep duration, aspect, resolution and any mode switches in actual supported settings. The prompt's timeline must agree with those settings. Titles and bracketed headings organize a manual handoff; they are not API controls or evidence of better parsing. In the app, retain its existing output schema and the selected format's prompt order.

## References: role, exclusion, owner and scope

Before the timeline, map each real file/upload to its actual bound tag. Use the platform's attach order and selector, not another application's upload-map parser. Rebind per clip; no invented filenames, unresolved tags or collective “images 1–4 respectively” mappings.

| Input | Record |
|---|---|
| Identity | Named subject; approved face/body/wardrobe; exclude incidental background or another person's traits |
| Environment | Location, spatial anchors and physical lights; exclude incidental cast and unsupported products |
| Product / prop | Authoritative geometry/artwork; current holder or support; where and when it appears |
| Performance footage | Body action, camera or pacing only as supported; exclude source actor, wardrobe, world and soundtrack unless selected |
| Voice / sound | Identity, delivery, words or atmosphere as separately supported; exclude unrelated noise/music; a sample does not create an audio-reference field |
| Boundary / key frame | Opening, timed target or ending state explicitly; other appearance/style inputs supplement rather than replace that arrangement |

Only relevant references belong to each scene. Specify “A holds the product; B's hands are empty” when ownership matters, and name the transfer beat before B receives it. Do not blend faces, swap outfits or make every supplied object appear together. In product-only or single-lead formats, a reference pack does not authorize an extra cast member. A reference excluded from identity can still be used for its approved camera or location role.

When sources disagree, choose an authority per field before rendering. A style reference cannot override the product photo, and a new outfit reference cannot silently replace approved wardrobe. Use essential, specific exclusions where leakage is likely; avoid a giant generic negative block.

## Separate constants from changes

Set the world and approved subject traits once: geography, physical lights, visual language, identity, wardrobe, product truth and voice signature. Let supported references carry known appearance instead of repeating a whole face description at every timestamp. Photoreal texture is proportional to crop/light; anime and material-animation formats keep their own surface language.

Each beat defines a trigger, one primary visible change and a visible completion state. Describe emotion through a few relevant cues: after seeing the closed case, the shoulders ease and the gaze returns to the task. If the intended read is easily confused, clarify it locally—relief rather than distress—without forcing an extreme performance.

For a moving object, record origin, support/holder, path, contact or endpoint, release and what remains afterward. A placed object stays on the surface; a cap remains where it was put; a pour changes the contents. Track count and ownership through occlusion. Do not have the next stage reset quantities or recreate a prop that left the room.

Camera and subject action are separate. Choose a physical starting view and one dominant behaviour, including locked, using [Camera shots](camera-shots.md). Repeated framing, continuous takes and live reaction holds are valid. A change in crop need not move the light source or relight the room. Use a new cut only when it supplies new evidence, not because a source demands framing rotation every beat.

## A compact timed handoff

Use these labels for manual work when useful; map their contents into existing plan fields for app work. Omit blocks with no job. All placeholders must be resolved before execution.

```text
Reference roles: [actual tags → named authority + relevant exclusions + scene scope].
Global setting: [space, lights, palette, materials and chosen capture/animation style].
Subjects and ownership: [approved cast; product/prop holder, support, count and starting state].
Core performance: [the visible change the viewer must read; a few observable cues].
Timeline within [accepted duration]:
[start–end] [visible subject and reference scope]. Camera: [physical view and one behaviour].
Action: [trigger → ordered operation/contact → completion]. Light: [actual sources].
Sound: [enabled cue at contact or quiet; speaker and exact approved line if any].
End state: [pose/gaze, holder/support, product state and persistent effect].
Next beat/cut: [new evidence and inherited state].
Audio choices: [voice, scene sounds, BGM or silence from the user/format].
Keep / correct: [stable invariants and only relevant current failure constraints].
```

Fit recognition and complete speech around the physical event. Use unequal beat lengths where the action needs them; timestamps express intended order and rhythm, not frame-exact enforcement. A contact cue may help the event read, but sound cannot imply a mechanism the product lacks. A final live pause or edit handle is useful only when the approved sequence needs it; no mandatory three-second hold or fade-out.

Preserve exact words, speaker and language. Voice signature and emotional delivery are different decisions. Translate production instructions only when requested, leaving actual tags and approved spoken text intact; do not convert Japanese dialogue to romaji or add an unsolicited second-language prompt. Braces, angle brackets and subtitle markers are used only if supported by the selected workflow. The app's captions remain editing overlays. Native combined audio is not editable stems; current Audio, Scene sounds and BGM choices win over the source's no-music convention.

## Scope an edit or continuation

For a supported video edit, name the accepted source as the editing master, the time/object/region or audio change, the target reference's limited role, and the content to preserve. A subject replacement inherits the original path, visibility and occlusion; it does not introduce a second instance. Background changes may require coherent relighting while keeping the chosen subject/action. Review the full result for unintended changes; an edit prompt does not guarantee identical frames or isolate a flattened soundtrack.

For supported forward extension, inspect and describe the actual last visible pose, grip, object state, camera direction, light and ongoing sound before the new event. For backward extension, describe the preceding event and make the source's first visible state the target arrival; do not leak later props into the earlier scene. If extension is unavailable, use an accepted extracted boundary frame in a supported role or plan a clean cut. Do not claim a generic video input forces boundary alignment.

For a transition, define before state, trigger, camera/process and arrival state. For a storyboard grid, state reading order and exclude grid lines, labels and placeholder style from the final footage. For a blockout, map each placeholder to its final subject and say whether motion/space or detailed structure is inherited. These are conditional planning roles, not newly supported app modes. Keep approved sheet layouts and use actual available panel/input handling.

## Trim and review

Shorten repeated adjectives and duplicate rules before removing a reference binding, contact path, exact line, state handoff or selected style. Keep a specific correction beside its affected beat; retire irrelevant negatives. Review the entire clip and edit for intended audience change, identity, prop ownership/count, contact, camera, light, complete words and sound. Compare each beat's actual onset/completion to the plan. Fix one responsible instruction within existing render limits; a passing result needs no compulsory extra take.
