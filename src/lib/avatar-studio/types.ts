export interface AvatarTags {
    collection?: "Campaign-ready" | "UGC creators";
    gender: "Female" | "Male" | "Nonbinary";
    age: number;
    ageGroup: "18–24" | "25–34" | "35–44" | "45–54" | "55–64" | "65+";
    skinTone: "Fair" | "Light beige" | "Light olive" | "Medium beige" | "Medium olive" | "Light brown" | "Medium brown" | "Deep brown" | "Dark brown";
    ethnicity: string;
    heritage: string;
    source: "character-brief";
}
export interface AvatarPortrait {
    id: string;
    label: string;
    portraitUrl: string;
    thumbnailUrl: string;
    tags?: AvatarTags;
}
export interface AvatarAesthetic {
    id: string;
    title: string;
    description: string;
    scene: string;
    lighting: string;
    imageUrl: string;
    thumbnailUrl: string;
}
export interface AvatarGeneration {
    id: string;
    requestId: string;
    avatarId: string;
    aestheticId: string;
    status: "queued" | "running" | "completed" | "failed" | "interrupted";
    createdAt: string;
    updatedAt: string;
    imageUrl?: string;
    originalUrl?: string;
    error?: string;
    costUsd?: number;
    note?: string;
    said?: string;
}
export interface AvatarLibraryResponse {
    avatars: AvatarPortrait[];
    aesthetics: AvatarAesthetic[];
    generations: AvatarGeneration[];
    generationEnabled: boolean;
    disabledReason?: string;
}
