import zlib from "node:zlib";
interface Table {
    tag: string;
    data: Buffer;
}
function reader(b: Buffer) {
    const r = {
        b,
        pos: 0,
        u8: (): number => b.readUInt8(r.pos++),
        u16: (): number => b.readUInt16BE((r.pos += 2) - 2),
        i16: (): number => b.readInt16BE((r.pos += 2) - 2),
        u32: (): number => b.readUInt32BE((r.pos += 4) - 4),
        bytes: (n: number): Buffer => {
            if (r.pos + n > b.length)
                throw new Error("The font file ends early.");
            return b.subarray(r.pos, (r.pos += n));
        },
        base128: (): number => {
            let v = 0;
            for (let i = 0; i < 5; i++) {
                const c = r.u8();
                v = v * 128 + (c & 0x7f);
                if (!(c & 0x80))
                    return v;
            }
            throw new Error("A length in the font file could not be read.");
        },
        u255: (): number => {
            const c = r.u8();
            return c === 253 ? r.u16() : c === 255 ? r.u8() + 253 : c === 254 ? r.u8() + 506 : c;
        },
    };
    return r;
}
function checksum(data: Buffer): number {
    let sum = 0;
    for (let i = 0; i + 4 <= data.length; i += 4)
        sum = (sum + data.readUInt32BE(i)) >>> 0;
    return sum;
}
function buildSfnt(flavor: number, tables: Table[]): Buffer {
    const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : 1));
    const n = sorted.length;
    const pow = 2 ** Math.floor(Math.log2(n));
    const dir = Buffer.alloc(12 + 16 * n);
    dir.writeUInt32BE(flavor, 0);
    dir.writeUInt16BE(n, 4);
    dir.writeUInt16BE(pow * 16, 6);
    dir.writeUInt16BE(Math.log2(pow), 8);
    dir.writeUInt16BE((n - pow) * 16, 10);
    const parts = [dir];
    let offset = dir.length;
    let headAt = -1;
    sorted.forEach((t, i) => {
        const padded = Buffer.alloc((t.data.length + 3) & ~3);
        t.data.copy(padded);
        if (t.tag === "head" && padded.length >= 12) {
            padded.writeUInt32BE(0, 8);
            headAt = offset;
        }
        const at = 12 + i * 16;
        dir.write(t.tag, at, "latin1");
        dir.writeUInt32BE(checksum(padded), at + 4);
        dir.writeUInt32BE(offset, at + 8);
        dir.writeUInt32BE(t.data.length, at + 12);
        parts.push(padded);
        offset += padded.length;
    });
    const out = Buffer.concat(parts);
    if (headAt >= 0)
        out.writeUInt32BE((0xb1b0afba - checksum(out)) >>> 0, headAt + 8);
    return out;
}
function unwoff(b: Buffer): Buffer {
    const count = b.readUInt16BE(12);
    const tables: Table[] = [];
    for (let i = 0; i < count; i++) {
        const at = 44 + i * 20;
        const [offset, packed, full] = [b.readUInt32BE(at + 4), b.readUInt32BE(at + 8), b.readUInt32BE(at + 12)];
        if (offset + packed > b.length)
            throw new Error("The font file ends early.");
        const raw = b.subarray(offset, offset + packed);
        const data = packed < full ? zlib.inflateSync(raw) : Buffer.from(raw);
        if (data.length !== full)
            throw new Error("A table of the font file is not the length it states.");
        tables.push({ tag: b.toString("latin1", at, at + 4), data });
    }
    return buildSfnt(b.readUInt32BE(4), tables);
}
const TAGS = "cmap head hhea hmtx maxp name OS/2 post cvt_ fpgm glyf loca prep CFF_ VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG_ sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill".split(" ").map((t) => t.replace("_", " "));
function step(flag: number, r: ReturnType<typeof reader>): [
    number,
    number
] {
    const sign = (bit: number, v: number) => (bit & 1 ? v : -v);
    if (flag < 10)
        return [0, sign(flag, ((flag & 14) << 7) + r.u8())];
    if (flag < 20)
        return [sign(flag, (((flag - 10) & 14) << 7) + r.u8()), 0];
    if (flag < 84) {
        const b0 = flag - 20;
        const b1 = r.u8();
        return [sign(flag, 1 + (b0 & 0x30) + (b1 >> 4)), sign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f))];
    }
    if (flag < 120) {
        const b0 = flag - 84;
        return [sign(flag, 1 + (Math.floor(b0 / 12) << 8) + r.u8()), sign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + r.u8())];
    }
    if (flag < 124) {
        const [b1, b2, b3] = [r.u8(), r.u8(), r.u8()];
        return [sign(flag, (b1 << 4) + (b2 >> 4)), sign(flag >> 1, ((b2 & 0x0f) << 8) + b3)];
    }
    return [sign(flag, r.u16()), sign(flag >> 1, r.u16())];
}
function unpackGlyf(t: Buffer): {
    glyf: Buffer;
    loca: Buffer;
    xMins: number[];
} {
    const head = reader(t);
    head.u16();
    const options = head.u16();
    const count = head.u16();
    head.u16();
    let at = 36;
    const [contours, points, flags, glyphs, composites, boxes, code] = Array.from({ length: 7 }, () => head.u32()).map((size) => {
        if (at + size > t.length)
            throw new Error("The font file ends early.");
        return reader(t.subarray(at, (at += size)));
    });
    const overlaps = options & 1 ? t.subarray(at, at + ((count + 7) >> 3)) : null;
    const boxed = boxes.bytes(((count + 31) >> 5) << 2);
    const bit = (bits: Buffer, i: number) => (bits[i >> 3] & (0x80 >> (i & 7))) !== 0;
    const out: Buffer[] = [];
    const loca = Buffer.alloc((count + 1) * 4);
    const xMins: number[] = [];
    let offset = 0;
    for (let g = 0; g < count; g++) {
        loca.writeUInt32BE(offset, g * 4);
        const n = contours.i16();
        if (n === 0) {
            xMins.push(0);
            continue;
        }
        let glyph: Buffer;
        let box: number[];
        if (n > 0) {
            const ends: number[] = [];
            let total = 0;
            for (let c = 0; c < n; c++)
                ends.push((total += points.u255()) - 1);
            const xs: number[] = [];
            const ys: number[] = [];
            const on: number[] = [];
            let [x, y] = [0, 0];
            for (let p = 0; p < total; p++) {
                const f = flags.u8();
                const [dx, dy] = step(f & 0x7f, glyphs);
                xs.push((x += dx));
                ys.push((y += dy));
                on.push(f >> 7 ? 0 : 1);
            }
            const hints = code.bytes(glyphs.u255());
            box = bit(boxed, g) ? [boxes.i16(), boxes.i16(), boxes.i16(), boxes.i16()] : [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
            glyph = Buffer.alloc(12 + n * 2 + hints.length + total * 5);
            let w = 10;
            for (const e of ends)
                w = glyph.writeUInt16BE(e, w);
            w = glyph.writeUInt16BE(hints.length, w);
            w += hints.copy(glyph, w);
            for (let p = 0; p < total; p++)
                w = glyph.writeUInt8(on[p] | (p === 0 && overlaps && bit(overlaps, g) ? 0x40 : 0), w);
            for (let p = 0; p < total; p++)
                w = glyph.writeInt16BE(xs[p] - (p ? xs[p - 1] : 0), w);
            for (let p = 0; p < total; p++)
                w = glyph.writeInt16BE(ys[p] - (p ? ys[p - 1] : 0), w);
        }
        else {
            const start = composites.pos;
            let f: number;
            let hinted = false;
            do {
                f = composites.u16();
                composites.bytes(2 + (f & 0x01 ? 4 : 2) + (f & 0x08 ? 2 : f & 0x40 ? 4 : f & 0x80 ? 8 : 0));
                hinted ||= (f & 0x100) !== 0;
            } while (f & 0x20);
            const parts = composites.b.subarray(start, composites.pos);
            const hints = hinted ? code.bytes(glyphs.u255()) : null;
            if (!bit(boxed, g))
                throw new Error("A glyph of the font file has no bounds.");
            box = [boxes.i16(), boxes.i16(), boxes.i16(), boxes.i16()];
            glyph = Buffer.alloc(10 + parts.length + (hints ? 2 + hints.length : 0));
            parts.copy(glyph, 10);
            if (hints)
                hints.copy(glyph, glyph.writeUInt16BE(hints.length, 10 + parts.length));
        }
        glyph.writeInt16BE(n > 0 ? n : -1, 0);
        box.forEach((v, i) => glyph.writeInt16BE(v, 2 + i * 2));
        const padded = Buffer.alloc((glyph.length + 3) & ~3);
        glyph.copy(padded);
        out.push(padded);
        offset += padded.length;
        xMins.push(box[0]);
    }
    loca.writeUInt32BE(offset, count * 4);
    return { glyf: Buffer.concat(out), loca, xMins };
}
function unpackHmtx(t: Buffer, widths: number, count: number, xMins: number[]): Buffer {
    const r = reader(t);
    const flags = r.u8();
    const advance = Array.from({ length: widths }, () => r.u16());
    const out = Buffer.alloc(widths * 4 + (count - widths) * 2);
    for (let g = 0; g < count; g++) {
        const bearing = flags & (g < widths ? 1 : 2) ? (xMins[g] ?? 0) : r.i16();
        if (g < widths) {
            out.writeUInt16BE(advance[g], g * 4);
            out.writeInt16BE(bearing, g * 4 + 2);
        }
        else
            out.writeInt16BE(bearing, widths * 4 + (g - widths) * 2);
    }
    return out;
}
function unwoff2(b: Buffer): Buffer {
    const r = reader(b);
    r.pos = 4;
    const flavor = r.u32();
    if (flavor === 0x74746366)
        throw new Error("The font file is a collection of fonts, which is not read.");
    r.pos = 12;
    const count = r.u16();
    r.pos = 20;
    const packedSize = r.u32();
    r.pos = 48;
    const dir = Array.from({ length: count }, () => {
        const flags = r.u8();
        const tag = (flags & 63) === 63 ? r.bytes(4).toString("latin1") : TAGS[flags & 63];
        const packed = tag === "glyf" || tag === "loca" ? flags >> 6 === 0 : flags >> 6 !== 0;
        const full = r.base128();
        return { tag, packed, length: packed ? r.base128() : full };
    });
    const all = zlib.brotliDecompressSync(r.bytes(packedSize));
    let at = 0;
    const raw = dir.map((d) => {
        if (at + d.length > all.length)
            throw new Error("The font file ends early.");
        return { ...d, data: all.subarray(at, (at += d.length)) };
    });
    const of = (tag: string) => raw.find((t) => t.tag === tag);
    const glyf = of("glyf");
    const built = glyf?.packed ? unpackGlyf(glyf.data) : null;
    const tables: Table[] = raw.map((t) => {
        if (t.tag === "glyf" && built)
            return { tag: t.tag, data: built.glyf };
        if (t.tag === "loca" && built)
            return { tag: t.tag, data: built.loca };
        if (t.tag === "head" && built) {
            const head = Buffer.from(t.data);
            head.writeInt16BE(1, 50);
            return { tag: t.tag, data: head };
        }
        if (t.tag === "hmtx" && t.packed) {
            const [hhea, maxp] = [of("hhea"), of("maxp")];
            if (!built || !hhea || !maxp)
                throw new Error("The widths of the font file could not be rebuilt.");
            return { tag: t.tag, data: unpackHmtx(t.data, hhea.data.readUInt16BE(34), maxp.data.readUInt16BE(4), built.xMins) };
        }
        if (t.packed)
            throw new Error(`The ${t.tag.trim()} table of the font file is packed in a way that is not read.`);
        return { tag: t.tag, data: Buffer.from(t.data) };
    });
    return buildSfnt(flavor, tables);
}
export function fontFileKind(bytes: Uint8Array): "woff2" | "woff" | "otf" | "ttf" | null {
    if (bytes.length < 12)
        return null;
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    return tag === "wOF2" ? "woff2" : tag === "wOFF" ? "woff" : tag === "OTTO" ? "otf" : tag === "true" || tag === "\u0000\u0001\u0000\u0000" ? "ttf" : null;
}
export function plainFont(bytes: Uint8Array): {
    data: Buffer;
    ext: "ttf" | "otf";
} {
    const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const kind = fontFileKind(b);
    if (!kind)
        throw new Error("The file is not a font.");
    try {
        const data = kind === "woff2" ? unwoff2(b) : kind === "woff" ? unwoff(b) : b;
        return { data, ext: data.toString("latin1", 0, 4) === "OTTO" ? "otf" : "ttf" };
    }
    catch (e) {
        throw (e as NodeJS.ErrnoException).code ? new Error("The font file is damaged or cut short.") : e;
    }
}
export interface FontFacts {
    family: string;
    weights: [
        number,
        number
    ];
    italic: boolean;
    widths: Record<string, number>;
    widthsAt: number;
}
export const PROOF_LETTERS = "Hnoe";
function tablesOf(sfnt: Buffer): Map<string, Buffer> {
    const out = new Map<string, Buffer>();
    const count = sfnt.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
        const at = 12 + i * 16;
        const [offset, length] = [sfnt.readUInt32BE(at + 8), sfnt.readUInt32BE(at + 12)];
        out.set(sfnt.toString("latin1", at, at + 4), sfnt.subarray(offset, offset + length));
    }
    return out;
}
function glyphOf(cmap: Buffer, code: number): number {
    for (let i = 0; i < cmap.readUInt16BE(2); i++) {
        const [platform, encoding, o] = [cmap.readUInt16BE(4 + i * 8), cmap.readUInt16BE(6 + i * 8), cmap.readUInt32BE(8 + i * 8)];
        if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10)))
            continue;
        const format = cmap.readUInt16BE(o);
        if (format === 12) {
            for (let g = 0; g < cmap.readUInt32BE(o + 12); g++) {
                const [first, last, glyph] = [cmap.readUInt32BE(o + 16 + g * 12), cmap.readUInt32BE(o + 20 + g * 12), cmap.readUInt32BE(o + 24 + g * 12)];
                if (code >= first && code <= last)
                    return glyph + code - first;
            }
        }
        else if (format === 4) {
            const span = cmap.readUInt16BE(o + 6);
            for (let s = 0; s < span; s += 2) {
                if (code > cmap.readUInt16BE(o + 14 + s))
                    continue;
                const first = cmap.readUInt16BE(o + 16 + span + s);
                if (code < first)
                    break;
                const shift = cmap.readUInt16BE(o + 16 + span * 2 + s);
                const at = o + 16 + span * 3 + s;
                const range = cmap.readUInt16BE(at);
                const glyph = range ? cmap.readUInt16BE(at + range + (code - first) * 2) : code;
                if (glyph || !range)
                    return (glyph + shift) & 0xffff;
                break;
            }
        }
    }
    return 0;
}
export function fontFacts(sfnt: Buffer): FontFacts {
    try {
        return factsOf(sfnt);
    }
    catch (e) {
        throw (e as NodeJS.ErrnoException).code ? new Error("The font file is damaged or cut short.") : e;
    }
}
function factsOf(sfnt: Buffer): FontFacts {
    const tables = tablesOf(sfnt);
    const name = tables.get("name");
    if (!name)
        throw new Error("The font file does not state its family.");
    const count = name.readUInt16BE(2);
    const strings = name.readUInt16BE(4);
    let best: {
        rank: number;
        text: string;
    } | null = null;
    for (let i = 0; i < count; i++) {
        const at = 6 + i * 12;
        const [platform, language, id, length, offset] = [name.readUInt16BE(at), name.readUInt16BE(at + 4), name.readUInt16BE(at + 6), name.readUInt16BE(at + 8), name.readUInt16BE(at + 10)];
        if (id !== 16 && id !== 1)
            continue;
        const bytes = Buffer.from(name.subarray(strings + offset, strings + offset + length));
        const text = (platform === 1 ? bytes.toString("latin1") : bytes.length % 2 ? "" : bytes.swap16().toString("utf16le")).trim();
        const rank = (id === 16 ? 4 : 0) + (platform === 3 ? 2 : 0) + (platform === 3 && language === 0x409 ? 1 : 0);
        if (text && (!best || rank > best.rank))
            best = { rank, text };
    }
    if (!best)
        throw new Error("The font file does not state its family.");
    const os2 = tables.get("OS/2");
    const stated = os2 && os2.length >= 6 ? os2.readUInt16BE(4) : 400;
    let weights: [
        number,
        number
    ] = [stated, stated];
    let widthsAt = stated;
    const fvar = tables.get("fvar");
    if (fvar && fvar.length >= 16) {
        const [start, axes, size] = [fvar.readUInt16BE(4), fvar.readUInt16BE(8), fvar.readUInt16BE(10)];
        for (let i = 0; i < axes; i++) {
            const at = start + i * size;
            if (fvar.toString("latin1", at, at + 4) !== "wght")
                continue;
            weights = [Math.round(fvar.readInt32BE(at + 4) / 65536), Math.round(fvar.readInt32BE(at + 12) / 65536)];
            widthsAt = Math.round(fvar.readInt32BE(at + 8) / 65536);
        }
    }
    const head = tables.get("head");
    const [cmap, hhea, hmtx] = [tables.get("cmap"), tables.get("hhea"), tables.get("hmtx")];
    const widths: Record<string, number> = {};
    if (head && cmap && hhea && hmtx) {
        const em = head.readUInt16BE(18);
        const last = hhea.readUInt16BE(34) - 1;
        for (const letter of PROOF_LETTERS) {
            const glyph = glyphOf(cmap, letter.charCodeAt(0));
            if (glyph && em)
                widths[letter] = hmtx.readUInt16BE(Math.min(glyph, last) * 4) / em;
        }
    }
    return { family: best.text, weights, italic: !!head && head.length >= 46 && (head.readUInt16BE(44) & 2) !== 0, widths, widthsAt };
}
