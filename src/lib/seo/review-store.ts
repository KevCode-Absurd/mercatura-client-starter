import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ResearchCapture } from "./research";
import type { RenderedReview } from "./rendered";
function read<T>(brandId: string, suffix: string): T[] { return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, `seo:v1:${suffix}`))).get()?.value as T[] ?? []; }
function write(brandId: string, suffix: string, value: unknown) { const key = `seo:v1:${suffix}`, updated_at = new Date().toISOString(); db.insert(schema.settings).values({ brand_id: brandId, key, value, updated_at }).onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run(); }
export const listResearch = (brandId: string) => read<ResearchCapture>(brandId, "research-captures");
export function saveResearch(value: ResearchCapture) { write(value.brandId, "research-captures", [value, ...listResearch(value.brandId).filter((s) => s.id !== value.id)].slice(0, 40)); }
export const listRendered = (brandId: string) => read<RenderedReview>(brandId, "rendered-reviews");
export function saveRendered(value: RenderedReview) { write(value.brandId, "rendered-reviews", [value, ...listRendered(value.brandId).filter((s) => s.url !== value.url || s.contextHash !== value.contextHash)].slice(0, 12)); }
