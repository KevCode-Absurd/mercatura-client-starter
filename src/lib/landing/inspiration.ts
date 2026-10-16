import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { env } from "../env";
import { swipeLibrary } from "./references";
import { captureEvidence, discoverPages, getEvidence, type PageEvidence, type DiscoveredPage } from "./evidence";
export interface InspirationPage {
    kind: DiscoveredPage["kind"];
    url: string;
    status: "captured" | "failed";
    evidenceId?: string;
    title?: string;
    mobile?: string;
    desktop?: string;
    capturedAt?: string;
    error?: string;
    warnings?: string[];
}
export interface InspirationBrand {
    id: string;
    name: string;
    url: string;
    niche: string;
    pages: InspirationPage[];
    attemptedAt?: string;
    error?: string;
}
const root = () => path.join(env.DATA_DIR, "cro", "inspiration");
const brandId = (url: string) => createHash("sha256").update(new URL(url).hostname.replace(/^www\./, "")).digest("hex").slice(0, 20);
export function inspirationBrands(): InspirationBrand[] {
    const brands = new Map<string, InspirationBrand>();
    for (const group of swipeLibrary())
        for (const brand of group.brands) {
            try {
                const id = brandId(brand.url);
                if (!brands.has(id))
                    brands.set(id, { id, name: brand.name, url: brand.url, niche: group.niche, pages: [] });
            }
            catch { }
        }
    for (const brand of brands.values()) {
        try {
            const record = JSON.parse(fs.readFileSync(path.join(root(), `${brand.id}.json`), "utf8")) as InspirationBrand;
            Object.assign(brand, record);
        }
        catch { }
    }
    return [...brands.values()];
}
export function findInspiration(id: string): InspirationBrand | null { return inspirationBrands().find(b => b.id === id) ?? null; }
export function saveInspiration(brand: InspirationBrand) {
    if (!/^[a-f0-9]{20}$/.test(brand.id))
        throw new Error("Invalid inspiration identifier.");
    fs.mkdirSync(root(), { recursive: true });
    const file = path.join(root(), `${brand.id}.json`), temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(brand, null, 2));
    fs.renameSync(temp, file);
}
const snapshot = (e: PageEvidence, kind: DiscoveredPage["kind"]): InspirationPage => ({ kind, url: e.url, status: "captured", evidenceId: e.id, title: e.title, mobile: e.mobile.shot, desktop: e.desktop.shot, capturedAt: e.capturedAt, warnings: e.warnings });
export function organizeInspiration(brand: InspirationBrand, evidence: PageEvidence, kind: DiscoveredPage["kind"]) {
    const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "reference";
    const destination = path.join(root(), "library", slug(brand.niche), `${slug(brand.name)}-${brand.id.slice(0, 6)}`, kind);
    fs.mkdirSync(destination, { recursive: true });
    for (const device of ["desktop", "mobile"] as const) {
        const source = path.resolve(env.DATA_DIR, "assets", evidence[device].shot);
        const allowed = path.resolve(env.DATA_DIR, "assets", "cro") + path.sep;
        if (!source.startsWith(allowed))
            throw new Error("Screenshot is outside the CRO asset folder.");
        fs.copyFileSync(source, path.join(destination, `${device}.png`));
    }
    fs.writeFileSync(path.join(destination, "page.json"), JSON.stringify({ brand: brand.name, niche: brand.niche, pageKind: kind, ...evidence }, null, 2));
    fs.writeFileSync(path.join(destination, "SOURCE.txt"), `${brand.name}\n${evidence.title}\n${evidence.url}\nCaptured: ${evidence.capturedAt}\n\nReal browser captures. Reference inspiration, not conversion-performance evidence.\n${evidence.warnings.join("\n")}\n`);
}
export function auditInspirationCaptures(): {
    quarantined: number;
} {
    let quarantined = 0;
    const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "reference";
    const base = path.resolve(root());
    for (const brand of inspirationBrands()) {
        let changed = false;
        brand.pages = brand.pages.map(page => {
            if (page.status !== "captured" || page.evidenceId && getEvidence(page.evidenceId))
                return page;
            const source = path.resolve(base, "library", slug(brand.niche), `${slug(brand.name)}-${brand.id.slice(0, 6)}`, page.kind);
            const destination = path.resolve(base, "quarantine", `${brand.id}-${page.kind}-${Date.now()}`);
            if (!source.startsWith(base + path.sep) || !destination.startsWith(base + path.sep))
                throw new Error("Invalid quarantine boundary.");
            if (fs.existsSync(source)) {
                fs.mkdirSync(path.dirname(destination), { recursive: true });
                fs.renameSync(source, destination);
                fs.writeFileSync(path.join(destination, "CAPTURE-FAILED.txt"), "This is a browser error or incomplete capture, not storefront evidence. Excluded from the inspiration library.\n");
            }
            changed = true;
            quarantined++;
            return { kind: page.kind, url: /^https?:\/\//.test(page.url) ? page.url : brand.url, status: "failed" as const, error: "Browser error page or incomplete evidence detected during capture quality review. Retry required." };
        });
        if (changed)
            saveInspiration(brand);
    }
    return { quarantined };
}
export async function captureInspiration(id: string, options: {
    retry?: boolean;
    force?: boolean;
    kinds?: ("home" | "pdp" | "collection")[];
    onProgress?: (message: string) => void;
} = {}): Promise<InspirationBrand> {
    const brand = findInspiration(id);
    if (!brand)
        throw new Error("Reference brand not found.");
    brand.attemptedAt = new Date().toISOString();
    delete brand.error;
    try {
        const wanted = options.kinds ?? ["home", "pdp", "collection"];
        const discovered = wanted.some(kind => kind !== "home") ? await discoverPages(brand.url, { quick: true }) : [];
        const targets: DiscoveredPage[] = wanted.includes("home") ? [{ url: brand.url, title: brand.name, kind: "home", source: "input" }] : [];
        for (const kind of ["pdp", "collection"] as const) {
            if (!wanted.includes(kind))
                continue;
            const candidate = discovered.find(p => p.kind === kind && !/gift.card|\/all\/?$|sale/i.test(p.url)) ?? discovered.find(p => p.kind === kind);
            if (candidate)
                targets.push(candidate);
        }
        for (const target of targets) {
            const previous = brand.pages.find(p => p.kind === target.kind);
            if (!options.force && (previous?.status === "captured" || previous && !options.retry))
                continue;
            options.onProgress?.(`${brand.name}: ${target.kind}`);
            let item: InspirationPage;
            try {
                const evidence = await captureEvidence(target.url);
                organizeInspiration(brand, evidence, target.kind);
                item = snapshot(evidence, target.kind);
            }
            catch (error) {
                item = { kind: target.kind, url: target.url, status: "failed", error: (error as Error).message.slice(0, 400) };
            }
            brand.pages = [...brand.pages.filter(p => p.kind !== target.kind), item];
            saveInspiration(brand);
        }
        for (const kind of ["pdp", "collection"] as const)
            if (wanted.includes(kind) && !targets.some(t => t.kind === kind) && !brand.pages.some(p => p.kind === kind))
                brand.pages.push({ kind, url: brand.url, status: "failed", error: `No ${kind} URL was discovered in public links or sitemaps.` });
    }
    catch (error) {
        brand.error = (error as Error).message.slice(0, 400);
    }
    saveInspiration(brand);
    return brand;
}
export function diverseBrands(brands: InspirationBrand[]): InspirationBrand[] {
    const groups = new Map<string, InspirationBrand[]>();
    for (const b of brands)
        groups.set(b.niche, [...groups.get(b.niche) ?? [], b]);
    const out: InspirationBrand[] = [];
    for (let i = 0; out.length < brands.length; i++)
        for (const group of groups.values())
            if (group[i])
                out.push(group[i]);
    return out;
}
