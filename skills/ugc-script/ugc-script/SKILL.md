---
version: 0.3.0
name: ugc-script
description: Write a UGC video script by hand from a brand's brain - 1 person talking to their phone in 5 beats (hook, setup, demonstration, turn, close), with delivery notes, a shot list and 3 hook variants, for a real creator or a generated presenter. Use for "ugc script", "write a creator script", "script for an AI UGC ad", "creator brief". The rules for the words are in script-format-ugc, which the app's script writer reads; this skill is the method around them and what a planner needs to fit the script to clips. Not for making the video (realistic-ai-ugc) or a pack of hooks (ai-ugc-hooks).
---

# UGC script

A UGC script is what 1 person says to their phone about a product, written so it sounds said and not read. It is judged on 3 things: a stranger would take it for a person talking and not an advert, 1 belief has moved by the end, and every fact in it is the brand's.

**The rules for the words live in 1 place: `skills/script-format-ugc/SKILL.md`.** The 5 beats, the 1 specific number, the turn that underclaims, the soft close, what a generated presenter may not say: all there, because that is the file the app's script writer is sent. This skill is the method around those rules, for a person or an agent writing a script by hand, and (in `CARD.md`) what a planning step needs to fit a finished script to clips.

What a good script is, in general, is in `skills/ad-script-principles/sections/`.

Approved handling and evidence override the method's use and held-close examples. With `handling=display`, the visual proof is a verified sealed detail/front on a support; nobody holds, opens or uses it, and no scale or efficacy is inferred. Do not draft a use claim that requires unavailable evidence. If approved words already require it, return to the writer and approve revised words before generation.

## The method

### 1. Read the brain

The fields under "What this reads from the brand brain" below. A fact that is not in the brain is not written: mark the gap `[VERIFY: what is needed]` and ask. Read `winning-ads.md` and `brain.md` (What we know works, What to avoid) so the script does not repeat the last one.

### 2. Who will say it

This changes what can be said, so it is settled first.

- **A real creator** who has used the product can tell their own story and give their own result. The script leaves their true details as placeholders in square brackets.
- **A generated presenter** is a fictional adult: no personal result, no personal story told as fact. The script is in second person, or observation, or a real customer's words given as a quote.
- **A founder, a named customer, an expert:** only that real person, on their own footage.

### 3. Declare the spine, before a line is written

If 1 of these cannot be filled, the script is not ready to write.

- **1 person, 1 moment.** Not an avatar's name: the version of them this script talks to, and where they are when the problem shows (`The moment`).
- **The belief to move.** What they think now, and what they will think after. 1 only.
- **Where the buyer is:** the awareness level and sophistication in `brain.md` (Brand diagnosis). A script for a stage the brand's ads already cover is a choice to state, not to make by accident.
- **The 1 or 2 doubts to answer** (`What almost stops them`). They are answered in the demonstration, on camera, not in a caption.
- **The story type:** a change, a confession, a routine, a discovery. 1.
- **How it is filmed and said:** at arm's length or propped up; said loosely from the lines or word for word.
- **The product,** by its name in the catalog.
- **The length.** It follows the idea. A doubt talked through needs 45 seconds or more; a routine or a discovery lands in 20 to 30. A script is never squeezed to a length it does not fit.

### 4. Write the 5 beats

By the rules in `script-format-ugc`. Timestamp each beat to the length chosen. Only the hook (the first 3 seconds) and the close (the last 5 to 10) have fixed places.

```
Script: "[title]"  ([N] seconds; [real creator / generated presenter])
Hook (0 to 3 s): "[the line]"   [what is seen]
Setup: ...
Demonstration: ...
Turn: ...
Close: ...
```

### 5. Add what the maker needs

- **Delivery notes:** tone, pace, where they are, what they wear, what is in the frame, how the phone is held.
- **A shot list:** 4 to 8 shots with times, each 1 action, each saying which hand holds what. The product arrives where the script requires it; a problem-led opening does not force it into shot 1. Worn products retain their own production rules.
- **3 hook variants, each a different lever** (`skills/ai-ugc-hooks/ai-ugc-hooks/references/hook-frameworks.md`), each read aloud with line 2. Where it helps, 1 of them speaks to a buyer who knows less than the main hook assumes.
- **A short cut-down, only if the idea survives it.** If the script depends on its build, say so and write none.

The five beats belong to the whole ad. When production divides it into clips, each part serves a different purpose and continues the previous thought; do not restart the hook, reveal and CTA in every part. Allow time for the actual use steps and a natural spoken pace. A longer ad earns its length by answering a real doubt or showing evidence, not by repeating the product pitch.

### 6. Check it

1. Read it aloud, standing, at the pace it will be said. A stumble, a line nobody would say, a breath run out: fix those lines.
2. Every number, price, claim and quote is in the brain, in the same terms. Customer quotes are word for word, with their source.
3. Exactly 1 specific number. The turn claims less than it could. The close is soft and still names the action and what happens next.
4. The speaker could truthfully say every first-person line.
5. No banned word from the brand's guardrails. None of: game-changer, revolutionary, obsessed, life-changing. No long dashes.
6. Any line that would also work as a voice-over on a polished advert is rewritten until it would not.

In the app these checks are steps of their own (the copy pass, the voice pass, the claims read when it is switched on, the surfaces check). By hand, they are done here.

### 7. Hand it on

- For a real creator: the brief in `references/creator-brief-template.md`.
- For a generated presenter: `skills/realistic-ai-ugc`.
- Record the angle, the story type and the product where the brand keeps its scripts, so the next one is different.

## Reference files

- `references/creator-brief-template.md`: the brief a real creator films from

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `customer-avatars.md` | The avatar: `Who they are`, `What they care about`, `Why they buy this product`, `What almost stops them`, `How to talk to this person`, `The moment`, `Grounded in` | The 1 person, the doubts, the setup | Ask which avatar; no avatar, no script |
| | `Customer language bank`, `Ranked insight bank` | The buyer's own nouns; a quoted line | Write plainly; quote nothing |
| `products-and-positioning.md`, the product | `What it is`, `Core benefit`, `Price`, `How it is used`, `Visible result` | The demonstration, the turn, the close | `[VERIFY]` and ask |
| `brand-guidelines.md` | `Brand voice and tone` (Voice do's, Voice don'ts, Tone by context); `Brand guardrails` (Never say, Always); `Key phrases and taglines` | How it sounds; what is never said | Ask |
| | `Motion and sound`: Formats in use, Pace | Whether UGC is a format the brand runs, and at what pace | Assume a normal talking pace |
| `brain.md` | Brand diagnosis; What we know works; What to avoid | The buyer's stage; not repeating | State the stage as "inferred" |
| `winning-ads.md` | Pattern summary; the entries | What has been said already | None |
| `competitors.md` | Differentiation summary | What only this brand can say | Leave comparison out |
| `brand.json` | Claims with sources, forbidden claims, the guarantee | The 1 number, every fact | `[VERIFY]`; never invent |
| `offers.json` | The offer in use, real dates | The close | Close without an offer |
| `lessons.json` | How the product is opened, held and used | The demonstration and the shot list | None |
