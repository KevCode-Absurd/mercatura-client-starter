"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { enqueue } from "@/lib/jobs/queue";
import { mediaUsage } from "@/lib/media/providers";
import { getRun, picturesFor } from "@/lib/studio/engine";
import { isBank } from "@/lib/studio/offer-bank";
import { setOfferLine } from "@/lib/studio/offer-bank-server";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const Line = z.string().trim().min(2, "Say the offer in a few words.").max(120, "Keep the offer line to 1 short line.");
export async function changeOfferLineAction(id: string, line: string): Promise<Result<{
    changed: number;
    pictures: number;
}>> {
    try {
        const text = Line.parse(line);
        const brandId = await activeBrandId();
        const run = getRun(id);
        if (!run || run.brand_id !== brandId)
            return { ok: false, error: "Set not found" };
        if (!isBank(run.notes))
            return { ok: false, error: "This set is not an offer ad bank." };
        const working = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.ref_id, id), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (working)
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        const would = run.items.filter((i) => i.plan?.text_elements.some((t) => t.role === "offer" && t.text !== text) && i.outputs.length);
        const need = picturesFor(run, would);
        const u = mediaUsage();
        if (need && u.images + need > u.imageCap)
            return { ok: false, error: `Changing the line on the pictures needs ${need} images and ${Math.max(0, u.imageCap - u.images)} are left under the cap. Raise the image cap in Settings.` };
        const { changed, pictured } = setOfferLine(id, text);
        if (!changed.length)
            return { ok: false, error: "No ad in this set has an offer line that differs from that." };
        if (pictured.length)
            enqueue(run.brand_id, "studio", id, { op: "render", itemIds: pictured, keep: true, force: true });
        revalidatePath(`/studio/${id}`);
        return { ok: true, changed: changed.length, pictures: pictured.length ? need : 0 };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "That line cannot be used.") : errorText(e) };
    }
}
