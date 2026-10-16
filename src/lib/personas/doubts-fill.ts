import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { customerVoice } from "../customer-voice";
import { env } from "../env";
import { callStructured, llmEnabled } from "../llm/gateway";
import { mostRelevant } from "../llm/context";
import { offerBook } from "../offers/book";
import { renderPrompt } from "../prompts";
import { doubtsOf, mergeDoubts, spareProof, withDoubts } from "./doubts";
import { getPersona, listPersonas, savePersona } from "./store";
import type { DoubtPair, PersonaProfile } from "./types";
const Out = z.object({
    doubts: z
        .array(z.object({ doubt: z.string().min(4), proof: z.string().default(""), source: z.string().default("") }))
        .min(1)
        .max(6),
});
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
export interface FactLine {
    text: string;
    product_ids: string[];
}
const nameTokens = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^\d+$/.test(w));
const PLAIN = new Set("the and for with pack packs size sizes flavor flavors flavour flavours limited edition new classic regular daily ages age lto".split(" "));
function ownWords(brand: Pick<BrandBrain, "brand" | "products">): Map<string, Set<string>> {
    const shared = new Set(nameTokens(brand.brand.name));
    const all = brand.products.map((p) => ({ id: p.id, words: nameTokens(p.name).filter((w) => !shared.has(w) && !PLAIN.has(w)) }));
    return new Map(all.map((p) => [p.id, new Set(p.words.filter((w) => !all.some((q) => q.id !== p.id && q.words.includes(w))))]));
}
export function productsNamed(brand: Pick<BrandBrain, "brand" | "products">, text: string): string[] {
    if (brand.products.length < 2)
        return [];
    const said = new Set(nameTokens(text));
    return [...ownWords(brand)].filter(([, words]) => [...words].some((w) => said.has(w))).map(([id]) => id);
}
export function proofFactLines(brandId: string, brand: BrandBrain): FactLine[] {
    const cur = brand.brand.currency;
    const running = offerBook(brandId, brand).filter((o) => o.running);
    const general = (text: string): FactLine => ({ text, product_ids: [] });
    const named = (text: string): FactLine => ({ text, product_ids: productsNamed(brand, text) });
    return [
        general(`${brand.brand.name}: ${brand.brand.one_liner}`),
        general("Products:"),
        ...brand.products.map((p) => ({ text: `- ${p.name}. ${clip(p.format, 200)}`, product_ids: [p.id] })),
        general("Facts the brand can state (id: fact. where it comes from):"),
        ...brand.claims.filter((c) => c.status === "substantiated").map((c) => ({ text: `- ${c.id}: ${c.text}${c.source ? ` (${clip(c.source, 80)})` : ""}`, product_ids: productsNamed(brand, c.text) })),
        general(brand.guarantee ? `Guarantee: ${brand.guarantee.text}` : "Guarantee: none stated."),
        ...(brand.proof_assets.length ? [general("Other proof it holds:"), ...brand.proof_assets.map((a) => named(`- ${a}`))] : []),
        ...(running.length
            ? [
                general("Offers it runs today:"),
                ...running.map((o) => {
                    const text = `- ${o.name}, ${cur} ${o.price}.${o.terms ? ` ${clip(o.terms, 220)}` : ""}`;
                    const said = productsNamed(brand, text);
                    return { text, product_ids: said.length ? said : o.product_id && brand.products.length > 1 ? [o.product_id] : [] };
                }),
            ]
            : [general("Offers: none stated.")]),
    ];
}
export const proofFacts = (brandId: string, brand: BrandBrain): string => proofFactLines(brandId, brand).map((l) => l.text).join("\n");
function customerLines(brandId: string, p: PersonaProfile): string {
    const pool = db
        .select()
        .from(schema.themes)
        .where(and(eq(schema.themes.brand_id, brandId), inArray(schema.themes.type, ["objection", "final_objection", "proof_point", "failed_solution"])))
        .orderBy(schema.themes.rank)
        .limit(60)
        .all();
    const near = mostRelevant(pool, (t) => `${t.label} ${t.summary}`, `${p.name} ${p.summary} ${p.problem} ${p.objections.join(" ")} ${(p.tried ?? []).join(" ")}`, 8);
    const themes = near.map((t) => {
        const q = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.theme_id, t.id), customerVoice)).orderBy(desc(schema.insights.intensity)).limit(2).all();
        return `- (${t.type.replace(/_/g, " ")}) ${t.label}${q.map((x) => `\n   "${clip(x.quote.replace(/\s+/g, " "), 180)}"`).join("")}`;
    });
    const own = spareProof(p).map((b) => `- ${b}`);
    return [...own, ...themes].join("\n") || "(none recorded)";
}
const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, ""));
export interface ProofTie {
    lines: FactLine[];
    named: string[];
    persona_products?: string[];
}
const prices = (s: string) => [...s.matchAll(/[$£€]\s?(\d+(?:[.,]\d+)*)|(\d+(?:[.,]\d+)*)\s?(?:dollars|bucks|pounds|euros|USD|GBP|EUR)\b/g)].map((m) => (m[1] ?? m[2]).replace(/,/g, "").replace(/\.$/, ""));
export function pricesTied(proof: string, tie: ProofTie): boolean {
    const figures = prices(proof);
    if (!figures.length)
        return true;
    const holding = (n: string) => tie.lines.filter((l) => l.product_ids.length > 0 && numbers(l.text).includes(n));
    let about = tie.named;
    if (!about.length) {
        const general = (n: string) => tie.lines.some((l) => !l.product_ids.length && prices(l.text).includes(n));
        const pulled = figures.filter((n) => !general(n)).map(holding).filter((ls) => ls.length > 0 && ls.every((l) => l.product_ids.length === 1 && l.product_ids[0] === ls[0].product_ids[0])).map((ls) => ls[0].product_ids[0]);
        about = [...new Set(pulled)];
    }
    if (!about.length && tie.persona_products?.length === 1)
        about = tie.persona_products;
    if (!about.length || about.length > 1)
        return true;
    return figures.every((n) => {
        const ls = holding(n);
        return !ls.length || ls.some((l) => l.product_ids.some((id) => about.includes(id)));
    });
}
export function proofHolds(proof: string, facts: string, tie?: ProofTie): boolean {
    const have = new Set(numbers(facts));
    return numbers(proof).every((n) => have.has(n)) && (!tie || pricesTied(proof, tie));
}
const WORD_NUMBERS: Record<string, number> = { five: 5, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
export function moneyIn(text: string): number[] {
    const out = prices(text).map(Number);
    for (const m of text.toLowerCase().matchAll(/\b(five|ten|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)(?:[- ](one|two|three|four|five|six|seven|eight|nine))?(?=[- ]?(?:dollars?|bucks|pounds|euros|quid)\b)/g))
        out.push(WORD_NUMBERS[m[1]] + (m[2] ? ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"].indexOf(m[2]) + 1 : 0));
    return out.filter((n) => Number.isFinite(n));
}
export function borrowsMoney(doubt: string, brandPrices: number[], profile: string): boolean {
    const own = moneyIn(profile);
    return moneyIn(doubt).some((n) => !brandPrices.some((p) => Math.abs(p - n) <= 0.06 || Math.round(p) === n) && !own.some((o) => Math.abs(o - n) < 0.5));
}
export interface FillResult {
    persona: PersonaProfile;
    doubts: DoubtPair[];
    written: number;
    open: number;
    costUsd: number;
}
export async function fillDoubts(brandId: string, personaId: string): Promise<FillResult> {
    if (!llmEnabled())
        throw new Error("Filling doubts and proofs needs live mode. In mock mode, write them by hand.");
    const p = getPersona(brandId, personaId);
    if (!p)
        throw new Error("Persona not found");
    const brand = loadBrandBrain(brandId);
    const have = doubtsOf(p);
    const mine = have.filter((d) => d.by === "owner");
    const factLines = proofFactLines(brandId, brand);
    const facts = factLines.map((l) => l.text).join("\n");
    const said = customerLines(brandId, p);
    const prompt = renderPrompt("persona-doubts", {
        brand_name: brand.brand.name,
        facts,
        persona: [`${p.name}. ${p.summary}`, `Lives with: ${p.problem}`, p.wants ? `Wants: ${p.wants}` : "", p.trigger ? `Buys when: ${p.trigger}` : "", p.tried?.length ? `Tried before:\n${p.tried.map((t) => `- ${t}`).join("\n")}` : "", p.angle ? `How the product is put to them: ${p.angle}` : ""].filter(Boolean).join("\n"),
        kept: mine.length ? mine.map((d) => `- ${d.doubt}`).join("\n") : "(none)",
        noted: have.filter((d) => d.by === "app").map((d) => `- ${d.doubt}`).join("\n") || "(none)",
        customers: said,
        count: String(Math.max(1, 5 - mine.length)),
    });
    const res = await callStructured({ brandId, task: "persona_doubts", model: env.MODEL_FAST, system: prompt.system, user: prompt.user, schema: Out, effort: "low", maxTokens: 1500, refType: "persona", refId: personaId });
    const sent = `${facts}\n${said}`;
    const profile = [p.summary, p.problem, p.wants, p.trigger, ...(p.tried ?? []), ...p.language, p.notes ?? ""].join(" ");
    const brandPrices = offerBook(brandId, brand).filter((o) => o.running).map((o) => o.price);
    const kept = res.data.doubts.filter((d) => !borrowsMoney(d.doubt, brandPrices, profile));
    const written = (kept.length ? kept : res.data.doubts).map((d) => {
        const proof = d.proof.trim();
        const tie = { lines: [...factLines, ...said.split("\n").map((text) => ({ text, product_ids: [] as string[] }))], named: productsNamed(brand, proof), persona_products: p.product_ids };
        return { doubt: d.doubt.trim(), proof: proof && !/^none\b/i.test(d.source.trim()) && proofHolds(proof, sent, tie) ? proof : "" };
    });
    const merged = mergeDoubts(have, written);
    const persona = savePersona(brandId, { ...p, ...withDoubts(merged, spareProof(p)) });
    const fresh = merged.filter((d) => d.by === "app");
    return { persona, doubts: persona.doubts ?? merged, written: fresh.length, open: fresh.filter((d) => !d.proof).length, costUsd: res.costUsd };
}
export async function fillMissingDoubts(brandId: string, ids?: string[]): Promise<FillResult[]> {
    const todo = listPersonas(brandId).filter((p) => (ids ? ids.includes(p.id) : !doubtsOf(p).some((d) => d.proof)));
    const out: FillResult[] = [];
    for (const p of todo)
        out.push(await fillDoubts(brandId, p.id));
    return out;
}
export function recheckProofs(brandId: string): {
    persona: string;
    doubt: string;
    proof: string;
}[] {
    const brand = loadBrandBrain(brandId);
    const factLines = proofFactLines(brandId, brand);
    const dropped: {
        persona: string;
        doubt: string;
        proof: string;
    }[] = [];
    for (const p of listPersonas(brandId)) {
        if (!p.doubts?.length)
            continue;
        const next = p.doubts.map((d) => {
            if (d.by !== "app" || !d.proof)
                return d;
            const tie = { lines: factLines, named: productsNamed(brand, d.proof), persona_products: p.product_ids };
            if (pricesTied(d.proof, tie))
                return d;
            dropped.push({ persona: p.name, doubt: d.doubt, proof: d.proof });
            return { ...d, proof: "" };
        });
        if (next.some((d, k) => d !== p.doubts![k]))
            savePersona(brandId, { ...p, ...withDoubts(next, spareProof(p)) });
    }
    return dropped;
}
