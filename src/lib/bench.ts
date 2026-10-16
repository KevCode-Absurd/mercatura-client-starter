import { z } from "zod";
export const BenchSet = z.object({
    persona: z.string(),
    length: z.string().default("30s"),
    hooks: z.number().int().min(1).max(5).default(3),
    captions: z.boolean().default(true),
    scripts: z
        .array(z.object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string(),
        stage: z.enum(["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"]),
        format: z.string(),
        from: z.string().optional(),
        image: z.object({ type: z.string(), as: z.string().optional() }),
    }))
        .min(1)
        .max(12),
});
export type BenchSet = z.infer<typeof BenchSet>;
export interface BenchArgs {
    brand: string;
    images: boolean;
    label: string;
    dry: boolean;
    unknown: string[];
}
export function benchArgs(argv: string[]): BenchArgs {
    const out: BenchArgs = { brand: "", images: false, label: "run", dry: false, unknown: [] };
    let brandSet = false;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--images")
            out.images = true;
        else if (a === "--dry")
            out.dry = true;
        else if (a === "--label")
            out.label = argv[++i] ?? out.label;
        else if (a.startsWith("--label="))
            out.label = a.slice(8) || out.label;
        else if (a.startsWith("--"))
            out.unknown.push(a);
        else if (!brandSet) {
            out.brand = a;
            brandSet = true;
        }
        else
            out.unknown.push(a);
    }
    out.label = slug(out.label) || "run";
    return out;
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
export function runFolder(date: string, label: string, taken: string[]): string {
    const base = `${date.slice(0, 10)}-${slug(label) || "run"}`;
    if (!taken.includes(base))
        return base;
    for (let n = 2;; n++)
        if (!taken.includes(`${base}-${n}`))
            return `${base}-${n}`;
}
export interface BenchRow {
    id: string;
    label: string;
    stage: string;
    format: string;
    script_id: string;
    title: string;
    faults: Record<string, number>;
    fact_flags: number;
    cents: number;
    seconds: number;
    images?: string[];
    error?: string;
}
export interface BenchRun {
    at: string;
    folder: string;
    brand: string;
    label: string;
    persona: string;
    images: boolean;
    rows: BenchRow[];
}
type Check = {
    label: string;
    ok: boolean;
    found: string[];
};
type Fact = {
    verdict: string;
};
export function faultsByCheck(checks: Check[] | undefined | null): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of checks ?? [])
        if (!c.ok)
            out[c.label] = (out[c.label] ?? 0) + Math.max(1, c.found.length);
    return out;
}
export const factFlags = (...tables: (Fact[] | undefined | null)[]): number => tables.flatMap((t) => t ?? []).filter((f) => f.verdict === "invented" || f.verdict === "stretched").length;
export const totalFaults = (r: Pick<BenchRow, "faults">) => Object.values(r.faults).reduce((n, x) => n + x, 0);
const cents = (n: number) => `${n.toFixed(1)}c`;
const signed = (n: number, unit = "", digits = 0) => (Math.abs(n) < 10 ** -digits / 2 ? "same" : `${n > 0 ? "+" : "-"}${Math.abs(n).toFixed(digits)}${unit}`);
const cell = (s: string) => s.replace(/\|/g, "/").replace(/\n/g, " ");
export function compareRow(now: BenchRow, before: BenchRow | undefined): string {
    if (!before)
        return "not in the last run";
    if (now.error)
        return "failed this time";
    if (before.error)
        return "failed last time";
    const f = [totalFaults(before), totalFaults(now)];
    return [
        `faults ${f[0]} to ${f[1]} (${signed(f[1] - f[0])})`,
        `flags ${before.fact_flags} to ${now.fact_flags} (${signed(now.fact_flags - before.fact_flags)})`,
        `cost ${signed(now.cents - before.cents, "c", 1)}`,
        `time ${signed(now.seconds - before.seconds, "s")}`,
    ].join(", ");
}
export function summaryMd(run: BenchRun, before?: BenchRun | null): string {
    const prev = (id: string) => before?.rows.find((r) => r.id === id);
    const head = ["Script", "Faults by check (edit pass)", "Fact-check flags", "Cost", "Seconds", ...(before ? [`vs last run (${before.folder})`] : [])];
    const faults = (r: BenchRow) => (r.error ? `FAILED: ${r.error.slice(0, 120)}` : Object.keys(r.faults).length ? Object.entries(r.faults).map(([k, n]) => `${k}: ${n}`).join("; ") : "none");
    const rows = run.rows.map((r) => [`${r.label} (${r.script_id || "-"})`, faults(r), r.error ? "-" : String(r.fact_flags), cents(r.cents), String(Math.round(r.seconds)), ...(before ? [compareRow(r, prev(r.id))] : [])]);
    const sum = (rs: BenchRow[]) => ({ faults: rs.reduce((n, r) => n + totalFaults(r), 0), flags: rs.reduce((n, r) => n + r.fact_flags, 0), cents: rs.reduce((n, r) => n + r.cents, 0), seconds: rs.reduce((n, r) => n + r.seconds, 0) });
    const t = sum(run.rows);
    const b = before ? sum(before.rows) : null;
    rows.push(["Total", `${t.faults} found`, String(t.flags), cents(t.cents), String(Math.round(t.seconds)), ...(b ? [`faults ${b.faults} to ${t.faults} (${signed(t.faults - b.faults)}), flags ${b.flags} to ${t.flags} (${signed(t.flags - b.flags)}), cost ${signed(t.cents - b.cents, "c", 1)}, time ${signed(t.seconds - b.seconds, "s")}`] : [])]);
    const table = [head, head.map(() => "---"), ...rows].map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n");
    const pictures = run.rows.filter((r) => r.images?.length).map((r) => `- ${r.label}: ${r.images!.join(", ")}`);
    return [
        `# Bench ${run.folder}`,
        `${run.brand}, persona ${run.persona}, ${run.rows.length} script${run.rows.length === 1 ? "" : "s"}${run.images ? ", with pictures" : ", words only"}. Made ${run.at.slice(0, 16).replace("T", " ")}.`,
        "",
        table,
        "",
        "Faults are what the edit pass found before it fixed anything, by its own checks. Flags are statements a fact check marked invented or stretched, in the script and in the primary text, headlines and hooks. Fewer is better for both; they are counts by the app's own checks, not a judgement of taste. Read the scripts beside the numbers.",
        ...(before ? ["", `Compared with ${before.folder} (${before.label}, made ${before.at.slice(0, 16).replace("T", " ")}).`] : ["", "No earlier run to compare with."]),
        ...(pictures.length ? ["", "## Pictures", ...pictures] : []),
        "",
    ].join("\n");
}
export function lastRun(runs: BenchRun[], current: {
    at: string;
    brand: string;
    folder?: string;
}): BenchRun | null {
    return runs.filter((r) => r.brand === current.brand && r.folder !== current.folder && r.at < current.at).sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;
}
export function planText(a: {
    args: BenchArgs;
    set: BenchSet;
    persona: string;
    personaNote?: string;
    folder: string;
    before: string | null;
    sources: Record<string, string>;
    live: boolean;
}): string {
    const { args, set } = a;
    return [
        `Bench plan${args.dry ? " (dry run: nothing is made, no model is called)" : ""}`,
        `Brand: ${args.brand}. Persona: ${a.persona}${a.personaNote ? ` (${a.personaNote})` : ""}. Length ${set.length}, ${set.hooks} hook${set.hooks === 1 ? "" : "s"} each${set.captions ? ", with primary text and headlines" : ""}.`,
        ...set.scripts.map((s, i) => `  ${i + 1}. ${s.label}: stage ${s.stage.replace(/_/g, " ")}, written for ${s.format}, brief from ${a.sources[s.id] ?? "(no concept found: this one would fail)"}${args.images ? `, then rendered as ${s.image.type}${s.image.as ? ` (${s.image.as})` : ""}` : ""}`),
        args.images ? `Pictures: ${set.scripts.length} static ad${set.scripts.length === 1 ? "" : "s"} rendered (paid: they count toward the image cap).` : "Pictures: none (add --images to render the static ads; images cost).",
        `Output: data/bench/${a.folder}/ (1 .md per script, summary.md, results.json).`,
        a.before ? `Compared with: data/bench/${a.before}.` : "Compared with: nothing yet (this would be the first run for this brand).",
        a.live ? "" : "Note: no live model is switched on here, so a real run would write mock scripts that say nothing about quality.",
        ...(args.unknown.length ? [`Not understood, and left out: ${args.unknown.join(" ")}`] : []),
    ]
        .filter(Boolean)
        .join("\n");
}
