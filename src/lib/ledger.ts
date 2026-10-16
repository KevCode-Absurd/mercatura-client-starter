import { hasPrice } from "./llm/pricing";
import { and, asc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { SHARED_BRAND } from "./env";
import { budgetStatus } from "./llm/gateway";
import { priceFor } from "./llm/pricing";
import { mediaUsage } from "./media/providers";
export const estimated = (model: string) => !/^(gpt-image|seedance|gemini-.*-image)/.test(model) && !hasPrice(model);
export type RunKind = "sprint" | "studio" | "job" | "script" | "research" | "library" | "brand" | "feedback" | "reference" | "compliance" | "other";
export const RUN_LABEL: Record<RunKind, string> = { sprint: "100-ad sprint", studio: "Image set", job: "Production job", script: "Script", research: "Research", library: "Reference library", brand: "Brand set-up", feedback: "Feedback", reference: "Reference ad", compliance: "Compliance check", other: "Other" };
export interface RunRow {
    kind: RunKind;
    id: string;
    title: string;
    href: string | null;
    calls: number;
    tokensIn: number;
    tokensCached: number;
    tokensOut: number;
    textUsd: number;
    images: number;
    imageUsd: number;
    clips: number;
    videoUsd: number;
    totalUsd: number;
    first: string;
    last: string;
}
const t = schema.llmCalls;
const m = schema.mediaCalls;
const PER_ID = new Set(["sprint", "studio", "job", "script"]);
const bucketOf = (refType: string | null): RunKind => (refType === "source_item" ? "research" : refType === "founder_answer" ? "brand" : (["sprint", "studio", "job", "script", "library", "brand", "feedback", "reference", "compliance"] as const).find((k) => k === refType) ?? "other");
const scope = (brandId: string) => inArray(t.brand_id, [brandId, SHARED_BRAND]);
function sprintSets(brandId: string): {
    sprints: Map<string, {
        title: string;
        sets: string[];
    }>;
    owner: Map<string, string>;
} {
    const rows = db.select({ id: schema.sprints.id, title: schema.sprints.title, sets: schema.sprints.set_ids, slots: schema.sprints.slots }).from(schema.sprints).where(eq(schema.sprints.brand_id, brandId)).all();
    for (const r of rows)
        r.sets = [...new Set([...r.sets, ...r.slots.flatMap(slot => [...(slot.casting?.previousJobs ?? []), ...(slot.casting?.job ? [slot.casting.job] : [])])])];
    return { sprints: new Map(rows.map((r) => [r.id, { title: r.title, sets: r.sets }])), owner: new Map(rows.flatMap((r) => r.sets.map((s): [
            string,
            string
        ] => [s, r.id]))) };
}
export function listRuns(brandId: string, opts: {
    fold?: boolean;
} = {}): RunRow[] {
    const sp = sprintSets(brandId);
    const owner = opts.fold === false ? new Map<string, string>() : sp.owner;
    const text = db
        .select({ rt: t.ref_type, id: t.ref_id, calls: sql<number> `count(*)`, i: sql<number> `sum(input_tokens)`, c: sql<number> `sum(cache_read_tokens)`, o: sql<number> `sum(output_tokens)`, usd: sql<number> `sum(cost_usd)`, first: sql<string> `min(created_at)`, last: sql<string> `max(created_at)` })
        .from(t)
        .where(scope(brandId))
        .groupBy(t.ref_type, t.ref_id)
        .all();
    const media = db
        .select({ id: m.job_id, kind: m.kind, n: sql<number> `sum(case when status = 'ok' then 1 else 0 end)`, usd: sql<number> `sum(cost_usd)`, first: sql<string> `min(created_at)`, last: sql<string> `max(created_at)` })
        .from(m)
        .where(inArray(m.brand_id, [brandId, SHARED_BRAND]))
        .groupBy(m.job_id, m.kind)
        .all();
    const runs = new Map<string, RunRow>();
    const get = (kind: RunKind, id: string, at: string): RunRow => {
        const key = `${kind}:${id}`;
        if (!runs.has(key))
            runs.set(key, { kind, id, title: "", href: null, calls: 0, tokensIn: 0, tokensCached: 0, tokensOut: 0, textUsd: 0, images: 0, imageUsd: 0, clips: 0, videoUsd: 0, totalUsd: 0, first: at, last: at });
        return runs.get(key)!;
    };
    for (const r of text) {
        const inSprint = r.rt === "studio" && r.id ? owner.get(r.id) : undefined;
        const kind = inSprint ? "sprint" : bucketOf(r.rt);
        const run = get(kind, inSprint ?? (PER_ID.has(kind) && r.id ? r.id : kind), r.first);
        run.calls += r.calls;
        run.tokensIn += r.i;
        run.tokensCached += r.c;
        run.tokensOut += r.o;
        run.textUsd += r.usd;
        if (r.first < run.first)
            run.first = r.first;
        if (r.last > run.last)
            run.last = r.last;
    }
    for (const r of media) {
        const id = r.id ?? "other";
        const kind: RunKind = owner.has(id) ? "sprint" : id.startsWith("set_") ? "studio" : id.startsWith("job_") ? "job" : "other";
        const run = get(kind, owner.get(id) ?? id, r.first);
        if (r.kind === "image") {
            run.images += r.n;
            run.imageUsd += r.usd;
        }
        else {
            run.clips += r.n;
            run.videoUsd += r.usd;
        }
        if (r.first < run.first)
            run.first = r.first;
        if (r.last > run.last)
            run.last = r.last;
    }
    const sets = new Map(db.select({ id: schema.studioRuns.id, title: schema.studioRuns.title }).from(schema.studioRuns).all().map((x) => [x.id, x.title]));
    const scripts = new Map(db.select({ id: schema.scripts.id, title: schema.scripts.title }).from(schema.scripts).all().map((x) => [x.id, x.title]));
    const jobs = new Map(db.select({ id: schema.outputJobs.id, type: schema.outputJobs.output_type, script: schema.outputJobs.script_id }).from(schema.outputJobs).all().map((x) => [x.id, x]));
    const concepts = new Map(db.select({ id: schema.concepts.id, name: schema.concepts.name }).from(schema.concepts).all().map((x) => [x.id, x.name]));
    for (const run of runs.values()) {
        run.totalUsd = run.textUsd + run.imageUsd + run.videoUsd;
        if (run.kind === "sprint") {
            run.title = sp.sprints.get(run.id)?.title ?? "A sprint that was deleted";
            run.href = sp.sprints.has(run.id) ? `/studio/sprint/${run.id}` : null;
        }
        else if (run.kind === "studio") {
            run.title = sets.get(run.id) ?? "A set that was deleted";
            run.href = sets.has(run.id) ? `/studio/${run.id}` : null;
        }
        else if (run.kind === "job") {
            const j = jobs.get(run.id);
            run.title = j ? `${j.type.replace(/_/g, " ")}: ${scripts.get(j.script) ?? j.script}` : "A job that was deleted";
            run.href = "/production";
        }
        else if (run.kind === "script") {
            const concept = run.id.split(":")[0];
            run.title = scripts.get(run.id) ?? (concepts.has(concept) ? `Writing a script for "${concepts.get(concept)}"` : "Script work");
            run.href = scripts.has(run.id) ? `/scripts/${run.id}` : "/scripts";
        }
        else
            run.title = { research: "Cleaning, extracting and clustering customer words", library: "Analysing and sorting the reference libraries", brand: "Creative kit, look scan, claim scan, founder answers", feedback: "Reading feedback for lessons", reference: "Analysing reference ads you added", other: "Other calls" }[run.kind as string] ?? run.id;
    }
    return [...runs.values()].sort((a, b) => b.totalUsd - a.totalUsd);
}
export interface StepRow {
    step: string;
    model: string;
    calls: number;
    failed: number;
    tokensIn: number;
    tokensCached: number;
    tokensOut: number;
    usd: number;
    seconds: number;
    estimated: boolean;
}
export interface MediaRow {
    what: string;
    kind: "image" | "video";
    model: string;
    quality: string;
    made: number;
    failed: number;
    usd: number;
    seconds: number;
}
export interface CallRow {
    id: string;
    at: string;
    step: string;
    model: string;
    kind: "text" | "image" | "video";
    tokensIn: number;
    tokensCached: number;
    tokensOut: number;
    usd: number;
    seconds: number;
    status: string;
    note: string;
}
export interface ModelRow {
    model: string;
    kind: "text" | "image" | "video";
    calls: number;
    tokensIn: number;
    tokensCached: number;
    tokensOut: number;
    usd: number;
    estimated: boolean;
    rate: string;
}
export interface Ledger {
    steps: StepRow[];
    media: MediaRow[];
    models: ModelRow[];
    calls: CallRow[];
    textUsd: number;
    imageUsd: number;
    videoUsd: number;
    totalUsd: number;
    images: number;
    clips: number;
    tokensIn: number;
    tokensCached: number;
    tokensOut: number;
    estimatedUsd: number;
}
const purposeOf = (p: string) => (/^img_\d+/.test(p) ? `Image ${p.match(/^img_(\d+)/)![1]}${/retry/.test(p) ? " (second attempt)" : ""}` : /^card/.test(p) ? `Ad ${p}` : /^clip/.test(p) ? `Video ${p}` : p.replace(/_/g, " "));
const rate = (model: string) => {
    const p = priceFor(model);
    return `$${p.input} in, $${p.output} out`;
};
const SUM_COLUMNS = { task: t.task, model: t.model, status: t.status, input_tokens: t.input_tokens, cache_read_tokens: t.cache_read_tokens, output_tokens: t.output_tokens, cost_usd: t.cost_usd, duration_ms: t.duration_ms };
const CALL_COLUMNS = { ...SUM_COLUMNS, id: t.id, created_at: t.created_at, attempt: t.attempt, error: t.error };
const MEDIA_COLUMNS = { id: m.id, created_at: m.created_at, kind: m.kind, purpose: m.purpose, model: m.model, status: m.status, cost_usd: m.cost_usd, duration_ms: m.duration_ms, request: m.request, error: m.error };
type SumCall = {
    [K in keyof typeof SUM_COLUMNS]: (typeof t.$inferSelect)[K];
};
type LedgerCall = SumCall & Partial<Pick<typeof t.$inferSelect, "id" | "created_at" | "attempt" | "error">>;
type LedgerMedia = {
    [K in keyof typeof MEDIA_COLUMNS]: (typeof m.$inferSelect)[K];
};
function ledgerOf(text: LedgerCall[], media: LedgerMedia[]): Ledger {
    const steps = new Map<string, StepRow>();
    const models = new Map<string, ModelRow>();
    const model = (name: string, kind: ModelRow["kind"]): ModelRow => {
        const key = `${kind}:${name}`;
        if (!models.has(key))
            models.set(key, { model: name, kind, calls: 0, tokensIn: 0, tokensCached: 0, tokensOut: 0, usd: 0, estimated: kind === "text" && estimated(name), rate: kind === "text" ? rate(name) : "" });
        return models.get(key)!;
    };
    for (const c of text) {
        const key = `${c.task}|${c.model}`;
        if (!steps.has(key))
            steps.set(key, { step: c.task, model: c.model, calls: 0, failed: 0, tokensIn: 0, tokensCached: 0, tokensOut: 0, usd: 0, seconds: 0, estimated: estimated(c.model) });
        const s = steps.get(key)!;
        const mo = model(c.model, "text");
        for (const row of [s, mo]) {
            row.calls++;
            row.tokensIn += c.input_tokens;
            row.tokensCached += c.cache_read_tokens;
            row.tokensOut += c.output_tokens;
            row.usd += c.cost_usd;
        }
        s.seconds += c.duration_ms / 1000;
        if (c.status !== "ok")
            s.failed++;
    }
    const mediaRows = new Map<string, MediaRow>();
    for (const c of media) {
        const what = /^img_|^card/.test(c.purpose) ? (c.kind === "image" ? "Finished images" : "Clips") : /^clip/.test(c.purpose) ? "Video clips" : c.purpose.replace(/_/g, " ");
        const quality = String((c.request as {
            quality?: string;
        }).quality ?? "");
        const key = `${what}|${c.model}|${quality}`;
        if (!mediaRows.has(key))
            mediaRows.set(key, { what, kind: c.kind, model: c.model, quality, made: 0, failed: 0, usd: 0, seconds: 0 });
        const r = mediaRows.get(key)!;
        if (c.status === "error")
            r.failed++;
        else
            r.made++;
        r.usd += c.cost_usd;
        r.seconds += c.duration_ms / 1000;
        const mo = model(c.model, c.kind);
        mo.calls++;
        mo.usd += c.cost_usd;
    }
    const calls: CallRow[] = [
        ...text.filter((c) => c.id !== undefined).map((c): CallRow => ({ id: c.id!, at: c.created_at!, step: c.task, model: c.model, kind: "text", tokensIn: c.input_tokens, tokensCached: c.cache_read_tokens, tokensOut: c.output_tokens, usd: c.cost_usd, seconds: c.duration_ms / 1000, status: c.status, note: c.status === "ok" ? ((c.attempt ?? 1) > 1 ? `attempt ${c.attempt}` : "") : (c.error ?? "").slice(0, 140) })),
        ...media.map((c): CallRow => ({ id: c.id, at: c.created_at, step: purposeOf(c.purpose), model: c.model, kind: c.kind, tokensIn: 0, tokensCached: 0, tokensOut: 0, usd: c.cost_usd, seconds: c.duration_ms / 1000, status: c.status, note: [(c.request as {
                    size?: string;
                }).size, (c.request as {
                    quality?: string;
                }).quality, c.error?.slice(0, 100)].filter(Boolean).join(", ") })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((n, r) => n + f(r), 0);
    const textUsd = sum(text, (c) => c.cost_usd);
    const imageUsd = sum(media.filter((c) => c.kind === "image"), (c) => c.cost_usd);
    const videoUsd = sum(media.filter((c) => c.kind === "video"), (c) => c.cost_usd);
    return {
        steps: [...steps.values()].sort((a, b) => b.usd - a.usd),
        media: [...mediaRows.values()].sort((a, b) => b.usd - a.usd),
        models: [...models.values()].sort((a, b) => b.usd - a.usd),
        calls,
        textUsd,
        imageUsd,
        videoUsd,
        totalUsd: textUsd + imageUsd + videoUsd,
        images: media.filter((c) => c.kind === "image" && c.status === "ok").length,
        clips: media.filter((c) => c.kind === "video" && c.status !== "error").length,
        tokensIn: sum(text, (c) => c.input_tokens),
        tokensCached: sum(text, (c) => c.cache_read_tokens),
        tokensOut: sum(text, (c) => c.output_tokens),
        estimatedUsd: sum(text.filter((c) => estimated(c.model)), (c) => c.cost_usd),
    };
}
export function runLedger(brandId: string, kind: RunKind, id: string): Ledger {
    const refTypes = kind === "research" ? ["source_item"] : kind === "brand" ? ["brand", "founder_answer"] : [kind];
    if (kind === "sprint") {
        const sets = sprintSets(brandId).sprints.get(id)?.sets ?? [];
        const text = db.select(CALL_COLUMNS).from(t).where(and(scope(brandId), or(and(eq(t.ref_type, "sprint"), eq(t.ref_id, id)), sets.length ? and(eq(t.ref_type, "studio"), inArray(t.ref_id, sets)) : sql `0`))).orderBy(asc(t.created_at)).all();
        const media = sets.length ? db.select(MEDIA_COLUMNS).from(m).where(inArray(m.job_id, sets)).orderBy(asc(m.created_at)).all() : [];
        return ledgerOf(text, media);
    }
    const where = PER_ID.has(kind)
        ? and(scope(brandId), eq(t.ref_type, kind), eq(t.ref_id, id))
        : kind === "other"
            ? and(scope(brandId), or(sql `${t.ref_type} is null`, sql `${t.ref_type} not in ('sprint','studio','job','script','source_item','library','brand','feedback','reference','founder_answer')`))
            : and(scope(brandId), inArray(t.ref_type, refTypes));
    const text = db.select(CALL_COLUMNS).from(t).where(where).orderBy(asc(t.created_at)).all();
    const media = kind === "studio" || kind === "job" ? db.select(MEDIA_COLUMNS).from(m).where(eq(m.job_id, id)).orderBy(asc(m.created_at)).all() : [];
    return ledgerOf(text, media);
}
export function brandLedger(brandId: string): Ledger {
    const l = ledgerOf(db.select(SUM_COLUMNS).from(t).where(scope(brandId)).all(), db.select(MEDIA_COLUMNS).from(m).where(inArray(m.brand_id, [brandId, SHARED_BRAND])).all());
    return { ...l, calls: [] };
}
export function scriptRuns(conceptId: string): string[] {
    return db.select({ id: t.ref_id }).from(t).where(and(eq(t.ref_type, "script"), like(t.ref_id, `${conceptId}:%`))).groupBy(t.ref_id).all().map((r) => r.id!).filter(Boolean);
}
export const caps = () => ({ text: budgetStatus(), media: mediaUsage() });
export const sharedUsd = (): number => ledgerOf(db.select(SUM_COLUMNS).from(t).where(eq(t.brand_id, SHARED_BRAND)).all(), db.select(MEDIA_COLUMNS).from(m).where(eq(m.brand_id, SHARED_BRAND)).all()).totalUsd;
