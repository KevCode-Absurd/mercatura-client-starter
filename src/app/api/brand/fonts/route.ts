import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { addBrandFont } from "@/lib/brand-fonts";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const files = form.getAll("file").filter((f): f is File => f instanceof File).slice(0, 12);
        if (!files.length)
            return Response.json({ ok: false, error: "No file" }, { status: 400 });
        const saved = [];
        for (const f of files)
            saved.push(addBrandFont(brandId, { name: f.name, bytes: Buffer.from(await f.arrayBuffer()) }));
        revalidatePath("/", "layout");
        return Response.json({ ok: true, saved });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
