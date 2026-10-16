import Link from "next/link";
import { cn } from "@/lib/utils";
export const th = "border-b bg-muted/50 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground";
export const td = "border-b px-3 py-3 text-[13px] align-top";
export const r = "text-right tabular-nums";
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const cents = (c: number) => (c >= 100 ? `$${(c / 100).toFixed(2)}` : `${c.toFixed(c < 1 ? 2 : 1)} c`);
export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "never");
export const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "-");
const TABS = [
    { href: "/inspect", label: "Steps" },
    { href: "/inspect/skills", label: "Skills and prompts" },
    { href: "/inspect/notes", label: "Notes and changes" },
];
export function InspectTabs({ at, open = 0 }: {
    at: string;
    open?: number;
}) {
    return (<div className="mx-6 mt-4 flex flex-wrap gap-x-2 gap-y-1 border-b" data-testid="inspect-tabs">
      {TABS.map((t) => (<Link key={t.href} href={t.href} className={cn("-mb-px flex min-h-11 items-center border-b-2 px-3 py-2.5 text-sm", at === t.href ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {t.label}
          {t.href === "/inspect/notes" && open > 0 && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs font-medium tabular-nums text-amber-800">{open}</span>}
        </Link>))}
    </div>);
}
const fileHref = (path: string) => `/inspect/file/${path.split("/").map(encodeURIComponent).join("/")}`;
export function EditLink({ path, at, children = "Edit" }: {
    path: string;
    at?: string;
    children?: React.ReactNode;
}) {
    return (<Link href={`${fileHref(path)}${at ? `?at=${encodeURIComponent(at)}` : ""}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline" data-testid="edit-link">
      {children}
    </Link>);
}
export function builtWhere(label: string): {
    href: string;
    label: string;
} | null {
    const l = label.toLowerCase();
    if (/lesson/.test(l))
        return { href: "/lessons", label: "Lessons" };
    if (/offer/.test(l))
        return { href: "/offers", label: "Offers" };
    if (/persona|buyer/.test(l))
        return { href: "/personas", label: "Personas" };
    if (/brand|voice|style|product|claim|guideline/.test(l))
        return { href: "/brand", label: "Brand" };
    return null;
}
export function Share({ part, whole, color = "var(--primary)", title }: {
    part: number;
    whole: number;
    color?: string;
    title?: string;
}) {
    const w = whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
    return (<span className="inline-flex items-center gap-1.5" title={title}>
      <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${w}%`, background: color }}/>
      </span>
      <span className="tabular-nums">{w}%</span>
    </span>);
}
export function Stat({ label, value, note }: {
    label: string;
    value: React.ReactNode;
    note?: React.ReactNode;
}) {
    return (<div className="rounded-lg border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="numeral mt-1 text-3xl">{value}</div>
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </div>);
}
export function Pre({ children }: {
    children: string;
}) {
    return <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-4 font-mono text-xs leading-relaxed">{children}</pre>;
}
export function FileLink({ path, className }: {
    path: string;
    className?: string;
}) {
    return (<Link href={fileHref(path)} className={cn("font-mono text-primary hover:underline", className)}>
      {path}
    </Link>);
}
