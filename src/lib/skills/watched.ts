import fs from "node:fs";
import path from "node:path";
import { CATALOGUE, type CatalogueFormat } from "../catalogue";
import { env } from "../env";
import { listSkills, type SkillInfo } from "./registry";
export interface WatchedSkill {
    file: string;
    folder: string;
    name: string;
    description: string;
    module: "creative" | "landing";
    formats: string[];
    also: string[];
}
const exists = (p: string) => {
    try {
        return fs.statSync(p).isFile();
    }
    catch {
        return false;
    }
};
export function defaultFileOf(folder: string): string | null {
    const dir = path.join(env.SKILLS_DIR, folder);
    if (exists(path.join(dir, "CARD.md")))
        return `skills/${folder}/CARD.md`;
    if (exists(path.join(dir, "SKILL.md")))
        return `skills/${folder}/SKILL.md`;
    return null;
}
export function skillByName(name: string, all: SkillInfo[] = listSkills()): SkillInfo | undefined {
    const n = name.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    return all.find((s) => s.path.toLowerCase() === n) ?? all.find((s) => s.path.toLowerCase().startsWith(`${n}/`)) ?? all.find((s) => s.name.toLowerCase() === n) ?? all.find((s) => path.basename(s.path).toLowerCase() === n);
}
export function filesBehind(used: string[], most = 4): string[] {
    const all = listSkills();
    const out: string[] = [];
    for (const u of used) {
        if (!u)
            continue;
        const skill = skillByName(u, all);
        let file: string | null = null;
        if (skill && u.toLowerCase() !== skill.path.toLowerCase() && u.toLowerCase().startsWith(`${skill.path.toLowerCase()}/`)) {
            const part = u.slice(skill.path.length + 1);
            const p = path.join(env.SKILLS_DIR, skill.path, `${part}.md`);
            if (exists(p))
                file = `skills/${skill.path}/${part}.md`;
        }
        file ??= skill ? defaultFileOf(skill.path) : null;
        if (file && !out.includes(file))
            out.push(file);
        if (out.length >= most)
            break;
    }
    return out;
}
export function filesForArea(area: "words" | "pictures" | "video" | "landing"): string[] {
    const names = area === "landing" ? ["landing-pages"] : area === "words" ? ["copy-principles", "copy-craft"] : area === "video" ? ["production-principles", "ugc-script"] : ["image-ad-copy", "image-prompt-craft", "production-principles"];
    return filesBehind(names);
}
export function watchedSkills(): WatchedSkill[] {
    const all = listSkills();
    const byFile = new Map<string, WatchedSkill>();
    const take = (f: CatalogueFormat, module: WatchedSkill["module"]) => {
        for (const name of f.skills) {
            const skill = skillByName(name, all);
            const file = skill && defaultFileOf(skill.path);
            if (!skill || !file)
                continue;
            const had = byFile.get(file);
            if (had) {
                if (!had.formats.includes(f.id))
                    had.formats.push(f.id);
                continue;
            }
            const dir = path.join(env.SKILLS_DIR, skill.path);
            const also = fs
                .readdirSync(dir)
                .filter((n) => /\.md$/i.test(n) && `skills/${skill.path}/${n}` !== file && !/^readme/i.test(n))
                .map((n) => `skills/${skill.path}/${n}`);
            byFile.set(file, { file, folder: skill.path, name: skill.title, description: skill.description, module, formats: [f.id], also });
        }
    };
    for (const f of CATALOGUE.filter((x) => x.medium !== "page"))
        take(f, "creative");
    for (const f of CATALOGUE.filter((x) => x.medium === "page"))
        take(f, "landing");
    return [...byFile.values()];
}
export function isWatchedFile(file: string): boolean {
    const w = watchedSkills();
    return w.some((s) => s.file === file || s.also.includes(file));
}
