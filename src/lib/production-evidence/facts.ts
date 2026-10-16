import { z } from "zod";
const text = z.string().trim().min(1).max(3000);
export const FactScopeSchema = z.object({ productId: text, market: text, variant: z.string().optional() });
export type FactScope = z.infer<typeof FactScopeSchema>;
export const MaterialConditionSchema = z.object({ id: text, kind: z.enum(["variant", "use", "safety", "population", "claim_limit", "unknown", "provenance"]), text, display: z.enum(["adjacent", "brief"]) }).superRefine((v, ctx) => {
    if (v.kind !== "provenance" && v.display !== "adjacent")
        ctx.addIssue({ code: "custom", message: "Material and unknown conditions must stay adjacent to the claim." });
    if (v.kind === "provenance" && v.display !== "brief")
        ctx.addIssue({ code: "custom", message: "Capture/workflow provenance belongs in the brief." });
});
export type MaterialCondition = z.infer<typeof MaterialConditionSchema>;
export const AuthorityTagSchema = z.object({ kind: z.enum(["approved_fact", "research_quote", "style_example", "planning_link", "brief", "history"]), sourceId: text, sourceRevision: z.number().int().positive(), attribution: text });
export type AuthorityTag = z.infer<typeof AuthorityTagSchema>;
export const AtomicFactSchema = z.object({
    id: text, subject: text, predicate: text, value: z.union([z.number().finite(), text]), unit: z.string().max(80),
    denominator: z.object({ value: z.number().positive(), unit: text }).nullable(),
    comparator: z.enum(["equal", "at_least", "at_most", "greater_than", "less_than"]), direction: z.enum(["none", "increase", "decrease", "unchanged"]),
    scope: FactScopeSchema, conditions: z.array(MaterialConditionSchema).max(40), authority: AuthorityTagSchema,
    locale: z.string().min(2).max(50), validUntil: z.iso.datetime().optional(),
});
export type AtomicFact = z.infer<typeof AtomicFactSchema>;
export const AssertionSchema = AtomicFactSchema.omit({ authority: true, validUntil: true }).extend({ sourceId: z.string().optional(), sourceRevision: z.number().int().positive().optional(), passage: z.string().max(12000).optional() });
export type AtomicAssertion = z.infer<typeof AssertionSchema>;
const norm = (v: string) => v.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const sameScope = (a: FactScope, b: FactScope) => a.productId === b.productId && a.market === b.market && (a.variant ?? "") === (b.variant ?? "");
const unitKey = (unit: string) => ({ grams: "g", gram: "g", packs: "pack", sachets: "sachet", pouches: "pouch", days: "day" }[norm(unit)] ?? norm(unit));
export function currencyValueIssue(value: string | number, unit: string): string | null {
    if (typeof value !== "string")
        return null;
    const symbols = value.match(/[£€$₹]/g) ?? [], code = value.match(/\b(?:USD|GBP|EUR|CAD|AUD|NZD|SGD|HKD|INR)\b/)?.[0];
    if (!symbols.length && !code)
        return null;
    if (!/^[A-Z]{3}$/.test(unit))
        return "A currency display requires an explicit approved currency code; a symbol cannot establish currency or market scope.";
    if (code && code !== unit)
        return "Displayed currency code differs from the declared source unit.";
    const allowed: Record<string, string[]> = { "£": ["GBP"], "€": ["EUR"], "₹": ["INR"], "$": ["USD", "CAD", "AUD", "NZD", "SGD", "HKD"] };
    if (symbols.some(symbol => !allowed[symbol].includes(unit)))
        return "Displayed currency symbol differs from the explicitly declared source currency. No conversion is allowed.";
    return null;
}
export function parseLocaleValue(display: string | number, locale: string, type: "number" | "date" = "number") {
    if (typeof display === "number")
        return { status: "resolved" as const, value: display, displayed: String(display), currency: null };
    if (type === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(display))
            return { status: "unresolved" as const, value: null, displayed: display, currency: null, reason: "Use an ISO date; numeric day/month ordering remains ambiguous." };
        const date = new Date(display + "T00:00:00Z");
        return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(display) ? { status: "resolved" as const, value: display, displayed: display, currency: null } : { status: "unresolved" as const, value: null, displayed: display, currency: null, reason: "Invalid date." };
    }
    let parts: Intl.NumberFormatPart[];
    try {
        parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
    }
    catch {
        return { status: "unresolved" as const, value: null, displayed: display, currency: null, reason: "Unknown locale." };
    }
    const decimal = parts.find(p => p.type === "decimal")?.value ?? ".", group = parts.find(p => p.type === "group")?.value ?? ",";
    const currency = display.match(/\b(?:USD|GBP|EUR|CAD|AUD|NZD|SGD|HKD|INR)\b/)?.[0] ?? (/[£€$₹]/.test(display) ? "symbol_only" : null);
    let digits = display.replace(/\b(?:USD|GBP|EUR|CAD|AUD|NZD|SGD|HKD|INR)\b/g, "").replace(/[£€$₹]/g, "").trim();
    const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const displayedInteger = digits.split(decimal)[0].replace(/^[+-]/, ""), grouped = displayedInteger.includes(group);
    digits = digits.replace(new RegExp(escaped(group), "g"), "").replace(decimal, ".");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(digits))
        return { status: "unresolved" as const, value: null, displayed: display, currency, reason: "Not an unambiguous numeric value in the selected locale." };
    if (grouped) {
        const expected = new Intl.NumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 }).formatToParts(Math.trunc(Math.abs(Number(digits)))).filter(p => p.type === "integer" || p.type === "group").map(p => p.value).join("");
        if (expected !== displayedInteger)
            return { status: "unresolved" as const, value: null, displayed: display, currency, reason: "Malformed thousands grouping for this locale." };
    }
    return { status: "resolved" as const, value: Number(digits), displayed: display, currency };
}
function valueKey(fact: Pick<AtomicFact, "value" | "locale">) {
    if (typeof fact.value === "number")
        return `n:${fact.value}`;
    const parsed = parseLocaleValue(fact.value, fact.locale);
    return parsed.status === "resolved" ? `n:${parsed.value}` : `s:${norm(fact.value)}`;
}
export const atomicKey = (f: AtomicFact | AtomicAssertion) => JSON.stringify([norm(f.subject), norm(f.predicate), f.scope.productId, f.scope.market, f.scope.variant ?? "", f.denominator ? [f.denominator.value, unitKey(f.denominator.unit)] : null]);
export function factValueKey(f: AtomicFact | AtomicAssertion) { return JSON.stringify([valueKey(f), unitKey(f.unit), f.comparator, f.direction]); }
export const ConflictResolutionSchema = z.object({ key: text, selectedFactId: text, factRevisions: z.record(z.string(), z.number().int().positive()), reviewer: text, rationale: z.string().trim().min(10).max(3000) });
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;
export function factConflicts(facts: AtomicFact[], resolutions: ConflictResolution[] = []) {
    const groups = new Map<string, AtomicFact[]>();
    for (const f of facts.filter(f => f.authority.kind === "approved_fact"))
        groups.set(atomicKey(f), [...(groups.get(atomicKey(f)) ?? []), f]);
    return [...groups].flatMap(([key, group]) => {
        if (new Set(group.map(factValueKey)).size < 2)
            return [];
        const resolution = resolutions.find(r => r.key === key && group.some(f => f.id === r.selectedFactId) && Object.keys(r.factRevisions).length === group.length && group.every(f => r.factRevisions[f.id] === f.authority.sourceRevision));
        return [{ key, facts: group, status: resolution ? "resolved" as const : "unresolved" as const, resolution }];
    });
}
export function evaluateAssertions(assertions: AtomicAssertion[], facts: AtomicFact[], scope: FactScope, options: {
    locale?: string;
    now?: string;
    resolutions?: ConflictResolution[];
} = {}) {
    const conflicts = factConflicts(facts, options.resolutions);
    return assertions.map(raw => {
        const claim = AssertionSchema.parse(raw), reasons: string[] = [];
        const currencyIssue = currencyValueIssue(claim.value, claim.unit);
        if (currencyIssue)
            reasons.push(currencyIssue);
        if (!sameScope(claim.scope, scope))
            reasons.push("Assertion scope differs from the selected product, variant or market.");
        const candidates = facts.filter(f => norm(f.subject) === norm(claim.subject) && norm(f.predicate) === norm(claim.predicate) && sameScope(f.scope, scope));
        const authoritative = candidates.filter(f => f.authority.kind === "approved_fact" && (!f.validUntil || f.validUntil > (options.now ?? new Date().toISOString())));
        if (!authoritative.length)
            return { id: claim.id, status: "unresolved" as const, reasons: [...reasons, "No current applicable approved atomic source. Research, style, planning and history are not factual authority."], sourceIds: [] as string[] };
        const conflictsHere = conflicts.filter(c => c.facts.some(f => authoritative.some(a => a.id === f.id)));
        if (conflictsHere.some(c => c.status === "unresolved"))
            return { id: claim.id, status: "unresolved" as const, reasons: [...reasons, "Competing scoped values require an explicit source authority resolution."], sourceIds: authoritative.map(f => f.id) };
        const selected = authoritative.filter(f => conflictsHere.every(c => !c.facts.some(g => g.id === f.id) || c.resolution?.selectedFactId === f.id));
        const exact = selected.find(f => factValueKey(f) === factValueKey(claim) && JSON.stringify(f.denominator && [f.denominator.value, unitKey(f.denominator.unit)]) === JSON.stringify(claim.denominator && [claim.denominator.value, unitKey(claim.denominator.unit)]) && (!claim.sourceId || claim.sourceId === f.authority.sourceId) && (!claim.sourceRevision || claim.sourceRevision === f.authority.sourceRevision));
        if (!exact)
            reasons.push("Subject/property value, unit, denominator, comparator, direction or source revision differs from the approved tuple. No conversion or reassignment is allowed.");
        if (exact)
            for (const c of exact.conditions.filter(c => c.kind !== "provenance")) {
                if (!claim.conditions.some(p => p.id === c.id && p.kind === c.kind && p.text === c.text && p.display === "adjacent"))
                    reasons.push(`Missing or changed material condition: ${c.text}`);
                if (claim.passage && !norm(claim.passage).includes(norm(c.text)))
                    reasons.push(`The mapped passage omits its adjacent material condition: ${c.text}`);
            }
        if (exact && currencyValueIssue(exact.value, exact.unit))
            reasons.push("The declared source currency display is inconsistent and requires review before use.");
        return { id: claim.id, status: reasons.length ? "unsupported" as const : "supported" as const, reasons: reasons.length ? reasons : ["Exact approved atomic tuple and all material conditions match. Source truth and prose entailment still require review."], sourceIds: exact ? [exact.id] : selected.map(f => f.id) };
    });
}
export const DerivationSchema = z.object({ id: text, operation: z.enum(["pack_total", "unit_price"]), operands: z.array(z.object({ factId: text, revision: z.number().int().positive() })).length(2), roundingDecimals: z.number().int().min(0).max(6), scope: FactScopeSchema, reviewedBy: text, rationale: z.string().min(10) });
export type Derivation = z.infer<typeof DerivationSchema>;
export function deriveFact(raw: Derivation, facts: AtomicFact[], now = new Date().toISOString()) {
    const input = DerivationSchema.parse(raw), operands = input.operands.map(o => facts.find(f => f.id === o.factId && f.authority.sourceRevision === o.revision));
    if (operands.some(f => !f || f.authority.kind !== "approved_fact" || !sameScope(f.scope, input.scope) || f.comparator !== "equal" || f.direction !== "none" || f.conditions.some(c => c.kind === "unknown") || f.validUntil && f.validUntil <= now))
        throw new Error("Derivation operands are missing, stale, non-exact, uncertain or outside the approved scope.");
    const [a, b] = operands as [
        AtomicFact,
        AtomicFact
    ], av = parseLocaleValue(a.value, a.locale), bv = parseLocaleValue(b.value, b.locale);
    if (a.subject !== b.subject || factConflicts(facts).some(c => c.facts.some(f => f.id === a.id || f.id === b.id)))
        throw new Error("Operands need the same subject and no competing unresolved source values.");
    if (av.status !== "resolved" || bv.status !== "resolved" || typeof av.value !== "number" || typeof bv.value !== "number" || bv.value <= 0)
        throw new Error("Both operands need current numeric quantities and a positive denominator.");
    if (/health|outcome|efficacy|risk|absorption|treat|cure/i.test([a.predicate, b.predicate, a.subject, b.subject].join(" ")))
        throw new Error("Health extrapolation is not an allowed calculation.");
    let value: number, unit: string, denominator: AtomicFact["denominator"];
    if (input.operation === "pack_total") {
        if (av.value <= 0)
            throw new Error("Pack totals require positive package quantities.");
        if (a.predicate !== "pack_count" || b.predicate !== "contents_per_pack" || !b.denominator || b.denominator.value !== 1 || unitKey(a.unit) !== unitKey(b.denominator.unit) || a.denominator)
            throw new Error("Pack totals require pack_count × matching contents_per_pack units.");
        value = av.value * bv.value;
        unit = b.unit;
        denominator = null;
    }
    else {
        if (av.value < 0)
            throw new Error("A unit price cannot use a negative price.");
        if (a.predicate !== "current_price" || !/^[A-Z]{3}$/.test(a.unit) || !a.validUntil || b.predicate !== "package_quantity" || a.denominator || b.denominator)
            throw new Error("Unit price requires a current explicitly coded currency price and the same package quantity.");
        value = av.value / bv.value;
        unit = a.unit;
        denominator = { value: 1, unit: b.unit };
    }
    value = Number(value.toFixed(input.roundingDecimals));
    return { fact: AtomicFactSchema.parse({ id: input.id, subject: a.subject, predicate: input.operation === "pack_total" ? "package_quantity" : "unit_price", value, unit, denominator, comparator: "equal", direction: "none", scope: input.scope, conditions: [...new Map([...a.conditions, ...b.conditions].map(c => [c.id, c])).values()], locale: a.locale, validUntil: [a.validUntil, b.validUntil].filter(Boolean).sort()[0], authority: { kind: "approved_fact", sourceId: `derived:${input.id}`, sourceRevision: 1, attribution: `Reviewed calculation by ${input.reviewedBy}: ${input.rationale}` } }), audit: { ...input, operands: [a, b], formula: input.operation === "pack_total" ? "a × b" : "a / b", result: value, calculatedAt: now } };
}
export function propagateAuthority<T>(value: T, parents: {
    authority: AuthorityTag;
    value: unknown;
}[]) {
    return { value, authorities: parents.map(p => ({ ...p.authority })), factualAuthority: parents.length > 0 && parents.every(p => p.authority.kind === "approved_fact") ? "approved_parents_only" as const : "non_factual_or_mixed" as const, requiresTupleReview: true as const };
}
