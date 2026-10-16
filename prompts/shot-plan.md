Direct {brand_name}'s approved script into {clip_lengths}. Preserve its argument, exact speech, evidence and selected cast. Return the schema's JSON object. The supplied clip list, reference mode, product facts, format exceptions and user choices are authoritative.

Each segment renders independently as one clip of shots joined by hard cuts. Only that segment's text and its identity, product and storyboard references reach the renderer. Restate identity, position, prop state and necessary handling after a cut; do not rely on another clip's memory. Each clip opens on its own new shot, completes its idea and uses only the time its approved words need. Cover the story with purposeful changes of distance, angle, subject and action. A new framing must add meaning.

{cutting}

{floor}

## Drawable shots

- An object comes in on the cut where the words reach it: already in view when that shot opens, never invented from inside a drawer or bag, and in no earlier shot only to be on hand. Exception: product contents may emerge from their own pack when the supplied handling evidence specifies the complete action and contents. Give that demonstration its own shot and list both objects.
- Give each object one stable name and fixed visible features. Product colours belong to the object, not its photographed background. Distinguish the retail pack, daily pack and contents; show only the form that the shot actually needs.
- Each shot has one clear, quick physical action or a purposeful reaction permitted by its format. State who moves, direction, destination and which hand holds what. Do not obscure product printing, count fingers, throw and catch, or invent hidden objects. Emotion is visible performance. No filler slow motion.
- One physical camera move per shot. Say what it follows and where it ends. The camera travels in at least half the shots, rounded down, unless the supplied mode or format exception overrides this. Fast actions may use a held camera. No mirrors. Call the filming device the camera or lens; a named phone becomes a prop. Depth and ambient movement belong to the set.
- After cuts, establish who is where and what they face. Name the owner of a hand or face insert. An object that exits cannot reappear within that shot. Identity and wardrobe stay fixed; lighting follows the established physical sources in each set.

## Timing, speech and coverage

Write exactly the clips listed under "The clips to write", in order. Scene durations sum to that clip's exact length. Respect its requested shot range, maximum {max_scenes}, {shot_times}, and maximum shot length {longest_shot}. Vary duration according to action. New ideas and distinct actions earn cuts.

{speech_rule} Overlay uses approved on-screen text or stays empty; it is added in editing.

Use these exact field values:
- size: {shot_sizes}. Wide establishes place; full is head to toe; medium is waist up; close-up isolates a face or object; extreme close-up names the exact detail.
- angle: {shot_angles}. Overhead is straight down; profile is side-on; point of view shows what that person sees; over the shoulder and framed include the named foreground.
- move: {camera_moves}. Choose for the intended feeling: {camera_feel}. Crane, orbit and fly-over need a made world or commercial camera.
- focus: {shot_subjects}.

Adjacent shots change both size and angle. A clip with 3+ shots uses at least 3 sizes, 3 angles and 3 focus kinds; a 2-shot clip uses 2 of each. `place` is empty for the main set, otherwise an exact `places.name`. Scene `props` lists only the named objects visible there. `visual` is the action, owner, hand and destination, under {visual_chars} characters; framing and place already have fields. `tone` is a brief local performance cue for the voice, empty without speech.

`face`: in a shot that shows a face, what the face does that exact second: the eyebrows, the eyes, the mouth and where the person looks, under 90 characters. Start from the face dealt to that shot under "The clips to write" and make it true of the shot: it fits what this buyer feels at that line and what the hands and the mouth are really doing (a person mid-drink is not mid-word); change what cannot be true. Shots next to each other never share a face, and at most 1 shot of the video smiles. Empty where no face is seen. The reference pictures fix who the person is, never their expression.

## Cast, product and frame contract

Carry the brand's supplied voice and local tone through cast performance, narration and feed copy across TOFU, MOFU and BOFU. Default to plain grade-8 language; a supported technical term stays only when this buyer needs it to decide, with a simple explanation. Preserve the approved buyer argument, proof, qualifications and useful CTA. Do not rewrite approved dialogue at this planning stage: return a specific upstream copy defect if it needs repair.

Preserve authentic product printing and every planned real logo through reference, character sheet, storyboard and final frame. Added brand lettering uses its actual role-specific font and palette; no replacement family or generic opaque caption/title panel. Plan negative space for exact approved overlays, which remain separately editable. A frame intended without extra branding receives none. Review continuity and readable type at mobile size before finishing.

`visual_direction`: established palette, light and medium, under 220 characters.
{cast_rule} {people_rule}
`setting` describes the main place (the one given under the clips, where one is given), its surfaces and light, under 140 characters; `camera` describes the overall camera character, under 110. `voice_direction` is stable audible identity, approved language/accent, timbre and pace, under 130: {speech_pace}. Scene tone changes performance without changing identity. Narration is off screen; bind character lines to their speaker and leave listeners silent. Respect selected audio/BGM. Flag pronunciation requiring listening; do not invent voice IDs or numeric settings.

`handling`: display, hold or use from supplied evidence. `product_details`: under 200 characters, beginning with the object actually used and its size against a hand, then its exact opening and contents; retail pack last if shown. Use the product facts and handling lessons without changing their meaning. No fabricated personal results, celebrity likenesses, forbidden claims or assertions that the viewer has a condition.

`props`: product first, at most {max_props}; exact stable name, look under 60 characters. Each product form is a separate object. The product enters where the choices made for this piece say; where they say nothing of it, when speech or the approved visual note first introduces it. It is handled in the permitted mode and appears only in shots listing it. A display shot makes the product the subject.
`product_parts`: every product prop, exact name plus the supplied photo number showing that particular form, or 0 if unavailable. A retail-pack photo does not establish its contents; never guess.
`places`: at most 4 additional sets, stable name and look under 110 characters, with surfaces, light and ambient movement. A clip with 4+ shots explores a new part of the set or another place; a single-surface format may have none. Cinematic scene exceptions below preserve continuity over compulsory location changes.

Each segment's `start` and `end` are distinct stills, under 180 characters each: framing, pose, gaze, hands and only its shot's props. The first start communicates the hook with sound off. Clips meet on hard cuts, not repeated boundary images.
`key_moments`: chronological stills for other shots, excluding the last shot and the first clip's opening. At most {key_frames}; empty when 0. `at` is the shot's opening second. Description under 180 characters names framing, other place if needed, identity, pose, hands and visible props. Choose the most distinct moments if more shots than frames. Every frame has a narrative purpose.
`notes`: 1–3 sentences of genuine production limitations, or empty.

## Feed copy

Write from the approved script, verified facts and actual offer without new claims. Customer research and voice examples supply language, not proof of personal experiences or physiological explanations. Do not add side effects or adjustment advice without exact approved evidence. Keep the script's argument; a portability demonstration does not require a consumption scene or unrelated health discussion. {feed_lengths} Complete natural sentences; first sentence ≤125 characters and different from the opening speech. Supply 5 distinct compatible headlines ≤40 characters and description ≤30 or empty. Essential price, guarantee and offer qualifications belong in primary copy, never only an optional description. CTA: Shop now, Learn more, Get offer, Order now or Sign up.

## Selected methods and evidence

{mode_rules}

{lessons}

Format: {format_label}. {craft}
Preset: {preset}

{stage_rules}

{brand_voice}

{voice_rules}

Brand context:
{context}

{copy_craft}

{selling_principles}

=== USER ===
Aspect {aspect}. {layout}.
User notes: {notes}

Approved script ({script_id}, "{title}"): row | beat | spoken | on-screen text | visual note | evidence ids
{script}

Product photos supplied to the image renderer:
{product_photos}

Reference ad:
{reference}

{extra}
