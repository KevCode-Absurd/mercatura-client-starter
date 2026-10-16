---
name: asset-generator-cmo
description: Make base product photographs for a brand that has few. Reads 1 reference photograph in 6 parts (camera, light, depth, place, color, composition) and rebuilds that recipe with the brand's real product, or applies 1 of 11 photographic treatments or 5 placements. The pictures carry no words and are what ads, pages and emails are then built on. Use when a brand needs base assets or product photos and has only a few pack shots.
user_invocable: true
---

# Base product photographs from a reference

A brand with 3 pack shots cannot make 30 ads. This skill makes the photographs in between:
the real product in a real-looking scene, with no words, ready for an ad, a page or an email
to be built on.

**What a base picture is judged on.**
1. The product is the real product (production-principles section 1).
2. It has a job: a hero, the product in use, a texture, a place. Every picture is asked for
   with its job named.
3. Something can be built on it: it has a quiet area where words can be set later, and it
   holds in the sizes the brand uses.

It makes photographs only. No headline, no logo, no finished ad.

It rests on `skills/production-principles`; a finished image prompt is laid out as in
`skills/image-prompt-craft`; models, tools and prices are only in
`skills/production-principles/models.md`. For a whole set chosen frame by frame use
`photoshoot-factory`; for 1 color world, `instant-photoshoot`; for the party flash look,
`flash-photography`.

## Where the reference photograph comes from

- The app's own reference library, or
- 1 of the brand's own ads that worked (`winning-ads.md`), or
- a photograph the person supplies.

A reference gives 6 things and no more: its camera, light, depth, place, color and
composition. Never its product, brand, words, logo or people. Another brand's ad is not
fetched from an outside service to be copied.

## Step 1: The brand and the product

Read the brand brain. Write the product's truth sheet and gather its real photos as in
`skills/Photoshoot Factory/Photoshoot Factory/photoshoot-factory/references/01-product-assets.md`.
No true photo of the exact variant, no picture.

Note what kind of product it is: worn, applied, eaten or drunk, used with the hands, placed
in a room. It decides step 3.

## Step 2: Read the reference in 6 parts

Look at the photograph itself and fill every line. A line left blank is a line the image
model fills by itself.

```
CAMERA
  Lens: wide / normal / short telephoto / long / macro
  Depth of focus: shallow / medium / deep
  Angle: eye level / from above / low / 45 degrees above, and any tilt
  Distance: macro / close / medium / the whole scene
  Shape: tall / wide / square

LIGHT
  Kind: window / soft studio / overhead diffused / hard directional / flash / low sun
  Direction: from upper left / behind / overhead / a rim
  Quality: soft / hard / mixed
  Warmth: warm / neutral / cool / mixed
  Shadows: soft / medium / hard / none

DEPTH
  What is sharp: the product / a face / both
  In front: what, and whether blurred
  Behind: what, and whether blurred
  Layers: how many, and what each is

PLACE
  Setting: studio / outdoors / a home / abstract
  Surface: stone / concrete / cloth / wood / glass
  Background: flat color / gradient / textured / a real place
  Props: each one
  Fill: does the place fill the frame, or is there empty space

COLOR
  Palette: the main colors, in plain words
  Contrast: high / medium / low
  Saturation: vivid / muted / washed
  Mood: cozy / dramatic / clean / editorial / playful / raw

COMPOSITION
  Where the subject sits: center / a third / off center
  How much of the frame it fills
  Empty space: where, and how much
  Lines that lead the eye
  Still or moving: a pour, a splash, something mid-air
```

## Step 3: Carry it over to this product

The recipe transfers. The subject does not. Answer each, in writing:

1. **What is the job of this picture,** and where will it be used?
2. **What stands where the reference's product stood?** Which variant, and from which
   angle. Only an angle a photo of the product shows.
3. **Does this product need someone or something to be seen properly?**
   - Worn: on a body, sitting and hanging as its in-use photo shows.
   - Applied: at the skin or hair, the real amount.
   - Eaten or drunk: served, poured or held, 1 serving.
   - Used with the hands: in the hand, mid-task.
   - Placed in a room: in place, at its true size against the furniture.
   - Made for a pet: on or beside an ordinary adult animal of the kind it is for.
