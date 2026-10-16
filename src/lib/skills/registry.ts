import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { skillTitle } from "./titles";
export const LIBRARY_DIR = "_library";
export interface SkillInfo {
    name: string;
    title: string;
    description: string;
    path: string;
}
export function parseFrontMatter(md: string): Record<string, string> {
    const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m)
        return {};
    const out: Record<string, string> = {};
    let key = "";
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv) {
            key = kv[1];
            out[key] = kv[2].replace(/^["']|["']$/g, "").trim();
        }
        else if (key && /^\s+\S/.test(line)) {
            const v = out[key];
            out[key] = (/^[>|][-+]?$/.test(v) ? "" : v + " ") + line.trim();
        }
    }
    return out;
}
export function listSkills(root: string = env.SKILLS_DIR, maxDepth = 3): SkillInfo[] {
    const found: SkillInfo[] = [];
    const walk = (dir: string, depth: number) => {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        const skillFile = entries.find((e) => e.isFile() && e.name === "SKILL.md");
        if (skillFile) {
            const fm = parseFrontMatter(fs.readFileSync(path.join(dir, skillFile.name), "utf-8"));
            const rel = path.relative(root, dir).split(path.sep).join("/");
            found.push({
                name: fm.name || path.basename(dir),
                title: skillTitle(rel, fm.title),
                description: fm.description ?? "",
                path: rel,
            });
            return;
        }
        if (depth >= maxDepth)
            return;
        for (const e of entries) {
            if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "__MACOSX" && e.name !== LIBRARY_DIR)
                walk(path.join(dir, e.name), depth + 1);
        }
    };
    walk(root, 0);
    return found.sort((a, b) => a.name.localeCompare(b.name));
}
