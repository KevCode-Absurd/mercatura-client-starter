import { waterfall, type Economics, type Waterfall } from "./economics";
import type { AddKind, Mechanic } from "./types";
const r2 = (n: number) => Math.round(n * 100) / 100;
export const nice = (n: number) => (n <= 0 ? 0 : n < 200 ? Math.max(5, Math.round(n / 5) * 5) : Math.round(n / 10) * 10);
export interface DealShape {
    buy: number;
    get: number;
    off: number;
}
export const DEAL_SHAPES = [
    { id: "bogo", label: "Buy 1, get 1 free", buy: 1, get: 1, off: 1 },
    { id: "bogo_half", label: "Buy 1, get 1 half price", buy: 1, get: 1, off: 0.5 },
    { id: "three_for_two", label: "3 for 2", buy: 2, get: 1, off: 1 },
    { id: "buy2_get1_half", label: "Buy 2, get 1 half price", buy: 2, get: 1, off: 0.5 },
] as const;
export type DealShapeId = (typeof DEAL_SHAPES)[number]["id"];
export function dealMaths(d: DealShape): {
    units: number;
    paid: number;
    discount: number;
} {
    const buy = Math.max(1, Math.round(d.buy));
    const get = Math.max(0, Math.round(d.get));
    const off = Math.min(1, Math.max(0, d.off));
    const units = buy + get;
    const paid = buy + get * (1 - off);
    return { units, paid: r2(paid), discount: Math.round((1 - paid / units) * 1000) / 1000 };
}
export interface OrderCosts {
    price: number;
    unit_cost: number;
    shipping: number[];
    fee_rate: number;
}
export function dealOrder(d: DealShape, c: OrderCosts): {
    units: number;
    discount: number;
    deal: Waterfall;
    flat: Waterfall;
    full: Waterfall;
} {
    const m = dealMaths(d);
    const at = (revenue: number, units: number) => waterfall({ revenue, units, unit_cost: c.unit_cost, shipping: c.shipping, fee_rate: c.fee_rate });
    return { units: m.units, discount: m.discount, deal: at(c.price * m.paid, m.units), flat: at(c.price * (1 - m.discount), 1), full: at(c.price, 1) };
}
export interface GiftVsDepth {
    depth: Waterfall;
    gift: Waterfall;
    buyer: {
        depth_saves: number;
        gift_saves: number;
        gift_value: number;
    };
    better: "gift" | "depth" | "same";
    by: number;
}
export function giftVsDepth(c: OrderCosts & {
    units: number;
    deep: number;
    light: number;
    gift_cost: number;
    gift_value: number;
}): GiftVsDepth {
    const units = Math.max(1, c.units);
    const list = c.price * units;
    const at = (discount: number, extras: number) => waterfall({ revenue: list * (1 - discount), units, unit_cost: c.unit_cost, shipping: c.shipping, fee_rate: c.fee_rate, extras });
    const depth = at(c.deep, 0);
    const gift = at(c.light, Math.max(0, c.gift_cost));
    const by = r2(gift.margin - depth.margin);
    return { depth, gift, buyer: { depth_saves: r2(list * c.deep), gift_saves: r2(list * c.light), gift_value: r2(Math.max(0, c.gift_value)) }, better: Math.abs(by) < 0.005 ? "same" : by > 0 ? "gift" : "depth", by: Math.abs(by) };
}
export function medianOrder(bands: Economics["order_values"]): number | null {
    const b = [...bands].sort((x, y) => x.from - y.from);
    const total = b.reduce((a, x) => a + x.share, 0);
    if (!b.length || total <= 0)
        return null;
    let seen = 0;
    for (const x of b) {
        if (seen + x.share >= total / 2) {
            const to = Number.isFinite(x.to) && x.to > x.from ? x.to : x.from * 1.25;
            return r2(x.from + ((to - x.from) * (total / 2 - seen)) / (x.share || 1));
        }
        seen += x.share;
    }
    return null;
}
export const giftThreshold = (median: number) => ({ from: nice(median * 1.2), to: nice(median * 1.3) });
export function heroProduct(mix: Economics["mix"], products: {
    id: string;
    name: string;
}[]): {
    id: string;
    name: string;
    share: number;
} | null {
    const top = [...mix].sort((a, b) => b.share - a.share)[0];
    const p = top && products.find((x) => x.id === top.product_id);
    return p && products.length > 1 && top.share >= 0.34 ? { id: p.id, name: p.name, share: top.share } : null;
}
const words = (s: string) => s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !["the", "and", "for", "with", "free", "full", "size", "pack", "our"].includes(w));
export function giftsTheHero(gift: string, hero: string): boolean {
    const h = words(hero);
    const g = new Set(words(gift));
    return h.length > 0 && h.every((w) => g.has(w));
}
export interface Ladder {
    tiers: {
        at: number;
        pct: number;
        get: string;
    }[];
    gift_cap: number;
    bonus: {
        at: number;
        get: string;
    };
}
export function ladder(aov: number): Ladder {
    const a = Math.max(1, aov);
    const tiers = [
        { at: nice(a * 0.75), pct: 10, get: "10% off" },
        { at: nice(a * 1.5), pct: 20, get: "20% off" },
        { at: nice(a * 2.5), pct: 25, get: "25% off and a gift" },
    ];
    return { tiers, gift_cap: r2(a * 0.1), bonus: { at: nice(a * 3), get: "A named gift, in the last 24 hours" } };
}
export function progressLine(cart: number, tiers: {
    at: number;
    get: string;
}[], sym: string): string {
    const next = [...tiers].sort((x, y) => x.at - y.at).find((t) => t.at > cart);
    if (!next)
        return "";
    const away = next.at - cart;
    return `You're ${sym}${Number.isInteger(away) ? away : away.toFixed(2)} away from ${next.get.replace(/^./, (ch) => ch.toLowerCase())}`;
}
export interface CreditVsCash {
    cash_cost: number;
    credit_cost: number;
    saves: number;
}
export function creditVsCash(i: {
    credit: number;
    price: number;
    unit_cost: number;
    redeem: number;
}): CreditVsCash {
    const face = Math.max(0, i.credit);
    const goods = i.price > 0 ? Math.min(1, Math.max(0, i.unit_cost / i.price)) : 1;
    const credit_cost = r2(face * Math.min(1, Math.max(0, i.redeem)) * goods);
    return { cash_cost: r2(face), credit_cost, saves: r2(face - credit_cost) };
}
export const CUTOFF_KINDS = ["personalised", "standard", "express", "gift_card"] as const;
export type CutoffKind = (typeof CUTOFF_KINDS)[number];
export const CUTOFF_LABEL: Record<CutoffKind, string> = { personalised: "Personalised orders", standard: "Standard shipping", express: "Express shipping", gift_card: "Gift cards (sent by email)" };
export interface CutoffLine {
    kind: CutoffKind;
    date: string;
    days: number;
    text: string;
}
const dayOf = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m)
        return null;
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(t) ? null : t;
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const sayDate = (t: number) => `${MONTHS[new Date(t).getUTCMonth()]} ${new Date(t).getUTCDate()}`;
export function cutoffLines(dates: Partial<Record<CutoffKind, string>>, today: string): CutoffLine[] {
    const now = dayOf(today);
    if (now == null)
        return [];
    return CUTOFF_KINDS.flatMap((kind) => {
        const t = dayOf(dates[kind] ?? "");
        if (t == null)
            return [];
        const days = Math.round((t - now) / 86400000);
        const left = days < 0 ? "has passed" : days === 0 ? "is today" : `${days} day${days === 1 ? "" : "s"} left`;
        return [{ kind, date: dates[kind]!.trim(), days, text: `${CUTOFF_LABEL[kind]}: order by ${sayDate(t)} (${left})` }];
    }).sort((a, b) => a.days - b.days);
}
export function cutoffUrgency(dates: Partial<Record<CutoffKind, string>>, today: string): string {
    const ahead = cutoffLines(dates, today).filter((l) => l.days >= 0);
    return ahead.length ? `Last order days: ${ahead.map((l) => `${CUTOFF_LABEL[l.kind].replace(/ \(.*\)$/, "").toLowerCase()} ${sayDate(dayOf(l.date)!)}`).join("; ")}.` : "";
}
export interface DealPatch {
    mechanic: Mechanic;
    units?: number;
    discount?: number;
    terms?: string;
    tiers?: {
        at: number;
        get: string;
    }[];
    adds?: {
        kind: AddKind;
        name: string;
        cost: number;
        value: number;
    }[];
    urgency?: string;
    when?: string;
    needs?: string;
}
export const NAMED_DEALS = [
    { id: "bogo", label: "Buy 1, get 1 free", mechanic: "bundle", note: "The same as 50% off, on 2 units in 1 parcel." },
    { id: "bogo_half", label: "Buy 1, get 1 half price", mechanic: "bundle", note: "The same as 25% off, on 2 units." },
    { id: "three_for_two", label: "3 for 2", mechanic: "bundle", note: "The same as a third off, on 3 units." },
    { id: "gift_over", label: "A gift over a spend level", mechanic: "gift", note: "A lighter price cut, or none, and a named gift with its own price. Never the product buyers come for." },
    { id: "ladder", label: "A spend ladder", mechanic: "tiered", note: "3 levels worked out from the average order, the top one with a gift." },
    { id: "credit", label: "Credit on the next order", mechanic: "gift", note: "Paid in goods on a second order, not in cash on the first." },
    { id: "access", label: "Early access for the list", mechanic: "reposition", note: "The reward is getting in first, about 7 days. The price is the one everyone gets later." },
    { id: "cutoff", label: "A shipping cut-off sale", mechanic: "reposition", note: "The deadline is the carrier's real last day. No money off." },
] as const satisfies readonly {
    id: string;
    label: string;
    mechanic: Mechanic;
    note: string;
}[];
export type NamedDealId = (typeof NAMED_DEALS)[number]["id"];
export function dealPatch(id: NamedDealId, ctx: {
    sym: string;
    aov: number | null;
    median: number | null;
    hero: string | null;
}): DealPatch {
    const shape = DEAL_SHAPES.find((s) => s.id === id);
    if (shape) {
        const m = dealMaths(shape);
        return { mechanic: "bundle", units: m.units, discount: m.discount, terms: `${shape.label}: ${m.units} units for the price of ${m.paid}.` };
    }
    if (id === "gift_over") {
        const t = ctx.median ? giftThreshold(ctx.median) : null;
        return { mechanic: "gift", discount: 0, adds: [{ kind: "gift", name: "", cost: 0, value: 0 }], terms: t ? `Spend ${ctx.sym}${t.from} or more and the gift is in the parcel.` : "Spend [the level] or more and the gift is in the parcel.", needs: `Name the gift and give it a price on the site${ctx.hero ? `; not ${ctx.hero}, the product buyers come for` : ""}. Know how many there are, and have the sold-out line ready.` };
    }
    if (id === "ladder") {
        const l = ladder(ctx.aov ?? 0);
        return ctx.aov ? { mechanic: "tiered", discount: 0, tiers: l.tiers.map((t) => ({ at: t.at, get: t.get })), terms: l.tiers.map((t) => `${ctx.sym}${t.at}+: ${t.get.replace(/^./, (ch) => ch.toLowerCase())}`).join("; ") + ".", needs: `A gift for the top level that costs under ${ctx.sym}${l.gift_cap.toFixed(2)}, and a line in the cart that says how far the next level is.` } : { mechanic: "tiered", discount: 0, tiers: [], needs: "Enter the brand's order values first: the levels are worked out from the average order." };
    }
    if (id === "credit")
        return { mechanic: "gift", discount: 0, adds: [{ kind: "gift", name: "Credit on the next order", cost: 0, value: 0 }], terms: "Spend [the level] today and [the sum] comes back as credit on the next order.", needs: "Enter the credit's face value as its value and what it costs in goods as its cost (the calculator works it out). A way to issue and track store credit, and the expiry date stated on it." };
    if (id === "access")
        return { mechanic: "reposition", discount: 0, adds: [{ kind: "access", name: "Early access", cost: 0, value: 0 }], terms: "The list gets in 7 days before everyone else, at the same price everyone gets later.", when: "[the early window], then public", needs: "A list to open to, and a window with real dates: about 7 days. The public price is never lower than the early one, and the window is not extended." };
    return { mechanic: "reposition", discount: 0, terms: "Full price, with delivery in time when ordered by the last order day.", urgency: "Last order days: [the carrier's dates].", when: "From the start of the month to the last shipping day", needs: "The carrier's real last days for personalised, standard and express orders, and for gift cards. Returns extended into the new year, if the brand can." };
}
