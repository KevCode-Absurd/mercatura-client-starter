# Finishing a podcast clip ad

What happens after the clips have passed their check. Inside the app the joining, the captions and the overlay are done by code; this is the same work by hand. The tools are in `skills/production-principles/models.md`.

## 1. Join

- Clips in order, hard cuts. Each later clip was made as an extension of the one before, so the cut lands on a still pose.
- A cut-off syllable needs a complete replacement take; trimming cannot recover it. Remove only unwanted silence at a join without cutting into a word, useful breath or response beat.
- Take out nothing that changes what was said.

## 2. Captions

- Every spoken word, as said, in the brand's typeface (`brand-look.json`), with the style in `Motion and sound: On-screen text`. Keep question marks: the doubt is in them.
- 1 colour for the Host's lines and 1 for the Guest's, both from the brand's palette, with enough contrast to read over the room.
- Captions sit in the middle band, clear of the faces and the product, and clear of the top and bottom where the feed's own buttons sit.
- The video model writes no words. Nothing is burnt in by the clip itself: if letters appear in a clip, make the clip again.

## 3. The hook, for a viewer with the sound off

- The first line, or its 6-word version, is on screen from the first frame.
- Most drop-off is between seconds 3 and 5. A small punch-in on the listener's reaction there holds the eye. A punch-in is a crop of the fixed frame, 10 to 15 percent, cut in, not a slow zoom.

## 4. The offer and the call to action

- On-screen text over the last 2 seconds, with the product in view. Its words are the offer in `offers.json`, exactly. Neither speaker says it.
- An end card with the product photo is added only if the brand's `Formats in use` has one.

## 5. Music

- None inside the clips. Under the finished ad only if `Motion and sound: Sound` says the brand uses music, and low enough that both voices stay clear. A real podcast clip has no music; none is the default.

## 6. Cutaways

- A cutaway to the product in use, laid over a turn, is the brand's own footage or a clip made for this ad from the product's tagged photos, checked like any other clip.
- Never footage taken from another channel or another brand's ad.
- The straight version and a version with cutaways are 2 ads to test, not 1.

## 7. Listen

Use [Audio direction](../../../production-principles/references/audio-direction.md) for native versus separate voice layers and selective repair. Keep each speaker's approved words and voice settings, mend the smallest coherent weak turn where supported, then listen to its lead-in/out and recheck lip timing. Retain the room bed across cuts and the existing music policy. Listen to the complete export without picture, on headphones and phone speakers, then with picture for mouths/action cues. A transcript or audio-present flag is not a mix pass.

A person plays the finished ad with the sound on before it is used: 2 different voices, the same 2 throughout, the brand name said the way `Said aloud` gives it, no stray music or invented words.
