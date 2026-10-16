export const DEFAULT_ADSET_TEMPLATE = "{BRAND}|{CONCEPT_ID}|{PERSONA}|{ANGLE_SLUG}|{OFFER}|{AWARENESS}";
export const DEFAULT_AD_TEMPLATE = "{BRAND}|{CONCEPT_ID}|{SCRIPT_ID}v{VERSION}|{OUTPUT_TYPE}|{HOOK_ID}|{CREATOR_OR_SKILL}";
export function fillTemplate(template: string, values: Record<string, string>): string {
    return template.replace(/\{([A-Z_]+)\}/g, (m, key: string) => values[key] ?? m);
}
export const slugify = (s: string) => s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const shortId = (id: string, letter: string) => {
    const n = id.match(/(\d+)$/)?.[1];
    return n ? `${letter}${n}` : id;
};
export const stripPrefix = (id: string) => id.replace(/^[a-z]+_/, "");
export const angleSlug = (conceptName: string) => slugify(conceptName.split(/\s+x\s+/i)[0] ?? conceptName);
export function adsetName(template: string, c: {
    brandCode: string;
    conceptId: string;
    personaId: string;
    conceptName: string;
    offerId: string;
    awarenessCode: string;
}): string {
    return fillTemplate(template, {
        BRAND: c.brandCode,
        CONCEPT_ID: shortId(c.conceptId, "C"),
        PERSONA: stripPrefix(c.personaId),
        ANGLE_SLUG: angleSlug(c.conceptName),
        OFFER: stripPrefix(c.offerId),
        AWARENESS: c.awarenessCode,
    });
}
export function adName(template: string, a: {
    brandCode: string;
    conceptId: string;
    scriptId: string;
    version: number;
    outputShort: string;
    hookId: string | null;
    creatorOrSkill: string | null;
}): string {
    return fillTemplate(template, {
        BRAND: a.brandCode,
        CONCEPT_ID: shortId(a.conceptId, "C"),
        SCRIPT_ID: shortId(a.scriptId, "S"),
        VERSION: String(a.version),
        OUTPUT_TYPE: a.outputShort,
        HOOK_ID: a.hookId ? a.hookId.replace("_", "") : "hkall",
        CREATOR_OR_SKILL: a.creatorOrSkill ? slugify(a.creatorOrSkill) : "tbd",
    });
}
