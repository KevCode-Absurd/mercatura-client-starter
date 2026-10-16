import type { ChatAction, ChatCheck, ChatMade, ChatMessageRow, ChatQuestion, ChatReport, ChatTool } from "@/db/schema";
export type { ChatAction, ChatCheck, ChatMade, ChatQuestion, ChatReport, ChatTool };
export const TOOL_WORDS: Record<ChatTool, {
    doing: string;
    label: string;
}> = {
    make_images: { doing: "Making the images", label: "Images" },
    change_image: { doing: "Making the image again", label: "Image, changed" },
    write_scripts: { doing: "Writing the scripts", label: "Scripts" },
    change_script: { doing: "Rewriting the script", label: "Script, changed" },
    write_copy: { doing: "Writing the copy", label: "Copy" },
    check_claims: { doing: "Reading the claims", label: "Claims check" },
    make_from_script: { doing: "Making it", label: "Ad" },
    job_step: { doing: "Working on it", label: "Ad" },
    join_clips: { doing: "Joining the clips", label: "Video" },
    write_hooks: { doing: "Writing the hooks", label: "New hooks" },
    make_hook_clip: { doing: "Making the clip", label: "Hook clip" },
    build_offers: { doing: "Building the offers", label: "Offers" },
    plan_sprint: { doing: "Planning the sprint", label: "Sprint" },
    audit_page: { doing: "Reading the page on a phone", label: "Page audit" },
    audit_gaps: { doing: "Reading the account", label: "Creative gaps" },
    print_guide: { doing: "Building the guide", label: "Brand guide" },
    founder_questions: { doing: "Reading the interview", label: "Founder interview" },
    draft_page: { doing: "Writing the page", label: "Landing page" },
    transpose_script: { doing: "Retelling the script", label: "Script, retold" },
    list_angles: { doing: "Reading the angle library", label: "Angles" },
    list_hooks: { doing: "Reading the hook bank", label: "Hooks" },
    organic_plan: { doing: "Reading the organic plan", label: "Organic" },
    video_editor: { doing: "Preparing the video editor", label: "Video editing" },
};
export const COPY_KINDS = {
    headlines: { label: "Headlines", one: "headline", usual: 8, max: 20, limit: "40 characters or fewer each" },
    primary_text: { label: "Primary text", one: "primary text", usual: 3, max: 8, limit: "the text above the image in the feed: the first 125 characters must carry it" },
    hooks: { label: "Hooks", one: "hook", usual: 8, max: 20, limit: "the first line of a video, spoken: 12 words or fewer" },
    descriptions: { label: "Descriptions", one: "description", usual: 5, max: 12, limit: "the line under the headline: 30 characters or fewer" },
    captions: { label: "Captions", one: "caption", usual: 3, max: 8, limit: "a caption for an organic post" },
    angles: { label: "Angles", one: "angle", usual: 6, max: 12, limit: "1 sentence each: who it is for and the 1 argument" },
} as const;
export type CopyKind = keyof typeof COPY_KINDS;
export const MAKE_FORMATS = [
    { id: "static-concept", type: "static_image", label: "Static image ad", video: false },
    { id: "carousel", type: "carousel", label: "Carousel", video: false },
    { id: "ugc", type: "ai_ugc", label: "UGC video", video: true },
    { id: "podcast", type: "ai_podcast", label: "Podcast clip video", video: true },
    { id: "demo", type: "ai_satisfying", label: "Satisfying hook video", video: true },
    { id: "claymation", type: "ai_claymation", label: "Claymation video", video: true },
    { id: "cartoon", type: "ai_claymation", label: "Cartoon video", video: true },
    { id: "comic", type: "ai_comic", label: "Comic video", video: true },
    { id: "talking-object", type: "ai_talking_object", label: "Talking object video", video: true },
    { id: "explainer", type: "ai_explainer", label: "CGI explainer video", video: true },
    { id: "cinematic-3d", type: "ai_cinematic_3d", label: "Cinematic 3D video", video: true },
    { id: "cinematic", type: "ai_cinematic", label: "Cinematic film video (1 character)", video: true },
    { id: "cinematic-duo", type: "ai_cinematic", label: "Cinematic film video (2 characters)", video: true },
    { id: "clay-world", type: "ai_clay_world", label: "Clay world video", video: true },
    { id: "wool", type: "ai_wool", label: "Knitted wool video", video: true },
    { id: "paper", type: "ai_paper", label: "Paper world video", video: true },
    { id: "watercolor", type: "ai_watercolor", label: "Watercolour video", video: true },
    { id: "anime", type: "ai_anime", label: "Anime video", video: true },
    { id: "skeleton", type: "ai_skeleton", label: "Skeleton video", video: true },
    { id: "motion-graphics", type: "ai_motion_graphics", label: "Motion graphics video", video: true },
    { id: "collage", type: "ai_collage", label: "Editorial collage video", video: true },
    { id: "song", type: "ai_song", label: "Song ad video", video: true },
    { id: "brief", type: "human_brief_ugc", label: "Brief for a human creator", video: false },
] as const;
export type MakeFormat = (typeof MAKE_FORMATS)[number]["id"];
export interface ImageCard {
    type: "images";
    setId: string;
    title: string;
    images: {
        itemId: string;
        n: number;
        url: string;
        full: string;
        title: string;
        ok: boolean | null;
    }[];
    progress: string;
    note: string;
    links: {
        label: string;
        href: string;
    }[];
}
export interface ScriptCard {
    type: "scripts";
    scripts: {
        id: string;
        title: string;
        seconds: number;
        version: number;
        lines: {
            beat: string;
            text: string;
        }[];
        flags: number;
    }[];
    progress: string;
    note: string;
    links: {
        label: string;
        href: string;
    }[];
}
export interface CopyCard {
    type: "copy";
    what: string;
    options: {
        text: string;
        angle: string;
        notes?: string[];
    }[];
}
export interface CheckCard {
    type: "check";
    check: ChatCheck;
}
export interface JobCard {
    type: "job";
    jobId: string;
    label: string;
    title: string;
    video: boolean;
    busy: boolean;
    state: string;
    plan: {
        heading: string;
        lines: string[];
    }[];
    panels: {
        url: string;
        selected: boolean;
    }[];
    buttons: {
        op: "approve" | "run" | "skip_motion";
        label: string;
        primary: boolean;
    }[];
    redo: boolean;
    media: {
        url: string;
        kind: "image" | "video" | "doc";
        caption: string;
    }[];
    checks: string[];
    cost?: string;
    error: string | null;
    href: string;
}
export interface FileCard {
    type: "file";
    url: string;
    kind: "video" | "image";
    caption: string;
}
export interface ReportCard {
    type: "report";
    report: ChatReport;
}
export type Card = ImageCard | ScriptCard | CopyCard | CheckCard | JobCard | FileCard | ReportCard;
export interface ActionView {
    id: string;
    tool: ChatTool;
    says: string;
    status: ChatAction["status"];
    error: string | null;
    note: string;
    cards: Card[];
}
export interface MessageView {
    id: string;
    role: "user" | "assistant";
    text: string;
    at: string;
    status: ChatMessageRow["status"];
    tags: {
        type: string;
        label: string;
    }[];
    actions: ActionView[];
    question: ChatQuestion | null;
    suggestions: string[];
    sources: string[];
    error: string | null;
    readBy: "rules" | "model";
    cost: number;
}
export interface ChatView {
    id: string;
    title: string;
    messages: MessageView[];
    busy: boolean;
}
export interface ChatListItem {
    id: string;
    title: string;
    at: string;
    busy: boolean;
}
export const emptyChatTags = () => ({ personas: [], products: [], offers: [], references: [], made: [] }) as {
    personas: string[];
    products: string[];
    offers: string[];
    references: string[];
    made: ChatMade[];
};
