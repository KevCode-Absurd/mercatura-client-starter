---
name: copy-craft
description: The craft of copy that sells, for any D2C brand, in parts. How a writer reads the buyer and picks the way in, how a hook, a headline, the words on a picture, the points, a long story, the body and the close are written, how an editor reads a draft, and what a judge marks down. Each step that writes, edits or judges a customer's words is sent only the parts its job needs. Distilled from The Copy Machine (the direct-response-copy and copy-chief skills and the Copy Canon), in this app's own words. Do not use on its own: it is sent beside the order of priority for every word (copy-floor) and the brand's voice and facts.
---

# Copy craft

This is the skill that governs how the words are written. It sits under the order of priority for every customer-facing word (`skills/copy-floor/CARD.md`, sent to every writer, editor and reader): natural plain English first, then it sells, then it tells a story, then the brand's language, and last and optional the brand's devices. Every part here agrees with that order. What the parts add is the craft a senior direct-response writer brings to any brand: where to start, which way in fits this buyer, how a long story of a problem is told and held, what a body must hold, when an edit is worse than the line it replaced.

It is a library in parts (`parts/*.md`). No step is sent all of it, most steps are sent little of it, and the step that plans an ad's picture is sent none (see "Which step is sent what"). `src/lib/skills/craft.ts` holds the table of which prompt is sent which parts, and `prompts.ts` fills `{copy_craft}` in each prompt from that table.

No part states how long a piece runs. The length of primary text and of a script is set in code by the buyer's stage (`src/lib/copy/stage.ts`) and reaches each writer with its request.

## The parts

| Part | What it holds | Words |
|---|---|---|
| `reader` | Read the buyer before writing: where they are, how often they have heard the promise, the 1 want, 1 idea a piece, how much change the piece asks for | 290 |
| `buyer` | What makes a persona a writer can write to: what they live through, do now, tried, feel, believe, want | 200 |
| `leads` | The 6 ways into a sale and which buyer each is for; a lead runs as long as the stage needs; 2 versions are 2 different leads | 490 |
| `long-story` | The long primary text for a buyer who does not know the problem or only feels it: 1 person, the problem made worse through the fixes that failed, the cause said plainly, the product late; what keeps someone reading to the end | 420 |
| `hooks` | Where a hook comes from (the belief that keeps the buyer stuck), the 3 things it carries, clear beats clever, a video hook in 2 steps, words on screen | 580 |
| `hook-check` | The same, as a judge reads it: said aloud and understood first, then the reason, then the rest | 290 |
| `headlines` | A headline is a plain sentence that picks its reader and gives a benefit; the stranger test; what it does at each stage; "so what?"; 4 ways in, each a whole sentence | 650 |
| `picture-words` | The words on an image: each line a plain sentence or a phrase a person says, clear alone, agreeing with the picture; say less, never squeeze | 240 |
| `points` | A point is a small sale in a plain sentence; mending a flat one in 4 moves; kinds to mix; order; on an image | 520 |
| `body` | The 4 things a body holds, the 1 interesting true thing, selling against what they do now, making it seen, proof, no comfortable place to stop | 720 |
| `close` | The deal, the risk, the last doubt, 1 action, what waiting costs when it is true | 270 |
| `feed-copy` | 3 things that hold for copy beside an image at every length: the first sentence stands alone, it does not repeat the picture's words, any headline reads with any text | 140 |
| `editor` | Name what is interesting before fixing anything; when a field fails, starting with a line nobody would say; every fix has to beat the line it replaces, and plainer wins | 700 |
| `tells` | 18 shapes that read as written by a machine, each with what to do instead; rhythm | 650 |
| `repair` | Mending 1 passage: what is wrong, the smallest repair, where to stop | 350 |
| `revise` | Changing copy that exists: what stays, and the 3 questions for every changed line | 190 |
| `sweep` | 15 yes or no questions a judge asks, the first 3 being the order of priority, and what a piece is never marked down for | 400 |

## Which step is sent what

| Step (prompt) | Parts |
|---|---|
| The script writer (`script`) | reader, hooks |
| A script written from principles (`script-flow`) | reader |
| Image ads, the picture (`studio-plan`, a set of ads) | nothing (see below) |
| Image ads, the words on the picture (`studio-words`) | reader, picture-words, headlines, points |
| Image ads, the long primary text of an unaware or problem aware ad (`studio-feed`) | reader, leads, long-story |
| More headlines for 1 finished ad (`studio-variants`) | reader, headlines |
| Product page images (`studio-plan`, a product page set) | headlines, points |
| A photoshoot | nothing: it has no words |
| An ad cut from a script (`image-plan`) | headlines, points |
| The 50-ad sprint (`sprint-plan`) | reader, hooks |
| New hooks for a reference ad (`reference-hooks`) | reader, hooks |
| Copy asked for in the chat (`chat-copy`) | headlines: reader, headlines. Primary text and captions: reader, leads. Hooks: reader, hooks. Angles: reader, buyer, hooks. Descriptions: nothing |
| Concepts (`concept-suggest`) | reader, buyer, hooks |
| Personas and the builder's start (`persona-build`, `builder-start`) | buyer |
| Offers (`offer-build`, `offer-set`) | close |
| A landing page (`lp-write`) | reader, leads, headlines, body, points, close |
| The copy pass (`copy-pass`) | editor |
| The voice pass (`voice-check`) | tells |
| The repair of a failed line or plan (`line-repair`, `plan-repair`) | repair |
| A script changed in the chat, or retold (`script-revise`, `transpose`) | revise |
| The hook grades (`hook-grade`) | hook-check |
| The script audit and the ad review (`audit-judge`, `ad-review`) | sweep |

