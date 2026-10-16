import type { AuditItem, StaticAdCopy, StudioItemPlan } from "@/db/schema";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { AuthorityTag, AtomicFact, MaterialCondition } from "../production-evidence/facts";
export interface CompleteCopyDocument {
    text_elements?: readonly {
        text: string;
        role: string;
        placement?: string;
        source?: string;
    }[];
    ad_copy?: StudioItemPlan["ad_copy"];
    variants?: readonly {
        layers: readonly {
            text: string;
            role?: string;
            source?: string;
            x?: number;
            y?: number;
            w?: number;
            size?: number;
            align?: string;
        }[];
    }[];
}
export interface CompleteCopyRequirements {
    primary?: boolean;
    primaryWords?: {
        minWords?: number;
        maxWords?: number;
    };
    medium?: {
        minWords?: number;
        maxWords?: number;
    };
    long?: {
        minWords?: number;
        maxWords?: number;
    };
    headlineVariants?: number;
}
export interface CopyAuthoritySource {
    id: string;
    kind: "approved_claim" | "approved_offer" | "guarantee" | "brand_guardrail" | "brief" | "verified_quote" | "review_protocol";
    text: string;
    provenance?: {
        origin: string;
        source: string;
        status: string;
    };
    authorityTag?: AuthorityTag;
    atomicFacts?: readonly AtomicFact[];
    materialConditions?: readonly MaterialCondition[];
    provenanceNotes?: readonly string[];
}
export interface CopyAuthority {
    sources: readonly CopyAuthoritySource[];
    productId?: string | null;
    market?: string;
}
export interface CompleteCopyField {
    path: string;
    text: string;
    surface: "image" | "feed" | "variant";
    role: string;
    source?: string;
    placement?: string;
    metadata?: true;
}
const PROTOCOL: readonly CopyAuthoritySource[] = [
    { id: "copy-protocol/support", kind: "review_protocol", text: "Product outcomes, physiological mechanisms, comparisons, prices and commercial terms require supplied approved evidence for this product. Customer vocabulary, illustrative scenes and a fictional avatar are not factual support. Match the measure, direction, comparator and all material qualifications exactly." },
    { id: "copy-protocol/narration", kind: "review_protocol", text: "A fictional actor cannot supply authentic first-person customer history or outcomes. A supplied verified quote may be used with its exact wording and attribution. Brand-authored first person and neutral or conditional second person are allowed; flag an asserted sensitive personal attribute only when the supplied applicable rule prohibits that actual assertion." },
    { id: "copy-protocol/qualification", kind: "review_protocol", text: "Each delivered alternative must keep the offer, survey, study and guarantee qualifications relevant to its claims. Overlay fields on the same image form one presented surface: clearly adjacent readable attribution may qualify its headline; do not require the full denominator in every line. Check planned placement/adjacency here and verify actual legibility after rendering. A separate feed/headline alternative cannot borrow qualification from a different ad or an optional description missing in some placements. A survey result is not proof of an invented cause. A supported guarantee is not an unsupported personal product outcome." },
    { id: "copy-protocol/coverage", kind: "review_protocol", text: "Read all image overlays, feed text, headline alternatives, description, CTA and requested medium/long alternatives before rendering. Empty optional fields are allowed; requested fields and lengths must be supplied. Report an exact field path and exact offending span, a reason tied to supplied authority, and the smallest correction. Do not turn stylistic preference into a factual failure." },
];
const stable = (value: unknown): string => {
    if (Array.isArray(value))
        return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object")
        return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
    return JSON.stringify(value) ?? "null";
};
const hash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");
const words = (text: string) => text.trim() ? text.trim().split(/\s+/u).length : 0;
export function completeCopyFields(document: CompleteCopyDocument): CompleteCopyField[] {
    const fields: CompleteCopyField[] = (document.text_elements ?? []).map((t, i) => ({ path: `text_elements[${i}].text`, text: t.text, surface: "image", role: t.role, ...(t.source ? { source: t.source } : {}), ...(t.placement ? { placement: t.placement } : {}) }));
    if (document.ad_copy) {
        const visit = (value: unknown, path: string) => {
            if (typeof value === "string")
                fields.push({ path, text: value, surface: "feed", role: path.slice("ad_copy.".length), ...(/(?:^|\.)(?:provenance|metadata)(?:\.|\[|$)/u.test(path) ? { metadata: true as const } : {}) });
            else if (Array.isArray(value))
                value.forEach((v, i) => visit(v, `${path}[${i}]`));
            else if (value && typeof value === "object")
                for (const [k, v] of Object.entries(value))
                    visit(v, `${path}.${k}`);
        };
        visit(document.ad_copy, "ad_copy");
    }
    (document.variants ?? []).forEach((v, i) => v.layers.forEach((t, j) => fields.push({ path: `variants[${i}].layers[${j}].text`, text: t.text, surface: "variant", role: t.role ?? "text", ...(t.source ? { source: t.source } : {}), ...(t.x !== undefined && t.y !== undefined ? { placement: `Editable layer: x ${t.x}, y ${t.y}, width ${t.w}, size ${t.size}, ${t.align}` } : {}) })));
    return fields;
}
export function completeCopyHash(document: CompleteCopyDocument, requirements: CompleteCopyRequirements = {}): string {
    return hash({ schemaVersion: 1, text_elements: document.text_elements ?? [], ad_copy: document.ad_copy ?? null, variants: (document.variants ?? []).map(v => ({ layers: v.layers })), requirements });
}
export interface CompleteCopyPacket {
    schemaVersion: 1;
    contentHash: string;
    evidenceHash: string;
    fields: CompleteCopyField[];
    authority: CopyAuthority;
    requirements: CompleteCopyRequirements;
}
export function completeCopyPacket(document: CompleteCopyDocument, authority: CopyAuthority, requirements: CompleteCopyRequirements = {}): CompleteCopyPacket {
    const sources = [...authority.sources];
    for (const protocol of PROTOCOL) {
        const present = sources.find(s => s.id === protocol.id);
        if (present && stable(present) !== stable(protocol))
            throw new Error(`Reserved copy protocol authority was changed: ${protocol.id}.`);
        if (!present)
            sources.push(protocol);
    }
    if (sources.some(s => !s.id.trim() || !s.text.trim()) || new Set(sources.map(s => s.id)).size !== sources.length)
        throw new Error("Complete-copy authority requires unique source IDs and complete nonempty source wording.");
    for (const range of [requirements.primaryWords, requirements.medium, requirements.long]) {
        if (range && [range.minWords, range.maxWords].some(n => n !== undefined && (!Number.isSafeInteger(n) || n < 1)))
            throw new Error("Requested copy word bounds must be positive integers.");
        if (range?.minWords && range.maxWords && range.minWords > range.maxWords)
            throw new Error("Requested copy minimum exceeds its maximum.");
    }
    if (requirements.headlineVariants !== undefined && (!Number.isSafeInteger(requirements.headlineVariants) || requirements.headlineVariants < 0))
        throw new Error("Requested headline variant count must be a nonnegative integer.");
    const evidence: CopyAuthority = { ...authority, sources };
    return { schemaVersion: 1, contentHash: completeCopyHash(document, requirements), evidenceHash: hash(evidence), fields: completeCopyFields(document), authority: evidence, requirements: structuredClone(requirements) };
}
export const CompleteCopyIssueSchema = z.object({
    fieldPath: z.string().min(1),
    offendingText: z.string(),
    severity: z.enum(["blocking", "warning", "advisory"]),
    category: z.enum(["claim", "offer", "testimonial", "personal_attribute", "qualification", "brief", "length", "style"]),
    reason: z.string().min(1),
    sourceIds: z.array(z.string().min(1)).min(1),
    smallestCorrection: z.string().min(1),
});
export type CompleteCopyIssue = z.infer<typeof CompleteCopyIssueSchema> & {
    id: string;
};
export const CompleteCopyReadSchema = z.object({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    evidenceHash: z.string().regex(/^[a-f0-9]{64}$/),
    checkedPaths: z.array(z.string().min(1)),
    issues: z.array(CompleteCopyIssueSchema),
    sourceNotes: z.array(z.object({ sourceIds: z.array(z.string().min(1)).min(1), note: z.string().min(1) })).optional(),
});
export type CompleteCopyRead = z.infer<typeof CompleteCopyReadSchema>;
export interface CompleteCopyReview {
    schemaVersion: 1;
    contentHash: string;
    evidenceHash: string;
    checkedPaths: string[];
    status: "approved" | "blocked" | "unverified";
    issues: CompleteCopyIssue[];
    sourceNotes?: {
        sourceIds: string[];
        note: string;
    }[];
    verificationErrors: string[];
    reviewedAt: string;
    scope: "complete-copy-before-render";
}
function requiredCopyIssues(packet: CompleteCopyPacket): CompleteCopyIssue[] {
    const issues: CompleteCopyIssue[] = [];
    const by = new Map(packet.fields.map(f => [f.path, f]));
    const add = (fieldPath: string, reason: string, category: "brief" | "length", correction: string) => issues.push({ id: `requirement-${issues.length + 1}`, fieldPath, offendingText: by.get(fieldPath)?.text ?? "", severity: "blocking", category, reason, sourceIds: ["copy-protocol/coverage"], smallestCorrection: correction });
    if (packet.requirements.primary && !by.get("ad_copy.primary_text")?.text.trim())
        add("ad_copy.primary_text", "The requested primary text is missing.", "brief", "Supply the requested supported primary text.");
    const primaryRange = packet.requirements.primaryWords;
    if (primaryRange) {
        const count = words(by.get("ad_copy.primary_text")?.text ?? "");
        if (!count && !packet.requirements.primary)
            add("ad_copy.primary_text", "The requested primary text is missing.", "brief", "Supply the requested supported primary text.");
        else if (count && primaryRange.minWords && count < primaryRange.minWords)
            add("ad_copy.primary_text", `The primary text contains ${count} words; the requested minimum is ${primaryRange.minWords}.`, "length", "Develop the supported argument and practical detail until the requested minimum is met; do not pad or invent outcomes.");
        else if (count && primaryRange.maxWords && count > primaryRange.maxWords)
            add("ad_copy.primary_text", `The primary text contains ${count} words; the requested maximum is ${primaryRange.maxWords}.`, "length", "Remove repetition while preserving the argument and material qualifications.");
    }
    for (const key of ["medium", "long"] as const) {
        const range = packet.requirements[key];
        if (!range)
            continue;
        const fieldPath = `ad_copy.more.${key}`;
        const text = by.get(fieldPath)?.text ?? "";
        const count = words(text);
        if (!count)
            add(fieldPath, `The requested ${key} primary-text alternative is missing.`, "brief", `Supply the requested ${key} alternative using the same approved argument and qualifications.`);
        else if (range.minWords && count < range.minWords)
            add(fieldPath, `The ${key} alternative contains ${count} words; the requested minimum is ${range.minWords}.`, "length", "Develop supported scenes, objections and practical detail until the requested minimum is met; do not pad or invent outcomes.");
        else if (range.maxWords && count > range.maxWords)
            add(fieldPath, `The ${key} alternative contains ${count} words; the requested maximum is ${range.maxWords}.`, "length", "Remove repetition while preserving the argument and material qualifications.");
    }
    for (let i = 0; i < (packet.requirements.headlineVariants ?? 0); i++)
        if (!by.get(`ad_copy.more.headlines[${i}]`)?.text.trim())
            add(`ad_copy.more.headlines[${i}]`, `Requested headline alternative ${i + 1} is missing.`, "brief", "Supply this alternative without changing the approved facts or offer.");
    return issues;
}
export function finalizeCompleteCopyReview(packet: CompleteCopyPacket, input: unknown, at = new Date().toISOString()): CompleteCopyReview {
    const parsed = CompleteCopyReadSchema.safeParse(input);
    const errors: string[] = [];
    const issues: CompleteCopyIssue[] = requiredCopyIssues(packet);
    const read = parsed.success ? parsed.data : undefined;
    if (!read)
        errors.push("The complete-copy reader returned no valid field-addressed result.");
    if (read) {
        if (read.contentHash !== packet.contentHash)
            errors.push("The reader reviewed a different copy content hash.");
        if (read.evidenceHash !== packet.evidenceHash)
            errors.push("The reader used a different evidence hash.");
        const fields = new Map(packet.fields.map(f => [f.path, f]));
        const paths = new Set(read.checkedPaths);
        if (paths.size !== read.checkedPaths.length || paths.size !== fields.size || [...fields.keys()].some(p => !paths.has(p)) || [...paths].some(p => !fields.has(p)))
            errors.push("The reader did not explicitly check every supplied field exactly once.");
        const sources = new Set(packet.authority.sources.map(s => s.id));
        read.issues.forEach((issue, i) => {
            const field = fields.get(issue.fieldPath);
            if (!field)
                errors.push(`Issue ${i + 1} names an unknown field: ${issue.fieldPath}.`);
            else if (field.metadata)
                errors.push(`Issue ${i + 1} names retained provenance metadata, not delivered copy; report source observations separately.`);
            else if (field.text && (!issue.offendingText || !field.text.includes(issue.offendingText)))
                errors.push(`Issue ${i + 1} does not quote an exact span of ${issue.fieldPath}.`);
            else if (!field.text && issue.offendingText)
                errors.push(`Issue ${i + 1} quotes text absent from ${issue.fieldPath}.`);
            if (issue.sourceIds.some(id => !sources.has(id)))
                errors.push(`Issue ${i + 1} cites an authority not supplied to this read.`);
            if (issue.severity === "advisory" && issue.category !== "style")
                errors.push(`Issue ${i + 1} labels a factual or requirement issue as harmless advice; resolve or classify that issue before approval.`);
            issues.push({ ...issue, id: `read-${i + 1}` });
        });
        if (read.sourceNotes?.some(note => note.sourceIds.some(id => !sources.has(id))))
            errors.push("A source observation cites authority not supplied to this read.");
    }
    return { schemaVersion: 1, contentHash: packet.contentHash, evidenceHash: packet.evidenceHash, checkedPaths: read?.checkedPaths ?? [], status: errors.length ? "unverified" : issues.some(i => i.severity !== "advisory") ? "blocked" : "approved", issues, ...(read?.sourceNotes ? { sourceNotes: read.sourceNotes } : {}), verificationErrors: errors, reviewedAt: at, scope: "complete-copy-before-render" };
}
export function completeCopyApprovalMatches(document: CompleteCopyDocument, review: CompleteCopyReview | null | undefined, authority: CopyAuthority, requirements: CompleteCopyRequirements = {}): boolean {
    if (!review || review.status !== "approved" || review.scope !== "complete-copy-before-render" || review.schemaVersion !== 1 || review.verificationErrors.length || review.issues.some(i => i.severity !== "advisory"))
        return false;
    const packet = completeCopyPacket(document, authority, requirements);
    if (requiredCopyIssues(packet).length || review.contentHash !== packet.contentHash || review.evidenceHash !== packet.evidenceHash)
        return false;
    const paths = new Set(review.checkedPaths);
    return paths.size === review.checkedPaths.length && paths.size === packet.fields.length && packet.fields.every(f => paths.has(f.path));
}
export const CompleteCopyPatchSchema = z.object({ patches: z.array(z.object({ fieldPath: z.string().min(1), before: z.string(), after: z.string(), issueIds: z.array(z.string().min(1)).optional() })) });
export type CompleteCopyPatch = z.infer<typeof CompleteCopyPatchSchema>["patches"][number];
export const CompleteCopySpanPatchSchema = z.object({ patches: z.array(z.object({ fieldPath: z.string().min(1), before: z.string(), after: z.string(), occurrence: z.number().int().nonnegative().optional(), issueIds: z.array(z.string().min(1)).min(1) })) });
export type CompleteCopySpanPatch = z.infer<typeof CompleteCopySpanPatchSchema>["patches"][number];
export function materializeCompleteCopySpanPatches(document: CompleteCopyDocument, issues: readonly CompleteCopyIssue[], patches: readonly CompleteCopySpanPatch[]): CompleteCopyPatch[] {
    const fields = new Map(completeCopyFields(document).map(f => [f.path, f.text]));
    const grouped = new Map<string, {
        start: number;
        end: number;
        after: string;
        issueIds: string[];
    }[]>();
    for (const patch of patches) {
        const addressed = patch.issueIds.map(id => issues.find(i => i.id === id && i.fieldPath === patch.fieldPath && i.severity !== "advisory"));
        if (!addressed.length || addressed.some(i => !i))
            throw new Error(`Span repair does not address verified failures in ${patch.fieldPath}.`);
        const current = fields.get(patch.fieldPath) ?? "";
        if (!current && patch.before === "" && addressed.every(i => i?.id.startsWith("requirement-"))) {
            if (grouped.has(patch.fieldPath))
                throw new Error(`Duplicate missing-field span repair in ${patch.fieldPath}.`);
            grouped.set(patch.fieldPath, [{ start: 0, end: 0, after: patch.after, issueIds: patch.issueIds }]);
            continue;
        }
        if (!patch.before)
            throw new Error(`Span repair requires exact current text in ${patch.fieldPath}.`);
        const starts: number[] = [];
        for (let pos = current.indexOf(patch.before); pos !== -1; pos = current.indexOf(patch.before, pos + patch.before.length))
            starts.push(pos);
        if (!starts.length)
            throw new Error(`Span repair is stale for ${patch.fieldPath}.`);
        if (starts.length > 1 && patch.occurrence === undefined)
            throw new Error(`The repair span occurs more than once in ${patch.fieldPath}; specify its occurrence.`);
        const start = starts[patch.occurrence ?? 0];
        if (start === undefined)
            throw new Error(`The requested repair occurrence does not exist in ${patch.fieldPath}.`);
        const end = start + patch.before.length;
        for (const issue of addressed) {
            if (!issue?.offendingText)
                throw new Error(`Span repair requires a reviewed offending span in ${patch.fieldPath}.`);
            const reviewedStarts: number[] = [];
            for (let pos = current.indexOf(issue.offendingText); pos !== -1; pos = current.indexOf(issue.offendingText, pos + 1))
                reviewedStarts.push(pos);
            const containsOrWithin = reviewedStarts.some(pos => (start >= pos && end <= pos + issue.offendingText.length) || (start <= pos && end >= pos + issue.offendingText.length));
            if (!containsOrWithin)
                throw new Error(`Span repair is outside the reviewed offending span in ${patch.fieldPath}.`);
        }
        grouped.set(patch.fieldPath, [...(grouped.get(patch.fieldPath) ?? []), { start, end: start + patch.before.length, after: patch.after, issueIds: patch.issueIds }]);
    }
    return [...grouped].map(([fieldPath, spans]) => {
        const ordered = spans.sort((a, b) => a.start - b.start);
        if (ordered.some((s, i) => i > 0 && s.start < ordered[i - 1].end))
            throw new Error(`Overlapping span repairs in ${fieldPath}.`);
        const before = fields.get(fieldPath) ?? "";
        let after = before;
        for (const span of [...ordered].reverse())
            after = after.slice(0, span.start) + span.after + after.slice(span.end);
        return { fieldPath, before, after, issueIds: [...new Set(spans.flatMap(s => s.issueIds))] };
    });
}
export function applyCompleteCopyPatches<T extends CompleteCopyDocument>(document: T, issues: readonly CompleteCopyIssue[], patches: readonly CompleteCopyPatch[], requirements: CompleteCopyRequirements = {}): {
    document: T;
    changes: {
        fieldPath: string;
        before: string;
        after: string;
        issueIds: string[];
    }[];
    requiresImageRepair: boolean;
    approvalInvalidated: boolean;
} {
    const fields = new Map(completeCopyFields(document).map(f => [f.path, f]));
    const failed = new Map<string, CompleteCopyIssue[]>();
    for (const issue of issues.filter(i => i.severity !== "advisory"))
        failed.set(issue.fieldPath, [...(failed.get(issue.fieldPath) ?? []), issue]);
    const seen = new Set<string>();
    const changes: {
        fieldPath: string;
        before: string;
        after: string;
        issueIds: string[];
    }[] = [];
    const changed = structuredClone(document);
    for (const patch of patches) {
        if (seen.has(patch.fieldPath))
            throw new Error(`Duplicate repair for ${patch.fieldPath}.`);
        seen.add(patch.fieldPath);
        const allowed = failed.get(patch.fieldPath);
        if (!allowed?.length)
            throw new Error(`A repair may change only a reviewed failing field: ${patch.fieldPath}.`);
        const current = fields.get(patch.fieldPath);
        if (current?.metadata)
            throw new Error(`Retained provenance metadata cannot be repaired as delivered copy: ${patch.fieldPath}.`);
        if ((current?.text ?? "") !== patch.before)
            throw new Error(`The repair is stale for ${patch.fieldPath}; review the current words again.`);
        if (patch.issueIds?.some(id => !allowed.some(i => i.id === id)))
            throw new Error(`Repair issue IDs do not address ${patch.fieldPath}.`);
        const headlineIndex = /^ad_copy\.more\.headlines\[(\d+)\]$/.exec(patch.fieldPath)?.[1];
        const required = patch.fieldPath === "ad_copy.primary_text" || (patch.fieldPath === "ad_copy.more.medium" && requirements.medium !== undefined) || (patch.fieldPath === "ad_copy.more.long" && requirements.long !== undefined) || (headlineIndex !== undefined && Number(headlineIndex) < (requirements.headlineVariants ?? 0)) || allowed.some(i => i.id.startsWith("requirement-"));
        if (!patch.after.trim() && required)
            throw new Error(`Repair for ${patch.fieldPath} cannot silently erase a requested copy field.`);
        if (patch.after === patch.before)
            continue;
        const missingRequested = !current && allowed.every(i => i.id.startsWith("requirement-")) && /^ad_copy\.(primary_text|more\.(medium|long|headlines\[\d+\]))$/.test(patch.fieldPath);
        if (!current && !missingRequested)
            throw new Error(`Unknown copy repair path: ${patch.fieldPath}.`);
        if (current?.text && allowed.some(i => !i.offendingText || !current.text.includes(i.offendingText)))
            throw new Error(`Repair issue lacks an exact current offending span for ${patch.fieldPath}.`);
        const parts = patch.fieldPath.replace(/\[(\d+)\]/g, ".$1").split(".");
        if (parts.some(p => ["__proto__", "constructor", "prototype"].includes(p)))
            throw new Error("Unsafe copy repair path.");
        let node = changed as unknown as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (node[key] === undefined && missingRequested)
                node[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
            if (!node[key] || typeof node[key] !== "object")
                throw new Error(`Copy repair path is missing: ${patch.fieldPath}.`);
            node = node[key] as Record<string, unknown>;
        }
        node[parts.at(-1)!] = patch.after;
        changes.push({ fieldPath: patch.fieldPath, before: patch.before, after: patch.after, issueIds: allowed.map(i => i.id) });
    }
    return { document: changed, changes, requiresImageRepair: changes.some(c => c.fieldPath.startsWith("text_elements[") || c.fieldPath.startsWith("variants[")), approvalInvalidated: changes.length > 0 };
}
export function copyRepairConcurrency(raw: string | undefined): number {
    const count = raw === undefined ? 1 : Number(raw);
    if (!Number.isSafeInteger(count) || count < 1 || count > 4)
        throw new Error("EVALUATION_COPY_CONCURRENCY must be an integer from 1 to 4.");
    return count;
}
export function primaryNeedsReview(text: string): boolean {
    return /\b(?:I(?:['’](?:m|ve|d|ll))?|my|me|mine)\b/i.test(text);
}
export function repairedFeedCopy(original: NonNullable<StudioItemPlan["ad_copy"]>, draft: StaticAdCopy): NonNullable<StudioItemPlan["ad_copy"]> {
    if (!draft.primary_text.trim())
        throw new Error("The copy writer returned no primary text.");
    return { ...original, primary_text: draft.primary_text.trim() };
}
export function copyRepairCheck(audit: readonly AuditItem[], freshClaimCalls: readonly {
    status: string;
}[], primary: string) {
    const failures = audit.filter(a => a.status === "fail");
    const warnings = audit.filter(a => a.status === "warn");
    const readRan = freshClaimCalls.some(c => c.status === "ok") && !audit.some(a => a.check === "claims_judge" && /didn't run/i.test(a.message));
    const narrationNeedsReview = primaryNeedsReview(primary);
    return {
        status: !readRan ? "unverified" as const : failures.length || narrationNeedsReview ? "failed" as const : "passed" as const,
        claimsPassed: readRan && !failures.length && !narrationNeedsReview,
        narrationNeedsReview, failures, warnings,
        copyApproved: false,
    };
}
