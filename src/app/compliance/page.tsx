import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { brandSources, checkTime, listChecks } from "@/lib/compliance/checks";
import { policies, policiesReadOn } from "@/lib/compliance/policies";
import { env } from "@/lib/env";
import { isAdvanced } from "@/lib/ui-mode-server";
import { ComplianceView } from "./compliance-view";
import type { PolicyNames } from "./result";
export default async function CompliancePage() {
    const row = await activeBrand();
    const advanced = await isAdvanced("compliance");
    const names: PolicyNames = Object.fromEntries(policies().map((p) => [p.id, { name: p.name, url: p.url }]));
    const sources = brandSources(row.id);
    const checks = listChecks(row.id).map((c) => ({ id: c.id, kind: c.kind, summary: c.summary, verdict: c.verdict, findings: c.findings.length, created_at: c.created_at }));
    const readOn = policiesReadOn();
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Compliance" subtitle={<>
            Put in any ad, and it is read against Meta&apos;s published Advertising Standards: a verdict, what was found and where, and the fix.
            {readOn ? ` The standards were read on ${readOn}.` : " The standards have not been read yet."}
          </>}/>
      <ComplianceView names={names} sources={sources} checks={checks} advanced={advanced} live={env.LLM_MODE === "live"} expect={checkTime().seconds}/>
    </div>);
}
