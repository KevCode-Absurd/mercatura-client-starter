"use client";
import { useState } from "react";
import { POINTS, SURFACES, readingsOf, scoreRows, type Judge, type Surface } from "@/lib/learning/writers";
import { cn } from "@/lib/utils";
export const WRITER_COLOURS = ["#2a6fdb", "#8a3ea8", "#0e8f7e", "#c2571a", "#b3306b", "#6b7a1f"];
const one = (v: number) => (Number.isNaN(v) ? "–" : v.toFixed(1));
function Chip({ on, onClick, children }: {
    on: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (<button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary")}>
      {children}
    </button>);
}
export function ScoreTable({ arms, judges }: {
    arms: {
        key: string;
        name: string;
    }[];
    judges: Judge[];
}) {
    const [surface, setSurface] = useState<Surface | "all">("all");
    const [judge, setJudge] = useState("all");
    const rows = scoreRows(arms, readingsOf(judges, surface, judge));
    const all = rows.flatMap((r) => [...r.points, r.mean]).filter((v) => !Number.isNaN(v));
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const best = (k: number) => Math.max(...rows.map((r) => (k < POINTS.length ? r.points[k] : r.mean)).filter((v) => !Number.isNaN(v)));
    return (<div data-testid="model-scores">
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Kind of copy</span>
          <Chip on={surface === "all"} onClick={() => setSurface("all")}>
            All
          </Chip>
          {SURFACES.map(([id, label]) => (<Chip key={id} on={surface === id} onClick={() => setSurface(id)}>
              {label}
            </Chip>))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Judge</span>
          <Chip on={judge === "all"} onClick={() => setJudge("all")}>
            Both
          </Chip>
          {judges.map((j) => (<Chip key={j.tag} on={judge === j.tag} onClick={() => setJudge(j.tag)}>
              {j.name}
            </Chip>))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="p-3 text-left font-medium">Model</th>
              {POINTS.map(([id, label]) => (<th key={id} className="p-3 text-right font-medium whitespace-nowrap">
                  {label}
                </th>))}
              <th className="p-3 text-right font-medium">Mean</th>
              <th className="p-3 text-right font-medium whitespace-nowrap">Ranked first</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (<tr key={r.key} className="border-b last:border-0" data-testid={`model-score-${r.key}`}>
                <td className="p-3 font-medium whitespace-nowrap">
                  <span className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ background: WRITER_COLOURS[i % WRITER_COLOURS.length] }}/>
                  {r.name}
                </td>
                {[...r.points, r.mean].map((v, k) => (<td key={k} className={cn("p-3 text-right", !Number.isNaN(v) && Math.abs(v - best(k)) < 0.005 && "font-semibold")} style={Number.isNaN(v) ? undefined : { background: `color-mix(in srgb, #1f7a55 ${Math.round(hi > lo ? ((v - lo) / (hi - lo)) * 40 : 0)}%, transparent)` }}>
                    {one(v)}
                  </td>))}
                <td className="p-3 text-right whitespace-nowrap">{r.readings ? `${r.first} of ${r.readings}` : "–"}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>);
}
export function FoldText({ text }: {
    text: string;
}) {
    const [open, setOpen] = useState(false);
    const long = text.length > 700;
    return (<div>
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]", long && !open && "line-clamp-[9]")}>{text}</p>
      {long && (<button type="button" onClick={() => setOpen(!open)} className="mt-2 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent" aria-expanded={open}>
          {open ? "Fold it" : "Read all of it"}
        </button>)}
    </div>);
}
