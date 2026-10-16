import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { RUN_LABEL, listRuns, runLedger, type RunKind } from "@/lib/ledger";
import { getSprint } from "@/lib/sprint/engine";
import { CallLog, MediaTable, ModelTable, StepTable, Totals, usd } from "../../tables";
export default async function RunCostPage({ params }: {
    params: Promise<{
        kind: string;
        id: string;
    }>;
}) {
    const p = await params;
    const kind = p.kind as RunKind;
    const id = decodeURIComponent(p.id);
    if (!(kind in RUN_LABEL))
        notFound();
    const row = await activeBrand();
    const sprint = kind === "sprint" ? getSprint(id) : undefined;
    const run = listRuns(row.id, { fold: kind !== "studio" }).find((r) => r.kind === kind && r.id === id) ?? (sprint?.brand_id === row.id ? { title: sprint.title, href: `/studio/sprint/${id}` } : undefined);
    if (!run)
        notFound();
    const l = runLedger(row.id, kind, id);
    const made = l.images + l.clips;
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/costs", label: "All runs" }} title={run.title} subtitle={`${RUN_LABEL[kind]}${id !== kind ? ` ${id}` : ""}: the cost of every step, by model, with each call in order.`}>
        {run.href && (<Link href={run.href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open it <ExternalLink className="size-3.5"/>
          </Link>)}
      </PageHeader>
      <div className="space-y-6 p-6">
        <Totals l={l}/>
        {made > 0 && (<p className="text-sm text-muted-foreground" data-testid="cost-each">
            {usd(l.totalUsd / made)} for each finished {l.clips ? "image or clip" : "image"}, counting the text that planned and checked it ({made} made, including second attempts and working stills).
          </p>)}
        <section>
          <h2 className="display mb-4 text-3xl">By model</h2>
          <ModelTable l={l}/>
        </section>
        <section>
          <h2 className="display mb-4 text-3xl">Text: each step</h2>
          <StepTable l={l}/>
        </section>
        <section>
          <h2 className="display mb-4 text-3xl">Images and video</h2>
          <MediaTable l={l}/>
        </section>
        <section>
          <h2 className="display mb-4 text-3xl">Every call, in order ({l.calls.length})</h2>
          <CallLog l={l}/>
        </section>
      </div>
    </div>);
}
