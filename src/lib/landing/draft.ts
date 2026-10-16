import type { BrandBrain } from "../brand-brain";
import type { BoundEvidence } from "../standalone/evidence";
import { factualLandingContext } from "./factual-context";
import { offersFor } from "../llm/context";
import { formatMoney } from "../money";
import type { PersonaProfile } from "../personas/types";
import { ageRange } from "./ads";
import type { DocQuote, LandingContext, Objection, Photo } from "./context";
import { BUCKET_LABEL, FORMULAS, kindForAwareness, type AdSnapshot, type Brief, type Bucket, type BuyOption, type Formula, type ImageSlot, type PageKind, type Quote, type Section } from "./types";
export interface DraftInput {
    omitOffer?: boolean;
    evidence?: BoundEvidence[];
    taskBrief?: Brief["taskBrief"];
    kind?: PageKind;
    productId?: string | null;
    personaId?: string | null;
    offerId?: string | null;
    ad?: AdSnapshot | null;
    angle?: string;
    notes?: string;
    ctaUrl?: string;
    formula?: Formula | null;
}
export interface Draft {
    title: string;
    kind: PageKind;
    product_id: string;
    persona_id: string | null;
    offer_id: string | null;
    brief: Brief;
    sections: Section[];
}
const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
const sentence = (s: string) => {
    const t = clean(s);
    return t && !/[.!?]$/.test(t) ? `${t}.` : t;
};
const firstSentence = (s: string) => clean(s).split(/(?<=[.!?])\s+/)[0] ?? "";
const words = (s: string) => clean(s).split(" ").filter(Boolean);
export function lead(s: string, max = 14): string {
    const t = clean(s).replace(/[.!]$/, "");
    const cut = t.split(/:\s|;\s/)[0];
    if (words(cut).length <= max)
        return cut;
    const comma = cut.split(/,\s/)[0];
    if (words(comma).length <= max && words(comma).length >= 4)
        return comma;
    if (words(cut).length <= max + 5)
        return cut;
    return words(cut).slice(0, max).join(" ");
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
export function youify(s: string): string {
    return s
        .replace(/\b(she|he|they) (was|is|has|doesn't|does|wants|needs)\b/gi, (_, _p, v: string) => `you ${({ was: "were", is: "are", has: "have", "doesn't": "don't", does: "do", wants: "want", needs: "need" } as Record<string, string>)[v.toLowerCase()]}`)
        .replace(/\b(she|he|they)\b/gi, "you")
        .replace(/\b(her|his|their)\b/gi, "your")
        .replace(/\bhim\b/gi, "you")
        .replace(/\byou (chews|swallows|takes|eats|buys|reads|trains|counts)\b/gi, (_, v: string) => `you ${v.slice(0, -1)}`);
}
const nameOf = (p: PersonaProfile) => p.name.replace(/^the\s+/i, "");
const plain = (s: string) => s.split(" ").map((w) => (/^[A-Z0-9-]{2,}$/.test(w) ? w : w.toLowerCase())).join(" ");
export function shopperNotes(notes: string | undefined): string[] {
    return (notes ?? "")
        .split(/(?<=[.!?])\s+/)
        .map((x) => x.replace(/^['"‘“]+|['"’”]+(?=[.!?]?$)/g, "").trim())
        .filter((x) => x && /free shipping|cancel|pause|guarantee|ships?\b|deliver|eligible|includes?/i.test(x) && !/never|framed|differs|quote|surface|writer|internal/i.test(x));
}
export function ratingFrom(brand: BrandBrain): {
    value: number;
    count: string;
    claim: string;
} | null {
    for (const c of brand.claims) {
        if (c.status === "rejected")
            continue;
        const m = c.text.match(/(\d(?:\.\d)?)\s*(?:stars?|★)(?:[^.]*?\bfrom\s+|[^.]*?\()?([\d.,]+\s*[KkMm]?\+?)\s*(?:reviews|ratings)/);
        if (m && Number(m[1]) <= 5)
            return { value: Number(m[1]), count: m[2].replace(/\s+/g, ""), claim: c.text };
    }
    return null;
}
const usable = (brand: BrandBrain) => brand.claims.filter((c) => c.status === "substantiated" || c.origin === "website" || c.origin === "ad");
export function benefitChips(brand: BrandBrain, max = 6): string[] {
    const out: string[] = [];
    for (const c of usable(brand)) {
        if (/stars?|reviews|study|placebo|\bvs\b|guarantee/i.test(c.text))
            continue;
        for (const part of clean(c.text).replace(/\.$/, "").split(/,\s+(?:and\s+)?|\s+and\s+(?=\d)/)) {
            const t = part.trim();
            if (t.length >= 6 && t.length <= 44 && !out.includes(t))
                out.push(cap(t));
            if (out.length >= max)
                return out;
        }
    }
    return out;
}
const money = (n: number, brand: BrandBrain) => formatMoney(n, brand.brand.currency, { local: true });
export function buyOptions(brand: BrandBrain, productId: string, first: string | null): BuyOption[] {
    const offers = offersFor(brand, productId).filter((o) => o.price > 0);
    const oneTime = offers.find((o) => /one[- ]time/i.test(o.name));
    const opts = offers.slice(0, 4).map((o) => {
        const compare = /subscri/i.test(o.name) && oneTime && oneTime.price > o.price ? oneTime.price : null;
        return { label: clean(o.name), offer_id: o.id, price: o.price, compare_at: compare, per_day: o.per_day ?? null, note: shopperNotes(o.notes)[0] ?? "", badge: "" };
    });
    const perDay = opts.filter((o) => o.per_day);
    if (perDay.length > 1) {
        const best = perDay.reduce((a, b) => (b.per_day! < a.per_day! ? b : a));
        best.badge = "Lowest a day";
    }
    const at = opts.findIndex((o) => o.offer_id === first);
    if (at > 0)
        opts.unshift(...opts.splice(at, 1));
    return opts.slice(0, 3);
}
function slot(photos: Photo[], want: Bucket[], used: Set<string>, alt: string, bucket: Bucket = want[0]): ImageSlot {
    const p = photos.find((x) => want.includes(x.bucket) && !used.has(x.src)) ?? null;
    if (p) {
        used.add(p.src);
        return { src: p.src, alt, bucket: p.bucket };
    }
    return { src: "", alt, bucket };
}
export function personaForAudience(personas: PersonaProfile[], audience: {
    age: string;
    gender: string;
} | null): PersonaProfile | undefined {
    if (!audience)
        return undefined;
    const band = ageRange(audience.age.replace("-", " to ").replace("+", " and over"));
    if (!band)
        return undefined;
    const g = audience.gender.toLowerCase();
    const scored = personas.map((p) => {
        const r = ageRange(p.who.age);
        const pg = p.who.gender.toLowerCase();
        const gender = !pg || /all|any|both/.test(pg) ? 0.5 : (g === "women" ? /women|female/.test(pg) : /\bmen\b|male/.test(pg) && !/women|female/.test(pg)) ? 1 : /mostly/.test(pg) ? 0.4 : 0;
        const age = r ? Math.max(0, Math.min(band[1], r[1]) - Math.max(band[0], r[0]) + 1) / (band[1] - band[0] + 1) : 0;
        return { p, n: gender * 2 + age * 3 + (p.status === "active" ? 0.2 : 0) };
    });
    const best = scored.sort((a, b) => b.n - a.n)[0];
    return best && best.n >= 3 ? best.p : undefined;
}
export function pickQuotes(quotes: DocQuote[], personaId: string | null, promise: string, n: number): Quote[] {
    const want = new Set(words(promise.toLowerCase()).filter((w) => w.length > 3));
    const score = (q: DocQuote) => (q.persona_id && q.persona_id === personaId ? 5 : 0) + words(q.text.toLowerCase()).filter((w) => want.has(w)).length + (q.source === "research" ? 0.5 : 0);
    return [...quotes]
        .sort((a, b) => score(b) - score(a))
        .slice(0, n)
        .map(({ text, who, source, ref }) => ({ text, who, source, ...(ref ? { ref } : {}) }));
}
export function faqItems(ctx: LandingContext, brand: BrandBrain, persona: PersonaProfile | undefined, productId: string, offerId: string | null): {
    q: string;
    a: string;
}[] {
    const out: {
        q: string;
        a: string;
    }[] = [];
    const mine = (o: Objection) => !persona || !o.persona_id || o.persona_id === persona.id;
    for (const o of ctx.objections.filter(mine)) {
        const q = o.q.trim().replace(/\.$/, "");
        out.push({ q: /\?$/.test(q) ? cap(q) : `"${cap(q)}"`, a: sentence(o.a.replace(/\s*Note:.*$/i, "")) });
        if (out.length >= 4)
            break;
    }
    const offer = brand.offers.find((o) => o.id === offerId) ?? offersFor(brand, productId)[0];
    if (brand.guarantee && !out.some((f) => /work|guarantee|money/i.test(f.q)))
        out.push({ q: "What if it doesn't work for me?", a: sentence(brand.guarantee.text) });
    if (offer?.per_day && !out.some((f) => /price|expensive|worth|cost/i.test(f.q)))
        out.push({ q: "Is it worth the price?", a: `It works out at ${money(offer.per_day, brand)} a day on ${lower(clean(offer.name))}.` });
    if (offer?.notes && /cancel|pause/i.test(offer.notes) && !out.some((f) => /cancel|subscri/i.test(f.q)))
        out.push({ q: "Can I pause or cancel?", a: sentence(shopperNotes(offer.notes).find((x) => /cancel|pause/i.test(x)) ?? "") });
    const product = brand.products.find((p) => p.id === productId);
    if (product && out.length < 6)
        out.push({ q: `What do I get?`, a: sentence(product.format) });
    return out.slice(0, 7);
}
const DOUBT_TYPES = new Set(["objection", "final_objection", "failure_mode"]);
export function doubtsOf(ctx: LandingContext, personaId: string | null): {
    label: string;
    summary: string;
    frequency: number;
}[] {
    return ctx.themes
        .filter((t) => DOUBT_TYPES.has(t.type))
        .sort((a, b) => (Number(!!personaId && b.personas.includes(personaId)) - Number(!!personaId && a.personas.includes(personaId))) * 0.5 + (b.frequency - a.frequency))
        .map((t) => ({ label: t.label, summary: t.summary, frequency: t.frequency }));
}
export function formulaFor(persona: PersonaProfile | undefined): Formula {
    if (persona?.tried?.length)
        return "alternative";
    if (persona && !empty(persona.problem))
        return "revelation";
    return "switch";
}
const empty = (s: string | undefined) => !s || !s.trim();
export function formulaHeadline(formula: Formula, parts: {
    who: string;
    product: string;
    problem: string;
    oldWay: string;
    occasion?: string;
}): string {
    const who = parts.who || "people";
    const problem = lead(parts.problem, 5).toLowerCase().replace(/[.]$/, "").replace(/^(the|a|an)\s+/, "").replace(/\s+(and|but|or|so|because)$/, "") || "the problem";
    const old = parts.oldWay || "the usual fix";
    switch (formula) {
        case "switch":
            return `Why ${parts.product} may suit ${who}`;
        case "gift":
            return `${parts.product} as a ${parts.occasion ?? "gift"} for ${who}`;
        case "revelation":
            return `How ${parts.product} addresses ${problem}`;
        case "alternative":
            return `Considering ${parts.product} instead of ${old}`;
    }
}
let seq = 0;
const sid = (type: string) => `${type}_${(++seq).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export function draftPage(ctx: LandingContext, input: DraftInput): Draft {
    let brand = ctx.brand;
    const ad = input.ad ?? null;
    const audience = ad?.insights ? { label: ad.insights.best.label, age: ad.insights.best.age, gender: ad.insights.best.gender } : null;
    const persona = ctx.personas.find((p) => p.id === (input.personaId ?? ad?.persona_id)) ?? personaForAudience(ctx.personas, audience);
    const product = brand.products.find((p) => p.id === (input.productId ?? ad?.product_id ?? persona?.product_ids[0])) ?? brand.products[0];
    if (!product)
        throw new Error("The brand brain has no products yet.");
    ctx = factualLandingContext(ctx, product.id, input.evidence, input.omitOffer);
    brand = ctx.brand;
    const options = buyOptions(brand, product.id, input.offerId ?? ad?.offer_id ?? persona?.offer_id ?? null);
    const offerId = options.find(o => o.offer_id === input.offerId)?.offer_id ?? options[0]?.offer_id ?? null;
    const offer = brand.offers.find((o) => o.id === offerId);
    if (input.taskBrief?.structure === "quiz")
        throw new Error("Choose CRO Studio for a quiz; the classic page builder supports product, explanation, comparison and listicle structures.");
    const kind: PageKind = input.taskBrief ? ({ pdp: "pdp", explanation: "advertorial", comparison: "listicle", listicle: "listicle", quiz: "listicle" } as const)[input.taskBrief.structure] : input.kind ?? kindForAwareness(ad?.awareness ?? persona?.awareness);
    const rating = ratingFrom(brand);
    const photos = ctx.photos[product.id] ?? [];
    const used = new Set<string>();
    const angle = clean(input.angle ?? "") || persona?.angle || "";
    const promiseSource = ad?.headline || angle || brand.brand.one_liner;
    const formula: Formula | null = kind === "advertorial" ? (input.formula ?? formulaFor(persona)) : null;
    const whoPlural = persona ? `${plain(nameOf(persona))}s` : "";
    const headlineParts = { who: whoPlural, product: product.name, problem: persona?.problem ?? "", oldWay: persona?.tried?.[0] ?? "" };
    const headlines = kind === "advertorial" ? FORMULAS.map((f) => ({ formula: f, text: cap(formulaHeadline(f, headlineParts)) })) : [];
    const headline = kind === "advertorial" && !ad && formula ? headlines.find((h) => h.formula === formula)!.text : cap(youify(lead(promiseSource, 16)));
    const restOfAngle = angle && !ad ? clean(angle).slice(lead(angle, 16).length).replace(/^[\s:,;.]+/, "") : "";
    const mechanism = firstSentence(brand.brand.one_liner);
    const subhead = sentence(ad ? (angle ? youify(lead(angle, 24)) : mechanism) : restOfAngle ? cap(youify(restOfAngle)) : mechanism);
    const chips = benefitChips(brand);
    const quotes = pickQuotes(ctx.quotes, persona?.id ?? null, `${promiseSource} ${angle}`, 6);
    const ctaLabel = brand.guarantee ? "Try it risk-free" : `Get ${product.name}`;
    const risk = brand.guarantee ? sentence(brand.guarantee.text) : "";
    const proofLine = rating ? `${rating.value} stars from ${rating.count} reviews` : quotes[0] ? `“${lead(quotes[0].text, 12)}” ${quotes[0].who}` : "";
    const priceLine = offer ? `${money(offer.price, brand)}${offer.per_day ? `, ${money(offer.per_day, brand)} a day` : ""}` : "";
    const whyNow = sentence(shopperNotes(offer?.notes).join(" "));
    const announcement = [offer?.notes && /free shipping/i.test(offer.notes) ? "Free shipping on subscriptions" : "", brand.guarantee ? clean(brand.guarantee.text).replace(/\.$/, "") : ""].filter(Boolean).join(". ");
    const who = persona ? nameOf(persona) : "";
    const gallery: ImageSlot[] = [
        slot(photos, ["product-shot", "what-it-does"], used, `${product.name}`, "product-shot"),
        slot(photos, ["benefits-list", "feature-callouts"], used, `${product.name}: benefits at a glance`, "benefits-list"),
        slot(photos, ["reviews-ugc", "top-testimonial"], used, `Customers using ${product.name}`, "reviews-ugc"),
        slot(photos, ["how-it-works", "benefit-deep-dive"], used, `How ${product.name} works`, "how-it-works"),
        slot(photos, ["occasions", "before-after"], used, `${product.name} in daily life`, "occasions"),
    ].filter((s, i) => i === 0 || s.src);
    const S: Section[] = [];
    if (announcement)
        S.push({ id: sid("announcement"), type: "announcement", on: true, text: announcement });
    S.push({
        id: sid("hero"),
        type: "hero",
        on: true,
        eyebrow: kind === "advertorial" ? (who ? `For the ${plain(who)}` : "") : kind === "listicle" ? "" : product.name,
        headline,
        subhead,
        bullets: kind === "pdp" ? chips.slice(0, 3) : [],
        proof_line: proofLine,
        price_line: kind === "pdp" ? priceLine : "",
        why_now: kind === "pdp" ? whyNow : "",
        cta: kind === "advertorial" ? "" : ctaLabel,
        risk_line: kind === "advertorial" ? "" : risk,
        options: kind === "pdp" ? options : [],
        images: kind === "pdp" ? gallery : [gallery[0]],
    });
    if (input.taskBrief?.task === "compatibility" && product.specs?.length)
        S.push({ id: sid("fit"), type: "differentiators", on: true, headline: input.taskBrief.buyerQuestion, items: product.specs.map(spec => ({ title: spec.name, body: spec.value })) });
    if (input.taskBrief?.structure === "comparison") {
        const alternative = brand.products.find(candidate => candidate.id !== product.id);
        if (alternative) {
            const matched = (product.specs || []).flatMap(spec => { const other = alternative.specs?.find(s => s.name.trim().toLowerCase() === spec.name.trim().toLowerCase()); return other ? [{ label: spec.name, us: spec.value, them: other.value }] : []; });
            S.push({ id: sid("comparison"), type: "comparison", on: true, headline: input.taskBrief.buyerQuestion, us: product.name, them: alternative.name, rows: [{ label: "Format and contents", us: product.format, them: alternative.format }, ...matched] });
        }
    }
    if (kind !== "advertorial" && chips.length)
        S.push({ id: sid("benefits"), type: "benefits", on: true, title: "Benefits", items: chips });
    const sounds = (persona?.language ?? []).slice(0, 3).map((l) => `“${clean(l)}”`);
    const problem: Section | null = persona && (sounds.length || persona.objections.length)
        ? {
            id: sid("problem"),
            type: "problem",
            on: kind !== "pdp",
            headline: sentence(`${cap(lower(clean(persona.problem)).replace(/\.$/, ""))}`).replace(/\.$/, ""),
            greeting: "Sound familiar?",
            questions: sounds,
            empathy: sentence(youify(persona.summary)),
            agitate: persona.objections.map((o) => `“${clean(o)}”`).slice(0, 3),
            solve: sentence(`There is an easier way: ${lower(mechanism).replace(/\.$/, "")}`),
        }
        : null;
    if (kind === "advertorial") {
        S.push({
            id: sid("story"),
            type: "story",
            on: true,
            headline: persona ? `If this is you, read this first` : `Why this one is different`,
            paragraphs: [persona ? sentence(youify(persona.summary)) : "", persona ? `The real problem: ${lower(sentence(clean(persona.problem)))}` : "", angle ? sentence(cap(youify(angle))) : ""].filter(Boolean),
            image: slot(photos, ["before-after", "occasions", "what-it-does"], used, `${product.name} in daily life`, "before-after"),
        });
        if (problem)
            S.push({ ...problem, on: true });
    }
    else if (problem)
        S.push(problem);
    if (kind === "advertorial") {
        const doubts = doubtsOf(ctx, persona?.id ?? null);
        const fromPersona = (persona?.objections ?? []).map((o) => ({ label: clean(o), summary: "", frequency: 0 }));
        const fromClaims = usable(brand).filter((c) => !/stars?|reviews|\bvs\b|guarantee/i.test(c.text)).map((c) => ({ label: lead(c.text, 10), summary: c.text, frequency: 0 }));
        const supportedReasons = (doubts.length ? doubts : fromPersona.length ? fromPersona : fromClaims).filter((d, i, all) => all.findIndex((x) => x.label.toLowerCase() === d.label.toLowerCase()) === i).slice(0, 8);
        const claimsLeft = [...usable(brand).filter((c) => !/stars?|reviews|\bvs\b|guarantee/i.test(c.text))];
        const buckets: Bucket[] = ["benefit-deep-dive", "how-it-works", "occasions", "what-makes-us-different", "benefits-list"];
        S.push({
            id: sid("reasons"),
            type: "reasons",
            on: true,
            headline: "",
            items: supportedReasons.map((d, k) => {
                const answer = sentence(claimsLeft.find((c) => c.text.toLowerCase().includes(lead(d.label, 2).toLowerCase()))?.text ?? claimsLeft[k]?.text ?? d.summary ?? d.label);
                return {
                    title: sentence(cap(lead(d.label, 10))).replace(/\.$/, ""),
                    body: [answer, sentence(mechanism), persona ? sentence(youify(persona.summary)) : sentence(product.format)].filter((x, i, a) => x && a.indexOf(x) === i).join("\n\n"),
                    quote: k === 1 || k === 3 ? (quotes[k === 1 ? 0 : 1] ?? null) : null,
                    image: slot(photos, buckets.slice(k % 5), used, BUCKET_LABEL[buckets[k % 5]]),
                };
            }),
        });
    }
    else if (kind === "listicle") {
        const reasons = [angle ? cap(youify(lead(angle, 12))) : "", ...usable(brand).filter((c) => !/stars?|reviews/i.test(c.text)).map((c) => lead(c.text, 10))].filter(Boolean).slice(0, 5);
        S.push({
            id: sid("reasons"),
            type: "reasons",
            on: true,
            headline: `${reasons.length} reasons ${who ? `${plain(who)}s` : "people"} choose ${brand.brand.name}`,
            items: reasons.map((title, k) => ({
                title: sentence(title).replace(/\.$/, ""),
                body: sentence(usable(brand).find((c) => lead(c.text, 10) === title)?.text ?? (k === 0 ? mechanism : title)),
                quote: quotes[k] ?? null,
                image: slot(photos, (["benefit-deep-dive", "how-it-works", "occasions", "what-makes-us-different", "benefits-list"] as Bucket[]).slice(k % 5), used, BUCKET_LABEL[(["benefit-deep-dive", "how-it-works", "occasions", "what-makes-us-different", "benefits-list"] as Bucket[])[k % 5]]),
            })),
        });
    }
    else {
        const vps = usable(brand)
            .filter((c) => !/stars?|reviews|\bvs\b|guarantee/i.test(c.text))
            .slice(0, kind === "pdp" ? 3 : 2);
        vps.forEach((c, k) => S.push({
            id: sid("value_prop"),
            type: "value_prop",
            on: true,
            eyebrow: "",
            headline: sentence(cap(lead(c.text, 12))).replace(/\.$/, ""),
            body: sentence(c.text),
            points: [],
            image: slot(photos, (["benefit-deep-dive", "benefits-list", "occasions", "feature-callouts"] as Bucket[]).slice(k), used, BUCKET_LABEL[(["benefit-deep-dive", "benefits-list", "occasions"] as Bucket[])[k % 3]]),
            cta: k === vps.length - 1 ? ctaLabel : "",
        }));
    }
    const vs = usable(brand).find((c) => /\bvs\.?\b|versus|compared to/i.test(c.text));
    if (vs && kind !== "advertorial") {
        const [usPart, themPart] = clean(vs.text).replace(/\.$/, "").split(/,?\s*\bvs\.?\b\s*|,?\s*versus\s*/i);
        if (usPart && themPart)
            S.push({ id: sid("comparison"), type: "comparison", on: true, headline: `${brand.brand.name} against the alternative`, us: brand.brand.name, them: cap(lead(themPart, 3).split(/\s+at\s+/)[0]), rows: [{ label: "Price", us: usPart, them: themPart }] });
    }
    if (quotes.length)
        S.push({ id: sid("reviews"), type: "reviews", on: true, headline: persona ? `What people like you say` : "What customers say", rating_line: rating ? `${rating.value} stars from ${rating.count} reviews` : "", quotes: quotes.slice(0, 6) });
    const planOptions = kind === "advertorial" && options.length >= 2 ? options.slice(0, 2).map((o, k) => ({ ...o, preferred: k === 0, includes: [{ item: sentence(product.format), value: null }, ...shopperNotes(brand.offers.find((x) => x.id === o.offer_id)?.notes).map((n) => ({ item: sentence(n), value: null }))].slice(0, 4) })) : options;
    S.push({
        id: sid("offer"),
        type: "offer",
        on: kind !== "pdp",
        headline: offer ? clean(offer.name) : `Get ${product.name}`,
        body: sentence(product.format),
        options: planOptions,
        includes: [sentence(product.format), ...shopperNotes(offer?.notes).map(sentence)].slice(0, 4),
        cta: ctaLabel,
        risk_line: risk,
        image: slot(photos, ["whats-included", "product-shot"], used, `${product.name}: what's included`, "whats-included"),
    });
    if (brand.guarantee)
        S.push({ id: sid("guarantee"), type: "guarantee", on: true, headline: `${brand.guarantee.window_days}-day money-back guarantee`, body: sentence(brand.guarantee.text), cta: kind === "advertorial" ? "" : ctaLabel });
    const faq = faqItems(ctx, brand, persona, product.id, offerId);
    if (faq.length)
        S.push({ id: sid("faq"), type: "faq", on: true, headline: "Questions, answered", items: faq });
    S.push({ id: sid("final_cta"), type: "final_cta", on: true, headline: headline, body: subhead, cta: ctaLabel, risk_line: risk, image: slot(photos, ["occasions", "product-shot"], used, `${product.name}`, "occasions") });
    S.push({ id: sid("sticky_cta"), type: "sticky_cta", on: true, text: `${product.name}${priceLine ? `, ${priceLine}` : ""}`, cta: kind === "advertorial" ? "See the offer" : ctaLabel });
    const titleBase = ad ? `For the ad "${lead(ad.headline, 8)}"` : persona ? `For the ${nameOf(persona)}` : product.name;
    return {
        title: `${titleBase}${audience ? `, ${audience.label}` : ""}`,
        kind,
        product_id: product.id,
        persona_id: persona?.id ?? null,
        offer_id: offerId,
        brief: {
            promise: headline,
            angle: angle || (ad?.angle ?? ""),
            awareness: ad?.awareness ?? persona?.awareness ?? "product_aware",
            audience,
            rating: rating ? { value: rating.value, count: rating.count } : null,
            cta_url: input.ctaUrl?.trim() || "#buy",
            notes: input.notes?.trim() ?? "",
            ...(input.omitOffer ? { omitOffer: true } : {}),
            ...(input.taskBrief ? { taskBrief: input.taskBrief } : {}),
            ...(kind === "advertorial" ? { formula, headlines } : {}),
        },
        sections: S,
    };
}
