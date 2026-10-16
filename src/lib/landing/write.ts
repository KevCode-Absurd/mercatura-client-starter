import fs from "node:fs";
import { tasteBlock } from "../taste/apply";
import { decide } from "../taste/decisions";
import { compactTaste } from "../taste/schema";
import type { ContextPlan, Taste } from "../taste/types";
import { voiceForPlan } from "../taste/voice";
import { learnedRules } from "../lessons";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LandingPageRow } from "@/db/schema";
import { env } from "../env";
import { offersFor } from "../llm/context";
import { callStructured, llmEnabled } from "../llm/gateway";
import { formatMoney } from "../money";
import { renderPrompt } from "../prompts";
import { skillFor } from "../skills/card";
import { landingContext, type LandingContext } from "./context";
import { pickQuotes } from "./draft";
import { getPage, savePage } from "./store";
import { FORMULAS, FORMULA_INFO, type Brief, type Formula, type Quote, type Section } from "./types";
import { angleLibrary } from "../angles/server";
import { boundRuntimeContext } from "../standalone/runtime";
import { readEvidence } from "../standalone/store";
import { factualLandingContext } from "./factual-context";
import { buildEvidencePacket, evidencePrompt } from "../standalone/evidence";
import { buyingTaskPrompt } from "./quality";
const Out = z.object({
    promise: z.string().default(""),
    sections: z.array(z.object({ id: z.string(), set: z.record(z.string(), z.unknown()) })).default([]),
    quotes: z.array(z.object({ id: z.string(), use: z.array(z.number()) })).default([]),
    headlines: z.array(z.object({ formula: z.enum(FORMULAS), text: z.string() })).default([]),
    headline_pick: z.number().nullable().default(null),
});
export type WriterOut = z.infer<typeof Out>;
const OWNED = new Set(["id", "type", "on", "options", "images", "image", "quote", "quotes", "src", "price", "compare_at", "per_day", "offer_id", "bucket"]);
const dashless = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
export function wordsOf(s: Section): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s)) {
        if (OWNED.has(k))
            continue;
        if (typeof v === "string")
            out[k] = v;
        else if (Array.isArray(v) && v.every((x) => typeof x === "string"))
            out[k] = v;
        else if (Array.isArray(v) && v.every((x) => x && typeof x === "object"))
            out[k] = v.map((x) => Object.fromEntries(Object.entries(x as object).filter(([kk, vv]) => !OWNED.has(kk) && typeof vv === "string")));
    }
    return out;
}
export function mergeWords(sections: Section[], out: Pick<WriterOut, "sections" | "quotes"> & Partial<WriterOut>, quotes: Quote[]): Section[] {
    return sections.map((s) => {
        const set = out.sections.find((x) => x.id === s.id)?.set ?? {};
        const next: Record<string, unknown> = { ...s };
        for (const [k, v] of Object.entries(set)) {
            if (OWNED.has(k) || !(k in s))
                continue;
            const was = (s as unknown as Record<string, unknown>)[k];
            if (typeof was === "string" && typeof v === "string")
                next[k] = dashless(v);
            else if (Array.isArray(was) && Array.isArray(v) && (was.length === 0 || was.every((x) => typeof x === "string")) && v.every((x) => typeof x === "string"))
                next[k] = (v as string[]).map(dashless).filter(Boolean);
            else if (Array.isArray(was) && was.length && was.every((x) => x && typeof x === "object") && Array.isArray(v)) {
                next[k] = (v as Record<string, unknown>[]).slice(0, Math.max(was.length, 8)).map((item, i) => {
                    const base = (was[i] ?? was[was.length - 1]) as Record<string, unknown>;
                    const merged: Record<string, unknown> = { ...base };
                    for (const [kk, vv] of Object.entries(item ?? {}))
                        if (!OWNED.has(kk) && typeof vv === "string" && typeof base[kk] === "string")
                            merged[kk] = dashless(vv);
                    return merged;
                });
            }
        }
        const picks = out.quotes.find((q) => q.id === s.id)?.use.map((n) => quotes[n - 1]).filter(Boolean) ?? [];
        if (picks.length && s.type === "reviews")
            next.quotes = picks.slice(0, 6);
        if (picks.length && s.type === "reasons")
            next.items = (next.items as Extract<Section, {
                type: "reasons";
            }>["items"]).map((it, i) => ({ ...it, quote: picks[i] ?? it.quote }));
        return next as unknown as Section;
    });
}
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
export function factLines(ctx: LandingContext, productId: string, taskBrief?: Brief["taskBrief"], omitOffer = false): string {
    ctx = factualLandingContext(ctx, productId, readEvidence(ctx.brandId), omitOffer);
    const b = ctx.brand;
    const cur = b.brand.currency;
    const p = b.products.find((x) => x.id === productId) ?? b.products[0];
    const bound = boundRuntimeContext(ctx.brandId, { productId: p.id, market: b.brand.market }, { surface: "landing" });
    return [
        `${b.brand.name}: ${b.brand.one_liner} Category: ${b.brand.category}. Market: ${b.brand.market}.`,
        `Product: ${p.name}. ${p.format}`,
        ...(p.specs ?? []).map((s) => `- ${s.name}: ${s.value}`),
        ...(p.ingredients ?? []).slice(0, 10).map((x) => `- ${x.name} ${x.dose}: ${x.job}`),
        ...(taskBrief?.structure === "comparison" ? b.products.filter(other => other.id !== p.id).slice(0, 1).map(other => `Own-catalogue comparison facts (do not transfer claims or offer terms between products): ${JSON.stringify({ id: other.id, name: other.name, format: other.format, specs: other.specs || [] })}`) : []),
        "Offers (the page shows these prices; never state another):",
        ...offersFor(b, p.id).filter(o => !bound || bound.packet.records.some(r => r.eligible && r.kind === "offer" && (r.id === o.id || r.id === `offer:${o.id}`))).map((o) => `- ${o.name}: ${formatMoney(o.price, cur)}${o.per_day ? `, ${formatMoney(o.per_day, cur)} a day` : ""}.${o.notes ? ` ${clip(o.notes, 200)}` : ""}`),
        b.guarantee ? `Guarantee: ${b.guarantee.text}` : "No guarantee is stated: do not promise one.",
        "Claims the page may make, as worded:",
        ...b.claims.filter((c) => bound ? bound.packet.records.some(r => r.eligible && r.kind === "claim" && (r.id === c.id || r.id === `claim:${c.id}`)) : c.status === "substantiated" || c.origin === "website" || c.origin === "ad").map((c) => `- ${c.text}`),
        `Never say: ${b.forbidden_claims.join("; ") || "(nothing listed)"}.`,
        b.voice.do.length ? `Voice: ${b.voice.do.slice(0, 5).join(" ")}` : "",
        b.voice.dont.length ? `Avoid: ${b.voice.dont.slice(0, 6).join(" ")}` : "",
        omitOffer ? ["PRODUCT INFORMATION ONLY. Do not mention prices, discounts, shipping, gifts, subscriptions, guarantees, urgency or current offer availability. Direct shoppers to the product destination for current options.", bound ? evidencePrompt(buildEvidencePacket(bound.packet.scope, readEvidence(ctx.brandId).filter(r => (r.kind === "fact" || r.kind === "claim") && !/[$£€₹]|free gifts?|shipping|discount|guarantee|subscription|\d+\s*%\s*off/i.test(r.text)))) : ""].join("\n") : bound?.prompt || "",
    ]
        .filter(Boolean)
        .join("\n");
}
export function doubtLines(brandId: string): string {
    const lib = angleLibrary(brandId);
    const rows = lib.objections.slice(0, 10);
    return rows.length ? rows.map((a, i) => `${i + 1}. ${a.label} (${a.frequency} source${a.frequency === 1 ? "" : "s"}): "${a.best.quote}" (${a.best.ref})`).join("\n") : "(none in the research yet: use the objections below and the buyer's own)";
}
export function kindCard(kind: string): string {
    const file = path.join(env.SKILLS_DIR, "landing-pages", "kinds", `${kind}.md`);
    if (!/^[a-z_-]+$/.test(kind) || !fs.existsSync(file))
        return "## This page is a product landing page\n\nThe rules above are the whole of it.";
    return fs.readFileSync(file, "utf-8").replace(/<!--[\s\S]*?-->\s*/g, "").trim();
}
export const pagePlan = (page: {
    ad?: unknown;
    brief: {
        awareness?: string;
        taste?: Taste;
    };
}, taste?: Taste | null, hasBrandRefs = true): ContextPlan => decide({ surface: "landing", stage: page.brief.awareness, hasReference: !!page.ad, hasBrandRefs }, taste ?? page.brief.taste ?? {});
export const pageAmounts = (plan: ContextPlan): {
    quotes: number;
    objections: number;
} => ({ quotes: plan.text.customerWords === "none" ? 0 : plan.text.customerWords === "few" ? 6 : 18, objections: plan.text.facts === "core" ? 0 : plan.text.facts === "full" ? 20 : 8 });
export async function writePage(id: string, opts: {
    replay?: string;
    taste?: Taste;
} = {}): Promise<LandingPageRow> {
    if (!opts.replay && !llmEnabled())
        throw new Error("Rewriting with a model needs live mode. The draft is already built from the brand's own facts; edit it by hand.");
    const page = getPage(id);
    if (!page)
        throw new Error("Page not found");
    const ctx = factualLandingContext(landingContext(page.brand_id), page.product_id, readEvidence(page.brand_id), page.brief.omitOffer);
    const persona = ctx.personas.find((p) => p.id === page.persona_id);
    const taste = compactTaste(opts.taste ?? page.brief.taste);
    const plan = pagePlan(page, taste);
    const amounts = pageAmounts(plan);
    const choices = tasteBlock(plan, { always: true });
    const quotes = amounts.quotes ? pickQuotes(ctx.quotes, page.persona_id, `${page.brief.promise} ${page.brief.angle}`, amounts.quotes) : [];
    const p = renderPrompt("lp-write", {
        brand_name: ctx.brand.brand.name,
        brand_voice: voiceForPlan(page.brand_id, plan, { surfaces: ["site"], personaIds: page.persona_id ? [page.persona_id] : [], brand: ctx.brand }),
        lessons: learnedRules(page.brand_id, "writes", { productId: page.product_id }),
        card: skillFor("landing-pages", "focused"),
        kind_card: kindCard(page.kind),
        facts: factLines(ctx, page.product_id, page.brief.taskBrief, page.brief.omitOffer),
        buyer: persona
            ? [`${persona.name}: ${persona.summary}`, `Lives with: ${persona.problem}`, persona.trigger ? `What sets them looking: ${persona.trigger}` : "", persona.wants ? `Wants: ${persona.wants}` : "", persona.angle ? `The angle for them: ${persona.angle}` : "", persona.objections.length ? `What stops them: ${persona.objections.join("; ")}` : "", persona.language.length ? `Their words: ${persona.language.map((l) => `"${l}"`).join(", ")}` : "", [persona.who.gender, persona.who.age].filter(Boolean).length ? `Who: ${[persona.who.gender, persona.who.age].filter(Boolean).join(", ")}. ${persona.who.life}` : ""].filter(Boolean).join("\n")
            : "Anyone who might buy this product.",
        ad: page.ad ? [`Headline: "${page.ad.headline}"`, page.ad.hooks.length > 1 ? `Hooks: ${page.ad.hooks.map((h) => `"${h}"`).join(", ")}` : "", page.ad.angle ? `Angle: ${page.ad.angle}` : "", page.brief.audience ? `It works best for ${page.brief.audience.label} (simulated figures): write to them.` : ""].filter(Boolean).join("\n") : "None: the page is not for 1 ad.",
        quotes: quotes.length ? quotes.map((q, i) => `${i + 1}: "${q.text}" (${q.who})`).join("\n") : "(none: leave quotes empty)",
        objections: ctx.objections.filter((o) => !o.persona_id || o.persona_id === page.persona_id).slice(0, amounts.objections).map((o) => `- "${o.q}": ${o.a}`).join("\n") || (amounts.objections ? "(none recorded)" : "(left out on purpose: the page is kept short)"),
        kind: page.kind,
        doubts: page.kind === "advertorial" ? doubtLines(page.brand_id) : "(not sent: not an advertorial)",
        formula: page.kind === "advertorial" ? (page.brief.formula ? `${FORMULA_INFO[page.brief.formula].label}: ${FORMULA_INFO[page.brief.formula].template}. Write all 4, and pick this one.` : "Write all 4 and pick the one that makes you want to keep reading. Say which in headline_pick.") : "(not an advertorial)",
        page: JSON.stringify(page.sections.filter((s) => s.on).map((s) => ({ id: s.id, type: s.type, ...wordsOf(s) }))),
        notes: `${page.brief.taskBrief ? `${buyingTaskPrompt(page.brief.taskBrief)}\n` : ""}${page.brief.notes.trim() ? `\n## Notes from the person\n${clip(page.brief.notes.trim(), 800)}` : ""}${choices ? `\n## The choices made for this page\n${choices}` : ""}`,
    });
    let out: WriterOut;
    let writer = "replay";
    let cost = 0;
    if (opts.replay)
        out = Out.parse(JSON.parse(opts.replay));
    else {
        const res = await callStructured({ brandId: page.brand_id, task: "lp_write", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, effort: "high", maxTokens: 14000, temperature: plan.temperature, refType: "landing", refId: page.id });
        out = res.data;
        cost = res.costUsd;
        writer = db.select({ model: schema.llmCalls.model }).from(schema.llmCalls).where(eq(schema.llmCalls.id, res.callId)).get()?.model ?? env.MODEL_COPY;
    }
    let sections = mergeWords(page.sections, out, quotes);
    const headlines = page.kind === "advertorial" ? out.headlines.filter((h) => h.text.trim()).map((h) => ({ formula: h.formula, text: dashless(h.text) })) : [];
    const picked = headlines.length && out.headline_pick ? headlines[Math.min(headlines.length, Math.max(1, out.headline_pick)) - 1] : undefined;
    const formula: Formula | null | undefined = page.kind === "advertorial" ? (page.brief.formula ?? picked?.formula ?? null) : page.brief.formula;
    const use = picked && !page.ad ? (headlines.find((h) => h.formula === formula) ?? picked) : undefined;
    if (use)
        sections = sections.map((s) => (s.type === "hero" ? { ...s, headline: use.text } : s));
    return savePage(id, { sections, brief: { ...page.brief, promise: dashless(out.promise) || page.brief.promise, ...(headlines.length ? { headlines } : {}), ...(formula !== undefined ? { formula } : {}), ...(Object.keys(taste).length ? { taste } : {}) }, writer, log: `Words rewritten by ${writer}${cost ? ` for $${cost.toFixed(3)}` : ""}; prices, options, images and quotes kept.` }, ctx);
}
