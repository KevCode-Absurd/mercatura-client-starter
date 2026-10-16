export const MODES = [
    { id: "creative", label: "Creative", job: "Stops the scroll: 1 picture that is wrong, funny or impossible, with a hard, direct headline." },
    { id: "communicative", label: "Communicative", job: "The picture explains: a diagram, a chart, a cutaway, a sequence. The headline says what it shows." },
    { id: "native", label: "Native", job: "Looks like a post, not an ad: a caption-style line, no brand dressing." },
    { id: "brand-world", label: "Brand world", job: "The product as a monument in the brand's own world. A short identity headline and 1 spec." },
] as const;
export type ModeId = (typeof MODES)[number]["id"];
export type WorldFamily = "photoreal" | "3d" | "illustration" | "native";
export const FAMILY_LABEL: Record<WorldFamily, string> = { photoreal: "Photographic", "3d": "Stylised 3D", illustration: "Illustration", native: "Native" };
export interface World {
    id: string;
    label: string;
    family: WorldFamily;
    look: string;
    modes: ModeId[];
    is: string[];
}
export const WORLDS: World[] = [
    { id: "paper-cutout", is: ["paper cutout", "collage", "cut paper"], label: "Paper cutout and collage", family: "illustration", modes: ["creative", "brand-world"], look: "Layered cut paper, torn edges, tactile card and visible paper fibres, with real cast shadows between the layers. A handmade collage with a clearly distinct silhouette." },
    { id: "skeleton-xray", is: ["skeleton", "x-ray", "bones"], label: "Skeleton and X-ray", family: "illustration", modes: ["creative", "communicative"], look: "An unmistakable stylised skeleton or translucent X-ray silhouette used as a visual metaphor. Non-graphic, no injury and no invented medical diagnosis, clinical result or evidence of efficacy." },
    { id: "problem-noir", is: ["dark", "moody", "noir", "hard shadow"], label: "Problem, lit like a thriller", family: "photoreal", modes: ["creative"], look: "Dark and moody. The problem is the subject, lit like a scene from a thriller: 1 hard light, deep shadow." },
    { id: "studio-comparison", is: ["desaturated", "comparison"], label: "Studio comparison", family: "photoreal", modes: ["communicative", "creative"], look: "A seamless studio background. The unbranded alternative is desaturated and plain on 1 side; this product is saturated and sharp on the other." },
    { id: "macro-luxury", is: ["dark", "macro"], label: "Dark macro luxury", family: "photoreal", modes: ["brand-world"], look: "Dark editorial product photography, very close, with 1 or 2 tiny specification callouts." },
    { id: "epic-monument", is: ["epic", "storm"], label: "Epic monument", family: "photoreal", modes: ["brand-world", "creative"], look: "The product as a legend: huge, on a mountain, in forge light or under a storm sky." },
    { id: "bw-accent", is: ["black and white", "monochrome", "grayscale", "greyscale", "desaturated", "muted"], label: "Black and white with 1 accent", family: "photoreal", modes: ["brand-world", "creative"], look: "Monochrome photography of effort or motion, with 1 thing in the brand's colour." },
    { id: "lifestyle-flags", is: ["fact chips", "small flags"], label: "Lifestyle with small flags", family: "photoreal", modes: ["communicative", "native"], look: "A warm, real-looking moment of life with the product in it, and at most 2 small chips carrying facts, inside the ad's ceiling of words." },
    { id: "absurd-photoreal", is: ["absurd", "surreal", "impossible"], label: "Absurd, but photographed", family: "photoreal", modes: ["creative"], look: "Something that cannot be true, shot as if it were: 1 impossible thing in an ordinary place, played straight." },
    { id: "soft-clay", is: ["clay", "pastel", "3d"], label: "Soft clay and pastel 3D", family: "3d", modes: ["communicative", "creative"], look: "Rounded matte clay shapes in pastel colours: a chart, a sequence or a small landscape made of clay." },
    { id: "character-3d", is: ["3d", "cartoon"], label: "3D character scene", family: "3d", modes: ["creative"], look: "Stylised 3D people with big, readable expressions, caught in 1 moment of the problem." },
    { id: "organ-character", is: ["3d", "cartoon", "body part", "organ"], label: "The body part as a character", family: "3d", modes: ["creative", "communicative"], look: "The part of the body the problem lives in, as a character with a face and a mood. The mechanism becomes someone." },
    { id: "mascot-world", is: ["3d", "mascot", "cartoon"], label: "Product mascot world", family: "3d", modes: ["creative", "brand-world"], look: "A character made from the product lives a small adventure. The same character can return in every ad of the set." },
    { id: "miniature-diorama", is: ["3d", "miniature", "diorama"], label: "Miniature diorama", family: "3d", modes: ["communicative", "creative"], look: "Tiny workers or people at work on a giant product or a giant version of the problem, like a model railway." },
    { id: "holo-pastel", is: ["pastel", "iridescent", "3d"], label: "Dreamy pastel", family: "3d", modes: ["brand-world"], look: "Iridescent light, soft pastel air. The product pours or floats into a calm scene." },
    { id: "storybook", is: ["storybook", "surreal", "3d"], label: "Storybook surreal", family: "3d", modes: ["brand-world", "creative"], look: "A paper-and-card world from a picture book: a boat on a sea made of something else, a path that is a game board." },
    { id: "vintage-comic", is: ["comic", "retro", "cartoon", "halftone"], label: "Vintage comic or retro print", family: "illustration", modes: ["creative"], look: "A panel from a mid-century comic or a retro poster: halftone dots, flat inks, 1 speech bubble." },
    { id: "flat-cartoon", is: ["cartoon", "drawing", "illustration"], label: "Flat cartoon", family: "illustration", modes: ["creative", "communicative"], look: "A flat, friendly children's-book drawing of the problem at home." },
    { id: "hand-sketch", is: ["sketch", "handwriting", "drawing"], label: "Hand sketch", family: "illustration", modes: ["communicative", "native"], look: "Ballpoint or marker on paper or a whiteboard: a diagram, a checklist or a scribble a person made to explain it." },
    { id: "engraving", is: ["engraving", "antique", "illustration"], label: "Antique engraving", family: "illustration", modes: ["communicative"], look: "A labelled diagram in the style of an old medical or botanical plate, on cream paper." },
    { id: "game-ui", is: ["pixel art", "video game", "retro"], label: "Retro game screen", family: "illustration", modes: ["creative", "communicative"], look: "A pixel-art game screen of the app's own invention: health bars, a maze, a versus screen. No real game is copied." },
    { id: "scientific-imaging", is: ["x-ray", "thermal", "scientific"], label: "Scientific imaging", family: "illustration", modes: ["communicative"], look: "A thermal image, an X-ray or a cutaway that shows what the eye can't see." },
    { id: "infographic", is: ["infographic", "diagram"], label: "Annotated infographic", family: "illustration", modes: ["communicative"], look: "The whole ad is 1 process diagram or timeline, with labels and arrows." },
    { id: "message-thread", is: ["chat", "text message", "screenshot"], label: "A message between 2 people", family: "native", modes: ["native"], look: "A plain chat between 2 people on a phone, in a generic design of the app's own. No real platform's interface is copied." },
    { id: "billboard-photo", is: ["billboard"], label: "A photo of a billboard", family: "native", modes: ["native", "creative"], look: "The ad as a billboard on a city street, photographed from the pavement by a passer-by." },
];
export const worldOf = (id: string | null | undefined) => WORLDS.find((w) => w.id === id);
export function ruledOut(world: World | undefined, never: string | null | undefined): string {
    const text = (never ?? "").toLowerCase();
    if (!world || !text.trim())
        return "";
    return world.is.find((w) => new RegExp(`(^|[^a-z0-9])${w.toLowerCase().replace(/[^a-z0-9]+/g, "[^a-z0-9]+")}(?![a-z0-9])`).test(text)) ?? "";
}
export const modeOf = (id: string | null | undefined) => MODES.find((m) => m.id === id);
export const DEVICES = [
    "a highlight bar on the line the ad turns on",
    "a headline in 2 tones",
    "a thin line from 1 part of the product to 1 fact (2 at most)",
    "the product as a small circle in a corner",
    "at most 2 small benefit chips under the headline, inside the ad's ceiling of words",
    "a speech bubble: the character says 1 line",
    "2 labelled columns, 1 against the other",
    "1 word of the headline struck through",
    "2 big numbers joined by an arrow",
    "stage flags under a sequence (week 0, week 2, week 4)",
    "a customer's words as a quote card (real words only)",
    "a warning frame",
    "a photo torn open to show the real scene behind it",
    "a button of 2 to 4 words (1 at most)",
] as const;
export const FUNNELS = [
    { id: "cold", label: "Cold", who: "People who have never heard of the brand: unaware and problem aware. The picture stops them and the headline argues." },
    { id: "warm", label: "Comparing", who: "People who know what kind of product they want and are comparing: solution aware and product aware. Each ad is 1 kind of proof." },
    { id: "ready", label: "Ready to buy", who: "People who know this product and have not bought: most aware. Each ad is the offer, said plainly." },
    { id: "review", label: "In their words", who: "People who recognise themselves in another buyer's words. Each ad carries 1 real phrase, exactly as typed, with its source; the format is made to hold a quote." },
] as const;
export type FunnelId = (typeof FUNNELS)[number]["id"];
export const funnelOf = (id: string | null | undefined) => FUNNELS.find((f) => f.id === id);
export interface Archetype {
    id: string;
    label: string;
    funnel: FunnelId;
    picture: string;
    words: string;
    needs: string;
    worlds: string[];
    mode: ModeId;
    jobs?: string[];
}
export const ARCHETYPES: Archetype[] = [
    { id: "problem-moment", label: "The problem, at its moment", funnel: "cold", mode: "creative", worlds: ["problem-noir", "flat-cartoon", "character-3d"], picture: "1 moment of the problem at the time of day it happens. No product, or the product small.", words: "A caption of 5 words or fewer.", needs: "A moment the research names: when and where the problem bites." },
    { id: "identity-mirror", label: "The buyer, recognised", funnel: "cold", mode: "native", worlds: ["lifestyle-flags", "bw-accent", "hand-sketch"], picture: "1 person who is plainly this buyer, in their own place. A person of the app's invention: never shown as a customer.", words: 'A headline that begins from who they are or what they do ("If you ...").', needs: "The buyer's own habits and words from the research." },
    { id: "myth-bust", label: "A belief, corrected", funnel: "cold", mode: "creative", worlds: ["studio-comparison", "scientific-imaging", "vintage-comic"], picture: "The thing people believe and the thing that is true, set against each other.", words: "The belief, then the correction. 2 short lines.", needs: "A belief about the category that the brand's facts can correct." },
    { id: "customer-words", label: "A customer's own words", funnel: "warm", mode: "native", worlds: ["lifestyle-flags", "hand-sketch", "billboard-photo"], picture: "The product in a real-looking place, with the quote as a card. No person is shown as the customer.", words: "1 real quote, word for word, 20 words or fewer, with what the brand's facts say about who said it.", needs: "A real customer quote in the research. With none, this ad is not made." },
    { id: "number-proof", label: "1 number that proves it", funnel: "warm", mode: "communicative", worlds: ["soft-clay", "infographic", "miniature-diorama"], picture: "1 number, very large, made part of the scene. The product beside it.", words: "The number and the 3 to 6 words that say what it counts.", needs: "A number the brand's facts state: customers, reviews, a study result, a count of ingredients." },
    { id: "comparison-table", label: "This against the usual way", funnel: "warm", mode: "communicative", worlds: ["studio-comparison", "infographic", "game-ui"], picture: "2 labelled columns: the usual alternative, unbranded and plain, against this product, both shown the same way in the same light. 4 or 5 rows with a tick or a cross.", words: "Row labels of 2 to 4 words. 1 row is the weakest true one, where the usual way is as good or better: 5 perfect ticks against 5 crosses reads as marketing. The price, if it is there, is a row and never the headline. No other brand is named.", needs: "4 or 5 real differences the brand's facts state, 1 of them a concession." },
    { id: "feature-annotation", label: "The product, labelled", funnel: "warm", mode: "communicative", worlds: ["infographic", "macro-luxury", "engraving"], picture: "The product in the centre with thin lines to its parts, each line landing on the part that does the job.", words: "Exactly 4 labels (3 is thin, 6 is a diagram nobody reads): 2 or 3 words each, in the order the buyer's doubts come, the first label answering the first doubt.", needs: "4 features the brand's facts state. With 3, it is made with 3 and says so." },
    { id: "benefit-list", label: "3 benefits, ticked", funnel: "warm", mode: "communicative", worlds: ["soft-clay", "infographic", "holo-pastel"], picture: "The product on one side, a short ticked list on the other, a button under it.", words: "A headline, then exactly 3 benefits of 3 to 6 words each, each one true of this product and not of every product like it. A button of 3 words or fewer.", needs: "3 benefits the brand's facts state. If a line would still be true under a competitor's logo, it is a spec and not a benefit: write another." },
    { id: "price-per-use", label: "What it costs each time", funnel: "warm", mode: "communicative", worlds: ["studio-comparison", "macro-luxury", "soft-clay"], picture: "The product with 1 large price for each use (a serving, a day, a wear), and beside it what the usual way costs for the same use, unbranded.", words: "1 number each side, with what it counts. Nothing else is argued.", needs: "The real price and the real count of uses in a pack, from the brand's facts, and a fair figure for the usual way. Without both, this ad is not made." },
    { id: "press-quote", label: "What the press said", funnel: "warm", mode: "native", worlds: ["billboard-photo", "bw-accent", "hand-sketch"], picture: "A short quote set like a pull quote on a plain ground, the product small beside it. The app's own design: no masthead, no logo, no page of a real publication.", words: "The quote, word for word, 20 words or fewer, with the publication's name and the date as its source.", needs: "A real piece of press the brand holds, with its words on file. With none, this ad is not made: \"as seen in\" is never invented." },
    { id: "price-anchor", label: "The price, said plainly", funnel: "ready", mode: "brand-world", worlds: ["macro-luxury", "soft-clay", "holo-pastel"], picture: "The price large, the product smaller, the guarantee as a small mark.", words: "The price as the offer states it, and the guarantee in its own words.", needs: "An offer with a price. The guarantee only if the offer states one." },
    { id: "bundle-stack", label: "The bundle and what it saves", funnel: "ready", mode: "communicative", worlds: ["holo-pastel", "studio-comparison", "miniature-diorama"], picture: "Everything in the offer laid out together, with the sum.", words: "What is included and the saving, with numbers that add up from the offer.", needs: "An offer that holds more than 1 thing, with its prices." },
    { id: "urgency-stamp", label: "A real deadline", funnel: "ready", mode: "creative", worlds: ["bw-accent", "epic-monument", "billboard-photo"], picture: "A bold headline and the date or the count, like a stamp.", words: "The deadline or the limit exactly as the offer states it. A button of 3 words or fewer.", needs: "An offer with a real end date or a real limit. With neither, this ad is not made: urgency is never invented." },
    { id: "last-review", label: "The review that closes it", funnel: "ready", mode: "native", worlds: ["hand-sketch", "lifestyle-flags", "message-thread"], picture: "The review as the whole ad, the product small beside it.", words: "The most convincing real review, word for word, then the guarantee and a button of 3 words or fewer.", needs: "A real review in the research, and the offer's guarantee if it has one." },
    { id: "worth-it", label: "Worth it at full price", funnel: "ready", mode: "communicative", worlds: ["infographic", "engraving", "macro-luxury"], picture: "The product large in the centre with 3 numbered callouts and thin lines to the parts they name. Nothing about the price in the picture itself.", words: "A headline on why it is worth its full price. 3 callouts (4 at most), a label of 2 to 3 words each with a few words on what it does for the buyer. The offer as 1 line under them: the deadline if it has a real one, never the headline.", needs: "3 facts about how the product is made or what is in it, from the brand's facts. The offer's last day only if it has one." },
    { id: "negative_qualifier", label: "Negative qualifier", funnel: "review", mode: "creative", jobs: ["identity", "complaint"], worlds: ["bw-accent", "problem-noir", "billboard-photo"], picture: "A plain, bold frame that says who this is not for, the product small or absent.", words: "\"Do not buy this if...\" or \"Not for you if...\" as the headline, then the buyer's phrase as the quote that says who it is for. 2 lines and a small attribution.", needs: "A phrase that names who the buyer was (identity) or their honest gripe (complaint), word for word from the research." },
    { id: "qa_card", label: "Q and A card", funnel: "review", mode: "communicative", jobs: ["objection", "slow_start"], worlds: ["hand-sketch", "message-thread", "soft-clay"], picture: "A card with 1 question at the top and 1 answer under it, the product beside the card.", words: "The doubt as a question in a buyer's words (from the objection list), then the buyer's phrase as the answer, word for word.", needs: "A doubt from the research and a buyer's phrase that answers it, both verbatim." },
    { id: "strikethrough", label: "Strikethrough correction", funnel: "review", mode: "creative", jobs: ["mechanism", "villain"], worlds: ["studio-comparison", "macro-luxury", "billboard-photo"], picture: "The brand's own line struck out, the buyer's line written in by hand beneath it, the product in a real place.", words: "Line 1 (struck out): the brand's nearest line from its own site or a plain category claim. Line 2 (written): the buyer's phrase, word for word. Line 3 (small): their words, not ours.", needs: "A buyer's phrase that says the thing better than the brand's own line does." },
    { id: "taped_note", label: "Taped note", funnel: "review", mode: "native", jobs: ["trigger", "real_win"], worlds: ["lifestyle-flags", "bw-accent", "billboard-photo"], picture: "A handwritten note on paper taped over a real photograph of the product, as if a person left it there.", words: "The buyer's phrase alone, handwritten, word for word. A tiny attribution in the corner.", needs: "A phrase about the moment that made them search (trigger) or the benefit they kept (real win)." },
    { id: "poll_sticker", label: "Poll sticker", funnel: "review", mode: "native", jobs: ["mechanism", "ritual"], worlds: ["lifestyle-flags", "message-thread", "hand-sketch"], picture: "A vertical story frame: a real moment of the product in a day, with a poll sticker over it, in a design of the app's own, never a real platform's.", words: "The buyer's phrase as the poll's question, word for word, and 2 short answers a buyer would tap.", needs: "A phrase about how it works by feel (mechanism) or how it fits a day (ritual)." },
    { id: "quote_card", label: "Quote card", funnel: "review", mode: "brand-world", jobs: ["first_notice", "real_win"], worlds: ["macro-luxury", "holo-pastel", "epic-monument"], picture: "The phrase set very large on a plain ground in the brand's palette, the product small and sharp, the attribution tiny.", words: "The buyer's phrase, word for word, as the only large text. Attribution of 1 to 3 words from what the source holds, or none.", needs: "A phrase about the moment they knew (first notice) or the benefit they kept (real win)." },
    { id: "side_by_side", label: "Side by side", funnel: "review", mode: "communicative", jobs: ["failed_fix", "villain"], worlds: ["studio-comparison", "flat-cartoon", "soft-clay"], picture: "2 halves: the before state and the after state as scenes or objects, never a person's body. Each half captioned in a buyer's words.", words: "Left: what they tried or what it replaced, in a buyer's words. Right: the phrase, word for word. Both verbatim.", needs: "A failed fix or a villain phrase and an after phrase, both from the research. No before-and-after of a body." },
];
export const archetypeOf = (id: string | null | undefined) => ARCHETYPES.find((a) => a.id === id);
export interface ConceptPick {
    world: string;
    mode: ModeId;
    archetype?: string;
}
export function suggestConcepts(n: number, seed = 0, funnel: FunnelId = "cold"): ConceptPick[] {
    if (funnel !== "cold")
        return suggestProof(n, seed, funnel);
    const families: WorldFamily[] = ["photoreal", "3d", "illustration", "native"];
    const queues = families.map((f, fi) => {
        const ws = WORLDS.filter((w) => w.family === f);
        const at = (seed + fi) % ws.length;
        return [...ws.slice(at), ...ws.slice(0, at)];
    });
    const out: ConceptPick[] = [];
    const used = new Map<ModeId, number>();
    for (let k = 0; out.length < Math.min(n, WORLDS.length); k++) {
        const q = queues[k % queues.length];
        const w = q.shift();
        if (!w)
            continue;
        const mode = [...w.modes].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0];
        used.set(mode, (used.get(mode) ?? 0) + 1);
        out.push({ world: w.id, mode });
    }
    return out;
}
function suggestProof(n: number, seed: number, funnel: FunnelId): ConceptPick[] {
    const kinds = ARCHETYPES.filter((a) => a.funnel === funnel);
    const used = new Set<string>();
    const out: ConceptPick[] = [];
    for (let k = 0; out.length < Math.min(n, 12); k++) {
        const a = kinds[(k + seed) % kinds.length];
        const round = Math.floor(k / kinds.length);
        const world = [...a.worlds.slice(round % a.worlds.length), ...a.worlds, ...WORLDS.map((w) => w.id)].find((w) => !used.has(w));
        if (!world)
            break;
        used.add(world);
        out.push({ world, mode: a.mode, archetype: a.id });
    }
    return out;
}
export function conceptBrief(world: string, mode: string | undefined, archetype?: string): string[] {
    const w = worldOf(world);
    const m = modeOf(mode) ?? modeOf(w?.modes[0]);
    if (!w)
        return [];
    const a = archetypeOf(archetype);
    if (a) {
        const f = funnelOf(a.funnel);
        return [
            `An ad with no layout to follow, for buyers who are ${a.funnel === "cold" ? "cold" : a.funnel === "warm" ? "comparing options" : a.funnel === "review" ? "recognising themselves in another buyer's words" : "ready to buy"}. ${f?.who ?? ""}`,
            `Kind of ad: ${a.label}. It is this 1 kind and no other.`,
            `Picture: ${a.picture}`,
            `Words: ${a.words}`,
            `It needs: ${a.needs} Use only what the brand's facts and research hold. If they do not hold it, say so in \`argument\` in 1 sentence, and make the nearest honest ad from what they do hold.`,
            m ? `Mode: ${m.label}. ${m.job}` : "",
            `World: ${w.label}. ${w.look}`,
            "Say in `argument` the buyer and the 1 thing this ad proves or offers. Say in `scene` the picture: what is in it, where the product sits, and where the quiet area for the words is. Use 1 to 3 devices at most.",
        ].filter(Boolean);
    }
    return [
        "A concept ad for a cold audience: there is no layout to follow. Find 1 argument for 1 buyer, then the 1 picture that makes it, in the world below.",
        m ? `Mode: ${m.label}. ${m.job}` : "",
        `World: ${w.label}. ${w.look}`,
        "Say in `argument` the buyer and the 1 thing this ad argues. Say in `scene` the picture: what is in it, where the product sits inside the scene, and where the quiet area for the words is. Use 1 to 3 devices at most.",
    ].filter(Boolean);
}
export function lookBrief(world: string): string[] {
    const w = worldOf(world);
    if (!w)
        return [];
    return [
        "An ad with no layout to follow. Its format, buyer, angle and idea are decided in the direction below: write that ad, drawn in the world below.",
        `World: ${w.label}. ${w.look}`,
        w.family === "photoreal" ? "It is a photograph: real light, a real lens, and the product the hero of the frame." : "The whole picture is made in that world, edge to edge. A photograph with a texture or a border added to it is not that world. The product keeps its real shape, colours and label inside it.",
        "The format says what the ad does; the world says how all of it is drawn. Where the 2 pull apart, keep the format's job and draw it in the world.",
        "Say in `argument` the buyer and the 1 thing this ad argues. Say in `scene` the picture: what is in it, where the product sits inside the scene, and where the quiet area for the words is. Use 1 to 3 devices at most.",
    ];
}
const LOOK_WORDS: [
    RegExp,
    string
][] = [
    [/\bcomics?\b|graphic novel|speech bubbles?|\bhalftone\b|\bpop[- ]art\b|\bmanga\b/, "vintage-comic"],
    [/\bclay(mation)?\b|\bplasticine\b/, "soft-clay"],
    [/\bcartoons?\b/, "flat-cartoon"],
    [/\bsketch(es|ed|y)?\b|hand[- ]drawn|\bdoodles?\b|\bwhiteboard\b/, "hand-sketch"],
    [/\bengraving\b|\betching\b|botanical plate/, "engraving"],
    [/pixel[- ]art|\b8[- ]bit\b|retro game|video ?game/, "game-ui"],
    [/\bx[- ]?ray\b|\bthermal\b|\bcutaway\b/, "scientific-imaging"],
    [/\binfographics?\b/, "infographic"],
    [/text messages?|message thread|chat thread/, "message-thread"],
    [/\bbillboards?\b/, "billboard-photo"],
    [/\bdioramas?\b|\bminiatures?\b/, "miniature-diorama"],
    [/\bstorybook\b|picture book|paper ?craft/, "storybook"],
    [/\bmascots?\b/, "mascot-world"],
    [/3d characters?|\bpixar\b/, "character-3d"],
    [/black[- ]and[- ]white|\bmonochrome\b/, "bw-accent"],
    [/\bnoir\b/, "problem-noir"],
    [/\bsurreal\b|\babsurd\b/, "absurd-photoreal"],
];
export function lookNamed(text: string): string | null {
    const t = text.toLowerCase();
    return LOOK_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}
const LOOK_KINDS = ["problem-moment", "myth-bust", "number-proof", "comparison-table", "feature-annotation", "identity-mirror", "customer-words", "price-anchor", "last-review", "bundle-stack"];
export function conceptsInLook(world: string, n: number, opts: {
    offer?: boolean;
} = {}): ConceptPick[] {
    if (!worldOf(world))
        return [];
    const kinds = LOOK_KINDS.map((id) => archetypeOf(id)!).filter((a) => a && (opts.offer || a.funnel !== "ready"));
    return Array.from({ length: Math.max(0, n) }, (_, k) => ({ world, mode: kinds[k % kinds.length].mode, archetype: kinds[k % kinds.length].id }));
}
export function lookNote(world: string): string {
    const w = worldOf(world);
    if (!w)
        return "";
    return `The person asked for this look for every ad of the set: ${w.label}. ${w.look} The whole picture is made in that look, edge to edge. A photograph with a texture or a border added to it is not this look. The product keeps its real shape, colours and label inside it.`;
}
