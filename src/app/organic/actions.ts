"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { startMake } from "@/lib/make";
import { BRIEF_KINDS, DEALS, DISCLOSURE, PARTNERSHIP, RIGHTS } from "@/lib/organic/creators";
import { IDEA_STATUSES } from "@/lib/organic/ideas";
import { deleteCreator, noteForIdea, saveCreator, seedingBriefFor, setHandle, setIdea } from "@/lib/organic/store";
import { arriveHref } from "@/lib/production/arrive";
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
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what was entered.") : errorText(e) });
const done = () => revalidatePath("/organic");
const Brief = z.object({ ideaId: z.string(), productId: z.string().min(1, "Pick a product."), personaId: z.string().nullable() });
export async function writeIdeaBriefAction(input: z.input<typeof Brief>): Promise<Result<{
    href: string;
    said: string;
}>> {
    try {
        const p = Brief.parse(input);
        const brandId = await activeBrandId();
        const made = startMake(brandId, { formatId: "brief-founder", productId: p.productId, personaId: p.personaId, offerId: null, conceptId: null, brief: noteForIdea(p.ideaId), length: "60s" });
        const href = arriveHref(made, "brief-founder", Date.now());
        setIdea(brandId, p.ideaId, { status: "briefed", href });
        done();
        revalidatePath("/production");
        revalidatePath("/scripts");
        return { ok: true, href, said: made.said };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setIdeaStatusAction(ideaId: string, status: string): Promise<Result> {
    try {
        setIdea(await activeBrandId(), ideaId, { status: z.enum(IDEA_STATUSES).parse(status) });
        done();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));
const CreatorIn = z.object({
    id: z.string().optional(),
    handle: z.string().trim().min(2, "Give the creator's handle.").max(120),
    deal: z.enum(DEALS).optional(),
    sent: day.optional(),
    posted: z.boolean().optional(),
    views: z.number().min(0).max(1e10).optional(),
    avg_views: z.number().min(0).max(1e10).optional(),
    rights: z.enum(RIGHTS).optional(),
    rights_until: day.optional(),
    partnership: z.enum(PARTNERSHIP).optional(),
    note: z.string().max(400).optional(),
});
export async function saveCreatorAction(input: z.input<typeof CreatorIn>): Promise<Result> {
    try {
        saveCreator(await activeBrandId(), CreatorIn.parse(input));
        done();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteCreatorAction(id: string): Promise<Result> {
    try {
        deleteCreator(await activeBrandId(), id);
        done();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setHandleAction(handle: string): Promise<Result> {
    try {
        setHandle(await activeBrandId(), z.string().max(120).parse(handle));
        done();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function seedingBriefAction(productId: string | null, deal: string): Promise<Result<{
    text: string;
}>> {
    try {
        return { ok: true, text: seedingBriefFor(await activeBrandId(), productId, z.enum(DEALS).parse(deal)) };
    }
    catch (e) {
        return fail(e);
    }
}
const CreatorBrief = z.object({ kind: z.enum(BRIEF_KINDS.map((k) => k.id) as [
        string,
        ...string[]
    ]), productId: z.string().min(1, "Pick a product."), personaId: z.string().nullable(), deal: z.enum(DEALS) });
export async function writeCreatorBriefAction(input: z.input<typeof CreatorBrief>): Promise<Result<{
    href: string;
    said: string;
}>> {
    try {
        const p = CreatorBrief.parse(input);
        const kind = BRIEF_KINDS.find((k) => k.id === p.kind)!;
        const made = startMake(await activeBrandId(), { formatId: "brief-ugc", productId: p.productId, personaId: p.personaId, offerId: null, conceptId: null, brief: `${kind.note} In the brief, as a thing to deliver: ${DISCLOSURE[p.deal]}`, length: "30s" });
        revalidatePath("/production");
        return { ok: true, href: arriveHref(made, "brief-ugc", Date.now()), said: made.said };
    }
    catch (e) {
        return fail(e);
    }
}
