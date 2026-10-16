import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fontsDir, listBrandFonts, type BrandFontFile } from "../brand-fonts";
import { readBrandLook, type BrandLook } from "../brand-look";
import { fontFacts, plainFont, type FontFacts } from "./font-file";
import { contrast, PLAIN_LOOK, wordsImage, type MotionLook } from "./tiles";
interface Swatch {
    role: string;
    hex: string;
}
const HEX = /^#[0-9a-fA-F]{6}$/;
const TILE_ROLES = ["primary", "cta", "secondary", "accent", "text", "other", "background", "surface"];
const WORD_ROLES = ["background", "surface", "text", "accent", "secondary", "primary", "cta", "other"];
const inOrder = (palette: Swatch[], roles: string[]) => roles.flatMap((r) => palette.filter((p) => p.role === r));
export function motionColours(palette: Swatch[]): (Pick<MotionLook, "background" | "foreground" | "accent"> & {
    ownWords: boolean;
}) | null {
    const known = palette.filter((p) => HEX.test(p.hex)).map((p) => ({ role: TILE_ROLES.includes(p.role) ? p.role : "other", hex: p.hex.toLowerCase() }));
    if (!known.length)
        return null;
    const tiles = inOrder(known, TILE_ROLES);
    const accent = (tile: string) => (known.find((p) => p.role === "accent") ?? known.find((p) => p.role === "cta") ?? known.find((p) => p.role === "secondary"))?.hex ?? tile;
    for (const tile of tiles) {
        const words = inOrder(known, WORD_ROLES).find((w) => contrast(w.hex, tile.hex) >= 4.5);
        if (words)
            return { background: tile.hex, foreground: words.hex, accent: accent(tile.hex), ownWords: true };
    }
    const tile = tiles[0].hex;
    return { background: tile, foreground: contrast("#ffffff", tile) >= 4.5 ? "#ffffff" : "#000000", accent: accent(tile), ownWords: false };
}
export interface FaceChoice {
    role: string;
    family: string;
    weight: number;
    upper: boolean;
    file: BrandFontFile | null;
}
function fileFor(files: BrandFontFile[], family: string, weight: number): BrandFontFile | null {
    const mine = files.filter((f) => f.family.toLowerCase() === family.toLowerCase());
    const upright = mine.filter((f) => f.style === "normal");
    const away = (f: BrandFontFile) => {
        const [a, b = a] = f.weight.split(" ").map(Number);
        return !Number.isFinite(a) ? 1000 : weight < a ? a - weight : weight > b ? weight - b : 0;
    };
    return [...(upright.length ? upright : mine)].sort((x, y) => away(x) - away(y))[0] ?? null;
}
const FACE_ROLES = ["heading", "display"];
export function motionFaces(fonts: BrandLook["fonts"], files: BrandFontFile[], surface: "motion" | "caption" = "motion"): FaceChoice[] {
    const out: FaceChoice[] = [];
    for (const role of surface === "caption" ? ["body", ...FACE_ROLES] : FACE_ROLES) {
        const f = fonts.find((x) => x.role === role);
        if (!f || out.some((o) => o.family.toLowerCase() === f.family.toLowerCase()))
            continue;
        const weight = Math.min(900, Math.max(100, Number(f.weight) || (role === "body" ? 400 : 700)));
        out.push({ role, family: f.family, weight, upper: f.letter_case === "uppercase", file: fileFor(files, f.family, weight) });
    }
    return out;
}
const LONGEST_PATH = 240;
const readied = new Map<string, {
    file: string;
    facts: FontFacts;
}>();
export function readyFont(src: string): {
    file: string;
    facts: FontFacts;
} {
    const stat = fs.statSync(src);
    const key = `${src}|${stat.size}|${stat.mtimeMs}`;
    const had = readied.get(key);
    if (had && fs.existsSync(had.file))
        return had;
    const plain = plainFont(fs.readFileSync(src));
    const facts = fontFacts(plain.data);
    const name = `${crypto.createHash("sha1").update(plain.data).digest("hex").slice(0, 16)}.${plain.ext}`;
    const beside = path.join(path.dirname(src), "plain", name);
    const file = beside.length <= LONGEST_PATH ? beside : path.join(os.tmpdir(), "ce-fonts", name);
    if (!fs.existsSync(file) || fs.statSync(file).size !== plain.data.length) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const part = `${file}.${process.pid}`;
        fs.writeFileSync(part, plain.data);
        try {
            fs.renameSync(part, file);
        }
        catch (e) {
            fs.rmSync(part, { force: true });
            if (!fs.existsSync(file))
                throw e;
        }
    }
    const ready = { file, facts };
    readied.set(key, ready);
    return ready;
}
const PROOF_SIZE = 400;
const PROOF_SLACK = 2;
export async function faceMiss(facts: FontFacts, fontFile: string): Promise<number | null> {
    const letters = Object.keys(facts.widths);
    if (letters.length < 3)
        return null;
    const wide = async (text: string) => (await wordsImage(text, { family: facts.family, weight: facts.widthsAt, size: PROOF_SIZE, color: "#000000", fontFile })).width;
    try {
        let miss = 0;
        for (const letter of letters)
            miss = Math.max(miss, Math.abs((await wide(letter + letter)) - (await wide(letter)) - facts.widths[letter] * PROOF_SIZE));
        return miss;
    }
    catch {
        return null;
    }
}
export async function faceDraws(facts: FontFacts, fontFile: string): Promise<boolean> {
    const miss = await faceMiss(facts, fontFile);
    return miss !== null && miss <= PROOF_SLACK;
}
export async function motionLook(brandId: string, spare: {
    hex: string;
}[] = [], surface: "motion" | "caption" = "motion"): Promise<MotionLook> {
    let look: BrandLook | null = null;
    let files: BrandFontFile[] = [];
    let dir = "";
    try {
        look = readBrandLook(brandId).look;
        files = listBrandFonts(brandId);
        dir = fontsDir(brandId);
    }
    catch {
    }
    const notes: string[] = [];
    const own = motionColours(look?.palette ?? []);
    const colours = own ?? motionColours(spare.map((c) => ({ role: "other", hex: c.hex })));
    if (!colours)
        notes.push("The brand has no colours on file, so the tiles are white on near black.");
    else {
        notes.push(`Colours: tile ${colours.background}, words ${colours.foreground}, from ${own ? "the brand's look on file" : "the brand's creative kit (its site has not been read for its look)"}.`);
        if (!colours.ownWords)
            notes.push("No 2 of the brand's colours can be read on each other, so the words are white or black.");
    }
    let type: {
        family: string;
        weight: number;
        upper: boolean;
        file: string;
    } | null = null;
    const faces = motionFaces(look?.fonts ?? [], files, surface);
    for (const c of faces.slice(0, 1)) {
        if (!c.file) {
            notes.push(`No font file of ${c.family} is on hand.`);
            continue;
        }
        try {
            const ready = readyFont(path.join(dir, path.basename(c.file.file)));
            if (await faceDraws(ready.facts, ready.file)) {
                type = { family: ready.facts.family, weight: Math.min(ready.facts.weights[1], Math.max(ready.facts.weights[0], c.weight)), upper: c.upper, file: ready.file };
                notes.push(`Type: ${c.family}, the brand's ${c.role === "heading" ? "headline" : c.role} face.`);
                break;
            }
            notes.push(`The font file of ${c.family} did not draw on this computer.`);
        }
        catch (e) {
            const why = (e as NodeJS.ErrnoException).code ? "it could not be opened, or its plain copy could not be saved" : (e as Error).message.replace(/\.$/, "");
            notes.push(`The font file of ${c.family} could not be read (${why}).`);
        }
    }
    if (!type)
        notes.push("Added text needs the brand's verified font file. Restore that input before rendering captions or labels; no replacement face is used.");
    return {
        background: colours?.background ?? PLAIN_LOOK.background,
        foreground: colours?.foreground ?? PLAIN_LOOK.foreground,
        accent: colours?.accent ?? PLAIN_LOOK.accent,
        brandColours: !!colours,
        fontFamily: type?.family ?? faces[0]?.family ?? PLAIN_LOOK.fontFamily,
        fontWeight: type?.weight ?? faces[0]?.weight ?? PLAIN_LOOK.fontWeight,
        upper: type?.upper ?? false,
        ...(type ? { fontFile: type.file } : {}),
        brandType: !!type,
        notes,
    };
}
