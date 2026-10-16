export type Mode = "normal" | "advanced";
export const SECTIONS = [
    { id: "dashboard", label: "Home", paths: ["/"] },
    { id: "chat", label: "Chat", paths: ["/chat"] },
    { id: "coverage", label: "Coverage", paths: ["/coverage"] },
    { id: "create", label: "Create", paths: ["/studio", "/formats"] },
    { id: "builder", label: "Script builder", paths: ["/builder"] },
    { id: "copy-builder", label: "Copy builder", paths: ["/copy-builder"] },
    { id: "scripts", label: "Scripts", paths: ["/scripts"] },
    { id: "production", label: "Production", paths: ["/production"] },
    { id: "compliance", label: "Compliance", paths: ["/compliance"] },
    { id: "sources", label: "Sources", paths: ["/sources"] },
    { id: "insights", label: "Insights", paths: ["/insights"] },
    { id: "concepts", label: "Concepts", paths: ["/concepts"] },
    { id: "references", label: "References", paths: ["/references"] },
    { id: "brand", label: "Brand brain", paths: ["/brand", "/brands"] },
    { id: "personas", label: "Personas", paths: ["/personas"] },
    { id: "offers", label: "Offers", paths: ["/offers"] },
    { id: "lessons", label: "Lessons", paths: ["/lessons"] },
    { id: "learning", label: "Learning", paths: ["/learning"] },
    { id: "seo", label: "SEO", paths: ["/seo"] },
    { id: "landing", label: "CRO Studio", paths: ["/landing"] },
    { id: "planner", label: "Planner", paths: ["/planner"] },
    { id: "costs", label: "Costs", paths: ["/costs"] },
    { id: "inspect", label: "Inspect", paths: ["/inspect"] },
    { id: "skills", label: "Skills", paths: ["/skills"] },
    { id: "settings", label: "Settings", paths: ["/settings"] },
    { id: "guide", label: "Guide", paths: ["/guide"] },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];
export type Modes = Partial<Record<SectionId, Mode>>;
export const NO_SWITCH: SectionId[] = ["costs", "inspect", "skills", "guide", "builder", "copy-builder", "learning", "seo", "landing"];
export const MODE_COOKIE = "ce_modes";
export function sectionOf(pathname: string): SectionId {
    if (pathname === "/" || pathname === "")
        return "dashboard";
    const hit = SECTIONS.find((s) => s.id !== "dashboard" && s.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
    return hit?.id ?? "dashboard";
}
export function parseModes(raw: string | undefined | null): Modes {
    if (!raw)
        return {};
    try {
        const o = JSON.parse(raw) as Record<string, unknown>;
        const out: Modes = {};
        for (const s of SECTIONS)
            if (o[s.id] === "normal" || o[s.id] === "advanced")
                out[s.id] = o[s.id] as Mode;
        return out;
    }
    catch {
        return {};
    }
}
export const modeOf = (modes: Modes, section: SectionId, fallback: Mode): Mode => (section === "costs" ? "advanced" : (modes[section] ?? fallback));
