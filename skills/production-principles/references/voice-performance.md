# Voice identity and spoken performance

Adapted from the supplied Nuova Era voice-profile and scriptwriter packages and accompanying lesson (2026-10-09). Their villains, perfume narrators, horror arcs, four variations, installation steps, numeric settings and personal-result UGC are source examples. They do not select a provider, change an approved ad, establish a real endorsement or authorize audio generation. Use this method from any assistant under [Harness portability](../../README.md#harness-portability); route-specific facts live in [Models](../models.md).

The current workflow directs voice together with video. These decisions improve the assisting scriptwriter and production handoff; a separate speech generator is optional when chosen and supported. Voice direction cannot guarantee a perfect take. [Audio direction](audio-direction.md) owns audio switches, mix and repair; [Dialogue performance](dialogue-performance.md) owns on-camera timing and sync.

For a digital likeness or reusable fictional presenter, [Identity photo libraries](identity-photo-library.md) covers connected short clips and versioned visual/voice authorities. Visual permission does not authorize a voice clone. Keep an authorized saved voice recognizable across environments and cuts, with full phrases timed to each shot. A descriptive prompt alone is not verified cloning. Voice conversion is optional through a supported route; check the actual result and lip sync after any voice change rather than assuming the original timing survives.

## Keep three records distinct

| Record | What belongs here | What stays out |
|---|---|---|
| Canonical script | Approved words, speaker/turn order, product names, claims and offer | Performance tags, phonetic substitutions, invented personal results |
| Voice identity | Selected/authorized voice or sample; language/dialect, perceived vocal age when relevant, pitch/register, timbre and characteristic rhythm | A new identity for every emotional beat; room/music baked into the identity |
| Performance | Who addresses whom, intention, energy, emphasis, useful pause position and phrase ending | New words, a new selling argument, automatic shouting or silence at every cut |

An approved saved voice/sample wins over a proposed profile. For a new fictional voice, infer only ordinary creative choices within the brief and label important open choices. Appearance alone does not establish dialect, vocal pitch or personality. Define the audible sound rather than relying on a demographic label. Use a compact profile, usually two to five sentences by hand, then translate into the route's available fields; no need to fill every descriptor.

Example: “English, the project's approved regional variant. Warm mid-register voice with a lightly textured timbre and conversational rhythm. Speaks to one listener, with restrained energy and clear phrase endings.” The identity stays recognizable when the speaker becomes curious or reassured. Keep preview words representative of the intended performance rather than testing a quiet narrator only with a shouted line.

## Use intensity as direction, not a provider slider

The source's optional 0–5 scale describes performance: 0 restrained/neutral, 1 gentle character, 2 clear personality, 3 strong expressive movement, 4 theatrical contrast, 5 deliberately exaggerated. Translate the chosen level into audible behavior. It is not loudness, speech speed or a universal API setting. An ordinary conversational ad may need only small inflections; a comedic character may use a stronger contrast. Preserve the selected format and explicit energy/pace rather than imposing a dramatic arc or low intensity everywhere.

Keep only a few compatible descriptors. “Warm with restrained urgency” is performable; asking for whispering, shouting, maximum calm and panic together is not. No forced breathiness, chuckle, growl, sigh or accent just to make a voice unique.

## Write for a performance that fits

During drafting, read the hook/body aloud at the intended pace. Mend tangled phrases before approval and include pauses or reactions in the time budget. An emotional progression follows the script's actual turn: curiosity can become clear confidence without turning a demonstration into panic. Preserve whole natural sentences, varied rhythm and the app's copy priorities. Provide the requested number of interpretations; four versions are not a default.

After approval, change delivery separately from the words. Name a useful emphasis and where a clause settles, not an emotion tag on every sentence. Do not insert fillers, extra laughs as spoken words, capitalization or punctuation changes into canonical copy to force expression. Keep pronunciation notes separate; use a supported pronunciation control if available. If timing cannot hold complete words, revise the authorized timing or return the text to script revision rather than silently cutting it.

For dialogue, assign a stable voice to each existing speaker and give the turns distinct behavior. A listener stays silent; off-screen narration moves no mouth. Keep roles, voices and intended acoustic space across cuts. Natural breath within speech does not mean a new pause at each shot change.

## Translate for the current route

In Creative Engine, retain the existing output schema. Script drafts keep spoken text clean; place meaningful production notes in `visual_note` or `notes`. Production puts a compact stable profile in `cast.voice_direction` and a concise local delivery cue in each spoken scene's `tone`. A saved avatar's voice remains authoritative. Keep `dialogue` exact, overlays/captions separate and each speaker named using the selected format's existing convention. Do not invent voice IDs, new speaker fields or numerical controls.

Example of separate direction for an approved line:

```text
WORDS: "The lid snaps shut, so the contents stay inside."
VOICE: the approved warm conversational voice, same identity throughout.
DELIVERY: matter-of-fact; lightly emphasize “snaps shut”; finish clearly.
TIMING: finish the line inside its shot allocation; no extra pause on a cut.
```

With native video, use plain delivery descriptions outside the quoted/braced speech. Respect Audio off, scene-sound and BGM choices. Provider-specific bracket tags, pause markup and stability settings belong only in a supported speech route's separate render text/settings; they are not automatically accepted by video. Do not confuse a placeholder such as `[PRODUCT NAME]` with a performance cue. When a supported dedicated voice route is chosen later, translate the same identity and performance record without rewriting the ad or making a new policy for a different assistant.

## Hear the result before accepting it

Review complete words and pronunciation, recognizable voice, intentional stress/pauses, appropriate energy, phrase endings and consistency through joins. Check for read-aloud tags, unintended speakers, clipping and music/room masking. Then review actual mouth timing and visible reactions with picture, including the full repaired turn. A convincing voice description or transcript is not a listening pass.

Name one failure and change its controlling choice: a word mispronounced, an emphasis misplaced, a turn too theatrical, identity drift or an ending clipped. Retain a first take that passes; extra takes follow an observed need and existing budget/retry rules. Native combined audio can be reused as a complete mix, but container extraction does not isolate a clean speech stem. Claim isolation only when supplied separately or actually separated and reviewed; otherwise retain the background or choose a supported repair workflow.
