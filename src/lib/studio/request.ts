import { productRule, type ProductPlace } from "../product-in-picture";
export interface RequestText {
    role: string;
    text: string;
    placement?: string;
}
export interface ImageRequestParts {
    opening: string;
    ratioNote?: string;
    lead?: string;
    logo?: boolean;
    roles: string[];
    alsoRoles?: string[];
    body: string;
    texts: RequestText[];
    noText?: boolean;
    fingerprint?: string;
    rules?: string;
    corrections?: string;
    product?: ProductPlace;
    productSize?: string;
}
export function hasImageList(body: string, count: number): boolean {
    const m = body.match(/^IMAGES\b[^\n]*\n((?:[^\n]+\n?)+)/m);
    return !!m && (m[1].match(/^\s*\d+\./gm)?.length ?? 0) === count && count > 0;
}
export function withoutImageList(body: string): string {
    return body
        .replace(/^IMAGES\b[^\n]*\n(?:[ \t]*(?:[-*] ?)?(?:\d+[.):]|Image \d+\b)[^\n]*(?:\n|$))*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
export function splitRatios(body: string, aspect: string): {
    body: string;
    note: string;
} {
    const m = body.match(/\n+RATIOS\n([\s\S]*?)(?=\n\n[A-Z][A-Z ,()]{2,}(?:\n|$)|$)/);
    if (!m)
        return { body, note: "" };
    const note = m[1]
        .split(/(?<=\.)\s+/)
        .filter((x) => x.includes(aspect))
        .join(" ")
        .trim()
        .replace(/bottom 20%/g, "bottom 35%");
    return { body: body.replace(m[0], "").trim(), note };
}
export function spelledOut(texts: RequestText[], max = 6): string {
    const words = new Set<string>();
    for (const t of texts)
        for (const w of t.text.match(/[\p{L}][\p{L}\p{N}'’+-]*/gu) ?? [])
            if (w.length >= 9 || /[^\x00-\x7F]/.test(w) || /\p{L}\p{N}|\p{N}\p{L}/u.test(w))
                words.add(w);
    return [...words]
        .slice(0, max)
        .map((w) => `"${w}" is spelt ${[...w].join("-")}`)
        .join("; ");
}
const TEXT_FAULT = /text|word|spel|letter|headline|typo|lettering|caption|misspel|garbl/i;
export function slopGuards(texts: {
    role: string;
    text: string;
}[], noText: boolean): string {
    const n = texts.length;
    const button = texts.some((t) => /^(cta|button)$/i.test(t.role));
    return [
        noText || !n ? "" : `The image contains exactly ${n} piece${n === 1 ? "" : "s"} of text and no other text anywhere: no fake website, slogan, signature, watermark or extra line.`,
        noText || !n ? "" : "No punctuation at the end of any line of text unless the line above ends with it.",
        "No woven tag, care label, fabric tag, fine print or small logo anywhere in frame other than the product's own printing: every tag tucked out of sight.",
        button ? "The button's words are printed inside the button shape, centred, in high contrast against the button colour, correctly spelled." : "",
    ]
        .filter(Boolean)
        .join("\n");
}
type Face = "heading" | "display" | "body" | "tag";
const FACES: {
    face: Face;
    line: RegExp;
    label: string;
}[] = [
    { face: "heading", line: /^HEADLINE TYPE\b/, label: "HEADLINE TYPE" },
    { face: "display", line: /^DISPLAY TYPE\b/, label: "DISPLAY TYPE" },
    { face: "body", line: /^BODY TYPE\b/, label: "BODY TYPE" },
    { face: "tag", line: /^SMALL TAG TYPE\b/, label: "SMALL TAG TYPE" },
];
export function splitFingerprint(fingerprint: string): {
    type: string[];
    faces: Face[];
    families: string[];
    rest: string;
} {
    const lines = fingerprint.split(/\r?\n/).filter((l) => l.trim());
    const type = lines.filter((l) => FACES.some((f) => f.line.test(l)));
    return {
        type,
        faces: FACES.filter((f) => type.some((l) => f.line.test(l))).map((f) => f.face),
        families: [...new Set(type.flatMap((l) => [...l.matchAll(/\(the brand's ([^,)]+), weight/g)].map((m) => m[1].trim())))],
        rest: lines.filter((l) => !type.includes(l)).join("\n"),
    };
}
const MAIN_LINE = /^(headline|title|display|statement|hook)$/i;
const TAG_LINE = /^(badge|tag|chip|eyebrow|sticker|flag)$/i;
export function faceFor(t: Pick<RequestText, "role" | "text">, faces: Face[]): Face | null {
    const short = t.text.trim().split(/\s+/).length <= 3;
    const order: Face[] = MAIN_LINE.test(t.role) ? ["heading", "display", "body"] : TAG_LINE.test(t.role) && short ? ["tag", "body", "heading"] : ["body", "heading", "display"];
    return order.find((f) => faces.includes(f)) ?? null;
}
const NAMES_TYPE = /\b(?:sans(?:-serif)?|serif|grotesque|grotesk|typefaces?|fonts?|monospaced?|slab|lettering|lettered|handwrit\w+|typewriter|(?:headline|display|body|tag|subtitle) (?:type|face)|weight \d{3})\b/i;
export function untypedTexts<T extends Pick<RequestText, "role" | "text">>(body: string, texts: T[], families: string[] = []): T[] {
    const lines = body.split(/\r?\n/);
    const named = (s: string) => NAMES_TYPE.test(s) || families.some((f) => f && s.toLowerCase().includes(f.toLowerCase()));
    const quotes = (s: string) => /["“]/.test(s);
    return texts.filter((t) => {
        const at = lines.findIndex((l) => l.includes(t.text));
        if (at < 0)
            return true;
        if (named(lines[at].replace(t.text, "")))
            return false;
        const under = lines[at + 1] ?? "";
        if (under.trim() && !quotes(under) && named(under))
            return false;
        const role = t.role.toLowerCase().replace(/[^a-z]+/g, " ").trim();
        return !(role && lines.some((l) => !quotes(l) && new RegExp(`\\b${role}s?\\b`, "i").test(l) && named(l)));
    });
}
const listed = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export function typeBlock(a: Pick<ImageRequestParts, "body" | "texts" | "roles" | "fingerprint">): string {
    const look = splitFingerprint(a.fingerprint ?? "");
    if (!look.type.length || !a.texts.length)
        return "";
    const specimen = a.roles.map((r) => r.match(/^(\d+)\.[^\n]*\btype\b[^\n]*\bspecimen\b/i)?.[1]).find(Boolean);
    const gaps = untypedTexts(a.body, a.texts, look.families);
    const byFace = new Map<Face, string[]>();
    for (const role of [...new Set(gaps.map((t) => t.role))]) {
        const of = gaps.filter((t) => t.role === role).map((t) => faceFor(t, look.faces));
        const face = of.every((f) => f === "tag") ? "tag" : of.find((f) => f && f !== "tag");
        if (face)
            byFace.set(face, [...(byFace.get(face) ?? []), `the ${role}`]);
    }
    const assigned = FACES.filter((f) => byFace.has(f.face)).map((f) => `${listed(byFace.get(f.face)!)} in ${f.label}`);
    return [
        `BRAND TYPE. Added words are set in the brand's own typefaces${specimen ? `, as image ${specimen} shows them` : ""}: the same letter shapes, weight and width, never a stand-in that is only similar. Capital and small letters stay as each line is written. A line the prompt above gives another lettering of its own keeps that lettering.`,
        ...look.type,
        assigned.length ? `The prompt above names no typeface for some lines. Set ${assigned.join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
export function imageRequest(a: ImageRequestParts): string {
    const none = a.product === "none";
    const missing = a.texts.filter((t) => !a.body.includes(t.text));
    const texts = a.noText
        ? none
            ? "NO ADDED TEXT. No captions, no headlines, no logos, no watermarks, no lettering of any kind."
            : "NO ADDED TEXT. No captions, no headlines, no logos, no watermarks, no lettering of any kind. Only the printing on the product itself, exactly as in the product photo."
        : !a.texts.length
            ? ""
            : missing.length
                ?
                    `EXACT TEXT. These words are final and override any wording above. Each appears exactly once. Nothing else is written on the image except what is printed on the product:\n${a.texts.map((t) => `- ${t.role}${t.placement ? `, ${t.placement}` : ""}: "${t.text}"`).join("\n")}\nRender all text crisply, spelled exactly as written, fully legible.`
                : /exactly once/i.test(a.body)
                    ? ""
                    : "Each line of text given above is written on the image exactly once, and nothing else is written except what is printed on the product.";
    const guards = slopGuards(a.texts, !!a.noText);
    const logo = a.logo ? "The brand's logo is the 1 exception to the text rules here: it is placed once, from its attached file, exactly as that file shows it. It is never redrawn, retyped or recoloured." : "";
    const spell = a.corrections && a.texts.length && TEXT_FAULT.test(a.corrections) ? spelledOut(a.texts) : "";
    const also = (a.alsoRoles ?? []).map((r, i) => `${a.roles.length + i + 1}. ${r}`);
    const look = splitFingerprint(a.fingerprint ?? "");
    const body = withoutImageList(a.body);
    return [
        `${a.opening}${a.ratioNote ? ` In this shape: ${a.ratioNote} Where that differs from LAYOUT below, it wins.` : ""}`,
        a.lead ?? "",
        a.roles.length ? `IMAGES ATTACHED, by role. Read them by role. Do not blend their roles.\n${a.roles.join("\n")}` : "",
        body,
        also.length ? `${a.roles.length ? "ALSO ATTACHED, after the images listed above" : "IMAGES ATTACHED, by role"}:\n${also.join("\n")}` : "",
        texts,
        guards,
        logo,
        look.rest && !/#[0-9a-f]{6}\b/i.test(a.body) ? `BRAND LOOK\n${look.rest}` : "",
        a.noText ? "" : typeBlock(a),
        none
            ? `PRODUCT RULE. ${productRule("none")}`
            : `PRODUCT RULE. ${a.product === "background" ? `${productRule("background")} ` : ""}The product must match the product photo exactly: same shape, same colours, same materials, same label and the same words printed on it. A beautiful image of a subtly wrong product is a failure.`,
        none ? "" : (a.productSize ?? ""),
        a.rules ? `RULES LEARNED FROM EARLIER WORK. Each was a mistake on a past image. They apply wherever this picture touches them, and override anything above that disagrees:\n${a.rules}` : "",
        a.corrections ? `CORRECTIONS. The last attempt failed these checks. Fix every one, and keep everything else as it was:\n${a.corrections}${spell ? `\nSpelling, letter by letter: ${spell}.` : ""}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}
export interface WordsNow {
    role: string;
    text: string;
    placement?: string;
}
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
export function wordChanges(before: WordsNow[] | undefined, now: WordsNow[]): string[] {
    if (!before)
        return [];
    const left = before.map((t) => ({ ...t, text: oneLine(t.text) }));
    const fresh: WordsNow[] = [];
    for (const t of now) {
        const same = left.findIndex((b) => b.text === oneLine(t.text));
        if (same >= 0)
            left.splice(same, 1);
        else
            fresh.push(t);
    }
    const oneForOne = left.length === fresh.length;
    const out: string[] = [];
    for (const t of fresh) {
        let at = left.findIndex((b) => b.role === t.role);
        if (at < 0 && oneForOne && left.length)
            at = 0;
        const old = at >= 0 ? left.splice(at, 1)[0] : undefined;
        out.push(old
            ? `The ${old.role} that reads "${old.text}" now reads "${oneLine(t.text)}". Same place, same typeface and same colour, and the same size unless the new words need it a little smaller to fit.`
            : `Add a ${t.role}${t.placement ? `, ${t.placement}` : ""}: "${oneLine(t.text)}". Set it in the typeface and colours the image already uses.`);
    }
    for (const b of left)
        out.push(`Take off the ${b.role} that reads "${b.text}", and continue the surface or background that was behind it.`);
    return out;
}
export interface ChangeRequestParts {
    one: string;
    aspect: string;
    ask?: string;
    fix?: string[];
    words?: string[];
    texts: WordsNow[];
    roles: string[];
    product?: ProductPlace;
    rules?: string;
    corrections?: string;
}
export function changeRequest(a: ChangeRequestParts): string {
    const faults = (a.fix ?? []).map((x) => x.replace(/^[-\s]+/, "").trim()).filter(Boolean);
    const changes = [...(a.ask?.trim() ? [a.ask.trim()] : []), ...(a.words ?? []), ...faults];
    const none = a.product === "none";
    const mend = faults.length > 0 && changes.length === faults.length;
    const one = mend && faults.length === 1;
    return [
        ["IMAGES ATTACHED, by role. Read them by role. Do not blend their roles.", mend ? `1. A finished ${a.aspect} ${a.one} that failed its check. Return this same image with only the ${one ? "fault" : "faults"} below mended.` : `1. The finished ${a.aspect} ${a.one} to change. Return this same image with only the change below made to it.`, ...a.roles.map((r, i) => `${i + 2}. ${r}`)].join("\n"),
        `${one ? "MEND ONLY THIS ONE FAULT, found when image 1 was checked. Change only one thing" : mend ? "MEND ONLY THESE FAULTS, found when image 1 was checked" : "CHANGE ONLY THIS"}:\n${changes.map((c) => `- ${c}`).join("\n")}`,
        "KEEP EVERYTHING ELSE exactly as it is in image 1: the scene, the people and their faces, the props, the light, the colours, the crop, the camera, the layout, and every word that is not named above, in the same place, typeface, size and colour. Do not restyle, re-compose, re-light or redraw anything the change does not need. This is an edit of image 1, not a new picture.",
        a.texts.length
            ? `THE WORDS ON THE IMAGE AFTER THE CHANGE. Each appears exactly once, and nothing else is written except what is printed on the product:\n${a.texts.map((t) => `- ${t.role}${t.placement ? `, ${t.placement}` : ""}: "${oneLine(t.text)}"`).join("\n")}\nRender all text crisply, spelled exactly as written, fully legible.`
            : none
                ? "NO ADDED TEXT of any kind."
                : "NO ADDED TEXT. The only words are the ones printed on the product itself.",
        none ? "" : "PRODUCT RULE. The product stays exactly as it is in image 1, and matches the product photo: same shape, same colours, same materials, same label and the same words printed on it. Where the change adds the product, it is drawn from the product photo, never invented.",
        a.rules ? `RULES LEARNED FROM EARLIER WORK. They apply only to what this change touches:\n${a.rules}` : "",
        a.corrections ? `CORRECTIONS. The last attempt at this change failed these checks. Fix every one, and keep everything else as it is in image 1:\n${a.corrections}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}
export function swapWords(prompt: string, before: WordsNow[], now: WordsNow[]): {
    prompt: string;
    clean: boolean;
} {
    let out = prompt;
    const gone = before.filter((b) => b.text && !now.some((n) => n.text === b.text));
    const fresh = now.filter((n) => !before.some((b) => b.text === n.text));
    if (gone.length === fresh.length) {
        const pool = [...fresh];
        for (const g of gone) {
            const at = Math.max(0, pool.findIndex((f) => f.role === g.role));
            const f = pool.splice(at, 1)[0];
            if (f && out.includes(g.text))
                out = out.split(g.text).join(f.text);
        }
    }
    const clean = now.every((n) => out.includes(n.text)) && gone.every((g) => !out.includes(g.text) || now.some((n) => n.text.includes(g.text)));
    return { prompt: out, clean };
}
export function capRefs<T extends {
    keep: number;
}>(list: T[], max: number): {
    kept: T[];
    dropped: T[];
} {
    const kept = [...list];
    const dropped: T[] = [];
    while (kept.length > max) {
        const low = Math.min(...kept.map((x) => x.keep));
        if (low >= 9)
            break;
        dropped.push(...kept.splice(kept.map((x) => x.keep).lastIndexOf(low), 1));
    }
    return { kept, dropped };
}
