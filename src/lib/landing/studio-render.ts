import type { CroRun, CroSection, CroBrandSnapshot } from "./studio-types";
import { renderQuiz } from "./quiz";
import { scopeSectionCss } from "./studio-css";
import { sectionVisualCss } from "./studio-workbench";
export const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const TAGS = new Set("div section article header footer nav h1 h2 h3 h4 h5 p span strong em b i small ul ol li figure figcaption a details summary table thead tbody tr th td br hr blockquote dl dt dd".split(" "));
const ATTRS = new Set("class id role aria-label aria-hidden colspan rowspan open href".split(" "));
export function resolveProductDestination(brand: CroBrandSnapshot, productId: string): string {
    const product = brand.products?.find(item => item.id === productId);
    if (!product)
        throw new Error(`Unknown brand product destination ${productId}.`);
    if (!product.url || /[\s\\<>{}\u0000-\u001f]/.test(product.url) || product.url.startsWith("//"))
        throw new Error(`Product ${productId} needs a valid catalog URL.`);
    try {
        const store = new URL(brand.siteUrl);
        const destination = new URL(product.url, store);
        const host = (value: string) => value.toLowerCase().replace(/^www\./, "");
        if (!/^https?:$/.test(destination.protocol) || destination.username || destination.password || host(destination.hostname) !== host(store.hostname) || destination.port !== store.port)
            throw new Error("Foreign or unsafe destination");
        if (!product.url.startsWith("/") && !/^https?:\/\//.test(product.url))
            throw new Error("Unsupported relative destination");
        return destination.href;
    }
    catch {
        throw new Error(`Product ${productId} must link to its own store catalog URL.`);
    }
}
export function validateSection(section: Pick<CroSection, "html" | "css" | "copy" | "images">): void {
    if (/<!--|<!|<\?|[\u0000-\u0008]/.test(section.html))
        throw new Error("Unsupported markup in section.");
    let consumed = "";
    for (const m of section.html.matchAll(/<([^<>]+)>/g)) {
        const head = m[1].match(/^\/?([a-z][a-z0-9]*)([\s\S]*?)\/?$/i);
        if (!head || !TAGS.has(head[1].toLowerCase()))
            throw new Error("Section contains an unsupported element.");
        let attrs = head[2].trim();
        while (attrs) {
            const attr = attrs.match(/^([a-z][a-z0-9-]*)(?:\s*=\s*"([^"<>]*)")?(?:\s+|$)/i);
            if (!attr || !ATTRS.has(attr[1].toLowerCase()))
                throw new Error("Section contains an unsafe attribute.");
            if (attr[1].toLowerCase() === "href" && !/^(#[a-z0-9_-]+|\{\{link\}\}|\{\{product:[a-z0-9_-]{1,120}\}\})$/i.test(attr[2] || ""))
                throw new Error("Links must use the brand destination.");
            const editableLabel = attr[1].toLowerCase() === "aria-label" && /^\{\{text:[a-z][a-z0-9_-]{0,47}\}\}$/.test(attr[2] || "");
            if (attr[1].toLowerCase() !== "href" && !editableLabel && /[&{}]/.test(attr[2] || ""))
                throw new Error("Invalid section attribute.");
            attrs = attrs.slice(attr[0].length).trim();
        }
        consumed += m[0];
    }
    if (/[<>]/.test(section.html.replace(/<[^<>]+>/g, "")))
        throw new Error("Malformed section markup.");
    if (/url\s*\(|@import|@font-face|expression\s*\(|<|\\|behavior\s*:|-moz-binding/i.test(section.css))
        throw new Error("Section CSS must not load resources or code.");
    if ([...section.css.matchAll(/@([a-z-]+)/gi)].some((m) => !["media", "supports", "container", "keyframes"].includes(m[1].toLowerCase())))
        throw new Error("Unsupported CSS rule.");
    scopeSectionCss(section.css, "#cro-validation");
    const copy = new Set(section.copy.map((f) => f.key)), images = new Set(section.images.map((f) => f.key));
    if (copy.size !== section.copy.length || images.size !== section.images.length)
        throw new Error("Duplicate editable field.");
    if (/\{\{product:/i.test(section.html.replace(/\bhref\s*=\s*"\{\{product:[a-z0-9_-]{1,120}\}\}"/gi, "")))
        throw new Error("Product destinations are allowed only as complete href values.");
    for (const m of section.html.matchAll(/\{\{([^}]+)\}\}/g)) {
        if (["buy", "link"].includes(m[1]))
            continue;
        if (/^product:[a-z0-9_-]{1,120}$/i.test(m[1]) && m[1].startsWith("product:"))
            continue;
        const [kind, k] = m[1].split(":");
        if (!(kind === "text" && copy.has(k)) && !(kind === "image" && images.has(k)))
            throw new Error(`Unknown section field ${m[1]}.`);
    }
    const literal = section.html.replace(/<[^>]*>/g, "").replace(/\{\{[^}]+\}\}/g, "").replace(/&[a-z0-9#]+;/gi, "");
    if (/[a-zA-Z]{2}/.test(literal))
        throw new Error("Put visible wording in editable text fields.");
    void consumed;
}
export function repairSection<T extends Pick<CroSection, "html" | "css">>(section: T): T {
    const html = section.html.replace(/<([^<>]+)>/g, (tag, inner: string) => {
        const head = inner.match(/^(\/?[a-z][a-z0-9]*)([\s\S]*?)(\/?)$/i);
        if (!head)
            return tag;
        let attrs = head[2].trim(), kept = "";
        while (attrs) {
            const attr = attrs.match(/^([a-z][a-z0-9-]*)(?:\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)'|([^\s"'>]+)))?(?:\s+|$)/i);
            if (!attr)
                break;
            attrs = attrs.slice(attr[0].length).trim();
            const name = attr[1].toLowerCase(), value = attr[2] ?? attr[3] ?? attr[4];
            if (!ATTRS.has(name))
                continue;
            if (name === "href") {
                kept += ` href="${/^(#[a-z0-9_-]+|\{\{link\}\}|\{\{product:[a-z0-9_-]{1,120}\}\})$/i.test(value || "") ? value : "{{link}}"}"`;
                continue;
            }
            const editableLabel = name === "aria-label" && /^\{\{text:[a-z][a-z0-9_-]{0,47}\}\}$/.test(value || "");
            if (value !== undefined && !editableLabel && /[&{}]/.test(value))
                continue;
            kept += value === undefined ? ` ${name}` : ` ${name}="${value}"`;
        }
        return `<${head[1]}${kept}${head[3] ? " /" : ""}>`;
    });
    const css = section.css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/@import[^;]*;/gi, "")
        .replace(/@font-face\s*\{[^}]*\}/gi, "")
        .replace(/[^;{}]*(?:url\s*\(|expression\s*\(|behavior\s*:|-moz-binding)[^;}]*;?/gi, "")
        .replace(/\\/g, "");
    return { ...section, html, css };
}
export function brandCss(brand: CroBrandSnapshot, fontCss = ""): string {
    const declarations = Object.entries(brand.tokens).map(([k, v]) => `--${k}:${v.replace(/[{};<>]/g, "")};`).join("");
    return `${fontCss}\n:root{${declarations}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-body);font-weight:var(--weight-body);font-style:var(--style-body,normal);letter-spacing:var(--tracking-body,normal)}h1,h2,h3,h4{font-family:var(--font-heading);font-weight:var(--weight-heading);font-style:var(--style-heading,normal);letter-spacing:var(--tracking-heading,normal);text-transform:var(--case-heading,none)}img{max-width:100%;height:auto;display:block}a{color:inherit}button,input,select{font:inherit}button,a,input,select,summary{touch-action:manipulation}a:focus-visible,button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:4px}.cro-purchase{display:block;margin-block:1.5rem}.cro-buy{display:inline-flex;justify-content:center;align-items:center;background:var(--cta);color:var(--cta-ink);border:0;border-radius:var(--radius);padding:16px 28px;min-height:48px;font-family:var(--font-button,var(--font-body));font-weight:var(--weight-button,700);font-style:var(--style-button,normal);letter-spacing:var(--tracking-button,normal);text-transform:var(--case-button,none);text-decoration:none;cursor:pointer}.cro-purchase select{padding:12px;max-width:100%;margin:8px 0;display:block}.cro-purchase-price{font-size:1.4rem;font-weight:700}.cro-purchase button:disabled{opacity:.5}.cro-missing{aspect-ratio:1;background:var(--surface);border:1px dashed var(--muted);display:grid;place-items:center;padding:24px;color:var(--muted)}.cro-shell-header{display:flex;justify-content:space-between;align-items:center;padding:20px clamp(20px,5vw,80px);border-bottom:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}.cro-shell-header a{text-decoration:none}.cro-shell-footer{padding:40px clamp(20px,5vw,80px);border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}`;
}
export function renderCroSection(section: CroSection, run: CroRun, images: Record<string, string> = {}, preview = false, simulator = false): string {
    validateSection(section);
    const prepared = section.html.replace(/\sid="([^"]*)"/gi, (attribute, id: string) => id === `cro-${section.id}` ? "" : attribute)
        .replace(/\baria-label\s*=\s*"\{\{text:([a-z][a-z0-9_-]{0,47})\}\}"/gi, (_, key: string) => `aria-label="${escapeHtml(section.copy.find(field => field.key === key)?.text || "").replace(/\s+/g, " ").replace(/{/g, "&#123;").replace(/}/g, "&#125;")}"`);
    const html = prepared.replace(/\{\{([^}]+)\}\}/g, (_, token: string) => {
        if (token === "link")
            return escapeHtml(run.brand.productUrl || run.brand.siteUrl || "#buy");
        if (token === "buy" && simulator)
            return `<div class="cro-purchase cro-local-simulator"><p><strong>LOCAL DEMO ONLY — no order or payment</strong></p><label>Test variant<select data-demo-variant><option value="available">Available test variant</option><option value="sold-out">Unavailable test variant</option><option value="required">Subscription required test variant</option></select></label><label>Quantity<input type="number" data-demo-quantity min="1" max="10" value="1"></label><label>Test plan<select data-demo-plan><option value="one-time">One-time</option><option value="subscription">Subscription</option></select></label><button type="button" class="cro-buy" data-demo-add>Add to demo cart</button><p role="status" data-demo-status>No real inventory, price or offer is implied.</p></div>`;
        if (token === "buy")
            return `<div class="cro-purchase"><a class="cro-buy" href="${escapeHtml(run.brand.productUrl || run.brand.siteUrl || "#buy")}">Shop ${escapeHtml(run.brand.productName || run.brand.name)}</a></div>`;
        const [kind, key] = token.split(":");
        if (kind === "product")
            return escapeHtml(resolveProductDestination(run.brand, key));
        if (kind === "text") {
            const text = escapeHtml(section.copy.find((f) => f.key === key)?.text || "").replace(/\n/g, "<br>");
            return preview ? `<span data-cro-copy="${escapeHtml(key)}">${text}</span>` : text;
        }
        const item = section.images.find((f) => f.key === key), asset = run.brand.assets.find((a) => a.id === item?.assetId);
        return asset ? `<img ${preview ? `data-cro-image="${escapeHtml(key)}" ` : ""}src="${escapeHtml(images[asset.id] || asset.src)}" alt="${escapeHtml(item?.alt || asset.name)}" loading="${preview || run.sections[0]?.id === section.id ? "eager" : "lazy"}">` : `<div ${preview ? `data-cro-image="${escapeHtml(key)}" ` : ""}class="cro-missing">Product image needed</div>`;
    });
    return `<section id="cro-${section.id}" data-cro-section="${section.id}">${html}</section>`;
}
export function renderCroPage(run: CroRun, opts: {
    fontCss?: string;
    images?: Record<string, string>;
    onlySection?: string;
    preview?: boolean;
    simulator?: boolean;
} = {}): string {
    const sections = run.sections.filter((s) => s.enabled && (!opts.onlySection || s.id === opts.onlySection));
    const quiz = run.quiz && !opts.onlySection ? renderQuiz(run.quiz) : null;
    const planned = (kind: "header" | "footer") => run.blueprint?.sections.some(section => new RegExp(`(?:^|[-_ ])${kind === "header" ? "(?:header|navigation|nav|masthead)" : "footer"}(?:$|[-_ ])`, "i").test(`${section.id} ${section.label}`)) || run.sections.some(section => new RegExp(`<${kind}\\b`, "i").test(section.html));
    const header = planned("header") ? "" : `<header class="cro-shell-header"><a href="${escapeHtml(run.brand.siteUrl || "#")}"><strong>${escapeHtml(run.brand.name)}</strong></a><a href="${escapeHtml(run.brand.productUrl || "#buy")}">Shop</a></header>`;
    const footer = planned("footer") ? "" : `<footer class="cro-shell-footer">${escapeHtml(run.brand.name)}</footer>`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(run.blueprint?.title || run.brand.name)}</title><style>${brandCss(run.brand, opts.fontCss)}\n${pageDesignCss(run)}\n${sections.map((s) => scopeSectionCss(s.css, `#cro-${s.id}`) + sectionVisualCss(s)).join("\n")}\n${quiz?.css || ""}${opts.preview ? "[data-cro-section]{scroll-margin-top:16px}[data-cro-section][data-cro-selected]{outline:2px solid #437aef;outline-offset:-2px}[data-cro-copy]:hover,[data-cro-image]:hover{outline:1px dashed #437aef;cursor:pointer}" : ""}</style></head><body>${header}${run.request.pageType === "advertorial" ? '<p style="text-align:center">Advertisement</p>' : ""}<main>${sections.map((s, i) => renderCroSection(s, run, opts.images, opts.preview, opts.preview && opts.simulator) + (i === 0 && quiz ? quiz.html : "")).join("\n")}</main>${footer}${quiz ? `<script>${quiz.script}</script>` : ""}${opts.preview ? `<script>${CRO_PREVIEW_SCRIPT}</script>` : ""}${opts.preview && opts.simulator ? `<script>${CRO_SIMULATOR_SCRIPT}</script>` : ""}</body></html>`;
}
export const CRO_SIMULATOR_SCRIPT = `document.querySelectorAll('.cro-local-simulator').forEach(root=>{const variant=root.querySelector('[data-demo-variant]'),plan=root.querySelector('[data-demo-plan]'),quantity=root.querySelector('[data-demo-quantity]'),add=root.querySelector('[data-demo-add]'),status=root.querySelector('[data-demo-status]');const draw=()=>{add.disabled=variant.value==='sold-out'||variant.value==='required'&&plan.value!=='subscription';status.textContent=variant.value==='sold-out'?'Unavailable test variant.':add.disabled?'Select a subscription for this test variant.':'Ready for a demo cart; no order will be placed.'};variant.addEventListener('change',draw);plan.addEventListener('change',draw);quantity.addEventListener('change',()=>{quantity.value=String(Math.max(1,Math.min(10,Number(quantity.value)||1)));draw()});add.addEventListener('click',()=>{status.textContent='Demo cart: '+quantity.value+' × '+variant.value+' · '+plan.value+'. No order was placed.'});draw()});`;
export function pageDesignCss(run: CroRun): string {
    const spec = run.storyboard?.visualSpec;
    if (!spec)
        return "";
    const n = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
    return `:root{--reading-measure:${n(spec.designSystem?.readingMeasureCh ?? 65, 45, 75)}ch;--page-max-width:${n(spec.contentMaxWidthPx, 960, 1600)}px;--page-gutter:${n(spec.mobileGutterPx, 16, 32)}px;--section-gap:${n(spec.mobileSectionGapPx, 24, 96)}px;--page-h1:${n(spec.mobileH1Px, 28, 56)}px;--page-h2:${n(spec.mobileH2Px, 24, 40)}px}body{font-size:${n(spec.bodyPx, 16, 20)}px;line-height:${n(spec.bodyLineHeight, 1.4, 1.8)}}.cro-prose{max-inline-size:var(--reading-measure)}h1,h2,h3,p,li{overflow-wrap:anywhere}h1,h2{text-wrap:balance}h1{font-size:var(--page-h1);line-height:1.06}h2{font-size:var(--page-h2);line-height:1.12}@media(min-width:900px){:root{--page-gutter:${n(spec.desktopGutterPx, 24, 96)}px;--section-gap:${n(spec.desktopSectionGapPx, 40, 160)}px;--page-h1:${n(spec.desktopH1Px, 40, 88)}px;--page-h2:${n(spec.desktopH2Px, 30, 64)}px}}`;
}
export const CRO_PREVIEW_SCRIPT = `(()=>{
const select=(section)=>{document.querySelectorAll('[data-cro-selected]').forEach(e=>e.removeAttribute('data-cro-selected'));section.setAttribute('data-cro-selected','');};
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target:null;if(!target)return;
 const link=target.closest('a');if(link)event.preventDefault();
 const section=target.closest('[data-cro-section]');if(!section)return;
 select(section);const copy=target.closest('[data-cro-copy]'),image=target.closest('[data-cro-image]');
 parent.postMessage({type:'cro-select',sectionId:section.dataset.croSection,fieldKey:copy?.dataset.croCopy||image?.dataset.croImage,fieldKind:copy?'text':image?'image':undefined},'*');
},true);
document.addEventListener('submit',event=>event.preventDefault(),true);
window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='cro-draft'||!Array.isArray(event.data.sections))return;let style=document.getElementById('cro-live-visual');if(!style){style=document.createElement('style');style.id='cro-live-visual';document.head.append(style);}style.textContent=event.data.sections.map(s=>typeof s.css==='string'?s.css:'').join('\\n');for(const s of event.data.sections){const section=[...document.querySelectorAll('[data-cro-section]')].find(e=>e.dataset.croSection===s.id);if(!section||!Array.isArray(s.copy))continue;for(const c of s.copy){for(const el of section.querySelectorAll('[data-cro-copy]'))if(el.dataset.croCopy===c.key&&typeof c.text==='string'){el.textContent=c.text;el.style.whiteSpace='pre-line';}}}});
window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='cro-focus'||typeof event.data.sectionId!=='string')return;const section=[...document.querySelectorAll('[data-cro-section]')].find(e=>e.dataset.croSection===event.data.sectionId);if(section){select(section);section.scrollIntoView({behavior:'smooth',block:'start'});}});
parent.postMessage({type:'cro-ready'},'*');
})();`;
