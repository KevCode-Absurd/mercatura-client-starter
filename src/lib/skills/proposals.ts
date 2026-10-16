import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { SkillPatch, SkillProposalRow } from "@/db/schema";
import { env, SHARED_BRAND } from "../env";
import { checkEdit } from "../inspect/edit-check";
import { EditRefused, fileVersions, saveInstructionFile } from "../inspect/edits";
import { readInstructionFile } from "../inspect/skill-map";
import { callStructured, llmEnabled } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { applyPatch, LEARNED_HEADING, PatchRefused, tightenFault, wordCount } from "./patch";
import { isWatchedFile, watchedSkills, type WatchedSkill } from "./watched";
const t = schema.skillProposals;
const nextId = () => {
    const all = db.select({ id: t.id }).from(t).all();
    return `prop_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
export const ProposeAnswer = z.object({
    skip: z.boolean().default(false),
    file: z.string().default(""),
    op: z.enum(["add", "replace"]).default("add"),
    heading: z.string().default(""),
    old: z.string().default(""),
    text: z.string().default(""),
    summary: z.string().default(""),
});
export const TightenAnswer = z.object({ text: z.string().default(""), summary: z.string().default("") });
export interface ProposeInput {
    brandId: string;
    feedbackId: string;
    said: string;
    rules: {
        rule: string;
        why: string;
    }[];
    about: string;
    files: string[];
}
const front = (s: string) => s.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)?.[0] ?? "";
const plainRules = (rules: ProposeInput["rules"]) => rules.map((r) => `- ${r.rule}`).join("\n");
function insert(values: Omit<typeof t.$inferInsert, "id">): SkillProposalRow {
    const id = nextId();
    db.insert(t).values({ id, ...values }).run();
    return db.select().from(t).where(eq(t.id, id)).get()!;
}
export async function proposeFromFeedback(input: ProposeInput): Promise<SkillProposalRow | null> {
    const files = input.files.filter((f) => f.startsWith("skills/") && readInstructionFile(f));
    const rules = input.rules.filter((r) => r.rule.trim().length >= 8);
    if (!files.length || !rules.length)
        return null;
    const said = input.said.slice(0, 4000);
    const plain: SkillPatch = { op: "add", heading: "", old: "", text: plainRules(rules) };
    let patch = plain;
    let file = files[0];
    let summary = `Adds ${rules.length} rule${rules.length === 1 ? "" : "s"} at the end of the file, under "${LEARNED_HEADING.replace(/^#+\s*/, "")}".`;
    let costUsd = 0;
    if (llmEnabled()) {
        try {
            const p = renderPrompt("skill-propose", {
                said,
                rules: rules.map((r) => `- ${r.rule}${r.why ? ` (why: ${r.why})` : ""}`).join("\n"),
                about: input.about || "A finished piece of creative.",
                files: files.map((f) => `### ${f}\n${readInstructionFile(f)!.text.slice(0, 30000)}`).join("\n\n"),
            });
            const out = await callStructured({ brandId: input.brandId, task: "skill_propose", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: ProposeAnswer, effort: "medium", maxTokens: 1500, refType: "feedback", refId: input.feedbackId });
            costUsd = out.costUsd ?? 0;
            const a = out.data;
            if (a.skip)
                return null;
            if (files.includes(a.file))
                file = a.file;
            if (a.text.trim().length >= 8) {
                const tried: SkillPatch = { op: a.op, heading: a.heading, old: a.old, text: a.text };
                try {
                    applyPatch(readInstructionFile(file)!.text, tried);
                    patch = tried;
                    summary = a.summary.trim() || summary;
                }
                catch {
                    summary = `${summary} (The model's own placing of it could not be made on the file as it is.)`;
                }
            }
        }
        catch {
            summary = `${summary} (No model placed it; the reader's wording is used.)`;
        }
    }
    const before = readInstructionFile(file)!.text;
    let after: string;
    try {
        after = applyPatch(before, patch);
    }
    catch (e) {
        return insert({ file, source: "feedback", brand_id: input.brandId, feedback_id: input.feedbackId, said, summary, before, after: before, patch, status: "failed", error: (e as Error).message, cost_usd: costUsd });
    }
    const check = checkEdit("skills", before, after);
    if (check.errors.length)
        return insert({ file, source: "feedback", brand_id: input.brandId, feedback_id: input.feedbackId, said, summary, before, after, patch, status: "failed", error: check.errors.join(" "), cost_usd: costUsd });
    return insert({ file, source: "feedback", brand_id: input.brandId, feedback_id: input.feedbackId, said, summary, before, after, patch, cost_usd: costUsd });
}
export async function proposeTighten(file: string, brandId = SHARED_BRAND): Promise<SkillProposalRow> {
    if (!isWatchedFile(file))
        throw new EditRefused("Only the skills behind Creative Studio and Landing pages can be tightened here.");
    const cur = readInstructionFile(file);
    if (!cur)
        throw new EditRefused("That file is not in the skills folder.");
    if (!llmEnabled())
        throw new EditRefused("Tightening needs live mode: a model rewrites the file shorter.");
    if (openProposals().some((p) => p.file === file && p.source === "tighten"))
        throw new EditRefused("A tightening of this file is already waiting. Decide that one first.");
    const fm = front(cur.text);
    const body = cur.text.slice(fm.length);
    const p = renderPrompt("skill-tighten", { file, body });
    const out = await callStructured({ brandId, task: "skill_tighten", model: env.MODEL_COPY, system: p.system, user: p.user, schema: TightenAnswer, effort: "high", maxTokens: 16000, refType: "feedback", refId: file });
    const after = `${fm}${out.data.text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim()}\n`;
    const fault = tightenFault(cur.text, after);
    if (fault)
        throw new EditRefused(`The tightened file was refused: ${fault}. The file is as it was. Try again, or tighten it by hand on Inspect.`);
    const check = checkEdit("skills", cur.text, after);
    if (check.errors.length)
        throw new EditRefused(check.errors.join(" "));
    const was = wordCount(cur.text);
    const now = wordCount(after);
    return insert({ file, source: "tighten", summary: `${out.data.summary.trim() || "Shorter, with every rule kept."} ${was} words to ${now}.`, before: cur.text, after, patch: null, cost_usd: out.costUsd ?? 0 });
}
export function decideProposal(id: string, decision: "accept" | "reject", by = ""): SkillProposalRow {
    const p = db.select().from(t).where(eq(t.id, id)).get();
    if (!p)
        throw new EditRefused("That proposal is not in the record.");
    if (p.status !== "open")
        throw new EditRefused(`That proposal was already ${p.status}.`);
    const now = new Date().toISOString();
    if (decision === "reject") {
        db.update(t).set({ status: "rejected", decided_at: now, decided_by: by, updated_at: now }).where(eq(t.id, id)).run();
        return db.select().from(t).where(eq(t.id, id)).get()!;
    }
    const cur = readInstructionFile(p.file);
    if (!cur)
        throw new EditRefused("The file is no longer there.");
    let after = p.after;
    if (cur.text !== p.before) {
        if (!p.patch)
            throw new EditRefused("The file changed after this tightening was made, so it no longer fits. Reject it and tighten again.");
        try {
            after = applyPatch(cur.text, p.patch);
        }
        catch (e) {
            throw new EditRefused(`The file changed after this was proposed and the change no longer fits: ${(e as PatchRefused).message}`);
        }
    }
    const note = p.source === "tighten" ? `Tightened. ${p.summary}` : `From feedback: ${p.summary}${p.said ? ` ("${p.said.slice(0, 200)}")` : ""}`;
    const saved = saveInstructionFile(p.file, after, note, { source: p.source, by });
    db.update(t).set({ status: "accepted", after, decided_at: now, decided_by: by, edit_id: saved.edit?.id ?? null, updated_at: now }).where(eq(t.id, id)).run();
    return db.select().from(t).where(eq(t.id, id)).get()!;
}
export function openProposals(): SkillProposalRow[] {
    return db.select().from(t).where(eq(t.status, "open")).orderBy(desc(t.created_at)).all();
}
export function listProposals(limit = 100): SkillProposalRow[] {
    return db.select().from(t).orderBy(desc(t.created_at)).limit(limit).all();
}
export function getProposal(id: string): SkillProposalRow | undefined {
    return db.select().from(t).where(eq(t.id, id)).get();
}
export function proposalsOfFeedback(feedbackId: string): SkillProposalRow[] {
    return db.select().from(t).where(eq(t.feedback_id, feedbackId)).all();
}
export interface SkillState extends WatchedSkill {
    version: number;
    words: number;
    changedAt: string | null;
    open: number;
}
export function skillStates(): SkillState[] {
    const open = openProposals();
    return watchedSkills().map((s) => {
        const v = fileVersions(s.file);
        const text = readInstructionFile(s.file)?.text ?? "";
        return { ...s, version: v.length ? v[v.length - 1].version : 1, words: wordCount(text), changedAt: v.length ? v[v.length - 1].at : null, open: open.filter((p) => p.file === s.file).length };
    });
}
