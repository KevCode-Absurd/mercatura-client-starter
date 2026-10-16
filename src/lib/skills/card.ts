import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
const strip = (md: string) => md.replaceAll("\r\n", "\n").replace(/^---\n[\s\S]*?\n---\n/, "").replace(/<!--[\s\S]*?-->\s*/g, "").trim();
export function sharedRules(): string {
    const t = skillFor("production-principles", "focused");
    return t ? `\n\n${t}` : "";
}
export function skillFor(folder: string, level: "focused" | "full" | "minimal" = "focused"): string {
    const dir = path.join(env.SKILLS_DIR, folder);
    const card = path.join(dir, "CARD.md");
    const whole = path.join(dir, "SKILL.md");
    if (level !== "full" && fs.existsSync(card))
        return strip(fs.readFileSync(card, "utf-8"));
    return fs.existsSync(whole) ? strip(fs.readFileSync(whole, "utf-8")) : "";
}
