import fs from "node:fs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AdReferenceRow } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { adReferenceFile } from "../studio/ad-refs";
import { adAsText } from "./hooks";
import { AS_REFERENCE, FROM_IDEA, referenceFormats, type FormatPick, type RefFormat, type RefFormats, type RefReading } from "./reading-types";
export * from "./reading-types";
const Part = z.object({ at: z.string().default(""), part: z.string().min(2), why: z.string().default("") });
const Read = z.object({
    summary: z.string().default(""),
    best: z.array(Part).max(6).default([]),
    weak: z.array(Part).max(4).default([]),
    formats: z.array(z.object({ id: z.string(), why: z.string().default("") })).max(6).default([]),
});
const rowOf = (referenceId: string) => db.select().from(schema.adReferences).where(eq(schema.adReferences.id, referenceId)).get();
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");
type Ref = Pick<AdReferenceRow, "kind" | "media_root" | "media_path" | "analysis" | "tags" | "categories">;
export const pictureHere = (ref: Pick<AdReferenceRow, "kind" | "media_root" | "media_path">): boolean => {
    const file = ref.kind === "image" ? adReferenceFile(ref) : null;
    return !!file && fs.existsSync(file);
};
export const formatsOf = (ref: Pick<AdReferenceRow, "kind" | "media_root" | "media_path">): RefFormat[] => referenceFormats({ kind: ref.kind, pictureHere: pictureHere(ref) });
export const storedReading = (ref: Pick<AdReferenceRow, "analysis"> | undefined): RefReading | null => {
    const r = (ref?.analysis as {
        reading?: RefReading;
    } | null | undefined)?.reading;
    return r?.best?.length ? r : null;
};
export const storedFormats = (ref: Pick<AdReferenceRow, "analysis"> | undefined, brandId: string): RefFormats | null => {
    const f = (ref?.analysis as {
        formats?: Record<string, RefFormats>;
    } | null | undefined)?.formats?.[brandId];
    return f?.picks?.length ? f : null;
};
const NEAREST: [
    RegExp,
    string,
    string
][] = [
    [/podcast|interview|conversation/, "podcast", "It is 2 people talking, and so is this format."],
    [/clay|stop[- ]motion/, "claymation", "It is a clay story, and so is this format."],
    [/comic|illustrat|cartoon|anim/, "comic", "It is drawn, and this format is the nearest drawn one."],
    [/demo|unbox|asmr|satisfying|how[- ]it[- ]works/, "satisfying", "It shows the product doing 1 thing, and this format is built on that."],
    [/explainer|3d|cgi|mechanism/, "explainer", "It explains how something works, and so does this format."],
];
export function ruleFormats(formats: RefFormat[], ref: Pick<Ref, "kind" | "tags" | "categories">): FormatPick[] {
    const said = [...(ref.tags?.format ?? []), ...(ref.tags?.style ?? []), ...(ref.tags?.approach ?? []), ...(ref.categories ?? [])].join(" ").toLowerCase();
    const has = (id: string) => formats.some((f) => f.id === id);
    const still = has(AS_REFERENCE) ? AS_REFERENCE : FROM_IDEA;
    const near = NEAREST.find(([re, id]) => re.test(said) && has(id));
    const picks: FormatPick[] = [
        ...(ref.kind === "image" ? [{ id: still, why: "It is a still ad, so the nearest version is a still." }] : []),
        ...(near ? [{ id: near[1], why: near[2] }] : []),
        { id: "ugc", why: "A person saying it to camera suits most ads, and is the default video." },
        ...(ref.kind === "image" ? [] : [{ id: still, why: "The same idea as 1 still, for the feed." }]),
        { id: "carousel", why: "An argument with steps can be read card by card." },
    ];
    return picks.filter((p, i, all) => has(p.id) && all.findIndex((x) => x.id === p.id) === i).slice(0, 4);
}
export function whyNoReading(ref: Pick<AdReferenceRow, "analyzed"> | undefined): string {
    if (!ref)
        return "That ad was not found.";
    if (!ref.analyzed)
        return "This ad has to be analysed first, so its words and its pictures are known.";
    return "";
}
function save(referenceId: string, brandId: string, reading: RefReading | null, formats: RefFormats) {
    const row = rowOf(referenceId);
    if (!row)
        return;
    const a = (row.analysis ?? {}) as Record<string, unknown> & {
        formats?: Record<string, RefFormats>;
    };
    db.update(schema.adReferences).set({ analysis: { ...a, ...(reading ? { reading } : {}), formats: { ...(a.formats ?? {}), [brandId]: formats } } }).where(eq(schema.adReferences.id, referenceId)).run();
}
export async function readReference(brandId: string, referenceId: string): Promise<{
    reading: RefReading | null;
    formats: RefFormats;
}> {
    const ref = rowOf(referenceId);
    const why = whyNoReading(ref);
    if (why || !ref)
        throw new Error(why);
    const formats = formatsOf(ref);
    const at = new Date().toISOString();
    if (!llmEnabled()) {
        const picked: RefFormats = { at, picks: ruleFormats(formats, ref) };
        save(referenceId, brandId, null, picked);
        return { reading: storedReading(ref), formats: picked };
    }
    const brand = loadBrandBrain(brandId);
    const a = (ref.analysis ?? {}) as Record<string, unknown>;
    const ad = adAsText(ref.analysis);
    const p = renderPrompt("reference-reading", {
        brand: [`${brand.brand.name}: ${brand.brand.category}. ${brand.brand.one_liner}`, `It sells: ${brand.products.map((x) => `${x.name} (${x.format})`).slice(0, 12).join("; ")}`, `Its buyers: ${brand.personas.map((x) => x.name).slice(0, 10).join("; ") || "not recorded"}`].join("\n"),
        kind: ref.kind === "video" ? "a video ad" : "an image ad",
        length: ref.kind === "video" && ref.duration ? `${Math.round(ref.duration)} seconds` : "a single image",
        stage: ref.awareness?.stage?.replace(/-/g, " ") || "not known",
        mechanism: clip(a.mechanism, 1200) || "(not noted)",
        principles: clip(a.transferable_principles, 1200) || "(not noted)",
        transcript: ad.transcript.slice(0, 9000) || "(no words are spoken)",
        timeline: ad.timeline.slice(0, 7000) || clip(a.observations, 2500) || "(not noted)",
        copy: clip(a.readable_copy, 1500) || "(none)",
        formats: formats.map((f) => `- ${f.id} | ${f.medium === "video" ? "video" : "picture"} | ${f.label}: ${f.when}`).join("\n"),
    });
    const out = await structuredJson({ brandId, task: "reference_reading", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: Read, effort: "low", maxTokens: 3000, refType: "reference", refId: referenceId });
    const part = (x: z.infer<typeof Part>) => ({ at: x.at.trim().slice(0, 40), part: x.part.trim().slice(0, 240), why: x.why.trim().slice(0, 320) });
    const had = storedReading(ref);
    const reading: RefReading = had ?? { at, model: env.MODEL_REFERENCE, summary: out.summary.trim().slice(0, 500), best: out.best.slice(0, 5).map(part), weak: out.weak.slice(0, 3).map(part) };
    const named = out.formats.filter((f, i, all) => formats.some((x) => x.id === f.id) && all.findIndex((x) => x.id === f.id) === i).map((f) => ({ id: f.id, why: f.why.trim().slice(0, 240) }));
    const picks = [...named, ...ruleFormats(formats, ref).filter((r) => !named.some((n) => n.id === r.id))].slice(0, 4);
    const picked: RefFormats = { at, picks };
    save(referenceId, brandId, had ? null : reading, picked);
    return { reading, formats: picked };
}
