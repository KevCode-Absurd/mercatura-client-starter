import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { OUTPUT_INFO, type OutputType } from "../taxonomy";
import { readCroRun } from "../landing/studio-store";
import { pastTime } from "./past-time-server";
const BIG = ["script", "studio", "sprint", "production", "personas", "offers", "chat", "landing", "creator_discovery"] as const;
const SMALL = ["preprocess", "extract", "cluster", "analyze_reference"] as const;
export interface Activity {
    id: string;
    kind: string;
    status: "queued" | "running" | "paused";
    stopping: boolean;
    label: string;
    href: string;
    since: string;
    spent: number;
    note: string | null;
    expect: number;
}
export interface Finished {
    id: string;
    kind: string;
    outcome: "done" | "failed";
    label: string;
    said: string;
    href: string;
    error: string | null;
}
export interface ActivityView {
    jobs: Activity[];
    finished: Finished[];
    small: {
        running: number;
        queued: number;
        each: number;
    };
}
function describe(j: typeof schema.jobs.$inferSelect): {
    label: string;
    href: string;
    refs: string[];
} {
    if (j.kind === "creator_discovery")
        return { label: "Creators: researching brand collaborators", href: "/creators", refs: [j.ref_id!] };
    const p = j.payload as {
        op?: string;
    };
    if (j.kind === "sprint") {
        const s = db.select({ title: schema.sprints.title, sets: schema.sprints.set_ids }).from(schema.sprints).where(eq(schema.sprints.id, j.ref_id!)).get();
        const what = p.op === "briefs" ? "writing the briefs" : p.op === "render" ? "rendering the images" : "writing the plan";
        return { label: `${s?.title ?? j.ref_id}: ${what}`, href: `/studio/sprint/${j.ref_id}`, refs: [j.ref_id!, ...(s?.sets ?? [])] };
    }
    if (j.kind === "studio") {
        const r = db.select({ title: schema.studioRuns.title }).from(schema.studioRuns).where(eq(schema.studioRuns.id, j.ref_id!)).get();
        return { label: `${r?.title ?? j.ref_id}: ${p.op === "render" ? "rendering" : p.op === "claims" ? "checking the claims" : p.op === "review" ? "reviewing the ads" : "writing the plan"}`, href: `/studio/${j.ref_id}`, refs: [j.ref_id!] };
    }
    if (j.kind === "chat") {
        if (p.op === "job_step")
            return { label: `Production job ${j.ref_id}: the next step`, href: "/chat", refs: [j.ref_id!] };
        const m = db.select({ chat: schema.chatMessages.chat_id, actions: schema.chatMessages.actions }).from(schema.chatMessages).where(eq(schema.chatMessages.id, j.ref_id!)).get();
        const made = (m?.actions ?? []).flatMap((a) => [a.result.set_id, ...(a.result.script_ids ?? []), ...(a.result.job_ids ?? [])]).filter((x): x is string => !!x);
        const doing = m?.actions.find((a) => a.status === "running") ?? m?.actions[0];
        return { label: doing ? `Chat: ${doing.says.slice(0, 70)}` : "Chat: reading your message", href: m ? `/chat?c=${m.chat}` : "/chat", refs: [j.ref_id!, ...made] };
    }
    if (j.kind === "personas" && p.op === "starter")
        return { label: "Script builder: writing the personas, angles and offers", href: "/builder", refs: [j.brand_id] };
    if (j.kind === "personas")
        return { label: p.op === "avatar" ? "Avatars: drawing the picture" : p.op === "draw" ? "Personas: drawing the pictures" : "Personas: building from the data", href: "/personas", refs: [j.brand_id] };
    if (j.kind === "offers")
        return { label: p.op === "research" ? "Offers: researching an industry" : "Offers: designing", href: "/offers", refs: [j.brand_id] };
    if (j.kind === "landing") {
        if (p.op === "cro") {
            let title = "CRO Studio", stage = "working on the page";
            try {
                const run = readCroRun(j.brand_id, j.ref_id!);
                title = run.blueprint?.title || run.evidence?.title || run.brand.productName || run.brand.name;
                stage = run.stage || stage;
            }
            catch { }
            return { label: `CRO: ${title}: ${stage}`, href: `/landing/studio?id=${encodeURIComponent(j.ref_id!)}`, refs: [j.ref_id!] };
        }
        const lp = db.select({ title: schema.landingPages.title }).from(schema.landingPages).where(eq(schema.landingPages.id, j.ref_id!)).get();
        return { label: `Landing page "${lp?.title ?? j.ref_id}": writing the words`, href: `/landing/pages/${j.ref_id}`, refs: [j.ref_id!] };
    }
    if (j.kind === "production") {
        const o = db.select({ type: schema.outputJobs.output_type, script: schema.outputJobs.script_id }).from(schema.outputJobs).where(eq(schema.outputJobs.id, j.ref_id!)).get();
        return { label: `Production job ${j.ref_id}${o ? ` (${o.type.replace(/_/g, " ")})` : ""}`, href: "/production", refs: [j.ref_id!] };
    }
    const c = db.select({ name: schema.concepts.name }).from(schema.concepts).where(eq(schema.concepts.id, j.ref_id!)).get();
    const then = (j.payload as {
        then?: {
            type?: string;
        };
    }).then;
    if (then?.type)
        return { label: `${OUTPUT_INFO[then.type as OutputType]?.label ?? "Ad"} for "${c?.name ?? j.ref_id}": writing the script`, href: "/production", refs: [] };
    return { label: `Script for "${c?.name ?? j.ref_id}"`, href: "/scripts", refs: [] };
}
function said(j: typeof schema.jobs.$inferSelect, subject: string): string {
    const op = (j.payload as {
        op?: string;
    }).op;
    if (j.kind === "studio")
        return op === "render" ? `${subject}: the images are ready.` : op === "claims" || op === "review" ? `${subject}: the check is done.` : `${subject}: the plan is ready to review.`;
    if (j.kind === "sprint")
        return op === "render" ? `${subject}: the images are ready.` : op === "briefs" ? `${subject}: the briefs are ready to approve.` : `${subject}: the plan is ready to approve.`;
    if (j.kind === "chat")
        return "It is ready in the chat.";
    if (j.kind === "creator_discovery")
        return "Your creator research is ready to review.";
    if (j.kind === "personas")
        return op === "starter" ? "The personas, angles and offers for the Script builder are written." : op === "avatar" ? "The avatar's picture is drawn." : op === "draw" ? "The persona pictures are drawn." : "The personas are built.";
    if (j.kind === "offers")
        return op === "research" ? "The industry research is done." : "The offers are designed.";
    if (j.kind === "script")
        return `${subject.replace(/^Script for/, "The scripts for")} are written.`;
    if (j.kind === "landing")
        return op === "cro" ? "Your CRO work is ready to review." : `${subject.replace(/: writing the words$/, "")} is written.`;
    return `${subject} is ready.`;
}
const RECENT_MS = 10 * 60 * 1000;
const when = (iso: string) => new Date(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`).getTime();
export function finishedLately(live: (typeof schema.jobs.$inferSelect)[], now = Date.now()): Finished[] {
    const cutoff = new Date(now - RECENT_MS).toISOString();
    const ended = db.select().from(schema.jobs).where(and(inArray(schema.jobs.status, ["done", "failed"]), inArray(schema.jobs.kind, [...BIG]), sql `datetime(${schema.jobs.updated_at}) >= datetime(${cutoff})`)).all();
    const busy = new Set(live.map((j) => `${j.kind}:${j.ref_id}`));
    const newest = new Map<string, typeof schema.jobs.$inferSelect>();
    for (const j of ended) {
        if (now - when(j.updated_at) > RECENT_MS)
            continue;
        const key = `${j.kind}:${j.ref_id}`;
        if (busy.has(key))
            continue;
        const had = newest.get(key);
        if (!had || when(had.updated_at) < when(j.updated_at))
            newest.set(key, j);
    }
    return [...newest.values()]
        .sort((a, b) => when(b.updated_at) - when(a.updated_at))
        .slice(0, 8)
        .map((j) => {
        const d = describe(j);
        const subject = d.label.replace(/: (writing|rendering|checking|reviewing|drawing|building|designing|researching|making)\b.*$/i, "");
        return { id: j.id, kind: j.kind, outcome: j.status === "failed" ? ("failed" as const) : ("done" as const), label: subject, said: said(j, subject), href: d.href, error: j.status === "failed" ? j.error : null };
    });
}
export function activity(): ActivityView {
    const rows = db.select().from(schema.jobs).where(inArray(schema.jobs.status, ["queued", "running", "paused"])).all();
    const jobs = rows
        .filter((j) => (BIG as readonly string[]).includes(j.kind))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((j): Activity => {
        const d = describe(j);
        const spent = d.refs.length ? db.select({ c: sql<number> `coalesce(sum(${schema.llmCalls.cost_usd}), 0)` }).from(schema.llmCalls).where(and(inArray(schema.llmCalls.ref_id, d.refs), gte(schema.llmCalls.created_at, j.created_at))).get()!.c : 0;
        return { id: j.id, kind: j.kind, status: j.status as Activity["status"], stopping: !!j.control, label: d.label, href: d.href, since: j.created_at, spent, note: j.status === "paused" ? j.error : null, expect: pastTime(j.kind, (j.payload as {
                op?: string;
            }).op).seconds };
    });
    const small = rows.filter((j) => (SMALL as readonly string[]).includes(j.kind));
    const each = small.some((j) => j.kind === "analyze_reference") ? pastTime("analyze_reference").seconds : 0;
    return { jobs, finished: finishedLately(rows), small: { running: small.filter((j) => j.status === "running").length, queued: small.filter((j) => j.status === "queued").length, each } };
}
export const smallJobIds = (): string[] => db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(inArray(schema.jobs.kind, [...SMALL]), inArray(schema.jobs.status, ["queued", "running"]))).all().map((j) => j.id);
