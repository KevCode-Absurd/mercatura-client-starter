import { z } from "zod";
export const AREAS = ["words", "pictures", "video"] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABEL: Record<Area, string> = { words: "Scripts and copy", pictures: "Images", video: "Video" };
export const CATEGORIES = {
    product_use: "How the product is opened, held and used",
    people_hands: "People and hands",
    composition: "Picture and layout",
    words: "Words and claims",
    look: "Brand look",
    other: "Other",
} as const;
export type Category = keyof typeof CATEGORIES;
export const LessonSchema = z.object({
    id: z.string(),
    scope: z.enum(["general", "brand", "product"]),
    product_id: z.string().nullable().default(null),
    category: z.enum(Object.keys(CATEGORIES) as [
        Category,
        ...Category[]
    ]).default("other"),
    areas: z.array(z.enum(AREAS)).min(1).default(["pictures"]),
    rule: z.string().min(8).max(500),
    why: z.string().max(500).default(""),
    status: z.enum(["active", "proposed", "off"]).default("active"),
    source: z.enum(["feedback", "manual", "seed", "checks", "edits"]).default("manual"),
    feedback_ids: z.array(z.string()).default([]),
    image: z.string().default(""),
    formats: z.array(z.string()).default([]),
    kind: z.enum(["avoid", "keep"]).default("avoid"),
    times: z.number().int().min(1).default(1),
    replaces: z.array(z.string()).default([]),
    merged_into: z.string().default(""),
    created_at: z.string().default(""),
    updated_at: z.string().default(""),
});
export type Lesson = z.infer<typeof LessonSchema>;
