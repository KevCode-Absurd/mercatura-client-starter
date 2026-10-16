"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { BRAND_COOKIE } from "@/lib/brand-context";
import { archiveBrand, createBrandFolder, getBrandRow, listBrands, registerBrand, restoreBrand, syncBrandsFromDisk } from "@/lib/brands";
import { errorText } from "@/lib/plain-message";
export async function setActiveBrandAction(id: string) {
    if (!getBrandRow(id))
        return;
    (await cookies()).set(BRAND_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
}
export async function addBrandAction(name: string): Promise<{
    ok: true;
    id: string;
} | {
    ok: false;
    error: string;
}> {
    const clean = name.trim();
    if (clean.length < 2)
        return { ok: false, error: "Give the brand a name." };
    try {
        const { id, dir } = createBrandFolder(clean);
        if (getBrandRow(id)?.status === "active")
            return { ok: false, error: `A brand with the folder "${id}" already exists.` };
        registerBrand({ id, name: clean, dir });
        (await cookies()).set(BRAND_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        revalidatePath("/", "layout");
        return { ok: true, id };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function rescanBrandsAction() {
    syncBrandsFromDisk();
    revalidatePath("/", "layout");
}
export async function archiveBrandAction(id: string): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    try {
        archiveBrand(id);
        const jar = await cookies();
        if (jar.get(BRAND_COOKIE)?.value === id) {
            const next = listBrands()[0];
            if (next)
                jar.set(BRAND_COOKIE, next.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        }
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function restoreBrandAction(id: string): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    try {
        restoreBrand(id);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
