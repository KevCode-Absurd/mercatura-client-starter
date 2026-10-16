import { AWARENESS, apportion, type Skeleton } from "./formats";
import { balancedLooks } from "./looks";
export const SPRINT_MAX = 100;
export const SPRINT_DEFAULT = 100;
export function writingOrder<T extends {
    n: number;
    awareness: string;
    look?: string;
    world?: string;
}>(slots: T[]): T[] {
    return [...slots].sort((a, b) => AWARENESS.indexOf(a.awareness as typeof AWARENESS[number]) - AWARENESS.indexOf(b.awareness as typeof AWARENESS[number]) || (a.world ? a.look ?? "world" : "layouts").localeCompare(b.world ? b.look ?? "world" : "layouts") || a.n - b.n);
}
export function stagesFor(format: string): readonly string[] {
    if (format === "offer")
        return ["most_aware"];
    if (["before_after", "us_vs_them"].includes(format))
        return ["problem_aware", "solution_aware", "product_aware", "most_aware"];
    if (["testimonial", "founder", "statistic", "expert", "unboxing", "demo", "listicle", "behind_the_scenes", "us_vs_them", "before_after"].includes(format))
        return ["solution_aware", "product_aware", "most_aware"];
    return AWARENESS;
}
export function explorationLooks(size: number): Record<string, number> {
    return balancedLooks(size);
}
export function dealCoverage<T extends Skeleton>(slots: T[], personas: string[], products: Record<string, string[]>) {
    if (!personas.length)
        throw new Error("Add at least one buyer before making a sprint.");
    const stageUse = new Map<string, number>();
    const stageProduct = new Map<string, number>();
    const buyerUse = new Map<string, number>();
    const pairs = new Map<string, number>();
    const capacity = apportion(slots.length, AWARENESS.map(() => 1));
    const owners = new Map<string, number[]>();
    const assigned = new Map<number, string>();
    const place = (index: number, visited: Set<string>): boolean => {
        const slot = slots[index];
        const order = [...stagesFor(slot.format)].sort((a, b) => (owners.get(a)?.length ?? 0) - (owners.get(b)?.length ?? 0));
        for (const stage of order) {
            if (visited.has(stage))
                continue;
            visited.add(stage);
            const held = owners.get(stage) ?? [];
            if (held.length < capacity[AWARENESS.indexOf(stage as typeof AWARENESS[number])]) {
                held.push(index);
                owners.set(stage, held);
                assigned.set(index, stage);
                return true;
            }
            for (let j = 0; j < held.length; j++)
                if (place(held[j], visited)) {
                    held[j] = index;
                    assigned.set(index, stage);
                    return true;
                }
        }
        return false;
    };
    const order = slots.map((_, i) => i).sort((a, b) => stagesFor(slots[a].format).length - stagesFor(slots[b].format).length);
    for (const i of order)
        if (!place(i, new Set())) {
            const stage = [...stagesFor(slots[i].format)].sort((a, b) => (owners.get(a)?.length ?? 0) - (owners.get(b)?.length ?? 0))[0];
            owners.set(stage, [...(owners.get(stage) ?? []), i]);
            assigned.set(i, stage);
        }
    return slots.map((slot, index) => {
        const awareness = assigned.get(index)!;
        const allowed = personas.filter(p => !products[p]?.length || products[p].includes(slot.product_id));
        if (!allowed.length)
            throw new Error(`No selected buyer is mapped to ${slot.product_id}. Choose another buyer or product.`);
        const persona = allowed.sort((a, b) => (buyerUse.get(a) ?? 0) - (buyerUse.get(b) ?? 0) || (pairs.get(`${awareness}:${a}`) ?? 0) - (pairs.get(`${awareness}:${b}`) ?? 0))[0];
        for (const [map, key] of [[stageUse, awareness], [stageProduct, `${slot.product_id}:${awareness}`], [buyerUse, persona], [pairs, `${awareness}:${persona}`]] as const)
            map.set(key, (map.get(key) ?? 0) + 1);
        return { ...slot, awareness, persona };
    });
}
