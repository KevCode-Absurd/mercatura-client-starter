"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRIEF_KINDS, DEALS, DEAL_LABEL, PARTNERSHIP, PARTNERSHIP_LABEL, PARTNERSHIP_STEPS, RIGHTS, RIGHTS_LABEL, TIER_INFO, WINNER_MULTIPLE, creatorSummary, nextStep, seedExpectation, tierOf, type BriefKind, type Creator, type Deal } from "@/lib/organic/creators";
import { COMMENTARY_SHAPE, IDEA_STATUSES, IDEA_STATUS_LABEL, ORGANIC_FORMATS, PLAN_WEEKS, SHOOT_PIECES, SHOOT_RULES, SOFT_CLOSES, type FounderIdea, type IdeaStatus } from "@/lib/organic/ideas";
import { cn } from "@/lib/utils";
import { deleteCreatorAction, saveCreatorAction, seedingBriefAction, setHandleAction, setIdeaStatusAction, writeCreatorBriefAction, writeIdeaBriefAction } from "./actions";
interface Row {
    idea: FounderIdea;
    status: IdeaStatus;
    href: string;
    note: string;
    like: {
        what: string;
        seconds: number;
    }[];
}
const GENERAL = "__general";
const field = "h-8 rounded-md border bg-background px-2 text-sm text-foreground disabled:opacity-60";
const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`), () => toast.error("Could not copy. Select the text instead."));
export function OrganicView({ initialTab, brandName, products, personas, rows, creators, handle, today }: {
    initialTab: "founder" | "creators";
    brandName: string;
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    rows: Row[];
    creators: Creator[];
    handle: string;
    today: string;
}) {
    const router = useRouter();
    const [tab, setTab] = useState<string>(initialTab);
    const [productId, setProductId] = useState(products[0]?.id ?? "");
    const [personaId, setPersonaId] = useState<string>(GENERAL);
    const [pending, start] = useTransition();
    const persona = personaId === GENERAL ? null : personaId;
    const act = (work: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, said?: string) => start(async () => {
        const res = await work();
        if (!res.ok)
            return void toast.error(res.error);
        if (said)
            toast.success(said);
        router.refresh();
    });
    return (<div className="space-y-5 px-6 py-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" data-testid="organic-for">
        <span className="text-muted-foreground">Briefs are written for</span>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-64 max-w-full" data-testid="organic-product">
            <SelectValue placeholder="Pick a product"/>
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (<SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">and</span>
        <Select value={personaId} onValueChange={setPersonaId}>
          <SelectTrigger className="w-60 max-w-full" data-testid="organic-persona">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GENERAL}>Your buyers in general</SelectItem>
            {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="founder" data-testid="tab-founder">
            Founder videos
          </TabsTrigger>
          <TabsTrigger value="creators" data-testid="tab-creators">
            Creators<span className="ml-1.5 text-xs text-muted-foreground">{creators.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="founder" className="mt-5">
          <FounderTab rows={rows} fill={(t) => t.replace("[brand]", brandName).replace("[product]", products.find((p) => p.id === productId)?.name ?? "[product]")} productId={productId} personaId={persona} pending={pending} act={act} onOpen={(href) => router.push(href)} start={start}/>
        </TabsContent>
        <TabsContent value="creators" className="mt-5">
          <CreatorsTab brandName={brandName} creators={creators} handle={handle} today={today} productId={productId} personaId={persona} pending={pending} act={act} onOpen={(href) => router.push(href)} start={start}/>
        </TabsContent>
      </Tabs>
    </div>);
}
type Act = (work: () => Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>, said?: string) => void;
type Start = (fn: () => Promise<void>) => void;
function FounderTab({ rows, fill, productId, personaId, pending, act, onOpen, start }: {
    rows: Row[];
    fill: (opens: string) => string;
    productId: string;
    personaId: string | null;
    pending: boolean;
    act: Act;
    onOpen: (href: string) => void;
    start: Start;
}) {
    const posted = rows.filter((r) => r.status === "posted").length;
    const next = rows.find((r) => r.status !== "posted")?.idea.id;
    const [open, setOpen] = useState<string | null>(next ?? null);
    const write = (ideaId: string) => start(async () => {
        const res = await writeIdeaBriefAction({ ideaId, productId, personaId });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.said);
        onOpen(res.href);
    });
    return (<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="display text-2xl">{PLAN_WEEKS} videos, 1 a week</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Each is filmed by your founder on a phone. Start at week 1: press the button and a brief is written for it, with what to say and what to film.</p>
          </div>
          <div className="w-44 text-right text-sm" data-testid="plan-progress">
            <span className="font-medium tabular-nums">
              {posted} of {PLAN_WEEKS}
            </span>{" "}
            <span className="text-muted-foreground">posted</span>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(posted / PLAN_WEEKS) * 100}%` }}/>
            </div>
          </div>
        </div>

        <ol className="mt-4 divide-y rounded-xl border bg-card" data-testid="founder-plan">
          {rows.map((r) => {
            const isOpen = open === r.idea.id;
            const beats = r.idea.beats?.map((b) => ({ what: b.what, time: `${b.at[0]} to ${b.at[1]} s` })) ?? r.like.map((b) => ({ what: b.what, time: `${b.seconds} s` }));
            return (<li key={r.idea.id} className={cn("p-4", r.idea.id === next && "border-l-2 border-l-primary", r.status === "posted" && "bg-muted/30")} data-testid={`idea-${r.idea.id}`} data-status={r.status}>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                  <span className={cn("numeral w-9 shrink-0 text-3xl leading-none", r.status === "posted" ? "text-muted-foreground" : "text-primary")} aria-label={`Week ${r.idea.week}`}>
                    {r.idea.week}
                  </span>
                  <div className="min-w-0 flex-1 basis-64">
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.idea.id)} className="flex items-center gap-1.5 text-left" aria-expanded={isOpen} data-testid={`idea-open-${r.idea.id}`}>
                      <span className="font-medium">{r.idea.name}</span>
                      {r.idea.id === next && <span className="rounded-sm bg-primary px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-primary-foreground">Next</span>}
                      <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-90")}/>
                    </button>
                    <p className="mt-0.5 text-sm text-muted-foreground">{r.idea.best_for}</p>
                    <p className="mt-1.5 text-sm">&ldquo;{fill(r.idea.opens)}&rdquo;</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <select value={r.status} onChange={(e) => act(() => setIdeaStatusAction(r.idea.id, e.target.value))} className={field} disabled={pending} aria-label={`Where week ${r.idea.week} stands`} data-testid={`idea-status-${r.idea.id}`}>
                      {IDEA_STATUSES.map((s) => (<option key={s} value={s}>
                          {IDEA_STATUS_LABEL[s]}
                        </option>))}
                    </select>
                    {r.href ? (<Button asChild size="sm" variant="outline">
                        <Link href={r.href} data-testid={`idea-brief-${r.idea.id}`}>
                          Open the brief
                          <ArrowRight className="size-3.5"/>
                        </Link>
                      </Button>) : (<Button size="sm" variant={r.idea.id === next ? "default" : "outline"} onClick={() => write(r.idea.id)} disabled={pending || !productId} data-testid={`idea-write-${r.idea.id}`}>
                        Write the brief
                      </Button>)}
                  </div>
                </div>
                {isOpen && (<div className="mt-3 space-y-2.5 pl-[3.25rem] text-sm max-sm:pl-0" data-testid={`idea-detail-${r.idea.id}`}>
                    {beats.length > 0 ? (<div>
                        <div className="text-xs font-medium text-muted-foreground">{r.idea.beats ? "The beats" : "Beats, as a guide"}</div>
                        <ol className="mt-1 flex flex-wrap gap-1.5">
                          {beats.map((b, i) => (<li key={i} className="rounded-md border bg-background px-2 py-1 text-xs">
                              {b.what} <span className="text-muted-foreground">{b.time}</span>
                            </li>))}
                        </ol>
                      </div>) : (<p className="text-muted-foreground">No fixed beats: 1 thing told well, in 45 to 60 seconds.</p>)}
                    {r.idea.needs && (<p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-900">
                        <span className="font-medium">It needs:</span> {r.idea.needs}
                      </p>)}
                    {r.href && (<button type="button" className="text-xs text-primary hover:underline" onClick={() => write(r.idea.id)} disabled={pending}>
                        Write the brief again
                      </button>)}
                  </div>)}
              </li>);
        })}
        </ol>

        <details className="group mt-5 rounded-xl border bg-card" data-testid="more-to-post">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium">
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90"/>
            More to post between them
            <span className="font-normal text-muted-foreground">15 formats, and ways to end a video that get a reply</span>
          </summary>
          <div className="space-y-5 border-t px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ORGANIC_FORMATS.map((g) => (<div key={g.group}>
                  <h3 className="text-sm font-semibold">{g.group}</h3>
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {g.formats.map((f) => (<li key={f.name}>
                        {f.name}
                        <span className="block text-xs text-muted-foreground">{f.what}</span>
                      </li>))}
                  </ul>
                </div>))}
            </div>
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Ways to end it</h3>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
                  {SOFT_CLOSES.map((s) => (<li key={s}>{s}</li>))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">One shape for a talking video</h3>
                <ol className="mt-1.5 space-y-1 text-sm">
                  {COMMENTARY_SHAPE.map((b) => (<li key={b.what}>
                      <span className="tabular-nums text-muted-foreground">
                        {b.at[0]} to {b.at[1]} s
                      </span>{" "}
                      {b.what}
                    </li>))}
                </ol>
                <p className="mt-1.5 text-xs text-muted-foreground">An example, not a rule.</p>
              </div>
            </div>
          </div>
        </details>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border bg-card p-4" data-testid="shoot-rules">
          <h3 className="text-sm font-semibold">How to film it</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {SHOOT_RULES.map((s) => (<li key={s}>{s}</li>))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-4" data-testid="shoot-pieces">
          <h3 className="text-sm font-semibold">1 shoot, {SHOOT_PIECES.length} pieces</h3>
          <ol className="mt-2 space-y-1.5 text-sm">
            {SHOOT_PIECES.map((p, i) => (<li key={p.id} className="flex gap-2">
                <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                <span>
                  {p.what}
                  <span className="block text-xs text-muted-foreground">{p.where}</span>
                </span>
              </li>))}
          </ol>
        </div>
        <p className="px-1 text-xs text-muted-foreground">These are posts, not ads: no price, no offer. A video that does well here can open an ad later.</p>
      </aside>
    </div>);
}
function CreatorsTab({ brandName, creators, handle, today, productId, personaId, pending, act, onOpen, start }: {
    brandName: string;
    creators: Creator[];
    handle: string;
    today: string;
    productId: string;
    personaId: string | null;
    pending: boolean;
    act: Act;
    onOpen: (href: string) => void;
    start: Start;
}) {
    const s = creatorSummary(creators, today);
    const [adding, setAdding] = useState("");
    const [deal, setDeal] = useState<Deal>("gifted");
    const [ours, setOurs] = useState(handle);
    const [brief, setBrief] = useState("");
    const [seed, setSeed] = useState("50");
    const expect = seedExpectation(Number(seed) || 0);
    useEffect(() => {
        let live = true;
        void seedingBriefAction(productId || null, deal).then((r) => {
            if (live && r.ok)
                setBrief(r.text);
        });
        return () => {
            live = false;
        };
    }, [productId, deal, handle]);
    const add = () => {
        if (adding.trim().length < 2)
            return;
        act(() => saveCreatorAction({ handle: adding, deal }), "Added.");
        setAdding("");
    };
    const fuller = (kind: BriefKind) => start(async () => {
        const res = await writeCreatorBriefAction({ kind, productId, personaId, deal });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.said);
        onOpen(res.href);
    });
    return (<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <h2 className="display text-2xl">Who you sent it to, and what came back</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Send the product with no strings, see who posts, and note how the post did against what that creator usually gets. At {WINNER_MULTIPLE} times their usual views it is worth running from their handle as an ad.</p>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm" data-testid="creator-summary">
          {([
            ["Sent", s.sent],
            ["Posted", s.posted],
            ["Winners", s.winners],
            ["Running as ads", s.running],
        ] as const).map(([label, n]) => (<div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="numeral text-2xl">{n}</dd>
            </div>))}
        </dl>
        {s.noRights > 0 && (<p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="creator-rights-warning">
            {s.noRights} winner{s.noRights === 1 ? " has" : "s have"} no agreed use yet. A creator&apos;s post cannot run as an ad until they agree to it in writing.
          </p>)}

        <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="creator-add">
          <Input className="w-56" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="@handle" aria-label="The creator's handle" data-testid="creator-handle"/>
          <select value={deal} onChange={(e) => setDeal(e.target.value as Deal)} className={cn(field, "h-9")} aria-label="The deal" data-testid="creator-deal">
            {DEALS.map((d) => (<option key={d} value={d}>
                {DEAL_LABEL[d]}
              </option>))}
          </select>
          <Button onClick={add} disabled={pending || adding.trim().length < 2} data-testid="creator-add-go">
            <Plus className="size-4"/>
            Add to the list
          </Button>
        </div>

        {creators.length === 0 ? (<p className="mt-4 rounded-xl border border-dashed p-6 text-sm text-muted-foreground" data-testid="creator-empty">
            Nobody on the list yet. Add the first handle above. A good start is 50 to 100 creators with 5,000 to 50,000 followers, picked for the fit and not for the size.
          </p>) : (<ul className="mt-4 space-y-2.5" data-testid="creator-list">
            {creators.map((c) => (<CreatorRow key={c.id} c={c} today={today} pending={pending} act={act}/>))}
          </ul>)}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-4" data-testid="seeding-brief">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">The note that ships with the product</h3>
            <Button size="sm" variant="outline" onClick={() => copy(brief, "The note")} disabled={!brief} data-testid="seeding-copy">
              <Copy className="size-3.5"/>
              Copy
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Half a page, no script. Built from {brandName}&apos;s own facts; change the deal and it changes with it.</p>
          <label className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="shrink-0 text-muted-foreground">Your handle</span>
            <Input className="h-8" value={ours} onChange={(e) => setOurs(e.target.value)} onBlur={() => ours.trim() !== handle && act(() => setHandleAction(ours))} placeholder="@yourbrand" data-testid="brand-handle"/>
          </label>
          <pre className="mt-2.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 font-sans text-xs leading-relaxed" data-testid="seeding-text">
            {brief || "..."}
          </pre>
        </div>

        <div className="rounded-xl border bg-card p-4" data-testid="creator-briefs">
          <h3 className="text-sm font-semibold">A fuller brief, for content you will pay behind</h3>
          <p className="mt-1 text-xs text-muted-foreground">Written for the product and buyer chosen above, with the disclosure as part of what is delivered.</p>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {BRIEF_KINDS.map((k) => (<Button key={k.id} size="sm" variant="outline" className="justify-between" onClick={() => fuller(k.id)} disabled={pending || !productId} data-testid={`creator-brief-${k.id}`}>
                {k.label}
                <ArrowRight className="size-3.5"/>
              </Button>))}
          </div>
        </div>

        <details className="group rounded-xl border bg-card" data-testid="partnership-steps">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold">
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90"/>
            Running a post from their handle
          </summary>
          <ol className="space-y-1.5 border-t px-4 py-3 text-sm">
            {PARTNERSHIP_STEPS.map((step, i) => (<li key={i} className="flex gap-2">
                <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                <span>{step}</span>
              </li>))}
          </ol>
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">You do these in the ad account. The app changes nothing there.</p>
        </details>

        <div className="rounded-xl border bg-card p-4" data-testid="seed-expect">
          <h3 className="text-sm font-semibold">What to expect</h3>
          <label className="mt-2 flex items-center gap-2 text-sm">
            Send to
            <Input type="number" min={1} className="h-8 w-20 text-right tabular-nums" value={seed} onChange={(e) => setSeed(e.target.value)} data-testid="seed-count"/>
            creators
          </label>
          <p className="mt-2 text-sm" data-testid="seed-result">
            About {expect.posts[0]} to {expect.posts[1]} post. Of those, {expect.usable[0]} to {expect.usable[1]} are good enough to pay behind.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Typical rates (4 or 5 in 10 post; 1 in 7 to 10 of those is usable), worked through. Your own list will tell you yours.</p>
        </div>
      </aside>
    </div>);
}
function CreatorRow({ c, today, pending, act }: {
    c: Creator;
    today: string;
    pending: boolean;
    act: Act;
}) {
    const [views, setViews] = useState(String(c.views || ""));
    const [avg, setAvg] = useState(String(c.avg_views || ""));
    const tier = tierOf(c, today);
    const save = (patch: Partial<Creator>) => act(() => saveCreatorAction({ id: c.id, handle: c.handle, ...patch }));
    const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));
    return (<li className="rounded-xl border bg-card p-3.5" data-testid={`creator-${c.handle}`} data-tier={tier ?? "waiting"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{c.handle}</span>
        {c.platform && <span className="text-xs text-muted-foreground">{c.platform}</span>}
        {c.profile_url && <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="text-xs underline">Open profile</a>}
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", tier === "A" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : tier === "B" ? "border-border bg-muted text-foreground" : tier === "C" ? "border-border bg-background text-muted-foreground" : "border-dashed text-muted-foreground")} title={tier ? TIER_INFO[tier].what : "Too early to say"}>
          {tier ? `Tier ${tier}` : "Waiting"}
        </span>
        <span className="min-w-0 flex-1 basis-64 text-sm text-muted-foreground" data-testid="creator-next">
          {nextStep(c, today)}
        </span>
        <button type="button" onClick={() => confirm(`Take ${c.handle} off the list?`) && act(() => deleteCreatorAction(c.id))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${c.handle}`} disabled={pending}>
          <Trash2 className="size-4"/>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs sm:grid-cols-4 xl:grid-cols-7">
        <label className="space-y-1">
          <span className="text-muted-foreground">Deal</span>
          <select value={c.deal} onChange={(e) => save({ deal: e.target.value as Deal })} className={cn(field, "w-full")} disabled={pending}>
            {DEALS.map((d) => (<option key={d} value={d}>
                {DEAL_LABEL[d]}
              </option>))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Sent on</span>
          <input type="date" value={c.sent} max={today} onChange={(e) => save({ sent: e.target.value })} className={cn(field, "w-full")} disabled={pending} data-testid="creator-sent"/>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Posted</span>
          <span className="flex h-8 items-center">
            <Switch checked={c.posted} onCheckedChange={(on) => save({ posted: on })} disabled={pending} data-testid="creator-posted"/>
          </span>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Views of the post</span>
          <input type="number" min={0} value={views} onChange={(e) => setViews(e.target.value)} onBlur={() => num(views) !== c.views && save({ views: num(views) })} className={cn(field, "w-full text-right tabular-nums")} disabled={pending || !c.posted} data-testid="creator-views"/>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Their usual views</span>
          <input type="number" min={0} value={avg} onChange={(e) => setAvg(e.target.value)} onBlur={() => num(avg) !== c.avg_views && save({ avg_views: num(avg) })} className={cn(field, "w-full text-right tabular-nums")} disabled={pending} data-testid="creator-avg"/>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Use in ads</span>
          <select value={c.rights} onChange={(e) => save({ rights: e.target.value as Creator["rights"] })} className={cn(field, "w-full")} disabled={pending} data-testid="creator-rights">
            {RIGHTS.map((r) => (<option key={r} value={r}>
                {RIGHTS_LABEL[r]}
              </option>))}
          </select>
          {c.rights === "agreed" && <input type="date" value={c.rights_until} onChange={(e) => save({ rights_until: e.target.value })} className={cn(field, "w-full")} disabled={pending} aria-label="Agreed until" title="Agreed until"/>}
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Partnership ad</span>
          <select value={c.partnership} onChange={(e) => save({ partnership: e.target.value as Creator["partnership"] })} className={cn(field, "w-full")} disabled={pending || c.rights !== "agreed"} title={c.rights !== "agreed" ? "Agree the use first" : undefined} data-testid="creator-partnership">
            {PARTNERSHIP.map((p) => (<option key={p} value={p}>
                {PARTNERSHIP_LABEL[p]}
              </option>))}
          </select>
        </label>
      </div>
    </li>);
}
