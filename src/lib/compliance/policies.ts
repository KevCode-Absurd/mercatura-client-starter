import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export const SKILL_DIR = path.join(env.SKILLS_DIR, "ad-compliance");
export const META_DIR = path.join(SKILL_DIR, "meta");
export const DIGEST_FILE = path.join(SKILL_DIR, "SKILL.md");
export const POLICY_INDEX_FILE = path.join(META_DIR, "index.json");
export const metaIndexFile = () => POLICY_INDEX_FILE;
export interface Policy {
    id: string;
    name: string;
    url: string;
    kind: "prohibits" | "restricts";
    source: string;
    sources: string[];
    group: string;
    rule: string;
    lookFor: string;
    fix: string;
    noSource: boolean;
}
export interface PolicyIndex {
    read_at: string;
    index: string;
    pages: {
        slug: string;
        title: string;
        url: string;
    }[];
    failed: {
        slug: string;
        url: string;
        error: string;
    }[];
}
export function policyIndex(): PolicyIndex | null {
    try {
        return JSON.parse(fs.readFileSync(POLICY_INDEX_FILE, "utf-8")) as PolicyIndex;
    }
    catch {
        return null;
    }
}
export function policiesReadOn(): string | null {
    const at = policyIndex()?.read_at;
    if (!at)
        return null;
    const d = new Date(`${at}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? at : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
export function digestText(): string {
    return fs.readFileSync(DIGEST_FILE, "utf-8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}
export function parseDigest(md: string): Policy[] {
    const out: Policy[] = [];
    let group = "";
    const lines = md.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.startsWith("## ")) {
            group = l.slice(3).trim();
            continue;
        }
        const h = l.match(/^### ([a-z0-9-]+) — (.+?) \((prohibits|restricts)\)\s*$/);
        if (!h)
            continue;
        const fields: Record<string, string> = {};
        for (let j = i + 1; j < lines.length && !lines[j].startsWith("#"); j++) {
            const f = lines[j].match(/^- (URL|Source|Rule|Look for|Fix): (.*)$/);
            if (f)
                fields[f[1]] = f[2].trim();
        }
        const source = fields.Source ?? "";
        const none = /^none/i.test(source);
        out.push({
            id: h[1],
            name: h[2].trim(),
            url: fields.URL ?? "",
            kind: h[3] as Policy["kind"],
            source: none ? "" : source,
            sources: none ? [] : source.split(/,\s*/).map((x) => x.trim()).filter(Boolean),
            group,
            rule: fields.Rule ?? "",
            lookFor: fields["Look for"] ?? "",
            fix: fields.Fix ?? "",
            noSource: none,
        });
    }
    return out;
}
let cached: {
    at: number;
    list: Policy[];
} | null = null;
export function policies(): Policy[] {
    if (cached && Date.now() - cached.at < 60000)
        return cached.list;
    const list = parseDigest(digestText());
    cached = { at: Date.now(), list };
    return list;
}
export const policyById = (id: string): Policy | undefined => policies().find((p) => p.id === id);
export const sourceExists = (p: Policy): boolean => p.sources.length > 0 && p.sources.every((f) => fs.existsSync(path.join(SKILL_DIR, f)));
export function digestForScan(): string {
    return digestText()
        .split(/\r?\n/)
        .filter((l) => !/^- (URL|Source): /.test(l))
        .join("\n");
}
