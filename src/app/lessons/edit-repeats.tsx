"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import { surfaceLabel } from "@/lib/edit-diff";
import type { EditRepeat } from "@/lib/hand-edits";
import { dismissEditAction, learnEditAction } from "./actions";
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
function what(r: EditRepeat): string {
    if (r.kind === "swap")
        return `\u201c${r.from}\u201d replaced with \u201c${r.to}\u201d`;
    if (r.kind === "shorter")
        return "Cut down to about two thirds of its length or less";
    if (r.kind === "number")
        return r.from === "digits" ? "A number in words rewritten as digits" : r.from === "words" ? "A number in digits rewritten as words" : r.from === "percent sign" ? "\u201cpercent\u201d rewritten as %" : "% rewritten as \u201cpercent\u201d";
    if (r.kind === "case")
        return r.from === "title" ? "Title Case rewritten as a sentence" : "Words in capitals made lower case";
    if (r.from === "\u2014")
        return "A long dash taken out";
    if (r.from === "!")
        return "An exclamation mark taken out";
    if (r.from === "\u2026")
        return "An ellipsis taken out";
    if (r.from === "emoji")
        return "An emoji taken out";
    return `\u201c${r.from}\u201d taken out`;
}
export function EditRepeats({ repeats, scriptId, max }: {
    repeats: EditRepeat[];
    scriptId?: string;
    max?: number;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [busy, setBusy] = useState<string | null>(null);
    const [pending, start] = useTransition();
    if (!repeats.length)
        return null;
    const shown = max ? repeats.slice(0, max) : repeats;
    const learn = (r: EditRepeat) => {
        setBusy(r.key);
        start(async () => {
            const res = await learnEditAction(r.key, scriptId);
            setBusy(null);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            if (res.lesson.isNew && r.scope === "general")
                toast.success("Added. It is used for this brand from now on. To use it for every brand, apply it to all on this screen.");
            else if (res.lesson.isNew)
                toast.success(advanced ? `Added: ${res.lesson.id}. It is in every prompt that writes this brand's words from now on.` : "Added to this brand's rules. It is used from now on.");
            else
                toast.success(advanced ? `Already a rule (${res.lesson.id}): moved up the list.` : "Already a rule: moved up the list.");
            router.refresh();
        });
    };
    const dismiss = (r: EditRepeat) => {
        setBusy(r.key);
        start(async () => {
            const res = await dismissEditAction(r.key, scriptId);
            setBusy(null);
            if (!res.ok)
                toast.error(res.error);
            else
                toast.message("Not a rule. You won't be asked about this change again.");
            router.refresh();
        });
    };
    const rows = shown.map((r) => (<li key={r.key} className="space-y-2 p-4" data-testid="edit-repeat" data-key={r.key}>
      <p className="font-medium" data-testid="edit-repeat-question">
        You&apos;ve made this change {r.count} times. {r.lesson ? "It is already a rule. Move it up?" : "Add it as a rule?"}
      </p>
      <p className="text-muted-foreground">
        {what(r)}
        {r.surfaces.length ? `, in ${list(r.surfaces.map(surfaceLabel))}` : ""}
        {r.scripts.length > 1 ? `, on ${r.scripts.length} pieces` : ""}.
      </p>
      <p data-testid="edit-repeat-rule">
        <span className="text-xs text-muted-foreground">{r.lesson ? "The rule: " : "The rule would be: "}</span>
        {r.rule}
      </p>
      {r.scope === "general" && !r.lesson && <p className="text-xs text-muted-foreground">This reads as true of any brand. Yes adds it for this brand now. You can then apply it to all brands from the list below.</p>}
      {!scriptId && r.examples[0] && (<p className="text-xs text-muted-foreground">
          For example: &ldquo;{r.examples[0].before.slice(0, 200)}&rdquo; became &ldquo;{r.examples[0].after.slice(0, 200)}&rdquo;
        </p>)}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => learn(r)} disabled={pending} data-testid="edit-repeat-learn">
          {busy === r.key && pending && <Loader2 className="size-3.5 animate-spin"/>}
          {r.lesson ? "Move it up" : "Add as a rule"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismiss(r)} disabled={pending} data-testid="edit-repeat-dismiss">
          Not a rule
        </Button>
      </div>
    </li>));
    if (scriptId)
        return (<section className="mx-6 mt-4 rounded-lg border bg-muted/30 text-sm" aria-label="A change you keep making" data-testid="edit-repeats">
        <ul className="divide-y">{rows}</ul>
        {repeats.length > shown.length && <p className="border-t px-3 py-2 text-xs text-muted-foreground">{repeats.length - shown.length} more on the Lessons screen.</p>}
      </section>);
    return (<section id="edits" data-testid="edit-repeats">
      <h2 className="display text-2xl">What you keep changing by hand</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Every time you rewrite words the app wrote (a script line, a hook, a headline, the words on a picture, a landing page, a plan), what you changed is kept. When you have made the same change 3 times, anywhere, you are asked once: should it become a rule? A rule is only ever added when you say yes.
      </p>
      <ul className="mt-5 divide-y overflow-hidden rounded-lg border bg-card text-sm">{rows}</ul>
    </section>);
}
