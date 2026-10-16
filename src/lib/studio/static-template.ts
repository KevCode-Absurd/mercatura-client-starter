import type { AuditItem, LibraryAnalysis, StudioItem, StudioItemPlan } from "@/db/schema";
import { onlySections } from "../llm/context";
import { skillFor } from "../skills/card";
export const STATIC_TEMPLATE_METHOD = "operator-creative/static-template-process";
export type StaticTemplateStage = "Plan" | "Words" | "Prompt" | "Review";
export function staticTemplateMethod(stage: StaticTemplateStage): string {
    return onlySections(skillFor(STATIC_TEMPLATE_METHOD, "focused"), new RegExp(`^${stage}$`, "i"));
}
export interface StaticTemplateInput {
    productId: string;
    item: Pick<StudioItem, "type" | "label" | "plan" | "stage" | "world" | "ref_id">;
    reference?: {
        id: string;
        fidelity: string;
        inspected?: boolean;
    } | null;
    look?: string;
    stage?: string;
    scripted?: boolean;
    freeLayout?: boolean;
    requirements?: readonly string[];
}
export const TEMPLATE_AUTHORITY = "Layout/look transfer only. SKU, facts, offers and customer quotes come from this product's evidence; missing proof requires a supported adaptation, never invention.";
export function staticTemplateContract(input: StaticTemplateInput, opts: {
    authorityApart?: boolean;
} = {}): string {
    const { item } = input;
    return JSON.stringify({
        basis: input.scripted ? "approved script" : input.reference ? input.reference.inspected === false ? `recorded reference ${input.reference.id}; swipe image not inspected in this step` : `chosen reference ${input.reference.id}, ${input.reference.fidelity}` : "format recipe; no external swipe image",
        layout: input.freeLayout ? "new form selected by planner" : item.type || item.label,
        ...(input.look || item.world ? { look: input.look || item.world } : {}),
        product_id: input.productId,
        ...(item.plan?.buyer ? { buyer: item.plan.buyer } : {}),
        ...(input.stage || item.stage || item.plan?.awareness ? { awareness: input.stage || item.stage || item.plan?.awareness } : {}),
        ...(item.plan ? { slots: (item.plan.text_elements ?? []).map((t) => ({ role: t.role, at: t.placement })) } : {}),
        ...(input.requirements?.length ? { needs: input.requirements } : {}),
        ...(opts.authorityApart ? {} : { authority: TEMPLATE_AUTHORITY }),
    });
}
export function staticTemplatePreflight(input: {
    analysis?: Pick<LibraryAnalysis, "needs" | "text_roles"> | null;
    type: string;
    customerQuotes: boolean;
    offers: boolean;
    earnedProof: boolean;
    singleProduct: boolean;
    index: number;
}): AuditItem[] {
    const needs = (input.analysis?.needs ?? []).join(" ");
    const roles = (input.analysis?.text_roles ?? []).map((t) => t.role).join(" ");
    const out: AuditItem[] = [];
    const warn = (message: string) => out.push({ check: "template_evidence", status: "warn", message, line_index: input.index });
    if (!input.customerQuotes && /\b(?:review|testimonial|quote)\b/i.test(`${needs} ${roles} ${input.type}`))
        warn("This layout calls for customer words, but no sourced customer quote was found. Use a brand-authored observation without a reviewer or quote marks, or supply a real review.");
    if (!input.offers && /\b(?:price|discount|offer|sale|deal|coupon)\b/i.test(`${needs} ${roles}`))
        warn("This template's price or offer slot lacks an applicable offer. Adapt it to a supported product proposition; do not inherit the template's discount, urgency or terms.");
    if (!input.earnedProof && /\b(?:certification|certified|award|press|expert|clinical|clinically)\b/i.test(needs))
        warn("This template calls for earned or expert proof that this product's evidence does not establish. Remove that proof device or supply its source.");
    if (input.singleProduct && /\b(?:multiple|different|three|3|several)\s+(?:products?|skus?|variants?|flavou?rs?)\b/i.test(needs))
        warn("This template calls for multiple products, but this brief is for one product. Repeat only the actual SKU or simplify the layout; do not invent variants.");
    return out;
}
export function staticFeedLines(copy?: Partial<NonNullable<StudioItemPlan["ad_copy"]>>): {
    where: string;
    text: string;
}[] {
    if (!copy)
        return [];
    const fields = [
        ["primary text", copy.primary_text], ["medium primary text", copy.more?.medium], ["long primary text", copy.more?.long],
        ["headline", copy.headline], ...(copy.more?.headlines ?? []).map((t, i) => [`headline variant ${i + 1}`, t]),
        ["description", copy.description], ["CTA", copy.cta],
    ];
    const byText = new Map<string, {
        where: string;
        text: string;
    }>();
    for (const [where, value] of fields) {
        if (!value?.trim())
            continue;
        const previous = byText.get(value);
        if (previous)
            previous.where += `; ${where}`;
        else
            byText.set(value, { where: where!, text: value });
    }
    return [...byText.values()];
}
