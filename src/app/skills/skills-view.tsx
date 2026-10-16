"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, History, Loader2, Scissors, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DiffView, diffCounts } from "@/components/diff-view";
import type { DiffLine } from "@/lib/inspect/diff";
import type { SkillState } from "@/lib/skills/proposals";
import { cn } from "@/lib/utils";
import { decideAction, tightenAction } from "./actions";
export interface ProposalView {
    id: string;
    file: string;
    skill: string;
    source: "feedback" | "tighten";
    said: string;
    summary: string;
    status: "open" | "accepted" | "rejected" | "failed";
    error: string;
    at: string;
    decidedAt: string | null;
    decidedBy: string;
    editId: string | null;
    lines: DiffLine[];
}
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
export const fileHref = (file: string) => `/skills/file/${file.split("/").slice(1).map(encodeURIComponent).join("/")}`;
export function SkillsView({ open, decided, skills, admin, live }: {
    open: ProposalView[];
    decided: ProposalView[];
    skills: SkillState[];
    admin: boolean;
    live: boolean;
}) {
    const creative = skills.filter((s) => s.module === "creative");
    const landing = skills.filter((s) => s.module === "landing");
    return (<div className="space-y-16 px-6 py-10 max-md:space-y-10 max-md:py-6">
      <section>
        <h2 className="font-serif text-3xl">Waiting for you{open.length ? ` (${open.length})` : ""}</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Each is 1 change to 1 skill. Read what the person said and what the change does, then the lines in green and red. Accept writes it as the skill&apos;s next version; reject keeps the note and drops the change.</p>
        {open.length ? (<ul className="mt-6 space-y-6" data-testid="skill-proposals">
            {open.map((p) => (<Proposal key={p.id} p={p} admin={admin}/>))}
          </ul>) : (<p className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground" data-testid="skill-proposals-empty">
            Nothing waiting. A change arrives here when someone&apos;s feedback on a finished piece holds a rule true of any brand, or when you ask for a skill to be tightened below.
          </p>)}
      </section>

      <section>
        <h2 className="font-serif text-3xl">The skills</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Version 1 is the skill as it shipped; every accepted change makes the next. Tighten asks a model for the same skill in fewer words, with every rule, heading, number and quoted phrase kept, and shows you the result above before anything changes.</p>
        <SkillTable title="Creative Studio" rows={creative} admin={admin} live={live}/>
        <SkillTable title="Landing pages" rows={landing} admin={admin} live={live}/>
      </section>

      {decided.length > 0 && (<section>
          <h2 className="font-serif text-3xl">Decided lately</h2>
          <ul className="mt-6 divide-y overflow-hidden rounded-xl border bg-card" data-testid="skill-decided">
            {decided.map((p) => (<li key={p.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className={cn("w-20 shrink-0 text-xs font-semibold uppercase tracking-wide", p.status === "accepted" ? "text-emerald-700" : p.status === "rejected" ? "text-muted-foreground" : "text-red-700")}>{p.status}</span>
                <span className="font-semibold">{p.skill}</span>
                <span className="min-w-0 flex-1 text-muted-foreground">{p.status === "failed" ? p.error || p.summary : p.summary}</span>
                <span className="text-xs text-muted-foreground">
                  {when(p.decidedAt ?? p.at)}
                  {p.decidedBy ? ` by ${p.decidedBy}` : ""}
                </span>
                {p.editId && (<Link href={`/skills/change/${p.editId}`} className="text-xs font-semibold text-primary hover:underline">
                    See the change
                  </Link>)}
              </li>))}
          </ul>
        </section>)}
    </div>);
}
function Proposal({ p, admin }: {
    p: ProposalView;
    admin: boolean;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [doing, setDoing] = useState<"accept" | "reject" | null>(null);
    const [whole, setWhole] = useState(false);
    const long = p.lines.length > 40;
    const decide = (d: "accept" | "reject") => {
        setDoing(d);
        start(async () => {
            const res = await decideAction(p.id, d);
            setDoing(null);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(d === "accept" ? `Accepted. ${p.skill} is at its next version.` : "Rejected. The skill is as it was.");
            router.refresh();
        });
    };
    return (<li className="overflow-hidden rounded-2xl border bg-card" data-testid={`proposal-${p.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pt-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-serif text-2xl">{p.skill}</span>
            <span className="text-xs text-muted-foreground">{p.source === "tighten" ? "Tightening" : "From feedback"} · {when(p.at)}</span>
          </div>
          <p className="mt-2 text-sm font-medium">{p.summary}</p>
          {p.said && <blockquote className="mt-2 max-w-3xl border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">&ldquo;{p.said}&rdquo;</blockquote>}
        </div>
        {admin && (<div className="flex shrink-0 gap-2">
            <Button onClick={() => decide("accept")} disabled={pending} data-testid="proposal-accept">
              {doing === "accept" ? <Loader2 className="size-4 animate-spin"/> : <Check className="size-4"/>} Accept
            </Button>
            <Button variant="outline" onClick={() => decide("reject")} disabled={pending} data-testid="proposal-reject">
              {doing === "reject" ? <Loader2 className="size-4 animate-spin"/> : <X className="size-4"/>} Reject
            </Button>
          </div>)}
      </div>
      <div className="px-6 pb-5 pt-4">
        <div className="mb-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>
            {diffCounts(p.lines)} · {p.file}
          </span>
          {long && (<button type="button" className="font-semibold text-primary hover:underline" onClick={() => setWhole((w) => !w)}>
              {whole ? "Show less" : "Show the whole change"}
            </button>)}
        </div>
        <DiffView lines={whole || !long ? p.lines : p.lines.slice(0, 40)} testId="proposal-diff"/>
      </div>
    </li>);
}
function SkillTable({ title, rows, admin, live }: {
    title: string;
    rows: SkillState[];
    admin: boolean;
    live: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [, start] = useTransition();
    const tighten = (file: string) => {
        setBusy(file);
        start(async () => {
            const res = await tightenAction(file);
            setBusy(null);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(`A tightened version is waiting for you above. ${res.summary}`);
            router.refresh();
        });
    };
    if (!rows.length)
        return null;
    return (<div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm" data-testid={`skills-${title === "Creative Studio" ? "creative" : "landing"}`}>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Skill</th>
              <th className="px-3 py-3 text-right font-medium">Version</th>
              <th className="px-3 py-3 text-right font-medium">Words</th>
              <th className="px-3 py-3 font-medium max-md:hidden">Last change</th>
              <th className="px-5 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((s) => (<tr key={s.file} data-testid={`skill-row-${s.folder.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                <td className="px-5 py-3">
                  <div className="font-semibold">{s.name}</div>
                  <div className="line-clamp-1 max-w-xl text-xs text-muted-foreground" title={s.description}>
                    {s.description}
                  </div>
                  {s.open > 0 && <div className="mt-0.5 text-xs font-semibold text-primary">{s.open} change{s.open === 1 ? "" : "s"} waiting above</div>}
                </td>
                <td className="numeral px-3 py-3 text-right text-2xl">{s.version}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{s.words.toLocaleString("en-US")}</td>
                <td className="px-3 py-3 text-muted-foreground max-md:hidden">{s.changedAt ? when(s.changedAt) : "as shipped"}</td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex gap-1.5">
                    {admin && (<Button size="sm" variant="outline" disabled={!live || busy === s.file} title={live ? "Ask for the same skill in fewer words; you see it before it changes" : "Needs live mode: a model does the shortening"} onClick={() => tighten(s.file)} data-testid="skill-tighten">
                        {busy === s.file ? <Loader2 className="size-3.5 animate-spin"/> : <Scissors className="size-3.5"/>} Tighten
                      </Button>)}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={fileHref(s.file)} data-testid="skill-history">
                        <History className="size-3.5"/> History
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