A step that writes no word a customer reads is sent nothing. `feed-copy` is kept in the library and sent to no prompt today. `COPY_CRAFT=off` in the environment sends nothing to any step, so the app can be run as it was before this skill (`pnpm copy:test`).

**Why a writer of short copy is sent so little.** The first version sent the script writer and the ad planner the parts on the body, the close and the feed copy as well. Read blind against the app without the craft (`DECISIONS.md`, phase 41), those pieces piled up points and lost. What won pairs was a piece written to the 1 doubt of the buyer it was for, which is the `reader` part. So `body` and `close` are sent only where a piece is long by nature (a landing page) or is the offer itself. Before sending a part to a new step, run the test.

## What outranks it

1. **The order of priority for every word** (`skills/copy-floor/CARD.md`): natural, then it sells, then it tells a story, then the brand's language, then the brand's devices. No part buys back a higher rule with a lower one, and no part is a reason to cut a sentence down to a fragment.
2. **The step's own rules and limits.** A limit on characters or lines, the length given for the buyer's stage, and the rule that an image ad carries no bracketed placeholder hold whatever a part says.
3. **The brand's facts.** No part permits a figure, a quote, a person, a study, a deadline or an offer term the brand's material does not hold.
4. **The brand's language:** who it talks to, its words for things, its tone. A device of the brand's (a rhythm, short sentences, a turn of phrase) is an option on a line that takes it without bending. It does not protect a shape listed in `tells`, and a plain line is never off voice.
5. **The rules learned from feedback** on this brand.

## Where each part comes from

The source is kept as it was handed over in `skills/_library/copy-machine/`, with 9 close readings in `skills/_library/_digests/copy-machine-*.md`. Nothing is copied word for word: the rules are restated for this app, and every example is made up, from more than 1 kind of product.

## What was left out on purpose

- **The source's "clever" layer as a standard.** "A fragment that lands a beat", "a fix that is only plainer loses" and "a rival could run it unchanged" as the first fault. They made lines nobody says. Plain wins here, a fragment is a fault unless it is a label, and the rival question comes last.
- **"Extreme commercial mode" and the default aggressive tone.** The source writes at full pressure unless told otherwise and says not to default to a brand voice. Here the order of priority decides, and the brand's language is part of it.
- **Bracketed placeholders in finished words.** The source keeps a line bold and puts `[your number]` where a fact is missing. This app does that in scripts only; an image ad is published as rendered, so it argues something the brand has.
- **The flags to "the buyer".** The source hands its doubts to a person in a chat. Here they are the checks and warnings on the piece.
- **Power-word lists** ("instantly", "secret", "shocking", "guaranteed"). Several are on this app's own list of words that read as hype.
- **The insider and conspiracy forms** of headline and bullet, page-number teases, and anything that needs an invented study, expert, deadline or customer. The source itself marks these as teaching fiction.
- **Result-in-a-timeframe promises** ("in 30 days") as a default form: for a product that is eaten or applied they are a claim about the body.
- **"It wasn't your fault" as a stock line.** The fault is moved off the buyer only by naming what the earlier attempt lacked.
- **The scoring sheets** (40 points for a headline, 8 dimensions of 100 for an ad). The app's judges keep their own scales; the questions behind the sheets are in `headlines` and `sweep`.
- **Word ranges for feed copy by price of product.** Length is set by the buyer's stage, in code.
- **Everything about running a business with the package:** the interview, saved memory files, installation checks, the launch checklist for tracking and pixels, email sequences, long sales letters and their lengths. See the digests.

## What this reads from the brand brain

Nothing directly: a part is sent as written. Each step that sends it also sends the brand's material, and the parts point at it.

| A part speaks of | Document and field | When it is blank |
|---|---|---|
| Where the buyer is, and how often they have heard the promise | The concept's awareness and sophistication stage; `brain.md`: Brand diagnosis | The writer says which it assumed |
| The buyer's words, what they tried, what they do now | `customer-avatars.md`: Customer language bank, What almost stops them; the research themes | A named gap. Nothing is written as a customer's words that no customer said |
| The cause of the problem, in a long story | `products-and-positioning.md`: Key features, How it is made; `brand.json`: claims with their sources | The story stays with what the person notices. No cause is invented |
| The 1 interesting true thing | `products-and-positioning.md`: Key features, How it is made, Positioning angle; `brand-guidelines.md`: Unique selling propositions; `competitors.md`: Differentiation summary | The piece is built on the buyer's situation, and the gap is said |
| Proof | `brand.json`: claims with their sources, proof assets, the guarantee | The claim is made smaller, to what the brand can show |
| The deal and the guarantee | `offers.json`; `brand.json`: guarantee | The close names the action and what the buyer gets, and no terms |
| The brand's language | `brand-guidelines.md`: Brand voice and tone, the brand's own published lines | Plain and specific; no sound is made up for the brand |
