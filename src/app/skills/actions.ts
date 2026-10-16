"use server";
import { revalidatePath } from "next/cache";
import { canChangeSkills, whoami } from "@/lib/admin";
import { restoreEdit } from "@/lib/inspect/edits";
import { decideProposal, proposeTighten } from "@/lib/skills/proposals";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof Error ? e.message : String(e) });
const NOT_ADMIN = "Only an admin can change the method.";
const fresh = () => {
    revalidatePath("/skills");
    revalidatePath("/lessons");
};
export async function decideAction(id: string, decision: "accept" | "reject"): Promise<Result<{
    status: string;
    editId: string | null;
}>> {
    try {
        if (!canChangeSkills())
            return { ok: false, error: NOT_ADMIN };
        const p = decideProposal(id, decision, whoami());
        fresh();
        return { ok: true, status: p.status, editId: p.edit_id };
    }
    catch (e) {
        return fail(e);
    }
}
export async function tightenAction(file: string): Promise<Result<{
    id: string;
    summary: string;
}>> {
    try {
        if (!canChangeSkills())
            return { ok: false, error: NOT_ADMIN };
        const p = await proposeTighten(file);
        fresh();
        return { ok: true, id: p.id, summary: p.summary };
    }
    catch (e) {
        return fail(e);
    }
}
export async function putBackAction(editId: string): Promise<Result<{
    editId: string | null;
}>> {
    try {
        if (!canChangeSkills())
            return { ok: false, error: NOT_ADMIN };
        const r = restoreEdit(editId, whoami());
        fresh();
        return { ok: true, editId: r.edit?.id ?? null };
    }
    catch (e) {
        return fail(e);
    }
}
