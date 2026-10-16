export const SHOWCASE_REVIEWED = 0;
export const showcaseImage = (id: string, thumbnail = false) => `/examples/static-ads/${id}${thumbnail ? "-thumb" : ""}.webp`;
export interface ShowcaseExample {
    id: string; title: string; style: string; format: string;
    cast: string; copy: string; brand: string; collection: string;
}
export const SHOWCASE: ShowcaseExample[] = [];
