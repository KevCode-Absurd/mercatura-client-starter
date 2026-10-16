export interface AvatarVoice {
    direction: string;
    name?: string;
    voice_id?: string;
    preview?: string;
    sample?: string | null;
}
export type AvatarKind = "person" | "character";
export type AvatarSource = "video" | "upload" | "drawn" | "library";
export interface Avatar {
    id: string;
    name: string;
    persona_id: string | null;
    kind: AvatarKind;
    style: string | null;
    presenter?: Record<string, string>;
    character?: string;
    portrait: string | null;
    portrait_history?: string[];
    sheet: string | null;
    panels: string[];
    styled?: Record<string, {
        sheet: string;
        panels: string[];
    }>;
    voice: AvatarVoice;
    source: AvatarSource;
    from_job: string | null;
    library_id?: string;
    created_at: string;
    updated_at: string;
}
export const PRESENTER_KEYS = ["gender", "age", "skin_tone", "eyes", "hair", "wardrobe", "features"] as const;
export type PresenterKey = (typeof PRESENTER_KEYS)[number];
export const PRESENTER_LABEL: Record<PresenterKey, {
    label: string;
    hint: string;
}> = {
    gender: { label: "Gender", hint: "woman" },
    age: { label: "Age", hint: "mid 30s" },
    skin_tone: { label: "Skin", hint: "light olive" },
    eyes: { label: "Eyes", hint: "dark brown" },
    hair: { label: "Hair", hint: "shoulder-length dark brown hair, loosely tied back" },
    wardrobe: { label: "What they wear", hint: "a plain oatmeal jumper, small gold hoops" },
    features: { label: "What marks them out", hint: "freckles across the nose, a calm half smile" },
};
export const KIND_LABEL: Record<AvatarKind, string> = { person: "A person", character: "A made character" };
export const SOURCE_LABEL: Record<AvatarSource, string> = { video: "Saved from a video", upload: "Uploaded", drawn: "Drawn from a description", library: "From the avatar library" };
export const avatarId = (name: string) => `ava_${name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28)
    .replace(/_+$/, "")}`;
export function avatarLine(a: Pick<Avatar, "kind" | "presenter" | "character">): string {
    const p = a.presenter;
    if (a.kind === "character" || !p)
        return (a.character ?? "").trim();
    return [[p.gender, p.age].filter(Boolean).join(", "), p.skin_tone && `${p.skin_tone} skin`, p.eyes && `${p.eyes} eyes`, p.hair, p.wardrobe, p.features].filter(Boolean).join("; ");
}
export function avatarCast(a: Pick<Avatar, "kind" | "presenter" | "character">): {
    presenter?: Record<string, string>;
    character?: string;
} {
    return a.kind === "person" && a.presenter ? { presenter: a.presenter } : { character: (a.character ?? "").trim() };
}
const CHILD = /\b(child|children|kid|kids|boy|girl|baby|toddler|infant|teen|teens|teenager|teenage|minor|schoolboy|schoolgirl|pre-?teen|tween)\b/i;
const statedAge = (s: string) => [...s.matchAll(/\b(\d{1,2})[- ]?(?:years?|yrs?|yo|y\.o\.)\b|\b(?:aged?|age of)\s+(\d{1,2})\b/gi)].map((m) => Number(m[1] ?? m[2]));
export function adultProblem(a: Pick<Avatar, "kind" | "presenter" | "character">): string | null {
    const no = "An avatar is always an adult. Change the description: the app never draws a child.";
    if (a.kind === "person") {
        const p = a.presenter ?? {};
        const ages = [...(p.age ?? "").matchAll(/\d{1,3}/g)].map((m) => Number(m[0]));
        if (ages.some((n) => n < 18))
            return no;
        if (CHILD.test(`${p.age ?? ""} ${p.gender ?? ""}`))
            return no;
        if (statedAge(Object.values(p).join(" ")).some((n) => n < 18))
            return no;
        return null;
    }
    return statedAge(a.character ?? "").some((n) => n < 18) ? no : null;
}
const one = (gender: string) => {
    const g = gender.trim().toLowerCase();
    if (!g || /^(all|any|both|everyone|mixed)\b/.test(g))
        return "";
    return g.replace(/\bwomen\b/, "woman").replace(/\bmen\b/, "man").replace(/\bfemales?\b/, "woman").replace(/\bmales?\b/, "man").replace(/\b(mothers|mums|moms)\b/, "woman").replace(/\b(fathers|dads)\b/, "man");
};
export function describeFromPersona(p: {
    who: {
        age: string;
        gender: string;
    };
    look: string;
}, kind: AvatarKind): {
    presenter?: Record<string, string>;
    character?: string;
} {
    if (kind === "character")
        return { character: p.look.trim() };
    return { presenter: { gender: one(p.who.gender), age: p.who.age.trim(), skin_tone: "", eyes: "", hair: "", wardrobe: "", features: p.look.trim() } };
}
