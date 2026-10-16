import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { currentOutputs } from "./outputs";
import type { StudioRunRow } from "@/db/schema";
import { env } from "../env";
import { getRun, saveItemPlan } from "./engine";
import { alikePairs, offerLineOf, signatureFrom, withOfferLine, type ThumbSignature } from "./offer-bank";
export function setOfferLine(runId: string, line: string): {
    changed: string[];
    pictured: string[];
} {
    const run = getRun(runId);
    if (!run)
        throw new Error("Set not found");
    const changed: string[] = [];
    const pictured: string[] = [];
    for (const item of run.items) {
        if (!item.plan)
            continue;
        const next = withOfferLine(item.plan.text_elements, line);
        if (!next.changed)
            continue;
        saveItemPlan(runId, item.id, { text_elements: next.texts });
        changed.push(item.id);
        if (item.outputs.length)
            pictured.push(item.id);
    }
    return { changed, pictured };
}
export function currentOfferLine(run: Pick<StudioRunRow, "items">): string {
    const count = new Map<string, number>();
    for (const i of run.items) {
        const l = offerLineOf(i.plan);
        if (l)
            count.set(l, (count.get(l) ?? 0) + 1);
    }
    return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
const seen = new Map<string, ThumbSignature>();
async function signature(abs: string): Promise<ThumbSignature | null> {
    try {
        const key = `${abs}:${fs.statSync(abs).mtimeMs}`;
        const had = seen.get(key);
        if (had)
            return had;
        const small = await sharp(abs).resize({ width: 300 }).toBuffer();
        const grey = await sharp(small).resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer();
        const { channels } = await sharp(small).stats();
        const sig = signatureFrom(grey, [channels[0]?.mean ?? 0, channels[1]?.mean ?? 0, channels[2]?.mean ?? 0]);
        seen.set(key, sig);
        return sig;
    }
    catch {
        return null;
    }
}
export async function thumbTwins(run: Pick<StudioRunRow, "items" | "aspects">): Promise<[
    number,
    number
][]> {
    const aspect = run.aspects[0];
    const sigs: {
        n: number;
        sig: ThumbSignature;
    }[] = [];
    for (const [i, item] of run.items.entries()) {
        const o = currentOutputs(item.outputs).find((x) => x.aspect === aspect);
        const sig = o ? await signature(path.join(env.DATA_DIR, "assets", o.path)) : null;
        if (sig)
            sigs.push({ n: i + 1, sig });
    }
    return alikePairs(sigs);
}
