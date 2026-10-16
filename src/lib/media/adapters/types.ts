import type { ImageModelInfo, ImageProvider, ImageUse, VideoModelInfo, VideoProvider } from "../models";
export interface CallBase {
    brandId: string;
    jobId: string | null;
    purpose: string;
    prompt: string;
}
export interface ImageRequest extends CallBase {
    refs: string[];
    size: string;
    out: string;
    quality?: "medium" | "high";
    use?: ImageUse;
    model?: string;
    strictModel?: boolean;
    onOtherModel?: (said: string) => void;
    holdUnsure?: boolean;
}
export interface VideoRequest extends CallBase {
    images: string[];
    referenceVideo?: string;
    seconds: number;
    resolution: string;
    aspect: string;
}
export interface ImageAdapter {
    id: ImageProvider;
    key: string;
    connected(): boolean;
    generate(model: ImageModelInfo, req: ImageRequest): Promise<{
        costUsd: number;
    }>;
}
export interface VideoAdapter {
    id: VideoProvider;
    key: string;
    connected(): boolean;
    problem(model: VideoModelInfo): string;
    submit(model: VideoModelInfo, req: VideoRequest, sending: () => void): Promise<{
        taskId: string;
    }>;
    wait(taskId: string, out: string, maxPolls: number): Promise<void>;
}
