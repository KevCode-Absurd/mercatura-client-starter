import type { OutputType } from "../taxonomy";
export interface NewHook {
    id: string;
    device: string;
    spoken: string;
    on_screen: string;
    visual: string;
    seconds: number;
    joins: string;
    check: {
        ok: boolean;
        note: string;
    } | null;
    notes?: string[];
    script_id?: string;
    job_id?: string;
}
export interface HookSet {
    at: string;
    model: string;
    original: {
        ends_at: number;
        spoken: string;
        on_screen: string;
        visual: string;
        device: string;
        works: string;
    };
    body: {
        first_line: string;
        speaker: string;
        promise: string;
    };
    hooks: NewHook[];
}
export const MIN_HOOKS = 3;
export const MAX_HOOKS = 8;
export const HOOK_SECONDS = 5;
export const HOOK_TYPES = ["ai_ugc", "ai_podcast", "ai_talking_object", "ai_claymation", "ai_satisfying"] as const satisfies readonly OutputType[];
