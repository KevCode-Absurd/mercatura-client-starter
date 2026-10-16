"use server";
import { activeBrand } from "@/lib/brand-context";
import { brandFit } from "@/lib/references/for-brand-load";
import { MAX_LIMIT, PAGE, type ReferenceFilter, type ReferencePage } from "@/lib/references/page";
import { referencePage } from "@/lib/references/page-read";
export async function referencePageAction(filter: Partial<ReferenceFilter>, offset: number, limit = PAGE): Promise<ReferencePage> {
    const brand = await activeBrand();
    return referencePage(filter, Number(offset) || 0, brandFit(brand.id, brand.name), Math.min(Number(limit) || PAGE, MAX_LIMIT));
}
