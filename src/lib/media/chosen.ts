import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { imageAdapterFor, videoAdapterFor } from "./adapters";
import { IMAGE_MODELS, VIDEO_MODELS, imageModelEntry, imageModelInfo, lengthsText, videoModelEntry, videoModelInfo } from "./models";
export interface MediaModels {
    image: string;
    video: string;
    quality?: ImageQuality;
}
export type ImageQuality = "medium" | "high";
const DEFAULT_QUALITY: ImageQuality = "high";
const APP = "_app";
const KEY = "media_models";
const row = () => db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, APP), eq(schema.settings.key, KEY))).get();
let saved: {
    at: number;
    value: Partial<MediaModels>;
} | null = null;
function chosen(): Partial<MediaModels> {
    if (saved && Date.now() - saved.at < 1000)
        return saved.value;
    let value: Partial<MediaModels> = {};
    try {
        value = (row()?.value as Partial<MediaModels> | undefined) ?? {};
    }
    catch {
        value = {};
    }
    saved = { at: Date.now(), value };
    return value;
}
export function forgetMediaModels() {
    saved = null;
}
const text = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);
export const imageModel = (): string => text(chosen().image, env.MODEL_IMAGE);
export const videoModel = (): string => text(chosen().video, env.MODEL_VIDEO);
export const imageQuality = (): ImageQuality => (chosen().quality === "medium" ? "medium" : DEFAULT_QUALITY);
export function saveMediaModels(input: Partial<MediaModels>): MediaModels {
    if (input.image !== undefined && input.image !== env.MODEL_IMAGE && !imageModelEntry(input.image))
        throw new Error("That image model is not one the app can use.");
    if (input.video !== undefined && input.video !== env.MODEL_VIDEO && !videoModelEntry(input.video))
        throw new Error("That video model is not one the app can use.");
    if (input.quality !== undefined && input.quality !== "medium" && input.quality !== "high")
        throw new Error("Choose Final or Draft.");
    forgetMediaModels();
    const next = { image: input.image ?? imageModel(), video: input.video ?? videoModel(), quality: input.quality ?? imageQuality() };
    const startVideo = next.video === env.MODEL_VIDEO || (!!videoModelEntry(next.video) && videoModelEntry(next.video)?.id === videoModelEntry(env.MODEL_VIDEO)?.id);
    const value: Partial<MediaModels> = { ...(next.image !== env.MODEL_IMAGE ? { image: next.image } : {}), ...(startVideo ? {} : { video: next.video }), ...(next.quality !== DEFAULT_QUALITY ? { quality: next.quality } : {}) };
    const now = new Date().toISOString();
    db.insert(schema.settings)
        .values({ brand_id: APP, key: KEY, value, updated_at: now })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at: now } })
        .run();
    forgetMediaModels();
    return { image: imageModel(), video: videoModel(), quality: imageQuality() };
}
export interface MediaModelOption {
    id: string;
    name: string;
    price: string;
    takes: string;
    note: string;
}
export interface MediaModelChoices {
    now: string;
    start: string;
    options: MediaModelOption[];
}
export function mediaModelChoices(): {
    image: MediaModelChoices;
    video: MediaModelChoices;
    quality: ImageQuality;
} {
    const now = { image: imageModel(), video: videoModelEntry(videoModel())?.id ?? videoModel() };
    const start = { image: env.MODEL_IMAGE, video: videoModelEntry(env.MODEL_VIDEO)?.id ?? env.MODEL_VIDEO };
    const images = [...IMAGE_MODELS, ...[now.image, env.MODEL_IMAGE].filter((id, i, all) => !imageModelEntry(id) && all.indexOf(id) === i).map(imageModelInfo)];
    const videos = [...VIDEO_MODELS, ...[now.video, env.MODEL_VIDEO].filter((id, i, all) => !videoModelEntry(id) && all.indexOf(id) === i).map(videoModelInfo)];
    return {
        quality: imageQuality(),
        image: { now: now.image, start: start.image, options: images.map((m) => ({ id: m.id, name: m.name, price: m.price, takes: `Up to ${m.maxRefs} reference pictures for each picture it makes.`, note: imageAdapterFor(m).connected() ? "" : "Not connected yet: no picture can be made on it until its key is added." })) },
        video: {
            now: now.video,
            start: start.video,
            options: videos.map((m) => {
                const adapter = videoAdapterFor(m);
                return { id: m.id, name: m.name, price: m.priceNote, takes: `${m.maxImages === 1 ? "1 picture" : `Up to ${m.maxImages} pictures`} for each clip${m.referenceVideo ? ", and the clip before it" : ""}. Clips of ${lengthsText(m.seconds)} seconds. Prompts of up to ${m.promptLimit.toLocaleString("en-US")} characters.`, note: adapter.problem(m) ? "Not connected yet: the app writes the prompts for you to render." : adapter.connected() ? "" : "Not connected yet: no clip can be made on it until its key is added." };
            }),
        },
    };
}
