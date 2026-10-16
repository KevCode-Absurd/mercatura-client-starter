# Prompt templates for a podcast clip ad

For work done by hand. Fill the `[brackets]` from the brand brain and the approved script. How a model wants timing and speech written, how references are tagged and which words its filter refuses are in `skills/production-principles/models.md`: read it first and write the lines in that form. The speech lines below show the shape, not a rule.

Inside the app none of this is typed: the plan's fields are turned into these prompts by code.

## A. The cast lines (written once, used unchanged everywhere)

```
HOST (left of frame): [age], [build], [skin tone], [hair], [glasses or facial hair or none], [top: garment and colour], [1 mark the Guest does not have].
GUEST (right of frame): [age], [build], [skin tone], [hair], [glasses or facial hair or none], [top: garment and colour], [1 mark the Host does not have].
```

Filled, for 2 brands:

```
HOST (left of frame): woman, early 40s, broad shoulders, light brown skin, black hair in a low bun, round tortoiseshell glasses, rust-red knitted jumper, small gold hoop earrings.
GUEST (right of frame): man, late 20s, slim, pale freckled skin, short copper hair, clean shaven, plain navy overshirt, a silver watch on the left wrist.
```

```
HOST (left of frame): man, mid 50s, heavy build, dark brown skin, shaved head, short grey beard, plain cream linen shirt, reading glasses pushed up on the forehead.
GUEST (right of frame): woman, mid 30s, small and wiry, olive skin, shoulder-length dark curls, no glasses, plain forest-green T-shirt, a thin scar through the left eyebrow.
```

## B. The cast picture (image model, made first)

```
A photograph of 2 fictional adults standing side by side, seen from the waist up, against a plain off-white wall, in soft window daylight.
Left: [HOST cast line].
Right: [GUEST cast line].
They are plainly 2 different people. Real, slightly uneven faces, real cloth with creases, no beauty filter, no studio glamour light. Plain clothes with no words, logos or prints. No text anywhere in the picture.
```

A sheet of 2 or 3 views of the same pair (front, three-quarter, side) is fine for the image model. It is never given to the video model.

In these still templates, add only detail the crop/light can reveal: soft forehead/cheek texture, slightly clearer nose pores, delicate eye/lip lines and varied brow hairs. Keep it understated at two-person distance and preserve each approved age, marks and complexion. [Skin detail craft](../../../production-principles/references/skin-detail-craft.md) supplies close-zone refinements. Keep macro vocabulary in dedicated still studies, not the dialogue video template.

## C. The opening frame (image model, made second, approved before any clip)

```
ONE [9:16] frame: the opening frame of a podcast clip. Not a finished ad: no captions, no added text, no graphics.
@Image1 is the cast picture: the 2 people here are exactly those 2, with the same faces, hair and clothes. Its plain wall does not appear.
@Image2 is the product, front on: copy its shape, colours and printing exactly.
The room: [1 table and its material], [1 plain wall and its colour], [1 lamp and where it stands], [1 or 2 props from the brand's world, none with words on them].
The frame: both sit behind the table, seen from the chest up, turned about 45 degrees toward each other. Host on the left, Guest on the right. Both faces whole. The camera is level with their eyes.
Each has 1 [black] microphone on a short stand, its head below the chin and to the outer side, both mouths in clear view.
The product stands on the table between them, nearer the lens than the microphones, its front to the lens, [as tall as the glass beside it].
The moment: [the speaker of the first line] is mid-word, mouth open, [left] hand raised a little off the table. [The other] looks at them with [eyebrows up / head tilted].
A real photograph. Sharp, evenly lit, nothing the clip needs out of frame.
```

## D. A clip (video model)

```
[9:16] video, [10] seconds, one continuous take with no cuts. A podcast clip.
References:
@Image1 is the opening frame: start exactly on it and keep its 2 people, room, light and framing.
@Image2 is the product, front on: its shape, colours and printing stay exactly so.
Room: [the room in 1 line]. Camera: on a stand, level with their eyes, not moving.
People: 2 adults and nobody else. [HOST cast line, shortened to hair and top], on the left. [GUEST cast line, shortened to hair and top], on the right. They look at each other, never at the lens.
[0-3s] The Host speaks, [left] hand open on the table. The Guest listens, mouth closed, [head tilted].
Host (doubtful): "[line]"
[3-8s] The Guest answers, leaning in a little. The Host listens, mouth closed, [eyebrows up].
Guest (dry, sure): "[line]"
[8-10s] The Host sits back a little and glances down at the product. The Guest listens, mouth closed.
Host (amused): "[line]"
It ends on: the Host looking at the product, the Guest looking at the Host. [Only in the last clip of the ad: both settled.]
The product stays where it stands. No hand passes in front of it.
Voices: Host [low, dry]; Guest [lighter, quicker, warm]. [Accent]. Lip-synced, 1 speaker at a time.
Sound: the room only, voices close to the microphones. No music. No subtitles and no on-screen text.
```

Clip 2 onward: replace the first reference with the clip before it and ask for an extension of it, in the wording `models.md` gives. Add: "This is the middle of the conversation: no greeting and no recap." Keep every other line the same.

## E. The pick-up beat (only when section 6 of SKILL.md allows it)

Replace 1 beat with:

```
[3-7s] The Guest's [right] hand takes the [product's 1 name] by its sides from where it stands and holds it at chest height between them, its front to the lens, fingers clear of the printing. The [left] hand stays flat on the table. The Host looks at it.
Guest (plain): "[8 words or fewer]"
```

How it is held and opened is written in the lessons' own words. If the lessons do not say, the product stays on the table.

## F. A second angle (by hand only)

A close view of 1 speaker is a separate still, made from the approved cast picture and the approved opening frame and approved like them. A clip in that angle starts on that still. Change angle only between clips, at the end of a turn, and only the person in frame speaks in it. Inside the app every clip continues from the frame before, so there is 1 angle.

## G. What a filled prompt must not contain

- A show name, an episode number, a surname, a title or a profession.
- A sign, a screen, a book spine or any other thing with words on it.
- 2 people speaking in the same beat.
- "Multi-camera", "jump cut", "zoom": 1 frame per clip.
- Words about skin close up (see the filter list in `models.md`). Realism was settled in the stills.
