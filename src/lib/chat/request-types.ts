import type { AskIntent, AskKind, AskQuestion, AskTags } from "@/db/schema";
import { galleryFormat } from "../format-gallery";
import { KIND_INFO, adType } from "../library/taxonomy";
import { worldOf } from "../studio/worlds";
export type { AskIntent, AskKind, AskQuestion, AskTags };
export interface AskContext {
    brandName: string;
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
        age: string;
        gender: string;
        summary: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    concepts: {
        id: string;
        name: string;
        persona_id: string;
        angle: string;
    }[];
    references: {
        id: string;
        title: string;
        kind: "image" | "video";
    }[];
}
export const ASK_KINDS: Record<Exclude<AskKind, "unknown">, {
    label: string;
    one: string;
    many: string;
    library: "ad" | "pdp" | "photoshoot" | null;
    max: number;
    usual: number;
    verb: string;
}> = {
    image_ads: { label: "Image ads", one: "image ad", many: "image ads", library: "ad", max: 12, usual: 6, verb: "Make them" },
    product_page: { label: "Product page images", one: "product page image", many: "product page images", library: "pdp", max: 12, usual: 7, verb: "Make them" },
    photoshoot: { label: "Photoshoot", one: "photo", many: "photos", library: "photoshoot", max: 12, usual: 6, verb: "Make them" },
    scripts: { label: "Scripts", one: "script", many: "scripts", library: null, max: 10, usual: 3, verb: "Write them" },
};
export const isImageKind = (k: AskKind): k is "image_ads" | "product_page" | "photoshoot" => k === "image_ads" || k === "product_page" || k === "photoshoot";
export const LENGTH_WORDS: Record<NonNullable<AskIntent["length"]>, string> = { "15s": "15 seconds", "30s": "30 seconds", "60s": "60 seconds", "2-3m": "2 to 3 minutes", "5-10m": "5 to 10 minutes", "10m": "10 minutes" };
export const REFERENCE_WORDS: Record<NonNullable<AskIntent["reference_mode"]>, {
    label: string;
    said: string;
}> = {
    exact: { label: "The same ad", said: "kept as it is, in a new format" },
    structure: { label: "Its structure", said: "keeping its structure" },
    principles: { label: "Loosely", said: "followed loosely" },
};
export const aspectsFor = (k: AskKind) => (isImageKind(k) ? KIND_INFO[ASK_KINDS[k].library!] : null);
export const emptyTags = (): AskTags => ({ personas: [], products: [], offers: [], references: [] });
const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export function planSentence(i: AskIntent, c: AskContext): string {
    if (i.kind === "unknown")
        return "";
    const info = ASK_KINDS[i.kind];
    const product = c.products.find((p) => p.id === i.product_id)?.name;
    const buyers = c.personas.filter((p) => i.persona_ids.includes(p.id)).map((p) => p.name);
    const offer = c.offers.find((o) => o.id === i.offer_id)?.name;
    const ref = c.references.find((r) => r.id === i.reference_id);
    const what = `${i.count} ${i.count === 1 ? info.one : info.many}`;
    const who = buyers.length ? `, written for ${list(buyers)}${i.audience ? ` (${i.audience})` : ""}` : i.audience ? `, written for ${i.audience}` : "";
    if (i.kind === "scripts") {
        const concept = c.concepts.find((x) => x.id === i.concept_id);
        const from = concept ? `, from the concept "${concept.name}"` : ", from a new concept made of what you said";
        const follows = ref ? ` Built on the reference "${ref.title}", ${REFERENCE_WORDS[i.reference_mode ?? "structure"].said}.` : "";
        return `${what}${i.length ? `${i.count === 1 ? "" : ", each"} about ${LENGTH_WORDS[i.length]} long` : `${i.count === 1 ? "" : ", each"} as long as its story needs`}${who}${from}${offer && !concept ? `, on the offer ${offer}` : ""}.${follows}`;
    }
    const sizes = i.aspects.length ? `, in ${list(i.aspects)}` : "";
    const follows = ref ? ` The reference "${ref.title}" is given to the planner as direction.` : "";
    const look = i.kind === "image_ads" ? worldOf(i.look) : undefined;
    const made = galleryFormat(i.format_id ?? "");
    const layout = i.kind === "image_ads" && i.layout_type ? adType(i.layout_type) : undefined;
    return `${what}${product ? ` for ${product}` : ""}${who}${offer ? `, stating the offer ${offer}` : ""}${sizes}${look ? `, all in 1 look: ${look.label.toLowerCase()}` : ""}${layout ? `, all of 1 kind: ${layout.label.toLowerCase()}` : ""}.${made ? ` Made as: ${made.label.toLowerCase()}.` : ""}${follows}`;
}
export function askEstimate(i: AskIntent): number {
    if (i.kind === "unknown")
        return 0;
    if (i.kind === "scripts")
        return Math.round(i.count * 4.3) / 100;
    const perImage = i.kind === "photoshoot" ? 0.05 : 0.15;
    return Math.round(i.count * (0.02 + perImage * Math.max(1, i.aspects.length)) * 100) / 100;
}
