"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { clearBriefCache } from "@/lib/brain/brief";
import { logChange } from "@/lib/brain/docs";
import { offerBook, removeBrandOffer, saveBrandOffer, type BrandOffer } from "@/lib/offers/book";
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
const touch = () => {
    for (const p of ["/offers", "/builder", "/brand", "/concepts", "/personas"])
        revalidatePath(p);
    clearBriefCache();
};
export async function offerBookAction(): Promise<Result<{
    book: BrandOffer[];
}>> {
    try {
        return { ok: true, book: offerBook(await activeBrandId()) };
    }
    catch (e) {
        return fail(e);
    }
}
const Save = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Give the offer a name.").max(140),
    price: z.number().finite().min(0, "Give the offer a price (0 for a free gift)."),
    terms: z.string().trim().max(600),
    say: z.string().trim().max(400),
    running: z.boolean(),
});
export async function saveInUseOfferAction(input: z.input<typeof Save>): Promise<Result<{
    book: BrandOffer[];
}>> {
    try {
        const o = Save.parse(input);
        const brandId = await activeBrandId();
        saveBrandOffer(brandId, o);
        try {
            logChange(brandId, { type: "Offer", description: `Offer ${o.id ? "changed" : "added"}: ${o.name}.` });
        }
        catch {
        }
        touch();
        return { ok: true, book: offerBook(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function removeInUseOfferAction(id: string): Promise<Result<{
    book: BrandOffer[];
}>> {
    try {
        const brandId = await activeBrandId();
        removeBrandOffer(brandId, id);
        touch();
        return { ok: true, book: offerBook(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
