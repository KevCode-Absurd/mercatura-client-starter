import sharp from "sharp";
import { z } from "zod";
import type { PlacedLine } from "@/db/schema";
import { env } from "../env";
import { geminiJson } from "../llm/gemini";
import { placedFrom } from "./overlay";
const Seen = z.preprocess((v) => (Array.isArray(v) ? { lines: v } : v), z.object({
    lines: z
        .array(z.object({
        n: z.coerce.number(),
        found: z.boolean().default(true),
        box: z.array(z.coerce.number()).default([]),
        rows: z.coerce.number().default(1),
        color: z.string().default("#ffffff"),
        align: z.string().default("center"),
        upper: z.boolean().default(false),
        weight: z.string().default("regular"),
        on: z.string().default("none"),
        fill: z.string().default(""),
    }))
        .max(20)
        .default([]),
}));
export const LAYOUT_READ_SYSTEM = `You are shown a finished advertisement. Lines of text were added over the picture when it was made. For each line listed, find it on the picture and report where it is and how it is set, so the same words can be set again as type in the same place. Words printed on the product or its pack are not these lines: leave them out.

Return JSON: { "lines": [ ... ] }, 1 object for each line listed, in the same order:
- n: the line's number as listed.
- found: false if that line is not on the picture. A line that is reworded or misspelt on the picture is still found.
- box: [top, left, bottom, right], each from 0 to 1000, where 0, 0 is the top left corner of the picture and 1000, 1000 its bottom right. The box is tight around the letters of the whole line, every row of it, and nothing else: not the button, panel or badge it sits on.
- rows: how many rows the line is broken over on the picture.
- color: the colour of the letters, as #rrggbb.
- align: how the line is set: "left", "center" or "right". For a line on 1 row: "center" if it sits centred on the picture or on its button, "left" if it starts at the same left edge as the lines near it, "right" if it ends at the same right edge.
- upper: true if it is set in capital letters throughout.
- weight: "light", "regular", "medium", "bold" or "black".
- on: "button" if the line sits on a filled button, pill or badge made to hold it; "panel" if it sits on a filled band or box laid over the picture; "none" if it sits straight on the picture.
- fill: the colour of that button or panel, as #rrggbb. Empty when on is "none".`;
export async function seeLines(req: {
    brandId: string;
    refId: string;
    file: string;
    texts: {
        role: string;
        text: string;
    }[];
    palette?: string[];
}): Promise<PlacedLine[]> {
    if (!req.texts.length)
        return [];
    const meta = await sharp(req.file).metadata();
    if (!meta.width || !meta.height)
        throw new Error("The picture could not be read.");
    const out = await geminiJson({
        brandId: req.brandId,
        task: "studio_layout",
        model: env.MODEL_REFERENCE,
        system: LAYOUT_READ_SYSTEM,
        user: `Lines, as written:\n${req.texts.map((t, i) => `${i + 1}. ${t.role}: ${JSON.stringify(t.text)}`).join("\n")}`,
        schema: Seen,
        images: [req.file],
        effort: "low",
        maxTokens: 2000,
        refType: "studio",
        refId: req.refId,
    });
    return placedFrom(out.lines, req.texts.length, meta.width / meta.height, req.palette ?? []);
}
