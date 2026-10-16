"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Loader2, Megaphone, Pencil, RotateCcw, ScanSearch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Conflict } from "@/lib/claim-conflicts";
import type { ClaimRegister, FoundClaim } from "@/lib/claim-sources";
import { tabNames } from "@/lib/brain/file-names";
import { cn } from "@/lib/utils";
import { approveFoundAction, editFoundAction, reopenConflictAction, scanClaimSourcesAction, setFoundStatusAction, settleConflictAction } from "./actions";
const ORIGIN = { website: { label: "Website", icon: Globe, tone: "border-sky-200 bg-sky-50 text-sky-700" }, ad: { label: "Ad", icon: Megaphone, tone: "border-violet-200 bg-violet-50 text-violet-700" } } as const;
function Figures({ conflicts, pending, act }: {
    conflicts: Conflict[];
    pending: boolean;
    act: (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done: string) => void;
}) {
    return (<ul className="space-y-3">
      {conflicts.map((c) => (<li key={c.topic} data-testid="conflict" data-topic={c.topic} data-status={c.status}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">{c.label}</span>
            {c.status === "settled" ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{c.live ? `Right: ${c.live}` : "No single figure is quoted"}</span> : <span className="rounded-full border border-amber-300 bg-card px-1.5 py-0.5 text-amber-800">Say which is right</span>}
            {c.status === "settled" && (<button type="button" className="text-muted-foreground underline" disabled={pending} onClick={() => act(() => reopenConflictAction(c.topic), "Open again.")}>
                Change
              </button>)}
          </div>
          <ul className="mt-1 space-y-1">
            {c.values.map((v) => (<li key={v.value} className="flex flex-wrap items-start gap-2 text-xs">
                <span className="w-32 shrink-0 font-medium">{v.value}</span>
                <span className="min-w-0 flex-1 text-muted-foreground">
                  {v.sightings.slice(0, 4).map((s, i) => (<span key={i}>
                      {i > 0 && "; "}
                      {s.origin === "website" ? "site" : s.origin === "ad" ? "ad" : "brand brain"}: “{s.quote.slice(0, 70)}”
                    </span>))}
                  {v.sightings.length > 4 && ` and ${v.sightings.length - 4} more`}
                </span>
                {c.status === "open" && (<Button size="sm" variant="outline" className="h-6 shrink-0 bg-card text-xs" disabled={pending} onClick={() => act(() => settleConflictAction(c.topic, v.value), `${v.value} is the right figure.`)} data-testid="conflict-live">
                    This one is right
                  </Button>)}
              </li>))}
          </ul>
          {c.status === "open" && (<Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" disabled={pending} onClick={() => act(() => settleConflictAction(c.topic, ""), "No single figure will be quoted.")} data-testid="conflict-none">
              It differs by place: quote no figure
            </Button>)}
        </li>))}
    </ul>);
}
function AsWritten({ c }: {
    c: FoundClaim;
}) {
    const o = ORIGIN[c.origin];
    return (<p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5", o.tone)}>
        <o.icon className="size-3"/> {o.label}
      </span>
      <span>
        As written: “{c.quote}”{" "}
        {c.where.startsWith("http") ? (<a href={c.where} target="_blank" rel="noreferrer" className="underline">
            {new URL(c.where).pathname === "/" ? "homepage" : new URL(c.where).pathname}
          </a>) : (<span>({tabNames(c.where)})</span>)}
      </span>
    </p>);
}
export function ClaimSourcesCard({ register, conflicts, defaultUrl, live, held = false }: {
    register: ClaimRegister;
    conflicts: Conflict[];
    defaultUrl: string;
    live: boolean;
    held?: boolean;
}) {
    const router = useRouter();
    const [url, setUrl] = useState(register.site_url || defaultUrl);
    const [pending, start] = useTransition();
    const [warnings, setWarnings] = useState<string[]>([]);
    const [show, setShow] = useState<"approved" | "ignored">("approved");
    const [origin, setOrigin] = useState<"all" | "website" | "ad">("all");
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const scan = () => start(async () => {
        const res = await scanClaimSourcesAction(url);
        if (!res.ok)
            return void toast.error(res.error);
        setWarnings(res.warnings);
        toast.success(`Read ${res.pages} page${res.pages === 1 ? "" : "s"} and ${res.ads} ad source${res.ads === 1 ? "" : "s"}. ${res.used} new claim${res.used === 1 ? " is" : "s are"} in use${res.waiting ? `, and ${res.waiting} wait${res.waiting === 1 ? "s" : ""} for you` : ""}.`);
        router.refresh();
    });
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done: string) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(done);
        router.refresh();
    });
    const save = (id: string) => start(async () => {
        const res = await editFoundAction(id, draft);
        if (!res.ok)
            return void toast.error(res.error);
        setEditing(null);
        toast.success("Saved. It is used with these words from now on.");
        router.refresh();
    });
    const open = conflicts.filter((c) => c.status === "open");
    const settled = conflicts.filter((c) => c.status === "settled");
    const waiting = register.claims.filter((c) => c.status === "found");
    const count = (s: FoundClaim["status"], o?: "website" | "ad") => register.claims.filter((c) => c.status === s && (!o || c.origin === o)).length;
    const rows = register.claims.filter((c) => c.status === show && (origin === "all" || c.origin === origin)).sort((a, b) => (a.origin === b.origin ? 0 : a.origin === "website" ? -1 : 1));
    return (<Card className="lg:col-span-2" id="claim-sources" data-testid="claim-sources">
      <CardHeader>
        <CardTitle className="text-base">Claims from the website and the brand&apos;s ads</CardTitle>
        <CardDescription>
          What the brand already says in public, in its own words. Each claim is used in your scripts and ads as soon as it is read. Change the wording of one that is out of date, or remove one you do not want used. When the site changes, read it again: a number the brand states 2 ways is shown first, for you to say which is right.
          <span data-testid="claims-mode" data-held={String(held)}/>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.com" className="h-8 max-w-sm" aria-label="Website address for claims" data-testid="sources-url"/>
          <Button size="sm" variant={register.scanned_at ? "outline" : "default"} onClick={scan} disabled={pending || !live} data-testid="sources-scan">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <ScanSearch className="size-4"/>}
            {pending ? "Reading (about 1 minute)" : register.scanned_at ? "Read again" : "Read the site and the ads"}
          </Button>
          {register.scanned_at && (<span className="text-xs text-muted-foreground" data-testid="sources-read">
              Last read {new Date(register.scanned_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}: {register.read.filter((r) => r.origin === "website").length} pages, {register.read.filter((r) => r.origin === "ad").length} ad sources
            </span>)}
          {!live && <span className="text-xs text-amber-700">Not switched on for this account.</span>}
        </div>
        {warnings.map((w) => (<p key={w} className="text-xs text-amber-700">
            {w}
          </p>))}

        {(open.length > 0 || waiting.length > 0) && (<div className="rounded-md border border-amber-200 bg-amber-50/60 p-3" data-testid="conflicts">
            <p className="text-sm font-medium text-amber-900">Waiting for you</p>
            {open.length > 0 && (<>
                <p className="mb-2 mt-0.5 text-xs text-amber-900/80">The same thing is stated with different numbers in different places. Say which number is right. Until you do, no ad quotes any of them.</p>
                <Figures conflicts={open} pending={pending} act={act}/>
              </>)}
            {waiting.length > 0 && (<ul className={cn("divide-y divide-amber-200/70", open.length > 0 && "mt-3 border-t border-amber-200/70")} data-testid="sources-waiting">
                {waiting.map((c) => (<li key={c.id} className="flex flex-wrap items-start gap-3 py-2" data-testid="source-claim" data-id={c.id} data-origin={c.origin} data-status={c.status}>
                    <div className="min-w-0 flex-1">
                      <p>{c.text}</p>
                      <AsWritten c={c}/>
                      <p className={cn("mt-0.5 text-xs", c.forbidden ? "text-red-700" : "text-amber-800")}>{c.forbidden ? `Not used: it breaks the forbidden claim “${c.forbidden}”.` : "Not used yet: it states a figure that is not settled, or not the one you said is right."}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {!c.forbidden && (<Button size="sm" variant="outline" className="h-7 bg-card text-xs" disabled={pending} onClick={() => act(() => approveFoundAction([c.id]), "In use now.")} data-testid="source-approve">
                          <Check className="size-3.5"/> Use it anyway
                        </Button>)}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => act(() => setFoundStatusAction(c.id, "ignored"), "Removed. It will not be used.")} data-testid="source-ignore">
                        <X className="size-3.5"/> Remove
                      </Button>
                    </div>
                  </li>))}
              </ul>)}
          </div>)}

        {register.claims.length > 0 && (<>
            <div className="flex flex-wrap items-center gap-2">
              {(["approved", "ignored"] as const).map((s) => (<button key={s} type="button" onClick={() => setShow(s)} className={cn("rounded-full border px-2.5 py-1 text-xs", show === s ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:text-foreground")} data-testid={`sources-tab-${s}`}>
                  {s === "approved" ? "In use" : "Removed"} {count(s)}
                </button>))}
              <span className="mx-1 h-4 w-px bg-border"/>
              {(["all", "website", "ad"] as const).map((o) => (<button key={o} type="button" onClick={() => setOrigin(o)} className={cn("rounded-full border px-2.5 py-1 text-xs", origin === o ? "border-foreground/40 font-medium" : "text-muted-foreground hover:text-foreground")}>
                  {o === "all" ? "Website and ads" : o === "website" ? `Website ${count(show, "website")}` : `Ads ${count(show, "ad")}`}
                </button>))}
            </div>

            {rows.length === 0 ? (<p className="text-xs text-muted-foreground">{show === "approved" ? "No claim is in use yet. Read the site and the ads above." : "Nothing has been removed."}</p>) : (<ul className="divide-y rounded-md border" data-testid="sources-list">
                {rows.map((c) => (<li key={c.id} className="flex flex-wrap items-start gap-3 p-3" data-testid="source-claim" data-id={c.id} data-origin={c.origin} data-status={c.status}>
                    <div className="min-w-0 flex-1">
                      {editing === c.id ? (<div className="flex flex-wrap items-center gap-2">
                          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(c.id)} className="h-8 min-w-0 flex-1" aria-label="The claim, in your words" autoFocus data-testid="source-edit-text"/>
                          <Button size="sm" className="h-8 text-xs" disabled={pending || draft.trim() === c.text} onClick={() => save(c.id)} data-testid="source-save">
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={pending} onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>) : (<p>{c.text}</p>)}
                      <AsWritten c={c}/>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {show === "approved" ? (<>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => (setDraft(c.text), setEditing(c.id))} data-testid="source-edit">
                            <Pencil className="size-3.5"/> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => act(() => setFoundStatusAction(c.id, "ignored"), "Removed. It will not be used.")} data-testid="source-ignore">
                            <X className="size-3.5"/> Remove
                          </Button>
                        </>) : (<Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => act(() => approveFoundAction([c.id]), "In use again.")} data-testid="source-undo">
                          <RotateCcw className="size-3.5"/> Use again
                        </Button>)}
                    </div>
                  </li>))}
              </ul>)}
          </>)}

        {settled.length > 0 && (<details className="rounded-md border p-3" data-testid="conflicts-settled">
            <summary className="cursor-pointer text-sm font-medium">
              Figures you settled <span className="font-normal text-muted-foreground">({settled.length})</span>
            </summary>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">The brand stated these with different numbers in different places. Ads quote the one you said is right.</p>
            <Figures conflicts={settled} pending={pending} act={act}/>
          </details>)}
      </CardContent>
    </Card>);
}
