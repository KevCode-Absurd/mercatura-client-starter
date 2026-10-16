# Anatomy of a DTC "7 Reasons" / advertorial landing page

Use as a section-inventory checklist when the source is this page type. Tick what the source
actually has; do not add sections the source lacks. The list was drawn from pages for products
bought again (a timeline of results, an ingredient table); a source for a product bought once
will show a size guide, a specification table or "what is in the box" in their place.

```
[ ] Announcement bar (sticky top, brand colour, live dot, segmented timer)
[ ] Hero (2-col: copy + author left, lifestyle photo + product badge right)
[ ] Press logos strip (white bg, horizontal flex, real publication names)
[ ] Reason sections ×N (alternating image/text columns)
    [ ] chip/check grid (2-col, 8–10 items)
    [ ] before/after + avatar row + ingredient table
    [ ] text left / timeline right (Day 7 / Day 30 / Day 90)
    [ ] text left / lifestyle image right
    [ ] product image + cert icons / text + cert checklist
[ ] Testimonial row (3 cards, floating circular avatar, accent stars, nav arrows)
[ ] Guarantee section (text left / circular badge right)
[ ] Trustpilot section (text left / 2×2 image grid right)
[ ] Bottom CTA section (dark band + floating white card inside, sale ribbon)
[ ] Footer logo + disclaimer
[ ] Bottom bar (logo left, Trustpilot row, CTA button right)
```

## Where these pages usually trip the clone

| Symptom | Root cause |
|---|---|
| Accent colour wrong (muted green instead of lime) | Wrote CSS from memory — sample it with `palette` |
| Check chips inverted (light bg instead of dark) | Coded before finishing the strips — the single most common error |
| Timeline as dark cards when source uses quote boxes | Skipped the component-checks table |
| Testimonial avatar wrong shape/position | Card structure not read from source |
| Sections merged or reordered | Section table not filled before building |
| Page too narrow (860 vs 1100) | `--max-w` guessed, not measured on the grid |
| Wrong font (Lora vs Fraunces, Inter vs geometric sans) | Matched by feel — classify stroke contrast, x-height, terminals first |

## In the rebrand: the slots that state a fact

These sections of the list carry facts. In Phase 2 each is filled from the brand brain or removed
(the table in `SKILL.md`, "Fact slots"); none is filled by rewording the source.

| Section | The fact it states |
|---|---|
| Announcement bar timer, sale ribbon | A deadline or an offer |
| Hero author, product badge | Who wrote it; a certification or award |
| Press logos strip | That the press ran a piece |
| Before/after, timeline (Day 7 / Day 30 / Day 90) | Results, and when |
| Ingredient table, cert icons, cert checklist | What is in it; what it is certified for |
| Testimonial row, avatars | That real customers said this |
| Guarantee section | The terms |
| Trustpilot section and bottom-bar row | A score and a count on a review site |
| Bottom CTA card | The price and the offer |
