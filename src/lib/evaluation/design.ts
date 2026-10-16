import { createHash } from "node:crypto";
export type EvaluationKind = "static" | "storyboard";
export type EvaluationArm = "before" | "after" | "refined";
export interface ControlledBrief {
    pair_id: string;
    kind: EvaluationKind;
    controls: Record<string, unknown>;
}
export interface EvaluationArtifact {
    artifact_id: string;
    pair_id: string;
    kind: EvaluationKind;
    arm: EvaluationArm;
    brief_hash: string;
    asset_ids: string[];
    media_paths: string[];
}
export interface BlindPair {
    pair_id: string;
    kind: EvaluationKind;
    brief_hash: string;
    A: {
        asset_ids: string[];
        media_paths: string[];
    };
    B: {
        asset_ids: string[];
        media_paths: string[];
    };
}
function canonical(value: unknown): string {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return `[${value.map(canonical).join(",")}]`;
    if (typeof value === "object")
        return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
    if (["string", "boolean"].includes(typeof value) || (typeof value === "number" && Number.isFinite(value)))
        return JSON.stringify(value);
    throw new Error("Evaluation controls must contain only finite JSON values; do not silently drop fields.");
}
export function controlledBriefHash(brief: Pick<ControlledBrief, "kind" | "controls">): string {
    return createHash("sha256").update(canonical({ kind: brief.kind, controls: brief.controls })).digest("hex");
}
export function pairedBriefs(briefs: ControlledBrief[]) {
    const seen = new Set<string>();
    return briefs.map(brief => {
        if (!brief.pair_id || seen.has(brief.pair_id))
            throw new Error(`Missing or duplicate pair ID: ${brief.pair_id}`);
        if (!Object.keys(brief.controls).length)
            throw new Error(`Pair ${brief.pair_id} has no controlled brief.`);
        seen.add(brief.pair_id);
        const brief_hash = controlledBriefHash(brief);
        return { pair_id: brief.pair_id, kind: brief.kind, brief_hash, before: structuredClone(brief.controls), after: structuredClone(brief.controls) };
    });
}
export function validateMatchedPairs(artifacts: EvaluationArtifact[], arms: readonly [
    EvaluationArm,
    EvaluationArm
] = ["before", "after"]): string[] {
    const pairs = new Map<string, EvaluationArtifact[]>();
    const ids = new Set<string>();
    const errors: string[] = [];
    if (arms[0] === arms[1])
        errors.push("A pair comparison requires two distinct conditions.");
    for (const artifact of artifacts) {
        if (ids.has(artifact.artifact_id))
            errors.push(`Duplicate artifact ID: ${artifact.artifact_id}`);
        ids.add(artifact.artifact_id);
        pairs.set(artifact.pair_id, [...pairs.get(artifact.pair_id) ?? [], artifact]);
    }
    for (const [id, rows] of pairs) {
        if (rows.length !== 2 || rows.filter(r => r.arm === arms[0]).length !== 1 || rows.filter(r => r.arm === arms[1]).length !== 1)
            errors.push(`Pair ${id} needs exactly one ${arms[0]} and one ${arms[1]} artifact.`);
        if (new Set(rows.map(r => r.brief_hash)).size !== 1 || rows.some(r => !/^[a-f0-9]{64}$/.test(r.brief_hash)))
            errors.push(`Pair ${id} has changed or invalid controlled brief hashes.`);
        if (new Set(rows.map(r => r.kind)).size !== 1)
            errors.push(`Pair ${id} has different media kinds.`);
        for (const row of rows)
            if (row.asset_ids.length !== row.media_paths.length || new Set(row.asset_ids).size !== row.asset_ids.length)
                errors.push(`Artifact ${row.artifact_id} has inconsistent asset IDs/paths.`);
    }
    return errors;
}
export function blindPairs(artifacts: EvaluationArtifact[], seed: string, arms: readonly [
    EvaluationArm,
    EvaluationArm
] = ["before", "after"]): {
    pairs: BlindPair[];
    reveal: Record<string, {
        A: EvaluationArm;
        B: EvaluationArm;
    }>;
} {
    const errors = validateMatchedPairs(artifacts, arms);
    if (errors.length)
        throw new Error(errors.join("\n"));
    const byPair = new Map<string, EvaluationArtifact[]>();
    for (const artifact of artifacts)
        byPair.set(artifact.pair_id, [...byPair.get(artifact.pair_id) ?? [], artifact]);
    const reveal: Record<string, {
        A: EvaluationArm;
        B: EvaluationArm;
    }> = {};
    const pairs = [...byPair].map(([id, rows]) => {
        const flip = createHash("sha256").update(`${seed}|${id}`).digest()[0] % 2 === 1;
        const A = rows.find(r => r.arm === arms[flip ? 1 : 0])!;
        const B = rows.find(r => r.arm === arms[flip ? 0 : 1])!;
        reveal[id] = { A: A.arm, B: B.arm };
        const surface = (row: EvaluationArtifact) => ({ asset_ids: [...row.asset_ids], media_paths: [...row.media_paths] });
        return { pair_id: id, kind: A.kind, brief_hash: A.brief_hash, A: surface(A), B: surface(B) };
    });
    return { pairs, reveal };
}
export interface DiversityItem {
    id: string;
    format: string;
    tags: Record<string, string | undefined>;
}
export function creativeDiversity(items: DiversityItem[], allowed: Record<string, readonly string[]>) {
    const dimensions = Object.fromEntries(Object.entries(allowed).map(([dimension, values]) => {
        const counts = Object.fromEntries(values.map(v => [v, 0]));
        const unknown: string[] = [];
        for (const item of items) {
            const value = dimension === "format" ? item.format : item.tags[dimension];
            if (!value || !values.includes(value))
                unknown.push(item.id);
            else
                counts[value]++;
        }
        const tagged = Object.values(counts).reduce((a, b) => a + b, 0);
        const largest_share = tagged ? Math.max(...Object.values(counts)) / tagged : null;
        return [dimension, { counts, missing: values.filter(v => counts[v] === 0), unknown, largest_share }];
    }));
    const repeated = new Map<string, string[]>();
    for (const item of items) {
        const signature = Object.entries(allowed).map(([dimension]) => dimension === "format" ? item.format : item.tags[dimension] ?? "").join("|");
        if (Object.keys(allowed).some(d => d !== "format" && !item.tags[d]))
            continue;
        repeated.set(signature, [...repeated.get(signature) ?? [], item.id]);
    }
    return { total: items.length, dimensions, repeated_combinations: [...repeated.values()].filter(ids => ids.length > 1), performance: "unknown" as const };
}
