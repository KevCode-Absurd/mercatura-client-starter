import type { ScriptKit } from "@/lib/builder/types";
import type { BriefPlan, BriefSetup, CreativeBrief } from "@/lib/creative-brief";
import type { Taste } from "@/lib/taste/types";
import type { VideoAudio } from "@/lib/video-audio";
import type { AvatarReferenceSnapshot } from "@/lib/production/types";
import { sql } from "drizzle-orm";
import type { ScriptSurfaces } from "@/lib/scripts/surface-types";
import type { ProductInPicture, ProductPlace } from "@/lib/product-in-picture";
import type { CompleteCopyRequirements, CompleteCopyReview } from "@/lib/evaluation/copy-repair";
import { integer, real, sqliteTable, text, index, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AwarenessStage, Beat, InsightType, Job, JobStatus, ObjectionClass, OutputType, SourceType, } from "@/lib/taxonomy";
import type { AdSnapshot, Brief, CheckResult, PageKind, PageStatus, Section, SourceKind } from "@/lib/landing/types";
const common = {
    brand_id: text("brand_id").notNull(),
    created_at: text("created_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updated_at: text("updated_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};
export interface Segment {
    label: string;
    role: "customer" | "agent" | "brand" | "meta";
    start: number;
    end: number;
}
export const brands = sqliteTable("brands", {
    id: text("id").primaryKey(),
    ...common,
    name: text("name").notNull(),
    dir: text("dir").notNull(),
    is_demo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    status: text("status").$type<"active" | "archived">().notNull().default("active"),
});
export interface PipelineStage {
    name: "parse" | "regex_redact" | "clean" | "name_redact" | "chunk";
    ms: number;
    llm_call_id?: string;
    note?: string;
    replacements?: {
        from: string;
        to: string;
    }[];
}
export interface ItemPipeline {
    raw_segments: Segment[];
    clean_segments: Segment[];
    stages: PipelineStage[];
    chunks: {
        start: number;
        end: number;
    }[];
    error?: string;
}
export const importBatches = sqliteTable("import_batches", {
    id: text("id").primaryKey(),
    ...common,
    source_type: text("source_type").$type<SourceType>().notNull(),
    origin: text("origin").notNull(),
    item_count: integer("item_count").notNull().default(0),
});
export const sourceItems = sqliteTable("source_items", {
    id: text("id").primaryKey(),
    ...common,
    source_type: text("source_type").$type<SourceType>().notNull(),
    date: text("date"),
    title: text("title"),
    raw_text: text("raw_text").notNull(),
    clean_text: text("clean_text").notNull(),
    redacted_text: text("redacted_text").notNull(),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown> & {
        segments: Segment[];
    }>().notNull(),
    persona_hint: text("persona_hint"),
    import_batch_id: text("import_batch_id").notNull(),
    extraction_status: text("extraction_status").$type<"pending" | "done" | "failed">().notNull().default("pending"),
    preprocess_status: text("preprocess_status").$type<"pending" | "done" | "failed">().notNull().default("done"),
    pipeline: text("pipeline", { mode: "json" }).$type<ItemPipeline | null>(),
    external_id: text("external_id"),
}, (t) => [index("source_items_type_idx").on(t.brand_id, t.source_type)]);
export const insights = sqliteTable("insights", {
    id: text("id").primaryKey(),
    ...common,
    source_item_id: text("source_item_id").notNull(),
    source_type: text("source_type").$type<SourceType>().notNull(),
    type: text("type").$type<InsightType>().notNull(),
    quote: text("quote").notNull(),
    char_start: integer("char_start").notNull(),
    char_end: integer("char_end").notNull(),
    persona_id: text("persona_id"),
    intensity: integer("intensity").notNull(),
    objection_class: text("objection_class").$type<ObjectionClass>(),
    awareness_stage: text("awareness_stage").$type<AwarenessStage>(),
    theme_id: text("theme_id"),
    note: text("note").notNull().default(""),
    beat: text("beat").$type<Beat | "guardrail">().notNull(),
    job: text("job").$type<Job>(),
    extraction_run_id: text("extraction_run_id"),
    match: text("match").$type<"exact" | "fuzzy" | "seed">().notNull().default("seed"),
}, (t) => [index("insights_item_idx").on(t.source_item_id), index("insights_theme_idx").on(t.theme_id)]);
export interface Guardrail {
    applies: boolean;
    rule: string;
    banned: string[];
}
export const themes = sqliteTable("themes", {
    id: text("id").primaryKey(),
    ...common,
    type: text("type").$type<InsightType>().notNull(),
    label: text("label").notNull(),
    summary: text("summary").notNull(),
    beat: text("beat").$type<Beat | "guardrail">().notNull(),
    frequency: integer("frequency").notNull(),
    intensity_avg: real("intensity_avg").notNull(),
    intensity_peak: integer("intensity_peak").notNull(),
    source_types: text("source_types", { mode: "json" }).$type<SourceType[]>().notNull(),
    personas: text("personas", { mode: "json" }).$type<string[]>().notNull(),
    objection_classes: text("objection_classes", { mode: "json" }).$type<ObjectionClass[]>().notNull(),
    score: real("score").notNull(),
    rank: integer("rank").notNull(),
    newest_date: text("newest_date"),
    locked: integer("locked", { mode: "boolean" }).notNull().default(false),
    guardrail: text("guardrail", { mode: "json" }).$type<Guardrail | null>(),
    insight_ids: text("insight_ids", { mode: "json" }).$type<string[]>().notNull(),
    angle_status: text("angle_status").$type<AngleStatus>().notNull().default("unrun"),
    angle_notes: text("angle_notes").notNull().default(""),
    angle_id: text("angle_id"),
});
export const ANGLE_STATUSES = ["unrun", "running", "dead"] as const;
export type AngleStatus = (typeof ANGLE_STATUSES)[number];
export interface DifferentiatorTest {
    claim: string;
    is_proposition: boolean;
    unavailable_to_competitors: boolean;
    moves_a_stranger: boolean;
}
export const concepts = sqliteTable("concepts", {
    id: text("id").primaryKey(),
    ...common,
    name: text("name").notNull(),
    persona_id: text("persona_id").notNull(),
    angle: text("angle").notNull(),
    offer_id: text("offer_id").notNull(),
    product_id: text("product_id"),
    awareness_stage: text("awareness_stage").$type<AwarenessStage>().notNull(),
    sophistication_stage: integer("sophistication_stage").notNull(),
    theme_ids: text("theme_ids", { mode: "json" }).$type<string[]>().notNull(),
    desire_evidence_theme_ids: text("desire_evidence_theme_ids", { mode: "json" }).$type<string[]>().notNull(),
    differentiator_test: text("differentiator_test", { mode: "json" }).$type<DifferentiatorTest>().notNull(),
    formats_planned: text("formats_planned", { mode: "json" }).$type<OutputType[]>().notNull(),
    status: text("status").$type<"draft" | "scripted" | "in_production" | "live" | "paused">().notNull(),
    meta_adset_name: text("meta_adset_name").notNull(),
    parent_concept_id: text("parent_concept_id"),
});
export interface ScriptLine {
    beat: Beat;
    text: string;
    theme_ids: string[];
    claim_ids: string[];
    visual_note?: string;
    on_screen?: string;
}
export interface HookGrades {
    clarity: number;
    relevance: number;
    novelty: number;
    specificity: number;
    credibility: number;
}
export interface HookVariant {
    id: string;
    type: string;
    text: string;
    grades: HookGrades;
    overlay?: string;
    first_frame?: string;
    replaces?: number;
    bridges?: {
        was: string;
        text: string;
    }[];
    whole?: boolean;
}
export interface AuditItem {
    check: string;
    status: "pass" | "warn" | "fail";
    message: string;
    line_index?: number;
    field_path?: string;
    offending_text?: string;
    source_ids?: string[];
    category?: string;
    smallest_correction?: string;
}
export interface HumanCheckOverride {
    at: string;
    stage: string;
    findings: AuditItem[];
}
export type ReferenceMode = "exact" | "structure" | "principles";
export interface VoiceIssue {
    pass?: "spoken" | "brand";
    where: "line" | "hook";
    index: number;
    field: "text" | "on_screen";
    phrase: string;
    why: string;
    fix: string;
    applied: boolean;
}
export interface VoiceCheck {
    status: "clean" | "fixed" | "suggested" | "skipped";
    model: string;
    summary: string;
    issues: VoiceIssue[];
    checks?: {
        check: string;
        label: string;
        ok: boolean;
        found: string[];
    }[];
    loops?: number;
    remaining?: string[];
    log?: string[];
    facts?: {
        where: string;
        quote: string;
        held: string;
        verdict: "held" | "stretched" | "invented" | "scene";
    }[];
    sources: string[];
    checked_at: string;
}
export interface ScriptAxes {
    check_overrides?: HumanCheckOverride[];
    length: string;
    length_chosen?: boolean;
    person: "first" | "second" | "third";
    tense: "past" | "present" | "future";
    entry: "accommodation" | "trigger_moment" | "failed_solution";
    story_shape: string;
    register: string;
    hook_type?: string;
    script_type?: string;
    emotion?: string;
    emotion_end?: string;
    native?: {
        arc: string;
        image: string;
        narrator: string;
        form?: string;
        length?: string;
    };
    claim_checks?: boolean;
    asked?: string;
    no_offer?: boolean;
    flow?: boolean;
    hooks?: number;
    variety?: number;
    taste?: Taste;
}
export const scripts = sqliteTable("scripts", {
    id: text("id").primaryKey(),
    ...common,
    concept_id: text("concept_id").notNull(),
    title: text("title").notNull(),
    version: integer("version").notNull().default(1),
    axes: text("axes", { mode: "json" }).$type<ScriptAxes>().notNull(),
    awareness_stage: text("awareness_stage").$type<AwarenessStage>().notNull(),
    format_target: text("format_target"),
    lines: text("lines", { mode: "json" }).$type<ScriptLine[]>().notNull(),
    hook_variants: text("hook_variants", { mode: "json" }).$type<HookVariant[]>().notNull(),
    load_bearing_beat: text("load_bearing_beat").$type<Beat>().notNull(),
    audit: text("audit", { mode: "json" }).$type<AuditItem[]>().notNull(),
    est_seconds: integer("est_seconds").notNull(),
    status: text("status").$type<"draft" | "approved" | "ready_for_handoff">().notNull(),
    similar_to: text("similar_to", { mode: "json" }).$type<{
        script_id: string;
        jaccard: number;
    } | null>(),
    notes: text("notes").notNull().default(""),
    test_plan: text("test_plan").notNull().default(""),
    reference_ids: text("reference_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    hook_variant_of: text("hook_variant_of"),
    theme_ids: text("theme_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
    model: text("model"),
    reference_mode: text("reference_mode").$type<ReferenceMode>(),
    voice_check: text("voice_check", { mode: "json" }).$type<VoiceCheck | null>(),
    alt_of: text("alt_of"),
    skills_used: text("skills_used", { mode: "json" }).$type<string[]>(),
    surfaces: text("surfaces", { mode: "json" }).$type<ScriptSurfaces | null>(),
    kit: text("kit", { mode: "json" }).$type<ScriptKit | null>(),
});
export interface ScriptSnapshot {
    title: string;
    lines: ScriptLine[];
    hook_variants: HookVariant[];
    audit: AuditItem[];
    est_seconds: number;
}
export const scriptVersions = sqliteTable("script_versions", {
    id: text("id").primaryKey(),
    ...common,
    script_id: text("script_id").notNull(),
    version: integer("version").notNull(),
    source: text("source").$type<"seed" | "generated" | "edit" | "repair" | "voice">().notNull(),
    snapshot: text("snapshot", { mode: "json" }).$type<ScriptSnapshot>().notNull(),
}, (t) => [index("script_versions_script_idx").on(t.script_id)]);
export interface JobAsset {
    check_override?: HumanCheckOverride;
    path: string;
    kind: "video" | "image" | "doc" | "text";
    caption?: string;
    qa?: {
        status: "pass" | "warn" | "fail";
        notes: string[];
    };
}
export interface PrepStage {
    file: string;
    panels: string[];
    frames?: StoryboardFrame[];
    selected: number;
    status: "draft" | "approved";
    feedback?: string;
}
export interface Scene {
    seconds: number;
    visual: string;
    dialogue: string;
    overlay: string;
    tone?: string;
    face?: string;
    shot?: string;
    size?: string;
    angle?: string;
    move?: string;
    focus?: string;
    place?: string;
    props?: string[];
}
export interface StoryFrame {
    moment: "key" | "end";
    at: number;
    description: string;
}
export interface StoryboardFrame extends StoryFrame {
    clip: number;
    prompt: string;
    file: string;
    stale?: boolean;
}
export interface CastOption {
    label: string;
    presenter?: Record<string, string>;
    character?: string;
    why?: string;
    portrait?: string;
}
export interface VideoPlan {
    title: string;
    visual_direction: string;
    cast: {
        presenter?: Record<string, string>;
        guest?: Record<string, string>;
        character?: string;
        setting: string;
        voice_direction: string;
        handling: "display" | "hold" | "use";
        product_details: string;
        camera?: string;
    };
    cast_options?: CastOption[];
    cast_choice?: number;
    props?: {
        name: string;
        look: string;
        place: string;
    }[];
    places?: {
        name: string;
        look: string;
    }[];
    product_parts?: {
        name: string;
        photo?: string;
    }[];
    segments: {
        scenes: Scene[];
        start?: string;
        end?: string;
        frames?: StoryFrame[];
        frames_for?: number;
        seconds?: number;
    }[];
    cut?: {
        min: number;
        pace?: "calm" | "normal" | "fast";
        cover?: boolean;
        montage?: boolean;
    };
    speech?: {
        rate: number;
        band?: string | null;
    };
    ad_copy?: ImagePlan["ad_copy"];
    theme_ids: string[];
    claim_ids: string[];
    notes: string;
}
export interface CardPlan {
    description: string;
    purpose: string;
    prompt: string;
    text_elements: {
        text: string;
        role: string;
        placement: string;
    }[];
}
export interface ImagePlan {
    title: string;
    archetype: string;
    concept: string;
    visual_direction: string;
    cards: CardPlan[];
    ad_copy: {
        primary_text: {
            short: string;
            medium: string;
            long: string;
        };
        headlines: string[];
        description: string;
        cta: string;
    };
    theme_ids: string[];
    claim_ids: string[];
    placeholders: string[];
    compliance_flags: string[];
}
export interface ClipState {
    index: number;
    status: "pending" | "submitting" | "submitted" | "completed" | "failed";
    prompt: string;
    refs?: {
        file: string;
        purpose: string;
    }[];
    provider_id?: string;
    file?: string;
    uploaded?: string;
    cost_usd?: number;
    error?: string;
}
export interface MotionEvent {
    start: number;
    end: number;
    kind: "label" | "badge" | "underline" | "logo";
    text: string;
    position: "top-left" | "top-right" | "middle-left" | "middle-right" | "lower-left" | "lower-right";
    foreground: string;
    background: string;
    purpose: string;
}
export interface ProductionState {
    check_overrides?: HumanCheckOverride[];
    workflow?: "guided" | "automatic";
    recipe: string;
    preset: string;
    aspect: string;
    resolution: string;
    segments: number;
    clip_seconds?: number;
    target_seconds?: number;
    script_clips?: {
        lengths: number[];
        seconds: number;
        left: number;
    };
    caption_lengths?: boolean;
    storyboard_frames?: number;
    cards: number;
    notes: string;
    hook_id?: string;
    avatar_id?: string;
    main_place?: string;
    avatar_reference?: AvatarReferenceSnapshot;
    product_id: string | null;
    reference_id: string | null;
    reference_mode?: ReferenceMode | null;
    plan_model?: string;
    product_in_picture?: ProductInPicture;
    product_place?: ProductPlace;
    taste?: Taste;
    format_look?: string;
    claim_checks?: boolean;
    context_used: Record<string, string[]>;
    skills_used: string[];
    brief_markdown?: string;
    image_plan?: ImagePlan;
    video_plan?: VideoPlan;
    plan_parts?: {
        key: string;
        head: unknown;
        segments: unknown[];
    };
    storyboard_parts?: {
        key: string;
        frames: StoryboardFrame[];
    };
    plan_status: "none" | "draft" | "approved";
    audit: AuditItem[];
    voice_check?: VoiceCheck;
    character?: PrepStage;
    look?: PrepStage;
    storyboard?: PrepStage;
    clips: ClipState[];
    prompts_ready?: {
        at: string;
        dir: string;
        why: string;
    };
    joined?: string;
    burn_captions?: boolean;
    video_audio?: VideoAudio;
    captioned?: string;
    motion?: {
        style: string;
        rationale: string;
        events: MotionEvent[];
        file?: string;
        status: "draft" | "rendered" | "skipped";
    };
    next: string;
    log: {
        at: string;
        step: string;
        message: string;
    }[];
}
export const mediaCalls = sqliteTable("media_calls", {
    id: text("id").primaryKey(),
    ...common,
    job_id: text("job_id"),
    provider: text("provider").$type<"openai" | "seedance" | "google">().notNull(),
    kind: text("kind").$type<"image" | "video">().notNull(),
    model: text("model").notNull(),
    purpose: text("purpose").notNull(),
    prompt: text("prompt").notNull(),
    request: text("request", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    provider_id: text("provider_id"),
    output_path: text("output_path"),
    cost_usd: real("cost_usd").notNull().default(0),
    duration_ms: integer("duration_ms").notNull().default(0),
    status: text("status").$type<"submitted" | "ok" | "error">().notNull(),
    error: text("error"),
}, (t) => [index("media_calls_job_idx").on(t.job_id)]);
export const outputJobs = sqliteTable("output_jobs", {
    id: text("id").primaryKey(),
    ...common,
    script_id: text("script_id").notNull(),
    output_type: text("output_type").$type<OutputType>().notNull(),
    skill: text("skill"),
    count: integer("count").notNull().default(1),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<JobStatus>().notNull(),
    assets: text("assets", { mode: "json" }).$type<JobAsset[]>().notNull(),
    review_notes: text("review_notes"),
    meta_ad_name: text("meta_ad_name"),
    tag: text("tag").$type<"replication" | "iteration" | "net_new">().notNull().default("net_new"),
    production: text("production", { mode: "json" }).$type<ProductionState | null>(),
    error: text("error"),
});
export const skillRuns = sqliteTable("skill_runs", {
    id: text("id").primaryKey(),
    ...common,
    skill: text("skill").notNull(),
    job_id: text("job_id"),
    input: text("input", { mode: "json" }).notNull(),
    output: text("output", { mode: "json" }),
    duration_ms: integer("duration_ms"),
    cost_usd: real("cost_usd"),
    status: text("status").$type<"ok" | "error">().notNull(),
});
export const jobs = sqliteTable("jobs", {
    id: text("id").primaryKey(),
    ...common,
    kind: text("kind").notNull(),
    ref_id: text("ref_id"),
    status: text("status").$type<"queued" | "running" | "done" | "failed" | "paused" | "stopped">().notNull(),
    progress: real("progress").notNull().default(0),
    error: text("error"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    control: text("control").$type<"pause" | "stop">(),
}, (t) => [index("jobs_activity_idx").on(t.status, t.kind, sql `datetime(${t.updated_at})`)]);
export const llmCalls = sqliteTable("llm_calls", {
    id: text("id").primaryKey(),
    ...common,
    task: text("task").notNull(),
    model: text("model").notNull(),
    ref_type: text("ref_type"),
    ref_id: text("ref_id"),
    attempt: integer("attempt").notNull().default(1),
    system_prompt: text("system_prompt").notNull(),
    user_prompt: text("user_prompt").notNull(),
    response_text: text("response_text"),
    input_tokens: integer("input_tokens").notNull().default(0),
    output_tokens: integer("output_tokens").notNull().default(0),
    cache_read_tokens: integer("cache_read_tokens").notNull().default(0),
    cache_write_tokens: integer("cache_write_tokens").notNull().default(0),
    cost_usd: real("cost_usd").notNull().default(0),
    duration_ms: integer("duration_ms").notNull().default(0),
    status: text("status").$type<"ok" | "invalid" | "refusal" | "error">().notNull(),
    error: text("error"),
}, (t) => [
    index("llm_calls_brand_idx").on(t.brand_id, t.created_at),
    index("llm_calls_ref_idx").on(t.ref_id),
    index("llm_calls_task_idx").on(t.task, t.status, t.created_at),
    index("llm_calls_ledger_idx").on(t.brand_id, t.task, t.model, t.status, t.input_tokens, t.cache_read_tokens, t.output_tokens, t.cost_usd, t.duration_ms),
]);
export interface DroppedQuote {
    quote: string;
    type: string;
    reason: "not_in_source" | "agent_line" | "duplicate" | "invalid";
    best_ratio?: number;
}
export interface FixedQuote {
    model_quote: string;
    source_quote: string;
    ratio: number;
}
export const extractionRuns = sqliteTable("extraction_runs", {
    id: text("id").primaryKey(),
    ...common,
    source_item_id: text("source_item_id").notNull(),
    chunk_index: integer("chunk_index").notNull(),
    llm_call_id: text("llm_call_id"),
    raw_output: text("raw_output", { mode: "json" }),
    kept: integer("kept").notNull().default(0),
    fixed: text("fixed", { mode: "json" }).$type<FixedQuote[]>().notNull(),
    dropped: text("dropped", { mode: "json" }).$type<DroppedQuote[]>().notNull(),
});
export interface RefStage {
    stage: string;
    confidence?: string;
    rationale?: string;
    adaptation?: string;
    evidence?: string[];
}
export const adReferences = sqliteTable("ad_references", {
    id: text("id").primaryKey(),
    ...common,
    sha256: text("sha256"),
    kind: text("kind").$type<"image" | "video">().notNull(),
    title: text("title").notNull(),
    width: integer("width"),
    height: integer("height"),
    duration: real("duration"),
    categories: text("categories", { mode: "json" }).$type<string[]>().notNull(),
    tags: text("tags", { mode: "json" }).$type<Record<string, string[]>>().notNull(),
    tags_raw: text("tags_raw", { mode: "json" }).$type<Record<string, string[]>>().notNull(),
    awareness: text("awareness", { mode: "json" }).$type<RefStage | null>(),
    sophistication: text("sophistication", { mode: "json" }).$type<RefStage | null>(),
    analysis: text("analysis", { mode: "json" }).$type<import("../lib/references/analysis").ReferenceAnalysis | null>(),
    analyzed: integer("analyzed", { mode: "boolean" }).notNull().default(false),
    media_path: text("media_path"),
    thumb_path: text("thumb_path"),
    remix_revision: integer("remix_revision"),
    synced_at: text("synced_at").notNull(),
    source: text("source").$type<"remix" | "user">().notNull().default("remix"),
    media_root: text("media_root").$type<"skills" | "data">().notNull().default("skills"),
    added_by_brand: text("added_by_brand"),
    notes: text("notes").notNull().default(""),
    title_locked: integer("title_locked", { mode: "boolean" }).notNull().default(false),
    analysis_status: text("analysis_status").$type<"none" | "queued" | "running" | "done" | "failed">().notNull().default("none"),
    analysis_error: text("analysis_error"),
}, (t) => [index("ad_references_kind_idx").on(t.kind)]);
export const referenceUses = sqliteTable("reference_uses", {
    brand_id: text("brand_id").notNull(),
    reference_key: text("reference_key").notNull(),
    use_key: text("use_key").notNull(),
    created_at: text("created_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [primaryKey({ columns: [t.brand_id, t.reference_key, t.use_key] })]);
export const settings = sqliteTable("settings", {
    brand_id: text("brand_id").notNull(),
    key: text("key").notNull(),
    value: text("value", { mode: "json" }).notNull(),
    updated_at: text("updated_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [primaryKey({ columns: [t.brand_id, t.key] })]);
export type LibraryKind = "pdp" | "photoshoot" | "ad";
export interface LibraryTags {
    works_for?: string[];
    subject?: string;
    lighting?: string;
    composition?: string;
    surface?: string[];
    mood?: string[];
    palette_hex?: string[];
    palette_name?: string;
    text_overlay?: string;
    product_format?: string;
    source?: string;
    owner_brand_id?: string;
    has_person?: boolean;
    bucket?: string;
}
export interface LibraryAnalysis {
    rebuild_prompt?: string;
    why_it_works?: string;
    light_setup?: string;
    camera?: string;
    set_build?: string;
    styling_notes?: string;
    watch_outs?: string[];
    hero_element?: string;
    layout?: string;
    text_roles?: {
        role: string;
        example: string;
        placement: string;
    }[];
    needs?: string[];
    type_notes?: string;
    color_notes?: string;
    format?: string;
    copy_lines?: string[];
    model?: string;
}
export const libraryRefs = sqliteTable("library_refs", {
    id: text("id").primaryKey(),
    library: text("library").$type<LibraryKind>().notNull(),
    file: text("file").notNull(),
    thumb: text("thumb"),
    vertical: text("vertical").notNull().default(""),
    type: text("type").notNull(),
    group_name: text("group_name"),
    brand: text("brand"),
    note: text("note").notNull().default(""),
    usable: integer("usable", { mode: "boolean" }).notNull().default(true),
    craft: integer("craft").notNull().default(3),
    width: integer("width"),
    height: integer("height"),
    tags: text("tags", { mode: "json" }).$type<LibraryTags>().notNull(),
    analysis: text("analysis", { mode: "json" }).$type<LibraryAnalysis | null>(),
    analyzed: integer("analyzed", { mode: "boolean" }).notNull().default(false),
    created_at: text("created_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [index("library_refs_lib_idx").on(t.library, t.type), index("library_refs_vertical_idx").on(t.library, t.vertical)]);
export interface StudioText {
    role: string;
    text: string;
    placement: string;
    source?: string;
}
export interface StudioItemPlan {
    title: string;
    argument: string;
    scene: string;
    layout: string;
    text_elements: StudioText[];
    prompt: string;
    prompt_stale?: boolean;
    prompt_edited?: boolean;
    copy_locked?: boolean;
    ratio_notes?: Record<string, string>;
    lesson_ids?: string[];
    adaptation: string;
    watch_outs: string[];
    alt_text: string;
    ad_copy?: {
        primary_text: string;
        headline: string;
        description: string;
        cta: string;
        more?: {
            medium: string;
            long: string;
            headlines: string[];
        };
    };
    buyer?: string;
    awareness?: string;
    picture?: {
        setting: string;
        light: string;
        camera: string;
    };
    product?: ProductPlace;
    product_stop?: "none" | "scene" | "clear" | "hero";
    product_spot?: string;
    hero?: "alone" | "in_place" | "in_hand";
    expression?: string;
    words_budget?: {
        words: number;
        lines: number;
        planned?: number;
    };
    words_cut?: string[];
    disclosures?: string[];
    person?: string;
    person_note?: string;
    figures?: {
        text: string;
        role: string;
        figure: string;
        status: "held" | "said_another_way" | "worked_out" | "not_found" | "story";
        held?: string;
        sum?: string;
        was?: string;
        note: string;
    }[];
    quote_notes?: string[];
    reference_read?: string;
    logo?: string;
    sense?: {
        status: "ok" | "fixed" | "check";
        notes: string[];
    };
}
export interface TextLayer {
    id: string;
    role: string;
    text: string;
    font: string;
    weight: number;
    size: number;
    color: string;
    x: number;
    y: number;
    w: number;
    align: "left" | "center" | "right";
    upper?: boolean;
    plate?: {
        color: string;
        shape: "pill" | "box";
    };
}
export interface PlacedLine {
    i: number;
    x: number;
    y: number;
    w: number;
    size: number;
    rows: number;
    color: string;
    align: "left" | "center" | "right";
    upper: boolean;
    weight: number;
    plate?: {
        color: string;
        shape: "pill" | "box";
    };
}
export interface StudioVariant {
    copy_status?: "approved" | "draft" | "unverified";
    copy_content_hash?: string;
    id: string;
    aspect: string;
    base_path: string;
    layers: TextLayer[];
    path?: string;
    from: "writer" | "editor";
    at: string;
}
export interface StudioOutput {
    copy_status?: "approved" | "draft" | "unverified";
    copy_content_hash?: string;
    repair?: {
        condition: "repaired";
        pair_id: string;
        source_run_id: string;
        decision: "retained-original" | "editable-text-layers" | "raster-edit-and-editable-text" | "raster-edit";
        import_key: string;
        manifest_sha256: string;
        image_sha256: string;
        source_image_sha256: string;
        copy_evidence_hash: string;
        copy_review_call_ids: string[];
        pixel_review_call_id: string;
        approval_path: string;
        editable_svg_path?: string;
        editable_layers_path?: string;
        editable_base_path?: string;
        artifact_hashes: Record<string, string>;
    };
    check_override?: HumanCheckOverride;
    selected?: boolean;
    aspect: string;
    path: string;
    version: number;
    layers?: TextLayer[];
    base_path?: string;
    placed?: PlacedLine[];
    qa?: {
        status: "pass" | "warn" | "fail";
        notes: string[];
    };
    texts?: {
        role: string;
        text: string;
    }[];
    changed_from?: number;
    fixed?: boolean;
}
export interface StudioItem {
    copy_review?: CompleteCopyReview;
    copy_draft_review?: CompleteCopyReview;
    copy_requirements?: CompleteCopyRequirements;
    copy_draft?: StaticAdCopy;
    id: string;
    ref_id: string | null;
    type: string;
    bucket?: string;
    label: string;
    reason: string;
    direction: string;
    plan?: StudioItemPlan;
    status: "chosen" | "planned" | "rendering" | "done" | "failed";
    outputs: StudioOutput[];
    variants?: StudioVariant[];
    error?: string;
    photo?: string;
    photo_extras?: string[];
    person?: string;
    avatar?: string;
    slot?: number;
    world?: string;
    mode?: string;
    archetype?: string;
    fidelity?: "exact" | "structure" | "loose";
    taste?: Taste;
    stage?: string;
    dealt_form?: string;
}
export const studioRuns = sqliteTable("studio_runs", {
    id: text("id").primaryKey(),
    ...common,
    kind: text("kind").$type<LibraryKind>().notNull(),
    product_id: text("product_id").notNull(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    aspects: text("aspects", { mode: "json" }).$type<string[]>().notNull(),
    status: text("status").$type<"draft" | "planning" | "planned" | "rendering" | "review" | "failed">().notNull().default("draft"),
    items: text("items", { mode: "json" }).$type<StudioItem[]>().notNull(),
    audit: text("audit", { mode: "json" }).$type<AuditItem[]>().notNull(),
    log: text("log", { mode: "json" }).$type<{
        at: string;
        message: string;
        check_override?: HumanCheckOverride;
    }[]>().notNull(),
    context: text("context", { mode: "json" }).$type<{
        skills: string[];
        fields: string[];
        models: Record<string, string>;
        image_model?: string;
        claims_cut?: {
            item: string;
            point: string;
        }[];
        product_images?: string[];
        world_refs?: string[];
        sprint?: string;
        claim_checks?: boolean;
        ad_review?: boolean;
        sources?: boolean;
        auto?: boolean;
        brand_refs?: string[];
        text_on_image?: boolean;
        no_offer?: boolean;
        feed_copy?: boolean;
        base_image?: boolean;
        reel?: boolean;
        reel_path?: string;
        product_in_picture?: ProductInPicture;
        variety?: number;
        fidelity?: "exact" | "structure" | "loose";
        taste?: Taste;
        stage?: string;
        surface?: string;
        format_look?: string;
        look_type?: "look" | "brand";
        from_script?: boolean;
        picture_quality?: "medium" | "high";
    }>().notNull(),
    error: text("error"),
}, (t) => [index("studio_runs_brand_idx").on(t.brand_id, t.kind)]);
export interface SprintOptions {
    aspects?: string[];
    formats?: string[];
    structures?: string[];
    text_on_image?: boolean;
    painted_words?: boolean;
    feed_copy?: boolean;
    cast?: boolean;
    claim_checks?: boolean;
    auto?: boolean;
    personas?: string[];
    looks?: Record<string, number>;
    taste?: Taste;
    picture_quality?: "medium" | "high";
    cast_brief?: {
        ages?: [
            number,
            number
        ];
        women?: number;
        from?: "anywhere" | "market";
        people?: string[];
    };
}
export interface StaticAdCopy {
    headline: string;
    body: string;
    primary_text: string;
    description: string;
    cta: string;
    approved_at?: string;
    approval_hash?: string;
}
export interface SprintAsset {
    file: string;
    product_id: string;
    type: "packshot" | "bundle" | "lifestyle" | "in_use" | "contents" | "infographic" | "merch" | "other";
    shows_pack: boolean;
    has_added_text: boolean;
    people: "none" | "adult" | "child";
    licensed_character: boolean;
    single_unit?: boolean;
    description: string;
    lead: boolean;
    extra: boolean;
}
export interface SprintAngle {
    id: string;
    name: string;
    line: string;
    persona: string;
    source: string;
}
export interface SprintSlot {
    casting?: {
        source: string;
        scene: string;
        description: string;
        setting: string;
        job?: string;
        previousJobs?: string[];
    };
    n: number;
    group: "scale" | "underused" | "angle" | "experimental";
    format: string;
    product_id: string;
    text_forward: boolean;
    angle: string;
    persona: string;
    awareness: string;
    hook: string;
    idea: string;
    layout: string;
    ref_id: string | null;
    look?: string;
    world?: string;
    form?: string;
    photo: string;
    person?: string;
    avatar?: string;
    set_id?: string;
    item_id?: string;
}
export type SprintStatus = "draft" | "planning" | "plan_ready" | "briefing" | "briefs_ready" | "rendering" | "done" | "failed";
export const sprints = sqliteTable("sprints", {
    id: text("id").primaryKey(),
    ...common,
    title: text("title").notNull(),
    size: integer("size").notNull(),
    split: text("split", { mode: "json" }).$type<Record<string, number>>().notNull(),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<SprintStatus>().notNull().default("draft"),
    stage: text("stage").$type<"plan" | "briefs" | "render">().notNull().default("plan"),
    assets: text("assets", { mode: "json" }).$type<SprintAsset[]>().notNull(),
    angles: text("angles", { mode: "json" }).$type<SprintAngle[]>().notNull(),
    slots: text("slots", { mode: "json" }).$type<SprintSlot[]>().notNull(),
    audit: text("audit", { mode: "json" }).$type<{
        level: "fail" | "warn";
        message: string;
        ads?: number[];
    }[]>().notNull(),
    options: text("options", { mode: "json" }).$type<SprintOptions>().notNull().default({}),
    set_ids: text("set_ids", { mode: "json" }).$type<string[]>().notNull(),
    log: text("log", { mode: "json" }).$type<{
        at: string;
        message: string;
    }[]>().notNull(),
    approved: text("approved", { mode: "json" }).$type<{
        plan?: string;
        briefs?: string;
        check_overrides?: HumanCheckOverride[];
    }>().notNull(),
    error: text("error"),
}, (t) => [index("sprints_brand_idx").on(t.brand_id)]);
export const founderAnswers = sqliteTable("founder_answers", {
    brand_id: text("brand_id").notNull(),
    question_id: text("question_id").notNull(),
    answer: text("answer").notNull().default(""),
    skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
    updated_at: text("updated_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => [primaryKey({ columns: [t.brand_id, t.question_id] })]);
export const feedback = sqliteTable("feedback", {
    id: text("id").primaryKey(),
    ...common,
    ref_type: text("ref_type").$type<"studio" | "job" | "script" | "brand" | "landing">().notNull(),
    ref_id: text("ref_id").notNull().default(""),
    item_id: text("item_id"),
    asset: text("asset"),
    product_id: text("product_id"),
    text: text("text").notNull(),
    via: text("via").$type<"typed" | "voice">().notNull().default("typed"),
    action: text("action").$type<"remake" | "note">().notNull().default("note"),
    lesson_ids: text("lesson_ids", { mode: "json" }).$type<string[]>().notNull(),
    summary: text("summary").notNull().default(""),
    status: text("status").$type<"logged" | "learned" | "nothing" | "failed">().notNull().default("logged"),
    error: text("error"),
}, (t) => [index("feedback_brand_idx").on(t.brand_id, t.created_at)]);
export const checkFailures = sqliteTable("check_failures", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ...common,
    area: text("area").$type<"words" | "pictures" | "video">().notNull(),
    point: text("point").notNull(),
    note: text("note").notNull(),
    lesson_id: text("lesson_id"),
    ref_type: text("ref_type").notNull(),
    ref_id: text("ref_id").notNull().default(""),
    item_id: text("item_id"),
    product_id: text("product_id"),
    handled: text("handled").$type<"learned" | "dismissed">(),
}, (t) => [index("check_failures_brand_idx").on(t.brand_id, t.handled, t.area, t.point)]);
export interface HandEditChange {
    kind: "cut" | "swap" | "shorter" | "number" | "case";
    tag?: string;
    from: string;
    to: string;
}
export const handEdits = sqliteTable("hand_edits", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ...common,
    script_id: text("script_id").notNull(),
    surface: text("surface").notNull(),
    line: integer("line"),
    before: text("before").notNull(),
    after: text("after").notNull(),
    changes: text("changes", { mode: "json" }).$type<HandEditChange[]>().notNull(),
}, (t) => [index("hand_edits_brand_idx").on(t.brand_id, t.id)]);
export const handEditAsks = sqliteTable("hand_edit_asks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ...common,
    key: text("key").notNull(),
    rule: text("rule").notNull().default(""),
    status: text("status").$type<"open" | "open_general" | "learned" | "dismissed">().notNull().default("open"),
    lesson_id: text("lesson_id"),
    upto: integer("upto").notNull().default(0),
}, (t) => [uniqueIndex("hand_edit_asks_key_idx").on(t.brand_id, t.key)]);
export interface AskTags {
    personas: string[];
    products: string[];
    offers: string[];
    references: string[];
    stage?: AwarenessStage | null;
    angle?: string | null;
}
export type AskKind = "image_ads" | "product_page" | "photoshoot" | "scripts" | "unknown";
export interface AskIntent {
    kind: AskKind;
    count: number;
    product_id: string | null;
    persona_ids: string[];
    offer_id: string | null;
    concept_id: string | null;
    reference_id: string | null;
    reference_mode: "exact" | "structure" | "principles" | null;
    length: "15s" | "30s" | "60s" | "2-3m" | "5-10m" | "10m" | null;
    aspects: string[];
    audience: string;
    brief: string;
    title: string;
    claim_checks?: boolean | null;
    hooks?: number | null;
    taste?: Taste;
    look?: string | null;
    format_id?: string | null;
    layout_type?: string | null;
    skill?: string | null;
    stage?: AwarenessStage | null;
    angle_id?: string | null;
}
export interface AskQuestion {
    field: "kind" | "product";
    text: string;
    options: {
        value: string;
        label: string;
    }[];
}
export interface AskResult {
    set_id?: string;
    concept_id?: string;
    script_ids?: string[];
    note?: string;
}
export type ChatTool = "make_images" | "change_image" | "write_scripts" | "change_script" | "write_copy" | "check_claims" | "make_from_script" | "job_step" | "join_clips" | "write_hooks" | "make_hook_clip" | "build_offers" | "plan_sprint" | "audit_page" | "audit_gaps" | "print_guide" | "founder_questions" | "draft_page" | "transpose_script" | "list_angles" | "list_hooks" | "organic_plan" | "video_editor";
export interface ChatMade {
    type: "set" | "image" | "script" | "job";
    id: string;
    item?: string;
}
export interface ChatTags extends AskTags {
    made: ChatMade[];
    format?: string | null;
    skill?: string | null;
    stage?: AwarenessStage | null;
}
export interface ChatCheck {
    about: string;
    checked: number;
    issues: {
        where: string;
        text: string;
        severity: "fail" | "warn";
        problem: string;
    }[];
    note?: string;
}
export interface ChatActionResult {
    set_id?: string;
    item_ids?: string[];
    concept_id?: string;
    script_ids?: string[];
    job_ids?: string[];
    copy?: {
        what: string;
        options: {
            text: string;
            angle: string;
            notes?: string[];
        }[];
    };
    check?: ChatCheck;
    file?: {
        path: string;
        kind: "video" | "image";
        seconds?: number;
    };
    reference_id?: string;
    offer_ids?: string[];
    sprint_id?: string;
    page_id?: string;
    report?: ChatReport;
    note?: string;
}
export interface ChatReport {
    title: string;
    summary: string;
    sections: {
        heading: string;
        lines: string[];
    }[];
    links: {
        label: string;
        href: string;
    }[];
    asks: string[];
}
export interface ChatAction {
    id: string;
    tool: ChatTool;
    says: string;
    args: Record<string, unknown>;
    status: "waiting" | "running" | "done" | "failed";
    result: ChatActionResult;
    error?: string;
}
export interface ChatQuestion {
    text: string;
    options: string[];
}
export const chats = sqliteTable("chats", {
    id: text("id").primaryKey(),
    ...common,
    title: text("title").notNull().default("New chat"),
    title_locked: integer("title_locked", { mode: "boolean" }).notNull().default(false),
}, (t) => [index("chats_brand_idx").on(t.brand_id, t.updated_at)]);
export const chatMessages = sqliteTable("chat_messages", {
    id: text("id").primaryKey(),
    ...common,
    chat_id: text("chat_id").notNull(),
    seq: integer("seq").notNull(),
    role: text("role").$type<"user" | "assistant">().notNull(),
    text: text("text").notNull().default(""),
    via: text("via").$type<"typed" | "voice">().notNull().default("typed"),
    tags: text("tags", { mode: "json" }).$type<ChatTags>().notNull(),
    status: text("status").$type<"thinking" | "working" | "done" | "failed" | "stopped">().notNull().default("done"),
    actions: text("actions", { mode: "json" }).$type<ChatAction[]>().notNull(),
    question: text("question", { mode: "json" }).$type<ChatQuestion | null>(),
    suggestions: text("suggestions", { mode: "json" }).$type<string[]>().notNull(),
    sources: text("sources", { mode: "json" }).$type<string[]>().notNull(),
    read_by: text("read_by").$type<"rules" | "model">().notNull().default("rules"),
    error: text("error"),
}, (t) => [index("chat_messages_chat_idx").on(t.chat_id, t.seq)]);
export type ChatRow = typeof chats.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export const landingPages = sqliteTable("landing_pages", {
    id: text("id").primaryKey(),
    ...common,
    title: text("title").notNull(),
    kind: text("kind").$type<PageKind>().notNull(),
    status: text("status").$type<PageStatus>().notNull().default("draft"),
    source: text("source", { mode: "json" }).$type<{
        kind: SourceKind;
        ref: string | null;
        label: string;
    }>().notNull(),
    product_id: text("product_id").notNull(),
    persona_id: text("persona_id"),
    offer_id: text("offer_id"),
    ad: text("ad", { mode: "json" }).$type<AdSnapshot | null>(),
    brief: text("brief", { mode: "json" }).$type<Brief>().notNull(),
    sections: text("sections", { mode: "json" }).$type<Section[]>().notNull(),
    checks: text("checks", { mode: "json" }).$type<CheckResult[]>().notNull(),
    parent_id: text("parent_id"),
    variant_note: text("variant_note").notNull().default(""),
    writer: text("writer").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    capture_id: text("capture_id"),
    log: text("log", { mode: "json" }).$type<{
        at: string;
        message: string;
    }[]>().notNull(),
    error: text("error"),
}, (t) => [index("landing_pages_brand_idx").on(t.brand_id, t.created_at)]);
export const siteScans = sqliteTable("site_scans", {
    id: text("id").primaryKey(),
    ...common,
    kind: text("kind").$type<"capture" | "audit" | "speed" | "security">().notNull(),
    url: text("url").notNull(),
    page_id: text("page_id"),
    status: text("status").$type<"queued" | "running" | "done" | "failed">().notNull().default("queued"),
    result: text("result", { mode: "json" }).$type<Record<string, unknown> | null>(),
    error: text("error"),
}, (t) => [index("site_scans_brand_idx").on(t.brand_id, t.kind, t.created_at)]);
const stamps = {
    created_at: text("created_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updated_at: text("updated_at").notNull().default(sql `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};
export const inspectNotes = sqliteTable("inspect_notes", {
    id: text("id").primaryKey(),
    ...stamps,
    kind: text("kind").$type<"step" | "block" | "call" | "answer" | "file" | "media">().notNull(),
    task: text("task"),
    part: text("part").$type<"system" | "user">(),
    block: text("block"),
    call_id: text("call_id"),
    file: text("file"),
    text: text("text").notNull(),
    status: text("status").$type<"open" | "done">().notNull().default("open"),
    resolution: text("resolution").notNull().default(""),
}, (t) => [index("inspect_notes_task_idx").on(t.task), index("inspect_notes_file_idx").on(t.file)]);
export const instructionEdits = sqliteTable("instruction_edits", {
    id: text("id").primaryKey(),
    ...stamps,
    file: text("file").notNull(),
    before: text("before").notNull(),
    after: text("after").notNull(),
    note: text("note").notNull().default(""),
    source: text("source").$type<"hand" | "feedback" | "tighten" | "restore">().notNull().default("hand"),
    by: text("by").notNull().default(""),
}, (t) => [index("instruction_edits_file_idx").on(t.file, t.created_at)]);
export const skillProposals = sqliteTable("skill_proposals", {
    id: text("id").primaryKey(),
    ...stamps,
    file: text("file").notNull(),
    source: text("source").$type<"feedback" | "tighten">().notNull(),
    brand_id: text("brand_id").notNull().default(""),
    feedback_id: text("feedback_id"),
    said: text("said").notNull().default(""),
    summary: text("summary").notNull().default(""),
    before: text("before").notNull(),
    after: text("after").notNull(),
    patch: text("patch", { mode: "json" }).$type<SkillPatch | null>(),
    status: text("status").$type<"open" | "accepted" | "rejected" | "failed">().notNull().default("open"),
    error: text("error").notNull().default(""),
    edit_id: text("edit_id"),
    decided_at: text("decided_at"),
    decided_by: text("decided_by").notNull().default(""),
    cost_usd: real("cost_usd").notNull().default(0),
}, (t) => [index("skill_proposals_status_idx").on(t.status, t.created_at), index("skill_proposals_file_idx").on(t.file)]);
export interface SkillPatch {
    op: "add" | "replace";
    heading: string;
    old: string;
    text: string;
}
export type SkillProposalRow = typeof skillProposals.$inferSelect;
export type InspectNoteRow = typeof inspectNotes.$inferSelect;
export type InstructionEditRow = typeof instructionEdits.$inferSelect;
export type LandingPageRow = typeof landingPages.$inferSelect;
export type SiteScanRow = typeof siteScans.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
export type SourceItemRow = typeof sourceItems.$inferSelect;
export type FounderAnswerRow = typeof founderAnswers.$inferSelect;
export type LibraryRefRow = typeof libraryRefs.$inferSelect;
export type StudioRunRow = typeof studioRuns.$inferSelect;
export type SprintRow = typeof sprints.$inferSelect;
export type BrandRow = typeof brands.$inferSelect;
export type LlmCallRow = typeof llmCalls.$inferSelect;
export type ExtractionRunRow = typeof extractionRuns.$inferSelect;
export type AdReferenceRow = typeof adReferences.$inferSelect;
export type InsightRow = typeof insights.$inferSelect;
export type ThemeRow = typeof themes.$inferSelect;
export type ConceptRow = typeof concepts.$inferSelect;
export type ScriptRow = typeof scripts.$inferSelect;
export type OutputJobRow = typeof outputJobs.$inferSelect;
export type ScriptVersionRow = typeof scriptVersions.$inferSelect;
export type MediaCallRow = typeof mediaCalls.$inferSelect;
export type HandEditRow = typeof handEdits.$inferSelect;
export type HandEditAskRow = typeof handEditAsks.$inferSelect;
export interface ComplianceFinding {
    policy: string;
    name: string;
    url: string;
    severity: "reject" | "restriction" | "warning";
    where: string;
    problem: string;
    fix: string;
}
export type ComplianceVerdict = "ready" | "fix" | "rejected";
export const complianceChecks = sqliteTable("compliance_checks", {
    id: text("id").primaryKey(),
    ...common,
    kind: text("kind").$type<"copy" | "script" | "image" | "video">().notNull(),
    ref: text("ref").notNull().default(""),
    summary: text("summary").notNull().default(""),
    verdict: text("verdict").$type<ComplianceVerdict>().notNull(),
    findings: text("findings", { mode: "json" }).$type<ComplianceFinding[]>().notNull(),
    passed: text("passed", { mode: "json" }).$type<string[]>().notNull().default([]),
    model: text("model").notNull().default(""),
    cost_usd: real("cost_usd").notNull().default(0),
    policies_read_at: text("policies_read_at").notNull().default(""),
}, (t) => [index("compliance_checks_brand_idx").on(t.brand_id, t.created_at)]);
export type ComplianceCheckRow = typeof complianceChecks.$inferSelect;
export const creativeBriefPlans = sqliteTable("creative_brief_plans", {
    id: text("id").primaryKey(),
    ...common,
    setup: text("setup", { mode: "json" }).$type<BriefSetup>().notNull(),
    plan: text("plan", { mode: "json" }).$type<BriefPlan>().notNull(),
    preview: integer("preview", { mode: "boolean" }).notNull().default(false),
    approved_ids: text("approved_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
}, (t) => [index("creative_brief_plans_brand_idx").on(t.brand_id)]);
export type CreativeBriefPlanRow = typeof creativeBriefPlans.$inferSelect;
export const conceptBriefs = sqliteTable("concept_briefs", {
    concept_id: text("concept_id").primaryKey().references(() => concepts.id, { onDelete: "cascade" }),
    brand_id: text("brand_id").notNull(),
    brief: text("brief", { mode: "json" }).$type<CreativeBrief>().notNull(),
}, (t) => [index("concept_briefs_brand_idx").on(t.brand_id)]);
