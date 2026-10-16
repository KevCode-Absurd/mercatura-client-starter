# Reference roles and a timed storyboard

Adapted from the user's reference-driven café scene exercise and two stills (2026-10-09). The café, casting, three-shot structure, ten-second duration, landscape format and cinematic look are examples, not defaults. Model-specific claims and current app routing notes live in [Models](../models.md). This guide does not request rendering the exercise.

Also incorporates “From One Image to a Complete Scene” and its three-panel illustration (2026-10-09): retain an approved source, derive coverage, animate shots separately and refine cuts and sound. The illustrative 12–15 seconds and sharing exercise are not a generation or publication request.

## Bind roles to the actual attachments

Before writing the storyboard, make a small reference manifest: actual file/upload identifier, actual attachment order, provider label and role. Use the selected platform's real reference selector or API binding. Typing a label into prose does not attach an image. Label spelling, case and numbering must match that route; do not silently copy a different platform's notation.

For larger sets, add relevant exclusions, named subject/prop ownership and scene scope using [Video prompt architecture](video-prompt-architecture.md). Bind subjects individually rather than by a collective range; only the scene's relevant inputs apply. Track an object transfer explicitly so the next shot does not duplicate it or return it to the old holder. A reference collection does not enlarge the format's allowed cast or supported input slots.

| Role | What it governs | What it does not automatically govern |
|---|---|---|
| Character | Approved face, hair, distinctive features and chosen wardrobe | Location, product geometry, another person's identity or opening pose |
| Location | Layout, surfaces, physical light sources and approved props | A conflicting face, outfit, competitor product or undocumented mechanism |
| Product | The brand's actual shape, printing, size and use, from tagged views | A product glimpsed in a lifestyle reference does not replace these views |
| Opening frame | Actual initial pose, grip, composition and object state, through a supported first-frame input | An identity or location reference is not necessarily an enforced starting frame |
| Native end frame | Intended final composition and state, explicitly bound to a supported end-frame input | A guarantee of coherent motion between endpoints or proof of the resulting frame |
| Planned shot/end illustration | Intended coverage or later state | Proof that a transition occurred, or a native end-frame constraint unless explicitly bound as one |

Inspect all references together. If faces, hair, wardrobe, object count or lighting conflict, resolve the conflict in the references or choose one explicit authority for each field before rendering. A location image's incidental person can be excluded from identity authority, but a different sleeve in a hand detail still needs correction. Do not ask a model to average conflicting identities. The approved brand person, product, voice and world remain authoritative when adapting inspiration.

The supplied pair illustrates compatible dark wavy hair, a gray-brown checked jacket and cream knit top, with rainy windows and warm interior lamps. This is a visual consistency observation, not verification of identity. It is a different wardrobe from earlier café examples; do not merge lesson sets into one character reference pack. The wide still already shows the visitor approaching, a cup on its saucer, an envelope on the table and the woman's hand at her cheek. If bound as the opening frame, begin from that state rather than claiming he starts outside or her hand is already beside the envelope. The portrait's camera-facing gaze does not establish a gaze toward the visitor.

## Derive coverage from one approved image

Check the anchor before deriving angles: face, visible hands, product/prop geometry and printing, count, wardrobe and light. Correct visible faults in an approved replacement first. Keep the original and its approved replacement history available; otherwise each new angle can inherit a mistake or compound drift from an already changed image.

For every derived shot, record its source, camera change and intended action-state change separately. A different viewpoint alone does not move a hand, open a package or advance a visitor. If the shot starts later, state the new pose and object state explicitly and explain the cut from the preceding action. Compare each candidate directly with the approved anchor and authoritative product photos, not only with the most recent derived image. Keep identity and room constants while perspective changes. A new angle that reveals an undocumented product side or mechanism needs supporting evidence, rather than invented detail.

Choose only coverage that adds information: context, a precise action/detail, and recognition are options, not a required three-shot formula. Approve the still for each shot before paying for its animation. The still must support that shot's initial action: a hand already touching an envelope can press and relax; a hand at the cheek must first reach it. Preserve the actual checked sleeve and knit cuff instead of copying a conflicting color adjective from the example prompt.

The supplied illustration is one labeled montage of wide, hand-detail and face views. Treat it as a coverage board, not three original upload-ready frames or evidence of a finished sequence. Use separate approved source images for actual shot inputs; panel labels and dividers do not belong in generated footage. The hand position changes between the wide and detail panels, while the face view crops the table out. Plan that change rather than reporting it as verified continuity.

