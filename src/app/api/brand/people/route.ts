import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { PERSON_ROLES, addPerson, type PersonRole } from "@/lib/people";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File))
            return Response.json({ ok: false, error: "No file" }, { status: 400 });
        const role = String(form.get("role") ?? "founder");
        if (!(PERSON_ROLES as readonly string[]).includes(role))
            return Response.json({ ok: false, error: "Unknown role" }, { status: 400 });
        const person = await addPerson(brandId, { fileName: file.name, bytes: Buffer.from(await file.arrayBuffer()), name: String(form.get("name") ?? ""), role: role as PersonRole, note: String(form.get("note") ?? ""), consent: form.get("consent") === "yes" });
        revalidatePath("/brand");
        return Response.json({ ok: true, id: person.id });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
