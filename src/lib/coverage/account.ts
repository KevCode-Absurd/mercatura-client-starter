import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { AGE_BANDS, GENDERS } from "../audience";
import { getBrandRow, loadBrandBrain } from "../brands";
import { env } from "../env";
import { loadSegments } from "../personas/performance";
import { listPersonas } from "../personas/store";
import { AWARENESS_STAGES, OUTPUT_TYPES, type AwarenessStage, type OutputType } from "../taxonomy";
import { offerBook, offerChoices, offerForBuyer, type BrandOffer } from "../offers/book";
import { COVERAGE_FORMATS, OUTPUT_FORMAT, type AccountRead, type CoverageInput, type CoveragePersona, type InWork } from "./model";
import { simulateAccount } from "./simulate";
import { PerformanceEvidenceSchema } from "./evidence";
const FORMAT_IDS = COVERAGE_FORMATS.map((f) => f.id) as [
    string,
    ...string[]
];
const FileSchema = z.object({
    simulated: z.boolean().default(true),
    period: z.string(),
    source: z.string().default(""),
    currency: z.string().default("USD"),
    market: z.object({ stage: z.number().int().min(1).max(5), basis: z.string().default("") }),
    audience: z.array(z.object({ age: z.enum(AGE_BANDS), gender: z.enum(GENDERS), spend: z.number(), purchases: z.number(), revenue: z.number(), buyers_share: z.number().min(0).max(1) })),
    ads: z.array(z.object({
        id: z.string(),
        name: z.string(),
        format: z.enum(FORMAT_IDS),
        awareness: z.enum(AWARENESS_STAGES),
        sophistication: z.number().int().min(1).max(5),
        persona_id: z.string().nullable().default(null),
        offer_id: z.string().nullable().default(null),
        angle: z.string().default(""),
        hook: z.string().default(""),
        spend: z.number(),
        purchases: z.number(),
        revenue: z.number(),
        days: z.number().default(0),
        status: z.enum(["active", "paused"]).default("active"),
        hook_rate: z.number().min(0).max(1).nullable().optional(),
        hold_rate: z.number().min(0).max(1).nullable().optional(),
        creative_tags: z.object({ concept: z.string().optional(), visual: z.string().optional(), hook_type: z.string().optional() }).optional(),
    })),
    performance_evidence: PerformanceEvidenceSchema.optional(),
});
export const accountFile = (dir: string) => path.join(env.BRANDS_DIR, dir, "sample-data", "performance", "account.json");
export function coveragePersonas(brandId: string): CoveragePersona[] {
    const perf = loadSegments(brandId);
    let book: BrandOffer[] = [];
    try {
        book = offerBook(brandId);
    }
    catch {
    }
    return listPersonas(brandId)
        .filter((p) => p.status === "active")
        .map((p) => {
        const seg = p.performance?.segment ? perf?.segments.find((s) => s.label === p.performance!.segment) : undefined;
        return {
            id: p.id,
            name: p.name,
            age: p.who.age || seg?.age || "",
            gender: p.who.gender || seg?.gender || "",
            awareness: (AWARENESS_STAGES as readonly string[]).includes(p.awareness) ? (p.awareness as AwarenessStage) : null,
            offer_id: offerForBuyer(book, { persona_id: p.id, persona_offer_id: p.offer_id, angle: p.angle || p.problem })?.id ?? p.offer_id,
            angle: p.angle || seg?.top_angle || p.problem,
            hooks: seg?.top_hooks.length ? seg.top_hooks : p.language.slice(0, 3),
            share: p.share,
        };
    });
}
export function loadAccount(brandId: string, personas: CoveragePersona[] = coveragePersonas(brandId)): AccountRead {
    const row = getBrandRow(brandId);
    const brand = loadBrandBrain(brandId);
    if (row && fs.existsSync(accountFile(row.dir))) {
        const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(accountFile(row.dir), "utf-8")));
        if (!parsed.success)
            throw new Error(`The account file of this brand can't be read: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
        return parsed.data;
    }
    const perf = loadSegments(brandId);
    const sum = (k: "spend" | "revenue" | "purchases") => perf!.segments.reduce((a, s) => a + s[k], 0);
    return simulateAccount({
        seed: brandId,
        currency: brand.brand.currency,
        marketStage: brand.market_sophistication_stage,
        personas,
        offers: offerChoices(brandId, brand).map((o) => ({ id: o.id, name: o.name })),
        ...(perf?.segments.length ? { totals: { spend: sum("spend"), revenue: sum("revenue"), purchases: sum("purchases"), period: perf.period } } : {}),
    });
}
export function scriptsInWork(brandId: string): InWork[] {
    const concepts = new Map(db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().map((c) => [c.id, c]));
    return db
        .select({ concept: schema.scripts.concept_id, stage: schema.scripts.awareness_stage, format: schema.scripts.format_target, axes: schema.scripts.axes })
        .from(schema.scripts)
        .where(eq(schema.scripts.brand_id, brandId))
        .all()
        .flatMap((s) => {
        const c = concepts.get(s.concept);
        if (!c || c.status === "live")
            return [];
        const format = s.axes.native ? "native" : (OUTPUT_TYPES as readonly string[]).includes(s.format ?? "") ? OUTPUT_FORMAT[s.format as OutputType] : null;
        return [{ awareness: s.stage, sophistication: c.sophistication_stage, persona_id: c.persona_id, format }];
    });
}
export function coverageInput(brandId: string): CoverageInput {
    const brand = loadBrandBrain(brandId);
    const personas = coveragePersonas(brandId);
    return { account: loadAccount(brandId, personas), personas, offers: offerChoices(brandId, brand).map((o) => ({ id: o.id, name: o.name })), inWork: scriptsInWork(brandId) };
}
