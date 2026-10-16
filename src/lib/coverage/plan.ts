import { spread } from "../audience";
import { formatById } from "../catalogue";
import { AWARENESS_INFO, AWARENESS_STAGES, LENGTH_PRESETS, type AwarenessStage, type LengthPreset } from "../taxonomy";
import { FUNNEL_TARGET } from "../mix";
import { STAGE_PEOPLE, pct } from "./analyze";
import { ARGUES, COVERAGE_FORMATS, coverageFormat, type Coverage, type CoverageFormat, type CoverageInput, type CoveragePersona, type Dimension, type Fix, type ScriptBrief, type Winner } from "./model";
const COLD = new Set<AwarenessStage>(["unaware", "problem_aware"]);
const TAKEN = 0.35;
const STAGE_MIX_COLD: Record<AwarenessStage, number> = { unaware: 0.3, problem_aware: 0.4, solution_aware: 0.15, product_aware: 0.1, most_aware: 0.05 };
const STAGE_MIX_EVEN: Record<AwarenessStage, number> = { unaware: 0.2, problem_aware: 0.2, solution_aware: 0.2, product_aware: 0.2, most_aware: 0.2 };
const ARGUE_MIX = [0.25, 0.4, 0.25, 0.1];
export function shareOut<T>(n: number, items: [
    T,
    number
][]): T[] {
    const live = items.filter(([, w]) => w > 0);
    if (!live.length)
        return [];
    const given = live.map(() => 0);
    return Array.from({ length: n }, () => {
        let best = 0;
        live.forEach(([, w], k) => {
            if (w / (2 * given[k] + 1) > live[best][1] / (2 * given[best] + 1))
                best = k;
        });
        given[best]++;
        return live[best][0];
    });
}
export const WRITABLE: CoverageFormat[] = COVERAGE_FORMATS.filter((f) => f.write && formatById(f.write)?.start.how === "script");
export function lengthFor(format: CoverageFormat, stage: AwarenessStage): LengthPreset {
    const start = format.write ? formatById(format.write)?.start : undefined;
    const lengths = start?.how === "script" ? [...start.lengths].sort((a, b) => LENGTH_PRESETS.indexOf(a) - LENGTH_PRESETS.indexOf(b)) : (["30s"] as LengthPreset[]);
    if (COLD.has(stage))
        return [...lengths].reverse().find((l) => LENGTH_PRESETS.indexOf(l) <= LENGTH_PRESETS.indexOf("60s")) ?? lengths[0];
    if (stage === "solution_aware")
        return lengths[Math.floor((lengths.length - 1) / 2)];
    return lengths[0];
}
const offerFor = (p: CoveragePersona | undefined, offers: {
    id: string;
}[]) => (p?.offer_id && offers.some((o) => o.id === p.offer_id) ? p.offer_id : (offers[0]?.id ?? null));
const key = (b: Pick<ScriptBrief, "persona_id" | "awareness" | "sophistication" | "format">) => `${b.persona_id}|${b.awareness}|${b.sophistication}|${b.format}`;
function audienceNeed(p: CoveragePersona, need: Map<string, number>): number {
    return spread(p.age, p.gender).reduce((a, c) => a + (need.get(`audience:${c.age}|${c.gender}`) ?? 0) * c.weight, 0) * 2;
}
export function briefsForGaps(cov: Coverage, i: CoverageInput, n: number): ScriptBrief[] {
    if (!i.personas.length || !WRITABLE.length)
        return [];
    const need = new Map(cov.gaps.map((g) => [g.id, g.weight]));
    const why = new Map(cov.gaps.map((g) => [g.id, g.why]));
    const share = (d: Dimension, k: string) => cov.dims[d].find((c) => c.key === k)?.spend_share ?? 0;
    const score = (d: Dimension, k: string) => (need.get(`${d}:${k}`) ?? 0) + 0.05 * (1 - share(d, k));
    const taken = new Set<string>();
    const out: ScriptBrief[] = [];
    const times = new Map<string, number>();
    const again = (id: string) => times.get(id) ?? 0;
    const gapAt = (id: string) => cov.gaps.find((g) => g.id === id)?.weight ?? 0;
    const market = i.account.market.stage;
    const mix = cov.cold_share !== null && cov.cold_share >= FUNNEL_TARGET.min ? STAGE_MIX_EVEN : STAGE_MIX_COLD;
    const stages = shareOut(n, AWARENESS_STAGES.map((s) => [s, mix[s] * (1 + 2 * gapAt(`awareness:${s}`))] as [
        AwarenessStage,
        number
    ]));
    const argues = shareOut(n, cov.write_at.map((s) => [s, (ARGUE_MIX[s - market] ?? 0.1) * (1 + 2 * gapAt(`sophistication:${s}`))] as [
        number,
        number
    ]));
    for (let at = 0; at < n; at++) {
        const stage = stages[at] ?? "problem_aware";
        const argue = argues[at] ?? market;
        const want = (p: CoveragePersona) => score("persona", p.id) + audienceNeed(p, need) + (p.awareness === stage ? 0.15 : 0) - 0.1 * again(p.id);
        const buyers = [...i.personas].sort((a, b) => want(b) - want(a));
        const fit = (f: CoverageFormat) => score("format", f.id) + (f.stages.includes(stage) ? 0.5 : -1) + (f.argues.includes(argue) ? 0.2 : 0) - 0.2 * again(f.id);
        const formats = [...WRITABLE].sort((a, b) => fit(b) - fit(a));
        let pick: {
            p: CoveragePersona;
            f: CoverageFormat;
        } | null = null;
        search: for (const p of buyers)
            for (const f of formats.slice(0, 4)) {
                if (!taken.has(key({ persona_id: p.id, awareness: stage, sophistication: argue, format: f.id }))) {
                    pick = { p, f };
                    break search;
                }
            }
        const { p, f } = pick ?? { p: buyers[0], f: formats[0] };
        const cells = spread(p.age, p.gender).filter((c) => c.weight >= 0.15).map((c) => `audience:${c.age}|${c.gender}`);
        const fills = [`awareness:${stage}`, `sophistication:${argue}`, `persona:${p.id}`, ...cells, `format:${f.id}`].filter((id) => (need.get(id) ?? 0) > 0.05);
        const brief: ScriptBrief = {
            id: `gap_${at + 1}`,
            source: "gap",
            persona_id: p.id,
            awareness: stage,
            sophistication: argue,
            format: f.id,
            length: lengthFor(f, stage),
            offer_id: offerFor(p, i.offers),
            angle: p.angle,
            fills,
            why: fills.length ? [...new Set(fills.map((id) => why.get(id)!).filter(Boolean))] : ["Every gap has a script by now. This one keeps the mix even."],
        };
        taken.add(key(brief));
        out.push(brief);
        for (const id of [p.id, f.id])
            times.set(id, again(id) + 1);
        for (const id of fills)
            need.set(id, (need.get(id) ?? 0) * TAKEN);
    }
    return out;
}
export const VARY = ["format", "buyer", "stage", "argue", "hook"] as const;
export type Vary = (typeof VARY)[number];
export const VARY_INFO: Record<Vary, {
    label: string;
    blurb: string;
}> = {
    format: { label: "Other formats", blurb: "The same argument as a different kind of ad" },
    buyer: { label: "Other buyers", blurb: "The same argument told for another of your buyers" },
    stage: { label: "A colder or warmer buyer", blurb: "The same argument for people one step earlier or later" },
    argue: { label: "A stronger argument", blurb: "The same ad argued one stage above: a mechanism, a sharper one, or identity" },
    hook: { label: "New openings", blurb: "The same ad with a different way in" },
};
function formatNear(w: Winner, stage: AwarenessStage, cov: Coverage): CoverageFormat {
    const own = coverageFormat(w.ad.format);
    if (own?.write && WRITABLE.includes(own) && own.stages.includes(stage))
        return own;
    const missing = (f: CoverageFormat) => (cov.dims.format.find((c) => c.key === f.id)?.state === "missing" ? 0.2 : 0);
    const rank = (f: CoverageFormat) => (f.stages.includes(stage) ? 1 : 0) + (f.medium === own?.medium ? 0.5 : 0) + missing(f);
    return [...WRITABLE].sort((a, b) => rank(b) - rank(a))[0];
}
export function fixBriefs(f: Fix, i: CoverageInput, n: number): ScriptBrief[] {
    const ad = f.ad;
    const format = WRITABLE.find((x) => x.id === ad.format) ?? WRITABLE.find((x) => x.medium === "video" && x.stages.includes(ad.awareness));
    const own = i.personas.find((p) => p.id === ad.persona_id) ?? i.personas[0];
    if (!format || !own)
        return [];
    return Array.from({ length: n }, (_, k) => ({
        id: `${ad.id}_fix_${k + 1}`,
        source: "fix" as const,
        part: f.part,
        from_ad: ad.id,
        persona_id: own.id,
        awareness: ad.awareness,
        sophistication: ad.sophistication,
        format: format.id,
        length: lengthFor(format, ad.awareness),
        offer_id: ad.offer_id ?? offerFor(own, i.offers),
        angle: ad.angle || own.angle,
        hook: ad.hook,
        changes: f.part === "opening" ? `A new opening on the same body${k ? ` (${k + 1})` : ""}.` : `The same opening idea, and a new body${k ? ` (${k + 1})` : ""}.`,
        fills: [],
        why: [f.why],
    }));
}
export function variantsOf(w: Winner, cov: Coverage, i: CoverageInput, n: number, vary: Vary[]): ScriptBrief[] {
    if (!i.personas.length || !WRITABLE.length || !vary.length)
        return [];
    const ad = w.ad;
    const own = i.personas.find((p) => p.id === ad.persona_id) ?? i.personas[0];
    const baseFormat = formatNear(w, ad.awareness, cov);
    const gapOf = (id: string) => cov.gaps.find((g) => g.id === id);
    const head = `"${ad.name}" returns ${w.times} times the account's, on ${pct(w.spend_share)} of spend.`;
    const base = { source: "winner" as const, from_ad: ad.id, persona_id: own.id, awareness: ad.awareness, sophistication: ad.sophistication, format: baseFormat.id, offer_id: ad.offer_id ?? offerFor(own, i.offers), angle: ad.angle || own.angle, hook: ad.hook || undefined };
    type Draft = Omit<ScriptBrief, "id" | "length" | "why" | "fills"> & {
        fills: string[];
    };
    const at = AWARENESS_STAGES.indexOf(ad.awareness);
    const lines: Record<Vary, Draft[]> = {
        format: WRITABLE.filter((f) => f.id !== ad.format && f.stages.includes(ad.awareness))
            .sort((a, b) => (gapOf(`format:${b.id}`)?.weight ?? 0) - (gapOf(`format:${a.id}`)?.weight ?? 0))
            .map((f) => ({ ...base, format: f.id, changes: `Made as: ${f.label}.`, fills: [`format:${f.id}`] })),
        buyer: i.personas
            .filter((p) => p.id !== own.id)
            .sort((a, b) => (gapOf(`persona:${b.id}`)?.weight ?? 0) - (gapOf(`persona:${a.id}`)?.weight ?? 0))
            .map((p) => ({ ...base, persona_id: p.id, offer_id: ad.offer_id ?? offerFor(p, i.offers), changes: `Told for ${p.name}.`, fills: [`persona:${p.id}`] })),
        stage: [at - 1, at + 1]
            .filter((k) => k >= 0 && k < AWARENESS_STAGES.length)
            .map((k) => AWARENESS_STAGES[k])
            .map((s) => ({ ...base, awareness: s, format: formatNear(w, s, cov).id, changes: `For buyers who ${STAGE_PEOPLE[s]} (${AWARENESS_INFO[s].label.toLowerCase()}).`, fills: [`awareness:${s}`] })),
        argue: [ad.sophistication + 1, ad.sophistication + 2]
            .filter((s) => s <= 5)
            .map((s) => ({ ...base, sophistication: s, changes: `Argued by ${ARGUES[s].label.toLowerCase()}. ${ARGUES[s].write}`, fills: [`sophistication:${s}`] })),
        hook: Array.from({ length: n }, (_, k) => ({ ...base, changes: `A new opening on the same argument${k ? ` (${k + 1})` : ""}.`, fills: [] })),
    };
    const out: ScriptBrief[] = [];
    const turn = new Map<Vary, number>(vary.map((v) => [v, 0]));
    while (out.length < n) {
        let added = false;
        for (const v of vary) {
            if (out.length >= n)
                break;
            const d = lines[v][turn.get(v)!];
            if (!d)
                continue;
            turn.set(v, turn.get(v)! + 1);
            const format = coverageFormat(d.format)!;
            const fills = d.fills.filter((id) => gapOf(id));
            out.push({ ...d, id: `${ad.id}_${out.length + 1}`, length: lengthFor(format, d.awareness), fills, why: [head, d.changes!, ...fills.map((id) => gapOf(id)!.why)] });
            added = true;
        }
        if (!added)
            break;
    }
    return out;
}
