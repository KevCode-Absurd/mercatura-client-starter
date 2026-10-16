import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { grabFrame } from "../media/ffmpeg";
const working = new Map<string, Promise<string | null>>();
export const THUMB_WIDTHS = new Set([160, 480]);
const resizing = new Map<string, Promise<string | null>>();
export function resizedThumb(id: string, source: string, width: number): Promise<string | null> {
    const out = path.resolve(env.DATA_DIR, "thumbs", String(width), `${id}.webp`);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(source).mtimeMs)
        return Promise.resolve(out);
    const key = `${id}:${width}`;
    const running = resizing.get(key);
    if (running)
        return running;
    const job = (async () => {
        try {
            const { default: sharp } = await import("sharp");
            fs.mkdirSync(path.dirname(out), { recursive: true });
            await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
            return out;
        }
        catch {
            return null;
        }
    })().finally(() => resizing.delete(key));
    resizing.set(key, job);
    return job;
}
export function ensureReferenceThumb(id: string): Promise<string | null> {
    const running = working.get(id);
    if (running)
        return running;
    const job = (async () => {
        const ref = db.select({ kind: schema.adReferences.kind, media: schema.adReferences.media_path, root: schema.adReferences.media_root, thumb: schema.adReferences.thumb_path, duration: schema.adReferences.duration }).from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
        if (!ref)
            return null;
        if (ref.thumb)
            return ref.thumb;
        if (ref.kind !== "video" || ref.root !== "data" || !ref.media)
            return null;
        const source = path.resolve(env.DATA_DIR, ref.media);
        if (!source.startsWith(env.DATA_DIR + path.sep) || !fs.existsSync(source))
            return null;
        const rel = `${ref.media.replace(/\.[^./]+$/, "")}.thumb.jpg`;
        const out = path.resolve(env.DATA_DIR, rel);
        try {
            const at = ref.duration && ref.duration < 10 ? ref.duration / 10 : 1;
            await grabFrame(source, at, out);
            if (!fs.existsSync(out) || fs.statSync(out).size === 0)
                return null;
        }
        catch {
            return null;
        }
        db.update(schema.adReferences).set({ thumb_path: rel }).where(eq(schema.adReferences.id, id)).run();
        return rel;
    })().finally(() => working.delete(id));
    working.set(id, job);
    return job;
}
