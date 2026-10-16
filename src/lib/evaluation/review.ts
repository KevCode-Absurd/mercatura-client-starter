import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "../env";
import { STATIC_BRIEFS } from "./briefs";
import { PairJudgmentSchema } from "./rubric";
import { controlledBriefHash } from "./design";
const numeric = z.number().finite().nonnegative();
const usageSchema = z.object({
    calls: numeric.optional(), input: numeric.optional(), cached: numeric.optional(),
    cacheWrite: numeric.optional(), output: numeric.optional(), textUsd: numeric.optional(),
    mediaCalls: numeric.optional(), mediaUsd: numeric.optional(),
}).passthrough();
const recordSchema = z.object({
    pairId: z.string().min(1), runId: z.string().optional(), status: z.string(), error: z.string().optional(),
    controls: z.record(z.string(), z.unknown()).optional(), plan: z.unknown().optional(),
    image: z.string().optional(), qa: z.unknown().optional(), usage: usageSchema.optional(), request: z.unknown().optional(),
}).passthrough();
const storySchema = z.object({
    avatarId: z.string(), jobId: z.string().optional(), status: z.string(), error: z.string().optional(),
    portrait: z.string().optional(), character: z.string().optional(), opening: z.string().optional(),
    frames: z.array(z.object({ file: z.string().optional() }).passthrough()).optional(),
    plan: z.unknown().optional(), usage: usageSchema.optional(),
}).passthrough();
const resultsSchema = z.object({
    condition: z.string().optional(), baselineCommit: z.string().optional(), renderer: z.string().optional(),
    startedAt: z.string().optional(), statics: z.array(recordSchema), story: storySchema.optional(),
}).passthrough();
export type ReviewRecord = z.infer<typeof recordSchema>;
export type ReviewStory = z.infer<typeof storySchema>;
export type ReviewResults = z.infer<typeof resultsSchema>;
export type ReviewUsage = z.infer<typeof usageSchema>;
export const REVIEW_ARMS = ["before", "after", "refined"] as const;
export type ReviewArm = typeof REVIEW_ARMS[number];
export const REVIEW_ARM_LABELS: Record<ReviewArm, string> = { before: "Before", after: "After", refined: "Transcript-informed" };
const armSchema = z.enum(REVIEW_ARMS);
const judgeResultSchema = z.object({
    judge: z.string(), model: z.string(), pair_id: z.string(), kind: z.enum(["static", "storyboard"]),
    comparison: z.string().optional(),
    arms: z.object({ A: armSchema, B: armSchema }).refine(v => v.A !== v.B),
    judgment: PairJudgmentSchema,
    scores: z.object({ before: numeric.optional(), after: numeric.optional(), refined: numeric.optional() }).optional(),
    usage: z.object({ input: numeric.optional(), cached: numeric.optional(), cacheWrite: numeric.optional(), output: numeric.optional(), usd: numeric.optional() }).passthrough().nullable().optional(),
}).passthrough().refine(v => v.pair_id === v.judgment.pair_id, { message: "Judge result and judgment pair IDs must match" });
const judgesSchema = z.object({
    method: z.string(), judges: z.array(z.object({ id: z.string(), model: z.string() })),
    results: z.array(judgeResultSchema),
    errors: z.array(z.object({ judge: z.string(), pair_id: z.string(), error: z.string() })),
    summary: z.unknown().optional(),
}).passthrough();
export const ReviewJudgesSchema = judgesSchema.refine(v => v.results.every(r => r.arms.A !== "refined" && r.arms.B !== "refined"), { message: "Original judgments must compare before and after" });
export const RefinedReviewJudgesSchema = judgesSchema.refine(v => v.results.every(r => r.arms.A === "refined" || r.arms.B === "refined"), { message: "Refined judgments must include the transcript-informed condition" });
export type ReviewJudges = z.infer<typeof ReviewJudgesSchema>;
export type ReviewJudgeResult = z.infer<typeof judgeResultSchema>;
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : typeof v === "string" ? [v] : [];
export interface ReviewAuditRow {
    path: string;
    group: string;
    purpose: string;
    adaptation: string;
    state: string;
    targets: string[];
    sha256?: string;
    reviews: {
        manifest: string;
        detail: unknown;
    }[];
}
export function reviewAuditRows(audits: readonly {
    name: string;
    value?: unknown;
}[]): {
    source: ReviewAuditRow[];
    runtime: ReviewAuditRow[];
    union: Record<string, unknown>;
    runtimeCounts: Record<string, unknown>;
    runtimeClasses: unknown;
} {
    const source = new Map<string, ReviewAuditRow>();
    const systems = object(audits.find(a => a.name === "systems")?.value);
    for (const audit of audits) {
        const manifest = object(audit.value);
        const rawRows = Array.isArray(manifest.files) ? manifest.files : Array.isArray(manifest.sourceFiles) ? manifest.sourceFiles : [];
        const root = String(manifest.source_root ?? manifest.sourceRoot ?? "").replaceAll("\\", "/");
        for (const value of rawRows) {
            const raw = object(value);
            let relative = String(raw.relative_path ?? raw.path ?? "").replaceAll("\\", "/");
            if (root && relative.toLowerCase().startsWith(root.toLowerCase() + "/"))
                relative = relative.slice(root.length + 1);
            if (!relative)
                continue;
            const review = { manifest: `${audit.name}-audit.json`, detail: raw };
            const existing = source.get(relative);
            if (existing) {
                existing.reviews.push(review);
                continue;
            }
            source.set(relative, {
                path: relative, group: audit.name,
                purpose: String(raw.method_purpose ?? raw.purpose ?? "See content review"),
                adaptation: [raw.adaptation, raw.file_adaptation, raw.required_changes].filter(v => typeof v === "string").join(" ") || String(raw.application ?? "See adoption details"),
                state: String(raw.state ?? raw.adoptionStatus ?? raw.adaptation_card ?? "reviewed method"),
                targets: strings(raw.integration_targets ?? raw.runtime_targets ?? raw.adoptionTarget),
                sha256: typeof raw.sha256 === "string" ? raw.sha256 : undefined, reviews: [review],
            });
        }
    }
    const inventory = object(systems.runtimeInventory);
    const roots = Array.isArray(inventory.registeredSkillRoots) ? inventory.registeredSkillRoots : [];
    const runtime = roots.map(value => {
        const raw = object(value);
        const evidence = Array.isArray(raw.promptEvidence) ? raw.promptEvidence : [];
        return {
            path: String(raw.folder ?? raw.name ?? "Unnamed skill"), group: "runtime",
            purpose: String(raw.usageClass ?? "Classification unavailable"),
            adaptation: [raw.tighteningAction, raw.actionRationale].filter(v => typeof v === "string").join(" "),
            state: String(raw.cardAdequacy ?? "See loader details"),
            targets: evidence.flatMap(v => strings(object(v).file)),
            reviews: [{ manifest: "systems-audit.json", detail: raw }],
        };
    });
    return { source: [...source.values()].sort((a, b) => a.path.localeCompare(b.path)), runtime, union: object(systems.coverageUnion), runtimeCounts: object(inventory.counts), runtimeClasses: inventory.usageCounts };
}
function within(root: string, file: string): boolean {
    const relative = path.relative(root, file);
    return !!relative && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}
