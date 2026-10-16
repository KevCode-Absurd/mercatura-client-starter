import type { HookVariant, ScriptLine } from "@/db/schema";
export interface ScriptForExport {
    id: string;
    title: string;
    version: number;
    est_seconds: number;
    status: string;
    lines: ScriptLine[];
    hook_variants: HookVariant[];
    context?: string[];
}
const beat = (b: string) => b.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const words = (lines: ScriptLine[]) => lines.reduce((n, l) => n + l.text.trim().split(/\s+/).filter(Boolean).length, 0);
const cell = (s: string | undefined) => (s ?? "").replace(/\|/g, "/").replace(/\s*\n\s*/g, " ").trim();
const alternates = (s: ScriptForExport) => s.hook_variants.filter((h) => h.text.trim() && h.text.trim() !== s.lines[0]?.text.trim());
export function scriptText(s: ScriptForExport): string {
    const out = [s.title, "", ...s.lines.map((l) => l.text.trim())];
    const alt = alternates(s);
    if (alt.length)
        out.push("", "Other openings to test:", ...alt.map((h) => `- ${h.text.trim()}`));
    return `${out.join("\n")}\n`;
}
export function scriptMarkdown(s: ScriptForExport): string {
    const out = [`# ${s.title}`, "", `${s.id}, version ${s.version}. About ${s.est_seconds} seconds, ${words(s.lines)} words. ${beat(s.status)}.`];
    for (const c of s.context ?? [])
        if (c.trim())
            out.push("", c.trim());
    const showScreen = s.lines.some((l) => l.on_screen?.trim());
    const showVisual = s.lines.some((l) => l.visual_note?.trim());
    out.push("", "## The script", "", `| # | Beat | Spoken${showScreen ? " | On screen" : ""}${showVisual ? " | Picture" : ""} |`, `|---|---|---${showScreen ? "|---" : ""}${showVisual ? "|---" : ""}|`);
    s.lines.forEach((l, i) => out.push(`| ${i + 1} | ${beat(l.beat)} | ${cell(l.text)}${showScreen ? ` | ${cell(l.on_screen)}` : ""}${showVisual ? ` | ${cell(l.visual_note)}` : ""} |`));
    const alt = alternates(s);
    if (alt.length) {
        out.push("", "## Other openings to test", "");
        for (const h of alt)
            out.push(`- **${cell(h.text)}**${h.overlay?.trim() ? ` On screen: "${cell(h.overlay)}".` : ""}${h.first_frame?.trim() ? ` First frame: ${cell(h.first_frame)}` : ""}`);
    }
    return `${out.join("\n")}\n`;
}
