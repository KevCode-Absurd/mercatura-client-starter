import { reviewMethodUpdate } from "../creative/methods";
export interface EditCheck {
    errors: string[];
    warnings: string[];
}
const slots = (s: string) => new Set([...s.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]));
const SPLIT = /^=== USER ===\s*$/m;
const front = (s: string) => s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? null;
export function checkEdit(root: "skills" | "prompts", before: string, after: string): EditCheck {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!after.trim())
        return { errors: ["The file would be empty. To stop a file being sent, say so in a note: it is taken out in the code, not by emptying it."], warnings };
    if (root === "prompts") {
        if (SPLIT.test(before) && !SPLIT.test(after))
            errors.push('The line "=== USER ===" is gone. It splits the standing instructions from the work; keep it on a line of its own.');
        const [was, now] = [slots(before), slots(after)];
        const added = [...now].filter((x) => !was.has(x));
        const removed = [...was].filter((x) => !now.has(x));
        if (added.length)
            errors.push(`The app does not fill ${added.map((x) => `{${x}}`).join(", ")}, so the step would fail. A word in curly brackets is a place the app fills; write it without the brackets, or ask for the place to be added.`);
        if (removed.length)
            warnings.push(`${removed.map((x) => `{${x}}`).join(", ")} is no longer in the file, so what the app puts there is no longer sent.`);
        const sys = (s: string) => s.split(SPLIT)[0];
        const moved = [...slots(sys(after))].filter((x) => was.has(x) && !slots(sys(before)).has(x));
        if (moved.length)
            warnings.push(`${moved.map((x) => `{${x}}`).join(", ")} moved above "=== USER ===". If it changes with each piece of work, the standing part is no longer read from cache.`);
    }
    else {
        const [was, now] = [front(before), front(after)];
        if (was !== null && now === null)
            errors.push('The lines between "---" at the top are gone. The app reads the skill\'s name and what it includes from them.');
        else if (was !== null && now !== null && was.trim() !== now.trim())
            warnings.push('The lines between "---" at the top changed. They are read by the app (name, description, what the skill includes), not sent to the model.');
    }
    const oldConflicts = new Set(reviewMethodUpdate(before).findings.map((f) => `${f.rule}:${f.passage}`));
    for (const finding of reviewMethodUpdate(after).findings) {
        if (!oldConflicts.has(`${finding.rule}:${finding.passage}`))
            warnings.push(`Method registry: ${finding.rule}. ${finding.resolution} Passage: ${finding.passage}`);
    }
    return { errors, warnings };
}
export function keepShape(before: string, after: string): string {
    let out = after.replace(/\r\n/g, "\n");
    out = before.endsWith("\n") ? out.replace(/\n*$/, "\n") : out.replace(/\n+$/, "");
    return before.includes("\r\n") ? out.replace(/\n/g, "\r\n") : out;
}
