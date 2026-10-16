# Prompt templates for a talking object ad

For work done by hand. Fill the `[brackets]` from the brand brain and the approved script. How a model wants timing and speech written, how references are tagged and what its filter refuses are in `skills/production-principles/models.md`: read it first.

Inside the app none of this is typed: the plan's fields are turned into prompts by code.

## The 3 fixed lines (written once, used unchanged in every prompt)

```
CHARACTER: [the object and its material], [its state, as damage that is seen], with a face on [its largest clear area]: [eyes], [eyebrows], [mouth], [no arms / 2 thin arms from its sides ending in mitten hands].
LOOK: A soft 3D animated film look, rounded forms, an expressive face, shallow depth of field. [The light: cold and flat / warm from the left side.]
PRODUCT: @Image2 is the product, front on: copy its shape, colours and printing exactly, under this scene's light. It has no face and does not move.
```

## A. The character picture (image model)

```
ONE picture: a single object with a face, front on, on a plain pale background.
[CHARACTER]
[LOOK]
The object keeps the real shape and size of such an object. 1 face only. No text, no logo, no other objects.
```

## B. The opening frame (image model, approved before any clip)

```
ONE [9:16] frame: the opening frame of an animated short. No captions, no text, no graphics.
@Image1 is the character: the object here is exactly that object, with the same face in the same place.
[PRODUCT] It stands [at the right edge of the frame], [as tall as the object's shoulder / half the object's height].
The place: [where both would really be], [3 or 4 plain things, none with words]. The object is kept as it is really kept: [hangs on a hook, its inside to the room / stands on the shelf].
The camera is at the object's own eye level, [close / medium], on a stand.
The moment: [brows, eyes and mouth as they are on the first word], mouth open mid-word.
[LOOK]
No people, no mirrors, no screens.
```

## C. A clip (video model)

```
[9:16] video, [10] seconds, one continuous take with no cuts. An animated short.
References:
@Image1 is the first frame: start exactly on it and keep its object, place, light and framing.
@Image2 is the product, front on: its shape, colours and printing stay exactly so.
Camera: on a stand at the object's eye level, not moving.
Character: [CHARACTER, in full]
[0-3s] [What the features do.] Its mouth moves with the words and closes after them.
The [object's 2-word name] ([tone]): "[line]"
[3-7s] [What the features do], [1 small movement of the whole object: it sags / leans / tilts]. Its mouth moves with the words.
The [object's 2-word name] ([tone]): "[line]"
[7-10s] Its eyes slide [right] to the product and stay there. Its mouth moves with the words, then closes.
The [object's 2-word name] ([tone]): "[line]"
It ends on: [the final expression], eyes on the product, everything still.
The product stays where it stands. Nothing touches it.
Voice: the object's own voice, from its mouth: [age, pace, 2 traits], [accent]. The same voice throughout.
Sound: [the room: a fridge hum], [the object's own material when it moves: a small creak]. No music. No subtitles and no on-screen text.
```

Clip 2 onward is asked for as an extension of the clip before it (wording in `models.md`), with every fixed line unchanged.

## Filled: the thing it replaces (a steel pan brand), 1 clip

```
Character: A black non-stick frying pan, 24 cm, its coating scratched grey in the middle and the handle a little loose, with a face on its inside surface: large round eyes with heavy upper lids, thick brows sloping down at the outer ends, a wide flat mouth, no arms.
[0-3s] Brows low, eyes half shut. Its mouth moves with the words and closes after them.
The old pan (flat, tired): "Eighteen months. That's what I got."
[3-7s] Its eyes drop to its own scratched middle, and it sags a little on the hook. Its mouth moves with the words.
The old pan (flat, tired): "She blamed the eggs. It wasn't the eggs. It was me."
[7-10s] Its eyes slide right to the steel pan on the hob and stay there. Its mouth moves with the words, then closes.
The old pan (dry): "That one hasn't got anything to peel."
```

24 words. The 18 months are the customers' own words. The pan admits its own fault, one anyone can see. "Hasn't got anything to peel" is the brand's fact (no coating) in the object's words. It says nothing about food, health or how long the steel pan lasts.

## Filled: a witness (an evening drink brand), 1 clip

```
Character: A small bedside lamp with a cream fabric shade gone grey at the rim and a brass stem, with a face on the shade: narrow sleepless eyes with dark lower lids, thin brows pulled together, a small tight mouth, no arms.
[0-3s] Eyes wide, brows pulled together. Its mouth moves with the words and closes after them.
The lamp (fed up): "Eleven at night. She lines up 4 pots."
[3-7s] It tilts a little toward the pots, eyes narrowing. Its mouth moves with the words.
The lamp (fed up): "Counts them out. Every night. I watch."
[7-10s] Its eyes slide left to the lilac tub and stay there. Its mouth moves with the words, then closes.
The lamp (dry): "Last week it was 1 scoop. Nothing to count."
```

22 words. Every line is something a lamp on a bedside table could see; the 4 pots are the customers' own words. It says nothing about sleep.
