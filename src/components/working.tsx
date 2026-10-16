"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { aboutTime, barShare, clockTime } from "@/lib/studio/timing";
import { cn } from "@/lib/utils";
export const WORKING_LOOKS = ["pencil", "photos", "buddy", "plane"] as const;
export type WorkingLook = (typeof WORKING_LOOKS)[number];
export const WORKING_LOOK: WorkingLook | "by-job" = "by-job";
const BY_JOB: Record<"write" | "make", WorkingLook> = { write: "buddy", make: "photos" };
const lookFor = (job: "write" | "make", look: WorkingLook | "by-job" = WORKING_LOOK): WorkingLook => (look === "by-job" ? BY_JOB[job] : look);
function Pencil() {
    return (<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path className="wk-line" d="M8 48q5.5-11 11 0t11 0 11 0 11 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength={100}/>
      <g className="wk-pencil">
        <g className="wk-pencil-bob">
          <g transform="translate(8 48) rotate(-48)">
            <path d="M0 0l9-4.5v9z" fill="#e9c9a0"/>
            <path d="M0 0l3.4-1.7v3.4z" fill="var(--foreground)"/>
            <rect x="9" y="-4.5" width="21" height="9" fill="currentColor"/>
            <rect x="30" y="-4.5" width="3.5" height="9" fill="var(--rule)"/>
            <rect x="33.5" y="-4.5" width="5" height="9" rx="2" fill="#f3a6b4"/>
          </g>
        </g>
      </g>
    </svg>);
}
function Photos() {
    const print = (x: number, y: number, turn: number, n: 1 | 2 | 3) => (<g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <g className={cn("wk-print", n === 2 && "wk-d2", n === 3 && "wk-d3")}>
        <rect x="-12" y="-15" width="24" height="30" rx="2.5" fill="var(--card)" stroke="var(--rule)" strokeWidth="1.2"/>
        <rect x="-9" y="-12" width="18" height="18" rx="1" fill="var(--muted)"/>
        <g className={cn("wk-developed", n === 2 && "wk-d2", n === 3 && "wk-d3")}>
          <rect x="-9" y="-12" width="18" height="18" rx="1" fill="currentColor" opacity="0.22"/>
          <circle cx="4" cy="-7" r="2.6" fill="#f2b84b"/>
          <path d="M-9 6l6-8 4.5 5 3-3.2L9 6z" fill="currentColor"/>
        </g>
      </g>
    </g>);
    return (<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {print(19, 35, -14, 1)}
      {print(45, 35, 14, 3)}
      {print(32, 31, 0, 2)}
    </svg>);
}
function Buddy() {
    return (<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse className="wk-shadow" cx="32" cy="57" rx="13" ry="2.6" fill="currentColor"/>
      <path className="wk-spark" d="M53 10l1.6 4.4L59 16l-4.4 1.6L53 22l-1.6-4.4L47 16l4.4-1.6z" fill="#f2b84b"/>
      <path className="wk-spark wk-d2" d="M10 20l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" fill="#f2b84b"/>
      <g className="wk-bounce">
        <circle cx="32" cy="38" r="17" fill="currentColor"/>
        <g className="wk-eyes" fill="var(--primary-foreground)">
          <ellipse cx="25.5" cy="35.5" rx="2.5" ry="3.3"/>
          <ellipse cx="38.5" cy="35.5" rx="2.5" ry="3.3"/>
        </g>
        <path d="M27.5 43q4.5 3.6 9 0" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="21.5" cy="41.5" r="2.4" fill="#f3a6b4" opacity="0.75"/>
        <circle cx="42.5" cy="41.5" r="2.4" fill="#f3a6b4" opacity="0.75"/>
      </g>
    </svg>);
}
export function WorkingMark({ job = "write", look, className }: {
    job?: "write" | "make";
    look?: WorkingLook | "by-job";
    className?: string;
}) {
    const which = lookFor(job, look);
    return (<span className={cn("wk inline-block shrink-0", className)} data-look={which} aria-hidden="true">
      {which === "pencil" ? <Pencil /> : which === "photos" ? <Photos /> : which === "buddy" ? <Buddy /> : <Send className="wk-fly size-full p-[18%]" strokeWidth={1.75}/>}
    </span>);
}
export interface WorkingProps {
    title: string;
    job?: "write" | "make";
    startedAt?: string | null;
    expect?: number;
    done?: number;
    total?: number;
    step?: string;
    note?: string;
    look?: WorkingLook | "by-job";
    className?: string;
    testId?: string;
}
export function Working({ title, job = "write", startedAt, expect = 0, done = 0, total = 0, step, note, look, className, testId = "working" }: WorkingProps) {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const began = startedAt ? new Date(startedAt).getTime() : NaN;
    const elapsed = now != null && Number.isFinite(began) ? Math.max(0, (now - began) / 1000) : 0;
    const known = expect > 0 || total > 0;
    const share = barShare(elapsed, expect, done, total);
    const late = expect > 0 && elapsed > expect * 1.2;
    const which = lookFor(job, look);
    const time = now == null || !Number.isFinite(began) ? "" : expect > 0 ? (late ? `${clockTime(elapsed)} so far, longer than usual` : `${clockTime(elapsed)} so far, ${aboutTime(expect)} in all`) : `${clockTime(elapsed)} so far`;
    return (<div className={cn("flex items-center gap-4 max-sm:gap-3", className)} data-testid={testId} data-look={which} role="status">
      {which !== "plane" && <WorkingMark job={job} look={look} className="size-16 max-sm:size-12"/>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" data-testid={`${testId}-title`}>
          {title}
        </p>
        <div className={cn("wk wk-track", which === "plane" ? "mt-6" : "mt-2")} role="progressbar" aria-valuemin={0} aria-valuemax={100} {...(known ? { "aria-valuenow": Math.round(share * 100) } : {})} data-testid={`${testId}-bar`}>
          <div className="wk-fill" {...(known ? { style: { width: `${(share * 100).toFixed(1)}%` } } : { "data-open": "1" })}/>
          {which === "plane" && known && <Send className="wk-rider" style={{ left: `${(share * 100).toFixed(1)}%` }} strokeWidth={1.75}/>}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground" data-testid={`${testId}-time`}>
          {[step, time, note].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>);
}
