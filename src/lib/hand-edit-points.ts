import { noteChoice, noteEdits, type HandEdit } from "./hand-edits";
export const PLAN_FIELDS: Record<string, string> = { prompt: "image_prompt", text_elements: "image_text", cast: "cast", cast_options: "cast", dialogue: "line", overlay: "on_screen" };
interface ItemLike {
    id: string;
    direction?: string;
    plan?: {
        text_elements?: {
            text: string;
        }[];
        prompt?: string;
        scene?: string;
        ad_copy?: {
            primary_text?: string;
            headline?: string;
            description?: string;
            cta?: string;
        } | null;
    } | null;
}
interface RunLike {
    id: string;
    brand_id: string;
    items: ItemLike[];
}
export function noteStudioEdits(was: RunLike, now: RunLike, itemId: string): void {
    try {
        const a = was.items.find((i) => i.id === itemId);
        const b = now.items.find((i) => i.id === itemId);
        if (!a || !b)
            return;
        const edits: HandEdit[] = [];
        const add = (surface: string, before: string | undefined, after: string | undefined, line?: number) => {
            if (before !== undefined && after !== undefined)
                edits.push({ surface, before, after, line });
        };
        const ta = a.plan?.text_elements ?? [];
        const tb = b.plan?.text_elements ?? [];
        if (ta.length === tb.length)
            ta.forEach((t, i) => add("image_text", t.text, tb[i].text, i));
        const wordsChanged = JSON.stringify(ta.map((t) => t.text)) !== JSON.stringify(tb.map((t) => t.text));
        for (const k of ["primary_text", "headline", "description", "cta"] as const)
            add(k, a.plan?.ad_copy?.[k], b.plan?.ad_copy?.[k]);
        add("image_scene", a.plan?.scene, b.plan?.scene);
        add("image_scene", a.direction, b.direction);
        if (!wordsChanged)
            add("image_prompt", a.plan?.prompt, b.plan?.prompt);
        if (edits.length)
            noteEdits(was.brand_id, `${was.id}:${itemId}`, edits);
    }
    catch {
    }
}
interface JobLike {
    id: string;
    brand_id: string;
    production?: {
        video_plan?: {
            cast_choice?: number;
            cast_options?: {
                label: string;
                why?: string;
            }[];
        } | null;
    } | null;
}
export function noteCastChoice(was: JobLike, index: number): void {
    try {
        const plan = was.production?.video_plan;
        const say = (o?: {
            label: string;
            why?: string;
        }) => (o ? [o.label, o.why].filter(Boolean).join(": ") : "");
        const from = plan?.cast_choice ?? 0;
        if (plan?.cast_options?.[index] && from !== index)
            noteChoice(was.brand_id, was.id, "cast_choice", say(plan.cast_options[from]), say(plan.cast_options[index]));
    }
    catch {
    }
}
