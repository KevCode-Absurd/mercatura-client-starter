import type { AuditItem, StudioItem } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { figure, shareLimits, upToLimits, type Limit } from "../copy/figures";
import { currencySymbol } from "../money";
import { quotedIn, verifyQuotes } from "./checks";
const OFFER_NOTE = /The offer these state, exactly as given: (off_[a-z0-9_]+)/i;
const MONEY = /(?:[$£€₹¥]|\b(?:USD|GBP|EUR|AUD|CAD)\s?)\s?(\d[\d,]*(?:\.\d+)?)/g;
const PLACEHOLDER = /\[[^\]]*(REAL|REVIEW|QUOTE)[^\]]*\]/i;
const amounts = (text: string) => [...text.matchAll(MONEY)].map((m) => ({ said: m[0].trim(), n: Number(m[1].replace(/,/g, "")) })).filter((a) => Number.isFinite(a.n));
const numbersIn = (text: string) => new Set([...text.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, ""))));
export function limitsOf(brand: BrandBrain): Limit[] {
    const claims = brand.claims.filter((c) => c.status === "substantiated").map((c) => c.text);
    const out: Limit[] = [...shareLimits(claims, true), ...upToLimits([...claims, ...brand.offers.map((o) => `${o.name}. ${o.notes ?? ""}`)], true)];
    const intro = (o: BrandBrain["offers"][number]) => /\bfirst\b/i.test(o.name) || /\bstarts? (at|from)\b/i.test(o.notes ?? "");
    for (const o of brand.offers.filter(intro)) {
        if (brand.offers.some((x) => !intro(x) && x.price === o.price))
            continue;
        out.push({ said: new RegExp(`[$£€₹¥]\\s?${figure(String(o.price))}`), kept: /\bfirst\b|\bstarts? (at|from)\b|\bfrom [$£€₹¥]|\bthen [$£€₹¥]|\bintro/i, say: `${o.price} as the price, where it is the first order's or the starting price` });
    }
    return out;
}
export function brandAmounts(brand: BrandBrain): Set<number> {
    const out = new Set<number>();
    const prices = brand.offers.map((o) => o.price);
    for (const o of brand.offers)
        for (const n of numbersIn(`${o.name} ${o.price} ${o.per_day ?? ""} ${o.notes ?? ""}`))
            out.add(n);
    for (const text of [...brand.claims.filter((c) => c.status === "substantiated").map((c) => c.text), ...brand.proof_assets, brand.guarantee?.text ?? ""])
        for (const a of amounts(text))
            out.add(a.n);
    for (const a of prices)
        for (const b of prices)
            if (a > b)
                out.add(Math.round((a - b) * 100) / 100);
    return out;
}
export function truthChecks(brandId: string, brand: BrandBrain, item: StudioItem, i: number, notes = ""): AuditItem[] {
    const p = item.plan;
    if (!p)
        return [];
    const n = i + 1;
    const out: AuditItem[] = [];
    const surfaces = [
        { where: `Image ${n}, on the image`, text: p.text_elements.map((t) => t.text).join(". ") },
        ...(p.ad_copy ? [{ where: `Image ${n}, feed copy`, text: [p.ad_copy.primary_text, p.ad_copy.headline, p.ad_copy.description].filter(Boolean).join(". ") }] : []),
    ].filter((s) => s.text.trim());
    const limits = limitsOf(brand);
    for (const s of surfaces) {
        const lost = limits.filter((l) => l.said.test(s.text) && !l.kept.test(s.text));
        if (lost.length)
            out.push({ check: "qualifier_dropped", status: "warn", message: `${s.where} states ${[...new Set(lost.map((l) => l.say))].slice(0, 3).join("; ")}. State it the way the brand's own claim or offer does.`, line_index: i });
    }
    for (const t of p.text_elements) {
        if (t.role !== "quote" || PLACEHOLDER.test(t.text) || quotedIn(t.text).length)
            continue;
        const words = t.text.replace(/^["“'‘]+|["”'’]+$/g, "").trim();
        if (words.split(/\s+/).length < 4)
            continue;
        if (verifyQuotes(brandId, [`"${words}"`]).unknown.length)
            out.push({ check: "quote_source", status: "warn", message: `Image ${n} presents "${words.slice(0, 70)}" as a customer's words, and they are not word for word in the research. Use a real customer's exact words.`, line_index: i });
    }
    const known = brandAmounts(brand);
    const chosen = brand.offers.find((o) => o.id === OFFER_NOTE.exec(notes)?.[1]);
    const chosenNumbers = chosen ? numbersIn(`${chosen.price} ${chosen.per_day ?? ""} ${chosen.notes ?? ""} ${chosen.name}`) : null;
    const sym = currencySymbol(brand.brand.currency, { local: true });
    const seen = new Set<string>();
    for (const s of surfaces) {
        for (const a of amounts(s.text)) {
            if (seen.has(a.said))
                continue;
            seen.add(a.said);
            if (!known.has(a.n))
                out.push({ check: "price_source", status: "warn", message: `${s.where} states ${a.said}, which is not a price, a saving or a threshold in the brand's offers or claims. Check it.`, line_index: i });
            else if (chosen && chosenNumbers && !chosenNumbers.has(a.n))
                out.push({ check: "offer_mismatch", status: "warn", message: `${s.where} states ${a.said}, but this set was told to state "${chosen.name.slice(0, 60)}" at ${sym}${chosen.price}. An ad that states a price states that offer's.`, line_index: i });
        }
    }
    return out;
}
