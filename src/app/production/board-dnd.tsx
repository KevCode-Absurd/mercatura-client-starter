"use client";
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type MutableRefObject, type ReactNode } from "react";
import { MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DropAnimation } from "@dnd-kit/core";
import type { BoardColumn, Verdict } from "@/lib/production/board";
import { cn } from "@/lib/utils";
export type Landing = MutableRefObject<Map<string, {
    left: number;
    top: number;
    width: number;
}>>;
export const COLUMN_TONE: Record<BoardColumn, string> = {
    draft: "#8a8578",
    queued: "#4f5bd5",
    running: "#0284c7",
    waiting: "#d97706",
    in_review: "#7c3aed",
    approved: "#059669",
    rejected: "#dc2626",
    sent: "#0d9488",
    discarded: "#78716c",
};
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const LIFT = "rotate(1.5deg) scale(1.03)";
const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const DROP_BACK: DropAnimation = { duration: 260, easing: EASE };
export function useBoardSensors() {
    return useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }));
}
export function DragCard({ id, landing, className, onOpen, children, ...data }: {
    id: string;
    landing: Landing;
    className?: string;
    onOpen: () => void;
    children: ReactNode;
} & Record<`data-${string}`, string>) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
    const el = useRef<HTMLButtonElement | null>(null);
    useLayoutEffect(() => {
        const from = landing.current.get(id);
        const node = el.current;
        if (!from || !node)
            return;
        landing.current.delete(id);
        if (still())
            return;
        const to = node.getBoundingClientRect();
        node.animate([
            { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) ${LIFT}`, boxShadow: "0 18px 40px -12px rgb(0 0 0 / 0.35)", zIndex: 30 },
            { transform: "none", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", zIndex: 30 },
        ], { duration: 280, easing: EASE });
        node.animate([{ outline: "2px solid var(--primary)", outlineOffset: "1px" }, { outline: "2px solid transparent", outlineOffset: "1px" }], { duration: 900, delay: 200, easing: "ease-out" });
    }, [id, landing]);
    return (<button ref={(n) => {
            el.current = n;
            setNodeRef(n);
        }} {...attributes} {...listeners} onClick={onOpen} data-dragging={isDragging || undefined} className={cn("cursor-grab touch-manipulation select-none transition-[opacity,border-color,box-shadow] duration-150", isDragging && "border-dashed opacity-30", className)} {...data}>
      {children}
    </button>);
}
export function CarriedCard({ className, tone, children }: {
    className?: string;
    tone?: string | null;
    children: ReactNode;
}) {
    const el = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        document.body.style.cursor = "grabbing";
        if (!still())
            el.current?.animate([{ transform: "none", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }, { transform: LIFT, boxShadow: "0 18px 40px -12px rgb(0 0 0 / 0.35)" }], { duration: 140, easing: EASE, fill: "forwards" });
        return () => {
            document.body.style.cursor = "";
        };
    }, []);
    return (<div ref={el} className={cn("cursor-grabbing will-change-transform", className)} data-testid="carried-card" data-tone={tone ?? undefined} style={{ outline: `2px solid ${tone ?? "transparent"}`, outlineOffset: 2, transition: "outline-color 150ms", ...(still() ? { boxShadow: "0 18px 40px -12px rgb(0 0 0 / 0.35)" } : null) }}>
      {children}
    </div>);
}
export function DropColumn({ status, label, count, verdict, carrying, home, children }: {
    status: BoardColumn;
    label: string;
    count: number;
    verdict: Verdict | null;
    carrying: boolean;
    home: boolean;
    children: ReactNode;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const takes = !!verdict?.ok;
    const lit = carrying && !home;
    const state = !lit ? "rest" : takes ? (isOver ? "over" : "open") : isOver ? "refused" : "closed";
    const DARK = "text-[color-mix(in_oklab,var(--tone)_78%,black)]";
    return (<div ref={setNodeRef} data-testid={`kanban-col-${status}`} data-takes={carrying ? String(takes) : undefined} data-over={isOver || undefined} data-state={state} style={{ "--tone": COLUMN_TONE[status] } as CSSProperties} className={cn("group/col relative rounded-xl p-2 outline-2 -outline-offset-2 outline-transparent transition-[background-color,outline-color,opacity] duration-150", state === "over" && "bg-[color-mix(in_oklab,var(--tone)_16%,var(--card))] outline-(--tone)", state === "open" && "bg-[color-mix(in_oklab,var(--tone)_6%,var(--muted))] outline-dashed outline-[color-mix(in_oklab,var(--tone)_45%,transparent)]", state === "closed" && "bg-muted/50 opacity-55", (state === "rest" || state === "refused") && "bg-muted/50")}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs font-medium">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full bg-(--tone)" aria-hidden/>
          <span className={cn("truncate transition-colors duration-150", state === "over" && DARK)}>{label}</span>
        </span>
        {lit && takes ? (<span className={cn("text-right", DARK)} data-testid="drop-hint">
            {verdict?.ok && verdict.approve ? (verdict.run ? "Drop to approve and run" : "Drop to approve") : verdict?.ok && verdict.run ? "Drop to run" : "Drop here"}
          </span>) : (<span className="rounded-full bg-card px-1.5 py-px text-[11px] text-muted-foreground tabular-nums ring-1 ring-rule/60">{count}</span>)}
      </div>
      {lit && !takes && isOver && verdict && !verdict.ok && (<div className="absolute inset-x-2 top-8 z-10 rounded-md bg-foreground px-2 py-1.5 text-xs leading-snug text-background shadow-md" data-testid="drop-why">
          {verdict.why}
        </div>)}
      {count === 0 && (<div className={cn("flex h-16 items-center justify-center rounded-lg border border-dashed text-[11px] transition-colors duration-150", state === "over" || state === "open" ? "border-[color-mix(in_oklab,var(--tone)_55%,transparent)]" : "border-rule/70 text-muted-foreground/70")} aria-hidden>
          {state === "rest" ? "Empty" : ""}
        </div>)}
      {children}
    </div>);
}
