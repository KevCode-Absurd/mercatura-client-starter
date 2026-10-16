import { createHash } from "node:crypto";
import type { StudioRunRow } from "@/db/schema";
import type { CroAsset } from "./studio-types";
export function completedPdpAssets(brandId: string, runs: Pick<StudioRunRow, "id" | "brand_id" | "kind" | "status" | "product_id" | "items">[]): CroAsset[] {
    return runs.filter(r => r.brand_id === brandId && r.kind === "pdp" && r.status === "review").flatMap(run => run.items.filter(i => i.status === "done").flatMap(item => {
        const shapes = new Set<string>();
        return [...item.outputs].sort((a, b) => b.version - a.version).flatMap(output => {
            if (output.qa?.status !== "pass" || shapes.has(output.aspect) || !/^[\w/-]+\.(png|jpe?g|webp)$/i.test(output.path) || output.path.split("/").some(p => p === ".."))
                return [];
            shapes.add(output.aspect);
            return [{ id: `pdp-${createHash("sha256").update(`${brandId}|${run.id}|${item.id}|${output.path}`).digest("hex").slice(0, 24)}`, productId: run.product_id, src: `/api/assets/${output.path.split("/").map(encodeURIComponent).join("/")}`, local: null, name: `${item.label} · ${output.aspect} · v${output.version} (PDP studio)` }];
        });
    }));
}
