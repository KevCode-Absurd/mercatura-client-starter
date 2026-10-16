import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeYouApprove } from "@/components/before-you-approve";
import { FailingNotice } from "@/components/failing-notice";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { transcriptionEnabled } from "@/lib/founder-transcribe";
import { KIND_INFO } from "@/lib/library/taxonomy";
import { llmEnabled } from "@/lib/llm/gateway";
import { runLedger } from "@/lib/ledger";
import { mediaLive } from "@/lib/media/providers";
import { getRun } from "@/lib/studio/engine";
import { isBank } from "@/lib/studio/offer-bank";
import { currentOfferLine, thumbTwins } from "@/lib/studio/offer-bank-server";
import { isAdvanced } from "@/lib/ui-mode-server";
import { setStatusAction } from "../actions";
import { OfferLineBar } from "./offer-line";
import { SetView } from "./set-view";
export default async function SetPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const row = await activeBrand();
    const run = getRun(id);
    if (!run || run.brand_id !== row.id)
        notFound();
    const status = await setStatusAction(id);
    if (!status.ok)
        notFound();
    const brain = loadBrandBrain(row.id);
    const product = brain.products.find((p) => p.id === run.product_id);
    const personas = Object.fromEntries(brain.personas.map((p) => [p.id, p.name]));
    const advanced = await isAdvanced("create");
    const bank = run.kind === "ad" && isBank(run.notes) && run.items.some((i) => i.plan);
    const twins = bank && mediaLive() ? await thumbTwins(run) : [];
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader back={{ href: "/studio#yours", label: "Your creations", testId: "set-back" }} title={run.title} subtitle={advanced ? `${KIND_INFO[run.kind].label} for ${product?.name ?? run.product_id}. ${run.id}, sizes ${run.aspects.join(" and ")}.` : `${KIND_INFO[run.kind].label} for ${product?.name ?? "this product"}. Sizes ${run.aspects.join(" and ")}.`}/>
      {run.status === "planned" && run.kind !== "photoshoot" && (<div className="px-6 pt-5">
          <BeforeYouApprove brandId={row.id} what="the plan"/>
        </div>)}
      {run.items.some((i) => i.outputs.some((o) => o.qa?.status === "fail")) && (<div className="px-6 pt-5">
          <FailingNotice brandId={row.id} area="pictures"/>
        </div>)}
      {bank && (<div className="px-6 pt-5">
          <OfferLineBar runId={run.id} line={currentOfferLine(run)} ads={run.items.filter((i) => i.plan).length} twins={twins}/>
        </div>)}
      <SetView productLabel={product?.name ?? run.product_id} initial={status} live={llmEnabled()} voice={transcriptionEnabled()} personas={personas}/>
      {advanced && <RunCost brandId={row.id} id={run.id}/>}
    </div>);
}
function RunCost({ brandId, id }: {
    brandId: string;
    id: string;
}) {
    const l = runLedger(brandId, "studio", id);
    if (!l.calls.length)
        return null;
    return (<div className="px-6 pb-6">
      <div className="rounded-xl border bg-card p-5 text-sm" data-testid="set-cost">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">
            What this set has cost: <span className="tabular-nums">${l.totalUsd.toFixed(2)}</span>
          </h2>
          <Link href={`/costs/studio/${id}`} className="text-primary hover:underline" data-testid="set-cost-link">
            Every step and call
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Text ${l.textUsd.toFixed(2)} ({(l.tokensIn + l.tokensCached).toLocaleString("en-US")} tokens in, {l.tokensOut.toLocaleString("en-US")} out, {l.steps.reduce((n, s) => n + s.calls, 0)} calls) · Images ${l.imageUsd.toFixed(2)} ({l.images} rendered)
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs max-sm:wrap-anywhere">
          {l.models.map((m) => (<li key={m.kind + m.model} className="rounded-full border px-2 py-0.5">
              <span className="font-mono">{m.model}</span> <span className="tabular-nums text-muted-foreground">${m.usd.toFixed(2)}{m.estimated ? " est." : ""}</span>
            </li>))}
        </ul>
      </div>
    </div>);
}
