import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { chapters } from "@/lib/guide";
export default function GuidePage() {
    const all = chapters();
    const groups = ["Using the app", "How it works"] as const;
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Guide" subtitle="Step-by-step help for creating, reviewing and improving your work."/>
      <div className="space-y-14 px-6 py-8">
        {groups.map((g) => {
            const list = all.filter((c) => c.group === g);
            if (!list.length)
                return null;
            return (<section key={g}>
              <h2 className="display text-3xl">{g}</h2>
              <ol className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="guide-chapters">
                {list.map((c, i) => (<li key={c.slug}>
                    <Link href={`/guide/${c.slug}`} className="group flex h-full gap-4 rounded-xl border bg-card p-5 transition hover:border-primary" data-testid="guide-chapter">
                      <span className="numeral w-7 shrink-0 text-3xl leading-none text-primary">{g === "Using the app" ? i + 1 : "A"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-base font-semibold leading-snug group-hover:text-primary">
                          {c.title}
                          <ArrowRight className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"/>
                        </span>
                        <span className="mt-1.5 block">
                          <span className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{c.summary.replace(/\*\*|`/g, "")}</span>
                        </span>
                      </span>
                    </Link>
                  </li>))}
              </ol>
            </section>);
        })}
      </div>
    </div>);
}
