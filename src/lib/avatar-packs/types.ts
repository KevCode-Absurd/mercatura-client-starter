export type AvatarPackAspect = "9:16" | "4:5" | "1:1";
export type AvatarPackReview = "pending" | "kept" | "rejected";
export type AvatarPackStatus = "queued" | "running" | "completed" | "failed" | "interrupted" | "uncertain";
export interface AvatarPackSetting {
    label: string;
    location: string;
    action: string;
    wardrobe: string;
    camera: string;
    lighting: string;
}
export interface CreateAvatarPackInput {
    requestId: string;
    avatarId: string;
    name?: string;
    aspect: AvatarPackAspect;
    settings: AvatarPackSetting[];
}
export interface RerunAvatarPackInput {
    packId: string;
    frameId: string;
    requestId: string;
    correction: string;
}
export interface AvatarPackAttempt {
    id: string;
    requestId: string;
    status: AvatarPackStatus;
    review: AvatarPackReview;
    createdAt: string;
    updatedAt: string;
    correction?: string;
    imageUrl?: string;
    relative?: string;
    width?: number;
    height?: number;
    costUsd?: number;
    model?: string;
    prompt?: string;
    error?: string;
}
export interface AvatarPackFrame {
    id: string;
    setting: AvatarPackSetting;
    status: AvatarPackStatus;
    review: AvatarPackReview;
    currentAttemptId: string;
    currentAttempt: AvatarPackAttempt;
    attempts: AvatarPackAttempt[];
}
export interface AvatarPack {
    id: string;
    avatarId: string;
    name: string;
    aspect: AvatarPackAspect;
    sourcePortrait: string;
    sourceSnapshot: string;
    sourceSha256: string;
    sourceRevision: string;
    createdAt: string;
    current: boolean;
    stale: boolean;
    frames: AvatarPackFrame[];
}
export interface AvatarPackReference {
    file: string;
    relative: string;
    avatarId: string;
    packId: string;
    sourcePortrait: string;
    sourceSha256: string;
    setting: AvatarPackSetting;
    aspect: AvatarPackAspect;
    width: number;
    height: number;
}
export type AvatarPackReferenceChoice = Omit<AvatarPackReference, "file"> & {
    id: string;
    frameId: string;
};
