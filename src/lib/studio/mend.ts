export const FAULT_KINDS = ["text", "colour", "logo", "layout", "object", "handling", "shape", "look"] as const;
export type FaultKind = (typeof FAULT_KINDS)[number];
export type MendRoute = "change" | "redraw";
export const FAULT_ROUTE: Record<FaultKind, MendRoute> = { text: "change", colour: "change", logo: "change", layout: "change", object: "change", handling: "redraw", shape: "redraw", look: "redraw" };
const FAULT_TESTS: [
    FaultKind,
    RegExp
][] = [
    ["look", /not made in the look/i],
    ["text", /^text:|misspel|spel[lt]|\bletters?\b|\bword(s|ing)?\b|headline|subhead|caption|typo|capitali[sz]/i],
    ["logo", /\blogo\b|wordmark/i],
    ["handling", /\btorn\b|\btear|\bopen(ed|ing|s)?\b|\bpour|\bspill|coming out|comes? out|fall(s|ing)? (out|from)|upside|\bheld\b|\bhold(s|ing)?\b|\bgrip|\bhands?\b|\bfingers?\b|\bsqueez|\bworn\b|\bfitted\b|\bfasten|in a way (it|the product) (cannot|does not)|does not work/i],
    ["shape", /\bshape|proportion|wrong size|too (small|large|big|thin|tall|wide)|drawn as a|different kind of pack|part (it|the real product) does not have|deformed|warped|melted|translucent/i],
    ["colour", /colou?rs?\b|off the brand look|\bcontrast\b|\btint/i],
    ["layout", /\blayout\b|cropped|covered|\bborder|watermark|\bbutton|biggest text|place to start|read on a phone|overlap|too close to|cut off|leaked in/i],
];
export function faultKind(note: string): FaultKind {
    for (const [kind, re] of FAULT_TESTS)
        if (re.test(note))
            return kind;
    return "object";
}
export function mendRoute(notes: string[]): MendRoute {
    return notes.some((n) => FAULT_ROUTE[faultKind(n)] === "redraw") ? "redraw" : "change";
}
export const redrawWhy = (notes: string[]): string => (notes.some((n) => faultKind(n) === "look") ? "the picture is not in the look it was asked for" : "the fault is in how the product is handled or shaped");
const bare = (s: string) => s.replace(/^[-\s]+/, "").trim();
export function doItThisWay(notes: string[], facts: string[], productAt: number): string {
    const off = notes.filter((n) => faultKind(n) === "look").map(bare);
    const look = off.length ? `MAKE IT IN THE LOOK. This is a new picture. An earlier one was another kind of picture than the look this ad is made in:\n${off.map((n) => `- ${n}`).join("\n")}\nThe whole picture is made in that look, edge to edge, as the prompt below describes it: every person, object and surface, and the product inside it at its true shape, colours and label. A photograph or a pack shot with a little of the look added is wrong.` : "";
    const wrong = notes.filter((n) => FAULT_ROUTE[faultKind(n)] === "redraw" && faultKind(n) !== "look").map(bare);
    if (!wrong.length)
        return look;
    const photo = productAt > 0 ? `Image ${productAt}, the product photo, is the truth for the product's shape, size, parts and where it opens: where the text below and image ${productAt} disagree about the product, image ${productAt} wins. ` : "";
    const how = facts.length ? `\nHow the product is opened, held and used, exactly:\n${facts.slice(0, 8).map((f) => `- ${bare(f)}`).join("\n")}` : "";
    return `${look ? `${look}\n\n` : ""}DO IT THIS WAY. ${photo}This is a new picture, and how the product is handled is drawn first and everything else is arranged round it.${how}\nAn earlier picture got it wrong. Each line says what it did: draw the right way the line names, and nothing of the wrong one.\n${wrong.map((n) => `- ${n}`).join("\n")}\nIf the scene cannot show the product handled this way, show it closed and at rest instead.`;
}
export const MAX_TRIES = 3;
export function oneClause(notes: string[], tried: string[] = []): string | null {
    const done = new Set(tried.map(bare));
    for (const n of notes.map(bare))
        if (n && FAULT_ROUTE[faultKind(n)] === "change" && !done.has(n))
            return n;
    return null;
}
