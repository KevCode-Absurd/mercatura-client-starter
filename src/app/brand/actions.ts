"use server";
import { saveBrandNotes, saveSiteAsMarkdown } from "@/lib/brand-onboard";
import { revalidatePath } from "next/cache";
import { activeBrand } from "@/lib/brand-context";
import { brandBrainPath, writeBrandBrainFile } from "@/lib/brand-brain";
import { convertBrandBrain } from "@/lib/brand-convert";
import { builderGaps, ensureAngles } from "@/lib/builder/starter";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { scanBrandLook } from "@/lib/brand-look";
import { approveFound, editFound, scanClaimSources, setFoundStatus } from "@/lib/claim-sources";
import { approveWaiting } from "@/lib/claims-through";
import { removePerson, updatePerson } from "@/lib/people";
import { reopenConflict, settleConflict } from "@/lib/claim-conflicts";
import { buildVoiceCard, saveVoiceCard, type VoiceCard } from "@/lib/voice-card";
import { errorText } from "@/lib/plain-message";
export async function buildVoiceCardAction(): Promise<{
    ok: true;
    card: VoiceCard;
    sources: string[];
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        const res = await buildVoiceCard(row.id);
        revalidatePath("/", "layout");
        return { ok: true, ...res };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function saveVoiceCardAction(card: {
    sound: string[];
    examples: string[];
}): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        saveVoiceCard(row.id, card);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function saveBrandBrainAction(json: string): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    }
    catch (e) {
        return { ok: false, error: `Not valid JSON: ${(e as Error).message}` };
    }
    try {
        const row = await activeBrand();
        writeBrandBrainFile(brandBrainPath(row.dir), parsed);
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
    revalidatePath("/", "layout");
    return { ok: true };
}
export async function convertBrandBrainAction(): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        await convertBrandBrain(row.id);
        ensureAngles(row.id);
        if (llmEnabled() && builderGaps(row.id).any)
            enqueue(row.id, "personas", `starter:${row.id}`, { op: "starter", offers: true });
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
    revalidatePath("/", "layout");
    return { ok: true };
}
export async function scanBrandLookAction(url: string): Promise<{
    ok: true;
    warnings: string[];
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        const res = await scanBrandLook(row.id, url.trim());
        revalidatePath("/", "layout");
        return { ok: true, warnings: res.warnings };
    }
    catch (e) {
        const msg = (e as Error).message;
        return { ok: false, error: /ERR_NAME_NOT_RESOLVED|ENOTFOUND|net::/i.test(msg) ? "That website couldn't be reached. Check the address." : /Invalid URL/i.test(msg) ? "That doesn't look like a website address." : msg.slice(0, 300) };
    }
}
type Done = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export async function scanClaimSourcesAction(url: string): Promise<{
    ok: true;
    pages: number;
    ads: number;
    fresh: number;
    used: number;
    waiting: number;
    warnings: string[];
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        const res = await scanClaimSources(row.id, url);
        const now = approveWaiting(row.id);
        revalidatePath("/", "layout");
        return { ok: true, pages: res.pages, ads: res.ads, fresh: res.fresh, ...now, warnings: res.warnings };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function approveFoundAction(ids: string[]): Promise<Done> {
    try {
        const row = await activeBrand();
        for (const id of ids.slice(0, 60))
            approveFound(row.id, id);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function editFoundAction(id: string, text: string): Promise<Done> {
    try {
        const row = await activeBrand();
        editFound(row.id, id, text);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function setFoundStatusAction(id: string, status: "found" | "ignored"): Promise<Done> {
    try {
        const row = await activeBrand();
        setFoundStatus(row.id, id, status);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function settleConflictAction(topic: string, live: string, note = ""): Promise<Done> {
    try {
        const row = await activeBrand();
        settleConflict(row.id, topic, live, note);
        approveWaiting(row.id);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function reopenConflictAction(topic: string): Promise<Done> {
    try {
        const row = await activeBrand();
        reopenConflict(row.id, topic);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function setPersonConsentAction(id: string, consent: boolean): Promise<Done> {
    try {
        const row = await activeBrand();
        updatePerson(row.id, id, { consent });
        revalidatePath("/brand");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function removePersonAction(id: string): Promise<Done> {
    try {
        const row = await activeBrand();
        removePerson(row.id, id);
        revalidatePath("/brand");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 300) };
    }
}
export async function readSiteForBrainAction(url: string): Promise<{
    ok: true;
    pages: number;
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        const res = await saveSiteAsMarkdown(row.id, url);
        revalidatePath("/brand");
        return { ok: true, pages: res.pages };
    }
    catch (e) {
        return { ok: false, error: `The website couldn't be read: ${errorText(e).slice(0, 200)}` };
    }
}
export async function saveBrandNotesAction(text: string): Promise<{
    ok: true;
    chars: number;
} | {
    ok: false;
    error: string;
}> {
    try {
        const row = await activeBrand();
        const res = saveBrandNotes(row.id, text);
        revalidatePath("/brand");
        return { ok: true, chars: res.chars };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
