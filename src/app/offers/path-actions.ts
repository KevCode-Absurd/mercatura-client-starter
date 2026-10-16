"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { clearBriefCache } from "@/lib/brain/brief";
import { logChange } from "@/lib/brain/docs";
import { noteEdits } from "@/lib/hand-edits";
import { offerBook, type BrandOffer } from "@/lib/offers/book";
import { ADDON_IDS, FREQUENCIES, MAIN_MECHANICS, SLOTS, type OfferPath } from "@/lib/offers/path";
import { offerWordEdits, savePathOffer, writeOfferWords, type OfferWords } from "@/lib/offers/words";
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
const num = z.number().finite().min(0);
const Path = z.object({
    product_id: z.string().min(1, "Pick a product."),
    product_name: z.string().min(1).max(200),
    persona_id: z.string().nullable(),
    persona_name: z.string().max(120),
    objection: z.string().trim().max(300),
    proof: z.string().trim().max(400),
    audience: z.enum(["new", "returning", "all"]),
    mechanic: z.enum(MAIN_MECHANICS),
    addons: z.object(Object.fromEntries(ADDON_IDS.map((id) => [id, z.string().trim().max(300).optional()])) as Record<(typeof ADDON_IDS)[number], z.ZodOptional<z.ZodString>>),
    extra_value: num,
    qty: z.number().int().min(1).max(24),
    base: z.string().max(400),
    angle: z.string().trim().max(300),
    threshold: num.nullable(),
    frequency: z.enum(FREQUENCIES),
    numbers: z.object({ price: num.gt(0, "Enter the price of 1 unit."), unit_cost: num, shipping: z.array(num).max(6), fee_rate: num.max(0.3), units_before: num.max(24), units_after: num.max(24), discount: num.max(0.9), extras_cost: num, roas: num }),
    downstream: z.array(z.object({ slot: z.enum(SLOTS), item: z.string().trim().max(160), price: num, margin: num.max(1), take_rate: num.max(1), discount: num.max(1).optional() })).max(8),
});
export async function writeOfferWordsAction(input: OfferPath): Promise<Result<{
    words: OfferWords;
}>> {
    try {
        const path = Path.parse(input) as OfferPath;
        return { ok: true, words: await writeOfferWords(await activeBrandId(), path) };
    }
    catch (e) {
        return fail(e);
    }
}
const Words = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Give the offer a name.").max(80),
    page_line: z.string().trim().max(300),
    say: z.string().trim().max(400),
    why: z.string().trim().max(400),
    running: z.boolean(),
});
const Draft = z.object({ name: z.string().max(400), page_line: z.string().max(600), say: z.string().max(800) }).partial();
export async function savePathOfferAction(input: OfferPath, words: z.input<typeof Words>, draft?: z.input<typeof Draft> | null): Promise<Result<{
    offer: BrandOffer;
    book: BrandOffer[];
}>> {
    try {
        const path = Path.parse(input) as OfferPath;
        const w = Words.parse(words);
        const brandId = await activeBrandId();
        const offer = savePathOffer(brandId, path, w);
        const wrote = Draft.safeParse(draft ?? undefined);
        noteEdits(brandId, offer.id, offerWordEdits(wrote.success ? wrote.data : null, w));
        try {
            logChange(brandId, { type: "Offer", description: `Offer ${w.id ? "changed" : "added"}: ${offer.name}${w.running ? "" : " (not running yet)"}.` });
        }
        catch {
        }
        for (const p of ["/offers", "/builder", "/brand", "/concepts", "/personas"])
            revalidatePath(p);
        clearBriefCache();
        return { ok: true, offer, book: offerBook(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
