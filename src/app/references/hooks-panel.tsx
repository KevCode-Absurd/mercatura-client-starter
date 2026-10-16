"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clapperboard, Copy, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TasteBar } from "@/components/taste-bar";
import { VoiceNote } from "@/components/voice-note";
import type { Taste } from "@/lib/taste/types";
import { HOOK_SECONDS, HOOK_TYPES, MAX_HOOKS, MIN_HOOKS, type NewHook } from "@/lib/references/hook-types";
import { OUTPUT_INFO } from "@/lib/taxonomy";
import { hooksStateAction, makeHookClipAction, writeHooksAction, type HooksState } from "./hook-actions";
import { plainMessage } from "@/lib/plain-message";
export const NEW_HOOKS_LINE = "Keeps the ad as it is and writes new openings for it. Each one is checked against the body, and any of them can be made as a 5 second clip to cut onto the front.";
export function HooksDialog({ referenceId, title, live, onClose }: {
    referenceId: string;
    title: string;
    live: boolean;
    onClose: () => void;
}) {
    const [state, setState] = useState<HooksState | null>(null);
    const [count, setCount] = useState(6);
    const [note, setNote] = useState("");
    const [taste, setTaste] = useState<Taste>({});
    const [type, setType] = useState<(typeof HOOK_TYPES)[number]>("ai_ugc");
    const [busy, start] = useTransition();
    useEffect(() => {
        let on = true;
        const load = async () => {
            const r = await hooksStateAction(referenceId);
            if (on && r.ok)
                setState(r.state);
        };
        void load();
        const t = setInterval(() => void load(), 4000);
        return () => {
            on = false;
            clearInterval(t);
        };
    }, [referenceId]);
    const write = () => start(async () => {
        const r = await writeHooksAction({ referenceId, count, note, taste });
        if (!r.ok)
            return void toast.error(r.error);
        setState(r.state);
        toast.success(`${count} new hooks are being written. They appear here in about a minute.`);
    });
    const make = (hook: NewHook) => start(async () => {
        const r = await makeHookClipAction({ referenceId, hookId: hook.id, type });
        if (!r.ok)
            return void toast.error(r.error);
        setState(r.state);
        toast.success("The clip's plan is being written. Open it to approve the plan and make the clip.");
    });
    const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success("Copied."), () => toast.error("Could not copy. Select the text instead."));
    const set = state?.set ?? null;
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="hooks-dialog">
        <DialogHeader>
          <DialogTitle>New hooks for this ad</DialogTitle>
          <DialogDescription>
            {title}. The body of the ad stays as it is; only its first seconds change. Put each new hook in front of the same body and 1 ad becomes several to test.
          </DialogDescription>
        </DialogHeader>

        {state?.blocked ? (<p className="text-sm text-amber-800" data-testid="hooks-blocked">
            {state.blocked}
          </p>) : (<div className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="hooks-count" className="text-xs font-medium">
                  How many
                </Label>
                <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                  <SelectTrigger id="hooks-count" size="sm" className="w-20" data-testid="hooks-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_HOOKS - MIN_HOOKS + 1 }, (_, i) => i + MIN_HOOKS).map((n) => (<SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={write} disabled={busy || !live || !state || state.writing} data-testid="hooks-write">
                {state?.writing ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                {state?.writing ? "Writing" : set ? `Write ${count} more` : `Write ${count} hooks`}
              </Button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="hooks-note" className="text-xs font-medium">
                  Anything the writer should know
                </Label>
                <VoiceNote onText={(t) => setNote((n) => `${n}${n ? " " : ""}${t}`.slice(0, 1200))} testId="hooks-note-voice"/>
              </div>
              <Textarea id="hooks-note" rows={2} maxLength={1200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type it or say it: the ad set is tiring with women over 45, try a hook about the morning rush." data-testid="hooks-note"/>
            </div>
            <TasteBar id="hooks-taste" surface="hooks" hasReference hide={["length"]} value={taste} onChange={setTaste}/>
            <p className="text-xs text-muted-foreground">Written from the ad&apos;s words and timeline, which are already on file: the video is not sent again. Each hook is then checked against the body.</p>
            {!live && <p className="text-xs text-amber-800">Writing is switched off on this account, so hooks are not written.</p>}
            {state?.failed && !state.writing && <p className="text-xs text-amber-800">The last go did not finish: {plainMessage(state.failed)}</p>}
          </div>)}

        {set && (<>
            <div className="space-y-1 rounded-md bg-muted p-3 text-sm" data-testid="hooks-original">
              <p className="font-medium">The hook it has now (the first {Math.round(set.original.ends_at * 10) / 10} seconds)</p>
              {set.original.spoken && <p>&ldquo;{set.original.spoken}&rdquo;</p>}
              {set.original.on_screen && <p className="text-xs text-muted-foreground">On screen: {set.original.on_screen}</p>}
              {set.original.visual && <p className="text-xs text-muted-foreground">Seen: {set.original.visual}</p>}
              <p className="text-xs text-muted-foreground">
                {set.original.device ? `${set.original.device}. ` : ""}
                {set.original.works}
              </p>
              <p className="pt-1 text-xs">
                <span className="font-medium">Every new hook hands over to:</span> &ldquo;{set.body.first_line}&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="hooks-type" className="text-xs font-medium">
                Make clips as
              </Label>
              <Select value={type} onValueChange={(v) => setType(v as (typeof HOOK_TYPES)[number])}>
                <SelectTrigger id="hooks-type" size="sm" className="w-56" data-testid="hooks-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOOK_TYPES.map((t) => (<SelectItem key={t} value={t}>
                      {OUTPUT_INFO[t].label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Choose the kind your ad is, so the hook matches its body. Each clip is up to {HOOK_SECONDS} seconds.</span>
            </div>

            <ol className="space-y-3" data-testid="hooks-list">
              {[...set.hooks].reverse().map((h) => (<li key={h.id} className="space-y-1.5 rounded-md border p-3 text-sm" data-testid="hook-item">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium">{h.spoken ? <>&ldquo;{h.spoken}&rdquo;</> : "No spoken words"}</p>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{h.device || "hook"}</span>
                  </div>
                  {h.on_screen && <p className="text-xs">On screen: {h.on_screen}</p>}
                  <p className="text-xs text-muted-foreground">Seen: {h.visual}</p>
                  {h.joins && <p className="text-xs text-muted-foreground">Into the body: {h.joins}</p>}
                  <p className={h.check ? (h.check.ok ? "flex items-start gap-1.5 text-xs text-emerald-700" : "flex items-start gap-1.5 text-xs text-amber-800") : "text-xs text-muted-foreground"} data-testid="hook-check" data-ok={h.check ? h.check.ok : "none"}>
                    {h.check ? h.check.ok ? <Check className="mt-0.5 size-3.5 shrink-0"/> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0"/> : null}
                    <span>{h.check ? `${h.check.ok ? "Fits the body" : "May not fit the body"}: ${h.check.note}` : "Not checked against the body."}</span>
                  </p>
                  {(h.notes ?? []).map((n, k) => (<p key={k} className="flex items-start gap-1.5 text-xs text-amber-800" data-testid="hook-words-note">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0"/>
                      <span>Worth a look: {n}</span>
                    </p>))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => copy([h.spoken, h.on_screen && `On screen: ${h.on_screen}`, `Seen: ${h.visual}`].filter(Boolean).join("\n"))}>
                      <Copy className="size-4"/>
                      Copy
                    </Button>
                    {h.job_id ? (<Button asChild size="sm" variant="outline">
                        <Link href={`/production?job=${h.job_id}`} data-testid="hook-open-clip">
                          <Clapperboard className="size-4"/>
                          Open its clip
                        </Link>
                      </Button>) : (<Button size="sm" onClick={() => make(h)} disabled={busy} data-testid="hook-make-clip">
                        <Clapperboard className="size-4"/>
                        Make this clip
                      </Button>)}
                  </div>
                </li>))}
            </ol>
          </>)}
        {!set && state && !state.blocked && !state.writing && <p className="text-sm text-muted-foreground">No hooks written for this ad yet.</p>}
        {!state && (<p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin"/>
            Loading
          </p>)}
      </DialogContent>
    </Dialog>);
}
