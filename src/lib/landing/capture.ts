import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { launchBrowser } from "./browser";
export interface Capture {
    url: string;
    final_url: string;
    title: string;
    description: string;
    h1: string[];
    headings: {
        level: number;
        text: string;
        top: number;
    }[];
    above_fold: string;
    buttons: {
        text: string;
        top: number;
    }[];
    prices: string[];
    proof: string[];
    guarantee: string[];
    faq: boolean;
    images: {
        count: number;
        lazy: number;
        big_in_view: number;
    };
    overlays: {
        text: string;
        share: number;
    }[];
    sticky_cta: boolean;
    form_fields: number;
    nav_links: number;
    words: number;
    shot_fold: string;
    shot_full: string;
    load_ms: number;
}
export const UA_PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
export function normaliseUrl(input: string): string {
    const t = input.trim();
    if (!t)
        throw new Error("Paste the page's address.");
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!/^https?:$/.test(u.protocol))
        throw new Error("Only web addresses (http or https) can be read.");
    return u.toString();
}
const COLLECT = `(() => {
  const vh = innerHeight, vw = innerWidth;
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0; };
  const txt = (el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
  const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(vis).map((h) => ({ level: Number(h.tagName[1]), text: txt(h).slice(0, 200), top: top(h) })).filter((h) => h.text).slice(0, 60);
  const fold = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = walker.nextNode())) { const p = n.parentElement; if (!p || !vis(p)) continue; const r = p.getBoundingClientRect(); if (r.top < vh && r.bottom > 0) { const t = n.textContent.replace(/\\s+/g, ' ').trim(); if (t) fold.push(t); } }
  const btnSel = 'button, a[role=button], input[type=submit], [class*="btn"], [class*="button"], [class*="add-to-cart"], [name=add]';
  const seenBtn = new Set();
  const buttons = [...document.querySelectorAll(btnSel)].filter(vis).map((b) => ({ text: (txt(b) || b.value || b.getAttribute('aria-label') || '').slice(0, 80), top: top(b) })).filter((b) => b.text && b.text.length < 60 && !seenBtn.has(b.text.toLowerCase()) && seenBtn.add(b.text.toLowerCase())).slice(0, 40);
  const body = txt(document.body);
  const prices = [...new Set(body.match(/(?:[$£€₹¥]|[A-Z]{3} ?)\\s?\\d{1,5}(?:[.,]\\d{2})?/g) || [])].slice(0, 12);
  const lines = body.split(/(?<=[.!?])\\s+|\\n/).map((l) => l.trim()).filter(Boolean);
  const proof = [...new Set(lines.filter((l) => /\\b\\d[\\d,.]*\\s*\\+?\\s*(?:k\\s*)?(?:reviews|ratings|customers|sold|happy)|★|stars?\\b|as seen in|featured in/i.test(l) && l.length < 160))].slice(0, 8);
  const guarantee = [...new Set(lines.filter((l) => /guarantee|money[- ]back|free returns|risk[- ]free|refund/i.test(l) && l.length < 160))].slice(0, 6);
  const faq = /faq|frequently asked|questions/i.test(headings.map((h) => h.text).join(' ')) || document.querySelectorAll('details').length >= 3;
  const imgs = [...document.images];
  const overlays = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); return (s.position === 'fixed' || s.position === 'sticky') && vis(el); }).map((el) => { const r = el.getBoundingClientRect(); return { el, share: Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / (vw * vh), r }; });
  const sticky = overlays.some((o) => o.r.bottom >= vh - 4 && o.r.height < vh * 0.3 && /add|buy|shop|cart|order|get/i.test(txt(o.el)));
  return {
    title: document.title, description: (document.querySelector('meta[name=description]') || {}).content || '',
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    headings, above_fold: fold.join(' · ').slice(0, 1500), buttons, prices, proof, guarantee, faq,
    images: { count: imgs.length, lazy: imgs.filter((i) => i.loading === 'lazy').length, big_in_view: imgs.filter((i) => { const r = i.getBoundingClientRect(); return r.top < vh && r.width * r.height > vw * vh * 0.2; }).length },
    overlays: overlays.filter((o) => o.share > 0.35).map((o) => ({ text: txt(o.el).slice(0, 100), share: Math.round(o.share * 100) / 100 })).slice(0, 5),
    sticky_cta: sticky,
    form_fields: document.querySelectorAll('form input:not([type=hidden]), form select, form textarea').length,
    nav_links: document.querySelectorAll('header a, nav a').length,
    words: body.split(/\\s+/).length,
  };
})()`;
export async function capturePage(url: string, scanId: string): Promise<Capture> {
    const target = normaliseUrl(url);
    const browser = await launchBrowser();
    const dir = path.join(env.DATA_DIR, "assets", "landing");
    fs.mkdirSync(dir, { recursive: true });
    try {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_PHONE });
        const page = await ctx.newPage();
        const t0 = Date.now();
        const res = await page.goto(target, { waitUntil: "load", timeout: 45000 });
        if (res && res.status() >= 400)
            throw new Error(`The page answered ${res.status()}.`);
        const load_ms = Date.now() - t0;
        await page.waitForTimeout(2500);
        const data = (await page.evaluate(COLLECT)) as Omit<Capture, "url" | "final_url" | "shot_fold" | "shot_full" | "load_ms">;
        const fold = `landing/${scanId}-fold.png`;
        const full = `landing/${scanId}-full.png`;
        await page.screenshot({ path: path.join(env.DATA_DIR, "assets", fold) });
        await page.evaluate(`(async () => { for (let y = 0; y < Math.min(document.body.scrollHeight, 12000); y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); })()`);
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(env.DATA_DIR, "assets", full), fullPage: true, clip: { x: 0, y: 0, width: 390, height: Math.min(9000, await page.evaluate("document.body.scrollHeight") as number) } });
        await ctx.close();
        return { url: target, final_url: page.url(), ...data, shot_fold: fold, shot_full: full, load_ms };
    }
    finally {
        await browser.close();
    }
}
