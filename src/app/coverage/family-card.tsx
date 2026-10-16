import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FAMILIES, GAP_PICKS, family, type FamilyId, type FamilyTally } from "@/lib/formats/families";
import { cn } from "@/lib/utils";
export function FamilyCard({ tally, test, line }: {
    tally: FamilyTally;
    test: FamilyId[];
    line: string;
}) {
    return (<section data-testid="coverage-families">
      <h2 className="display text-2xl">The 7 ways a static ad makes its case</h2>
      <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
        An ad can look like a note on a phone, quote a customer, or set 2 things side by side. Each way is called a family. The number is how many of your static ads argue that way, and a family at 0 is one you have never tested.
        {tally.total ? (tally.plain ? ` ${tally.plain} of your ${tally.total} are plain product or lifestyle pictures: they make no argument, so they are in no family.` : "") : " No static ad has been planned here yet."}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FAMILIES.map((f) => {
            const n = tally.counts[f.id];
            const next = test.includes(f.id);
            return (<li key={f.id} className={cn("flex flex-col rounded-xl border p-4", n === 0 ? "border-dashed bg-background" : "bg-card", next && "border-primary")} data-testid={`family-${f.id}`} data-count={n}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold">{f.label}</h3>
                <span className="shrink-0 text-xs text-muted-foreground">
                  <span className={cn("numeral text-2xl text-foreground", n === 0 && "text-muted-foreground")}>{n}</span> {n === 1 ? "ad" : "ads"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-snug">{f.what}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Such as:</span> {f.examples}.
              </p>
              <p className="mt-1.5 flex-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">When to use it:</span> {f.reach_when}
              </p>
              <Link href={f.make.href} title={`Opens ${f.make.label}, where this kind of ad is made`} className={cn("mt-4 inline-flex h-9 items-center gap-1 self-start rounded-lg px-3.5 text-sm font-semibold transition", next ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border bg-card text-foreground/80 hover:border-primary/50 hover:text-primary")} data-testid="make-family" data-next={next ? "1" : undefined}>
                {next ? "Test this next" : "Make one"} <ArrowRight className="size-3.5"/>
              </Link>
            </li>);
        })}
      </ul>
      <p className="mt-4 max-w-3xl text-sm" data-testid="family-advice">
        {line}
      </p>
      <details className="group mt-3 max-w-3xl text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">How each family goes wrong, and which to pick for your situation</summary>
        <dl className="mt-2 space-y-1.5">
          {FAMILIES.map((f) => (<div key={f.id}>
              <dt className="inline font-medium">{f.label}:</dt> <dd className="inline text-muted-foreground">{f.breaks_when}</dd>
            </div>))}
        </dl>
        <ul className="mt-3 space-y-1">
          {GAP_PICKS.map((g) => (<li key={g.when}>
              {g.when}: <span className="font-medium">{g.reach.map((r) => family(r)!.label.toLowerCase()).join(" or ")}</span>. <span className="text-muted-foreground">{g.because}</span>
            </li>))}
        </ul>
      </details>
    </section>);
}
