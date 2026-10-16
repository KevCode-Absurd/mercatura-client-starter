import type { Economics } from "@/lib/offers/economics";
export function usableEconomics(value: Economics | null) {
    if (!value)
        return null;
    const hasCosts = !value.simulated || value.costs_entered;
    const hasHistory = !value.simulated || value.history_entered;
    if (!hasCosts && !hasHistory)
        return null;
    return {
        period: value.period, currency: value.currency, evidenceNote: value.source,
        costs: hasCosts ? { products: value.products, shippingByOrderQuantity: value.shipping, paymentFeeRate: value.fee_rate, reportedFirstOrderRoas: value.roas } : null,
        pastPromotionResults: hasHistory ? value.discount_history : null,
        repeatPurchaseShares: !value.simulated ? value.retention : null,
        revenueMix: !value.simulated ? value.mix : null,
        orderValueDistribution: !value.simulated ? value.order_values : null,
        knownStoreCapabilities: !value.simulated ? value.has : null,
        interpretation: "User-entered figures for the stated period. Confirm freshness and cost definitions before using them as current targets; absent fields are unknown.",
    };
}
