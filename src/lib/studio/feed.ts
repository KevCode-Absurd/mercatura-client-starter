import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import type { ContextLevel } from "../llm/context";
import { renderPrompt } from "../prompts";
import { skillFor } from "../skills/card";
import { copyCraftOn } from "../skills/craft";
import { sellingFor } from "../skills/selling";
import type { AwarenessStage } from "../taxonomy";
import { PRIMARY_WORDS, stageName } from "../copy/stage";
import type { CompleteCopyIssue, CompleteCopyPacket } from "../evaluation/copy-repair";
export function completeCopyRepairPrompt(packet: CompleteCopyPacket, issues: readonly CompleteCopyIssue[], brandVoice = ""): {
    system: string;
    user: string;
} {
    const failures = issues.filter(i => i.severity !== "advisory");
    if (!failures.length)
        throw new Error("A complete-copy repair requires a verified failing field.");
    const paths = new Set(failures.map(i => i.fieldPath));
    const fields = packet.fields.filter(f => paths.has(f.path));
    return {
        system: `Correct only the supplied failing copy fields. Return JSON {"patches":[{"fieldPath":"exact supplied path","before":"exact contiguous span to replace","after":"smallest supported replacement","occurrence":0,"issueIds":["supplied issue id"]}]}.
For a missing requested field, before is empty and after is the complete requested text. For an existing field, emit only its smallest affected span; do not repeat the entire caption. If the span occurs more than once, occurrence identifies its zero-based exact match. Combine overlapping issues into one span correction. Preserve every successful word outside the correction and keep attribution/source metadata. Deleting an unsupported optional overlay or description is allowed when it is the smallest adequate correction; never erase requested primary text or alternatives. A missing field may require a complete supported alternative; never silently shorten a requested medium or long version.
Supplied evidence outranks style examples and buyer vocabulary. Preserve each relevant survey denominator, study measure/comparator, introductory offer condition and guarantee qualification in every affected alternative. No invented customer story, personal outcome, replacement claim, price or health mechanism. Brand first person and neutral/conditional you are allowed. Do not change an uncriticized field, the visual scene, avatar, product or argument. Image-overlay corrections are word patches; the renderer must separately repair only their affected image regions. A patch requires a new complete-copy review before rendering.`,
        user: JSON.stringify({ contentHash: packet.contentHash, evidenceHash: packet.evidenceHash, fields, failures, authority: packet.authority, requirements: packet.requirements, ...(brandVoice ? { brandVoice } : {}) }),
    };
}
export function studioFeedPrompt(vars: Record<string, string>, level: ContextLevel, stage: AwarenessStage): {
    system: string;
    user: string;
    used: string[];
} {
    if (level === "full")
        return { ...renderPrompt("studio-feed", vars), used: [...(copyCraftOn() ? ["copy-craft"] : []), ...(sellingFor("studio-feed") ? ["buyer-led-selling"] : [])] };
    const reference = "operator-creative/static-copy/references/long-primary-text.md";
    const story = fs.readFileSync(path.join(env.SKILLS_DIR, reference), "utf-8").trim();
    const [lo, hi] = PRIMARY_WORDS[stage];
    return {
        ...renderPrompt("studio-feed-focused", {
            ...vars,
            static_copy_method: [skillFor("operator-creative/static-copy", level), story].filter(Boolean).join("\n\n"),
            length: `${lo.toLocaleString("en-US")} to ${hi.toLocaleString("en-US")} words for a ${stageName(stage)} buyer. Preserve this requested range and tell the complete argument. Brand examples show sentence style, never this text's length. Develop supported scenes, practical consequences and objections without repetition or invented personal experience.`,
            product_rule: stage === "unaware"
                ? "Do not name or hint at it before the last fifth. Then name it once or twice, explain what it is plainly and use at most one supported fact, as an option to consider."
                : "Do not name it in the first two thirds. Then explain what it is plainly and use at most two supported facts to connect its verified action with the reader's task, as an option to consider.",
        }),
        used: ["operator-creative/static-copy", reference],
    };
}
