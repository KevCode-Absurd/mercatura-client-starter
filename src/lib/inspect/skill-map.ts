import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "../env";
import { STEPS } from "../llm/steps";
import { LIBRARY_DIR } from "../skills/registry";
import { signatureLines } from "./blocks";
export type Root = "skills" | "prompts";
export interface FileUse {
    task: string;
    where: "system" | "user";
    share: number;
    last: string;
    recent: boolean;
}
export interface MapFile {
    root: Root;
    rel: string;
    group: string;
    chars: number;
    lines: number;
    uses: FileUse[];
}
export interface MapGroup {
    root: Root;
    name: string;
    description: string;
    files: MapFile[];
    otherFiles: number;
    chars: number;
    namedIn: string[];
    state: "loads" | "earlier" | "named" | "unused";
    tasks: string[];
}
export interface SkillMap {
    groups: MapGroup[];
    loose: string[];
    builtAt: string;
    callsRead: number;
}
const PROMPTS_DIR = () => path.join(process.cwd(), "prompts");
export const rootDir = (root: Root) => (root === "skills" ? env.SKILLS_DIR : PROMPTS_DIR());
function walk(dir: string, visit: (file: string) => void) {
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "__MACOSX" || e.name === "node_modules" || e.name === LIBRARY_DIR)
            continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory())
            walk(full, visit);
        else
            visit(full);
    }
}
interface Seen {
    last: string;
    recent: boolean;
}
function liveTasks(): Set<string> | null {
    const src = path.join(process.cwd(), "src");
    if (!fs.existsSync(src))
        return null;
    const live = new Set(STEPS.flatMap((s) => [s.task, ...(s.also ?? [])]));
    walk(src, (f) => {
        if (!/\.(ts|tsx)$/.test(f))
            return;
        for (const m of fs.readFileSync(f, "utf-8").matchAll(/\btask: "([a-z_]+)"/g))
            live.add(m[1]);
    });
    return live;
}
function linesSent(wanted: Set<string>): {
    index: Map<string, Map<string, Seen>>;
    calls: number;
} {
    const index = new Map<string, Map<string, Seen>>();
    const live = liveTasks();
    const note = (text: string, key: string, at: string, recent: boolean) => {
        if (live && !live.has(key.split("|")[0]))
            return;
        for (const raw of text.split(/\r?\n/)) {
            const line = raw.trim();
            if (line.length < 40 || !wanted.has(line))
                continue;
            let by = index.get(line);
            if (!by)
                index.set(line, (by = new Map()));
            const had = by.get(key);
            if (!had)
                by.set(key, { last: at, recent });
            else {
                if (at > had.last)
                    had.last = at;
                had.recent ||= recent;
            }
        }
    };
    const recent = db.all<{
        task: string;
        s: string;
        u: string;
        at: string;
    }>(sql `select task, system_prompt s, user_prompt u, created_at at from (select task, system_prompt, user_prompt, created_at, row_number() over (partition by task order by created_at desc) rn from llm_calls where status = 'ok' and task != 'prompt_cache') where rn <= 8`);
    for (const r of recent) {
        note(r.s, `${r.task}|system`, r.at, true);
        note(r.u, `${r.task}|user`, r.at, true);
    }
    const earlier = db.all<{
        task: string;
        s: string;
        at: string;
    }>(sql `select task, system_prompt s, max(created_at) at from llm_calls where task != 'prompt_cache' group by task, system_prompt`);
    for (const r of earlier)
        note(r.s, `${r.task}|system`, r.at, false);
    return { index, calls: recent.length };
}
function namedIn(names: {
    root: Root;
    name: string;
}[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    const src = path.join(process.cwd(), "src");
    if (!fs.existsSync(src))
        return out;
    const sources: {
        rel: string;
        text: string;
    }[] = [];
    walk(src, (f) => {
        if (!/\.(ts|tsx)$/.test(f) || /[\\/](landing|inspect)[\\/]/.test(f))
            return;
        sources.push({ rel: path.relative(process.cwd(), f).split(path.sep).join("/"), text: fs.readFileSync(f, "utf-8") });
    });
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const n of names) {
        const re = n.root === "skills" ? new RegExp(`["'\`/]${esc(n.name)}["'\`/]`) : new RegExp(`["'\`]${esc(n.name.replace(/\.md$/, ""))}["'\`]`);
        const hits = sources.filter((s) => re.test(s.text)).map((s) => s.rel);
        if (hits.length)
            out.set(`${n.root}:${n.name}`, hits);
    }
    return out;
}
function build(): SkillMap {
    const files: MapFile[] = [];
    const sigs = new Map<string, string[]>();
    const other = new Map<string, number>();
    const loose: string[] = [];
    const describe = new Map<string, string>();
    for (const root of ["skills", "prompts"] as const) {
        const base = rootDir(root);
        walk(base, (full) => {
            const rel = path.relative(base, full).split(path.sep).join("/");
            const group = root === "skills" ? rel.split("/")[0] : rel;
            if (root === "skills" && !rel.includes("/")) {
                if (!/^README\.md$/i.test(rel))
                    loose.push(rel);
                return;
            }
            if (!/\.md$/i.test(full)) {
                other.set(`${root}:${group}`, (other.get(`${root}:${group}`) ?? 0) + 1);
                return;
            }
            const md = fs.readFileSync(full, "utf-8");
            const lines = signatureLines(md);
            sigs.set(`${root}:${rel}`, lines);
            files.push({ root, rel, group, chars: md.length, lines: lines.length, uses: [] });
            if (root === "skills" && rel === `${group}/SKILL.md`)
                describe.set(group, md.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? "");
            if (root === "prompts")
                describe.set(group, md.match(/^<!--\s*([\s\S]*?)\s*-->/)?.[1]?.replace(/\s+/g, " ").slice(0, 240) ?? "");
        });
    }
    const wanted = new Set<string>();
    for (const lines of sigs.values())
        for (const l of lines)
            wanted.add(l);
    const { index, calls } = linesSent(wanted);
    for (const f of files) {
        const lines = sigs.get(`${f.root}:${f.rel}`)!;
        const by = new Map<string, {
            n: number;
            last: string;
            recent: boolean;
        }>();
        for (const l of lines) {
            for (const [key, seen] of index.get(l) ?? []) {
                const had = by.get(key) ?? { n: 0, last: "", recent: false };
                had.n++;
                if (seen.last > had.last)
                    had.last = seen.last;
                had.recent ||= seen.recent;
                by.set(key, had);
            }
        }
        f.uses = [...by.entries()]
            .map(([key, v]): FileUse => ({ task: key.split("|")[0], where: key.split("|")[1] as FileUse["where"], share: lines.length ? v.n / lines.length : 0, last: v.last, recent: v.recent }))
            .filter((u) => u.share >= 0.2 && u.share * lines.length >= 2)
            .sort((a, b) => Number(b.recent) - Number(a.recent) || b.share - a.share);
    }
    const names = [...new Set(files.map((f) => `${f.root}:${f.group}`))].map((k) => ({ root: k.split(":")[0] as Root, name: k.slice(k.indexOf(":") + 1) }));
    const named = namedIn(names);
    const groups = names.map((n): MapGroup => {
        const mine = files.filter((f) => f.root === n.root && f.group === n.name).sort((a, b) => a.rel.localeCompare(b.rel));
        const uses = mine.flatMap((f) => f.uses);
        const inCode = named.get(`${n.root}:${n.name}`) ?? [];
        return {
            root: n.root,
            name: n.name,
            description: describe.get(n.name) ?? "",
            files: mine,
            otherFiles: other.get(`${n.root}:${n.name}`) ?? 0,
            chars: mine.reduce((s, f) => s + f.chars, 0),
            namedIn: inCode,
            state: uses.some((u) => u.recent) ? "loads" : uses.length ? "earlier" : inCode.length ? "named" : "unused",
            tasks: [...new Set(uses.filter((u) => u.recent).map((u) => u.task))].sort(),
        };
    });
    for (const key of other.keys()) {
        const [root, name] = [key.split(":")[0] as Root, key.slice(key.indexOf(":") + 1)];
        if (groups.some((g) => g.root === root && g.name === name))
            continue;
        const inCode = namedIn([{ root, name }]).get(key) ?? [];
        groups.push({ root, name, description: "", files: [], otherFiles: other.get(key)!, chars: 0, namedIn: inCode, state: inCode.length ? "named" : "unused", tasks: [] });
    }
    groups.sort((a, b) => a.root.localeCompare(b.root) || a.name.localeCompare(b.name));
    return { groups, loose: loose.sort(), builtAt: new Date().toISOString(), callsRead: calls };
}
const g = globalThis as unknown as {
    __skillMap?: {
        at: number;
        map: SkillMap;
    };
    __lineOwners?: {
        at: number;
        map: Map<string, string>;
    };
};
export function forgetSkillMap() {
    g.__skillMap = undefined;
    g.__lineOwners = undefined;
}
export function skillMap(fresh = false): SkillMap {
    if (!fresh && g.__skillMap && Date.now() - g.__skillMap.at < 60000)
        return g.__skillMap.map;
    const map = build();
    g.__skillMap = { at: Date.now(), map };
    return map;
}
export function lineOwners(): Map<string, string> {
    if (g.__lineOwners && Date.now() - g.__lineOwners.at < 60000)
        return g.__lineOwners.map;
    const owners = new Map<string, string>();
    for (const root of ["skills", "prompts"] as const) {
        const base = rootDir(root);
        walk(base, (full) => {
            if (!/\.md$/i.test(full))
                return;
            const rel = `${root}/${path.relative(base, full).split(path.sep).join("/")}`;
            for (const l of signatureLines(fs.readFileSync(full, "utf-8")))
                if (!owners.has(l))
                    owners.set(l, rel);
        });
    }
    g.__lineOwners = { at: Date.now(), map: owners };
    return owners;
}
export function readInstructionFile(p: string): {
    root: Root;
    rel: string;
    text: string;
} | null {
    const root = p.startsWith("skills/") ? "skills" : p.startsWith("prompts/") ? "prompts" : null;
    if (!root)
        return null;
    const base = rootDir(root);
    const full = path.resolve(base, p.slice(root.length + 1));
    if (!full.startsWith(base + path.sep) || !/\.md$/i.test(full) || !fs.existsSync(full))
        return null;
    return { root, rel: path.relative(base, full).split(path.sep).join("/"), text: fs.readFileSync(full, "utf-8") };
}
