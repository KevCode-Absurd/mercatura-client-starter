import sharp from "sharp";
import { characterViewIndices } from "./character-view-rules";
export async function characterSheetDimensions(sheet: string) {
    const { width = 0, height = 0 } = await sharp(sheet).metadata();
    if (!width || !height || width / 3 < 64 || height / 2 < 64 || Math.abs((width / height) / 1.5 - 1) > 0.03)
        throw new Error("The character sheet must contain six near-square panels in a 3 by 2 grid.");
    const cells = Array.from({ length: 6 }, (_, i) => {
        const x = i % 3;
        const y = Math.floor(i / 3);
        const left = Math.round(x * width / 3);
        const top = Math.round(y * height / 2);
        return { left, top, width: Math.round((x + 1) * width / 3) - left, height: Math.round((y + 1) * height / 2) - top };
    });
    return { width, height, cells };
}
export async function replaceCharacterViewPixels(sheet: string, replacements: {
    index: number;
    file: string;
    panelOut: string;
}[], out: string): Promise<void> {
    characterViewIndices(replacements.map((r) => r.index));
    const { width, height, cells } = await characterSheetDimensions(sheet);
    const pixels = await sharp(sheet).ensureAlpha().raw().toBuffer();
    for (const r of replacements) {
        const { left, top, width: panelWidth, height: panelHeight } = cells[r.index];
        const panel = await sharp(r.file).resize(panelWidth, panelHeight, { fit: "contain", background: "#f5f2ed" }).ensureAlpha().raw().toBuffer();
        for (let y = 0; y < panelHeight; y++)
            panel.copy(pixels, ((top + y) * width + left) * 4, y * panelWidth * 4, (y + 1) * panelWidth * 4);
        await sharp(panel, { raw: { width: panelWidth, height: panelHeight, channels: 4 } }).png().toFile(r.panelOut);
    }
    await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(out);
}
