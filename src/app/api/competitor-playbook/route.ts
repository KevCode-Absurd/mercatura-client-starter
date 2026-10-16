import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { buildPlaybook, downloadAdImages, readAd, copyReading } from "@/lib/competitor-playbook/engine";
import { fetchAdPage, normalizeForeplay, normalizeMeta, resolveProvider, ScanSchema, searchIdentity } from "@/lib/competitor-playbook/providers";
import { cleanupAdImport, normalizeApify, pollAdImport, startAdImport } from "@/lib/competitor-playbook/apify";
import { attachImage, closeSession, newSession, readSession, requireSession, saveSession, sessionView } from "@/lib/competitor-playbook/store";
import { scanProducts } from "@/lib/competitor-playbook/website";
import type { PlaybookSession } from "@/lib/competitor-playbook/types";
export const runtime = "nodejs";
export const maxDuration = 300;
const OWNER_COOKIE = "ce_competitor_browser";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const locks = new Map<string, Promise<unknown>>();
async function locked<T>(id: string, work: () => Promise<T>): Promise<T> {
    const previous = locks.get(id) ?? Promise.resolve();
    const current = previous.catch(() => { }).then(work);
    locks.set(id, current);
    try {
        return await current;
    }
    finally {
        if (locks.get(id) === current)
            locks.delete(id);
    }
}
function append(session: PlaybookSession, ads: PlaybookSession["ads"]) {
    const known = new Set(session.ads.map((ad) => ad.id));
    for (const ad of ads)
        if (!known.has(ad.id) && session.ads.length < 1000) {
            known.add(ad.id);
            ad.reading = copyReading(ad);
            session.ads.push(ad);
        }
    if (session.ads.length >= 1000) {
        session.cursor = null;
        session.notices.push("Import stopped at the 1,000-ad session limit. Narrow the query or start another session; this is a partial inventory.");
    }
}
export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
        return json({ ok: false, error: "Use the playbook from the same app." }, 403);
    try {
        const brandId = await activeBrandId();
        const jar = await cookies();
        let owner = jar.get(OWNER_COOKIE)?.value;
        if (!owner) {
            owner = randomUUID();
            jar.set(OWNER_COOKIE, owner, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/" });
        }
        if (request.headers.get("content-type")?.includes("multipart/form-data")) {
            if (Number(request.headers.get("content-length") ?? 0) > 9 * 1024 * 1024)
                throw new Error("Use a static image under 8 MB.");
            const form = await request.formData();
            const file = form.get("file");
            if (!(file instanceof File) || file.size > 8 * 1024 * 1024)
                throw new Error("Use a static image under 8 MB.");
            const id = String(form.get("sessionId") ?? "");
            return await locked(id, async () => {
                const session = requireSession(id, owner!, brandId);
                await attachImage(session, String(form.get("adId") ?? ""), Buffer.from(await file.arrayBuffer()));
                return json({ ok: true, session: sessionView(session) });
            });
        }
        const raw = await request.text();
        if (raw.length > 4 * 1024 * 1024)
            throw new Error("This import is too large. Use smaller pages.");
        const body = JSON.parse(raw);
        if (body.op === "scan" || body.op === "import") {
            const input = ScanSchema.parse(body.input);
            if (body.op === "scan")
                input.provider = resolveProvider(input.provider);
            const session = newSession(input, brandId, owner);
            let importError: string | null = null;
            if (body.op === "import") {
                append(session, input.provider === "meta" ? normalizeMeta(body.data) : input.provider === "apify" ? normalizeApify(body.data) : normalizeForeplay(body.data));
                session.notices.push("Imported provider records. Confirm the advertiser. Source inventory completeness is unknown.");
            }
            else {
                try {
                    if (input.provider === "apify") {
                        session.import = await startAdImport(input);
                        session.notices.push(`Automatic static-ad search started. Up to ${session.import.limit} source ads are checked; video and mixed-video creatives are excluded. Image-only carousels use their first image.`);
                    }
                    else {
                        const page = await fetchAdPage(input);
                        session.cursor = page.cursor;
                        session.notices.push(...page.notices);
                        append(session, page.ads);
                    }
                }
                catch (e) {
                    importError = e instanceof Error ? e.message : "Ad import failed.";
                    session.notices.push(importError);
                }
            }
            const oneAdvertiser = new Set(session.ads.map((ad) => ad.advertiserId)).size === 1;
            const website = searchIdentity(input).website || (oneAdvertiser ? session.ads.find((ad) => ad.landingUrl)?.landingUrl : null);
            if (website) {
                try {
                    const result = await scanProducts(website);
                    session.products = result.products;
                    session.notices.push(result.notice);
                }
                catch {
                    session.notices.push("The competitor website could not be read. Ad selection still works; try a public product-page URL.");
                }
            }
            else
                session.notices.push("Add the competitor's website to include product context. No website was guessed from the brand name.");
            saveSession(session);
            await downloadAdImages(session, session.ads);
            saveSession(session);
            return json({ ok: true, session: sessionView(session), importError });
        }
        const id = z.string().parse(body.sessionId);
        return await locked(id, async () => {
            if (body.op === "close" && !readSession(id))
                return json({ ok: true });
            const session = requireSession(id, owner!, brandId);
            if (body.op === "restore")
                return json({ ok: true, session: sessionView(session) });
            if (body.op === "close") {
                await closeSession(session);
                return json({ ok: true });
            }
            if (body.op === "poll") {
                if (session.import?.status === "running") {
                    const page = await pollAdImport(session.import);
                    append(session, page.ads);
                    await downloadAdImages(session, session.ads.filter(a => page.ads.some(b => b.id === a.id)));
                    session.import.scanned = page.scanned ?? session.import.scanned;
                    if (page.done) {
                        session.import.status = page.failed ? "failed" : "done";
                        session.notices.push(page.failed ? "The provider stopped before completing this search. Retrieved static ads remain available; the inventory is partial." : `Search finished: ${session.import.scanned} source ads checked. This is a bounded sample, not a guarantee of every ad the advertiser runs.`);
                    }
                    saveSession(session);
                }
                if (session.import?.status !== "running" && session.import?.runId) {
                    try {
                        await cleanupAdImport(session.import);
                        saveSession(session);
                    }
                    catch { }
                }
                return json({ ok: true, session: sessionView(session) });
            }
            if (body.op === "images") {
                if (session.runIds.length)
                    throw new Error("These references are in use. Start a new session to change them.");
                await downloadAdImages(session, session.ads.filter(a => !body.adId || a.id === body.adId));
                saveSession(session);
                return json({ ok: true, session: sessionView(session) });
            }
            if (body.op === "more") {
                if (session.runIds.length)
                    throw new Error("This session is already in use. Start a new session to import more ads.");
                if (session.cursor) {
                    const page = await fetchAdPage(session.input, session.cursor);
                    session.cursor = page.cursor;
                    append(session, page.ads);
                    saveSession(session);
                    await downloadAdImages(session, session.ads.filter((a) => page.ads.some((b) => b.id === a.id)));
                    saveSession(session);
                }
                return json({ ok: true, session: sessionView(session) });
            }
            if (body.op === "analyse") {
                const ad = session.ads.find((a) => a.id === body.adId);
                if (!ad)
                    throw new Error("This ad is not in this session.");
                await readAd(session, ad);
                saveSession(session);
                return json({ ok: true, session: sessionView(session) });
            }
            if (body.op === "build")
                return json({ ok: true, ...await buildPlaybook(session, body.build) });
            throw new Error("Unknown playbook action.");
        });
    }
    catch (error) {
        return json({ ok: false, error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Playbook request failed." }, 400);
    }
}
