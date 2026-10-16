import { z } from "zod";
import type { BrandBrain } from "../brand-brain";
import { brandFactLines, isWholeBrand } from "../choices";
import { env } from "../env";
import { claimsOfProduct } from "../llm/context";
import { structuredJson } from "../llm/structured";
import type { PersonaProfile } from "../personas/types";
import { renderPrompt } from "../prompts";
import { termsBlock, termsLine } from "./fact-rules";
import { productFacts } from "./flow";
export interface FactRow {
    id: string;
    quote: string;
    held: string;
    verdict: "held" | "stretched" | "invented" | "scene";
    why: string;
}
const Out = z.object({ statements: z.array(z.object({ id: z.union([z.string(), z.number()]), quote: z.string().default(""), fact: z.number().int().default(0), verdict: z.string().default("invented"), why: z.string().default("") })).max(80).default([]) });
export type FactCheckOut = z.input<typeof Out>;
export function factStore(brand: BrandBrain, opts: {
    productId?: string | null;
    offerId?: string | null;
    persona?: {
        name: string;
        summary: string;
        problem: string;
        trigger?: string;
        language?: string[];
    } | null;
    profile?: Partial<Pick<PersonaProfile, "notes" | "tried" | "believes" | "wants" | "identity">> | null;
    brief?: string[];
}): string[] {
    const whole = isWholeBrand(opts.productId);
    const product = whole ? undefined : (brand.products.find((x) => x.id === opts.productId) ?? brand.products[0]);
    const p = opts.persona;
    const prof = opts.profile;
    return [
        ...(whole ? [...brandFactLines(brand), ...brand.products.flatMap((x) => productFacts({ brand: {} }, x))] : productFacts(brand, product)),
        ...claimsOfProduct(brand, product?.id).map((c) => c.text),
        ...termsBlock(brand, opts.offerId).split("\n").filter((l) => l.startsWith("- ")).map((l) => `The offer. ${l.slice(2)}`),
        termsLine(brand, opts.offerId) ? `The offer, in full: ${termsLine(brand, opts.offerId)}` : "",
        p ? `The buyer (${p.name}): ${p.summary} ${p.problem}${p.trigger ? ` What makes them look: ${p.trigger}` : ""}` : "",
        prof?.identity ? `The buyer sees themselves as: ${prof.identity}` : "",
        prof?.wants ? `The buyer wants: ${prof.wants}` : "",
        prof?.notes ? `Also known of the buyer: ${prof.notes}` : "",
        ...(prof?.tried ?? []).map((t) => `The buyer tried: ${t}`),
        ...(p?.language ?? []).map((l) => `In a customer's words: "${l}"`),
        ...(prof?.believes ?? []).map((b) => `Proof held for this buyer: ${b.replace(/^On "[^"]*":\s*/, "")}`),
        ...(opts.brief ?? []),
    ]
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter((x, i, all) => x && all.indexOf(x) === i);
}
const UNIT_AFTER = /^\s?(?:%|percent\b|mg\b|mcg\b|g\b|kg\b|ml\b|l\b|oz\b|lbs?\b|iu\b|k?cal\b|x\b|k\b|\+(?![\p{L}\d]))/iu;
const ORDER_OR_CLOCK = /^(?:st|nd|rd|th)\b|^:\d|^\s?(?:am|pm|a\.m|p\.m|o['’]clock)\b/i;
const LABEL_BEFORE = /(?:\b(?:step|day|week|round|rule|tip|level|stage|phase|chapter|lesson|reason|mistake|rung|attempt|option|no\.)|#)\s*$/i;
const NOT_A_NOUN = new Set("is are was were am be and or but of to in on at the a an i you he she it we they my your our their then so that this if when where which who with for by as until after before from not no now still just".split(" "));
export function figuresIn(text: string): string[] {
    const out: string[] = [];
    for (const m of text.matchAll(/\d[\d,.]*%?/g)) {
        const n = m[0].replace(/[.,]$/, "");
        const before = text.slice(0, m.index);
        const after = text.slice(m.index + n.length);
        if (ORDER_OR_CLOCK.test(after) || /\d:$/.test(before))
            continue;
        const noun = after.match(/^(?:\s+|-)([\p{L}][\p{L}'’]*)/u)?.[1]?.toLowerCase();
        const counted = !!noun && !NOT_A_NOUN.has(noun) && !LABEL_BEFORE.test(before);
        if (n.endsWith("%") || /[$£€]\s?$/.test(before) || UNIT_AFTER.test(after) || counted)
            out.push(n);
    }
    return out;
}
export const statesFigure = (text: string): boolean => figuresIn(text).length > 0;
export function settleFacts(out: FactCheckOut, store: string[]): FactRow[] {
    return (out.statements ?? [])
        .map((s) => {
        const held = store[(s.fact ?? 0) - 1] ?? "";
        const said = String(s.verdict ?? "").trim().toLowerCase();
        const story = said === "scene" && !statesFigure(s.quote ?? "");
        const verdict: FactRow["verdict"] = story ? "scene" : !held ? "invented" : said === "held" ? "held" : said === "stretched" ? "stretched" : "invented";
        return { id: String(s.id).trim().replace(/^(?:line\s*)?(\d+)[a-z]$/i, "$1"), quote: (s.quote ?? "").replace(/\s+/g, " ").trim(), held: verdict === "invented" || verdict === "scene" ? "" : held, verdict, why: (s.why ?? "").replace(/\s+/g, " ").trim() };
    })
        .filter((r) => r.id && r.quote);
}
export const factFaults = (rows: FactRow[]) => rows.filter((r) => r.verdict === "invented" || r.verdict === "stretched");
export const factFaultLine = (r: FactRow) => (r.verdict === "invented" ? `"${r.quote}" rests on no fact the brand holds${r.why ? ` (${r.why})` : ""}: take out only what no held fact says and keep the rest, said again without it (never cut whole)` : `"${r.quote}" says more than the held fact "${r.held}"${r.why ? ` (${r.why})` : ""}: take out the part that goes beyond the fact. Add no figure the line did not have`);
export async function factCheck(req: {
    brandId: string;
    brandName: string;
    store: string[];
    items: {
        id: string;
        text: string;
    }[];
    refId: string;
    faultsOnly?: boolean;
}): Promise<FactRow[]> {
    if (!req.items.length)
        return [];
    const p = renderPrompt("script-fact-check", {
        brand_name: req.brandName,
        facts: req.store.map((f, i) => `${i + 1}. ${f}`).join("\n") || "(the brand holds no facts)",
        ask: req.faultsOnly ? "These lines were just patched. List only the statements that are stretched or invented: leave out what is held and what is scene. No such statement: an empty list." : "",
        words: req.items.map((x) => `${x.id} | ${x.text}`).join("\n"),
    });
    const out = await structuredJson({ brandId: req.brandId, task: "script_fact_check", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: Math.min(2500, 600 + 90 * req.items.length), refType: "script", refId: req.refId });
    return settleFacts(out, req.store);
}
