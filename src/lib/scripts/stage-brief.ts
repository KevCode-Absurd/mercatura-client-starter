import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
const read = (root: string, rel: string) => {
    const f = path.join(root, "buyer-stage", rel);
    return fs.existsSync(f) ? fs.readFileSync(f, "utf-8").trim() : "";
};
let on = true;
export const setStageBrief = (v: boolean) => {
    on = v;
};
export function stageBrief(awareness: string, sophistication: number, root: string = env.SKILLS_DIR): string {
    if (!on)
        return "";
    const stage = read(root, `awareness/${awareness}.md`);
    const arguing = read(root, `sophistication/${Math.round(sophistication)}.md`);
    const late = stage && arguing && (awareness === "unaware" || awareness === "problem_aware") ? "The way of arguing below is for where the product arrives, which for this buyer is late: it never moves the product into the opening." : "";
    const parts = [stage, late, arguing].filter(Boolean);
    return parts.length ? `How to write for this buyer:\n${parts.join("\n")}` : "";
}
