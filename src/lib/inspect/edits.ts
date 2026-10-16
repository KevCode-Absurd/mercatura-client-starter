import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { checkEdit, keepShape } from "./edit-check";
import { forgetSkillMap, readInstructionFile, rootDir } from "./skill-map";
const t = schema.instructionEdits;
export type EditSource = "hand" | "feedback" | "tighten" | "restore";
export interface EditRow {
    id: string;
    at: string;
    file: string;
    note: string;
    source: EditSource;
    by: string;
    charsBefore: number;
    charsAfter: number;
}
const nextId = () => {
    const all = db.select({ id: t.id }).from(t).all();
    return `edit_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
const row = (e: {
    id: string;
    created_at: string;
    file: string;
    note: string;
    before: string;
    after: string;
    source: EditSource;
    by: string;
}): EditRow => ({ id: e.id, at: e.created_at, file: e.file, note: e.note, source: e.source, by: e.by, charsBefore: e.before.length, charsAfter: e.after.length });
export class EditRefused extends Error {
}
export function saveInstructionFile(file: string, text: string, note = "", origin: {
    source?: EditSource;
    by?: string;
} = {}): {
    edit: EditRow | null;
    warnings: string[];
} {
    const cur = readInstructionFile(file);
    if (!cur)
        throw new EditRefused("Only the text files in the skills and prompts folders can be changed here.");
    const after = keepShape(cur.text, text);
    if (after === cur.text)
        return { edit: null, warnings: [] };
    const check = checkEdit(cur.root, cur.text, after);
    if (check.errors.length)
        throw new EditRefused(check.errors.join(" "));
    const id = nextId();
    fs.writeFileSync(path.join(rootDir(cur.root), cur.rel), after, "utf-8");
    db.insert(t).values({ id, file, before: cur.text, after, note: note.trim().slice(0, 1000), source: origin.source ?? "hand", by: (origin.by ?? "").slice(0, 120) }).run();
    forgetSkillMap();
    return { edit: row(db.select().from(t).where(eq(t.id, id)).get()!), warnings: check.warnings };
}
export function restoreEdit(id: string, by = ""): {
    edit: EditRow | null;
    warnings: string[];
} {
    const e = db.select().from(t).where(eq(t.id, id)).get();
    if (!e)
        throw new EditRefused("That change is not in the record.");
    return saveInstructionFile(e.file, e.before, `Put back to the text before ${e.id}.`, { source: "restore", by });
}
export function fileVersions(file: string): (EditRow & {
    version: number;
})[] {
    return db
        .select()
        .from(t)
        .where(eq(t.file, file))
        .orderBy(t.created_at, t.id)
        .all()
        .map((e, i) => ({ ...row(e), version: i + 2 }));
}
export function fileEdits(file: string): EditRow[] {
    return db.select().from(t).where(eq(t.file, file)).orderBy(desc(t.created_at)).all().map(row);
}
export function allEdits(limit = 100): EditRow[] {
    return db.select().from(t).orderBy(desc(t.created_at)).limit(limit).all().map(row);
}
export function getEdit(id: string): {
    row: EditRow;
    before: string;
    after: string;
} | null {
    const e = db.select().from(t).where(eq(t.id, id)).get();
    return e ? { row: row(e), before: e.before, after: e.after } : null;
}
