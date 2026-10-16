import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../env";
import { contentFingerprint } from "../standalone/evidence";
import type { PortfolioPlan } from "./core";
export type PortfolioRecord = {
    id: string;
    brandId: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
    plan: PortfolioPlan;
    selectedSlots: string[];
    auditionSource?: {
        id: string;
        sha256: string;
        name: string;
        rel?: string;
    };
    studioRuns: {
        id: string;
        slots: string[];
        fingerprint: string;
        assetSha?: string;
    }[];
    receipts: Record<string, unknown>[];
};
const directory = (brandId: string) => path.join(env.DATA_DIR, "production-portfolios", createHash("sha256").update(brandId).digest("hex"));
function file(brandId: string, id: string) { if (!/^[a-f0-9-]{36}$/i.test(id))
    throw new Error("Invalid portfolio ID."); return path.join(directory(brandId), id + ".json"); }
export function readPortfolio(brandId: string, id: string): PortfolioRecord { const row = JSON.parse(fs.readFileSync(file(brandId, id), "utf8")) as PortfolioRecord; if (row.brandId !== brandId || row.id !== id)
    throw new Error("This portfolio belongs to another brand."); return row; }
export function listPortfolios(brandId: string): PortfolioRecord[] { const dir = directory(brandId); if (!fs.existsSync(dir))
    return []; return fs.readdirSync(dir).filter(f => f.endsWith(".json")).flatMap(f => { try {
    return [readPortfolio(brandId, f.slice(0, -5))];
}
catch {
    return [];
} }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
export function savePortfolio(row: PortfolioRecord, expectedRevision: number): PortfolioRecord { fs.mkdirSync(directory(row.brandId), { recursive: true }); const target = file(row.brandId, row.id), lock = target + ".lock"; let fd: number; try {
    fd = fs.openSync(lock, "wx");
}
catch {
    throw new Error("This portfolio is being saved; reload before retrying.");
} try {
    const prior = fs.existsSync(target) ? readPortfolio(row.brandId, row.id) : null;
    if ((prior?.revision ?? 0) !== expectedRevision)
        throw new Error("Portfolio changed in another task. Reload before saving.");
    const next = { ...row, revision: expectedRevision + 1, updatedAt: new Date().toISOString() };
    const temp = target + "." + randomUUID() + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(next));
    fs.renameSync(temp, target);
    return next;
}
finally {
    fs.closeSync(fd);
    fs.unlinkSync(lock);
} }
export function createPortfolio(brandId: string, plan: PortfolioPlan) { const now = new Date().toISOString(); return savePortfolio({ id: randomUUID(), brandId, revision: 0, createdAt: now, updatedAt: now, plan, selectedSlots: [], studioRuns: [], receipts: [] }, 0); }
export function studioAllocation(brandId: string, runId: string, itemIndex: number) { for (const row of listPortfolios(brandId)) {
    const binding = row.studioRuns.find(r => r.id === runId);
    if (binding) {
        const slot = row.plan.slots.find(s => s.id === binding.slots[itemIndex]);
        if (!slot)
            throw new Error("The Studio item has no reserved portfolio slot.");
        if (binding.fingerprint !== row.plan.fingerprint)
            throw new Error("The allocation changed after Studio was linked. Rebind it before generation.");
        return { row, slot, binding };
    }
} return null; }
export const portfolioStateHash = (row: PortfolioRecord) => contentFingerprint({ plan: row.plan.fingerprint, selected: row.selectedSlots, bindings: row.studioRuns });
