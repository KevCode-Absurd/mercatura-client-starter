import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { StudioItemPlan } from "@/db/schema";
export type RepairZone = {
    x: number;
    y: number;
    w: number;
    h: number;
    fields: number[];
    fill: string;
    color?: string;
    font?: number;
    align?: "left" | "center";
    border?: string;
    shape?: "speech" | "note";
    tail?: "left" | "right";
    erase?: boolean;
    fontFamily?: string;
    rotation?: number;
    textBox?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    verticalAlign?: "center";
};
type Zone = RepairZone;
const cream = "#fff5db", green = "#003c28";
const box = (x: number, y: number, w: number, h: number, fields: number[], fill = cream, font = 42): Zone => ({ x, y, w, h, fields, fill, font });
export const REPAIR_ZONES: Record<string, Zone[]> = {
    "pair-02": [box(558, 50, 448, 490, [0, 1, 2], green, 49)],
    "pair-03": [box(28, 27, 342, 88, [0], cream, 30), box(28, 519, 409, 84, [1], cream, 30), box(20, 970, 640, 285, [2, 3], green, 42)],
    "pair-04": [box(0, 1040, 1024, 240, [0, 1], cream, 48)],
    "pair-05": [{ ...box(145, 155, 268, 168, [0], cream, 38), shape: "speech", tail: "left", border: green }, { ...box(550, 30, 420, 150, [1], cream, 40), shape: "speech", tail: "right", border: green }],
    "pair-06": [{ ...box(335, 18, 402, 223, [0], cream, 40), shape: "speech", tail: "left", border: green }, { ...box(0, 946, 1024, 334, [1], green, 38), erase: true, verticalAlign: "center", align: "center" }],
    "pair-07": [box(450, 40, 550, 460, [0, 1], cream, 57), box(60, 1084, 385, 100, [2], cream, 32)],
    "pair-08": [box(45, 20, 800, 266, [0, 1], cream, 54)],
    "pair-09": [box(24, 75, 515, 300, [0], green, 50), box(20, 1100, 984, 160, [1, 2], green, 35)],
    "pair-11": [box(32, 32, 415, 508, [0, 1], cream, 53)],
    "pair-12": [box(570, 48, 430, 403, [0, 1], cream, 51)],
    "pair-13": [box(18, 30, 650, 285, [0, 1, 2], cream, 49)],
    "pair-14": [box(31, 43, 289, 122, [0], cream, 40), box(0, 1016, 1024, 264, [1, 2, 3], green, 42)],
    "pair-16": [box(30, 1185, 958, 75, [4], cream, 34)],
    "pair-17": [box(435, 58, 570, 287, [0], cream, 65), box(520, 990, 486, 108, [1], cream, 32)],
    "pair-18": [box(20, 140, 567, 336, [0, 1], green, 53)],
    "pair-19": [box(0, 1005, 1024, 275, [2, 3], cream, 54)],
    "pair-20": [{ ...box(600, 360, 355, 300, [0], "none", 46), shape: "note", fontFamily: "Segoe Print,Comic Sans MS,cursive", rotation: 22, textBox: { x: 655, y: 403, w: 250, h: 175 } }],
    "pair-21": [box(15, 50, 738, 383, [0], green, 61), box(80, 551, 385, 109, [2], green, 32), box(603, 898, 306, 140, [1], green, 34)],
    "pair-22": [box(700, 255, 305, 965, [0, 1, 2], cream, 48)],
    "pair-23": [box(24, 72, 692, 372, [0, 1, 2], "#ffd836", 54), { ...box(42, 1060, 430, 124, [3], green, 42), align: "center", verticalAlign: "center" }],
    "pair-24": [box(0, 1043, 1024, 237, [0, 1], cream, 48)],
    "pair-25": [box(0, 0, 1024, 282, [0, 1, 2], "#f5f6f8", 41)],
};
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const wrap = (text: string, width: number, size: number) => {
    const max = width / (size * .56), lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
        if (line && line.length + word.length + 1 > max) {
            lines.push(line);
            line = word;
        }
        else
            line += (line ? " " : "") + word;
    }
    if (line)
        lines.push(line);
    return lines;
};
export type EditableRepairLayer = {
    fieldPath: string;
    text: string;
    source?: string;
    role: string;
    x: number;
    y: number;
    fontFamily: string;
    fontSize: number;
    color: string;
    lines: string[];
    editable: true;
    zoneIndex: number;
    markup: string;
    rotation?: number;
    fit?: {
        inkBounds: {
            x: number;
            y: number;
            w: number;
            h: number;
        } | null;
        insideZone: boolean;
    };
};
export type RepairPreservation = {
    protectedPixels: number;
    changedProtectedPixels: 0;
    protectedSha256: string;
    selectedPixels: number;
};
const svg = (parts: string[], width = 1024, height = 1280) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
function speechPath(z: Zone) {
    const x = z.x + 3, y = z.y + 3, w = z.w - 6, bottom = z.y + z.h - 42, r = 18, base = z.x + z.w * (z.tail === "right" ? .73 : .30), tip = z.x + z.w * (z.tail === "right" ? .82 : .18);
    return `<path data-layer-shape="speech" d="M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${bottom - r} Q ${x + w} ${bottom} ${x + w - r} ${bottom} H ${base + 18} L ${tip} ${z.y + z.h - 4} L ${base - 18} ${bottom} H ${x + r} Q ${x} ${bottom} ${x} ${bottom - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z" fill="${z.fill}" stroke="${z.border ?? green}" stroke-width="3" stroke-linejoin="round"/>`;
}
export function editableRepairSvg(pairId: string, plan: StudioItemPlan): {
    svg: string;
    layers: EditableRepairLayer[];
    zones: Zone[];
    fitMetrics: {
        minFontPx: number | null;
        zones: {
            index: number;
            fields: number[];
            usedHeight: number;
            availableHeight: number;
        }[];
    };
} {
    const zones = REPAIR_ZONES[pairId] ?? [];
    const layers: EditableRepairLayer[] = [];
    const parts: string[] = [];
    const zoneMetrics: {
        index: number;
        fields: number[];
        usedHeight: number;
        availableHeight: number;
    }[] = [];
    for (const [zoneIndex, z] of zones.entries()) {
        if (z.x < 0 || z.y < 0 || z.w <= 0 || z.h <= 0 || z.x + z.w > 1024 || z.y + z.h > 1280)
            throw new Error(`${pairId}: repair zone ${zoneIndex} leaves the source canvas.`);
        const fields = z.fields.filter(i => plan.text_elements[i]?.text?.trim());
        if (!fields.length && !z.erase)
            continue;
        const area = z.textBox ?? { x: z.x, y: z.y, w: z.w, h: z.h - (z.shape === "speech" ? 42 : 0) };
        const pad = z.shape === "note" ? 0 : z.h < 110 ? 8 : 16, width = area.w - pad * 2, availableHeight = area.h - pad * 2;
        let scale = 1;
        const layout = () => fields.map((index, at) => { const t = plan.text_elements[index]; const initial = at === 0 ? (z.font ?? 44) : Math.min(z.font ?? 44, /attribution|price|badge|caption|point/.test(t.role) ? 34 : 37); const size = Math.max(27, initial * scale); return { index, t, size, lines: wrap(t.text, width, size) }; });
        const height = (rows: ReturnType<typeof layout>) => rows.reduce((n, r, i) => n + r.lines.length * r.size * 1.12 + (i < rows.length - 1 ? 14 : 0), 0);
        let rows = layout();
        while (height(rows) > availableHeight && scale > .55) {
            scale -= .025;
            rows = layout();
        }
        if (height(rows) > availableHeight)
            throw new Error(`${pairId}: ${fields.map(i => `text_elements[${i}].text`).join(", ")} does not fit its preserved region at the 27px minimum font.`);
        if (z.shape === "speech")
            parts.push(speechPath(z));
        else if (z.shape !== "note")
            parts.push(`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="5" fill="${z.fill}"${z.border ? ` stroke="${z.border}"` : ""}/>`);
        let y = area.y + pad + (z.verticalAlign === "center" ? (availableHeight - height(rows)) / 2 : 0);
        for (const r of rows) {
            const color = z.color ?? (z.fill === green ? cream : green);
            const baseline = y + r.size, x = z.align === "center" ? area.x + area.w / 2 : area.x + pad;
            let markup = `<text x="${x}" y="${baseline}" fill="${color}" font-family="${z.fontFamily ?? "Arial,sans-serif"}" font-size="${r.size}" font-weight="${r.t.role === "headline" ? 800 : 600}"${z.align === "center" ? ' text-anchor="middle"' : ""}>${r.lines.map((line, i) => `<tspan x="${x}" dy="${i ? r.size * 1.12 : 0}">${escape(line)}</tspan>`).join("")}</text>`;
            if (z.rotation)
                markup = `<g transform="rotate(${z.rotation} ${area.x + area.w / 2} ${area.y + area.h / 2})">${markup}</g>`;
            parts.push(markup);
            layers.push({ fieldPath: `text_elements[${r.index}].text`, text: r.t.text, source: r.t.source, role: r.t.role, x, y, fontFamily: z.fontFamily ?? "Arial", fontSize: r.size, color, lines: r.lines, editable: true, zoneIndex, markup, ...(z.rotation ? { rotation: z.rotation } : {}) });
            y += r.lines.length * r.size * 1.12 + 14;
        }
        zoneMetrics.push({ index: zoneIndex, fields, usedHeight: height(rows), availableHeight });
    }
    return { svg: svg(parts), layers, zones, fitMetrics: { minFontPx: layers.length ? Math.min(...layers.map(l => l.fontSize)) : null, zones: zoneMetrics } };
}
export async function assertProtectedRegionInvariant(base: string | Buffer, candidate: string | Buffer, zones: Zone[]): Promise<RepairPreservation> {
    const [before, after] = await Promise.all([sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })]);
    const { width, height, channels } = before.info;
    if (width !== after.info.width || height !== after.info.height || channels !== after.info.channels)
        throw new Error("Repair changed the source canvas or decoded channel count.");
    let protectedPixels = 0, selectedPixels = 0;
    const hash = createHash("sha256");
    for (let y = 0; y < height; y++) {
        let run = -1;
        for (let x = 0; x < width; x++) {
            const selected = zones.some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h), at = (y * width + x) * channels;
            if (selected) {
                selectedPixels++;
                if (run >= 0) {
                    hash.update(before.data.subarray(run, at));
                    run = -1;
                }
                continue;
            }
            protectedPixels++;
            if (run < 0)
                run = at;
            for (let c = 0; c < channels; c++)
                if (before.data[at + c] !== after.data[at + c])
                    throw new Error(`Repair changed protected pixel (${x}, ${y}), channel ${c}; expand or correct the selected region explicitly.`);
        }
        if (run >= 0)
            hash.update(before.data.subarray(run, (y + 1) * width * channels));
    }
    return { protectedPixels, changedProtectedPixels: 0, protectedSha256: hash.digest("hex"), selectedPixels };
}
async function checkInkBounds(layer: EditableRepairLayer, zone: Zone) {
    const rendered = await sharp(Buffer.from(svg([layer.markup], 2048, 2560))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    const { width, height, channels } = rendered.info;
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (rendered.data[(y * width + x) * channels + 3]) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
    const bounds = maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }, inside = !bounds || (bounds.x >= zone.x && bounds.y >= zone.y && bounds.x + bounds.w <= zone.x + zone.w && bounds.y + bounds.h <= zone.y + zone.h);
    if (!inside)
        throw new Error(`${layer.fieldPath}: actual rendered glyphs leave the selected text region; shorten that field or adjust only its approved region.`);
    layer.fit = { inkBounds: bounds, insideZone: inside };
}
export async function composeEditableRepair(base: string, pairId: string, plan: StudioItemPlan, target: string) {
    const result = editableRepairSvg(pairId, plan);
    const metadata = await sharp(base).metadata();
    if (metadata.width !== 1024 || metadata.height !== 1280)
        throw new Error(`${pairId}: source must already be 1024×1280; resizing would change protected pixels.`);
    for (const layer of result.layers)
        await checkInkBounds(layer, result.zones[layer.zoneIndex]);
    const candidate = await sharp(base).composite(result.layers.length || result.zones.some(z => z.erase) ? [{ input: Buffer.from(result.svg) }] : []).png().toBuffer();
    const preservation = await assertProtectedRegionInvariant(base, candidate, result.zones);
    await writeFile(target, candidate);
    return { ...result, preservation };
}
