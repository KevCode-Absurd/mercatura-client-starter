import type { PageEvidence } from "./evidence";
export type EvidenceControl = {
    id: string;
    sectionId: string;
    kind: "link" | "button" | "select" | "number";
    label: string;
    disabled: boolean;
    target?: string;
    top: number;
};
export type ResourceObservation = {
    observed: number;
    received: number;
    httpErrors: number;
    blocked: number;
    excluded: number;
    pending: number;
    truncated: boolean;
    failures: {
        type: string;
        status?: number;
        reason: "http_error" | "transport" | "read_only_policy" | "capture_limit";
    }[];
};
export type ViewportInspection = {
    mode: "read_only";
    documentHeight: number;
    viewportHeight: number;
    controls: EvidenceControl[];
    controlsTruncated: boolean;
    resources: ResourceObservation;
};
export function resourceLedger() {
    const state: ResourceObservation = { observed: 0, received: 0, httpErrors: 0, blocked: 0, excluded: 0, pending: 0, truncated: false, failures: [] };
    return {
        begin(type: string) {
            state.observed++;
            state.pending++;
            let settled = false;
            return (outcome: "received" | "blocked" | "excluded", status?: number, limit = false) => {
                if (settled)
                    return;
                settled = true;
                state.pending--;
                if (limit)
                    state.truncated = true;
                if (outcome === "received" && status !== undefined && status >= 400)
                    state.httpErrors++;
                else
                    state[outcome]++;
                if (state.failures.length < 12 && (outcome !== "received" || (status ?? 0) >= 400)) {
                    state.failures.push({ type, ...(status !== undefined ? { status } : {}), reason: outcome === "blocked" ? "transport" : outcome === "excluded" ? limit ? "capture_limit" : "read_only_policy" : "http_error" });
                }
            };
        },
        snapshot(): ResourceObservation { return { ...state, failures: state.failures.map(item => ({ ...item })) }; },
    };
}
export function collectVisibleControls(sections: {
    id: string;
    top: number;
    height: number;
}[]) {
    const elements = [...document.querySelectorAll<HTMLElement>("a[href],button,[role='button'],select,input[type='number']")].filter(el => {
        const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && css.display !== "none" && css.visibility !== "hidden" && !el.closest("[hidden],[aria-hidden='true']");
    });
    const controls: EvidenceControl[] = elements.slice(0, 80).map((el, index) => {
        const rect = el.getBoundingClientRect(), top = Math.round(rect.top + scrollY);
        const section = sections.filter(s => top >= s.top && top < s.top + s.height).sort((a, b) => a.height - b.height)[0];
        const kind = el.tagName === "A" ? "link" : el.tagName === "SELECT" ? "select" : el.tagName === "INPUT" ? "number" : "button";
        const labelledBy = (el.getAttribute("aria-labelledby") || "").split(/\s+/).map(id => document.getElementById(id)?.textContent || "").join(" ");
        const associated = (el as HTMLSelectElement).labels ? [...(el as HTMLSelectElement).labels!].map(label => label.textContent).join(" ") : "";
        const label = (el.getAttribute("aria-label") || labelledBy.trim() || associated || (kind === "select" ? "Unlabelled select" : kind === "number" ? "Unlabelled number input" : el.innerText) || el.getAttribute("title") || el.querySelector("img")?.alt || "Unlabelled control").replace(/\s+/g, " ").trim().slice(0, 180);
        let target: string | undefined;
        if (kind === "link") {
            try {
                const url = new URL((el as HTMLAnchorElement).href);
                if (/^https?:$/.test(url.protocol))
                    target = `${url.origin}${url.pathname}`;
            }
            catch { }
        }
        return { id: `control-${index + 1}`, sectionId: section?.id || "", kind, label, disabled: el.matches(":disabled") || el.getAttribute("aria-disabled") === "true", ...(target ? { target } : {}), top };
    });
    return { controls, truncated: elements.length > 80 };
}
export const UNTESTED_PURCHASE_BEHAVIOR = "Variant changes, add-to-cart, checkout, payment and analytics were not tested. Visible controls do not establish that these flows work.";
const normalize = (text: string) => text.normalize("NFKC").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
export function findingEvidence(evidence: PageEvidence, finding: {
    sectionId: string;
    viewport: "mobile" | "desktop";
    evidenceQuote: string;
}) {
    const view = evidence[finding.viewport], section = view.sections.find(s => s.id === finding.sectionId);
    const quote = normalize(finding.evidenceQuote).replace(/^["']|["']$/g, "");
    const textMatched = !!section && quote.length >= 3 && normalize(section.text).includes(quote);
    return {
        reference: `${evidence.id}:${finding.viewport}:${finding.sectionId}`,
        basis: !section ? "unavailable" as const : textMatched ? "captured_text" as const : "visual_interpretation" as const,
        label: !section ? "Source section unavailable" : textMatched ? "Text found in capture" : "Visual interpretation · compare the screenshot",
        capturedAt: evidence.capturedAt, url: evidence.url,
        outsideScreenshot: !!section && section.top + section.height > view.height,
        controls: view.inspection?.controls.filter(control => control.sectionId === finding.sectionId) ?? [],
        inspection: view.inspection,
        warnings: evidence.warnings,
    };
}
export function inspectionSummary(evidence: PageEvidence): string[] {
    return (["mobile", "desktop"] as const).map(device => {
        const view = evidence[device], inspection = view.inspection;
        if (!inspection)
            return `${device}: legacy capture; resource and control inventories were not recorded.`;
        const r = inspection.resources;
        return `${device}: read-only capture at ${view.width}×${inspection.viewportHeight}; screenshot ${view.height}px of ${inspection.documentHeight}px. ${inspection.controls.length} visible controls${inspection.controlsTruncated ? " (inventory capped)" : ""}. Resources: ${r.observed} observed, ${r.received} responses below HTTP 400, ${r.httpErrors} HTTP errors, ${r.blocked} blocked/failed, ${r.excluded} excluded, ${r.pending} pending${r.truncated ? "; capture limit reached" : ""}. These observations describe the automated capture, not a normal shopper session.`;
    });
}
