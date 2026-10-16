import { OUTPUT_TYPES, type OutputType } from "./taxonomy";
export interface PlannerInput {
    monthly_spend: number;
    monthly_new_customer_revenue_target: number;
    avg_lifetime_spend_per_ad: number;
    avg_roas_7d_click: number;
    gross_margin: number;
    cost_per_ad: Record<OutputType, number>;
}
export type SpendTier = "starter" | "growth" | "scale";
export function spendTier(spend: number): SpendTier {
    if (spend < 30000)
        return "starter";
    if (spend <= 100000)
        return "growth";
    return "scale";
}
export const TIER_INFO: Record<SpendTier, {
    label: string;
    budgetRule: string;
    concepts: string;
    conceptsMin: number;
    conceptsMax: number;
}> = {
    starter: { label: "4k to 30k a month", budgetRule: "the founder's time, not money", concepts: "3", conceptsMin: 3, conceptsMax: 3 },
    growth: { label: "30k to 100k a month", budgetRule: "25% of your ad spend", concepts: "5 to 6", conceptsMin: 5, conceptsMax: 6 },
    scale: { label: "100k or more a month", budgetRule: "at least 10% of your ad spend", concepts: "8 to 10", conceptsMin: 8, conceptsMax: 10 },
};
export function plan(i: PlannerInput) {
    const tier = spendTier(i.monthly_spend);
    const simpleRuleAds = Math.round(i.monthly_spend / 1000);
    const revenuePerAd = i.avg_lifetime_spend_per_ad * i.avg_roas_7d_click;
    const adsNeeded = revenuePerAd > 0 ? Math.ceil(i.monthly_new_customer_revenue_target / revenuePerAd) : null;
    const productionBudget = tier === "starter" ? 0 : tier === "growth" ? i.monthly_spend * 0.25 : i.monthly_spend * 0.1;
    const contributionPerAd = revenuePerAd * i.gross_margin - i.avg_lifetime_spend_per_ad;
    const formats = OUTPUT_TYPES.map((t) => {
        const cost = i.cost_per_ad[t] ?? 0;
        return { type: t, cost, net: contributionPerAd - cost, paysForItself: contributionPerAd > cost };
    });
    return { tier, simpleRuleAds, revenuePerAd, adsNeeded, productionBudget, contributionPerAd, formats };
}
export const EFFORT_TARGET = {
    replication: { min: 0.5, max: 0.6 },
    iteration: { min: 0.2, max: 0.3 },
    net_new: { min: 0.2, max: 0.3 },
};
