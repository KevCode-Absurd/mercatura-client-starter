import { z } from "zod";
const text = z.string().trim().min(1);
const provenance = z.object({
    source: z.enum(["brief", "source", "user"]),
    evidence: text,
}).strict();
const trait = z.object({ value: text, provenance }).strict();
const age = z.object({ value: z.number().int().min(18).max(120), provenance }).strict();
export const avatarSchema = z.object({
    id: text,
    kind: z.literal("fictional-avatar"),
    name: text,
    nationality: trait,
    gender: trait,
    age,
    skinTone: trait,
    bodyComposition: trait,
    prompt: text,
    images: z.array(z.object({
        path: text,
        model: text,
        width: z.number().int().positive(),
        height: z.number().int().positive(),
    }).strict()),
}).strict();
const sceneSchema = z.object({
    setting: text,
    framing: text,
    lighting: z.object({
        direction: text,
        hardness: z.enum(["soft", "hard", "mixed"]),
        temperature: z.enum(["warm", "neutral", "cool", "mixed"]),
    }).strict(),
    provenance,
}).strict();
export const referenceSchema = z.object({
    id: text,
    kind: z.literal("scene-reference"),
    sourceUrl: z.url(),
    localPath: text.optional(),
    scene: sceneSchema,
    compatibleBodyCompositions: z.array(text),
    compositionProvenance: provenance,
    rights: z.object({
        status: z.enum(["unknown", "approved", "rejected"]),
        licenseUrl: z.url().optional(),
        evidence: text.optional(),
        permitsCommercialUse: z.boolean(),
        permitsIdentityEditing: z.boolean(),
    }).strict().superRefine((rights, context) => {
        if (rights.status === "approved" && !rights.evidence) {
            context.addIssue({ code: "custom", path: ["evidence"], message: "Approved rights require recorded evidence." });
        }
    }),
}).strict();
export const catalogSchema = z.object({
    schemaVersion: z.literal(1),
    avatars: z.array(avatarSchema),
    references: z.array(referenceSchema),
}).strict().superRefine((catalog, context) => {
    for (const key of ["avatars", "references"] as const) {
        const ids = new Set<string>();
        catalog[key].forEach((item, index) => {
            if (ids.has(item.id))
                context.addIssue({ code: "custom", path: [key, index, "id"], message: "Duplicate catalog ID." });
            ids.add(item.id);
        });
    }
});
export type Avatar = z.infer<typeof avatarSchema>;
export type SceneReference = z.infer<typeof referenceSchema>;
export type AvatarCatalog = z.infer<typeof catalogSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export function parseCatalog(json: string): AvatarCatalog {
    return catalogSchema.parse(JSON.parse(json));
}
export function serializeCatalog(catalog: AvatarCatalog): string {
    return `${JSON.stringify(catalogSchema.parse(catalog), null, 2)}\n`;
}
const normalized = (value: string) => value.trim().toLowerCase();
const equal = (left: string, right: string) => normalized(left) === normalized(right);
export type AvatarFilter = Partial<Record<"nationality" | "gender" | "skinTone" | "bodyComposition", string>> & {
    minAge?: number;
    maxAge?: number;
};
export function filterAvatars(avatars: readonly Avatar[], filter: AvatarFilter = {}): Avatar[] {
    return avatars.filter((avatar) => (filter.minAge === undefined || avatar.age.value >= filter.minAge) &&
        (filter.maxAge === undefined || avatar.age.value <= filter.maxAge) &&
        (["nationality", "gender", "skinTone", "bodyComposition"] as const).every((key) => filter[key] === undefined || equal(avatar[key].value, filter[key]!)));
}
export function isReferenceEligible(reference: SceneReference): boolean {
    return reference.rights.status === "approved" &&
        Boolean(reference.rights.evidence?.trim()) &&
        reference.rights.permitsCommercialUse && reference.rights.permitsIdentityEditing;
}
export type SceneFilter = {
    setting?: string;
    framing?: string;
    lighting?: Partial<Scene["lighting"]>;
};
export function filterReferences(references: readonly SceneReference[], filter: SceneFilter = {}): SceneReference[] {
    return references.filter((reference) => isReferenceEligible(reference) &&
        (filter.setting === undefined || equal(reference.scene.setting, filter.setting)) &&
        (filter.framing === undefined || equal(reference.scene.framing, filter.framing)) &&
        (["direction", "hardness", "temperature"] as const).every((key) => filter.lighting?.[key] === undefined || equal(reference.scene.lighting[key], filter.lighting[key]!)));
}
export type ReferenceMatch = {
    reference: SceneReference;
    score: number;
    reasons: string[];
};
export function rankReferences(references: readonly SceneReference[], avatar: Avatar, requested: SceneFilter = {}): ReferenceMatch[] {
    return references.filter(isReferenceEligible).map((reference) => {
        let score = 0;
        const reasons: string[] = [];
        const match = (actual: string, expected: string | undefined, points: number, reason: string) => {
            if (expected !== undefined && equal(actual, expected)) {
                score += points;
                reasons.push(reason);
            }
        };
        match(reference.scene.setting, requested.setting, 4, "Requested scene");
        match(reference.scene.framing, requested.framing, 3, "Requested framing");
        for (const key of ["direction", "hardness", "temperature"] as const) {
            match(reference.scene.lighting[key], requested.lighting?.[key], 1, `Lighting ${key}`);
        }
        if (reference.compatibleBodyCompositions.some((value) => equal(value, avatar.bodyComposition.value))) {
            score += 2;
            reasons.push("Supplied body-composition compatibility");
        }
        return { reference, score, reasons };
    }).sort((left, right) => right.score - left.score || left.reference.id.localeCompare(right.reference.id));
}
