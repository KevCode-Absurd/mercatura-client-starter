export type SprintGroup = "scale" | "underused" | "angle" | "experimental";
export const GROUPS: {
    id: SprintGroup;
    label: string;
    share: number;
    why: string;
}[] = [
    { id: "scale", label: "Core formats", share: 0.4, why: "Product, headline, demonstration and review executions to explore." },
    { id: "underused", label: "Everyday and explanatory", share: 0.3, why: "Daily scenes, unboxing and ingredient stories to broaden the mix." },
    { id: "angle", label: "Angle-specific", share: 0.2, why: "Formats that exist to carry 1 buyer's pain or 1 comparison." },
    { id: "experimental", label: "Experimental", share: 0.1, why: "A small bet on formats that could open a new lane." },
];
export interface SprintFormat {
    id: string;
    label: string;
    group: SprintGroup;
    weight: number;
    layouts: string[];
    textForward: boolean;
    how: string;
    needs?: "offer" | "proof" | "founder";
}
export const FORMATS: SprintFormat[] = [
    { id: "demo", label: "Demo", group: "scale", weight: 5, layouts: ["callout-diagram", "product-hero-and-minimal"], textForward: false, how: "How it is used, in 1 frame: the product in use (or open at its real opening, with what is inside it in a palm), and 1 line on how little it asks of the buyer." },
    { id: "testimonial", label: "Testimonial", group: "scale", weight: 5, layouts: ["review-and-testimonial"], textForward: true, how: "1 customer's words from the research, word for word, set large. No face beside it. The product small." },
    { id: "headline", label: "Headline", group: "scale", weight: 4, layouts: ["product-hero-and-minimal", "handmade-and-anti-design"], textForward: true, how: "The line is the ad: big type on a brand colour, the product as a small anchor." },
    { id: "montage", label: "Montage", group: "scale", weight: 2, layouts: ["lifestyle-and-editorial", "bundle-kit-and-range"], textForward: false, how: "2 to 4 moments of 1 day in 1 frame, the product in each. No faces needed: hands, surfaces, the product." },
    { id: "listicle", label: "Listicle", group: "scale", weight: 2, layouts: ["callout-diagram", "ingredient-stat-and-spec"], textForward: false, how: "3 or 4 short points around the product, each one a thing the buyer stops doing or starts feeling, each backed by an approved claim." },
    { id: "offer", label: "Offer-first", group: "scale", weight: 2, layouts: ["offer-sale-and-promo"], textForward: false, needs: "offer", how: "The price and the reason to act now, exactly as the brand's offers state them, with every condition." },
    { id: "editorial", label: "Editorial portrait", group: "underused", weight: 4, layouts: ["lifestyle-and-editorial"], textForward: false, how: "A fictional adult in a specific, believable moment. The scene carries the buyer tension. Brand copy, never invented first-person testimony." },
    { id: "unboxing", label: "Unboxing", group: "underused", weight: 4, layouts: ["bundle-kit-and-range", "product-hero-and-minimal"], textForward: false, how: "What arrives: the product and everything that comes with it, laid out side by side. Shot from above, like a parcel just opened on a table." },
    { id: "founder", label: "Founder", group: "underused", weight: 3, layouts: ["native-format-mimicry", "handmade-and-anti-design"], textForward: true, needs: "founder", how: "Why the product exists, in the founder's words from the brand's own material. With an uploaded photo of the founder the photo carries it; without one it is a signed note with no face." },
    { id: "pov", label: "POV", group: "underused", weight: 4, layouts: ["lifestyle-and-editorial", "native-format-mimicry"], textForward: false, how: "Seen through the buyer's own eyes: their hand, the place they use it (a desk, a counter, a doorway), the product. A caption in the first person." },
    { id: "behind_the_scenes", label: "Behind the scenes", group: "underused", weight: 4, layouts: ["ingredient-stat-and-spec", "conceptual-and-scale"], textForward: false, how: "What goes into it: the real ingredients, materials or parts the product guide lists, laid out next to the product. Never one the guide does not name." },
    { id: "before_after", label: "Before and after", group: "angle", weight: 3, layouts: ["before-and-after"], textForward: false, how: "The old way against the new one: what the buyer used or put up with before, against this product. Never a body, never a medical change." },
    { id: "us_vs_them", label: "Us vs them", group: "angle", weight: 3, layouts: ["comparison-and-us-vs-them"], textForward: false, how: "This product against an unbranded alternative, like for like, on 1 argument. No competitor is named or shown." },
    { id: "problem", label: "Problem agitation", group: "angle", weight: 4, layouts: ["problem-and-symptom-framing"], textForward: true, how: "The problem named in the buyer's own words from the research. The product arrives as the answer, small." },
    { id: "statistic", label: "Statistic", group: "experimental", weight: 2, layouts: ["ingredient-stat-and-spec"], textForward: true, how: "1 number the brand can prove, huge, with its source in small type." },
    { id: "collage", label: "Collage", group: "experimental", weight: 1, layouts: ["bundle-kit-and-range", "conceptual-and-scale"], textForward: false, how: "A grid of the product's real pieces: the product, its packaging, what comes with it, what it is made of." },
    { id: "expert", label: "Expert and authority", group: "experimental", weight: 1, layouts: ["press-and-authority"], textForward: false, needs: "proof", how: "Credibility the brand has earned, from its proof assets only. No invented expert and no press logo it does not have." },
    { id: "native", label: "Native format", group: "experimental", weight: 1, layouts: ["native-format-mimicry", "handmade-and-anti-design"], textForward: true, how: "Looks like a note, a reminder or a message, not an ad. No logo, no brand colours. It imitates no real platform, outlet or person." },
];
export const formatOf = (id: string) => FORMATS.find((f) => f.id === id);
export const TOP_HOOKS = ["confession", "urgency", "curiosity", "fomo", "price_anchor"] as const;
export const OTHER_HOOKS = ["bold_claim", "contrarian", "myth_busting", "if_then", "direct_address", "relatability", "reasons_why", "storytelling", "warning", "wordplay", "authority", "announcement", "contrast"] as const;
export const HOOKS: string[] = [...TOP_HOOKS, ...OTHER_HOOKS];
export const AWARENESS = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] as const;
export const words = (s: string) => s.replace(/_/g, " ");
export function apportion(total: number, weights: number[]): number[] {
    const sum = weights.reduce((a, b) => a + b, 0);
    if (!sum || total <= 0)
        return weights.map(() => 0);
    const exact = weights.map((w) => (total * w) / sum);
    const out = exact.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
    for (let k = 0; left > 0; k = (k + 1) % order.length, left--)
        out[order[k].i]++;
    return out;
}
export interface Skeleton {
    n: number;
    group: SprintGroup;
    format: string;
    product_id: string;
    text_forward: boolean;
    look?: string;
    world?: string;
}
export function skeleton(size: number, split: Record<string, number>, has: {
    offer: boolean;
    proof: boolean;
    founder?: boolean;
}, selected?: string[]): Skeleton[] {
    const usable = FORMATS.filter((f) => (!selected || selected.includes(f.id)) && (f.needs === "offer" ? has.offer : f.needs === "proof" ? has.proof : f.needs === "founder" ? has.founder !== false : true));
    if (selected && (!usable.length || size < usable.length))
        throw new Error("Choose enough ads for every enabled ad structure, or disable some structures.");
    const perGroup = apportion(size, GROUPS.map((g) => g.share));
    const slots: {
        group: SprintGroup;
        format: SprintFormat;
    }[] = [];
    if (selected) {
        const counts = apportion(size, usable.map(() => 1));
        usable.forEach((f, i) => { for (let k = 0; k < counts[i]; k++)
            slots.push({ group: f.group, format: f }); });
    }
    else
        GROUPS.forEach((g, gi) => {
            const formats = usable.filter((f) => f.group === g.id);
            const counts = apportion(perGroup[gi], formats.map((f) => f.weight));
            formats.forEach((f, fi) => {
                for (let k = 0; k < counts[fi]; k++)
                    slots.push({ group: g.id, format: f });
            });
        });
    const products = Object.entries(split).filter(([, n]) => n > 0);
    const want = apportion(slots.length, products.map(([, n]) => n));
    const given = products.map(() => 0);
    const dealt = slots.map((s) => {
        let best = 0;
        for (let p = 1; p < products.length; p++)
            if (want[p] && given[p] / want[p] < given[best] / (want[best] || 1))
                best = p;
        given[best]++;
        return { ...s, product_id: products[best]?.[0] ?? "" };
    });
    const inTurn = (group: typeof dealt): typeof dealt => {
        const left = new Map<string, typeof dealt>();
        for (const s of group)
            left.set(s.format.id, [...(left.get(s.format.id) ?? []), s]);
        const all = new Map([...left].map(([id, q]) => [id, q.length] as const));
        const out: typeof dealt = [];
        while (out.length < group.length) {
            const [id] = [...left].filter(([, q]) => q.length).sort((a, b) => b[1].length / all.get(b[0])! - a[1].length / all.get(a[0])! || Number(a[0] === out[out.length - 1]?.format.id) - Number(b[0] === out[out.length - 1]?.format.id))[0];
            out.push(left.get(id)!.shift()!);
        }
        return out;
    };
    const queues = GROUPS.map((g) => inTurn(dealt.filter((s) => s.group === g.id)));
    const ordered: typeof dealt = [];
    while (queues.some((q) => q.length))
        for (const q of queues.sort((a, b) => b.length - a.length))
            if (q.length)
                ordered.push(q.shift()!);
    const same = (i: number, j: number) => i >= 0 && j >= 0 && i < ordered.length && j < ordered.length && ordered[i].format.id === ordered[j].format.id;
    const fits = (at: number, from: number) => ordered[from].format.id !== ordered[at - 1]?.format.id && ordered[from].format.id !== ordered[at + 1]?.format.id && ordered[at].format.id !== ordered[from - 1]?.format.id && ordered[at].format.id !== ordered[from + 1]?.format.id;
    for (let i = 1; i < ordered.length; i++) {
        if (!same(i, i - 1))
            continue;
        const others = ordered.map((_, j) => j).filter((j) => Math.abs(j - i) > 1 && fits(i, j)).sort((a, b) => Math.abs(a - i) - Math.abs(b - i) || b - a);
        if (others.length)
            [ordered[i], ordered[others[0]]] = [ordered[others[0]], ordered[i]];
    }
    return ordered.map((s, i) => ({ n: i + 1, group: s.group, format: s.format.id, product_id: s.product_id, text_forward: s.format.textForward }));
}
export interface PlannedSlot extends Skeleton {
    angle: string;
    persona: string;
    awareness: string;
    hook: string;
    idea: string;
}
export interface PlanIssue {
    level: "fail" | "warn";
    message: string;
    ads?: number[];
}
export function limits(size: number, personas: number) {
    return {
        angles: { min: Math.max(2, Math.min(size >= 80 ? 18 : 9, Math.ceil(size / 6) + (size >= 30 ? 1 : 0))), max: size >= 80 ? 24 : 10, cap: Math.max(2, Math.ceil(size * 0.12)) },
        hook: { cap: Math.max(3, Math.ceil(size * 0.16)), top: Math.ceil(size / 2) },
        stage: { min: Math.floor(size * 0.1), max: Math.ceil(size * 0.4) },
        persona: { min: personas ? Math.floor((size * 0.45) / personas) : 0 },
    };
}
export function planChecks(slots: PlannedSlot[], ctx: {
    angles: string[];
    personas: string[];
    personaProducts?: Record<string, string[]>;
}): PlanIssue[] {
    const out: PlanIssue[] = [];
    const size = slots.length;
    const lim = limits(size, ctx.personas.length);
    const count = (f: (s: PlannedSlot) => string) => slots.reduce((m, s) => m.set(f(s), (m.get(f(s)) ?? 0) + 1), new Map<string, number>());
    for (const s of slots) {
        if (!ctx.angles.includes(s.angle))
            out.push({ level: "fail", ads: [s.n], message: `Ad ${s.n} has no angle from the angle map.` });
        if (!ctx.personas.includes(s.persona))
            out.push({ level: "fail", ads: [s.n], message: `Ad ${s.n} is written for "${s.persona}", which is not one of the brand's personas.` });
        if (!(AWARENESS as readonly string[]).includes(s.awareness))
            out.push({ level: "fail", ads: [s.n], message: `Ad ${s.n} has no awareness stage.` });
        if (!HOOKS.includes(s.hook))
            out.push({ level: "fail", ads: [s.n], message: `Ad ${s.n} has a hook that is not on the list ("${s.hook}").` });
        if (s.idea.trim().length < 20)
            out.push({ level: "fail", ads: [s.n], message: `Ad ${s.n} has no idea written.` });
        const buys = ctx.personaProducts?.[s.persona] ?? [];
        if (buys.length && !buys.includes(s.product_id))
            out.push({ level: "warn", ads: [s.n], message: `Ad ${s.n} is written for ${s.persona}, who is not a buyer of this product.` });
    }
    if (ctx.angles.length < lim.angles.min)
        out.push({ level: "warn", message: `${ctx.angles.length} angles for ${size} ads: ${lim.angles.min} or more keeps them apart.` });
    for (const [a, n] of count((s) => s.angle))
        if (n > lim.angles.cap)
            out.push({ level: "warn", message: `The angle "${a}" carries ${n} ads; ${lim.angles.cap} is the most 1 angle should carry.` });
    for (const a of ctx.angles)
        if (!slots.some((s) => s.angle === a))
            out.push({ level: "warn", message: `The angle "${a}" is in the map but no ad uses it.` });
    const hooks = count((s) => s.hook);
    for (const [h, n] of hooks)
        if (n > lim.hook.cap)
            out.push({ level: "warn", message: `The ${words(h)} hook opens ${n} ads; ${lim.hook.cap} is the most 1 hook should open.` });
    const top = slots.filter((s) => (TOP_HOOKS as readonly string[]).includes(s.hook)).length;
    if (top < lim.hook.top)
        out.push({ level: "warn", message: `${top} of ${size} ads use one of the 5 strongest hooks (confession, urgency, curiosity, FOMO, price anchor); at least ${lim.hook.top} should.` });
    const stages = count((s) => s.awareness);
    for (const st of AWARENESS) {
        const n = stages.get(st) ?? 0;
        if (n < lim.stage.min)
            out.push({ level: "warn", message: `${n} ads speak to a ${words(st)} buyer; at least ${lim.stage.min} should.` });
        if (n > lim.stage.max)
            out.push({ level: "warn", message: `${n} ads speak to a ${words(st)} buyer; ${lim.stage.max} is the most 1 stage should take.` });
    }
    const personas = count((s) => s.persona);
    for (const p of ctx.personas)
        if ((personas.get(p) ?? 0) < lim.persona.min)
            out.push({ level: "warn", message: `${personas.get(p) ?? 0} ads are written for ${p}; at least ${lim.persona.min} should be.` });
    const seen = new Map<string, number>();
    for (const s of slots) {
        const key = `${s.format}|${s.angle}|${s.persona}|${s.awareness}|${s.product_id}`;
        if (seen.has(key))
            out.push({ level: "warn", ads: [seen.get(key)!, s.n], message: `Ads ${seen.get(key)} and ${s.n} are the same format, angle, buyer, stage and product: 1 of them should change.` });
        else
            seen.set(key, s.n);
    }
    for (const [a, b] of overlaps(slots.map((s) => ({ n: s.n, text: s.idea })), 0.6))
        out.push({ level: "warn", ads: [a, b], message: `Ads ${a} and ${b} describe nearly the same idea.` });
    return out;
}
const STOP = new Set("a an the and or but of to in on for with your you my our is are was it its this that at as be by from not no do does i we they them their have has get got just so more than into out up one".split(" "));
const tokens = (s: string) => [...new Set((s.toLowerCase().match(/[a-zà-ÿ0-9']+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)))];
export function likeness(a: string, b: string): number {
    const x = tokens(a);
    const y = new Set(tokens(b));
    if (!x.length || !y.size)
        return 0;
    const both = x.filter((w) => y.has(w)).length;
    return both / (x.length + y.size - both);
}
export interface OverlapLine {
    n: number;
    text: string;
    more?: string[];
}
export interface OverlapOpts {
    shared?: number;
    ignore?: string[];
}
export function overlapOf(a: OverlapLine, b: OverlapLine, threshold = 0.4, o: OverlapOpts = {}): [
    string,
    string
] | null {
    const opening = (s: string) => (s.toLowerCase().match(/[a-zà-ÿ0-9']+/g) ?? []).slice(0, 3).join(" ");
    if (a.text.trim() && b.text.trim()) {
        const sameOpening = opening(a.text).split(" ").length === 3 && opening(a.text) === opening(b.text);
        if (sameOpening || likeness(a.text, b.text) >= threshold)
            return [a.text, b.text];
    }
    if (!o.shared)
        return null;
    const skip = new Set((o.ignore ?? []).flatMap(tokens));
    const meant = (s: string) => tokens(s).filter((w) => !skip.has(w));
    for (const x of [a.text, ...(a.more ?? [])].filter((l) => l.trim())) {
        const wx = meant(x);
        for (const y of [b.text, ...(b.more ?? [])].filter((l) => l.trim())) {
            const wy = new Set(meant(y));
            if (wx.filter((w) => wy.has(w)).length >= o.shared)
                return [x, y];
        }
    }
    return null;
}
export function overlaps(lines: OverlapLine[], threshold = 0.4, o: OverlapOpts = {}): [
    number,
    number
][] {
    const out: [
        number,
        number
    ][] = [];
    for (let i = 0; i < lines.length; i++)
        for (let j = i + 1; j < lines.length; j++)
            if (overlapOf(lines[i], lines[j], threshold, o))
                out.push([lines[i].n, lines[j].n]);
    return out;
}