4. **How big is it,** against a hand, a body or the furniture? Said in the prompt.
5. **Which of the reference's props make sense here?** Swap each for something from this
   product's real use. Do not force a prop across.
6. **Is the reference's angle the right one for this product?** It is a start, not a rule.
   A flat thing (a blanket, a pan) wants a higher camera than a tall one.
7. **Where is the quiet area** an ad's words will sit?
8. **Does the reference's palette fight the brand's?** The brand's wins.

People are fictional adults, different from anyone in the reference. No child is generated,
nor any part of one: a product for children is shown without one. No finger crosses the
label. A shiny or mirrored product (sunglasses, steel, glass) reflects the scene it stands
in, never a studio that is not there.

## Step 4: Write the prompt

Short and direct. The product's rule is said first and last: the last instruction is the
one followed most strongly.

```
THE PRODUCT (first, and most important)
Image 1 is the real product, front on: copy its shape, colors and printing exactly.
[Image 2 is the product in use / out of its pack: copy how it sits and its finish exactly.]
{What it is, exactly, in the truth sheet's words. Not {the lookalike}.}
Do not redraw the label, restyle the pack or invent a variant.

THE REFERENCE
Image {n} is a reference for camera, light and composition only. Take:
- {camera lines from step 2}
- {light lines}
- {depth lines}
Never its product, brand, words, logo or people.

SCENE
{2 or 3 sentences: place, surface, props, translated for this product}

THE PRODUCT IN THE SCENE
{1 or 2 sentences: where it is, how it sits, its size against {a hand / the table}. It is lit
by the scene's light and throws a shadow on the scene's surface. Any person, and what each
hand does.}

COLOR AND MOOD
{1 sentence, from the brand's palette}

RULES
- No words, no logos, no marks except what is printed on the product.
- The product whole, not cut by the frame's edge.
- Quiet area: {where}.
- {shape and size}

THE PRODUCT (again)
The product is exactly the one in Image 1: same shape, colors, printing and finish.
```

The product is the same object as in its photo, standing in the scene's light. It is not a
cut-out laid on top: a pasted product keeps the light of its old photo and looks stuck on.

## Step 5: Make 1, look, then more

1 picture first, looked at at full size beside the real photo (production-principles
section 9). If the product is right and the recipe landed, make the others. A failed
picture is not asked for again in the same words.

Generated pictures are kept apart from the product's real reference photos and marked as
generated. One is never filed as a reference photo.

## 4 ways to use it

- **1 picture:** 1 reference, steps 1 to 5.
- **5 different recipes:** 5 pictures that differ on purpose, each with its job:
  1. Warm and lived-in: a person or a pet using the product. In use, for an ad.
  2. Dramatic: dark ground, 1 directional light. A hero for a launch or a brand ad.
  3. Bright and clean: magazine light, clear space. A base for an ad with a headline.
  4. Very close: texture and detail. For a carousel card.
  5. 1 treatment from the list below. A scroll-stopper for the feed.
  For something placed in a room or a textile: 3 placements and 2 treatments.
- **The treatments:** several treatments on 1 composition, to find the brand's look.
- **The placements:** for textiles and things placed in a room.

## The 11 treatments

A treatment changes how the camera sees, not what is in the frame. Each is a look to stop a
thumb in a feed. **None is a product page hero:** a picture that bends the product's shape
or shifts its color is the wrong one to buy from. The product stays large enough to read.
Note which were used for the brand, and rotate.

