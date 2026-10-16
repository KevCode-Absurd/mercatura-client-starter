"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ThemeRow } from "@/db/schema";
import { setGuardrailAction, writeGuardrailsAction } from "./actions";
const MOCK_NOTE = "Mock mode: writing rules calls Claude. Set LLM_MODE=live in .env and restart to use it. You can still write rules by hand.";
const MAX_BANNED = 12;
const parseBanned = (s: string) => [...new Set(s.split(",").map((b) => b.trim().toLowerCase()).filter((b) => b.length >= 2))];
export function GuardrailRules({ themes, live, onSelect }: {
    themes: ThemeRow[];
    live: boolean;
    onSelect: (id: string) => void;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState<ThemeRow | null>(null);
    const [pending, start] = useTransition();
    const missing = themes.filter((t) => t.guardrail == null).length;
    const write = () => start(async () => {
        const res = await writeGuardrailsAction();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(res.written ? `Wrote ${res.written} rule${res.written === 1 ? "" : "s"}. Check them before you rely on them.` : "Every top failure mode already has a rule.");
        router.refresh();
    });
    const writeButton = (<Button size="sm" variant="outline" onClick={write} disabled={!live || pending} data-testid="write-guardrails">
      {pending && <Loader2 className="size-4 animate-spin"/>}
      Write rules
    </Button>);
    return (<div className="rounded-lg border" data-testid="guardrail-rules">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
        <div className="text-sm">
          <span className="font-medium">Auditor rules</span>{" "}
          <span className="text-xs text-muted-foreground">
            {themes.filter((t) => t.guardrail?.applies).length} in force
            {missing > 0 ? ` · ${missing} without a rule yet` : ""}
          </span>
        </div>
        {live ? (writeButton) : (<Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{writeButton}</span>
            </TooltipTrigger>
            <TooltipContent>{MOCK_NOTE}</TooltipContent>
          </Tooltip>)}
      </div>
      <ul className="divide-y text-sm">
        {themes.map((t) => {
            const g = t.guardrail;
            return (<li key={t.id} className="flex items-start gap-3 px-3 py-2.5" data-testid="guardrail-card" data-theme-id={t.id}>
              <div className="min-w-0 flex-1">
                <button className="font-medium hover:underline" onClick={() => onSelect(t.id)}>
                  {t.label}
                </button>
                {g == null ? (<p className="text-xs text-muted-foreground" data-testid="guardrail-state">
                    No rule yet
                  </p>) : !g.applies ? (<p className="text-xs text-muted-foreground" data-testid="guardrail-state">
                    Doesn&apos;t apply to ad copy
                  </p>) : (<>
                    <p data-testid="guardrail-rule">{g.rule || "No rule text, banned phrases only."}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1" data-testid="guardrail-banned">
                      <span className="text-xs text-muted-foreground">Banned in scripts:</span>
                      {g.banned.length ? (g.banned.map((b) => (<Badge key={b} variant="outline" className="border-red-200 bg-red-50 font-normal text-red-800">
                            {b}
                          </Badge>))) : (<span className="text-xs text-muted-foreground">nothing</span>)}
                    </div>
                  </>)}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditing(t)} data-testid="guardrail-edit">
                <Pencil className="size-3.5"/>
                Edit
              </Button>
            </li>);
        })}
        {!themes.length && <li className="px-3 py-4 text-center text-muted-foreground">No failure-mode themes.</li>}
      </ul>

      {editing && <GuardrailDialog key={editing.id} theme={editing} onClose={() => setEditing(null)}/>}
    </div>);
}
function GuardrailDialog({ theme, onClose }: {
    theme: ThemeRow;
    onClose: () => void;
}) {
    const router = useRouter();
    const [applies, setApplies] = useState(theme.guardrail?.applies ?? true);
    const [rule, setRule] = useState(theme.guardrail?.rule ?? "");
    const [banned, setBanned] = useState((theme.guardrail?.banned ?? []).join(", "));
    const [pending, start] = useTransition();
    const phrases = parseBanned(banned);
    const tooMany = phrases.length > MAX_BANNED;
    const save = (clear: boolean) => start(async () => {
        const res = await setGuardrailAction(theme.id, clear ? null : { applies, rule: applies ? rule : "", banned: applies ? phrases : [] });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(clear ? "Rule cleared." : "Rule saved. New audits use it.");
        onClose();
        router.refresh();
    });
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="guardrail-dialog">
        <DialogHeader>
          <DialogTitle>Rule for &ldquo;{theme.label}&rdquo;</DialogTitle>
          <DialogDescription>{theme.summary}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={applies} onCheckedChange={setApplies} data-testid="guardrail-applies"/>
            Applies to ad copy
          </label>
          {!applies && <p className="text-xs text-muted-foreground">Use this for failures an ad can&apos;t cause, like slow delivery. The auditor skips it.</p>}
          <div>
            <Label htmlFor="guardrail-rule-text" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Rule (what a script must never imply)
            </Label>
            <Textarea id="guardrail-rule-text" value={rule} onChange={(e) => setRule(e.target.value)} rows={3} disabled={!applies} data-testid="guardrail-rule-input"/>
          </div>
          <div>
            <Label htmlFor="guardrail-banned-text" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Banned phrases, separated by commas (up to {MAX_BANNED})
            </Label>
            <Input id="guardrail-banned-text" value={banned} onChange={(e) => setBanned(e.target.value)} disabled={!applies} placeholder="regrowth, grow back" data-testid="guardrail-banned-input"/>
            <p className={tooMany ? "mt-1 text-xs text-red-700" : "mt-1 text-xs text-muted-foreground"}>
              {phrases.length} phrase{phrases.length === 1 ? "" : "s"}. A script line, on-screen text or hook with any of these fails the audit.
            </p>
          </div>
        </div>
        <DialogFooter>
          {theme.guardrail != null && (<Button variant="ghost" className="mr-auto" onClick={() => save(true)} disabled={pending} data-testid="guardrail-clear" title="Removes the rule, so Write rules works it out again">
              Clear rule
            </Button>)}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save(false)} disabled={pending || tooMany} data-testid="guardrail-save">
            {pending ? "Saving..." : "Save rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
