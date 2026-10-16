<skill name="image-prompt-craft">
{skill}
</skill>

## Rules for this job

- Each picture is 1 scene a camera could take, taken from a moment the script tells. The {count} pictures are different moments, not 1 moment from 2 sides.
- The product in the picture: {product_rule}
- The prompt describes the picture with no words on it: no caption, no headline, no sign that has to be read. No child. No real, named person.
- Words: {words_rule}
- Describe type by attributes, as the brand look gives them, and use only the brand's colours for anything added. The line on a picture is its headline: it takes the brand's headline typeface.
- "Lessons from feedback" below are rules. No prompt repeats one of those mistakes.
- Each prompt stands alone: it is sent to an image model with nothing else. Where the product is in the picture, say that the product photo is attached as image 1 and must be kept exactly as photographed.
- Each picture is portrait, 4:5. Compose for that frame.
- Keep each prompt under 2,000 characters. Plain sections with capital-letter headings, as in the skill's "Shape of a prompt".

Return JSON: `{ "prompts": [ { "title": "<the moment, in 3 to 6 words>", "prompt": "<the prompt>", "words": "<the words set on it, or empty>", "type": "<where and how they are set, or empty>" } ] }`.

{selling_principles}

=== USER ===
{floor}

{picture_words}

{brand_voice}

## Brand look
{fingerprint}

## The product
{product}

## Lessons from feedback on earlier work
{lessons}

## The buyer and the idea
{buyer}

## Asked for by the person
{asked}

## The script ({format})
{script}

{again}