| Treatment | How it looks | Suits | Its limit |
|---|---|---|---|
| Fish-eye with flash | A very wide fish-eye lens, direct flash, saturated, grainy; the subject larger than life | Playful brands, pet products, shoes, bags | The lens bends whatever is near the edge: the product stays in the middle third |
| Warm flash film | A small camera's harsh warm flash, amber cast, bright highlights, grain; a garden party in the late 1990s | Food, drink, anything shared | The cast warms the pack: a white pack stays warm white, not orange |
| Cross-processed | Slide film in the wrong chemistry: greens go cyan, skin goes orange, high contrast | Fashion, beauty, bold brands | It changes the product's colors: never where the color is the point |
| Ring flash | Flat frontal light, a thin shadow all round the subject, a round catch-light | Make-up, jewellery, small shiny things | Glare on gloss: keep the hot spot off the printed words |
| Tilt-shift miniature | 1 band of sharp focus; a real scene looks like a small model | Rooms, tables, arrangements | The product must sit inside the sharp band |
| Hard noon sun | No flash; hard overhead sun, deep black shadows, slightly washed color | Clothes, bags, sunglasses, cookware outdoors | A shadow must not fall across the label |
| Colored lights | 2 colored lights, 1 from behind and 1 in front, clean and saturated | Bold and playful brands, streetwear, devices | Colored light on the product changes its color: light the product white, the scene in color |
| Prism | Glass held at the lens: rainbow leaks and split reflections at the frame's edges | Beauty, jewellery, fragrance, glass | The product stays in the clear middle |
| Through water | A wide lens, ripples, bubbles, light patterns, a cool shift | Only a product the facts say goes in water, or a drink | Never puts a product under water that cannot go there: shoot through a wet pane instead |
| Infrared | Leaves turn white or pink, the sky deep navy, skin glows | Outdoor brands, as a brand picture | It changes every color: the product is small in frame, never the subject of the color |
| Fish-eye from the ground | Daylight, the camera on the ground looking up, the subject towering, cool and washed | Shoes, streetwear, bags, a pet looking down | Shape bends at the edges: product in the middle third |

A treatment's prompt uses the layout of step 4 with the reference block replaced by:

```
THE TREATMENT (match exactly)
- Lens: {...}
- Light or flash: {...}
- Film and color: {...}
- In 1 line: {the feeling, with no brand, film stock or photographer named}
```

No date stamp, border or caption is added: those are words nobody approved.

## The 5 placements

For a textile or a thing placed in a room, where it lives matters more than how the camera
sees. **The product is the subject, never the background.** A prop gives it context: 1 glass
is fine, a full table setting buries it.

| Placement | What it shows | Its job |
|---|---|---|
| Draped | The cloth falling off a bare surface, directional sun, hard shadows that show the weave, 1 plant at most, low camera | A hero for a pattern or a material |
| At the table outside | A terrace or garden table, dappled low sun, 1 glass and 1 small vase, a soft blurred background | Lifestyle, for an ad or a seasonal email |
| On a shelf | Folded on a tidy shelf, soft window light from the side, a basket, dried stems | A product page; a gift guide |
| Out of the box | 1 adult hand lifting it from a box with tissue, soft overhead light, camera 45 degrees above | What you get; a gifting ad |
| Flat | From straight above, spread flat to show the whole pattern, even light, nothing on it, all sharp | A catalogue picture; a new color or pattern |

For a patterned thing, the pattern is the product: it is copied from its photo, and its
repeat is kept at true size against a hand or a chair. It is never redrawn.

## Check and rank

A picture where the product is wrong is not ranked. It goes with the rejects, because a
picture kept is a picture someone uses.

The rest are scored and shown best first, each with 1 line on what it is for:

| | Weight |
|---|---|
| Does its job (the hero reads at thumb size; the in-use frame shows the use) | 30% |
| Looks photographed, not generated | 25% |
| Light that could exist | 20% |
| On brand: palette, place, people | 15% |
| Something can be built on it: a quiet area, holds in 2 sizes | 10% |

## What this reads from the brand brain

A blank field is a question for the brand. It is never guessed.

- `products-and-positioning.md`, the product's entry: `What it is`, `Variants`, `Looks
  like`, `Pack`, `How it is used`, `Never show`, `Reference photos`. The lines of the truth
  sheet the brain does not hold yet are listed in Photoshoot Factory's
  `01-product-assets.md`.
- `brand-guidelines.md`: `Color palette`; `Photography and imagery style`; `Imagery do's
  and don'ts`; `Brand world`; `Brand guardrails`.
- `winning-ads.md`: `Pattern summary` and the entries, for which of the brand's own ads to
  take a recipe from.
- `customer-avatars.md`: `Who they are`, `The moment`, for the person and the place.
- `lessons.json`: how the product is opened, held and used.
- Not in the brain today: which treatments have been used for the brand, and which
  pictures in `assets/` are generated and which are real. Both should be recorded.
