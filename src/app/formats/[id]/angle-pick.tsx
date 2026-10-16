"use client";
import Link from "next/link";
import type { AngleStatus } from "@/db/schema";
import { cn } from "@/lib/utils";
export interface FlowAngle {
    id: string;
    label: string;
    phrase: string;
    ref: string;
    status: AngleStatus;
    frequency: number;
}
const STATUS: Record<AngleStatus, string> = { unrun: "not built", running: "running", dead: "tested, dead" };
export function AnglePick({ angles, value, onChange }: {
    angles: FlowAngle[];
    value: string | null;
    onChange: (id: string) => void;
}) {
    if (!angles.length)
        return (<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="flow-no-angle">
        The angle library is empty, so there are no buyer's words to build on.{" "}
        <Link href="/sources" className="font-medium underline">
          Bring in customer sources first
        </Link>
        , extract them, and sort them into themes on Insights.
      </p>);
    const chosen = angles.find((a) => a.id === value);
    return (<div className="space-y-2 text-sm" data-testid="flow-angle">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">Which angle</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Which angle">
          {angles.map((a) => (<button key={a.id} type="button" role="radio" aria-checked={value === a.id} onClick={() => onChange(a.id)} title={`"${a.phrase}" (${a.ref}), said by ${a.frequency} source${a.frequency === 1 ? "" : "s"}, ${STATUS[a.status]}`} className={cn("rounded-full border px-3 py-1", value === a.id ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted", a.status !== "unrun" && "border-dashed")} data-testid={`flow-angle-${a.id}`}>
              {a.label}
              {a.status !== "unrun" && <span className="ml-1 text-xs opacity-70">({STATUS[a.status]})</span>}
            </button>))}
        </div>
      </div>
      {chosen && (<p className="text-muted-foreground" data-testid="flow-angle-phrase">
          On the picture, word for word: <span className="italic text-foreground">“{chosen.phrase}”</span> <span className="text-xs">{chosen.ref}</span>
        </p>)}
      <p className="text-xs text-muted-foreground">
        The whole library is on <Link href="/insights?view=angles" className="underline-offset-2 hover:underline">Insights, Angles</Link>.
      </p>
    </div>);
}
