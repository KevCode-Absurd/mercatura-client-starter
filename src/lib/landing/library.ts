import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export type LibraryDomain = "landing-pages" | "cro" | "speed" | "security";
export interface Card {
    id: string;
    title: string;
    summary: string;
    use_when: string;
    steps: string[];
    caveats: string[];
    tags: string[];
    section?: string;
    source_name?: string;
    domain: LibraryDomain;
}
const cache = new Map<LibraryDomain, Card[]>();
export function cards(domain: LibraryDomain): Card[] {
    if (!cache.has(domain)) {
        const f = path.join(env.SKILLS_DIR, "landing-pages", "library", "cards", `${domain}.json`);
        const list = fs.existsSync(f) ? ((JSON.parse(fs.readFileSync(f, "utf-8")) as {
            cards: Omit<Card, "domain">[];
        }).cards ?? []) : [];
        cache.set(domain, list.map((c) => ({ ...c, steps: c.steps ?? [], caveats: c.caveats ?? [], tags: c.tags ?? [], domain })));
    }
    return cache.get(domain)!;
}
const STOP = new Set("the a an and or of to for in on with is are be it this that your you by as at from not no".split(" "));
const terms = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "");
export function searchCards(query: string, domains: LibraryDomain[], n = 3): Card[] {
    const q = [...new Set(terms(query).map(stem))];
    if (!q.length)
        return [];
    const scored: {
        c: Card;
        s: number;
    }[] = [];
    for (const d of domains) {
        for (const c of cards(d)) {
            const title = new Set(terms(c.title).map(stem));
            const tags = new Set(c.tags.flatMap((t) => terms(t)).map(stem));
            const body = new Set(terms(`${c.summary} ${c.use_when}`).map(stem));
            let s = 0;
            for (const w of q)
                s += (title.has(w) ? 3 : 0) + (tags.has(w) ? 2 : 0) + (body.has(w) ? 1 : 0);
            if (s > 0)
                scored.push({ c, s });
        }
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.c);
}
export const cardCounts = (): Record<LibraryDomain, number> => ({ "landing-pages": cards("landing-pages").length, cro: cards("cro").length, speed: cards("speed").length, security: cards("security").length });
