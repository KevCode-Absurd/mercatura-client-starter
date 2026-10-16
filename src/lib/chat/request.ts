import { tasteAsked } from "../taste/ask";
import { compactTaste } from "../taste/schema";
import type { AskIntent, AskKind, AskQuestion, AskTags } from "@/db/schema";
import { lookNamed } from "../studio/worlds";
import type { AwarenessStage } from "../taxonomy";
import { ASK_KINDS, aspectsFor, isImageKind, type AskContext } from "./request-types";
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, few: 3 };
const NOUN = "(?:variants?|variations?|versions?|ads?|images?|statics?|scripts?|creatives?|options?|photos?|shots?|frames?|hooks?|concepts?)";
export const withoutTags = (text: string, labels: string[]) => labels.reduce((t, l) => t.split(`@${l}`).join(l), text).replace(/\s+/g, " ").trim();
export function kindOf(text: string): AskKind {
    const t = text.toLowerCase();
    if (/photo ?shoots?|product photos?|lifestyle (photos?|shots?)/.test(t))
        return "photoshoot";
    if (/product page|\bpdp\b|listing images?|gallery images?|amazon images?/.test(t))
        return "product_page";
    if (/image ads?|static ads?|\bstatics?\b|\bbanners?\b|\bimages?\b/.test(t))
        return "image_ads";
    if (/\bscripts?\b|\bugc\b|\bvideos?\b|\bhooks?\b|\bvsl\b|voice ?overs?|\btiktoks?\b|\breels?\b/.test(t))
        return "scripts";
    if (/\bads?\b|\bcreatives?\b|\bcarousels?\b/.test(t))
        return "image_ads";
    return "unknown";
}
export function countOf(text: string): number | null {
    const t = text.toLowerCase();
    const d = new RegExp(`(\\d{1,3})(?!\\s*(?:-|to)?\\s*(?:s|sec|secs|seconds?|min|mins|minutes?|years?|yrs?|yo)\\b)\\s*(?:x\\s*)?(?:[a-z-]+\\s+){0,3}?${NOUN}\\b`).exec(t);
    if (d)
        return Number(d[1]);
    const w = new RegExp(`\\b(${Object.keys(WORDS).join("|")})\\s+(?:[a-z-]+\\s+){0,3}?${NOUN}\\b`).exec(t);
    if (w)
        return WORDS[w[1]];
    if (new RegExp(`\\b(?:an?|one)\\s+(?:\\w+\\s+)?${NOUN.replace(/s\?/g, "")}\\b`).test(t) && !/\b(some|several|many)\b/.test(t))
        return 1;
    return null;
}
export function lengthOf(text: string): AskIntent["length"] {
    const t = text.toLowerCase();
    const m = /(\d{1,2})\s*(?:-|to)?\s*(?:\d{1,2}\s*)?(?:min|mins|minute|minutes)\b/.exec(t);
    if (m)
        return Number(m[1]) <= 3 ? "2-3m" : Number(m[1]) >= 10 ? "10m" : "5-10m";
    const s = /(\d{1,3})\s*-?\s*(?:s|sec|secs|second|seconds)\b/.exec(t);
    if (s)
        return Number(s[1]) <= 20 ? "15s" : Number(s[1]) <= 45 ? "30s" : "60s";
    return null;
}
export function aspectsOf(text: string, allowed: string[]): string[] {
    const t = text.toLowerCase();
    const found = [/\bsquare\b|1:1|1x1/.test(t) ? "1:1" : "", /\bstor(y|ies)\b|\breels?\b|\bvertical\b|9:16|9x16/.test(t) ? "9:16" : "", /4:5|4x5|\bportrait\b|\bfeed\b/.test(t) ? "4:5" : "", /3:2|\blandscape\b|\bbanner\b/.test(t) ? "3:2" : ""].filter(Boolean);
    return found.filter((a) => allowed.includes(a));
}
export function audienceOf(text: string): string {
    const age = /(\d{2})\s*(?:-|to|–)\s*(\d{2})(?:\s*(?:year|yr)s?(?:\s*olds?)?)?/i.exec(text);
    const who = /\b(?:mostly |mainly )?(mothers|moms|mums|mom|mum|fathers|dads|parents|women|men|students|seniors|runners|gym[- ]goers|travellers|travelers|shift workers)\b/i.exec(text);
    return [age ? `${age[1]} to ${age[2]}` : "", who ? who[0].toLowerCase() : ""].filter(Boolean).join(", ");
}
const words = (s: string) => new Set(s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []);
function productNamed(text: string, c: AskContext): string | null {
    const t = words(text);
    const seen = new Map<string, number>();
    for (const p of c.products)
        for (const w of words(p.name))
            seen.set(w, (seen.get(w) ?? 0) + 1);
    let best: string | null = null;
    let score = 0;
    for (const p of c.products) {
        const n = [...words(p.name)].filter((w) => seen.get(w) === 1 && t.has(w)).length;
        if (n > score)
            [best, score] = [p.id, n];
    }
    return best;
}
function personaFor(audience: string, text: string, c: AskContext): string | null {
    const named = c.personas.find((p) => text.toLowerCase().includes(p.name.replace(/^the\s+/i, "").toLowerCase()));
    if (named)
        return named.id;
    if (!audience)
        return null;
    const age = /(\d{2}) to (\d{2})/.exec(audience);
    const parent = /mother|mom|mum|father|dad|parent/.test(audience);
    const woman = /mother|mom|mum|women/.test(audience);
    const man = /father|dad|\bmen\b/.test(audience);
    let best: string | null = null;
    let score = 1;
    for (const p of c.personas) {
        const about = `${p.name} ${p.summary}`.toLowerCase();
        const range = /(\d{2})\D+(\d{2})/.exec(p.age);
        let s = 0;
        if (age && range && Number(age[1]) <= Number(range[2]) && Number(age[2]) >= Number(range[1]))
            s += 1;
        if (parent && /parent|mother|mom|mum|father|dad|kids|children/.test(about))
            s += 2;
        if ((woman && /women|female/i.test(p.gender)) || (man && /\bmen\b|\bmale/i.test(p.gender)))
            s += 1;
        if (s > score)
            [best, score] = [p.id, s];
    }
    return best;
}
export function readByRule(text: string, tags: AskTags, c: AskContext): AskIntent {
    const labels = [...c.personas.filter((p) => tags.personas.includes(p.id)).map((p) => p.name), ...c.products.filter((p) => tags.products.includes(p.id)).map((p) => p.name), ...c.offers.filter((o) => tags.offers.includes(o.id)).map((o) => o.name), ...c.references.map((r) => r.title)];
    const plain = withoutTags(text, labels);
    const kind = kindOf(plain);
    const audience = audienceOf(plain);
    const persona = tags.personas.length ? null : personaFor(audience, plain, c);
    return {
        kind,
        count: countOf(plain) ?? (kind === "unknown" ? 1 : ASK_KINDS[kind].usual),
        product_id: tags.products[0] ?? productNamed(plain, c),
        persona_ids: tags.personas.length ? tags.personas : persona ? [persona] : [],
        offer_id: tags.offers[0] ?? null,
        concept_id: null,
        reference_id: tags.references[0] ?? null,
        reference_mode: tags.references.length ? "structure" : null,
        length: lengthOf(plain),
        aspects: aspectsOf(plain, aspectsFor(kind)?.aspects ?? []),
        audience,
        brief: plain.slice(0, 1200),
        title: "",
        look: lookNamed(plain),
        taste: tasteAsked(plain, tags.references.length > 0),
    };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function claimsAsked(text: string): boolean | null {
    const t = text.toLowerCase();
    if (/\b(no|without|skip|don'?t|do not|never)\b[^.?!]{0,24}\bclaims?\b|\bclaims?\b[^.?!]{0,16}\boff\b/.test(t))
        return false;
    if (/\b(with|check(?:ed|ing)?|verif(?:y|ied)|hold|held|keep)\b[^.?!]{0,24}\bclaims?\b|\bclaims?\b[^.?!]{0,16}\b(on|checked)\b/.test(t))
        return true;
    return null;
}
export function stageAsked(text: string): AwarenessStage | null {
    const t = text.toLowerCase();
    if (/\bmost[- ]aware\b|\bready to buy\b|\b(existing|past|returning|repeat) (customers?|buyers?)\b|\bretarget/.test(t))
        return "most_aware";
    if (/\bproduct[- ]aware\b|\bknow (us|the brand|our product)\b|\bhaven'?t bought\b|\bcomparing\b|\bwarm (audience|buyers?|traffic)\b/.test(t))
        return "product_aware";
    if (/\bsolution[- ]aware\b|\bknow (there are|that) (fixes|solutions|options)\b|\btried other\b/.test(t))
        return "solution_aware";
    if (/\bproblem[- ]aware\b|\bfeel the problem\b|\bknow the problem\b/.test(t))
        return "problem_aware";
    if (/\bunaware\b|\bcold (audience|buyers?|traffic)\b|\bnever heard of (us|the brand)\b|\bdon'?t know they have\b/.test(t))
        return "unaware";
    return null;
}
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
export function hooksAsked(text: string): number | null {
    const m = text.toLowerCase().match(/\b(\d{1,2}|one|two|three|four|five)\s+(?:(?:different|alternative|more|extra|new)\s+)?(?:hooks?|openings?|opening lines?)\b/);
    if (!m)
        return null;
    const n = NUMBER_WORDS[m[1]] ?? Number(m[1]);
    return Number.isFinite(n) && n >= 1 ? Math.min(5, n) : null;
}
export function settle(read: AskIntent, tags: AskTags, c: AskContext): {
    intent: AskIntent;
    question: AskQuestion | null;
    note: string;
} {
    const kind = read.kind;
    const has = <T extends {
        id: string;
    }>(rows: T[], id: string | null) => (id && rows.some((r) => r.id === id) ? id : null);
    const info = kind === "unknown" ? null : ASK_KINDS[kind];
    const sizes = aspectsFor(kind);
    const wanted = Math.max(1, Math.round(read.count || 1));
    const count = info ? Math.min(info.max, wanted) : 1;
    let product = has(c.products, tags.products[0] ?? read.product_id);
    if (!product && c.products.length === 1)
        product = c.products[0].id;
    const personas = (tags.personas.length ? tags.personas : read.persona_ids).filter((id) => c.personas.some((p) => p.id === id)).slice(0, 6);
    const reference = has(c.references, tags.references[0] ?? read.reference_id);
    const asked = compactTaste(read.taste);
    const settledTaste = compactTaste({ ...asked, look: asked.look === "reference" && !reference ? undefined : asked.look });
    const aspects = sizes ? (read.aspects.filter((a) => sizes.aspects.includes(a)).slice(0, 4).length ? read.aspects.filter((a) => sizes.aspects.includes(a)).slice(0, 4) : sizes.defaultAspects) : [];
    const intent: AskIntent = {
        kind,
        count,
        product_id: product,
        persona_ids: personas,
        offer_id: has(c.offers, tags.offers[0] ?? read.offer_id),
        concept_id: kind === "scripts" ? has(c.concepts, read.concept_id) : null,
        reference_id: reference,
        reference_mode: reference ? (read.reference_mode ?? "structure") : null,
        length: kind === "scripts" ? read.length : null,
        aspects,
        audience: read.audience.trim(),
        brief: read.brief.trim(),
        title: (read.title.trim() || (info ? `${cap(info.many)}${product ? `: ${c.products.find((p) => p.id === product)?.name}` : ""}` : "")).slice(0, 70),
        ...(typeof read.claim_checks === "boolean" ? { claim_checks: read.claim_checks } : {}),
        ...(tags.stage ? { stage: tags.stage } : read.stage ? { stage: read.stage } : {}),
        ...(tags.angle ? { angle_id: tags.angle } : read.angle_id ? { angle_id: read.angle_id } : {}),
        ...(kind === "scripts" && read.hooks && read.hooks > 1 ? { hooks: Math.min(5, Math.round(read.hooks)) } : {}),
        ...(kind === "image_ads" && read.look ? { look: read.look } : {}),
        ...(isImageKind(kind) && read.format_id ? { format_id: read.format_id } : {}),
        ...(kind === "image_ads" && read.layout_type ? { layout_type: read.layout_type } : {}),
        ...(Object.keys(settledTaste).length ? { taste: settledTaste } : {}),
        ...(read.skill ? { skill: read.skill } : {}),
    };
    const note = info && wanted > info.max ? `1 request makes ${info.max} ${info.many} at most, so this is ${info.max}.${kind === "image_ads" ? " For 50 at once, use the 50-ad sprint on the Create screen." : ""}` : "";
    if (kind === "unknown")
        return { intent, note, question: { field: "kind", text: "What should I make?", options: (Object.keys(ASK_KINDS) as (keyof typeof ASK_KINDS)[]).map((k) => ({ value: k, label: ASK_KINDS[k].label })) } };
    if (isImageKind(kind) && !product)
        return { intent, note, question: { field: "product", text: "Which product is it for?", options: c.products.map((p) => ({ value: p.id, label: p.name })) } };
    return { intent, question: null, note };
}
