export type Provider = "claude" | "gemini" | "openai" | "deepseek";
export type Tier = "frontier" | "mid" | "small";
export interface ModelInfo {
    id: string;
    name: string;
    family: string;
    version: string;
    provider: Provider;
    tier: Tier;
    vision: boolean;
    price: [
        number,
        number,
        number
    ];
}
export const MODELS: ModelInfo[] = [
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", family: "line:gpt-sol", version: "6.1", provider: "openai", tier: "frontier", vision: true, price: [2, 10, 0.1] },
    { id: "claude-fable-5-1", name: "Claude Fable 5.1", family: "line:claude-fable", version: "5.1", provider: "claude", tier: "frontier", vision: true, price: [10, 50, 0.25] },
    { id: "claude-opus-5-5", name: "Claude Opus 5.5", family: "line:claude-opus", version: "5.5", provider: "claude", tier: "frontier", vision: true, price: [4, 20, 0.2] },
    { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", family: "line:claude-sonnet", version: "5.5", provider: "claude", tier: "mid", vision: true, price: [2, 10, 0.1] },
    { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", family: "line:claude-haiku", version: "5.5", provider: "claude", tier: "small", vision: true, price: [0.1, 0.5, 0.01] },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", family: "line:claude-haiku", version: "4.5", provider: "claude", tier: "small", vision: true, price: [1, 5, 0.1] },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", family: "line:gemini-pro", version: "3.1", provider: "gemini", tier: "frontier", vision: true, price: [2, 12, 0.2] },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", family: "line:gemini-flash", version: "3.8", provider: "gemini", tier: "mid", vision: true, price: [0.75, 3.75, 0.075] },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", family: "line:gemini-flash-lite", version: "3.5", provider: "gemini", tier: "small", vision: true, price: [0.3, 2.5, 0.03] },
    { id: "gpt-6-sol", name: "GPT-6 Sol", family: "line:gpt-sol", version: "6", provider: "openai", tier: "frontier", vision: true, price: [2, 10, 0.2] },
    { id: "gpt-6-luna", name: "GPT-6 Luna", family: "line:gpt-luna", version: "6", provider: "openai", tier: "small", vision: true, price: [0.1, 0.5, 0.01] },
    { id: "gpt-6-astra", name: "GPT-6 Astra", family: "line:gpt-astra", version: "6", provider: "openai", tier: "frontier", vision: true, price: [10, 50, 1] },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", family: "line:deepseek-pro", version: "V4", provider: "deepseek", tier: "frontier", vision: false, price: [1.32, 3.96, 0.044] },
    { id: "deepseek-flash", name: "DeepSeek Flash", family: "line:deepseek-flash", version: "", provider: "deepseek", tier: "small", vision: true, price: [0.3, 1.2, 0.006] },
];
const FAMILY_NAME: Record<string, string> = {
    "line:gpt-sol": "GPT Sol",
    "line:gpt-luna": "GPT Luna",
    "line:gpt-astra": "GPT Astra",
    "line:claude-fable": "Claude Fable",
    "line:claude-opus": "Claude Opus",
    "line:claude-sonnet": "Claude Sonnet",
    "line:claude-haiku": "Claude Haiku",
    "line:gemini-pro": "Gemini Pro",
    "line:gemini-flash": "Gemini Flash",
    "line:gemini-flash-lite": "Gemini Flash-Lite",
    "line:deepseek-pro": "DeepSeek Pro",
    "line:deepseek-flash": "DeepSeek Flash",
};
export interface Family {
    id: string;
    name: string;
    provider: Provider;
    versions: ModelInfo[];
}
export const FAMILIES: Family[] = [...new Set(MODELS.map((m) => m.family))].map((id) => {
    const versions = MODELS.filter((m) => m.family === id);
    return { id, name: FAMILY_NAME[id] ?? id, provider: versions[0].provider, versions };
});
export const familyInfo = (id: string): Family | undefined => FAMILIES.find((f) => f.id === id);
export const latestOf = (family: string): ModelInfo | undefined => familyInfo(family)?.versions[0];
export const resolveModel = (choice: string): string => latestOf(choice)?.id ?? choice;
export const TIER_LABEL: Record<Tier, string> = { frontier: "Frontier", mid: "Mid", small: "Small and fast" };
export const PROVIDER_LABEL: Record<Provider, string> = { claude: "Anthropic", gemini: "Google", openai: "OpenAI", deepseek: "DeepSeek" };
export const PROVIDER_KEY: Record<Provider, string> = { claude: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", deepseek: "DEEPSEEK_API_KEY" };
export const modelInfo = (id: string): ModelInfo | undefined => {
    const model = resolveModel(id);
    return MODELS.find((m) => m.id === model) ?? MODELS.find((m) => model.startsWith(m.id.replace(/-\d{8}$|-preview$/, "")));
};
export const modelName = (id: string) => modelInfo(id)?.name ?? id;
export const tierOf = (id: string): Tier => modelInfo(id)?.tier ?? "frontier";
