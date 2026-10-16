import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { ANGLE_STATUSES, type AngleStatus } from "@/db/schema";
import { listAngles, saveAngle } from "../builder/store";
import { BrandBrainError, type BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { rankThemes } from "../ranking";
import { getSetting } from "../settings";
import { JOB_INFO, SOURCE_INFO } from "../taxonomy";
import { angleLine, buildAngleLibrary, stagesForJob, type AngleAsset, type AngleLibrary, type MinedAngle } from "./library";
const getThemes = (brandId: string) => rankThemes(db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all(), getSetting(brandId, "rank_weights"));
const getInsights = (brandId: string) => db.select().from(schema.insights).where(eq(schema.insights.brand_id, brandId)).all();
const getSourceItems = (brandId: string) => db.select().from(schema.sourceItems).where(eq(schema.sourceItems.brand_id, brandId)).orderBy(schema.sourceItems.date).all();
function tryBrand(brandId: string): BrandBrain | null {
    try {
        return loadBrandBrain(brandId);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return null;
        throw e;
    }
}
function assetsByTheme(brandId: string): Record<string, AngleAsset[]> {
    const out: Record<string, AngleAsset[]> = {};
    const add = (id: string, a: AngleAsset) => (out[id] = [...(out[id] ?? []), a]);
    for (const c of db.select({ id: schema.concepts.id, name: schema.concepts.name, theme_ids: schema.concepts.theme_ids, desire: schema.concepts.desire_evidence_theme_ids }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all()) {
        for (const id of new Set([...c.theme_ids, ...c.desire]))
            add(id, { kind: "concept", id: c.id, title: c.name });
    }
    for (const s of db.select({ id: schema.scripts.id, title: schema.scripts.title, lines: schema.scripts.lines }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all()) {
        const ids = new Set(s.lines.flatMap((l) => l.theme_ids));
        for (const id of ids)
            add(id, { kind: "script", id: s.id, title: s.title });
    }
    const byAngle = new Map(listAngles(brandId).map((a) => [a.id, a]));
    for (const t of db.select({ id: schema.themes.id, angle_id: schema.themes.angle_id }).from(schema.themes).where(and(eq(schema.themes.brand_id, brandId), inArray(schema.themes.angle_status, [...ANGLE_STATUSES]))).all()) {
        const a = t.angle_id ? byAngle.get(t.angle_id) : undefined;
        if (a)
            add(t.id, { kind: "angle", id: a.id, title: a.name });
    }
    return out;
}
export function angleLibrary(brandId: string): AngleLibrary {
    const brand = tryBrand(brandId);
    const items = getSourceItems(brandId);
    const site = items.filter((i) => i.source_type === "website").map((i) => i.raw_text).join("\n");
    return buildAngleLibrary({
        themes: getThemes(brandId),
        insights: getInsights(brandId),
        items: items.map((i) => {
            const m = i.meta as Record<string, unknown>;
            return { id: i.id, source_type: i.source_type, date: i.date, external_id: i.external_id, product: (m.product as string | null) ?? null, verified: typeof m.verified === "boolean" ? m.verified : null, incentivised: m.incentivised === true };
        }),
        personas: brand?.personas.map((p) => ({ id: p.id, name: p.name })) ?? [],
        site,
        assets: assetsByTheme(brandId),
    });
}
export function setAngleStatus(brandId: string, themeId: string, status: AngleStatus, notes?: string) {
    const row = db.select({ id: schema.themes.id }).from(schema.themes).where(and(eq(schema.themes.id, themeId), eq(schema.themes.brand_id, brandId))).get();
    if (!row)
        throw new Error("No such theme.");
    db.update(schema.themes)
        .set({ angle_status: status, ...(notes === undefined ? {} : { angle_notes: notes.slice(0, 600) }), updated_at: new Date().toISOString() })
        .where(eq(schema.themes.id, themeId))
        .run();
}
export function adoptAngle(brandId: string, themeId: string): {
    id: string;
    name: string;
} {
    const lib = angleLibrary(brandId);
    const a = lib.angles.find((x) => x.theme_id === themeId);
    if (!a)
        throw new Error("That theme has no customer quotes to build an angle on.");
    const brand = tryBrand(brandId);
    const personaIds = (brand?.personas ?? []).filter((p) => a.audience.includes(p.name)).map((p) => p.id);
    const sources = a.sources.map((s) => SOURCE_INFO[s].tab.toLowerCase()).join(", ");
    const refs = [a.best.ref, ...a.backups.map((b) => b.ref)].join(", ");
    const existing = a.angle_id ? listAngles(brandId).find((x) => x.id === a.angle_id) : undefined;
    const saved = saveAngle(brandId, {
        ...(existing ? { id: existing.id } : {}),
        name: a.label.slice(0, 60),
        line: angleLine(a).slice(0, 500),
        persona_ids: personaIds,
        stages: stagesForJob(a.job),
        basis: `Mined from ${a.frequency} of ${lib.corpus.items} sources (${sources}): ${refs}`.slice(0, 300),
        notes: [`${JOB_INFO[a.job].n} ${JOB_INFO[a.job].label}. ${a.covered === "no" ? "Nowhere on the site yet." : a.covered === "partly" ? "The site says part of it." : ""}`, ...a.backups.map((b) => `"${b.quote}" (${b.ref})`)].join("\n").slice(0, 600),
    });
    db.update(schema.themes).set({ angle_id: saved.id, angle_status: a.status === "dead" ? "dead" : "running", updated_at: new Date().toISOString() }).where(eq(schema.themes.id, themeId)).run();
    return { id: saved.id, name: saved.name };
}
export function angleReport(brandId: string): {
    title: string;
    summary: string;
    sections: {
        heading: string;
        lines: string[];
    }[];
    links: {
        label: string;
        href: string;
    }[];
    asks: string[];
} {
    const lib = angleLibrary(brandId);
    const line = (a: MinedAngle) => `${a.rank}. ${a.label} (${JOB_INFO[a.job].label.toLowerCase()}, ${a.frequency} source${a.frequency === 1 ? "" : "s"}, ${Math.round(a.share * 100)}%${a.thin ? ", thin" : ""}): "${a.best.quote}" (${a.best.ref})${a.status !== "unrun" ? ` [${a.status}]` : ""}`;
    const unrun = lib.angles.filter((a) => a.status === "unrun");
    return {
        title: "The angle library",
        summary: `${lib.corpus.items} customer source${lib.corpus.items === 1 ? "" : "s"} read, ${lib.angles.length} angle${lib.angles.length === 1 ? "" : "s"}, ${unrun.length} not built yet.${lib.enough ? "" : ` Under ${150} sources the counts are not patterns yet.`}${lib.site_read ? "" : " The site has not been read, so nothing can be called a blind spot yet."}`,
        sections: [
            ...(lib.blind_spots.length ? [{ heading: "Blind spots: said often, nowhere on the site", lines: lib.blind_spots.slice(0, 5).map(line) }] : []),
            { heading: "Top angles, by how many sources say it", lines: lib.angles.slice(0, 10).map(line) },
            ...(lib.objections.length ? [{ heading: "The doubts and gripes", lines: lib.objections.slice(0, 6).map(line) }] : []),
        ],
        links: [{ label: "Open the Angles tab on Insights", href: "/insights?view=angles" }],
        asks: [],
    };
}
