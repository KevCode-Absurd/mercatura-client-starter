import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { TextLayer } from "@/db/schema";
import { env } from "../env";
import { fontsDir, listBrandFonts, parseFontFaces, coversLatin } from "../brand-fonts";
import { readCheckpoint, saveCheckpoint, fingerprint } from "../production-ops/store";
import { withResourceLane } from "../production-ops/lanes";
import { hashMediaFile } from "../production-evidence/media-server";
import { getRun } from "./engine";
import { saveOverlay } from "./overlay-store";
import sharp from "sharp";
type FrozenFont = {
    id: string;
    weight: string;
    sha256: string;
    data: string;
};
type FrozenComposite = {
    baseSha256: string;
    layers: TextLayer[];
    fonts: FrozenFont[];
    inputHash: string;
    state: "prepared" | "completed" | "held";
    path?: string;
    findings: string[];
};
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
function stockFonts() { const dir = path.join(process.cwd(), process.env.NEXT_DIST_DIR || ".next"), css: string[] = []; function walk(p: string, depth: number) { if (depth > 7 || !fs.existsSync(p) || css.length > 1500)
    return; for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory())
        walk(f, depth + 1);
    else if (e.name.endsWith(".css"))
        css.push(f);
} } walk(path.join(dir, "static"), 0); return css.flatMap(file => parseFontFaces(fs.readFileSync(file, "utf8"), "https://local.invalid/" + path.basename(file)).filter(f => coversLatin(f.range) && !f.family.toLowerCase().includes("fallback")).flatMap(f => f.urls.map(url => ({ family: f.family, weight: f.weight, file: path.join(dir, "static", "media", path.basename(new URL(url).pathname)) })))); }
export function freezeCompositeFonts(brandId: string, layers: TextLayer[]): FrozenFont[] { const brand = listBrandFonts(brandId), stock = stockFonts(), result: FrozenFont[] = []; for (const id of new Set(layers.map(l => l.font))) {
    const weights = [...new Set(layers.filter(l => l.font === id).map(l => l.weight))];
    for (const weight of weights) {
        const covers = (range: string) => { const [a, b] = range.split(/\s+/).map(Number); return b ? weight >= a && weight <= b : a === weight; };
        let font: {
            file: string;
            weight: string;
        } | undefined;
        if (id.startsWith("brand:")) {
            const f = brand.find(f => f.family === id.slice(6) && f.style === "normal" && covers(f.weight));
            if (f)
                font = { file: path.join(fontsDir(brandId), path.basename(f.file)), weight: f.weight };
        }
        else {
            const family = { "stock:sans": "inter", "stock:serif": "playfair", "stock:tall": "anton" }[id];
            font = stock.find(f => family && f.family.toLowerCase().includes(family) && covers(f.weight) && fs.existsSync(f.file));
        }
        if (!font)
            throw new Error(`The exact ${id} font at weight ${weight} is unavailable. Restore its file/build assets; no substitute font will be used.`);
        const roots = id.startsWith("brand:") ? [fontsDir(brandId)] : [path.join(process.cwd(), process.env.NEXT_DIST_DIR || ".next", "static", "media")];
        const hashed = hashMediaFile(font.file, roots), bytes = fs.readFileSync(font.file);
        if (!result.some(f => f.id === id && f.sha256 === hashed.sha256))
            result.push({ id, weight: font.weight, sha256: hashed.sha256, data: `data:font/${path.extname(font.file).slice(1)};base64,${bytes.toString("base64")}` });
    }
} return result; }
export type CompositeInput = {
    base: Buffer;
    layers: TextLayer[];
    fonts: FrozenFont[];
};
export type CompositeResult = {
    png: Buffer;
    findings: string[];
};
export async function renderComposite(input: CompositeInput): Promise<CompositeResult> { return withResourceLane("browser", async (signal) => { const { chromium } = await import("@playwright/test"), browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true }); const stop = () => void browser.close().catch(() => { }); signal.addEventListener("abort", stop, { once: true }); try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    await page.evaluate("globalThis.__name = globalThis.__name || ((f) => f)");
    const data = await page.evaluate(async ({ base, layers, fonts }) => { const families: Record<string, string> = {}; for (const [n, f] of fonts.entries()) {
        const family = families[f.id] ??= `f${n}`;
        const face = new FontFace(family, `url(${f.data})`, { weight: f.weight, style: "normal" });
        await face.load();
        document.fonts.add(face);
    } await document.fonts.ready; const image = new Image(); image.src = base; await image.decode(); const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0); const W = canvas.width, H = canvas.height, findings: string[] = []; for (const l of layers) {
        const px = l.size * W, family = families[l.font];
        if (!family)
            throw new Error("A frozen font is missing.");
        await document.fonts.load(`${l.weight} ${px}px ${family}`);
        ctx.font = `${l.weight} ${Math.round(px * 100) / 100}px ${family}`;
        const text = l.upper ? l.text.toUpperCase() : l.text, rows: string[] = [];
        for (const p of text.split(/\r?\n/)) {
            const words = p.split(/\s+/).filter(Boolean);
            if (!words.length) {
                rows.push("");
                continue;
            }
            let line = words[0];
            for (const word of words.slice(1)) {
                if (ctx.measureText(line + " " + word).width <= l.w * W)
                    line += " " + word;
                else {
                    rows.push(line);
                    line = word;
                }
            }
            rows.push(line);
        }
        const leading = px * 1.12, h = rows.length * leading, x = l.x * W, y = l.y * H, w = l.w * W, anchor = l.align === "left" ? x : l.align === "right" ? x + w : x + w / 2, widest = Math.max(0, ...rows.map(r => ctx.measureText(r).width));
        if (widest > w + .5 || x < 0 || y < 0 || x + w > W + .5 || y + h > H + .5)
            findings.push(`${l.id}: text overflows its frozen box or canvas.`);
        if (l.plate) {
            const padX = px * (l.plate.shape === "pill" ? .75 : .45), padY = px * (l.plate.shape === "pill" ? .38 : .3), left = l.align === "left" ? anchor : l.align === "right" ? anchor - widest : anchor - widest / 2, plateH = h + padY * 2;
            ctx.fillStyle = l.plate.color;
            ctx.beginPath();
            ctx.roundRect(left - padX, y - padY, widest + padX * 2, plateH, l.plate.shape === "pill" ? plateH / 2 : px * .18);
            ctx.fill();
            if (left - padX < 0 || y - padY < 0 || left + widest + padX > W || y + h + padY > H)
                findings.push(`${l.id}: backing plate overflows canvas.`);
        }
        ctx.fillStyle = l.color;
        ctx.textAlign = l.align;
        ctx.textBaseline = "top";
        rows.forEach((row, i) => ctx.fillText(row, anchor, y + (leading - px) / 2 + i * leading));
    } return { png: canvas.toDataURL("image/png").split(",")[1], findings }; }, { base: `data:image/png;base64,${input.base.toString("base64")}`, layers: input.layers, fonts: input.fonts });
    return { png: Buffer.from(data.png, "base64"), findings: data.findings };
}
finally {
    signal.removeEventListener("abort", stop);
    await browser.close();
} }, { timeoutMs: 120000, priority: "batch" }); }
export async function composePendingVariants(runId: string, options: {
    itemIds?: string[];
    renderer?: (input: CompositeInput) => Promise<CompositeResult>;
    fontLoader?: typeof freezeCompositeFonts;
} = {}) {
    const run = getRun(runId);
    if (!run)
        throw new Error("Studio set not found.");
    const receipts: {
        itemId: string;
        variantId: string;
        state: string;
        findings: string[];
    }[] = [];
    for (const item of run.items.filter(i => !options.itemIds || options.itemIds.includes(i.id)))
        for (const variant of item.variants ?? []) {
            if (variant.path)
                continue;
            const key = `${run.id}:${item.id}:${variant.id}`, prior = readCheckpoint<FrozenComposite>(run.brand_id, "studio-composites", key), base = path.join(env.DATA_DIR, "assets", variant.base_path), hashed = hashMediaFile(base, [path.join(env.DATA_DIR, "assets")]), inputHash = fingerprint({ base: hashed.sha256, layers: variant.layers });
            if (prior && prior.value.inputHash !== inputHash)
                throw new Error("Variant input changed after compositing was prepared. Save it as a new variant to preserve the frozen revision.");
            let frozen = prior?.value;
            if (!frozen) {
                frozen = { baseSha256: hashed.sha256, layers: structuredClone(variant.layers), fonts: (options.fontLoader ?? freezeCompositeFonts)(run.brand_id, variant.layers), inputHash, state: "prepared", findings: [] };
                saveCheckpoint(run.brand_id, "studio-composites", key, frozen, 0);
            }
            if (frozen.state === "completed")
                continue;
            try {
                const made = await (options.renderer ?? renderComposite)({ base: await sharp(base).png().toBuffer(), layers: frozen.layers, fonts: frozen.fonts });
                const current = getRun(runId), target = current?.items.find(i => i.id === item.id), v = target?.variants?.find(v => v.id === variant.id);
                if (!current || !target || !v || fingerprint({ base: hashMediaFile(path.join(env.DATA_DIR, "assets", v.base_path), [path.join(env.DATA_DIR, "assets")]).sha256, layers: v.layers }) !== inputHash)
                    throw new Error("Variant or base bytes changed during composition; no stale image was attached.");
                if (made.findings.length)
                    throw new Error(made.findings.join(" "));
                const source = target.outputs.find(o => o.aspect === v.aspect && (o.base_path === v.base_path || o.path === v.base_path));
                if (!source)
                    throw new Error("The frozen base no longer has a source version.");
                const saved = await saveOverlay(runId, item.id, { aspect: v.aspect, from: source.version, layers: frozen.layers, png: made.png, variant: v.id, approve: false }), cp = readCheckpoint<FrozenComposite>(run.brand_id, "studio-composites", key)!;
                saveCheckpoint(run.brand_id, "studio-composites", key, { ...frozen, state: "completed", path: saved.path, findings: [] }, cp.revision);
                receipts.push({ itemId: item.id, variantId: v.id, state: "completed; draft copy approval", findings: [] });
            }
            catch (error) {
                const findings = [String(error)], cp = readCheckpoint<FrozenComposite>(run.brand_id, "studio-composites", key)!;
                saveCheckpoint(run.brand_id, "studio-composites", key, { ...frozen, state: "held", findings }, cp.revision);
                receipts.push({ itemId: item.id, variantId: variant.id, state: "held", findings });
            }
        }
    return receipts;
}
