---
name: buyer-stage
description: How an ad is written for 1 stage of awareness and 1 way of arguing, for any D2C brand. The script writer is sent the 2 files that match the concept (awareness/<stage>.md and sophistication/<1 to 5>.md), and nothing else from this folder. Use when a script must be right for where its buyer is.
---

# Buyer stage briefs

The principle section `ad-script-principles/sections/buyer-stage.md` says what the stages are. These files say what to do about 1 of them: where the ad opens, what its work is, when the product arrives, how hard it asks, which openings fit and the usual way it fails. A brief is judged on whether a script written with it opens, names the product and asks differently from a script written for the stage next to it.

- `awareness/`: unaware, problem_aware, solution_aware, product_aware, most_aware.
- `sophistication/`: 1 to 5, the way of arguing a market at that stage still listens to.

Each file is sent whole, so each is short: the 2 together stay under 220 words (a test holds them to it). Edit a file and the next script written for that stage follows it. `src/lib/scripts/stage-brief.ts` reads them by file name; none is renamed. They are sent only to scripts that choose their own shape (from research, or loose inspiration), not to a script that keeps a reference's structure.

Where a line would differ for a product that is used up and one that is kept (what to compare on, what the reversal is), the file names both.

Sources: the app's own buyer-stage principles, and the awareness-stage copy matrix, the hook tactics card and the creative brief's funnel table from the AI Operator skills (`skills/_library/ai-operator/creative`). What was not taken from them: the copy lengths in seconds (the length is the person's choice here) and the stock call-to-action phrases.

## What this reads from the brand brain

| What | Document and field | When it is blank |
|---|---|---|
| Which awareness file is sent | The concept's awareness stage; the brand's default is `brain.md`: Brand diagnosis, Market awareness level | The concept always has one. A brand with no diagnosis starts its concepts at problem aware and says so. |
| Which way of arguing is sent | The concept's sophistication stage; `brain.md`: Brand diagnosis, Market sophistication | The same: the concept's value is used. |
| The doubt a product-aware ad answers | `customer-avatars.md`: What almost stops them | The writer takes the first doubt of the way the product is bought, and says it assumed it. |
