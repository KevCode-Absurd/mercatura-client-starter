import { addonProfit, hold, waterfall, type Spread, type Waterfall } from "./economics";
import type { Mechanic } from "./types";
export const PART_IDS = ["positioning", "price", "value", "risk", "urgency"] as const;
export type PartId = (typeof PART_IDS)[number];
export type OfferParts = Record<PartId, string>;
export const PART_INFO: Record<PartId, {
    label: string;
    plain: string;
    suggest: string;
}> = {
    positioning: { label: "Who and why now", plain: "The problem it solves, for which buyer, and why today.", suggest: "Say which buyer this is for and the problem it fixes. Build it for 1 persona." },
    price: { label: "The price", plain: "What they pay and how: 1 unit, a set, a spend level, a subscription.", suggest: "State what the buyer pays, in 1 figure." },
    value: { label: "What is added", plain: "What they get on top that costs you little: free shipping, a gift, a sample, a perk.", suggest: "Add 1 thing the buyer wants that costs you little: free shipping, a gift that goes with the product, a sample." },
    risk: { label: "What removes the risk", plain: "A guarantee, returns, a trial, a small size to try.", suggest: "Put your guarantee or returns promise inside the offer, in plain words." },
    urgency: { label: "Why now", plain: "A real reason to act today: a season, a drop, a window that closes.", suggest: "Only if it is real: a season, a limited run, a date it ends. No invented deadline." },
};
export const MAIN_MECHANICS = ["reposition", "bundle", "gift", "tiered", "discount"] as const;
export type MainMechanic = (typeof MAIN_MECHANICS)[number];
export const mainMechanic = (m: Mechanic): MainMechanic | null => ((MAIN_MECHANICS as readonly string[]).includes(m) ? (m as MainMechanic) : null);
export const MECHANIC_CHOICE: Record<MainMechanic, {
    label: string;
    plain: string;
    example: string;
    best: string;
}> = {
    reposition: {
        label: "Same product, new buyer",
        plain: "Keep the product and the price. Change who it is for, the problem it solves and the headline.",
        example: "A daily vitamin sold to night-shift workers as \"steady energy for the 3am slump\", with its own page and terms.",
        best: "1 hero product",
    },
    bundle: {
        label: "Bundle",
        plain: "More units or several products in 1 order. Sending 3 costs far less than 3 times sending 1.",
        example: "A board game store: buy 2 games, get 25% off the pair.",
        best: "Several products, or a product that gets used up",
    },
    gift: {
        label: "Gift with purchase",
        plain: "A low-cost item the buyer wants, given when they buy more. The price stays where it is.",
        example: "A beach towel brand: buy 2 towels, get the beach bag free. The bag sells for 60 on the site and costs 4.",
        best: "A cheap second item that goes with the product",
    },
    tiered: {
        label: "Spend more, get more",
        plain: "A reward at a spend level, set just above where groups of orders already land.",
        example: "A fashion store: free shipping at 80 and a free tote at 160, 1 step above each group of orders.",
        best: "Order sizes that bunch in 2 groups",
    },
    discount: {
        label: "Straight discount, used rarely",
        plain: "Money off, once or twice a year, on high-margin or slow stock, and never on its own.",
        example: "A homeware store: 20% off last season's colours for 1 week in January, to turn stock into cash.",
        best: "Slow stock, or a few very high-margin products",
    },
};
export const ADDON_IDS = ["risk_reversal", "urgency", "subscription", "free_extra"] as const;
export type AddonId = (typeof ADDON_IDS)[number];
export const ADDON_CHOICE: Record<AddonId, {
    label: string;
    plain: string;
    example: string;
    ask: string;
    part: PartId;
}> = {
    risk_reversal: { label: "Take the risk away", plain: "A guarantee, returns, a trial or a small size to try.", example: "A towel brand: buy 2 and they are replaced for life if they wear out.", ask: "What is the promise, word for word?", part: "risk" },
    urgency: { label: "A real reason to act now", plain: "A season, a limited run or a window that closes. Real or left out.", example: "A candle brand: the winter scent is sold until the end of January.", ask: "What ends, and when?", part: "urgency" },
    subscription: { label: "Reward for staying", plain: "A better price or perk that holds only while they stay subscribed.", example: "A coffee brand: the first-order price is kept for as long as you stay subscribed.", ask: "What do they keep while they stay?", part: "price" },
    free_extra: { label: "A free extra", plain: "Free shipping, a sample, a small gift or access to something you already own.", example: "A skincare brand: a travel-size cleanser in every first order.", ask: "What is the extra?", part: "value" },
};
export interface PathFacts {
    margin_rate: number | null;
    peaks: "one" | "two" | "unknown";
    range: "hero" | "many";
    repeat: "yes" | "no" | "unknown";
    has_guarantee: boolean;
    flat_discounts: number;
}
export const QUESTIONS: {
    id: keyof Pick<PathFacts, "margin_rate" | "peaks" | "range" | "repeat">;
    question: string;
    why: string;
}[] = [
    { id: "margin_rate", question: "How much of an order do you keep before ads?", why: "It is the floor. Every point of discount comes out of it." },
    { id: "peaks", question: "Do order sizes bunch in 1 group or 2?", why: "A spend level is set above each group, never at the average." },
    { id: "range", question: "1 hero product, or many?", why: "1 hero: change who it is for, then a gift, then a rare discount. Many: bundles, add-ons across categories, spend levels." },
    { id: "repeat", question: "Do buyers come back?", why: "If they do, reward staying. If not, protect the first order." },
];
export type ObjectionKind = "price" | "trust" | "commitment" | "habit" | "other";
export function objectionKind(text: string): ObjectionKind {
    const t = text.toLowerCase();
    if (/\b(cancel|locked?|trap(ped)?|charged? (again|month)|subscription|commit|stuck|sign(ed)? up)\b/.test(t))
        return "commitment";
    if (/[$£€]\s?\d|\b(price|pric(e|ey)|expensive|afford|cost|worth|cheap(er)?|dollars?|bucks|a lot of money|too much)\b/.test(t))
        return "price";
    if (/\b(forget|stick|keep (it )?up|every day|habit|quit|give up|routine|remember)\b/.test(t))
        return "habit";
    if (/\b(work|real(ly)?|actually|trust|taste|quality|safe|last|fit|scam|marketing|candy|enough|hype|side effects?|stomach)\b/.test(t))
        return "trust";
    return "other";
}
export interface Recommendation {
    mechanic: MainMechanic;
    why: string;
    addons: Record<AddonId, {
        on: boolean;
        why: string;
    }>;
    cautions: Partial<Record<MainMechanic, string>>;
}
export function recommend(f: PathFacts, objection: string): Recommendation {
    const kind = objectionKind(objection);
    const thin = f.margin_rate != null && f.margin_rate < 0.5;
    let mechanic: MainMechanic;
    let why: string;
    if (f.peaks === "two") {
        mechanic = "tiered";
        why = "Your order sizes bunch in 2 groups, so 1 reward above each group moves both.";
    }
    else if (f.range === "many") {
        mechanic = "bundle";
        why = "You sell several products, so putting them in 1 order lifts the order and saves on shipping.";
    }
    else if (kind === "price" && !thin) {
        mechanic = "gift";
        why = "This buyer's doubt is the price. A gift adds value without cutting what you charge.";
    }
    else {
        mechanic = "reposition";
        why = "1 product carries the brand, so the biggest lever is selling it to this buyer for their own reason. It costs no margin.";
    }
    const cautions: Recommendation["cautions"] = {};
    if (f.flat_discounts > 2)
        cautions.discount = `${f.flat_discounts} flat discounts ran in the last 12 months. More teaches buyers to wait.`;
    else if (thin)
        cautions.discount = "Your margin is thin. A discount comes straight out of it.";
    else if (f.repeat === "no")
        cautions.discount = "Buyers rarely come back, so the first order has to carry the profit.";
    if (f.peaks === "one" && f.range === "hero")
        cautions.tiered = "Order sizes sit in 1 group, so a single step up does the job of a ladder.";
    if (f.range === "hero" && f.repeat !== "yes")
        cautions.bundle = "1 product that is not bought again leaves little to bundle, apart from a pair or 1 to give.";
    if (thin)
        cautions.gift = "Check the gift's cost against your margin first.";
    const addons: Recommendation["addons"] = {
        risk_reversal: kind === "trust" || kind === "commitment" || kind === "habit" ? { on: true, why: f.has_guarantee ? "Their doubt is about risk, and you already have a promise to state." : "Their doubt is about risk. A promise you can keep answers it." } : { on: false, why: "Their doubt is not about risk." },
        urgency: { on: false, why: "Only when something real ends." },
        subscription: f.repeat === "yes" && kind !== "commitment" ? { on: true, why: "Buyers come back, so a reward for staying pays for itself." } : { on: false, why: kind === "commitment" ? "This buyer fears being locked in." : "Buyers rarely come back." },
        free_extra: kind === "price" && mechanic !== "gift" ? { on: true, why: "More for the same money answers a price doubt better than money off." } : { on: false, why: "Add only what this buyer cares about." },
    };
    return { mechanic, why, addons, cautions };
}
export interface PathNumbers {
    price: number;
    unit_cost: number;
    shipping: number[];
    fee_rate: number;
    units_before: number;
    units_after: number;
    discount: number;
    extras_cost: number;
    roas: number;
}
export interface NumbersColumn extends Waterfall {
    units: number;
    ad_cost: number;
    left: number;
}
export interface NumbersTable {
    before: NumbersColumn;
    after: NumbersColumn;
    hold: {
        cac: number;
        roas: number;
    };
    hold_plus_10: {
        roas: number;
    } | null;
    easier: boolean;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const column = (n: PathNumbers, units: number, discount: number, extras: number): NumbersColumn => {
    const w = waterfall({ revenue: n.price * (1 - discount) * units, units, unit_cost: n.unit_cost, shipping: n.shipping, fee_rate: n.fee_rate, extras });
    const ad = n.roas > 0 ? r2(w.revenue / n.roas) : 0;
    return { ...w, units, ad_cost: ad, left: r2(w.margin - ad) };
};
export function numbersTable(n: PathNumbers): NumbersTable {
    const before = column(n, Math.max(0.01, n.units_before), 0, 0);
    const after = column(n, Math.max(0.01, n.units_after), n.discount, n.extras_cost);
    const h = hold(after, before.left);
    const plus = n.discount > 0 && n.discount + 0.1 < 1 ? hold(column(n, n.units_after, n.discount + 0.1, n.extras_cost), before.left) : null;
    return { before, after, hold: h, hold_plus_10: plus ? { roas: plus.roas } : null, easier: Number.isFinite(h.roas) && h.roas <= n.roas };
}
export function tableRows(t: NumbersTable, sym: string, roas: number): {
    id: string;
    label: string;
    term: string;
    before: string;
    after: string;
    good?: boolean;
    bad?: boolean;
}[] {
    const m = (x: number) => `${x < 0 ? "-" : ""}${sym}${Math.abs(x).toFixed(2)}`;
    const x = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)}x` : "no return is enough");
    const b = t.before;
    const a = t.after;
    return [
        { id: "units", label: "Items in the order", term: "Units per transaction (UPT)", before: b.units.toFixed(2), after: a.units.toFixed(2) },
        { id: "pays", label: "What the customer pays", term: "Average order value (AOV)", before: m(b.revenue), after: m(a.revenue) },
        { id: "goods", label: "What the items cost you", term: "Cost of goods sold (COGS)", before: m(b.goods), after: m(a.goods) },
        { id: "shipping", label: "Pick, pack and post", term: "Shipping and fulfilment", before: m(b.shipping), after: m(a.shipping) },
        { id: "extras", label: "Gift or extra", term: "Cost of what is given with the order", before: m(b.extras), after: m(a.extras) },
        { id: "keep", label: "What you keep per order, before ads", term: "Gross margin", before: `${m(b.margin)} (${Math.round(b.margin_rate * 100)}%)`, after: `${m(a.margin)} (${Math.round(a.margin_rate * 100)}%)`, good: a.margin > b.margin, bad: a.margin < b.margin },
        { id: "break_even", label: "Ads must bring back this much per 1 spent to break even", term: "Break-even ROAS: 1 divided by the margin", before: x(b.break_even), after: x(a.break_even), good: a.break_even < b.break_even, bad: a.break_even > b.break_even },
        { id: "left", label: `What you keep per order, after ads at ${roas.toFixed(2)}x`, term: "Contribution profit per order", before: m(b.left), after: m(a.left), good: a.left > b.left, bad: a.left < b.left },
        { id: "needed", label: "Return needed to keep today's profit per order", term: "Target ROAS at the same contribution profit", before: x(roas), after: x(t.hold.roas), good: t.easier, bad: !t.easier },
    ];
}
export const SLOTS = ["cart", "checkout", "post_purchase", "exit_browse", "exit_basket", "exit_checkout"] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_INFO: Record<Slot, {
    label: string;
    tip: string;
    typical: string;
}> = {
    cart: { label: "In the cart", tip: "1 offer in the slot, read in 2 to 3 seconds. Something that goes with what is in the cart (a cross-sell), more of the same (an upsell), or a reward for adding 1 more.", typical: "5 to 15% take it" },
    checkout: { label: "At checkout", tip: "Not another product. A small add-on that needs no thought, such as shipping protection.", typical: "Lower for products; about 30% for a small add-on" },
    post_purchase: { label: "After payment", tip: "A 1-click add. Lead with the highest-priced offer, then step down if they say no.", typical: "Up to 35 to 40% take it when it fits; a good one adds 10 to 15% to the order value" },
    exit_browse: { label: "Leaving while browsing", tip: "They have committed to nothing. Be generous and give a reason to come back.", typical: "" },
    exit_basket: { label: "Leaving with a full basket", tip: "They may buy in a day or two anyway. Keep the offer small.", typical: "" },
    exit_checkout: { label: "Leaving at checkout", tip: "Give no money off. Remind them, or remove a risk: free shipping, the guarantee.", typical: "" },
};
export interface DownstreamRow {
    slot: Slot;
    item: string;
    price: number;
    margin: number;
    take_rate: number;
    discount?: number;
}
export const downstreamProfit = (r: Pick<DownstreamRow, "take_rate" | "price" | "margin">) => addonProfit({ take_rate: r.take_rate, price: r.price, margin: r.margin });
export const downstreamTotal = (rows: DownstreamRow[]) => r2(rows.reduce((a, r) => a + downstreamProfit(r), 0));
export function downstreamWarnings(rows: DownstreamRow[]): string[] {
    const out: string[] = [];
    const cart = rows.filter((r) => r.slot === "cart");
    if (cart.length > 1)
        out.push(`${cart.length} offers in the cart. Keep 1 in the slot: more makes people choose nothing.`);
    const post = rows.filter((r) => r.slot === "post_purchase");
    if (post.length > 1 && post.some((r, k) => k > 0 && r.price > post[k - 1].price))
        out.push("After payment, lead with the highest-priced offer and step down. A cheap first offer makes the next one look dear.");
    const exit = rows.find((r) => r.slot === "exit_checkout" && (r.discount ?? 0) > 0);
    if (exit)
        out.push("Someone who reached checkout will likely buy within days. Do not give margin away there: remind them, or offer free shipping or the guarantee.");
    const big = rows.find((r) => r.slot === "exit_basket" && (r.discount ?? 0) > 0.15);
    if (big)
        out.push("A full basket is already a sign they want it. Keep an offer there small.");
    const low = rows.find((r) => r.slot === "cart" && r.margin > 0 && r.margin < 0.3);
    if (low)
        out.push(`"${low.item}" keeps under 30% of its price. Judge an add-on by the profit it adds, not by how many take it.`);
    return out;
}
export const FREQUENCIES = ["always", "once_or_twice", "monthly", "weekly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const FREQUENCY_LABEL: Record<Frequency, string> = { always: "All year", once_or_twice: "Once or twice a year", monthly: "Every month", weekly: "Every week" };
export interface OfferPath {
    product_id: string;
    product_name: string;
    persona_id: string | null;
    persona_name: string;
    objection: string;
    proof: string;
    audience: "new" | "returning" | "all";
    mechanic: MainMechanic;
    addons: Partial<Record<AddonId, string>>;
    extra_value: number;
    qty: number;
    base: string;
    angle: string;
    threshold: number | null;
    frequency: Frequency;
    numbers: PathNumbers;
    downstream: DownstreamRow[];
}
export const PATH_FAILURES = ["blank_discount", "margin_miscalculated", "same_for_new_and_returning", "threshold_at_average", "wrong_gift", "promo_calendar", "q1_as_season"] as const;
export type PathFailure = (typeof PATH_FAILURES)[number];
export interface PathWarning {
    id: PathFailure;
    text: string;
}
export interface CheckContext {
    spread: Spread | null;
    flat_discounts: number;
    quiet_quarter_index: number | null;
    other_audience_covered: boolean;
    sym: string;
}
const hasAddon = (p: OfferPath) => Object.values(p.addons).some((v) => (v ?? "").trim());
export function pathWarnings(p: OfferPath, c: CheckContext): PathWarning[] {
    const out: PathWarning[] = [];
    const n = p.numbers;
    const t = numbersTable(n);
    const pct = Math.round(n.discount * 100);
    if (n.discount > 0 && !hasAddon(p) && n.units_after <= Math.max(1, n.units_before) && n.extras_cost <= 0 && !p.threshold)
        out.push({ id: "blank_discount", text: `${pct}% off and nothing else. That is a discount, not an offer. Tie it to more items, a gift, a promise or a real end date.` });
    if (n.unit_cost <= 0)
        out.push({ id: "margin_miscalculated", text: "No cost per item is entered, so what you keep is not known." });
    else if (!n.shipping.length || n.shipping.every((s) => s <= 0))
        out.push({ id: "margin_miscalculated", text: "Shipping is not counted. What you keep per order looks higher than it is. Enter what 1, 2 and 3 items cost to send." });
    if (n.discount > 0 && n.discount <= 0.1)
        out.push({ id: "margin_miscalculated", text: `${pct}% off is too small to change what people buy. It lowers the price of every order and brings nothing back.` });
    if (n.discount > 0.1 && n.units_after <= n.units_before)
        out.push({ id: "margin_miscalculated", text: "You expect no extra items per order, so this discount only lowers the price." });
    if (t.after.margin <= 0)
        out.push({ id: "margin_miscalculated", text: "After the items, shipping and what is given, this order keeps nothing before ads." });
    else if (n.roas > 0 && t.hold.roas > n.roas * 1.25)
        out.push({ id: "margin_miscalculated", text: `To keep today's profit per order, ads must return ${Number.isFinite(t.hold.roas) ? `${t.hold.roas.toFixed(1)}x` : "more than any return can give"}, against ${n.roas.toFixed(1)}x today.${t.hold_plus_10 && Number.isFinite(t.hold_plus_10.roas) ? ` 10 points more off would need ${t.hold_plus_10.roas.toFixed(1)}x.` : ""} Can a sale lift your ads that much?` });
    if (p.audience === "all")
        out.push({ id: "same_for_new_and_returning", text: "This goes to everyone. New buyers need a reason to try; returning buyers need a reason to stay. Pick 1 group and give the other its own offer." });
    else if (!c.other_audience_covered)
        out.push({ id: "same_for_new_and_returning", text: p.audience === "new" ? "Nothing in use is for returning buyers yet. They need their own offer: a reason to stay and buy more." : "Nothing in use is for new buyers yet. They need their own offer: a reason to try." });
    if (p.threshold != null && p.threshold > 0) {
        const s = c.spread;
        if (!s || s.shape === "unknown")
            out.push({ id: "threshold_at_average", text: "How your order sizes are spread is not known. A spend level set from the average rewards people who already spend it. Look at where orders bunch first." });
        else {
            const near = Math.abs(p.threshold - s.mean) / s.mean <= 0.1;
            const top = (k: number) => (Number.isFinite(s.peaks[k].to) ? s.peaks[k].to : s.peaks[k].at);
            const above = s.peaks.some((_, k) => p.threshold! >= top(k) * 1.05 && p.threshold! <= top(k) * 1.3);
            const where = s.peaks.map((_, k) => `${c.sym}${Math.round(top(k) * 1.1)} to ${c.sym}${Math.round(top(k) * 1.25)}`).join(" and ");
            if (near && s.shape === "two")
                out.push({ id: "threshold_at_average", text: `${c.sym}${p.threshold} sits on your average order (${c.sym}${Math.round(s.mean)}), between the 2 groups of orders, where few buyers are. Look at where orders bunch, not at the average: a level for each group, about ${where}.` });
            else if (!above)
                out.push({ id: "threshold_at_average", text: `${c.sym}${p.threshold} is not just above a group of orders. Buyers below it will not stretch that far, and buyers above it get the reward for nothing. Set it at ${where}.` });
        }
    }
    const giftName = p.mechanic === "gift" || p.addons.free_extra ? (p.addons.free_extra ?? "The gift") : "";
    if (giftName) {
        const base = t.after.margin + n.extras_cost;
        if (n.extras_cost > 0 && base > 0 && n.extras_cost > base * 0.25)
            out.push({ id: "wrong_gift", text: `The gift costs ${c.sym}${n.extras_cost.toFixed(2)} per order, more than a quarter of what the order keeps. It no longer pays for itself.` });
        else if (p.mechanic === "gift" && n.units_after <= n.units_before)
            out.push({ id: "wrong_gift", text: "The gift is not tied to buying more. Give it at 2 items or at a spend level, so it lifts the order." });
        if (p.extra_value <= 0)
            out.push({ id: "wrong_gift", text: "The gift has no price of its own. Sell it on the site at a real price so it reads as value, and ask buyers if they want it." });
        else if (n.extras_cost > 0 && p.extra_value < n.extras_cost * 3)
            out.push({ id: "wrong_gift", text: `The gift is worth ${c.sym}${p.extra_value.toFixed(0)} to the buyer and costs you ${c.sym}${n.extras_cost.toFixed(2)}. A good gift feels worth far more than it costs.` });
    }
    if (n.discount > 0 && (p.frequency === "weekly" || p.frequency === "monthly"))
        out.push({ id: "promo_calendar", text: `Money off ${p.frequency === "weekly" ? "every week" : "every month"} teaches buyers that the full price is not the price. Keep flat discounts to once or twice a year.` });
    else if (n.discount > 0 && p.mechanic === "discount" && c.flat_discounts >= 2)
        out.push({ id: "promo_calendar", text: `${c.flat_discounts} flat discounts already ran in the last 12 months. This would be 1 more.` });
    if (c.quiet_quarter_index != null && c.quiet_quarter_index < 90 && !/\b(jan|feb|mar|q1|new year|winter|quiet|off.season)/i.test(p.addons.urgency ?? ""))
        out.push({ id: "q1_as_season", text: `January to March ran at ${Math.round(c.quiet_quarter_index)}% of an average month. That is an offer problem, and the best time to test one. Plan an offer that fits it.` });
    return out;
}
const cash = (n: number, sym: string) => `${sym}${Number.isInteger(n) ? n : n.toFixed(2)}`;
export const dealPrice = (p: OfferPath) => r2(p.numbers.price * Math.max(1, Math.round(p.qty)) * (1 - p.numbers.discount));
export function dealFacts(p: OfferPath, sym: string): string[] {
    const qty = Math.max(1, Math.round(p.qty));
    const full = r2(p.numbers.price * qty);
    const pays = dealPrice(p);
    return [
        `${qty} x ${p.product_name}, ${cash(pays, sym)}${p.numbers.discount > 0 ? ` (${Math.round(p.numbers.discount * 100)}% off ${cash(full, sym)})` : qty > 1 ? ` (${cash(p.numbers.price, sym)} each)` : ""}.`,
        p.base ? `Background, the standing price it is built on (say only what the offer needs): ${p.base}` : "",
        p.threshold ? `Reward at a spend of ${cash(p.threshold, sym)}.` : "",
        p.addons.free_extra ? `Included free: ${p.addons.free_extra}${p.extra_value > 0 ? ` (sells for ${cash(p.extra_value, sym)})` : ""}.` : "",
        p.addons.risk_reversal ? `Promise: ${p.addons.risk_reversal}` : "",
        p.addons.subscription ? `For staying subscribed: ${p.addons.subscription}` : "",
        p.addons.urgency ? `Ends: ${p.addons.urgency}` : "",
        p.audience === "all" ? "" : `For ${p.audience} buyers only.`,
    ].filter(Boolean);
}
export function partsOfPath(p: OfferPath, sym: string): OfferParts {
    const t = numbersTable(p.numbers);
    const units = Math.round(p.numbers.units_after * 100) / 100;
    const pays = `${sym}${t.after.revenue.toFixed(2)}`;
    const price = [p.numbers.discount > 0 ? `${Math.round(p.numbers.discount * 100)}% off` : "Full price", Number.isInteger(units) && units > 1 ? `${units} in 1 order, ${pays}` : `${pays} an order on average`, p.threshold ? `reward at ${sym}${p.threshold}` : "", p.addons.subscription ?? ""].filter(Boolean).join("; ");
    return {
        positioning: `For ${p.persona_name || (p.audience === "returning" ? "returning buyers" : "new buyers")}${p.objection ? `, who think: "${p.objection}"` : ""}`,
        price,
        value: p.addons.free_extra ?? (p.mechanic === "gift" ? "A gift with the order" : ""),
        risk: p.addons.risk_reversal ?? "",
        urgency: p.addons.urgency ?? "",
    };
}
const PART_WORDS: Record<Exclude<PartId, "positioning">, RegExp> = {
    price: /[$£€]\s?\d|\d\s?%|\b(off|price|subscri\w+|a month|per (day|month)|first order|one.time|save)\b/i,
    value: /\b(free (shipping|gifts?|delivery|sample\w*)|gifts?|bonus|samples?|included|buy (one|1|2|two)\b.*\bget|extra (pack|pouch|unit|month))\b/i,
    risk: /\b(guarantee\w*|money.back|returns?|refund\w*|trial|cancel any ?time|pause|exchange|warranty|try it)\b/i,
    urgency: /\b(ends?|until|limited (time|run|edition)|while (stocks?|supplies) last|deadline|this (week|month) only|today only|drop|seasonal|black friday|holiday)\b/i,
};
export function partsOfText(o: {
    name: string;
    terms: string;
    why?: string;
    persona_names?: string[];
}): OfferParts {
    const clauses = `${o.name}. ${o.terms}`.split(/(?<=[.;!?])\s+|,\s+(?=with |then |and |plus )/).map((c) => c.trim().replace(/[.;]$/, "")).filter(Boolean);
    const pick = (re: RegExp) => clauses.filter((c) => re.test(c)).slice(0, 2).join("; ");
    return {
        positioning: o.persona_names?.length ? `For ${o.persona_names.slice(0, 3).join(", ")}${o.why ? `. ${o.why}` : ""}` : (o.why ?? ""),
        price: pick(PART_WORDS.price),
        value: pick(PART_WORDS.value),
        risk: pick(PART_WORDS.risk),
        urgency: pick(PART_WORDS.urgency),
    };
}
export const partGaps = (parts: OfferParts): {
    part: PartId;
    suggest: string;
}[] => PART_IDS.filter((id) => !parts[id]?.trim()).map((id) => ({ part: id, suggest: PART_INFO[id].suggest }));
export function coverage(all: OfferParts[]): {
    part: PartId;
    have: number;
    of: number;
    suggest: string;
}[] {
    return PART_IDS.map((id) => ({ part: id, have: all.filter((p) => p[id]?.trim()).length, of: all.length, suggest: PART_INFO[id].suggest }));
}
