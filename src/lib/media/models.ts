export type ImageProvider = "openai" | "google";
export type VideoProvider = "seedance" | "higgsfield";
export interface ImageModelInfo {
    id: string;
    name: string;
    provider: ImageProvider;
    maxRefs: number;
    price: string;
}
export type ClipChain = "last_frame" | "reference_video" | "extend";
export interface VideoProfile {
    timing: "shots" | "seconds";
    speech: "braces" | "quotes";
}
export interface VideoModelInfo {
    id: string;
    name: string;
    provider: VideoProvider;
    maxImages: number;
    referenceVideo: boolean;
    seconds: number[];
    secondsOnly: boolean;
    shortest?: number;
    promptLimit: number;
    chain: ClipChain;
    prompt: VideoProfile;
    price: (seconds: number, hasReferenceVideo: boolean, resolution: string) => number;
    priceNote: string;
    also?: RegExp;
}
export const IMAGE_MODELS: ImageModelInfo[] = [
    { id: "gpt-image-2.5-sunburst", name: "GPT Image 2.5 Sunburst", provider: "openai", maxRefs: 8, price: "priced by the picture's size and quality; high quality is about 4 times medium" },
    { id: "gemini-3-pro-image", name: "Nano Banana Pro", provider: "google", maxRefs: 14, price: "about 13 cents a picture, whatever its size up to 2K" },
    { id: "gemini-3.1-flash-image", name: "Nano Banana 2", provider: "google", maxRefs: 14, price: "about 10 cents a picture at 2K, 7 at 1K" },
    { id: "gemini-3.1-flash-lite-image", name: "Nano Banana 2 Lite", provider: "google", maxRefs: 14, price: "about 3 cents a picture, 1K only; best with 1 reference" },
];
export type ImageUse = "avatar" | "photoreal" | "person_sheet" | "ugc_first";
export const IMAGE_MODEL_FOR: Record<ImageUse, string> = { avatar: "gemini-3-pro-image", photoreal: "gemini-3-pro-image", person_sheet: "gemini-3-pro-image", ugc_first: "gemini-3-pro-image" };
const bySecond = (credits: number) => (seconds: number) => Math.ceil(credits * seconds) / 100;
const miniPrice = (seconds: number, hasReferenceVideo: boolean, resolution: string) => Math.ceil((resolution === "720p" ? (hasReferenceVideo ? 18.75 : 30.75) : hasReferenceVideo ? 9 : 14.25) * seconds) / 100;
const SEEDANCE_API_PROMPT = 2000;
export const VIDEO_MODELS: VideoModelInfo[] = [
    { id: "seedance-2.5", name: "Seedance 2.5", provider: "higgsfield", maxImages: 30, referenceVideo: true, seconds: [5, 10, 15], secondsOnly: false, shortest: 4, promptLimit: 3200, chain: "extend", prompt: { timing: "seconds", speech: "quotes" }, price: bySecond(48), priceNote: "counted at $4.80 for 10 seconds, an estimate", also: /seedance[-_ ]?2[._]5/i },
    { id: "seedance-2.0", name: "Seedance 2.0", provider: "seedance", maxImages: 2, referenceVideo: false, seconds: [5, 10, 15], secondsOnly: true, promptLimit: SEEDANCE_API_PROMPT, chain: "last_frame", prompt: { timing: "shots", speech: "braces" }, price: bySecond(48), priceNote: "$4.80 for 10 seconds" },
    { id: "seedance-2.0-fast", name: "Seedance 2.0 Fast", provider: "seedance", maxImages: 2, referenceVideo: false, seconds: [5, 10, 15], secondsOnly: true, promptLimit: SEEDANCE_API_PROMPT, chain: "last_frame", prompt: { timing: "shots", speech: "braces" }, price: bySecond(32), priceNote: "$3.20 for 10 seconds" },
    { id: "seedance-2-mini", name: "Seedance 2 Mini", provider: "seedance", maxImages: 4, referenceVideo: true, seconds: [8, 9, 10, 11, 12, 13, 14, 15], secondsOnly: false, promptLimit: SEEDANCE_API_PROMPT, chain: "reference_video", prompt: { timing: "shots", speech: "braces" }, price: miniPrice, priceNote: "$1.43 to $3.08 for 10 seconds, less after the first clip" },
];
export const IMAGE_PROVIDER_LABEL: Record<ImageProvider, string> = { openai: "OpenAI", google: "Google" };
export const VIDEO_PROVIDER_LABEL: Record<VideoProvider, string> = { seedance: "seedanceapi.org", higgsfield: "Higgsfield" };
export const imageModelEntry = (id: string): ImageModelInfo | undefined => IMAGE_MODELS.find((m) => m.id === id);
export const imageModelInfo = (id: string): ImageModelInfo => imageModelEntry(id) ?? { id, name: id, provider: "openai", maxRefs: 8, price: "priced by the provider; no figure is listed for it yet" };
export const videoModelEntry = (id: string): VideoModelInfo | undefined => VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS.find((m) => m.also?.test(id));
export function videoModelInfo(id: string): VideoModelInfo {
    const entry = videoModelEntry(id);
    if (entry)
        return entry.id === id ? entry : { ...entry, id };
    const like = videoModelEntry(id.includes("mini") ? "seedance-2-mini" : id.includes("fast") ? "seedance-2.0-fast" : "seedance-2.0")!;
    return { ...like, id, name: id, priceNote: "counted at the price of the listed model nearest to it, an estimate" };
}
export function acceptedLengths(m: Pick<VideoModelInfo, "seconds" | "shortest">): number[] {
    const listed = [...m.seconds].sort((a, b) => a - b);
    if (!m.shortest)
        return listed;
    const longest = Math.max(m.shortest, ...listed);
    return Array.from({ length: longest - m.shortest + 1 }, (_, i) => m.shortest! + i);
}
export const lengthsText = (seconds: number[]) => (seconds.length < 2 ? seconds.join("") : `${seconds.slice(0, -1).join(", ")} or ${seconds[seconds.length - 1]}`);
