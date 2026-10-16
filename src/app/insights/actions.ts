"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { enqueue, queueStats } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { ensureGuardrails, setGuardrail } from "@/lib/scripts/guardrails";
import { adoptAngle, setAngleStatus } from "@/lib/angles/server";
import { mergeThemes, renameTheme, splitTheme, unlockTheme } from "@/lib/themes";
import { ANGLE_STATUSES } from "@/db/schema";
import { errorText } from "@/lib/plain-message";
const Id = z.string().min(1);
const Label = z.string().trim().min(1, "A theme needs a label").max(120);
const Summary = z.string().trim().max(400);
const Rename = z.object({ themeId: Id, label: Label, summary: Summary });
const Merge = z.object({ targetId: Id, sourceIds: z.array(Id).min(1, "Pick at least 1 theme to merge") });
const Split = z.object({ themeId: Id, insightIds: z.array(Id).min(1, "Pick at least 1 quote to split off"), label: Label, summary: Summary });
const Cluster = z.enum(["incremental", "full"]);
const Status = z.object({ themeId: Id, status: z.enum(ANGLE_STATUSES), notes: z.string().max(600).optional() });
const Adopt = z.object({ themeId: Id });
type Fail = {
    ok: false;
    error: string;
};
type Result = {
    ok: true;
} | Fail;
const bad = (e: z.ZodError): Fail => ({ ok: false, error: e.issues.map((i) => i.message).join("; ") });
function done(...extra: string[]) {
    revalidatePath("/insights");
    revalidatePath("/");
    for (const p of extra)
        revalidatePath(p, "layout");
}
export async function renameThemeAction(v: unknown): Promise<Result> {
    const p = Rename.safeParse(v);
    if (!p.success)
        return bad(p.error);
    try {
        renameTheme(await activeBrandId(), p.data.themeId, p.data.label, p.data.summary);
        done("/concepts", "/scripts");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function mergeThemesAction(v: unknown): Promise<Result> {
    const p = Merge.safeParse(v);
    if (!p.success)
        return bad(p.error);
    try {
        mergeThemes(await activeBrandId(), p.data.targetId, p.data.sourceIds);
        done("/concepts", "/scripts");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function splitThemeAction(v: unknown): Promise<{
    ok: true;
    id: string;
} | Fail> {
    const p = Split.safeParse(v);
    if (!p.success)
        return bad(p.error);
    try {
        const id = splitTheme(await activeBrandId(), p.data.themeId, p.data.insightIds, p.data.label, p.data.summary);
        done();
        return { ok: true, id };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function unlockThemeAction(themeId: unknown): Promise<Result> {
    const p = Id.safeParse(themeId);
    if (!p.success)
        return bad(p.error);
    unlockTheme(await activeBrandId(), p.data);
    done();
    return { ok: true };
}
export async function clusterAction(mode: unknown): Promise<Result> {
    const p = Cluster.safeParse(mode);
    if (!p.success)
        return bad(p.error);
    if (!llmEnabled())
        return { ok: false, error: "Mock mode: set LLM_MODE=live in .env (and restart) to cluster insights." };
    const brandId = await activeBrandId();
    const { cluster } = queueStats(brandId);
    if (cluster.queued + cluster.running > 0)
        return { ok: false, error: "Clustering is already running for this brand." };
    enqueue(brandId, "cluster", brandId, { mode: p.data });
    revalidatePath("/insights");
    return { ok: true };
}
const GuardrailInput = z.object({ applies: z.boolean(), rule: z.string().trim(), banned: z.array(z.string().trim().min(2)).max(12) });
export async function setGuardrailAction(themeId: string, guardrail: z.infer<typeof GuardrailInput> | null): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    try {
        setGuardrail(await activeBrandId(), themeId, guardrail ? GuardrailInput.parse(guardrail) : null);
        revalidatePath("/insights");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function writeGuardrailsAction(): Promise<{
    ok: true;
    written: number;
} | {
    ok: false;
    error: string;
}> {
    try {
        if (!llmEnabled())
            return { ok: false, error: "Needs live mode (LLM_MODE=live and an API key in .env)." };
        const written = await ensureGuardrails(await activeBrandId());
        revalidatePath("/insights");
        return { ok: true, written };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function setAngleStatusAction(v: unknown): Promise<Result> {
    const p = Status.safeParse(v);
    if (!p.success)
        return bad(p.error);
    try {
        setAngleStatus(await activeBrandId(), p.data.themeId, p.data.status, p.data.notes);
        done();
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function adoptAngleAction(v: unknown): Promise<{
    ok: true;
    id: string;
    name: string;
} | Fail> {
    const p = Adopt.safeParse(v);
    if (!p.success)
        return bad(p.error);
    try {
        const a = adoptAngle(await activeBrandId(), p.data.themeId);
        done("/builder");
        return { ok: true, ...a };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
