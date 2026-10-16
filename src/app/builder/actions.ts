"use server";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { saveKit } from "@/lib/builder/kit";
import type { MatchData } from "@/lib/builder/plan";
import { matchData, startBuilder } from "@/lib/builder/start";
import { tasteSchema } from "@/lib/taste/schema";
import { plainError } from "@/lib/builder/plain-error";
import { brandSources, builderGaps, ensureAngles, writeStarter, type BuilderGaps } from "@/lib/builder/starter";
import { builderFormats, deleteAngle, deleteCustomFormat, deleteSimpleOffer, isBuilderOffer, listAngles, listBrandOffers, listCustomFormats, saveAngle, saveCustomFormat, saveSimpleOffer } from "@/lib/builder/store";
import { MAX_PICTURES, MAX_SCRIPTS, MAX_TEXTS, NO_OFFER, NO_OFFER_STAGES, PICTURE_WORDS, type Angle, type BuilderFormat, type CustomFormat, type ScriptKit } from "@/lib/builder/types";
import { noteFields, noteHandEdits } from "@/lib/hand-edits";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage } from "@/lib/media/providers";
import { freshId, getPersona, listPersonas, savePersona } from "@/lib/personas/store";
import { PERSONA_AWARENESS, type PersonaAwareness } from "@/lib/personas/types";
import { INDIRECT_FORMAT_ID } from "@/lib/scripts/indirect";
import { speakerAges } from "@/lib/scripts/pace";
import { versionsOf } from "@/lib/scripts/versions";
import { AWARENESS_STAGES, LENGTH_PRESETS, type AwarenessStage } from "@/lib/taxonomy";
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
export interface BuilderPersona {
    id: string;
    name: string;
    summary: string;
    identity: string;
    problem: string;
    wants: string;
    trigger: string;
    language: string[];
    notes: string;
    awareness: PersonaAwareness;
}
export interface BuilderOffer {
    id: string;
    name: string;
    price: number;
    terms: string;
    say: string;
    persona_ids: string[];
    stages: AwarenessStage[];
    running: boolean;
    needs: string;
    own: boolean;
    removable: boolean;
    fitted: boolean;
}
export interface BuilderScript {
    id: string;
    title: string;
    persona: string;
    stage: AwarenessStage;
    seconds: number;
    opens: string;
    lines: string[];
    status: "draft" | "approved" | "ready_for_handoff";
    versions?: {
        n: number;
        opens: string;
        lines: string[];
        way: string;
    }[];
    at: string;
    kit: ScriptKit;
}
export interface RunJob {
    id: string;
    status: "waiting" | "writing" | "done" | "failed";
    label: string;
    said?: string;
    retry?: boolean;
}
export interface RunProgress {
    run: string;
    jobs: RunJob[];
}
export interface BuilderState {
    products: {
        id: string;
        name: string;
        format: string;
    }[];
    personas: BuilderPersona[];
    angles: Angle[];
    offers: BuilderOffer[];
    formats: BuilderFormat[];
    custom: CustomFormat[];
    bases: {
        id: string;
        name: string;
    }[];
    currency: string;
    scripts: BuilderScript[];
    match: MatchData;
    writing: number;
    offersWriting: boolean;
    progress: RunProgress[];
    gaps: BuilderGaps;
    starterWriting: boolean;
    websiteOnly: boolean;
    brand: {
        id: string;
        name: string;
    };
    imagesLeft: number;
    speakerAges: Record<string, string | null>;
}
function stateOf(brandId: string): BuilderState {
    const brand = loadBrandBrain(brandId);
    const profiles = listPersonas(brandId);
    const personas = brand.personas.map((p) => {
        const full = profiles.find((x) => x.id === p.id);
        return { id: p.id, name: p.name, summary: p.summary, identity: full?.identity ?? "", problem: p.problem, wants: p.wants ?? full?.wants ?? "", trigger: p.trigger, language: p.language, notes: full?.notes ?? "", awareness: full?.awareness ?? "problem_aware" };
    });
    const formats = builderFormats(brandId);
    const usage = mediaUsage();
    const rows = db.select().from(schema.scripts).where(and(eq(schema.scripts.brand_id, brandId), isNotNull(schema.scripts.kit))).orderBy(desc(schema.scripts.created_at)).limit(120).all();
    const concepts = rows.length ? db.select({ id: schema.concepts.id, persona_id: schema.concepts.persona_id }).from(schema.concepts).where(inArray(schema.concepts.id, [...new Set(rows.map((r) => r.concept_id))])).all() : [];
    const scripts = rows
        .filter((r) => r.kit?.run)
        .map((r) => {
        const personaId = concepts.find((c) => c.id === r.concept_id)?.persona_id;
        const versions = versionsOf(r);
        return { id: r.id, title: r.title, persona: profiles.find((p) => p.id === personaId)?.name ?? "", stage: r.awareness_stage, seconds: r.est_seconds, opens: r.lines[0]?.text ?? "", lines: r.lines.map((l) => l.text), status: r.status, ...(versions.length > 1 ? { versions: versions.map((v) => ({ n: v.n, opens: v.opens, lines: v.lines.map((l) => l.text), way: v.n === 1 ? "" : (v.hook?.type ?? "") })) } : {}), at: r.created_at, kit: r.kit! };
    });
    const jobs = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "script"))).orderBy(desc(schema.jobs.created_at)).limit(400).all().filter((j) => (j.payload as {
        kit?: {
            run?: string;
        };
    }).kit?.run);
    const open = jobs.filter((j) => j.status !== "done");
    const openRuns = new Set(open.map((j) => (j.payload as {
        kit: ScriptKit;
    }).kit.run));
    const jobConcepts = openRuns.size ? db.select({ id: schema.concepts.id, persona_id: schema.concepts.persona_id }).from(schema.concepts).where(inArray(schema.concepts.id, [...new Set(jobs.map((j) => j.ref_id).filter((x): x is string => !!x))])).all() : [];
    const progress: RunProgress[] = [...openRuns].map((run) => ({
        run,
        jobs: jobs
            .filter((j) => (j.payload as {
            kit: ScriptKit;
        }).kit.run === run)
            .reverse()
            .map((j) => {
            const kit = (j.payload as {
                kit: ScriptKit;
            }).kit;
            const who = profiles.find((p) => p.id === jobConcepts.find((c) => c.id === j.ref_id)?.persona_id)?.name;
            const label = [who, kit.angle, kit.format].filter(Boolean).join(" · ");
            if (j.status === "queued")
                return { id: j.id, status: "waiting" as const, label };
            if (j.status === "running")
                return { id: j.id, status: "writing" as const, label };
            if (j.status === "done")
                return { id: j.id, status: "done" as const, label };
            const why = plainError(j.error);
            return { id: j.id, status: "failed" as const, label, said: why.said, retry: why.retry };
        }),
    }));
    const queued = db.select({ kind: schema.jobs.kind, payload: schema.jobs.payload }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), inArray(schema.jobs.kind, ["offers", "personas"]), inArray(schema.jobs.status, ["queued", "running"]))).all();
    const starterWriting = queued.some((j) => j.kind === "personas" && (j.payload as {
        op?: string;
    }).op === "starter");
    return {
        products: brand.products.map((p) => ({ id: p.id, name: p.name, format: p.format ?? "" })),
        personas,
        angles: listAngles(brandId),
        offers: [
            { id: NO_OFFER, name: "No offer", price: 0, terms: "", say: "The ad makes no offer: no price, no deal, and it does not ask for the sale. It ends on the next small step.", persona_ids: [], stages: [...NO_OFFER_STAGES], running: true, needs: "", own: false, removable: false, fitted: true },
            ...listBrandOffers(brandId).map((o) => ({ id: o.id, name: o.name, price: o.price, terms: o.terms, say: o.say, persona_ids: o.persona_ids, stages: o.stages, running: o.running, needs: o.needs, own: o.source !== "design", removable: isBuilderOffer(o.id), fitted: o.fitted })),
        ],
        match: matchData(brandId),
        offersWriting: starterWriting || queued.some((j) => j.kind === "offers" && (j.payload as {
            op?: string;
        }).op === "set"),
        formats,
        custom: listCustomFormats(brandId),
        bases: formats.filter((f) => !f.custom && f.id !== "native" && f.id !== INDIRECT_FORMAT_ID).map((f) => ({ id: f.id, name: f.name })),
        currency: brand.brand.currency,
        scripts,
        writing: open.filter((j) => j.status === "queued" || j.status === "running").length,
        progress,
        gaps: builderGaps(brandId),
        starterWriting,
        websiteOnly: brandSources(brandId).websiteOnly,
        brand: { id: brandId, name: brand.brand.name },
        imagesLeft: Math.max(0, usage.imageCap - usage.images),
        speakerAges: speakerAges(brandId, personas.map((p) => p.id)),
    };
}
export async function builderState(): Promise<BuilderState> {
    const brandId = await activeBrandId();
    if (loadBrandBrain(brandId).personas.length)
        ensureAngles(brandId);
    return stateOf(brandId);
}
export async function builderStateAction(): Promise<Result<{
    state: BuilderState;
}>> {
    try {
        return { ok: true, state: stateOf(await activeBrandId()) };
    }
    catch (e) {
        return fail(e);
    }
}
const done = async <T extends object>(work: (brandId: string) => T | void): Promise<Result<{
    state: BuilderState;
}>> => {
    try {
        const brandId = await activeBrandId();
        work(brandId);
        revalidatePath("/builder");
        return { ok: true, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
};
const Persona = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Give the persona a name.").max(60),
    summary: z.string().trim().min(4, "Describe the person in 1 or 2 sentences.").max(400),
    identity: z.string().trim().max(300).default(""),
    problem: z.string().trim().min(4, "Say what their problem is.").max(300),
    wants: z.string().trim().max(300).default(""),
    trigger: z.string().trim().max(300).default(""),
    language: z.array(z.string().trim().max(160)).max(8).default([]),
    notes: z.string().trim().max(600).default(""),
    awareness: z.enum(PERSONA_AWARENESS).default("problem_aware"),
});
export async function savePersonaAction(input: z.input<typeof Persona>) {
    return done((brandId) => {
        const p = Persona.parse(input);
        const was = p.id ? getPersona(brandId, p.id) : undefined;
        if (was && was.source !== "hand")
            noteFields(brandId, was.id, "persona", was, p);
        savePersona(brandId, {
            who: { age: "", gender: "", life: "" },
            objections: [],
            angle: "",
            product_ids: [],
            offer_id: null,
            sounds_like: [],
            share: null,
            performance: null,
            source: "hand",
            basis: "",
            look: "",
            image: null,
            ...was,
            ...p,
            id: was?.id ?? freshId(brandId, p.name),
            language: p.language.filter(Boolean),
            status: "active",
        });
    });
}
export async function saveAngleAction(input: {
    id?: string;
    name: string;
    line: string;
    persona_ids: string[];
    stages?: string[];
    notes?: string;
}) {
    return done((brandId) => {
        noteFields(brandId, input.id ?? "", "angle", input.id ? listAngles(brandId).find((a) => a.id === input.id) : null, input);
        saveAngle(brandId, input);
    });
}
export async function deleteAngleAction(id: string) {
    return done((brandId) => deleteAngle(brandId, id));
}
export async function saveOfferAction(input: {
    id?: string;
    name: string;
    price: number;
    terms: string;
    say?: string;
    persona_ids?: string[];
    stages?: string[];
}) {
    return done((brandId) => {
        noteFields(brandId, input.id ?? "", "offer", input.id ? listBrandOffers(brandId).find((o) => o.id === input.id) : null, input);
        saveSimpleOffer(brandId, input);
    });
}
export async function deleteOfferAction(id: string) {
    return done((brandId) => {
        if (!isBuilderOffer(id))
            throw new Error("That offer is one of the brand's own prices or was designed on the Offers screen. Take it out of use there.");
        deleteSimpleOffer(brandId, id);
    });
}
export async function writeStarterAction(): Promise<Result<{
    said: string;
    state: BuilderState;
}>> {
    try {
        const brandId = await activeBrandId();
        let said = "They are being written from what the brand has. They appear here in about a minute.";
        if (llmEnabled())
            enqueue(brandId, "personas", `starter:${brandId}`, { op: "starter", offers: true });
        else
            said = (await writeStarter(brandId)).note;
        revalidatePath("/builder");
        return { ok: true, said, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function writeOffersAction(count: number) {
    return done((brandId) => {
        if (!llmEnabled())
            throw new Error("Writing offers needs live mode.");
        enqueue(brandId, "offers", brandId, { op: "set", count: Math.max(1, Math.min(14, Math.round(count) || 12)) });
    });
}
export async function saveFormatAction(input: {
    id?: string;
    name: string;
    how: string;
    base: string;
}) {
    return done((brandId) => saveCustomFormat(brandId, input));
}
export async function deleteFormatAction(id: string) {
    return done((brandId) => deleteCustomFormat(brandId, id));
}
const Chosen = z.record(z.string(), z.number().int().min(0).max(MAX_SCRIPTS));
const Pick = z.object({
    products: Chosen,
    stages: Chosen,
    personas: Chosen,
    angles: Chosen,
    offers: Chosen,
    formats: Chosen,
    count: z.number().int().min(1).max(MAX_SCRIPTS),
    texts: z.number().int().min(0).max(MAX_TEXTS),
    pictures: z.number().int().min(0).max(MAX_PICTURES),
    words: z.enum(PICTURE_WORDS),
    notes: z.string().max(1500).optional(),
    research: z.boolean(),
    hooks: z.number().int().min(1).max(5).optional(),
    length: z.enum(LENGTH_PRESETS).optional(),
    variety: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
    rows: z.array(z.object({ product_id: z.string(), stage: z.enum(AWARENESS_STAGES), persona_id: z.string(), angle_id: z.string(), offer_id: z.string(), format_id: z.string(), note: z.string().max(600).optional() })).max(MAX_SCRIPTS).optional(),
});
export async function startBuilderAction(input: z.input<typeof Pick>): Promise<Result<{
    said: string;
    scripts: number;
    state: BuilderState;
}>> {
    try {
        const brandId = await activeBrandId();
        const started = startBuilder(brandId, Pick.parse(input));
        revalidatePath("/builder");
        revalidatePath("/scripts");
        return { ok: true, said: started.said, scripts: started.scripts, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveKitTextAction(scriptId: string, texts: {
    primary_text: string;
    headline: string;
}[]): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        const row = db.select({ kit: schema.scripts.kit, brand_id: schema.scripts.brand_id }).from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
        if (!row || row.brand_id !== brandId || !row.kit)
            throw new Error("That script was not found.");
        const clean = texts.slice(0, MAX_TEXTS).map((t) => ({ primary_text: t.primary_text.trim().slice(0, 12000), headline: t.headline.trim().slice(0, 200) }));
        if (!clean.length)
            throw new Error("There is nothing to save.");
        saveKit(scriptId, { ...row.kit, primary_text: clean[0].primary_text, headline: clean[0].headline, more_texts: clean.slice(1) });
        const was = [{ primary_text: row.kit.primary_text ?? "", headline: row.kit.headline ?? "" }, ...(row.kit.more_texts ?? [])];
        await noteHandEdits(brandId, scriptId, clean.flatMap((t, i) => [
            { surface: "primary_text" as const, before: was[i]?.primary_text ?? "", after: t.primary_text },
            { surface: "headline" as const, before: was[i]?.headline ?? "", after: t.headline },
        ]));
        revalidatePath(`/scripts/${scriptId}`);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
async function ownBuilderJob(jobId: string) {
    const brandId = await activeBrandId();
    const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "script"))).get();
    if (!job || !(job.payload as {
        kit?: unknown;
    }).kit)
        throw new Error("That script is no longer on the list.");
    return { brandId, job };
}
export async function retryScriptAction(jobId: string): Promise<Result<{
    state: BuilderState;
}>> {
    try {
        const { brandId, job } = await ownBuilderJob(jobId);
        if (!llmEnabled())
            throw new Error("Writing a script needs live mode.");
        if (job.status === "failed" || job.status === "paused" || job.status === "stopped")
            db.update(schema.jobs).set({ status: "queued", error: null, control: null, progress: 0, updated_at: new Date().toISOString() }).where(eq(schema.jobs.id, jobId)).run();
        return { ok: true, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function dropFailedScriptAction(jobId: string): Promise<Result<{
    state: BuilderState;
}>> {
    try {
        const { brandId, job } = await ownBuilderJob(jobId);
        if (job.status !== "queued" && job.status !== "running")
            db.delete(schema.jobs).where(eq(schema.jobs.id, jobId)).run();
        return { ok: true, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function reviewScriptAction(scriptId: string, verdict: "approved" | "rejected" | "undecided"): Promise<Result<{
    state: BuilderState;
}>> {
    try {
        const brandId = await activeBrandId();
        const row = db.select({ kit: schema.scripts.kit, brand_id: schema.scripts.brand_id, status: schema.scripts.status }).from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
        if (!row || row.brand_id !== brandId || !row.kit)
            throw new Error("That script was not found.");
        const kit: ScriptKit = { ...row.kit };
        delete kit.review;
        const status = verdict === "approved" ? (row.status === "ready_for_handoff" ? row.status : "approved") : row.status === "approved" ? "draft" : row.status;
        db.update(schema.scripts).set({ status, kit: verdict === "rejected" ? { ...kit, review: "rejected" } : kit, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, scriptId)).run();
        revalidatePath("/scripts");
        revalidatePath(`/scripts/${scriptId}`);
        return { ok: true, state: stateOf(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
