import fs from "node:fs";
import path from "node:path";
export const GUIDE_DIR = path.resolve("docs/guide");
export interface Chapter {
    slug: string;
    title: string;
    summary: string;
    group: "Using the app" | "How it works";
    file: string;
}
const CHAPTERS: Omit<Chapter, "title" | "summary">[] = [
    ...["01-start-here", "02-set-up-a-brand", "03-research", "04-scripts", "05-image-ads", "06-product-page-images", "07-photoshoots", "08-production", "09-feedback-and-lessons", "10-references", "11-costs-and-settings", "12-getting-the-most", "13-the-50-ad-sprint", "14-personas", "15-offers", "16-the-chat-and-the-2-views", "17-landing-pages", "18-coverage", "19-the-taste-bar", "20-best-output-workflow"].map((slug) => ({ slug, group: "Using the app" as const, file: path.join(GUIDE_DIR, `${slug}.md`) })),
    { slug: "architecture", group: "How it works", file: path.resolve("docs/ARCHITECTURE.md") },
];
function head(md: string): {
    title: string;
    summary: string;
} {
    const lines = md.split(/\r?\n/);
    const title = lines.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "Untitled";
    const summary = lines.slice(lines.findIndex((l) => l.startsWith("# ")) + 1).find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("!") && !l.startsWith(">") && !l.startsWith("|")) ?? "";
    return { title, summary: summary.trim() };
}
export function chapters(): Chapter[] {
    return CHAPTERS.filter((c) => fs.existsSync(c.file)).map((c) => ({ ...c, ...head(fs.readFileSync(c.file, "utf-8")) }));
}
export function chapter(slug: string): (Chapter & {
    body: string;
}) | null {
    const c = chapters().find((x) => x.slug === slug);
    return c ? { ...c, body: fs.readFileSync(c.file, "utf-8") } : null;
}
export function guideImage(name: string): string | null {
    if (!/^[a-z0-9-]+\.(jpg|png)$/.test(name))
        return null;
    const file = path.join(GUIDE_DIR, "img", name);
    return fs.existsSync(file) ? file : null;
}
