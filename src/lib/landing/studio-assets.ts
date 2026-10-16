import fs from "node:fs";
import path from "node:path";
import { fontsDir } from "../brand-fonts";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { env } from "../env";
import type { CroRun } from "./studio-types";
export function containedFile(root: string, relative: string): string | null {
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
        return null;
    const real = fs.realpathSync(file), base = fs.realpathSync(root);
    return real.startsWith(base + path.sep) ? real : null;
}
export function fontCssFor(run: CroRun): string {
    return run.brand.fonts.map((f) => {
        const file = containedFile(fontsDir(run.brandId), f.file);
        if (!file)
            return "";
        const family = f.family.replace(/["'<>\\]/g, ""), weight = /^\d{2,4}( \d{2,4})?$/.test(f.weight) ? f.weight : "400";
        return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${f.style === "italic" ? "italic" : "normal"};font-display:swap;src:url(data:font/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString("base64")})}`;
    }).join("\n");
}
export function localAssetFile(run: CroRun, assetId: string): string | null {
    const asset = run.brand.assets.find((a) => a.id === assetId);
    if (!asset)
        return null;
    const row = getBrandRow(run.brandId);
    if (!row)
        return null;
    if (asset.local)
        return containedFile(path.join(brandBrainDir(row.dir), "assets"), asset.local);
    if (asset.src.startsWith("/api/assets/"))
        return containedFile(path.join(env.DATA_DIR, "assets"), decodeURIComponent(asset.src.slice(12)));
    return null;
}
export function inlineCroImages(run: CroRun): Record<string, string> {
    return Object.fromEntries(usedCroAssets(run).flatMap((a) => {
        const file = localAssetFile(run, a.id);
        if (!file)
            return [];
        const ext = path.extname(file).slice(1).toLowerCase(), mime = ext === "jpg" ? "jpeg" : ext;
        if (!["png", "jpeg", "webp", "gif"].includes(mime))
            return [];
        return [[a.id, `data:image/${mime};base64,${fs.readFileSync(file).toString("base64")}`]];
    }));
}
export function usedCroAssets(run: CroRun) {
    const used = new Set(run.sections.filter(s => s.enabled).flatMap(s => s.images.filter(i => s.html.includes(`{{image:${i.key}}}`)).map(i => i.assetId)));
    return run.brand.assets.filter(a => used.has(a.id));
}
