import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BrandRow } from "@/db/schema";
import { BrandBrainError, brandBrainPath, readBrandBrainFile, type BrandBrain } from "./brand-brain";
import { catalogAsProducts } from "./brain/products";
import { env } from "./env";
import { SETTING_DEFAULTS } from "./settings-defaults";
export const slugify = (s: string) => s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export function listBrands(): BrandRow[] {
    return db.select().from(schema.brands).where(eq(schema.brands.status, "active")).orderBy(schema.brands.name).all();
}
export function getBrandRow(id: string): BrandRow | undefined {
    return db.select().from(schema.brands).where(eq(schema.brands.id, id)).get();
}
export function loadBrandBrain(brandId: string): BrandBrain {
    const row = getBrandRow(brandId);
    if (!row)
        throw new BrandBrainError(`Unknown brand "${brandId}".`);
    const brain = readBrandBrainFile(brandBrainPath(row.dir));
    const more = catalogAsProducts(brandId, brain.products);
    return more.length ? { ...brain, products: [...brain.products, ...more] } : brain;
}
export function registerBrand(input: {
    id: string;
    name: string;
    dir: string;
    is_demo?: boolean;
}): BrandRow {
    const existing = getBrandRow(input.id);
    if (!existing) {
        db.insert(schema.brands)
            .values({ id: input.id, brand_id: input.id, name: input.name, dir: input.dir, is_demo: input.is_demo ?? false })
            .run();
        for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
            db.insert(schema.settings).values({ brand_id: input.id, key, value }).onConflictDoNothing().run();
        }
    }
    else if (existing.status !== "active" || existing.name !== input.name) {
        db.update(schema.brands).set({ status: "active", name: input.name }).where(eq(schema.brands.id, input.id)).run();
    }
    return getBrandRow(input.id)!;
}
export function syncBrandsFromDisk(): BrandRow[] {
    if (!fs.existsSync(env.BRANDS_DIR))
        return listBrands();
    for (const dir of fs.readdirSync(env.BRANDS_DIR, { withFileTypes: true })) {
        if (!dir.isDirectory() || dir.name.startsWith("."))
            continue;
        if (!fs.existsSync(path.join(env.BRANDS_DIR, dir.name, "brand-brain")))
            continue;
        let name = dir.name;
        try {
            name = readBrandBrainFile(brandBrainPath(dir.name)).brand.name;
        }
        catch (e) {
            if (!(e instanceof BrandBrainError))
                throw e;
        }
        const id = slugify(dir.name);
        if (!getBrandRow(id))
            registerBrand({ id, name, dir: dir.name, is_demo: false });
    }
    return listBrands();
}
export function createBrandFolder(name: string): {
    id: string;
    dir: string;
} {
    if (!name.trim())
        throw new Error("Give the brand a name.");
    const id = slugify(name) || `brand-${[...name.trim()].map((c) => c.codePointAt(0)!.toString(36)).join("").slice(0, 12)}`;
    const dir = path.join(env.BRANDS_DIR, id);
    fs.mkdirSync(path.join(dir, "brand-brain"), { recursive: true });
    fs.mkdirSync(path.join(dir, "sample-data"), { recursive: true });
    return { id, dir: id };
}
export function brandFolderStatus(row: BrandRow) {
    const brainDir = path.join(env.BRANDS_DIR, row.dir, "brand-brain");
    const files = fs.existsSync(brainDir) ? fs.readdirSync(brainDir).filter((f) => f.endsWith(".md")) : [];
    let brandJson: "ok" | "missing" | "invalid" = "missing";
    let error: string | null = null;
    try {
        readBrandBrainFile(brandBrainPath(row.dir));
        brandJson = "ok";
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        brandJson = fs.existsSync(brandBrainPath(row.dir)) ? "invalid" : "missing";
        error = e.message;
    }
    return { brainDir, markdownFiles: files, brandJson, error };
}
export function listArchivedBrands(): BrandRow[] {
    return db.select().from(schema.brands).where(eq(schema.brands.status, "archived")).orderBy(schema.brands.name).all();
}
export function archiveBrand(id: string): BrandRow {
    const row = getBrandRow(id);
    if (!row || row.status !== "active")
        throw new Error("Brand not found.");
    if (listBrands().length < 2)
        throw new Error("This is the only brand. Add another before removing it.");
    const busy = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, id), inArray(schema.jobs.status, ["queued", "running"]))).all().length;
    if (busy)
        throw new Error(`${busy} job${busy === 1 ? " is" : "s are"} running for this brand. Stop ${busy === 1 ? "it" : "them"} first.`);
    db.update(schema.brands).set({ status: "archived" }).where(eq(schema.brands.id, id)).run();
    return getBrandRow(id)!;
}
export function restoreBrand(id: string): BrandRow {
    const row = getBrandRow(id);
    if (!row)
        throw new Error("Brand not found.");
    db.update(schema.brands).set({ status: "active" }).where(eq(schema.brands.id, id)).run();
    return getBrandRow(id)!;
}
