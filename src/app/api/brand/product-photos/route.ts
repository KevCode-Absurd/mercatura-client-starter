import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { addProductPhotos, saveLogo } from "@/lib/product-photos";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const files = form.getAll("file").filter((f): f is File => f instanceof File);
        if (!files.length)
            return Response.json({ ok: false, error: "No file" }, { status: 400 });
        const read = async (f: File) => ({ name: f.name, bytes: Buffer.from(await f.arrayBuffer()) });
        if (form.get("kind") === "logo") {
            await saveLogo(brandId, await read(files[0]));
            revalidatePath("/brand");
            return Response.json({ ok: true, saved: 1 });
        }
        const saved = await addProductPhotos(brandId, String(form.get("product") ?? ""), await Promise.all(files.map(read)));
        revalidatePath("/", "layout");
        return Response.json({ ok: true, saved: saved.length });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
