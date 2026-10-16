import sharp from "sharp";
import fs from "node:fs";
import type { MotionEvent } from "@/db/schema";
import { assertBrandTypeface } from "../creative-brand-contract";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export interface Tile {
    png: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface MotionLook {
    background: string;
    foreground: string;
    accent: string;
    brandColours: boolean;
    fontFamily: string;
    fontWeight: number;
    upper: boolean;
    fontFile?: string;
    brandType: boolean;
    notes: string[];
}
export const PLAIN_LOOK: MotionLook = { background: "#111111", foreground: "#ffffff", accent: "#ffffff", brandColours: false, fontFamily: "", fontWeight: 700, upper: false, brandType: false, notes: [] };
export function inLook(ev: MotionEvent, look: MotionLook): MotionEvent {
    return ev.kind === "underline" ? { ...ev, background: look.accent } : { ...ev, background: look.background, foreground: look.foreground };
}
export async function wordsImage(text: string, type: {
    family: string;
    weight: number;
    size: number;
    color: string;
    fontFile?: string;
    align?: "left" | "centre" | "right";
}): Promise<{
    data: Buffer;
    width: number;
    height: number;
}> {
    const markup = `<span font_family="${esc(type.family)}" font_weight="${type.weight}" font_size="${Math.round(type.size * 1024)}" foreground="${type.color}">${esc(text)}</span>`;
    const { data, info } = await sharp({ text: { text: markup, rgba: true, dpi: 72, ...(type.fontFile ? { fontfile: type.fontFile } : {}), ...(type.align ? { align: type.align } : {}) } }).png().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}
export async function brandTextTile(text: string, look: MotionLook | undefined, maxWidth: number, size: number, maxLines = 3): Promise<{
    data: Buffer;
    width: number;
    height: number;
    text: string;
    fontSize: number;
}> {
    assertBrandTypeface(look);
    if (!fs.existsSync(look.fontFile))
        throw new Error("The verified brand font file is unavailable. Restore it before rendering added text.");
    const approved = text.trim();
    if (!approved)
        throw new Error("The approved text is empty.");
    const type = { family: look.fontFamily, weight: look.fontWeight, fontFile: look.fontFile, color: look.foreground, align: "centre" as const };
    const floor = Math.min(size, Math.max(18, Math.round(size * 0.65)));
    const edge = Math.max(1, Math.min(2, Math.round(size * 0.035)));
    const pad = edge + 2;
    let words: Awaited<ReturnType<typeof wordsImage>> | undefined;
    let fitted = "";
    let fontSize = size;
    for (; fontSize >= floor; fontSize -= 2) {
        const lines: string[] = [];
        let line = "";
        for (const paragraph of approved.split(/\r?\n/)) {
            for (const word of paragraph.split(/\s+/).filter(Boolean)) {
                const next = line ? `${line} ${word}` : word;
                if (line && (await wordsImage(next, { ...type, size: fontSize })).width > maxWidth - pad * 2) {
                    lines.push(line);
                    line = word;
                }
                else
                    line = next;
            }
            if (line)
                lines.push(line);
            line = "";
        }
        if (lines.length > maxLines)
            continue;
        fitted = lines.join("\n");
        const drawn = await wordsImage(fitted, { ...type, size: fontSize });
        if (drawn.width + pad * 2 <= maxWidth) {
            words = drawn;
            break;
        }
    }
    if (!words)
        throw new Error("The approved text does not fit at a readable size. Break it into shorter timed phrases or revise the placement; words were not truncated.");
    const shadow = await wordsImage(fitted, { ...type, size: fontSize, color: look.background });
    const width = words.width + pad * 2, height = words.height + pad * 2;
    const outline = [[-edge, -edge], [0, -edge], [edge, -edge], [-edge, 0], [edge, 0], [-edge, edge], [0, edge], [edge, edge]];
    const data = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([...outline.map(([x, y]) => ({ input: shadow.data, left: pad + x, top: pad + y })), { input: words.data, left: pad, top: pad }]).png().toBuffer();
    return { data, width, height, text: fitted, fontSize };
}
export async function captionPng(text: string, width: number, height: number, out: string, look?: MotionLook): Promise<void> {
    const tile = await brandTextTile(text, look, Math.round(width * 0.8), Math.max(20, Math.round(Math.min(width, height) * 0.05)));
    const top = Math.round(height * 0.805 - tile.height);
    if (top < 0)
        throw new Error("The caption does not fit this frame. Split it into shorter timed phrases.");
    await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: tile.data, left: Math.round((width - tile.width) / 2), top }]).png().toFile(out);
}
export async function motionTile(ev: MotionEvent, style: string, width: number, height: number, out: string, look?: MotionLook): Promise<Tile> {
    const e = look ? inLook(ev, look) : ev;
    let tw: number;
    let th: number;
    if (e.kind === "underline") {
        tw = Math.round(width * 0.28);
        th = Math.max(5, Math.round(width * 0.012));
        await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}"><rect width="${tw}" height="${th}" rx="${th / 2}" fill="${e.background}"/></svg>`)).png().toFile(out);
    }
    else {
        void style;
        const tile = await brandTextTile(e.text, look, Math.round(width * 0.72), Math.max(18, Math.round(width * 0.047)), 2);
        tw = tile.width;
        th = tile.height;
        await sharp(tile.data).png().toFile(out);
    }
    const left = e.position.endsWith("left");
    const x = Math.round(left ? width * 0.07 : width * 0.87 - tw);
    const y = Math.round(e.position.startsWith("top") ? height * 0.16 : e.position.startsWith("middle") ? height * 0.46 - th / 2 : height * 0.76 - th);
    return { png: out, x, y, width: tw, height: th };
}
export function contrast(a: string, b: string): number {
    const lum = (hex: string) => {
        const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}
export async function contactSheet(frames: {
    file: string;
    at: number;
}[], out: string): Promise<void> {
    const cols = 3;
    const cellW = 360;
    const metas = await Promise.all(frames.map((f) => sharp(f.file).metadata()));
    const cellH = Math.round((cellW * (metas[0].height ?? 640)) / (metas[0].width ?? 360));
    const rows = Math.ceil(frames.length / cols);
    const composites = await Promise.all(frames.map(async (f, i) => {
        const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="26"><rect width="84" height="26" fill="#000000" fill-opacity="0.7"/><text x="6" y="19" font-family="Arial" font-size="18" fill="#ffffff">${f.at.toFixed(1)}s</text></svg>`);
        const img = await sharp(f.file).resize(cellW, cellH, { fit: "cover" }).composite([{ input: label, top: 0, left: 0 }]).jpeg().toBuffer();
        return { input: img, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH };
    }));
    await sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 3, background: "#111111" } }).composite(composites).jpeg({ quality: 82 }).toFile(out);
}
export async function splitPanels(sheet: string, count: number, outFor: (i: number) => string): Promise<string[]> {
    if (count <= 1)
        return [sheet];
    const cols = Math.min(3, count);
    const rows = Math.ceil(count / 3);
    const { width = 0, height = 0 } = await sharp(sheet).metadata();
    const files: string[] = [];
    for (let i = 0; i < count; i++) {
        const cx = i % cols;
        const cy = Math.floor(i / cols);
        const left = Math.round((cx * width) / cols);
        const top = Math.round((cy * height) / rows);
        const out = outFor(i);
        await sharp(sheet).extract({ left, top, width: Math.round(((cx + 1) * width) / cols) - left, height: Math.round(((cy + 1) * height) / rows) - top }).png().toFile(out);
        files.push(out);
    }
    return files;
}
