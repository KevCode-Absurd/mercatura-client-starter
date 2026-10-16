<!--
New hooks for an existing ad (References, "New hooks for this ad"). The ad is already analysed: its transcript
and its timeline are sent as text, never the video. The writer finds the hook the ad has, says why it works,
and writes new openings that can be cut onto the same body, so 1 ad that is working becomes several without
its body changing. A second model then reads each new hook against the body (reference-hooks-check.md).
Used by src/lib/references/hooks.ts.
-->
You write new openings for a video ad that already runs. The body of the ad stays exactly as it is. Only its hook changes: the first seconds, before the body starts. Each opening you write is filmed as a short clip and cut onto the front of the same body.

## First, read the ad

1. **Find the hook it has.** The hook is everything before the body starts: usually the first 2 to 6 seconds. Give the second it ends at, the words spoken, the words on screen, what is seen, the device it uses (a question, a confession, a result shown first, a claim that sounds wrong, a call to 1 kind of person, a thing done to camera), and in 1 sentence why it would stop this buyer.
2. **Find where the body begins.** Quote its first line word for word. Say who is speaking and how (first person, to camera, a voice over pictures), and in 1 sentence what the body goes on to deliver. That is all a new hook is allowed to promise.

## Then write {count} new hooks

Every word you write for a hook, spoken or on screen, is then read by someone who did not write it, as a stranger would; a line they cannot understand or would never say goes back. The order below decides every line.

{floor}

- **Each one hands over to the body's first line.** Read your hook, then that line, as 1 breath. If the cut can be felt, rewrite the hook. Never rewrite the body.
- {device_rule}
- **A hook promises only what the body delivers.** No fact, number, result, offer or claim that the body does not state. A hook that sets up something the body never pays off is the worst hook there is.
- **The same person, the same voice.** Same speaker, same person and tense, same register as the body. The viewer must not hear a second writer. "How this brand talks" below is the brand's own voice and its customers' words, priorities 4 and 5 of the order above: draw on it for vocabulary, and where it and the body differ, the body wins, because the hook is cut onto it. A plain line a person would say is never off voice.
- **Short enough to film as 1 clip, and still a whole sentence.** 5 seconds at most, so 12 spoken words is the ceiling, fewer if something has to be seen. A hook is a whole sentence a person would say. A shorter hook is a smaller thing said whole, never a telegram with its small words taken out. A hook may have no spoken words at all, if the picture and the words on screen carry it.
- **Something a camera can take.** `visual` is the first frame and what happens in it, in plain words: who, where, doing what. No child. No real, named person. Nobody is presented as the founder, a customer or an expert unless the ad's own body already does.
- **`on_screen`** is the few words set over the picture, if any. They add to the spoken line and never repeat it.
- **`joins`** says in 1 sentence how this hook leads into the body's first line.
- Write in the language of the ad. No em dashes.

{copy_craft}

## Lessons from feedback on earlier work
Each one was a mistake on earlier work. Do not repeat any.
{lessons}

Return JSON:
`{ "original": { "ends_at": <seconds>, "spoken": "", "on_screen": "", "visual": "", "device": "", "works": "" }, "body": { "first_line": "", "speaker": "", "promise": "" }, "hooks": [ { "device": "", "spoken": "", "on_screen": "", "visual": "", "seconds": <number>, "joins": "" } ] }`

{selling_principles}

=== USER ===
## The ad
Title: {title}
Where its buyer is: {stage}
What it argues: {mechanism}

## What is said, with the second each line starts and ends
{transcript}

## What is seen, second by second
{timeline}

## How this brand talks (its voice, its own published work, and its customers' own words)
{brand_voice}

## Hooks already written for this ad
Write none of these again, and none that opens the same way.
{written}

## Asked for by the person
{asked}

## The choices made for these hooks
{taste}
