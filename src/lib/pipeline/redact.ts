export type PiiType = "email" | "phone" | "address" | "order" | "name";
export const PII_TOKEN: Record<PiiType, string> = {
    email: "[EMAIL]",
    phone: "[PHONE]",
    address: "[ADDRESS]",
    order: "[ORDER]",
    name: "[NAME]",
};
export interface Replacement {
    type: PiiType;
    from: string;
    to: string;
}
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PHONE = /(?<![\w#])(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}(?!\d)/g;
const PHONE_INTL = /(?<![\w#.,/-])(?:\+\d{1,3}[\s.-]?)?(?:\(0?\d{1,5}\)[\s.-]?)?\d{2,5}(?:[\s.-]?\d{2,5}){1,5}(?![\w/]|[.,-]\d)/g;
const intlPhone = (m: string) => {
    const digits = m.replace(/\D/g, "");
    return (/^\+/.test(m.trim()) || /^\(?0/.test(m.trim())) && digits.length >= 9 && digits.length <= 15 && !/^\d{4}[\s.-]\d{2}[\s.-]\d{2}$/.test(m.trim());
};
const POSTCODE = /\b(?:[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|[ABCEGHJ-NPRSTVXY]\d[A-Z]\s?\d[A-Z]\d)\b/g;
const ORDER_TAGGED = /#\s?(?:[A-Z]{1,4}-)?\d{4,}\b|\b[A-Z]{2,4}-\d{5,}\b/g;
const ORDER_WORDED = /\b(order(?:\s+(?:number|no\.?|num|id))?(?:\s+(?:is|was))?\s*[:#]?\s*)(\d{5,})\b/gi;
const STREET = "(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir|Parkway|Pkwy|Highway|Hwy|Trail|Trl)";
const ADDRESS = new RegExp(String.raw `\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z0-9'.-]+\s+){0,4}${STREET}\b\.?` +
    String.raw `(?:,?\s*(?:Apt|Apartment|Unit|Suite|Ste|#)\.?\s*[\w-]+)?` +
    String.raw `(?:,\s*[A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]+){0,2})?(?:,?\s*[A-Z]{2})?(?:\s+\d{5}(?:-\d{4})?)?`, "g");
function applyPattern(text: string, re: RegExp, type: PiiType, out: Replacement[], group?: number): string {
    return text.replace(re, (...m: string[]) => {
        const whole = m[0];
        if (group === undefined) {
            out.push({ type, from: whole, to: PII_TOKEN[type] });
            return PII_TOKEN[type];
        }
        const value = m[group];
        out.push({ type, from: value, to: PII_TOKEN[type] });
        return whole.slice(0, whole.length - value.length) + PII_TOKEN[type];
    });
}
export function redactContactPii(text: string): {
    text: string;
    replacements: Replacement[];
} {
    const replacements: Replacement[] = [];
    let t = applyPattern(text, EMAIL, "email", replacements);
    t = applyPattern(t, ADDRESS, "address", replacements);
    t = applyPattern(t, ORDER_WORDED, "order", replacements, 2);
    t = applyPattern(t, ORDER_TAGGED, "order", replacements);
    t = applyPattern(t, PHONE, "phone", replacements);
    t = t.replace(PHONE_INTL, (m) => {
        if (!intlPhone(m))
            return m;
        replacements.push({ type: "phone", from: m, to: PII_TOKEN.phone });
        return PII_TOKEN.phone;
    });
    t = applyPattern(t, POSTCODE, "address", replacements);
    return { text: t, replacements };
}
export function findContactPii(text: string): {
    type: PiiType;
    value: string;
}[] {
    const found: {
        type: PiiType;
        value: string;
    }[] = [];
    for (const m of text.matchAll(EMAIL))
        found.push({ type: "email", value: m[0] });
    for (const m of text.matchAll(PHONE))
        found.push({ type: "phone", value: m[0] });
    for (const m of text.matchAll(PHONE_INTL))
        if (intlPhone(m[0]))
            found.push({ type: "phone", value: m[0] });
    return found;
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function replaceEntities(text: string, entities: {
    text: string;
    type: Extract<PiiType, "name" | "address">;
}[]): {
    text: string;
    replacements: Replacement[];
} {
    const replacements: Replacement[] = [];
    const sorted = [...entities].filter((e) => e.text.trim().length > 1).sort((a, b) => b.text.length - a.text.length);
    let t = text;
    for (const e of sorted) {
        const re = new RegExp(`(?<![\\w\\[])${escapeRe(e.text.trim())}(?![\\w\\]])`, "g");
        t = t.replace(re, (m) => {
            replacements.push({ type: e.type, from: m, to: PII_TOKEN[e.type] });
            return PII_TOKEN[e.type];
        });
    }
    return { text: t, replacements };
}
