"use client";
import { useState, useTransition } from "react";
import { ShowMore, useShowMore } from "@/components/show-more";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blocks, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusPill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LENGTH_PRESETS, type AwarenessStage } from "@/lib/taxonomy";
import { MakeAssetsButton } from "../production/make-assets";
import { deleteScriptAction } from "./actions";
import { GenerateDialog, LiveGate, ScriptProgress } from "./generation";
const ALL = "__all";
type Row = {
    id: string;
    title: string;
    concept_id: string;
    length: string;
    status: string;
    made: {
        n: number;
        words: string;
    } | null;
    version: number;
    fails: number;
    warns: number;
    similar: {
        script_id: string;
        jaccard: number;
    } | null;
    hook_variant_of: string | null;
    hooks: number;
    words: number;
    est_seconds: number;
    written_by: string;
};
export function ScriptList({ scripts, concepts, initialConcept, live, notice, }: {
    notice?: React.ReactNode;
    scripts: Row[];
    concepts: {
        id: string;
        name: string;
        stage?: AwarenessStage;
        age?: string | null;
    }[];
    initialConcept: string | null;
    live: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const titleOf = (id: string) => scripts.find((x) => x.id === id)?.title ?? "another script";
    const [concept, setConcept] = useState(initialConcept ?? ALL);
    const [length, setLength] = useState(ALL);
    const [status, setStatus] = useState(ALL);
    const [audit, setAudit] = useState(ALL);
    const [similarOnly, setSimilarOnly] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState<Row | null>(null);
    const [pending, start] = useTransition();
    const flagged = (s: Row) => !!s.similar && !s.hook_variant_of;
    const rows = scripts.filter((s) => (concept === ALL || s.concept_id === concept) &&
        (!advanced || length === ALL || s.length === length) &&
        (status === ALL || s.status === status) &&
        (!advanced || audit === ALL || (audit === "fail" ? s.fails > 0 : audit === "warn" ? s.fails === 0 && s.warns > 0 : s.fails + s.warns === 0)) &&
        (!advanced || !similarOnly || flagged(s)));
    const { shown, hidden, more } = useShowMore(rows);
    const conceptName = new Map(concepts.map((c) => [c.id, c.name]));
    const flaggedCount = scripts.filter(flagged).length;
    const remove = () => start(async () => {
        if (!deleting)
            return;
        const res = await deleteScriptAction(deleting.id);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success("Script deleted.");
        setDeleting(null);
        router.refresh();
    });
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Scripts" subtitle="Every script the app wrote or you added. Open one to read, edit or approve it.">
        <Button size="sm" variant="outline" asChild>
          <Link href="/coverage" data-testid="scripts-from-gaps">
            <Target className="size-4"/>
            Plan from the gaps
          </Link>
        </Button>

        <LiveGate live={live}>
          <Button size="sm" variant="outline" onClick={() => setGenerating(true)} disabled={!live || !concepts.length} data-testid="generate-scripts">
            <Sparkles className="size-4"/>
            Write from a concept
          </Button>
        </LiveGate>
        <Button size="sm" asChild>
          <Link href="/builder" data-testid="scripts-to-builder">
            <Blocks className="size-4"/>
            Write scripts
          </Link>
        </Button>
      </PageHeader>
      {notice}
      <div className="space-y-5 px-6 pt-8">
        <ScriptProgress live={live}/>
        <div className="flex flex-wrap items-center gap-2">
          {advanced && <F testid="filter-concept" value={concept} onChange={setConcept} all="All concepts" options={concepts.map((c) => [c.id, c.name])}/>}
          {advanced && <F testid="filter-length" value={length} onChange={setLength} all="All lengths" options={LENGTH_PRESETS.map((l) => [l, l])}/>}
          <F testid="filter-status" value={status} onChange={setStatus} all="All statuses" options={["draft", "approved", "ready_for_handoff"].map((s) => [s, s.replace(/_/g, " ")])}/>
          {advanced && <F testid="filter-audit" value={audit} onChange={setAudit} all="Any audit state" options={[["clean", "Clean"], ["warn", "Warnings only"], ["fail", "Has fails"]]}/>}
          {advanced && (<Button size="sm" variant={similarOnly ? "default" : "outline"} onClick={() => setSimilarOnly((v) => !v)} aria-pressed={similarOnly} data-testid="filter-similar">
            Similar pairs ({flaggedCount})
          </Button>)}

          {!advanced && concept !== ALL && (<Button size="sm" variant="outline" onClick={() => setConcept(ALL)} data-testid="show-all-concepts">
              Only {conceptName.get(concept) ?? "1 concept"}. Show all
            </Button>)}
          <span className="text-xs text-muted-foreground" data-testid="script-count">
            {rows.length} of {scripts.length} scripts
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-rule bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-rule text-left text-xs font-medium text-muted-foreground [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium">
              <tr>
                {advanced && <th className="px-3 py-2">Version</th>}
                <th className="px-3 py-2">Title</th>
                {advanced && <th className="px-3 py-2">Concept</th>}
                <th className="px-3 py-2">Length</th>
                {advanced && <th className="px-3 py-2">Words / time</th>}
                {advanced && <th className="px-3 py-2">Hooks</th>}
                {advanced && <th className="px-3 py-2">Written by</th>}
                {advanced && <th className="px-3 py-2">Audit</th>}
                {advanced && <th className="px-3 py-2">Similar to</th>}
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Made into</th>
                <th className="px-3 py-2"/>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (<tr key={s.id} className="border-t border-rule first:border-t-0 hover:bg-muted/40 [&>td]:px-4 [&>td]:py-2.5" data-testid="script-row" data-script-id={s.id}>
                  {advanced && <td className="px-3 py-2 tabular-nums">v{s.version}</td>}
                  <td className="min-w-56 px-3 py-2">
                    <Link href={`/scripts/${s.id}`} className="text-[15px] font-medium text-foreground hover:text-primary hover:underline" data-testid="script-link">
                      {s.title}
                    </Link>
                  </td>
                  {advanced && <td className="px-3 py-2 text-muted-foreground">{conceptName.get(s.concept_id) ?? s.concept_id}</td>}
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{s.length}</td>
                  {advanced && (<>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    {s.words} / {s.est_seconds}s
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.hooks}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground" data-testid="script-written-by">
                    {s.written_by}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    <span className={s.fails ? "text-red-700" : "text-muted-foreground"}>{s.fails} fail</span> ·{" "}
                    <span className={s.warns ? "text-amber-700" : "text-muted-foreground"}>{s.warns} warn</span>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {s.hook_variant_of ? (<span className="text-muted-foreground">hook variant of “{titleOf(s.hook_variant_of)}”</span>) : s.similar ? (<span className="text-amber-700">
                        “{titleOf(s.similar.script_id)}” ({Math.round(s.similar.jaccard * 100)}%)
                      </span>) : (<span className="text-muted-foreground">-</span>)}
                  </td>
                  </>)}
                  <td className="px-3 py-2">
                    <StatusPill status={s.status}/>
                  </td>
                  <td className="px-3 py-2 text-xs" data-testid="script-made">
                    {s.made ? (<Link href={`/production?script=${s.id}`} className="text-primary hover:underline" title="Open these on the Production board">
                        {s.made.words}
                      </Link>) : (<span className="text-muted-foreground">Nothing yet</span>)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap [&>button]:align-middle">
                    <MakeAssetsButton scriptId={s.id} size="icon" variant="ghost" testid="script-make-assets"/>
                    <button aria-label={advanced ? `Delete ${s.id}` : `Delete ${s.title}`} title={advanced ? `Delete ${s.id}` : `Delete ${s.title}`} onClick={() => setDeleting(s)} data-testid="script-delete" className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700 max-md:p-3">
                      <Trash2 className="size-4"/>
                    </button>
                  </td>
                </tr>))}
              {!rows.length && (<tr>
                  <td colSpan={advanced ? 12 : 5} className="px-3 py-8 text-center text-muted-foreground" data-testid="scripts-empty">
                    {scripts.length ? "No scripts match these filters." : "No scripts yet. Write some from a concept."}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <ShowMore hidden={hidden} onMore={more} testId="scripts-more"/>
      </div>

      {generating && <GenerateDialog open onOpenChange={setGenerating} concepts={concepts} conceptId={concept !== ALL ? concept : undefined}/>}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent data-testid="delete-script-dialog">
          <DialogHeader>
            <DialogTitle>{advanced ? <>Delete {deleting?.id}?</> : "Delete this script?"}</DialogTitle>
            <DialogDescription>
              &ldquo;{deleting?.title}&rdquo; and all {deleting?.version} of its versions are removed for good. Scripts with production jobs can&apos;t be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending} data-testid="delete-script-confirm">
              {pending ? "Deleting..." : "Delete script"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
function F({ value, onChange, all, options, testid }: {
    value: string;
    onChange: (v: string) => void;
    all: string;
    options: [
        string,
        string
    ][];
    testid: string;
}) {
    return (<Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-48" data-testid={testid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map(([v, l]) => (<SelectItem key={v} value={v}>
            {l}
          </SelectItem>))}
      </SelectContent>
    </Select>);
}
