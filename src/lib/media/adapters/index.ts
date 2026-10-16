import { env } from "../../env";
import type { ImageModelInfo, ImageProvider, VideoModelInfo, VideoProvider } from "../models";
import { googleImages } from "./google";
import { higgsfield } from "./higgsfield";
import { openaiImages } from "./openai";
import { seedance } from "./seedance";
import type { ImageAdapter, VideoAdapter } from "./types";
export type { CallBase, ImageAdapter, ImageRequest, VideoAdapter, VideoRequest } from "./types";
export const IMAGE_ADAPTERS: Record<ImageProvider, ImageAdapter> = { openai: openaiImages, google: googleImages };
export const VIDEO_ADAPTERS: Record<VideoProvider, VideoAdapter> = { seedance, higgsfield };
export const imageAdapterFor = (model: ImageModelInfo): ImageAdapter => IMAGE_ADAPTERS[model.provider];
export function videoAdapterFor(model: VideoModelInfo, baseUrl: string = env.SEEDANCE_BASE_URL): VideoAdapter {
    const own = VIDEO_ADAPTERS[model.provider];
    return own.id !== "seedance" && !own.connected() && !/seedanceapi\.org/i.test(baseUrl) ? seedance : own;
}
