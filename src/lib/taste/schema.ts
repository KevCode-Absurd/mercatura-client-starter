import { z } from "zod";
import { FINISH_STOPS, HOOK_STOPS, LENGTH_STOPS, LEVER_KEYS, LOOKS, PACE_STOPS, PEOPLE_STOPS, PRODUCT_STOPS, SELL_STOPS, SPREAD_STOPS, STYLING_STOPS, WORDS_STOPS, type Taste } from "./types";
const lever = <T extends readonly [
    string,
    ...string[]
]>(stops: T) => z.enum(stops).optional().catch(undefined);
export const tasteSchema = z.object({
    look: lever(LOOKS),
    product: lever(PRODUCT_STOPS),
    styling: lever(STYLING_STOPS),
    sell: lever(SELL_STOPS),
    words: lever(WORDS_STOPS),
    finish: lever(FINISH_STOPS),
    spread: lever(SPREAD_STOPS),
    length: lever(LENGTH_STOPS),
    pace: lever(PACE_STOPS),
    people: lever(PEOPLE_STOPS),
    hooks: lever(HOOK_STOPS),
});
export const TASTE_FIELD = "taste";
export function parseTaste(raw: unknown): Taste {
    let v = raw;
    if (typeof v === "string") {
        if (!v.trim())
            return {};
        try {
            v = JSON.parse(v);
        }
        catch {
            return {};
        }
    }
    if (!v || typeof v !== "object" || Array.isArray(v))
        return {};
    const got = tasteSchema.safeParse(v);
    if (!got.success)
        return {};
    return compactTaste(got.data as Taste);
}
export function compactTaste(t: Taste | null | undefined): Taste {
    const out: Record<string, string> = {};
    for (const k of LEVER_KEYS) {
        const v = t?.[k];
        if (v)
            out[k] = v;
    }
    return out as Taste;
}
export const tasteJson = (t: Taste | null | undefined) => JSON.stringify(compactTaste(t));
export function tasteToFormData(t: Taste | null | undefined, fd: FormData = new FormData(), name: string = TASTE_FIELD): FormData {
    fd.set(name, tasteJson(t));
    return fd;
}
export function tasteFromFormData(fd: FormData, name: string = TASTE_FIELD): Taste {
    const v = fd.get(name);
    return typeof v === "string" ? parseTaste(v) : {};
}