## Keep global rules separate from shot events

A reference-based scene prompt can be organized into the blocks below. Translate them into the route's accepted form and prompt limit; the headings themselves are not API controls.

```text
Reference roles: [actual labels and their field authorities; exclusions if needed].
Global setting: [approved room geometry, prop positions, physical light sources].
Character: [approved identity, wardrobe and any separately described visitor].
Performance: [audience's intended change, expressed through visible behavior].
Storyboard: for each shot, [time range, crop/position, one camera behaviour,
  one main event, start/end state, cut or brief live hold].
Sound: [room bed, event sounds with their beat, speech or none, music or none].
Actual settings: [supported duration, aspect and other selected controls].
```

Global rules remain stable across cuts. Each shot says what changes and what the viewer learns. A lateral move belongs to the wide shot, a modest push to a detail, and a locked close-up to a reaction only when those choices serve the actual brief. They are not simultaneous moves imposed on every shot. A held expression retains natural motion rather than freezing the video. Preserve real speed and the approved speech.

For a D2C adaptation, establish the use context, isolate a documented mechanism, then let the viewer recognize its function. Choose coverage and timing from that message, not the envelope plot. Do not turn a generated reaction into a testimonial or unsupported result.

## Choose how to execute the storyboard

If the route supports a single generation with multiple shots, the timed storyboard requests an intended rhythm; inspect the actual cuts and durations afterwards. When it does not, generate supported individual shots and assemble the edit. Neither route guarantees identity, prop state or timing. General multimodal input support alone does not prove multi-shot or frame-specific control. Planned duration/aspect must agree with the actual request settings.

For a continuous take using native start/end inputs, use [Endpoint transitions](endpoint-transitions.md) instead of a cut storyboard. Keep the route's multi-shot mode off when such a control exists, and inspect the full journey rather than treating the endpoints as proof.

For independently animated coverage, bind each approved still to that shot's supported starting-frame input and direct one simple action. Generate enough for the action to complete and a useful live hold, using supported durations and the existing budget. A finished edit's target length is not the required generation length for every source clip. Record the useful in/out points after watching the actual footage; planned timestamps do not establish available edit handles.

## Assemble actions once and connect the sound

Arrange accepted shots in the intended argument order with simple cuts when appropriate. Check each join for visitor/subject position, hand placement, gaze, product state and action direction. Trim repeated steps so reaching, opening or approaching does not happen twice. Preserve enough lead-in and completion to understand the operation; a trim must not hide impossible movement or manufacture a product result. Keep approved spoken words whole and in order.

A separate-angle cut can skip time deliberately, but must preserve the established world and make the state change readable. Do not force every new angle to start on an identical previous-frame composition; reserve literal frame continuation for uninterrupted motion. If a state jump confuses the story, use a compatible starting still or another necessary action cue rather than concealing it with a decorative transition.

Use a coherent room-ambience bed across the edit when the scene stays in one place. Adjust the individual generated ambience layers to avoid abrupt room changes or doubled rain/hum, retaining approved speech and meaningful product sounds. Align footsteps, paper contact or a real mechanism sound with its visible beat; stop or soften them when the action stops. Match perspective and level across cuts, and listen to the complete mix for gaps, clipped sounds and voice changes. The café's rain and optional dialogue are examples, not a reason to add rain, music or new script words to a brand ad.

## Review story, then continuity

First watch the full edit for the intended audience change. Then inspect each cut for face and wardrobe, hand position, envelope/product shape and position, gaze target, light sources and sound alignment. Approaching footsteps stop when the visitor stops; a quiet room bed continues across cuts unless the scene changes. Review with sound as well as without it.

Judge derived stills, individual motion clips and the assembled edit separately. Good reference images do not prove good motion, and good individual clips do not prove readable joins or coherent sound. Record which cut, visible cue or live pause makes the message clear, alongside any unreviewed audio or motion.

Refine the instruction tied to the failure: a smaller observable smile for an exaggerated reaction, a corrected hand start for an impossible gesture, or less approach time and more recognition time for a rushed payoff. Change one controlling decision per bounded comparison and record it. Retiming may help recognition only when the necessary visual cue exists; it cannot repair inconsistent identity or invented product behavior. See [Scene direction](scene-direction.md) and [Motion review](video-generation.md).
