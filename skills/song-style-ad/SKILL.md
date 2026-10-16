---
name: song-style-ad
description: Make a song ad for any D2C brand - a micro music video in which an original song carries the product's story over animated pictures, with 1 recurring stylised lead who sings on camera in chosen shots. It works when the song is a real song with its hook in the first 5 seconds, the song's real timings set every cut, and the lead and the product look the same in every shot. A planning step is sent CARD.md, not this file.
---

# Song ad

A micro music video. The song is the spine: it sets the pace, the mood and the arc, and the pictures ride on it. It is a mix: shots where the animated lead sings on camera, and silent picture cut to the music. Where the lead sings is decided shot by shot, and the lead rarely sings all the way through.

## What it is judged on

1. **A stranger would hear the song out,** and its hook lands the customer's outcome in the first 5 seconds.
2. **Every cut falls on the song:** the pictures are timed to the song's real timings, never to a guess.
3. **The lead and the product look the same in every shot.**
4. **In a `SUNG` shot the lead's mouth matches the words.** In every other shot no mouth forms words.
5. **The lyric and the pictures claim nothing the brand's facts do not.** A sung line claims as much as a spoken one.

## What this rests on

- `skills/production-principles/SKILL.md`: tagged reference photos, a still before a clip, the first frame, real speed, materials, sound, words in the picture, the check after a render, spending. Not repeated here.
- `skills/production-principles/models.md`: what the models take, clip lengths, how narration is written, the tools. No model, tool or price is named in this skill.
- `skills/script-format-song`: how the lyric and the style line are written, the genre by audience, the structure by length. This skill is the lead, the pictures and the cut.

## The app does not make music

The song itself is made in a music tool from the lyric and the style line, once and whole, and its real timings then set the cut. Until the song exists, shots are planned at about 2.5 sung words a second. Clips are silent picture under the song; a `SUNG` shot shows the lead singing and is matched to the song when the clips are joined.

## 1. The song

The approved script is the lyric. Hand the music tool this, and nothing else:

```
Title: [the hook line]
Style: [genre], [vocal: female lead / male rap / choir], [tempo in BPM], [mood], [production: modern polished / lo-fi / vintage]
Lyrics:
[Verse 1] ...
[Chorus] ...
[Verse 2] (30 seconds and over)
[Bridge] (60 seconds only)
```

- The style line is under 25 words. Music tools do better with a short one. It never carries an artist's or a band's name: describe the sound.
- Words given by the brand are sung exactly as given.
- Vocals begin at once: no instrumental intro, no breaks, a tight ending.
- **Made whole, once.** Music tools do not repeat themselves, so a section is never remade on its own. If the song is wrong, the whole song is made again.

## 2. Take the song's real timings

- From the finished song: the time of every word, and the total length. These are the clock for everything after.
- Its silences are never cut out. An instrumental stretch is music and gets pictures: the plan covers the song from its first word to its end.
- Only the head before the first word may be trimmed.

## 3. Fix the lead, the product and the look

1 look (preset `default`): animated pictures with 1 recurring stylised lead.

```
LEAD: [a stylised animated woman or man, adult / an animated object], [body shape], [hair as 1 shape and its colour], [2 clothing colours], [1 mark: glasses, a scarf, a hat], large expressive eyes, a mouth that can sing. Same character in every shot.
STYLE: 3D animated render with the feel of an animated feature film, simple rounded shapes, soft even light, saturated [palette] colour, clean uncluttered backgrounds, shallow depth of field.
```

- **1 lead, 1 identity.** A character picture first: the lead alone, front on, plain background. It is re-attached, tagged by its job, and named in every shot the lead is in. A shot is never built on the output of the shot before.
- **The lead is fiction:** an adult by its proportions and dress, or an object. Never a child, a real person, a celebrity or a known character, and never in the manner of a named studio or artist. It gives no testimonial.
- **The product** has its own tagged photo. Its shape, colours and printing are those of the photo.
- **A place is fixed only when it comes back** and must stay identical, which is rare: the stage the lead sings on. Any other setting is described in its own shot. 1 picture of the lead in the singing place may be made as a start frame, when the sung shots must match.

## 4. Decide where the lead sings

3 ways, chosen for the song:

- **Singing shots of their own,** on a stage or in 1 place, alternating with silent picture.
- **Singing while acting,** through the story shots.
- **A mix.**

