import { activeBrandId } from "@/lib/brand-context";
import { MAX_DOC_BYTES, documentText } from "@/lib/import/document";
import { importScript } from "@/lib/scripts/engine";
export const maxDuration = 300;
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const file = form.get("file");
        const pasted = String(form.get("text") ?? "").trim();
        const conceptId = String(form.get("conceptId") ?? "") || null;
        let text: string;
        let name: string;
        if (file instanceof File && file.size > 0) {
            if (file.size > MAX_DOC_BYTES)
                return Response.json({ ok: false, error: "That file is over 12 MB. Upload just the script." }, { status: 413 });
            name = file.name;
            text = await documentText(brandId, file.name, Buffer.from(await file.arrayBuffer()));
        }
        else if (pasted.replace(/\s/g, "").length >= 40) {
            name = String(form.get("title") ?? "").trim() || "Pasted script";
            text = pasted.slice(0, 40000);
        }
        else
            return Response.json({ ok: false, error: "Choose a file or paste the script (at least a few lines)." }, { status: 400 });
        const id = await importScript({ brandId, conceptId, text, fileName: name });
        return Response.json({ ok: true, id });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
    }
}
