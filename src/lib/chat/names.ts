import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { offerChoices } from "../offers/book";
import { listPersonas } from "../personas/store";
import type { AskContext } from "./request-types";
export function brandNames(brandId: string, referenceIds: string[] = []): AskContext {
    const brand = loadBrandBrain(brandId);
    const profiles = new Map(listPersonas(brandId).map((p) => [p.id, p]));
    const refs = referenceIds.length ? db.select({ id: schema.adReferences.id, title: schema.adReferences.title, kind: schema.adReferences.kind }).from(schema.adReferences).where(inArray(schema.adReferences.id, referenceIds)).all() : [];
    return {
        brandName: brand.brand.name,
        products: brand.products.map((p) => ({ id: p.id, name: p.name })),
        personas: brand.personas.map((p) => ({ id: p.id, name: p.name, age: profiles.get(p.id)?.who.age ?? "", gender: profiles.get(p.id)?.who.gender ?? "", summary: p.summary })),
        offers: offerChoices(brandId, brand).map((o) => ({ id: o.id, name: o.name })),
        concepts: db.select({ id: schema.concepts.id, name: schema.concepts.name, persona_id: schema.concepts.persona_id, angle: schema.concepts.angle }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all(),
        references: referenceIds.flatMap((id) => refs.filter((r) => r.id === id)),
    };
}
