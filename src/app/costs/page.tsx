import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { RUN_LABEL, brandLedger, caps, listRuns, sharedUsd } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { ModelTable, Totals, num, usd } from "./tables";
const SHOWN = 30;
const TONE: Record<string, string> = { studio: "border-primary/25 bg-accent text-primary", job: "border-amber-200 bg-amber-50 text-amber-800", script: "bg-muted text-foreground" };
export default async function CostsPage({ searchParams }: {
    searchParams: Promise<{
        all?: string;
    }>;
}) {
    const row = await activeBrand();
    const everyRun = (await searchParams).all === "1";
    const runs = listRuns(row.id);
    const listed = everyRun ? runs : runs.slice(0, SHOWN);
    const all = brandLedger(row.id);
    const c = caps();
    const shared = sharedUsd();
    const th = "border-b bg-muted/50 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground";
    const td = "border-b px-3 py-3 text-[13px] align-top";
    const r = "text-right tabular-nums";
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Costs" subtitle={`What ${row.name} has cost to make. Every paid step is recorded as it happens and added up here by piece of work: a set of images, a production job, a script. Open one to see each step in it.`}/>
      <div className="space-y-10 px-6 py-8">
        <div>
          <Totals l={all} label={`${row.name}, all time`}/>
          {shared > 0 && (<p className="mt-3 max-w-3xl text-xs text-muted-foreground" data-testid="cost-shared">
              {usd(shared)} of this was spent on things every brand shares, like the reference library and the example pictures. It is counted in each brand&apos;s total, so the brands&apos; totals add up to more than the whole bill. The 3 limits below are for all brands together.
            </p>)}
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-3" data-testid="cost-caps">
          {[
            { name: "Writing and checks, all brands", value: `$${c.text.spent.toFixed(2)} of the $${c.text.cap} limit`, share: c.text.spent / c.text.cap },
            { name: "Images, all brands", value: `${c.media.images} of the ${c.media.imageCap} limit`, share: c.media.images / c.media.imageCap },
            { name: "Video, all brands", value: `$${c.media.videoUsd.toFixed(2)} of the $${c.media.videoCapUsd} limit`, share: c.media.videoUsd / c.media.videoCapUsd },
        ].map((x) => (<div key={x.name} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground">{x.name}</span>
                <span className="font-medium tabular-nums">{x.value}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div className={cn("h-full rounded-full", x.share > 0.85 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.min(1, x.share) * 100}%` }}/>
              </div>
            </div>))}
        </div>

        <section>
          <h2 className="display mb-4 text-3xl">What each model cost</h2>
          <ModelTable l={all}/>
        </section>

        <section>
          <h2 className="display mb-4 text-3xl">
            What each piece of work cost <span className="font-sans text-sm text-muted-foreground">({runs.length})</span>
          </h2>
          <div className="overflow-x-auto rounded-lg border bg-card" data-testid="cost-runs">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Kind</th>
                  <th className={th}>Piece of work</th>
                  <th className={cn(th, r)}>Paid steps</th>
                  <th className={cn(th, r)}>Tokens in</th>
                  <th className={cn(th, r)}>Tokens out</th>
                  <th className={cn(th, r)}>Writing</th>
                  <th className={cn(th, r)}>Images</th>
                  <th className={cn(th, r)}>Video</th>
                  <th className={cn(th, r)}>Total</th>
                  <th className={th}>When</th>
                  <th className={th}/>
                </tr>
              </thead>
              <tbody>
                {listed.map((x) => (<tr key={`${x.kind}${x.id}`} className="hover:bg-muted/40" data-testid="cost-run">
                    <td className={td}>
                      <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-xs", TONE[x.kind] ?? "text-muted-foreground")}>{RUN_LABEL[x.kind]}</span>
                    </td>
                    <td className={td}>
                      <Link href={`/costs/${x.kind}/${encodeURIComponent(x.id)}`} className="font-medium hover:text-primary hover:underline">
                        {x.title}
                      </Link>
                      {x.id !== x.kind && <span className="ml-1.5 font-mono text-muted-foreground">{x.id}</span>}
                    </td>
                    <td className={cn(td, r)}>{x.calls}</td>
                    <td className={cn(td, r)}>{num(x.tokensIn + x.tokensCached)}</td>
                    <td className={cn(td, r)}>{num(x.tokensOut)}</td>
                    <td className={cn(td, r)}>{usd(x.textUsd)}</td>
                    <td className={cn(td, r)}>{x.images ? `${usd(x.imageUsd)} (${x.images})` : "-"}</td>
                    <td className={cn(td, r)}>{x.clips ? `${usd(x.videoUsd)} (${x.clips})` : "-"}</td>
                    <td className={cn(td, r, "font-medium")}>{usd(x.totalUsd)}</td>
                    <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{new Date(x.last).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className={td}>
                      <Link href={`/costs/${x.kind}/${encodeURIComponent(x.id)}`} aria-label={`Open the cost log of ${x.title}`}>
                        <ChevronRight className="size-4 text-muted-foreground"/>
                      </Link>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
          {runs.length > SHOWN && (<Link href={everyRun ? "/costs" : "/costs?all=1"} className="mt-3 inline-flex min-h-10 items-center rounded-md border border-primary px-4 text-sm font-semibold text-primary hover:bg-secondary" data-testid="cost-runs-all">
              {everyRun ? `Show the first ${SHOWN} only` : `Show all ${runs.length}`}
            </Link>)}
          <p className="mt-3 text-xs text-muted-foreground">
            A set of images, a production job and a script each have their own line. Research, the reference library and brand set-up are each added up into 1 line.
          </p>
        </section>
      </div>
    </div>);
}
