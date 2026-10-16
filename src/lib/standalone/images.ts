import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { env } from "../env";
export async function imageSignature(relative: string) {
    const root = path.resolve(env.DATA_DIR, "assets");
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file))
        return null;
    const real = fs.realpathSync(file), realRoot = fs.realpathSync(root);
    if (!real.startsWith(realRoot + path.sep))
        return null;
    try {
        const pixels = await sharp(real).rotate().resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer();
        return Array.from({ length: 64 }, (_, i) => pixels[Math.floor(i / 8) * 9 + i % 8] > pixels[Math.floor(i / 8) * 9 + i % 8 + 1] ? "1" : "0").join("");
    }
    catch {
        return null;
    }
}
export function imageDistance(a: string, b: string) { return [...a].filter((bit, i) => bit !== b[i]).length; }
