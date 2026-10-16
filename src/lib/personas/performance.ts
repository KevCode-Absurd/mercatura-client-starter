import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getBrandRow } from "../brands";
import { env } from "../env";
import type { PersonaPerformance } from "./types";
const Segment = z.object({
    id: z.string(),
    label: z.string(),
    age: z.string().default(""),
    gender: z.string().default(""),
    marker: z.string().default(""),
    spend: z.number(),
    purchases: z.number(),
    revenue: z.number(),
    repeat_90d: z.number().optional(),
    top_product: z.string().default(""),
    top_offer: z.string().default(""),
    top_angle: z.string().default(""),
    top_hooks: z.array(z.string()).default([]),
});
const FileSchema = z.object({ simulated: z.boolean().default(true), period: z.string(), source: z.string().default(""), currency: z.string().default("USD"), segments: z.array(Segment) });
export type PerformanceSegment = z.infer<typeof Segment>;
export interface Performance {
    simulated: boolean;
    period: string;
    source: string;
    currency: string;
    segments: (PerformanceSegment & {
        cpa: number;
        roas: number;
        aov: number;
        spend_share: number;
    })[];
}
export function loadSegments(brandId: string): Performance | null {
    const row = getBrandRow(brandId);
    if (!row)
        return null;
    const file = path.join(env.BRANDS_DIR, row.dir, "sample-data", "performance", "segments.json");
    if (!fs.existsSync(file))
        return null;
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
    if (!parsed.success)
        return null;
    const total = parsed.data.segments.reduce((a, s) => a + s.spend, 0) || 1;
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        ...parsed.data,
        segments: parsed.data.segments
            .map((s) => ({ ...s, cpa: s.purchases ? round(s.spend / s.purchases) : 0, roas: s.spend ? round(s.revenue / s.spend) : 0, aov: s.purchases ? round(s.revenue / s.purchases) : 0, spend_share: Math.round((s.spend / total) * 1000) / 1000 }))
            .sort((a, b) => b.roas - a.roas),
    };
}
export const performanceOf = (perf: Performance, s: Performance["segments"][number]): PersonaPerformance => ({ simulated: perf.simulated, period: perf.period, segment: s.label, spend: s.spend, purchases: s.purchases, revenue: s.revenue, spend_share: s.spend_share, cpa: s.cpa, roas: s.roas, aov: s.aov });
