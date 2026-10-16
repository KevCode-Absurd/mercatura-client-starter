import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { familyAdvice, tallyFamilies, type FamilyId, type FamilyTally } from "./families";
export function familiesOfBrand(brandId: string): {
    tally: FamilyTally;
    test: FamilyId[];
    line: string;
} {
    const runs = db.select({ items: schema.studioRuns.items }).from(schema.studioRuns).where(and(eq(schema.studioRuns.brand_id, brandId), eq(schema.studioRuns.kind, "ad"))).all();
    const tally = tallyFamilies(runs.flatMap((r) => r.items.filter((i) => i.plan).map((i) => ({ archetype: i.archetype, type: i.type }))));
    return { tally, ...familyAdvice(tally) };
}
