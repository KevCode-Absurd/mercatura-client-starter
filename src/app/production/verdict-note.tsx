"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { VoiceNote } from "@/components/voice-note";
import type { OutputJobRow } from "@/db/schema";
import { BUCKETS, bucketInfo, formatWords, learnsFrom, ticksFor, verdictProblem, type Bucket, type Verdict } from "@/lib/production/verdict";
import { OUTPUT_INFO } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { verdictNoteAction } from "./verdict-actions";
export function VerdictNote({ job, verdict, title, onClose }: {
    job: OutputJobRow;
    verdict: Verdict;
    title: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const advanced = useAdvanced();
    const [ticks, setTicks] = useState<string[]>([]);
    const [bucket, setBucket] = useState<Bucket | undefined>(undefined);
    const [note, setNote] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const good = verdict === "approved";
    const answers = { verdict, bucket, ticks, note };
    const problem = verdictProblem(answers);
    const buckets = bucketInfo(job.output_type);
    const kept = good
        ? learnsFrom(answers)
            ? `Kept as something to keep doing, for ${formatWords(job.output_type)}.`
            : "Your ticks are saved. Add a few words and they become a lesson for next time."
        : bucket
            ? buckets[bucket].hint
            : "";
    const save = () => begin(async () => {
        const res = await verdictNoteAction(job.id, { verdict, bucket, ticks, note, via });
        if (!res.ok)
            return void toast.error(res.error);
        const fresh = res.learned.filter((l) => l.isNew);
        if (res.status === "failed" || (res.status !== "learned" && res.status !== "nothing" && res.status !== "logged"))
            toast.error("The note is kept, but it couldn't be read for lessons.");
        else if (res.learned.length)
            toast.success(`Kept. ${fresh.length ? `${fresh.length} new lesson${fresh.length === 1 ? "" : "s"}` : "A lesson already known was counted again"}: "${res.learned[0].rule}"`, { duration: 9000 });
        else
            toast.success(res.status === "logged" && learnsFrom(answers) ? "Kept. It is not a rule yet: add it as a rule on the Lessons screen." : "Saved.");
        onClose();
        router.refresh();
    });
    return (<Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="verdict-note" data-verdict={verdict} data-job-id={job.id}>
        <DialogHeader>
          <DialogTitle>{good ? "What went well in this ad?" : "What went wrong, and how could it be better?"}</DialogTitle>
          <DialogDescription>
            {OUTPUT_INFO[job.output_type].label} · {advanced && <>{job.id} · </>}{title}. {good ? "Approved." : "Rejected."} Your answer is kept, and the next ad like this is made with it.
          </DialogDescription>
        </DialogHeader>

        {good ? (<div className="flex flex-wrap gap-1.5" role="group" aria-label="What went well" data-testid="verdict-ticks">
            {ticksFor(job.output_type).map((t, k) => {
                const on = ticks.includes(t);
                return (<button key={t} type="button" aria-pressed={on} onClick={() => setTicks((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))} className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")} data-testid={`verdict-tick-${k}`}>
                  {on && <Check className="size-3.5"/>}
                  {t}
                </button>);
            })}
          </div>) : (<div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="What kind of problem is it" data-testid="verdict-buckets">
            {BUCKETS.map((b) => (<button key={b} type="button" role="radio" aria-checked={bucket === b} onClick={() => setBucket(b)} className={cn("rounded-md border p-2.5 text-left text-sm", bucket === b ? "border-primary bg-secondary ring-1 ring-primary" : "hover:bg-muted")} data-testid={`verdict-bucket-${b}`}>
                <span className="font-semibold">{buckets[b].label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{buckets[b].hint}</span>
              </button>))}
          </div>)}

        <div>
          <Textarea value={note} onChange={(e) => {
            setNote(e.target.value.slice(0, 4000));
            setVia("typed");
        }} placeholder={good ? "Anything worth repeating? Type it or say it. (optional)" : "What went wrong, and what would have made it better? Type it or say it."} className="min-h-24" data-testid="verdict-text"/>
          <div className="mt-1.5 flex items-start gap-2">
            <VoiceNote disabled={pending} testId="verdict-voice" onText={(t) => {
            setNote((cur) => (cur.trim() ? `${cur.trim()} ${t}` : t).slice(0, 4000));
            setVia("voice");
        }}/>
            <p className="min-w-0 flex-1 pt-1.5 text-xs text-muted-foreground" data-testid="verdict-kept">
              {kept}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending} data-testid="verdict-skip">
            Skip
          </Button>
          <Button onClick={save} disabled={pending || !!problem} title={problem ?? undefined} data-testid="verdict-save">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <Check className="size-4"/>}
            {good ? "Save what went well" : "Save the feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
