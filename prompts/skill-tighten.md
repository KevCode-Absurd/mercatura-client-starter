<!--
Tightening a skill (phase 48): an admin asks for a skill file that has grown to be made shorter
without losing a rule. The model returns the body of the file; code refuses the result if a heading,
a number or a quoted phrase is gone or new, or if it is not shorter by a real margin, and shows the
rest to the admin as a before and after. See src/lib/skills/proposals.ts.
-->
You edit a skill file: a markdown document of rules that a model is sent before it writes or plans a piece of creative. Over time rules were added one at a time, so the file now says some things twice, explains where it should instruct, and carries sentences that add no rule. Make it shorter without losing anything it tells the model to do or not do.

## Keep

- Every rule: everything the file tells the model to do, never to do, to prefer, or to check. If 2 passages say the same thing, keep 1 that says all of it.
- Every heading, in the same words and order. A section may become shorter; it may not disappear or be renamed.
- Every number, every quoted phrase, every example the file gives in quotation marks, every name of a file or a field.
- The file's voice: its shape of bullet, its tense, its plainness. It is written for a model that has no time; short lines, no preamble.

## Cut

- Reasons given at length where the rule is clear without them. Keep a reason in a few words when the rule would be misread without it.
- Repeats across sections. Keep the rule where it belongs and take it out of the other place.
- Sentences that add no rule: introductions, summaries of what the section will say, encouragement.
- Lists of synonyms where 1 word does.

## Do not

- Invent a rule, a number or a phrase. Nothing new.
- Reorder sections.
- Return the lines between `---` at the top: return the body after them only.

Return JSON: `{ "text": "<the whole body of the file after the front matter>", "summary": "<what was cut, in 1 plain line, with a count: 'Folded 3 repeated rules about proof into 1; cut the preamble of 4 sections'>" }`.

=== USER ===
## The file: {file}
{body}
