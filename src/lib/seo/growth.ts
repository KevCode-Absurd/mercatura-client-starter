import { z } from "zod";
import { studyFor, studyNotesMarkdown } from "./study";
import { growthPriorities, priorityEvidence, type PriorityId, type PriorityInputs } from "./priorities";
import type { SeoContext } from "./model";
export const growthStatusLabels = { planned: "Not started", working: "In progress", blocked: "Blocked", review: "Ready for review", verified: "Human verified" } as const;
export const growthInputSchema = z.object({
    owner: z.string().trim().max(100), dueDate: z.string().refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Enter a valid due date."),
    status: z.enum(["planned", "working", "blocked", "review", "verified"]),
    completedSteps: z.array(z.number().int().min(0).max(2)).max(3),
    notes: z.string().trim().max(4000), verification: z.string().trim().max(4000), evidenceUrl: z.string().trim().max(2000),
});
export type GrowthInput = z.infer<typeof growthInputSchema>;
export type GrowthRow = GrowthInput & {
    id: PriorityId;
    contextHash: string;
    updatedAt: string;
    packageId?: string;
    verifiedAt?: string;
};
export type GrowthData = {
    version: 1;
    brandId: string;
    revision: number;
    rows: GrowthRow[];
};
export const emptyGrowth = (brandId: string): GrowthData => ({ version: 1, brandId, revision: 0, rows: [] });
export const blankGrowthInput = (): GrowthInput => ({ owner: "", dueDate: "", status: "planned", completedSteps: [], notes: "", verification: "", evidenceUrl: "" });
export function growthId(value: string): PriorityId {
    if (!growthPriorities.some((p) => p.id === value))
        throw new Error("Choose one of the 15 growth priorities.");
    return value as PriorityId;
}
export function validateGrowthInput(value: unknown): GrowthInput {
    const input = growthInputSchema.parse(value);
    input.completedSteps = [...new Set(input.completedSteps)].sort();
    if (input.status !== "planned" && !input.owner)
        throw new Error("Assign an owner before starting this priority.");
    if (input.status === "blocked" && input.notes.length < 10)
        throw new Error("Explain what is blocking this priority.");
    if (input.evidenceUrl) {
        let url: URL;
        try {
            url = new URL(input.evidenceUrl);
        }
        catch {
            throw new Error("Enter a valid evidence URL.");
        }
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
            throw new Error("Use an HTTP(S) evidence URL without credentials.");
        input.evidenceUrl = url.href;
    }
    if (input.status === "verified" && (input.completedSteps.length !== 3 || input.verification.length < 20 || !input.evidenceUrl))
        throw new Error("Verification needs all three steps, an evidence URL and a description of what you checked (at least 20 characters).");
    return input;
}
export function initialGrowthRows(ctx: SeoContext, data: GrowthData, at: string): GrowthRow[] {
    return growthPriorities.map((p) => data.rows.find((r) => r.id === p.id) ?? { ...blankGrowthInput(), id: p.id, contextHash: ctx.contextHash, updatedAt: at });
}
export function growthBrief(input: PriorityInputs, id: PriorityId, row?: GrowthRow) {
    const priority = growthPriorities.find((p) => p.id === id)!;
    const currentRow = row?.contextHash === input.ctx.contextHash ? row : undefined;
    const currentAudit = input.audit.brandId === input.ctx.brandId && input.audit.contextHash === input.ctx.contextHash && input.audit.mode === "live";
    const checks = currentAudit ? input.audit.checks.filter((c) => (priority.rules as readonly string[]).includes(c.ruleId)).slice(0, 12) : [];
    return [`# ${priority.title}`, `Brand: ${input.ctx.brandName}\nStore: ${input.ctx.websiteUrl ?? "Not set"}\nShared context: ${input.ctx.contextHash}`,
        "## Why this work matters", priority.why, "## Before: current evidence", priorityEvidence(input, id),
        ...checks.map((c) => `- ${c.status.toUpperCase()} · ${c.ruleId} · ${c.url}\n  ${c.evidence.slice(0, 3).join("; ")}`),
        "## Recommended implementation", ...priority.steps.map((s, i) => `${i + 1}. ${s}`),
        "## Proposed after", priority.success,
        "## Working tool", `/seo/${priority.workflow}\nUse the linked workflow for page-specific content or code. This is a work brief, not a platform-specific patch.`,
        "## Owner and review", `Owner: ${currentRow?.owner || "Unassigned"}\nDue: ${currentRow?.dueDate || "Not scheduled"}\nStatus: ${currentRow ? growthStatusLabels[currentRow.status] : "Not started"}`,
        ...(currentRow?.notes ? [currentRow.notes] : []),
        "## Acceptance and rollback", `Verify: ${priority.success}\nRecord the affected URLs, capture time, exact changes and evidence. Retest the product, basket and mobile journey for store changes. Keep the original content/theme version and restore it if the change causes a regression. Measurement alone does not establish causality.`,
        studyNotesMarkdown(studyFor({ priority: id })),
        "## Deployment", "A human reviews, approves and applies this work. Nothing is published by preparing this brief."].join("\n\n");
}
