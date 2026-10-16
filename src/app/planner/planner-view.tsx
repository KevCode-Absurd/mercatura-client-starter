"use client";
import { useState } from "react";
import { MixBar } from "@/components/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currencySymbol } from "@/lib/money";
import { EFFORT_TARGET, TIER_INFO, plan, type PlannerInput } from "@/lib/planner";
import { OUTPUT_INFO, OUTPUT_TYPES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
type Range = {
    min: number;
    max: number;
};
export function PlannerView({ defaults, currency, have, targets, }: {
    defaults: PlannerInput;
    currency: string;
    have: {
        activeConcepts: number;
        scriptsApprovedThisMonth: number;
        assetsApprovedThisMonth: number;
        funnel: number | null;
        pain: number | null;
        effort: {
            replication: number;
            iteration: number;
            net_new: number;
        } | null;
    };
    targets: {
        funnel: Range;
        pain: Range;
    };
}) {
    const [i, setI] = useState<PlannerInput>(defaults);
    const r = plan(i);
    const tier = TIER_INFO[r.tier];
    const money = (n: number) => `${currencySymbol(currency)}${Math.round(n).toLocaleString("en-US")}`;
    const num = (k: keyof Omit<PlannerInput, "cost_per_ad">, label: string, step = 1) => (<div>
      <Label className="mb-1 block text-xs text-muted-foreground" htmlFor={k}>
        {label}
      </Label>
      <Input id={k} type="number" step={step} value={i[k]} onChange={(e) => setI({ ...i, [k]: Number(e.target.value) })}/>
    </div>);
    const conceptsOk = have.activeConcepts >= tier.conceptsMin && have.activeConcepts <= tier.conceptsMax;
    return (<div className="grid items-start gap-6 px-6 py-8 lg:grid-cols-[22rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your numbers</CardTitle>
          <p className="text-xs text-muted-foreground">Change any number and the answers beside it change at once. They start from the numbers kept for this brand. What you type here is for trying things out and is not saved.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {num("monthly_spend", "Ad spend each month")}
          {num("monthly_new_customer_revenue_target", "Revenue you want from new customers each month")}
          {num("avg_lifetime_spend_per_ad", "Ad spend behind 1 ad, over its whole life")}
          {num("avg_roas_7d_click", "Revenue back for every 1 spent on ads (ROAS, 7-day click)", 0.1)}
          {num("gross_margin", "Gross margin (0.7 means 70%)", 0.05)}
          <div>
            <div className="mb-2 mt-2 border-t pt-4 text-sm font-medium">What 1 ad costs to make, by format</div>
            <div className="space-y-1.5">
              {OUTPUT_TYPES.map((t) => (<div key={t} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{OUTPUT_INFO[t].label}</span>
                  <Input className="h-9 w-28 text-right tabular-nums" type="number" placeholder="0" value={i.cost_per_ad[t] ?? ""} onChange={(e) => setI({ ...i, cost_per_ad: { ...i.cost_per_ad, [t]: Number(e.target.value) } })} aria-label={`What 1 costs to make: ${OUTPUT_INFO[t].label}`}/>
                </div>))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="planner-results">
          <Result label="New ads to make each month" value={r.simpleRuleAds} note={`Rule of thumb: 1 new ad for every ${money(1000)} of ad spend`}/>
          <Result label="Ads needed to reach your revenue target" value={r.adsNeeded ?? "n/a"} note={`Each ad is expected to bring in ${money(r.revenuePerAd)}`}/>
          <Result label="What to spend on making ads each month" value={r.tier === "starter" ? "Your time" : money(r.productionBudget)} note={`With ad spend of ${tier.label}, plan for ${tier.budgetRule}`}/>
          <Result label="What 1 ad earns after its ad spend" value={money(r.contributionPerAd)} note="The revenue it brings in, times your margin, minus the ad spend behind it"/>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which formats pay for themselves</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="pb-2">Format</th>
                  <th className="pb-2 text-right">Cost to make 1</th>
                  <th className="pb-2 text-right">Left after making it</th>
                  <th className="pb-2 text-right">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {r.formats.map((f) => (<tr key={f.type} className="border-t">
                    <td className="py-2.5">{OUTPUT_INFO[f.type].label}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(f.cost)}</td>
                    <td className={cn("py-2.5 text-right tabular-nums", f.net < 0 && "text-red-700")}>{money(f.net)}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", f.paysForItself ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                        {f.paysForItself ? "pays for itself" : "loses money"}
                      </span>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where you are now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Result label="Active concepts" value={have.activeConcepts} note={`At this ad spend, aim for ${tier.concepts}`} tone={conceptsOk ? "ok" : "warn"}/>
              <Result label="Scripts approved this month" value={have.scriptsApprovedThisMonth}/>
              <Result label="Finished pieces approved this month" value={have.assetsApprovedThisMonth}/>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <MixBar label="For people not shopping yet (unaware and problem aware)" actual={have.funnel} targetMin={targets.funnel.min} targetMax={targets.funnel.max} note="share of your concepts and scripts"/>
              <MixBar label="Leads with a problem the buyer has" actual={have.pain} targetMin={targets.pain.min} targetMax={targets.pain.max} note="aim for 60% or more"/>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <MixBar label="Remakes of ads that worked" actual={have.effort?.replication ?? null} targetMin={EFFORT_TARGET.replication.min} targetMax={EFFORT_TARGET.replication.max} note="by how each piece in Production is marked"/>
              <MixBar label="Changes to ads you have" actual={have.effort?.iteration ?? null} targetMin={EFFORT_TARGET.iteration.min} targetMax={EFFORT_TARGET.iteration.max}/>
              <MixBar label="New ideas" actual={have.effort?.net_new ?? null} targetMin={EFFORT_TARGET.net_new.min} targetMax={EFFORT_TARGET.net_new.max}/>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
function Result({ label, value, note, tone }: {
    label: string;
    value: React.ReactNode;
    note?: string;
    tone?: "ok" | "warn";
}) {
    return (<div className="rounded-lg border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("numeral mt-2 text-4xl leading-none", tone === "warn" && "text-amber-700", tone === "ok" && "text-emerald-700")}>{value}</div>
      {note && <div className="mt-2 text-xs text-muted-foreground">{note}</div>}
    </div>);
}
