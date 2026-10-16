"use client";
import { useEffect, useRef, useState } from "react";
import { galleryIdentity, GALLERY_FOCUS } from "@/lib/studio/gallery";
import { COMPOSITIONS } from "@/lib/creative-lab/engine";
import type { LabDraft } from "@/lib/creative-lab/types";
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function download(name: string, content: string, type = "application/json") { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function Layout({ d, text, layout, aspect, label, variantId }: {
    variantId: string;
    d: LabDraft;
    text: string;
    layout: string;
    aspect: string;
    label: string;
}) {
    const identity = galleryIdentity({ product: d.productId, argument: d.argument, itemId: variantId, aspect, version: d.world.parentVersion || "editable draft", copyState: "draft layout", imageState: "raster inspection pending" }) + `; composition ${layout}`;
    const root = useRef<HTMLDivElement>(null);
    const headline = useRef<HTMLDivElement>(null);
    const qualifier = useRef<HTMLDivElement>(null);
    const [issues, setIssues] = useState<string[]>([]);
    const [displayWidth, setDisplayWidth] = useState(280);
    const width = displayWidth;
    const [aw, ah] = aspect.split(":").map(Number);
    const height = Math.round(width / aw * ah);
    const palette = d.art.palette.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
    const bg = palette[0] ?? "#f5f1e8", fg = palette[1] ?? "#24392c";
    const grid = layout === "editorial" ? "1.1fr 1.5fr .6fr .4fr" : layout === "explanatory" ? "1fr 1.2fr .6fr .4fr" : layout === "context-led" ? "1.8fr .8fr .5fr .4fr" : "1.8fr .8fr .5fr .4fr";
    const areas = layout === "explanatory" ? '"headline headline" "product proof" "product proof" "qualifier qualifier"' : layout === "editorial" ? '"headline" "product" "proof" "qualifier"' : layout === "context-led" ? '"product" "proof" "headline" "qualifier"' : '"product" "headline" "proof" "qualifier"';
    useEffect(() => {
        const check = () => {
            const f: string[] = [];
            for (const [name, node] of [["Headline", headline.current], ["Required qualification", qualifier.current]] as const)
                if (node && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1))
                    f.push(`${name}: clipped text in this region. Shorten the complete line or change the layout.`);
            if (d.qualification && d.textMode === "text_free")
                f.push("Required qualification: no text-bearing region in this text-free layout.");
            if (d.qualification && qualifier.current && Number.parseFloat(getComputedStyle(qualifier.current).fontSize) < 11)
                f.push("Required qualification: below 11 CSS px at this display size.");
            setIssues(f);
        };
        const observer = new ResizeObserver(check);
        if (root.current)
            observer.observe(root.current);
        check();
        document.fonts.ready.then(check);
        return () => observer.disconnect();
    }, [text, d.qualification, d.textMode, width, height, layout]);
    function exportLayout() {
        if (!root.current)
            return;
        const html = root.current.outerHTML.replace(/src="\/api\//g, `src="${window.location.origin}/api/`);
        download(`creative-${layout}-${aspect.replace(":", "x")}.html`, `<!doctype html><html><meta charset="utf-8"><title>${escape(label)}</title><body style="margin:20px;background:#ddd"><p>${escape(label)} · ${width} CSS px · ${escape(aspect)} · layout preview</p>${html}<p>Product: ${escape(d.productId)}. Argument: ${escape(d.argument)}.</p><p>Raster text/OCR, photographic contrast and actual product accuracy need inspection of the finished image.</p></body></html>`, "text/html");
    }
    const product = <div style={{ gridArea: "product", minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${fg}44`, borderRadius: 10, padding: 10 }}>
    {d.mediaUrl && d.mediaKind === "image" ? <img src={d.mediaUrl} alt={`Selected product reference for ${identity}`} style={{ width: "100%", height: "100%", objectFit: "contain" }}/> : <span style={{ textAlign: "center", fontSize: 13 }}>Product view placeholder<br />{d.imageJob || "Choose the visual job"}</span>}
  </div>;
    const title = <div ref={headline} style={{ gridArea: "headline", fontSize: width < 280 ? 23 : 26, fontWeight: 700, lineHeight: 1.13, overflow: "hidden", minHeight: 0, overflowWrap: "anywhere" }}>{d.textMode === "text_free" ? "" : text}</div>;
    return <article tabIndex={0} aria-label={identity} className={`min-w-0 rounded-xl border p-3 ${GALLERY_FOCUS}`} data-testid="layout-preview">
    <p className="mb-2 text-sm font-medium">{label} · {layout} · {aspect}</p>
    <label className="mb-2 block text-xs">Display width <select aria-label={`Display width for ${identity}`} className="ml-2 rounded border p-1" value={displayWidth} onChange={e => setDisplayWidth(Number(e.target.value))}><option value={240}>240 px</option><option value={280}>280 px</option><option value={320}>320 px</option></select></label>
    <div className="max-w-full overflow-x-auto"><div ref={root} style={{ width, height, padding: 16, background: bg, color: fg, fontFamily: `${d.art.typography}, system-ui, sans-serif`, display: "grid", gridTemplateRows: grid, gridTemplateColumns: layout === "explanatory" ? "1.2fr 1fr" : "1fr", gridTemplateAreas: areas, gap: 10, overflow: "hidden", boxSizing: "border-box" }}>
      {product}{title}<div style={{ gridArea: "proof", fontSize: 12, lineHeight: 1.25, overflow: "hidden", minHeight: 0 }}>{d.textMode === "text_free" ? "" : d.proofPlacement}</div>
      <div ref={qualifier} style={{ gridArea: "qualifier", fontSize: 11, lineHeight: 1.25, minHeight: 0, overflow: "hidden", overflowWrap: "anywhere" }}>{d.textMode === "text_free" ? "" : d.qualification}</div>
    </div></div>
    <p className={`mt-2 text-xs ${issues.length ? "text-red-700" : "text-muted-foreground"}`} data-testid="layout-findings">{issues.length ? issues.join(" ") : "No DOM clipping detected at this size. Photograph contrast, collisions and raster text need visual inspection."}</p>
    <p className="mt-1 text-xs text-muted-foreground">Font requested: {d.art.typography || "unspecified"}; unavailable fonts fall back visibly to system sans. Raster OCR: pending unless a finished image is independently checked.</p>
    <button className="mt-2 rounded border px-3 py-2 text-xs" aria-label={`Export ${identity}`} onClick={exportLayout}>Export this layout</button>
  </article>;
}
export function LayoutPreviews({ draft }: {
    draft: LabDraft;
}) {
    const [composition, setComposition] = useState<string>("product-led");
    const [showCompositions, setShowCompositions] = useState(false);
    const variants = [{ id: "main", label: "Main headline", text: draft.headline }, ...draft.hooks.filter(h => h.overlay.trim()).map((h, i) => ({ id: h.id, label: `Kept opening ${i + 1}`, text: h.overlay }))];
    return <div className="space-y-4"><div className="flex flex-wrap gap-3"><label>Variant layout <select aria-label="Variant layout" className="ml-2 rounded border p-2" value={composition} onChange={e => setComposition(e.target.value)}>{COMPOSITIONS.map(c => <option key={c}>{c}</option>)}</select></label><label className="flex items-center gap-2"><input type="checkbox" checked={showCompositions} onChange={e => setShowCompositions(e.target.checked)}/> Compare all four compositions</label></div>
    <p className="text-sm text-muted-foreground">The product, argument, qualifications, palette and typography stay fixed. Each aspect gets its own reflow. Every kept overlay appears below at its actual selected display width.</p>
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{draft.aspects.flatMap(aspect => (showCompositions ? COMPOSITIONS : [composition]).flatMap(layout => variants.map((v, i) => <Layout key={`${aspect}-${layout}-${i}`} d={draft} aspect={aspect} layout={layout} text={v.text} label={v.label} variantId={v.id}/>)))}</div>
  </div>;
}
