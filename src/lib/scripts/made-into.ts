import { OUTPUT_INFO, type OutputType } from "../taxonomy";
export interface MadeFrom {
    script_id: string;
    output_type: OutputType;
    status: string;
}
export interface MadeInto {
    n: number;
    words: string;
}
export function madeInto(jobs: MadeFrom[]): Map<string, MadeInto> {
    const by = new Map<string, Map<OutputType, number>>();
    for (const j of jobs) {
        if (j.status === "discarded")
            continue;
        const kinds = by.get(j.script_id) ?? new Map<OutputType, number>();
        kinds.set(j.output_type, (kinds.get(j.output_type) ?? 0) + 1);
        by.set(j.script_id, kinds);
    }
    const out = new Map<string, MadeInto>();
    for (const [id, kinds] of by) {
        const list = [...kinds].sort((a, b) => b[1] - a[1] || OUTPUT_INFO[a[0]].label.localeCompare(OUTPUT_INFO[b[0]].label));
        out.set(id, { n: list.reduce((n, [, c]) => n + c, 0), words: list.map(([t, c]) => `${c} ${OUTPUT_INFO[t].label}`).join(", ") });
    }
    return out;
}
