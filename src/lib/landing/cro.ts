export interface Funnel {
    sessions: number;
    orders: number;
    netSales: number;
    shipping: number;
    margin: number;
}
export interface Honest {
    cvr: number;
    aov: number;
    aovShopify: number;
    rpv: number;
    cpv: number;
}
export function honest(f: Funnel): Honest {
    const cvr = f.sessions > 0 ? f.orders / f.sessions : 0;
    const revenue = f.netSales + f.shipping;
    const aov = f.orders > 0 ? revenue / f.orders : 0;
    const rpv = f.sessions > 0 ? revenue / f.sessions : 0;
    return { cvr, aov, aovShopify: f.orders > 0 ? f.netSales / f.orders : 0, rpv, cpv: rpv * f.margin };
}
export const blended = (coldShare: number, coldCvr: number, warmCvr: number) => coldShare * coldCvr + (1 - coldShare) * warmCvr;
export const cac = (spend: number, sessions: number, cvr: number) => (sessions * cvr > 0 ? spend / (sessions * cvr) : Infinity);
export interface TestPlan {
    perVariant: number;
    ordersPerVariant: number;
    total: number;
    weeks: number;
    absolute: number;
}
export function testPlan(baseline: number, mdeRelative: number, arms: number, weeklySessions: number): TestPlan {
    const p = Math.min(0.99, Math.max(0.0001, baseline));
    const delta = p * Math.max(0.001, mdeRelative);
    const perVariant = Math.ceil((16 * p * (1 - p)) / (delta * delta));
    const total = perVariant * Math.max(2, arms);
    const weeks = weeklySessions > 0 ? Math.max(2, Math.ceil(total / weeklySessions)) : Infinity;
    return { perVariant, ordersPerVariant: Math.round(perVariant * p), total, weeks, absolute: delta };
}
export function testingBand(monthlyOrders: number): {
    band: string;
    can: string;
    cannot: string;
} {
    if (monthlyOrders < 30)
        return { band: "Under 30 orders a month", can: "Research and repairs only: recordings, heatmaps, surveys, review mining. Ship clarity fixes and proven practice without a test.", cannot: "Any A/B test with a statistical claim. Even a 30% lift needs about 120 orders an arm." };
    if (monthlyOrders < 300)
        return { band: "30 to 300 orders a month", can: "1 bold A/B test at a time on the page with the most traffic, aimed at a 20% or bigger lift, 2 to 4 weeks, the sample fixed in advance.", cannot: "Small tweaks, tests with 3 or more arms, revenue per visitor as the main metric." };
    if (monthlyOrders < 3000)
        return { band: "300 to 3,000 orders a month", can: "Regular A/B tests aimed at 10 to 20% lifts on high-traffic pages, conversion rate as the main metric with order value, margin and returns as guardrails, at least 2 weeks.", cannot: "Lifts under 5%." };
    if (monthlyOrders < 20000)
        return { band: "3,000 to 20,000 orders a month", can: "Tests with several arms, revenue per visitor (capped for outliers) as the main metric, 5 to 10% lifts on hero pages.", cannot: "Lifts under 2 to 3% without long runs." };
    return { band: "Over 20,000 orders a month", can: "A full programme: 2 to 5% lifts, revenue and gross profit as main metrics, holdouts for surprising winners.", cannot: "Little; watch for tests that overlap on the same page." };
}
export const ABANDONMENT = [
    { id: "costs", share: 0.39, reason: "Extra costs too high (shipping, tax, fees)", check: "Everything added at checkout is under 10% of the average order", fix: "Fold costs into the price or set a free-shipping threshold just above the most common cart value; show the full price on the page" },
    { id: "slow", share: 0.21, reason: "Delivery too slow", check: "Delivery time is fast, or a fast option is offered", fix: "Offer an express option; test showing and hiding slow delivery dates" },
    { id: "trust", share: 0.19, reason: "Did not trust the site with card details", check: "Proof and a known payment method are near the payment step", fix: "Shop Pay, Apple Pay and Google Pay; real reviews; a site that does not look like a scam" },
    { id: "account", share: 0.19, reason: "Forced to create an account", check: "Guest checkout is on", fix: "Turn on guest checkout" },
    { id: "long", share: 0.18, reason: "Checkout too long", check: "1 page, fewest fields, express pay at the top", fix: "Remove optional fields; put express checkout first" },
    { id: "returns", share: 0.15, reason: "Not happy with the returns policy", check: "The returns policy is stated near the button", fix: "State it plainly; do not make it so generous it hurts margin" },
    { id: "total", share: 0.14, reason: "Total cost not shown up front", check: "The price on the page is the price at checkout", fix: "No monthly price for a quarterly-only plan; no surprises in the cart" },
] as const;
export const SHOPIFY_SETTINGS = [
    { group: "Checkout", items: ["Guest checkout on (no account required)", "Shop Pay on", "Apple Pay and Google Pay on", "Express checkout at the top of checkout", "Tipping off (unless food or a service)", "Gift card auto-fulfil on"] },
    { group: "Shipping and pricing", items: ["Shipping rates shown on product pages", "Free-shipping threshold shown sitewide", "Return policy on product pages"] },
    { group: "Speed", items: ["Unused apps removed", "Images compressed", "Theme speed score above 50"] },
    { group: "After the purchase", items: ["Thank-you page has an upsell or cross-sell", "Post-purchase survey on", "Referral offer on the confirmation page"] },
] as const;
