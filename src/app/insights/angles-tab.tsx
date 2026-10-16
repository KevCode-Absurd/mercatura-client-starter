"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ANGLE_STATUSES, type AngleStatus } from "@/db/schema";
import { ENOUGH_SOURCES, shareText, type AngleLibrary, type AngleQuote, type MinedAngle } from "@/lib/angles/library";
import { CUSTOMER_SOURCES, JOB_INFO, SOURCE_INFO } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { adoptAngleAction, setAngleStatusAction } from "./actions";
const STATUS_WORD: Record<AngleStatus, string> = { unrun: "Not built", running: "Running", dead: "Tested, dead" };
const COVERED_WORD = { yes: "On the site", partly: "Partly on the site", no: "Not on the site", unknown: "Site not read" } as const;
export function JobPill({ job, guessed, className }: {
    job: MinedAngle["job"];
    guessed?: boolean;
    className?: string;
}) {
    const info = JOB_INFO[job];
    return (<span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs", className)} title={`${info.sounds}. Earns its money in: ${info.earns}${guessed ? ". Taken from the insight type: no reader gave these quotes a job yet" : ""}`}>
      <span className="tabular-nums text-muted-foreground">{info.n}</span>
      {info.label}
      {guessed && <span className="text-muted-foreground">?</span>}
    </span>);
}
export function StatusSelect({ themeId, status, small }: {
    themeId: string;
    status: AngleStatus;
    small?: boolean;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<Select value={status} disabled={pending} onValueChange={(v) => start(async () => {
            const res = await setAngleStatusAction({ themeId, status: v as AngleStatus });
            if (!res.ok)
                toast.error(res.error);
            else
                router.refresh();
        })}>
      <SelectTrigger size="sm" className={cn("h-7 text-xs", small ? "w-32" : "w-40")} aria-label="Angle status" data-testid={`angle-status-${themeId}`} onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ANGLE_STATUSES.map((s) => (<SelectItem key={s} value={s}>
            {STATUS_WORD[s]}
          </SelectItem>))}
      </SelectContent>
    </Select>);
}
function Quote({ q, className }: {
    q: AngleQuote;
    className?: string;
}) {
    return (<span className={className}>
      <span className="italic">“{q.quote}”</span>{" "}
      <Link href={`/sources?item=${q.item_id}`} className="whitespace-nowrap text-xs text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()} data-testid="angle-ref">
        {q.ref}
      </Link>
      {q.verified === false && <span className="ml-1 text-xs text-amber-700">unverified</span>}
      {q.incentivised && <span className="ml-1 text-xs text-amber-700">given the product</span>}
    </span>);
}
export function AnglesTab({ library, selected, onSelect, advanced, q }: {
    library: AngleLibrary;
    selected: string | null;
    onSelect: (id: string) => void;
    advanced: boolean;
    q: string;
}) {
    const needle = q.trim().toLowerCase();
    const allNew = library.angles.length > 0 && library.angles.every((a) => a.fresh);
    const rows = library.angles.filter((a) => !needle || a.label.toLowerCase().includes(needle) || a.best.quote.toLowerCase().includes(needle) || a.backups.some((b) => b.quote.toLowerCase().includes(needle)));
    const read = CUSTOMER_SOURCES.filter((t) => library.corpus.by_type[t]).map((t) => `${library.corpus.by_type[t]} ${SOURCE_INFO[t].tab.toLowerCase()}`);
    return (<div className="space-y-4" data-testid="angles-tab">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span data-testid="angles-corpus">
          {library.corpus.items} source{library.corpus.items === 1 ? "" : "s"} read{read.length ? ` (${read.join(", ")})` : ""}, {library.angles.length} angle{library.angles.length === 1 ? "" : "s"}.
        </span>
        {!library.enough && (<Badge variant="outline" className="border-amber-300 font-normal text-amber-800" data-testid="angles-few">
            Under {ENOUGH_SOURCES} sources: counts are not patterns yet
          </Badge>)}
        {!library.site_read && (<span>
            <Link href="/sources?tab=website" className="underline-offset-2 hover:underline">Read the site</Link> to find what buyers say that it does not.
          </span>)}
      </div>

      {library.blind_spots.length > 0 && (<div className="rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid="blind-spots">
          <div className="mb-1 text-sm font-semibold">Blind spots: said by {Math.round(100 * library.blind_spots[0].share)}% or more, nowhere on the site</div>
          <ul className="space-y-1 text-sm">
            {library.blind_spots.slice(0, 5).map((a) => (<li key={a.theme_id}>
                <button type="button" className="text-left hover:underline" onClick={() => onSelect(a.theme_id)}>
                  <span className="font-medium">{a.label}</span>
                </button>{" "}
                <span className="text-muted-foreground">({a.frequency} sources, {shareText(a.share)})</span> <Quote q={a.best}/>
              </li>))}
          </ul>
        </div>)}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Angle</th>
              <th className="px-2 py-2">Job</th>
              <th className="px-2 py-2">Says it</th>
              <th className="px-2 py-2">Best phrase</th>
              {advanced && <th className="px-2 py-2">Who</th>}
              {advanced && <th className="px-2 py-2">Site</th>}
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (<tr key={a.theme_id} className={cn("cursor-pointer border-t align-top hover:bg-muted/40", selected === a.theme_id && "bg-accent")} onClick={() => onSelect(a.theme_id)} data-testid={`angle-row-${a.theme_id}`}>
                <td className="px-2 py-2 tabular-nums text-muted-foreground">{a.rank}</td>
                <td className="min-w-40 px-2 py-2">
                  <div className="font-medium">{a.label}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {a.thin && <Badge variant="outline" className="font-normal text-muted-foreground">thin</Badge>}
                    {a.fresh && !allNew && <Badge variant="outline" className="border-emerald-300 font-normal text-emerald-800">new</Badge>}
                    {a.fading && <Badge variant="outline" className="font-normal text-muted-foreground">fading</Badge>}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <JobPill job={a.job} guessed={a.job_guessed}/>
                </td>
                <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                  {a.frequency} <span className="text-muted-foreground">· {shareText(a.share)}</span>
                </td>
                <td className="min-w-64 max-w-md px-2 py-2">
                  <Quote q={a.best}/>
                </td>
                {advanced && <td className="px-2 py-2 text-xs text-muted-foreground">{a.audience.join(", ") || "—"}</td>}
                {advanced && (<td className="px-2 py-2">
                    <span className={cn("text-xs", a.covered === "no" && "font-medium text-primary")} title="By word match against the pages last read, not a reading.">
                      {COVERED_WORD[a.covered]}
                    </span>
                  </td>)}
                <td className="px-2 py-2">
                  <StatusSelect themeId={a.theme_id} status={a.status} small/>
                </td>
              </tr>))}
            {!rows.length && (<tr>
                <td colSpan={8} className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {library.angles.length ? "No angle matches the search." : "No angles yet. Angles are read out of themes: bring in customer sources, extract, then sort them into themes."}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Ranked by how many separate sources say it: the phrase one person loves is one person. Every phrase is a buyer's own words, never rewritten.
      </p>
    </div>);
}
export function AngleBlock({ angle, advanced }: {
    angle: MinedAngle;
    advanced: boolean;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [notes, setNotes] = useState(angle.notes);
    const adopt = () => start(async () => {
        const res = await adoptAngleAction({ themeId: angle.theme_id });
        if (!res.ok)
            toast.error(res.error);
        else {
            toast.success(`"${res.name}" is on the angle list: the home box and the script builder can choose it.`);
            router.refresh();
        }
    });
    const saveNotes = () => start(async () => {
        const res = await setAngleStatusAction({ themeId: angle.theme_id, status: angle.status, notes });
        if (!res.ok)
            toast.error(res.error);
        else
            router.refresh();
    });
    return (<div className="mb-4 space-y-3 rounded-md border p-3 text-sm" data-testid="angle-block">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <JobPill job={angle.job} guessed={angle.job_guessed}/>
          <span className="text-xs text-muted-foreground">
            {angle.frequency} source{angle.frequency === 1 ? "" : "s"} · {shareText(angle.share)}
            {angle.thin ? " · thin" : ""}
          </span>
        </div>
        <StatusSelect themeId={angle.theme_id} status={angle.status} small/>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">Best phrase</div>
        <Quote q={angle.best}/>
      </div>
      {angle.backups.length > 0 && (<div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Backups, from other sources</div>
          <ul className="space-y-1">
            {angle.backups.map((b) => (<li key={b.item_id}>
                <Quote q={b}/>
              </li>))}
          </ul>
        </div>)}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {angle.audience.length > 0 && <span>Who: {angle.audience.join(", ")}</span>}
        {angle.product && <span>Product: {angle.product}</span>}
        <span title="By word match against the pages last read, not a reading.">{COVERED_WORD[angle.covered]}</span>
        <span>Earns its money in: {JOB_INFO[angle.job].earns}</span>
      </div>
      {angle.assets.length > 0 && (<div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Built from it</div>
          <ul className="space-y-0.5">
            {angle.assets.map((x) => (<li key={`${x.kind}-${x.id}`}>
                <Link href={x.kind === "script" ? `/scripts/${x.id}` : x.kind === "concept" ? `/concepts?concept=${x.id}` : "/builder"} className="hover:underline">
                  {x.title}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">{x.kind}</span>
              </li>))}
          </ul>
        </div>)}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={adopt} disabled={pending} data-testid="angle-adopt">
          {angle.angle_id ? "Update on the angle list" : "Use as an angle"}
        </Button>
        {angle.angle_id && (<Link href="/builder" className="text-xs text-muted-foreground hover:text-primary">
            On the angle list
          </Link>)}
      </div>
      {advanced && (<div className="space-y-1">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes: where it ran, what happened" aria-label="Angle notes" data-testid="angle-notes"/>
          {notes !== angle.notes && (<Button size="xs" variant="outline" onClick={saveNotes} disabled={pending}>
              Save notes
            </Button>)}
        </div>)}
    </div>);
}
