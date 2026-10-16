import { FIXED, LEVERS_FOR, PRODUCT_BY_STAGE, SURFACE_INFO, defaultTaste, mediumOf } from "./defaults";
import { ALWAYS_SKILL, LEVER_TITLE, LOOK_PICTURE, LOOK_WORDS, OFFER_BY_STAGE, PRODUCT, SECONDARY, STYLING, decide, stopLabel, type SecondaryRow } from "./decisions";
import { LEVER_STOPS, LOOKS, PRODUCT_STOPS, STAGES, STYLING_STOPS, type ContextPlan, type LeverKey, type UseCase } from "./types";
import { STORAGE, WIRING } from "./wiring";
export const DOC_CASES: {
    title: string;
    when: string;
    useCase: UseCase;
}[] = [
    { title: "Image ad for an unaware buyer (scroll-stopper)", when: "A static ad for people who do not know they have the problem.", useCase: { surface: "image_ad", stage: "unaware" } },
    { title: "Image ad for a problem aware buyer", when: "A static ad for people who feel the problem and have not looked for a fix.", useCase: { surface: "image_ad", stage: "problem_aware" } },
    { title: "Native ad", when: "An ad that should look like a person's post, not like an ad.", useCase: { surface: "native_ad", stage: "problem_aware" } },
    { title: "Image ad for a solution aware buyer", when: "A static ad for people comparing kinds of fix.", useCase: { surface: "image_ad", stage: "solution_aware" } },
    { title: "Image ad for a product aware buyer", when: "A static ad for people who know the product and have not bought.", useCase: { surface: "image_ad", stage: "product_aware" } },
    { title: "Offer ad for a most aware buyer", when: "A static ad for people ready to buy who need a reason to do it now.", useCase: { surface: "image_ad", stage: "most_aware" } },
    { title: "Sprint ad", when: "1 of many ads made in a batch. Each slot follows its own stage; shown here for a solution aware slot.", useCase: { surface: "sprint_ad", stage: "solution_aware" } },
    { title: "Carousel", when: "A set of cards that read in order. Shown here for a product aware buyer.", useCase: { surface: "carousel", stage: "product_aware" } },
    { title: "Product page image", when: "A gallery image for the product page.", useCase: { surface: "pdp" } },
    { title: "Photoshoot frame", when: "A photograph of the product with no words.", useCase: { surface: "photoshoot" } },
    { title: "Script", when: "A video or audio script. Shown here for a problem aware buyer.", useCase: { surface: "script", stage: "problem_aware" } },
    { title: "Hooks for a winning ad", when: "New openings for a body that already works.", useCase: { surface: "hooks", hasReference: true } },
    { title: "Caption and feed copy", when: "The words that run beside an ad. Shown here for a solution aware buyer.", useCase: { surface: "caption", stage: "solution_aware" } },
    { title: "Storyboard frame", when: "A still that a clip starts from. Shown here for a problem aware buyer.", useCase: { surface: "storyboard", stage: "problem_aware" } },
    { title: "Shot plan", when: "The plan of shots for a video. Shown here for a product aware buyer.", useCase: { surface: "shot_plan", stage: "product_aware" } },
    { title: "Cast picture", when: "A picture of a person who will appear in a video.", useCase: { surface: "cast" } },
    { title: "Landing page copy", when: "The words of a landing page. Shown here for a product aware buyer.", useCase: { surface: "landing", stage: "product_aware" } },
];
const STAGE_LABEL: Record<string, string> = { unaware: "Unaware", problem_aware: "Problem aware", solution_aware: "Solution aware", product_aware: "Product aware", most_aware: "Most aware" };
const count = (n: number, one: string, many: string) => `up to ${n} ${n === 1 ? one : many}`;
export function sentLines(p: ContextPlan): string[] {
    const out: string[] = [];
    const a = p.attach;
    const x = p.text;
    if (a.referenceImage)
        out.push("The reference picture itself, attached.");
    if (a.brandDesignedImages)
        out.push(`The brand's own designed images, attached (${count(a.brandDesignedImages, "image", "images")}).`);
    if (a.pastAds)
        out.push(`The brand's own past ads, attached (${count(a.pastAds, "ad", "ads")}).`);
    if (a.productPhotos !== "none")
        out.push(`The product photos, attached. Role: ${{ present: "in the scene, never the subject", exact: "shown clearly, exactly as photographed", hero: "the subject of the picture" }[a.productPhotos]}.`);
    if (a.logo)
        out.push("The logo file.");
    if (x.referenceDescription !== "none")
        out.push({ function: "Of the reference: only what kind of ad it is, or why it worked.", detailed: "The reference described in words: how it is built.", beats: "The reference beat by beat, to follow.", words: "The reference's own words, to keep." }[x.referenceDescription]);
    if (x.brandLook !== "none")
        out.push(x.brandLook === "full" ? "The brand's look in words: the full style card." : "The brand's colours and fonts, in words.");
    out.push({ basics: "The basics of the brand voice.", full: "The brand voice block.", own_ads: "The brand's own published ads and lines, as the model to write like." }[x.voice]);
    if (x.facts !== "none")
        out.push({ core: "The core facts only.", standard: "The usual fact block.", full: "The full fact block: every proof, the objections and their answers." }[x.facts]);
    if (x.customerWords !== "none")
        out.push(x.customerWords === "few" ? "A few lines of the customer's own words." : "The customer's own words.");
    if (x.offer !== "none")
        out.push(x.offer === "light" ? "The offer, lightly: what it is, with no price push." : "The offer in full: price, terms and guarantee.");
    if (x.siblings !== "none")
        out.push(x.siblings === "body" ? "The body the versions share, to keep." : "A 1-line brief of each other version, so none is retold.");
    if (x.wordsFrom === "script")
        out.push("The approved script, as the only source of words and facts.");
    if (x.hookAnchor !== "none")
        out.push(x.hookAnchor === "device" ? "The winning opening and the name of its device." : "The promise of the body in 1 line.");
    if (mediumOf(p.useCase.surface) !== "words")
        out.push({ none: "Word slots asked for: none.", headline: "Word slots asked for: the headline only.", full: "Word slots asked for: every slot of the layout." }[x.pictureWords]);
    return out;
}
export function neverLines(p: ContextPlan): string[] {
    const out: string[] = [];
    const a = p.attach;
    const x = p.text;
    const picture = mediumOf(p.useCase.surface) !== "words";
    if (picture) {
        if (!a.referenceImage)
            out.push("The reference picture.");
        if (!a.brandDesignedImages && !a.pastAds)
            out.push("The brand's designed images and past ads.");
        if (a.productPhotos === "none")
            out.push("Any product photo.");
        if (!a.logo)
            out.push("The logo.");
        if (x.brandLook === "none")
            out.push("Any design rule: colours, fonts, layout.");
        else if (x.brandLook === "colours_fonts")
            out.push("The style card beyond colours and fonts.");
    }
    else {
        out.push("Any image.");
        if (x.voice !== "own_ads")
            out.push("The brand's past ads as a model.");
    }
    if (x.offer === "none")
        out.push("The offer: no price, no discount, no deadline.");
    if (x.customerWords === "none")
        out.push("The customer's words.");
    return out;
}
const list = (lines: string[]) => lines.map((l) => `- ${l}`).join("\n");
const table = (head: string[], rows: string[][]) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`)].join("\n");
function caseSection(c: (typeof DOC_CASES)[number]): string {
    const u = c.useCase;
    const p = decide(u, {});
    const levers = LEVERS_FOR[u.surface];
    const def = defaultTaste(u);
    const starts = levers.map((k) => `${LEVER_TITLE[k]} **${stopLabel(k, def[k])}**`).join("; ");
    const fixed = FIXED[u.surface];
    return [
        `### ${c.title}`,
        "",
        c.when,
        "",
        `**Starts at:** ${starts}.`,
        "",
        ...(fixed ? [`**Fixed:** ${fixed.why}`, ""] : []),
        "**Sent:**",
        "",
        list(sentLines(p)),
        "",
        "**Never sent:**",
        "",
        list(neverLines(p)),
        "",
        "**Do and do not:**",
        "",
        list(p.notes.length ? p.notes : ["Nothing beyond the 4 things no lever moves."]),
        "",
        `**Skill snippets loaded:** ${p.skillPath.map((s) => `\`${s}\``).join(", ") || "none"}. **Temperature:** ${p.temperature}.`,
    ].join("\n");
}
function secondarySection(key: Exclude<LeverKey, "look" | "product" | "styling">): string {
    const rows = SECONDARY[key] as Record<string, SecondaryRow>;
    const on = (Object.keys(LEVERS_FOR) as (keyof typeof LEVERS_FOR)[]).filter((s) => LEVERS_FOR[s].includes(key)).map((s) => SURFACE_INFO[s].label.toLowerCase());
    return [`### ${LEVER_TITLE[key]}`, "", `On: ${on.join(", ")}.`, "", table(["Stop", "What changes in what is sent"], (LEVER_STOPS[key] as readonly string[]).map((stop) => [rows[stop].label, rows[stop].change]))].join("\n");
}
export function renderDecisionsDoc(): string {
    const surfaces = Object.keys(SURFACE_INFO) as (keyof typeof SURFACE_INFO)[];
    const parts: string[] = [
        "# Decisions: for this, do this, do not do this",
        "",
        "This page says, for each thing the app makes, what is sent to the model and what is never sent. It also says what each lever changes.",
        "",
        "It is printed from the decision table in `src/lib/taste/decisions.ts`. Do not edit it by hand. To change a decision, change the table, then run `npx tsx src/lib/taste/write-doc.ts`. A test fails when this page and the table disagree.",
        "",
        "(The numbered build decisions, P1 and on, are in `DECISIONS.md` at the top of the project. This page is only about taste.)",
        "",
        "## The 3 rules",
        "",
        "1. A lever works by changing what is sent: which pictures are attached, which blocks of text, which skill snippet. It never works by adding adjectives.",
        "2. Every lever has a default that fits the use case. A person can always move it. A lever nobody moved keeps following the buyer's stage.",
        "3. A generator loads only the skill snippets its plan names. Nothing else from `skills/taste`.",
        "",
        `4 things no lever moves: every line is a whole sentence a person would say to a friend in plain words, it makes sense alone to a stranger, it tells 1 story, the facts are true (\`${ALWAYS_SKILL}\`).`,
        "",
        "## Where each lever starts",
        "",
        "### The product in the picture, by the buyer's stage",
        "",
        table(["Buyer's stage", "The product starts at", "The offer starts at"], STAGES.map((s) => [STAGE_LABEL[s], PRODUCT[PRODUCT_BY_STAGE[s]].label, { none: "Not sent", light: "Sent lightly", full: "Sent in full" }[OFFER_BY_STAGE[s]]])),
        "",
        "A native ad starts at Not shown at every stage. A product page image and a photoshoot frame start at The hero. With no stage known, the product starts at Clearly shown.",
        "",
        "### Every surface at its defaults",
        "",
        "For surfaces that follow the stage, this row is for a problem aware buyer.",
        "",
        table(["Surface", "Look", "Product", "Brand styling", "Other levers it has"], surfaces.map((s) => {
            const d = defaultTaste({ surface: s, stage: "problem_aware" });
            const picture = mediumOf(s) !== "words";
            const other = LEVERS_FOR[s].filter((k) => !["look", "product", "styling"].includes(k)).map((k) => `${LEVER_TITLE[k]}: ${stopLabel(k, d[k])}`);
            return [SURFACE_INFO[s].label, LEVERS_FOR[s].includes("look") ? stopLabel("look", d.look) : "not used", picture ? stopLabel("product", d.product) : "not used", picture ? stopLabel("styling", d.styling) : "not used", other.join("; ") || "none"];
        })),
        "",
        "Brand styling starts at Colours and fonts only for an image ad, a sprint ad or a carousel made for an unaware buyer.",
        "",
        "## Use case by use case",
        "",
        "Each section shows the use case with no lever moved.",
        "",
        DOC_CASES.map(caseSection).join("\n\n"),
        "",
        "## What each lever stop changes",
        "",
        `### ${LEVER_TITLE.look} (for a picture)`,
        "",
        table(["Stop", "Sent", "Never sent"], LOOKS.map((l) => [LOOK_PICTURE[l].label, LOOK_PICTURE[l].sends, LOOK_PICTURE[l].never])),
        "",
        "\"Exactly like this reference\" is offered only when a reference is picked. Asked for without one, the piece is made as \"In between\" and says so.",
        "",
        `### ${LEVER_TITLE.look} (for words)`,
        "",
        table(["Stop", "Sent", "Never sent"], LOOKS.map((l) => [LOOK_WORDS[l].label, LOOK_WORDS[l].sends, LOOK_WORDS[l].never])),
        "",
        `### ${LEVER_TITLE.product}`,
        "",
        table(["Stop", "Sent"], PRODUCT_STOPS.map((s) => [PRODUCT[s].label, PRODUCT[s].sends])),
        "",
        "When the product has no photo on file, none is sent at any stop, and the piece carries a warning.",
        "",
        `### ${LEVER_TITLE.styling}`,
        "",
        table(["Stop", "Sent"], STYLING_STOPS.map((s) => [STYLING[s].label, STYLING[s].sends])),
        "",
        "Brand styling is a ceiling. \"Close to my brand\" with styling below Full sends no designed images, and says so.",
        "",
        (["sell", "words", "finish", "spread", "length", "pace", "people", "hooks"] as const).map(secondarySection).join("\n\n"),
        "",
        "## Appendix: where each engine calls `decide()`",
        "",
        "For the wiring pass. Line numbers were read on 2026-10-05 and move as files are edited; the function name is the anchor. At each point: read the stored taste (`tasteFromLegacy`), call `decide()`, send only what the plan says.",
        "",
        table(["Area", "File and line", "Function", "Surface", "What it replaces"], WIRING.map((w) => [w.area, `\`${w.file}:${w.line}\``, w.fn, w.surface, w.replaces])),
        "",
        "### Where the taste is stored",
        "",
        "All of these are JSON columns, so adding a `taste` field needs no migration.",
        "",
        table(["Where", "File", "Fields there today"], STORAGE.map((s) => [s.where, `\`${s.file}\``, s.today])),
        "",
    ];
    return parts.join("\n");
}
