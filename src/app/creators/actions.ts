"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { errorText } from "@/lib/plain-message";
import { startDiscovery, controlDiscovery } from "@/lib/creator-discovery/service";
import { shortlistCreator } from "@/lib/creator-discovery/store";
import { DiscoveryInput } from "@/lib/creator-discovery/types";
type Result = {
    ok: true;
    id?: string;
} | {
    ok: false;
    error: string;
};
const fail = (error: unknown): Result => ({ ok: false, error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Check the search options." : errorText(error) });
const refresh = () => { revalidatePath("/creators"); revalidatePath("/organic"); };
export async function generateCreatorsAction(input: z.input<typeof DiscoveryInput>): Promise<Result> {
    try {
        const options = DiscoveryInput.parse(input);
        const id = startDiscovery(await activeBrandId(), options);
        refresh();
        return { ok: true, id };
    }
    catch (error) {
        return fail(error);
    }
}
export async function controlCreatorsAction(id: string, op: "pause" | "stop" | "resume"): Promise<Result> {
    try {
        controlDiscovery(await activeBrandId(), z.string().uuid().parse(id), z.enum(["pause", "stop", "resume"]).parse(op));
        refresh();
        return { ok: true };
    }
    catch (error) {
        return fail(error);
    }
}
export async function saveDiscoveredCreatorAction(runId: string, creatorId: string): Promise<Result> {
    try {
        const id = shortlistCreator(await activeBrandId(), z.string().uuid().parse(runId), z.string().min(1).max(100).parse(creatorId));
        refresh();
        return { ok: true, id };
    }
    catch (error) {
        return fail(error);
    }
}
