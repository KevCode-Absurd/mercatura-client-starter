import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { launchBrowser } from "./browser";
import { exportCroHtml } from "./studio-export";
import type { CroRun } from "./studio-types";
import { renderCroPage } from "./studio-render";
import { localAssetFile, usedCroAssets } from "./studio-assets";
export type CroLocalCheck = {
    at: string;
    fingerprint: string;
    designRevision: number;
    htmlBytes: number;
    viewport: {
        width: number;
        height: number;
    };
    samples: number;
    metrics: {
        domReadyMs: number;
        loadMs: number;
        lcpMs: number | null;
        cls: number;
    };
    findings: {
        kind: string;
        detail: string;
    }[];
    unknowns: string[];
};
export const croDesignFingerprint = (run: CroRun) => createHash("sha256").update(JSON.stringify({ sections: run.sections, brand: run.brand, quiz: run.quiz, visualSpec: run.storyboard?.visualSpec })).digest("hex");
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export async function checkCroLocalExport(run: CroRun): Promise<CroLocalCheck[]> {
    if (!run.sections.length)
        throw new Error("Build and save the page before checking the export.");
    const html = exportCroHtml(run), fingerprint = croDesignFingerprint(run), browser = await launchBrowser();
    const localFiles = new Map<string, string>(), missingLocal: string[] = [];
    for (const asset of usedCroAssets(run)) {
        const file = localAssetFile(run, asset.id);
        if (file && /\.(png|jpe?g|webp|gif)$/i.test(file))
            localFiles.set(new URL(asset.src, "https://cro-local.invalid/").href, file);
        else if (asset.local || asset.src.startsWith("/api/assets/") || asset.src.startsWith("/api/brand-file/"))
            missingLocal.push(asset.id);
    }
    const reports: CroLocalCheck[] = [];
    try {
        for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
            const samples: {
                dom: number;
                load: number;
                lcp: number | null;
                cls: number;
            }[] = [];
            let findings: CroLocalCheck["findings"] = [], unknowns: string[] = [];
            for (let sample = 0; sample < 3; sample++) {
                const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
                const blocked = new Set<string>();
                try {
                    await context.route("**/*", async (route) => { const url = route.request().url(), file = localFiles.get(url); if (url === "https://cro-local.invalid/")
                        await route.fulfill({ status: 200, contentType: "text/html", body: html });
                    else if (file) {
                        const ext = path.extname(file).slice(1).replace("jpg", "jpeg");
                        await route.fulfill({ status: 200, contentType: `image/${ext}`, body: fs.readFileSync(file) });
                    }
                    else {
                        blocked.add(url);
                        await route.abort();
                    } });
                    await context.addInitScript(() => { const w = window as Window & {
                        croMetrics?: {
                            lcp: number | null;
                            cls: number;
                        };
                    }; w.croMetrics = { lcp: null, cls: 0 }; try {
                        new PerformanceObserver(list => { const e = list.getEntries().at(-1); if (e)
                            w.croMetrics!.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
                        new PerformanceObserver(list => { for (const e of list.getEntries() as (PerformanceEntry & {
                            value?: number;
                            hadRecentInput?: boolean;
                        })[])
                            if (!e.hadRecentInput)
                                w.croMetrics!.cls += e.value || 0; }).observe({ type: "layout-shift", buffered: true });
                    }
                    catch { } });
                    const page = await context.newPage();
                    await page.goto("https://cro-local.invalid/", { waitUntil: "load", timeout: 20000 });
                    await page.waitForTimeout(500);
                    samples.push(await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming; const m = (window as Window & {
                        croMetrics?: {
                            lcp: number | null;
                            cls: number;
                        };
                    }).croMetrics; return { dom: n.domContentLoadedEventEnd, load: n.loadEventEnd, lcp: m?.lcp ?? null, cls: m?.cls || 0 }; }));
                    if (sample !== 0)
                        continue;
                    findings = await page.evaluate(() => {
                        const out: {
                            kind: string;
                            detail: string;
                        }[] = [];
                        const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
                        if (document.documentElement.scrollWidth > innerWidth + 2)
                            out.push({ kind: "layout", detail: `Horizontal overflow: ${document.documentElement.scrollWidth - innerWidth}px at ${innerWidth}px.` });
                        const broken = [...document.images].filter(i => visible(i) && !i.naturalWidth);
                        const localBroken = broken.filter(i => i.src.startsWith("data:"));
                        if (localBroken.length)
                            out.push({ kind: "assets", detail: `${localBroken.length} embedded local images failed to decode.` });
                        for (const a of [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')])
                            if (a.hash.length > 1 && !document.getElementById(decodeURIComponent(a.hash.slice(1))))
                                out.push({ kind: "links", detail: `Missing fragment target ${a.hash}.` });
                        const small = [...document.querySelectorAll("p,li")].filter(el => visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16);
                        if (small.length)
                            out.push({ kind: "mobile-readability", detail: `${small.length} visible body-copy elements are below 16px.` });
                        const details = [...document.querySelectorAll("details")];
                        let tested = 0;
                        for (const d of details.slice(0, 20)) {
                            const s = d.querySelector("summary");
                            if (!s)
                                continue;
                            const was = d.open;
                            s.click();
                            if (d.open === was)
                                out.push({ kind: "faq", detail: "A summary click did not toggle its disclosure." });
                            else
                                tested++;
                            d.open = was;
                        }
                        out.push({ kind: "faq", detail: `${tested} disclosure interactions checked.` });
                        return out.slice(0, 40);
                    });
                    if (missingLocal.length)
                        findings.push({ kind: "assets", detail: `${missingLocal.length} recorded local assets are missing or unsupported: ${missingLocal.join(", ")}.` });
                    const seen = new Set<string>();
                    let covered = 0;
                    for (let i = 0; i < 30; i++) {
                        await page.keyboard.press("Tab");
                        const f = await page.evaluate(() => {
                            const e = document.activeElement as HTMLElement | null;
                            if (!e || e === document.body)
                                return null;
                            const clean = (text: string | null | undefined) => (text || "").replace(/\s+/g, " ").trim();
                            const referenced = clean((e.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent || "").join(" "));
                            const labels = "labels" in e ? clean(Array.from((e as HTMLInputElement).labels || []).map(label => label.textContent || "").join(" ")) : "";
                            const input = e instanceof HTMLInputElement ? e : null;
                            const buttonValue = input && ["button", "submit", "reset"].includes(input.type) ? clean(input.value) || (input.type === "submit" ? "Submit" : input.type === "reset" ? "Reset" : "") : "";
                            const namesFromContent = !["INPUT", "SELECT", "TEXTAREA"].includes(e.tagName);
                            const content = namesFromContent ? clean(e.textContent) : "";
                            const imageAlt = input?.type === "image" ? clean(input.alt) : namesFromContent ? clean(Array.from(e.querySelectorAll<HTMLImageElement>("img[alt]")).map(img => img.alt).join(" ")) : "";
                            const label = referenced || clean(e.getAttribute("aria-label")) || labels || buttonValue || content || imageAlt || clean(e.getAttribute("title"));
                            const r = e.getBoundingClientRect(), hit = document.elementFromPoint(Math.max(1, Math.min(innerWidth - 1, r.left + r.width / 2)), Math.max(1, Math.min(innerHeight - 1, r.top + r.height / 2)));
                            return { key: `${e.tagName}:${e.id}:${e.textContent?.slice(0, 50)}`, covered: !!hit && hit !== e && !e.contains(hit) && r.top >= 0 && r.bottom <= innerHeight, label };
                        });
                        if (!f || seen.has(f.key))
                            break;
                        seen.add(f.key);
                        if (f.covered)
                            covered++;
                        if (!f.label)
                            findings.push({ kind: "keyboard", detail: `Focused control ${f.key} has no accessible name in the checked labels, content or attributes.` });
                    }
                    findings.push({ kind: "keyboard", detail: `${seen.size} keyboard stops exercised; ${covered} were covered at their centre by another element.` });
                    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
                    const sticky = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => ["fixed", "sticky"].includes(getComputedStyle(e).position)).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}px`; }).slice(0, 15));
                    if (sticky.length)
                        findings.push({ kind: "overlays", detail: `At page end, inspect sticky/fixed elements: ${sticky.join(", ")}. Keyboard coverage was tested; all overlap geometry is not assessed.` });
                    await page.setContent(renderCroPage(run, { preview: true, simulator: true }), { waitUntil: "load" });
                    const purchase = await page.evaluate(() => { let checks = 0, failures = 0; for (const root of document.querySelectorAll(".cro-local-simulator")) {
                        const variant = root.querySelector<HTMLSelectElement>("[data-demo-variant]")!, plan = root.querySelector<HTMLSelectElement>("[data-demo-plan]")!, add = root.querySelector<HTMLButtonElement>("[data-demo-add]")!;
                        for (const [v, p, blocked] of [["available", "one-time", false], ["sold-out", "one-time", true], ["required", "one-time", true], ["required", "subscription", false]] as const) {
                            variant.value = v;
                            plan.value = p;
                            variant.dispatchEvent(new Event("change"));
                            plan.dispatchEvent(new Event("change"));
                            checks++;
                            if (add.disabled !== blocked)
                                failures++;
                        }
                    } return { checks, failures }; });
                    findings.push({ kind: "purchase-demo", detail: `${purchase.checks} labelled local purchase states exercised; ${purchase.failures} unexpected enabled/disabled states. Demo checks are separate from exported-page timing and real inventory.` });
                    unknowns = ["No checkout, cart submission, external destination, analytics or conversion result was tested.", "Lab metrics are from three fresh isolated browser contexts on this machine; no network/CPU throttling and no field Core Web Vitals.", ...(blocked.size ? [`${blocked.size} unfulfilled requests were blocked. Recorded local missing assets are reported separately; remote image availability and destination responses remain unknown.`] : [])];
                }
                finally {
                    await context.close();
                }
            }
            const lcps = samples.flatMap(s => s.lcp === null ? [] : [s.lcp]);
            reports.push({ at: new Date().toISOString(), fingerprint, designRevision: run.revision, htmlBytes: Buffer.byteLength(html), viewport, samples: samples.length, metrics: { domReadyMs: median(samples.map(s => s.dom)), loadMs: median(samples.map(s => s.load)), lcpMs: lcps.length ? median(lcps) : null, cls: median(samples.map(s => s.cls)) }, findings, unknowns });
        }
    }
    finally {
        await browser.close();
    }
    return reports;
}
