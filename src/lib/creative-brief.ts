import { z } from "zod";
import { AWARENESS_INFO, AWARENESS_STAGES } from "./taxonomy";
export const BRIEF_GOALS = [
    { id: "new_customers", label: "Reach new customers", description: "Find a reason to care before asking for the sale." },
    { id: "product_launch", label: "Introduce a product", description: "Explain who it is for and what makes it useful." },
    { id: "promotion", label: "Promote an offer", description: "Build around an existing offer and its real terms." },
    { id: "improve", label: "Develop an existing idea", description: "Explore a different opening, buyer or reason to believe." },
] as const;
export const BriefSetup = z.object({
    goal: z.enum(["new_customers", "product_launch", "promotion", "improve"]),
    product_id: z.string().min(1, "Choose a product."),
    persona_id: z.string().default(""),
    offer_id: z.string().min(1, "Choose an offer."),
    medium: z.enum(["image", "video", "both"]),
    notes: z.string().trim().max(1600).default(""),
});
export type BriefSetup = z.infer<typeof BriefSetup>;
const line = z.string().trim().min(1).max(700);
export const BRIEF_LAYOUTS = ["Headline only", "Headline and subheadline", "Headline and benefits", "Testimonial", "Demonstration", "Story"] as const;
export const BriefVariant = z.object({
    label: z.enum(["A", "B", "C"]), sub_persona: line, emotion: line,
    awareness: z.enum(AWARENESS_STAGES), opener: line,
    layout: z.enum(BRIEF_LAYOUTS),
    tone: line, headline: z.string().trim().min(1).max(160),
    subheadline: z.string().trim().max(250), visual_direction: line,
});
export type BriefVariant = z.infer<typeof BriefVariant>;
export const BriefConcept = z.object({
    name: z.string().trim().min(3).max(120), persona_id: z.string().min(1),
    angle: z.string().trim().min(10).max(700), awareness: z.enum(AWARENESS_STAGES),
    blocking_belief: line, desired_belief: line, moment: line, rationale: line,
    theme_ids: z.array(z.string()).min(1).max(12), claim_ids: z.array(z.string()).min(1).max(6),
    variants: z.array(BriefVariant).length(3),
});
export type BriefConcept = z.infer<typeof BriefConcept>;
export const BriefPlan = z.object({ concepts: z.array(BriefConcept).length(3) });
export type BriefPlan = z.infer<typeof BriefPlan>;
export interface CreativeBrief {
    plan_id: string;
    concept_index: number;
    selected_variant: number | null;
    revision?: number;
    setup: BriefSetup;
    concept: BriefConcept;
    proof: {
        id: string;
        text: string;
        source: string;
    }[];
    basis: "research" | "preview";
}
export interface BriefEditChoices {
    products: {
        id: string;
        name: string;
        claim_ids: string[];
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    claims: {
        id: string;
        text: string;
        source: string;
    }[];
    themes: {
        id: string;
        label: string;
    }[];
}
export const briefFormats = (medium: BriefSetup["medium"]) => medium === "both" ? ["static_image", "ai_ugc"] as const : medium === "video" ? ["ai_ugc"] as const : ["static_image"] as const;
export function variantDifferences(a: BriefVariant, b: BriefVariant): string[] {
    const same = (x: string, y: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() === y.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    return [!same(a.sub_persona, b.sub_persona) && "Buyer", !same(a.emotion, b.emotion) && "Feeling", a.awareness !== b.awareness && "Awareness", !same(a.opener, b.opener) && "Opening"].filter((x): x is string => !!x);
}
export function variantProblems(variants: BriefVariant[]): string[] {
    const problems: string[] = [];
    if (new Set(variants.map((v) => v.label)).size !== 3)
        problems.push("Use one variant each for A, B and C.");
    variants.forEach((a, i) => variants.slice(i + 1).forEach((b) => {
        if (variantDifferences(a, b).length < 2)
            problems.push(`Variants ${a.label} and ${b.label} need differences in at least two of buyer, feeling, awareness or opening.`);
    }));
    return problems;
}
export function creativeBriefText(brief: CreativeBrief | null | undefined): string {
    if (!brief)
        return "";
    const c = brief.concept;
    const v = brief.selected_variant === null ? null : c.variants[brief.selected_variant];
    return [
        "Approved creative brief (direction, not new product evidence):",
        `Goal: ${BRIEF_GOALS.find((g) => g.id === brief.setup.goal)?.label}. Requested media: ${brief.setup.medium}.`,
        `What stops the buyer: ${c.blocking_belief}`, `What they should believe: ${c.desired_belief}`,
        `Their moment (creative hypothesis): ${c.moment}`, `Why this idea: ${c.rationale}`,
        `Supporting product evidence: ${brief.proof.map((p) => `${p.id}: ${p.text} (${p.source})`).join("; ")}`,
        "Basis: customer research and approved brand facts; performance has not been measured. Buyer beliefs and scenes are hypotheses, not verbatim customer quotes.",
        ...(v ? [`Variant ${v.label}: ${v.sub_persona}; feeling: ${v.emotion}; awareness: ${AWARENESS_INFO[v.awareness].label}.`, `Opening mechanism: ${v.opener}`, `Layout: ${v.layout}; tone: ${v.tone}.`, `On-design headline (${v.headline.split(/\s+/).length} words): ${v.headline}`, ...(v.subheadline ? [`Supporting line: ${v.subheadline}`] : []), `Visual direction: ${v.visual_direction}`, "Preserve this variant's buyer, argument and visual direction. Adapt its wording naturally to the selected output format; do not combine sibling variants."] : []),
        ...(brief.setup.notes ? [`Additional direction: ${brief.setup.notes}`] : []),
    ].join("\n");
}
