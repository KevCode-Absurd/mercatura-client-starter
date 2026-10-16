import { readCheckpoint, saveCheckpoint } from "../production-ops/store";
type Sizes = {
    bytes: number[];
    basis: "observed complete serialized JSON bytes; token provisioning estimate, not measured provider tokens";
};
export function observeStructuredItems(brandId: string, stage: string, items: unknown[]) { if (!items.length)
    return; for (let attempt = 0; attempt < 3; attempt++) {
    const old = readCheckpoint<Sizes>(brandId, "studio-result-sizes", stage);
    try {
        saveCheckpoint(brandId, "studio-result-sizes", stage, { bytes: [...(old?.value.bytes ?? []), ...items.map(i => Buffer.byteLength(JSON.stringify(i), "utf8"))].slice(-80), basis: "observed complete serialized JSON bytes; token provisioning estimate, not measured provider tokens" }, old?.revision ?? 0);
        return;
    }
    catch (error) {
        if (attempt === 2)
            return;
        if (!/changed|revision|conflict/i.test(String(error)))
            return;
    }
} }
export function observedItemAllowance(brandId: string, stage: string, requested: number) { const sizes = readCheckpoint<Sizes>(brandId, "studio-result-sizes", stage)?.value.bytes ?? []; return Math.max(requested, sizes.length ? Math.ceil(Math.max(...sizes) * .6) : 0); }
