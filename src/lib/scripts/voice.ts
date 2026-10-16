import { getSetting } from "../settings";
import { voiceRulesText } from "./voice-rules";
import { REVIEW_QUALITY_CONTRACT } from "../creative-brand-contract";
import { brandVoice, forcesForm, withoutExamples, withoutPooledLines, type Surface } from "../brand-voice";
import { learnedRules, lessonIds } from "../lessons";
import { logFailures, voicePoints, type FailureRef } from "../failure-log";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { customerVoice } from "../customer-voice";
import { z } from "zod";
import { db, schema } from "@/db";
import type { VoiceCheck, VoiceIssue } from "@/db/schema";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { env } from "../env";
import { structuredJson } from "../llm/structured";
import { loadCreativeKit } from "../production/kit";
import { renderPrompt } from "../prompts";
import { voiceFlags } from "./audit";
import { contextLevel } from "../llm/routing";
import { skillFor } from "../skills/card";
import { EDIT_FIELDS, spliceFix } from "./edits";
export interface VoiceText {
    text: string;
    on_screen?: string;
}
export interface VoicePack {
    text: string;
    sources: string[];
    buyer: string;
    disclosures: string[];
}
const VOICE_HEADING = /voice|tone|key phrases|taglines|how .* (talk|speak)|language|vocabulary|words (we|to) (use|avoid)/i;
export function voiceSections(md: string): string[] {
    const lines = md.split(/\r?\n/);
    const out: string[] = [];
    let depth = 0;
    let buf: string[] = [];
    const flush = () => {
        if (buf.length > 1)
            out.push(buf.join("\n").trim());
        buf = [];
        depth = 0;
    };
    for (const line of lines) {
        const h = line.match(/^(#{1,6})\s+(.*)$/);
        if (h) {
            const level = h[1].length;
            if (depth && level <= depth)
                flush();
            if (!depth && VOICE_HEADING.test(h[2]))
                depth = level;
        }
        if (depth)
            buf.push(line);
    }
    flush();
    return out;
}
const STOPWORDS = new Set("the a an and or of to in on for with from that this it is are be as at by not no but so if real example examples use like who".split(" "));
const bulletWords = (line: string) => [...new Set(line.replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)))];
export function oncePerPoint(parts: string[], order: number[]): string[] {
    const seen: Set<string>[] = [];
    const drop = new Set<string>();
    for (const k of order) {
        for (const [n, line] of (parts[k] ?? "").split("\n").entries()) {
            if (!/^\s*- /.test(line))
                continue;
            const w = bulletWords(line);
            if (w.length < 2)
                continue;
            if (seen.some((s) => w.filter((x) => s.has(x)).length / w.length >= 0.75))
                drop.add(`${k}:${n}`);
            else
                seen.push(new Set(w));
        }
    }
    return parts
        .map((part, k) => part.split("\n").filter((_, n) => !drop.has(`${k}:${n}`)).join("\n"))
        .filter((part) => part.split("\n").some((line) => line.trim() && !/^#{1,6} /.test(line) && !/^(Do|Don't):$/.test(line.trim())));
}
export function brandVoicePack(brandId: string, brand: BrandBrain, themeIds: string[] = [], cut: {
    level?: "focused" | "minimal";
    personaIds?: string[];
    surfaces?: Surface[];
    buyerApart?: boolean;
    toneOnly?: boolean;
} = {}): VoicePack {
    const parts: string[] = [];
    const sources: string[] = [];
    const block = brandVoice(brandId, { surfaces: cut.surfaces ?? ["script"], personaIds: cut.personaIds, brand, buyerApart: cut.buyerApart, toneOnly: cut.toneOnly });
    if (block.text) {
        parts.push(block.text);
        sources.push(...block.sources);
    }
    const keysOf = (x: string) => [...new Set(x.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 3))];
    const inBlock = new Set(keysOf(block.text));
    const saidAbove = (x: string) => { const k = keysOf(x); return k.length > 0 && k.filter((w) => inBlock.has(w)).length / k.length >= 0.6; };
    const kit = loadCreativeKit(brandId);
    if (kit?.voice_direction && !saidAbove(kit.voice_direction)) {
        parts.push(`### Voice direction (creative kit)\n${kit.voice_direction}`);
        sources.push("creative-kit.json: voice direction");
    }
    const row = getBrandRow(brandId);
    const dir = row ? brandBrainDir(row.dir) : "";
    if (dir && fs.existsSync(dir) && cut.level !== "minimal") {
        let room = cut.level === "focused" ? 4500 : 7000;
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md").sort()) {
            const md = fs.readFileSync(path.join(dir, file), "utf-8");
            const bare = (ln: string): string[] => {
                if (/^\s*\|/.test(ln))
                    return [/^[\s:|-]+$/.test(ln) ? ln : ln.split("|").map((cell) => (cell.trim() ? ` ${withoutExamples(cell)} ` : cell)).join("|")];
                const item = /^(\s*[-*]\s+)(.*)$/.exec(ln);
                if (!item)
                    return [ln];
                const rest = withoutExamples(item[2]);
                return rest ? [`${item[1]}${rest}`] : [];
            };
            const found = voiceSections(cut.toneOnly ? withoutPooledLines(md) : md)
                .map((sec) => (cut.toneOnly ? sec.split("\n").flatMap(bare).join("\n") : sec))
                .map((sec) => sec.split("\n").filter((ln) => /^#{1,6} /.test(ln) || !(saidAbove(ln) || forcesForm(ln))).join("\n"))
                .filter((sec) => sec.split("\n").some((ln) => ln.trim() && !/^#{1,6} /.test(ln)));
            if (!found.length || room <= 0)
                continue;
            const text = found.join("\n\n").slice(0, room);
            room -= text.length;
            parts.push(`### From ${file}\n${text}`);
            sources.push(`${file}: ${found.length} voice section${found.length === 1 ? "" : "s"}`);
        }
    }
    const buyers = cut.personaIds?.length && brand.personas.some((p) => cut.personaIds!.includes(p.id)) ? [] : brand.personas;
    const words = buyers.flatMap((p) => p.language.map((w) => `- ${w} (${p.name})`));
    if (words.length) {
        parts.push(`### Words the customers use (personas)\n${words.join("\n")}`);
        sources.push("brand.json: persona language");
    }
    const quotes = cut.level && !themeIds.length ? [] : db
        .select({ quote: schema.insights.quote })
        .from(schema.insights)
        .where(and(themeIds.length ? inArray(schema.insights.theme_id, themeIds) : eq(schema.insights.brand_id, brandId), customerVoice))
        .orderBy(desc(schema.insights.intensity))
        .limit(14)
        .all()
        .map((q) => q.quote.replace(/\s+/g, " ").trim().slice(0, 220));
    if (quotes.length) {
        parts.push(`### How customers talk (real quotes from the research)\n${quotes.map((q) => `- "${q}"`).join("\n")}`);
        sources.push(`${quotes.length} customer quotes from the research`);
    }
    if (!cut.level)
        return { text: parts.join("\n\n"), sources, buyer: block.buyer, disclosures: block.disclosures };
    const docs = parts.map((x, i) => (x.startsWith("### From ") ? i : -1)).filter((i) => i >= 0);
    const rest = parts.map((_, i) => i).filter((i) => !docs.includes(i));
    return { text: oncePerPoint(parts, [...docs, ...rest]).join("\n\n"), sources, buyer: block.buyer, disclosures: block.disclosures };
}
const VoiceOut = z.object({
    verdict: z.enum(["on_voice", "needs_fixes"]),
    summary: z.string(),
    issues: z.array(z.object({ pass: z.enum(["spoken", "brand"]).default("brand"), where: z.enum(["line", "hook"]), index: z.number().int(), field: z.enum(["text", "on_screen"]), phrase: z.string(), why: z.string(), fix: z.string() })).max(30),
});
export const numbersOf = (s: string) => numbers(s);
const numbers = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, "")).sort().join("|");
const placeholders = (s: string) => (s.match(/\[[^\]]+\]/g) ?? []).sort().join("|");
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
export function fixProblem(original: string, phrase: string, fix: string): string | null {
    if (!fix.trim() || norm(fix) === norm(original))
        return "no change";
    if (phrase.trim() && !norm(original).includes(norm(phrase.trim())))
        return "the phrase isn't in the line";
    if (numbers(original) !== numbers(fix))
        return "it changes a number";
    if (placeholders(original) !== placeholders(fix))
        return "it changes a placeholder";
    if (/[—–]/.test(fix) && !/[—–]/.test(original))
        return "it adds an em dash";
    const a = wordCount(original);
    const b = wordCount(fix);
    if (Math.abs(a - b) > Math.max(4, Math.round(a * 0.35)))
        return "it changes the length too much";
    return null;
}
export function applyVoiceFixes<L extends VoiceText, H extends {
    text: string;
    overlay?: string;
}>(lines: L[], hooks: H[], issues: Omit<VoiceIssue, "applied">[]): {
    lines: L[];
    hooks: H[];
    issues: VoiceIssue[];
} {
    const outLines = lines.map((l) => ({ ...l }));
    const outHooks = hooks.map((h) => ({ ...h }));
    const done = new Set<string>();
    const marked = issues.map((i): VoiceIssue => {
        const key = `${i.where}:${i.index}:${i.field}`;
        const target = i.where === "line" ? outLines[i.index] : outHooks[i.index];
        if (!target || done.has(key))
            return { ...i, applied: false };
        const current = i.where === "line" ? (i.field === "text" ? (target as L).text : ((target as L).on_screen ?? "")) : i.field === "text" ? (target as H).text : ((target as H).overlay ?? "");
        if (fixProblem(current, i.phrase, i.fix))
            return { ...i, applied: false };
        const fix = i.fix.trim();
        if (i.where === "line") {
            if (i.field === "text")
                (target as L).text = fix;
            else
                (target as L).on_screen = fix;
        }
        else if (i.field === "text")
            (target as H).text = fix;
        else
            (target as H).overlay = fix;
        done.add(key);
        return { ...i, fix, applied: true };
    });
    if (lines[0] && hooks[0] && norm(lines[0].text) === norm(hooks[0].text) && outLines[0].text !== lines[0].text)
        outHooks[0].text = outLines[0].text;
    return { lines: outLines, hooks: outHooks, issues: marked };
}
export interface VoiceRequest<L extends VoiceText, H extends {
    text: string;
    overlay?: string;
}> {
    brandId: string;
    brand: BrandBrain;
    lines: (L & {
        beat?: string;
    })[];
    hooks: H[];
    themeIds?: string[];
    fix: boolean;
    stage?: import("../taxonomy").AwarenessStage | null;
    readCopy?: boolean;
    refId?: string;
    personaIds?: string[];
    surfaces?: Surface[];
    productId?: string | null;
    log?: Omit<FailureRef, "brandId">;
}
export async function voiceCheck<L extends VoiceText, H extends {
    text: string;
    overlay?: string;
}>(req: VoiceRequest<L, H>): Promise<{
    check: VoiceCheck;
    lines: L[];
    hooks: H[];
}> {
    const level = contextLevel("voice_check") === "full" ? "full" : "focused";
    const pack = brandVoicePack(req.brandId, req.brand, req.themeIds, level === "full" ? { surfaces: req.surfaces, personaIds: req.personaIds, buyerApart: true } : { level, personaIds: req.personaIds, surfaces: req.surfaces, buyerApart: true });
    const p = renderPrompt("voice-check", {
        buyer: pack.buyer || "(no named buyer: the brand's usual customer)",
        brand_name: req.brand.brand.name,
        edit_fields: EDIT_FIELDS,
        skill: skillFor("brand-voice-check", level) || "(brand-voice-check skill not installed)",
        spoken_skill: skillFor("script-voice-pass", level) || "(script-voice-pass skill not installed)",
        flags: voiceFlags(req.lines, req.readCopy ? 40 : 28).map((f) => `- line ${f.line}: ${f.flag}`).join("\n") || "(none)",
        brand_voice: `${pack.text}\n\n## The level for this brand\n${voiceRulesText(getSetting(req.brandId, "voice"), !req.readCopy, false, req.stage)}`,
        lessons: learnedRules(req.brandId, "edits", { productId: req.productId, ids: true }),
        mode: req.fix ? "fix" : "report (this script is a copy of an existing ad: list what is off, the words will not be changed)",
        lines: req.lines.map((l, i) => `${i} | ${l.beat ?? ""} | ${l.text} | ${l.on_screen ?? ""}`).join("\n"),
        hooks: req.hooks.map((h, i) => `${i} | ${h.text} | ${h.overlay ?? ""}`).join("\n") || "(none)",
    });
    const out = await structuredJson({ brandId: req.brandId, task: "voice_check", model: env.MODEL_VOICE, system: `${p.system}\n\n${REVIEW_QUALITY_CONTRACT}\nThis pass sees words only. Judge supplied fields; visual pixels and absent product evidence are outside this pass. Preserve approved speech when editing a transcription.`, user: p.user, schema: VoiceOut, effort: "low", maxTokens: 9000, refType: "script", refId: req.refId });
    const current = (i: (typeof out.issues)[number]) => {
        const t = i.where === "line" ? req.lines[i.index] : req.hooks[i.index];
        if (!t)
            return "";
        return i.field === "text" ? t.text : i.where === "line" ? ((t as L).on_screen ?? "") : ((t as H).overlay ?? "");
    };
    out.issues = out.issues.map((i) => ({ ...i, fix: spliceFix(current(i), i.phrase, i.fix) ?? i.fix }));
    out.issues = out.issues.filter((i) => i.fix.trim() && norm(i.fix) !== norm(current(i)));
    const base = { model: env.MODEL_VOICE, summary: out.summary.trim(), sources: pack.sources, checked_at: new Date().toISOString() };
    const done = (): {
        check: VoiceCheck;
        lines: L[];
        hooks: H[];
    } => {
        if (!req.fix)
            return { check: { ...base, status: out.issues.length ? "suggested" : "clean", issues: out.issues.map((i) => ({ ...i, applied: false })) }, lines: req.lines, hooks: req.hooks };
        const applied = applyVoiceFixes(req.lines, req.hooks, out.issues);
        const any = applied.issues.some((i) => i.applied);
        return { check: { ...base, status: any ? "fixed" : applied.issues.length ? "suggested" : "clean", issues: applied.issues }, lines: applied.lines, hooks: applied.hooks };
    };
    const res = done();
    if (req.log)
        logFailures({ brandId: req.brandId, productId: req.productId, ...req.log }, voicePoints(res.check, lessonIds(req.brandId)));
    return res;
}
export const skippedVoiceCheck = (why: string): VoiceCheck => ({ status: "skipped", model: env.MODEL_VOICE, summary: why, issues: [], sources: [], checked_at: new Date().toISOString() });
