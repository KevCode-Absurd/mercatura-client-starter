# Prompt templates for a claymation ad

For work done by hand. Fill the `[brackets]` from the brand brain and the approved script. How a model wants timing and narration written, how references are tagged and what its filter refuses are in `skills/production-principles/models.md`: read it first.

Inside the app none of this is typed: the plan's fields are turned into prompts by code.

## The 4 fixed lines (written once, used unchanged in every prompt)

```
CHARACTER: [1 sentence: a clay man or woman, adult, how many heads tall, body shape, clay colour, hair as 1 shape and colour, 2 clothing colours, eyes, mouth, 1 mark].
MATERIAL: Everything except the product is matte modelling clay, well made, even proportions, [slight tool marks / soft fingerprints], small tabletop model scale.
LIGHT: Soft, even studio light with a gentle rim, shallow focus, the background softly blurred.
PRODUCT: @Image2 is the product, front on: copy its shape, colours and printing exactly. It stands [waist / shoulder] high beside the character (a flat thing: about as wide as the character), within reach, its front to the lens.
```

## A. The character picture (image model)

```
ONE picture: a single clay figure, full figure, front on, standing on a plain pale background.
[CHARACTER]
[MATERIAL]
[LIGHT]
No product, no props, no text.
```

## B. A scene still (image model). The opening frame is scene 1.

```
ONE [9:16] frame of a stop-motion clay film. No captions, no text, no graphics.
@Image1 is the character: the figure here is exactly that figure, same shapes and colours.
[PRODUCT]
The set: [the place, in clay: floor, backdrop, 3 or 4 pieces, none with words].
The thing that changes: [what it is, in clay] in its [first / second / third] state: [what that looks like], [where it sits: above / behind / beside the character].
The character: [the pose that shows the feeling], [which arm does what].
Palette: [problem palette: greyed, cool, 1 dull colour] / [changed palette: the brand's colours by name]. The product is [the only thing in the brand's colours / now matched by the thing that changed].
[MATERIAL]
[LIGHT]
The frame the eye lands on first: [the 1 element].
```

Filled, a drink powder (problem):

```
ONE 9:16 frame of a stop-motion clay film. No captions, no text, no graphics.
@Image1 is the character: the figure here is exactly that figure, same shapes and colours.
@Image2 is the product, front on: copy its shape, colours and printing exactly. It stands waist high on the bedside table beside the stack, within reach, its front to the lens.
The set: a clay bedroom corner at night: a clay bed edge, a small bedside table, a plain dark blue backdrop.
The thing that changes: a stack of 4 grey clay pots in its first state: stacked crooked, taller than the character's head, leaning, on the bedside table.
The character: sits on the bed edge, shoulders dropped, right arm held up to steady the stack.
Palette: greys and dull blue. The product is the only thing in lilac.
Everything except the product is matte modelling clay, well made, even proportions, slight tool marks, small tabletop model scale.
Soft, even studio light with a gentle rim, shallow focus, the background softly blurred.
The frame the eye lands on first: the leaning stack.
```

Filled, a steel pan (the product acting):

```
ONE 9:16 frame of a stop-motion clay film. No captions, no text, no graphics.
@Image1 is the character: the figure here is exactly that figure, same shapes and colours.
@Image2 is the product, front on: copy its shape, colours and finish exactly. It sits on the clay hob, waist high to the character.
The set: a clay kitchen corner: a hob, a tiled clay wall, 1 shelf.
The thing that changes: a flat orange clay ripple under the pan in its second state: spread from the middle half way to the rim.
The character: stands at the hob, left arm at its side, right arm resting on the pan's handle, head tilted toward the pan.
Palette: greyed cream and steel, the ripple the only warm colour.
Everything except the product is matte modelling clay, well made, even proportions, slight tool marks, small tabletop model scale.
Soft, even studio light with a gentle rim, shallow focus, the background softly blurred.
The frame the eye lands on first: the ripple.
```

## C. A clip (video model)

```
[9:16] video, [8] seconds, one continuous take with no cuts. A stop-motion clay film.
References:
@Image1 is the first frame: start exactly on it and keep its character, set, light and framing.
@Image2 is the product, front on: its shape, colours and printing stay exactly so.
Camera: on a stand at the character's eye level, [not moving / 1 slow push in, still at the start and the end].
[CHARACTER, shortened to its shapes and colours]
[0-3s] [The character's 1 small move, which arm, how far.]
[3-7s] [The thing that changes goes from 1 state to the next, by a clay move: sinks flat / unknots / spreads / rolls off.] The character [1 reaction as a pose].
[7-8s] [The reaction lands. Only in the last clip of the ad: everything holds still.]
Movement is stepped, pose to pose with short holds, at real speed. The character's mouth stays closed.
Narrator, off screen ([tone]): "[8 words or fewer over the change; the clip's whole narration fits its seconds]"
It ends on: [the pose, the thing in its new state, where the product is].
Voice: [the narrator: age, pace, 2 traits, accent]. A voice-over: nobody on screen speaks it.
Sound: soft clay taps and the room. [No music.] No subtitles and no on-screen text.
```

A later clip of the same set is asked for as an extension of the clip before it (wording in `models.md`). A scene with its own still starts on that still.

## D. Where a tool has a separate field for what to leave out

```
crude or lumpy sculpting, uneven proportions, glossy plastic, photographic skin, real water or glass, smooth computer animation, 2D drawing, harsh shadows, flicker, text, letters, logos other than the product's own
```

It never replaces the description. Most current models follow what is described and ignore or misread a list of "no".
