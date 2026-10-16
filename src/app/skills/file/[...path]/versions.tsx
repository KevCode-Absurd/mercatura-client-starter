"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { putBackAction } from "../../actions";
export interface VersionRow {
    id: string;
    version: number;
    at: string;
    note: string;
    source: "hand" | "feedback" | "tighten" | "restore";
    by: string;
    charsBefore: number;
    charsAfter: number;
}
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const HOW: Record<VersionRow["source"], string> = { hand: "Edited by hand", feedback: "From feedback", tighten: "Tightened", restore: "Put back" };
export function Versions({ file, current, rows, admin }: {
    file: string;
    current: number;
    rows: VersionRow[];
    admin: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [, start] = useTransition();
    const putBack = (r: VersionRow) => {
        setBusy(r.id);
        start(async () => {
            const res = await putBackAction(r.id);
            setBusy(null);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(`Put back to the text before version ${r.version}. That is itself a new version, so nothing is lost.`);
            router.refresh();
        });
    };
    const newest = [...rows].reverse();
    return (<ol className="overflow-hidden rounded-xl border bg-card" data-testid="skill-versions">
      {newest.map((r) => (<li key={r.id} className="flex flex-wrap items-start gap-x-5 gap-y-2 border-b px-6 py-4 last:border-b-0">
          <span className="numeral w-12 shrink-0 text-3xl text-primary">{r.version}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm">
              <span className="font-semibold">{HOW[r.source]}</span>
              <span className="text-muted-foreground">
                {" "}
                · {when(r.at)}
                {r.by ? ` · ${r.by}` : ""} · {r.charsBefore.toLocaleString("en-US")} to {r.charsAfter.toLocaleString("en-US")} characters
              </span>
            </div>
            {r.note && <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>}
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/skills/change/${r.id}`}>See the change</Link>
            </Button>
            {admin && r.version === current && (<Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => putBack(r)} data-testid="version-put-back">
                {busy === r.id ? <Loader2 className="size-3.5 animate-spin"/> : <Undo2 className="size-3.5"/>} Put back
              </Button>)}
          </div>
        </li>))}
      <li className="flex flex-wrap items-start gap-x-5 gap-y-2 px-6 py-4">
        <span className="numeral w-12 shrink-0 text-3xl text-muted-foreground">1</span>
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">As shipped</span>
          <span className="text-muted-foreground"> · {file}</span>
        </div>
      </li>
    </ol>);
}
