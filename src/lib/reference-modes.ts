import { MODELS, modelName } from "./llm/models";
import type { ReferenceMode } from "@/db/schema";
export const REFERENCE_MODES: {
    id: ReferenceMode;
    label: string;
    short: string;
    help: string;
}[] = [
    {
        id: "exact",
        label: "Same ad, new format",
        short: "Exact",
        help: "Keeps the reference's words, shots and timing as they are and only changes the format (claymation, carousel, static...). Nothing is rewritten. Use it for your own ads.",
    },
    {
        id: "structure",
        label: "Keep the structure",
        short: "Structure",
        help: "Reads the reference step by step and redoes each step with what does the same job for your brand: your product, research and approved claims. A step that does not fit your brand is changed or dropped.",
    },
    {
        id: "principles",
        label: "Loose inspiration",
        short: "Principles",
        help: "Takes only why the ad worked. The script is built from your research with our own structure, using those principles as the base.",
    },
];
export const DEFAULT_REFERENCE_MODE: ReferenceMode = "structure";
export const referenceModeLabel = (m: ReferenceMode | null | undefined) => REFERENCE_MODES.find((x) => x.id === m)?.label ?? "";
export const isUploadedScript = (s: {
    reference_mode?: ReferenceMode | null;
    reference_ids: string[];
}) => s.reference_mode === "exact" && s.reference_ids.length === 0;
export const DEFAULT_SCRIPT_MODEL = "default";
export const SCRIPT_MODELS: {
    id: string;
    label: string;
}[] = MODELS.map((m) => ({ id: m.id, label: m.name }));
export const modelLabel = (id: string | null | undefined) => (id ? modelName(id) : "");
export const PLAN_MODELS = [
    { id: "gpt-6-sol", label: "GPT-6 Sol" },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5" },
    { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
] as const;
export const SHOT_PLAN_MODELS = PLAN_MODELS.filter((m) => m.id !== "claude-opus-5-5");
