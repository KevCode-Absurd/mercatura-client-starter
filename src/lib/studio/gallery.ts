export function galleryIdentity(input: {
    product: string;
    argument: string;
    itemId: string;
    aspect: string;
    version: string | number;
    copyState?: string;
    imageState?: string;
}) { return `${input.product}; item ${input.itemId}; argument ${input.argument || "unclassified"}; ${input.aspect}; version ${input.version}; copy ${input.copyState || "unreviewed"}; image ${input.imageState || "unreviewed"}`; }
export const GALLERY_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
