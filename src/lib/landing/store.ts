import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LandingPageRow, SiteScanRow } from "@/db/schema";
import { checkPage, type PageFacts } from "./checks";
import { landingContext, type LandingContext } from "./context";
import { draftPage, type DraftInput } from "./draft";
import { renderPage } from "./render";
import { themeFrom } from "./theme";
import type { AdSnapshot, Brief, PageKind, PageStatus, Section, SourceKind } from "./types";
import { factualLandingContext } from "./factual-context";
import { readEvidence } from "../standalone/store";
const now = () => new Date().toISOString();
function nextId(prefix: "lp" | "scan", table: typeof schema.landingPages | typeof schema.siteScans): string {
    const ids = db.select({ id: table.id }).from(table).all().map((r) => Number(r.id.match(/_(\d+)$/)?.[1] ?? 0));
    return `${prefix}_${String(Math.max(0, ...ids) + 1).padStart(3, "0")}`;
}
export function factsOf(ctx: LandingContext): PageFacts {
    return { brand: ctx.brand, personas: ctx.personas, knownQuotes: ctx.quotes.map((q) => q.text) };
}
export const listPages = (brandId: string): LandingPageRow[] => db.select().from(schema.landingPages).where(eq(schema.landingPages.brand_id, brandId)).orderBy(desc(schema.landingPages.created_at)).all();
export const getPage = (id: string): LandingPageRow | undefined => db.select().from(schema.landingPages).where(eq(schema.landingPages.id, id)).get();
export interface NewPage extends DraftInput {
    source: {
        kind: SourceKind;
        ref: string | null;
        label: string;
    };
    title?: string;
    parentId?: string | null;
    variantNote?: string;
    captureId?: string | null;
}
export function createPage(brandId: string, input: NewPage, ctx: LandingContext = landingContext(brandId)): LandingPageRow {
    const d = draftPage(ctx, { ...input, evidence: readEvidence(brandId) });
    const id = nextId("lp", schema.landingPages);
    const page = { kind: d.kind, brief: d.brief, ad: input.ad ?? null, sections: d.sections };
    db.insert(schema.landingPages)
        .values({
        id,
        brand_id: brandId,
        title: input.title?.trim() || d.title,
        kind: d.kind,
        status: "draft",
        source: input.source,
        product_id: d.product_id,
        persona_id: d.persona_id,
        offer_id: d.offer_id,
        ad: input.ad ?? null,
        brief: d.brief,
        sections: d.sections,
        checks: checkPage(page, factsOf(factualLandingContext(ctx, d.product_id, readEvidence(brandId), d.brief.omitOffer))),
        parent_id: input.parentId ?? null,
        variant_note: input.variantNote ?? "",
        writer: "draft",
        capture_id: input.captureId ?? null,
        log: [{ at: now(), message: `Drafted ${input.source.kind === "ad" ? `for the ad "${input.ad?.headline ?? ""}"` : input.source.label.toLowerCase()} from the brand's own facts, free.` }],
    })
        .run();
    return getPage(id)!;
}
export interface PagePatch {
    title?: string;
    kind?: PageKind;
    status?: PageStatus;
    brief?: Brief;
    sections?: Section[];
    ad?: AdSnapshot | null;
    writer?: string;
    log?: string;
}
export function savePage(id: string, patch: PagePatch, ctx?: LandingContext): LandingPageRow {
    const was = getPage(id);
    if (!was)
        throw new Error("Page not found");
    const source = ctx ?? landingContext(was.brand_id);
    const c = factualLandingContext(source, was.product_id, readEvidence(was.brand_id), (patch.brief ?? was.brief).omitOffer);
    const next = { kind: patch.kind ?? was.kind, brief: patch.brief ?? was.brief, ad: patch.ad === undefined ? was.ad : patch.ad, sections: patch.sections ?? was.sections };
    const words = patch.sections || patch.brief || patch.kind;
    db.update(schema.landingPages)
        .set({
        ...(patch.title !== undefined ? { title: patch.title.trim() || was.title } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.writer ? { writer: patch.writer } : {}),
        kind: next.kind,
        brief: next.brief,
        ad: next.ad,
        sections: next.sections,
        checks: checkPage(next, factsOf(c)),
        version: words ? was.version + 1 : was.version,
        log: patch.log ? [...was.log, { at: now(), message: patch.log }].slice(-40) : was.log,
        error: null,
        updated_at: now(),
    })
        .where(eq(schema.landingPages.id, id))
        .run();
    return getPage(id)!;
}
export function variantOf(id: string, change: Omit<DraftInput, "ad"> & {
    note: string;
}): LandingPageRow {
    const was = getPage(id);
    if (!was)
        throw new Error("Page not found");
    const ctx = landingContext(was.brand_id);
    const n = listPages(was.brand_id).filter((p) => p.parent_id === id).length + 1;
    return createPage(was.brand_id, {
        kind: change.kind ?? was.kind,
        productId: change.productId ?? was.product_id,
        personaId: change.personaId === undefined ? was.persona_id : change.personaId,
        offerId: change.offerId === undefined ? was.offer_id : change.offerId,
        ad: was.ad,
        angle: change.angle ?? was.brief.angle,
        ctaUrl: was.brief.cta_url,
        notes: was.brief.notes,
        omitOffer: change.omitOffer ?? was.brief.omitOffer,
        taskBrief: change.taskBrief ?? was.brief.taskBrief,
        source: { kind: "variant", ref: id, label: `Variant of ${id}` },
        title: `${was.title} (variant ${String.fromCharCode(64 + n + 1)})`,
        parentId: id,
        variantNote: change.note,
    }, ctx);
}
export function deletePage(id: string) {
    db.delete(schema.landingPages).where(eq(schema.landingPages.id, id)).run();
}
export function pageHtml(page: LandingPageRow, opts: {
    preview?: boolean;
    image?: (src: string) => string;
} = {}, ctx?: LandingContext): string {
    const c = ctx ?? landingContext(page.brand_id);
    return renderPage({ title: page.title, kind: page.kind, sections: page.sections, brandName: c.brand.brand.name, currency: c.brand.brand.currency, ctaUrl: page.brief.cta_url, theme: themeFrom(c.look), preview: opts.preview, image: opts.image });
}
export const listScans = (brandId: string, kind?: SiteScanRow["kind"]): SiteScanRow[] => db
    .select()
    .from(schema.siteScans)
    .where(kind ? and(eq(schema.siteScans.brand_id, brandId), eq(schema.siteScans.kind, kind)) : eq(schema.siteScans.brand_id, brandId))
    .orderBy(desc(schema.siteScans.created_at))
    .all();
export const getScan = (id: string): SiteScanRow | undefined => db.select().from(schema.siteScans).where(eq(schema.siteScans.id, id)).get();
export function createScan(brandId: string, kind: SiteScanRow["kind"], url: string, pageId: string | null = null): SiteScanRow {
    const id = nextId("scan", schema.siteScans);
    db.insert(schema.siteScans).values({ id, brand_id: brandId, kind, url, page_id: pageId, status: "queued" }).run();
    return getScan(id)!;
}
export function finishScan(id: string, out: {
    status: "queued" | "running" | "done" | "failed";
    result?: Record<string, unknown> | null;
    error?: string | null;
}) {
    db.update(schema.siteScans)
        .set({ status: out.status, ...(out.result !== undefined ? { result: out.result } : {}), error: out.error ?? null, updated_at: now() })
        .where(eq(schema.siteScans.id, id))
        .run();
}
export function deleteScan(id: string) {
    db.delete(schema.siteScans).where(eq(schema.siteScans.id, id)).run();
}
