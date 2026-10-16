# Models: the facts that change

The only place in `skills/` where a model, a tool or a price is named. Every other skill says "the video model" or "the image model" and points here. Each line carries the date it was read or measured; a line older than 3 months is checked before it is relied on.

Inside the app the model for each step is set in Settings, and the app writes the prompt in that model's form (`src/lib/production/prompts.ts`). This file is for work done by hand, and for whoever edits a skill.

## Video

Measured on Higgsfield, text only, 9:16, 720p (2026-10-04): 28 credits for 4 seconds, 35 credits for 5 seconds. Read the price with the tool's own cost check before every paid call; do not quote these as current.

Seen on our own clips (2026-10-04, 2 clips, text only, no references):
- A camera position given in words ("inside the bowl, looking up") was not followed. The model rendered a side view.
- The product's colour was wrong in both clips with no photo attached, though the words named the colour.
- A clip that began before the action spent about 1 second of 4 on an empty frame.
- Sound was made in both. Nobody has yet judged it by ear.

Filter words that have caused a refusal on harmless prompts (charged like a finished clip): intimate, sensual, press, pressing, fingers close up, palm, skin, dewy, wet, glistening, bare, exposed. Rewrite once without them; a second refusal means change the idea, not the wording. Named places, shops and trademarks are refused too: describe them instead.

## Reference-scene lesson note · 2026-10-09

The user-supplied “Create a Scene with Seedance 2.5” lesson describes two images bound as `@image1` (character) and `@image2` (location), with a three-shot, ten-second, 16:9 storyboard. This records the example and its claimed reference-based workflow, not an independent verification of current provider capabilities. Use the platform's actual selector/binding and accepted label syntax; upload order and text labels alone do not establish a native starting-frame constraint. The example's duration, aspect and cinematic styling do not replace a D2C brief or phone UGC rules.

Local code inspected on this date: `src/lib/media/adapters/higgsfield.ts` still throws `MediaDisabledError` from its unimplemented submit/wait methods. The app can prepare a prompt pack; this lesson does not connect that adapter. `src/lib/media/adapters/seedance.ts` sends an ordered `images` array and an optional `reference_video_urls` field; that payload alone is not evidence that another model implements this example's exact input roles or shot timings. Confirm capabilities before a live render; intended timestamps still require review against the actual output.

## Supplied video prompter package note · 2026-10-09

The supplied `Nuova_Era_Seedance_2.5_Prompter_ChatGPT.skill` claims bracketed-prose preferences, typed audio markers, up to 50 references, 30/180-second modes, native edits, forward/backward extension, multi-keyframes and storyboard/blockout input. These are attributed package claims, not independently verified capabilities of this app or a selected provider. Its lowercase tag convention, upload-map parser, automatic Chinese delivery and routing selectors belong to its separate Night Shift workflow. Do not copy them as current app contracts. Verify a chosen surface's current documentation and controls before relying on a feature; no live render or provider evaluation was performed for this adaptation.

Local code inspected for this update: `VideoRequest` in `src/lib/media/adapters/types.ts` has ordered `images`, one `referenceVideo`, duration, resolution and aspect, with no dedicated audio-reference, edit-operation, extension-direction, multi-keyframe or typed-stem fields. `src/lib/media/adapters/higgsfield.ts` still throws `MediaDisabledError` from unimplemented submit/wait methods. The reusable [Video prompt architecture](references/video-prompt-architecture.md) adds direction and manual handoff templates, not an adapter, parser change, new mode or capability guarantee. Existing native audio/BGM choices remain authoritative; combined audio is not a promise of lossless BGM removal.

## Endpoint lesson note · 2026-10-09

The user's “Start & End Frames in Kling 3.0” lesson describes native start/end image inputs, ten seconds and Multi-Shot off for a continuous move. These are attributed lesson claims and example settings, not independently verified current provider specifications. Confirm the selected platform's actual endpoint fields, duration and continuous-shot controls before a paid render; a general image-reference list does not establish those roles.

