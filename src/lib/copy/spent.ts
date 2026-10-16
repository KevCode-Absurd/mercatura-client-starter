import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BrandBrain } from "../brand-brain";
import { brandWorld } from "../brain/on-camera";
import { peopleOf, placesOf } from "../studio/deal";
import { spentPhrases } from "./seeds";
export type SpentSurface = "feed" | "picture" | "script" | "chat";
export const SPENT_SURFACES: SpentSurface[] = ["feed", "picture", "script", "chat"];
export const SPENT_SCRIPTS = 40;
export interface RecentOpts {
    surfaces?: SpentSurface[];
}
export function recentTexts(brandId: string, cap = 60, opts: RecentOpts = {}): string[] {
    const want = new Set(opts.surfaces ?? SPENT_SURFACES);
    type Text = {
        at: string;
        text: string;
    };
    const by: Record<SpentSurface, Text[]> = { feed: [], picture: [], script: [], chat: [] };
    try {
        if (want.has("feed") || want.has("picture")) {
            for (const r of db.select({ items: schema.studioRuns.items, at: schema.studioRuns.updated_at }).from(schema.studioRuns).where(eq(schema.studioRuns.brand_id, brandId)).orderBy(desc(schema.studioRuns.updated_at)).limit(20).all()) {
                for (const i of r.items ?? []) {
                    if (i.plan?.ad_copy?.primary_text)
                        by.feed.push({ at: r.at, text: `${i.plan.ad_copy.headline}. ${i.plan.ad_copy.primary_text}` });
                    const painted = (i.plan?.text_elements ?? []).map((e) => (e.text ?? "").trim()).filter(Boolean);
                    const onPicture = painted.length ? painted : [i.copy_draft?.headline ?? "", i.copy_draft?.body ?? ""].map((t) => t.trim()).filter(Boolean);
                    if (onPicture.length)
                        by.picture.push({ at: r.at, text: onPicture.join("\n") });
                }
            }
        }
        if (want.has("feed") || want.has("script")) {
            const rows = db.select({ kit: schema.scripts.kit, lines: schema.scripts.lines, hooks: schema.scripts.hook_variants, at: schema.scripts.updated_at }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.updated_at)).limit(Math.max(cap, SPENT_SCRIPTS)).all();
            rows.forEach((r, n) => {
                if (n < cap)
                    for (const t of [r.kit?.primary_text ?? "", ...(r.kit?.more_texts ?? []).map((m) => m.primary_text)])
                        if (t.trim())
                            by.feed.push({ at: r.at, text: t });
                if (n >= SPENT_SCRIPTS)
                    return;
                const said = [...(r.lines ?? []).map((l) => l.text ?? ""), ...(r.hooks ?? []).slice(1).map((h) => h.text ?? "")].map((t) => t.trim()).filter(Boolean);
                if (said.length)
                    by.script.push({ at: r.at, text: said.join("\n") });
            });
        }
        if (want.has("chat")) {
            for (const r of db.select({ actions: schema.chatMessages.actions, at: schema.chatMessages.created_at }).from(schema.chatMessages).where(and(eq(schema.chatMessages.brand_id, brandId), eq(schema.chatMessages.role, "assistant"))).orderBy(desc(schema.chatMessages.created_at)).limit(cap).all()) {
                for (const a of r.actions ?? [])
                    for (const o of a.result?.copy?.options ?? [])
                        if (o.text.trim())
                            by.chat.push({ at: r.at, text: o.text });
            }
        }
    }
    catch {
        return [];
    }
    const newest = (xs: Text[]) => [...xs].sort((a, b) => b.at.localeCompare(a.at));
    return newest(SPENT_SURFACES.filter((s) => want.has(s)).flatMap((s) => newest(by[s]).slice(0, cap))).map((x) => x.text);
}
export function recentOpenings(brandId: string, max = 10, chars = 70): string[] {
    try {
        const rows = db.select({ lines: schema.scripts.lines, at: schema.scripts.updated_at }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.updated_at)).limit(SPENT_SCRIPTS).all();
        const seen = new Set<string>();
        const out: string[] = [];
        for (const r of rows) {
            const first = ((r.lines ?? []).find((l) => (l.text ?? "").trim())?.text ?? "").replace(/\s+/g, " ").trim();
            if (!first)
                continue;
            const cut = first.length > chars ? first.slice(0, chars).replace(/\s+\S*$/, "") : first;
            if (seen.has(cut.toLowerCase()))
                continue;
            seen.add(cut.toLowerCase());
            out.push(cut);
            if (out.length >= max)
                break;
        }
        return out;
    }
    catch {
        return [];
    }
}
export const owedText = (brand: BrandBrain): string => [...brand.offers.map((o) => `${o.name}. ${o.notes ?? ""}`), brand.guarantee?.text ?? "", ...brand.products.map((p) => `${p.name}. ${p.format}. ${p.counted ?? ""}. ${(p.ingredients ?? []).map((i) => `${i.name}. ${i.dose}. ${i.job}`).join(". ")}`), ...brand.claims.map((c) => c.text), brand.brand.one_liner].join(". ");
export function spentFor(brandId: string, brand: BrandBrain, earlier: string[] = [], recent: string[] = recentTexts(brandId)): string[] {
    return spentPhrases(recent, owedText(brand), { earlier, names: [brand.brand.name, ...brand.products.map((p) => p.name)] });
}
export function worldFor(brandId: string): {
    places: string[];
    people: string[];
    props: string[];
} {
    try {
        const w = brandWorld(brandId);
        return { places: placesOf(w?.places), people: peopleOf(w?.people), props: placesOf(w?.surfaces_and_props) };
    }
    catch {
        return { places: [], people: [], props: [] };
    }
}
