import "server-only";
import { z } from "zod";
import type { SeoArtifact } from "./content";
import type { SeoContext } from "./model";
const snapshotSchema = z.array(z.object({
    id: z.string().trim().min(1).max(300),
    hash: z.string().regex(/^[a-f0-9]{64}$/i),
    text: z.string().min(1).max(120000),
    productId: z.string().trim().min(1).max(100),
    brandId: z.string().trim().min(1).optional(),
})).min(1).max(1000);
const refreshMessage = "Refresh the selected brand resources and review the affected article wording before approval or export. The original source snapshot has been preserved.";
export async function assertArticleResourcesCurrent(artifact: SeoArtifact, ctx: SeoContext): Promise<void> {
    const files = (artifact.codeFiles ?? []).filter(file => file.name === "brand-resource-snapshot.json");
    if (!files.length)
        return;
    if (artifact.brandId !== ctx.brandId || !artifact.productId || !ctx.products.some(p => p.id === artifact.productId)) {
        throw new Error(`The saved brand resources belong to a different brand or product. ${refreshMessage}`);
    }
    const snapshots = files.flatMap(file => {
        try {
            if (file.language !== "json")
                throw new Error("Not JSON");
            return snapshotSchema.parse(JSON.parse(file.code));
        }
        catch {
            throw new Error(`The saved brand-resource snapshot is malformed or incomplete. ${refreshMessage}`);
        }
    });
    if (new Set(snapshots.map(source => source.id)).size !== snapshots.length) {
        throw new Error(`The saved brand-resource snapshot contains duplicate source identities. ${refreshMessage}`);
    }
    if (snapshots.some(source => source.productId !== artifact.productId || source.brandId && source.brandId !== ctx.brandId)) {
        throw new Error(`A saved brand resource belongs to a different brand or product. ${refreshMessage}`);
    }
    const { articleResources } = await import("./article-resources");
    const current = articleResources(ctx, artifact.productId);
    for (const source of snapshots) {
        const next = current.find(record => record.id === source.id);
        if (!next || next.productId !== artifact.productId || next.hash !== source.hash || next.text !== source.text) {
            throw new Error(`Selected brand resource ${source.id} changed or is no longer available. ${refreshMessage}`);
        }
    }
}
