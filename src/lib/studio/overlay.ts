import { z } from "zod";
import type { PlacedLine, StudioItem, StudioOutput, StudioText, StudioVariant, TextLayer } from "@/db/schema";
export type { PlacedLine, StudioVariant, TextLayer } from "@/db/schema";
export const STOCK_FONTS = [
    { id: "stock:sans", label: "Inter (clean sans)", weights: [400, 500, 600, 700, 800, 900] },
    { id: "stock:serif", label: "Playfair Display (serif)", weights: [400, 500, 600, 700, 800, 900] },
    { id: "stock:tall", label: "Anton (tall and heavy)", weights: [400] },
] as const;
export const DEFAULT_FONT = STOCK_FONTS[0].id;
export interface FontChoice {
    id: string;
    label: string;
    group: "brand" | "standard";
    weights: number[];
}
const WEIGHT_NAME: Record<number, string> = { 100: "Thin", 200: "Extra light", 300: "Light", 400: "Regular", 500: "Medium", 600: "Semi bold", 700: "Bold", 800: "Extra bold", 900: "Black" };
export const weightName = (w: number) => WEIGHT_NAME[w] ?? String(w);
export const nearestWeight = (weights: number[], want: number) => (weights.length ? weights.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a)) : want);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const LayerSchema = z.object({
    id: z.string().min(1).max(24),
    role: z.string().max(30),
    text: z.string().max(400),
    font: z.string().min(1).max(140),
    weight: z.number().int().min(100).max(900),
    size: z.number().min(0.01).max(0.4),
    color: hex,
    x: z.number().min(-0.5).max(1),
    y: z.number().min(-0.5).max(1),
    w: z.number().min(0.05).max(1),
    align: z.enum(["left", "center", "right"]),
    upper: z.boolean().optional(),
    plate: z.object({ color: hex, shape: z.enum(["pill", "box"]) }).optional(),
});
export const LayersSchema = z.array(LayerSchema).max(16);
export const LEADING = 1.12;
export type Measure = (text: string) => number;
export function wrapLines(text: string, maxWidth: number, measure: Measure): string[] {
    const out: string[] = [];
    for (const para of text.split(/\r?\n/)) {
        const words = para.split(/\s+/).filter(Boolean);
        if (!words.length) {
            out.push("");
            continue;
        }
        let line = words[0];
        for (const w of words.slice(1)) {
            if (measure(`${line} ${w}`) <= maxWidth)
                line = `${line} ${w}`;
            else {
                out.push(line);
                line = w;
            }
        }
        out.push(line);
    }
    return out;
}
export const shown = (l: Pick<TextLayer, "text" | "upper">) => (l.upper ? l.text.toUpperCase() : l.text);
export function fitSize(layer: Pick<TextLayer, "text" | "upper" | "size" | "w">, rows: number, W: number, measureAt: (px: number) => Measure, floor = 0.7): number {
    let size = layer.size;
    while (wrapLines(shown(layer), layer.w * W, measureAt(size * W)).length > Math.max(1, rows) && size * 0.96 >= layer.size * floor)
        size *= 0.96;
    return Math.round(size * 1000) / 1000;
}
export interface Laid {
    lines: string[];
    px: number;
    lineHeight: number;
    box: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    anchorX: number;
}
export function layOut(layer: TextLayer, W: number, H: number, measure: Measure): Laid {
    const px = layer.size * W;
    const box = { x: layer.x * W, y: layer.y * H, w: layer.w * W, h: 0 };
    const lines = wrapLines(shown(layer), box.w, measure);
    const lineHeight = px * LEADING;
    box.h = Math.max(1, lines.length) * lineHeight;
    const anchorX = layer.align === "left" ? box.x : layer.align === "right" ? box.x + box.w : box.x + box.w / 2;
    return { lines, px, lineHeight, box, anchorX };
}
export interface Ctx2D {
    font: string;
    fillStyle: unknown;
    textAlign: string;
    textBaseline: string;
    measureText(text: string): {
        width: number;
    };
    fillText(text: string, x: number, y: number): void;
    beginPath?(): void;
    roundRect?(x: number, y: number, w: number, h: number, radius: number): void;
    rect?(x: number, y: number, w: number, h: number): void;
    fill?(): void;
}
export function plateBox(laid: Laid, align: TextLayer["align"], widest: number, shape: "pill" | "box"): {
    x: number;
    y: number;
    w: number;
    h: number;
    r: number;
} {
    const padX = laid.px * (shape === "pill" ? 0.75 : 0.45);
    const padY = laid.px * (shape === "pill" ? 0.38 : 0.3);
    const left = align === "left" ? laid.anchorX : align === "right" ? laid.anchorX - widest : laid.anchorX - widest / 2;
    const h = laid.box.h + padY * 2;
    return { x: left - padX, y: laid.box.y - padY, w: widest + padX * 2, h, r: shape === "pill" ? h / 2 : laid.px * 0.18 };
}
export const fontCss = (layer: Pick<TextLayer, "weight">, px: number, family: string) => `${layer.weight} ${Math.round(px * 100) / 100}px ${family}`;
export function drawLayers(ctx: Ctx2D, layers: TextLayer[], W: number, H: number, family: (font: string) => string): Laid[] {
    return layers.map((layer) => {
        ctx.font = fontCss(layer, layer.size * W, family(layer.font));
        const laid = layOut(layer, W, H, (s) => ctx.measureText(s).width);
        if (layer.plate && ctx.beginPath && ctx.fill && (ctx.roundRect || ctx.rect)) {
            const b = plateBox(laid, layer.align, Math.max(0, ...laid.lines.map((s) => ctx.measureText(s).width)), layer.plate.shape);
            ctx.fillStyle = layer.plate.color;
            ctx.beginPath();
            if (ctx.roundRect)
                ctx.roundRect(b.x, b.y, b.w, b.h, b.r);
            else
                ctx.rect!(b.x, b.y, b.w, b.h);
            ctx.fill();
        }
        ctx.fillStyle = layer.color;
        ctx.textAlign = layer.align;
        ctx.textBaseline = "top";
        const lead = (laid.lineHeight - laid.px) / 2;
        laid.lines.forEach((line, i) => ctx.fillText(line, laid.anchorX, laid.box.y + lead + i * laid.lineHeight));
        return laid;
    });
}
const SIZE: Record<string, number> = { headline: 0.085, subhead: 0.044, point: 0.038, badge: 0.034, label: 0.032, price: 0.06, offer: 0.05, quote: 0.05, attribution: 0.03, caption: 0.03, cta: 0.042, table: 0.03 };
const LOW = new Set(["cta", "offer", "price", "caption", "attribution"]);
const HEAD = new Set(["headline", "subhead"]);
export function zoneOf(t: Pick<StudioText, "role" | "placement">): {
    v: "top" | "middle" | "bottom";
    h: "left" | "center" | "right";
} {
    const p = (t.placement ?? "").toLowerCase();
    const v = /\b(top|upper|above|head)\b/.test(p) ? "top" : /\b(bottom|lower|below|foot|base|under|beneath)\b/.test(p) ? "bottom" : /\b(middle|mid|centre|center|centred|centered)\b/.test(p) ? "middle" : HEAD.has(t.role) ? "top" : LOW.has(t.role) ? "bottom" : "middle";
    const h = /\bleft\b/.test(p) ? "left" : /\bright\b/.test(p) ? "right" : "center";
    return { v, h };
}
export interface TypeDefaults {
    heading: {
        font: string;
        weight: number;
        upper: boolean;
    };
    body: {
        font: string;
        weight: number;
        upper: boolean;
    };
    display?: {
        font: string;
        weight: number;
        upper: boolean;
    };
}
export const STOCK_TYPE: TypeDefaults = { heading: { font: DEFAULT_FONT, weight: 800, upper: false }, body: { font: DEFAULT_FONT, weight: 500, upper: false } };
export function brandType(look: {
    fonts: {
        role: string;
        family: string;
        weight: string;
        letter_case: string;
    }[];
} | null, families: string[]): TypeDefaults {
    if (!look?.fonts.length)
        throw new Error("Brand typography is not configured. Add the brand's heading and body font files before editing brand text.");
    const have = (family?: string) => families.find((f) => f.toLowerCase() === (family ?? "").toLowerCase());
    const of = (role: string) => look?.fonts.find((f) => f.role === role);
    const pick = (role: "heading" | "body" | "display", fallback: TypeDefaults["heading"]) => {
        const f = of(role);
        const family = have(f?.family);
        if (!f) {
            if (role === "display")
                return null;
            throw new Error(`The brand's ${role} typeface is not configured. Restore its typography input before editing brand text.`);
        }
        if (!family)
            throw new Error(`The brand's ${role} font file (${f.family}) is missing. Restore that file; no replacement font will be used.`);
        return { font: `brand:${family}`, weight: Math.min(900, Math.max(100, Math.round((Number(f.weight) || fallback.weight) / 100) * 100)), upper: f.letter_case === "uppercase" };
    };
    const heading = pick("heading", STOCK_TYPE.heading);
    const body = pick("body", STOCK_TYPE.body);
    const display = pick("display", STOCK_TYPE.heading);
    return { heading: heading!, body: body!, ...(display ? { display } : {}) };
}
export function missingLayerFonts(layers: Pick<TextLayer, "font" | "text">[], loaded: readonly string[]): string[] {
    return [...new Set(layers.filter((l) => l.text.trim() && !loaded.includes(l.font)).map((l) => l.font))];
}
export function defaultLayers(texts: Pick<StudioText, "role" | "text" | "placement">[], ratio: number, type: TypeDefaults = STOCK_TYPE, placed: PlacedLine[] = []): TextLayer[] {
    const GAP = 0.018;
    const rows = texts
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.text.trim())
        .map(({ t, i }) => {
        const zone = zoneOf(t);
        const size = SIZE[t.role] ?? 0.038;
        const w = zone.h === "center" ? 0.84 : 0.56;
        const x = zone.h === "center" ? 0.08 : zone.h === "left" ? 0.07 : 0.37;
        const style = t.role === "headline" ? type.heading : type.body;
        const lines = Math.max(1, Math.ceil((t.text.trim().length * size * 0.5) / w));
        const layer: TextLayer = { id: `t${i}`, role: t.role || "text", text: t.text.trim(), font: style.font, weight: style.weight, size, color: "#ffffff", x, y: 0, w, align: zone.h, ...(style.upper ? { upper: true } : {}) };
        return { layer, zone, height: lines * size * LEADING * ratio };
    });
    for (const v of ["top", "middle", "bottom"] as const) {
        const stack = rows.filter((r) => r.zone.v === v);
        const total = stack.reduce((n, r) => n + r.height, 0) + GAP * Math.max(0, stack.length - 1);
        let y = v === "top" ? 0.07 : v === "bottom" ? Math.max(0.5, 0.93 - total) : Math.max(0.07, 0.5 - total / 2);
        for (const r of stack) {
            r.layer.y = Math.round(y * 1000) / 1000;
            y += r.height + GAP;
        }
    }
    return rows.map((r) => {
        const at = placed.find((p) => `t${p.i}` === r.layer.id);
        if (!at)
            return r.layer;
        const rest = { ...r.layer };
        delete rest.upper;
        return { ...rest, x: at.x, y: at.y, w: at.w, size: at.size, color: at.color, align: at.align, weight: at.weight, ...(at.upper ? { upper: true } : {}), ...(at.plate ? { plate: at.plate } : {}) };
    });
}
const WEIGHT_OF: Record<string, number> = { thin: 200, light: 300, regular: 400, normal: 400, medium: 500, semibold: 600, bold: 700, heavy: 800, black: 900 };
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function snapColor(color: string, palette: string[]): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(color))
        return "#ffffff";
    const [r, g, b] = rgb(color);
    let best = color.toLowerCase();
    let near = 52;
    for (const c of [...palette, "#ffffff", "#111111"]) {
        if (!/^#[0-9a-fA-F]{6}$/.test(c))
            continue;
        const [r2, g2, b2] = rgb(c);
        const d = Math.hypot(r - r2, g - g2, b - b2);
        if (d < near)
            [near, best] = [d, c.toLowerCase()];
    }
    return best;
}
export interface LineSeen {
    n: number;
    found: boolean;
    box: number[];
    rows: number;
    color: string;
    align: string;
    upper: boolean;
    weight: string;
    on?: string;
    fill?: string;
}
export function placedFrom(seen: LineSeen[], count: number, ratio: number, palette: string[] = []): PlacedLine[] {
    const out: PlacedLine[] = [];
    const r3 = (n: number) => Math.round(n * 1000) / 1000;
    for (const s of seen) {
        const i = Math.round(s.n) - 1;
        if (!s.found || i < 0 || i >= count || out.some((p) => p.i === i) || s.box.length !== 4)
            continue;
        const [top, left, bottom, right] = s.box.map((v) => Math.min(1, Math.max(0, v / 1000)));
        const w = right - left;
        const h = bottom - top;
        if (w < 0.03 || h < 0.008)
            continue;
        const rows = Math.min(8, Math.max(1, Math.round(s.rows) || 1));
        const upper = !!s.upper;
        const glyph = upper ? 0.72 : 0.9;
        const size = Math.min(0.4, Math.max(0.012, h / ratio / ((rows - 1) * LEADING + glyph)));
        const align = s.align === "left" || s.align === "right" ? s.align : "center";
        const room = Math.min(0.08, w * 0.1);
        const x = align === "left" ? left : align === "right" ? left - room : left - room / 2;
        const y = top - size * ratio * ((LEADING - 1) / 2 + (upper ? 0.16 : 0.1));
        const plate = (s.on === "button" || s.on === "panel") && /^#[0-9a-fA-F]{6}$/.test(s.fill ?? "") ? { color: snapColor(s.fill!, palette), shape: s.on === "button" ? ("pill" as const) : ("box" as const) } : undefined;
        out.push({ i, x: r3(Math.max(-0.05, x)), y: r3(Math.max(0, y)), w: r3(Math.min(1, w + room)), size: r3(size), rows, color: snapColor(s.color, palette), align, upper, weight: WEIGHT_OF[(s.weight ?? "").toLowerCase().replace(/[^a-z]/g, "")] ?? 500, ...(plate ? { plate } : {}) });
    }
    return out.sort((a, b) => a.i - b.i);
}
const TESTED = new Set(["headline", "subhead"]);
export function variedSlots(layers: Pick<TextLayer, "role" | "text">[]): number[] {
    const at = layers.map((l, i) => (TESTED.has(l.role) && l.text.trim() ? i : -1)).filter((i) => i >= 0);
    return at.length ? at : layers.length ? [0] : [];
}
export function withWords(layout: TextLayer[], slots: number[], words: string[]): TextLayer[] {
    return layout.map((l, i) => {
        const k = slots.indexOf(i);
        return k >= 0 && words[k]?.trim() ? { ...l, text: words[k].trim() } : { ...l };
    });
}
export function nextVariantId(variants: Pick<StudioVariant, "id">[]): string {
    const n = Math.max(0, ...variants.map((v) => Number(/^v(\d+)$/.exec(v.id)?.[1] ?? 0))) + 1;
    return `v${String(n).padStart(2, "0")}`;
}
export function newLayer(id: string, type: TypeDefaults = STOCK_TYPE): TextLayer {
    return { id, role: "point", text: "New line", font: type.body.font, weight: type.body.weight, size: 0.04, color: "#ffffff", x: 0.08, y: 0.46, w: 0.84, align: "center" };
}
export const inkFor = (luminance: number) => (luminance > 0.62 ? "#111111" : "#ffffff");
const flat = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();
export const variantTitle = (layers: Pick<TextLayer, "role" | "text">[]) => flat(layers[variedSlots(layers)[0] ?? 0]?.text ?? "");
export const layerTexts = (layers: TextLayer[]): {
    role: string;
    text: string;
}[] => layers.filter((l) => l.text.trim()).map((l) => ({ role: l.role, text: flat(l.text) }));
export function mergeTexts(layers: TextLayer[], before: StudioText[]): StudioText[] {
    return layers
        .filter((l) => l.text.trim())
        .map((l) => {
        const at = /^t(\d+)$/.exec(l.id);
        const was = at ? before[Number(at[1])] : undefined;
        return was ? { ...was, role: l.role || was.role, text: flat(l.text) } : { role: l.role || "point", text: flat(l.text), placement: "", source: "" };
    });
}
export function baseOf(kind: string, item: Pick<StudioItem, "plan">, o: Pick<StudioOutput, "path" | "base_path" | "texts">): string | null {
    if (o.base_path)
        return o.base_path;
    const bare = kind === "photoshoot" || (o.texts ? o.texts.length === 0 : !(item.plan?.text_elements.length ?? 0));
    return bare ? o.path : null;
}
