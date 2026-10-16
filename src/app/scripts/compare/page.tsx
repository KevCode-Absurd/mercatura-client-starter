import Link from "next/link";
import { inArray } from "drizzle-orm";
import { PageHeader } from "@/components/bits";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { modelLabel, referenceModeLabel } from "@/lib/reference-modes";
import { scriptWords } from "@/lib/script-metrics";
import { auditSummary } from "@/lib/scripts/audit";
import { humanize } from "@/lib/taxonomy";
const VOICE_LABEL = { clean: "on voice", fixed: "voice fixed", suggested: "voice suggestions", skipped: "voice not checked" } as const;
export default async function CompareScriptsPage({ searchParams }: {
    searchParams: Promise<{
        ids?: string;
    }>;
}) {
    const brandId = await activeBrandId();
    const ids = [...new Set(((await searchParams).ids ?? "").split(",").map((x) => x.trim()).filter(Boolean))].slice(0, 4);
    const rows = ids.length ? db.select().from(schema.scripts).where(inArray(schema.scripts.id, ids)).all().filter((s) => s.brand_id === brandId) : [];
    const scripts = ids.map((id) => rows.find((r) => r.id === id)).filter((s): s is (typeof rows)[number] => !!s);
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/scripts", label: "Scripts" }} title="Compare scripts" subtitle="The same brief, written by different models. Open one to edit or approve it."/>
      {scripts.length < 2 ? (<p className="p-6 text-sm text-muted-foreground" data-testid="compare-empty">
          Pick at least 2 scripts to compare. Open a script and use &quot;Rebuild&quot; to write the same brief with another model.
        </p>) : (<div className="grid gap-4 p-6" style={{ gridTemplateColumns: `repeat(${scripts.length}, minmax(0, 1fr))` }} data-testid="compare-grid">
          {scripts.map((s) => {
                const { fails, warnings } = auditSummary(s.audit);
                return (<div key={s.id} className="min-w-0 rounded-md border text-sm" data-testid="compare-column">
                <div className="space-y-1 border-b bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.id} v{s.version}
                    </span>
                    <Link href={`/scripts/${s.id}`} className="text-xs font-medium text-primary hover:underline">
                      Open
                    </Link>
                  </div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs font-medium" data-testid="compare-model">
                    {s.reference_mode === "exact" ? "Reference copy" : modelLabel(s.model) || "Default model"}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>
                      {scriptWords(s.lines)} words, {s.est_seconds}s
                    </span>
                    <span className={fails ? "text-red-700" : ""}>
                      {fails} fail{fails === 1 ? "" : "s"}, {warnings} warning{warnings === 1 ? "" : "s"}
                    </span>
                    {s.voice_check && <span>{VOICE_LABEL[s.voice_check.status]}</span>}
                    {s.reference_mode && <span>{referenceModeLabel(s.reference_mode).toLowerCase()}</span>}
                  </div>
                </div>
                <ol className="divide-y">
                  {s.lines.map((l, i) => (<li key={i} className="px-3 py-2">
                      <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{humanize(l.beat)}</span>
                      {l.text}
                      {l.on_screen && <span className="mt-0.5 block text-xs text-muted-foreground">On screen: {l.on_screen}</span>}
                    </li>))}
                </ol>
                {s.audit.some((a) => a.status === "fail") && (<ul className="space-y-1 border-t px-3 py-2 text-xs text-red-700">
                    {s.audit
                            .filter((a) => a.status === "fail")
                            .map((a, i) => (<li key={i}>{a.message}</li>))}
                  </ul>)}
              </div>);
            })}
        </div>)}
    </div>);
}
