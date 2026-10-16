<!--
The card of comic-book-ad: what a planning step is sent for a comic page ad (the shot plan; the image plan when a carousel uses the comic look). SKILL.md beside it is the whole method for work by hand. Only the craft of the format is here; the rules every clip follows are in prompts/shot-plan.md and skills/production-principles.
-->
# Comic page ad: craft rules

## What it is, and what it is judged on

A printed comic page lies on an artist's desk and is filmed from above. The desk, the paper, the artist's hand and the product are a photograph. Everything inside the panels is flat ink that moves a little, like a motion comic. The page is read panel by panel, the hand turns it, and the ad ends on the real product standing on the same desk.

Judged on 3 things: with the sound off, a stranger can say what the problem was, what changed and which product did it; frame 1 reads as "a comic on a desk" at the size of a thumb; the product at the end is the product in its photo.

## Structure

- 1 page is 1 clip, and a clip is 3 scenes: panel 1, panel 2, then the closing move (the page turn, or on the last page the product).
- A page has 2 panels, 1 above the other, each about half the page, so both read from above.
- 3 clips: the problem, the mechanism, the turn. 2 clips: the problem, then the turn with the diagram as its first panel. 1 clip: 1 page, problem then product.
- The problem page: the same person in the same place twice, the second panel worse than the first.
- The mechanism page: panel 1 is drawn differently from every other panel, as a draughtsman's diagram: a cutaway or cross-section with construction lines and 2 or 3 empty label tags. It shows what the product is made of or what it does to the thing it touches, and only as far as the script claims. Panel 2: the product arrives in the story.
- The turn page: the panels of the problem page again, changed. The change drawn is the change the script states, no larger.
- Every clip but the last closes on the page turn. `end` is the next page lying flat, described panel by panel, because the next clip starts on that frame. The last clip closes on the product: `end` is the product centre frame, the page still in view beside it.

## The look, and how it is held

- Say the split in `visual_direction` and keep it in every `visual`: desk, paper, hand and product are a photograph; inside the panels is flat ink with bold black outlines, flat colour, halftone dots, on cream paper. Name which a thing is whenever it could be either.
- `cast.setting` is the desk: its surface, its light, and the tools by plain name (marker pens, pencils, a steel ruler, a mug, loose pencil sketches). No brand of pen, no named artist or publisher's style.
- `cast.character` is the drawn person: an adult, by role, look and clothes, in the same words for every panel. 2 drawn people at most on a page.
- 1 accent colour: the product's or its pack's own colour, or the brand's main colour when the product is black, white or grey or comes in many colours. Until the product arrives in the story the ink is black and 2 muted tones; the accent enters with the product and stays.
- The product drawn in a panel is its shape and its colour only, with no printing. Its real printing is seen only on the real product on the desk.
- Each panel has 1 empty caption box in its top corner. The scene's `overlay` is that panel's lettering: 5 words or fewer, set in editing. The diagram's `overlay` is its labels, 6 words in all, split by slashes. Nothing is lettered by the model: no sound-effect words, no numerals, a clock has hands and no digits.

## Camera and movement

- `cast.camera`: straight down from above in every shot. The cut does the moving: from the whole page to the panel being read, close. It never dives into a panel and nothing turns from ink into a photograph.
- Only the panel being read moves: 1 small movement inside the ink (steam rises, a head drops onto a hand, an egg slides). The other panel holds still.
- The artist's right hand rests on the lower right corner of the page from frame 1 and is the only hand in the video. The turn is 1 action: it lifts the corner and lays the page over to the left, and the next page lies flat beneath.

## Shots this format cuts between

- The whole page from above, the hand on its corner, the tools round it.
- A close on the panel being read, its ink moving, the paper's edge still in view.
- The diagram panel, close, its tags empty.
- The hand lifting the corner, close, for the page turn.
- The real product on the desk, close, to end.

## The product on screen

- The real product is in `props` first. It comes in on the shot where the words reach it, standing or lying on the desk beside the page as its reference photo shows it (a pouch upright, a pan flat, a garment folded). Nothing touches it: `cast.handling` is display.

## Narration and sound

- Nobody in a panel speaks. Narration is a voice-over: `cast.voice_direction` begins "Voice-over narrator:". 8 words or fewer to a panel, none over a page turn or over the last hold on the product.
- Paper is the sound. Write the sound into the `visual` of the scene it belongs to: the pencil tap, the dry snap of the page turning. No music.

## First and last frame

- Frame 1: the whole page from above, ink already moving in the top panel, the hand on the corner.
- Last frame: the product centre frame and sharp, the last panel beside it, held still.

## As a carousel

1 card is 1 page seen from above on the same desk. The same drawn person and ink on every card; the caption box holds that card's approved words, given exactly; the last card is the real product on the desk.

## What to avoid

- A drawn customer giving a result, a drawn expert, a drawn child, the inside of a body the script does not name.
- A turn page that shows more than the script claims.

## What to look at after the render

- Ink stayed flat ink and the desk stayed a photograph, in every frame.
- The drawn person is the same in every panel of every page.
- The caption boxes are empty: no scribbled letters anywhere.
- No accent colour before the product arrives.
- Each turn landed on the approved page.
- The product on the desk matches its photo in every shot it is in.
