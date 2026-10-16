# Figma deck playbook (build + adapt to client)

How to build the audit deck reliably with `use_figma` (Figma Slides), adapting the look to each client. Learned the hard way on the original reference build.

## 0. Create the file (once)

`create_new_file` with `editorType: "slides"`, name `"{Client} CRO Audit"`. Needs a `planKey` (`team::...` or `organization::...`); get it from `whoami` if the user has not given one. Capture the returned `fileKey`. From this point, ONLY edit this file. Never recreate or delete it (G4).

## 1. Adapt the design tokens to the client

Do NOT hardcode the reference build's palette. For each new brand, set tokens from `brand-guidelines.md` (or sample from the captured screenshots):
- `BG` page background, `INK` primary text/dark, `ACCENT` the brand's punchy CTA/highlight color, `MUTED` secondary.
- `FONT` the brand's font if available on Figma, else a clean default (Inter). The reference build used: INK `#041E16`, ACCENT `#BEFF00`, BG `#FFF9EF`, Inter. That was one client's brand, used here only as the example.

```js
const T = { BG:"#FFFFFF", INK:"#0E1A14", ACCENT:"#BEFF00", MUTED:"#6B7280", FONT:"Inter" };
const hex = h => { h=h.replace('#',''); return {r:parseInt(h.slice(0,2),16)/255,g:parseInt(h.slice(2,4),16)/255,b:parseInt(h.slice(4,6),16)/255}; };
const solid = h => [{type:"SOLID",color:hex(h)}];
```

## 2. Hard gotchas (each one caused a real failure)

1. **A write call that ends in `throw` ROLLS BACK everything it wrote.** End every write `use_figma` call with a string return like `"done"`. To read ids back, run a SEPARATE read-only probe.
2. **`use_figma` surfaces only errors, not return values,** in normal flow. Use a small read-only probe call that returns a string of ids when you need them.
3. **Never absolutely position text.** `resize()` + `textAutoResize` on an absolutely-positioned text node corrupts its position (the -240,-240 bug). Put text inside auto-layout frames; only top-level frames get x/y.
4. **Load fonts before setting text:** `await Promise.all(["Regular","Medium","Semi Bold","Bold"].map(s=>figma.loadFontAsync({family:T.FONT,style:s})))`. Note Inter is "Semi Bold" / "Extra Bold" WITH a space.
5. **No comma formatting from `toLocaleString`** in the engine. Format manually: `String(n).replace(/\B(?=(\d{3})+(?!\d))/g,",")`. Do NOT run this on years (you will get "2,026").
6. **Setting `figma.currentPage` is unsupported.** Use `await figma.setCurrentPageAsync(page)`.
7. **Full-width rows in a vertical auto-layout:** set child `layoutAlign="STRETCH"`, `counterAxisSizingMode="AUTO"`, `primaryAxisSizingMode="FIXED"`. Forgetting this collapses rows (the agenda-row bug).

## 3. Auto-layout helpers (paste into the use_figma code)

```js
function frame(name,dir,pad,gap){const f=figma.createFrame();f.name=name;f.layoutMode=dir;f.itemSpacing=gap||0;f.paddingTop=f.paddingBottom=f.paddingLeft=f.paddingRight=pad||0;f.primaryAxisSizingMode="AUTO";f.counterAxisSizingMode="AUTO";f.fills=[];return f;}
const vbox=(n,p,g)=>frame(n,"VERTICAL",p,g);
const hbox=(n,p,g)=>frame(n,"HORIZONTAL",p,g);
function text(s,size,style,color){const t=figma.createText();t.fontName={family:T.FONT,style:style||"Regular"};t.characters=s;t.fontSize=size||16;t.fills=solid(color||T.INK);return t;}
function stretch(node){node.layoutAlign="STRETCH";if("counterAxisSizingMode"in node){node.counterAxisSizingMode="AUTO";node.primaryAxisSizingMode="FIXED";}return node;}
// image slot: an empty frame you fill later via upload_assets nodeId
function slot(name,w,h){const f=figma.createFrame();f.name=name;f.resize(w,h);f.fills=solid("#EEEEEE");f.cornerRadius=12;return f;}
```

A slide is a child under `figma.currentPage` (each Slides "slide" is a top-level frame). Build one content `vbox`, append your rows, then position only that top-level frame. Keep one slide per `use_figma` call or batch a few; always end with `"done"`.

## 4. Deck structure (adapt counts to findings)

1. **Cover** — client logo/name, "CRO Audit", you as author, date.
2. **Agenda** — full-width rows (use `stretch`).
3. **Methodology + data sources** — live capture, and the mode (G1): "sized", with the store's real window and metrics, or "page-only", with a line on what the numbers would add.
4. **Funnel diagnosis** — sized mode only: the actual rates, mobile vs desktop, where it leaks. Left out of a page-only deck.
5. **The leaks** — top 3. Sized mode: each with the money sum and its assumption. Page-only mode: ranked by impact x confidence x ease, no money figure.
6. **Recommendation sections — one for EACH mandatory surface (G7):** Homepage, Navigation, Collection, PDP, Landing page, FAQ/About/Story, Cart, Checkout (Quiz and Post-purchase as bonus sections when present). Every surface shows the annotated **BEFORE** plus **1 to 3 AFTER design variations, one per test suggestion** (never padded to reach 3). The BEFORE must be a REAL Phase 1 screenshot of the exact section the tests reference, never generated (G8); only the AFTER slots get image-model mock-ups, each labelled "mock-up" and showing no invented proof (G9). Layout: BEFORE on the left, then the test cards across the slide, each card = a short hypothesis line ("Test A: single hero CTA, expected to lift hero click-through"; a percentage only in sized mode, with its assumption) above its AFTER slot. Use a second slide for a surface if 3 variations are cramped. Always pair each design with the test it visualizes.
7. **Prioritization** — the full ranked test backlog (impact × ease) across all surfaces.
8. **Projected impact** — sized mode only: recoverable revenue from the sized leaks, labelled a model with its assumptions. A page-only deck has "What the numbers would add" here instead.
9. **Close** — next steps, your contact info.

Name AFTER slots predictably as `AFTERSLOT_<surface>_v{n}` so Phase 4 can find them. Surface keys: `homepage`, `nav`, `collection`, `pdp`, `landing`, `story` (FAQ/About/Story), `cart`, `checkout` (plus bonus `quiz`, `upsell`). Each gets `_v1`, `_v2`, and usually `_v3`. Example: `AFTERSLOT_pdp_v1`, `AFTERSLOT_pdp_v2`, `AFTERSLOT_pdp_v3`, `AFTERSLOT_cart_v1`, etc. Write the matching test hypothesis as a text node directly above each slot.

## 5. Verifying

Use `get_screenshot` on a slide node id to render it back and eyeball it. Fix copy/layout via targeted edits. No em dashes anywhere in the deck copy (G3).
