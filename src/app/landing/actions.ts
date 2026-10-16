"use server";
import { noteFields } from "@/lib/hand-edits";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LandingPageRow, SiteScanRow } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { getAd, snapshotOf } from "@/lib/landing/ads";
import { landingContext } from "@/lib/landing/context";
import { capturePage, normaliseUrl, type Capture } from "@/lib/landing/capture";
import { writePage } from "@/lib/landing/write";
import { recordFeedback } from "@/lib/feedback";
import { KIND_LABEL, FORMULAS } from "@/lib/landing/types";
import { parseTaste, tasteSchema } from "@/lib/taste/schema";
import { auditCapture, auditPage, type AuditResult } from "@/lib/landing/audit";
import { tryBrand } from "@/lib/queries";
import { searchCards, type Card, type LibraryDomain } from "@/lib/landing/library";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { createPage, createScan, deletePage, deleteScan, finishScan, getPage, getScan, listPages, savePage, variantOf } from "@/lib/landing/store";
import { PAGE_KINDS, type Section } from "@/lib/landing/types";
import { QualityBriefSchema } from "@/lib/landing/quality-types";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the form.") : (e as Error).message });
const New = z.object({
    omitOffer: z.boolean().optional(),
    taskBrief: QualityBriefSchema.pick({ task: true, structure: true, buyerQuestion: true, trafficContext: true }).optional(),
    from: z.enum(["ad", "persona", "scratch", "url"]),
    adId: z.string().optional(),
    personaId: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
    offerId: z.string().nullable().optional(),
    kind: z.enum(PAGE_KINDS).optional(),
    angle: z.string().max(400).optional(),
    ctaUrl: z.string().max(500).optional(),
    captureId: z.string().optional(),
    title: z.string().max(140).optional(),
    formula: z.enum(FORMULAS).nullable().optional(),
});
export async function createPageAction(input: z.input<typeof New>): Promise<Result<{
    id: string;
}>> {
    try {
        const b = New.parse(input);
        const brandId = await activeBrandId();
        const ctx = landingContext(brandId);
        let page: LandingPageRow;
        if (b.from === "ad") {
            const ad = b.adId ? getAd(brandId, b.adId) : undefined;
            if (!ad)
                return { ok: false, error: "That ad is not in the list any more." };
            page = createPage(brandId, { omitOffer: b.omitOffer, taskBrief: b.taskBrief, ad: snapshotOf(ad), kind: b.kind, productId: b.productId, personaId: b.personaId, offerId: b.offerId, ctaUrl: b.ctaUrl, title: b.title, formula: b.formula, source: { kind: "ad", ref: ad.id, label: `For the ad "${ad.headline}"` } }, ctx);
        }
        else if (b.from === "persona") {
            if (!b.personaId)
                return { ok: false, error: "Pick a persona." };
            page = createPage(brandId, { omitOffer: b.omitOffer, taskBrief: b.taskBrief, personaId: b.personaId, kind: b.kind, productId: b.productId, offerId: b.offerId, angle: b.angle, ctaUrl: b.ctaUrl, title: b.title, formula: b.formula, source: { kind: "persona", ref: b.personaId, label: "For a persona" } }, ctx);
        }
        else if (b.from === "url") {
            const scan = b.captureId ? getScan(b.captureId) : undefined;
            if (!scan || scan.brand_id !== brandId || scan.kind !== "capture" || scan.status !== "done")
                return { ok: false, error: "Read the page first." };
            page = createPage(brandId, { omitOffer: b.omitOffer, taskBrief: b.taskBrief, kind: b.kind ?? "pdp", personaId: b.personaId, productId: b.productId, offerId: b.offerId, angle: b.angle, ctaUrl: b.ctaUrl || scan.url, title: b.title, captureId: scan.id, source: { kind: "url", ref: scan.url, label: `A better version of ${scan.url}` } }, ctx);
        }
        else {
            page = createPage(brandId, { omitOffer: b.omitOffer, taskBrief: b.taskBrief, kind: b.kind, productId: b.productId, personaId: b.personaId, offerId: b.offerId, angle: b.angle, ctaUrl: b.ctaUrl, title: b.title, formula: b.formula, source: { kind: "scratch", ref: null, label: "From scratch" } }, ctx);
        }
        revalidatePath("/landing");
        return { ok: true, id: page.id };
    }
    catch (e) {
        return fail(e);
    }
}
const Brief = z.object({
    omitOffer: z.boolean().optional(),
    taskBrief: QualityBriefSchema.pick({ task: true, structure: true, buyerQuestion: true, trafficContext: true }).optional(),
    promise: z.string().max(300),
    angle: z.string().max(600),
    awareness: z.string().max(40),
    audience: z.object({ label: z.string(), age: z.string(), gender: z.string() }).nullable(),
    rating: z.object({ value: z.number().min(1).max(5), count: z.string().max(20) }).nullable(),
    cta_url: z.string().max(500),
    notes: z.string().max(1000),
    formula: z.enum(FORMULAS).nullable().optional(),
    headlines: z.array(z.object({ formula: z.enum(FORMULAS), text: z.string().max(300) })).max(4).optional(),
    taste: tasteSchema.optional(),
});
const Save = z.object({
    title: z.string().max(140).optional(),
    status: z.enum(["draft", "review", "approved", "published"]).optional(),
    kind: z.enum(PAGE_KINDS).optional(),
    brief: Brief.optional(),
    sections: z.array(z.record(z.string(), z.unknown())).max(40).optional(),
});
export async function savePageAction(id: string, patch: z.input<typeof Save>): Promise<Result<{
    page: LandingPageRow;
}>> {
    try {
        const p = Save.parse(patch);
        const brandId = await activeBrandId();
        const was = getPage(id);
        if (!was || was.brand_id !== brandId)
            return { ok: false, error: "Page not found." };
        const page = savePage(id, { ...p, sections: p.sections as Section[] | undefined, log: p.status && p.status !== was.status ? `Marked ${p.status}.` : p.sections ? "Edited." : undefined });
        noteFields(brandId, id, "landing", { sections: was.sections, promise: was.brief?.promise }, { sections: page.sections, promise: page.brief?.promise });
        revalidatePath(`/landing/pages/${id}`);
        return { ok: true, page };
    }
    catch (e) {
        return fail(e);
    }
}
const Variant = z.object({ note: z.string().min(2, "Say what the variant changes.").max(200), personaId: z.string().nullable().optional(), offerId: z.string().nullable().optional(), kind: z.enum(PAGE_KINDS).optional(), angle: z.string().max(400).optional() });
export async function variantAction(id: string, change: z.input<typeof Variant>): Promise<Result<{
    id: string;
}>> {
    try {
        const c = Variant.parse(change);
        const brandId = await activeBrandId();
        const was = getPage(id);
        if (!was || was.brand_id !== brandId)
            return { ok: false, error: "Page not found." };
        const v = variantOf(id, { note: c.note, personaId: c.personaId, offerId: c.offerId, kind: c.kind, angle: c.angle });
        revalidatePath("/landing/pages");
        return { ok: true, id: v.id };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deletePageAction(id: string): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        const was = getPage(id);
        if (!was || was.brand_id !== brandId)
            return { ok: false, error: "Page not found." };
        deletePage(id);
        revalidatePath("/landing/pages");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function captureAction(url: string): Promise<Result<{
    id: string;
    capture: Capture;
}>> {
    let scanId: string | null = null;
    try {
        const brandId = await activeBrandId();
        const target = normaliseUrl(url);
        const scan = createScan(brandId, "capture", target);
        scanId = scan.id;
        finishScan(scan.id, { status: "running" });
        const capture = await capturePage(target, scan.id);
        finishScan(scan.id, { status: "done", result: capture as unknown as Record<string, unknown> });
        return { ok: true, id: scan.id, capture };
    }
    catch (e) {
        if (scanId)
            finishScan(scanId, { status: "failed", error: (e as Error).message.split("\n")[0] });
        return fail(new Error(readable((e as Error).message)));
    }
}
function readable(m: string): string {
    const first = m.split("\n")[0];
    if (/ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY|ERR_NAME_NOT_RESOLVED|ENOTFOUND|ERR_CONNECTION/i.test(first))
        return `The page could not be reached from this machine (${first.replace(/^.*?(net::\S+).*$/, "$1")}). Check the address, or that this machine's network allows the site.`;
    if (/Timeout/i.test(first))
        return "The page took more than 45 seconds to load.";
    return first;
}
const PageNote = z.object({ text: z.string().trim().min(4, "Say what should change, in a few words.").max(4000), via: z.enum(["typed", "voice"]).default("typed") });
export async function pageFeedbackAction(id: string, input: z.input<typeof PageNote>): Promise<Result<{
    learned: number;
    proposed: number;
    status: string;
}>> {
    try {
        const o = PageNote.parse(input);
        const brandId = await activeBrandId();
        const page = getPage(id);
        if (!page || page.brand_id !== brandId)
            return { ok: false, error: "Page not found." };
        const res = await recordFeedback({ brandId, refType: "landing", refId: id, productId: page.product_id, text: o.text, via: o.via, about: `A landing page: "${page.title}", a ${KIND_LABEL[page.kind as keyof typeof KIND_LABEL]?.label ?? page.kind} for ${page.persona_id ? "1 persona" : "the brand"}. The sections, in order: ${page.sections.filter((x) => x.on).map((x) => x.type).join(", ")}.` });
        revalidatePath(`/landing/pages/${id}`);
        revalidatePath("/skills");
        return { ok: true, learned: res.lessons.length, proposed: res.proposals?.length ?? 0, status: res.feedback.error ?? res.feedback.status };
    }
    catch (e) {
        return fail(e);
    }
}
export async function rewritePageAction(id: string, taste?: unknown): Promise<Result<{
    page: LandingPageRow;
}>> {
    try {
        const brandId = await activeBrandId();
        const was = getPage(id);
        if (!was || was.brand_id !== brandId)
            return { ok: false, error: "Page not found." };
        const page = await writePage(id, taste === undefined ? {} : { taste: parseTaste(taste) });
        revalidatePath(`/landing/pages/${id}`);
        return { ok: true, page };
    }
    catch (e) {
        return fail(e);
    }
}
export async function approveForLandingAction(adId: string): Promise<Result<{
    id: string;
    existing: boolean;
    writing: boolean;
}>> {
    try {
        const brandId = await activeBrandId();
        const had = listPages(brandId).find((p) => p.ad?.id === adId && !p.parent_id);
        if (had)
            return { ok: true, id: had.id, existing: true, writing: false };
        const ad = getAd(brandId, adId);
        if (!ad)
            return { ok: false, error: "That ad is not in the list of ads. Give it a plan or a hook first." };
        const page = createPage(brandId, { ad: snapshotOf(ad), source: { kind: "ad", ref: ad.id, label: `Approved in Creative Studio: "${ad.headline}"` } });
        const writing = llmEnabled();
        if (writing)
            enqueue(brandId, "landing", page.id, { op: "write" });
        revalidatePath("/landing");
        return { ok: true, id: page.id, existing: false, writing };
    }
    catch (e) {
        return fail(e);
    }
}
export async function auditAction(input: {
    pageId?: string;
    captureId?: string;
    url?: string;
}): Promise<Result<{
    id: string;
    audit: AuditResult;
}>> {
    try {
        const brandId = await activeBrandId();
        let audit: AuditResult;
        if (input.pageId) {
            const page = getPage(input.pageId);
            if (!page || page.brand_id !== brandId)
                return { ok: false, error: "Page not found." };
            audit = auditPage(page);
        }
        else {
            let captureId = input.captureId;
            if (!captureId && input.url) {
                const read = await captureAction(input.url);
                if (!read.ok)
                    return read;
                captureId = read.id;
            }
            const scan = captureId ? getScan(captureId) : undefined;
            if (!scan || scan.brand_id !== brandId || scan.status !== "done" || !scan.result)
                return { ok: false, error: "Read the page first." };
            audit = auditCapture(scan.id, scan.result as unknown as Capture, tryBrand(brandId));
        }
        const row = createScan(brandId, "audit", audit.url, audit.page_id);
        finishScan(row.id, { status: "done", result: audit as unknown as Record<string, unknown> });
        revalidatePath("/landing/cro");
        return { ok: true, id: row.id, audit };
    }
    catch (e) {
        return fail(e);
    }
}
async function selfUrl(pageId: string): Promise<string> {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
    return `${proto}://${host}/api/landing/${pageId}/html?bare=1`;
}
const Speed = z.object({ url: z.string().max(500).optional(), pageId: z.string().optional(), runs: z.number().int().min(1).max(3).default(3) });
export async function speedAction(input: z.input<typeof Speed>): Promise<Result<{
    id: string;
}>> {
    try {
        const b = Speed.parse(input);
        const brandId = await activeBrandId();
        let url: string;
        let pageId: string | null = null;
        if (b.pageId) {
            const page = getPage(b.pageId);
            if (!page || page.brand_id !== brandId)
                return { ok: false, error: "Page not found." };
            url = await selfUrl(page.id);
            pageId = page.id;
        }
        else
            url = normaliseUrl(b.url ?? "");
        const scan = createScan(brandId, "speed", url, pageId);
        finishScan(scan.id, { status: "queued", result: { runs: b.runs } });
        enqueue(brandId, "site_scan", scan.id, { kind: "speed" });
        revalidatePath("/landing/speed");
        return { ok: true, id: scan.id };
    }
    catch (e) {
        return fail(e);
    }
}
const Security = z.object({ url: z.string().min(3, "Paste the site's address.").max(500), owner: z.literal(true, { message: "Confirm the brand owns the site or may scan it." }) });
export async function securityAction(input: z.input<typeof Security>): Promise<Result<{
    id: string;
}>> {
    try {
        const b = Security.parse(input);
        const brandId = await activeBrandId();
        const scan = createScan(brandId, "security", normaliseUrl(b.url));
        enqueue(brandId, "site_scan", scan.id, { kind: "security" });
        revalidatePath("/landing/security");
        return { ok: true, id: scan.id };
    }
    catch (e) {
        return fail(e);
    }
}
export async function scanStatusAction(id: string): Promise<Result<{
    scan: SiteScanRow;
}>> {
    try {
        const brandId = await activeBrandId();
        let scan = getScan(id);
        if (!scan || scan.brand_id !== brandId)
            return { ok: false, error: "Not found." };
        if (scan.status === "queued" || scan.status === "running") {
            const job = db.select({ status: schema.jobs.status, error: schema.jobs.error }).from(schema.jobs).where(and(eq(schema.jobs.kind, "site_scan"), eq(schema.jobs.ref_id, id))).orderBy(desc(schema.jobs.created_at)).get();
            if (job && (job.status === "failed" || job.status === "stopped")) {
                finishScan(id, { status: "failed", error: job.error ?? "The test was stopped." });
                scan = getScan(id)!;
            }
        }
        return { ok: true, scan };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteScanAction(id: string): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        const scan = getScan(id);
        if (!scan || scan.brand_id !== brandId)
            return { ok: false, error: "Not found." };
        deleteScan(id);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function searchCardsAction(query: string, domains: LibraryDomain[]): Promise<Result<{
    cards: Card[];
}>> {
    try {
        const q = query.trim().slice(0, 200);
        if (q.length < 2)
            return { ok: true, cards: [] };
        return { ok: true, cards: searchCards(q, domains.length ? domains : ["landing-pages", "cro", "speed", "security"], 12) };
    }
    catch (e) {
        return fail(e);
    }
}
