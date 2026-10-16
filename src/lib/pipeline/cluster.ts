import { z } from "zod";
import { env } from "../env";
import { callStructured } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { INSIGHT_INFO, type InsightType } from "../taxonomy";
export const BATCH_SIZE = 150;
export interface ClusterInsight {
    id: string;
    type: InsightType;
    quote: string;
    note: string;
    intensity: number;
}
export interface PlanTheme {
    id: string | null;
    type: InsightType;
    label: string;
    summary: string;
    locked: boolean;
    insight_ids: string[];
}
export interface Grouper {
    assign(type: InsightType, themes: {
        label: string;
        summary: string;
    }[], insights: ClusterInsight[]): Promise<Map<string, number | null>>;
    group(type: InsightType, insights: ClusterInsight[]): Promise<{
        label: string;
        summary: string;
        insight_ids: string[];
    }[]>;
}
export interface ClusterPlan {
    themes: PlanTheme[];
    removedThemeIds: string[];
    assigned: number;
    grouped: number;
}
export async function planClusters(insights: ClusterInsight[], existing: PlanTheme[], grouper: Grouper, mode: "incremental" | "full"): Promise<ClusterPlan> {
    const alive = new Set(insights.map((i) => i.id));
    const kept = existing
        .filter((t) => mode === "incremental" || t.locked)
        .map((t) => ({ ...t, insight_ids: t.insight_ids.filter((id) => alive.has(id)) }))
        .filter((t) => t.insight_ids.length > 0 || (t.locked && mode === "incremental"));
    const keptIds = new Set(kept.map((t) => t.id));
    const removedThemeIds = existing.filter((t) => t.id && !keptIds.has(t.id)).map((t) => t.id!);
    const placed = new Set(kept.flatMap((t) => t.insight_ids));
    const pool = insights.filter((i) => !placed.has(i.id));
    const themes: PlanTheme[] = kept;
    let assigned = 0;
    let grouped = 0;
    const types = [...new Set(pool.map((i) => i.type))];
    for (const type of types) {
        const ofType = pool.filter((i) => i.type === type).sort((a, b) => a.id.localeCompare(b.id));
        for (let start = 0; start < ofType.length; start += BATCH_SIZE) {
            const batch = ofType.slice(start, start + BATCH_SIZE);
            const candidates = themes.filter((t) => t.type === type && (mode === "incremental" || t.id === null));
            let unmatched = batch;
            if (candidates.length) {
                const map = await grouper.assign(type, candidates, batch);
                unmatched = [];
                for (const ins of batch) {
                    const idx = map.get(ins.id);
                    if (idx != null && candidates[idx]) {
                        candidates[idx].insight_ids.push(ins.id);
                        assigned++;
                    }
                    else
                        unmatched.push(ins);
                }
            }
            if (!unmatched.length)
                continue;
            const groups = await groupAll(grouper, type, unmatched);
            for (const g of groups)
                themes.push({ id: null, type, label: g.label, summary: g.summary, locked: false, insight_ids: g.insight_ids });
            grouped += unmatched.length;
        }
    }
    return { themes: themes.filter((t) => t.insight_ids.length || t.locked), removedThemeIds, assigned, grouped };
}
async function groupAll(grouper: Grouper, type: InsightType, batch: ClusterInsight[]) {
    const valid = new Set(batch.map((i) => i.id));
    const seen = new Set<string>();
    const clean = (groups: {
        label: string;
        summary: string;
        insight_ids: string[];
    }[]) => groups
        .map((g) => ({ ...g, insight_ids: g.insight_ids.filter((id) => valid.has(id) && !seen.has(id) && (seen.add(id), true)) }))
        .filter((g) => g.insight_ids.length);
    const groups = clean(await grouper.group(type, batch));
    const missing = batch.filter((i) => !seen.has(i.id));
    if (missing.length) {
        const map = await grouper.assign(type, groups, missing);
        const rest: ClusterInsight[] = [];
        for (const ins of missing) {
            const idx = map.get(ins.id);
            if (idx != null && groups[idx]) {
                groups[idx].insight_ids.push(ins.id);
                seen.add(ins.id);
            }
            else
                rest.push(ins);
        }
        if (rest.length)
            groups.push(...clean(await grouper.group(type, rest)));
        for (const ins of rest.filter((i) => !seen.has(i.id))) {
            groups.push({ label: ins.note.slice(0, 60) || ins.quote.slice(0, 60), summary: ins.note, insight_ids: [ins.id] });
        }
    }
    return groups;
}
const GroupOut = z.object({
    themes: z.array(z.object({ label: z.string().min(2), summary: z.string(), items: z.array(z.string()) })),
});
const AssignOut = z.object({
    assignments: z.array(z.object({ item: z.string(), theme: z.string().nullable() })),
});
const itemLines = (batch: ClusterInsight[]) => batch.map((ins, n) => `i${n + 1} | intensity ${ins.intensity} | "${ins.quote}"${ins.note ? ` | note: ${ins.note}` : ""}`).join("\n");
export function llmGrouper(brandId: string, brandName: string): Grouper {
    const typeVars = (type: InsightType) => ({
        brand_name: brandName,
        type,
        type_label: INSIGHT_INFO[type].label,
        type_definition: INSIGHT_INFO[type].definition,
    });
    return {
        async group(type, batch) {
            const p = renderPrompt("cluster", { ...typeVars(type), count: String(batch.length), items: itemLines(batch) });
            const res = await callStructured({
                brandId,
                task: "cluster",
                model: env.MODEL_FAST,
                system: p.system,
                user: p.user,
                schema: GroupOut,
                maxTokens: 8000,
                refType: "brand",
                refId: brandId,
            });
            const key = new Map(batch.map((ins, n) => [`i${n + 1}`, ins.id]));
            return res.data.themes.map((t) => ({
                label: t.label.trim(),
                summary: t.summary.trim(),
                insight_ids: t.items.map((k) => key.get(k.trim())).filter((id): id is string => !!id),
            }));
        },
        async assign(type, themes, batch) {
            const themeLines = themes.map((t, n) => `t${n + 1} | ${t.label} | ${t.summary}`).join("\n");
            const p = renderPrompt("assign", { ...typeVars(type), themes: themeLines, items: itemLines(batch) });
            const res = await callStructured({
                brandId,
                task: "assign",
                model: env.MODEL_FAST,
                system: p.system,
                user: p.user,
                schema: AssignOut,
                maxTokens: 8000,
                refType: "brand",
                refId: brandId,
            });
            const out = new Map<string, number | null>();
            for (const a of res.data.assignments) {
                const id = batch[Number(a.item.trim().replace(/^i/, "")) - 1]?.id;
                const t = a.theme ? Number(a.theme.trim().replace(/^t/, "")) - 1 : null;
                if (id && !out.has(id))
                    out.set(id, t != null && t >= 0 && t < themes.length ? t : null);
            }
            return out;
        },
    };
}
