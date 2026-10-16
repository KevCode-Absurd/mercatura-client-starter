"use client";
import { useMemo, useState, useTransition } from "react";
import { LIST_PAGE, ShowMore } from "@/components/show-more";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState, } from "@tanstack/react-table";
import { ArrowUpDown, Lock, Pencil, ScatterChart as ScatterIcon, Table2 } from "lucide-react";
import { toast } from "sonner";
import { IntensityDots, SourceLetters, TypePill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { InsightRow, ThemeRow } from "@/db/schema";
import { daysSince } from "@/lib/ranking";
import { BEATS, INSIGHT_TYPES, OBJECTION_CLASSES, OBJECTION_LABELS, SOURCE_INFO, SOURCE_TYPES, humanize, } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import type { AngleLibrary, MinedAngle } from "@/lib/angles/library";
import { mergeThemesAction, renameThemeAction, splitThemeAction, unlockThemeAction } from "./actions";
import { AngleBlock, AnglesTab } from "./angles-tab";
import { GuardrailRules } from "./guardrails";
import { ClusterControls, MergeDialog } from "./theme-tools";
const ThemeScatter = dynamic(() => import("./theme-scatter").then(m => m.ThemeScatter), {
    loading: () => <div className="flex h-[494px] items-center justify-center rounded-lg border text-sm text-muted-foreground" role="status">Loading chart…</div>,
});
const ALL = "__all";
type View = "all" | "angles" | "beat" | "objections" | "guardrails" | "raw";
type Item = {
    id: string;
    source_type: string;
    date: string | null;
    title: string | null;
};
export function InsightsView({ themes, insights, items, personas, initialTheme, initialView, library, unthemed, live, clustering, }: {
    themes: ThemeRow[];
    insights: InsightRow[];
    items: Item[];
    personas: {
        id: string;
        name: string;
    }[];
    initialTheme: string | null;
    initialView?: View;
    library: AngleLibrary;
    unthemed: number;
    live: boolean;
    clustering: boolean;
}) {
    const [view, setView] = useState<View>(initialView ?? (themes.length ? "all" : "raw"));
    const [chart, setChart] = useState(false);
    const [type, setType] = useState(ALL);
    const [source, setSource] = useState(ALL);
    const [persona, setPersona] = useState(ALL);
    const [beat, setBeat] = useState(ALL);
    const [minScore, setMinScore] = useState("");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState<string | null>(initialTheme);
    const [sorting, setSorting] = useState<SortingState>([]);
    const advanced = useAdvanced();
    const shownView: View = advanced || view === "all" || view === "angles" || view === "objections" ? view : themes.length ? "all" : "raw";
    const showChart = advanced && chart;
    const insightsByTheme = useMemo(() => {
        const m = new Map<string, InsightRow[]>();
        for (const i of insights)
            if (i.theme_id)
                m.set(i.theme_id, [...(m.get(i.theme_id) ?? []), i]);
        return m;
    }, [insights]);
    const filtered = themes.filter((t) => {
        if (type !== ALL && t.type !== type)
            return false;
        if (advanced && source !== ALL && !t.source_types.includes(source as never))
            return false;
        if (advanced && persona !== ALL && !t.personas.includes(persona))
            return false;
        if (advanced && beat !== ALL && t.beat !== beat)
            return false;
        if (advanced && minScore && t.score < Number(minScore))
            return false;
        if (q) {
            const needle = q.toLowerCase();
            const hit = t.label.toLowerCase().includes(needle) ||
                (insightsByTheme.get(t.id) ?? []).some((i) => i.quote.toLowerCase().includes(needle));
            if (!hit)
                return false;
        }
        return true;
    });
    const guardrails = filtered.filter((t) => t.type === "failure_mode");
    const columns = useMemo<ColumnDef<ThemeRow>[]>(() => [
        { accessorKey: "rank", header: "#", cell: (c) => <span className="tabular-nums text-muted-foreground">{c.getValue<number>()}</span> },
        { accessorKey: "label", header: "Theme", cell: (c) => <span className="block min-w-44 font-medium">{c.getValue<string>()}</span> },
        { accessorKey: "type", header: "Type", cell: (c) => <TypePill type={c.row.original.type}/> },
        { accessorKey: "frequency", header: "Freq", cell: (c) => <span className="tabular-nums">{c.getValue<number>()}</span> },
        {
            accessorKey: "intensity_avg",
            header: "Int avg",
            cell: (c) => <span className="tabular-nums">{Number(c.getValue<number>().toFixed(2))}</span>,
        },
        {
            id: "sources",
            accessorFn: (t) => t.source_types.length,
            header: "Sources",
            cell: (c) => <SourceLetters types={c.row.original.source_types}/>,
        },
        {
            id: "personas",
            accessorFn: (t) => t.personas.length,
            header: "Pers.",
            cell: (c) => <span className="tabular-nums text-muted-foreground">{c.getValue<number>()}</span>,
        },
        {
            id: "recency",
            accessorFn: (t) => daysSince(t.newest_date) ?? 9999,
            header: "Age",
            cell: (c) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{c.getValue<number>()}d</span>,
        },
        {
            accessorKey: "score",
            header: "Score",
            cell: (c) => <span className="font-semibold tabular-nums">{c.getValue<number>().toFixed(1)}</span>,
        },
    ], []);
    const plain = ["rank", "label", "type"];
    const shownColumns = advanced ? columns : columns.filter((c) => plain.includes("accessorKey" in c ? String(c.accessorKey) : (c.id ?? "")));
    const shownSorting = advanced ? sorting : sorting.filter((s) => plain.includes(s.id));
    const current = themes.find((t) => t.id === selected) ?? null;
    return (<div className="flex min-h-[calc(100vh-73px)]">
      <div className="min-w-0 flex-1 space-y-4 px-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={shownView} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="angles" data-testid="tab-angles">Angles</TabsTrigger>
              {advanced && <TabsTrigger value="beat">By beat</TabsTrigger>}
              <TabsTrigger value="objections">Objections</TabsTrigger>
              {advanced && <TabsTrigger value="guardrails">Guardrails</TabsTrigger>}
              {advanced && <TabsTrigger value="raw">Raw insights ({insights.length})</TabsTrigger>}
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap items-center gap-2">
            <ClusterControls unthemed={unthemed} insightCount={insights.length} live={live} clustering={clustering}/>
            {advanced && (<Button size="sm" variant="outline" onClick={() => setChart((c) => !c)}>
              {chart ? <Table2 className="size-4"/> : <ScatterIcon className="size-4"/>}
              {chart ? "Table" : "Scatter"}
            </Button>)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={type} onChange={setType} all="All types" options={INSIGHT_TYPES.map((t) => [t, humanize(t)])}/>
          {advanced && (<>
          <FilterSelect value={source} onChange={setSource} all="All sources" options={SOURCE_TYPES.map((t) => [t, SOURCE_INFO[t].tab])}/>
          <FilterSelect value={persona} onChange={setPersona} all="All personas" options={personas.map((p) => [p.id, p.name])}/>
          <FilterSelect value={beat} onChange={setBeat} all="All beats" options={[...BEATS.filter((b) => themes.some((t) => t.beat === b)), "guardrail"].map((b) => [b, humanize(b)])}/>
          <Input className="h-8 w-28" type="number" placeholder="Min score" value={minScore} onChange={(e) => setMinScore(e.target.value)}/>
            </>)}
          <Input className="h-8 w-56" placeholder="Search quotes" value={q} onChange={(e) => setQ(e.target.value)}/>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {themes.length} themes
          </span>
        </div>

        {shownView === "raw" ? (<RawInsights insights={insights} items={items} personas={personas} themes={themes} type={type} source={advanced ? source : ALL} persona={advanced ? persona : ALL} q={q} unthemed={unthemed} live={live} onSelect={setSelected}/>) : showChart ? (<ThemeScatter themes={shownView === "guardrails" ? guardrails : filtered} onSelect={setSelected}/>) : shownView === "angles" ? (<AnglesTab library={library} selected={selected} onSelect={setSelected} advanced={advanced} q={q}/>) : shownView === "all" ? (<ThemeTable data={filtered} columns={shownColumns} sorting={shownSorting} setSorting={setSorting} selected={selected} onSelect={setSelected}/>) : shownView === "beat" ? (<Grouped groups={[...BEATS, "guardrail" as const]
                .map((b) => ({ key: b, title: humanize(b), rows: filtered.filter((t) => t.beat === b) }))
                .filter((g) => g.rows.length)} columns={shownColumns} selected={selected} onSelect={setSelected}/>) : shownView === "objections" ? (<Grouped groups={OBJECTION_CLASSES.map((c, n) => ({
                key: c,
                title: `${n + 1}. ${OBJECTION_LABELS[c]}`,
                rows: filtered.filter((t) => t.objection_classes.includes(c)),
            }))} columns={shownColumns} selected={selected} onSelect={setSelected} note={advanced ? "Handle objections in this order in a script (Playbook 1, beat 5). A theme can sit in more than 1 class." : "Handle objections in this order in a script. A theme can sit in more than 1 group."}/>) : (<div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Failure modes, ranked on their own. High scorers become auditor rules: lines that trip them are blocked, and the
              promise must avoid them.
            </p>
            <GuardrailRules themes={guardrails} live={live} onSelect={setSelected}/>
            <ThemeTable data={guardrails.map((t, i) => ({ ...t, rank: i + 1 }))} columns={shownColumns} sorting={sorting} setSorting={setSorting} selected={selected} onSelect={setSelected}/>
          </div>)}
      </div>

      {current && (<ThemePanel key={current.id} theme={current} themes={themes} onSelect={setSelected} insights={insightsByTheme.get(current.id) ?? []} items={items} personas={personas} angle={library.angles.find((a) => a.theme_id === current.id) ?? null} onClose={() => setSelected(null)}/>)}
    </div>);
}
function FilterSelect({ value, onChange, all, options, }: {
    value: string;
    onChange: (v: string) => void;
    all: string;
    options: [
        string,
        string
    ][];
}) {
    return (<Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-40">
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
function ThemeTable({ data, columns, sorting, setSorting, selected, onSelect, }: {
    data: ThemeRow[];
    columns: ColumnDef<ThemeRow>[];
    sorting?: SortingState;
    setSorting?: (s: SortingState) => void;
    selected: string | null;
    onSelect: (id: string) => void;
}) {
    const table = useReactTable({
        data,
        columns,
        state: { sorting: sorting ?? [] },
        onSortingChange: (u) => setSorting?.(typeof u === "function" ? u(sorting ?? []) : u),
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: false,
        initialState: { pagination: { pageIndex: 0, pageSize: LIST_PAGE } },
    });
    const hidden = data.length - table.getRowModel().rows.length;
    return (<div>
    <div className="overflow-x-auto rounded-xl border border-rule bg-card">
      <table className="w-full text-sm" data-testid="themes-table">
        <thead className="border-b border-rule text-left text-xs text-muted-foreground">
          {table.getHeaderGroups().map((hg) => (<tr key={hg.id}>
              {hg.headers.map((h) => (<th key={h.id} className="px-4 py-3 font-medium whitespace-nowrap">
                  {setSorting ? (<button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <ArrowUpDown className="size-3 opacity-40"/>
                    </button>) : (flexRender(h.column.columnDef.header, h.getContext()))}
                </th>))}
            </tr>))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (<tr key={r.id} data-testid="theme-row" data-theme-id={r.original.id} data-theme-type={r.original.type} onClick={() => onSelect(r.original.id)} className={cn("cursor-pointer border-t border-rule first:border-t-0 hover:bg-muted/40", selected === r.original.id && "bg-primary/5")}>
              {r.getVisibleCells().map((c) => (<td key={c.id} className="px-4 py-3">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>))}
            </tr>))}
          {!data.length && (<tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted-foreground">
                No themes.
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>
    <ShowMore hidden={hidden} onMore={() => table.setPageSize(table.getState().pagination.pageSize + LIST_PAGE)} testId="themes-more"/>
    </div>);
}
function Grouped({ groups, columns, selected, onSelect, note, }: {
    groups: {
        key: string;
        title: string;
        rows: ThemeRow[];
    }[];
    columns: ColumnDef<ThemeRow>[];
    selected: string | null;
    onSelect: (id: string) => void;
    note?: string;
}) {
    return (<div className="space-y-4">
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {groups.map((g) => (<section key={g.key}>
          <h3 className="mb-1.5 text-sm font-medium">
            {g.title} <span className="text-muted-foreground">({g.rows.length})</span>
          </h3>
          <ThemeTable data={g.rows} columns={columns} selected={selected} onSelect={onSelect}/>
        </section>))}
    </div>);
}
function ThemePanel({ theme, themes, insights, items, personas, angle, onSelect, onClose, }: {
    theme: ThemeRow;
    themes: ThemeRow[];
    insights: InsightRow[];
    items: Item[];
    personas: {
        id: string;
        name: string;
    }[];
    angle: MinedAngle | null;
    onSelect: (id: string) => void;
    onClose: () => void;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState(theme.label);
    const [summary, setSummary] = useState(theme.summary);
    const [merging, setMerging] = useState(false);
    const [splitting, setSplitting] = useState(false);
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [splitLabel, setSplitLabel] = useState("");
    const [splitSummary, setSplitSummary] = useState("");
    const advanced = useAdvanced();
    const itemById = new Map(items.map((i) => [i.id, i]));
    const sorted = [...insights].sort((a, b) => b.intensity - a.intensity);
    const run = <R extends {
        ok: true;
    } | {
        ok: false;
        error: string;
    }>(fn: () => Promise<R>, msg: string, after?: (res: R & {
        ok: true;
    }) => void) => start(async () => {
        const res = await fn();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(msg);
        start(() => {
            router.refresh();
            after?.(res as R & {
                ok: true;
            });
        });
    });
    const togglePick = (id: string) => setPicked((s) => {
        const n = new Set(s);
        if (n.has(id))
            n.delete(id);
        else
            n.add(id);
        return n;
    });
    const splitOk = picked.size > 0 && picked.size < insights.length && splitLabel.trim().length > 0;
    return (<aside className="sticky top-0 h-screen w-[23rem] shrink-0 overflow-y-auto border-l bg-card p-4 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-[var(--bar)] max-md:z-30 max-md:h-auto max-md:w-full max-md:border-l-0 max-md:pb-[calc(var(--dock)+3rem)]" data-testid="theme-panel">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {advanced ? (<div className="text-xs text-muted-foreground">
            Rank {theme.rank} · score {theme.score.toFixed(1)}
          </div>) : (<div className="text-xs text-muted-foreground">Rank {theme.rank}</div>)}
          {advanced && editing ? (<form className="mt-1 space-y-2" onSubmit={(e) => {
                e.preventDefault();
                run(() => renameThemeAction({ themeId: theme.id, label, summary }), "Theme renamed.", () => setEditing(false));
            }}>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Theme label" data-testid="rename-label" autoFocus/>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Theme summary" rows={3} data-testid="rename-summary"/>
              <div className="flex gap-2">
                <Button size="sm" type="submit" disabled={pending || !label.trim()} data-testid="rename-save">
                  Save
                </Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => {
                setEditing(false);
                setLabel(theme.label);
                setSummary(theme.summary);
            }}>
                  Cancel
                </Button>
              </div>
            </form>) : (<h2 className="font-semibold">
              {theme.label}
              {advanced && (<Button size="icon-xs" variant="ghost" className="ml-1 align-middle" onClick={() => setEditing(true)} aria-label="Rename theme" data-testid="theme-rename">
                <Pencil />
              </Button>)}
            </h2>)}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close panel">
          ✕
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TypePill type={theme.type}/>
        {advanced && <Badge variant="outline">beat: {humanize(theme.beat)}</Badge>}
      </div>
      {advanced && theme.locked && (<div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary" className="border-amber-200 bg-amber-50 font-normal text-amber-800" data-testid="theme-locked">
            <Lock className="size-3"/>
            Edited — kept when re-clustering
          </Badge>
          <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => unlockThemeAction(theme.id), "Unlocked. Re-clustering may change this theme.")} data-testid="theme-unlock">
            Unlock
          </Button>
        </div>)}
      {!(advanced && editing) && <p className="mb-4 text-sm">{theme.summary}</p>}

      {angle && <AngleBlock key={`${angle.theme_id}-${angle.status}-${angle.angle_id}`} angle={angle} advanced={advanced}/>}

      {advanced && (<>
      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <Stat label="Frequency" value={`${theme.frequency} items`}/>
        <Stat label="Intensity" value={`${Number(theme.intensity_avg.toFixed(2))} avg · ${theme.intensity_peak} peak`}/>
        <Stat label="Source types" value={<SourceLetters types={theme.source_types}/>}/>
        <Stat label="Newest" value={theme.newest_date ?? "n/a"}/>
      </dl>

      <div className="mb-4 text-sm">
        <div className="mb-1 text-xs font-medium text-muted-foreground">Persona spread</div>
        <div className="flex flex-wrap gap-1">
          {theme.personas.length
                ? theme.personas.map((p) => (<Badge key={p} variant="secondary" className="font-normal">
                  {personas.find((x) => x.id === p)?.name ?? p} · {insights.filter((i) => i.persona_id === p).length}
                </Badge>))
                : "none tagged"}
        </div>
      </div>

      {theme.objection_classes.length > 0 && (<div className="mb-4 text-sm">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Objection classes</div>
          <div className="flex flex-wrap gap-1">
            {theme.objection_classes.map((c) => (<Badge key={c} variant="outline" className="font-normal">
                {OBJECTION_LABELS[c]}
              </Badge>))}
          </div>
        </div>)}
        </>)}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href={`/concepts?new=1&theme=${theme.id}`}>Use in concept</Link>
        </Button>
        {advanced && (<>
        <Button size="sm" variant="outline" onClick={() => setMerging(true)} disabled={pending} data-testid="theme-merge">
          Merge…
        </Button>
        <Button size="sm" variant={splitting ? "secondary" : "outline"} onClick={() => setSplitting((s) => !s)} disabled={pending || insights.length < 2} data-testid="theme-split">
          Split…
        </Button>
          </>)}
      </div>

      <MergeDialog theme={theme} themes={themes} open={advanced && merging} onOpenChange={setMerging} pending={pending} onMerge={(ids) => run(() => mergeThemesAction({ targetId: theme.id, sourceIds: ids }), `Merged ${ids.length} into this theme.`, () => setMerging(false))}/>

      {advanced && splitting && (<form className="mb-4 space-y-2 rounded-md border border-dashed p-2 text-sm" data-testid="split-form" onSubmit={(e) => {
                e.preventDefault();
                if (!splitOk)
                    return;
                run(() => splitThemeAction({ themeId: theme.id, insightIds: [...picked], label: splitLabel, summary: splitSummary }), `Split ${picked.size} quote${picked.size === 1 ? "" : "s"} into “${splitLabel.trim()}”.`, (res) => onSelect(res.id));
            }}>
          <p className="text-xs text-muted-foreground">
            Tick the quotes to move into a new {humanize(theme.type)} theme ({picked.size} of {insights.length}). At least 1 quote stays here.
          </p>
          <Input placeholder="New theme label" value={splitLabel} onChange={(e) => setSplitLabel(e.target.value)} aria-label="New theme label" data-testid="split-label"/>
          <Input placeholder="Summary (optional)" value={splitSummary} onChange={(e) => setSplitSummary(e.target.value)} aria-label="New theme summary" data-testid="split-summary"/>
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={pending || !splitOk} data-testid="split-submit">
              Split into new theme
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => {
                setSplitting(false);
                setPicked(new Set());
            }}>
              Cancel
            </Button>
          </div>
        </form>)}

      <div className="mb-1 text-xs font-medium text-muted-foreground">Quotes ({insights.length})</div>
      <ul className="space-y-2">
        {sorted.map((i) => {
            const item = itemById.get(i.source_item_id);
            return (<li key={i.id} className={cn("flex gap-2 rounded-md border p-2 text-sm", picked.has(i.id) && splitting && "border-primary bg-primary/5")} data-testid="theme-quote" data-insight-id={i.id}>
              {advanced && splitting && (<Checkbox className="mt-0.5" checked={picked.has(i.id)} onCheckedChange={() => togglePick(i.id)} aria-label="Split off this quote" data-testid="split-check"/>)}
              <div className="min-w-0 flex-1">
                <p>“{i.quote}”</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <IntensityDots value={i.intensity}/>
                  <Link className="text-primary hover:underline" href={`/sources?tab=${i.source_type}&item=${i.source_item_id}&hl=${i.id}`} data-testid="quote-source-link">
                    {SOURCE_INFO[i.source_type].tab}{advanced && <> · {i.source_item_id}</>}
                  </Link>
                  {item?.date && <span>{item.date}</span>}
                </div>
              </div>
            </li>);
        })}
      </ul>
    </aside>);
}
function Stat({ label, value }: {
    label: string;
    value: React.ReactNode;
}) {
    return (<div className="rounded-md border px-2 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>);
}
function RawInsights({ insights, items, personas, themes, type, source, persona, q, unthemed, live, onSelect, }: {
    insights: InsightRow[];
    items: Item[];
    personas: {
        id: string;
        name: string;
    }[];
    themes: ThemeRow[];
    type: string;
    source: string;
    persona: string;
    q: string;
    unthemed: number;
    live: boolean;
    onSelect: (id: string) => void;
}) {
    const [limit, setLimit] = useState(100);
    const advanced = useAdvanced();
    const itemById = new Map(items.map((i) => [i.id, i]));
    const personaName = new Map(personas.map((p) => [p.id, p.name]));
    const themeLabel = new Map(themes.map((t) => [t.id, t.label]));
    const rows = insights
        .filter((i) => (type === ALL || i.type === type) &&
        (source === ALL || i.source_type === source) &&
        (persona === ALL || i.persona_id === persona) &&
        (!q || i.quote.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => b.intensity - a.intensity || b.created_at.localeCompare(a.created_at));
    return (<div className="space-y-2">
      {unthemed > 0 && (<p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-sky-900" data-testid="unthemed-note">
          {unthemed} of {insights.length} insights have been read but are not in a theme yet, so they are not ranked.{" "}
          {live
                ? `"Sort ${unthemed} new insights into themes" places them (new themes are made for ones that fit nowhere).`
                : advanced ? "Clustering needs live mode (LLM_MODE=live)." : "Sorting them into themes is not switched on for this account."}
        </p>)}
      <div className="overflow-x-auto rounded-xl border border-rule bg-card">
        <table className="w-full text-sm" data-testid="raw-insights">
          <thead className="border-b border-rule text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Quote</th>
              <th className="px-2 py-2">Int.</th>
              <th className="px-2 py-2">Theme</th>
              <th className="px-2 py-2">Persona</th>
              <th className="px-2 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((i) => {
            const label = i.theme_id ? themeLabel.get(i.theme_id) : undefined;
            return (<tr key={i.id} className="border-t align-top">
                  <td className="px-2 py-2">
                    <TypePill type={i.type}/>
                    {i.objection_class && <div className="mt-1 text-xs text-muted-foreground">{humanize(i.objection_class)}</div>}
                  </td>
                  <td className="px-2 py-2">
                    <p>“{i.quote}”</p>
                    {i.note && <p className="mt-0.5 text-xs text-muted-foreground">{i.note}</p>}
                  </td>
                  <td className="px-2 py-2">
                    <IntensityDots value={i.intensity}/>
                  </td>
                  <td className="px-2 py-2 text-xs" data-testid="raw-theme">
                    {label ? (<button className="text-left text-primary hover:underline" onClick={() => onSelect(i.theme_id!)}>
                        {label}
                      </button>) : (<span className="text-muted-foreground">—</span>)}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{i.persona_id ? (personaName.get(i.persona_id) ?? i.persona_id) : "-"}</td>
                  <td className="px-2 py-2 text-xs whitespace-nowrap">
                    <Link className="text-primary hover:underline" href={`/sources?tab=${i.source_type}&item=${i.source_item_id}&hl=${i.id}`}>
                      {SOURCE_INFO[i.source_type].tab}
                    </Link>
                    <div className="text-muted-foreground">{itemById.get(i.source_item_id)?.date ?? ""}</div>
                  </td>
                </tr>);
        })}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (<div className="flex justify-center">
          <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + 100)}>
            Show more ({rows.length - limit} left)
          </Button>
        </div>)}
    </div>);
}
