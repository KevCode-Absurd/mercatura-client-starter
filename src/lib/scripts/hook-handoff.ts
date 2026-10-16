import { z } from "zod";
import type { AuditItem, HookVariant, ScriptLine } from "@/db/schema";
import { env } from "../env";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { alike, hookLines } from "./versions";
export interface HandoffFault {
    kind: "person" | "repeats";
    what: string;
}
const plain = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");
const unquoted = (s: string) => plain(s).replace(/"[^"]*"|“[^”]*”/g, " ");
const wordsOf = (s: string) => plain(s).match(/[a-z0-9']+/g) ?? [];
const figures = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
export function personOf(text: string): "first" | "second" | "both" | "none" {
    const t = unquoted(text);
    const mine = /\b(i|i'm|i've|i'd|i'll|my|me|mine|myself)\b/.test(t);
    const yours = /\b(you|you're|you've|you'd|you'll|your|yours|yourself)\b/.test(t);
    return mine && yours ? "both" : mine ? "first" : yours ? "second" : "none";
}
export function handoffFaults(hook: string, next: string, after = ""): HandoffFault[] {
    const out: HandoffFault[] = [];
    const h = personOf(hook);
    const body = personOf(next) === "none" ? personOf(after) : personOf(next);
    if (h === "first" && body === "second")
        out.push({ kind: "person", what: 'the hook is said by "I" and the next line talks to "you"' });
    const a = wordsOf(hook);
    const b = wordsOf(next);
    if (a.length >= 3 && b.length >= 3 && a.slice(0, 3).join(" ") === b.slice(0, 3).join(" "))
        out.push({ kind: "repeats", what: `the hook and the next line both open on "${next.trim().split(/\s+/).slice(0, 3).join(" ")}"` });
    else if (Math.min(a.length, b.length) >= 4 && alike(hook, next) >= 0.75)
        out.push({ kind: "repeats", what: "the hook says what the next line says" });
    return out;
}
export function saidAfter(lines: ScriptLine[], hook: HookVariant): {
    next: string;
    after: string;
} {
    const v = hookLines(lines, hook);
    return { next: v[1]?.text ?? "", after: v[2]?.text ?? "" };
}
const MAX_WORDS = 26;
export function refuseRewrite(text: string, was: string, next: string, after: string, known: Set<string>, others: string[]): string {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t)
        return "no rewrite came back";
    if (t === was.trim())
        return "the rewrite is the same words";
    if (wordsOf(t).length > MAX_WORDS)
        return "the rewrite is longer than 1 breath";
    const added = figures(t).filter((n) => !known.has(n) && !figures(was).includes(n));
    if (added.length)
        return `the rewrite states ${added.join(", ")}, which the script does not`;
    const still = handoffFaults(t, next, after);
    if (still.length)
        return `in the rewrite ${still[0].what}`;
    if (others.some((o) => alike(o, t) >= 0.8))
        return "the rewrite is an opening the script already has";
    return "";
}
export interface HandoffRow {
    id: string;
    fault: string;
    was?: string;
    now?: string;
    open: boolean;
}
const Out = z.object({ hooks: z.array(z.object({ n: z.number().int(), ok: z.boolean().default(true), fault: z.string().default(""), text: z.string().default("") })).max(12).default([]) });
export type HandoffOut = z.input<typeof Out>;
export interface HandoffRequest {
    brandId: string;
    brandName: string;
    refId: string;
    speaker: string;
    lines: ScriptLine[];
    hooks: HookVariant[];
    others: string[];
}
export function settleHandoff(req: Pick<HandoffRequest, "lines" | "others">, hooks: HookVariant[], rows: HandoffRow[], at: number[], out: HandoffOut): {
    hooks: HookVariant[];
    rows: HandoffRow[];
    again: number[];
} {
    const known = new Set(figures(req.lines.map((l) => l.text).join(" ")));
    const next = hooks.map((h) => ({ ...h }));
    const rowsOut = rows.map((r) => ({ ...r }));
    const again: number[] = [];
    at.forEach((i, k) => {
        const h = next[i];
        const said = saidAfter(req.lines, h);
        const code = handoffFaults(h.text, said.next, said.after);
        const read = (out.hooks ?? []).find((x) => x.n === k + 1);
        const fault = code[0]?.what ?? (read && !read.ok ? (read.fault ?? "").replace(/\s+/g, " ").trim() || "does not lead into the next line" : "");
        if (!fault) {
            rowsOut[i].open = false;
            return;
        }
        const others = [...req.others, ...next.filter((_, j) => j !== i).map((x) => x.text)];
        const text = (read?.text ?? "").replace(/\s+/g, " ").trim();
        const why = refuseRewrite(text, h.text, said.next, said.after, known, others);
        rowsOut[i].fault = rowsOut[i].fault || fault;
        if (why) {
            rowsOut[i].open = true;
            rowsOut[i].fault = `${fault} (${why})`;
        }
        else {
            rowsOut[i].was = rowsOut[i].was ?? h.text;
            rowsOut[i].now = text;
            rowsOut[i].open = false;
            next[i] = { ...h, text };
        }
        again.push(i);
    });
    return { hooks: next, rows: rowsOut, again };
}
export function handoffAudit(rows: HandoffRow[], hooks: HookVariant[], firstN = 2): AuditItem {
    const n = (id: string) => firstN + Math.max(0, hooks.findIndex((h) => h.id === id));
    const open = rows.filter((r) => r.open);
    const fixed = rows.filter((r) => !r.open && r.now);
    const parts = [
        ...fixed.map((r) => `Hook ${n(r.id)} was said again so the next line follows it (${r.fault}). Was: "${r.was}" Now: "${r.now}"`),
        ...open.map((r) => `Hook ${n(r.id)} does not lead into the line after it: ${r.fault}. Change it on the script's page, or remove it.`),
    ];
    if (!parts.length)
        return { check: "hook_handoff", status: "pass", message: `${rows.length === 1 ? "The further hook leads" : `All ${rows.length} further hooks lead`} into the line said after ${rows.length === 1 ? "it" : "them"}.` };
    return { check: "hook_handoff", status: open.length ? "warn" : "pass", message: parts.join(" ") };
}
const ROUNDS = 2;
export async function checkHandoffs(req: HandoffRequest): Promise<{
    hooks: HookVariant[];
    rows: HandoffRow[];
    calls: number;
}> {
    let hooks = req.hooks;
    let rows: HandoffRow[] = hooks.map((h) => ({ id: h.id, fault: "", open: false }));
    let at = hooks.map((_, i) => i);
    let calls = 0;
    for (let round = 0; round < ROUNDS && at.length; round++) {
        const p = renderPrompt("script-hook-handoff", {
            brand_name: req.brandName,
            speaker: req.speaker,
            note: round ? "These openings had a fault a moment ago. Some were said again: read each as it stands now. One listed with \"refused\" still has its fault: say it again another way." : "",
            hooks: at
                .map((i, k) => {
                const said = saidAfter(req.lines, hooks[i]);
                const code = handoffFaults(hooks[i].text, said.next, said.after);
                return [`${k + 1}. ${hooks[i].text}`, `   then: ${said.next}`, said.after ? `   the line after that: ${said.after}` : "", code.length ? `   code found: ${code.map((c) => c.what).join("; ")}` : "", round && rows[i].open ? `   refused: ${rows[i].fault}` : ""].filter(Boolean).join("\n");
            })
                .join("\n"),
        });
        const out = await structuredJson({ brandId: req.brandId, task: "script_hook_handoff", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: 1500, refType: "script", refId: req.refId });
        calls++;
        const settled = settleHandoff(req, hooks, rows, at, out);
        hooks = settled.hooks;
        rows = settled.rows;
        at = settled.again;
    }
    return { hooks, rows, calls };
}
