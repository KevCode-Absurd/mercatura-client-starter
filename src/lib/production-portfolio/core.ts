import { z } from "zod";
import { assessEvidence, buildEvidencePacket, contentFingerprint, evidenceConditions, type BoundEvidence, type EvidenceScope } from "../standalone/evidence";
const id = z.string().trim().min(1).max(180), text = z.string().trim().max(3000);
export const GRAMMARS = ["product_detail", "hands_sequence", "context_wide", "matched_comparison", "narrated_diagram"] as const;
export const PROOF_MODES = ["annotation", "preparation_sequence", "decision_table", "conditional_explanation"] as const;
export const FORMATS = ["static", "carousel", "video", "landing", "seo"] as const;
export const GRAMMAR_SPEC = {
    product_detail: { framing: "Tight product detail", action: "Inspect the documented feature without inventing an opening or use", pov: "Observer at label level", cast: "Product only", device: "Sourced callout" },
    hands_sequence: { framing: "Three overhead frames", action: "Sequence only documented preparation; unknown actions remain planning gaps", pov: "Overhead observer", cast: "Hands only; no claimed customer", device: "Ordered preparation explanation, illustrative staging" },
    context_wide: { framing: "Wide environmental frame", action: "Situate the product beside the buyer task", pov: "Eye-level observer", cast: "Product and task props; no personal testimony", device: "Situation and supported product reason" },
    matched_comparison: { framing: "Equal-size matched panels", action: "Compare only sourced matched criteria", pov: "Neutral observer", cast: "Documented alternatives only", device: "Matched evidence table" },
    narrated_diagram: { framing: "Product and explanatory diagram", action: "Explain a documented feature, never infer a causal outcome", pov: "Straight-on", cast: "Product only", device: "Evidence-linked annotation" },
} as const;
export const ArgumentSchema = z.object({ id, buyerId: id, needId: id, need: text.min(1), decision: text.min(1), mechanismId: id, evidenceIds: z.array(id).min(1).max(30), conditions: z.array(text).max(30).default([]), classification: z.enum(["unresolved", "reviewed"]).default("unresolved"), rationale: text.default("") });
export const PortfolioRequestSchema = z.object({ name: text.min(1), seed: id, scope: z.object({ productId: id, market: id, variant: text.optional() }), count: z.number().int().min(1).max(100), argumentCount: z.number().int().min(1).max(100), arguments: z.array(ArgumentSchema).min(1).max(100), grammars: z.array(z.enum(GRAMMARS)).min(1).max(5).default([...GRAMMARS]), proofModes: z.array(z.enum(PROOF_MODES)).min(1).max(4).default([...PROOF_MODES]), lockedArt: z.record(z.string(), z.string()).default({}), unlockedWorlds: z.array(z.object({ id, setting: text, camera: text, light: text })).min(1).max(30).default([{ id: "counter", setting: "Neutral counter", camera: "Eye-level product detail", light: "Window daylight" }, { id: "hands", setting: "Hands-only use setup", camera: "Overhead sequence", light: "Soft neutral light" }, { id: "diagram", setting: "Plain explanatory surface", camera: "Straight-on", light: "Even studio light" }]) }).superRefine((p, c) => { if (p.argumentCount > p.count)
    c.addIssue({ code: "custom", message: "Argument count cannot exceed output count." }); if (new Set(p.arguments.map(a => a.id)).size !== p.arguments.length)
    c.addIssue({ code: "custom", message: "Argument IDs must be unique." }); });
