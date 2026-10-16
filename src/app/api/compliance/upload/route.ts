import { activeBrandId } from "@/lib/brand-context";
import { saveUpload } from "@/lib/compliance/checks";
import { errorText } from "@/lib/plain-message";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File))
            return Response.json({ ok: false, error: "No file" }, { status: 400 });
        const saved = saveUpload(brandId, file.name, Buffer.from(await file.arrayBuffer()));
        return Response.json({ ok: true, file: saved.rel, kind: saved.kind, name: file.name });
    }
    catch (e) {
        return Response.json({ ok: false, error: errorText(e) }, { status: 400 });
    }
}
