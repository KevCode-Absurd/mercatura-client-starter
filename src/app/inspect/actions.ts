"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { restoreEdit, saveInstructionFile } from "@/lib/inspect/edits";
import { addNote, deleteNote, setNote, type Note } from "@/lib/inspect/notes";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you entered.") : e instanceof Error ? e.message : String(e) });
const touch = () => revalidatePath("/inspect", "layout");
const Target = z.object({
    kind: z.enum(["step", "block", "call", "answer", "file", "media"]),
    task: z.string().regex(/^[a-z_]+$/).nullish(),
    part: z.enum(["system", "user"]).nullish(),
    block: z.string().max(300).nullish(),
    callId: z.string().max(80).nullish(),
    file: z.string().max(300).nullish(),
});
export async function addNoteAction(target: z.input<typeof Target>, text: string): Promise<Result<{
    note: Note;
}>> {
    try {
        const note = addNote(Target.parse(target), z.string().max(4000).parse(text));
        touch();
        return { ok: true, note };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setNoteAction(id: string, status: "open" | "done", resolution = ""): Promise<Result<{
    note: Note;
}>> {
    try {
        const note = setNote(z.string().parse(id), z.enum(["open", "done"]).parse(status), z.string().max(2000).parse(resolution));
        touch();
        return { ok: true, note };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteNoteAction(id: string): Promise<Result> {
    try {
        deleteNote(z.string().parse(id));
        touch();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveFileAction(file: string, text: string, note: string): Promise<Result<{
    saved: boolean;
    id: string | null;
    warnings: string[];
}>> {
    try {
        const res = saveInstructionFile(z.string().max(300).parse(file), z.string().max(400000).parse(text), z.string().max(1000).parse(note));
        touch();
        return { ok: true, saved: !!res.edit, id: res.edit?.id ?? null, warnings: res.warnings };
    }
    catch (e) {
        return fail(e);
    }
}
export async function restoreEditAction(id: string): Promise<Result<{
    saved: boolean;
    warnings: string[];
}>> {
    try {
        const res = restoreEdit(z.string().parse(id));
        touch();
        return { ok: true, saved: !!res.edit, warnings: res.warnings };
    }
    catch (e) {
        return fail(e);
    }
}
