import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { formatLook, lookTypeOf, type FormatLookId, type LookType } from "../format-media";
import { formatSkill } from "../scripts/skills";
import { VISUAL_BRAND_CONTRACT } from "../creative-brand-contract";
const PLANNER_ONLY_OUT = /^## For the image prompt/m;
const WORDS = /^## Words on the picture/m;
const PROMPT = /^## For the image prompt/m;
const BRAIN = /^## What this reads from the brand brain/m;
function section(md: string, heading: RegExp): string {
    const at = md.search(heading);
    if (at < 0)
        return "";
    const rest = md.slice(at).replace(/^.*\r?\n/, "");
    const end = rest.search(/^## /m);
    return (end < 0 ? rest : rest.slice(0, end)).trim();
}
function without(md: string, heading: RegExp): string {
    const at = md.search(heading);
    if (at < 0)
        return md.trim();
    const rest = md.slice(at).replace(/^.*\r?\n/, "");
    const end = rest.search(/^## /m);
    return `${md.slice(0, at)}${end < 0 ? "" : rest.slice(end)}`.trim();
}
const TYPE_OWN = /^- \*\*Type, the look's own:\*\*[ \t]*(.+)$/m;
const TYPE_BRAND = /^- \*\*Type, the brand's:\*\*[ \t]*(.+)$/m;
const NO_TAG_FACE = "The brand's small tag face is only ever for a tag of 1 to 3 words.";
export function lookTypeRule(own: string, brand: string, choice: LookType): string {
    if (!own)
        return `Type: this format names no lettering of its own, so every added word is set in the brand's typefaces, each by its role as the brand look gives them, placed and dressed as the format's text says. ${NO_TAG_FACE}`;
    if (choice === "brand")
        return `Type: the brand's typefaces were asked for on every word of this set, the words this format draws itself included. ${brand || "Those words are the brand's body typeface redrawn in the format's own medium, with its weight, width and letter shapes kept."} Where the plan or anything else here names another lettering for those words, the brand's typefaces win. ${NO_TAG_FACE}`;
    return `Type: the words this format draws itself take the format's own lettering, and that wins over the brand's typefaces for those words. Every other added word (an offer strip, a price, a button, a line beside the logo) is set in the brand's typefaces. ${own} ${NO_TAG_FACE}`;
}
export interface FormatLookText {
    id: FormatLookId;
    label: string;
    lookType: LookType;
    planner: string;
    words: string;
    prompt: string;
    check: string;
    used: string[];
}
export function formatLookReferences(id: string | null | undefined, root = env.SKILLS_DIR): {
    file: string;
    role: string;
}[] {
    const look = formatLook(id);
    if (!look || !("reference" in look))
        return [];
    const file = path.join(root, look.skill, look.reference);
    if (!fs.existsSync(file))
        throw new Error(`The ${look.label} camera reference is missing. Restore the skill's asset before rendering.`);
    return [{ file, role: look.referenceRole }];
}
export function formatLookText(id: string | null | undefined, o: string | {
    root?: string;
    lookType?: string | null;
} = {}): FormatLookText | null {
    const { root = env.SKILLS_DIR, lookType = null } = typeof o === "string" ? { root: o } : o;
    const look = formatLook(id);
    if (!look)
        return null;
    const skill = formatSkill(look.skill, "image", root);
    if (!skill || skill.medium !== "image")
        return null;
    const core = without(skill.core, BRAIN).replace(/^Where this and the task skill differ[^\n]*\r?\n+/m, "");
    const cues = section(skill.part, PROMPT);
    const own = cues.match(TYPE_OWN)?.[1].trim() ?? "";
    const choice: LookType = own && lookType === "look" ? lookTypeOf(lookType) : "brand";
    const type = lookTypeRule(own, cues.match(TYPE_BRAND)?.[1].trim() ?? "", choice);
    const planner = [
        `# The format of this set: ${look.label}, as a still image`,
        `Every ad of this set is made in this format. The format decides what the picture is, what it is made of and how its frame is built: plan each scene inside the format's own world, by "The frame" below, and follow no library layout. The ad's type still decides what the ad argues, and the brand's look decides its colours. ${type} Where a reference the person picked or a visual world is followed, keep its structure and redraw all of it in this format. Write \`scene\` and \`layout\` so that the format is plain in them: the prompt writer reads those, not this.`,
        VISUAL_BRAND_CONTRACT,
        core,
        without(skill.part, PLANNER_ONLY_OUT),
    ].join("\n\n");
    const words = section(skill.part, WORDS);
    const prompt = cues
        .split(/\r?\n/)
        .filter((l) => !TYPE_OWN.test(l) && !TYPE_BRAND.test(l))
        .join("\n")
        .trim();
    const cueLines = prompt.split(/\r?\n/).filter((l) => l.startsWith("- ")).map((l) => l.slice(2).replace(/\*\*/g, "").trim());
    const judged = skill.part.match(/^Judged on 1 thing:[ \t]*(.+)$/m)?.[1].trim() ?? "";
    const made = cueLines.find((l) => /^(Say what it is|Style:|Open with)/i.test(l)) ?? cueLines[0] ?? "";
    const not = cueLines.find((l) => /^Not /.test(l)) ?? "";
    const check = [judged ? `It is judged on 1 thing: ${judged}` : "", made.slice(0, 420), not.slice(0, 240)].filter(Boolean).join(" ");
    return {
        id: look.id,
        label: look.label,
        lookType: choice,
        planner: `\n\n${planner}`,
        words: words ? `\n\n# The format these words sit in: ${look.label}, as a still image\n${words}` : "",
        prompt: prompt ? `THE FORMAT OF THESE IMAGES: ${look.label}, as a still image. Each prompt opens by saying what the picture is, in these terms, and holds to them. This governs how the picture is made: what it is made of, how it is lit and how its frame is built. Where a plan's \`type\`, \`look\`, \`scene\` or \`layout\` describes another kind of picture (a plain photograph, a pack shot, a library layout), write that part again in these terms. The plan keeps its argument, what happens in its scene and its words, which stay exactly as they are.\n${VISUAL_BRAND_CONTRACT}\n${prompt}\n- ${type} In TEXT, each line names the lettering or the typeface this gives it.` : "",
        check,
        used: [look.skill, `${look.skill}/image`],
    };
}
