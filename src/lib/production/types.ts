import type { Avatar } from "../avatars/types";
import type { AvatarPackSetting } from "../avatar-packs/types";
export interface AvatarReferenceSnapshot {
    id: string;
    packId: string;
    avatarId: string;
    file: string;
    frameSha256: string;
    sourcePortrait: string;
    sourceSha256: string;
    setting: AvatarPackSetting;
    aspect: string;
    width: number;
    height: number;
    avatar: Avatar;
}
export function avatarReferenceCompatible(recipe: string, formatLook?: string | null): boolean {
    return ["static-concept", "carousel", "ugc", "cinematic"].includes(recipe) && (!formatLook || formatLook === "none");
}