export function reviewAssetPath(reviewDir: string, parts: readonly string[]): string | null {
    if (!parts.length || parts.some(p => !p || p === "." || p === ".." || /[\\/:\x00]/.test(p)))
        return null;
    const root = path.resolve(reviewDir, "artifacts");
    const file = path.resolve(root, ...parts);
    if (!within(root, file) || !/\.(png|jpe?g|webp|gif)$/i.test(file))
        return null;
    try {
        const realReview = fs.realpathSync(reviewDir);
        const realRoot = fs.realpathSync(root);
        const realFile = fs.realpathSync(file);
        const expectedReview = path.join(fs.realpathSync(path.dirname(path.resolve(reviewDir))), path.basename(reviewDir));
        if (path.relative(expectedReview, realReview) || path.relative(path.join(realReview, "artifacts"), realRoot))
            return null;
        if (!within(realReview, realRoot) || !within(realRoot, realFile) || !fs.statSync(realFile).isFile())
            return null;
        return realFile;
    }
    catch {
        return null;
    }
}
export function reviewAssetUrl(relative: unknown, reviewDir = path.join(env.DATA_DIR, "review")): string | null {
    if (typeof relative !== "string")
        return null;
    const parts = relative.replaceAll("\\", "/").split("/");
    if (parts.shift() !== "artifacts" || !reviewAssetPath(reviewDir, parts))
        return null;
    return `/api/skill-lab/artifacts/${parts.map(encodeURIComponent).join("/")}`;
}
function jsonRead(file: string): {
    value?: unknown;
    error?: string;
} {
    if (!fs.existsSync(file))
        return {};
    try {
        return { value: JSON.parse(fs.readFileSync(file, "utf8")) };
    }
    catch {
        return { error: `${path.basename(file)} could not be read as JSON. Refresh after the next save.` };
    }
}
export function usageTotals(records: readonly {
    usage?: ReviewUsage;
}[]) {
    const totals = { calls: 0, input: 0, cached: 0, cacheWrite: 0, output: 0, textUsd: 0, mediaCalls: 0, mediaUsd: 0, recorded: 0 };
    for (const record of records) {
        if (!record.usage)
            continue;
        totals.recorded++;
        for (const key of ["calls", "input", "cached", "cacheWrite", "output", "textUsd", "mediaCalls", "mediaUsd"] as const)
            totals[key] += record.usage[key] ?? 0;
    }
    return totals;
}
export function readReview(reviewDir = path.join(env.DATA_DIR, "review")) {
    const errors: string[] = [];
    const readArm = (arm: ReviewArm): ReviewResults | null => {
        const raw = jsonRead(path.join(reviewDir, `${arm}.json`));
        if (raw.error)
            errors.push(raw.error);
        let canonical: ReviewResults | null = null;
        if (raw.value) {
            const result = resultsSchema.safeParse(raw.value);
            if (!result.success)
                errors.push(`${arm}.json has invalid review records; its static results are unavailable.`);
            else {
                canonical = result.data;
                if (canonical.condition && canonical.condition !== arm) {
                    errors.push(`${arm}.json identifies a different condition; its records are unavailable.`);
                    canonical = null;
                }
            }
            if (canonical) {
                const ids = canonical.statics.map(r => r.pairId);
                if (new Set(ids).size !== ids.length)
                    errors.push(`${arm}.json contains duplicate pair IDs; only the first record for each pair is displayed.`);
            }
        }
        const side = jsonRead(path.join(reviewDir, `${arm}-story.json`));
        if (side.error)
            errors.push(side.error);
        if (side.value) {
            const parsed = z.object({ condition: z.literal(arm).optional(), story: storySchema.optional() }).safeParse(side.value);
            if (!parsed.success)
                errors.push(`${arm}-story.json has invalid story records; the canonical story is retained if available.`);
            else if (parsed.data.story)
                return { ...(canonical ?? { condition: arm, statics: [] }), story: parsed.data.story };
        }
        return canonical;
    };
    const before = readArm("before");
    const after = readArm("after");
    const refined = readArm("refined");
    const arms = { before, after, refined };
    const pilot = jsonRead(path.join(reviewDir, "after-pilot.json"));
    const controls = jsonRead(path.join(reviewDir, "controls.json"));
    const readRequestProof = (arm: ReviewArm) => {
        const raw = jsonRead(path.join(reviewDir, `${arm}-requests-proof.json`));
        if (raw.error)
            errors.push(raw.error);
        if (!raw.value)
            return undefined;
        const proof = z.object({
            version: z.literal(1), arm: z.literal(arm), capturedAt: z.string().min(1),
            paidCalls: z.literal(0), inputSnapshotTiming: z.string().min(1),
            statics: z.array(z.object({ pairId: z.string().min(1), runId: z.string().min(1) }).passthrough()),
        }).passthrough().safeParse(raw.value);
        if (!proof.success) {
            errors.push(`${arm}-requests-proof.json is invalid; reconstruction evidence is unavailable.`);
            return undefined;
        }
        return proof.data;
    };
    const requestProofs = { before: readRequestProof("before"), after: readRequestProof("after"), refined: readRequestProof("refined") };
    const ids = [...new Set([...STATIC_BRIEFS.map(b => b.id), ...REVIEW_ARMS.flatMap(arm => (arms[arm]?.statics ?? []).map(r => r.pairId))])];
    const pairs = ids.map(id => ({
        id, brief: STATIC_BRIEFS.find(b => b.id === id),
        before: before?.statics.find(r => r.pairId === id), after: after?.statics.find(r => r.pairId === id), refined: refined?.statics.find(r => r.pairId === id),
    }));
    const judges = jsonRead(path.join(reviewDir, "judgments.json"));
    if (judges.error)
        errors.push(judges.error);
    const parsedJudges = judges.value ? ReviewJudgesSchema.safeParse(judges.value) : undefined;
    if (parsedJudges && !parsedJudges.success)
        errors.push("judgments.json has invalid ratings, arm mapping or fatal-failure selection. Independent results are unavailable.");
    const refinedJudges = jsonRead(path.join(reviewDir, "judgments-refined.json"));
    if (refinedJudges.error)
        errors.push(refinedJudges.error);
    const parsedRefinedJudges = refinedJudges.value ? RefinedReviewJudgesSchema.safeParse(refinedJudges.value) : undefined;
    if (parsedRefinedJudges && !parsedRefinedJudges.success)
        errors.push("judgments-refined.json has invalid ratings, arm mapping or fatal-failure selection. Transcript-informed independent results are unavailable.");
    const audits = ["creative", "performance", "systems"].map(name => {
        const result = jsonRead(path.join(process.cwd(), "docs", "skill-value-chain", `${name}-audit.json`));
        return { name, value: result.value, error: result.error };
    });
    const rendered = (arm: ReviewResults | null) => new Set((arm?.statics ?? []).map(r => reviewAssetUrl(r.image, reviewDir)).filter(Boolean)).size;
    const armTotals = (arm: ReviewResults | null) => usageTotals([...(arm?.statics ?? []), ...(arm?.story ? [arm.story] : [])]);
    const totals = { before: armTotals(before), after: armTotals(after), refined: armTotals(refined) };
    const complete = (arm: ReviewResults | null) => {
        if (!arm || arm.statics.length !== STATIC_BRIEFS.length || new Set(arm.statics.map(r => r.pairId)).size !== STATIC_BRIEFS.length)
            return false;
        if (rendered(arm) !== STATIC_BRIEFS.length)
            return false;
        if (!STATIC_BRIEFS.every(brief => arm.statics.some(r => r.pairId === brief.id && r.status === "complete" && !!reviewAssetUrl(r.image, reviewDir))))
            return false;
        const story = arm.story;
        if (!story || story.status !== "complete" || !story.frames?.length || ![story.portrait, story.character, story.opening, ...story.frames.map(f => f.file)].every(f => !!reviewAssetUrl(f, reviewDir)))
            return false;
        return [...arm.statics, story].every(r => r.usage && [r.usage.input, r.usage.cached, r.usage.cacheWrite, r.usage.output].every(v => typeof v === "number"));
    };
    const reduction = (base: number, current: number) => base > 0 ? (base - current) / base : null;
    const inputTotal = (usage: ReviewUsage) => (usage.input ?? 0) + (usage.cached ?? 0) + (usage.cacheWrite ?? 0);
    const matchedControls = (base: ReviewResults | null, current: ReviewResults | null) => {
        try {
            return !!base && !!current && STATIC_BRIEFS.every(brief => {
                const a = base.statics.find(r => r.pairId === brief.id)?.controls;
                const b = current.statics.find(r => r.pairId === brief.id)?.controls;
                return !!a && !!b && controlledBriefHash({ kind: "static", controls: a }) === controlledBriefHash({ kind: "static", controls: b });
            }) && !!base.story?.controls && !!current.story?.controls && controlledBriefHash({ kind: "storyboard", controls: object(base.story.controls) }) === controlledBriefHash({ kind: "storyboard", controls: object(current.story.controls) });
        }
        catch {
            return false;
        }
    };
    const matched = matchedControls(before, after);
    const comparison = matched && complete(before) && complete(after) ? {
        input: { before: inputTotal(totals.before), after: inputTotal(totals.after), reduction: reduction(inputTotal(totals.before), inputTotal(totals.after)) },
        output: { before: totals.before.output, after: totals.after.output, reduction: reduction(totals.before.output, totals.after.output) },
        scope: "Observed generation usage for this completed batch, including recorded retries. Input includes new tokens, cached reads and cache writes. Image provider tokens are unavailable; image calls/costs are separate. Quality must be judged independently.",
    } : null;
    const refinedComparison = matchedControls(after, refined) && complete(after) && complete(refined) ? {
        input: { after: inputTotal(totals.after), refined: inputTotal(totals.refined), reduction: reduction(inputTotal(totals.after), inputTotal(totals.refined)) },
        output: { after: totals.after.output, refined: totals.refined.output, reduction: reduction(totals.after.output, totals.refined.output) },
        scope: comparison?.scope ?? "Observed completed-batch generation usage, including recorded retries. Input includes new tokens, cached reads and cache writes. Image provider tokens are unavailable; image calls/costs are separate. Quality must be judged independently.",
    } : null;
    return {
        before, after, refined, pairs, errors, judgments: parsedJudges?.success ? parsedJudges.data : undefined,
        refinedJudgments: parsedRefinedJudges?.success ? parsedRefinedJudges.data : undefined, audits,
        pilot: pilot.value, controls: controls.value, requestProofs,
        counts: { before: rendered(before), after: rendered(after), refined: rendered(refined), target: STATIC_BRIEFS.length },
        totals, comparison, refinedComparison, auditRows: reviewAuditRows(audits),
        readAt: new Date().toISOString(),
    };
}
