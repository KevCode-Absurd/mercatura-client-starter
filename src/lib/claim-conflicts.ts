import type { AuditItem } from "@/db/schema";
import type { BrandBrain } from "./brand-brain";
import { loadBrandBrain } from "./brands";
import { loadClaimSources, saveClaimSources, type ClaimRegister } from "./claim-sources";
export interface Sighting {
    origin: "website" | "ad" | "brand";
    where: string;
    quote: string;
}
export interface Conflict {
    topic: string;
    label: string;
    values: {
        value: string;
        sightings: Sighting[];
    }[];
    status: "open" | "settled";
    live?: string;
    note?: string;
}
interface Topic {
    id: string;
    label: string;
    patterns: RegExp[];
    show: (n: string) => string;
}
export const TOPICS: Topic[] = [
    { id: "discount", label: "Discount", patterns: [/(\d{1,2})\s?%\s*off\b/gi, /\bsave\s+(?:up\s+to\s+)?(\d{1,2})\s?%/gi], show: (n) => `${n}% off` },
    { id: "guarantee_days", label: "Guarantee length", patterns: [/(\d{1,3})[-\s]day\s+(?:[\w-]+\s+){0,3}guarantee/gi], show: (n) => `${n}-day guarantee` },
    { id: "returns_days", label: "Returns window", patterns: [/(\d{1,3})[-\s]day\s+(?:[\w-]+\s+){0,2}(?:returns?|refunds?)\b/gi], show: (n) => `${n}-day returns` },
    { id: "trial_days", label: "Trial length", patterns: [/(\d{1,3})[-\s]day\s+(?:[\w-]+\s+){0,2}trial\b/gi], show: (n) => `${n}-day trial` },
    { id: "free_gifts", label: "Free gifts", patterns: [/(\d{1,2})\s+free\s+gifts?\b/gi], show: (n) => `${n} free gifts` },
    { id: "free_shipping", label: "Free shipping from", patterns: [/free\s+(?:[\w-]+\s+){0,2}(?:shipping|delivery)\s+(?:on\s+)?(?:all\s+)?(?:orders?\s+)?(?:over|above|from)\s+[$€£]\s?(\d+(?:\.\d+)?)/gi], show: (n) => `free shipping over ${n}` },
];
export function figuresIn(text: string): {
    topic: string;
    value: string;
}[] {
    const out: {
        topic: string;
        value: string;
    }[] = [];
    for (const t of TOPICS)
        for (const re of t.patterns)
            for (const m of text.matchAll(re)) {
                const value = t.show(String(Number(m[1])));
                if (!out.some((x) => x.topic === t.id && x.value === value))
                    out.push({ topic: t.id, value });
            }
    return out;
}
export function findConflicts(reg: ClaimRegister, brand: Pick<BrandBrain, "offers" | "guarantee">): Conflict[] {
    const seen = new Map<string, Map<string, Sighting[]>>();
    const add = (text: string, s: Sighting) => {
        for (const f of figuresIn(text)) {
            const byValue = seen.get(f.topic) ?? seen.set(f.topic, new Map()).get(f.topic)!;
            const list = byValue.get(f.value) ?? byValue.set(f.value, []).get(f.value)!;
            if (!list.some((x) => x.origin === s.origin && x.where === s.where))
                list.push(s);
        }
    };
    for (const c of reg.claims)
        if (c.status !== "ignored")
            add(`${c.quote} ${c.text}`, { origin: c.origin, where: c.where, quote: c.quote });
    for (const o of brand.offers)
        add(`${o.name} ${o.notes ?? ""}`, { origin: "brand", where: `Brand brain, offer "${o.name}"`, quote: o.name });
    if (brand.guarantee?.text)
        add(brand.guarantee.text, { origin: "brand", where: "Brand brain, guarantee", quote: brand.guarantee.text });
    const out: Conflict[] = [];
    for (const t of TOPICS) {
        const byValue = seen.get(t.id);
        if (!byValue || byValue.size < 2)
            continue;
        const values = [...byValue.entries()].map(([value, sightings]) => ({ value, sightings })).sort((a, b) => b.sightings.length - a.sightings.length || a.value.localeCompare(b.value));
        const s = reg.settled[t.id];
        const holds = !!s && s.values.length === values.length && values.every((v) => s.values.includes(v.value));
        out.push({ topic: t.id, label: t.label, values, status: holds ? "settled" : "open", ...(holds ? { live: s.live, note: s.note } : {}) });
    }
    return out;
}
export const brandConflicts = (brandId: string): Conflict[] => findConflicts(loadClaimSources(brandId), loadBrandBrain(brandId));
export function settleConflict(brandId: string, topic: string, live: string, note = ""): void {
    const reg = loadClaimSources(brandId);
    const c = findConflicts(reg, loadBrandBrain(brandId)).find((x) => x.topic === topic);
    if (!c)
        throw new Error("That disagreement is no longer there. Read the sources again.");
    if (live && !c.values.some((v) => v.value === live))
        throw new Error("Pick one of the figures that were found.");
    reg.settled[topic] = { live, note: note.slice(0, 300), at: new Date().toISOString(), values: c.values.map((v) => v.value) };
    saveClaimSources(brandId, reg);
}
export function reopenConflict(brandId: string, topic: string): void {
    const reg = loadClaimSources(brandId);
    delete reg.settled[topic];
    saveClaimSources(brandId, reg);
}
const places = (c: Conflict) => c.values.map((v) => `${v.value} (${[...new Set(v.sightings.map((s) => (s.origin === "website" ? "the site" : s.origin === "ad" ? "the ads" : "the brand brain")))].join(", ")})`).join(", ");
export function conflictChecksFor(conflicts: Conflict[], texts: {
    text: string;
    where: string;
    index?: number;
}[]): AuditItem[] {
    const out: AuditItem[] = [];
    for (const t of texts)
        for (const f of figuresIn(t.text)) {
            const c = conflicts.find((x) => x.topic === f.topic);
            if (!c)
                continue;
            const at = t.index != null ? { line_index: t.index } : {};
            if (c.status === "open")
                out.push({ check: "figure_disagrees", status: "warn", message: `"${f.value}" in ${t.where}: the brand states this differently in different places: ${places(c)}. Say which is live on the Brand screen.`, ...at });
            else if (!c.live)
                out.push({ check: "figure_disagrees", status: "fail", message: `"${f.value}" in ${t.where}: this figure differs by place (${places(c)}) and the brand decided no single one is quoted.`, ...at });
            else if (c.live !== f.value)
                out.push({ check: "figure_disagrees", status: "fail", message: `"${f.value}" in ${t.where}: the live figure is ${c.live}.`, ...at });
        }
    return out;
}
export const conflictChecks = (brandId: string, texts: {
    text: string;
    where: string;
    index?: number;
}[]): AuditItem[] => {
    const conflicts = brandConflicts(brandId);
    return conflicts.length ? conflictChecksFor(conflicts, texts) : [];
};
export function conflictNote(brandId: string): string {
    const c = brandConflicts(brandId);
    if (!c.length)
        return "";
    return c.map((x) => (x.status === "open" ? `${x.label}: the brand states it differently in different places (${places(x)}) and nobody has said which is live. Do not quote any of these figures.` : x.live ? `${x.label}: the live figure is ${x.live}. Quote no other.` : `${x.label}: differs by place. Quote no figure.`)).join("\n");
}
