import { DEFAULT_WEIGHTS, type RankWeights } from "./ranking";
import { DEFAULT_AD_TEMPLATE, DEFAULT_ADSET_TEMPLATE } from "./naming";
import { DEFAULT_VOICE, type VoiceProfile } from "./scripts/voice-rules";
import type { StepChoices } from "./llm/steps";
import { OUTPUT_INFO, OUTPUT_TYPES, type OutputType, type SourceType } from "./taxonomy";
export type ColumnMapping = Record<string, string>;
export interface PlannerDefaults {
    monthly_spend: number;
    monthly_new_customer_revenue_target: number;
    avg_lifetime_spend_per_ad: number;
    avg_roas_7d_click: number;
    gross_margin: number;
    cost_per_ad: Record<OutputType, number>;
}
export interface SettingsShape {
    rank_weights: RankWeights;
    naming: {
        adset: string;
        ad: string;
    };
    skill_map: Record<OutputType, string | null>;
    market: {
        currency: string;
        accent: string;
        words_per_second: number;
    };
    planner: PlannerDefaults;
    import_mappings: Partial<Record<SourceType, ColumnMapping>>;
    voice: VoiceProfile;
    checks: {
        claims: boolean;
        ad_review: boolean;
    };
    brain_learning: {
        auto: boolean;
    };
    steps: StepChoices;
    impact: {
        usd_per_piece: number;
        hours_per_piece: number;
    };
}
export const SETTING_DEFAULTS: SettingsShape = {
    rank_weights: DEFAULT_WEIGHTS,
    naming: { adset: DEFAULT_ADSET_TEMPLATE, ad: DEFAULT_AD_TEMPLATE },
    skill_map: Object.fromEntries(OUTPUT_TYPES.map((t) => [t, OUTPUT_INFO[t].defaultSkill])) as Record<OutputType, string | null>,
    market: { currency: "", accent: "", words_per_second: 2.6 },
    planner: {
        monthly_spend: 0,
        monthly_new_customer_revenue_target: 0,
        avg_lifetime_spend_per_ad: 0,
        avg_roas_7d_click: 0,
        gross_margin: 0,
        cost_per_ad: {
            human_brief_ugc: 0,
            human_brief_founder: 0,
            human_brief_editor: 0,
            ai_ugc: 0,
            ai_cinematic: 0,
            ai_claymation: 0,
            ai_vsl: 0,
            ai_podcast: 0,
            ai_talking_object: 0,
            ai_comic: 0,
            ai_explainer: 0,
            ai_satisfying: 0,
            ai_watercolor: 0,
            ai_motion_graphics: 0,
            ai_anime: 0,
            ai_wool: 0,
            ai_skeleton: 0,
            ai_song: 0,
            ai_collage: 0,
            ai_paper: 0,
            ai_clay_world: 0,
            ai_cinematic_3d: 0,
            static_image: 0,
            static_long_copy: 0,
            static_advertorial: 0,
            carousel: 0,
        },
    },
    import_mappings: {},
    voice: DEFAULT_VOICE,
    checks: { claims: true, ad_review: true },
    brain_learning: { auto: false },
    steps: {},
    impact: { usd_per_piece: 0, hours_per_piece: 0 },
};
