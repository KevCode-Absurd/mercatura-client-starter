import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { BrandRow } from "@/db/schema";
import { getBrandRow, listBrands, syncBrandsFromDisk } from "./brands";
export const BRAND_COOKIE = "ce_brand";
let synced = false;
export async function optionalActiveBrand(): Promise<BrandRow | undefined> {
    if (!synced) {
        syncBrandsFromDisk();
        synced = true;
    }
    const wanted = (await cookies()).get(BRAND_COOKIE)?.value;
    const row = wanted ? getBrandRow(wanted) : undefined;
    if (row && row.status === "active")
        return row;
    const all = listBrands();
    const pick = all.find((b) => !b.is_demo) ?? all[0];
    return pick;
}
export async function activeBrand(): Promise<BrandRow> {
    const brand = await optionalActiveBrand();
    if (!brand) redirect("/onboarding");
    return brand;
}
export async function activeBrandId(): Promise<string> {
    return (await activeBrand()).id;
}
