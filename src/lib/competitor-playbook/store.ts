import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { LibraryRefRow } from "@/db/schema";
import { env } from "../env";
import type { PlaybookSession, ScanInput, SessionView } from "./types";
import { cleanupAdImport } from "./apify";
export const SESSION_MS = 2 * 60 * 60 * 1000;
const SESSION_ID = /^[0-9a-f-]{36}$/;
export const root = () => path.join(env.DATA_DIR, "competitor-sessions");
export const sessionDir = (id: string) => {
    if (!SESSION_ID.test(id))
        throw new Error("Invalid playbook session.");
    return path.join(root(), id);
};
export const ownerHash = (owner: string) => createHash("sha256").update(owner).digest("hex");
export function saveSession(session: PlaybookSession) {
    const dir = sessionDir(session.id);
    fs.mkdirSync(dir, { recursive: true });
    const temp = path.join(dir, `${randomUUID()}.tmp`);
    fs.writeFileSync(temp, JSON.stringify(session));
    fs.renameSync(temp, path.join(dir, "session.json"));
}
export function readSession(id: string): PlaybookSession | null {
    try {
        const s = JSON.parse(fs.readFileSync(path.join(sessionDir(id), "session.json"), "utf8")) as PlaybookSession;
        return s.id === id && Date.parse(s.expiresAt) > Date.now() ? s : null;
    }
    catch {
        return null;
    }
}
export function requireSession(id: string, owner: string, brandId: string): PlaybookSession {
    const s = readSession(id);
    if (!s || s.closed || s.owner !== ownerHash(owner) || s.brandId !== brandId)
        throw new Error("This playbook session has expired or belongs to another browser or brand. Scan again.");
    return s;
}
export function sweepSessions(now = Date.now()) {
    if (!fs.existsSync(root()))
        return;
    for (const id of fs.readdirSync(root())) {
        if (!SESSION_ID.test(id))
            continue;
        try {
            const s = JSON.parse(fs.readFileSync(path.join(sessionDir(id), "session.json"), "utf8")) as PlaybookSession;
            if (Date.parse(s.expiresAt) > now)
                continue;
            if (s.import?.runId) {
                void cleanupAdImport(s.import).then(() => fs.rmSync(sessionDir(id), { recursive: true, force: true })).catch(() => { });
            }
            else
                fs.rmSync(sessionDir(id), { recursive: true, force: true });
        }
        catch { }
    }
}
const globals = globalThis as unknown as {
    __competitorSweep?: ReturnType<typeof setInterval>;
};
if (!globals.__competitorSweep) {
    globals.__competitorSweep = setInterval(() => sweepSessions(), 60000);
    globals.__competitorSweep.unref();
}
export function newSession(input: ScanInput, brandId: string, owner: string): PlaybookSession {
    sweepSessions();
    return { id: randomUUID(), input, brandId, owner: ownerHash(owner), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_MS).toISOString(), cursor: null, ads: [], products: [], notices: [], runIds: [], pendingRunIds: [] };
}
export function sessionView(s: PlaybookSession): SessionView {
    const { owner: _owner, ads, import: source, ...rest } = s;
    return { ...rest, ...(source ? { import: { status: source.status, scanned: source.scanned, limit: source.limit } } : {}), ads: ads.map(({ imageUrl: _url, file, ...ad }) => ({ ...ad, hasImage: !!file })) };
}
export async function closeSession(s: PlaybookSession) {
    if (s.import?.runId) {
        s.closed = true;
        saveSession(s);
        try {
            await cleanupAdImport(s.import);
        }
        catch {
            s.expiresAt = new Date(Date.now() - 1).toISOString();
            saveSession(s);
            return;
        }
    }
    if ((s.pendingRunIds ?? s.runIds).length) {
        s.closed = true;
        saveSession(s);
    }
    else
        fs.rmSync(sessionDir(s.id), { recursive: true, force: true });
}
export async function attachImage(s: PlaybookSession, adId: string, bytes: Buffer) {
    const ad = s.ads.find((a) => a.id === adId);
    if (!ad)
        throw new Error("This ad is not in the current session.");
    if (s.runIds.length)
        throw new Error("This session's references are in use. Start a new session to change them.");
    if (bytes.length > 8 * 1024 * 1024)
        throw new Error("Use an image under 8 MB.");
    const picture = sharp(bytes, { limitInputPixels: 30000000 });
    const metadata = await picture.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1)
        throw new Error("Use a static JPG, PNG or WebP image.");
    const file = `${createHash("sha256").update(adId).digest("hex").slice(0, 24)}.webp`;
    fs.mkdirSync(sessionDir(s.id), { recursive: true });
    await picture.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(sessionDir(s.id), file));
    ad.file = file;
    if (ad.reading?.basis === "visual")
        delete ad.reading;
    saveSession(s);
}
export const temporaryRefId = (session: string, index: number) => `cp_${session}_${index}`;
export function temporaryReferences(ids: string[]): LibraryRefRow[] {
    return ids.flatMap((id) => {
        const match = /^cp_([0-9a-f-]{36})_(\d+)$/.exec(id);
        if (!match)
            return [];
        const session = readSession(match[1]);
        const ad = session?.ads[Number(match[2])];
        if (!session || !ad?.file || !/^[0-9a-f]{24}\.webp$/.test(ad.file))
            return [];
        const file = path.join(sessionDir(session.id), ad.file);
        if (!fs.existsSync(file))
            return [];
        return [{ id, library: "ad", file, thumb: null, vertical: "", type: "your-reference", group_name: null, brand: ad.advertiser, note: `Temporary competitor reference. ${ad.libraryUrl}`, usable: true, craft: 3, width: null, height: null, tags: { owner_brand_id: session.brandId }, analysis: { format: ad.reading?.format ?? "Static ad", layout: ad.reading?.layout ?? "", why_it_works: ad.reading?.adaptation ?? "Use as a creative reference; no performance evidence supplied.", watch_outs: ["Use the active brand's own products, copy, evidence, offers and identity. Never treat competitor claims as proof for this brand."] }, analyzed: ad.reading?.basis === "visual", created_at: session.createdAt }];
    });
}
export function releaseRunReferences(runId: string) {
    if (!fs.existsSync(root()))
        return;
    for (const id of fs.readdirSync(root())) {
        if (!SESSION_ID.test(id))
            continue;
        const session = readSession(id);
        if (!session?.runIds.includes(runId))
            continue;
        session.pendingRunIds = (session.pendingRunIds ?? session.runIds).filter((id) => id !== runId);
        if (session.closed && !session.pendingRunIds.length)
            fs.rmSync(sessionDir(id), { recursive: true, force: true });
        else {
            session.expiresAt = new Date(Math.max(Date.parse(session.createdAt) + SESSION_MS, Date.now() + 5 * 60000)).toISOString();
            saveSession(session);
        }
    }
}
