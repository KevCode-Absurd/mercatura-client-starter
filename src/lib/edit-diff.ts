export const EDIT_THRESHOLDS = {
    repeat: 3,
    maxPhrase: 5,
    minKept: 0.5,
    shorterMinWords: 6,
    shorterShare: 0.7,
    lookBack: 3000,
    maxPart: 3,
} as const;
export interface EditChange {
    kind: "cut" | "swap" | "shorter" | "number" | "case";
    from: string;
    to: string;
    tag?: string;
}
export const MAX_PHRASE = EDIT_THRESHOLDS.maxPhrase;
export const MIN_KEPT = EDIT_THRESHOLDS.minKept;
const MAX_TOKENS = 2500;
const PLAIN = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "is", "it", "for", "with", "as", "at", "by", "be"]);
function bare(words: string[]): string[] {
    let a = 0;
    let b = words.length;
    while (a < b && PLAIN.has(words[a]))
        a++;
    while (b > a && PLAIN.has(words[b - 1]))
        b--;
    return words.slice(a, b);
}
export function editTokens(text: string): string[] {
    return text.toLowerCase().replace(/[‘’]/g, "'").match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*%?|[—–!…]|\p{Extended_Pictographic}/gu) ?? [];
}
function hunks(a: string[], b: string[]): {
    kept: number;
    hunks: {
        del: string[];
        ins: string[];
    }[];
} {
    const n = a.length;
    const m = b.length;
    const w = m + 1;
    const t = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
            t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    const out: {
        del: string[];
        ins: string[];
    }[] = [];
    let cur: {
        del: string[];
        ins: string[];
    } | null = null;
    const open = () => (cur ??= { del: [], ins: [] });
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
        if (i < n && j < m && a[i] === b[j]) {
            if (cur)
                out.push(cur);
            cur = null;
            i++;
            j++;
        }
        else if (i < n && (j >= m || t[(i + 1) * w + j] >= t[i * w + j + 1]))
            open().del.push(a[i++]);
        else
            open().ins.push(b[j++]);
    }
    if (cur)
        out.push(cur);
    return { kept: t[0], hunks: out };
}
const NUMBER_WORDS = new Set("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million".split(" "));
const isDigits = (t: string) => /^\d/.test(t);
const parts = (words: string[]) => words.flatMap((w) => w.split("-"));
function numberChange(del: string[], ins: string[]): string | null {
    const d = parts(del);
    const i = parts(ins);
    const numberish = (t: string) => NUMBER_WORDS.has(t) || isDigits(t) || t === "percent" || t === "per" || t === "cent" || PLAIN.has(t);
    if (d.filter((t) => !numberish(t)).join(" ") !== i.filter((t) => !numberish(t)).join(" "))
        return null;
    const pctWord = (x: string[]) => x.includes("percent") || (x.includes("per") && x.includes("cent"));
    const pctSign = (x: string[]) => x.some((t) => t.endsWith("%"));
    if (pctWord(d) && pctSign(i) && !pctWord(i))
        return "percent sign";
    if (pctSign(d) && pctWord(i) && !pctSign(i))
        return "percent word";
    const words = (x: string[]) => x.some((t) => NUMBER_WORDS.has(t));
    const digits = (x: string[]) => x.some(isDigits);
    if (words(d) && !digits(d) && digits(i) && !words(i))
        return "digits";
    if (digits(d) && !words(d) && words(i) && !digits(i))
        return "words";
    return null;
}
const rawWords = (text: string) => text.replace(/[‘’]/g, "'").match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
function caseChange(before: string, after: string): EditChange | null {
    const a = rawWords(before);
    const b = rawWords(after);
    const now = new Map(b.map((w) => [w.toLowerCase(), w]));
    const shout = a.find((w) => /^\p{Lu}{3,}$/u.test(w.replace(/['-]/g, "")) && now.has(w.toLowerCase()) && now.get(w.toLowerCase()) !== w);
    if (shout)
        return { kind: "case", tag: "caps", from: shout, to: now.get(shout.toLowerCase())! };
    const rest = a.slice(1).filter((w) => w.length >= 4);
    const capped = rest.filter((w) => /^\p{Lu}\p{Ll}/u.test(w));
    if (rest.length >= 2 && capped.length / rest.length >= 0.6) {
        const lowered = capped.filter((w) => now.get(w.toLowerCase()) === w.toLowerCase());
        if (lowered.length >= 2)
            return { kind: "case", tag: "title", from: lowered[0], to: lowered[0].toLowerCase() };
    }
    return null;
}
export function editChanges(before: string, after: string): EditChange[] {
    const a = editTokens(before);
    const b = editTokens(after);
    if (!a.length || !b.length || a.length > MAX_TOKENS || b.length > MAX_TOKENS)
        return [];
    const out: EditChange[] = [];
    const carry = (t: string[]) => t.filter((w) => !PLAIN.has(w)).length;
    if (a.length >= EDIT_THRESHOLDS.shorterMinWords && b.length <= a.length * EDIT_THRESHOLDS.shorterShare && carry(b) <= carry(a) * EDIT_THRESHOLDS.shorterShare)
        out.push({ kind: "shorter", from: String(a.length), to: String(b.length) });
    const cased = caseChange(before, after);
    if (cased)
        out.push(cased);
    const d = hunks(a, b);
    if (d.kept / Math.max(a.length, b.length) < MIN_KEPT)
        return out;
    const seen = new Set<string>();
    for (const h of d.hunks) {
        if (!h.del.length || h.del.length > MAX_PHRASE || h.ins.length > MAX_PHRASE)
            continue;
        const num = h.ins.length ? numberChange(h.del, h.ins) : null;
        const from = (num ? h.del : bare(h.del)).join(" ");
        const to = (num ? h.ins : bare(h.ins)).join(" ");
        if (!from)
            continue;
        if (!num && to && normPhrase(from) === normPhrase(to))
            continue;
        const c: EditChange = num ? { kind: "number", tag: num, from, to } : { kind: to ? "swap" : "cut", from, to };
        const k = `${c.kind}${c.tag ?? ""}>${c.from}>${c.to}`;
        if (seen.has(k))
            continue;
        seen.add(k);
        out.push(c);
    }
    return out;
}
const EMOJI = /^\p{Extended_Pictographic}$/u;
export function normPhrase(phrase: string): string {
    return phrase
        .toLowerCase()
        .replace(/[‘’]/g, "'")
        .split(/[\s-]+/)
        .filter(Boolean)
        .map((w) => {
        if (w === "–" || w === "—")
            return "—";
        if (EMOJI.test(w))
            return "emoji";
        const base = w.replace(/'s$/, "");
        return base.length >= 5 && /[^su]s$/.test(base) && !base.endsWith("is") ? base.slice(0, -1) : base;
    })
        .join(" ");
}
export const surfaceFamily = (surface: string) => surface.split(":")[0] || "line";
export const SURFACE_LABEL: Record<string, string> = {
    line: "script lines",
    on_screen: "on-screen text",
    caption: "captions",
    hook: "hooks",
    primary_text: "primary texts",
    headline: "headlines",
    description: "descriptions",
    cta: "buttons",
    image_text: "words on pictures",
    image_prompt: "picture prompts",
    image_scene: "picture scenes",
    sprint_idea: "sprint ad ideas",
    landing: "landing page copy",
    plan: "plans",
    frame_words: "storyboard frames",
    clip_prompt: "clip prompts",
    cast: "cast notes",
    persona: "personas",
    offer: "offers",
    angle: "angles",
    hook_choice: "hook choices",
    cast_choice: "cast choices",
};
export const surfaceLabel = (surface: string) => SURFACE_LABEL[surfaceFamily(surface)] ?? surfaceFamily(surface).replace(/_/g, " ");
const COPY = new Set(["line", "on_screen", "caption", "hook", "primary_text", "headline", "description", "cta", "image_text", "landing", "offer"]);
const VIDEO = new Set(["plan", "frame_words", "clip_prompt", "cast"]);
export function surfaceArea(surfaces: string[]): "words" | "pictures" | "video" {
    const f = surfaces.map(surfaceFamily);
    if (!f.length || f.some((x) => COPY.has(x)))
        return "words";
    return f.every((x) => VIDEO.has(x)) ? "video" : "pictures";
}
export type RepeatKind = "swap" | "out" | "shorter" | "number" | "case";
const FUNCTION = new Set("a an the and or but so if of to in on at by for with as from into about over under than then that this these those it its it's i i'm i've i'd i'll me my we we're our us you your you're you'll they them their he she his her is are was were be been being am do does did not no don't doesn't didn't isn't aren't wasn't have has had having will would can can't could should may might must there here what which who when where why how all any some each every more most too also up down out off again once one".split(" "));
export function changeKeyParts(c: EditChange, surface = "line"): {
    key: string;
    from: string;
    to: string;
}[] {
    if (c.kind === "shorter")
        return [{ key: `shorter|${surfaceFamily(surface)}`, from: c.from, to: c.to }];
    if (c.kind === "number" || c.kind === "case")
        return [{ key: `${c.kind}|${c.tag ?? ""}`, from: c.from, to: c.to }];
    const from = normPhrase(c.from);
    if (!from)
        return [];
    const to = normPhrase(c.to);
    const out = [...(c.kind === "swap" && to ? [{ key: `swap|${from}|${to}`, from: c.from, to: c.to }] : []), { key: `out|${from}`, from: c.from, to: "" }];
    const raw = c.from.split(" ").filter(Boolean);
    const seen = new Set(out.map((x) => x.key));
    for (let n = 1; n <= Math.min(EDIT_THRESHOLDS.maxPart, raw.length - 1); n++) {
        for (let i = 0; i + n <= raw.length; i++) {
            const part = raw.slice(i, i + n);
            if (FUNCTION.has(part[0]) || FUNCTION.has(part[n - 1]) || part.every(isDigits))
                continue;
            const k = normPhrase(part.join(" "));
            if (!k || seen.has(`out|${k}`) || (to && ` ${to} `.includes(` ${k} `)))
                continue;
            seen.add(`out|${k}`);
            out.push({ key: `out|${k}`, from: part.join(" "), to: "" });
        }
    }
    return out;
}
export const changeKeys = (c: EditChange, surface = "line"): string[] => changeKeyParts(c, surface).map((x) => x.key);
export const phraseInside = (a: string, b: string) => a !== b && (` ${b} `.includes(` ${a} `) || ` ${a} `.includes(` ${b} `));
export function normKey(key: string): string {
    const [kind, from = "", to = ""] = key.split("|");
    if (kind === "swap")
        return `swap|${normPhrase(from)}|${normPhrase(to)}`;
    if (kind === "out")
        return `out|${normPhrase(from)}`;
    return key;
}
export function parseKey(key: string): {
    kind: RepeatKind;
    from: string;
    to: string;
} {
    const [kind, from = "", to = ""] = key.split("|");
    return { kind: (["swap", "shorter", "number", "case"] as const).find((k) => k === kind) ?? "out", from, to };
}
export const wordedInCode = (key: string) => {
    const k = parseKey(key);
    return k.kind === "shorter" || k.kind === "number" || k.kind === "case" || (k.kind === "out" && ["—", "!", "…", "emoji"].includes(k.from));
};
const MARK_RULE: Record<string, string> = {
    "—": "No long dashes. Use a full stop or a comma.",
    "!": "No exclamation marks.",
    "…": "No ellipsis (three dots).",
    emoji: "No emoji.",
};
const NUMBER_RULE: Record<string, string> = {
    digits: "Write numbers as digits, not as words.",
    words: "Write numbers as words, not as digits.",
    "percent sign": 'Write "%", not "percent".',
    "percent word": 'Write "percent", not "%".',
};
export function plainRule(key: string, show: {
    from?: string;
    to?: string;
    words?: number;
} = {}): string {
    const k = parseKey(key);
    const from = show.from || k.from;
    const to = show.to || k.to;
    if (k.kind === "shorter")
        return `Keep ${surfaceLabel(k.from)} short${show.words ? `: about ${show.words} words or fewer` : ""}.`;
    if (k.kind === "number")
        return `${NUMBER_RULE[k.from] ?? "Write numbers the same way every time."}${show.from && show.to && !k.from.startsWith("percent") ? ` For example "${show.to}", not "${show.from}".` : ""}`;
    if (k.kind === "case")
        return k.from === "title" ? "Use sentence case, not Title Case." : "No words in all capitals.";
    if (k.kind === "out" && MARK_RULE[k.from])
        return MARK_RULE[k.from];
    return k.kind === "swap" ? `Write "${to}", never "${from}".` : `Never write "${from}". Take it out or say it another way.`;
}
const share = (a: string[], b: string[]) => {
    if (!a.length || !b.length)
        return 0;
    const set = new Set(b);
    return a.filter((x) => set.has(x)).length / Math.max(a.length, b.length);
};
export interface LineText {
    text: string;
    on_screen?: string;
}
export interface LineEdit {
    surface: "line" | "on_screen";
    line: number | null;
    before: string;
    after: string;
}
export function scriptLineEdits(before: LineText[], after: LineText[]): LineEdit[] {
    const pair = new Map<number, number>();
    const taken = new Set<number>();
    const same = (i: number, j: number) => before[i].text.trim() === after[j].text.trim();
    before.forEach((_, i) => {
        if (i < after.length && same(i, i)) {
            pair.set(i, i);
            taken.add(i);
        }
    });
    before.forEach((_, i) => {
        if (pair.has(i))
            return;
        const j = after.findIndex((__, n) => !taken.has(n) && same(i, n));
        if (j > -1) {
            pair.set(i, j);
            taken.add(j);
        }
    });
    const tok = { a: before.map((l) => editTokens(l.text)), b: after.map((l) => editTokens(l.text)) };
    const options: {
        i: number;
        j: number;
        s: number;
    }[] = [];
    before.forEach((_, i) => {
        if (pair.has(i))
            return;
        after.forEach((__, j) => {
            if (taken.has(j))
                return;
            const s = share(tok.a[i], tok.b[j]) + (i === j ? 0.05 : 0);
            if (s >= 0.3)
                options.push({ i, j, s });
        });
    });
    for (const o of options.sort((x, y) => y.s - x.s)) {
        if (pair.has(o.i) || taken.has(o.j))
            continue;
        pair.set(o.i, o.j);
        taken.add(o.j);
    }
    const out: LineEdit[] = [];
    before.forEach((l, i) => {
        const j = pair.get(i);
        if (j === undefined) {
            if (l.text.trim())
                out.push({ surface: "line", line: null, before: l.text.trim(), after: "" });
            return;
        }
        const n = after[j];
        if (l.text.trim() !== n.text.trim())
            out.push({ surface: "line", line: j, before: l.text.trim(), after: n.text.trim() });
        const os = [(l.on_screen ?? "").trim(), (n.on_screen ?? "").trim()];
        if (os[0] && os[0] !== os[1])
            out.push({ surface: "on_screen", line: j, before: os[0], after: os[1] });
    });
    return out;
}
