export const CREATIVE_METHODS = {
    concept_exploration: {
        version: "1.0.0",
        meaning: "Seven argument families, selected by the person and limited by local evidence. Colour and headline changes alone are not new concepts.",
        sources: ["skills/operator-creative/concept/CARD.md"],
        readers: ["src/lib/concept-suggest.ts"],
        supersedes: ["An implicit five-concept batch with a compulsory awareness mix."],
    },
    teep_persuasion: {
        version: "1.0.0",
        meaning: "Trigger, Emotion, Evidence, Payoff: diagnose the argument. A visual can carry a role; four text blocks are not required.",
        sources: ["skills/operator-creative/concept/CARD.md"],
        readers: ["src/lib/concept-suggest.ts"],
        supersedes: ["Using the interview journey's TEEP expansion to diagnose creative copy."],
    },
    teep_buying_journey: {
        version: "1.0.0",
        meaning: "Trigger, Exploration, Evaluation, Purchase: an interview journey. This is separate from the creative persuasion diagnostic.",
        sources: ["docs/ai-operator-audit/inventory.json#S0209"],
        readers: [],
        supersedes: [],
    },
    headline_rhetoric: {
        version: "1.0.0",
        meaning: "Benefit, curiosity, question, callout and contrarian are rhetorical forms; their evidence requirements still apply.",
        sources: ["docs/ai-operator-audit/inventory.json#S0276"],
        readers: ["src/lib/standalone/creative.ts#headlineFamilies"],
        supersedes: [],
    },
    headline_proof_angle: {
        version: "1.0.0",
        meaning: "Curiosity, authority, social proof, loss and specificity describe proof or persuasion angles. They are not interchangeable with rhetorical forms; authority and social proof need genuine sources.",
        sources: ["docs/ai-operator-audit/inventory.json#S1403"],
        readers: ["src/lib/standalone/creative.ts#headlineFamilies"],
        supersedes: ["Treating both five-headline taxonomies as the same five mandatory outputs."],
    },
} as const;
export function creativeMethodBrief() {
    return (["concept_exploration", "teep_persuasion"] as const).map((id) => `${id}@${CREATIVE_METHODS[id].version}: ${CREATIVE_METHODS[id].meaning}`).join("\n");
}
export function reviewMethodUpdate(text: string) {
    const findings: {
        rule: string;
        passage: string;
        resolution: string;
    }[] = [];
    const checks = [
        { rule: "TEEP name collision", pattern: /[^\n.]*(?:TEEP|Trigger)[^\n.]*(?:Exploration|Evaluation|Purchase)[^\n.]*/gi, resolution: "Keep this as teep_buying_journey; creative diagnosis uses Trigger, Emotion, Evidence, Payoff." },
        { rule: "Superseded output quota", pattern: /[^\n.]*(?:(?:exactly|always|must|at least)\s+(?:five|5|three|3)\s+(?:concept|headline|unaware)|(?:five|5)[ -](?:concept|headline))[^\n.]*/gi, resolution: "The user's selected count and evidence eligibility determine outputs; do not restore a compulsory cap or mix." },
        { rule: "Unsupported illustrative claim", pattern: /[^\n.]*(?:\b\d+%|\b\d+[- ]day results|guaranteed|clinically proven|customers love)[^\n.]*/gi, resolution: "Keep this in examples only. Use product-bound evidence for actual claims; no example is evidence." },
        { rule: "Headline taxonomy collision", pattern: /[^\n.]*(?:authority|social proof)[^\n.]*(?:five|5|headline)[^\n.]*/gi, resolution: "Proof angles remain separate from rhetorical forms and retain their source requirements." },
        { rule: "Provider setting in a method", pattern: /[^\n.]*(?:temperature|max_tokens|model\s*[:=])[^\n.]*/gi, resolution: "Provider settings belong to the configured model routes, not the creative method." },
    ];
    for (const c of checks)
        for (const match of text.matchAll(c.pattern))
            findings.push({ rule: c.rule, passage: match[0], resolution: c.resolution });
    return { status: findings.length ? "review_required" : "no_known_conflict", findings, admittedToRuntime: false, registryVersions: Object.fromEntries(Object.entries(CREATIVE_METHODS).map(([id, m]) => [id, m.version])), limitation: "Known-pattern screening is advisory; new instructions require a reviewed registry/code change. Imported source text is never appended to active prompts." };
}
