"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, CircleHelp, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import type { ClaimOnSite } from "@/lib/brand-sources";
import type { Conflict } from "@/lib/claim-conflicts";
import type { ClaimRegister } from "@/lib/claim-sources";
import { cn } from "@/lib/utils";
import { ClaimSourcesCard } from "../brand/claim-sources";
import { syncFounderAction } from "./actions";
export interface WebsiteData {
    register: ClaimRegister;
    conflicts: Conflict[];
    defaultUrl: string;
    check: {
        claims: ClaimOnSite[];
        pages: number;
        readAt: string;
    };
}
const ORIGIN: Record<string, string> = { brand: "Brand documents", website: "Website", ad: "Ad" };
const host = (u: string) => {
    try {
        const x = new URL(u);
        return `${x.hostname.replace(/^www\./, "")}${x.pathname === "/" ? "" : x.pathname}`;
    }
    catch {
        return u;
    }
};
export function WebsitePanel({ data, live }: {
    data: WebsiteData;
    live: boolean;
}) {
    const [only, setOnly] = useState<"all" | "found" | "missing">("all");
    const { claims, pages, readAt } = data.check;
    const found = claims.filter((c) => c.found).length;
    const rows = claims.filter((c) => (only === "all" ? true : only === "found" ? !!c.found : !c.found));
    return (<div className="space-y-4" data-testid="website-panel">
      <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        The website is the brand speaking, not its customers. It is read for <span className="font-medium text-foreground">claims</span>: what the brand already says in public, with the exact words and the page they stand on. No insights are taken from it, and it is never counted as evidence of what buyers want.
      </p>

      <ClaimSourcesCard register={data.register} conflicts={data.conflicts} defaultUrl={data.defaultUrl} live={live}/>

      <section className="rounded-lg border" data-testid="claims-on-site">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b p-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">The brand brain&apos;s claims, checked against the website</h3>
            <p className="text-xs text-muted-foreground">
              {readAt
            ? `${found} of ${claims.length} claims are also stated on the ${pages} page${pages === 1 ? "" : "s"} read. A claim the site does not state is not wrong: it needs its own source, such as a study, a label or a certificate.`
            : "Read the website first. Each claim in the brand brain is then marked as stated on the site or not."}
            </p>
          </div>
          {readAt && (<div className="flex gap-1" role="group" aria-label="Which claims to show">
              {(["all", "found", "missing"] as const).map((k) => (<Button key={k} size="sm" variant={only === k ? "default" : "outline"} onClick={() => setOnly(k)} data-testid={`site-check-${k}`}>
                  {k === "all" ? `All ${claims.length}` : k === "found" ? `On the site ${found}` : `Not on the site ${claims.length - found}`}
                </Button>))}
            </div>)}
        </div>
        {claims.length === 0 ? (<p className="p-4 text-sm text-muted-foreground">
            The brand brain holds no claims yet.{" "}
            <Link href="/brand" className="text-primary hover:underline">
              Open the Brand brain
            </Link>
          </p>) : (<ul className="divide-y">
            {rows.map((c) => (<li key={c.id} className="flex gap-2.5 p-3 text-sm" data-testid={`site-claim-${c.id}`} data-found={c.found ? "yes" : "no"}>
                {c.found ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600"/> : <CircleHelp className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>}
                <div className="min-w-0 flex-1">
                  <div>
                    {c.text}
                    <Badge variant="outline" className="ml-2 align-middle font-normal">{ORIGIN[c.origin] ?? c.origin}</Badge>
                    {c.status !== "substantiated" && <Badge variant="secondary" className="ml-1 align-middle font-normal">{c.status === "pending" ? "Waiting" : "Rejected"}</Badge>}
                  </div>
                  {c.found ? (<div className="mt-0.5 text-xs text-muted-foreground">
                      &ldquo;{c.found.quote.length > 220 ? `${c.found.quote.slice(0, 218)}…` : c.found.quote}&rdquo;{" "}
                      {/^https?:/.test(c.found.where) ? (<a href={c.found.where} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                          {host(c.found.where)}
                          <ExternalLink className="size-3"/>
                        </a>) : (c.found.where)}
                    </div>) : (readAt && <div className="mt-0.5 text-xs text-muted-foreground">Not stated on the pages read.</div>)}
                </div>
              </li>))}
            {!rows.length && <li className="p-4 text-sm text-muted-foreground">None.</li>}
          </ul>)}
      </section>
    </div>);
}
export function FounderPanel({ pending, items, live }: {
    pending: {
        answered: number;
        sections: number;
        stale: number;
    };
    items: number;
    live: boolean;
}) {
    const router = useRouter();
    const [busy, start] = useTransition();
    const advanced = useAdvanced();
    const sync = () => start(async () => {
        const res = await syncFounderAction();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.changed || res.removed ? `${res.changed} section${res.changed === 1 ? "" : "s"} brought in${live ? " and sent for insights" : ""}.` : "Already up to date.");
        router.refresh();
    });
    return (<div className="space-y-3" data-testid="founder-panel">
      <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        The founder is the brand speaking, not its customers. Their answers give what no data shows: why the product is made as it is, what they hear buyers say, what was tried. Insights are taken from them, and each is kept as <span className="font-medium text-foreground">the founder&apos;s words</span>: never quoted in an ad as a customer&apos;s, and never counted as evidence that buyers want something.
      </p>
      <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm", pending.stale > 0 && "border-primary bg-primary/5")}>
        <div className="min-w-0 flex-1" data-testid="founder-state">
          {pending.answered === 0 && pending.stale > 0 ? (<>
              <div className="font-medium">The answers were removed from the questionnaire</div>
              <div className="text-xs text-muted-foreground">Bring in to take the old items, and the insights read from them, out of Sources.</div>
            </>) : pending.answered === 0 ? (<>
              <div className="font-medium">No answers yet</div>
              <div className="text-xs text-muted-foreground">The questionnaire takes about 20 minutes, typed or spoken. Answer any, skip any.</div>
            </>) : pending.stale > 0 ? (<>
              <div className="font-medium">
                {pending.stale} section{pending.stale === 1 ? "" : "s"} of answers {items ? "changed since they were brought in" : "ready to bring in"}
              </div>
              <div className="text-xs text-muted-foreground">
                {pending.answered} answer{pending.answered === 1 ? "" : "s"} across {pending.sections} section{pending.sections === 1 ? "" : "s"}. {live ? (advanced ? "Bringing them in also reads insights from them: about 1 cent a section." : "Bringing them in also reads insights from them.") : "They are brought in and not read for insights."}
              </div>
            </>) : (<>
              <div className="font-medium">
                {pending.answered} answer{pending.answered === 1 ? "" : "s"} across {pending.sections} section{pending.sections === 1 ? "" : "s"}, all brought in
              </div>
              <div className="text-xs text-muted-foreground">Change an answer in the questionnaire and it shows here as changed.</div>
            </>)}
        </div>
        {pending.stale > 0 && (<Button size="sm" onClick={sync} disabled={busy} data-testid="founder-sync">
            {busy ? <Loader2 className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>}
            Bring in the answers
          </Button>)}
        <Button size="sm" variant={pending.answered === 0 ? "default" : "outline"} asChild>
          <Link href="/brand/founder" data-testid="founder-open">
            {pending.answered === 0 ? "Start the questionnaire" : "Open the questionnaire"}
            <ArrowRight className="size-4"/>
          </Link>
        </Button>
      </div>
    </div>);
}
