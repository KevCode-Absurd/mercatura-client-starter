import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { ComplianceCheckRow } from "@/db/schema";
import { SEVERITY_LABEL, VERDICT_LABEL } from "@/lib/compliance/labels";
import { cn } from "@/lib/utils";
export type PolicyNames = Record<string, {
    name: string;
    url: string;
}>;
const VERDICT = {
    ready: { icon: ShieldCheck, tone: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200", said: "Nothing found that Meta's published standards would stop." },
    fix: { icon: ShieldAlert, tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200", said: "Something to change, or a restriction to set, before it runs." },
    rejected: { icon: ShieldX, tone: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200", said: "A policy is plainly breached as the piece stands." },
} as const;
const SEVERITY_TONE = { reject: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200", restriction: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", warning: "bg-muted text-foreground" } as const;
export function readOnLabel(iso: string): string {
    const d = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function CheckResult({ check, names, advanced, note }: {
    check: ComplianceCheckRow;
    names: PolicyNames;
    advanced: boolean;
    note?: string;
}) {
    const v = VERDICT[check.verdict];
    const Icon = v.icon;
    const passed = check.passed.map((id) => (names[id] ? { id, ...names[id] } : null)).filter((p): p is {
        id: string;
        name: string;
        url: string;
    } => !!p);
    return (<div className="space-y-6" data-testid="check-result" data-verdict={check.verdict}>
      <div className={cn("flex items-start gap-3 rounded-xl border px-5 py-4", v.tone)} data-testid="check-verdict">
        <Icon className="mt-0.5 size-6 shrink-0"/>
        <div>
          <p className="display text-2xl">{VERDICT_LABEL[check.verdict]}</p>
          <p className="mt-1 text-sm opacity-90">{v.said}</p>
          {note && <p className="mt-1 text-sm opacity-90">{note}</p>}
        </div>
      </div>

      <section>
        <h2 className="display text-xl">{check.findings.length ? `${check.findings.length} finding${check.findings.length === 1 ? "" : "s"}` : "No findings"}</h2>
        {check.findings.length > 0 && (<ol className="mt-3 space-y-3" data-testid="check-findings">
            {check.findings.map((f, i) => (<li key={i} className="rounded-xl border bg-card p-4" data-testid="check-finding" data-severity={f.severity}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", SEVERITY_TONE[f.severity])}>{SEVERITY_LABEL[f.severity]}</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline" data-testid="finding-policy">
                    {f.name}
                  </a>
                </div>
                {f.where && (<p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Where: </span>
                    {f.where}
                  </p>)}
                <p className="mt-1 text-sm">
                  <span className="text-muted-foreground">What: </span>
                  {f.problem}
                </p>
                {f.fix && (<p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Fix: </span>
                    {f.fix}
                  </p>)}
              </li>))}
          </ol>)}
      </section>

      <section data-testid="check-passed">
        <h2 className="display text-xl">What passed</h2>
        {passed.length ? (<ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {passed.map((p) => (<li key={p.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600"/>
                <a href={p.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {p.name}
                </a>
              </li>))}
          </ul>) : (<p className="mt-2 text-sm text-muted-foreground">Nothing was marked as looked for and clear.</p>)}
      </section>

      <footer className="space-y-1 border-t pt-4 text-xs text-muted-foreground" data-testid="check-footer">
        {check.policies_read_at && <p>Policies read on {readOnLabel(check.policies_read_at)}.</p>}
        <p>This is a reading of Meta&apos;s published Advertising Standards, not Meta&apos;s decision. Meta reviews every ad itself when it is submitted.</p>
        {advanced && (<p>
            {check.model ? `Read by ${check.model}` : "Read by the app's own rules, no model"}
            {check.cost_usd > 0 ? `, $${check.cost_usd.toFixed(4)}` : ""}.
          </p>)}
      </footer>
    </div>);
}
