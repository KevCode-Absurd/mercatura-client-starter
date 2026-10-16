---
name: cro-brain
description: Use when a user wants to add the CRO (conversion rate optimization) knowledge base to a brand brain. Triggered by "cro brain", "build the cro brain", "add cro brain", "/cro-brain". Copies the complete master CRO knowledge base (reference/cro-brain-master.md) verbatim into the active brand-brain folder as cro-brain.md. Reference only; does not run a live storefront audit and does not modify any other files.
user-invocable: true
argument-hint: "[optional: path to brand-brain folder]"
---

# CRO Brain: install the master CRO knowledge base into a brand brain

This skill does exactly ONE thing: place the complete D2C CRO knowledge base into the active brand-brain folder as `cro-brain.md`.

**What the knowledge base is for:** judging a store's pages as a buyer on a phone, in the order a buyer needs things, for any kind of product (its Section 0 and Section 3h), with every figure marked as sourced or as a rule of thumb. It works from the page alone and says what analytics would add.

**Where it sits.** The app's brand brain is 8 documents; `cro-brain.md` is a 9th file placed beside them and is the same for every brand. Nothing in the app reads it from the brand folder: the Landing pages module reads the master directly for its swipe library (Section 15), and `cro-audit` reads the master when a brand has no copy. Installing it is for people and assistants working in the brand folder.

## THE core rule: COPY, never author

The canonical knowledge lives at `reference/cro-brain-master.md` inside this skill. You deliver that file **verbatim, via a mechanical file copy** (Step 3). You do NOT rewrite, summarize, condense, paraphrase, restructure, or "improve" it. You do NOT retype it from memory or regenerate it with Write. The ONLY permitted edits are the three token swaps in Step 3. Summarizing defeats the entire purpose: the output must be the full playbook, not a digest.

Hard scope limits:
- Output exactly ONE file: `cro-brain.md`.
- Do NOT modify README, `.claude/CLAUDE.md`, brain files, or anything else.
- Do NOT run a live storefront audit, scrape the site, or score anything. That is the separate `/cro-audit` skill.

---

## Step 1 — Locate the active brand brain

Find the target folder, in this order:
1. A path the user passed as an argument.
2. A `brand-brain/` folder in the current working directory.
3. A folder one level down that contains `brand-guidelines.md` + `brain.md`.
4. None found → ask: **"Which brand brain folder should I drop the CRO brain into? Point me at it (e.g., `./brand-brain`)."**

**Don't clobber.** If `cro-brain.md` already exists in the target, tell the user and ask whether to overwrite (a refresh to the latest master). Never silently overwrite.

---

## Step 2 — Get the brand name (one lookup, nothing more)

Read the brand brain's `brand-guidelines.md` for exactly ONE thing: the brand name, for the title swap in Step 3. Read nothing else from the brand brain and tailor nothing else. Do NOT read the master file in full into context; that only invites re-authoring. The token lines are all in the first 10 lines of the master.

---

## Step 3 — Copy the master file, then make the three allowed edits

**3a. Mechanical copy (required method):** a file copy by the shell, not a rewrite. In a POSIX shell:

```bash
cp "<this skill>/reference/cro-brain-master.md" "{brand-brain}/cro-brain.md"
```

On another shell use its own copy command.

**3b. The only three edits, applied to the copy:**
1. Delete line 1: the leading HTML comment (`<!-- CRO-BRAIN-MASTER ... -->` maintainer note).
2. Title token: `# CRO Brain{{: Brand Name}}` becomes `# CRO Brain: {Brand Name}` if you have the brand name, otherwise `# CRO Brain`.
3. Date token: `{{today's date}}` → today's date.

Everything else stays byte-identical: every section, every number, every brand in the swipe library. Do not drop or shorten the brand list. Do not collapse sections. If the file is long, that is correct; it is a reference, not a summary.

---

## Step 4 — Verify (hard gate before delivering)

```bash
diff <(tail -n +2 "<this skill>/reference/cro-brain-master.md") "{brand-brain}/cro-brain.md"
```

Expected result: exactly two changed lines (the title line and the date line), possibly plus the blank line after the stripped comment. Any other difference = the copy was corrupted; redo Step 3 from `cp`. Also sanity-check `wc -l`: the output should be the master's line count minus the stripped comment line.

---

## Step 5 — Deliver the summary

> **CRO brain installed for {Brand Name}.**
>
> Copied the complete master knowledge base into `{path}/cro-brain.md` ({N} lines): operating instructions (judge on a phone, in the buyer's order, with or without analytics), first principles, the CRO must-haves, the full page-by-page playbook (home/collection/PDP/cart/checkout/listicle landing pages/post-purchase), what changes by kind of product, the 40-tip library, 3 Shopify revenue wins, 9-figure pricing & offers, the AOV / free-shipping-threshold method, FOMO, trust & imagery, retention & post-purchase SMS, the visual-tactic playbook, prioritization, and the full ~380-brand swipe library by niche.
>
> It is the full playbook copied verbatim, nothing summarized. Reference only; no live audit (use `/cro-audit` for that).

---

## Notes

- **Copy, never summarize.** The whole point of v2 is that the model stopped re-authoring (which dumbed it down) and now delivers the canonical file intact.
- **One file only.** Output is a single `cro-brain.md`. Do not touch any other file.
- **Source of truth.** To improve the brain, edit `reference/cro-brain-master.md` in this skill; every future install picks up the change. Code reads its Section 15: keep the `## 15.` heading and the `### Niche (count)` lines. A brand that installed an older copy does not get the change until the copy is refreshed (Step 1, "Don't clobber").
- **No audit.** Storefront auditing is the separate `/cro-audit` skill (which requires this file to exist in the brand brain).
- **Don't clobber.** If `cro-brain.md` already exists, confirm before overwriting.

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The brand's name, for the title | `brand-guidelines.md` Brand overview | The title is "CRO Brain" |

Nothing else is read and nothing is tailored: the knowledge base is the same for every brand. What it tells a reader to look up in the brand brain when using it (the buyer, the offer, the proof the brand really has, returns and delivery terms) is listed in `cro-audit`.

Not in the contract: `cro-brain.md` itself. It is a 9th file beside the 8 documents. Either the contract lists it as shared reference, or it stays out of brand folders and is read from this skill.
