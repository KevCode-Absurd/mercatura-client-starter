import fs from "node:fs";
import path from "node:path";
import { coverageInput } from "../coverage/account";
import { env } from "../env";
import { coverage } from "../coverage/analyze";
import { brandLessons } from "../lessons";
import { getSetting } from "../settings";
import { clearBriefCache } from "./brief";
import { addLearning, brainDocPath, logChange, readDoc, removeLearning, today, writeDoc, type LearningKind } from "./docs";
import { learningLine, proposeLearnings, type LearnInput, type Proposal } from "./learn-rules";
import { addSection, fieldItem, fieldValue, noLongDash } from "./md";
export interface LearnEntry {
    subject: string;
    target: Proposal["target"];
    text: string;
    line: string;
    evidence: string[];
    source: Proposal["source"];
    simulated: boolean;
    status: "applied" | "dismissed" | "reverted";
    at: string;
    updates: number;
}
export interface LearnState {
    entries: LearnEntry[];
    runs: {
        at: string;
        found: number;
        added: number;
        updated: number;
    }[];
}
export const learningFile = (brandId: string) => path.join(path.dirname(brainDocPath(brandId, "brain")), "learning.json");
export function loadLearning(brandId: string): LearnState {
    try {
        const raw = JSON.parse(fs.readFileSync(learningFile(brandId), "utf-8")) as Partial<LearnState>;
        return { entries: raw.entries ?? [], runs: raw.runs ?? [] };
    }
    catch {
        return { entries: [], runs: [] };
    }
}
function saveLearning(brandId: string, state: LearnState): void {
    fs.mkdirSync(path.dirname(learningFile(brandId)), { recursive: true });
    fs.writeFileSync(learningFile(brandId), `${JSON.stringify({ entries: state.entries, runs: state.runs.slice(-30) }, null, 2)}\n`, "utf-8");
}
export function learnInput(brandId: string): LearnInput {
    const input: LearnInput = { coverage: null, account: null, lessons: [], winners: [] };
    try {
        const ci = coverageInput(brandId);
        input.coverage = coverage(ci);
        input.account = { simulated: ci.account.simulated, period: ci.account.period };
    }
    catch {
    }
    try {
        input.lessons = brandLessons(brandId)
            .filter((l) => l.status === "active" && l.scope !== "general" && l.source === "feedback")
            .map((l) => ({ id: l.id, rule: l.rule, why: l.why, kind: l.kind, times: l.times }));
    }
    catch {
    }
    try {
        const { doc } = readDoc(brandId, "winning");
        input.winners = doc.sections
            .filter((s) => s.level === 2 && fieldValue(s, "Result"))
            .map((s) => ({ name: s.title.replace(/^[^:]{0,24}:\s*/, ""), kind: fieldValue(s, "Kind") || "ad", result: fieldValue(s, "Result"), why: fieldValue(s, "Why it works") }));
    }
    catch {
    }
    return input;
}
export interface Learned {
    pending: Proposal[];
    added: number;
    updated: number;
    state: LearnState;
}
const TARGET_WORDS: Record<Proposal["target"], string> = { works: "what works", avoid: "what to avoid", ideas: "ideas to explore", questions: "open questions" };
function write(brandId: string, state: LearnState, p: Proposal, was: LearnEntry | undefined): LearnEntry {
    const line = learningLine(p, today());
    if (was?.line)
        removeLearning(brandId, was.line);
    addLearning(brandId, p.target as LearningKind, line, { first: true });
    logChange(brandId, { type: "Learning", description: `${was?.line ? "The brain updated a line under" : "The brain added a line under"} ${TARGET_WORDS[p.target]}: ${p.text}` });
    const entry: LearnEntry = { subject: p.subject, target: p.target, text: p.text, line: noLongDash(line).replace(/\s+/g, " ").trim().slice(0, 500), evidence: p.evidence, source: p.source, simulated: p.simulated, status: "applied", at: new Date().toISOString(), updates: was ? was.updates + (was.status === "applied" ? 1 : 0) : 0 };
    state.entries = [...state.entries.filter((e) => e.subject !== p.subject), entry];
    return entry;
}
export function learn(brandId: string, opts: {
    auto?: boolean;
} = {}): Learned {
    const auto = opts.auto ?? getSetting(brandId, "brain_learning").auto;
    const state = loadLearning(brandId);
    const proposals = proposeLearnings(learnInput(brandId));
    const pending: Proposal[] = [];
    let added = 0;
    let updated = 0;
    for (const p of proposals) {
        const was = state.entries.find((e) => e.subject === p.subject);
        if (was && was.status !== "applied")
            continue;
        if (was && was.text === p.text && was.target === p.target)
            continue;
        if ((auto && !p.simulated) || (was && was.status === "applied" && (auto || was.simulated))) {
            write(brandId, state, p, was);
            if (was)
                updated++;
            else
                added++;
        }
        else
            pending.push(p);
    }
    if (added || updated)
        clearBriefCache();
    if (added || updated || proposals.length !== state.runs.at(-1)?.found) {
        state.runs.push({ at: new Date().toISOString(), found: proposals.length, added, updated });
        saveLearning(brandId, state);
    }
    return { pending, added, updated, state };
}
export function learnQuietly(brandId: string): void {
    if (env.LLM_MODE !== "live")
        return;
    try {
        learn(brandId);
    }
    catch {
    }
}
export function applyLearning(brandId: string, subject: string): LearnEntry {
    const state = loadLearning(brandId);
    const p = proposeLearnings(learnInput(brandId)).find((x) => x.subject === subject);
    if (!p)
        throw new Error("That learning is no longer there: what it rested on has changed. Press Check now.");
    const entry = write(brandId, state, p, state.entries.find((e) => e.subject === subject));
    saveLearning(brandId, state);
    clearBriefCache();
    return entry;
}
export function dismissLearning(brandId: string, subject: string): void {
    const state = loadLearning(brandId);
    const p = proposeLearnings(learnInput(brandId)).find((x) => x.subject === subject);
    const was = state.entries.find((e) => e.subject === subject);
    state.entries = [...state.entries.filter((e) => e.subject !== subject), { subject, target: p?.target ?? was?.target ?? "works", text: p?.text ?? was?.text ?? "", line: "", evidence: p?.evidence ?? was?.evidence ?? [], source: p?.source ?? was?.source ?? "account", simulated: p?.simulated ?? was?.simulated ?? false, status: "dismissed", at: new Date().toISOString(), updates: was?.updates ?? 0 }];
    saveLearning(brandId, state);
}
export function revertLearning(brandId: string, subject: string): void {
    const state = loadLearning(brandId);
    const was = state.entries.find((e) => e.subject === subject);
    if (!was)
        throw new Error("That learning is not on record.");
    if (was.line)
        removeLearning(brandId, was.line);
    logChange(brandId, { type: "Learning", description: `Taken back out of the brain by a person: ${was.text}` });
    state.entries = state.entries.map((e) => (e.subject === subject ? { ...e, line: "", status: "reverted", at: new Date().toISOString() } : e));
    saveLearning(brandId, state);
    clearBriefCache();
}
export function restoreLearning(brandId: string, subject: string): void {
    const state = loadLearning(brandId);
    state.entries = state.entries.filter((e) => e.subject !== subject || e.status === "applied");
    saveLearning(brandId, state);
}
export const WINNER_KINDS = ["Ad", "Landing page", "Email", "Primary text", "Headline", "Other"] as const;
export interface WinnerInput {
    kind: (typeof WINNER_KINDS)[number];
    name: string;
    result: string;
    says: string;
    why: string;
    link: string;
}
export function addWinner(brandId: string, w: WinnerInput): void {
    const name = noLongDash(w.name).replace(/\s+/g, " ").trim().slice(0, 100);
    if (!name)
        throw new Error("Give it a name.");
    if (!w.result.trim())
        throw new Error("Say how it did: a number, or what it beat.");
    const { doc } = readDoc(brandId, "winning");
    const title = `${w.kind}: ${name}`;
    if (doc.sections.some((s) => s.title.trim().toLowerCase() === title.toLowerCase()))
        throw new Error("A winner with that name is already there. Edit it on this tab.");
    const clean = (s: string, n: number) => noLongDash(s).replace(/\s+/g, " ").trim().slice(0, n);
    addSection(doc, {
        level: 2,
        title,
        blocks: [
            {
                kind: "list",
                ordered: false,
                items: [fieldItem("Kind", w.kind), fieldItem("Result", clean(w.result, 300)), ...(w.says.trim() ? [fieldItem("What it says", clean(w.says, 1500))] : []), ...(w.why.trim() ? [fieldItem("Why it works", clean(w.why, 400))] : []), ...(w.link.trim() ? [fieldItem("Link", clean(w.link, 300))] : []), fieldItem("Added", `${today()}, by the team`)],
            },
        ],
    });
    writeDoc(brandId, "winning", doc);
    logChange(brandId, { type: "Winner", description: `Added to the winning work: ${w.kind.toLowerCase()} "${name}" (${clean(w.result, 120)}).` });
}
