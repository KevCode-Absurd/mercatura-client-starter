import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { EmptyNext } from "@/components/empty-next";
import { activeBrand } from "@/lib/brand-context";
import { scoreOf } from "@/lib/landing/checks";
import { listPages } from "@/lib/landing/store";
import { KIND_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/lib/landing/types";
import { ScoreDot } from "../bits";
export const dynamic = "force-dynamic";
export default async function LandingPagesList() {
    const row = await activeBrand();
    const pages = listPages(row.id);
    const roots = pages.filter((p) => !p.parent_id || !pages.some((x) => x.id === p.parent_id));
    const variants = (id: string) => pages.filter((p) => p.parent_id === id);
    return (<div>
      <PageHeader title="Builder" subtitle="Create landing pages, search articles and listicles. Carry customer research through drafting, review and export.">
        <Link href="/landing/articles" className="inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-semibold">Articles & listicles</Link>
        <Link href="/landing/pages/new" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="pages-new">
          New page <ArrowRight className="size-4"/>
        </Link>
      </PageHeader>
      {!pages.length ? (<EmptyNext title="No landing pages yet" why="Build one for an ad that works, for a persona, from scratch, or as a better version of a page the brand runs now." href="/landing/pages/new" act="New page" testid="pages-empty"/>) : (<div className="px-6 pt-4">
          <table className="w-full text-sm" data-testid="pages-table">
            <thead className="border-b border-rule text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">Score</th>
                <th className="font-medium">Page</th>
                <th className="font-medium">Type</th>
                <th className="font-medium">Built</th>
                <th className="font-medium">For</th>
                <th className="font-medium">Status</th>
                <th className="text-right font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {roots.flatMap((p) => [p, ...variants(p.id)]).map((p) => {
                const s = scoreOf(p.checks);
                return (<tr key={p.id} className="border-b hover:bg-secondary">
                    <td className="py-2.5">
                      <ScoreDot score={s.score} fails={s.fails}/>
                    </td>
                    <td className={p.parent_id ? "pl-6" : ""}>
                      <Link href={`/landing/pages/${p.id}`} className="font-semibold hover:underline" data-testid={`page-${p.id}`}>
                        {p.parent_id ? "↳ " : ""}
                        {p.title}
                      </Link>
                      {p.variant_note && <div className="text-xs text-muted-foreground">Changes: {p.variant_note}</div>}
                    </td>
                    <td className="text-xs">{KIND_LABEL[p.kind].label}</td>
                    <td className="text-xs">{SOURCE_LABEL[p.source.kind]}</td>
                    <td className="text-xs">{p.brief.audience?.label ?? ""}</td>
                    <td className="text-xs">{STATUS_LABEL[p.status]}</td>
                    <td className="text-right text-xs tabular-nums">{p.version}</td>
                  </tr>);
            })}
            </tbody>
          </table>
        </div>)}
    </div>);
}
