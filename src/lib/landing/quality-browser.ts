import { launchBrowser } from "./browser";
import { exportCroHtml } from "./studio-export";
import { pageFingerprint } from "./quality";
import type { QualityDocument, QualityRendered } from "./quality-types";
import { escapeHtml } from "./studio-render";
import { seoHandoff } from "./quality";
import { inspectRenderedDesign } from "./studio-design-checks";
import { LANDING_INTERACTIONS } from "./render";
export function qualityHtml(doc: Pick<QualityDocument, "run" | "suppliedHtml">): string {
    const html = doc.run ? exportCroHtml(doc.run) : doc.suppliedHtml || "";
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">`;
    const passive = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<base\b[^>]*>/gi, "").replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh[^>]*>/gi, "");
    return /<head\b[^>]*>/i.test(passive) ? passive.replace(/<head\b[^>]*>/i, match => match + policy) : `<!doctype html><html><head>${policy}<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${passive}</body></html>`;
}
export function qualityExportHtml(doc: QualityDocument, mode: "passive" | "functional" = "passive"): string {
    const handoff = seoHandoff(doc), m = handoff.metadata;
    if (mode === "functional" && doc.source.kind === "html")
        throw new Error("Supplied HTML supports passive audit export only; source scripts cannot be trusted as app interactions.");
    let base = mode === "passive" ? qualityHtml(doc) : doc.run ? exportCroHtml(doc.run) : (doc.suppliedHtml || "").replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<\/body>/i, `<script>${LANDING_INTERACTIONS}</script></body>`);
    if (mode === "functional")
        base = base.replace(/<meta\b[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi, "");
    let html = base.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "").replace(/<meta\b[^>]*name\s*=\s*["'](?:description|robots)["'][^>]*>/gi, "").replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, "");
    const tags = [`<title>${escapeHtml(m.title)}</title>`];
    if (m.description)
        tags.push(`<meta name="description" content="${escapeHtml(m.description)}">`);
    if (m.indexability !== "undecided")
        tags.push(`<meta name="robots" content="${m.indexability === "noindex" ? "noindex,follow" : "index,follow"}">`);
    if (m.canonical) {
        try {
            const u = new URL(m.canonical);
            if (/^https?:$/.test(u.protocol) && !u.username && !u.password)
                tags.push(`<link rel="canonical" href="${escapeHtml(u.href)}">`);
        }
        catch { }
    }
    html = html.replace(/<\/head>/i, `${tags.join("\n")}</head>`);
    return html;
}
export async function inspectQualityDocument(doc: QualityDocument): Promise<QualityRendered[]> {
    const html = qualityHtml(doc), fingerprint = pageFingerprint(doc), browser = await launchBrowser(), reports: QualityRendered[] = [];
    try {
        for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
            const context = await browser.newContext({ viewport, reducedMotion: "reduce", javaScriptEnabled: false, serviceWorkers: "block" });
            const blocked = new Set<string>();
            try {
                await context.route("**/*", async (route) => { const url = route.request().url(); if (url === "https://landing-quality.invalid/")
                    await route.fulfill({ status: 200, contentType: "text/html", body: html });
                else {
                    blocked.add(url);
                    await route.abort();
                } });
                const page = await context.newPage();
                await page.goto("https://landing-quality.invalid/", { waitUntil: "load", timeout: 20000 });
                const report = await page.evaluate(() => {
                    const compact = (s: string | null) => (s || "").replace(/\s+/g, " ").trim();
                    const visible = (e: Element) => { const r = e.getBoundingClientRect(), style = getComputedStyle(e); return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none"; };
                    const sectionId = (e: Element) => e.closest<HTMLElement>("[data-cro-section]")?.dataset.croSection || e.closest<HTMLElement>("section[id], article[id]")?.id || "page";
                    const layout: QualityRendered["layout"] = [];
                    if (document.documentElement.scrollWidth > innerWidth + 2)
                        layout.push({ kind: "horizontal overflow", sectionId: "page", evidence: `${document.documentElement.scrollWidth - innerWidth}px horizontal overflow.` });
                    const sections = [...document.querySelectorAll<HTMLElement>("[data-cro-section], main > section[id], body > section[id], main > article[id]")].filter(visible).filter((e, i, all) => all.indexOf(e) === i).map(e => ({ id: e.dataset.croSection || e.id, text: compact(e.innerText), headings: [...e.querySelectorAll("h1,h2,h3")].filter(visible).map(h => compact(h.textContent)) }));
                    if (!sections.length)
                        sections.push({ id: "page", text: compact(document.body.innerText), headings: [...document.querySelectorAll("h1,h2,h3")].filter(visible).map(e => compact(e.textContent)) });
                    const controls: QualityRendered["controls"] = [...document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a,button,input[type=submit]")].filter(visible).map((e, i) => {
                        const label = compact(e.getAttribute("aria-label") || e.textContent || (e as HTMLInputElement).value), href = e.getAttribute("href") || "";
                        const sticky = [e, ...function* () { let p = e.parentElement; while (p && p !== document.body) {
                                yield p;
                                p = p.parentElement;
                            } }()].some(n => ["fixed", "sticky"].includes(getComputedStyle(n).position));
                        const r = e.getBoundingClientRect();
                        let kind: QualityRendered["controls"][number]["kind"] = "other", status: QualityRendered["controls"][number]["status"] = "unverified", destination = href;
                        if (href.startsWith("#")) {
                            kind = "fragment";
                            try {
                                const target = document.getElementById(decodeURIComponent(href.slice(1)));
                                status = target && visible(target) ? "verified_local" : "broken";
                                destination = target ? `${target.id}: ${compact(target.textContent).slice(0, 160)}` : "Missing or hidden fragment target";
                            }
                            catch {
                                status = "broken";
                            }
                        }
                        else if (/^https?:\/\//i.test(href)) {
                            kind = "external";
                            status = "unverified";
                        }
                        else if (/^(?:javascript|data|vbscript|file):/i.test(href)) {
                            status = "unsafe";
                        }
                        else if (href.startsWith("/") || href.startsWith("./")) {
                            kind = "local";
                            status = "unverified";
                        }
                        const wasY = scrollY;
                        e.scrollIntoView({ block: "center" });
                        const at = e.getBoundingClientRect(), hit = document.elementFromPoint(Math.max(1, Math.min(innerWidth - 1, at.left + at.width / 2)), Math.max(1, Math.min(innerHeight - 1, at.top + at.height / 2)));
                        const covered = Boolean(hit && hit !== e && !e.contains(hit));
                        scrollTo(0, wasY);
                        return { sectionId: sectionId(e), locator: `${e.tagName.toLowerCase()}[${i + 1}]${e.id ? `#${e.id}` : ""}`, label, href, kind, status, destination, sticky, width: Math.round(r.width), height: Math.round(r.height), covered };
                    });
                    for (const e of [...document.querySelectorAll("p,li")].filter(visible))
                        if (parseFloat(getComputedStyle(e).fontSize) < 16 && layout.filter(l => l.kind === "small body text").length < 10)
                            layout.push({ kind: "small body text", sectionId: sectionId(e), evidence: `${getComputedStyle(e).fontSize}: ${compact(e.textContent).slice(0, 120)}` });
                    const images = [...document.images].filter(visible).map(e => { const r = e.getBoundingClientRect(), css = getComputedStyle(e); return { sectionId: sectionId(e), alt: e.alt, loaded: Boolean(e.naturalWidth), width: Math.round(r.width), height: Math.round(r.height), fit: css.objectFit, position: css.objectPosition }; });
                    return { text: compact(document.body.innerText), sections, controls, layout, images };
                });
                const design = await page.evaluate(inspectRenderedDesign);
                report.layout.push(...design.issues.map(issue => ({ kind: issue.kind, sectionId: issue.sectionId || "page", element: issue.element, evidence: `${issue.element}: ${issue.message}` })));
                for (const control of report.controls.filter(c => c.kind === "fragment" && c.status === "verified_local").slice(0, 50)) {
                    const moved = await page.evaluate(href => { const target = document.getElementById(decodeURIComponent(href.slice(1))), anchor = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].find(a => a.getAttribute("href") === href); if (!target || !anchor)
                        return false; anchor.click(); const r = target.getBoundingClientRect(); return location.hash === href && r.bottom > 0 && r.top < innerHeight; }, control.href);
                    if (!moved) {
                        control.status = "broken";
                        control.destination = "Target exists but could not be brought into view.";
                    }
                }
                reports.push({ at: new Date().toISOString(), fingerprint, viewport, ...report, unknowns: ["This is an offline rendering of the exact saved revision; source scripts and form submissions were disabled.", "External checkout, external links, remote media, inventory and payment were not tested.", "A model/checklist is not a customer usability test; record observed confusion separately.", ...(blocked.size ? [`${blocked.size} remote or unavailable resource requests were blocked; affected images/fonts may be incomplete.`] : [])] });
            }
            finally {
                await context.close();
            }
        }
    }
    finally {
        await browser.close();
    }
    return reports;
}
