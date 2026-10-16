import { compactTaste, parseTaste } from "./schema";
import { LOOKS, PRODUCT_STOPS, STYLING_STOPS, type Taste } from "./types";
const value = (argv: string[], name: string): string | undefined => {
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    if (eq)
        return eq.slice(name.length + 3);
    const i = argv.indexOf(`--${name}`);
    return i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
};
const LOOK_WORDS: Record<string, string> = { close: "brand", exact: "reference", exactly: "reference" };
const one = <T extends string>(stops: readonly T[], v: string | undefined, alias: Record<string, string> = {}): T | undefined => {
    const k = (v ?? "").toLowerCase();
    return stops.find((s) => s === (alias[k] ?? k));
};
export const productIsLever = (v: string | undefined): boolean => !!one(PRODUCT_STOPS, v);
export const productIdArg = (argv: string[] = process.argv): string | undefined => {
    const v = value(argv, "product");
    return productIsLever(v) ? undefined : v;
};
export function tasteFromArgs(argv: string[] = process.argv): {
    taste: Taste;
    unknown: string[];
} {
    const unknown: string[] = [];
    const base = parseTaste(value(argv, "taste") ?? "");
    const read = <T extends string>(flag: string, stops: readonly T[], raw: string | undefined, alias?: Record<string, string>): T | undefined => {
        if (raw === undefined)
            return undefined;
        const got = one(stops, raw, alias);
        if (!got)
            unknown.push(`--${flag}=${raw} (use ${stops.join(", ")})`);
        return got;
    };
    const productRaw = value(argv, "product-in-picture") ?? (productIsLever(value(argv, "product")) ? value(argv, "product") : undefined);
    const flags: Taste = {
        look: read("look", LOOKS, value(argv, "look"), LOOK_WORDS),
        product: read("product", PRODUCT_STOPS, productRaw),
        styling: read("styling", STYLING_STOPS, value(argv, "styling")),
    };
    return { taste: compactTaste({ ...base, ...compactTaste(flags) }), unknown };
}
