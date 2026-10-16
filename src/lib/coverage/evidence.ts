import { z } from "zod";
const count = z.number().finite().nonnegative();
const WindowSchema = z.object({
    entity_id: z.string().min(1), start: z.iso.date(), end: z.iso.date(), settled: z.boolean(),
    spend: count, impressions: count.optional(), clicks: count.optional(), purchases: count.optional(),
    revenue: count.optional(), reach: count.optional(),
}).strict().refine(row => row.start <= row.end, "The window end must follow its start.");
export const PerformanceEvidenceSchema = z.object({
    source: z.string().trim().min(1), currency: z.string().min(1), attribution: z.string().trim().min(1),
    click_definition: z.string().trim().min(1), conversion_definition: z.string().trim().min(1),
    windows: z.array(WindowSchema).max(10000),
    thresholds: z.object({
        ctr_decline: z.number().min(0).max(1).optional(),
        purchase_per_click_decline: z.number().min(0).max(1).optional(),
        cpm_increase: z.number().min(0).optional(),
    }).strict().optional(),
}).strict();
export type PerformanceEvidence = z.infer<typeof PerformanceEvidenceSchema>;
type Window = z.infer<typeof WindowSchema>;
export type WindowMetrics = {
    ctr: number | null;
    cpm: number | null;
    purchase_per_click: number | null;
    cpa: number | null;
    roas: number | null;
    frequency: number | null;
};
export interface EvidenceFinding {
    entity_id: string;
    title: string;
    observation: string;
    evidence: string[];
    hypotheses: string[];
    verify_next: string;
    proposed_action: string;
}
export interface EvidenceReview {
    status: "simulated" | "export" | "unavailable";
    source: string;
    comparisons: {
        entity_id: string;
        baseline: WindowMetrics;
        current: WindowMetrics;
        periods: string[];
    }[];
    findings: EvidenceFinding[];
    missing: string[];
    creative: {
        tagged: number;
        total: number;
        formats: Record<string, number>;
        concepts: Record<string, number>;
        visuals: Record<string, number>;
        repeated: string[][];
    };
}
export function safeRatio(numerator: number | undefined, denominator: number | undefined, scale = 1): number | null {
    return numerator != null && denominator != null && Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator * scale : null;
}
export function windowMetrics(row: Window): WindowMetrics {
    return { ctr: safeRatio(row.clicks, row.impressions), cpm: safeRatio(row.spend, row.impressions, 1000), purchase_per_click: safeRatio(row.purchases, row.clicks), cpa: safeRatio(row.spend, row.purchases), roas: safeRatio(row.revenue, row.spend), frequency: safeRatio(row.impressions, row.reach) };
}
const change = (current: number | null, baseline: number | null): number | null => current !== null && baseline !== null && baseline > 0 ? current / baseline - 1 : null;
const days = (row: Window) => (Date.parse(row.end) - Date.parse(row.start)) / 86400000 + 1;
const tally = (values: string[]) => values.reduce<Record<string, number>>((out, value) => { out[value] = (out[value] ?? 0) + 1; return out; }, {});
interface EvidenceAccount {
    simulated: boolean;
    currency: string;
    performance_evidence?: PerformanceEvidence;
    ads: {
        id: string;
        format: string;
        status: string;
        creative_tags?: {
            concept?: string;
            visual?: string;
            hook_type?: string;
        };
    }[];
}
export function reviewPerformanceEvidence(account: EvidenceAccount): EvidenceReview {
    const active = account.ads.filter(ad => ad.status === "active");
    const groups = new Map<string, string[]>();
    for (const ad of active)
        if (ad.creative_tags?.concept && ad.creative_tags.visual && ad.creative_tags.hook_type) {
            const key = [ad.format, ad.creative_tags.concept, ad.creative_tags.visual, ad.creative_tags.hook_type].join("|");
            groups.set(key, [...(groups.get(key) ?? []), ad.id]);
        }
    const review: EvidenceReview = {
        status: account.simulated ? "simulated" : account.performance_evidence ? "export" : "unavailable",
        source: account.performance_evidence?.source ?? "No comparable period export supplied.",
        comparisons: [], findings: [], missing: [],
        creative: { tagged: active.filter(ad => !!ad.creative_tags?.concept).length, total: active.length, formats: tally(active.map(ad => ad.format)), concepts: tally(active.flatMap(ad => ad.creative_tags?.concept ? [ad.creative_tags.concept] : [])), visuals: tally(active.flatMap(ad => ad.creative_tags?.visual ? [ad.creative_tags.visual] : [])), repeated: [...groups.values()].filter(ids => ids.length > 1) },
    };
    const evidence = account.performance_evidence;
    if (!evidence) {
        review.missing.push("Provide same-length, settled baseline/current period totals with source, currency, attribution and metric definitions to diagnose change.");
        return review;
    }
    const parsed = PerformanceEvidenceSchema.safeParse(evidence);
    if (!parsed.success) {
        review.missing.push(`Invalid performance evidence: ${parsed.error.issues[0]?.message}`);
        return review;
    }
    if (evidence.currency !== account.currency) {
        review.missing.push("Performance evidence currency differs from the account; convert explicitly before comparing.");
        return review;
    }
    const ids = new Set(account.ads.map(ad => ad.id));
    const windows = new Map<string, Window[]>();
    for (const row of evidence.windows) {
        if (!ids.has(row.entity_id)) {
            review.missing.push(`Unknown account ad in performance evidence: ${row.entity_id}`);
            continue;
        }
        windows.set(row.entity_id, [...(windows.get(row.entity_id) ?? []), row]);
    }
    if (!evidence.thresholds || !Object.keys(evidence.thresholds).length)
        review.missing.push("No business change thresholds supplied; comparisons remain descriptive.");
    for (const [id, rows] of windows) {
        if (rows.length !== 2) {
            review.missing.push(`${id}: provide exactly two comparable period totals.`);
            continue;
        }
        const [before, after] = [...rows].sort((a, b) => a.start.localeCompare(b.start));
        if (!before.settled || !after.settled || before.end >= after.start || days(before) !== days(after)) {
            review.missing.push(`${id}: windows must be settled, non-overlapping and the same length.`);
            continue;
        }
        if (rows.some(row => (row.clicks !== undefined && row.impressions !== undefined && row.clicks > row.impressions) || (row.reach !== undefined && row.impressions !== undefined && row.reach > row.impressions))) {
            review.missing.push(`${id}: click/reach totals exceed impressions; verify metric definitions before diagnosing.`);
            continue;
        }
        const baseline = windowMetrics(before), current = windowMetrics(after);
        const periods = [`${before.start} to ${before.end}`, `${after.start} to ${after.end}`];
        review.comparisons.push({ entity_id: id, baseline, current, periods });
        const evidenceIds = [evidence.source, ...periods, evidence.attribution, evidence.click_definition, evidence.conversion_definition];
        const finding = (title: string, observation: string, hypotheses: string[], verify_next: string, proposed_action: string) => review.findings.push({ entity_id: id, title, observation, evidence: evidenceIds, hypotheses, verify_next, proposed_action });
        if (before.purchases != null && before.purchases > 0 && after.purchases === 0 && (after.clicks ?? 0) > 0)
            finding("Clicks recorded without purchases", `${after.clicks} clicks and zero reported purchases in the current period, compared with ${before.purchases} purchases before.`, ["Reporting or event delivery changed", "The page, offer, stock or checkout lost conversions", "Variation in a limited sample"], "Verify event delivery/value and reporting lag, then test the ad-to-checkout path.", "Investigate measurement and the post-click journey before changing the creative or budget.");
        const ctrChange = change(current.ctr, baseline.ctr);
        if (ctrChange !== null && ctrChange < 0 && evidence.thresholds?.ctr_decline !== undefined && ctrChange <= -evidence.thresholds.ctr_decline)
            finding("Click response declined", `CTR fell ${Math.round(-ctrChange * 100)}% against the supplied ${Math.round(evidence.thresholds.ctr_decline * 100)}% decline threshold.`, ["Creative repetition", "Audience/placement or auction mix changed", "Short-term variation"], "Compare exposure, audience/placement mix and the dated change log.", "Design a matched opening or visual test once the competing causes are checked.");
        const cvrChange = change(current.purchase_per_click, baseline.purchase_per_click);
        if (cvrChange !== null && cvrChange < 0 && evidence.thresholds?.purchase_per_click_decline !== undefined && cvrChange <= -evidence.thresholds.purchase_per_click_decline)
            finding("Purchases per click declined", `Purchases per click fell ${Math.round(-cvrChange * 100)}% against the supplied ${Math.round(evidence.thresholds.purchase_per_click_decline * 100)}% decline threshold.`, ["Message/price/offer mismatch", "Stock or checkout friction", "Attribution/event differences"], "Check click/conversion definitions and inspect the destination's offer, stock and checkout.", "Review the landing page against this ad's exact promise and offer.");
        const cpmChange = change(current.cpm, baseline.cpm);
        if (cpmChange !== null && cpmChange > 0 && evidence.thresholds?.cpm_increase !== undefined && cpmChange >= evidence.thresholds.cpm_increase)
            finding("Impression cost increased", `CPM rose ${Math.round(cpmChange * 100)}% against the supplied ${Math.round(evidence.thresholds.cpm_increase * 100)}% increase threshold.`, ["Auction competition", "Placement or audience mix", "Exposure/saturation change"], "Compare other campaigns and the same placement/audience before attributing cause.", "Monitor output efficiency and investigate; CPM alone does not justify pausing a profitable ad.");
    }
    return review;
}
