import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadAccount } from "@/lib/coverage/account";
import { loadEconomics } from "@/lib/offers/data";
const round2 = (n: number) => Math.round(n * 100) / 100;
const tally = (rows: {
    k: string | null;
    n: number;
}[]) => Object.fromEntries(rows.map((r) => [r.k ?? "none", r.n]));
export interface LearningSignals {
    data: Record<string, unknown>;
    sample: string[];
}
export function learningSignals(brandId: string): LearningSignals {
    const data: Record<string, unknown> = {};
    const sample: string[] = [];
    try {
        const a = loadAccount(brandId);
        type Ad = (typeof a.ads)[number];
        const total = (rows: Ad[], k: "spend" | "revenue" | "purchases") => rows.reduce((n, x) => n + x[k], 0);
        const cut = (key: (x: Ad) => string) => Object.entries(a.ads.reduce<Record<string, Ad[]>>((g, x) => ({ ...g, [key(x)]: [...(g[key(x)] ?? []), x] }), {}))
            .map(([name, rows]) => ({ name, ads: rows.length, spend: Math.round(total(rows, "spend")), returnOnAdSpend: round2(total(rows, "revenue") / Math.max(1, total(rows, "spend"))) }))
            .sort((x, y) => y.spend - x.spend);
        const one = (x: Ad) => ({ name: x.name, format: x.format, buyerStage: x.awareness, angle: x.angle, hook: x.hook, spend: Math.round(x.spend), returnOnAdSpend: round2(x.revenue / Math.max(1, x.spend)), daysRunning: x.days, status: x.status, ...(x.hook_rate != null ? { hookRate: x.hook_rate } : {}), ...(x.hold_rate != null ? { holdRate: x.hold_rate } : {}) });
        const ranked = a.ads.filter((x) => x.spend > 0).sort((x, y) => y.revenue / y.spend - x.revenue / x.spend);
        data.adAccount = {
            period: a.period,
            currency: a.currency,
            spend: Math.round(total(a.ads, "spend")),
            revenue: Math.round(total(a.ads, "revenue")),
            purchases: Math.round(total(a.ads, "purchases")),
            returnOnAdSpend: round2(total(a.ads, "revenue") / Math.max(1, total(a.ads, "spend"))),
            adsRunning: a.ads.filter((x) => x.status === "active").length,
            byFormat: cut((x) => x.format),
            byBuyerStage: cut((x) => x.awareness),
            strongestAds: ranked.slice(0, 3).map(one),
            weakestAds: ranked.slice(-3).map(one),
            whoBuys: [...a.audience].sort((x, y) => y.spend - x.spend).slice(0, 4).map((s) => ({ age: s.age, gender: s.gender, spend: Math.round(s.spend), shareOfBuyers: s.buyers_share, returnOnAdSpend: round2(s.revenue / Math.max(1, s.spend)) })),
        };
        if (a.simulated)
            sample.push("ad results");
    }
    catch {
    }
    try {
        const e = loadEconomics(brandId);
        if (e) {
            data.sales = {
                period: e.period,
                currency: e.currency,
                unitCosts: e.products,
                shippingByUnitsInAnOrder: e.shipping,
                paymentFeeRate: e.fee_rate,
                firstOrderReturnOnAdSpend: e.roas,
                shareStillOrderingByMonth: e.retention,
                revenueMixByProduct: e.mix,
                orderValues: e.order_values,
                pastDiscounts: e.discount_history,
                storeAlreadyHas: e.has,
            };
            if (e.simulated)
                sample.push(e.costs_entered ? "repeat orders and order values" : "costs, repeat orders and order values");
        }
    }
    catch {
    }
    try {
        const n = sql<number> `count(*)`;
        const { sourceItems, insights, scripts, outputJobs } = schema;
        data.madeInTheApp = {
            customerSourcesRead: tally(db.select({ k: sourceItems.source_type, n }).from(sourceItems).where(eq(sourceItems.brand_id, brandId)).groupBy(sourceItems.source_type).all()),
            insightsFound: db.select({ n }).from(insights).where(eq(insights.brand_id, brandId)).get()?.n ?? 0,
            scriptsByBuyerStage: tally(db.select({ k: scripts.awareness_stage, n }).from(scripts).where(eq(scripts.brand_id, brandId)).groupBy(scripts.awareness_stage).all()),
            piecesByFormat: tally(db.select({ k: outputJobs.output_type, n }).from(outputJobs).where(eq(outputJobs.brand_id, brandId)).groupBy(outputJobs.output_type).all()),
            piecesByState: tally(db.select({ k: outputJobs.status, n }).from(outputJobs).where(eq(outputJobs.brand_id, brandId)).groupBy(outputJobs.status).all()),
        };
    }
    catch {
    }
    return { data, sample };
}
