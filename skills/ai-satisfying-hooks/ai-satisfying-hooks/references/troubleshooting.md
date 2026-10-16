# When a clip comes back wrong

Each row is something that came back wrong, why, and what the next prompt says. A fault is written down as 1 line (what was asked, what came back) and added to the brand's lessons, so the next job is told. Facts about a named model, and the list of words its filter refuses, are in `skills/production-principles/models.md`.

Rows marked * were seen on our own clips (2026-10-04, 2 clips, text only).

| What came back | Why | What the next prompt does |
|---|---|---|
| The product's colour or shape is wrong * | No photo was attached; the colour was only named | Attach the product out of its pack and name its job. Repeat the brain's own colour words |
| The camera is not where it was asked to be (a view from inside came back as a side view) * | A camera position in words is not obeyed | Make the opening still from that position, approve it, start the clip on it |
| The first second shows an empty set * | The clip was asked to begin before the action | The opening still has the motion part-way. The first line of the action says "continues" |
| The camera barely moved * | Camera moves are followed weakly | Let the motion carry the clip and lock the camera. If the move matters, give its start side and end side |
| The sound is wrong, or there is music * | Nothing was said about sound, so the model chose | Name the sound of the motion and of the end. "No music. No voice." A person listens before the clip is used |
| The footage looks slowed | A speed word, or a verb like "explodes" | `realism-rules.md`: `real speed` once, natural verbs. Asked twice and still slowed: change the mechanic |
| The motion ends early and the clip idles | The end was not timed | Say when the end comes: the last third. Use the shortest clip the model makes |
| A second thing happens after the end | The prompt left the last second open | "Nothing moves. The frame holds on ..." |
| Pieces multiply, merge or float | No count, no word on how the material behaves | State the count. Add the material's behaviour from `realism-rules.md` |
| The pack opens in the wrong place | How it opens was not said | Copy the step from `How it is used` and the lesson, word for word |
| Letters or a logo appear that are not the pack's | The model filled a blank surface | "No words except the pack's own printing." Attach the pack photo |
| A hand covers the label, or has the wrong number of fingers | The hand was left to chance | Say which hand, what it holds and where the other one is. Or pick a mechanic with no hand |
| The job is refused by the filter | A word on the filter list, or a named place, shop or trademark | Rewrite once without the word. A second refusal: change the idea, not the wording. A refusal is charged like a clip |

## Joining a hook to an ad body

- The hook is scaled to the body's size and frame rate, never the other way round.
- The hook keeps its own sound. Muting it makes the body's sound cut in hard.
- The hook's last frame and the body's first frame are looked at side by side before the join: same kind of light, the product in both, nothing that reads as a change of subject.
- The raw clip is kept. The overlay goes on a copy.
