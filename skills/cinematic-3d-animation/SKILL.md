---
name: cinematic-3d-animation
description: Make a cinematic 3D ad for any D2C brand - every frame a still from a premium 3D animated feature film that renders light and materials like a photograph. It works when the characters are believable stylised adults (adult proportions, refined faces, slightly enlarged expressive eyes), when light and materials are photographic, and when the same 3 blocks of wording open and close every picture. A planning step is sent CARD.md, not this file.
---

# Cinematic 3D ad

1 look: a still from a premium 3D animated feature film that renders light and materials like a photograph. It is a way of rendering and nothing more. It never decides what is in a scene: the story comes from the script, and this skill decides how the world is designed, lit and rendered. It carries home scenes, feeling, exteriors, the product alone and mechanism shots equally well.

## What it is judged on

1. **Believable, stylised characters:** adult proportions, refined faces, slightly enlarged expressive eyes.
2. **Photographic light and materials:** real reflections, fabric weave, wood grain, glass, wrapped around designed animated forms.
3. **Each character is the same in every clip.**
4. **The product is accurate,** its label copy included, and the picture claims nothing the brand's facts do not.

## What this rests on

- `skills/production-principles/SKILL.md`: tagged reference photos, a still before a clip, the first frame, real speed, materials, sound, words in the picture, the check after a render, spending. Not repeated here.
- `skills/production-principles/models.md`: what the models take, clip lengths, how narration and speech are written, the tools. No model, tool or price is named in this skill.
- `skills/script-format-cinematic-3d`: how the story and the lines are written. This skill is the render.

## What makes anything read as cinematic 3D

1. **Photographic light and materials.** Real-world light behaviour, ray-traced reflections and physically accurate textures: fabric weave, wood grain, glass, liquid.
2. **Designed, animated forms.** Everything keeps the designed shapes of an animated feature; this is animation rendered with real light, never live action.
3. **Believable adult proportions.** About 6 heads tall, with a refined face structure (defined cheekbones, jaw and brow) and a simplified nose.
4. **The eye.** Slightly enlarged and expressive, with detailed realistic irises: enlarged enough to read as animated, never cartoon-big.
5. **Filmic finish.** Filmic colour grading and anamorphic depth of field, composed like a frame from a film.

## 1. The look and its 3 blocks

There is 1 look (preset `default`). Every still prompt is put together in 1 order: **style block, character block (only when people are in frame), the scene, camera block.** Each block is pasted word for word.

**Style block.** Opens every still prompt:

```
A frame from a premium 3D animated feature with photographic realism in its light and materials: real-world light behaviour, ray-traced reflections, physically accurate textures (fabric weave, wood grain, glass, liquid), filmic colour grading and anamorphic depth of field, all with the designed, stylised forms of an animated feature.
```

**Character block.** Added only when the shot has people in frame. Left out of product-only and mechanism shots: its character language summons people into scenes that should have none.

```
Characters are stylised 3D animated humans with believable adult proportions about six heads tall: slightly enlarged expressive eyes with detailed realistic irises, a refined stylised face structure with defined cheekbones, jaw and brow and a simplified nose, skin with realistic subsurface scattering and very fine texture, individually groomed hair strands with a natural sheen, and clothing with real fabric texture and natural drape. Unmistakably animated characters, rendered at feature-film quality.
```

**Camera block.** Closes every still prompt:

```
Composed like a cinematic film still, with the camera inside the scene and the scene filling the entire frame. A high-end 3D animated feature render.
```

Every picture is a self-contained scene: the world extends past every edge of the frame and the camera sits inside it.

**The blocks set defaults; the scene overrides them.** When a shot needs other light or framing, say it in the scene and keep the blocks word for word:

- **Light:** rain, night, a cold screen. "Soft grey light from a window with rain-speckled glass. Muted and cool in mood."
- **Framing:** "A close-up of a hand holding up...", "A zoomed-in macro view...". Close-ups suit hands, products and mechanism shots.

## 2. Fix the character and the world

- **Every character is original.** A fictional adult, designed for this brand's avatar. Never a known character, a real person or a child, and no studio's name or logo in the prompt or in frame. It is never a customer, a founder or an expert, and gives no testimonial.
- **The character picture** is the character alone, made with the style block and the character block, so every shot built from it inherits the look. Sameness comes from the blocks and that picture, never from "same style as before".
- **Animals and creatures.** The character block describes people. For an animal lead (a dog in a pet food ad), leave it out and describe the animal in the scene. When people and an animal share a frame, keep the block for the people.
- **The world:** places from the avatar's `The moment` and the `Brand world`, each written as a film set the camera stands in.

