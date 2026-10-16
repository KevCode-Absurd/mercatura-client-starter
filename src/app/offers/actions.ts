"use server";
import { noteFields } from "@/lib/hand-edits";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { clearBriefCache } from "@/lib/brain/brief";
import { logChange } from "@/lib/brain/docs";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { getIndustry, loadEconomics, loadIndustries, saveEconomics } from "@/lib/offers/data";
import type { Economics } from "@/lib/offers/economics";
import { deleteOffer, freshOfferId, getOffer, listOffers, putInUse, retireOffer, saveOffer } from "@/lib/offers/store";
import { ADD_KINDS, AUDIENCES, MECHANICS, PLACES, type Industry, type OfferDesign } from "@/lib/offers/types";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the form.") : errorText(e) });
const jobs = (brandId: string, status: ("queued" | "running" | "failed")[]) => db.select({ payload: schema.jobs.payload, error: schema.jobs.error, at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "offers"), eq(schema.jobs.ref_id, brandId), inArray(schema.jobs.status, status))).all();
const touch = () => {
    revalidatePath("/offers");
    revalidatePath("/brand");
    revalidatePath("/concepts");
};
export interface OffersStatus {
    offers: OfferDesign[];
    busy: string | null;
    lastError: string | null;
    industries: Industry[];
}
export async function offersStatusAction(): Promise<Result<OffersStatus>> {
    try {
        const brandId = await activeBrandId();
        const live = jobs(brandId, ["queued", "running"])[0];
        const p = (live?.payload ?? {}) as {
            op?: string;
            industry?: string;
        };
        const failed = jobs(brandId, ["failed"]).sort((a, b) => b.at.localeCompare(a.at))[0];
        return { ok: true, offers: listOffers(brandId), busy: live ? (p.op === "research" ? `Researching ${getIndustry(p.industry ?? "")?.name.toLowerCase() ?? "an industry"} on the web` : p.industry ? `Designing offers borrowed from ${getIndustry(p.industry)?.name.toLowerCase() ?? "another industry"}` : "Designing offers") : null, lastError: failed?.error ?? null, industries: loadIndustries().industries };
    }
    catch (e) {
        return fail(e);
    }
}
const start = (brandId: string, payload: Record<string, unknown>): Result => {
    if (jobs(brandId, ["queued", "running"]).length)
        return { ok: false, error: "Offers are being worked on. Wait for it to finish." };
    db.delete(schema.jobs).where(and(eq(schema.jobs.kind, "offers"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).run();
    enqueue(brandId, "offers", brandId, payload);
    return { ok: true };
};
const Build = z.object({ mechanics: z.array(z.enum(MECHANICS)).max(7).default([]), count: z.number().int().min(1).max(8), notes: z.string().max(600).optional(), industry: z.string().max(40).optional() });
export async function buildOffersAction(input: z.input<typeof Build>): Promise<Result> {
    try {
        const b = Build.parse(input);
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Designing offers needs live mode. In mock mode, write one by hand." };
        if (b.industry && !getIndustry(b.industry))
            return { ok: false, error: "That industry is not in the list." };
        return start(brandId, { op: "build", ...b });
    }
    catch (e) {
        return fail(e);
    }
}
export async function researchIndustryAction(industry: string): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Researching an industry needs live mode." };
        if (!getIndustry(industry))
            return { ok: false, error: "That industry is not in the list." };
        return start(brandId, { op: "research", industry });
    }
    catch (e) {
        return fail(e);
    }
}
const money = z.number().finite().min(0);
const Save = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Give the offer a name.").max(70),
    mechanic: z.enum(MECHANICS),
    audience: z.enum(AUDIENCES),
    product_id: z.string().min(1, "Pick a product."),
    base_offer_id: z.string().min(1, "Pick the price point it is built on."),
    persona_id: z.string().nullable(),
    headline: z.string().trim().min(4, "State the offer in 1 line.").max(140),
    terms: z.string().trim().min(4, "Say what the customer gets and pays.").max(500),
    positioning: z.string().trim().max(400),
    units: z.number().int().min(1).max(24),
    discount: z.number().min(0).max(0.7),
    subscription: z.boolean(),
    adds: z.array(z.object({ kind: z.enum(ADD_KINDS), name: z.string().trim().min(2).max(120), cost: money, value: money })).max(4),
    risk_reversal: z.string().trim().max(240),
    urgency: z.string().trim().max(240),
    tiers: z.array(z.object({ at: money, get: z.string().trim().min(2).max(160) })).max(4),
    addon: z.object({ place: z.enum(PLACES), item: z.string().trim().min(2).max(160), price: money, margin: z.number().min(0).max(1), take_rate: z.number().min(0).max(1) }).nullable(),
    when: z.string().trim().max(80),
    why: z.string().trim().max(400),
    test: z.string().trim().max(300),
    needs: z.string().trim().max(300),
});
export async function saveOfferAction(input: z.input<typeof Save>): Promise<Result<{
    offer: OfferDesign;
}>> {
    try {
        const o = Save.parse(input);
        const brandId = await activeBrandId();
        const was = o.id ? getOffer(brandId, o.id) : undefined;
        if (o.id && !was)
            return { ok: false, error: "Offer not found." };
        if (was && was.source !== "hand")
            noteFields(brandId, was.id, "offer", was, o);
        const offer = saveOffer(brandId, { ...(was ?? { new_buyer: null, improves: null, theme_ids: [], borrowed: null, source: "hand" as const, status: "draft" as const }), ...o, when: o.when || "evergreen", id: was?.id ?? freshOfferId(brandId, o.name) });
        touch();
        return { ok: true, offer };
    }
    catch (e) {
        return fail(e);
    }
}
function noteChange(brandId: string, type: string, description: string) {
    try {
        logChange(brandId, { type, description });
        clearBriefCache();
    }
    catch {
    }
}
export async function putOfferInUseAction(id: string): Promise<Result<{
    offer: OfferDesign;
    did: string[];
}>> {
    try {
        const brandId = await activeBrandId();
        const res = putInUse(brandId, id);
        noteChange(brandId, "Offer", `Offer put in use: ${res.offer.name}.`);
        touch();
        revalidatePath("/personas");
        return { ok: true, ...res };
    }
    catch (e) {
        return fail(e);
    }
}
export async function retireOfferAction(id: string): Promise<Result<{
    offer: OfferDesign;
}>> {
    try {
        const brandId = await activeBrandId();
        const offer = retireOffer(brandId, id);
        noteChange(brandId, "Offer", `Offer taken out of use: ${offer.name}. Do not state it.`);
        touch();
        return { ok: true, offer };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteOfferAction(id: string): Promise<Result> {
    try {
        deleteOffer(await activeBrandId(), id);
        touch();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const Numbers = z.object({
    products: z.array(z.object({ product_id: z.string(), unit_cost: money, cycle_days: z.number().positive().optional() })).min(1),
    shipping: z.array(money).min(1).max(6),
    fee_rate: z.number().min(0).max(0.3),
    roas: z.number().positive("Enter the return on ad spend the brand runs at."),
});
export async function saveEconomicsAction(input: z.input<typeof Numbers>): Promise<Result<{
    economics: Economics;
}>> {
    try {
        const n = Numbers.parse(input);
        const brandId = await activeBrandId();
        const was = loadEconomics(brandId);
        const economics = saveEconomics(brandId, { ...n, products: n.products.map((p) => ({ ...p, cycle_days: p.cycle_days ?? was?.products.find((x) => x.product_id === p.product_id)?.cycle_days })) }, { entered: true });
        touch();
        return { ok: true, economics };
    }
    catch (e) {
        return fail(e);
    }
}
