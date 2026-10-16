const SYNONYMS: [
    RegExp,
    string
][] = [
    [/^(user[- ]generated content|ugc style|ugc video|ugc-style)$/, "ugc"],
    [/^(9:16( vertical)?|vertical( video| 9:16)?|vertical format)$/, "vertical 9:16"],
    [/^(static|static image|static ad|single image|static graphic)$/, "static image"],
    [/^(carousel|carousel ad|multi-image carousel)$/, "carousel"],
    [/^(3d|3d render|3d product render|3d animation|3d motion graphics)$/, "3d render"],
    [/^(before and after|before-after|before\/after|before & after)$/, "before and after"],
    [/^(testimonial|customer testimonial|testimonials)$/, "testimonial"],
    [/^(talking head|talking-head|direct to camera|direct-to-camera)$/, "talking head"],
    [/^(asmr|asmr\/sensory|asmr-style|asmr style)$/, "asmr"],
    [/^(problem[- ]agitation[- ]solution|pas|problem-solution|problem\/solution)$/, "problem-solution"],
    [/^(english|en|en-us|en-gb|english \(loanword\))$/, "english"],
    [/^(none|no spoken language|music-only|none \/ instrumental|instrumental)$/, "no speech"],
];
export function normalizeTag(t: string): string {
    return t
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\s*\/\s*/g, "/")
        .replace(/\s*&\s*/g, " & ")
        .replace(/\s+/g, " ")
        .replace(/^[\s,.;-]+|[\s,.;-]+$/g, "")
        .trim();
}
export function canonical(t: string): string {
    const n = normalizeTag(t);
    for (const [re, to] of SYNONYMS)
        if (re.test(n))
            return to;
    return n;
}
export function normalizeTags(raw: Record<string, unknown> | undefined): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [facet, values] of Object.entries(raw ?? {})) {
        if (!Array.isArray(values))
            continue;
        const set = new Set(values.filter((v): v is string => typeof v === "string" && !!v.trim()).map(canonical));
        out[facet] = [...set].sort();
    }
    return out;
}
export const FORMAT_BUCKETS = ["ugc", "static", "carousel", "animation", "vsl", "demo", "testimonial", "before_after", "advertorial"] as const;
export type FormatBucket = (typeof FORMAT_BUCKETS)[number];
const BUCKET_RULES: [
    FormatBucket,
    RegExp
][] = [
    ["ugc", /\bugc\b|creator|talking head|selfie|vlog|pov/],
    ["static", /static|image|poster|graphic|meme|tweet|screenshot/],
    ["carousel", /carousel|slides?\b|multi-image/],
    ["animation", /animat|3d|claymation|motion graphic|cartoon|illustrat/],
    ["vsl", /\bvsl\b|video sales|long[- ]form|explainer|documentary|founder story/],
    ["demo", /demo|how[- ]to|tutorial|unboxing|product highlight|asmr/],
    ["testimonial", /testimonial|review|social proof/],
    ["before_after", /before and after|before-after|transformation/],
    ["advertorial", /advertorial|editorial|article|listicle|native ad/],
];
export function formatBuckets(kind: string, tags: Record<string, string[]>, categories: string[]): FormatBucket[] {
    const text = [...(tags.format ?? []), ...(tags.style ?? []), ...(tags.approach ?? []), ...categories.map(normalizeTag)].join(" | ");
    const hits = new Set(BUCKET_RULES.filter(([, re]) => re.test(text)).map(([b]) => b));
    if (kind === "image" && !hits.has("carousel"))
        hits.add("static");
    return FORMAT_BUCKETS.filter((b) => hits.has(b));
}
export function awarenessKey(stage: string | undefined): string | null {
    if (!stage || stage === "unknown")
        return null;
    return stage.replace(/-/g, "_");
}
export function sophisticationKey(stage: string | undefined): string | null {
    const m = stage?.match(/(\d)/);
    return m ? m[1] : null;
}