## 3. Write the stills

The scene sits between the character block and the camera block. The standard to reach: each character described in full, the action and the look written as what bodies and faces do, every prop named, the label copy stated.

```
A woman in her forties with short curly black hair and round tortoiseshell glasses, wearing a rust linen shirt with rolled sleeves, stands at a bathroom basin pressing the pump of a white bottle with a clean label reading NIGHT CREAM in dark green letters, her brows lifted and her mouth in a small closed smile, while a tall man with a shaved head and a grey beard in a navy dressing gown leans in the doorway behind her, one eyebrow raised; on the shelf a folded cream towel, a glass with two toothbrushes and a small fern; behind them a softly blurred tiled wall and a frosted window with warm evening light.
```

A product-only shot drops the character block and keeps the same grammar: "A white bottle with a clean label reading NIGHT CREAM in dark green letters stands on a stone shelf beside a folded towel and a small fern, a frosted window behind, evening light, no people in the scene."

- **Describe every character in full in the scene.** Age band, build, hair colour and style, clothing and accessories. Anything left unstated is decided by chance and drifts between shots. When the character picture is attached, name it and its job right after the style block, and describe only what this shot changes: the action and the expression.
- **Name the feeling, then write it as face mechanics.** State what the viewer should feel, then direct the face: "her inner brows pushed up and her mouth a flat tired line". An adjective alone ("sad", "tired") renders a pleasantly neutral face.
- **The product stays accurate.** Attach its photo whenever it appears, and state every line of label copy exactly, with its colour.
- **Mechanism shots show the thing arriving and acting, mid-action,** framed as "a zoomed-in macro view, no people in the scene", so the clip can animate the change. Only as the brand's `How it works` gives it.
- **Body shots describe what is visible,** in plain visual words: layers, strands, a droplet. A clinical term (a named condition, a hormone) can get the picture refused. No body before and after.
- **1 clear subject and 1 action a frame.** A simple, readable shot reads best on a phone.

## 4. Approve the stills

The character picture first, then the first frame of each scene. When a result misses, render the identical prompt again before rewriting it: once the blocks are fixed, chance is almost always the cause. A model that pulls every frame toward a rounded, toy-like cartoon is the wrong one for this look.

## 5. Write the clips

Every clip prompt, transitions included, opens with this motion line:

```
Smooth, cinematic 3D animation at feature-film quality, with natural weight and subtle, believable performance.
```

The start frame carries the look. After the motion line, the clip prompt gives the action, the speech and the camera. 1 motion action a clip: stacked actions multiply drift. A character may speak on camera, 1 speaker at a time, its face in view.

## 6. Transitions

A transition clip runs between 2 frames that share 1 anchor (the same character or object, made from the same pictures), with 1 action between them. Moves that suit this look:

- **Camera-bridge** (the anchor holds, the camera moves): a slow push-in from the scene to the product label; a rack focus from a foreground object to the character behind it; a push into macro to reveal the mechanism (problem shot to mechanism shot).
- **World-bridge** (the camera holds, the world changes around the anchor): the light shifts from grey morning to golden evening around the character (time passing); a dark, cold room warms as the curtains open (problem to solution).
- **Match cut** (a rhyme of shape or motion): a gesture continues across the cut into the next scene, or a round shape becomes the next scene's round shape.

The transition prompt names the 1 concrete, visible action that carries frame A into frame B, plus the motion line, and nothing else. The frames carry the look.

## What fails, and the fix

| Failure | Fix |
|---|---|
| People appear in a product-only or mechanism shot | The character block went in. Leave it out whenever no people are in frame |
| A product-only shot reads like a product photograph | That is this look's photographic material at work. When it should read as animation, keep a character or a stylised prop in frame |
| The named feeling does not show on the face | It was written as an adjective. Name the feeling, then the brows, lids and mouth |
| Label garbled | State the label copy exactly, with its colour, and attach the product photo |
| A character looks different between shots | Fix the character picture, opened with the style and character blocks, and attach it to every shot they appear in |

Source: distilled from skills/_library/starpop/cinematic-3d-animation (made by @davidaistar), kept there as handed over.
