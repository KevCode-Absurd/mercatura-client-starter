import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { AGE_BANDS, BAND_RANGE, ageRange, between, genderWeight, genderWord, overlap, rng, round, seedOf } from "../audience";
import { loadBrandBrain } from "../brands";
import { loadSegments, type Performance } from "../personas/performance";
import { listPersonas } from "../personas/store";
import type { PersonaProfile } from "../personas/types";
import type { AdInsights, AdOrigin, AdSnapshot } from "./types";
export interface AdListing extends AdSnapshot {
    segment: string | null;
    at: string;
}
export { AGE_BANDS, ageRange, rng };
type Seg = Performance["segments"][number];
const STANDIN: Seg = { id: "seg_standin", label: "All buyers", age: "25 to 54", gender: "all", marker: "", spend: 20000, purchases: 500, revenue: 30000, top_product: "", top_offer: "", top_angle: "", top_hooks: [], cpa: 40, roas: 1.5, aov: 60, spend_share: 1 };
export function simulateInsights(adId: string, seg: Seg, perf: Pick<Performance, "period" | "simulated"> | null, video: boolean, brandRoas: number): AdInsights {
    const r = rng(adId);
    const spend = round(seg.spend * between(r, 0.06, 0.3), 0);
    const cpa = seg.cpa * between(r, 0.72, 1.4);
    const purchases = Math.max(1, Math.round(spend / cpa));
    const aov = seg.aov * between(r, 0.92, 1.1);
    const revenue = purchases * aov;
    const cpm = between(r, 9, 22);
    const impressions = Math.round((spend / cpm) * 1000);
    const ctr = between(r, 0.008, 0.026);
    const clicks = Math.max(1, Math.round(impressions * ctr));
    const lp_views = Math.max(1, Math.round(clicks * between(r, 0.7, 0.86)));
    const range = ageRange(seg.age) ?? [25, 54];
    const cells = AGE_BANDS.flatMap((band) => (["women", "men"] as const).map((g) => {
        const fit = overlap(BAND_RANGE[band], range) * genderWeight(seg.gender, g);
        const reach = 0.05 + fit * between(r, 0.9, 1.6);
        const eff = 0.45 + fit * between(r, 0.8, 1.5) + between(r, -0.08, 0.08);
        return { age: band, gender: g, reach, eff };
    }));
    const totalReach = cells.reduce((a, c) => a + c.reach, 0);
    const effWeighted = cells.reduce((a, c) => a + (c.reach / totalReach) * c.eff, 0);
    const breakdown = cells
        .map((c) => {
        const cs = spend * (c.reach / totalReach);
        const cp = purchases * (c.reach / totalReach) * (c.eff / effWeighted);
        return { age: c.age, gender: c.gender, spend: round(cs, 0), purchases: round(cp, 0), roas: cs ? round((cp * aov) / cs) : 0, cpa: cp >= 0.5 ? round(cs / cp) : 0 };
    })
        .sort((a, b) => b.roas - a.roas);
    const big = breakdown.filter((b) => b.spend >= spend * 0.05);
    const top = big[0] ?? breakdown[0];
    const roas = round(revenue / spend);
    return {
        simulated: perf?.simulated ?? true,
        period: perf?.period ?? "the last 90 days",
        spend,
        impressions,
        ctr: round(ctr, 4),
        cpc: round(spend / clicks),
        hook_rate: video ? round(between(r, 0.2, 0.46), 3) : null,
        lp_views,
        cvr: round(purchases / lp_views, 4),
        purchases,
        cpa: round(spend / purchases),
        roas,
        aov: round(aov),
        breakdown,
        best: { label: `${genderWord(top.gender)} ${top.age.replace("-", " to ").replace("+", " and over")}`, age: top.age, gender: top.gender, why: `Return of ${top.roas.toFixed(2)} on ${Math.round((top.spend / spend) * 100)}% of the spend, against ${roas.toFixed(2)} for the ad as a whole.` },
        verdict: roas >= brandRoas * 1.15 ? "scale" : roas >= brandRoas * 0.85 ? "watch" : "cut",
    };
}
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3));
const sharedWords = (a: string, b: string) => {
    const wb = words(b);
    return [...words(a)].filter((w) => wb.has(w)).length;
};
export function segmentFor(adId: string, persona: PersonaProfile | undefined, angle: string, perf: Performance | null): Seg {
    const segs = perf?.segments ?? [];
    if (!segs.length)
        return persona?.who.age ? { ...STANDIN, id: `seg_${persona.id}`, label: persona.name, age: persona.who.age, gender: persona.who.gender || "all" } : STANDIN;
    const byPersona = persona?.performance?.segment ? segs.find((s) => s.label === persona.performance!.segment) : undefined;
    if (byPersona)
        return byPersona;
    const scored = segs.map((s) => ({ s, n: sharedWords(`${s.top_angle} ${s.marker} ${s.label}`, angle) })).sort((a, b) => b.n - a.n);
    if (scored[0]?.n >= 2)
        return scored[0].s;
    return segs[seedOf(adId) % segs.length];
}
const brandRoasOf = (perf: Performance | null) => {
    const segs = perf?.segments ?? [];
    const spend = segs.reduce((a, s) => a + s.spend, 0);
    return spend ? segs.reduce((a, s) => a + s.revenue, 0) / spend : STANDIN.roas;
};
export function loadAdInsights(brandId: string, adId: string): AdInsights | null {
    return getAd(brandId, adId)?.insights ?? null;
}
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
export function listAds(brandId: string): AdListing[] {
    const perf = loadSegments(brandId);
    const brandRoas = brandRoasOf(perf);
    const personas = listPersonas(brandId);
    const personaOf = (id: string | null | undefined) => (id ? personas.find((p) => p.id === id) : undefined);
    let brandName = "";
    let knownOfferIds: string[] = [];
    try {
        const brain = loadBrandBrain(brandId);
        brandName = brain.brand.name;
        knownOfferIds = brain.offers.map(o => o.id);
    }
    catch {
    }
    const out: AdListing[] = [];
    const add = (a: Omit<AdListing, "insights" | "segment">) => {
        const persona = personaOf(a.persona_id);
        const seg = segmentFor(a.id, persona, `${a.angle} ${a.headline}`, perf);
        out.push({ ...a, segment: perf?.segments.some((s) => s.label === seg.label) ? seg.label : null, insights: simulateInsights(a.id, seg, perf, a.origin === "script", brandRoas) });
    };
    const sets = db.select().from(schema.studioRuns).where(and(eq(schema.studioRuns.brand_id, brandId), eq(schema.studioRuns.kind, "ad"))).all();
    for (const set of sets) {
        for (const item of set.items) {
            const plan = item.plan;
            if (!plan)
                continue;
            const headline = plan.ad_copy?.headline || plan.text_elements.find((t) => t.role === "headline")?.text || plan.title;
            const persona = personas.find((p) => p.id === plan.buyer || p.name === plan.buyer);
            add({
                id: `studio:${set.id}:${item.id}`,
                origin: "studio",
                title: `${set.title}: ${plan.title}`,
                headline,
                primary_text: plan.ad_copy?.primary_text ?? "",
                hooks: plan.text_elements.filter((t) => t.role === "headline" || t.role === "subhead").map((t) => t.text).slice(0, 3),
                angle: plan.argument,
                persona_id: persona?.id ?? null,
                awareness: plan.awareness || persona?.awareness || "problem_aware",
                product_id: set.product_id,
                offer_id: !set.context?.no_offer && knownOfferIds.includes(set.notes.match(/The offer these state, exactly as given: ([^,]+),/)?.[1] || "") ? set.notes.match(/The offer these state, exactly as given: ([^,]+),/)![1] : null,
                image: item.outputs[0]?.path ?? null,
                at: set.created_at,
            });
        }
    }
    const concepts = new Map(db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().map((c) => [c.id, c]));
    for (const s of db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all()) {
        const c = concepts.get(s.concept_id);
        const hooks = s.hook_variants.map((h) => h.text).filter(Boolean);
        add({
            id: `script:${s.id}`,
            origin: "script",
            title: s.title,
            headline: hooks[0] ?? s.lines[0]?.text ?? s.title,
            primary_text: s.lines.slice(0, 4).map((l) => l.text).join(" "),
            hooks: hooks.slice(0, 5),
            angle: c?.angle ?? "",
            persona_id: c?.persona_id ?? null,
            awareness: s.awareness_stage,
            product_id: null,
            offer_id: c?.offer_id ?? null,
            image: null,
            at: s.created_at,
        });
    }
    for (const seg of perf?.segments ?? []) {
        const persona = personas.find((p) => p.performance?.segment === seg.label);
        seg.top_hooks.slice(0, 2).forEach((hook, i) => {
            add({
                id: `account:${seg.id}:${i + 1}`,
                origin: "account",
                title: `${brandName ? `${brandName}: ` : ""}${clip(hook, 60)}`,
                headline: hook,
                primary_text: seg.top_angle,
                hooks: [hook],
                angle: seg.top_angle,
                persona_id: persona?.id ?? null,
                awareness: persona?.awareness ?? "problem_aware",
                product_id: seg.top_product || null,
                offer_id: seg.top_offer || null,
                image: null,
                at: "",
            });
        });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
}
export const getAd = (brandId: string, id: string) => listAds(brandId).find((a) => a.id === id);
export const snapshotOf = (a: AdListing): AdSnapshot => ({ id: a.id, origin: a.origin, title: a.title, headline: a.headline, primary_text: a.primary_text, hooks: a.hooks, angle: a.angle, persona_id: a.persona_id, awareness: a.awareness, product_id: a.product_id, offer_id: a.offer_id, image: a.image, insights: a.insights });
export type { AdOrigin };
