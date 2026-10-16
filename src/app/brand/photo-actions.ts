"use server";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { removeProductPhoto, setMainPhoto } from "@/lib/product-photos";
import { errorText } from "@/lib/plain-message";
type Done = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export async function setMainPhotoAction(productId: string, file: string): Promise<Done> {
    try {
        setMainPhoto(await activeBrandId(), productId, file);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function removeProductPhotoAction(productId: string, file: string): Promise<Done> {
    try {
        removeProductPhoto(await activeBrandId(), productId, file);
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
