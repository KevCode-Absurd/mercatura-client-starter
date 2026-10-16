import { inkOn, type GuideColor, type GuideModel } from "./guide";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const byRole = (cs: GuideColor[], ...roles: string[]) => cs.find((c) => roles.some((r) => c.role.includes(r)));
const lum = (hex: string) => (inkOn(hex) === "#ffffff" ? 0 : 1);
export interface GuideFace {
    family: string;
    weight: string;
    style: string;
    url: string;
}
export function guideHtml(m: GuideModel, faces: GuideFace[] = []): string {
    const dark = byRole(m.colors, "primary") ?? m.colors.find((c) => lum(c.hex) === 0) ?? { name: "Ink", hex: "#111111", role: "primary", use: "" };
    const accent = byRole(m.colors, "accent") ?? byRole(m.colors, "cta") ?? m.colors.find((c) => c !== dark) ?? dark;
    const action = byRole(m.colors, "cta") ?? accent;
    const paper = byRole(m.colors, "background") ?? { name: "Paper", hex: "#ffffff", role: "background", use: "" };
    const head = m.fonts.find((f) => /head/.test(f.role)) ?? m.fonts[0];
    const body = m.fonts.find((f) => /body/.test(f.role)) ?? head;
    const families = [...new Set(m.fonts.map((f) => f.family))].filter(Boolean);
    const held = faces.filter((f) => families.includes(f.family));
    const links = held.length ? `<style>${held.map((f) => `@font-face{font-family:"${esc(f.family)}";font-weight:${esc(f.weight)};font-style:${esc(f.style)};src:url("${esc(f.url)}");font-display:swap}`).join("")}</style>` : "";
    const missingFaces = families.filter((f) => !held.some((h) => h.family === f));
    const month = new Date(`${m.date}T00:00:00Z`).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const footer = `<div class="foot"><span>${esc(m.brand)}</span><span>Brand guide v1.0</span></div>`;
    const section = (n: string, title: string, intro: string) => `<div class="num">${n}</div><h2>${esc(title)}</h2><p class="intro">${esc(intro)}</p>`;
    const swatch = (c: GuideColor) => `<div class="swatch"><div class="chip" style="background:${c.hex}"></div><div class="info"><div class="name">${esc(c.name)}</div><div class="hex">${c.hex}</div><div class="role">${esc([cap(c.role), c.use].filter(Boolean).join(": "))}</div></div></div>`;
    const primaries = m.colors.slice(0, 4);
    const rest = m.colors.slice(4);
    const sample = m.phrases[0] || m.usps[0] || m.brand;
    const specimen = (f: (typeof m.fonts)[number]) => `<div class="spec"><div class="label">${esc(cap(f.role))} font</div><div class="sample" style="font-family:${esc(f.stack)};font-weight:${esc(f.weight || "400")};${f.letterCase === "uppercase" ? "text-transform:uppercase;" : ""}letter-spacing:${esc(f.tracking && f.tracking !== "normal" ? f.tracking : "0")}">${esc(sample)}</div><div class="chars" style="font-family:${esc(f.stack)}">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</div><div class="meta"><span>${esc(f.family)}</span><span>Weight ${esc(f.weight || "regular")}</span><span>${esc(cap(f.letterCase || "sentence"))} case</span><span>${esc(f.note)}</span></div></div>`;
    const list = (items: string[], max: number) => items.slice(0, max).map((x) => `<li>${esc(x)}</li>`).join("");
    const voiceWords = m.personality.split(/,|\band\b/).map((x) => x.trim()).filter(Boolean).map(cap);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(m.brand)} brand guide</title>
  ${links}
  <style>
    :root { --dark:${dark.hex}; --on-dark:${inkOn(dark.hex)}; --accent:${accent.hex}; --action:${action.hex}; --on-action:${inkOn(action.hex)}; --paper:${paper.hex}; --head:${head ? head.stack : "Georgia, serif"}; --body:${body ? body.stack : "system-ui, sans-serif"}; --line:#e2e2dc; --muted:#666; }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--body); font-size: 14px; line-height: 1.6; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 48px 56px 64px; page-break-after: always; position: relative; overflow: hidden; }
    .page:last-child { page-break-after: auto; }
    @media screen { body { background: #f1f1ee; padding: 24px 0; } .page { background: #fff; border: 1px solid #ddd; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,.06); } }
    .cover { background: var(--dark); color: var(--on-dark); display: flex; flex-direction: column; justify-content: center; }
    .cover .brand { font-size: 14px; text-transform: uppercase; letter-spacing: .3em; color: var(--accent); }
    .cover h1 { font-family: var(--head); font-size: 56px; line-height: 1.05; margin: 16px 0; font-weight: 700; }
    .cover p { font-size: 16px; opacity: .75; max-width: 46ch; }
    .cover .date { position: absolute; bottom: 48px; left: 56px; font-size: 12px; opacity: .5; }
    .num { color: var(--action); font-size: 11px; text-transform: uppercase; letter-spacing: .18em; font-weight: 700; }
    h2 { font-family: var(--head); font-size: 32px; font-weight: 700; margin: 4px 0 8px; color: var(--dark); }
    h3 { font-family: var(--head); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; margin: 28px 0 10px; color: var(--dark); }
    .intro { font-size: 15px; color: var(--muted); max-width: 60ch; line-height: 1.65; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .swatch { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    .chip { height: 72px; }
    .info { padding: 10px 12px; background: #fff; }
    .name { font-family: var(--head); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .hex { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
    .role { font-size: 11px; color: var(--muted); line-height: 1.35; margin-top: 2px; }
    .strip { display: flex; height: 44px; border-radius: 8px; overflow: hidden; border: 1px solid var(--line); }
    .strip div { flex: 1; }
    .spec { border: 1px solid var(--line); border-radius: 10px; padding: 22px 24px; margin-bottom: 12px; }
    .label { color: var(--action); font-size: 11px; text-transform: uppercase; letter-spacing: .14em; font-weight: 700; }
    .sample { font-size: 30px; line-height: 1.15; margin: 8px 0; color: var(--dark); }
    .chars { font-size: 13px; color: #333; word-break: break-all; }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 10px; font-size: 11px; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; }
    th { font-family: var(--head); font-size: 10px; text-transform: uppercase; letter-spacing: .14em; text-align: left; padding: 6px 8px 6px 0; border-bottom: 2px solid var(--dark); }
    td { font-size: 13px; padding: 7px 8px 7px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
    td:first-child { font-weight: 700; width: 30%; }
    .demo { border-radius: 10px; padding: 20px; }
    .demo .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .14em; font-weight: 700; }
    .demo .h { font-family: var(--head); font-size: 22px; font-weight: 700; line-height: 1.15; margin: 4px 0; }
    .btnrow { display: flex; align-items: center; gap: 16px; margin-bottom: 10px; }
    .btn { display: inline-block; padding: 11px 26px; border-radius: 999px; font-weight: 700; font-size: 14px; font-family: var(--body); }
    .btn.primary { background: var(--action); color: var(--on-action); }
    .btn.outline { border: 2px solid var(--dark); color: var(--dark); }
    .btnlabel { font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--muted); }
    .card { border-radius: 10px; padding: 14px 16px; font-size: 13px; }
    .card.do { background: #eef7f0; border: 1px solid #b7dcc0; }
    .card.dont { background: #fdf4e3; border: 1px solid #ecd29a; }
    .card .tag { font-size: 10px; text-transform: uppercase; letter-spacing: .14em; font-weight: 700; margin-bottom: 6px; }
    .card.do .tag { color: #1c6b34; } .card.dont .tag { color: #8a5a00; }
    .card ul { padding-left: 16px; } .card li { margin-bottom: 5px; line-height: 1.45; }
    .dots { display: flex; flex-wrap: wrap; gap: 10px; }
    .dot { width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--line); }
    .big { font-family: var(--head); font-size: 22px; font-weight: 700; color: var(--dark); line-height: 1.2; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; } .tags span { border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; font-size: 12px; }
    .foot { position: absolute; bottom: 24px; left: 56px; right: 56px; display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .12em; }
    .empty { color: var(--muted); font-style: italic; }
  </style>
</head>
<body>
  <div class="page cover">
    <div class="brand">${esc(m.brand)}</div>
    <h1>Brand guide</h1>
    <p>${esc(m.aesthetic ? `${cap(m.aesthetic)}. ` : "")}How ${esc(m.brand)} looks and sounds, in 5 pages: colour, type, components, voice, and a cheat sheet.</p>
    <div class="date">${esc(month)} · v1.0${m.site ? ` · ${esc(m.site.replace(/^https?:\/\//, ""))}` : ""}</div>
  </div>

  <div class="page">
    ${section("01. Colour", "Colour", m.paletteStory)}
    <h3>Primary</h3>
    ${primaries.length ? `<div class="grid4">${primaries.map(swatch).join("")}</div>` : `<p class="empty">No colours read yet. Read the brand look from the site.</p>`}
    ${rest.length ? `<h3>Supporting</h3><div class="grid4">${rest.map(swatch).join("")}</div>` : ""}
    ${m.colors.length >= 3 ? `<h3>Section rhythm</h3><div class="strip">${[paper, dark, paper, accent, paper, dark].map((c) => `<div style="background:${c.hex}"></div>`).join("")}</div><p class="role" style="margin-top:6px">Light sections carry the reading; ${esc(dark.name.toLowerCase())} sections carry the proof; ${esc(accent.name.toLowerCase())} marks the moment to act.</p>` : ""}
    ${footer}
  </div>

  <div class="page">
    ${section("02. Typography", "Typography", m.typeStory)}
    ${m.fonts.length ? m.fonts.map(specimen).join("") : `<p class="empty">No typefaces read yet.</p>`}
    ${missingFaces.length ? `<p class="intro">Shown in a stand-in face: ${esc(missingFaces.join(", "))}. Upload the font file on the Brand brain screen to see the real one.</p>` : ""}
    ${m.fonts.length ? `<h3>Type scale</h3><table><thead><tr><th>Element</th><th>Font</th><th>Weight</th><th>Case</th></tr></thead><tbody>${m.fonts.map((f) => `<tr><td>${esc(cap(f.role))}</td><td>${esc(f.family)}</td><td>${esc(f.weight)}</td><td>${esc(cap(f.letterCase || "sentence"))}${f.tracking && f.tracking !== "normal" ? `, tracking ${esc(f.tracking)}` : ""}</td></tr>`).join("")}</tbody></table>` : ""}
    <h3>Colour on background</h3>
    <div class="grid2">
      <div class="demo" style="background:${paper.hex};border:1px solid var(--line)"><div class="eyebrow" style="color:${action.hex}">On light</div><div class="h" style="color:${dark.hex}">${esc(sample)}</div><div style="color:#222">Body text reads in near black.</div></div>
      <div class="demo" style="background:${dark.hex};color:${inkOn(dark.hex)}"><div class="eyebrow" style="color:${accent.hex}">On dark</div><div class="h">${esc(sample)}</div><div style="opacity:.8">Body text reads at 80%.</div></div>
    </div>
    ${footer}
  </div>

  <div class="page">
    ${section("03. Components and voice", "Components and voice", m.writesLike ? `${m.brand} writes like ${m.writesLike}.` : "How the brand asks for the click, and how it talks.")}
    <h3>Buttons</h3>
    <div class="btnrow"><span class="btn primary">Shop now</span><span class="btnlabel">Primary · ${esc(m.button || "pill, action colour")}</span></div>
    <div class="btnrow"><span class="btn outline">Learn more</span><span class="btnlabel">Secondary · outline in ${esc(dark.name.toLowerCase())}</span></div>
    ${m.tone.length ? `<h3>Tone by context</h3><table><tbody>${m.tone.map((t) => `<tr><td>${esc(t.context)}</td><td>${esc(t.tone)}</td></tr>`).join("")}</tbody></table>` : ""}
    <h3>Voice</h3>
    <div class="grid2">
      <div class="card do"><div class="tag">Do</div><ul>${list(m.dos, 5) || `<li class="empty">Not written yet.</li>`}</ul></div>
      <div class="card dont"><div class="tag">Don't</div><ul>${list(m.donts, 5) || `<li class="empty">Not written yet.</li>`}</ul></div>
    </div>
    ${footer}
  </div>

  <div class="page">
    ${section("04. Cheat sheet", "Cheat sheet", "Everything on 1 page, to pin above a desk.")}
    <h3>Colours</h3>
    <div class="dots">${m.colors.map((c) => `<div class="dot" style="background:${c.hex}" title="${esc(c.name)} ${c.hex}"></div>`).join("")}</div>
    <h3>Fonts</h3>
    ${m.fonts.map((f) => `<div>${esc(cap(f.role))}: <strong>${esc(f.family)}</strong>, ${esc(f.weight)}, ${esc(f.letterCase || "sentence")} case</div>`).join("") || `<p class="empty">Not read yet.</p>`}
    <h3>Voice in ${voiceWords.length || "a few"} words</h3>
    <div class="big">${voiceWords.length ? esc(voiceWords.join(". ") + ".") : `<span class="empty">Not written yet.</span>`}</div>
    ${m.always ? `<h3>The 1 rule</h3><div>${esc(m.always)}</div>` : ""}
    ${m.neverSay || m.neverShow ? `<h3>Never</h3>${m.neverSay ? `<div><strong>Say:</strong> ${esc(m.neverSay)}</div>` : ""}${m.neverShow ? `<div><strong>Show:</strong> ${esc(m.neverShow)}</div>` : ""}` : ""}
    ${m.usps.length ? `<h3>What the brand wins on</h3><ol style="padding-left:18px">${list(m.usps, 5)}</ol>` : ""}
    ${m.phrases.length ? `<h3>Its own phrases</h3><div class="tags">${m.phrases.slice(0, 8).map((p) => `<span>${esc(p)}</span>`).join("")}</div>` : ""}
    ${footer}
  </div>
</body>
</html>
`;
}
