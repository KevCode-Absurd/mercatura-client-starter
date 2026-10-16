import fs from "node:fs";
import { z } from "zod";
import { brandLookState, loadBrandLook, lookFile } from "../brand-look";
import { env } from "../env";
import { logFailures, matchLesson, pictureLessons } from "../failures";
import type { LookType } from "../format-media";
import { geminiJson } from "../llm/gemini";
import type { ProductPlace } from "../product-in-picture";
import { VISUAL_BRAND_CONTRACT } from "../creative-brand-contract";
export interface ImageQa {
    status: "pass" | "warn" | "fail";
    notes: string[];
    kinds?: NoteKind[];
    unread?: true;
    typeface?: true;
}
export const NOTE_KINDS = ["product_wrong", "product_cut", "text_wrong", "layout_lost", "person_wrong", "brand_rule", "small_detail", "typeface", "not_read"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const KIND_LEVEL: Record<NoteKind, "fail" | "warn" | "note" | "unread"> = {
    product_wrong: "fail",
    product_cut: "fail",
    text_wrong: "fail",
    layout_lost: "fail",
    person_wrong: "fail",
    brand_rule: "warn",
    small_detail: "note",
    typeface: "note",
    not_read: "unread",
};
export type ReadStatus = "pass" | "warn" | "fail" | "not_read";
export function statusOf(kinds: readonly NoteKind[]): ReadStatus {
    const levels = new Set(kinds.map((k) => KIND_LEVEL[k]));
    return levels.has("fail") ? "fail" : levels.has("unread") ? "not_read" : levels.has("warn") ? "warn" : "pass";
}
export interface Finding {
    kind: NoteKind;
    note: string;
}
export function qaOf(findings: readonly Finding[]): ImageQa {
    const rank = { fail: 0, unread: 1, warn: 2, note: 3 } as const;
    const status = statusOf(findings.map((f) => f.kind));
    const seen = new Set<string>();
    const kept = findings
        .filter((f) => f.kind !== "typeface" && f.note.trim() && !seen.has(f.note) && !!seen.add(f.note))
        .map((f, i) => ({ f, i }))
        .sort((a, b) => rank[KIND_LEVEL[a.f.kind]] - rank[KIND_LEVEL[b.f.kind]] || a.i - b.i)
        .slice(0, 8)
        .map((x) => x.f);
    return { status: status === "not_read" ? "warn" : status, notes: kept.map((f) => f.note), kinds: kept.map((f) => f.kind), ...(status === "not_read" ? { unread: true as const } : {}), ...(findings.some((f) => f.kind === "typeface") ? { typeface: true as const } : {}) };
}
export const readStatus = (qa: Pick<ImageQa, "status" | "unread"> | null | undefined): ReadStatus | null => (!qa ? null : qa.unread && qa.status !== "fail" ? "not_read" : qa.status);
export function faultNotes(qa: Pick<ImageQa, "notes" | "kinds"> | null | undefined): string[] {
    if (!qa)
        return [];
    if (!qa.kinds || qa.kinds.length !== qa.notes.length)
        return qa.notes;
    return qa.notes.filter((_, i) => KIND_LEVEL[qa.kinds![i]] === "fail");
}
export const unreadQa = (why: string): ImageQa => qaOf([{ kind: "not_read", note: `Not read: the automatic check didn't run (${why.slice(0, 100)}). The picture was not judged.` }]);
export interface InspectRequest {
    brandId: string;
    refType: string;
    refId: string;
    one: string;
    productName: string;
    truth: string;
    scene: string;
    texts: {
        role: string;
        text: string;
    }[];
    look: string;
    rules: string;
    file: string;
    hero: string;
    itemId?: string | null;
    productId?: string | null;
    product?: ProductPlace;
    logo?: string;
    specimen?: string | null;
    lookType?: LookType;
    lookUnread?: boolean;
    format?: {
        label: string;
        is: string;
    };
    heroIsUnit?: boolean;
    templateContract?: string;
    layout?: string;
    expression?: string;
    lookAsked?: string;
    buyer?: string;
    subject?: string;
}
export const LOOK_UNREAD_NOTE = "The brand's fonts and colours could not be read, so this picture was made and checked without them. Scan the site again on the Brand brain, then make it again.";
const TYPE_OFF_NOTE = "The added type is not in the brand's typefaces.";
export const TYPE_UNVERIFIED_NOTE = "The brand type could not be compared with an actual specimen. Restore the brand typography reference before approving the font match.";
export const lookMissNote = (label: string, what = "") => `The picture is not made in the look it was asked for (${label}).${what.trim() ? ` ${what.trim()}` : ""}`;
const noted = <K extends string>(kinds: readonly [
    K,
    ...K[]
], fallback: K) => z.preprocess((v) => (typeof v === "string" ? { kind: fallback, note: v } : v), z.object({ kind: z.enum(kinds).catch(fallback), note: z.string() }));
const READ_KINDS = ["product_wrong", "product_cut", "text_wrong", "layout_lost", "person_wrong", "brand_rule", "small_detail", "typeface"] as const satisfies readonly NoteKind[];
const QaOut = z.object({
    product_matches: z.boolean(),
    text_correct: z.boolean(),
    text_problems: z.array(noted(["text_wrong", "small_detail"], "text_wrong")).max(8).default([]),
    product_cropped_or_covered: z.boolean(),
    reference_leak: z.boolean(),
    unwanted_frame_or_button: z.boolean(),
    on_brand: z.boolean(),
    readable_on_phone: z.boolean().default(true),
    clear_hierarchy: z.boolean().default(true),
    person_fits_buyer: z.boolean().default(true),
    type_matches: z.boolean().default(true),
    look_delivered: z.boolean().default(true),
    look_problem: z.string().default(""),
    template_matches: z.boolean().default(true),
    template_problem: z.string().default(""),
    notes: z.array(noted(READ_KINDS, "small_detail")).max(6).default([]),
});
const unwrap = (v: unknown) => (Array.isArray(v) && v.length === 1 && v[0] && typeof v[0] === "object" ? v[0] : v);
const SenseShape = z.object({
    packs: z
        .array(z.object({
        which: z.string(),
        state: z.string().default("unclear"),
        opening_at: z.string().default("none"),
        contents_come_from: z.string().default(""),
        matches_facts: z.boolean(),
        problem: z.string().default(""),
    }))
        .max(8)
        .default([]),
    hands: z.array(z.object({ whose: z.string(), doing: z.string(), possible: z.boolean(), problem: z.string().default("") })).max(6).default([]),
    scene_possible: z.boolean().default(true),
    scene_problem: z.string().default(""),
    lessons_broken: z.array(z.object({ rule: z.string(), what: z.string(), about: z.enum(["product", "other"]).catch("other"), planned: z.boolean().default(false) })).max(6).default([]),
});
const SenseOut = z.preprocess(unwrap, SenseShape);
export function plannedProductNote(place: ProductPlace | undefined): string {
    if (place === "none")
        return "This image was planned with no product in it: the picture is the buyer's own moment, and Image 2 is here only so you know what the product looks like. A generic, unbranded thing in the scene is not the product. ";
    if (place === "background")
        return "The product was planned small and in the background, perhaps partly hidden or out of focus: judge it on its shape and colours, and do not report it as cropped, covered or too small. ";
    return "";
}
export function plannedFaceNote(expression: string | null | undefined): string {
    const face = (expression ?? "").trim().replace(/\.$/, "");
    return face ? `\n\nThe face planned for this picture: ${face}. That look on the face was asked for. Judge the face drawn against it: is it the one that was planned? A planned face that is neutral, tired, tense or sceptical is not a sad or a sick person. Report a rule about how people look only where the face drawn is plainly sadder, sicker or more worn than the one planned.` : "";
}
export function buyerQuestion(buyer: string | null | undefined, subject?: string | null): string {
    const b = (buyer ?? "").trim();
    if (!b)
        return "";
    const who = (subject ?? "").trim().replace(/\.$/, "");
    return `\n\nThe buyer this ad is for: ${b}. The subject of this picture is the person it presents as living the moment${who ? ` (planned as: ${who})` : ""}. Does that person look like the buyer this ad is for: ${b}? Judge nobody else: a name, a contact picture or an avatar inside a message thread, a screen or a photo within the picture is someone the buyer knows, never the buyer. Where the subject is not seen (only their hands, their own screen, their own note), the answer is yes.`;
}
export const notLikeBuyerNote = (buyer: string): string => `The person this ad presents does not look like the buyer it is for (${buyer}): plainly another gender, or a generation older or younger.`;
export const PLANNED_THINGS_RULE = "What the plan asked for: the note on what the image was meant to show, and its planned words, say what the plan put in this picture. A thing they name as what the product replaces, as the old way or as the problem (another kind of product, a thing left behind, a mess) is in the picture on purpose. A rule that says never to show such a thing is not broken by it: a rule is broken only by a thing the plan did not ask for.";
export function plannedWordsLine(words: readonly {
    text: string;
}[] = []): string {
    const said = words.map((t) => t.text.trim()).filter(Boolean);
    return said.length ? `\n\nThe words planned on this picture: ${said.map((t) => `"${t}"`).join("; ")}` : "";
}
export function askedLookNote(look: string | null | undefined): string {
    const said = (look ?? "").trim().replace(/\.$/, "");
    return said ? `\n\nThe look of this picture was chosen by the person who asked for it: ${said}. It was asked for. Do not report it as breaking a rule about colour, tone or finish.` : "";
}
export const UNIT_PHOTO_NOTE = "This picture is about using 1 unit of the product (1 serving or piece, out of the pack it comes in), and Image 2 is a real photo of that 1 unit, not of the outer pack. Judge the unit in the picture against Image 2: its shape, colours, artwork and wording. Where the outer pack is in the picture too, judge it only on carrying the same artwork and colours. Never report the picture for leaving the outer pack out. ";
function specimenOnFile(brandId: string): string | null {
    try {
        return lookFile(brandId, loadBrandLook(brandId)?.specimen ?? "");
    }
    catch {
        return null;
    }
}
export function checkBrief(req: InspectRequest, o: {
    specimen?: string | null;
    lookUnread?: boolean;
} = {}): {
    system: string;
    user: string;
    images: string[];
} {
    const { texts } = req;
    const specimen = req.look && texts.length ? (o.specimen ?? null) : null;
    const exempt = req.lookType !== "look"
        ? "Every added word is judged, the captions and speech of the picture's own style included: there the brand's face may be redrawn in that style's medium (inked, typed, set as a subtitle) and is right when its weight, width and letter shapes are kept."
        : "Lettering that belongs to the picture's own style is not judged: a comic's captions and speech bubbles, a handwritten or typewritten note, a clip's subtitle, writing on a sign or a board in the scene.";
    const type = specimen
        ? `- type_matches: compare the added type on Image 1 with the typefaces on Image 3, line by line: the headline against the headline face, a short tag (a badge or a flag) against the tag face where Image 3 shows one, a big statement line against the display face where it shows one, and every other line, labels and captions among them, against the body face. true only if each line is in that typeface or one a reader would take for it: the same kind (sans-serif, serif, slab, rounded, monospace, script), the same weight and width, the same letter shapes. Judge the typeface, never the letter case, the size or the colour. ${exempt} Words printed on the product and the brand's logo are not judged. true when no text was planned. For each line that is in another typeface, add a note of kind "typeface" naming the line by its role and saying which face it should be in.`
        : "- type_matches: true. No type specimen is attached, so the typefaces cannot be compared.";
    const named = req.format
        ? `- look_delivered: this image was asked for in a named look, "${req.format.label}". ${req.format.is} true only if Image 1 as a whole is plainly made that way, edge to edge, so that a stranger would name the look at a glance. false if it is another kind of picture (an ordinary photograph or a plain pack shot where the look is drawn, modelled, painted or rendered; the finished state where the look is a moment caught), or if only a border, a texture or a corner of it is in the look. Judge how the picture is made, never its words or its type. The product keeps its real shape, colours and label inside any look, and is never the reason for false.\n- look_problem: when look_delivered is false, 1 sentence: what the picture is instead, and what it has to be. Empty otherwise.\n`
        : "";
    const look = req.look || (o.lookUnread ? "(the brand's look is on file and could not be read: its type and colours cannot be judged here, and a person is told so)" : "(none given: do not judge it)");
    return {
        system: `You inspect a generated ${req.one} for an ecommerce brand before a person sees it. Image 1 is the generated image. Image 2 is the real product photo.${specimen ? " Image 3 is the brand's type specimen: a sheet of the brand's real typefaces, each labelled with what it is for, and its colours. It is a reference for the type only and is never part of the picture." : ""} Be strict and literal: read every word on Image 1 letter by letter, and look at the picture as a whole: does it make sense, not only does the product match. Be strict about what a person looking at the ad would call wrong: the product, the words, the idea of the layout, the person. A small detail is a note, never a fault. ${PLANNED_THINGS_RULE} ${VISUAL_BRAND_CONTRACT}

Return JSON:
- product_matches: true only if the product in Image 1 has the same shape, colours, materials, label layout and wording as Image 2. Image 2 shows ${req.heroIsUnit ? "1 single unit of the product on its own (the serving or piece a customer uses at a time), not the pack it is sold in: this image is about using 1" : "the product as it is sold: in its packaging if it is sold in one, on its own if it is not"}. Some products also have a smaller unit or a part inside (a single-serve sachet, a refill, the item out of its box): the product facts say so. An image that was meant to show only that smaller unit is judged on it carrying the brand's real artwork and colours; it is not failed for leaving the outer packaging out or for being smaller. Small lighting differences are fine. A different shape, a changed or garbled label, a part the real product does not have, or a different colour is false. An image that was planned with no product in it (the note on what it was meant to show says so) is true.
- text_correct: true only if every planned text line appears on Image 1 with every word spelled exactly as given, and there is no other added text (text printed on the product itself does not count). A full stop, a comma or another mark at the end of a line that is missing or added, where a line breaks, and capital letters do not make it false. If no text was planned, true only if the image has no added text at all.
- text_problems: each problem with the added words, as { kind, note }, the note quoting the line. kind "text_wrong": a word misspelt, missing, changed or added, or a line that is not one of the planned lines. kind "small_detail": a mark of punctuation at the end of a line, a line break, a capital letter. Capital and lower-case letters are correct when they match the planned text as written; do not report a line for being in a different case than the brand's usual style.
- product_cropped_or_covered: true if the product is cut off by the frame or has text or graphics over it.
- reference_leak: true if another brand's name, logo or product appears.
- unwanted_frame_or_button: true if there is a white border, a watermark, a button nobody asked for, or a generic opaque panel added to hide a text/font/contrast fault. An authentic object or explicitly approved in-world speech bubble is not that fallback panel. Name the field or region and smallest correction in notes; preserve the exact words, planned logo and successful art.
- on_brand: true if the added type and colours fit the brand look described. Judge the typeface and the colours, not the letter case. True when no brand look is given.
${type}
- readable_on_phone: picture Image 1 shrunk to 390 pixels wide, the width of a phone feed. true if every planned line would still read: big enough, enough contrast with what is behind it, not running over a busy part of the photo. true when no text was planned.
- clear_hierarchy: true if the headline is plainly the largest text and the eye has 1 place to start. false if 2 lines compete at the same size, or the smaller text is larger than the headline. true when there is 1 text line or none.
- person_fits_buyer: where the message below names "The buyer this ad is for", answer the question it asks about the subject of Image 1: the person the picture presents as living its moment, and nobody else. true if nobody is in the picture, if only hands are, if the subject is not seen, if the person plainly could be that buyer, or if you cannot tell. A name, a contact picture or an avatar inside a message thread, a screen or a photo within the picture is never the subject. false only where the subject is plainly of another gender, or plainly a generation older or younger than that buyer. true where no buyer is named.
${named}${req.templateContract ? "- template_matches: true only if the selected layout's essential zones, reading order and product count are preserved. false only where the layout is so far from the plan that the idea of the ad is lost: a zone that carries the idea is missing or is something else, the reading order is broken, or the product count is wrong. These never make it false, and go in notes as small_detail: the number of lines a headline wraps to, a small logo, a highlight bar or another small device that is absent, spacing, an extra prop. Modest spacing changes for the aspect ratio are fine. Judge the planned layout, never a preferred alternative format.\n- template_problem: when template_matches is false, the one visible layout defect and the smallest correction that preserves every planned word and the actual SKU. Empty otherwise.\n" : "- template_matches: true. No template contract was supplied.\n- template_problem: empty.\n"}- notes: up to 6 short, specific things to fix, most serious first, each as { kind, note }. kind says what it is: "product_wrong" (the product's shape, pack, label or use is drawn wrong), "product_cut" (the product is cut by the frame or covered), "text_wrong" (a word misspelt, missing, changed or added), "layout_lost" (the layout or the look is so far off that the idea is lost), "person_wrong" (a person drawn wrong, or the subject plainly not the buyer), "brand_rule" (a rule broken by something the plan did not ask for), "typeface" (a line in another typeface), "small_detail" (anything else: punctuation at the end of a line, how a headline wraps, a small logo or a highlight absent, spacing, a prop). Empty if nothing is wrong.`,
        user: `Product: ${req.productName}\nProduct facts:\n${req.truth}\n\nBrand look:\n${look}\n\n=== PER CALL ===\n\nWhat this image was meant to show: ${req.scene}${req.templateContract ? `\n\nTemplate contract: ${req.templateContract}\nPlanned layout: ${req.layout || "(no added type)"}` : ""}\n\nPlanned text, exactly:\n${texts.length ? texts.map((t) => `- ${t.role}: "${t.text}"`).join("\n") : "(none: this image must have no added text)"}${req.logo ? `\nThe brand's own logo was planned on this image (${req.logo}), placed from the brand's logo file. It is not extra text. Report it in notes only if it is missing, misspelt, or plainly redrawn in another typeface.` : ""}${buyerQuestion(req.buyer, req.subject)}`,
        images: [req.file, req.hero, ...(specimen ? [specimen] : [])],
    };
}
export async function inspectImage(input: InspectRequest): Promise<ImageQa> {
    const req: InspectRequest = { ...input, scene: `${plannedProductNote(input.product)}${input.heroIsUnit && input.product !== "none" ? UNIT_PHOTO_NOTE : ""}${input.scene}${plannedFaceNote(input.expression)}${askedLookNote(input.lookAsked)}` };
    const lookUnread = !req.look && (req.lookUnread ?? brandLookState(req.brandId) === "unreadable");
    const specimen = req.look && req.texts.length ? (req.specimen !== undefined ? req.specimen : specimenOnFile(req.brandId)) : null;
    const brief = checkBrief(req, { specimen: specimen && fs.existsSync(specimen) ? specimen : null, lookUnread });
    const typeUnverified = !!req.look && req.texts.length > 0 && brief.images.length < 3;
    const [found, sense] = await Promise.all([geminiJson({
            brandId: req.brandId,
            task: "studio_check",
            model: env.MODEL_REFERENCE,
            system: brief.system,
            user: brief.user,
            schema: QaOut,
            images: brief.images,
            effort: "low",
            maxTokens: 2500,
            refType: req.refType,
            refId: req.refId,
        }), senseOfImage(req)]);
    const out = { ...found, ...(req.product === "none" ? { product_matches: true, product_cropped_or_covered: false } : req.product === "background" ? { product_cropped_or_covered: false } : {}), ...(brief.images.length < 3 ? { type_matches: true } : {}), ...(req.format ? {} : { look_delivered: true }), ...(req.templateContract ? {} : { template_matches: true }) };
    const known = pictureLessons(req.brandId, req.productId);
    logFailures({ brandId: req.brandId, refType: req.refType, refId: req.refId, itemId: req.itemId, productId: req.productId }, [...checkPoints(out), ...sense.points].map((p) => ({ area: "pictures" as const, point: p.point, note: p.note, lessonId: p.rule ? matchLesson(known, p.rule) : null })));
    return qaOf(findingsOf({ out, sense: sense.found, product: req.product, buyer: req.buyer, look: req.format?.label, lookUnread, typeUnverified }));
}
export function findingsOf(a: {
    out: z.infer<typeof QaOut>;
    sense?: readonly Finding[];
    product?: ProductPlace;
    buyer?: string | null;
    look?: string;
    lookUnread?: boolean;
    typeUnverified?: boolean;
}): Finding[] {
    const { out } = a;
    const found: Finding[] = [];
    const add = (kind: NoteKind, note: string) => found.push({ kind, note });
    if (!out.product_matches)
        add("product_wrong", "The product does not match the product photo.");
    if (!out.look_delivered)
        add("layout_lost", lookMissNote(a.look ?? "", out.look_problem));
    if (!out.template_matches)
        add("layout_lost", `The planned layout is not preserved. ${out.template_problem || "Restore its essential zones and reading order."} Keep every planned word and the actual product unchanged.`);
    found.push(...(a.sense ?? []));
    for (const t of out.text_problems)
        add(out.text_correct ? "small_detail" : t.kind, `Text: ${t.note}`);
    if (!out.text_correct && !out.text_problems.length)
        add("text_wrong", "The words on the picture are not the planned words.");
    const cutOff = out.product_cropped_or_covered && a.product === "shown";
    if (out.product_cropped_or_covered)
        add(cutOff ? "product_cut" : "brand_rule", "The product is cropped or covered.");
    if (out.reference_leak)
        add("product_wrong", "Something from the reference leaked in.");
    if (out.unwanted_frame_or_button)
        add("brand_rule", "There is a border, watermark or button nobody asked for.");
    if (a.lookUnread)
        add("not_read", LOOK_UNREAD_NOTE);
    if (a.typeUnverified)
        add("not_read", TYPE_UNVERIFIED_NOTE);
    if (!out.on_brand)
        add(out.type_matches ? "brand_rule" : "typeface", "Type or colours are off the brand look.");
    if (!out.type_matches)
        add("typeface", TYPE_OFF_NOTE);
    if (!out.readable_on_phone)
        add("brand_rule", "Some of the text would not read on a phone: too small, too low in contrast, or over a busy part of the photo.");
    if (!out.clear_hierarchy)
        add("brand_rule", "The headline is not clearly the biggest text: the eye has no single place to start.");
    if ((a.buyer ?? "").trim() && out.person_fits_buyer === false)
        add("person_wrong", notLikeBuyerNote(a.buyer!.trim()));
    const held = new Set(found.map((f) => f.kind));
    for (const n of out.notes)
        add(KIND_LEVEL[n.kind] === "note" || held.has(n.kind) ? n.kind : "small_detail", n.note);
    return found;
}
export interface PicturePoint {
    point: string;
    note: string;
    rule?: string;
}
const caseOnly = (problem: string) => {
    const quoted = [...problem.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    return quoted.length === 2 && quoted[0] !== quoted[1] && quoted[0].toLowerCase() === quoted[1].toLowerCase();
};
export function checkPoints(out: Omit<z.infer<typeof QaOut>, "type_matches" | "look_delivered" | "look_problem" | "template_matches" | "template_problem" | "person_fits_buyer" | "text_problems" | "notes"> & {
    type_matches?: boolean;
    look_delivered?: boolean;
    look_problem?: string;
    template_matches?: boolean;
    template_problem?: string;
    text_problems: (string | {
        kind?: string;
        note: string;
    })[];
    notes: (string | {
        kind?: string;
        note: string;
    })[];
}): PicturePoint[] {
    const said = (n: string | {
        note: string;
    } | undefined) => (typeof n === "string" ? n : (n?.note ?? ""));
    const texts = out.text_problems.filter((t) => typeof t === "string" || t.kind !== "small_detail").map(said);
    return [
        ...(out.product_matches ? [] : [{ point: "product_mismatch", note: said(out.notes[0]) || "The product does not match the product photo." }]),
        ...(out.look_delivered === false ? [{ point: "format_look", note: out.look_problem || "The picture is not made in the look it was asked for." }] : []),
        ...(out.template_matches === false ? [{ point: "layout", note: out.template_problem || "The planned layout is not preserved." }] : []),
        ...texts.map((t) => ({ point: caseOnly(t) ? "text_case" : "text", note: t })),
        ...(!out.text_correct && !out.text_problems.length ? [{ point: "text", note: said(out.notes[0]) || "The words on the image are not the planned words." }] : []),
        ...(out.product_cropped_or_covered ? [{ point: "cropped", note: "The product is cropped or covered." }] : []),
        ...(out.reference_leak ? [{ point: "leak", note: "Something from the reference leaked in." }] : []),
        ...(out.unwanted_frame_or_button ? [{ point: "frame", note: "There is a border, watermark or button nobody asked for." }] : []),
        ...(out.on_brand && out.type_matches !== false ? [] : [{ point: "look", note: out.on_brand ? TYPE_OFF_NOTE : "Type or colours are off the brand look." }]),
        ...(out.readable_on_phone ? [] : [{ point: "phone", note: "Some of the text would not read on a phone." }]),
        ...(out.clear_hierarchy ? [] : [{ point: "hierarchy", note: "The headline is not clearly the biggest text." }]),
    ];
}
type SenseAnswer = Omit<z.infer<typeof SenseShape>, "lessons_broken"> & {
    lessons_broken: {
        rule: string;
        what: string;
        about?: string;
        planned?: boolean;
    }[];
};
export function sensePoints(out: SenseAnswer): PicturePoint[] {
    return [
        ...out.packs.filter((p) => !p.matches_facts).map((p) => ({ point: "pack_use", note: p.problem || `${p.which}: opened or drawn in a way the product does not work.` })),
        ...out.hands.filter((h) => !h.possible).map((h) => ({ point: "hands", note: h.problem || `A hand (${h.whose}) is drawn in a way a real hand could not be.` })),
        ...(out.scene_possible ? [] : [{ point: "scene", note: out.scene_problem || "The scene could not be photographed as drawn." }]),
        ...out.lessons_broken.filter((x) => !heldByPlan(x)).map((x) => ({ point: "lesson", note: x.what || x.rule, rule: x.rule })),
    ];
}
const heldByPlan = (x: {
    planned?: boolean;
    about?: string;
}): boolean => !!x.planned && x.about !== "product";
export function senseFindings(out: SenseAnswer): Finding[] {
    const found: Finding[] = [
        ...out.packs.filter((p) => !p.matches_facts).map((p): Finding => ({ kind: "product_wrong", note: p.problem || `${p.which}: opened or drawn in a way the product does not work (opening at the ${p.opening_at}).` })),
        ...out.hands.filter((h) => !h.possible).map((h): Finding => ({ kind: "person_wrong", note: h.problem || `A hand (${h.whose}) is drawn in a way a real hand could not be.` })),
        ...out.lessons_broken.filter((x) => !heldByPlan(x)).map((x): Finding => ({ kind: x.about === "product" ? "product_wrong" : "brand_rule", note: `Breaks a rule from feedback (${x.rule}): ${x.what}` })),
        ...(out.scene_possible ? [] : [{ kind: "brand_rule" as const, note: out.scene_problem || "The scene could not be photographed as drawn." }]),
    ];
    const seen = new Set<string>();
    return found.filter((f) => !seen.has(f.note) && !!seen.add(f.note)).slice(0, 6);
}
export const PictureAnswers = { check: QaOut, sense: SenseShape };
async function senseOfImage(req: InspectRequest): Promise<{
    found: Finding[];
    points: PicturePoint[];
}> {
    try {
        const brief = senseBrief(req);
        const out = await geminiJson({
            brandId: req.brandId,
            task: "studio_sense",
            model: env.MODEL_COPY,
            system: brief.system,
            user: brief.user,
            schema: SenseOut,
            images: brief.images,
            effort: "medium",
            maxTokens: 6000,
            refType: req.refType,
            refId: req.refId,
        });
        return { found: senseFindings(out), points: sensePoints(out) };
    }
    catch (e) {
        return { found: [{ kind: "not_read", note: `Not read: the read of whether the picture makes sense didn't run (${(e as Error).message.slice(0, 100)}). The picture was not judged on that.` }], points: [] };
    }
}
export function senseBrief(req: Pick<InspectRequest, "one" | "truth" | "rules" | "scene" | "texts" | "file" | "hero">): {
    system: string;
    user: string;
    images: string[];
} {
    return {
        system: `You look at a generated ${req.one} before a person sees it. Image 1 is the generated image. Image 2 is the real product photo. A separate check compares the product's label and the words. Your job is different: does the picture make sense? Observe first, then judge. Be literal about what is drawn, not what was probably meant.

Step 1, every copy of the product in Image 1: the product itself, its packaging, and any smaller pack or part. (The answer field is called "packs" for all of them, packaged or not.) For each:
- which: name it ("the large pouch", "a small single-serve pack in her right hand", "the pan on the hob", "the jacket she is wearing").
- state: closed, open or unclear.
- opening_at: only for packaging that is open. Find the pack's own edges from its printing, not from how it is held. Turn the pack in your mind until the brand name reads upright, left to right. The edge above the letters is the top. The edge below them is the bottom. The edges at the start and at the end of the name are the sides. A pack that is tipped, sideways or upside down keeps these edges. Then say which of those edges the opening or tear is really on: top, side, bottom or corner. If the opening is at the end of the pack where the name begins or ends, that is a side, however the pack is tilted. "none" for a closed pack, and for a product that has no opening.
- contents_come_from: where anything leaving the pack is coming out, in the same terms. Empty if nothing is coming out.
- matches_facts: false if the opening, the way the contents leave, the way the product is held, worn, fitted or used, or its shape or size disagrees with the product facts (a large pack drawn small enough to pinch between 2 fingers, a single-serve pack drawn as a different kind of pack, a product drawn with a part it does not have, or used in a way it cannot be). True for a closed pack or an unused product drawn in the right shape. A tear that starts at a top corner and runs along the top edge is a top opening.
- problem: what is wrong and what it should be, in 1 sentence. Empty if nothing.

Step 2, every hand in Image 1. For each: whose it is, what it is doing, and whether a real hand could do it. possible is false for a missing or extra finger, a hand attached to nobody (a hand entering the frame from its edge is fine), a grip that could not hold the object, fingers passing through the product, or more hands than the people have. A hand that covers most of the label is a problem too.

Step 3, the scene. scene_possible is false only if a camera could not have photographed this: an object resting on nothing where the picture is meant to be a plain photograph, something the wrong size against a hand or the product, contents falling the wrong way. A deliberately stylised frame (the product floating on a plain colour, pieces frozen in mid-air in a studio shot, a designed graphic layout) is possible: that is a style, not a mistake. A picture of several moments (panels, a before and an after) is read moment by moment: where the note on what it was meant to show says the product is not in a moment and the product, its pack or its contents are drawn there, scene_possible is false and scene_problem names the moment.

Step 4, lessons_broken: each rule under "Rules from earlier feedback" that Image 1 visibly breaks. rule: the rule in a few words. what: what in the image breaks it. about: "product" where the rule is about the product itself (its shape, its size, its pack, how it is opened, held, worn or used), "other" for every other rule (what is never shown, people, the scene, the look). planned: true where what breaks the rule is a thing the plan asked for, as the next paragraph says; false otherwise. A rule is broken only by something you can see drawn, never by something implied: packs lying beside a closed pouch are not coming out of it. A rule the picture does not touch is not broken. The note on what the image was meant to show is there to help you recognise things; an image is never failed for differing from it. Do not list here anything you already reported under a pack or a hand: this list is for other rules only.

${PLANNED_THINGS_RULE}`,
        user: `Product facts:\n${req.truth}\n\nRules from earlier feedback:\n${req.rules || "(none)"}\n\n=== PER CALL ===\n\nWhat this image was meant to show:\n${req.scene}${plannedWordsLine(req.texts)}`,
        images: [req.file, req.hero],
    };
}
