"use server";
import { revalidatePath } from "next/cache";
import { activeBrand } from "@/lib/brand-context";
import { listBrandFonts, pullBrandFonts, removeBrandFont, type BrandFontFile } from "@/lib/brand-fonts";
type Fonts = {
    ok: true;
    files: BrandFontFile[];
    warnings: string[];
} | {
    ok: false;
    error: string;
};
export async function pullBrandFontsAction(url: string): Promise<Fonts> {
    try {
        const row = await activeBrand();
        const res = await pullBrandFonts(row.id, url.trim());
        revalidatePath("/", "layout");
        return { ok: true, ...res };
    }
    catch (e) {
        const msg = (e as Error).message;
        return { ok: false, error: /ERR_NAME_NOT_RESOLVED|ENOTFOUND|net::/i.test(msg) ? "That website couldn't be reached. Check the address." : /Invalid URL/i.test(msg) ? "That doesn't look like a website address." : msg.slice(0, 300) };
    }
}
export async function removeBrandFontAction(file: string): Promise<Fonts> {
    try {
        const row = await activeBrand();
        removeBrandFont(row.id, file);
        revalidatePath("/", "layout");
        return { ok: true, files: listBrandFonts(row.id), warnings: [] };
    }
    catch (e) {
        return { ok: false, error: (e as Error).message.slice(0, 300) };
    }
}
