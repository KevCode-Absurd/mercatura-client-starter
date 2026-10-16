import type { BrandLook } from "../brand-look";
export interface Theme {
    ink: string;
    paper: string;
    primary: string;
    cta: string;
    ctaText: string;
    accent: string;
    surface: string;
    muted: string;
    fontHeading: string;
    fontBody: string;
    fontsHref: string;
    radius: string;
}
export const DEFAULT_THEME: Theme = {
    ink: "#16181d",
    paper: "#ffffff",
    primary: "#16181d",
    cta: "#1f6feb",
    ctaText: "#ffffff",
    accent: "#ffcc2e",
    surface: "#f4f4f2",
    muted: "#5b616e",
    fontHeading: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontsHref: "",
    radius: "10px",
};
const hexOk = (h: string | undefined) => !!h && /^#[0-9a-f]{6}$/i.test(h);
export function luminance(hex: string): number {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
}
const readableOn = (bg: string) => (contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111");
const SYSTEM = new Set(["arial", "helvetica", "helvetica neue", "georgia", "times new roman", "system-ui", "sans-serif", "serif", "courier new", "verdana"]);
const stackOf = (family: string, serif: boolean) => `'${family.replace(/'/g, "")}', ${serif ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"}`;
export function themeFrom(look: BrandLook | null): Theme {
    if (!look)
        return DEFAULT_THEME;
    const by = (role: string) => look.palette.find((p) => p.role === role)?.hex;
    const primary = [by("primary"), by("text")].find(hexOk) ?? DEFAULT_THEME.primary;
    const paper = [by("background"), by("surface")].find(hexOk) ?? DEFAULT_THEME.paper;
    let cta = [by("cta"), by("secondary"), by("accent")].find(hexOk) ?? DEFAULT_THEME.cta;
    if (contrast(cta, paper) < 2.2 && hexOk(primary))
        cta = primary;
    const ink = luminance(paper) > 0.5 ? (hexOk(by("text")) && contrast(by("text")!, paper) > 4.5 ? by("text")! : "#16181d") : "#f5f5f5";
    const heading = look.fonts.find((f) => f.role === "heading");
    const body = look.fonts.find((f) => f.role === "body") ?? heading;
    const families = [...new Set([heading?.family, body?.family].filter((f): f is string => !!f && !SYSTEM.has(f.toLowerCase())))];
    const weights = (f: string) => [...new Set([400, 600, 700, 800, Number(heading?.family === f ? heading.weight : body?.weight) || 400])].sort((a, b) => a - b).join(";");
    return {
        ink,
        paper,
        primary,
        cta,
        ctaText: readableOn(cta),
        accent: [by("accent"), by("other")].find(hexOk) ?? DEFAULT_THEME.accent,
        surface: hexOk(by("surface")) && by("surface") !== paper ? by("surface")! : luminance(paper) > 0.5 ? "#f4f4f2" : "#1d1f24",
        muted: luminance(paper) > 0.5 ? "#5b616e" : "#b9bdc6",
        fontHeading: heading ? stackOf(heading.family, /serif/i.test(heading.attributes) && !/sans/i.test(heading.attributes)) : DEFAULT_THEME.fontHeading,
        fontBody: body ? stackOf(body.family, /serif/i.test(body.attributes) && !/sans/i.test(body.attributes)) : DEFAULT_THEME.fontBody,
        fontsHref: families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@${weights(f)}`).join("&")}&display=swap` : "",
        radius: /pill|round/i.test(look.button) ? "999px" : "10px",
    };
}
