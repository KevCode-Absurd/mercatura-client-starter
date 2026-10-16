import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ThemeRow } from "@/db/schema";
import { getBrandRow } from "./brands";
import { llmGrouper, planClusters, type ClusterPlan, type Grouper, type PlanTheme } from "./pipeline/cluster";
import { rankThemes, themeStats } from "./ranking";
import { getSetting } from "./settings";
import { TYPE_BEAT } from "./taxonomy";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
const newThemeId = () => `th_${randomBytes(5).toString("hex")}`;
function brandInsights(brandId: string) {
    return db
        .select({
        id: schema.insights.id,
        type: schema.insights.type,
        quote: schema.insights.quote,
        note: schema.insights.note,
        intensity: schema.insights.intensity,
        theme_id: schema.insights.theme_id,
        source_item_id: schema.insights.source_item_id,
        source_type: schema.insights.source_type,
        persona_id: schema.insights.persona_id,
        objection_class: schema.insights.objection_class,
        date: schema.sourceItems.date,
    })
        .from(schema.insights)
        .leftJoin(schema.sourceItems, eq(schema.sourceItems.id, schema.insights.source_item_id))
        .where(eq(schema.insights.brand_id, brandId))
        .all();
}
export function unthemedCount(brandId: string): number {
    const themed = new Set(db.select({ ids: schema.themes.insight_ids }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all().flatMap((t) => t.ids));
    return brandInsights(brandId).filter((i) => !themed.has(i.id)).length;
}
function writeThemes(tx: Tx, brandId: string, planned: PlanTheme[], removed: string[]) {
    const insights = brandInsights(brandId);
    const byId = new Map(insights.map((i) => [i.id, i]));
    if (removed.length)
        tx.delete(schema.themes).where(inArray(schema.themes.id, removed)).run();
    const rows = planned.map((t) => {
        const members = t.insight_ids.map((id) => byId.get(id)).filter((i) => !!i);
        return { id: t.id ?? newThemeId(), type: t.type, label: t.label, summary: t.summary, locked: t.locked, insight_ids: members.map((m) => m.id), ...themeStats(members) };
    });
    const ranked = rankThemes(rows, getSetting(brandId, "rank_weights"));
    const now = new Date().toISOString();
    for (const t of ranked) {
        const values = {
            brand_id: brandId,
            type: t.type,
            label: t.label,
            summary: t.summary,
            beat: TYPE_BEAT[t.type],
            frequency: t.frequency,
            intensity_avg: t.intensity_avg,
            intensity_peak: t.intensity_peak,
            source_types: t.source_types as ThemeRow["source_types"],
            personas: t.personas,
            objection_classes: t.objection_classes as ThemeRow["objection_classes"],
            score: t.score,
            rank: t.rank,
            newest_date: t.newest_date,
            locked: t.locked,
            insight_ids: t.insight_ids,
            updated_at: now,
        };
        tx.insert(schema.themes).values({ id: t.id, ...values }).onConflictDoUpdate({ target: schema.themes.id, set: values }).run();
    }
    tx.update(schema.insights).set({ theme_id: null }).where(eq(schema.insights.brand_id, brandId)).run();
    for (const t of ranked) {
        if (t.insight_ids.length)
            tx.update(schema.insights).set({ theme_id: t.id }).where(inArray(schema.insights.id, t.insight_ids)).run();
    }
}
const currentThemes = (brandId: string): (PlanTheme & {
    id: string;
})[] => db
    .select()
    .from(schema.themes)
    .where(eq(schema.themes.brand_id, brandId))
    .all()
    .map((t) => ({ id: t.id, type: t.type, label: t.label, summary: t.summary, locked: t.locked, insight_ids: [...t.insight_ids] }));
export async function clusterBrand(brandId: string, mode: "incremental" | "full", grouper?: Grouper): Promise<ClusterPlan> {
    const brand = getBrandRow(brandId);
    const insights = brandInsights(brandId).map((i) => ({ id: i.id, type: i.type, quote: i.quote, note: i.note, intensity: i.intensity }));
    const inUse = themesInUse(brandId);
    const existing = currentThemes(brandId);
    const wasLocked = new Map(existing.map((t) => [t.id, t.locked]));
    const plan = await planClusters(insights, existing.map((t) => ({ ...t, locked: t.locked || inUse.has(t.id) })), grouper ?? llmGrouper(brandId, brand?.name ?? brandId), mode);
    for (const t of plan.themes)
        if (t.id && wasLocked.has(t.id))
            t.locked = wasLocked.get(t.id)!;
    db.transaction((tx) => writeThemes(tx, brandId, plan.themes, plan.removedThemeIds));
    return plan;
}
function themesInUse(brandId: string): Set<string> {
    const ids = new Set<string>();
    for (const c of db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all()) {
        for (const id of [...c.theme_ids, ...c.desire_evidence_theme_ids])
            ids.add(id);
    }
    for (const s of db.select({ lines: schema.scripts.lines }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all()) {
        for (const l of s.lines)
            for (const id of l.theme_ids)
                ids.add(id);
    }
    return ids;
}
function rewrite(brandId: string, edit: (themes: (PlanTheme & {
    id: string;
})[]) => {
    removed?: string[];
}) {
    const themes = currentThemes(brandId);
    const { removed = [] } = edit(themes);
    const keep = themes.filter((t) => !removed.includes(t.id));
    db.transaction((tx) => writeThemes(tx, brandId, keep, removed));
}
function need<T>(x: T | undefined, what: string): T {
    if (!x)
        throw new Error(`${what} not found`);
    return x;
}
export function renameTheme(brandId: string, themeId: string, label: string, summary: string) {
    if (!label.trim())
        throw new Error("A theme needs a label");
    rewrite(brandId, (themes) => {
        const t = need(themes.find((x) => x.id === themeId), "Theme");
        Object.assign(t, { label: label.trim(), summary: summary.trim(), locked: true });
        return {};
    });
}
export function mergeThemes(brandId: string, targetId: string, sourceIds: string[]) {
    rewrite(brandId, (themes) => {
        const target = need(themes.find((x) => x.id === targetId), "Theme");
        const sources = sourceIds.filter((id) => id !== targetId).map((id) => need(themes.find((x) => x.id === id), "Theme"));
        for (const s of sources) {
            if (s.type !== target.type)
                throw new Error(`Only themes of the same type can merge ("${s.label}" is ${s.type})`);
            target.insight_ids.push(...s.insight_ids.filter((id) => !target.insight_ids.includes(id)));
        }
        target.locked = true;
        return { removed: sources.map((s) => s.id) };
    });
    repointEvidence(brandId, sourceIds.filter((id) => id !== targetId), targetId);
}
function repointEvidence(brandId: string, from: string[], to: string) {
    const swap = (ids: string[]) => [...new Set(ids.map((id) => (from.includes(id) ? to : id)))];
    const hits = (ids: string[]) => ids.some((id) => from.includes(id));
    for (const c of db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all()) {
        if (hits(c.theme_ids) || hits(c.desire_evidence_theme_ids)) {
            db.update(schema.concepts)
                .set({ theme_ids: swap(c.theme_ids), desire_evidence_theme_ids: swap(c.desire_evidence_theme_ids) })
                .where(eq(schema.concepts.id, c.id))
                .run();
        }
    }
    for (const s of db.select({ id: schema.scripts.id, lines: schema.scripts.lines }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all()) {
        if (s.lines.some((l) => hits(l.theme_ids))) {
            db.update(schema.scripts)
                .set({ lines: s.lines.map((l) => ({ ...l, theme_ids: swap(l.theme_ids) })) })
                .where(eq(schema.scripts.id, s.id))
                .run();
        }
    }
}
export function splitTheme(brandId: string, themeId: string, insightIds: string[], label: string, summary: string): string {
    if (!label.trim())
        throw new Error("The new theme needs a label");
    const id = newThemeId();
    rewrite(brandId, (themes) => {
        const t = need(themes.find((x) => x.id === themeId), "Theme");
        const moving = t.insight_ids.filter((i) => insightIds.includes(i));
        if (!moving.length)
            throw new Error("Pick at least 1 quote to split off");
        t.insight_ids = t.insight_ids.filter((i) => !moving.includes(i));
        t.locked = true;
        themes.push({ id, type: t.type, label: label.trim(), summary: summary.trim(), locked: true, insight_ids: moving });
        return { removed: t.insight_ids.length ? [] : [t.id] };
    });
    return id;
}
export function unlockTheme(brandId: string, themeId: string) {
    db.update(schema.themes).set({ locked: false }).where(and(eq(schema.themes.id, themeId), eq(schema.themes.brand_id, brandId))).run();
}
export function reconcileThemes(brandId: string) {
    const alive = new Set(brandInsights(brandId).map((i) => i.id));
    rewrite(brandId, (themes) => {
        for (const t of themes)
            t.insight_ids = t.insight_ids.filter((id) => alive.has(id));
        return { removed: themes.filter((t) => !t.insight_ids.length).map((t) => t.id) };
    });
}
