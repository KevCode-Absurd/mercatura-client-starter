import type { HookVariant, ScriptLine } from "@/db/schema";
export const MAX_HOOKS = 5;
export const clampHooks = (n: unknown): number => Math.min(MAX_HOOKS, Math.max(1, Math.round(Number(n)) || 1));
type Script = {
    lines: ScriptLine[];
    hook_variants: HookVariant[];
};
const same = (a: string, b: string) => a.trim() === b.trim();
export function hookLines(lines: ScriptLine[], hook: HookVariant): ScriptLine[] {
    if (!lines.length)
        return lines;
    const k = Math.min(Math.max(1, Math.round(hook.replaces ?? 1)), Math.max(1, lines.length - 1));
    const first: ScriptLine = { ...lines[0], text: hook.text.trim(), on_screen: hook.overlay ?? "", ...(hook.first_frame ? { visual_note: hook.first_frame } : {}) };
    const bridges = [...(hook.bridges ?? [])];
    const body = lines.slice(k).map((l) => {
        const at = bridges.findIndex((b) => same(b.was, l.text));
        if (at < 0)
            return l;
        const [b] = bridges.splice(at, 1);
        return { ...l, text: b.text.trim() };
    });
    return [first, ...body];
}
export const versionCount = (script: Script): number => Math.max(1, script.hook_variants.length);
export function scriptVersion(script: Script, n: number): ScriptLine[] {
    const hook = n > 1 ? script.hook_variants[n - 1] : undefined;
    return hook ? hookLines(script.lines, hook) : script.lines;
}
export function scriptVersionById(script: Script, hookId: string | null | undefined): ScriptLine[] {
    const at = hookId ? script.hook_variants.findIndex((h) => h.id === hookId) : -1;
    return at > 0 ? scriptVersion(script, at + 1) : script.lines;
}
export interface Version {
    n: number;
    hook: HookVariant | null;
    opens: string;
    lines: ScriptLine[];
    bridged: number;
}
export function versionsOf(script: Script): Version[] {
    const out: Version[] = [{ n: 1, hook: script.hook_variants[0] ?? null, opens: script.lines[0]?.text ?? "", lines: script.lines, bridged: 0 }];
    script.hook_variants.forEach((h, i) => {
        if (i === 0 || !h.whole || !h.text.trim() || same(h.text, script.lines[0]?.text ?? ""))
            return;
        const lines = hookLines(script.lines, h);
        const k = script.lines.length - (lines.length - 1);
        out.push({ n: i + 1, hook: h, opens: h.text.trim(), lines, bridged: lines.slice(1).filter((l, j) => l.text !== script.lines[k + j]?.text).length });
    });
    return out;
}
export const versionText = (lines: {
    text: string;
}[]): string => lines.map((l) => l.text).join("\n");
export function makeMain(script: Script, n: number): Script {
    const at = n - 1;
    const chosen = script.hook_variants[at];
    if (at < 1 || !chosen || !script.lines.length)
        return script;
    const old = script.lines;
    const k = old.length - (hookLines(old, chosen).length - 1);
    const lines = hookLines(old, chosen);
    const baked = (chosen.bridges ?? []).filter((b) => old.slice(k).some((l) => same(l.text, b.was)) && !same(b.was, b.text));
    const rebase = (h: HookVariant, own: boolean): HookVariant => {
        const kh = own ? 1 : Math.min(Math.max(1, Math.round(h.replaces ?? 1)), Math.max(1, old.length - 1));
        const text = [own ? old[0].text : h.text, ...old.slice(kh, k).map((l) => l.text)].map((t) => t.trim()).join(" ");
        const mine = own ? [] : (h.bridges ?? []);
        const bridges = [
            ...baked.map((b) => ({ was: b.text, text: mine.find((m) => same(m.was, b.was))?.text ?? b.was })),
            ...mine.filter((m) => !baked.some((b) => same(b.was, m.was))),
        ];
        const next: HookVariant = { ...h, text, ...(own ? { overlay: old[0].on_screen ?? "", first_frame: old[0].visual_note ?? h.first_frame, whole: true } : {}) };
        delete next.replaces;
        delete next.bridges;
        if (kh > k)
            next.replaces = 1 + kh - k;
        if (bridges.length)
            next.bridges = bridges;
        return next;
    };
    const main: HookVariant = { ...chosen };
    delete main.replaces;
    delete main.bridges;
    const opening = script.hook_variants[0];
    const rest = script.hook_variants.filter((_, i) => i !== 0 && i !== at).map((h) => rebase(h, false));
    return { lines, hook_variants: [main, rebase(opening, true), ...rest] };
}
export interface WrittenHook {
    way: string;
    text: string;
    image?: string;
    replaces: number;
    then?: string;
    overlay: string;
    first_frame: string;
    bridge_line: number;
    bridge_text: string;
}
const figures = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
const wordsOf = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
export function alike(a: string, b: string): number {
    const x = new Set(wordsOf(a));
    const y = new Set(wordsOf(b));
    if (!x.size || !y.size)
        return 0;
    return [...x].filter((w) => y.has(w)).length / Math.min(x.size, y.size);
}
const SMALL = new Set("the a an and or but so then when you your you're youre i i'm im my me we our it it's its is are was were be been to of in on at for with from that this these those there here what why how do does did don't dont have has had just still not no every each one into out up down about again than too very can can't cant will would".split(" "));
const contentWords = (s: string) => [...new Set(wordsOf(s).map((w) => w.replace(/'s$/, "").replace(/(ing|ed|es|s)$/, "")).filter((w) => w.length > 2 && !SMALL.has(w)))];
export function sameStart(a: string, b: string): string | null {
    const first = (s: string) => wordsOf(s).slice(0, 3).join(" ");
    return wordsOf(a).length >= 3 && first(a) === first(b) ? `both start "${a.trim().split(/\s+/).slice(0, 3).join(" ")}"` : null;
}
export function sharedOpening(a: {
    text: string;
    image?: string;
}, b: {
    text: string;
    image?: string;
}): string | null {
    const start = sameStart(a.text, b.text);
    if (start)
        return start;
    const ia = contentWords(a.image ?? "");
    const ib = new Set(contentWords(b.image ?? ""));
    const thing = ia.find((w) => ib.has(w));
    if (thing)
        return `both open on the same picture (${thing})`;
    const x = contentWords(a.text);
    const y = new Set(contentWords(b.text));
    const both = x.filter((w) => y.has(w));
    if (both.length >= 3 && both.length / Math.min(x.length, y.size) >= 0.5)
        return `both use the same words (${both.slice(0, 3).join(", ")})`;
    return null;
}
const MAX_REPLACES = 2;
export function acceptHooks(lines: ScriptLine[], have: HookVariant[], written: WrittenHook[], want: number, ownImage = "", person?: "first" | "second" | "third", opts: {
    sameWay?: boolean;
} = {}): {
    hooks: HookVariant[];
    refused: string[];
    sameWay: number;
} {
    const known = new Set(figures(lines.map((l) => l.text).join(" ")));
    const hooks: HookVariant[] = [];
    const refused: string[] = [];
    let sameWay = 0;
    const openings = [lines[0]?.text ?? "", ...have.map((h) => h.text)].filter(Boolean);
    const taken: {
        text: string;
        image?: string;
    }[] = openings.map((text, i) => ({ text, ...(i === 0 && ownImage ? { image: ownImage } : {}) }));
    let next = Math.max(0, ...have.map((h) => Number(h.id.match(/\d+$/)?.[0] ?? 0)));
    for (const w of written) {
        if (hooks.length >= want)
            break;
        const text = w.text.replace(/\s+/g, " ").trim();
        const short = `"${text.slice(0, 50)}"`;
        if (!text)
            continue;
        const added = figures(text).filter((n) => !known.has(n));
        if (added.length) {
            refused.push(`${short} states ${added.join(", ")}, which the script does not.`);
            continue;
        }
        if ([...openings, ...hooks.map((h) => h.text)].some((o) => alike(o, text) >= 0.8)) {
            refused.push(`${short} is an opening the script already has, said again.`);
            continue;
        }
        const bare = text.replace(/"[^"]*"|“[^”]*”/g, " ");
        const mine = /\b(i|i'm|i've|i'd|i'll|my|me)\b/i.test(bare);
        const yours = /\b(you|you're|you've|you'd|you'll|your)\b/i.test(bare);
        if ((person === "second" && mine && !yours) || (person === "first" && yours && !mine)) {
            refused.push(`${short} is said by another speaker than the ad (${person === "second" ? 'the ad talks to "you"' : 'the ad is an "I" story'}).`);
            sameWay++;
            continue;
        }
        const twin = taken.map((t) => ({ t, why: opts.sameWay ? sameStart(t.text, text) : sharedOpening(t, { text, image: w.image }) })).find((x) => x.why);
        if (twin) {
            refused.push(`${short} is not a different way in from "${twin.t.text.slice(0, 40)}": ${twin.why}.`);
            sameWay++;
            continue;
        }
        const follows = (w.then ?? "").trim() ? lines.findIndex((l, i) => i >= 1 && i <= MAX_REPLACES && alike(l.text, w.then!) >= 0.8) : -1;
        const replaces = follows >= 1 ? follows : Math.max(1, Math.round(w.replaces) || 1);
        if (replaces > MAX_REPLACES || replaces >= lines.length) {
            refused.push(`${short} would replace ${replaces} lines: a hook is the opening, not the ad.`);
            continue;
        }
        const hook: HookVariant = { id: `hk_${++next}`, type: w.way.trim().toLowerCase().slice(0, 40) || "hook", text, overlay: w.overlay.trim(), first_frame: w.first_frame.trim(), grades: { clarity: 3, relevance: 3, novelty: 3, specificity: 3, credibility: 3 }, whole: true };
        if (replaces > 1)
            hook.replaces = replaces;
        const fix = w.bridge_text.replace(/\s+/g, " ").trim();
        if (w.bridge_line > 0 && fix) {
            const was = lines[w.bridge_line - 1];
            if (!was || w.bridge_line <= replaces) {
                refused.push(`${short} needs a line changed that is not in the body.`);
                continue;
            }
            if (figures(fix).some((n) => !known.has(n))) {
                refused.push(`${short} needs a body line changed to state a figure the script does not.`);
                continue;
            }
            if (!same(was.text, fix))
                hook.bridges = [{ was: was.text, text: fix }];
        }
        hooks.push(hook);
        taken.push({ text, image: w.image });
    }
    return { hooks, refused, sameWay };
}
