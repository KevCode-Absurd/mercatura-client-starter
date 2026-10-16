import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
export const hashMediaBytes = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export function hashMediaFile(file: string, allowedRoots: string[]) {
    const resolved = fs.realpathSync(file);
    if (!allowedRoots.some(root => { const relative = path.relative(fs.realpathSync(root), resolved); return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative); }))
        throw new Error("Media file is outside the allowed asset roots.");
    const stat = fs.statSync(resolved);
    if (!stat.isFile() || stat.size > 256 * 1024 * 1024)
        throw new Error("Media must be a local file under 256 MiB.");
    return { sha256: hashMediaBytes(fs.readFileSync(resolved)), bytes: stat.size };
}
