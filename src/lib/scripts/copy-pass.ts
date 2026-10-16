import { wholeClaim } from "../copy/figures";
import { specLine } from "../product-facts";
import { brandVoiceApart, type Surface } from "../brand-voice";
import { learnedRules } from "../lessons";
import { z } from "zod";
import type { BrandBrain } from "../brand-brain";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { claimsFor, offersFor } from "../llm/context";
import { contextLevel, modelOf } from "../llm/routing";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { skillFor } from "../skills/card";
import { EDIT_FIELDS, spliceFix } from "./edits";
export interface CopyText {
    text: string;
    on_screen?: string;
    beat?: string;
}
export interface CopyIssue {
    where: "line" | "hook";
    index: number;
    field: "text" | "on_screen";
    phrase: string;
    why: string;
    fix: string;
    swap?: string;
    applied: boolean;
    refused?: string;
}
export interface CopyResult<L, H> {
    lines: L[];
    hooks: H[];
    issues: CopyIssue[];
    summary: string;
    model: string;
    status: "edited" | "clean" | "skipped";
}
const Out = z.object({
    summary: z.string().default(""),
    issues: z.array(z.object({ where: z.enum(["line", "hook"]).catch("line"), index: z.coerce.number().int(), field: z.enum(["text", "on_screen"]).catch("text"), phrase: z.string().default(""), why: z.string().default(""), fix: z.string(), swap: z.string().optional() })).max(12).default([]),
});
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
const numbers = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
const placeholders = (s: string) => (s.match(/\[[^\]]+\]/g) ?? []).sort().join("|");
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
export function copyFixProblem(original: string, phrase: string, fix: string, facts: string): string | null {
    if (!fix.trim() || norm(fix) === norm(original))
        return "no change";
    if (phrase.trim() && !norm(original).includes(norm(phrase)))
        return "the phrase isn't in the line";
    const before = numbers(original);
    const after = numbers(fix);
    if (before.some((n) => !after.includes(n)))
        return "it drops a number";
    const known = new Set(numbers(facts));
    const added = after.filter((n) => !before.includes(n) && !known.has(n));
    if (added.length)
        return `it brings in a number the brand's material doesn't have (${added[0]})`;
    if (placeholders(original) !== placeholders(fix))
        return "it changes a placeholder";
    if (/[—–]/.test(fix) && !/[—–]/.test(original))
        return "it adds an em dash";
    const a = wordCount(original);
    const b = wordCount(fix);
    if (Math.abs(a - b) > Math.max(6, Math.round(a * 0.5)))
        return "it changes the length too much";
    return null;
}
export function brandFacts(brand: BrandBrain, productId?: string | null, about?: string): string {
    const products = productId && brand.products.some((p) => p.id === productId) ? brand.products.filter((p) => p.id === productId) : brand.products;
    const offers = productId ? offersFor(brand, productId) : brand.offers;
    const picked = about != null ? claimsFor(brand, about, 8, productId) : null;
    const claims = picked ? [...picked.core, ...picked.more] : brand.claims.filter((c) => c.status === "substantiated");
    const whole = (c: {
        id: string;
        text: string;
    }) => wholeClaim({ text: c.text, source: brand.claims.find((x) => x.id === c.id)?.source });
    return [
        `Products:\n${products.map((p) => `- ${p.name}: ${p.format}${p.ingredients?.length ? ` Ingredients: ${p.ingredients.map((i) => `${i.name} ${i.dose} (${i.job})`).join("; ")}` : ""}${specLine(p)}`).join("\n")}`,
        `Approved claims:\n${claims.map((c) => `- ${c.id}: ${whole(c)}`).join("\n") || "(none)"}`,
        `Offers:\n${offers.map((o) => `- ${o.name}: ${brand.brand.currency} ${o.price}${o.per_day ? `, ${o.per_day} a day` : ""}${o.notes ? `. ${o.notes}` : ""}`).join("\n") || "(none)"}`,
        `Guarantee: ${brand.guarantee?.text ?? "(none)"}`,
        `Proof the brand has: ${brand.proof_assets.join("; ") || "(none listed)"}`,
    ].join("\n\n");
}
export interface CopyRequest<L extends CopyText, H extends {
    text: string;
    overlay?: string;
}> {
    brandId: string;
    brand: BrandBrain;
    what: string;
    context: string;
    lines: L[];
    hooks: H[];
    refType: string;
    refId: string;
    reportOnly?: boolean;
    productId?: string | null;
    surfaces?: Surface[];
    personaIds?: string[];
}
export async function copyPass<L extends CopyText, H extends {
    text: string;
    overlay?: string;
}>(req: CopyRequest<L, H>): Promise<CopyResult<L, H>> {
    const skipped = (summary: string): CopyResult<L, H> => ({ lines: req.lines, hooks: req.hooks, issues: [], summary, model: modelOf("copy_pass", env.MODEL_EDIT), status: "skipped" });
    const level = contextLevel("copy_pass");
    const skill = skillFor("copy-principles", level);
    if (!llmEnabled())
        return skipped("Mock mode: the copy pass needs live mode.");
    if (!skill)
        return skipped("The copy-principles skill is not installed.");
    try {
        const facts = brandFacts(req.brand);
        const sent = level === "full" ? facts : brandFacts(req.brand, req.productId);
        const voice = brandVoiceApart(req.brandId, { surfaces: req.surfaces ?? ["script"], personaIds: req.personaIds, brand: req.brand });
        const p = renderPrompt("copy-pass", {
            brand_name: req.brand.brand.name,
            what: req.what,
            skill,
            edit_fields: EDIT_FIELDS,
            context: req.context,
            buyer: voice.buyer,
            brand_voice: voice.text,
            lessons: learnedRules(req.brandId, "edits", { productId: req.productId }),
            facts: sent,
            forbidden: req.brand.forbidden_claims.map((f) => `- ${f}`).join("\n") || "(none)",
            lines: req.lines.map((l, i) => `${i} | ${l.beat ?? ""} | ${l.text} | ${l.on_screen ?? ""}`).join("\n"),
            hooks: req.hooks.map((h, i) => `${i} | ${h.text} | ${h.overlay ?? ""}`).join("\n") || "(none)",
        });
        const out = await structuredJson({ brandId: req.brandId, task: "copy_pass", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: Out, effort: "medium", maxTokens: 8000, refType: req.refType, refId: req.refId });
        const lines = req.lines.map((l) => ({ ...l }));
        const hooks = req.hooks.map((h) => ({ ...h }));
        const done = new Set<string>();
        const issues = out.issues.map((i): CopyIssue => {
            const key = `${i.where}:${i.index}:${i.field}`;
            const target = i.where === "line" ? lines[i.index] : hooks[i.index];
            if (!target)
                return { ...i, applied: false, refused: "no such field" };
            const current = i.where === "line" ? (i.field === "text" ? (target as L).text : ((target as L).on_screen ?? "")) : i.field === "text" ? (target as H).text : ((target as H).overlay ?? "");
            const whole = spliceFix(current, i.phrase, i.fix);
            if (whole == null)
                return { ...i, swap: i.fix, applied: false, refused: "the phrase isn't in the line" };
            i = { ...i, fix: whole, swap: i.fix.trim() } as typeof i;
            const refused = done.has(key) ? "a second change to the same field" : req.reportOnly ? "the words of this ad are kept as they are" : copyFixProblem(current, i.phrase, i.fix, facts);
            if (refused)
                return { ...i, applied: false, refused };
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
        if (req.lines[0] && req.hooks[0] && norm(req.lines[0].text) === norm(req.hooks[0].text) && lines[0].text !== req.lines[0].text)
            hooks[0].text = lines[0].text;
        const shown = issues.filter((i) => i.refused !== "no change");
        return { lines, hooks, issues: shown, summary: out.summary.trim(), model: modelOf("copy_pass", env.MODEL_EDIT), status: issues.some((i) => i.applied) ? "edited" : "clean" };
    }
    catch (e) {
        return skipped(`The copy pass didn't run: ${(e as Error).message.slice(0, 160)}`);
    }
}
export function copyNote<L, H>(r: CopyResult<L, H>): string {
    if (r.status === "skipped")
        return "";
    const applied = r.issues.filter((i) => i.applied);
    const left = r.issues.filter((i) => !i.applied);
    return [`Copy pass (${r.model}): ${applied.length ? `${applied.length} line${applied.length === 1 ? "" : "s"} sharpened` : "nothing to change"}. ${r.summary}`, ...applied.map((i) => `- ${i.why}: "${i.phrase.slice(0, 80)}" became "${(i.swap ?? i.fix).slice(0, 140)}"`), ...left.map((i) => `- Suggested, not applied (${i.refused}): ${i.why}: "${(i.swap ?? i.fix).slice(0, 140)}"`)].join("\n");
}
