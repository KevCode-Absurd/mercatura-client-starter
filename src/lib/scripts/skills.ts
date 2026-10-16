import fs from "node:fs";
import path from "node:path";
import type { ReferenceMode } from "@/db/schema";
import { env } from "../env";
import { mediumOf, type Medium } from "../format-media";
import { FORMAT_SKILL, scriptType } from "../script-types";
import { INDIRECT_FORM } from "./indirect";
import { parseFrontMatter } from "../skills/registry";
import type { OutputType } from "../taxonomy";
export const TASK_SKILL: Record<"research" | "native" | "transpose" | ReferenceMode, string> = {
    transpose: "script-transpose",
    research: "script-from-research",
    native: "native-ad-copy",
    structure: "script-reference-structure",
    principles: "script-reference-principles",
    exact: "ad-reference-exact",
};
const strip = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
const list = (v: string | undefined) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
function readSkill(name: string, root: string): {
    body: string;
    principles: string[];
    includes: string[];
} {
    const file = path.join(root, name, "SKILL.md");
    if (!fs.existsSync(file))
        throw new Error(`Skill "${name}" is not installed (expected ${path.join(name, "SKILL.md")} in the skills folder).`);
    const md = fs.readFileSync(file, "utf-8");
    const fm = parseFrontMatter(md);
    return { body: strip(md), principles: list(fm.principles), includes: list(fm.includes) };
}
function readFileOr(root: string, rel: string, what: string): string {
    const file = path.join(root, rel);
    if (!fs.existsSync(file))
        throw new Error(`${what} is missing (expected ${rel} in the skills folder).`);
    return fs.readFileSync(file, "utf-8").trim();
}
export interface SkillRequest {
    start: "research" | "native" | "transpose" | ReferenceMode;
    native?: {
        arc: string;
        form?: string;
    } | null;
    scriptType?: string | null;
    emotion?: string | null;
    format?: OutputType | null;
    medium?: Medium;
    onlySections?: string[];
}
export interface ComposedSkill {
    text: string;
    stable: string;
    own: string;
    used: string[];
    sections: string[];
}
export function composeSkill(req: SkillRequest, root: string = env.SKILLS_DIR): ComposedSkill {
    const taskName = TASK_SKILL[req.start];
    const task = readSkill(taskName, root);
    const included = task.includes.map((name) => ({ name, ...readSkill(name, root) }));
    const formatName = req.format ? FORMAT_SKILL[req.format] : null;
    const formatParts = formatName && req.format ? formatSkill(formatName, req.medium ?? mediumOf(req.format), root) : null;
    const format = formatName ? { ...readSkill(formatName, root), ...(formatParts ? { body: formatParts.text } : {}) } : null;
    const free = req.start === "research" || req.start === "principles";
    const type = free ? scriptType(req.scriptType) : null;
    const emotions = free && req.emotion ? readFileOr(root, "script-types/emotions.md", "The emotion scale") : "";
    const native = req.start === "native" && req.native ? req.native : null;
    const arc = native ? readFileOr(root, `native-ad-copy/arcs/${native.arc}.md`, `The native story arc "${native.arc}"`) : "";
    const formId = native ? (native.form ?? "personal-journey") : "";
    const form = native ? readFileOr(root, `native-ad-copy/forms/${formId}.md`, `The native copy form "${formId}"`) : "";
    const indirect = formId === INDIRECT_FORM ? cardOf("indirect-ads", root) : "";
    const wanted = new Set([...task.principles, ...included.flatMap((s) => s.principles), ...(format?.principles ?? [])]);
    const dir = path.join(root, "ad-script-principles", "sections");
    const order = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)) : [];
    const unknown = [...wanted].filter((s) => !order.includes(s));
    if (unknown.length)
        throw new Error(`Unknown principle section${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}. See skills/ad-script-principles/sections.`);
    const sections = SECTION_ORDER.filter((s) => wanted.has(s)).concat([...wanted].filter((s) => !SECTION_ORDER.includes(s))).filter((s) => !req.onlySections || req.onlySections.includes(s));
    const stable = [
        `<skill name="${taskName}" role="task: what to do">\n${task.body}\n</skill>`,
        ...included.map((s) => `<skill name="${s.name}" role="method the task refers to">\n${s.body}\n</skill>`),
        sections.length ? `<principles role="what a good script is; reference, not instructions">\n${sections.map((s) => readFileOr(root, `ad-script-principles/sections/${s}.md`, `Principle section "${s}"`)).join("\n\n---\n\n")}\n</principles>` : "",
    ].filter(Boolean);
    const parts = [
        type ? `<script-type name="${type.id}" role="the architecture of this script">\n${readFileOr(root, `script-types/types/${type.id}.md`, `The recipe for script type "${type.id}"`)}\n</script-type>` : "",
        emotions ? `<emotion-scale role="how the chosen feel is written">\n${emotions}\n</emotion-scale>` : "",
        arc ? `<story-arc name="${native!.arc}" role="the narrator's stance in this story">\n${arc}\n</story-arc>` : "",
        indirect ? `<skill name="indirect-ads" role="method: the kind of ad this copy belongs to; it wins over the task skill on length, narrator and where the click goes">\n${indirect}\n</skill>` : "",
        form ? `<copy-form name="${formId}" role="the shape of this piece; it wins over the spine where they differ">\n${form}\n</copy-form>` : "",
        format && formatName ? `<skill name="${formatName}"${formatParts?.medium ? ` part="${formatParts.medium}"` : ""} role="format: adjusts the task for this format">\n${format.body}\n</skill>` : "",
    ].filter(Boolean);
    const used = [taskName, ...included.map((s) => s.name), ...(type ? [`script-types/${type.id}`] : []), ...(emotions ? ["script-types/emotions"] : []), ...(indirect ? ["indirect-ads"] : []), ...(native ? [`native-ad-copy/forms/${formId}`, `native-ad-copy/arcs/${native.arc}`] : []), ...(formatName ? [formatName] : []), ...(sections.length ? [`principles: ${sections.join(", ")}`] : [])];
    return { text: [...stable, ...parts].join("\n\n"), stable: stable.join("\n\n"), own: parts.join("\n\n"), used, sections };
}
function cardOf(name: string, root: string): string {
    for (const f of ["CARD.md", "SKILL.md"]) {
        const file = path.join(root, name, f);
        if (fs.existsSync(file))
            return strip(fs.readFileSync(file, "utf-8")).replace(/<!--[\s\S]*?-->\s*/g, "").trim();
    }
    return "";
}
export const CORE_SECTIONS = ["claims-and-specificity", "beats", "hook-and-bridges", "voice", "length-and-format"];
export const SECTION_ORDER = ["desire-and-research", "buyer-stage", "offer", "claims-and-specificity", "beats", "problem", "promise-and-mechanism", "hook-and-bridges", "objections-proof-cta", "identity", "story", "voice", "length-and-format"];
export interface FormatSkill {
    name: string;
    medium: Medium | null;
    core: string;
    part: string;
    text: string;
}
export function formatSkill(name: string, medium: Medium, root: string = env.SKILLS_DIR): FormatSkill | null {
    const file = path.join(root, name, "SKILL.md");
    if (!fs.existsSync(file))
        return null;
    const md = fs.readFileSync(file, "utf-8");
    const core = strip(md);
    const partFile = path.join(root, name, `${medium}.md`);
    const has = list(parseFrontMatter(md).media).includes(medium) && fs.existsSync(partFile);
    const part = has ? fs.readFileSync(partFile, "utf-8").trim() : "";
    return { name, medium: has ? medium : null, core, part, text: [core, part].filter(Boolean).join("\n\n") };
}
export function formatMediaOnDisk(name: string, root: string = env.SKILLS_DIR): Medium[] {
    const file = path.join(root, name, "SKILL.md");
    return fs.existsSync(file) ? (list(parseFrontMatter(fs.readFileSync(file, "utf-8")).media).filter((m) => m === "image" || m === "video") as Medium[]) : [];
}
export function formatSkillText(type: OutputType, root: string = env.SKILLS_DIR, medium: Medium = mediumOf(type)): {
    name: string;
    text: string;
    medium: Medium | null;
} | null {
    const hit = formatSkill(FORMAT_SKILL[type], medium, root);
    return hit ? { name: hit.name, text: hit.text, medium: hit.medium } : null;
}
export function exactSkillText(root: string = env.SKILLS_DIR): string {
    const file = path.join(root, TASK_SKILL.exact, "SKILL.md");
    return fs.existsSync(file) ? strip(fs.readFileSync(file, "utf-8")) : "";
}
export function nativeImageSkillText(image: string, root: string = env.SKILLS_DIR): string {
    const file = path.join(root, "native-ad-types", image, "SKILL.md");
    return fs.existsSync(file) ? strip(fs.readFileSync(file, "utf-8")) : "";
}
export function nativeCreativeText(image: string, root: string = env.SKILLS_DIR): string {
    const file = path.join(root, "native-ad-creative", "SKILL.md");
    const creative = fs.existsSync(file) ? strip(fs.readFileSync(file, "utf-8")) : "";
    const type = nativeImageSkillText(image, root);
    return [creative, type && `IMAGE TYPE FOR THIS AD: native-${image}\n${type}`].filter(Boolean).join("\n\n");
}
