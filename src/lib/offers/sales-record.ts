import { z } from "zod";
import { loadEconomics, saveEconomics } from "./data";
import type { Economics } from "./economics";
import { sourceNote } from "./own-numbers";
const Row = z.object({
    discount: z.number().gt(0, "A sale's discount is between 1 and 90%.").max(0.9, "A sale's discount is between 1 and 90%."),
    units: z.number().min(0.5, "Units an order can't be under 0.5."),
    roas_lift: z.number().gt(-1, "The ads can't be 100% worse.").max(5, "The ads can't be more than 500% better."),
});
export const SalesRecord = z.array(Row).max(12, "At most 12 sales.");
export function saveSalesRecord(brandId: string, input: unknown): Economics {
    const rows = [...SalesRecord.parse(input)].sort((a, b) => a.discount - b.discount);
    if (rows.some((r, k) => k > 0 && Math.abs(r.discount - rows[k - 1].discount) < 1e-9))
        throw new Error("2 sales have the same discount. Keep 1 row for each size of sale.");
    const was = loadEconomics(brandId);
    if (!was)
        throw new Error("Enter the brand's costs under Where it stands first: a record of past sales is kept with them.");
    const today = new Date().toISOString().slice(0, 10);
    return saveEconomics(brandId, { discount_history: rows, history_entered: true, source: sourceNote({ simulated: was.simulated, costs_entered: was.costs_entered, history_entered: true }, today) });
}
