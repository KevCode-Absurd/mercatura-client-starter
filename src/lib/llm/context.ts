import type { BrandBrain } from "../brand-brain";
import { wholeClaim } from "../copy/whole-claim";
import { completePacket } from "./packet";
export type ContextLevel = "focused" | "full" | "minimal";
export const CONTEXT_LEVELS: ContextLevel[] = ["focused", "full", "minimal"];
export const CONTEXT_LABEL: Record<ContextLevel, string> = { focused: "Focused: only what this step needs", full: "Full: the whole brand brain and whole skills", minimal: "Minimal: bare facts and rules" };
let forced: ContextLevel | null = process.env.CONTEXT_MODE === "full" ? "full" : null;
export const forcedLevel = () => forced;
export function setContextLevel(level: ContextLevel | null) {
    forced = level;
}
export function setContextMode(m: "lean" | "full") {
    forced = m === "full" ? "full" : "focused";
}
export function sectionsOf(md: string): {
    title: string;
    text: string;
}[] {
    return md
        .split(/^(?=## )/m)
        .map((text) => ({ title: /^## +(.+)$/m.exec(text.split("\n")[0])?.[1].trim() ?? "", text: text.trim() }))
        .filter((s) => s.text);
}
export function withoutSections(md: string, drop: RegExp): string {
    return sectionsOf(md)
        .filter((s) => !drop.test(s.title))
        .map((s) => s.text)
        .join("\n\n");
}
export function onlySections(md: string, keep: RegExp): string {
    return sectionsOf(md)
        .filter((s) => !s.title || keep.test(s.title))
        .map((s) => s.text)
        .join("\n\n");
}
const STOP = new Set("the a an and or of to in on for with from that this it is are was be as at by not no but so if then than them they their there what when which who how why you your our we i my me its it's can will just more most very have has had do does did".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
export function mostRelevant<T>(candidates: T[], text: (c: T) => string, about: string, keep: number, prior: (c: T, i: number) => number = (_, i) => i): T[] {
    if (candidates.length <= keep)
        return candidates;
    const want = new Set(words(about));
    const scored = candidates.map((c, i) => {
        const w = words(text(c));
        const hits = w.filter((x) => want.has(x)).length;
        return { c, i, score: (want.size && w.length ? hits / Math.sqrt(w.length) : 0) - prior(c, i) * 0.02 };
    });
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, keep)
        .sort((a, b) => a.i - b.i)
        .map((x) => x.c);
}
export function ownId(raw: string, known: Iterable<string>): string | null {
    const ids = [...known];
    if (ids.includes(raw))
        return raw;
    const r = raw.trim().toLowerCase();
    return ids.sort((a, b) => b.length - a.length).find((id) => r.startsWith(id.toLowerCase()) && !/^\d/.test(r.slice(id.length))) ?? null;
}
export interface Focus {
    productId?: string | null;
    personaIds?: string[];
    offerId?: string | null;
    about?: string;
    requiredClaimIds?: string[];
}
const overlap = (a: string, b: string) => {
    const set = new Set(words(b));
    return words(a).filter((w) => set.has(w)).length;
};
export function offersFor(brand: BrandBrain, productId?: string | null): BrandBrain["offers"] {
    if (!productId || brand.products.length < 2)
        return brand.offers;
    const kept = brand.offers.filter((o) => {
        const scores = brand.products.map((p) => ({ id: p.id, n: overlap(`${o.name} ${o.notes ?? ""}`, p.name) }));
        const best = Math.max(...scores.map((s) => s.n));
        return best === 0 || scores.some((s) => s.id === productId && s.n === best);
    });
    return kept.length ? kept : brand.offers;
}
const GENERIC = new Set("original the and for with pack packs size sizes flavor flavors flavour flavours limited edition new classic regular daily ages age to lto".split(" "));
const nameWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !/^\d+$/.test(w) && !GENERIC.has(w));
export function aboutAnotherProduct(brand: BrandBrain, productId: string | null | undefined, text: string): boolean {
    const mine = brand.products.find((p) => p.id === productId);
    if (!mine || brand.products.length < 2)
        return false;
    const shared = new Set(nameWords(brand.brand.name));
    const own = (p: BrandBrain["products"][number]) => nameWords(p.name).filter((w) => !shared.has(w));
    const mineWords = new Set(own(mine));
    const theirs = new Set(brand.products.filter((p) => p !== mine).flatMap(own).filter((w) => !mineWords.has(w)));
    const said = new Set(nameWords(text));
    return [...theirs].some((w) => said.has(w)) && ![...mineWords].some((w) => said.has(w));
}
export function claimsOfProduct(brand: BrandBrain, productId?: string | null): BrandBrain["claims"] {
    return brand.claims.filter((c) => c.status === "substantiated" && !aboutAnotherProduct(brand, productId, c.text));
}
export function claimsFor(brand: BrandBrain, about: string, extra: number, productId?: string | null, requiredIds: readonly string[] = []): {
    core: {
        id: string;
        text: string;
    }[];
    more: {
        id: string;
        text: string;
    }[];
} {
    const ok = claimsOfProduct(brand, productId);
    const short = (c: (typeof ok)[number]) => ({ id: c.id, text: wholeClaim(c) });
    const core = ok.filter((c) => !c.origin || c.origin === "brand");
    const coreIds = new Set(core.map((c) => c.id));
    const required = new Set(requiredIds);
    const rest = ok.filter((c) => !coreIds.has(c.id) && !required.has(c.id));
    const optional = mostRelevant(rest, (c) => c.text, about, extra);
    const selected = completePacket(ok.map((c) => ({ id: c.id, value: short(c) })), [...coreIds, ...required], optional.map((c) => c.id), extra);
    return { core: selected.filter((c) => coreIds.has(c.id)).map((c) => c.value), more: selected.filter((c) => !coreIds.has(c.id)).map((c) => c.value) };
}
export interface BrandPack {
    stable: Record<string, unknown>;
    own: Record<string, unknown>;
}
export function brandPack(brand: BrandBrain, level: Exclude<ContextLevel, "full">, focus: Focus = {}): BrandPack {
    const min = level === "minimal";
    const product = focus.productId ? brand.products.find((p) => p.id === focus.productId) : undefined;
    const offers = offersFor(brand, product?.id);
    const named = focus.offerId ? brand.offers.find((o) => o.id === focus.offerId) : undefined;
    if (focus.offerId && !named)
        throw new Error(`Missing selected offer: ${focus.offerId}`);
    const buyers = (focus.personaIds ?? []).map((id) => brand.personas.find((p) => p.id === id)).filter((p): p is BrandBrain["personas"][number] => !!p);
    const claims = claimsFor(brand, `${focus.about ?? ""} ${product?.name ?? ""} ${buyers.map((b) => `${b.problem} ${b.language.join(" ")}`).join(" ")}`, min ? 4 : 8, product?.id, focus.requiredClaimIds);
    const offer = (o: BrandBrain["offers"][number], whole = !o.id.startsWith("off_x_")) => ({ id: o.id, name: o.name, price: o.price, ...(whole && o.per_day ? { per_day: o.per_day } : {}), ...(whole && o.notes ? { notes: o.notes } : {}) });
    return {
        stable: {
            brand: min ? { name: brand.brand.name, market: brand.brand.market, currency: brand.brand.currency, category: brand.brand.category, one_liner: brand.brand.one_liner } : brand.brand,
            market_sophistication_stage: brand.market_sophistication_stage,
            ...(product
                ? { product: min ? { id: product.id, name: product.name, format: product.format } : product, ...(brand.products.length > 1 ? { other_products_not_the_subject: brand.products.filter((p) => p !== product).map((p) => p.name) } : {}) }
                : { products: brand.products.map((p) => (min ? { id: p.id, name: p.name, format: p.format } : p)) }),
            offers: (min ? offers.slice(0, 2) : offers).map((o) => offer(o)),
            guarantee: brand.guarantee?.text ?? null,
            approved_claims: claims.core,
            forbidden_claims: brand.forbidden_claims,
            ...(min ? {} : { proof_assets: brand.proof_assets }),
            voice: brand.voice,
            personas: brand.personas.map((p) => (min || buyers.length ? { id: p.id, name: p.name } : { id: p.id, name: p.name, summary: p.summary, problem: p.problem, language: p.language })),
        },
        own: {
            ...(buyers.length ? { buyers: buyers.map((p) => (min ? { id: p.id, name: p.name, problem: p.problem, language: p.language.slice(0, 4) } : p)) } : {}),
            ...(named ? { offer_for_this_piece: offer(named, true) } : {}),
            ...(claims.more.length ? { more_approved_claims: claims.more } : {}),
        },
    };
}
