import type { AuditItem, StudioItem } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { ownId } from "../llm/context";
import { overlaps } from "../sprint/formats";
const BUYER_NOTE = /Write these for: ([^\n]+)/i;
const list = (ns: number[]) => (ns.length < 2 ? String(ns[0]) : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`);
const pairs = (ps: [
    number,
    number
][]) => ps.slice(0, 4).map(([a, b]) => `${a} and ${b}`).join("; ");
const opening = (s: string) => (s.split(/(?<=[.!?])\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9%' ]+/g, " ").replace(/\s+/g, " ").trim();
export function buyerId(raw: string, brand: BrandBrain): string {
    return ownId(raw, brand.personas.map((p) => p.id)) ?? brand.personas.find((p) => p.name.toLowerCase() === raw.trim().toLowerCase())?.id ?? raw;
}
export function askedBuyers(notes: string, brand: BrandBrain): string[] {
    const line = BUYER_NOTE.exec(notes)?.[1] ?? "";
    return brand.personas.map((p) => p.id).filter((id) => new RegExp(`\\b${id}\\b`).test(line));
}
export const PICTURE_AXES = ["kind of ad", "setting", "light", "camera", "where the product sits"] as const;
export const MUST_DIFFER = 2;
const STOP = new Set(["a", "an", "the", "of", "on", "in", "at", "with", "and", "or", "to", "from", "light", "lit", "shot", "angle", "view", "level"]);
const words = (v: string) => new Set((v.toLowerCase().match(/[a-zà-ÿ0-9]+/g) ?? []).map((w) => w.replace(/(ing|s)$/, "")).filter((w) => w.length > 1 && !STOP.has(w)));
export function sameLabel(a: string, b: string): boolean {
    const x = words(a);
    const y = words(b);
    if (!x.size || !y.size)
        return a.trim().toLowerCase() === b.trim().toLowerCase();
    const shared = [...x].filter((w) => y.has(w)).length;
    return shared / Math.min(x.size, y.size) >= 0.6;
}
export function pictureOf(item: Pick<StudioItem, "type" | "world" | "archetype" | "plan">): string[] {
    const p = item.plan as (StudioItem["plan"] & {
        form?: string;
    }) | undefined;
    const pic = p?.picture;
    return [p?.form || item.archetype || item.type || "", item.world || pic?.setting || "", pic?.light ?? "", pic?.camera ?? "", p?.product_stop ?? ""].map((v) => v.trim());
}
export const pictureLine = (item: Parameters<typeof pictureOf>[0]) => {
    const [kind, setting, light, camera, product] = pictureOf(item);
    return [kind, setting, light, camera, product ? (product === "none" ? "no product" : `product ${product}`) : ""].filter(Boolean).join(", ");
};
export function pictureTwins(items: (Parameters<typeof pictureOf>[0] & {
    n: number;
    ref_id?: string | null;
})[]): {
    pair: [
        number,
        number
    ];
    shared: string[];
}[] {
    const out: {
        pair: [
            number,
            number
        ];
        shared: string[];
    }[] = [];
    const read = items.map((it) => ({ it, axes: pictureOf(it) }));
    for (let i = 0; i < read.length; i++)
        for (let j = i + 1; j < read.length; j++) {
            const a = read[i];
            const b = read[j];
            if (a.it.ref_id && a.it.ref_id === b.it.ref_id)
                continue;
            const known = PICTURE_AXES.map((_, k) => k).filter((k) => a.axes[k] && b.axes[k]);
            if (known.length < 4)
                continue;
            const same = known.filter((k) => (k === 0 || k === 4 ? a.axes[k].toLowerCase() === b.axes[k].toLowerCase() : sameLabel(a.axes[k], b.axes[k])));
            if (known.length - same.length < MUST_DIFFER)
                out.push({ pair: [a.it.n, b.it.n], shared: same.map((k) => PICTURE_AXES[k]) });
        }
    return out;
}
export function setChecks(run: {
    kind: string;
    items: StudioItem[];
    notes?: string;
    context?: {
        sprint?: string;
        taste?: {
            spread?: string;
        };
    } | null;
}, brand: BrandBrain): AuditItem[] {
    if (run.kind !== "ad" || run.context?.sprint)
        return [];
    const ads = run.items.map((item, i) => ({ n: i + 1, plan: item.plan })).filter((a) => a.plan);
    if (ads.length < 3)
        return [];
    const out: AuditItem[] = [];
    const onImage = overlaps(ads.map((a) => ({ n: a.n, text: a.plan!.text_elements.find((t) => t.role === "headline")?.text ?? "" })), 0.6);
    if (onImage.length)
        out.push({ check: "set_variety", status: "warn", message: `Images ${pairs(onImage)} carry nearly the same headline. Ads tested together have to differ in what they say first, or the test shows nothing.` });
    const feed = overlaps(ads.map((a) => ({ n: a.n, text: a.plan!.ad_copy?.headline ?? "" })), 0.6).filter(([a, b]) => !onImage.some(([x, y]) => x === a && y === b));
    if (feed.length)
        out.push({ check: "set_variety", status: "warn", message: `Images ${pairs(feed)} have nearly the same feed headline.` });
    const openers = new Map<string, number[]>();
    for (const a of ads) {
        const first = opening(a.plan!.ad_copy?.primary_text ?? "");
        if (first.split(" ").length >= 4)
            openers.set(first, [...(openers.get(first) ?? []), a.n]);
    }
    for (const [first, ns] of openers)
        if (ns.length > 1)
            out.push({ check: "set_variety", status: "warn", message: `Images ${list(ns)} open their feed copy on the same sentence ("${first.slice(0, 60)}"). The first line is what shows before "See more": give each ad its own.` });
    if (run.context?.taste?.spread !== "openings") {
        const twins = pictureTwins(run.items.map((item, i) => ({ ...item, n: i + 1 })).filter((it) => it.plan));
        if (twins.length) {
            const first = twins[0];
            out.push({ check: "set_pictures", status: "warn", message: `Images ${pairs(twins.map((t) => t.pair))} are nearly the same picture${twins.length === 1 ? ` (the same ${first.shared.join(", ")})` : ""}. 2 ads count as 2 when they differ on at least ${MUST_DIFFER} of: ${PICTURE_AXES.join(", ")}. Change 1 of each pair with "Change this picture", or keep both if that is what you want to test.` });
        }
    }
    const known = new Map(brand.personas.map((p) => [p.id, p.name]));
    const name = (id: string) => known.get(id) ?? id;
    const written = ads.map((a) => ({ n: a.n, buyer: a.plan!.buyer ? buyerId(a.plan!.buyer, brand) : "" })).filter((a) => a.buyer);
    const asked = askedBuyers(run.notes ?? "", brand);
    if (asked.length) {
        const off = written.filter((a) => known.has(a.buyer) && !asked.includes(a.buyer));
        if (off.length)
            out.push({ check: "set_buyers", status: "warn", message: `Image${off.length === 1 ? "" : "s"} ${list(off.map((a) => a.n))} ${off.length === 1 ? "is" : "are"} written for ${[...new Set(off.map((a) => name(a.buyer)))].join(", ")}, not for the buyer${asked.length === 1 ? "" : "s"} this set was asked for (${asked.map(name).join(", ")}).` });
        const none = asked.filter((id) => !written.some((a) => a.buyer === id));
        if (asked.length > 1 && written.length >= asked.length && none.length)
            out.push({ check: "set_buyers", status: "warn", message: `No ad in this set is written for ${none.map(name).join(", ")}, though the set was asked to speak to them.` });
    }
    else if (written.length >= 5 && known.size > 1) {
        const count = new Map<string, number[]>();
        for (const a of written)
            count.set(a.buyer, [...(count.get(a.buyer) ?? []), a.n]);
        const [top, ns] = [...count].sort((a, b) => b[1].length - a[1].length)[0];
        if (ns.length / written.length > 0.6)
            out.push({ check: "set_buyers", status: "warn", message: `${ns.length} of ${written.length} ads are written for ${name(top)}. A set reaches further, and tests more, when it speaks to more than 1 buyer: choose the buyers when you start a set.` });
    }
    return out;
}