Local code inspected on this date: `src/lib/media/models.ts` has no Kling entry, and `src/lib/media/adapters/types.ts`, `VideoRequest`, exposes `images` and `referenceVideo` without separately named native start/end fields. `src/lib/media/adapters/seedance.ts` sends the image list without explicit endpoint fields. This skill update adds endpoint planning and review guidance; it does not add a Kling connection or prove native endpoint enforcement through that payload.

## Character motion-transfer route note · 2026-10-09

The supplied character guide uses GPT Image 2 for casting/reference preparation and Higgsfield Genjutsu for performance transfer. Those choices record its workflow, not a change to the app's image or video routing. Official [Genjutsu overview](https://higgsfield.ai/genjutsu) describes Motion Transfer as retaining source movement, camera and timing while rebuilding appearance/location; Object Swap is a separate selective replacement mode. The official [motion-transfer API playground](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground) exposes video, image-reference and prompt inputs. Check the selected surface's current limits, settings and price before use; marketing claims are not measured preservation guarantees or evidence that a particular output passed review.

Local code inspected on this date: `src/lib/media/models.ts` has no Genjutsu entry; `src/lib/media/adapters/higgsfield.ts` still has unimplemented submit/wait methods. `VideoRequest` in `src/lib/media/adapters/types.ts` has a generic `referenceVideo`, which does not establish a performance-transfer or selective-swap connection. The app retains its existing casting counts, six-view single-person/three-view two-person sheets and route-specific individual panel references. No transfer was generated or tested for this lesson. Actual resolution/input handling remains governed by the upscaling route note below, not the guide's "4K" wording.

## Audio landscape route note · 2026-10-09

The supplied lesson favors ElevenLabs, lists Higgsfield, Suno, Udio and other alternatives, and contrasts dedicated audio with native video audio. Its comparative rankings, plan recommendations and model examples are attributed guidance, not current specifications or app connections. Choose by the required input/control, verify that surface's actual capability, cost and usage/export terms before use, and retain the format's music rules.

