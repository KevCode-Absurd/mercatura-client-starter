import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { llmEnabled } from "@/lib/llm/gateway";
import { getRun } from "@/lib/studio/engine";
import { setStatusAction } from "@/app/studio/actions";
import { SetView } from "@/app/studio/[id]/set-view";
import { runLedger } from "@/lib/ledger";
export const dynamic = "force-dynamic";
export default async function PdpSetPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params, row = await activeBrand(), run = getRun(id);
    if (!run || run.brand_id !== row.id || run.kind !== "pdp")
        notFound();
    const status = await setStatusAction(id);
    if (!status.ok)
        notFound();
    const brain = loadBrandBrain(row.id), ledger = runLedger(row.id, "studio", id);
    return <div className="mx-auto max-w-[80rem]"><PageHeader back={{ href: "/landing/images", label: "PDP image studio" }} title={run.title} subtitle="Review the plan and words, generate, inspect each image, refine and download. Uses the same Creative production engine and Brand Brain."/>
    <div className="px-6 pt-4 text-sm text-muted-foreground">Set cost so far: ${ledger.totalUsd.toFixed(2)} · <a className="underline" href={`/costs/studio/${id}`}>View calls</a></div>
    <SetView initial={status} live={llmEnabled()} voice={false} personas={Object.fromEntries(brain.personas.map(p => [p.id, p.name]))}/>
  </div>;
}
