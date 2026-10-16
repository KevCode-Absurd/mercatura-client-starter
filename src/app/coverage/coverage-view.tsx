"use client";
import { createContext, useContext, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClaimsSwitch } from "@/components/claims-switch";
import { HooksPicker } from "@/components/hooks-picker";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AGE_BANDS, GENDERS, genderWord } from "@/lib/audience";
import { formatById, startHref } from "@/lib/catalogue";
import { pct } from "@/lib/coverage/analyze";
import { ARGUES, BUYERS_FLOOR, DIMENSION_INFO, FIX_SHARE, HOLD_STRONG, HOLD_WEAK, HOOK_STRONG, HOOK_WEAK, THIN_ARGUE, THIN_SHARE, UNDERSERVED, WINNER_SHARE, WINNER_TIMES, coverageFormat, type Cell, type CellState, type Coverage, type CoverageInput, type Dimension, type Fix, type ScriptBrief, type Winner } from "@/lib/coverage/model";
import { VARY, VARY_INFO, briefsForGaps, fixBriefs, variantsOf, type Vary } from "@/lib/coverage/plan";
import { FUNNEL_TARGET } from "@/lib/mix";
import { AWARENESS_INFO } from "@/lib/taxonomy";
import { tabNames } from "@/lib/brain/file-names";
import { cn } from "@/lib/utils";
import { writeBriefsAction } from "./actions";
const COUNTS = [6, 12, 24];
const MORE = [3, 6, 9];
const STATE: Record<CellState, {
    label: string;
    cls: string;
}> = {
    ok: { label: "Covered", cls: "border-transparent text-muted-foreground" },
    thin: { label: "Thin", cls: "border-amber-200 bg-amber-50 text-amber-800" },
    missing: { label: "Missing", cls: "border-red-200 bg-red-50 text-red-800" },
    past: { label: "Behind the market", cls: "border-zinc-200 bg-zinc-50 text-zinc-600" },
};
const pill = "rounded-full border px-2 py-0.5 text-xs";
export interface CoverageViewProps {
    cov: Coverage;
    input: CoverageInput;
    advanced: boolean;
    live: boolean;
}
const ClaimsChoice = createContext(false);
const HooksChoice = createContext(1);
const TasteChoice = createContext<Taste>({});
export function CoverageView({ cov, input, advanced, live, claims }: CoverageViewProps & {
    claims: boolean;
}) {
    const [claimChecks, setClaimChecks] = useState(claims);
    const [hooks, setHooks] = useState(1);
    const [taste, setTaste] = useState<Taste>({});
    const a = input.account;
    const money = (n: number) => `${a.currency} ${Math.round(n).toLocaleString("en-US")}`;
    const cold = cov.cold_share;
    return (<ClaimsChoice.Provider value={claimChecks}>
    <HooksChoice.Provider value={hooks}>
    <TasteChoice.Provider value={taste}>
      {a.simulated && (<p className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 text-sm leading-relaxed text-amber-900" data-testid="coverage-simulated">
          <span className="mr-1.5 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">Example</span>
          <span className="font-medium">These figures are simulated.</span> No ad account is connected, so the ads below are made up from this brand&apos;s own buyers and offers. They show how this screen works, not how the brand performs. The scripts it plans are real: each is
          written from your research for a buyer, a stage and a format.
        </p>)}

      <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4" data-testid="coverage-stats">
        <Stat label="Ads read" value={String(cov.totals.ads)} sub={`${cov.totals.active} active · ${a.period}`}/>
        <Stat label="For cold buyers" value={cold === null ? "n/a" : pct(cold)} sub={`Unaware or problem aware. The plan is ${pct(FUNNEL_TARGET.min)} to ${pct(FUNNEL_TARGET.max)}.`} warn={cold !== null && cold < FUNNEL_TARGET.min}/>
        <Stat label="The market is at" value={`Stage ${a.market.stage}`} sub={`${ARGUES[a.market.stage]?.label}. Write at ${cov.write_at.join(", ")}.`}/>
        <Stat label="Gaps found" value={String(cov.gaps.length)} sub={`${money(cov.totals.spend)} spent${cov.totals.roas ? `, return ${cov.totals.roas}` : ""}`}/>
      </dl>

      {cov.evidence_review && (<section className="rounded-xl border bg-card p-6" data-testid="coverage-evidence">
          <h2 className="display text-3xl">What the evidence supports</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {cov.evidence_review.status === "simulated" ? "Example analysis from simulated figures. " : cov.evidence_review.status === "export" ? "Read from supplied period exports. " : "No comparable performance export supplied. "}
            {Object.keys(cov.evidence_review.creative.formats).length} formats represented; {cov.evidence_review.creative.tagged} of {cov.evidence_review.creative.total} active ads have supplied concept labels.
          </p>
          {cov.evidence_review.creative.repeated.length > 0 && <p className="mt-2 text-sm">{cov.evidence_review.creative.repeated.length} repeated format, concept, visual and hook combinations. These labels suggest variants to review; they do not reveal platform retrieval IDs or prove cannibalization.</p>}
          {cov.evidence_review.comparisons.length > 0 && <details className="mt-4 rounded-lg border p-4 text-sm" data-testid="coverage-period-comparisons">
            <summary className="cursor-pointer font-medium">Comparable period metrics · {cov.evidence_review.comparisons.length} ads</summary>
            <p className="mt-2 text-xs text-muted-foreground">Source: {cov.evidence_review.source}. Unknown denominators remain unknown; these ratios do not establish profitability.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">{cov.evidence_review.comparisons.map(comparison => <details className="min-w-0 rounded-lg bg-muted/40 p-3" key={comparison.entity_id}>
              <summary className="cursor-pointer font-medium">{comparison.entity_id}</summary>
              <p className="mt-2 text-xs text-muted-foreground">Baseline: {comparison.periods[0]}<br />Current: {comparison.periods[1]}</p>
              <table className="mt-3 w-full text-xs"><thead><tr className="text-left"><th className="pb-2">Metric</th><th>Baseline</th><th>Current</th></tr></thead><tbody>{([
                        ["ctr", "CTR"], ["cpm", `CPM (${a.currency})`], ["purchase_per_click", "Purchases / click"], ["cpa", `CPA (${a.currency})`], ["roas", "ROAS"], ["frequency", "Frequency"],
                    ] as const).map(([key, label]) => {
                        const format = (value: number | null) => value === null ? "Unknown" : key === "ctr" || key === "purchase_per_click" ? `${(value * 100).toFixed(2)}%` : key === "roas" ? `${value.toFixed(2)}×` : value.toFixed(2);
                        return <tr key={key} className="border-t"><th className="py-2 text-left font-normal">{label}</th><td>{format(comparison.baseline[key])}</td><td>{format(comparison.current[key])}</td></tr>;
                    })}</tbody></table>
            </details>)}</div>
          </details>}
          {cov.evidence_review.findings.length > 0 && <div className="mt-4 grid gap-4 md:grid-cols-2">{cov.evidence_review.findings.slice(0, 6).map((finding, index) => (<article className="rounded-lg border p-4 text-sm" key={`${finding.entity_id}-${index}`}>
              <h3 className="font-semibold">{finding.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{finding.entity_id}</p>
              <p className="mt-2">{finding.observation}</p>
              <p className="mt-2 text-muted-foreground">Check: {finding.verify_next}</p>
              <p className="mt-2">Next: {finding.proposed_action}</p>
              {advanced && <p className="mt-2 text-xs text-muted-foreground">Possible explanations: {finding.hypotheses.join("; ")}. Source: {finding.evidence.join(" · ")}</p>}
            </article>))}</div>}
          {cov.evidence_review.missing.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{cov.evidence_review.missing.slice(0, 5).map((line, index) => <li key={index}>{line}</li>)}</ul>}
          <p className="mt-3 text-xs text-muted-foreground">Recommendations require checking before any account change. Creative labels and visual quality do not establish sales lift.</p>
        </section>)}

      <div className="max-w-3xl rounded-xl border bg-card p-6" data-testid="coverage-claims">
        <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="coverage-claims-switch"/>
        <p className="mt-1 pl-11 text-xs text-muted-foreground">It applies to every script written from this screen, and to the job of each one you put on the Production board.</p>
        <HooksPicker id="coverage-hooks" value={hooks} onChange={setHooks} className="mt-5 border-t pt-5"/>
        <TasteBar id="coverage-taste" surface="script" hide={["spread"]} value={taste} onChange={setTaste} className="mt-5 border-t pt-5"/>
        <p className="mt-1 text-xs text-muted-foreground">Each script starts from the defaults of its own buyer stage. More of a winner keeps the winning body and writes a new way in.</p>
      </div>

      <GapScripts cov={cov} input={input} advanced={advanced} live={live}/>
      <Winners cov={cov} input={input} advanced={advanced} live={live}/>

      <Fixes cov={cov} input={input} advanced={advanced} live={live}/>

      <section data-testid="coverage-lines">
        <h2 className="display text-3xl">Where the ads are</h2>
        <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">The same ads counted 6 ways. A bar is the share of spend. What is missing or thin is what the scripts above are planned to fill.</p>
        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <Line d="awareness" cells={cov.dims.awareness} advanced={advanced}/>
          <Line d="sophistication" cells={cov.dims.sophistication} advanced={advanced} extra={<p className="mt-2 text-sm text-muted-foreground">{tabNames(a.market.basis)}</p>}/>
          <Line d="format" cells={cov.dims.format} advanced={advanced} link={(key) => screenOf(key)}/>
          <Line d="persona" cells={cov.dims.persona} advanced={advanced}/>
          <Audience cells={cov.dims.audience}/>
          <Line d="offer" cells={cov.dims.offer} advanced={advanced}/>
        </div>
      </section>

      {advanced && (<section className="max-w-4xl text-sm text-muted-foreground" data-testid="coverage-rules">
          <h2 className="display text-3xl text-foreground">The rules behind this read</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>A cell is thin when ads run and take under {pct(THIN_SHARE)} of spend. A way of arguing above the market is thin under {pct(THIN_ARGUE)}.</li>
            <li>
              The plan for new ads is {pct(FUNNEL_TARGET.min)} to {pct(FUNNEL_TARGET.max)} for unaware and problem-aware buyers.
            </li>
            <li>Write at the market&apos;s stage and above it. Below it, the market has heard the argument.</li>
            <li>
              An age and gender group is underserved when its share of buyers is {Math.round(UNDERSERVED * 100)} points or more above its share of spend. A group under {pct(BUYERS_FLOOR)} of buyers is not counted.
            </li>
            <li>
              An ad is working when it is active, returns {WINNER_TIMES} times the account&apos;s return or more, and takes at least {(WINNER_SHARE * 100).toFixed(1)}% of spend.
            </li>
            <li>
              A video ad is nearly working when it is active, takes at least {pct(FIX_SHARE)} of spend, and 1 part is weak while the other is strong. A weak opening: under {pct(HOOK_WEAK)} of people who see it watch 3 seconds, while {pct(HOLD_STRONG)} or more of those stay to 15. A weak body: {pct(HOOK_STRONG)} or more watch 3 seconds, and under {pct(HOLD_WEAK)} of those stay.
            </li>
            <li>A script written here and not yet running makes its gap count for less: it is waiting to be made, not missing.</li>
            <li>Source: {a.source || "the brand's account file."}</li>
          </ul>
        </section>)}
    </TasteChoice.Provider>
    </HooksChoice.Provider>
    </ClaimsChoice.Provider>);
}
function Stat({ label, value, sub, warn }: {
    label: string;
    value: string;
    sub: string;
    warn?: boolean;
}) {
    return (<div className="rounded-xl border bg-card p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("numeral mt-2 text-5xl", warn && "text-amber-700")}>{value}</dd>
      <dd className="mt-2 text-sm text-muted-foreground">{sub}</dd>
    </div>);
}
function screenOf(key: string): string | null {
    const f = coverageFormat(key);
    const made = f && !f.write && f.screen ? formatById(f.screen) : undefined;
    return made ? startHref(made) : null;
}
function Line({ d, cells, advanced, extra, link }: {
    d: Dimension;
    cells: Cell[];
    advanced: boolean;
    extra?: React.ReactNode;
    link?: (key: string) => string | null;
}) {
    const top = Math.max(0.01, ...cells.map((c) => c.spend_share));
    return (<div className="min-w-0 rounded-xl border bg-card p-6" data-testid={`line-${d}`}>
      <h3 className="display text-2xl">{DIMENSION_INFO[d].label}</h3>
      <p className="text-sm text-muted-foreground">{DIMENSION_INFO[d].asks}</p>
      <ul className="mt-4 space-y-3">
        {cells.map((c) => {
            const href = c.state === "missing" && link ? link(c.key) : null;
            return (<li key={c.key} data-testid={`cell-${d}-${c.key}`} data-state={c.state}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="min-w-0 flex-1 break-words">{c.label}</span>
                {c.in_work > 0 && <span className={cn(pill, "border-primary/20 bg-primary/5 text-primary")}>{c.in_work} written here</span>}
                {c.state !== "ok" && <span className={cn(pill, STATE[c.state].cls)}>{STATE[c.state].label}</span>}
                <span className="w-12 text-right tabular-nums text-muted-foreground">{pct(c.spend_share)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted" aria-hidden>
                <div className={cn("h-1.5 rounded-full", c.state === "past" ? "bg-zinc-400" : "bg-primary")} style={{ width: `${Math.round((c.spend_share / top) * 100)}%` }}/>
              </div>
              {(c.note || advanced || href) && (<p className="mt-1 text-xs text-muted-foreground">
                  {c.note}
                  {advanced && ` ${c.ads} ad${c.ads === 1 ? "" : "s"}${c.roas !== null ? `, return ${c.roas}` : ""}.`}
                  {href && (<>
                      {" "}
                      <Link href={href} className="underline">
                        Make one
                      </Link>
                    </>)}
                </p>)}
            </li>);
        })}
      </ul>
      {extra}
    </div>);
}
function Audience({ cells }: {
    cells: Cell[];
}) {
    const at = (age: string, gender: string) => cells.find((c) => c.key === `${age}|${gender}`);
    return (<div className="min-w-0 rounded-xl border bg-card p-6" data-testid="line-audience">
      <h3 className="display text-2xl">{DIMENSION_INFO.audience.label}</h3>
      <p className="text-sm text-muted-foreground">{DIMENSION_INFO.audience.asks}. Each cell: share of buyers, then share of spend.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-3 font-normal">Age</th>
              {GENDERS.map((g) => (<th key={g} className="py-1 pr-3 font-normal">
                  {genderWord(g)}
                </th>))}
            </tr>
          </thead>
          <tbody>
            {AGE_BANDS.map((age) => (<tr key={age} className="border-t">
                <td className="py-1.5 pr-3 tabular-nums">{age === "65+" ? "65 and over" : age.replace("-", " to ")}</td>
                {GENDERS.map((g) => {
                const c = at(age, g);
                const under = c && c.state !== "ok";
                return (<td key={g} className="py-1.5 pr-3" data-testid={`cell-audience-${age}|${g}`} data-state={c?.state ?? "ok"}>
                      <span className={cn("inline-block rounded px-1.5 py-0.5 tabular-nums", under ? "bg-amber-50 font-medium text-amber-900" : "text-muted-foreground")}>
                        {c ? `${pct(c.buyers_share ?? 0)} buy · ${pct(c.spend_share)} spend` : ""}
                      </span>
                      {under && <span className="ml-1.5 text-xs text-amber-800">Underserved</span>}
                    </td>);
            })}
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
function BriefRow({ b, input, checked, onToggle, testid }: {
    b: ScriptBrief;
    input: CoverageInput;
    checked: boolean;
    onToggle: () => void;
    testid: string;
}) {
    const persona = input.personas.find((p) => p.id === b.persona_id);
    return (<li className={cn("min-w-0 rounded-xl border bg-card px-5 py-4", !checked && "opacity-60")} data-testid={testid} data-stage={b.awareness} data-format={b.format}>
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox className="mt-0.5" checked={checked} onCheckedChange={onToggle} aria-label={`Write the ${coverageFormat(b.format)?.label ?? b.format} for ${persona?.name ?? "this buyer"}`}/>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium">{coverageFormat(b.format)?.label ?? b.format}</span>
            {coverageFormat(b.format)?.medium === "video" && <span className="text-muted-foreground">{b.length}</span>}
            <span className="text-muted-foreground">for {persona?.name ?? b.persona_id}</span>
            <span className={cn(pill, "text-muted-foreground")}>{AWARENESS_INFO[b.awareness].label}</span>
            <span className={cn(pill, "text-muted-foreground")}>{ARGUES[b.sophistication]?.label ?? `Stage ${b.sophistication}`}</span>
          </span>
          <span className="mt-1 block break-words text-sm text-muted-foreground">{b.why.join(" ")}</span>
        </span>
      </label>
    </li>);
}
function useWrite(live: boolean) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [said, setSaid] = useState("");
    const claimChecks = useContext(ClaimsChoice);
    const hooks = useContext(HooksChoice);
    const taste = useContext(TasteChoice);
    const write = (briefs: ScriptBrief[], produce: boolean) => start(async () => {
        const res = await writeBriefsAction({ briefs, produce, claimChecks, hooks, taste });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setSaid(res.said);
        toast.success(res.said);
        if (live && res.scripts)
            router.push(produce ? "/production" : "/scripts");
    });
    return { pending, said, write };
}
function GapScripts({ cov, input, advanced, live }: CoverageViewProps) {
    const [count, setCount] = useState(12);
    const [off, setOff] = useState<Set<string>>(new Set());
    const [produce, setProduce] = useState(false);
    const { pending, said, write } = useWrite(live);
    const briefs = useMemo(() => briefsForGaps(cov, input, count), [cov, input, count]);
    const chosen = briefs.filter((b) => !off.has(b.id));
    const toggle = (id: string) => setOff((cur) => {
        const next = new Set(cur);
        if (next.has(id))
            next.delete(id);
        else
            next.add(id);
        return next;
    });
    const stages = new Set(chosen.map((b) => b.awareness)).size;
    const formats = new Set(chosen.map((b) => b.format)).size;
    const buyers = new Set(chosen.map((b) => b.persona_id)).size;
    return (<section data-testid="gap-scripts">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-3xl">Scripts that fill the gaps</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">Each script is 1 buyer, 1 stage, 1 way of arguing and 1 format, picked so the set covers what the account is missing and no 2 scripts are the same ad.</p>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="How many scripts">
          {COUNTS.map((n) => (<button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => { setCount(n); setOff(new Set()); }} className={cn("min-w-10 rounded-full border bg-card px-3 py-1.5 text-sm", count === n ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`brief-count-${n}`}>
              {n}
            </button>))}
        </div>
      </div>
      <ol className="mt-6 grid gap-3 xl:grid-cols-2" data-testid="gap-briefs">
        {briefs.map((b) => (<BriefRow key={b.id} b={b} input={input} checked={!off.has(b.id)} onToggle={() => toggle(b.id)} testid="brief-row"/>))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button size="lg" className="h-11 text-base" onClick={() => write(chosen, produce)} disabled={pending || !chosen.length} data-testid="briefs-write">
          {pending ? "Starting..." : `Write ${chosen.length} script${chosen.length === 1 ? "" : "s"}`}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={produce} onCheckedChange={(v) => setProduce(v === true)} data-testid="briefs-produce"/>
          Put each one on the Production board too. Its plan waits for your approval.
        </label>
        <span className="text-sm text-muted-foreground" data-testid="briefs-spread">
          {stages} stage{stages === 1 ? "" : "s"}, {formats} format{formats === 1 ? "" : "s"}, {buyers} buyer{buyers === 1 ? "" : "s"}
        </span>
      </div>
      {advanced && <p className="mt-2 text-xs text-muted-foreground">A script costs about $0.04 to write (measured in phase 21). {chosen.length} scripts: about ${(chosen.length * 0.043).toFixed(2)}. A production plan adds a few cents; nothing is rendered until you approve it.</p>}
      {!live && <p className="mt-2 text-xs text-muted-foreground">Writing is switched off on this account: the plan is shown and no script is written.</p>}
      {said && (<p className="mt-2 text-sm" role="status" data-testid="coverage-said">
          {said}
        </p>)}
    </section>);
}
function Winners({ cov, input, advanced, live }: CoverageViewProps) {
    if (!cov.winners.length)
        return (<section data-testid="winners">
        <h2 className="display text-3xl">What is working</h2>
        <p className="mt-1 text-sm text-muted-foreground">No active ad returns {WINNER_TIMES} times the account&apos;s return on enough spend yet.</p>
      </section>);
    return (<section data-testid="winners">
      <h2 className="display text-3xl">What is working</h2>
      <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">Ads that return well above the account on real money. Make more of one: the argument is kept, and each new script changes 1 thing.</p>
      <ul className="mt-6 grid gap-5 xl:grid-cols-2">
        {cov.winners.map((w) => (<WinnerCard key={w.ad.id} w={w} cov={cov} input={input} advanced={advanced} live={live}/>))}
      </ul>
    </section>);
}
function Fixes({ cov, input, advanced, live }: CoverageViewProps) {
    if (!cov.fixes.length)
        return null;
    return (<section data-testid="fixes">
      <h2 className="display text-3xl">Nearly working</h2>
      <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">Video ads with 1 weak part. Either people stay once they start and too few start, or the opening stops them and they leave. The scripts here rewrite the weak part and keep the rest.</p>
      <ul className="mt-6 grid gap-5 xl:grid-cols-2">
        {cov.fixes.map((f) => (<FixCard key={f.ad.id} f={f} input={input} advanced={advanced} live={live}/>))}
      </ul>
    </section>);
}
function FixCard({ f, input, advanced, live }: {
    f: Fix;
    input: CoverageInput;
    advanced: boolean;
    live: boolean;
}) {
    const [count, setCount] = useState(3);
    const { pending, said, write } = useWrite(live);
    const briefs = useMemo(() => fixBriefs(f, input, count), [f, input, count]);
    const ad = f.ad;
    const persona = input.personas.find((p) => p.id === ad.persona_id);
    return (<li className="min-w-0 rounded-xl border bg-card p-6" data-testid="fix-card" data-part={f.part}>
      <p className="display break-words text-2xl">{ad.hook ? `“${ad.hook}”` : ad.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {coverageFormat(ad.format)?.label ?? ad.format}
        {persona ? ` for ${persona.name}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={cn(pill, f.part === "opening" ? "border-amber-300 text-amber-800" : "text-muted-foreground")}>{pct(f.hook_rate)} start it</span>
        <span className={cn(pill, f.part === "body" ? "border-amber-300 text-amber-800" : "text-muted-foreground")}>{pct(f.hold_rate)} of those stay</span>
        <span className={cn(pill, "text-muted-foreground")}>{pct(f.spend_share)} of spend</span>
      </div>
      <p className="mt-2 break-words text-sm text-muted-foreground">{f.why}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="How many scripts">
        <span className="text-muted-foreground">{f.part === "opening" ? "New openings" : "New bodies"}</span>
        {MORE.map((n) => (<button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={cn("min-w-9 rounded-full border px-2.5 py-1", count === n ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
            {n}
          </button>))}
        <Button variant="outline" size="sm" className="h-auto max-w-full whitespace-normal py-1.5" onClick={() => write(briefs, false)} disabled={pending || !briefs.length} data-testid="fix-write">
          {pending ? "Starting..." : f.part === "opening" ? `Write ${briefs.length} new opening${briefs.length === 1 ? "" : "s"}` : `Write ${briefs.length} new bod${briefs.length === 1 ? "y" : "ies"}`}
        </Button>
      </div>
      {said && (<p className="mt-2 text-sm" role="status" data-testid="fix-said">
          {said}
        </p>)}
    </li>);
}
function WinnerCard({ w, cov, input, advanced, live }: {
    w: Winner;
} & CoverageViewProps) {
    const [open, setOpen] = useState(false);
    const [vary, setVary] = useState<Vary[]>(["format", "buyer", "stage"]);
    const [count, setCount] = useState(6);
    const [produce, setProduce] = useState(false);
    const { pending, said, write } = useWrite(live);
    const briefs = useMemo(() => (open ? variantsOf(w, cov, input, count, vary) : []), [open, w, cov, input, count, vary]);
    const ad = w.ad;
    const persona = input.personas.find((p) => p.id === ad.persona_id);
    const flip = (v: Vary) => setVary((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : VARY.filter((x) => x === v || cur.includes(x))));
    return (<li className="min-w-0 rounded-xl border bg-card p-6" data-testid="winner-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="display break-words text-2xl">{ad.hook ? `“${ad.hook}”` : ad.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {coverageFormat(ad.format)?.label ?? ad.format}
            {persona ? ` for ${persona.name}` : ""}
          </p>
        </div>
        <p className="text-right text-sm">
          <span className="numeral text-4xl text-primary">{w.times}×</span>
          <span className="block text-xs text-muted-foreground">the account&apos;s return, on {pct(w.spend_share)} of spend</span>
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={cn(pill, "text-muted-foreground")}>{AWARENESS_INFO[ad.awareness].label}</span>
        <span className={cn(pill, "text-muted-foreground")}>{ARGUES[ad.sophistication]?.label ?? `Stage ${ad.sophistication}`}</span>
        <span className={cn(pill, "text-muted-foreground")}>{ad.days} days running</span>
      </div>
      {ad.angle && <p className="mt-2 text-sm text-muted-foreground">{ad.angle}</p>}
      {!open ? (<Button variant="outline" size="sm" className="mt-3 h-auto max-w-full whitespace-normal py-1.5" onClick={() => setOpen(true)} data-testid="winner-more">
          Make more of this
        </Button>) : (<div className="mt-3 border-t pt-3" data-testid="winner-plan">
          <p className="text-sm font-medium">What should change from script to script?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VARY.map((v) => (<button key={v} type="button" aria-pressed={vary.includes(v)} title={VARY_INFO[v].blurb} onClick={() => flip(v)} className={cn("rounded-full border px-3 py-1 text-sm", vary.includes(v) ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`vary-${v}`}>
                {VARY_INFO[v].label}
              </button>))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm" role="radiogroup" aria-label="How many scripts">
            <span className="text-muted-foreground">How many</span>
            {MORE.map((n) => (<button key={n} type="button" role="radio" aria-checked={count === n} onClick={() => setCount(n)} className={cn("min-w-9 rounded-full border px-2.5 py-1", count === n ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`more-count-${n}`}>
                {n}
              </button>))}
          </div>
          <ol className="mt-3 space-y-1.5" data-testid="variant-rows">
            {briefs.map((b) => (<li key={b.id} className="break-words text-sm" data-testid="variant-row" data-stage={b.awareness} data-format={b.format}>
                <span className="font-medium">{coverageFormat(b.format)?.label ?? b.format}</span>{coverageFormat(b.format)?.medium === "video" && <span className="text-muted-foreground"> {b.length}</span>}. {b.changes}
              </li>))}
            {!briefs.length && <li className="text-sm text-muted-foreground">Pick at least 1 thing to change.</li>}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button size="sm" onClick={() => write(briefs, produce)} disabled={pending || !briefs.length} data-testid="variants-write">
              {pending ? "Starting..." : `Write ${briefs.length} script${briefs.length === 1 ? "" : "s"}`}
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={produce} onCheckedChange={(v) => setProduce(v === true)}/>
              Put each one on the Production board too
            </label>
          </div>
          {said && (<p className="mt-2 text-sm" role="status" data-testid="variants-said">
              {said}
            </p>)}
        </div>)}
    </li>);
}
