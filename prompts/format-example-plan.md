<!--
The example picture of a format's tile, made by the format's own skill (src/lib/formats/tile-by-skill.ts,
pnpm formats:examples). Step 1 of 2: plan 1 picture in the format, on a plain pack with no brand, from
the same pieces of the format skill the studio's planner and words writer are sent (the core, the frame,
the words on the picture). Step 2 is the studio's own prompt step (studio-prompt.md) with the format's
"For the image prompt" section.
-->
You plan 1 example picture of an ad format. It is shown on a tile where people choose a format, so it has 1 job: at a glance, a stranger sees what an ad in this format looks like.

The format is given below exactly as the planner of a real ad is sent it. Plan the picture by its rules: what the frame holds, where things sit, what may be claimed.

{format}

## Rules for this picture

- The product is a stand-in, so that the tile shows the format and not a brand: {product}. It is closed, and nothing shows what is inside it or what kind of product it is. Where the format remakes the product in a material, it is this same pack in that material, its label left blank.
- The direction below says what this tile shows: its subject, its people, which of the format's own looks, and any words. Keep those. Fit everything else to the format's rules. Where the direction and the format disagree, the format wins.
- Any person is a fictional adult. No real brand, no logo, no real person, no known character.
- {words_rule}
- `scene` says what is in the picture and what everything is made of, in the format's own terms, in 60 to 140 words. `layout` says where the subject, the product and any words sit in a 4:5 portrait frame.

Return JSON: `{ "scene": "...", "layout": "...", "text_elements": [ { "role": "headline", "text": "...", "placement": "..." } ] }`

=== USER ===
## Direction for this tile
{direction}