The usual shape: the hook and the last chorus are sung on camera, and the middle is silent picture. 2 sung shots can bookend 5 silent ones.

## 5. Storyboard against the song

1 row per shot, each tied to a time range of the song.

| # | Time in the song | The lyric at that moment | `SUNG` or silent | The picture | Framing |
|---|---|---|---|---|---|
| 1 | 0:00 to 0:05 | the hook line | SUNG | the lead at the kitchen counter, kettle in hand | medium, front on |
| 2 | 0:05 to 0:11 | lines 2 and 3 | silent | a hand tips old pods into the bin, 1 by 1 | close, from above |

- **A silent shot shows what the lyric says at that exact moment.** Nothing else.
- A lyric line of 6 to 9 words fits a shot of about 2.2 to 3.5 seconds. Pair short lines, or split a long one where the picture changes. A continuous performance stays 1 shot.
- Vary the framing across the silent shots.
- **Producible animated pictures:** animated objects, the stylised lead, simple shapes, 1 action. No live-action crane shots, no crowds.
- No words in any picture. The offer line and any captions are added in the edit.

## 6. Two ways to build the clips

**1 place, clips that continue (what the app does).** Clips of about 10 seconds, each starting on the last frame of the one before: about 25 sung words, 3 lyric lines to a clip. The lead's 1 place holds everything the lyric names from the first frame. The lead turns to the lens to sing and back to the action; nothing comes in from out of view. The clips are silent, and the song is laid over them when they are joined.

**A still per shot (by hand).** Each shot from its own approved start frame, grouped into clips up to the length the video model takes (`models.md`), with a cut on the beat between shots.

- **The song is sliced with no gaps.** A slice begins and ends on a natural musical beat, never in the middle of a word. Every instrumental stretch rides at the end of the slice whose lyric leads into it, and the outro ends the last slice.
- **A `SUNG` shot is matched to its slice,** mouth to words. The rest is silent picture under the song, so 1 clip can carry both.

```
Shot [N] ([time range]): image [N] is shot [N]'s start frame. [The lead / the object] [1 action]. Camera: [1 move, or still]. Cut on the beat to shot [N+1].
SUNG shot: the lead faces the lens and sings these words, mouth matching them: "[the lyric line]".
GUARD: no speech and no music made in the clip. In a shot not marked SUNG no mouth forms words. Same lead as the character picture. Real speed. No text anywhere.
```

Join the clips over the whole song.

## 7. What goes wrong, and the fix

| Fault | Fix |
|---|---|
| A jingle: the brand's name chanted | Rewrite the lyric around the customer's outcome, with real verses and a chorus |
| The hook arrives at second 12 | Move the catchiest line to line 1. No instrumental intro |
| The cut drifts off the song | Plan from the song's real word timings, not from 2.5 words a second |
| A section remade on its own no longer fits | Make the whole song again |
| A slice starts or ends inside a word | Move the boundary to the nearest beat |
| The lead changes between shots | Re-attach the character picture and name it. Never chain off the last shot's output |
| The lead mouths along in a silent shot | The GUARD line. Give the lead an action that is not facing the lens |
| A picture that cannot be animated simply | 1 object or the lead, simple shapes, 1 action |
| A sung line claims more than the brand holds | Change the line, never the fact |

## What is not done

- No artist, band, song or known tune named or imitated.
- No real person, child, celebrity or known character as the lead.
- No lead who sings a result of its own as fact, or stands as a customer, a founder or an expert.
- No invented pack, and no words in the picture.

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `customer-avatars.md` | `Who they are`, `The moment`, `Customer language bank` | The genre; the lead and its place; words that sing | Lead and place marked "inferred" |
| `products-and-positioning.md` | `Looks like`, `Pack`, `How it is used`, `Visible result`, `Core benefit` | The product on screen; what a silent shot may show | No pack photo: stop and ask. No `How it is used`: it stands closed |
| `brand-guidelines.md` | `Brand voice and tone`, `Motion and sound`, `Color palette`, `Brand world`, `Brand guardrails` | The genre and the vocal; whether the brand uses music or animation; the palette | Ask before a song is made |
| `brand.json`, `offers.json` | claims, forbidden claims, the offer, the guarantee | What a sung line and its picture may claim; the last line | A claim that is not there is not sung |

Source: distilled from skills/_library/starpop/song-style-ad (made by @davidaistar), kept there as handed over.