export type PortfolioRequest = z.infer<typeof PortfolioRequestSchema>;
export type Argument = z.infer<typeof ArgumentSchema>;
export type Mechanism = {
    id: string;
    family: "preparation" | "formulation_identity" | "design" | "use_constraint" | "documented_property";
    text: string;
    evidenceIds: string[];
    qualifiers: string[];
    scope: EvidenceScope;
};
export type Allocation = {
    id: string;
    n: number;
    unit: "argument" | "execution";
    argumentId: string;
    argumentKey: string;
    buyerId: string;
    mechanismId: string;
    grammar: typeof GRAMMARS[number];
    proofMode: typeof PROOF_MODES[number];
    world: Record<string, string>;
    status: "ready" | "blocked";
    reasons: string[];
    evidenceIds: string[];
    evidenceFingerprint: string;
};
export type PortfolioPlan = {
    request: PortfolioRequest;
    fingerprint: string;
    evidenceFingerprint: string;
    mechanisms: Mechanism[];
    slots: Allocation[];
    shortfall: string[];
};
const materialConditions = (r: BoundEvidence) => [...new Set([...evidenceConditions(r).adjacent, ...r.comparison?.conditions ?? []])];
const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const argumentKey = (a: Argument) => contentFingerprint({ buyer: norm(a.buyerId), need: norm(a.needId), mechanism: a.mechanismId, facts: [...a.evidenceIds].sort() });
export function seededOrder<T>(items: T[], seed: string): T[] { return items.map((item, n) => ({ item, n, key: contentFingerprint({ seed, n, item }) })).sort((a, b) => a.key.localeCompare(b.key) || a.n - b.n).map(x => x.item); }
export function mechanismsFromEvidence(records: BoundEvidence[], scope: EvidenceScope): Mechanism[] {
    return buildEvidencePacket(scope, records).records.filter(r => r.eligible && (r.kind === "fact" || r.kind === "claim")).map(r => ({ id: `mechanism:${r.id}`, family: /tear|pour|mix|prepar|open|water/i.test(r.text) ? "preparation" : /ingredient|pectin|gelatin|material|made of/i.test(r.text) ? "formulation_identity" : /only|limit|must|do not|maximum/i.test(r.text + " " + materialConditions(r).join(" ")) ? "use_constraint" : /handle|shape|design|width|height|diameter/i.test(r.text) ? "design" : "documented_property", text: r.text, evidenceIds: [r.id], qualifiers: materialConditions(r), scope: { ...scope } }));
}
export function allocatePortfolio(raw: unknown, records: BoundEvidence[]): PortfolioPlan {
    const request = PortfolioRequestSchema.parse(raw), selectedIds = new Set(request.arguments.flatMap(a => a.evidenceIds)), mechanisms = mechanismsFromEvidence(records.filter(r => selectedIds.has(r.id)), request.scope), available = new Map(mechanisms.map(m => [m.id, m]));
    const packet = buildEvidencePacket(request.scope, records.filter(r => selectedIds.has(r.id)));
    const eligible = new Map(packet.records.filter(r => r.eligible).map(r => [r.id, r]));
    const unique = new Map<string, Argument>();
    for (const a of request.arguments) {
        const cosmetic = [...unique.values()].some(b => norm(b.buyerId) === norm(a.buyerId) && b.mechanismId === a.mechanismId && contentFingerprint([...b.evidenceIds].sort()) === contentFingerprint([...a.evidenceIds].sort()) && (norm(b.needId) === norm(a.needId) || (norm(b.need) === norm(a.need) && norm(b.decision) === norm(a.decision))));
        if (!cosmetic && !unique.has(argumentKey(a)))
            unique.set(argumentKey(a), a);
    }
    const ordered = seededOrder([...unique.values()], request.seed), grammars = seededOrder([...new Set(request.grammars)], request.seed + ":grammar"), modes = seededOrder([...new Set(request.proofModes)], request.seed + ":proof"), worlds = seededOrder(request.unlockedWorlds, request.seed + ":world");
    const usedMechanisms = new Map<string, number>();
    const args = ordered.sort((a, b) => (usedMechanisms.get(a.mechanismId) || 0) - (usedMechanisms.get(b.mechanismId) || 0));
    const selected: Argument[] = [];
    const pool = [...args];
    while (pool.length && selected.length < request.argumentCount) {
        pool.sort((a, b) => (usedMechanisms.get(a.mechanismId) || 0) - (usedMechanisms.get(b.mechanismId) || 0));
        const a = pool.shift()!;
        selected.push(a);
        usedMechanisms.set(a.mechanismId, (usedMechanisms.get(a.mechanismId) || 0) + 1);
    }
    const combinations = seededOrder(grammars.flatMap(grammar => modes.flatMap(proofMode => worlds.map(world => ({ grammar, proofMode, world: { ...world, ...request.lockedArt } })))), request.seed + ":envelopes");
    const spent = new Set<string>(), coverage = new Map<string, number>();
    const envelopeKey = (a: Argument | undefined, c: typeof combinations[number]) => contentFingerprint({ argument: a ? argumentKey(a) : "missing", grammar: c.grammar, proofMode: c.proofMode, world: Object.fromEntries(Object.entries(c.world).filter(([k]) => k !== "id")) });
    const score = (c: typeof combinations[number]) => (coverage.get("grammar:" + c.grammar) ?? 0) * 100 + (coverage.get("proof:" + c.proofMode) ?? 0) * 20 + (coverage.get("world:" + c.world.id) ?? 0) * 5;
    const slots: Allocation[] = Array.from({ length: request.count }, (_, n) => {
        const isArgument = n < request.argumentCount, a = isArgument ? selected[n] : selected[(n - request.argumentCount) % Math.max(1, selected.length)];
        const reasons: string[] = [];
        if (a && a.classification !== "reviewed")
            reasons.push("Buyer-need/argument classification is unresolved. Inspect its actual reasoning and explicitly mark reviewed; a cosmetic rewrite is not another argument.");
        if (!a)
            reasons.push("No distinct supported argument is supplied for this reserved slot.");
        const mechanism = a ? available.get(a.mechanismId) : undefined;
        if (a && !mechanism)
            reasons.push("The selected mechanism lacks applicable approved evidence; ingredient jobs and hypotheses are not mechanism proof.");
        if (a?.evidenceIds.some(e => !eligible.has(e)))
            reasons.push("An argument source is missing, ineligible or outside this product/market/variant.");
        if (a && mechanism && !mechanism.evidenceIds.every(e => a.evidenceIds.includes(e)))
            reasons.push("The mechanism's actual source is not selected by this argument.");
        const next = [...combinations].filter(c => !spent.has(envelopeKey(a, c))).sort((a, b) => score(a) - score(b))[0];
        if (!next)
            reasons.push("All distinct permitted execution envelopes for this argument are exhausted. Add an eligible grammar, proof mode or unlocked world; changing only an ID/seed is not another execution.");
        const envelope = next ?? combinations[0], { grammar, proofMode, world } = envelope;
        if (next) {
            spent.add(envelopeKey(a, next));
            coverage.set("grammar:" + grammar, (coverage.get("grammar:" + grammar) ?? 0) + 1);
            coverage.set("proof:" + proofMode, (coverage.get("proof:" + proofMode) ?? 0) + 1);
            coverage.set("world:" + world.id, (coverage.get("world:" + world.id) ?? 0) + 1);
        }
        if (grammar === "matched_comparison" && a && !a.evidenceIds.some(e => eligible.get(e)?.comparison))
            reasons.push("Matched alternatives are not documented. Select a one-product grammar or register a sourced comparison.");
        return { id: `slot-${n + 1}`, n: n + 1, unit: isArgument ? "argument" : "execution", argumentId: a?.id ?? "", argumentKey: a ? argumentKey(a) : "", buyerId: a?.buyerId ?? "", mechanismId: a?.mechanismId ?? "", grammar, proofMode, world, status: reasons.length ? "blocked" : "ready", reasons, evidenceIds: a?.evidenceIds ?? [], evidenceFingerprint: buildEvidencePacket(request.scope, records.filter(r => a?.evidenceIds.includes(r.id))).fingerprint };
    });
    const shortfall = slots.filter(s => s.status === "blocked").map(s => `${s.id}: ${s.reasons.join(" ")}`);
    const body = { request, evidenceFingerprint: packet.fingerprint, mechanisms, slots, shortfall };
    return { ...body, fingerprint: contentFingerprint(body) };
}
export function portfolioDirective(plan: PortfolioPlan, slot: Allocation, records: BoundEvidence[]) {
    const a = plan.request.arguments.find(a => a.id === slot.argumentId);
    const evidence = buildEvidencePacket(plan.request.scope, records.filter(r => slot.evidenceIds.includes(r.id)));
    return { schema: "production-allocation/1", portfolio: plan.fingerprint, slot, visualGrammar: GRAMMAR_SPEC[slot.grammar], argument: a, mechanism: plan.mechanisms.find(m => m.id === slot.mechanismId), evidence, rules: ["The buyer situation/decision is an editorial hypothesis; never invent personal purchase, use or result.", "Only eligible held records authorize factual statements. Preserve all conditions. No implied comparison, health outcome or offer from planning IDs.", "Camera, light, color and rhetoric create execution variety, never a new argument.", "Use the slot's exact grammar, proof mode and unlocked world; accepted art locks stay fixed. If these requirements conflict, hold rather than silently changing a lock."] };
}
export function reviewAllocation(plan: PortfolioPlan, slotId: string, delivered: {
    argumentId: string;
    mechanismId: string;
    grammar: string;
    proofMode: string;
    world: Record<string, string>;
    evidenceIds: string[];
}) {
    const slot = plan.slots.find(s => s.id === slotId);
    if (!slot)
        return { ready: false, findings: ["Unknown reserved slot."] };
    const findings = [...(slot.status === "blocked" ? slot.reasons : []), ...(["argumentId", "mechanismId", "grammar", "proofMode"] as const).filter(k => delivered[k] !== slot[k]).map(k => `Assigned ${k} changed.`), ...Object.entries(plan.request.lockedArt).filter(([k, v]) => delivered.world[k] !== v).map(([k]) => `Locked ${k} changed.`), ...slot.evidenceIds.filter(id => !delivered.evidenceIds.includes(id)).map(id => `Source ${id} was dropped.`)];
    return { ready: !findings.length, findings };
}
export function transformArgument(plan: PortfolioPlan, slotId: string, format: typeof FORMATS[number], records: BoundEvidence[]) {
    const slot = plan.slots.find(s => s.id === slotId);
    if (!slot || slot.status !== "ready")
        throw new Error("Choose a ready reserved slot.");
    const a = plan.request.arguments.find(a => a.id === slot.argumentId)!, packet = buildEvidencePacket(plan.request.scope, records.filter(r => slot.evidenceIds.includes(r.id)));
    if (packet.records.some(r => !r.eligible))
        throw new Error("Evidence changed; rebuild the allocation before transcreating.");
    const facts = packet.records.filter(r => r.kind === "fact" || r.kind === "claim"), conditions = [...new Set([...facts.flatMap(r => materialConditions(r)), ...a.conditions])];
    const blocks = format === "static" ? [{ role: "headline", text: a.need }, { role: "support", text: facts.map(r => r.text).join(" ") }, { role: "qualification", text: conditions.join(" ") }] : format === "carousel" ? [{ role: "question", text: a.need }, ...facts.map((r, i) => ({ role: `answer-${i + 1}`, text: r.text + " " + materialConditions(r).join(" ") })), { role: "decision", text: a.decision }] : format === "video" ? [{ role: "opening", text: a.need, visual: `${slot.grammar}: ${slot.world.setting}. Illustrative staging.` }, ...facts.map(r => ({ role: "narration", text: r.text + " " + materialConditions(r).join(" "), visual: "Show the supplied product reference; no fabricated test or personal result." })), { role: "next_action", text: a.decision }] : format === "landing" ? [{ role: "arrival", text: a.need }, { role: "product_explanation", text: facts.map(r => r.text).join("\n") }, { role: "conditions", text: conditions.join("\n") }, { role: "decision", text: a.decision }] : [{ role: "buyer_question", text: a.need }, ...facts.map(r => ({ role: "decision_evidence", text: r.text + " " + materialConditions(r).join(" ") })), { role: "useful_next_step", text: a.decision }];
    return { format, slotId, scope: plan.request.scope, status: "source-bounded editorial draft; not accepted", blocks, evidence: packet, argumentKey: slot.argumentKey, conditions, marketEffect: "unknown" };
}
export function proofPresentation(plan: PortfolioPlan, slotId: string, records: BoundEvidence[]) {
    const slot = plan.slots.find(s => s.id === slotId);
    if (!slot)
        throw new Error("Unknown slot.");
    const packet = buildEvidencePacket(plan.request.scope, records.filter(r => slot.evidenceIds.includes(r.id)));
    const rows = packet.records.filter(r => r.eligible).map(r => ({ fact: r.text, source: r.source, conditions: materialConditions(r), alternative: r.comparison?.alternatives ?? "Unknown: no matched alternative is documented." }));
    const presentation = slot.proofMode === "annotation" ? rows.map(r => ({ kind: "sourced_callout", label: r.fact, adjacent: r.conditions, source: r.source })) : slot.proofMode === "preparation_sequence" ? rows.map((r, n) => ({ kind: "explanation_frame", order: n + 1, narration: r.fact, adjacent: r.conditions, visual: "Use the original product reference. Only stage an action explicitly documented by this source; otherwise show a neutral product view.", source: r.source })) : slot.proofMode === "decision_table" ? { columns: ["Documented product fact", "Conditions", "Matched alternative"], rows: rows.map(r => [r.fact, r.conditions.join(" "), r.alternative]) } : rows.map(r => ({ kind: "conditional_explanation", check: r.conditions.length ? r.conditions.join(" ") : "This exact product and recorded market scope", supportedStatement: r.fact, unsupportedInference: "No unstated causal outcome, comparison or universal result.", source: r.source }));
    return { mode: slot.proofMode, rows, presentation, tradeoffs: packet.records.filter(r => r.eligible).flatMap(r => materialConditions(r).map(condition => ({ condition, decision: `Check applicability before choosing: ${condition}`, sourceId: r.id }))), requiresHumanMeaningReview: true };
}
export function adaptiveBatches<T>(items: T[], tokens: (item: T) => number, limit = 16000, maxItems = 6): T[][] {
    if (!Number.isFinite(limit) || limit < 1 || !Number.isInteger(maxItems) || maxItems < 1)
        throw new Error("Invalid batch budget.");
    const batches: T[][] = [];
    let current: T[] = [], size = 768;
    for (const item of items) {
        const amount = tokens(item);
        if (!Number.isFinite(amount) || amount < 0)
            throw new Error("Invalid item budget.");
        if (amount + 768 > limit)
            throw new Error("One complete item exceeds the configured result budget; change the request or explicit cap, never truncate it.");
        if (current.length && (size + amount > limit || current.length >= maxItems)) {
            batches.push(current);
            current = [];
            size = 768;
        }
        current.push(item);
        size += amount;
    }
    if (current.length)
        batches.push(current);
    return batches;
}
export async function boundedMap<T, R>(items: T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> { const result: R[] = new Array(items.length); let next = 0; await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => { for (;;) {
    const i = next++;
    if (i >= items.length)
        return;
    result[i] = await work(items[i], i);
} })); return result; }
export async function topUp<T>(options: {
    target: number;
    maxAttempts: number;
    maxCost: number;
    maxAttemptCost: number;
    initial?: T[];
    key: (item: T) => string;
    generate: (missing: number, rejections: string[], attempt: number, remainingBudget: number) => Promise<{
        items: T[];
        cost: number;
    }>;
    review: (item: T) => string[];
}) {
    const kept: T[] = [...(options.initial ?? [])], seen = new Set(kept.map(options.key)), rejected: string[] = [];
    let cost = 0, attempts = 0;
    if (options.maxAttemptCost <= 0 || options.maxCost < 0)
        throw new Error("A positive reserved attempt ceiling is required.");
    while (kept.length < options.target && attempts < options.maxAttempts && cost + options.maxAttemptCost <= options.maxCost) {
        const batch = await options.generate(options.target - kept.length, [...rejected], ++attempts, options.maxCost - cost);
        if (!Number.isFinite(batch.cost) || batch.cost < 0 || batch.cost > options.maxAttemptCost)
            throw new Error("Attempt exceeded its reserved ceiling; stop and inspect provider usage.");
        cost += batch.cost;
        for (const item of batch.items) {
            const errors = options.review(item), key = options.key(item);
            if (seen.has(key))
                errors.push("Repeated accepted candidate.");
            if (errors.length)
                rejected.push(...errors);
            else if (kept.length < options.target) {
                kept.push(item);
                seen.add(key);
            }
        }
    }
    return { kept, rejected, cost, attempts, shortfall: Math.max(0, options.target - kept.length), stoppedBy: kept.length >= options.target ? "complete" : cost + options.maxAttemptCost > options.maxCost ? "cost" : "attempts" };
}
