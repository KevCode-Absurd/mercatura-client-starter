import { createHash } from "node:crypto";
import { launchBrowser } from "./browser";
import { inspectRenderedDesign } from "./studio-design-checks";
export const exportDigest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export type ExportAccessibilityReceipt = {
    at: string;
    packageSha256: string;
    mode: "passive" | "functional";
    viewport: number;
    findings: {
        kind: string;
        sectionId: string;
        detail: string;
    }[];
    keyboardStops: number;
    disclosures: number;
    selectorChecks: number;
    unknowns: string[];
};
export async function inspectExportAccessibility(html: string, mode: "passive" | "functional", options: {
    signal?: AbortSignal;
} = {}): Promise<ExportAccessibilityReceipt[]> {
    const browser = await launchBrowser({ signal: options.signal, timeoutMs: 90000 }), receipts: ExportAccessibilityReceipt[] = [];
    try {
        for (const width of [390, 1440]) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: mode === "functional", reducedMotion: "reduce" });
            try {
                await context.route("**/*", route => route.abort());
                const page = await context.newPage();
                await page.setContent(html, { waitUntil: "load", timeout: 20000 });
                const design = await page.evaluate(inspectRenderedDesign);
                const report = await page.evaluate((functional) => {
                    const findings: {
                        kind: string;
                        sectionId: string;
                        detail: string;
                    }[] = [], section = (element: Element) => element.closest<HTMLElement>("[data-cro-section]")?.dataset.croSection || element.closest("section")?.id || "page";
                    let previous = 0;
                    for (const heading of [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]) {
                        const level = Number(heading.tagName[1]);
                        if (previous && level > previous + 1)
                            findings.push({ kind: "heading-order", sectionId: section(heading), detail: `Heading jumps from h${previous} to h${level}: ${heading.textContent?.slice(0, 100)}` });
                        previous = level;
                    }
                    for (const image of [...document.images])
                        if (!image.hasAttribute("alt"))
                            findings.push({ kind: "image-alt", sectionId: section(image), detail: "Image lacks an alternative-text attribute." });
                    for (const element of [...document.querySelectorAll<HTMLElement>('[tabindex="-1"]')])
                        if (element.matches('a[href],button,input,select,textarea'))
                            findings.push({ kind: "keyboard", sectionId: section(element), detail: "Interactive control is removed from the keyboard order." });
                    let disclosures = 0;
                    for (const details of [...document.querySelectorAll("details")]) {
                        const summary = details.querySelector("summary");
                        if (!summary) {
                            findings.push({ kind: "disclosure", sectionId: section(details), detail: "Disclosure has no summary control." });
                            continue;
                        }
                        const initial = details.open;
                        summary.click();
                        if (details.open === initial)
                            findings.push({ kind: "disclosure", sectionId: section(details), detail: "Summary did not toggle." });
                        else
                            disclosures++;
                        details.open = initial;
                    }
                    let selectorChecks = 0;
                    for (const select of [...document.querySelectorAll<HTMLSelectElement>("select")]) {
                        const label = select.getAttribute("aria-label") || [...select.labels].map(item => item.textContent).join(" ");
                        if (!label.trim())
                            findings.push({ kind: "selector-name", sectionId: section(select), detail: "Exported selector has no accessible name." });
                        const before = select.value, index = select.selectedIndex;
                        const alternative = [...select.options].findIndex((option, i) => i !== index && !option.disabled);
                        if (alternative >= 0) {
                            select.selectedIndex = alternative;
                            select.dispatchEvent(new Event("change", { bubbles: true }));
                            if (select.value === before || select.selectedOptions[0]?.disabled)
                                findings.push({ kind: "selector-state", sectionId: section(select), detail: "Selected option did not update to an available alternative." });
                            else
                                selectorChecks++;
                            if (select.matches("[data-cro-variant]")) {
                                const form = select.closest("form"), option = select.selectedOptions[0], price = form?.querySelector("[data-cro-price]"), button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
                                if (option?.dataset.price && price?.textContent?.trim() !== option.dataset.price)
                                    findings.push({ kind: "selector-state", sectionId: section(select), detail: "Displayed price did not follow the selected exported variant." });
                                if (button && option?.dataset.available && button.disabled !== (option.dataset.available !== "true"))
                                    findings.push({ kind: "selector-state", sectionId: section(select), detail: "Purchase availability did not follow the selected variant." });
                            }
                            select.selectedIndex = index;
                            select.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                    }
                    if (functional)
                        for (const gallery of [...document.querySelectorAll("[data-gallery]")]) {
                            const main = gallery.querySelector<HTMLImageElement>(".g-main"), thumbs = [...gallery.querySelectorAll<HTMLButtonElement>(".thumb")];
                            if (main && thumbs.length > 1) {
                                const before = main.getAttribute("src");
                                thumbs[1].click();
                                if (main.getAttribute("src") !== thumbs[1].dataset.src || thumbs[1].getAttribute("aria-pressed") !== "true" || thumbs[0].getAttribute("aria-pressed") !== "false")
                                    findings.push({ kind: "gallery-state", sectionId: section(gallery), detail: "Gallery selection or accessible selected state did not follow thumbnail activation." });
                                if (thumbs[1].dataset.alt && main.alt !== thumbs[1].dataset.alt)
                                    findings.push({ kind: "gallery-alt", sectionId: section(gallery), detail: "Main image description did not follow thumbnail selection." });
                                thumbs[0].click();
                                if (before && main.getAttribute("src") !== before)
                                    findings.push({ kind: "gallery-state", sectionId: section(gallery), detail: "Gallery did not restore the first image." });
                            }
                        }
                    return { findings, disclosures, selectorChecks };
                }, mode === "functional");
                let keyboardStops = 0;
                const seen = new Set<string>();
                for (let index = 0; index < 40; index++) {
                    await page.keyboard.press("Tab");
                    const focus = await page.evaluate(() => { const element = document.activeElement as HTMLElement | null; if (!element || element === document.body)
                        return null; const rect = element.getBoundingClientRect(), style = getComputedStyle(element); return { key: `${element.tagName}:${element.id}:${element.textContent?.slice(0, 40)}`, inert: !!element.closest('[inert],[aria-hidden="true"]'), visible: rect.width > 0 && rect.height > 0, indicator: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 || style.boxShadow !== "none" }; });
                    if (!focus || seen.has(focus.key))
                        break;
                    seen.add(focus.key);
                    keyboardStops++;
                    if (focus.inert || !focus.visible)
                        report.findings.push({ kind: "focus", sectionId: "page", detail: `Keyboard reached hidden/inert control ${focus.key}.` });
                    if (!focus.indicator)
                        report.findings.push({ kind: "focus-indicator", sectionId: "page", detail: `No computed outline/shadow on focused ${focus.key}; inspect other focus styling.` });
                }
                receipts.push({ at: new Date().toISOString(), packageSha256: exportDigest(html), mode, viewport: width, findings: [...design.issues.filter(issue => ["name", "target", "clipping"].includes(issue.kind)).map(issue => ({ kind: issue.kind, sectionId: issue.sectionId, detail: issue.message })), ...report.findings], keyboardStops, disclosures: report.disclosures, selectorChecks: report.selectorChecks, unknowns: ["Bounded automated accessibility signals, not a complete accessibility certification.", "Remote checkout, inventory, payments and destination-theme product state remain unverified.", ...(mode === "passive" ? ["Passive package disables scripted product/gallery behavior; native disclosures and links only."] : [])] });
            }
            finally {
                await context.close();
            }
        }
    }
    finally {
        await browser.close();
    }
    return receipts;
}
