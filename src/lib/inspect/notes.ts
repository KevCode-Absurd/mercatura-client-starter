import { desc, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { blockKey } from "./blocks";
const t = schema.inspectNotes;
export type NoteKind = "step" | "block" | "call" | "answer" | "file" | "media";
export interface NoteTarget {
    kind: NoteKind;
    task?: string | null;
    part?: "system" | "user" | null;
    block?: string | null;
    callId?: string | null;
    file?: string | null;
}
export interface Note extends Required<NoteTarget> {
    id: string;
    at: string;
    text: string;
    status: "open" | "done";
    resolution: string;
}
const nextId = () => {
    const all = db.select({ id: t.id }).from(t).all();
    return `note_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
const note = (n: typeof t.$inferSelect): Note => ({ id: n.id, at: n.created_at, kind: n.kind, task: n.task, part: n.part, block: n.block, callId: n.call_id, file: n.file, text: n.text, status: n.status, resolution: n.resolution });
const now = () => new Date().toISOString();
export function addNote(target: NoteTarget, text: string): Note {
    const body = text.trim();
    if (body.length < 3)
        throw new Error("Say what you saw or what should change, in a few words.");
    const id = nextId();
    db.insert(t)
        .values({ id, kind: target.kind, task: target.task ?? null, part: target.part ?? null, block: target.block ? blockKey(target.block) : null, call_id: target.callId ?? null, file: target.file ?? null, text: body.slice(0, 4000) })
        .run();
    return note(db.select().from(t).where(eq(t.id, id)).get()!);
}
export function setNote(id: string, status: "open" | "done", resolution = ""): Note {
    const had = db.select().from(t).where(eq(t.id, id)).get();
    if (!had)
        throw new Error("That note is no longer there.");
    db.update(t).set({ status, resolution: status === "done" ? resolution.trim().slice(0, 2000) : had.resolution, updated_at: now() }).where(eq(t.id, id)).run();
    return note(db.select().from(t).where(eq(t.id, id)).get()!);
}
export function deleteNote(id: string) {
    db.delete(t).where(eq(t.id, id)).run();
}
const newest = (rows: (typeof t.$inferSelect)[]) => rows.map(note).sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || b.at.localeCompare(a.at));
export const allNotes = (): Note[] => newest(db.select().from(t).orderBy(desc(t.created_at)).all());
export const stepNotes = (task: string): Note[] => newest(db.select().from(t).where(eq(t.task, task)).all());
export const callNotes = (callId: string, task: string | null): Note[] => newest(db.select().from(t).where(task ? or(eq(t.call_id, callId), sql `${t.task} = ${task} and ${t.kind} = 'block'`) : eq(t.call_id, callId)).all());
export const fileNotes = (file: string): Note[] => newest(db.select().from(t).where(eq(t.file, file)).all());
export function openNotes(): {
    byTask: Map<string, number>;
    byFile: Map<string, number>;
    open: number;
} {
    const rows = db.select({ task: t.task, file: t.file }).from(t).where(eq(t.status, "open")).all();
    const byTask = new Map<string, number>();
    const byFile = new Map<string, number>();
    for (const r of rows) {
        if (r.task)
            byTask.set(r.task, (byTask.get(r.task) ?? 0) + 1);
        if (r.file)
            byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1);
    }
    return { byTask, byFile, open: rows.length };
}
export const forBlock = (notes: Note[], part: string, label: string) => notes.filter((n) => n.kind === "block" && n.part === part && n.block === blockKey(label));
