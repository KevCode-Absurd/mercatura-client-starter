import { cellLabel } from "../audience";
import { FUNNEL_TARGET } from "../mix";
import { AWARENESS_INFO, AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { reviewPerformanceEvidence } from "./evidence";
import { ARGUES, BUYERS_FLOOR, COVERAGE_FORMATS, FIXES_SHOWN, FIX_SHARE, HOLD_STRONG, HOLD_WEAK, HOOK_STRONG, HOOK_WEAK, type Fix, THIN_ARGUE, THIN_SHARE, UNDERSERVED, WINNERS_SHOWN, WINNER_SHARE, WINNER_TIMES, type AccountAd, type Cell, type CellState, type Coverage, type CoverageInput, type Dimension, type Gap, type InWork, type Winner } from "./model";
export const STAGE_PEOPLE: Record<AwarenessStage, string> = {
    unaware: "don't know they have the problem",
    problem_aware: "know the problem and not that there is a fix",
    solution_aware: "are comparing kinds of solution",
    product_aware: "know the product and are not convinced",
    most_aware: "are ready to buy",
};
const COLD = new Set<AwarenessStage>(["unaware", "problem_aware"]);
export const pct = (n: number) => `${Math.round(n * 100)}%`;
const roasOf = (spend: number, revenue: number) => (spend > 0 ? Math.round((revenue / spend) * 100) / 100 : null);
function tally(ads: AccountAd[], total: number) {
    const spend = ads.reduce((a, x) => a + x.spend, 0);
    const revenue = ads.reduce((a, x) => a + x.revenue, 0);
    return { ads: ads.length, spend, revenue, spend_share: total > 0 ? spend / total : 0, roas: roasOf(spend, revenue) };
}
const stateOf = (ads: number, share: number, thin = THIN_SHARE): CellState => (ads === 0 ? "missing" : share < thin ? "thin" : "ok");
const eased = (weight: number, inWork: number) => weight / (1 + inWork * 0.5);
export function coverage(i: CoverageInput): Coverage {
    const ads = i.account.ads;
    const total = ads.reduce((a, x) => a + x.spend, 0);
    const revenue = ads.reduce((a, x) => a + x.revenue, 0);
    const accountRoas = roasOf(total, revenue);
    const active = ads.filter((a) => a.status === "active");
    const cold_share = active.length ? active.filter((a) => COLD.has(a.awareness)).length / active.length : null;
    const market = i.account.market.stage;
    const work = (test: (w: InWork) => boolean) => i.inWork.filter(test).length;
    const gaps: Gap[] = [];
    const gap = (dimension: Dimension, key: string, label: string, why: string, weight: number, inWork: number) => {
        if (weight > 0)
            gaps.push({ id: `${dimension}:${key}`, dimension, key, label, why, weight: Math.round(eased(Math.min(1, weight), inWork) * 100) / 100 });
    };
    const coldShort = cold_share !== null && cold_share < FUNNEL_TARGET.min;
    const awareness: Cell[] = AWARENESS_STAGES.map((s) => {
        const t = tally(ads.filter((a) => a.awareness === s), total);
        const state = stateOf(t.ads, t.spend_share);
        const in_work = work((w) => w.awareness === s);
        const label = AWARENESS_INFO[s].label;
        const who = `buyers who ${STAGE_PEOPLE[s]}`;
        const note = state === "missing" ? `No ad speaks to ${who}.` : state === "thin" ? `${pct(t.spend_share)} of spend reaches ${who}.` : "";
        if (COLD.has(s)) {
            const short = state === "ok" && coldShort ? " The account is short of ads for cold buyers." : "";
            gap("awareness", s, label, `${note || `${pct(t.spend_share)} of spend reaches ${who}.`}${short}`, state === "missing" ? 1 : state === "thin" ? 0.7 : coldShort ? 0.45 : 0, in_work);
        }
        else
            gap("awareness", s, label, note, state === "missing" ? 0.5 : state === "thin" ? 0.25 : 0, in_work);
        return { key: s, label, ...t, in_work, state, note };
    });
    const write_at = [1, 2, 3, 4, 5].filter((s) => s >= market);
    const sophistication: Cell[] = [1, 2, 3, 4, 5].map((s) => {
        const t = tally(ads.filter((a) => a.sophistication === s), total);
        const in_work = work((w) => w.sophistication === s);
        const label = `${s} · ${ARGUES[s].label}`;
        let state: CellState;
        let note = "";
        if (s < market) {
            state = "past";
            note = t.ads ? `The market has heard this. ${pct(t.spend_share)} of spend still argues this way.` : "The market has heard this.";
        }
        else if (s === market) {
            state = stateOf(t.ads, t.spend_share);
            note = "Where the market is. Everyone argues this way.";
            gap("sophistication", String(s), label, `No ad argues by ${ARGUES[s].label.toLowerCase()}, which is where the market is.`, state === "missing" ? 0.3 : 0, in_work);
        }
        else {
            state = stateOf(t.ads, t.spend_share, THIN_ARGUE);
            const step = [0.9, 0.7, 0.5][s - market - 1] ?? 0.4;
            note = state === "missing" ? `Above the market, and no ad argues this way.` : state === "thin" ? `Above the market, on ${pct(t.spend_share)} of spend.` : "Above the market.";
            const why = `The market is at stage ${market} (${ARGUES[market].label.toLowerCase()}). ${state === "missing" ? "No ad argues" : `${pct(t.spend_share)} of spend argues`} by ${ARGUES[s].label.toLowerCase()}, which still works there.`;
            gap("sophistication", String(s), label, why, state === "missing" ? step : state === "thin" ? step * 0.6 : 0, in_work);
        }
        return { key: String(s), label, ...t, in_work, state, note };
    });
    const format: Cell[] = COVERAGE_FORMATS.map((f) => {
        const t = tally(ads.filter((a) => a.format === f.id), total);
        const state = stateOf(t.ads, t.spend_share, 0);
        const in_work = work((w) => w.format === f.id);
        const note = state === "missing" ? `${f.label}: none has run.` : "";
        gap("format", f.id, f.label, note, state === "missing" ? (f.medium === "video" ? 0.5 : 0.4) * (f.write ? 1 : 0.5) : 0, in_work);
        return { key: f.id, label: f.label, ...t, in_work, state, note };
    });
    const persona: Cell[] = i.personas.map((p) => {
        const t = tally(ads.filter((a) => a.persona_id === p.id), total);
        const state = stateOf(t.ads, t.spend_share);
        const in_work = work((w) => w.persona_id === p.id);
        const note = state === "missing" ? `No ad speaks to ${p.name}.` : state === "thin" ? `${pct(t.spend_share)} of spend speaks to ${p.name}.` : "";
        gap("persona", p.id, p.name, note, state === "missing" ? 0.8 : state === "thin" ? 0.4 : 0, in_work);
        return { key: p.id, label: p.name, ...t, in_work, state, note };
    });
    const reached = i.account.audience.reduce((a, c) => a + c.spend, 0);
    const audience: Cell[] = i.account.audience.map((c) => {
        const spend_share = reached > 0 ? c.spend / reached : 0;
        const diff = c.buyers_share - spend_share;
        const under = c.buyers_share >= BUYERS_FLOOR && diff >= UNDERSERVED;
        const state: CellState = under ? (spend_share < 0.01 ? "missing" : "thin") : "ok";
        const label = cellLabel(c.age, c.gender);
        const note = under ? `${pct(c.buyers_share)} of buyers, ${pct(spend_share)} of spend.` : c.buyers_share < BUYERS_FLOOR ? "Few of your buyers." : "";
        gap("audience", `${c.age}|${c.gender}`, label, under ? `${label} are ${pct(c.buyers_share)} of buyers and get ${pct(spend_share)} of spend.` : "", under ? 0.4 + diff * 4 : 0, 0);
        return { key: `${c.age}|${c.gender}`, label, ads: 0, spend: c.spend, spend_share, revenue: c.revenue, roas: roasOf(c.spend, c.revenue), in_work: 0, buyers_share: c.buyers_share, state, note };
    });
    const offer: Cell[] = i.offers.map((o) => {
        const t = tally(ads.filter((a) => a.offer_id === o.id), total);
        const state = stateOf(t.ads, t.spend_share, 0);
        const label = o.name.split(": ")[0].replace(/\.$/, "");
        const note = state === "missing" ? `No ad carries the offer "${label}".` : "";
        gap("offer", o.id, label, note, state === "missing" ? 0.3 : 0, 0);
        return { key: o.id, label, ...t, in_work: 0, state, note };
    });
    const winners: Winner[] = accountRoas
        ? active
            .map((ad) => ({ ad, roas: roasOf(ad.spend, ad.revenue) ?? 0, spend_share: total > 0 ? ad.spend / total : 0 }))
            .map((w) => ({ ...w, times: Math.round((w.roas / accountRoas) * 100) / 100 }))
            .filter((w) => w.times >= WINNER_TIMES && w.spend_share >= WINNER_SHARE)
            .sort((a, b) => b.times * Math.log10(b.ad.spend + 10) - a.times * Math.log10(a.ad.spend + 10))
            .slice(0, WINNERS_SHOWN)
        : [];
    const won = new Set(winners.map((w) => w.ad.id));
    const fixes: Fix[] = active
        .filter((ad) => !won.has(ad.id) && ad.hook_rate != null && ad.hold_rate != null && total > 0 && ad.spend / total >= FIX_SHARE)
        .flatMap((ad): Fix[] => {
        const hook = ad.hook_rate!;
        const hold = ad.hold_rate!;
        const base = { ad, hook_rate: hook, hold_rate: hold, spend_share: ad.spend / total };
        if (hook < HOOK_WEAK && hold >= HOLD_STRONG)
            return [{ ...base, part: "opening", why: `${pct(hold)} of the people who start it stay, and only ${pct(hook)} start. The body works; the opening does not.` }];
        if (hook >= HOOK_STRONG && hold < HOLD_WEAK)
            return [{ ...base, part: "body", why: `${pct(hook)} of the people who see it stop for it, and only ${pct(hold)} of them stay. The opening works; what follows loses them.` }];
        return [];
    })
        .sort((a, b) => b.ad.spend - a.ad.spend)
        .slice(0, FIXES_SHOWN);
    return {
        totals: { ads: ads.length, active: active.length, spend: total, revenue, roas: accountRoas },
        cold_share,
        write_at,
        dims: { awareness, sophistication, format, persona, audience, offer },
        gaps: gaps.sort((a, b) => b.weight - a.weight),
        winners,
        fixes,
        evidence_review: reviewPerformanceEvidence(i.account),
    };
}
