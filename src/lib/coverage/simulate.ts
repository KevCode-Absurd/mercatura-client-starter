import { AGE_BANDS, GENDERS, between, rng, round, spread } from "../audience";
import { AWARENESS_INFO, AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { COVERAGE_FORMATS, coverageFormat, type AccountAd, type AccountRead, type AudienceCell, type CoveragePersona } from "./model";
export interface SimInput {
    seed: string;
    currency: string;
    marketStage: number;
    personas: CoveragePersona[];
    offers: {
        id: string;
        name: string;
    }[];
    totals?: {
        spend: number;
        revenue: number;
        purchases: number;
        period: string;
    };
}
function pick<T>(r: () => number, items: [
    T,
    number
][]): T {
    const total = items.reduce((a, [, w]) => a + w, 0);
    let at = r() * total;
    for (const [v, w] of items) {
        at -= w;
        if (at <= 0)
            return v;
    }
    return items[items.length - 1][0];
}
const STAGE_SHARE: Record<AwarenessStage, number> = { unaware: 0.02, problem_aware: 0.11, solution_aware: 0.22, product_aware: 0.36, most_aware: 0.29 };
const STAGE_RETURN: Record<AwarenessStage, number> = { unaware: 0.6, problem_aware: 0.8, solution_aware: 0.95, product_aware: 1.15, most_aware: 1.35 };
const USUAL_FORMATS: [
    string,
    number
][] = [["static", 0.38], ["ugc", 0.28], ["carousel", 0.12], ["founder", 0.06], ["native", 0.05], ["edited", 0.04], ["long-copy", 0.03]];
const WILD_FORMATS = ["podcast", "claymation", "satisfying", "comic"];
export function simulateAccount(i: SimInput): AccountRead {
    const r = rng(`account:${i.seed}`);
    const count = 36 + Math.floor(r() * 10);
    const spendTotal = i.totals?.spend ?? Math.round(between(r, 60000, 120000));
    const baseRoas = i.totals && i.totals.spend ? i.totals.revenue / i.totals.spend : between(r, 1.4, 2.3);
    const aov = i.totals && i.totals.purchases ? i.totals.revenue / i.totals.purchases : between(r, 38, 70);
    const silent = i.personas.length >= 7 ? 2 : i.personas.length >= 4 ? 1 : 0;
    const personas: [
        CoveragePersona,
        number
    ][] = i.personas.map((p, k) => [p, k >= i.personas.length - silent ? 0 : 1 / (k + 1) ** 1.3]);
    const stages: [
        AwarenessStage,
        number
    ][] = AWARENESS_STAGES.map((s) => [s, STAGE_SHARE[s] * between(r, 0.8, 1.2)]);
    const formats: [
        string,
        number
    ][] = [...USUAL_FORMATS.map(([f, w]) => [f, w * between(r, 0.8, 1.2)] as [
            string,
            number
        ]), [WILD_FORMATS[Math.floor(r() * WILD_FORMATS.length)], 0.04]];
    const m = i.marketStage;
    const argues: [
        number,
        number
    ][] = ([[m - 1, 0.22], [m, 0.55], [m + 1, 0.2], [m + 2, 0.03]] as [
        number,
        number
    ][]).filter(([s]) => s >= 1 && s <= 5);
    const offers: [
        string | null,
        number
    ][] = i.offers.length ? i.offers.slice(0, 3).map((o, k) => [o.id, [0.6, 0.3, 0.1][k]]) : [[null, 1]];
    const raw = Array.from({ length: count }, (_, k) => {
        const persona = personas.length ? pick(r, personas) : null;
        const awareness = pick(r, stages);
        const hooks = persona?.hooks ?? [];
        return {
            k,
            persona,
            awareness,
            format: pick(r, formats),
            sophistication: pick(r, argues),
            offer_id: pick(r, offers),
            hook: hooks.length ? hooks[Math.floor(r() * hooks.length)] : "",
            weight: Math.exp(between(r, -1.1, 1.1)),
            ret: STAGE_RETURN[awareness] * between(r, 0.6, 1.4),
            days: Math.round(between(r, 5, 80)),
            active: r() < 0.8,
        };
    });
    const winners = new Set<number>();
    const above = raw.find((a) => a.sophistication > m);
    const cold = raw.find((a) => a.awareness === "problem_aware" && a !== above);
    for (const a of [above, cold])
        if (a)
            winners.add(a.k);
    while (winners.size < Math.min(4, raw.length))
        winners.add(Math.floor(r() * raw.length));
    for (const a of raw) {
        if (!winners.has(a.k))
            continue;
        a.weight *= 2.2;
        a.ret = Math.max(a.ret, 1) * between(r, 1.6, 2.1);
        a.active = true;
        a.days = Math.max(a.days, 30);
    }
    const video = raw.filter((a) => coverageFormat(a.format)?.medium === "video");
    const watch = new Map<number, {
        hook: number;
        hold: number;
    }>(video.map((a) => [a.k, { hook: round(between(r, 0.18, 0.34), 2), hold: round(between(r, 0.13, 0.27), 2) }]));
    const fixable = video.filter((a) => !winners.has(a.k));
    if (fixable[0]) {
        watch.set(fixable[0].k, { hook: 0.14, hold: 0.31 });
        fixable[0].active = true;
        fixable[0].weight = Math.max(fixable[0].weight, 1.2);
    }
    if (fixable[1]) {
        watch.set(fixable[1].k, { hook: 0.36, hold: 0.11 });
        fixable[1].active = true;
        fixable[1].weight = Math.max(fixable[1].weight, 1.2);
    }
    const weightTotal = raw.reduce((s, a) => s + a.weight, 0) || 1;
    const ads: AccountAd[] = raw.map((a) => {
        const spend = Math.round((a.weight / weightTotal) * spendTotal);
        const revenue = Math.round(spend * baseRoas * a.ret);
        const format = coverageFormat(a.format) ?? COVERAGE_FORMATS[0];
        return {
            id: `ad_${String(a.k + 1).padStart(3, "0")}`,
            name: [format.label, a.persona?.name, AWARENESS_INFO[a.awareness].label].filter(Boolean).join(" · "),
            format: format.id,
            awareness: a.awareness,
            sophistication: a.sophistication,
            persona_id: a.persona?.id ?? null,
            offer_id: a.offer_id,
            angle: a.persona?.angle ?? "",
            hook: a.hook,
            spend,
            purchases: Math.max(0, Math.round(revenue / aov)),
            revenue,
            days: a.days,
            status: a.active ? "active" : "paused",
            ...(watch.has(a.k) ? { hook_rate: watch.get(a.k)!.hook, hold_rate: watch.get(a.k)!.hold } : {}),
        };
    });
    const LEAK = 0.15;
    const cells = new Map<string, AudienceCell>(AGE_BANDS.flatMap((age) => GENDERS.map((gender) => [`${age}|${gender}`, { age, gender, spend: 0, purchases: 0, revenue: 0, buyers_share: 0 }] as [
        string,
        AudienceCell
    ])));
    const everyone = spread("", "");
    const byId = new Map(i.personas.map((p) => [p.id, p]));
    for (const ad of ads) {
        const p = ad.persona_id ? byId.get(ad.persona_id) : undefined;
        const own = p ? spread(p.age, p.gender) : everyone;
        own.forEach((c, k) => {
            const cell = cells.get(`${c.age}|${c.gender}`)!;
            const share = c.weight * (1 - LEAK) + everyone[k].weight * LEAK;
            cell.spend += ad.spend * share;
            cell.revenue += ad.revenue * share;
            cell.purchases += ad.purchases * share;
        });
    }
    const buyers = new Map<string, number>();
    i.personas.forEach((p, k) => {
        const weight = p.share ?? 100 / (k + 1) ** 0.6;
        for (const c of spread(p.age, p.gender))
            buyers.set(`${c.age}|${c.gender}`, (buyers.get(`${c.age}|${c.gender}`) ?? 0) + weight * c.weight);
    });
    const buyersTotal = [...buyers.values()].reduce((a, b) => a + b, 0) || 1;
    const audience = [...cells.entries()].map(([key, c]) => ({ ...c, spend: Math.round(c.spend), revenue: Math.round(c.revenue), purchases: Math.round(c.purchases), buyers_share: round((buyers.get(key) ?? 0) / buyersTotal, 3) }));
    return {
        simulated: true,
        period: i.totals?.period ?? "The last 90 days",
        source: "Simulated. Made up by the app from this brand's personas and offers, to stand in for the ad account and the store until they are connected. No figure here is the brand's real performance.",
        currency: i.currency,
        market: { stage: m, basis: "The stage the brand brain holds. Competitors' ads have not been read to check it." },
        audience,
        ads,
    };
}
