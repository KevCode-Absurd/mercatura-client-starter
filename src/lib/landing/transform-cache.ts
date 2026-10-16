import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "../env";
import { withResourceLane } from "../production-ops/lanes";
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const pending = new Map<string, Promise<string>>();
export type TransformSpec = {
    width: number;
    crop?: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    quality?: number;
    policy?: string;
};
export async function cachedImageTransform(scope: string, source: string, spec: TransformSpec): Promise<string> {
    const identity = hash(JSON.stringify({ scope, sha256: hash(fs.readFileSync(source)), ...spec, policy: spec.policy ?? "landing-review-jpeg-v1" }));
    const folder = path.join(env.DATA_DIR, "landing-cache", hash(scope).slice(0, 20), "t"), target = path.join(folder, `${identity.slice(0, 40)}.jpg`);
    if (fs.existsSync(target)) {
        try {
            const receipt = JSON.parse(fs.readFileSync(`${target}.json`, "utf8"));
            if (receipt.identity === identity && receipt.sha256 === hash(fs.readFileSync(target)))
                return target;
        }
        catch { }
    }
    if (pending.has(target))
        return pending.get(target)!;
    const task = withResourceLane("cpu", async () => { fs.mkdirSync(folder, { recursive: true }); const temp = `${target}.${randomUUID().slice(0, 8)}.tmp`; try {
        let pipeline = sharp(source).rotate();
        if (spec.crop)
            pipeline = pipeline.extract(spec.crop);
        await pipeline.resize({ width: spec.width }).jpeg({ quality: spec.quality ?? 78 }).toFile(temp);
        fs.renameSync(temp, target);
        fs.writeFileSync(`${target}.json`, JSON.stringify({ identity, sha256: hash(fs.readFileSync(target)) }));
        return target;
    }
    finally {
        if (fs.existsSync(temp))
            fs.unlinkSync(temp);
    } }).finally(() => pending.delete(target));
    pending.set(target, task);
    return task;
}
