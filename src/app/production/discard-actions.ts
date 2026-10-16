"use server";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { discardJob, putBackJob, type Moved } from "@/lib/production/discard-store";
function revalidate() {
    revalidatePath("/production");
    revalidatePath("/");
}
export async function discardJobAction(id: string): Promise<Moved> {
    const res = discardJob(await activeBrandId(), id);
    if (res.ok)
        revalidate();
    return res;
}
export async function putBackJobAction(id: string): Promise<Moved> {
    const res = putBackJob(await activeBrandId(), id);
    if (res.ok)
        revalidate();
    return res;
}
