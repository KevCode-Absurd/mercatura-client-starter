---
name: native-breaking-news
description: Native ad image type - an image styled like a news bulletin or lower-third caption carrying a true, sourced statement about the problem. Use with native-ad-creative when the native ad's image should be this type. Says what goes in the image, the words on it, how to brief it, what keeps it honest and what it needs from the brand.
---

# Native image type: news bulletin

A phone photo with a caption bar across the lower third: a short headline and a small label.

- **Why it stops the scroll:** A bulletin frame makes people read the headline to find out what it says.
- **Suits:** A reframe that is news to the reader: a true, sourced fact about the problem or the kind of product. Good with the quietly angry and searcher arcs.
- **A product bought once:** A sourced fact about how long the usual kind lasts, what it costs over 10 years, or how many are thrown away.
- **Words on the image:** A headline of 5 to 10 words and a label of 1 to 3 words. The headline is 1 fact, said as its source says it, and it is the fact the story's reframe rests on. The label is a plain topic word ("SKIN", "KITCHEN"). "BREAKING" and "LIVE" say something has just happened: they are used only for a real, dated event in the brand's material.
- **Headline under the image:** The same statement, or "Read this before you buy another one."

## Briefing the image

- A plain caption bar and label over an everyday scene of the problem. No studio, no presenter, no desk.
- Give the headline and the label exactly.
- Plainly a caption on a phone photo, not a broadcast graphic.

## Honesty

- It is not a news outlet and does not look like one: no network's name, logo, colours, set, ticker, clock or channel number.
- It reports no event that didn't happen. No "study finds" or "experts warn" unless that study or expert is in the brand's material with its source.
- The headline is a fact with a source in the brand's material. No invented statistic.
- Platforms restrict formats that look like news: flag this image in `compliance_flags` for a person to look at before it is published.
- **If the brand has no sourced fact:** do not use this type. Plan a "don't buy this" when the story warns against a kind of product, otherwise a candid moment.
- **If words on the image are off:** plan a candid moment.

## Avoid

- A health scare.
- Anything a viewer could take for a real report.

## What this reads from the brand brain

- `brand.json`: claims with sources, for the fact and where it comes from. Blank: the type is not used.
- `customer-avatars.md`, per avatar: The moment, for the scene behind the caption. Blank: the scene in the copy's opening.
