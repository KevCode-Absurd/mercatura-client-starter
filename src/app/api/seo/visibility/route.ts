import { activeBrandId } from "@/lib/brand-context";
import { listVisibilityRuns } from "@/lib/seo/store";
import { visibilityRunning } from "@/lib/seo/visibility-runner";
import { visibilityQueued } from "@/lib/seo/visibility-jobs";
export async function GET(request: Request) {
    const brandId = new URL(request.url).searchParams.get("brandId");
    if (!brandId || await activeBrandId() !== brandId)
        return Response.json({ error: "Active brand changed. Refresh this workspace." }, { status: 403 });
    return Response.json({ runs: listVisibilityRuns(brandId), running: visibilityRunning(brandId) || visibilityQueued.has(brandId) }, { headers: { "Cache-Control": "no-store" } });
}
