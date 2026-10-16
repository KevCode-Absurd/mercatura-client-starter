import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import type { EditPlan } from "./plan";
export interface VideoEdit {
    id: string;
    brandId: string;
    title: string;
    at: string;
    seconds: number;
    size: [
        number,
        number
    ];
    plan: EditPlan;
    sources: string[];
    music: string | null;
    voice?: string | null;
    files: ("clean.mp4" | "captioned.mp4")[];
    notes: string[];
    skill: string;
}
export function editRoot(brandId: string): string {
    return path.join(env.DATA_DIR, "video-edits", crypto.createHash("sha256").update(brandId).digest("hex").slice(0, 24));
}
export function editDirectory(brandId: string, id: string): string {
    if (!/^[a-f0-9]{32}$/.test(id))
        throw new Error("Video edit not found.");
    const root = path.resolve(editRoot(brandId));
    const dir = path.resolve(root, id);
    if (path.dirname(dir) !== root)
        throw new Error("Video edit not found.");
    return dir;
}
export function getVideoEdit(brandId: string, id: string): VideoEdit | null {
    const file = path.join(editDirectory(brandId, id), "edit.json");
    if (!fs.existsSync(file))
        return null;
    const edit = JSON.parse(fs.readFileSync(file, "utf8")) as VideoEdit;
    return edit.brandId === brandId && edit.id === id ? edit : null;
}
export function listVideoEdits(brandId: string): VideoEdit[] {
    const root = editRoot(brandId);
    if (!fs.existsSync(root))
        return [];
    return fs.readdirSync(root).filter((id) => /^[a-f0-9]{32}$/.test(id)).flatMap((id) => {
        try {
            return getVideoEdit(brandId, id) ?? [];
        }
        catch {
            return [];
        }
    }).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
}
