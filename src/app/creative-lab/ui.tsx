"use client";
import type { Finding, LabDraft } from "@/lib/creative-lab/types";
export const box = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
export const button = "rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:border-primary disabled:opacity-40";
export const nameOf = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
export type PanelProps = {
    d: LabDraft;
    patch: (v: Partial<LabDraft>) => void;
    status: (s: string) => void;
};
export function Field({ label, value, onChange, multiline, disabled, help }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    multiline?: boolean;
    disabled?: boolean;
    help?: string;
}) { return <label className="block space-y-1.5 text-sm"><span className="font-medium">{label}</span>{multiline ? <textarea aria-label={label} rows={3} className={box} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}/> : <input aria-label={label} className={box} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}/>}{help && <span className="block text-xs text-muted-foreground">{help}</span>}</label>; }
export function NumberField({ label, value, change, min = 0, max = 7200 }: {
    label: string;
    value: number;
    change: (n: number) => void;
    min?: number;
    max?: number;
}) { return <label className="block space-y-1 text-sm"><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step=".1" className={box} value={value} onChange={e => change(Math.max(min, Math.min(max, Number(e.target.value) || min)))}/></label>; }
export function Findings({ findings }: {
    findings: Finding[];
}) { return <div className="space-y-2" data-testid="production-findings">{findings.length ? findings.map(f => <div key={f.id} className={`rounded-lg border p-3 text-sm ${f.severity === "fix" ? "border-amber-300" : ""}`}><strong>{f.region} · {f.severity}</strong><p className="mt-1">{f.observation}</p><p className="mt-1 text-muted-foreground">{f.correction}</p></div>) : <p className="text-sm text-muted-foreground">No rule-based defects found in these fields. Meaning and source quality still need editorial inspection.</p>}</div>; }
export function Section({ title, children, description }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) { return <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="display text-2xl">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}{children}</section>; }
