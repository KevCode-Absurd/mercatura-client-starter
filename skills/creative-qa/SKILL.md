---
name: creative-qa
title: Pre-Launch Creative Check
description: The check a finished ad gets before it is approved for sending. The basics (watched whole, the size, the length, nothing under the app's own buttons, captions, the first 3 seconds on mute, a call to action), what lifts it (the hook on 2 layers, the pace, hook then story then what to do, one ad one job, the desire it touches, filler to cut, sounding like a person), the 4 questions for a picture, how many versions are worth making, the comparison with the ad it was built on, and 8 ways to open a video. Advisory: what the app can see it checks, the rest are questions for a person, and nothing blocks an approval.
---

# The pre-launch creative check

Written for this app from the playbook's "The Creative QA Checklist", "The Ad Creative Checklist: 5 Tests Before You Spend a Dollar", "Platform Creative Cheat Sheet" and "Creative Tips To Improve Performance" (under `docs/ecommerce-playbook/`). In the app it is 1 card, **Before you approve**, in a finished job on the Production board. The code is `src/lib/production/qa.ts`.

Each line on the card is 1 of 3 things: **checked** (the app looked and it is fine), **worth a look** (the app looked and something is off), or **for you** (only a person watching the ad can say). It advises. The approve button never waits on it.

## 1. The basics

| Check | What the app does | The rule |
|---|---|---|
| Watch it whole, with headphones | Asks | Start to end, sound on. Is the sound clean? Would you put your name on it? |
| The size | Checks a video is 9:16 | Reels, TikTok and Stories are 9:16. Each size is built for its own shape, never cropped from another |
| The length | Adds up the shots | A Reel does best under 30 seconds; a story takes 15 at most; TikTok runs 15 to 60 |
| Nothing under the app's own buttons | Asks | On a real phone: no words under the name bar or the icons. The playbook gives no pixel margins; the phone is the test |
| Captions | Checks whether they are drawn in | TikTok needs them. This app delivers video clean unless captions are switched on, so they are added where it is edited |
| The first 3 seconds, on mute | Asks | Would a person who has never heard of the brand stop? Words on screen land in under 2 seconds |
| A call to action | Checks the last shot and the feed button | Something to do next, said or shown |
| Every word, at full size (a picture) | Asks | Open it at 100%. Each word letter by letter; no stray mark at the end of a line; the button has its words in it |

## 2. What lifts it

- **The hook works on 2 layers.** Something to see and words on screen, both doing the work. The app checks the first shot has both.
- **Fewer words on the opening.** Over 8 words on screen in the first shot is flagged: can any be cut?
- **The pace.** Cut every pause. Change the frame often. The playbook's guide is about 2 seconds a frame; the app shows the number of shots and the longest one, and the person judges.
- **Hook, then story, then what to do.** Can each be pointed at? If 1 is missing, say why it is better without it.
- **One ad, one job.** Its 1 message in 1 sentence. With the last 3 seconds cut off, it still lands. A proof ad is only the proof; a demo is only the how.
- **The desire it touches.** Which 1 thing the buyer wants does it speak to?
- **Filler to cut.** The app searches the words for: really, very, just, actually, unique, amazing, incredible, high-quality, game-changing. Each becomes a number the brand holds, a customer's words, or nothing.
- **It sounds like a person.** Read it out loud. Would a customer say that to a friend? If a friend who does not know the brand says it sounds like an ad, it is written again.

## 3. The 4 questions for a picture

1. Where does the eye go first, and is that where it was meant to go?
2. On a phone, is it easy to read? Can any word be cut? (The app counts the words on the picture and flags over 30.)
3. Is it the right picture: does it fight the words, is there 1 thing to look at, is it too crowded?
4. Beside the ad it was built on: is this one better or worse, and what would improve it?

A static's headline does its work in 6 to 10 words; the app flags one over 10.

## 4. Versions

3 to 4 versions of 1 ad at most, each changing 1 thing that can be named. A new colour, 1 changed word or a new thumbnail is not a new ad. What makes a different ad is a different angle, format, buyer or stage. The app counts the hooks a script has and flags more than 4.

## 5. 8 ways to open a video

Tips to hold the first seconds against, not checks. Rules 2 and 8 pull opposite ways, and the playbook does not settle it: try both.

1. Open on the result the buyer wants, and bring the product in on the second shot.
2. Or open very close on the product, so they wonder what it is.
3. Open on why they are never going back to the slow, costly or worse way.
4. Bright natural light and music with some pace.
5. In season, show it as part of what people already do then.
6. A voice over it usually does better than none. The tone decides it.
7. A real buyer saying what made them buy it.
8. A human face first usually beats the product first.

## 6. What this is not

It is not the ad review (a second model reading the ad), the claims read, or the check on each rendered picture: those run where they always did. It gives no score. The playbook's numbers for results (a hook rate over 25%, a click rate over 1%) are for after an ad runs, and are its figures, not this brand's.
