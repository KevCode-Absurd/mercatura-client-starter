import { activeBrandId } from "@/lib/brand-context";
import { library } from "@/lib/avatar-studio/engine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
    return Response.json(library(await activeBrandId()), { headers: { "Cache-Control": "no-store" } });
}
