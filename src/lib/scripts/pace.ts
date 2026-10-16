import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { firstAge, speechPace, type SpeechPace } from "../pace";
import { getPersona } from "../personas/store";
import { loadCreativeKit } from "../production/kit";
export function speakerAge(brandId: string, personaId: string | null | undefined): string | null {
    if (!personaId)
        return null;
    const read = (from: () => string | undefined): string | undefined => {
        try {
            return from();
        }
        catch {
            return undefined;
        }
    };
    const age = firstAge(read(() => loadCreativeKit(brandId)?.presenters.find((p) => p.persona_id === personaId)?.age), read(() => getPersona(brandId, personaId)?.who.age));
    return age === null ? null : String(age);
}
export const scriptPace = (brandId: string, personaId: string | null | undefined, o?: {
    calm?: boolean;
    long?: boolean;
}): SpeechPace => speechPace(speakerAge(brandId, personaId), o);
export const speakerAges = (brandId: string, personaIds: (string | null | undefined)[]): Record<string, string | null> => Object.fromEntries([...new Set(personaIds.filter((id): id is string => !!id))].map((id) => [id, speakerAge(brandId, id)]));
export function speakerOfScript(script: {
    brand_id: string;
    concept_id: string;
}): string | null {
    const concept = db.select({ persona_id: schema.concepts.persona_id }).from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    return speakerAge(script.brand_id, concept?.persona_id);
}
