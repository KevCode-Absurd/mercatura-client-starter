# The opening still and the clip prompt

For a UGC ad made by hand. Inside the app both are written by code from the shot plan. How a named model wants timing, speech and references written is in `skills/production-principles/models.md`: use its form where it differs from the form shown here.

## The opening still (the first frame of clip 1)

```
[ASPECT]. A frame from a phone video, [held at arm's length / phone propped on the shelf].
[THE PRESENTER in the fixed words], in [THE ROOM: 2 or 3 things that belong there, the light
and where it comes from]. [POSE: where they look, what the face is doing, what each hand holds].
[EVERY OBJECT THE AD USES and where it is], the product's front to the lens, its printing uncovered.
@Image1 is the presenter: the same person exactly, nothing smoothed.
@Image2 is the pack, front on: copy its shape, colours and printing exactly.
@Image3 is the product in a hand: copy its size against the hand.
The only objects in the frame: [each by its 1 name]. Nothing else.
An ordinary phone video, everything in focus, slightly off-centre. No words except the
pack's own printing. Nothing that matters in the top or bottom sixth of the frame.
```

## A clip

Read the actual opening still and verify that its pose, hands and product state support
the first action. Describe motion and preservation, not a new visual scene. Choose one
camera behaviour per shot; a move allows coherent perspective changes, while a locked
camera holds framing. A separately generated later still is a target illustration, not
an extracted video frame. Review actual transitions before treating them as continuous.

```
[ASPECT] video, [N] seconds, one continuous take, real speed. A phone video.
References:
@Image1 is the opening frame: the clip starts on it exactly.   [clip 1]
@Video1 is the clip before: carry on from its last frame.      [later clips; or "Extend @Video1 forward."]
@Image2 is the presenter: the same person from the first frame to the last, nothing smoothed.
@Image3 is the pack, front on: its shape, colours and printing stay exactly as shown.
@Image4 is the product in a hand: its size against the hand stays as shown.
Place: [the room, its light and where it comes from].
The only objects in the scene: [name (2 or 3 visible facts)]; ...
Camera: [grip or propped setup; crop, height, position; one behaviour with its timing].
[PART 1]: [the 1 action: which hand, what, how far]. [the words, in the model's speech form]
[PART 2]: [the action continues or the product is shown]. [the words]
[PART 3]: [the point lands]. [the last words]
[When useful:] [brief live hold for recognition; last spoken word finishes before the cut].
Voice: [age, pace, 2 or 3 traits, accent]. Sound: [the room, by its kind][, the product's
sound on the beat it happens]. No music. No subtitles and no on-screen text.
```

Later clips add: "This is the middle of the video: no greeting and no recap."

For a locked camera, say the framing stays fixed. For a physically possible handheld
move, name its timing and end boundary instead; do not also demand unchanged framing.
Time each part within the route's actual duration. Keep necessary hands and mechanism
visible through the end of the action. Prompt timestamps are reviewed against the clip,
not treated as guaranteed controls. See [Camera shots](../../../production-principles/references/camera-shots.md).

Under 1,500 characters. If it runs long, cut in this order: the room's details, the face, the light. Never the action, the words or the references.

## Worked example: a consumable (made-up brand), the demonstration clip

Script lines for this clip: "It's 1 stick. Tear the top, tip it in, that's it." (11 words.) Lesson: the stick is torn straight across its top edge; the powder is pale pink and pours out of the torn top. Both hands are needed, so the phone is propped.

```
9:16 video, 10 seconds, one continuous take, real speed. A phone video.
References:
@Video1 is the clip before: carry on from its last frame.
@Image1 is the presenter: the same person from the first frame to the last, nothing smoothed.
@Image2 is the stick pack, front on: its shape, colours and printing stay exactly as shown.
@Image3 is the stick pack in a hand: its size against the hand stays as shown.
Place: a kitchen worktop by a window, morning light from the left.
The only objects in the scene: the stick pack (slim, pale pink, the length of a finger);
the glass (clear, tall, three-quarters full of water); the worktop.
Camera: the phone is propped on the worktop, still. The framing does not change.
This is the middle of the video: no greeting and no recap.
[0-3s] She holds the stick pack upright in her left hand at chest height, front to the lens.
Presenter (easy): "It's 1 stick."
[3-8s] Her right hand tears the stick pack straight across its top edge, then tips it over
the glass. Pale pink powder pours from the torn top into the water in 1 steady stream and
the water turns an even pale pink. Presenter (easy): "Tear the top, tip it in,"
[8-10s] She sets the empty stick pack down beside the glass and looks at the lens.
Presenter (easy): "that's it."
Voice: a woman in her 30s, easy, warm, General American accent.
Sound: a quiet kitchen, paper tearing, powder falling into water. No music. No subtitles
and no on-screen text.
```

## Worked example: a durable (made-up brand), clip 1

Script line: "If your carry-on has ever burst open on the belt, look at this latch." (14 words.) 1 hand is enough, so the phone is at arm's length. The case stands beside him from the first frame.

```
9:16 video, 10 seconds, one continuous take, real speed. A phone video.
References:
@Image1 is the opening frame: the clip starts on it exactly.
@Image2 is the presenter: the same person from the first frame to the last, nothing smoothed.
@Image3 is the case, front on: its shape, colour and latches stay exactly as shown.
Place: a hallway by a front door, daylight through the door's glass on the right.
The only objects in the scene: the case (hard shell, dark green, 2 metal latches on the
front, knee high); a coat on a hook.
Camera: the phone is at arm's length in his left hand, a little hand movement. The framing
does not change.
[0-5s] He stands beside the case with his right hand resting on its top, eyebrows up,
eyes on the lens. Presenter (dry): "If your carry-on has ever burst open on the belt,"
[5-8s] His right hand goes down to the upper latch of the case and pushes it shut.
It seats with a click. Presenter (dry): "look at this latch."
[8-10s] He keeps his hand on the latch and looks back at the lens.
Voice: a man in his 40s, dry, even, British accent.
Sound: a hallway with a little echo, the latch clicking shut. No music. No subtitles and
no on-screen text.
```

## Check each prompt before it is sent

- [ ] Every attached file is named, with its job, in the order attached
- [ ] Labels bind to the actual uploads; reference faces, wardrobe and object states agree
- [ ] The words are the script's words, whole, in the model's speech form
- [ ] The words fit at the speaker's pace, which follows their age; 8 or fewer while the hands work
- [ ] 1 action; which hand does it; where the product ends up
- [ ] How the product is opened or used is in the lessons' words
- [ ] Nothing comes from off screen
- [ ] No film word (the list in `SKILL.md`), no filter word, no named place, shop or trademark
- [ ] The voice and the sound are said; no music
- [ ] Speech stays clear above ambience; pauses and reaction fit without dropping words
- [ ] Camera position, behaviour and timed beats agree with the actual duration and grip
- [ ] Physical light sources stay in place; first and last crops show the needed evidence
- [ ] Whole words at joins; any live hold clarifies the point rather than freezing footage
