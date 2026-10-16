"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, CircleSlash, Copy, Download, Gauge, Loader2, Monitor, Plus, Save, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { TasteBar } from "@/components/taste-bar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LandingPageRow } from "@/db/schema";
import { renderPage } from "@/lib/landing/render";
import type { Theme } from "@/lib/landing/theme";
import { ADVERTORIAL_MEASURES, AREA_LABEL, AREA_ORDER, BUCKET_LABEL, FORMULAS, FORMULA_INFO, KIND_LABEL, PAGE_KINDS, SECTION_LABEL, STATUS_LABEL, type Formula, type Bucket, type BuyOption, type CheckResult, type ImageSlot, type PageKind, type PageStatus, type Quote, type Section } from "@/lib/landing/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deletePageAction, rewritePageAction, savePageAction, variantAction } from "../../actions";
import { PageFeedback } from "./page-feedback";
interface Props {
    initial: LandingPageRow;
    theme: Theme;
    brandName: string;
    currency: string;
    photos: {
        src: string;
        name: string;
        bucket: Bucket;
    }[];
    quotes: Quote[];
    options: BuyOption[];
    personas: {
        id: string;
        name: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    live: boolean;
    voice: boolean;
}
interface Ctx {
    photos: Props["photos"];
    quotes: Quote[];
    options: BuyOption[];
    currency: string;
}
const LABELS: Record<string, string> = { proof_line: "Proof under the headline", price_line: "Price line", why_now: "Why now", risk_line: "Risk reversal (under the button)", cta: "Button", subhead: "Sub-headline", eyebrow: "Small line above", rating_line: "Rating line", us: "Our column", them: "Their column", q: "Question", a: "Answer", greeting: "Opening", questions: "Pain questions (1 a line)", empathy: "Problem (empathy)", agitate: "Agitate (1 a line)", solve: "Solve", bullets: "Bullets (1 a line)", items: "Items", points: "Points (1 a line)", paragraphs: "Paragraphs (1 a line)", includes: "What's included (1 a line)", steps: "Steps", rows: "Rows", text: "Text" };
const LONG = new Set(["subhead", "body", "empathy", "solve", "a", "text"]);
const label = (k: string) => LABELS[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const SKIP = new Set(["id", "type", "on"]);
function blankLike(v: unknown): unknown {
    if (typeof v === "string")
        return "";
    if (typeof v === "number")
        return 0;
    if (typeof v === "boolean")
        return false;
    if (Array.isArray(v))
        return [];
    if (v === null)
        return null;
    if (v && typeof v === "object") {
        if ("bucket" in (v as object) && "src" in (v as object))
            return { src: "", alt: "", bucket: (v as ImageSlot).bucket };
        return Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, blankLike(x)]));
    }
    return v;
}
function ImageField({ value, onChange, ctx }: {
    value: ImageSlot;
    onChange: (v: ImageSlot) => void;
    ctx: Ctx;
}) {
    return (<div className="flex gap-3 rounded-md border p-2">
      <div className="size-16 shrink-0 overflow-hidden rounded bg-secondary">

        {value.src ? <img src={value.src} alt="" className="size-full object-cover"/> : <div className="flex size-full items-center justify-center p-1 text-center text-[9px] text-muted-foreground">No image yet</div>}
      </div>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">{BUCKET_LABEL[value.bucket]}</span>
          <Link href="/studio/new?kind=pdp" className="text-primary hover:underline" target="_blank">
            Make it in Creative Studio
          </Link>
        </div>
        <select className="h-8 w-full min-w-0 rounded-md border bg-background px-1 text-xs" value={ctx.photos.some((p) => p.src === value.src) ? value.src : ""} onChange={(e) => onChange({ ...value, src: e.target.value })} aria-label="Product photo">
          <option value="">{value.src && !ctx.photos.some((p) => p.src === value.src) ? "A link of your own" : "No photo"}</option>
          {ctx.photos.map((p) => (<option key={p.src} value={p.src}>
              {p.name} ({BUCKET_LABEL[p.bucket]})
            </option>))}
        </select>
        <Input className="h-8 text-xs" value={value.src} onChange={(e) => onChange({ ...value, src: e.target.value })} placeholder="Or paste an image link" aria-label="Image link"/>
        <Input className="h-8 text-xs" value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} placeholder="What the picture shows (alt text)" aria-label="Alt text"/>
      </div>
    </div>);
}
function QuoteCard({ q, onRemove }: {
    q: Quote;
    onRemove: () => void;
}) {
    return (<div className="flex gap-2 rounded-md border bg-secondary/50 p-2 text-xs">
      <div className="min-w-0 flex-1">
        <div>&ldquo;{q.text}&rdquo;</div>
        <div className="mt-0.5 text-muted-foreground">
          {q.who} · {q.source === "research" ? "from the research" : q.source === "documents" ? "from the brand's documents" : "entered by a person"}
        </div>
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove quote" className="self-start text-muted-foreground hover:text-destructive">
        <X className="size-4"/>
      </button>
    </div>);
}
function QuotesField({ value, onChange, ctx, max = 9 }: {
    value: Quote[];
    onChange: (v: Quote[]) => void;
    ctx: Ctx;
    max?: number;
}) {
    const [own, setOwn] = useState({ text: "", who: "" });
    const unused = ctx.quotes.filter((q) => !value.some((v) => v.text === q.text));
    return (<div className="grid gap-1.5">
      {value.map((q, i) => (<QuoteCard key={i} q={q} onRemove={() => onChange(value.filter((_, k) => k !== i))}/>))}
      {value.length < max && unused.length > 0 && (<select className="h-8 rounded-md border bg-background px-1 text-xs" value="" onChange={(e) => e.target.value && onChange([...value, unused[Number(e.target.value)]])} aria-label="Add a customer quote">
          <option value="">Add a customer&apos;s words ({unused.length} more)</option>
          {unused.map((q, i) => (<option key={i} value={i}>
              {q.text.slice(0, 90)} ({q.who})
            </option>))}
        </select>)}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Add words you have permission to use</summary>
        <div className="mt-1.5 grid gap-1.5">
          <Textarea rows={2} value={own.text} onChange={(e) => setOwn({ ...own, text: e.target.value })} placeholder="The review, word for word"/>
          <Input className="h-8" value={own.who} onChange={(e) => setOwn({ ...own, who: e.target.value })} placeholder="Who said it (first name and initial, where)"/>
          <Button size="sm" variant="outline" disabled={own.text.trim().length < 8 || !own.who.trim()} onClick={() => (onChange([...value, { text: own.text.trim(), who: own.who.trim(), source: "person" }]), setOwn({ text: "", who: "" }))}>
            Add
          </Button>
        </div>
      </details>
    </div>);
}
function OptionsField({ value, onChange, ctx }: {
    value: BuyOption[];
    onChange: (v: BuyOption[]) => void;
    ctx: Ctx;
}) {
    const unused = ctx.options.filter((o) => !value.some((v) => v.offer_id === o.offer_id));
    return (<div className="grid gap-1.5">
      {value.map((o, i) => (<div key={i} className="grid gap-1 rounded-md border p-2 text-xs">
          <div className="flex items-center gap-2">
            <Input className="h-8 flex-1 text-xs" value={o.label} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} aria-label="Option label"/>
            <span className="font-bold tabular-nums">{formatMoney(o.price, ctx.currency, { local: true })}</span>
            <button type="button" aria-label="Remove option" onClick={() => onChange(value.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-destructive">
              <X className="size-4"/>
            </button>
          </div>
          <div className="flex gap-2">
            <Input className="h-8 flex-1 text-xs" value={o.note} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} placeholder="Note under the option" aria-label="Option note"/>
            <Input className="h-8 w-32 text-xs" value={o.badge} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, badge: e.target.value } : x)))} placeholder="Badge" aria-label="Badge"/>
          </div>
        </div>))}
      {unused.length > 0 && (<select className="h-8 rounded-md border bg-background px-1 text-xs" value="" onChange={(e) => e.target.value && onChange([...value, unused.find((u) => u.offer_id === e.target.value)!])} aria-label="Add an option">
          <option value="">Add one of the brand&apos;s offers</option>
          {unused.map((o) => (<option key={o.offer_id ?? o.label} value={o.offer_id ?? ""}>
              {o.label} ({formatMoney(o.price, ctx.currency, { local: true })})
            </option>))}
        </select>)}
    </div>);
}
function Field({ k, value, onChange, ctx }: {
    k: string;
    value: unknown;
    onChange: (v: unknown) => void;
    ctx: Ctx;
}) {
    if (k === "options")
        return <OptionsField value={value as BuyOption[]} onChange={onChange} ctx={ctx}/>;
    if (k === "quotes")
        return <QuotesField value={value as Quote[]} onChange={onChange} ctx={ctx}/>;
    if (k === "quote")
        return <QuotesField value={value ? [value as Quote] : []} onChange={(v) => onChange(v[v.length - 1] ?? null)} ctx={ctx} max={1}/>;
    if (k === "image")
        return <ImageField value={value as ImageSlot} onChange={onChange} ctx={ctx}/>;
    if (k === "images")
        return (<div className="grid gap-1.5">
        {(value as ImageSlot[]).map((m, i) => (<div key={i} className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <ImageField value={m} onChange={(v) => onChange((value as ImageSlot[]).map((x, j) => (j === i ? v : x)))} ctx={ctx}/>
            </div>
            <button type="button" aria-label="Remove image" onClick={() => onChange((value as ImageSlot[]).filter((_, j) => j !== i))} className="mt-2 shrink-0 text-muted-foreground hover:text-destructive">
              <X className="size-4"/>
            </button>
          </div>))}
        <Button size="sm" variant="outline" onClick={() => onChange([...(value as ImageSlot[]), { src: "", alt: "", bucket: "benefits-list" }])}>
          <Plus className="size-3.5"/> Add an image
        </Button>
      </div>);
    if (typeof value === "string") {
        const long = LONG.has(k) || value.length > 70;
        return long ? <Textarea rows={Math.min(6, Math.max(2, Math.ceil(value.length / 60)))} value={value} onChange={(e) => onChange(e.target.value)}/> : <Input className="h-8" value={value} onChange={(e) => onChange(e.target.value)}/>;
    }
    if (Array.isArray(value) && value.every((v) => typeof v === "string"))
        return <Textarea rows={Math.max(2, value.length + 1)} value={(value as string[]).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))}/>;
    if (Array.isArray(value)) {
        const list = value as Record<string, unknown>[];
        return (<div className="grid gap-2">
        {list.map((item, i) => (<div key={i} className="rounded-md border p-2">
            <div className="mb-1 flex items-center justify-end gap-1 text-muted-foreground">
              <span className="mr-auto text-[11px]">{i + 1}</span>
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onChange(list.map((x, j) => (j === i - 1 ? list[i] : j === i ? list[i - 1] : x)))}>
                <ArrowUp className="size-3.5"/>
              </button>
              <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => onChange(list.map((x, j) => (j === i + 1 ? list[i] : j === i ? list[i + 1] : x)))}>
                <ArrowDown className="size-3.5"/>
              </button>
              <button type="button" aria-label="Remove" onClick={() => onChange(list.filter((_, j) => j !== i))} className="hover:text-destructive">
                <X className="size-3.5"/>
              </button>
            </div>
            <Fields value={item} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} ctx={ctx}/>
          </div>))}
        {list.length > 0 && (<Button size="sm" variant="outline" onClick={() => onChange([...list, blankLike(list[0])])}>
            <Plus className="size-3.5"/> Add
          </Button>)}
      </div>);
    }
    return null;
}
function Fields({ value, onChange, ctx }: {
    value: Record<string, unknown>;
    onChange: (v: Record<string, unknown>) => void;
    ctx: Ctx;
}) {
    return (<div className="grid min-w-0 gap-2.5">
      {Object.entries(value)
            .filter(([k]) => !SKIP.has(k) && k !== "offer_id" && k !== "price" && k !== "compare_at" && k !== "per_day")
            .map(([k, v]) => (<div key={k} data-field={k} className="min-w-0">
            <Label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label(k)}</Label>
            <Field k={k} value={v} onChange={(x) => onChange({ ...value, [k]: x })} ctx={ctx}/>
          </div>))}
    </div>);
}
const ICON = { pass: <Check className="size-4 text-emerald-600"/>, warn: <AlertTriangle className="size-4 text-amber-600"/>, fail: <X className="size-4 text-red-600"/>, na: <CircleSlash className="size-4 text-muted-foreground"/> };
function Checks({ checks }: {
    checks: CheckResult[];
}) {
    const open = checks.filter((c) => c.status === "fail" || c.status === "warn").sort((a, b) => (a.status === b.status ? b.ice - a.ice : a.status === "fail" ? -1 : 1));
    return (<div className="grid gap-4 text-sm" data-testid="checks">
      {open.length > 0 && (<div>
          <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Fix first (by impact, confidence and ease)</h3>
          <ol className="grid gap-1.5">
            {open.slice(0, 5).map((c) => (<li key={c.id} className="flex gap-2 rounded-md border p-2">
                {ICON[c.status]}
                <div>
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.message}</div>
                  {c.fix && <div className="mt-0.5 text-xs">Fix: {c.fix}</div>}
                </div>
              </li>))}
          </ol>
        </div>)}
      {AREA_ORDER.map((area) => {
            const list = checks.filter((c) => c.area === area);
            if (!list.length)
                return null;
            return (<div key={area}>
            <h3 className="mb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">{AREA_LABEL[area]}</h3>
            <ul className="grid gap-1">
              {list.map((c) => (<li key={c.id} className="flex gap-2 text-xs" data-testid={`check-${c.id}`} data-status={c.status}>
                  <span className="mt-0.5">{ICON[c.status]}</span>
                  <span>
                    <span className="font-semibold">{c.label}.</span> <span className="text-muted-foreground">{c.message}</span>
                  </span>
                </li>))}
            </ul>
          </div>);
        })}
    </div>);
}
export function PageEditor({ initial, theme, brandName, currency, photos, quotes, options, personas, offers, live, voice }: Props) {
    const router = useRouter();
    const [page, setPage] = useState(initial);
    const [sections, setSections] = useState<Section[]>(initial.sections);
    const [brief, setBrief] = useState(initial.brief);
    const [title, setTitle] = useState(initial.title);
    const [kind, setKind] = useState<PageKind>(initial.kind);
    const [dirty, setDirty] = useState(false);
    const [open, setOpen] = useState<string | null>(initial.sections.find((s) => s.type === "hero")?.id ?? null);
    const [tab, setTab] = useState<"sections" | "brief" | "checks">("sections");
    const [view, setView] = useState<"phone" | "desktop">("phone");
    const [variant, setVariant] = useState(false);
    const [pending, start] = useTransition();
    const ctx: Ctx = { photos, quotes, options, currency };
    const html = useMemo(() => renderPage({ title, kind, sections, brandName, currency, ctaUrl: brief.cta_url, theme, preview: true }), [title, kind, sections, brandName, currency, brief.cta_url, theme]);
    const edit = (fn: (s: Section[]) => Section[]) => {
        setSections(fn);
        setDirty(true);
    };
    const fails = page.checks.filter((c) => c.status === "fail").length;
    const live_ = page.checks.filter((c) => c.status !== "na");
    const score = live_.length ? Math.round(((live_.length - fails - live_.filter((c) => c.status === "warn").length) / (live_.length + fails)) * 100) : 0;
    const save = (status?: PageStatus) => start(async () => {
        const res = await savePageAction(page.id, { title, kind, brief, sections: sections as unknown as Record<string, unknown>[], ...(status ? { status } : {}) });
        if (!res.ok)
            return void toast.error(res.error);
        setPage(res.page);
        setDirty(false);
        toast.success(status ? `Marked ${STATUS_LABEL[status].toLowerCase()}.` : "Saved and checked.");
    });
    return (<div className="px-6 pb-10 pt-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="h-9 max-w-md font-semibold" value={title} onChange={(e) => (setTitle(e.target.value), setDirty(true))} aria-label="Page title"/>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={page.status} onChange={(e) => save(e.target.value as PageStatus)} aria-label="Status" data-testid="page-status">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>
              {v}
            </option>))}
        </select>
        <Button onClick={() => save()} disabled={pending || !dirty} data-testid="page-save">
          {pending ? <Loader2 className="size-4 animate-spin"/> : <Save className="size-4"/>}
          {dirty ? "Save and check" : "Saved"}
        </Button>
        <Button variant="outline" disabled={pending || !live} title={live ? "1 model call rewrites every section's words with the landing page method, then the checks run again" : "Needs live mode"} onClick={() => start(async () => {
            if (dirty)
                await savePageAction(page.id, { title, kind, brief, sections: sections as unknown as Record<string, unknown>[] });
            const res = await rewritePageAction(page.id, brief.taste ?? {});
            if (!res.ok)
                return void toast.error(res.error);
            setPage(res.page);
            setSections(res.page.sections);
            setBrief(res.page.brief);
            setDirty(false);
            toast.success(`Rewritten by ${res.page.writer}.`);
        })} data-testid="page-rewrite">
          <Sparkles className="size-4"/> Rewrite with the model
        </Button>
        <Button variant="outline" onClick={() => setVariant(true)} data-testid="page-variant">
          <Copy className="size-4"/> Make a variant
        </Button>
        <a className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-secondary" href={`/api/landing/${page.id}/html?download=1`} onClick={(e) => dirty && (e.preventDefault(), toast.error("Save first, then download."))} data-testid="page-download">
          <Download className="size-4"/> Download HTML
        </a>
        <Link className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-secondary" href={`/landing/speed?page=${page.id}`}>
          <Gauge className="size-4"/> Test its speed
        </Link>
        <Button variant="ghost" className="ml-auto text-destructive" onClick={() => confirm("Delete this page? Its variants stay.") &&
            start(async () => {
                const res = await deletePageAction(page.id);
                if (!res.ok)
                    return void toast.error(res.error);
                router.push("/landing/pages");
            })}>
          <Trash2 className="size-4"/> Delete
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3 rounded-md border border-input p-3" data-testid="page-score">
            <div className={cn("flex size-12 items-center justify-center rounded-full text-lg font-extrabold", fails ? "bg-red-100 text-red-800" : score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")}>{score}</div>
            <div className="text-xs">
              <div className="text-sm font-bold">{fails ? `${fails} check${fails === 1 ? "" : "s"} failing` : "No failing checks"}</div>
              {page.checks.filter((c) => c.status === "warn").length} to look at. {dirty ? "Save to check the edits." : `Checked on version ${page.version}.`}
            </div>
          </div>
          <PageFeedback pageId={page.id} voice={voice}/>
          <div className="mb-3 flex gap-1 text-sm">
            {(["sections", "brief", "checks"] as const).map((t) => (<button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5 font-semibold capitalize", tab === t ? "bg-foreground text-background" : "hover:bg-secondary")} data-testid={`editor-tab-${t}`}>
                {t}
              </button>))}
          </div>

          {tab === "sections" && (<ul className="grid min-w-0 gap-1.5" data-testid="sections">
              {sections.map((s, i) => (<li key={s.id} className={cn("min-w-0 rounded-md border", !s.on && "opacity-60")}>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <input type="checkbox" checked={s.on} onChange={() => edit((all) => all.map((x) => (x.id === s.id ? ({ ...x, on: !x.on } as Section) : x)))} aria-label={`Show ${SECTION_LABEL[s.type]}`}/>
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-semibold" onClick={() => setOpen(open === s.id ? null : s.id)} data-testid={`section-${s.type}`}>
                      {open === s.id ? <ChevronDown className="size-4"/> : <ChevronRight className="size-4"/>}
                      <span className="truncate">{SECTION_LABEL[s.type]}</span>
                    </button>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => edit((all) => all.map((x, j) => (j === i - 1 ? all[i] : j === i ? all[i - 1] : x)))} className="text-muted-foreground disabled:opacity-30">
                      <ArrowUp className="size-4"/>
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => edit((all) => all.map((x, j) => (j === i + 1 ? all[i] : j === i ? all[i + 1] : x)))} className="text-muted-foreground disabled:opacity-30">
                      <ArrowDown className="size-4"/>
                    </button>
                  </div>
                  {open === s.id && (<div className="border-t p-2.5">
                      <Fields value={s as unknown as Record<string, unknown>} onChange={(v) => edit((all) => all.map((x) => (x.id === s.id ? (v as unknown as Section) : x)))} ctx={ctx}/>
                    </div>)}
                </li>))}
            </ul>)}

          {tab === "brief" && (<div className="grid gap-3 text-sm" data-testid="brief">
              <div className="rounded-md border p-3" data-testid="page-taste-row">
                <p className="mb-2 text-xs text-muted-foreground">Used the next time you press “Rewrite with the model”.</p>
                <TasteBar id="page-taste" surface="landing" stage={brief.awareness} hasReference={!!page.ad} value={brief.taste ?? {}} onChange={(t) => (setBrief({ ...brief, taste: t }), setDirty(true))}/>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Page type</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2" value={kind} onChange={(e) => (setKind(e.target.value as PageKind), setDirty(true))}>
                  {PAGE_KINDS.map((k) => (<option key={k} value={k}>
                      {KIND_LABEL[k].label}: {KIND_LABEL[k].for}
                    </option>))}
                </select>
              </div>
              {kind === "advertorial" && (<div className="rounded-md border p-3" data-testid="advertorial-brief">
                  <Label className="mb-1 block text-xs">Headline formula</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-2" value={brief.formula ?? ""} onChange={(e) => (setBrief({ ...brief, formula: (e.target.value || null) as Formula | null }), setDirty(true))} data-testid="brief-formula">
                    <option value="">The writer picks</option>
                    {FORMULAS.map((f) => (<option key={f} value={f}>
                        {FORMULA_INFO[f].label}: {FORMULA_INFO[f].template}
                      </option>))}
                  </select>
                  {!!brief.headlines?.length && (<div className="mt-2">
                      <div className="mb-1 text-xs text-muted-foreground">All 4 were written. The others are the test queue: same supported reasons, a different story.</div>
                      <ul className="grid gap-1">
                        {brief.headlines.map((h) => (<li key={h.formula} className="flex items-start justify-between gap-2 rounded border px-2 py-1 text-xs">
                            <span>
                              <b>{FORMULA_INFO[h.formula].label}.</b> {h.text}
                            </span>
                            <Button size="xs" variant="outline" onClick={() => (edit((all) => all.map((x) => (x.type === "hero" ? { ...x, headline: h.text } : x))), setBrief({ ...brief, formula: h.formula }))} data-testid={`use-headline-${h.formula}`}>
                              Use
                            </Button>
                          </li>))}
                      </ul>
                    </div>)}
                  <div className="mt-3 text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">What to measure, in order</div>
                    <ol className="ml-4 list-decimal">
                      {ADVERTORIAL_MEASURES.map((m) => (<li key={m}>{m}</li>))}
                    </ol>
                    <div className="mt-1">Run it as a real test: the same ad and the same budget to this page and to the product page.</div>
                  </div>
                </div>)}
              <div>
                <Label className="mb-1 block text-xs">The 1 promise</Label>
                <Input value={brief.promise} onChange={(e) => (setBrief({ ...brief, promise: e.target.value }), setDirty(true))}/>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Angle</Label>
                <Textarea rows={2} value={brief.angle} onChange={(e) => (setBrief({ ...brief, angle: e.target.value }), setDirty(true))}/>
              </div>
              <div>
                <Label className="mb-1 block text-xs">How aware the buyer is</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2" value={brief.awareness} onChange={(e) => (setBrief({ ...brief, awareness: e.target.value }), setDirty(true))}>
                  {["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"].map((a) => (<option key={a} value={a}>
                      {a.replace(/_/g, " ")}
                    </option>))}
                </select>
              </div>
              {brief.audience && (<p className="rounded-md bg-secondary p-2 text-xs">
                  The ad works best for <b>{brief.audience.label}</b> (simulated).
                </p>)}
              <div>
                <Label className="mb-1 block text-xs">Where every button goes</Label>
                <Input value={brief.cta_url} onChange={(e) => (setBrief({ ...brief, cta_url: e.target.value }), setDirty(true))} placeholder="https://store.com/products/..." data-testid="brief-cta"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="mb-1 block text-xs">Rating (only a real one)</Label>
                  <Input type="number" step="0.1" min="1" max="5" value={brief.rating?.value ?? ""} onChange={(e) => (setBrief({ ...brief, rating: e.target.value ? { value: Number(e.target.value), count: brief.rating?.count ?? "" } : null }), setDirty(true))}/>
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Review count</Label>
                  <Input value={brief.rating?.count ?? ""} onChange={(e) => (setBrief({ ...brief, rating: brief.rating ? { ...brief.rating, count: e.target.value } : null }), setDirty(true))} placeholder="100K+"/>
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Notes for the writer</Label>
                <Textarea rows={3} value={brief.notes} onChange={(e) => (setBrief({ ...brief, notes: e.target.value }), setDirty(true))} placeholder="What to lead with, what to leave out"/>
              </div>
              {page.ad && (<div className="rounded-md border p-2 text-xs">
                  <div className="font-semibold">The ad this page follows</div>
                  <div>&ldquo;{page.ad.headline}&rdquo;</div>
                  {page.ad.angle && <div className="text-muted-foreground">{page.ad.angle}</div>}
                </div>)}
              <ul className="text-xs text-muted-foreground">
                {page.log.slice(-6).map((l, i) => (<li key={i}>
                    {l.at.slice(0, 16).replace("T", " ")} {l.message}
                  </li>))}
              </ul>
            </div>)}

          {tab === "checks" && <Checks checks={page.checks}/>}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1 text-sm">
            <button type="button" onClick={() => setView("phone")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1", view === "phone" ? "bg-foreground text-background" : "hover:bg-secondary")} data-testid="view-phone">
              <Smartphone className="size-4"/> Phone
            </button>
            <button type="button" onClick={() => setView("desktop")} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1", view === "desktop" ? "bg-foreground text-background" : "hover:bg-secondary")} data-testid="view-desktop">
              <Monitor className="size-4"/> Desktop
            </button>
            <span className="ml-2 text-xs text-muted-foreground">{dirty ? "Showing your edits; save to check them." : "As saved."}</span>
          </div>
          {view === "phone" ? (<div className="mx-auto w-[406px] rounded-[34px] border-8 border-foreground bg-foreground shadow-xl">
              <iframe title="Phone preview" srcDoc={html} className="h-[780px] w-[390px] rounded-[26px] bg-white" data-testid="preview"/>
            </div>) : (<div className="h-[780px] overflow-hidden rounded-md border">
              <iframe title="Desktop preview" srcDoc={html} className="h-[1560px] w-[200%] origin-top-left scale-50 bg-white" data-testid="preview"/>
            </div>)}
        </div>
      </div>

      <VariantDialog open={variant} onClose={() => setVariant(false)} page={page} personas={personas} offers={offers} onMade={(id) => router.push(`/landing/pages/${id}`)}/>
    </div>);
}
function VariantDialog({ open, onClose, page, personas, offers, onMade }: {
    open: boolean;
    onClose: () => void;
    page: LandingPageRow;
    personas: Props["personas"];
    offers: Props["offers"];
    onMade: (id: string) => void;
}) {
    const [what, setWhat] = useState<"persona" | "offer" | "kind" | "angle">("persona");
    const [value, setValue] = useState("");
    const [pending, start] = useTransition();
    const name = (list: {
        id: string;
        name: string;
    }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
    const note = what === "persona" ? `Buyer: ${name(personas, value)}` : what === "offer" ? `Offer: ${name(offers, value)}` : what === "kind" ? `Page type: ${value ? KIND_LABEL[value as PageKind].label : ""}` : `Angle: ${value}`;
    return (<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a variant</DialogTitle>
          <DialogDescription>Change 1 thing, so a test of the 2 pages says which thing worked. A new persona, offer or angle each deserve their own page.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            {(["persona", "offer", "angle", "kind"] as const).map((w) => (<button key={w} type="button" onClick={() => (setWhat(w), setValue(""))} className={cn("rounded-full border px-3 py-1", what === w ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}>
                {w === "kind" ? "Page type" : w[0].toUpperCase() + w.slice(1)}
              </button>))}
          </div>
          {what === "angle" ? (<Textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder="The promise to lead with instead"/>) : (<select className="h-9 rounded-md border bg-background px-2" value={value} onChange={(e) => setValue(e.target.value)} data-testid="variant-value">
              <option value="">Choose</option>
              {(what === "persona" ? personas.filter((p) => p.id !== page.persona_id) : what === "offer" ? offers.filter((o) => o.id !== page.offer_id) : PAGE_KINDS.filter((k) => k !== page.kind).map((k) => ({ id: k, name: KIND_LABEL[k].label }))).map((o) => (<option key={o.id} value={o.id}>
                  {o.name}
                </option>))}
            </select>)}
          <Button disabled={pending || !value.trim()} onClick={() => start(async () => {
            const res = await variantAction(page.id, { note, ...(what === "persona" ? { personaId: value } : what === "offer" ? { offerId: value } : what === "kind" ? { kind: value as PageKind } : { angle: value }) });
            if (!res.ok)
                return void toast.error(res.error);
            onClose();
            onMade(res.id);
        })} data-testid="variant-make">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <Copy className="size-4"/>} Make the variant
          </Button>
        </div>
      </DialogContent>
    </Dialog>);
}
