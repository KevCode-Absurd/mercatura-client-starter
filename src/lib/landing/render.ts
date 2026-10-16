import { formatMoney } from "../money";
import type { Theme } from "./theme";
import { BUCKET_LABEL, type BuyOption, type ImageSlot, type PageKind, type Quote, type Section } from "./types";
export interface RenderInput {
    title: string;
    kind: PageKind;
    sections: Section[];
    brandName: string;
    currency: string;
    ctaUrl: string;
    theme: Theme;
    image?: (src: string) => string;
    preview?: boolean;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const has = (s: string | null | undefined) => !!s && s.trim().length > 0;
function img(slot: ImageSlot, r: RenderInput, opts: {
    eager?: boolean;
    ratio?: string;
    className?: string;
} = {}): string {
    const ratio = opts.ratio ?? "1 / 1";
    if (!has(slot.src)) {
        return `<div class="ph ${opts.className ?? ""}" style="aspect-ratio:${ratio}" role="img" aria-label="${esc(slot.alt || BUCKET_LABEL[slot.bucket])}"><span>Image to add<br><b>${esc(BUCKET_LABEL[slot.bucket])}</b>${has(slot.alt) ? `<br><small>${esc(slot.alt)}</small>` : ""}</span></div>`;
    }
    const src = r.image ? r.image(slot.src) : slot.src;
    return `<img class="${opts.className ?? ""}" src="${esc(src)}" alt="${esc(slot.alt)}" style="aspect-ratio:${ratio}" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const money = (n: number, r: RenderInput) => formatMoney(n, r.currency, { local: true, digits: Number.isInteger(n) ? 0 : 2 });
const btn = (label: string, r: RenderInput, cls = "") => `<a class="btn ${cls}" href="${esc(r.ctaUrl || "#buy")}">${esc(label || "Get started")}</a>`;
const risk = (line: string) => (has(line) ? `<p class="risk"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.8-4.8 1.4 1.4-6.2 6.2Z"/></svg>${rich(line)}</p>` : "");
const ticks = (items: string[], cls = "ticks") => (items.filter(has).length ? `<ul class="${cls}">${items.filter(has).map((i) => `<li>${rich(i)}</li>`).join("")}</ul>` : "");
function options(opts: BuyOption[], r: RenderInput, name: string): string {
    if (!opts.length)
        return "";
    return `<fieldset class="opts"><legend class="sr">Choose an option</legend>${opts
        .map((o, i) => `<label class="opt"><input type="radio" name="${name}" ${i === 0 ? "checked" : ""}><span class="opt-main"><span class="opt-label">${esc(o.label)}${has(o.badge) ? ` <em class="badge">${esc(o.badge)}</em>` : ""}</span>${has(o.note) ? `<span class="opt-note">${rich(o.note)}</span>` : ""}</span><span class="opt-price">${o.compare_at && o.compare_at > o.price ? `<s>${money(o.compare_at, r)}</s> ` : ""}<b>${money(o.price, r)}</b>${o.per_day ? `<small>${money(o.per_day, r)} a day</small>` : ""}${o.compare_at && o.compare_at > o.price ? `<small class="save">Save ${money(Math.round((o.compare_at - o.price) * 100) / 100, r)}</small>` : ""}</span></label>`)
        .join("")}</fieldset>`;
}
const quoteCard = (q: Quote) => `<figure class="quote"><blockquote>${rich(q.text)}</blockquote><figcaption>${esc(q.who)}</figcaption></figure>`;
export function readMinutes(sections: Section[]): number {
    let words = 0;
    const walk = (v: unknown) => {
        if (typeof v === "string")
            words += v.split(/\s+/).filter(Boolean).length;
        else if (Array.isArray(v))
            v.forEach(walk);
        else if (v && typeof v === "object")
            for (const [k, x] of Object.entries(v))
                if (!["id", "type", "src", "alt", "bucket", "offer_id", "badge"].includes(k))
                    walk(x);
    };
    sections.filter((x) => x.on).forEach(walk);
    return Math.max(1, Math.round(words / 230));
}
function hero(s: Extract<Section, {
    type: "hero";
}>, r: RenderInput): string {
    const imgs = s.images.length ? s.images : [{ src: "", alt: "", bucket: "product-shot" as const }];
    const proof = has(s.proof_line) ? `<p class="proof"><span class="stars" aria-hidden="true">★★★★★</span> ${rich(s.proof_line)}</p>` : "";
    if (r.kind !== "pdp") {
        const byline = r.kind === "advertorial" ? `<p class="byline">By ${esc(r.brandName)} · ${readMinutes(r.sections)} min read</p>` : "";
        return `<section class="hero hero-story"><div class="wrap narrow">${has(s.eyebrow) ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}<h1>${rich(s.headline)}</h1>${byline}${has(s.subhead) ? `<p class="sub">${rich(s.subhead)}</p>` : ""}${proof}${img(imgs[0], r, { eager: true, ratio: "16 / 10", className: "hero-img" })}${ticks(s.bullets)}${has(s.cta) ? `<div class="cta-row">${btn(s.cta, r)}${risk(s.risk_line)}</div>` : ""}<p class="cue" aria-hidden="true">Keep reading ↓</p></div></section>`;
    }
    const gallery = `<div class="gallery" data-gallery>${img(imgs[0], r, { eager: true, className: "g-main" })}${imgs.length > 1 ? `<div class="thumbs">${imgs.map((m, i) => `<button type="button" class="thumb${i === 0 ? " on" : ""}" data-src="${esc(m.src ? (r.image ? r.image(m.src) : m.src) : "")}" data-alt="${esc(m.alt || "")}" aria-pressed="${i === 0 ? "true" : "false"}" aria-label="Show ${esc(m.alt || `product view ${i + 1}`)}">${img(m, r, { ratio: "1 / 1" })}</button>`).join("")}</div>` : ""}</div>`;
    return `<section class="hero hero-pdp" id="buy"><div class="wrap hero-grid"><div class="buy-top">${has(s.eyebrow) ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}${proof}<h1>${rich(s.headline)}</h1>${has(s.price_line) ? `<p class="price">${rich(s.price_line)}</p>` : ""}</div>${gallery}<div class="buy-rest">${has(s.subhead) ? `<p class="sub">${rich(s.subhead)}</p>` : ""}${ticks(s.bullets)}${options(s.options, r, "hero-opt")}${has(s.why_now) ? `<p class="now">${rich(s.why_now)}</p>` : ""}${btn(s.cta, r, "block")}${risk(s.risk_line)}<p class="cue" aria-hidden="true">See why ↓</p></div></div></section>`;
}
function section(s: Section, i: number, r: RenderInput): string {
    switch (s.type) {
        case "announcement":
            return has(s.text) ? `<div class="announce">${rich(s.text)}</div>` : "";
        case "hero":
            return hero(s, r);
        case "benefits":
            return s.items.filter(has).length ? `<section class="benefits">${has(s.title) ? `<h2 class="sr">${esc(s.title)}</h2>` : ""}<ul class="wrap chips">${s.items.filter(has).map((b) => `<li><span class="dot" aria-hidden="true">✓</span>${rich(b)}</li>`).join("")}</ul></section>` : "";
        case "problem":
            return `<section class="band problem"><div class="wrap narrow">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${has(s.greeting) ? `<p class="greet">${rich(s.greeting)}</p>` : ""}${ticks(s.questions, "asks")}${has(s.empathy) ? `<p>${rich(s.empathy)}</p>` : ""}${ticks(s.agitate, "crosses")}${has(s.solve) ? `<p class="solve">${rich(s.solve)}</p>` : ""}</div></section>`;
        case "story":
            return `<section class="story"><div class="wrap narrow">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${s.paragraphs.filter(has).map((p) => `<p>${rich(p)}</p>`).join("")}${has(s.image.src) || has(s.image.alt) ? img(s.image, r, { ratio: "16 / 10" }) : ""}</div></section>`;
        case "value_prop":
            return `<section class="vp${i % 2 ? " flip" : ""}"><div class="wrap two">${img(s.image, r, { ratio: "4 / 5" })}<div class="vp-copy">${has(s.eyebrow) ? `<p class="eyebrow">${esc(s.eyebrow)}</p>` : ""}<h2>${rich(s.headline)}</h2>${has(s.body) ? `<p>${rich(s.body)}</p>` : ""}${ticks(s.points)}${has(s.cta) ? btn(s.cta, r) : ""}</div></div></section>`;
        case "reasons":
            return `<section class="reasons"><div class="wrap narrow">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${s.items
                .map((it, k) => `<article class="reason${k % 2 ? " flip" : ""}"><span class="num">${k + 1}</span><div><h3>${rich(it.title)}</h3>${img(it.image, r, { ratio: "16 / 10" })}${it.body.split(/\n{2,}/).filter(has).map((para) => `<p>${rich(para)}</p>`).join("")}${it.quote ? quoteCard(it.quote) : ""}</div></article>`)
                .join("")}</div></section>`;
        case "how_it_works":
            return `<section class="band steps"><div class="wrap">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}<ol class="grid3">${s.steps.map((st) => `<li><h3>${rich(st.title)}</h3><p>${rich(st.body)}</p></li>`).join("")}</ol></div></section>`;
        case "differentiators":
            return `<section class="diffs"><div class="wrap">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}<div class="grid3">${s.items.map((d) => `<div class="card"><h3>${rich(d.title)}</h3><p>${rich(d.body)}</p></div>`).join("")}</div></div></section>`;
        case "comparison":
            return `<section class="compare"><div class="wrap narrow">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}<table><thead><tr><th></th><th class="us">${esc(s.us)}</th><th>${esc(s.them)}</th></tr></thead><tbody>${s.rows.map((row) => `<tr><th scope="row">${rich(row.label)}</th><td class="us">${cell(row.us)}</td><td>${cell(row.them)}</td></tr>`).join("")}</tbody></table></div></section>`;
        case "reviews":
            return s.quotes.length ? `<section class="band reviews"><div class="wrap">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${has(s.rating_line) ? `<p class="proof center"><span class="stars" aria-hidden="true">★★★★★</span> ${rich(s.rating_line)}</p>` : ""}<div class="grid3">${s.quotes.map(quoteCard).join("")}</div></div></section>` : "";
        case "offer":
            if (s.options.length >= 2 && s.options.some((o) => o.preferred))
                return `<section class="offer" id="${r.kind === "pdp" ? "offer" : "buy"}"><div class="wrap narrow">${has(s.headline) ? `<h2 class="center">${rich(s.headline)}</h2>` : ""}${has(s.body) ? `<p class="center">${rich(s.body)}</p>` : ""}${plans(s.options.slice(0, 2), s.cta, r)}${risk(s.risk_line)}</div></section>`;
            return `<section class="offer" id="${r.kind === "pdp" ? "offer" : "buy"}"><div class="wrap two box">${img(s.image, r, { ratio: "1 / 1" })}<div>${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${has(s.body) ? `<p>${rich(s.body)}</p>` : ""}${ticks(s.includes)}${options(s.options, r, `opt-${s.id}`)}${btn(s.cta, r, "block")}${risk(s.risk_line)}</div></div></section>`;
        case "guarantee":
            return `<section class="guarantee"><div class="wrap narrow center"><div class="seal" aria-hidden="true">✓</div>${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${has(s.body) ? `<p>${rich(s.body)}</p>` : ""}${has(s.cta) ? btn(s.cta, r) : ""}</div></section>`;
        case "faq":
            return s.items.length ? `<section class="faq"><div class="wrap narrow">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${s.items.map((f, k) => `<details${k === 0 ? " open" : ""}><summary>${rich(f.q)}</summary><p>${rich(f.a)}</p></details>`).join("")}</div></section>` : "";
        case "final_cta":
            return `<section class="final">${has(s.image.src) ? img(s.image, r, { ratio: "auto", className: "final-bg" }) : ""}<div class="wrap narrow center">${has(s.headline) ? `<h2>${rich(s.headline)}</h2>` : ""}${has(s.body) ? `<p>${rich(s.body)}</p>` : ""}${btn(s.cta, r)}${risk(s.risk_line)}</div></section>`;
        case "sticky_cta":
            return `<div class="sticky" data-sticky hidden><span>${rich(s.text)}</span>${btn(s.cta, r)}</div>`;
    }
}
function plans(opts: BuyOption[], cta: string, r: RenderInput): string {
    const card = (o: BuyOption) => {
        const lines = (o.includes ?? []).filter((x) => has(x.item));
        const total = lines.every((x) => typeof x.value === "number") && lines.length ? lines.reduce((n, x) => n + (x.value ?? 0), 0) : null;
        const anchor = total && total > o.price ? total : o.compare_at && o.compare_at > o.price ? o.compare_at : null;
        return `<div class="plan${o.preferred ? " pref" : ""}">${o.preferred && has(o.badge) ? `<span class="ribbon">${esc(o.badge)}</span>` : ""}<h3>${rich(o.label)}</h3>${lines.length ? `<ul class="stack">${lines.map((x) => `<li><span>${rich(x.item)}</span>${typeof x.value === "number" ? `<b>${esc(formatMoney(x.value, r.currency, { local: true }))}</b>` : ""}</li>`).join("")}</ul>` : ""}<p class="plan-price">${anchor ? `<s>${esc(formatMoney(anchor, r.currency, { local: true }))}</s> ` : ""}<b>${esc(formatMoney(o.price, r.currency, { local: true }))}</b>${o.per_day ? `<small>${esc(formatMoney(o.per_day, r.currency, { local: true }))} a day</small>` : ""}</p>${has(o.note) ? `<p class="opt-note">${rich(o.note)}</p>` : ""}<a class="btn${o.preferred ? " block" : " block ghost"}" href="${esc(r.ctaUrl)}">${esc(cta || "Choose this")}</a></div>`;
    };
    return `<div class="plans">${opts.map(card).join("")}</div>`;
}
function cell(v: string): string {
    const t = v.trim().toLowerCase();
    if (["yes", "true", "✓", "y"].includes(t))
        return '<span class="yes" aria-label="Yes">✓</span>';
    if (["no", "false", "✗", "x", "n"].includes(t))
        return '<span class="no" aria-label="No">✗</span>';
    return rich(v);
}
function css(t: Theme): string {
    return `:root{--ink:${t.ink};--paper:${t.paper};--primary:${t.primary};--cta:${t.cta};--cta-ink:${t.ctaText};--accent:${t.accent};--surface:${t.surface};--muted:${t.muted};--fh:${t.fontHeading};--fb:${t.fontBody};--r:${t.radius}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--paper);color:var(--ink);font:400 17px/1.55 var(--fb)}img{display:block;width:100%;height:auto;object-fit:cover;border-radius:14px;background:var(--surface)}
h1,h2,h3{font-family:var(--fh);line-height:1.12;letter-spacing:-.02em;margin:0 0 .5em;color:var(--primary)}h1{font-size:clamp(30px,6.4vw,50px);font-weight:800}h2{font-size:clamp(25px,4.6vw,38px);font-weight:800}h3{font-size:20px;font-weight:700}p{margin:0 0 1em}
.wrap{max-width:1120px;margin:0 auto;padding:0 18px}.narrow{max-width:760px}.center{text-align:center}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
section{padding:56px 0}.band{background:var(--surface)}.eyebrow{font:700 13px/1.3 var(--fb);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.6em}
.preview-bar{background:#111;color:#fff;font:600 12px/1 system-ui;padding:8px 18px;letter-spacing:.02em}.top{border-bottom:1px solid rgba(0,0,0,.08)}.top .wrap{display:flex;align-items:center;justify-content:space-between;height:58px}.logo{font:800 20px/1 var(--fh);color:var(--primary);text-decoration:none;letter-spacing:-.02em}.ad-label{font:600 11px/1 var(--fb);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.announce{background:var(--primary);color:var(--paper);text-align:center;font:600 14px/1.35 var(--fb);padding:10px 18px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 28px;border-radius:var(--r);background:var(--cta);color:var(--cta-ink);font:800 18px/1 var(--fb);text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.14)}.btn.block{display:flex;width:100%;margin-top:14px}.btn:active{transform:translateY(1px)}
.risk{display:flex;gap:8px;align-items:flex-start;justify-content:center;font-size:14px;color:var(--muted);margin:10px 0 0}.risk svg{width:18px;height:18px;flex:none;fill:var(--cta);margin-top:1px}
.proof{font-weight:600;font-size:15px;margin-bottom:.6em}.stars{color:#f5b301;letter-spacing:1px}.sub{font-size:19px;color:var(--muted)}.price{font:800 24px/1.2 var(--fh);margin:.4em 0}.now{font-size:15px;background:var(--surface);border-radius:10px;padding:10px 12px;margin:12px 0 0}.cue{font-size:13px;color:var(--muted);text-align:center;margin:18px 0 0}
.hero{padding:18px 0 40px}.hero-grid{display:grid;gap:14px}.buy-top h1{margin-bottom:.25em}.buy-top .price{margin:0}.g-main{max-height:42vh;object-fit:contain}.gallery .ph.g-main{aspect-ratio:auto!important;height:38vh}.thumbs{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-top:8px}.thumb{padding:0;border:2px solid transparent;border-radius:12px;background:none;cursor:pointer}.thumb.on{border-color:var(--primary)}.thumb img,.thumb .ph{border-radius:9px}
.hero-story{text-align:left;padding-top:34px}.hero-story .hero-img{margin:22px 0}.cta-row{margin-top:18px}
.ticks,.asks,.crosses{list-style:none;padding:0;margin:0 0 1em}.ticks li,.asks li,.crosses li{position:relative;padding-left:30px;margin:.45em 0}.ticks li:before,.asks li:before{content:"✓";position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:var(--cta);color:var(--cta-ink);font:800 13px/22px var(--fb);text-align:center}.crosses li:before{content:"✗";position:absolute;left:2px;color:#c0392b;font-weight:800}
.opts{border:0;padding:0;margin:14px 0 0;display:grid;gap:10px}.opt{display:flex;gap:12px;align-items:center;border:2px solid rgba(0,0,0,.12);border-radius:12px;padding:12px 14px;cursor:pointer}.opt:has(input:checked){border-color:var(--primary);background:var(--surface)}.opt input{accent-color:var(--primary);width:18px;height:18px}.opt-main{flex:1;display:grid}.opt-label{font-weight:700}.opt-note{font-size:13px;color:var(--muted)}.opt-price{text-align:right;display:grid}.opt-price s{color:var(--muted);font-size:13px}.opt-price small{font-size:12px;color:var(--muted)}.opt-price .save{color:var(--cta);font-weight:700}.badge{font:700 11px/1 var(--fb);font-style:normal;background:var(--accent);color:#111;border-radius:99px;padding:4px 8px;vertical-align:2px}
.chips{list-style:none;display:flex;gap:10px;overflow-x:auto;padding:0 18px 6px;scrollbar-width:none}.benefits{padding:22px 0;border-top:1px solid rgba(0,0,0,.06);border-bottom:1px solid rgba(0,0,0,.06)}.chips li{flex:none;display:flex;gap:8px;align-items:center;background:var(--surface);border-radius:99px;padding:10px 16px;font-weight:600;font-size:15px}.dot{color:var(--cta);font-weight:800}
.problem .greet{font:700 20px/1.4 var(--fh)}.solve{font-weight:700;font-size:19px}
.two{display:grid;gap:26px;align-items:center}.vp-copy .btn{margin-top:6px}
.reason{display:grid;grid-template-columns:52px 1fr;gap:14px;padding:26px 0;border-bottom:1px solid rgba(0,0,0,.08)}.reason .num{font:800 40px/1 var(--fh);color:var(--cta)}.reason img,.reason .ph{margin:8px 0 14px}
.grid3{display:grid;gap:16px;padding:0;list-style:none}.steps li,.card{background:var(--paper);border-radius:14px;padding:20px}.diffs .card{background:var(--surface)}.steps ol{counter-reset:s}.steps li{counter-increment:s}.steps li:before{content:counter(s);display:inline-flex;width:34px;height:34px;border-radius:50%;background:var(--primary);color:var(--paper);font-weight:800;align-items:center;justify-content:center;margin-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:16px}th,td{padding:14px 10px;border-bottom:1px solid rgba(0,0,0,.08);text-align:center}tbody th{text-align:left;font-weight:600}thead th{font:800 15px/1.2 var(--fh)}.us{background:var(--surface)}.yes{color:var(--cta);font-weight:800;font-size:20px}.no{color:#c0392b;font-weight:800;font-size:20px}
.quote{margin:0;background:var(--paper);border-radius:14px;padding:22px}.quote blockquote{margin:0 0 12px;font-size:17px}.quote blockquote:before{content:"“";display:block;font:800 44px/0.6 var(--fh);color:var(--cta);margin:10px 0 6px}.quote figcaption{font-size:14px;color:var(--muted);font-weight:600}.reviews .quote{box-shadow:0 1px 0 rgba(0,0,0,.05)}.reason .quote{background:var(--surface)}
.box{background:var(--surface);border-radius:20px;padding:22px}.offer h2{margin-top:6px}
.byline{font:600 14px/1.3 var(--fb);color:var(--muted);margin:-.2em 0 1em}.reason.flip h3{text-align:left}
.plans{display:grid;gap:14px;margin:18px 0 8px}.plan{position:relative;border:2px solid rgba(0,0,0,.12);border-radius:16px;padding:20px;background:var(--paper)}.plan.pref{border-color:var(--primary);background:var(--surface)}.plan h3{margin-bottom:.5em}.ribbon{position:absolute;top:-12px;left:18px;font:700 11px/1 var(--fb);letter-spacing:.06em;text-transform:uppercase;background:var(--cta);color:var(--cta-ink);border-radius:99px;padding:6px 10px}.stack{list-style:none;padding:0;margin:0 0 12px}.stack li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dashed rgba(0,0,0,.1);font-size:15px}.plan-price{font:800 26px/1.2 var(--fh);margin:8px 0}.plan-price s{color:var(--muted);font-size:16px;font-weight:600}.plan-price small{display:block;font:500 13px/1.3 var(--fb);color:var(--muted)}.btn.ghost{background:transparent;color:var(--primary);border:2px solid var(--primary);box-shadow:none}
.seal{width:72px;height:72px;border-radius:50%;background:var(--cta);color:var(--cta-ink);font:800 36px/72px var(--fb);margin:0 auto 14px}
details{border-bottom:1px solid rgba(0,0,0,.1);padding:16px 0}summary{cursor:pointer;font:700 18px/1.35 var(--fh);list-style:none;display:flex;justify-content:space-between;gap:12px}summary:after{content:"+";font-weight:800;color:var(--cta)}details[open] summary:after{content:"−"}details p{margin:10px 0 0;color:var(--muted)}
.final{position:relative;background:var(--primary);color:var(--paper);overflow:hidden}.final h2{color:var(--paper)}.final p{color:var(--paper);opacity:.9}.final .final-bg{position:absolute;inset:0;width:100%;height:100%;border-radius:0;opacity:.22}.final .wrap{position:relative}.final .risk{color:var(--paper);opacity:.85}.final .risk svg{fill:var(--paper)}
.ph{display:flex;align-items:center;justify-content:center;text-align:center;border:2px dashed rgba(0,0,0,.2);border-radius:14px;background:var(--surface);color:var(--muted);font-size:13px;padding:12px}.ph b{color:var(--ink)}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:var(--paper);box-shadow:0 -6px 20px rgba(0,0,0,.12)}.sticky[hidden]{display:none}.sticky span{font-weight:700;font-size:14px;line-height:1.25}.sticky .btn{min-height:46px;padding:0 18px;font-size:16px;flex:none}
footer{padding:34px 0 90px;font-size:13px;color:var(--muted);border-top:1px solid rgba(0,0,0,.08)}
@media(min-width:860px){.plans{grid-template-columns:1fr 1.15fr;align-items:start}.reason.flip{grid-template-columns:52px 1fr}section{padding:84px 0}.hero{padding:36px 0 64px}.hero-grid{grid-template-columns:1.05fr 1fr;grid-template-areas:"g top" "g rest";gap:0 48px;align-items:start}.buy-top{grid-area:top}.buy-rest{grid-area:rest}.gallery{grid-area:g;position:sticky;top:20px}.g-main{max-height:none}.gallery .ph.g-main{height:auto;aspect-ratio:1/1!important}.buy-top .price{margin:.3em 0 .2em}.two{grid-template-columns:1fr 1fr;gap:56px}.flip .two>:first-child{order:2}.grid3{grid-template-columns:repeat(3,1fr)}.chips{justify-content:center;flex-wrap:wrap}.sticky{justify-content:center;gap:28px}}`;
}
const SCRIPT = `(()=>{const g=document.querySelector('[data-gallery]');if(g){const m=g.querySelector('.g-main');g.querySelectorAll('.thumb').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.src;if(s&&m&&m.tagName==='IMG'){m.src=s;m.alt=b.dataset.alt||b.querySelector('img')?.alt||''}g.querySelectorAll('.thumb').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))})}))}const st=document.querySelector('[data-sticky]'),h=document.querySelector('.hero'),f=document.querySelector('footer');if(st&&h&&'IntersectionObserver'in window){let past=false,end=false;const u=()=>{st.hidden=!past||end};new IntersectionObserver(e=>{past=!e[0].isIntersecting&&e[0].boundingClientRect.top<0;u()}).observe(h);if(f)new IntersectionObserver(e=>{end=e[0].isIntersecting;u()}).observe(f)}})();`;
export const LANDING_INTERACTIONS = SCRIPT;
export function renderPage(r: RenderInput): string {
    const on = r.sections.filter((s) => s.on);
    const announce = on.filter((s) => s.type === "announcement");
    const sticky = on.filter((s) => s.type === "sticky_cta");
    const body = on.filter((s) => s.type !== "announcement" && s.type !== "sticky_cta");
    const t = r.theme;
    const fonts = t.fontsHref ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(t.fontsHref)}">` : "";
    const heroImg = on.find((s): s is Extract<Section, {
        type: "hero";
    }> => s.type === "hero")?.images.find((m) => has(m.src));
    const preload = heroImg ? `<link rel="preload" as="image" href="${esc(r.image ? r.image(heroImg.src) : heroImg.src)}" fetchpriority="high">` : "";
    const desc = on.find((s): s is Extract<Section, {
        type: "hero";
    }> => s.type === "hero")?.subhead ?? "";
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title><meta name="description" content="${esc(desc.replace(/\*\*/g, "").slice(0, 160))}">${preload}${fonts}<style>${css(t)}</style></head><body>${r.preview ? '<div class="preview-bar">Preview in Landing pages. Buttons go to the link set on the page.</div>' : ""}${announce.map((s, i) => section(s, i, r)).join("")}<header class="top"><div class="wrap"><a class="logo" href="#">${esc(r.brandName)}</a>${r.kind === "advertorial" ? '<span class="ad-label">Advertisement</span>' : ""}</div></header><main>${body.map((s, i) => section(s, i, r)).join("")}</main><footer><div class="wrap">© ${new Date().getFullYear()} ${esc(r.brandName)}</div></footer>${sticky.map((s, i) => section(s, i, r)).join("")}<script>${SCRIPT}</script></body></html>`;
}
