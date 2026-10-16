export const PERSONA_AWARENESS = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] as const;
export type PersonaAwareness = (typeof PERSONA_AWARENESS)[number];
export const AWARENESS_LABEL: Record<PersonaAwareness, string> = { unaware: "Doesn't know the problem yet", problem_aware: "Knows the problem", solution_aware: "Comparing kinds of solution", product_aware: "Knows this product", most_aware: "Ready to buy" };
export type PersonaSource = "documents" | "data" | "hand" | "offer";
export const SOURCE_LABEL: Record<PersonaSource, string> = { documents: "From the brand's documents", data: "Built from performance data", hand: "Written by hand", offer: "From a product repositioning" };
export interface PersonaPerformance {
    simulated: boolean;
    period: string;
    segment: string;
    spend: number;
    purchases: number;
    revenue: number;
    spend_share: number;
    cpa: number;
    roas: number;
    aov: number;
}
export interface DoubtPair {
    doubt: string;
    proof: string;
    by: "app" | "owner";
}
export interface PersonaProfile {
    id: string;
    name: string;
    summary: string;
    problem: string;
    trigger: string;
    language: string[];
    who: {
        age: string;
        gender: string;
        life: string;
    };
    wants: string;
    identity?: string;
    notes?: string;
    objections: string[];
    doubts?: DoubtPair[];
    tried?: string[];
    believes?: string[];
    angle: string;
    awareness: PersonaAwareness;
    product_ids: string[];
    offer_id: string | null;
    sounds_like: string[];
    share: number | null;
    performance: PersonaPerformance | null;
    source: PersonaSource;
    basis: string;
    look: string;
    image: string | null;
    status: "active" | "draft";
    created_at: string;
    updated_at: string;
}
export const personaCore = (p: PersonaProfile) => ({ id: p.id, name: p.name, summary: p.summary, problem: p.problem, trigger: p.trigger, ...(p.wants ? { wants: p.wants } : {}), language: p.language });
export const personaId = (name: string) => `per_${name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28)}`;
