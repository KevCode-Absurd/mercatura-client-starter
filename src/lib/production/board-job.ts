import type { OutputJobRow, ProductionState } from "@/db/schema";
export function boardJob(j: OutputJobRow): OutputJobRow {
    if (!j.production)
        return j;
    const p = j.production;
    const { brief_markdown: _brief, voice_check: _voice, plan_parts: _parts, storyboard_parts: _sparts, ...rest } = p;
    const production: ProductionState = {
        ...rest,
        log: [],
        context_used: {},
        storyboard: p.storyboard ? { ...p.storyboard, frames: p.storyboard.frames ? [] : undefined } : p.storyboard,
        video_plan: p.video_plan
            ? (() => {
                const { ad_copy: _copy, cast_options: _options, props: _props, places: _places, ...plan } = p.video_plan;
                return { ...plan, notes: "", visual_direction: "", cast: { ...plan.cast, setting: "", voice_direction: "", product_details: "" } };
            })()
            : p.video_plan,
    };
    return { ...j, payload: {}, review_notes: j.review_notes ? j.review_notes.slice(0, 200) : j.review_notes, production };
}
