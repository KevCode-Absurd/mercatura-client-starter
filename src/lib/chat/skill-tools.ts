import { eq } from "drizzle-orm";
import { angleReport } from "../angles/server";
import { FAMILIES } from "../formats/families";
import { familiesOfBrand } from "../formats/tally";
import { hookBankReport } from "../hooks/for-script";
import { organicReport } from "../organic/report";
import { db, schema } from "@/db";
import type { ChatAction, ChatReport } from "@/db/schema";
import { guideModel, writeTokens } from "../brain/guide";
import { coverageInput } from "../coverage/account";
import { coverage, pct } from "../coverage/analyze";
import { DIMENSION_INFO } from "../coverage/model";
import { getFounderAnswers, loadQuestionnaire } from "../founder";
import { founderProgress, isAnswered } from "../founder-questions";
import { auditCapture } from "../landing/audit";
import { capturePage, normaliseUrl } from "../landing/capture";
import { createPage, createScan, finishScan, getPage } from "../landing/store";
import { KIND_LABEL, type PageKind } from "../landing/types";
import { writePage } from "../landing/write";
import { llmEnabled } from "../llm/gateway";
import { buildOfferSet } from "../builder/offer-set";
import { listBrandOffers } from "../offers/book";
import { buildOffers } from "../offers/build";
import { BrandBrainError } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { makeHookClip, storedHooks, whyNoHooks, writeHooks } from "../references/hooks";
import { transposeScript } from "../scripts/engine";
import { createSprint, getSprint, planSprint } from "../sprint/engine";
import { OUTPUT_INFO, type OutputType } from "../taxonomy";
import type { Sink } from "./make";
const LIVE = (what: string) => new Error(`${what} needs live mode: switch it on in Settings.`);
const short = (s: string, n = 160) => s.replace(/\s+/g, " ").trim().slice(0, n);
async function hooks(brandId: string, args: {
    reference_id: string;
    count: number;
    note: string;
}, sink: Sink): Promise<void> {
    if (!llmEnabled())
        throw LIVE("Writing new hooks");
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, args.reference_id)).get();
    if (!ref)
        throw new Error("That reference ad no longer exists.");
    const why = whyNoHooks(ref);
    if (why)
        throw new Error(why);
    sink.save({ reference_id: ref.id });
    const before = new Set((storedHooks(ref.id)?.hooks ?? []).map((h) => h.id));
    const set = await writeHooks(brandId, ref.id, { count: args.count, note: args.note || undefined });
    const fresh = set.hooks.filter((h) => !before.has(h.id));
    const shown = fresh.length ? fresh : set.hooks.slice(-args.count);
    const report: ChatReport = {
        title: `${shown.length} new hooks for "${ref.title}"`,
        summary: `The ad opens with ${set.original.device ? `a ${set.original.device.replace(/^(?:a|an|the)\s+/i, "").replace(/\.$/, "").toLowerCase()}` : "its own hook"}: "${short(set.original.spoken || set.original.on_screen || set.original.visual, 120)}". Each new one hands over to the same first line of the body: "${short(set.body.first_line, 100)}".`,
        sections: [
            {
                heading: "The new openings",
                lines: shown.map((h, k) => `${k + 1}. ${h.device ? `[${h.device}] ` : ""}${h.spoken ? `"${short(h.spoken, 140)}"` : short(h.visual, 140)}${h.on_screen && h.spoken ? ` · on screen: "${short(h.on_screen, 60)}"` : ""}${h.check && !h.check.ok ? ` · the second reader doubts it: ${short(h.check.note, 100)}` : ""}`),
            },
        ],
        links: [{ label: "Open the ad's hooks", href: `/references/${ref.id}` }],
        asks: shown.slice(0, 4).map((_, k) => `Make a clip of hook ${k + 1}`),
    };
    sink.save({ report });
}
function hookClip(brandId: string, args: {
    reference_id: string;
    hook_id: string;
    type: OutputType;
}, sink: Sink): void {
    if (sink.had.job_ids?.length)
        return;
    const made = makeHookClip(brandId, args.reference_id, args.hook_id, args.type);
    sink.save({ job_ids: [made.jobId], script_ids: [made.scriptId], note: `1 clip of up to 5 seconds,${OUTPUT_INFO[args.type]?.label ?? "video"}. Its plan is written first and waits for you here.` });
}
async function offers(brandId: string, args: {
    set: boolean;
    count: number;
    notes: string;
}, sink: Sink): Promise<void> {
    if (!llmEnabled())
        throw LIVE(args.set ? "Writing the offer set" : "Building offers");
    if (args.set) {
        const before = new Set(listBrandOffers(brandId).map((o) => o.id));
        const r = await buildOfferSet(brandId, { count: args.count, notes: args.notes || undefined });
        const fresh = listBrandOffers(brandId).filter((o) => !before.has(o.id));
        sink.save({
            offer_ids: fresh.map((o) => o.id),
            report: {
                title: `The offer set: ${r.made} written`,
                summary: r.note || `${r.made} offer${r.made === 1 ? "" : "s"} added to the brand brain, each for a buyer and a stage. The script builder ticks from them now.`,
                sections: fresh.length ? [{ heading: "Added", lines: fresh.map((o) => `${o.name}: ${short(o.say || o.terms, 140)}${o.running ? " (running today)" : ""}`) }] : [],
                links: [{ label: "Open the offers", href: "/offers" }],
                asks: [],
            },
        });
        return;
    }
    const r = await buildOffers(brandId, { count: args.count, notes: args.notes || undefined });
    sink.save({
        offer_ids: r.made.map((o) => o.id),
        report: {
            title: `${r.made.length} offer draft${r.made.length === 1 ? "" : "s"}`,
            summary: `${r.note ? `${r.note} ` : ""}Each is a draft on the Offers screen, with its 7 checks. None is in use until you put it there.${r.skipped ? ` ${r.skipped} failed a check and ${r.skipped === 1 ? "was" : "were"} not kept.` : ""}`,
            sections: [{ heading: "The drafts", lines: r.made.map((o) => `${o.name} (${o.mechanic.replace(/_/g, " ")}): ${short(o.headline, 110)}${o.terms ? ` · ${short(o.terms, 100)}` : ""}`) }],
            links: [{ label: "Open the offers", href: "/offers" }],
            asks: [],
        },
    });
}
async function sprint(brandId: string, args: {
    size: number;
    split: Record<string, number>;
    personas: string[];
    notes: string;
}, sink: Sink): Promise<void> {
    let id = sink.had.sprint_id;
    if (!id || !getSprint(id)) {
        id = createSprint({ brandId, size: args.size, split: args.split, notes: args.notes, options: { personas: args.personas } });
        sink.save({ sprint_id: id });
    }
    const before = getSprint(id)!;
    if (before.status === "draft" || before.status === "failed" || before.status === "planning")
        await planSprint(id);
    const s = getSprint(id)!;
    const groups = new Map<string, number>();
    for (const slot of s.slots)
        groups.set(slot.group, (groups.get(slot.group) ?? 0) + 1);
    const GROUP_WORDS: Record<string, string> = { scale: "more of what works", underused: "formats the account has not used", angle: "new angles", experimental: "experiments" };
    sink.save({
        report: {
            title: s.title,
            summary: `${s.slots.length} ads planned across ${s.angles.length} angle${s.angles.length === 1 ? "" : "s"}${groups.size ? `: ${[...groups.entries()].map(([g, n]) => `${n} ${GROUP_WORDS[g] ?? g}`).join(", ")}` : ""}. Nothing is written or drawn yet: read the plan and approve it on its screen, and the briefs come next.`,
            sections: [
                { heading: "The angles", lines: s.angles.slice(0, 8).map((a) => `${a.name}: ${short(a.line, 130)}`) },
                { heading: "The first ideas", lines: s.slots.slice(0, 5).map((x) => `${x.n}. ${short(x.idea, 150)}`) },
            ],
            links: [{ label: "Open the sprint and approve the plan", href: `/studio/sprint/${id}` }],
            asks: [],
        },
    });
}
async function auditPage(brandId: string, args: {
    url: string;
}, sink: Sink): Promise<void> {
    const target = normaliseUrl(args.url);
    const scan = createScan(brandId, "capture", target);
    finishScan(scan.id, { status: "running" });
    let capture;
    try {
        capture = await capturePage(target, scan.id);
        finishScan(scan.id, { status: "done", result: capture as unknown as Record<string, unknown> });
    }
    catch (e) {
        const first = (e as Error).message.split("\n")[0];
        finishScan(scan.id, { status: "failed", error: first });
        throw new Error(/Timeout/i.test(first) ? "The page took more than 45 seconds to load." : /ERR_|ENOTFOUND/i.test(first) ? "The page could not be reached from this machine. Check the address." : first);
    }
    let brand = null;
    try {
        brand = loadBrandBrain(brandId);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const audit = auditCapture(scan.id, capture, brand);
    const row = createScan(brandId, "audit", audit.url, null);
    finishScan(row.id, { status: "done", result: audit as unknown as Record<string, unknown> });
    const fails = audit.checks.filter((c) => c.status === "fail");
    const warns = audit.checks.filter((c) => c.status === "warn");
    sink.save({
        report: {
            title: `${audit.title}: ${audit.score} out of 100`,
            summary: `Read as a phone would. ${fails.length} check${fails.length === 1 ? "" : "s"} failed and ${warns.length} ${warns.length === 1 ? "is" : "are"} worth a look, of ${audit.checks.filter((c) => c.status !== "na").length} that applied.`,
            sections: [
                ...(fails.length ? [{ heading: "Failed", lines: fails.map((c) => `${c.label}: ${short(c.message, 140)}`) }] : []),
                { heading: "Fix first", lines: audit.backlog.slice(0, 5).map((b, k) => `${k + 1}. ${short(b.hypothesis, 200)}`) },
            ],
            links: [{ label: "Open the audit", href: "/landing/cro" }],
            asks: [],
        },
    });
}
function gaps(brandId: string, sink: Sink): void {
    const input = coverageInput(brandId);
    const cov = coverage(input);
    const simulated = input.account.simulated;
    const personaName = (id: string) => input.personas.find((p) => p.id === id)?.name ?? id;
    const fam = familiesOfBrand(brandId);
    sink.save({
        report: {
            title: "Where the ads are thin",
            summary: `${simulated ? "Read on a simulated account: connect the brand's own ads for the real picture. " : ""}${cov.totals.active} active ad${cov.totals.active === 1 ? "" : "s"}${cov.cold_share !== null ? `, ${pct(cov.cold_share)} of them for buyers who do not know you yet` : ""}. ${cov.gaps.length} gap${cov.gaps.length === 1 ? "" : "s"}, biggest first.`,
            sections: [
                { heading: "The gaps", lines: cov.gaps.slice(0, 6).map((g) => `${DIMENSION_INFO[g.dimension].label}, ${g.label}: ${short(g.why, 150)}`) },
                ...(cov.winners.length ? [{ heading: "Winners to vary", lines: cov.winners.slice(0, 3).map((w) => `${short(w.ad.name || w.ad.id, 60)}: ${w.times.toFixed(1)} times the account's return${w.ad.persona_id ? `, for ${personaName(w.ad.persona_id)}` : ""}`) }] : []),
                { heading: "Static ads, by the way they argue", lines: [...FAMILIES.map((f) => `${f.label}: ${fam.tally.counts[f.id]}. Reach for it when: ${f.reach_when}`), fam.line] },
                ...(cov.fixes.length ? [{ heading: "1 weak part", lines: cov.fixes.slice(0, 3).map((f) => `${short(f.ad.name || f.ad.id, 60)}: the ${f.part}. ${short(f.why, 120)}`) }] : []),
            ],
            links: [{ label: "Open Coverage and write scripts for the gaps", href: "/coverage" }],
            asks: [],
        },
    });
}
function guide(brandId: string, sink: Sink): void {
    const m = guideModel(brandId);
    const file = writeTokens(brandId);
    sink.save({
        report: {
            title: `The ${m.brand} brand guide`,
            summary: `5 printable pages built from the brand brain as it stands today: ${m.colors.length} colour${m.colors.length === 1 ? "" : "s"}, ${m.fonts.length} typeface${m.fonts.length === 1 ? "" : "s"}, the voice, what it never says and never shows. The tokens file is written beside it.`,
            sections: [
                ...(m.colors.length ? [{ heading: "Colours", lines: m.colors.slice(0, 8).map((c) => `${c.name}: ${c.hex}${c.use ? ` · ${short(c.use, 80)}` : ""}`) }] : []),
                ...(m.fonts.length ? [{ heading: "Type", lines: m.fonts.slice(0, 4).map((f) => `${f.role}: ${f.family}`) }] : []),
                ...(m.dos.length || m.donts.length ? [{ heading: "Voice", lines: [...m.dos.slice(0, 3).map((d) => `Do: ${short(d, 120)}`), ...m.donts.slice(0, 3).map((d) => `Don't: ${short(d, 120)}`)] }] : []),
            ],
            links: [
                { label: "Open the guide", href: "/brand/guide" },
                { label: "Download the guide", href: "/api/brand/guide?download=1" },
                { label: "Download the tokens", href: "/api/brand/guide?file=tokens" },
            ],
            asks: [],
        },
        note: file ? "" : undefined,
    });
}
function founder(brandId: string, sink: Sink): void {
    const sections = loadQuestionnaire();
    const answers = getFounderAnswers(brandId);
    const p = founderProgress(sections, answers);
    const open = sections.flatMap((s) => s.questions.filter((q) => !isAnswered(answers[q.id]) && !answers[q.id]?.skipped).map((q) => ({ ...q, section: s.title })));
    const next = [...open.filter((q) => q.core), ...open.filter((q) => !q.core)].slice(0, 5);
    sink.save({
        report: {
            title: p.answered ? `${p.answered} of ${p.total} answered` : "The founder interview has not started",
            summary: `${p.coreAnswered} of the ${p.core} core questions are answered${p.skipped ? `, ${p.skipped} skipped` : ""}. The answers go into the brand brain with the founder as their source; a founder's statement is not proof until its document is on file.`,
            sections: next.length ? [{ heading: "Next to answer", lines: next.map((q) => `${q.id}${q.core ? " (core)" : ""}, ${q.section}: ${q.text}`) }] : [{ heading: "Every question is answered", lines: ["Write the file out on the interview screen so the brand brain reads it."] }],
            links: [{ label: "Open the interview", href: "/brand/founder" }],
            asks: [],
        },
    });
}
async function page(brandId: string, args: {
    kind: PageKind;
    product_id: string | null;
    persona_id: string | null;
    offer_id: string | null;
    angle: string;
}, sink: Sink): Promise<void> {
    let id = sink.had.page_id;
    if (!id || !getPage(id)) {
        const row = createPage(brandId, { source: { kind: "scratch", ref: null, label: "From the chat" }, kind: args.kind, productId: args.product_id, personaId: args.persona_id, offerId: args.offer_id, angle: args.angle || undefined });
        id = row.id;
        sink.save({ page_id: id });
    }
    const written = llmEnabled() ? await writePage(id) : getPage(id)!;
    const fails = written.checks.filter((c) => c.status === "fail").length;
    const on = written.sections.filter((s) => s.on);
    sink.save({
        report: {
            title: written.title,
            summary: `A ${KIND_LABEL[written.kind].label.toLowerCase()} of ${on.length} sections${written.writer === "draft" ? ", drafted from the brand's own facts (every number on it comes from the brain). Live mode has the writer rewrite its words." : ", written by the model on the brand's own facts."}${fails ? ` ${fails} check${fails === 1 ? "" : "s"} failed: read them on the page.` : " Every check passes."}`,
            sections: [{ heading: "Sections", lines: on.map((s) => s.type.replace(/_/g, " ")) }],
            links: [{ label: "Open the page", href: `/landing/pages/${id}` }],
            asks: [],
        },
    });
}
async function transpose(brandId: string, args: {
    script_id: string;
    person: "first" | "second" | "third" | null;
    tense: "past" | "present" | "future" | null;
}, sink: Sink): Promise<void> {
    if (!llmEnabled())
        throw LIVE("Retelling a script");
    if (sink.had.script_ids?.length)
        return;
    const row = db.select({ brand: schema.scripts.brand_id, axes: schema.scripts.axes }).from(schema.scripts).where(eq(schema.scripts.id, args.script_id)).get();
    if (!row || row.brand !== brandId)
        throw new Error("That script no longer exists.");
    const person = args.person ?? (row.axes.person === "second" ? "first" : "second");
    const tense = args.tense ?? (person === "second" ? "present" : "past");
    const id = await transposeScript({ scriptId: args.script_id, person, tense });
    sink.save({ script_ids: [id], note: `Told in the ${person} person, ${tense} tense. The beats, the claims and the numbers are the original's.` });
}
export async function runSkillTool(brandId: string, a: ChatAction, sink: Sink): Promise<boolean> {
    const arg = <T>() => a.args as unknown as T;
    switch (a.tool) {
        case "write_hooks":
            await hooks(brandId, arg(), sink);
            return true;
        case "make_hook_clip":
            hookClip(brandId, arg(), sink);
            return true;
        case "build_offers":
            await offers(brandId, arg(), sink);
            return true;
        case "plan_sprint":
            await sprint(brandId, arg(), sink);
            return true;
        case "audit_page":
            await auditPage(brandId, arg(), sink);
            return true;
        case "audit_gaps":
            gaps(brandId, sink);
            return true;
        case "print_guide":
            guide(brandId, sink);
            return true;
        case "founder_questions":
            founder(brandId, sink);
            return true;
        case "draft_page":
            await page(brandId, arg(), sink);
            return true;
        case "transpose_script":
            await transpose(brandId, arg(), sink);
            return true;
        case "list_angles":
            sink.save({ report: angleReport(brandId) });
            return true;
        case "organic_plan":
            sink.save({ report: organicReport(brandId) });
            return true;
        case "video_editor": {
            const mode = a.args.mode === "organic" ? "organic" : "ad";
            sink.save({ report: { title: mode === "organic" ? "Organic Video Editor" : "Ecommerce Video Editor", summary: "Upload your existing clips, choose the cut order and in/out times, and optionally add music and timed captions. Export a separate MP4 from the editor.", sections: [], links: [{ label: "Open the video editor", href: `/video-editing?mode=${mode}` }], asks: [] } });
            return true;
        }
        case "list_hooks":
            sink.save({ report: hookBankReport(brandId, a.args as {
                    persona_id?: string | null;
                    stage?: string | null;
                }) });
            return true;
        default:
            return false;
    }
}
