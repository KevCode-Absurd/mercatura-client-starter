import fs from "node:fs";
import { currentOutputs } from "./outputs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StudioRunRow } from "@/db/schema";
import { env } from "../env";
import { ffmpeg } from "../media/ffmpeg";
export const REEL_CUT = 0.3;
export const REEL_SECONDS = 9;
const SIZE: Record<string, [
    number,
    number
]> = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920], "3:2": [1620, 1080] };
export function reelOrder(files: string[], cut = REEL_CUT, seconds = REEL_SECONDS): string[] {
    if (!files.length)
        return [];
    const want = Math.max(files.length, Math.ceil(seconds / cut));
    return Array.from({ length: want }, (_, i) => files[i % files.length]);
}
export async function makeReel(run: StudioRunRow): Promise<string | null> {
    const aspect = run.aspects[0];
    const files = run.items
        .map((i) => currentOutputs(i.outputs).find((o) => o.aspect === aspect))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => path.join(env.DATA_DIR, "assets", o.path))
        .filter((f) => fs.existsSync(f));
    if (files.length < 2)
        return null;
    const dir = path.join(env.DATA_DIR, "assets", run.id);
    const list = path.join(dir, "reel.txt");
    const order = reelOrder(files);
    const line = (f: string) => `file '${f.split(path.sep).join("/").replace(/'/g, "'\\''")}'`;
    fs.writeFileSync(list, [...order.flatMap((f) => [line(f), `duration ${REEL_CUT}`]), line(order[order.length - 1])].join("\n"));
    const [w, h] = SIZE[aspect] ?? [1080, 1350];
    const out = path.join(dir, "reel.mp4");
    await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`, "-r", "30", "-c:v", "libx264", "-movflags", "+faststart", "-an", out]);
    fs.rmSync(list, { force: true });
    const rel = `${run.id}/reel.mp4`;
    const fresh = db.select().from(schema.studioRuns).where(eq(schema.studioRuns.id, run.id)).get();
    if (fresh)
        db.update(schema.studioRuns).set({ context: { ...fresh.context, reel_path: rel }, log: [...fresh.log, { at: new Date().toISOString(), message: `A ${Math.round(order.length * REEL_CUT)}-second reel was cut from ${files.length} pictures (no sound)` }] }).where(eq(schema.studioRuns.id, run.id)).run();
    return rel;
}
