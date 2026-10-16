"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusPill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InsightRow, SourceItemRow } from "@/db/schema";
import { BRAND_SOURCES, CUSTOMER_SOURCES, SOURCE_INFO, SOURCE_TYPES, isBrandSource, type SourceType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { deleteBatchAction, extractAction, extractPendingAction, loadSamplesAction } from "./actions";
import { FounderPanel, WebsitePanel, type WebsiteData } from "./brand-tabs";
import { ImportDialog } from "./import-dialog";
import { ItemDrawer } from "./item-drawer";
type Status = {
    queue: {
        preprocess: Record<string, number>;
        extract: Record<string, number>;
    };
    spend: {
        brand: {
            cost: number;
            calls: number;
        };
    };
    budget: {
        spent: number;
        cap: number;
    };
    items: {
        id: string;
        pre: string;
        ext: string;
    }[];
    jobs: {
        ref: string;
        kind: string;
        status: string;
        error: string | null;
    }[];
};
export interface BatchInfo {
    id: string;
    source_type: SourceType;
    origin: string;
    item_count: number;
    created_at: string;
}
const ALL = "__all";
export function SourcesView({ items, insights, themes, personas, initialTab, initialItem, initialHighlight, batches, live, hasSamples, website, founder, }: {
    batches: BatchInfo[];
    live: boolean;
    hasSamples: boolean;
    website: WebsiteData | null;
    founder: {
        answered: number;
        sections: number;
        stale: number;
    };
    items: SourceItemRow[];
    insights: InsightRow[];
    themes: {
        id: string;
        label: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    initialTab: SourceType;
    initialItem: string | null;
    initialHighlight: string | null;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [tab, setTab] = useState<SourceType>(initialTab);
    const [openItem, setOpenItem] = useState<string | null>(initialItem);
    const [persona, setPersona] = useState(ALL);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [stars, setStars] = useState<"all" | "objection" | number>("all");
    const [status, setStatus] = useState<Status | null>(null);
    const [pending, start] = useTransition();
    const wasActive = useRef(false);
    const advanced = useAdvanced();
    const inQueue = (s: Status | null) => s ? s.queue.preprocess.queued + s.queue.preprocess.running + s.queue.extract.queued + s.queue.extract.running : 0;
    const busy = items.some((i) => i.preprocess_status === "pending") || inQueue(status) > 0;
    useEffect(() => {
        let stop = false;
        const poll = async () => {
            try {
                const s: Status = await fetch("/api/pipeline/status", { cache: "no-store" }).then((r) => r.json());
                if (stop)
                    return;
                setStatus(s);
                const active = inQueue(s) > 0;
                if (active || wasActive.current)
                    router.refresh();
                wasActive.current = active;
            }
            catch {
            }
        };
        const stopPolling = pollWhileVisible(poll, busy ? 2500 : 10000, { immediate: true });
        return () => {
            stop = true;
            stopPolling();
        };
    }, [busy, router]);
    const liveStatus = useMemo(() => new Map((status?.items ?? []).map((i) => [i.id, i])), [status]);
    const jobByItem = useMemo(() => {
        const m = new Map<string, {
            kind: string;
            status: string;
            error: string | null;
        }>();
        for (const j of status?.jobs ?? [])
            if (j.ref && (j.status !== "failed" || !m.has(j.ref)))
                m.set(j.ref, j);
        return m;
    }, [status]);
    const itemState = (i: SourceItemRow) => {
        const job = jobByItem.get(i.id);
        if (job && (job.status === "queued" || job.status === "running")) {
            if (job.status === "queued")
                return "queued";
            return job.kind === "preprocess" ? "pre-processing" : "extracting";
        }
        const l = liveStatus.get(i.id);
        const pre = l?.pre ?? i.preprocess_status;
        const ext = l?.ext ?? i.extraction_status;
        if (pre === "failed")
            return "failed";
        if (pre === "pending")
            return "pending";
        return ext;
    };
    const insightsByItem = useMemo(() => {
        const m = new Map<string, InsightRow[]>();
        for (const i of insights)
            m.set(i.source_item_id, [...(m.get(i.source_item_id) ?? []), i]);
        return m;
    }, [insights]);
    const itemPersonas = (item: SourceItemRow) => new Set([item.persona_hint, ...(insightsByItem.get(item.id) ?? []).map((i) => i.persona_id)].filter(Boolean));
    const rows = items.filter((i) => {
        if (i.source_type !== tab)
            return false;
        if (persona !== ALL && !itemPersonas(i).has(persona))
            return false;
        if (from && (i.date ?? "") < from)
            return false;
        if (to && (i.date ?? "") > to)
            return false;
        if (tab === "review" && stars !== "all") {
            const r = Number(i.meta.rating);
            if (stars === "objection" ? r < 2 || r > 4 : r !== stars)
                return false;
        }
        return true;
    });
    const setUrl = (t: SourceType, item: string | null) => {
        const q = new URLSearchParams({ tab: t });
        if (item)
            q.set("item", item);
        router.replace(`${pathname}?${q}`, { scroll: false });
    };
    const run = (fn: () => Promise<{
        ok: true;
        queued?: number;
        items?: number;
        removed?: number;
    } | {
        ok: false;
        error: string;
    }>, msg: (n: number) => string) => start(async () => {
        const res = await fn();
        if (res.ok) {
            toast.success(msg(res.queued ?? res.items ?? res.removed ?? 0));
            router.refresh();
        }
        else
            toast.error(res.error);
    });
    const current = items.find((i) => i.id === openItem) ?? null;
    const pendingCount = items.filter((i) => i.source_type === tab && i.extraction_status !== "done").length;
    const q = status?.queue;
    const inFlight = inQueue(status);
    const failedCount = q ? q.extract.failed + q.preprocess.failed : 0;
    const tabBatches = batches.filter((b) => b.source_type === tab);
    return (<div className="space-y-6 px-6 pt-8">
      <details className="overflow-x-auto rounded-xl border border-rule bg-card">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">What each source is for</summary>
        <table className="w-full text-sm">
          <thead className="border-y border-rule text-left text-xs text-muted-foreground [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Primary job (what only this source gives)</th>
              <th className="px-4 py-2">Also yields</th>
              <th className="px-4 py-2">Yield</th>
              <th className="px-4 py-2">Effort</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_TYPES.map((t) => (<tr key={t} className="border-t">
                <td className="px-4 py-2 font-medium">{SOURCE_INFO[t].label}</td>
                <td className="px-4 py-2">{SOURCE_INFO[t].job}</td>
                <td className="px-4 py-2 text-muted-foreground">{SOURCE_INFO[t].alsoYields}</td>
                <td className="px-4 py-2">{SOURCE_INFO[t].yield}</td>
                <td className="px-4 py-2">{SOURCE_INFO[t].effort}</td>
              </tr>))}
          </tbody>
        </table>
      </details>

      <Tabs value={tab} onValueChange={(v) => {
            setTab(v as SourceType);
            setStars("all");
            setUrl(v as SourceType, null);
        }}>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          {([["What customers say", CUSTOMER_SOURCES], ["What the brand says", BRAND_SOURCES]] as const).map(([label, types]) => (<div key={label} className="min-w-0 max-w-full">
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
              <TabsList>
                {types.map((t) => (<TabsTrigger key={t} value={t} data-testid={`source-tab-${t}`}>
                    {SOURCE_INFO[t].tab}

                    <span className="ml-1.5 text-xs text-muted-foreground tabular-nums" data-testid={`source-count-${t}`}>{t === "website" ? (website?.register.claims.filter((c) => c.origin === "website" && c.status === "approved").length ?? 0) : items.filter((i) => i.source_type === t).length}</span>
                  </TabsTrigger>))}
              </TabsList>
            </div>))}
        </div>
      </Tabs>

      <div>
        <h2 className="display text-2xl">{SOURCE_INFO[tab].label}</h2>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="source-job">
          Job: {SOURCE_INFO[tab].job}
        </p>
      </div>

      {tab === "website" && (website ? <WebsitePanel data={website} live={live}/> : <p className="text-sm text-amber-800">This brand has no brand brain yet. Build it first: the website is read against its claims.</p>)}
      {tab === "founder" && <FounderPanel pending={founder} items={items.filter((i) => i.source_type === "founder").length} live={live}/>}

      {tab === "website" && <h3 className="pt-2 text-sm font-semibold">Pages read</h3>}
      {tab !== "website" && (<div className="flex flex-wrap items-center gap-2">
        {!isBrandSource(tab) && <ImportDialog type={tab} live={live}/>}
        <Button size="sm" variant="outline" disabled={pending || !pendingCount} onClick={() => run(() => extractPendingAction(tab), (n) => (n ? `Reading ${n} items for insights.` : "Nothing left to read in this tab."))} title={live ? undefined : advanced ? "Needs LLM_MODE=live" : "Not switched on for this account"}>
          Read all for insights ({pendingCount})
        </Button>
        {hasSamples && !isBrandSource(tab) && (<Button size="sm" variant="outline" disabled={pending} onClick={() => {
                    const q = !advanced
                        ? live
                            ? "Load this brand's sample data and read insights from it?"
                            : "Load this brand's sample data? In mock mode it is loaded and not read for insights."
                        : live
                            ? "Import every file in this brand's sample-data folder and extract insights with Claude?"
                            : "Import every file in this brand's sample-data folder? Mock mode runs pre-processing only.";
                    if (confirm(q))
                        run(() => loadSamplesAction(live), (n) => `Imported ${n} sample items.`);
                }} data-testid="load-samples">
            Load sample data
          </Button>)}
        <div className="mx-2 h-6 w-px bg-border"/>
        <Select value={persona} onValueChange={setPersona}>
          <SelectTrigger size="sm" className="w-52">
            <SelectValue placeholder="Persona"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All personas</SelectItem>
            {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>))}
          </SelectContent>
        </Select>
        <Input type="date" className="h-8 w-36" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date"/>
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" className="h-8 w-36" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date"/>
        {tab === "review" && (<div className="flex items-center gap-1" role="group" aria-label="Star filter">
            <Button size="sm" variant={stars === "all" ? "default" : "outline"} onClick={() => setStars("all")}>
              All
            </Button>
            <Button size="sm" variant={stars === "objection" ? "default" : "outline"} onClick={() => setStars("objection")}>
              Objection mine (2 to 4★)
            </Button>
            {[1, 2, 3, 4, 5].map((n) => (<Button key={n} size="sm" variant={stars === n ? "default" : "outline"} onClick={() => setStars(n)}>
                {n}★
              </Button>))}
          </div>)}
      </div>)}

      {q && (inFlight > 0 || failedCount > 0) && (<div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm" data-testid="pipeline-progress">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Preparing: <b className="tabular-nums">{q.preprocess.done}</b> done, <b className="tabular-nums">{q.preprocess.queued + q.preprocess.running}</b> to go
            </span>
            <span>
              Reading for insights: <b className="tabular-nums">{q.extract.done}</b> done, <b className="tabular-nums">{q.extract.queued + q.extract.running}</b> to go
            </span>
            {failedCount > 0 && <span className="text-red-700">{failedCount} failed</span>}
            {advanced && (<span className="ml-auto text-muted-foreground" data-testid="cost-counter">
              This brand: ${status!.spend.brand.cost.toFixed(3)} in {status!.spend.brand.calls} Claude calls · all brands ${status!.budget.spent.toFixed(2)} of ${status!.budget.cap} cap
            </span>)}
          </div>
          {inFlight > 0 && (<Progress value={((q.preprocess.done + q.extract.done) / Math.max(1, q.preprocess.done + q.extract.done + inFlight)) * 100} className="h-1.5"/>)}
          {[...new Set(status!.jobs.filter((j) => j.status === "failed" && j.error).map((j) => j.error))].slice(0, 3).map((e) => (<p key={e} className="text-xs text-red-700">
              {e}
            </p>))}
        </div>)}

      <div className="overflow-hidden rounded-xl border border-rule bg-card max-md:overflow-x-auto [&_thead]:border-t-0">
        <table className="w-full text-sm">
          <thead className="border-y border-rule text-left text-xs text-muted-foreground [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium">
            <tr>
              {advanced && <th className="px-3 py-2">ID</th>}
              <th className="px-3 py-2">Date</th>
              {tab === "review" && <th className="px-3 py-2">Rating</th>}
              <th className="px-3 py-2">Title / excerpt</th>
              {tab !== "website" && <th className="px-3 py-2 text-right">Insights</th>}
              <th className="px-3 py-2">{tab === "website" ? "Read" : "Extraction"}</th>
              <th className="px-3 py-2"/>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (<tr key={i.id} className={cn("cursor-pointer border-t border-rule first:border-t-0 hover:bg-muted/40 [&>td]:px-4 [&>td]:py-2.5", openItem === i.id && "bg-primary/5")} onClick={() => {
                setOpenItem(i.id);
                setUrl(tab, i.id);
            }} data-testid={`item-row-${i.id}`}>
                {advanced && <td className="px-3 py-2 font-mono text-xs">{i.id}</td>}
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">{i.date}</td>
                {tab === "review" && <td className="px-3 py-2 whitespace-nowrap">{"★".repeat(Number(i.meta.rating))}</td>}
                <td className="max-w-xl truncate px-3 py-2">
                  {i.title && i.source_type !== "review" ? <span className="font-medium">{i.title} · </span> : null}
                  <span className="text-muted-foreground">{excerpt(i)}</span>
                </td>
                {tab !== "website" && <td className="px-3 py-2 text-right tabular-nums">{insightsByItem.get(i.id)?.length ?? 0}</td>}
                <td className="px-3 py-2">
                  {tab === "website" ? <span className="text-xs text-muted-foreground">{i.preprocess_status === "done" ? "Read for claims" : "Being read"}</span> : <StatusPill status={itemState(i)}/>}
                </td>
                <td className="px-3 py-2 text-right">
                  {tab !== "website" && <Button size="sm" variant="ghost" disabled={pending || ["queued", "extracting", "pre-processing"].includes(itemState(i))} onClick={(e) => {
                    e.stopPropagation();
                    run(() => extractAction([i.id]), () => (advanced ? `Reading ${i.id} for insights.` : "Reading 1 item for insights."));
                }}>
                    {i.extraction_status === "done" ? "Read again" : "Read for insights"}
                  </Button>}
                </td>
              </tr>))}
            {!rows.length && (<tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  {tab === "website" ? "No pages read yet. Give the address above and press Read." : tab === "founder" ? "No founder answers brought in yet." : items.some((i) => i.source_type === tab) ? "No items match these filters." : `No ${SOURCE_INFO[tab].label.toLowerCase()} imported yet. Press Import to add a file.`}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {advanced && tabBatches.length > 0 && (<details className="rounded-xl border border-rule bg-card">
          <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">Import batches ({tabBatches.length})</summary>
          <ul className="divide-y text-sm">
            {tabBatches.map((b) => (<li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{b.id}</span> · {b.origin} · {b.item_count} items ·{" "}
                  <span className="text-muted-foreground">{b.created_at.slice(0, 16).replace("T", " ")}</span>
                </span>
                {b.origin !== "seed" && !isBrandSource(b.source_type) && (<Button size="sm" variant="ghost" disabled={pending} onClick={() => {
                        if (confirm(`Remove ${b.item_count} items from this import, with their insights?`))
                            run(() => deleteBatchAction(b.id), (n) => `Removed ${n} items.`);
                    }}>
                    Undo import
                  </Button>)}
              </li>))}
          </ul>
        </details>)}

      <ItemDrawer item={current} insights={current ? (insightsByItem.get(current.id) ?? []) : []} themes={themes} personas={personas} initialHighlight={current?.id === initialItem ? initialHighlight : null} onClose={() => {
            setOpenItem(null);
            setUrl(tab, null);
        }}/>
    </div>);
}
function excerpt(i: SourceItemRow): string {
    const done = i.preprocess_status === "done" && !!i.redacted_text;
    const segs = done ? i.meta.segments : (i.pipeline?.raw_segments ?? []);
    const text = done ? i.redacted_text : i.raw_text;
    const seg = segs.find((s) => s.role === "customer" && s.label !== "Title" && s.label !== "Post title");
    const t = seg ? text.slice(seg.start, seg.end) : text;
    return t.length > 140 ? t.slice(0, 140) + "..." : t;
}
