import type { LibraryKind, StudioRunRow } from "@/db/schema";
import { currentOutputs } from "@/lib/studio/outputs";
export const KINDS: {
    kind: LibraryKind;
    href: string;
    title: string;
    blurb: string;
    steps: string;
}[] = [
    { kind: "ad", href: "/studio/ads", title: "Ads", blurb: "Static ads for Meta, from a winning layout, your research or your own script.", steps: "Pick how to start, then pick layouts" },
    { kind: "pdp", href: "/studio/new?kind=pdp", title: "Product images for your landing pages", blurb: "The 12 images most product pages are built from: what it does, benefits, how it works, reviews, before and after, what makes it different, and more. Each starts from a template frame and a real example.", steps: "Pick a product, check each frame and its example, review the words, render" },
    { kind: "photoshoot", href: "/studio/new?kind=photoshoot", title: "Photoshoots for your brand", blurb: "Campaign photography of your real product, rebuilt from proven looks. No text on the image.", steps: "Pick a product, pick looks, review, render" },
];
export const STATUS_LABEL: Record<StudioRunRow["status"], {
    label: string;
    tone: string;
}> = {
    draft: { label: "Starting", tone: "text-muted-foreground" },
    planning: { label: "Writing the plan", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    planned: { label: "Plan ready to review", tone: "border-amber-200 bg-amber-50 text-amber-700" },
    rendering: { label: "Making the images", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    review: { label: "Images ready", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    failed: { label: "Stopped", tone: "border-red-200 bg-red-50 text-red-700" },
};
const ofReferences = (refId: string) => /^[0-9a-f]{32}$/.test(refId);
export const thumbUrl = (refId: string) => (ofReferences(refId) ? `/api/references/thumb/${refId}` : `/api/library/thumb/${refId}`);
export const mediaUrl = (refId: string) => (ofReferences(refId) ? `/api/references/media/${refId}` : `/api/library/media/${refId}`);
export const frameUrl = (bucket: string) => `/api/library/template/${bucket}`;
export const assetUrl = (rel: string, w?: number) => `/api/assets/${rel}${w ? `?w=${w}` : ""}`;
export const productImageUrl = (folder: string, file: string, w?: number) => `/api/brand-file/assets/${encodeURIComponent(folder)}/${encodeURIComponent(file)}${w ? `?w=${w}` : ""}`;
export const lookUrl = (file: string, w?: number) => `/api/brand-file/look/${encodeURIComponent(file)}${w ? `?w=${w}` : ""}`;
export const latestOutputs = currentOutputs;
export function earlierOutputs<T extends {
    aspect: string;
    version: number;
    path: string;
    selected?: boolean;
}>(outputs: T[]): T[] {
    const newest = new Set(latestOutputs(outputs).map((o) => o.path));
    return outputs.filter((o) => !newest.has(o.path)).sort((a, b) => b.version - a.version || a.aspect.localeCompare(b.aspect));
}
