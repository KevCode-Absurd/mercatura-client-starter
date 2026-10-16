import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow, loadBrandBrain } from "../brands";
import { loadOrganic, saveCreator } from "../organic/store";
import { criteriaFromBrain, DiscoveryInput, RunSchema, type DiscoveryOptions, type DiscoveryRun } from "./types";
function folder(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row || row.status !== "active")
        throw new Error("Brand not found.");
    return path.join(brandBrainDir(row.dir), "creator-discovery");
}
function file(brandId: string, id: string): string {
    const key = RunSchema.shape.id.parse(id);
    return path.join(folder(brandId), `${key}.json`);
}
export function saveDiscovery(run: DiscoveryRun): void {
    const checked = RunSchema.parse(run);
    const target = file(checked.brand_id, checked.id);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = `${target}.${randomUUID()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ ...checked, updated_at: new Date().toISOString() }, null, 2) + "\n");
    fs.renameSync(temp, target);
}
export function getDiscovery(brandId: string, id: string): DiscoveryRun {
    const target = file(brandId, id);
    if (!fs.existsSync(target))
        throw new Error("Creator search not found for this brand.");
    const run = RunSchema.parse(JSON.parse(fs.readFileSync(target, "utf8")));
    if (run.brand_id !== brandId)
        throw new Error("Creator search not found for this brand.");
    return run;
}
export function listDiscovery(brandId: string): DiscoveryRun[] {
    const dir = folder(brandId);
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir).filter(name => /^[\da-f-]{36}\.json$/i.test(name)).map(name => getDiscovery(brandId, name.slice(0, -5)))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);
}
export function createDiscovery(brandId: string, input: DiscoveryOptions): DiscoveryRun {
    const options = DiscoveryInput.parse(input);
    const now = new Date().toISOString();
    const run: DiscoveryRun = {
        id: randomUUID(), brand_id: brandId, created_at: now, updated_at: now, status: "queued", options,
        criteria: criteriaFromBrain(loadBrandBrain(brandId), options), creators: [], batches_done: 0,
        progress: "Waiting to research creators", warnings: [], cost_usd: 0, search_suggestions: [],
    };
    saveDiscovery(run);
    return run;
}
export function shortlistCreator(brandId: string, runId: string, creatorId: string): string {
    const creator = getDiscovery(brandId, runId).creators.find(c => c.id === creatorId);
    if (!creator)
        throw new Error("Creator not found in this brand's search.");
    const all = loadOrganic(brandId).creators;
    const existing = all.find(c => c.note.includes(creator.profile_url));
    if (existing)
        return existing.id;
    const collision = all.find(c => c.handle.toLowerCase() === creator.handle.toLowerCase() && (!c.platform || c.platform === creator.platform));
    if (collision) {
        if (!collision.platform)
            throw new Error(`${creator.handle} is already tracked without a platform. Check the existing entry before adding this profile.`);
        return collision.id;
    }
    const saved = saveCreator(brandId, { handle: creator.handle, platform: creator.platform, profile_url: creator.profile_url, note: `${creator.platform} · ${creator.content}\nCollaboration: ${creator.collab_angle}`.slice(0, 400) });
    return saved.creators.find(c => c.platform === creator.platform && c.handle === creator.handle)!.id;
}
