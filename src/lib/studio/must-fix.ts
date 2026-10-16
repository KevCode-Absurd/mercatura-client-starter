import type { StudioItem } from "@/db/schema";
import { currentOutputs } from "./outputs";
export const MUST_FIX_MOST = 6;
export const MUST_FIX_EACH = 240;
const DID_NOT_RUN = /automatic check didn't run/i;
export function mustFix(item: Pick<StudioItem, "outputs">): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const o of currentOutputs(item.outputs)) {
        if (!o.qa || o.qa.status === "pass" || o.check_override)
            continue;
        for (const raw of o.qa.notes) {
            const note = raw.replace(/^[-\s]+/, "").trim().slice(0, MUST_FIX_EACH);
            const key = note.toLowerCase();
            if (!note || DID_NOT_RUN.test(note) || seen.has(key))
                continue;
            seen.add(key);
            out.push(note);
        }
    }
    return out.slice(0, MUST_FIX_MOST);
}
export const mustFixLines = (item: Pick<StudioItem, "outputs">): string[] => mustFix(item).map((x) => `- ${x}`);
