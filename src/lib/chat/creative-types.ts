import { GALLERY } from "../format-gallery";
import { AD_TYPES } from "../library/taxonomy";
import { WORLDS } from "../studio/worlds";
import { MAKE_FORMATS, type MakeFormat } from "./types";
export type TypeGroup = "ads" | "layouts" | "looks" | "photos" | "video" | "briefs";
export const TYPE_GROUPS: {
    id: TypeGroup;
    label: string;
}[] = [
    { id: "ads", label: "Static ads" },
    { id: "layouts", label: "Static ads of 1 kind" },
    { id: "looks", label: "Static ads in 1 look" },
    { id: "photos", label: "Photographs" },
    { id: "video", label: "Video" },
    { id: "briefs", label: "Briefs for people" },
];
export type TypeMake = {
    tool: "make_images";
    kind: "image_ads" | "product_page" | "photoshoot";
    format?: string;
    look?: string;
    layout?: string;
} | {
    tool: "make_from_script";
    format: MakeFormat;
};
export interface CreativeType {
    id: string;
    group: TypeGroup;
    label: string;
    what: string;
    make: TypeMake;
    example: string | null;
}
const FROM_SCRIPT: Record<string, MakeFormat> = { static: "static-concept", carousel: "carousel", ugc: "ugc", podcast: "podcast", "talking-object": "talking-object", claymation: "claymation", comic: "comic", explainer: "explainer", satisfying: "demo", "brief-ugc": "brief", "cinematic-3d": "cinematic-3d", "clay-world": "clay-world", wool: "wool", paper: "paper", watercolor: "watercolor", anime: "anime", skeleton: "skeleton", "motion-graphics": "motion-graphics", collage: "collage", song: "song" };
const KIND = { ad: "image_ads", pdp: "product_page", photoshoot: "photoshoot" } as const;
export const CREATIVE_TYPES: CreativeType[] = [
    ...GALLERY.flatMap((f): CreativeType[] => {
        if (f.start.via === "studio")
            return [{ id: f.id, group: f.group, label: f.label, what: f.what, make: { tool: "make_images", kind: KIND[f.start.kind], format: f.id }, example: f.id }];
        if (f.start.via === "script") {
            const format = FROM_SCRIPT[f.start.catalogue];
            return format && MAKE_FORMATS.some((m) => m.id === format) ? [{ id: f.id, group: f.group, label: f.label, what: f.what, make: { tool: "make_from_script", format }, example: f.id }] : [];
        }
        return [];
    }),
    ...AD_TYPES.map((a): CreativeType => ({ id: `layout-${a.id}`, group: "layouts", label: a.label, what: `Every ad of the set is this kind, built on layouts that have worked. ${a.job}`, make: { tool: "make_images", kind: "image_ads", layout: a.id }, example: null })),
    ...WORLDS.map((w): CreativeType => ({ id: `look-${w.id}`, group: "looks", label: w.label, what: `Every ad of the set in this look. ${w.look}`, make: { tool: "make_images", kind: "image_ads", look: w.id }, example: null })),
];
export const creativeType = (id: string | null | undefined) => (id ? CREATIVE_TYPES.find((t) => t.id === id) : undefined);
export function typeWords(t: CreativeType): string {
    return t.group === "looks" ? `Static ads in 1 look: ${t.label.toLowerCase()}` : t.group === "layouts" ? `Static ads of 1 kind: ${t.label.toLowerCase()}` : t.label;
}
