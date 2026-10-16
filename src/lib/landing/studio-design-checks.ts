export type CroDesignIssue = {
    kind: "contrast" | "target" | "name" | "clipping" | "overflow" | "collision";
    sectionId: string;
    element: string;
    message: string;
};
export type CroDesignChecks = {
    viewport: string;
    issues: CroDesignIssue[];
    issueCount: number;
    contrastChecked: number;
    contrastUnverified: number;
    truncated: boolean;
};
export function inspectRenderedDesign(): Omit<CroDesignChecks, "viewport"> {
    const issues: CroDesignIssue[] = [];
    let issueCount = 0, contrastChecked = 0, contrastUnverified = 0;
    const limit = 1200, reportLimit = 30;
    const visible = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height || el.closest('[hidden],[inert],[aria-hidden="true"]'))
            return false;
        for (let node: HTMLElement | null = el; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0)
                return false;
        }
        return true;
    };
    const describe = (el: HTMLElement) => (el.innerText || el.getAttribute("aria-label") || el.tagName.toLowerCase()).replace(/\s+/g, " ").trim().slice(0, 100);
    const add = (el: HTMLElement, kind: CroDesignIssue["kind"], message: string) => {
        issueCount++;
        if (issues.length < reportLimit)
            issues.push({ kind, sectionId: el.closest<HTMLElement>("[data-cro-section]")?.dataset.croSection || "", element: describe(el), message });
    };
    for (const el of [...document.querySelectorAll<HTMLElement>("[data-cro-section] *")].filter(visible)) {
        const rect = el.getBoundingClientRect();
        if (rect.right > innerWidth + 2 || rect.left < -2)
            add(el, "overflow", `Element extends beyond ${innerWidth}px viewport (${Math.round(rect.left)}–${Math.round(rect.right)}px).`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const color = (css: string): number[] | null => {
        if (!context)
            return null;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        const data = context.getImageData(0, 0, 1, 1).data;
        return [data[0] / 255, data[1] / 255, data[2] / 255, data[3] / 255];
    };
    const blend = (front: number[], back: number[]) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((total, value, i) => total + value * [.2126, .7152, .0722][i], 0);
    const background = (el: HTMLElement): number[] | null => {
        const layers: number[][] = [];
        let opaque = false;
        for (let node: HTMLElement | null = el; node; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (!opaque && style.backgroundImage !== "none" || Number(style.opacity) < 1 || style.filter !== "none" || style.backdropFilter !== "none" || style.mixBlendMode !== "normal")
                return null;
            const layer = color(style.backgroundColor);
            if (!layer)
                return null;
            layers.push(layer);
            if (layer[3] >= 1)
                opaque = true;
        }
        let result = [1, 1, 1];
        for (const layer of layers.reverse())
            result = blend(layer, result);
        return result;
    };
    const text = [...document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,a,button,label,summary,small,span,td,th")]
        .filter(el => visible(el) && [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
    for (const el of text.slice(0, limit)) {
        const style = getComputedStyle(el), bg = background(el), fg = color(style.color);
        if (!bg || !fg || style.getPropertyValue("-webkit-text-fill-color") === "transparent")
            contrastUnverified++;
        else {
            contrastChecked++;
            const a = luminance(blend(fg, bg)), b = luminance(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            const size = parseFloat(style.fontSize), large = size >= 24 || (size >= 18.66 && parseInt(style.fontWeight, 10) >= 700), minimum = large ? 3 : 4.5;
            if (ratio + .01 < minimum)
                add(el, "contrast", `Text contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1 on its computed solid surface.`);
        }
        if ((["hidden", "clip"].includes(style.overflowX) && el.scrollWidth > el.clientWidth + 2) ||
            (["hidden", "clip"].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 2)) {
            add(el, "clipping", "Text is clipped by its container. Verify that essential buying information remains visible.");
        }
    }
    const controls = [...document.querySelectorAll<HTMLElement>('a[href],button,input:not([type="hidden"]),select,textarea,summary')].filter(visible);
    for (const el of controls.slice(0, limit)) {
        const ids = (el.getAttribute("aria-labelledby") || "").trim().split(/\s+/).filter(Boolean);
        const referenced = ids.map(id => document.getElementById(id)?.textContent || "").join(" ").trim();
        const labels = "labels" in el ? [...((el as HTMLInputElement).labels || [])].map(label => label.textContent).join(" ").trim() : "";
        const imageAlt = [...el.querySelectorAll("img")].map(img => img.alt).join(" ").trim();
        const nativeButton = el instanceof HTMLInputElement && ["submit", "reset", "button"].includes(el.type);
        const name = referenced || el.getAttribute("aria-label")?.trim() || labels || (el.matches("a,button,summary") ? el.innerText.trim() || imageAlt : "") || (nativeButton ? (el as HTMLInputElement).value || "Submit" : "") || el.title.trim();
        if (!name)
            add(el, "name", "Interactive control has no detected accessible name. Give it a meaningful visible label or accessible label.");
        const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
        if (style.display !== "inline" && (rect.width < 24 || rect.height < 24))
            add(el, "target", `Standalone target is ${Math.round(rect.width)}×${Math.round(rect.height)}px. Review spacing or enlarge it; aim for 44px purchase controls.`);
    }
    return { issues, issueCount, contrastChecked, contrastUnverified, truncated: text.length > limit || controls.length > limit || issueCount > reportLimit };
}
