import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
export const EXAMPLE_DIR = "_formats";
export function exampleOf(id: string): string | null {
    for (const ext of ["jpg", "png", "webp"]) {
        const rel = `${EXAMPLE_DIR}/${id}.${ext}`;
        if (fs.existsSync(path.join(env.DATA_DIR, "assets", rel)))
            return rel;
    }
    return null;
}
export const assetExists = (rel: string | null | undefined): rel is string => !!rel && fs.existsSync(path.join(env.DATA_DIR, "assets", rel));