Official [ElevenLabs documentation](https://elevenlabs.io/docs/overview/intro) inspected on this date lists text-to-speech, voice cloning, voice changing, dubbing, music and sound effects. Its [Voice Changer help](https://help.elevenlabs.io/hc/en-us/articles/20349793097233-What-is-Voice-Changer) describes transforming a source voice while retaining intended tone/delivery; output still needs timing review. Its [instant-cloning guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning) requires rights/consent and recommends clean, consistent recordings. These capabilities do not establish exact timing, commercial rights for every asset/plan or a local integration. Other listed services were not independently evaluated for this lesson; no price or quality ranking is adopted.

Local code inspected on this date: `src/lib/media/adapters/index.ts` registers image/video adapters, with no dedicated speech, cloning, voice-changing, music or effects adapter. `VideoRequest` in `src/lib/media/adapters/types.ts` has no audio-reference or stem-output fields. `src/lib/avatars/voices.ts` returns a starter preview list, not a speech generator. `src/lib/production/handoff.ts`, `avatarVoiceLine`, can copy an uploaded sample into a manual pack or name a selected voice; this does not transmit it through a live audio adapter. `src/lib/media/ffmpeg.ts` normalizes/joins clips and can insert silence for absent audio; audio presence/normalization does not verify speech or mix quality. No audio was generated, cloned or listened to for this lesson.

The user's current audio workflow (2026-10-09) uses native video audio. `production.video_audio` stores the user's sound/music choices; `clipPrompt` applies them to live and manual clip requests. Audio off additionally replaces generated/uploaded audio with silence during clip normalization. Scene sounds and BGM are requested through prompt instructions, without inventing provider API switches or separate stem support. No dedicated audio adapter was added.

## Voice profile/scriptwriter package note · 2026-10-09

The supplied `Nuova_Era_ElevenLabs_Script_Writer_ChatGPT.skill` and `Nuova_Era_ElevenLabs_Voice_Generator_ChatGPT.skill` contribute compact voice profiles, separate identity/performance, optional 0–5 expressive intensity, purposeful emphasis/pauses and speaker differentiation to [Voice performance](references/voice-performance.md). Their numeric stability ranges and bracket cues are examples, not native video controls. The lesson's four variants do not override the requested script count; its personal-result skincare example is not approved evidence or a fictional presenter endorsement.

Official [ElevenLabs Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design) distinguishes voice description from preview text and advises explicit language/dialect and compatible delivery. Its [speech best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices) documents model-dependent performance tags and pronunciation; Eleven v3/v4 do not support SSML break tags. Use the chosen model's actual controls and review the result, rather than universal punctuation or numeric presets. Official [Higgsfield text-to-speech](https://higgsfield.ai/text-to-speech) offers ElevenLabs speech generation and audio export. That is a separate supported surface, not evidence that every video model's native speech uses ElevenLabs, accepts its tags or exposes isolated stems.

Local route checked on this date: `src/lib/media/adapters/higgsfield.ts` still has unimplemented submit/wait methods; manual prompt packs remain the route for those clips. `VideoRequest` has no speech-engine/voice-ID/settings or audio-stem fields. Existing `cast.voice_direction` and scene `tone` carry plain direction; clip prompts preserve local delivery in both quoted and braced speech forms without putting it inside approved words. No dedicated audio adapter or paid generation is added. The current native audio switches remain authoritative. Extracting a video's audio container retains its combined mix; it does not establish clean voice isolation. No speech was generated or listened to for this adaptation.

## Images

The app chooses the image model per step from its routing table and attaches the brand's fonts and product photos itself. By hand: give the image model the same tagged product photos as a clip would get, the exact words to set (if any), and 1 aspect ratio per prompt.

## Image prompt portability note · 2026-10-09

The supplied `Nuova_Era_Nano_Banana_Pro_ChatGPT.skill` is adapted into shared [Image prompt architecture](references/image-prompt-architecture.md), used by `image-prompt-craft`. Claude, GPT or another harness can write the same direction for either renderer; the harness still needs the actual image tool and assets.

Official [OpenAI image prompting guidance](https://developers.openai.com/api/docs/guides/image-prompting) identifies GPT Image 2.5 Sunburst (`gpt-image-2.5-sunburst`), separates settings from prompt text, and accepts multiple prompt structures. Camera specifications are appearance cues, and requested preservation still requires output review. Official [Google image guidance](https://ai.google.dev/gemini-api/docs/image-generation) identifies Nano Banana Pro as `gemini-3-pro-image` and covers generation and editing. These sources establish documented models and methods, not identical results across providers or live evaluation of this adaptation.

Local code inspected on this date: `src/lib/media/models.ts` already registers both IDs. `src/lib/media/adapters/openai.ts` uses edits with reference files and generations without them, passing size/quality separately; `src/lib/media/adapters/google.ts` passes prompt plus ordered image parts and requests the nearest supported aspect at 2K. The optional direction JSON is not either adapter's payload. No routing/default, native controls or API integration is changed by this skill update. Use the selected route's actual settings and inspect returned dimensions; the same prose does not imply the same resolution or preservation.

## Upscaling route note · 2026-10-09

The user's supplied lesson prefers Nano Banana Pro with a 4K target for a controlled generative upscale. This records the lesson's preference, not a tested result or a reason to change the normal image routing. Current app code in `src/lib/media/adapters/google.ts`, `googleImageBody`, requests `imageSize: "2K"`; an upscaling prompt alone cannot make that request a verified 4K export. Its `part` helper also reduces unsupported or larger-than-6-MiB reference files to PNG within 2048 pixels. Inspect the chosen route's input handling, actual resolution controls and returned pixel dimensions before using a 4K claim. Existing generation and budget controls still apply; upscaling is not an automatic extra render on every job.

## Tools

- In the app: nothing to choose; the step runs the model set in Settings.
- By hand: the Higgsfield connector (`generate_image`, `generate_video` with a cost check first, `jobs_wait`, `balance`). Local pictures are uploaded before they can be attached.
- Joining clips, cutting frames and adding an overlay are done with `ffmpeg` (the app bundles one). The overlay is drawn as a picture and laid over the clip; `drawtext` is not relied on.
