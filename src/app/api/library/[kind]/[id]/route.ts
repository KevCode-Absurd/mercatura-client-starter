import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "@/lib/env";
import { TEMPLATE_ROOT, templateFrame } from "@/lib/library/templates";
import { activeBrandId } from "@/lib/brand-context";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { requireSession, temporaryReferences } from "@/lib/competitor-playbook/store";
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
export async function GET(_req: Request, { params }: {
    params: Promise<{
        kind: string;
        id: string;
    }>;
}) {
    const { kind, id } = await params;
    const competitor = /^cp_([0-9a-f-]{36})_(\d+)$/.exec(id);
    if (competitor) {
        try {
            if (kind !== "thumb" && kind !== "media")
                throw new Error("Invalid media kind.");
            requireSession(competitor[1], (await cookies()).get("ce_competitor_browser")?.value ?? "", await activeBrandId());
            const ref = temporaryReferences([id])[0];
            if (!ref)
                throw new Error("Expired reference.");
            return new Response(fs.readFileSync(ref.file), { headers: { "content-type": "image/webp", "cache-control": "no-store", "X-Content-Type-Options": "nosniff" } });
        }
        catch {
            return new Response("Session reference unavailable", { status: 404 });
        }
    }
    if (kind === "template") {
        const frame = id === "framework" ? path.join(env.SKILLS_DIR, TEMPLATE_ROOT, "template", "framework.jpg") : templateFrame(id);
        if (!frame || !fs.existsSync(frame) || !fs.statSync(frame).isFile())
            return new Response("Not found", { status: 404 });
        return new Response(fs.readFileSync(frame), { headers: { "content-type": TYPES[path.extname(frame).toLowerCase()] ?? "image/png", "cache-control": "private, max-age=86400" } });
    }
    const ref = db.select({ file: schema.libraryRefs.file, thumb: schema.libraryRefs.thumb }).from(schema.libraryRefs).where(eq(schema.libraryRefs.id, id)).get();
    const rel = ref ? (kind === "thumb" ? (ref.thumb ?? ref.file) : ref.file) : null;
    if (!rel)
        return new Response("Not found", { status: 404 });
    const file = path.resolve(env.SKILLS_DIR, rel);
    const brandKey = createHash("sha256").update(await activeBrandId()).digest("hex").slice(0, 20);
    const roots = [path.resolve(env.SKILLS_DIR), path.resolve(env.DATA_DIR, "assets", "cro-pdp-references", brandKey)];
    if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        return new Response("Not found", { status: 404 });
    const real = fs.realpathSync(file);
    if (!roots.some(root => fs.existsSync(root) && real.startsWith(fs.realpathSync(root) + path.sep)))
        return new Response("Not found", { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=86400" } });
}
