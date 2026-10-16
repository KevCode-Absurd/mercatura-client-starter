import type { PhotoJob } from "../brain/on-camera";
export type PhotoView = PhotoJob | "several" | "other";
export const VIEW_INFO: Record<PhotoView, {
    label: string;
    is: string;
}> = {
    "pack front": { label: "As it is sold, from the front", is: "as it is sold, seen from the front" },
    "single unit": { label: "1 single unit", is: "as 1 single unit, out of the pack it is sold in" },
    "out of pack": { label: "Out of its pack", is: "out of its packaging" },
    "in hand": { label: "In a hand", is: "in a hand, at its true size" },
    "in use": { label: "In use", is: "being used" },
    "close up": { label: "Close up", is: "close up, for its surface and finish" },
    label: { label: "Label or back", is: "from the back or the side, for its label" },
    "on body": { label: "Worn", is: "worn by a real person" },
    "in place": { label: "Where it is kept", is: "where it is kept or used" },
    "laid out": { label: "Everything in the box", is: "with everything that comes in the box" },
    "before after": { label: "Before and after", is: "in a real before and after" },
    several: { label: "Several together", is: "several of it together" },
    other: { label: "Another view", is: "in another view" },
};
export const MAX_PRODUCT_PHOTOS = 4;
export const MAX_LOOK_POOL = 6;
export const MAX_WORLD_POOL = 4;
