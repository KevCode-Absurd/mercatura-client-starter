"use server";
import { and, eq, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { getAvatar, saveAvatar, avatarFile } from "@/lib/avatars/store";
import { adultProblem } from "@/lib/avatars/types";
import { enqueue } from "@/lib/jobs/queue";
import { mediaLive, mediaUsage } from "@/lib/media/providers";
const active = (brandId: string) => db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "personas"), inArray(schema.jobs.status, ["queued", "running"]))).get();
export async function creatorAvatarStatusAction(id: string) {
    const brandId = await activeBrandId();
    const avatar = getAvatar(brandId, id);
    const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "personas"))).orderBy(desc(schema.jobs.updated_at)).get();
    const mine = (job?.payload as {
        ids?: string[];
    } | undefined)?.ids?.includes(id);
    return { avatar, busy: !!active(brandId), error: mine && job?.status === "failed" ? job.error : null };
}
export async function enhanceCreatorAvatarAction(id: string, input: {
    notes: string;
    hyperreal: boolean;
}) {
    try {
        const opts = z.object({ notes: z.string().trim().max(600), hyperreal: z.boolean() }).parse(input);
        const brandId = await activeBrandId();
        const avatar = getAvatar(brandId, id);
        if (!avatar?.portrait || !avatarFile(avatar.portrait))
            throw new Error("Choose an avatar with a saved picture.");
        if (avatar.kind !== "person" && opts.hyperreal)
            throw new Error("Hyper-realistic AI UGC is for a photographic adult avatar. Keep a stylized character in its chosen style.");
        const child = adultProblem({ ...avatar, ...(avatar.presenter ? { presenter: { ...avatar.presenter, features: `${avatar.presenter.features ?? ""} ${opts.notes}` } } : { character: `${avatar.character ?? ""} ${opts.notes}` }) });
        if (child)
            throw new Error(child);
        if (!mediaLive())
            throw new Error("Avatar enhancement requires live image generation. You can use the current avatar without it.");
        if (active(brandId))
            throw new Error("Another avatar or persona picture is running. Wait for it to finish.");
        const usage = mediaUsage();
        if (usage.images >= usage.imageCap)
            throw new Error("The image generation cap has been reached.");
        enqueue(brandId, "personas", brandId, { op: "avatar", ids: [id], enhancement: { ...opts, keep: true, sourcePortrait: avatar.portrait } });
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: (e as Error).message };
    }
}
export async function chooseCreatorPortraitAction(id: string, portrait: string) {
    try {
        const brandId = await activeBrandId();
        const avatar = getAvatar(brandId, id);
        if (!avatar || !(avatar.portrait_history ?? []).includes(portrait) || !avatarFile(portrait))
            throw new Error("This earlier portrait is not available for that avatar.");
        if (active(brandId))
            throw new Error("Wait for the current picture generation to finish.");
        const selected = saveAvatar(brandId, { id, name: avatar.name, portrait, portrait_history: [...new Set([...(avatar.portrait_history ?? []), ...(avatar.portrait ? [avatar.portrait] : [])])].filter((p) => p !== portrait).slice(-30), sheet: null, panels: [], styled: {} });
        revalidatePath("/studio/creator");
        revalidatePath("/personas");
        return { ok: true as const, avatar: selected };
    }
    catch (e) {
        return { ok: false as const, error: (e as Error).message };
    }
}
