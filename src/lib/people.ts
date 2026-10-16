import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "./brand-brain";
import { getBrandRow } from "./brands";
import { grabFrame } from "./media/ffmpeg";
import { PERSON_ROLES, type BrandPerson, type PersonRole } from "./people-types";
export * from "./people-types";
const Person = z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(PERSON_ROLES),
    kind: z.enum(["image", "video"]),
    file: z.string(),
    still: z.string(),
    note: z.string().default(""),
    consent: z.boolean().default(false),
    added_at: z.string(),
});
const FileSchema = z.object({ people: z.array(Person).default([]) });
const KINDS: Record<string, "image" | "video"> = { ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".mp4": "video", ".mov": "video", ".webm": "video" };
export const PEOPLE_MAX_BYTES = 200 * 1024 * 1024;
function root(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return brandBrainDir(row.dir);
}
const listFile = (brandId: string) => path.join(root(brandId), "people.json");
const dir = (brandId: string) => path.join(root(brandId), "people");
export function loadPeople(brandId: string): BrandPerson[] {
    const f = listFile(brandId);
    if (!fs.existsSync(f))
        return [];
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf-8")));
    return parsed.success ? parsed.data.people : [];
}
function save(brandId: string, people: BrandPerson[]) {
    fs.writeFileSync(listFile(brandId), `${JSON.stringify({ people }, null, 2)}\n`, "utf-8");
}
export async function addPerson(brandId: string, input: {
    fileName: string;
    bytes: Buffer;
    name: string;
    role: PersonRole;
    note?: string;
    consent: boolean;
}): Promise<BrandPerson> {
    const ext = path.extname(input.fileName).toLowerCase();
    const kind = KINDS[ext];
    if (!kind)
        throw new Error("Use a JPG, PNG, WebP, MP4, MOV or WebM file.");
    if (input.bytes.length > PEOPLE_MAX_BYTES)
        throw new Error("The file is over 200 MB.");
    if (!input.name.trim())
        throw new Error("Say who this is.");
    const id = `ppl_${createHash("sha256").update(input.bytes).digest("hex").slice(0, 10)}`;
    const people = loadPeople(brandId);
    if (people.some((p) => p.id === id))
        throw new Error("That file is already here.");
    fs.mkdirSync(dir(brandId), { recursive: true });
    const file = `${id}${ext}`;
    fs.writeFileSync(path.join(dir(brandId), file), input.bytes);
    let still = file;
    if (kind === "video") {
        still = `${id}.jpg`;
        try {
            await grabFrame(path.join(dir(brandId), file), 1, path.join(dir(brandId), still), 1080);
        }
        catch (e) {
            fs.rmSync(path.join(dir(brandId), file), { force: true });
            throw new Error(`The video couldn't be read: ${(e as Error).message.slice(0, 140)}`);
        }
    }
    const person: BrandPerson = { id, name: input.name.trim().slice(0, 80), role: input.role, kind, file, still, note: (input.note ?? "").trim().slice(0, 200), consent: input.consent, added_at: new Date().toISOString() };
    save(brandId, [...people, person]);
    return person;
}
export function updatePerson(brandId: string, id: string, patch: Partial<Pick<BrandPerson, "name" | "role" | "note" | "consent">>): void {
    const people = loadPeople(brandId);
    const p = people.find((x) => x.id === id);
    if (!p)
        throw new Error("That person is no longer in the list.");
    Object.assign(p, patch);
    save(brandId, people);
}
export function removePerson(brandId: string, id: string): void {
    const people = loadPeople(brandId);
    const p = people.find((x) => x.id === id);
    if (!p)
        return;
    for (const f of new Set([p.file, p.still]))
        fs.rmSync(path.join(dir(brandId), f), { force: true });
    save(brandId, people.filter((x) => x.id !== id));
}
export function personFor(brandId: string, role: PersonRole): (BrandPerson & {
    abs: string;
}) | null {
    const p = loadPeople(brandId).find((x) => x.role === role && x.consent && fs.existsSync(path.join(dir(brandId), x.still)));
    return p ? { ...p, abs: path.join(dir(brandId), p.still) } : null;
}
export function personById(brandId: string, id: string): (BrandPerson & {
    abs: string;
}) | null {
    const p = loadPeople(brandId).find((x) => x.id === id && x.consent);
    return p && fs.existsSync(path.join(dir(brandId), p.still)) ? { ...p, abs: path.join(dir(brandId), p.still) } : null;
}
