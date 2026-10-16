import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChatAction, ChatMessageRow, ChatRow, OutputJobRow, PrepStage } from "@/db/schema";
import { estimate } from "../production/engine";
import { aboutLength } from "../script-metrics";
import { getRun } from "../studio/engine";
import { listAngles } from "../builder/store";
import { OUTPUT_INFO } from "../taxonomy";
import { creativeType, typeWords } from "./creative-types";
import { callName, skillCall, STAGE_CHOICES } from "./skill-calls";
import { brandNames } from "./names";
import { liveMessageIds, listMessages } from "./store";
import { TOOL_WORDS, type ActionView, type Card, type ChatView, type JobCard, type MessageView } from "./types";
const assetUrl = (file: string) => `/api/assets/${file.replace(/^assets\//, "")}`;
function imageCard(a: ChatAction, running: boolean): Card | null {
    const run = a.result.set_id ? getRun(a.result.set_id) : undefined;
    if (!run)
        return null;
    const only = a.result.item_ids;
    const items = run.items.map((item, at) => ({ item, n: at + 1 })).filter((x) => !only || only.includes(x.item.id));
    const images = items.flatMap(({ item, n }) => {
        const newest = new Map<string, (typeof item.outputs)[number]>();
        for (const o of item.outputs)
            if (!newest.has(o.aspect) || o.version > newest.get(o.aspect)!.version)
                newest.set(o.aspect, o);
        return [...newest.values()].map((o) => ({ itemId: item.id, n, url: `/api/assets/${o.path}?w=480`, full: `/api/assets/${o.path}`, title: item.plan?.title || item.label, ok: o.qa ? o.qa.status !== "fail" : null }));
    });
    const total = items.length * run.aspects.length;
    const planned = items.filter((x) => x.item.plan).length;
    const remaking = !!only && items.some((x) => x.item.status === "rendering");
    const progress = !running ? "" : remaking ? "Making it again." : run.status === "rendering" || (images.length && !only) ? `Making the images: ${images.length} of ${total} done.` : `Writing the plan: ${planned} of ${items.length} written.`;
    return {
        type: "images",
        setId: run.id,
        title: run.title,
        images,
        progress,
        note: "",
        links: [{ label: "Open the set", href: `/studio/${run.id}` }, ...(images.length && !only ? [{ label: `Download ${images.length === 1 ? "it" : `all ${images.length}`}`, href: `/api/studio/${run.id}/download?what=zip` }] : [])],
    };
}
function scriptCard(a: ChatAction, running: boolean): Card | null {
    const ids = a.result.script_ids ?? [];
    const wanted = a.tool === "write_scripts" ? Number((a.args.intent as {
        count?: number;
    } | undefined)?.count ?? ids.length) : ids.length;
    if (!ids.length && !running)
        return null;
    const rows = ids.length ? db.select().from(schema.scripts).where(inArray(schema.scripts.id, ids)).all() : [];
    return {
        type: "scripts",
        scripts: ids.flatMap((id) => rows.filter((s) => s.id === id)).map((s) => ({ id: s.id, title: s.title, seconds: s.est_seconds ?? 0, version: s.version, lines: s.lines.map((l) => ({ beat: l.beat, text: l.text })), flags: s.audit.filter((x) => x.status === "fail").length })),
        progress: running ? (a.tool === "change_script" ? "Rewriting it." : a.tool === "transpose_script" ? "Retelling it." : `Writing the scripts: ${ids.length} of ${wanted} written. Each takes 1 to 3 minutes.`) : "",
        note: "",
        links: ids.length > 1 && a.result.concept_id ? [{ label: "All scripts of this concept", href: `/scripts?concept=${a.result.concept_id}` }] : [],
    };
}
const THING: Record<string, string> = { plan: "the plan", character: "the character sheet", look: "the look frame", storyboard: "the storyboard" };
const RUN_LABEL: Record<string, string> = { plan: "Write the plan", brief: "Write the brief", render: "Make the images", character: "Make the character sheet", look: "Make the look frame", storyboard: "Make the storyboard", clips: "Make the video clips", finish: "Join the clips", motion: "Add motion graphics" };
const DOING: Record<string, string> = { plan: "Writing the plan.", brief: "Writing the brief.", render: "Making the images.", character: "Drawing the character sheet.", look: "Making the look frame.", storyboard: "Drawing the storyboard.", clips: "Making the video clips. This takes several minutes.", finish: "Joining the clips.", motion: "Adding motion graphics." };
export function jobCard(job: OutputJobRow, title: string, working: boolean): JobCard {
    const p = job.production;
    const video = job.output_type.startsWith("ai_");
    const next = p?.next ?? "done";
    const busy = working || job.status === "running";
    const approving = next.startsWith("approve:") ? next.slice(8) : null;
    const card: JobCard = { type: "job", jobId: job.id, label: OUTPUT_INFO[job.output_type]?.label ?? "Ad", title, video, busy, state: "", plan: [], panels: [], buttons: [], redo: false, media: [], checks: [], error: busy ? null : job.error, href: "/production" };
    if (!p)
        return card;
    if (approving === "plan" || (!video && next === "render")) {
        if (p.image_plan) {
            card.plan = [
                ...p.image_plan.cards.map((c, k) => ({ heading: p.image_plan!.cards.length > 1 ? `Card ${k + 1}: ${c.purpose}` : "On the image", lines: c.text_elements.length ? c.text_elements.map((t) => `${t.role}: ${t.text}`) : [c.description] })),
                { heading: "In the feed", lines: [`Headline: ${p.image_plan.ad_copy.headlines[0] ?? ""}`, p.image_plan.ad_copy.primary_text.short].filter((l) => l.trim()) },
            ];
        }
        else if (p.video_plan) {
            card.plan = [
                { heading: "The idea", lines: [p.video_plan.visual_direction, `Setting: ${p.video_plan.cast.setting}`].filter((l) => l.trim()) },
                ...p.video_plan.segments.map((s, k) => ({ heading: p.video_plan!.segments.length > 1 ? `Clip ${k + 1}` : "The clip", lines: s.scenes.map((sc) => `${sc.visual}${sc.dialogue ? ` Says: "${sc.dialogue}"` : ""}${sc.overlay ? ` On screen: ${sc.overlay}` : ""}`) })),
            ];
        }
        card.checks = p.audit.filter((a) => a.status !== "pass").slice(0, 5).map((a) => `${a.status === "fail" ? "Flagged" : "Look at"}: ${a.message}`);
    }
    if (approving && approving !== "plan") {
        const stage = p[approving as "character" | "look" | "storyboard"] as PrepStage | undefined;
        if (stage)
            card.panels = (stage.panels.length ? stage.panels : [stage.file]).map((f, k) => ({ url: assetUrl(f), selected: k === stage.selected }));
    }
    card.media = job.assets.filter((a) => a.kind !== "text").map((a) => ({ url: `/api/assets/${a.path}`, kind: a.kind === "video" ? "video" : a.kind === "doc" ? "doc" : "image", caption: a.caption ?? "" }));
    if (busy)
        card.state = DOING[next] ?? "Working on it.";
    else if (approving) {
        card.state = `Read ${THING[approving] ?? "it"} and approve it, or say what should change.`;
        card.buttons = [{ op: "approve", label: approving === "plan" && !video ? "Approve and make it" : `Approve ${THING[approving] ?? "it"}`, primary: true }];
        card.redo = true;
    }
    else if (next === "done") {
        card.state = job.assets.length ? "It is made." : "Finished.";
        card.redo = !video && !!p.image_plan;
    }
    else if (next === "motion") {
        card.state = "The video is joined and captioned. Motion graphics can be added on top.";
        card.buttons = [
            { op: "run", label: RUN_LABEL.motion, primary: true },
            { op: "skip_motion", label: "Finish without them", primary: false },
        ];
    }
    else {
        card.state = job.error ? "It stopped before this step finished." : "Ready for the next step.";
        card.buttons = [{ op: "run", label: job.error ? `Try again: ${RUN_LABEL[next] ?? "the next step"}` : (RUN_LABEL[next] ?? "Carry on"), primary: true }];
    }
    const cost = estimate(p);
    if (!busy && next !== "done" && (cost.videoUsd > 0 || cost.images > 0))
        card.cost = `Still to make: ${cost.images ? `${cost.images} image${cost.images === 1 ? "" : "s"}` : ""}${cost.images && cost.videoUsd ? " and " : ""}${cost.videoUsd ? `about $${cost.videoUsd.toFixed(2)} of video (${cost.clips} clip${cost.clips === 1 ? "" : "s"}, ${aboutLength(cost.seconds)})` : ""}.`;
    return card;
}
function cardsOf(a: ChatAction, running: boolean, jobs: Map<string, OutputJobRow>, titles: Map<string, string>, liveJobs: Set<string>): Card[] {
    const out: Card[] = [];
    if (a.result.job_ids?.length) {
        for (const id of a.result.job_ids) {
            const job = jobs.get(id);
            if (job)
                out.push(jobCard(job, titles.get(job.script_id) ?? "", liveJobs.has(id) || (running && job.production?.next !== "done" && !job.production?.next.startsWith("approve:"))));
        }
    }
    else if (a.tool === "make_images" || a.tool === "change_image") {
        const c = imageCard(a, running);
        if (c)
            out.push(c);
    }
    else if (a.tool === "write_scripts" || a.tool === "change_script" || a.tool === "make_from_script" || a.tool === "transpose_script") {
        const c = scriptCard(a, running);
        if (c)
            out.push(c);
    }
    if (a.result.report)
        out.push({ type: "report", report: a.result.report });
    if (a.result.copy)
        out.push({ type: "copy", what: a.result.copy.what, options: a.result.copy.options });
    if (a.result.check)
        out.push({ type: "check", check: a.result.check });
    if (a.result.file)
        out.push({ type: "file", url: `/api/assets/${a.result.file.path}`, kind: a.result.file.kind, caption: a.result.file.seconds ? `${a.result.file.seconds} seconds` : "" });
    return out;
}
export function chatView(chat: ChatRow): ChatView {
    const rows = listMessages(chat.id);
    const live = liveMessageIds(rows.filter((m) => m.role === "assistant" && (m.status === "thinking" || m.status === "working")).map((m) => m.id));
    const jobIds = [...new Set(rows.flatMap((m) => m.actions.flatMap((a) => a.result.job_ids ?? [])))];
    const jobRows = jobIds.length ? db.select().from(schema.outputJobs).where(inArray(schema.outputJobs.id, jobIds)).all() : [];
    const jobs = new Map(jobRows.map((j) => [j.id, j]));
    const titles = new Map((jobRows.length ? db.select({ id: schema.scripts.id, title: schema.scripts.title }).from(schema.scripts).where(inArray(schema.scripts.id, jobRows.map((j) => j.script_id))).all() : []).map((s) => [s.id, s.title]));
    const liveJobs = new Set(jobIds.length ? db.select({ ref: schema.jobs.ref_id }).from(schema.jobs).where(and(inArray(schema.jobs.kind, ["chat", "production"]), inArray(schema.jobs.ref_id, jobIds), inArray(schema.jobs.status, ["queued", "running"]))).all().map((j) => j.ref!) : []);
    const costs = new Map(rows.length ? db.select({ ref: schema.llmCalls.ref_id, c: sql<number> `coalesce(sum(${schema.llmCalls.cost_usd}), 0)` }).from(schema.llmCalls).where(and(eq(schema.llmCalls.ref_type, "chat"), inArray(schema.llmCalls.ref_id, rows.map((m) => m.id)))).groupBy(schema.llmCalls.ref_id).all().map((r) => [r.ref!, r.c]) : []);
    const names = brandNames(chat.brand_id, [...new Set(rows.flatMap((m) => m.tags.references))]);
    const angles = listAngles(chat.brand_id);
    const sets = new Map<string, string[]>();
    const itemNumber = (setId: string, itemId?: string) => {
        if (!sets.has(setId))
            sets.set(setId, getRun(setId)?.items.map((i) => i.id) ?? []);
        return sets.get(setId)!.indexOf(itemId ?? "") + 1;
    };
    const messages: MessageView[] = rows.map((m: ChatMessageRow) => {
        const working = m.role === "assistant" && (m.status === "thinking" || m.status === "working") && live.has(m.id);
        const actions: ActionView[] = m.actions.map((a) => {
            const running = working && a.status === "running";
            return { id: a.id, tool: a.tool, says: a.says || TOOL_WORDS[a.tool].label, status: a.status, error: a.error ?? null, note: a.result.note ?? "", cards: cardsOf(a, running, jobs, titles, liveJobs) };
        });
        return {
            id: m.id,
            role: m.role,
            text: m.text,
            at: m.created_at,
            status: m.role === "assistant" && (m.status === "thinking" || m.status === "working") && !working ? "stopped" : m.status,
            tags: [
                ...(skillCall(m.tags.skill) ? [{ type: "Recipe", label: callName(skillCall(m.tags.skill)!) }] : []),
                ...(creativeType(m.tags.format) ? [{ type: "Type", label: typeWords(creativeType(m.tags.format)!) }] : []),
                ...(m.tags.stage && STAGE_CHOICES.some((s) => s.id === m.tags.stage) ? [{ type: "Stage", label: STAGE_CHOICES.find((s) => s.id === m.tags.stage)!.label }] : []),
                ...names.products.filter((p) => m.tags.products.includes(p.id)).map((p) => ({ type: "Product", label: p.name })),
                ...names.personas.filter((p) => m.tags.personas.includes(p.id)).map((p) => ({ type: "Persona", label: p.name })),
                ...names.offers.filter((o) => m.tags.offers.includes(o.id)).map((o) => ({ type: "Offer", label: o.name })),
                ...angles.filter((a) => a.id === m.tags.angle).map((a) => ({ type: "Angle", label: a.name })),
                ...names.references.filter((r) => m.tags.references.includes(r.id)).map((r) => ({ type: "Reference", label: r.title })),
                ...m.tags.made.map((x) => ({ type: "About", label: x.type === "image" ? `Image ${itemNumber(x.id, x.item) || ""}`.trim() : x.type === "script" ? "This script" : x.type === "job" ? "This ad" : "These images" })),
            ],
            actions,
            question: m.question,
            suggestions: m.suggestions,
            sources: m.sources,
            error: m.error,
            readBy: m.read_by,
            cost: costs.get(m.id) ?? 0,
        };
    });
    const busy = messages.some((m) => m.status === "thinking" || m.status === "working" || m.actions.some((a) => a.cards.some((c) => c.type === "job" && c.busy)));
    return { id: chat.id, title: chat.title, messages, busy };
}
