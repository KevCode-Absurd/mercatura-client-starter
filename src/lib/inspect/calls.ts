import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { STEPS, stepOf, type Step } from "../llm/steps";
import { recommended } from "../llm/routing";
import { blockKey, blockTokens, splitBlocks, type Block } from "./blocks";
import { lineOwners } from "./skill-map";
const t = schema.llmCalls;
const NOT_A_STEP = new Set(["prompt_cache", "smoke"]);
const answerTokens = (chars: number) => Math.round(chars / 4);
export interface StepRow {
    task: string;
    step: Step | null;
    shares: string | null;
    calls: number;
    failed: number;
    last: string | null;
    model: string | null;
    sent: number;
    cached: number;
    out: number;
    thinking: number;
    cents: number;
    seconds: number;
    recent: number;
}
export function stepRows(): StepRow[] {
    const all = db.all<{
        task: string;
        n: number;
        bad: number;
        last: string;
    }>(sql `select task, count(*) n, sum(status != 'ok') bad, max(created_at) last from llm_calls group by task`);
    const recent = db.all<{
        task: string;
        n: number;
        i: number;
        c: number;
        o: number;
        r: number;
        usd: number;
        ms: number;
    }>(sql `select task, count(*) n, avg(input_tokens + cache_write_tokens) i, avg(cache_read_tokens) c, avg(output_tokens) o, avg(length(coalesce(response_text, ''))) r, avg(cost_usd) usd, avg(duration_ms) ms from llm_calls where rowid in (select rowid from (select rowid, row_number() over (partition by task order by created_at desc) rn from llm_calls where status = 'ok') where rn <= 20) group by task`);
    const model = db.all<{
        task: string;
        model: string;
    }>(sql `select task, model from llm_calls where rowid in (select rowid from (select rowid, row_number() over (partition by task order by created_at desc) rn from llm_calls) where rn = 1)`);
    const tasks = new Set([...STEPS.map((s) => s.task), ...all.map((a) => a.task)]);
    return [...tasks]
        .filter((task) => !NOT_A_STEP.has(task))
        .map((task): StepRow => {
        const a = all.find((x) => x.task === task);
        const r = recent.find((x) => x.task === task);
        const own = STEPS.find((s) => s.task === task) ?? null;
        const shared = own ? null : stepOf(task);
        return {
            task,
            step: own,
            shares: shared?.task ?? null,
            calls: a?.n ?? 0,
            failed: a?.bad ?? 0,
            last: a?.last ?? null,
            model: model.find((x) => x.task === task)?.model ?? null,
            sent: Math.round((r?.i ?? 0) + (r?.c ?? 0)),
            cached: Math.round(r?.c ?? 0),
            out: Math.round(r?.o ?? 0),
            thinking: Math.max(0, Math.round((r?.o ?? 0) - answerTokens(r?.r ?? 0))),
            cents: (r?.usd ?? 0) * 100,
            seconds: (r?.ms ?? 0) / 1000,
            recent: r?.n ?? 0,
        };
    });
}
export interface CallBlock extends Block {
    where: "system" | "user";
    tokens: number;
    files: {
        path: string;
        lines: number;
    }[];
}
function filesIn(text: string): {
    path: string;
    lines: number;
}[] {
    const own = lineOwners();
    const n = new Map<string, number>();
    for (const raw of text.split(/\r?\n/)) {
        const file = own.get(raw.trim());
        if (file)
            n.set(file, (n.get(file) ?? 0) + 1);
    }
    return [...n.entries()].filter(([, lines]) => lines >= 2).map(([path, lines]) => ({ path, lines })).sort((a, b) => b.lines - a.lines);
}
export function callBlocks(system: string, user: string, sentTokens: number): CallBlock[] {
    const blocks = [...splitBlocks(system).map((b) => ({ ...b, where: "system" as const })), ...splitBlocks(user).map((b) => ({ ...b, where: "user" as const }))];
    const tokens = blockTokens(blocks, sentTokens);
    return blocks.map((b, i) => ({ ...b, tokens: tokens[i], files: filesIn(b.text) }));
}
export interface CallDetail {
    kind: "text";
    id: string;
    at: string;
    task: string;
    model: string;
    refType: string | null;
    refId: string | null;
    attempt: number;
    status: string;
    error: string | null;
    sent: number;
    uncached: number;
    cached: number;
    cacheWrite: number;
    out: number;
    answer: number;
    thinking: number;
    usd: number;
    seconds: number;
    blocks: CallBlock[];
    response: string;
}
export interface MediaDetail {
    kind: "media";
    id: string;
    at: string;
    media: "image" | "video";
    purpose: string;
    model: string;
    provider: string;
    jobId: string | null;
    status: string;
    error: string | null;
    usd: number;
    seconds: number;
    prompt: string;
    request: Record<string, unknown>;
    output: string | null;
}
export function getCall(id: string): CallDetail | MediaDetail | null {
    const c = db.select().from(t).where(eq(t.id, id)).get();
    if (c) {
        const sent = c.input_tokens + c.cache_read_tokens + c.cache_write_tokens;
        const answer = Math.min(c.output_tokens, answerTokens((c.response_text ?? "").length));
        return {
            kind: "text",
            id: c.id,
            at: c.created_at,
            task: c.task,
            model: c.model,
            refType: c.ref_type,
            refId: c.ref_id,
            attempt: c.attempt,
            status: c.status,
            error: c.error,
            sent,
            uncached: c.input_tokens,
            cached: c.cache_read_tokens,
            cacheWrite: c.cache_write_tokens,
            out: c.output_tokens,
            answer,
            thinking: Math.max(0, c.output_tokens - answer),
            usd: c.cost_usd,
            seconds: c.duration_ms / 1000,
            blocks: callBlocks(c.system_prompt, c.user_prompt, sent),
            response: c.response_text ?? "",
        };
    }
    const m = db.select().from(schema.mediaCalls).where(eq(schema.mediaCalls.id, id)).get();
    if (!m)
        return null;
    return { kind: "media", id: m.id, at: m.created_at, media: m.kind, purpose: m.purpose, model: m.model, provider: m.provider, jobId: m.job_id, status: m.status, error: m.error, usd: m.cost_usd, seconds: m.duration_ms / 1000, prompt: m.prompt, request: (m.request ?? {}) as Record<string, unknown>, output: m.output_path };
}
export interface RecordBlock {
    where: "system" | "user";
    label: string;
    kind: Block["kind"];
    tokens: number;
    inCalls: number;
    files: string[];
    parts: string[];
}
export interface StepRecord {
    task: string;
    step: Step | null;
    recommended: {
        model: string;
        effort?: string;
        context: string | null;
    } | null;
    read: number;
    models: {
        model: string;
        calls: number;
    }[];
    sent: number;
    cached: number;
    out: number;
    answer: number;
    thinking: number;
    cents: number;
    seconds: number;
    blocks: RecordBlock[];
    failures: {
        status: string;
        error: string;
        calls: number;
        last: string;
    }[];
    totalCalls: number;
    totalFailed: number;
    calls: {
        id: string;
        at: string;
        model: string;
        ref: string;
        sent: number;
        cached: number;
        out: number;
        usd: number;
        seconds: number;
        status: string;
        attempt: number;
    }[];
}
export function stepRecord(task: string, n = 10): StepRecord {
    const step = stepOf(task) ?? null;
    const good = db.select().from(t).where(sql `${t.task} = ${task} and ${t.status} = 'ok'`).orderBy(desc(t.created_at)).limit(n).all();
    const blocks = new Map<string, {
        where: "system" | "user";
        label: string;
        kind: Block["kind"];
        tokens: number;
        n: number;
        files: Set<string>;
        parts: Set<string>;
        order: number;
    }>();
    let order = 0;
    for (const c of good) {
        for (const b of callBlocks(c.system_prompt, c.user_prompt, c.input_tokens + c.cache_read_tokens + c.cache_write_tokens)) {
            const label = blockKey(b.label);
            const key = `${b.where}|${label}`;
            const had = blocks.get(key) ?? { where: b.where, label, kind: b.kind, tokens: 0, n: 0, files: new Set<string>(), parts: new Set<string>(), order: order++ };
            had.tokens += b.tokens;
            had.n++;
            for (const f of b.files)
                had.files.add(f.path);
            for (const p of b.parts.slice(0, 12))
                had.parts.add(p);
            blocks.set(key, had);
        }
    }
    const avg = (f: (c: (typeof good)[number]) => number) => (good.length ? good.reduce((s, c) => s + f(c), 0) / good.length : 0);
    const out = avg((c) => c.output_tokens);
    const answer = Math.min(out, avg((c) => answerTokens((c.response_text ?? "").length)));
    const models = new Map<string, number>();
    for (const c of good)
        models.set(c.model, (models.get(c.model) ?? 0) + 1);
    const failures = db.all<{
        status: string;
        error: string;
        calls: number;
        last: string;
    }>(sql `select status, substr(coalesce(error, ''), 1, 160) error, count(*) calls, max(created_at) last from llm_calls where task = ${task} and status != 'ok' group by status, substr(coalesce(error, ''), 1, 160) order by last desc`);
    const totals = db.all<{
        n: number;
        bad: number;
    }>(sql `select count(*) n, sum(status != 'ok') bad from llm_calls where task = ${task}`)[0];
    const latest = db.select().from(t).where(eq(t.task, task)).orderBy(desc(t.created_at)).limit(25).all();
    return {
        task,
        step,
        recommended: step ? recommended(step) : null,
        read: good.length,
        models: [...models.entries()].map(([model, calls]) => ({ model, calls })).sort((a, b) => b.calls - a.calls),
        sent: Math.round(avg((c) => c.input_tokens + c.cache_read_tokens + c.cache_write_tokens)),
        cached: Math.round(avg((c) => c.cache_read_tokens)),
        out: Math.round(out),
        answer: Math.round(answer),
        thinking: Math.max(0, Math.round(out - answer)),
        cents: avg((c) => c.cost_usd) * 100,
        seconds: avg((c) => c.duration_ms) / 1000,
        blocks: [...blocks.values()].sort((a, b) => (a.where === b.where ? a.order - b.order : a.where === "system" ? -1 : 1)).map((b) => ({ where: b.where, label: b.label, kind: b.kind, tokens: Math.round(b.tokens / b.n), inCalls: b.n, files: [...b.files], parts: [...b.parts] })),
        failures,
        totalCalls: totals?.n ?? 0,
        totalFailed: totals?.bad ?? 0,
        calls: latest.map((c) => ({ id: c.id, at: c.created_at, model: c.model, ref: [c.ref_type, c.ref_id].filter(Boolean).join(" "), sent: c.input_tokens + c.cache_read_tokens + c.cache_write_tokens, cached: c.cache_read_tokens, out: c.output_tokens, usd: c.cost_usd, seconds: c.duration_ms / 1000, status: c.status, attempt: c.attempt })),
    };
}
