"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HOOK_CHOICES } from "@/components/hooks-picker";
import { TasteBar } from "@/components/taste-bar";
import { lookFromVariety } from "@/lib/taste/compat";
import type { Taste } from "@/lib/taste/types";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { HookVariant, ScriptLine } from "@/db/schema";
import { hookGoodEnough } from "@/lib/script-metrics";
import { MAX_HOOKS, versionText, versionsOf } from "@/lib/scripts/versions";
import { humanize } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { editHookAction, removeHookAction, useHookAsMainAction, writeMoreHooksAction } from "../actions";
const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`), () => toast.error("Could not copy. Select the text instead."));
const graded = (h: HookVariant) => !(h.grades.clarity === 3 && h.grades.relevance === 3 && h.grades.novelty === 3 && h.grades.specificity === 3 && h.grades.credibility === 3);
export function HookVersions({ scriptId, lines, hooks, live, variety: written, taste: stored, stage, texts = [] }: {
    scriptId: string;
    lines: ScriptLine[];
    hooks: HookVariant[];
    live: boolean;
    variety?: number;
    taste?: Taste;
    stage?: string | null;
    texts?: {
        hook_id: string;
        first_line: string;
        headline: string;
    }[];
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const versions = versionsOf({ lines, hook_variants: hooks });
    const [open, setOpen] = useState<number | null>(null);
    const [editing, setEditing] = useState<{
        id: string;
        text: string;
    } | null>(null);
    const room = MAX_HOOKS - versions.length;
    const [more, setMore] = useState(Math.min(3, Math.max(1, room)));
    const [pending, start] = useTransition();
    const [writing, setWriting] = useState(false);
    const [taste, setTaste] = useState<Taste>(stored ?? (written != null ? { look: lookFromVariety(written) } : {}));
    const run = (work: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, said: string) => start(async () => {
        const res = await work();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(said);
        setEditing(null);
        router.refresh();
    });
    const write = () => {
        setWriting(true);
        start(async () => {
            const res = await writeMoreHooksAction(scriptId, Math.min(more, room), taste);
            setWriting(false);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            toast.success(`${res.written === 1 ? "1 hook was" : `${res.written} hooks were`} written. The script now has ${res.total} versions.`);
            router.refresh();
        });
    };
    return (<section className="mx-6 mt-4 mb-6 rounded-xl border border-rule bg-card p-5" data-testid="hook-versions" data-count={versions.length} aria-label="Hooks and versions">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display text-2xl">{versions.length === 1 ? "Hooks: 1" : `Hooks: ${versions.length}, on 1 body`}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {versions.length === 1
            ? "This script has its own opening and no other. More hooks give you more versions of the same ad to test: a different way in, the same body."
            : "Each hook plus the same body is 1 ad to test. Version 1 is the main one. Ads, videos and pages are made from it unless you pick another when you make them."}
          </p>
        </div>
        {room > 0 && (<div className="flex shrink-0 items-center gap-2" data-testid="write-more-hooks">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              How many
              <select value={Math.min(more, room)} onChange={(e) => setMore(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-sm text-foreground" disabled={pending} data-testid="more-hooks-count">
                {HOOK_CHOICES.filter((n) => n <= room).map((n) => (<option key={n} value={n}>
                    {n}
                  </option>))}
              </select>
            </label>
            <Button size="sm" variant="outline" onClick={write} disabled={pending || !live} title={live ? undefined : "Not switched on for this account."} data-testid="more-hooks-go">
              {writing ? <Loader2 className="size-4 animate-spin"/> : <Plus className="size-4"/>}
              {writing ? "Writing, about a minute" : "Write more hooks"}
            </Button>
          </div>)}
      </div>

      {room > 0 && <TasteBar id="more-hooks-taste" surface="hooks" stage={stage} value={taste} onChange={setTaste} className="mt-3 max-w-xl"/>}

      {versions.length > 1 && (<ol className="mt-5 space-y-2.5">
          {versions.map((v) => {
                const hook = v.hook;
                const isOpen = open === v.n;
                const edit = editing && hook && editing.id === hook.id ? editing : null;
                return (<li key={v.n} className={cn("rounded-lg border border-rule p-4", v.n === 1 && "border-primary/40 bg-primary/5")} data-testid="hook-version" data-version={v.n}>
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-72">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      Version {v.n}
                      {v.n === 1 && (<span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground" data-testid="hook-main">
                          <Star className="size-3"/>
                          Main: what gets made
                        </span>)}
                      {advanced && hook && v.n > 1 && <span className="font-normal">{humanize(hook.type)}</span>}
                      {advanced && hook && graded(hook) && (<span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-normal", hookGoodEnough(hook.grades) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")} data-testid="hook-version-grade">
                          {hookGoodEnough(hook.grades) && <Check className="size-3"/>}
                          {hook.grades.clarity + hook.grades.relevance + hook.grades.novelty + hook.grades.specificity + hook.grades.credibility} of 25
                        </span>)}
                    </p>
                    {edit ? (<div className="mt-1 space-y-2">
                        <Textarea value={edit.text} onChange={(e) => setEditing({ id: edit.id, text: e.target.value })} rows={2} className="text-sm" aria-label={`The hook of version ${v.n}`} data-testid="hook-edit-text"/>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => run(() => editHookAction(scriptId, edit.id, edit.text), "The hook was saved.")} disabled={pending || !edit.text.trim()} data-testid="hook-edit-save">
                            Save the hook
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
                            Cancel
                          </Button>
                        </div>
                      </div>) : (<p className="mt-1 text-sm font-medium">{v.opens}</p>)}
                    {((own) => own ? (<dl className="mt-1.5 grid gap-x-2 gap-y-0.5 text-xs sm:grid-cols-[auto_1fr]" data-testid="hook-version-texts">
                          <dt className="text-muted-foreground">Headline</dt>
                          <dd>{own.headline}</dd>
                          <dt className="text-muted-foreground">Primary text opens</dt>
                          <dd>{own.first_line}</dd>
                        </dl>) : null)(hook && v.n > 1 ? texts.find((t) => t.hook_id === hook.id) : undefined)}
                    {v.bridged > 0 && <p className="mt-1 text-xs text-muted-foreground">1 later line is said slightly differently in this version, so it still points back at this opening. Open the version to read it.</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => copy(versionText(v.lines), `Version ${v.n}`)} data-testid={`copy-version-${v.n}`}>
                      <Copy className="size-3.5"/>
                      Copy version {v.n}
                    </Button>
                    {v.n > 1 && hook && !edit && (<>
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: hook.id, text: hook.text })} disabled={pending} data-testid="hook-edit">
                          <Pencil className="size-3.5"/>
                          Edit the hook
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => run(() => useHookAsMainAction(scriptId, hook.id), `Version ${v.n} is now the main one.`)} disabled={pending} data-testid="hook-make-main">
                          <Star className="size-3.5"/>
                          Make it the main one
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => run(() => removeHookAction(scriptId, hook.id), "The hook was removed.")} disabled={pending} aria-label={`Remove version ${v.n}`} title="Remove this hook" data-testid="hook-remove">
                          <Trash2 className="size-3.5"/>
                        </Button>
                      </>)}
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(isOpen ? null : v.n)} className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline" aria-expanded={isOpen} data-testid="hook-version-toggle">
                  {isOpen ? "Hide the full version" : "Read the full version"}
                </button>
                {isOpen && (<div className="mt-2 space-y-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="hook-version-full">
                    {v.lines.map((l, i) => (<p key={i} className={cn(i === 0 && "font-medium", i > 0 && l.text !== lines[lines.length - v.lines.length + i]?.text && "rounded bg-amber-100/70 px-1")}>
                        {l.text}
                      </p>))}
                  </div>)}
              </li>);
            })}
        </ol>)}
    </section>);
}
