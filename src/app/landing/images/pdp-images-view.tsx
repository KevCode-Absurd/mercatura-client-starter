"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Download, Globe, ImagePlus, Loader2, Sparkles } from "lucide-react";
import { PDP_TYPES } from "@/lib/library/taxonomy";
import type { PageEvidence, DiscoveredPage } from "@/lib/landing/evidence";
import type { Fidelity } from "@/lib/studio/reference";
import type { PdpSelection } from "@/lib/landing/pdp-images";
type Props = {
    brand: string;
    website: string;
    products: {
        id: string;
        name: string;
        url: string;
        photos: number;
    }[];
    colors: string[];
    fonts: string[];
    runs: {
        id: string;
        title: string;
        status: string;
        count: number;
    }[];
    initialEvidence?: PageEvidence | null;
    initialProduct?: string;
};
const field = "w-full rounded-xl border bg-background px-3 py-2.5 text-sm";
const action = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40";
const MODES: {
    id: Fidelity;
    title: string;
    description: string;
}[] = [
    { id: "exact", title: "Match the reference", description: "Same composition, camera and layout. Your product, colors, type and words." },
    { id: "structure", title: "Keep the structure", description: "Preserve the layout and buyer question; use your brand's visual world." },
    { id: "loose", title: "Flexible inspiration", description: "Keep the image's purpose and explore a new composition for your brand." },
];
export function PdpImagesView(p: Props) {
    const router = useRouter();
    const [productId, setProduct] = useState(p.products.find(x => x.id === p.initialProduct)?.id ?? p.products[0]?.id ?? ""), [url, setUrl] = useState(p.initialEvidence?.url ?? "");
    const [evidence, setEvidence] = useState<PageEvidence | null>(p.initialEvidence ?? null), [pages, setPages] = useState<DiscoveredPage[]>([]);
    const [selected, setSelected] = useState<PdpSelection[]>([]), [fidelity, setFidelity] = useState<Fidelity>("structure");
    const [aspect, setAspect] = useState<"1:1" | "4:5">("1:1"), [textOnImage, setText] = useState(true), [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(""), [error, setError] = useState(""), [imported, setImported] = useState<{
        id: string;
    }[]>([]);
    const [showAll, setShowAll] = useState(false);
    const product = p.products.find(x => x.id === productId);
    async function request(actionName: string, payload: object) {
        setBusy(actionName);
        setError("");
        try {
            const r = await fetch("/api/landing/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, ...payload }) });
            const data = await r.json();
            if (!r.ok)
                throw new Error(data.error ?? "Request failed.");
            if (data.evidence) {
                setEvidence(data.evidence);
                setSelected([]);
                setImported([]);
            }
            if (data.pages)
                setPages(data.pages);
            if (data.refs)
                setImported(data.refs);
            if (data.id)
                router.push(`/landing/images/${data.id}`);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Could not complete this request.");
        }
        finally {
            setBusy("");
        }
    }
    function toggle(imageUrl: string) {
        setImported([]);
        setSelected(old => old.some(s => s.url === imageUrl) ? old.filter(s => s.url !== imageUrl) : old.length >= 12 ? old : [...old, { url: imageUrl, type: "hero-packshot" }]);
    }
    const gallery = evidence?.gallery ?? [];
    const images = (gallery.length && !showAll ? gallery : evidence?.images ?? []).filter(i => i.width >= 150 && i.height >= 150);
    return <div className="space-y-7 p-6">
    <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><div className="text-xs font-semibold uppercase tracking-widest text-primary">Shared Brand Brain</div><h2 className="mt-2 text-2xl font-semibold">Made for {p.brand}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Creative's product truth, brand typography, colors, planning, image generation and quality checks, available here in CRO.</p></div><a href="/studio/new?kind=pdp" className="text-sm font-medium underline">Browse the full image reference catalog →</a></div>
      <div className="mt-5 flex flex-wrap gap-2">{p.colors.slice(0, 8).map(c => <span key={c} title={c} className="size-7 rounded-full border" style={{ backgroundColor: c }}/>)}{p.fonts.map(f => <span key={f} className="rounded-full border bg-background px-3 py-1 text-xs">{f}</span>)}</div>
      {!p.fonts.length && <p className="mt-3 text-sm text-amber-800">Brand fonts have not been captured yet. Add them in Brand Brain to provide the correct typography specimen.</p>}
    </section>
    <div className="grid gap-7 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-2xl border p-5"><h2 className="font-semibold">1. Your product</h2><label htmlFor="pdp-product" className="mt-4 block text-sm">Product from Brand Brain</label><select id="pdp-product" className={`${field} mt-2`} value={productId} onChange={e => setProduct(e.target.value)}>{p.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">{product?.photos ?? 0} real product photos available</p>
          {!product?.photos && <a href="/brand" className="mt-2 block text-sm text-amber-800 underline">Add product photos before generating</a>}
          <button className="mt-4 text-sm text-primary underline disabled:opacity-40" disabled={!!busy || !(product?.url || p.website)} onClick={() => { const site = product?.url || p.website; setUrl(site); void request("capture", { url: site }); }}>Use my saved {product?.url ? "product page" : "store"}</button>
        </section>
        <section className="rounded-2xl border p-5"><h2 className="font-semibold">2. Reference direction</h2><div className="mt-4 space-y-2">{MODES.map(m => <button key={m.id} onClick={() => setFidelity(m.id)} aria-pressed={fidelity === m.id} className={`w-full rounded-xl border p-3 text-left ${fidelity === m.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted"}`}><span className="text-sm font-medium">{m.title}</span><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.description}</p></button>)}</div></section>
        <section className="rounded-2xl border p-5"><h2 className="font-semibold">3. Finish</h2><label htmlFor="pdp-aspect" className="mt-4 block text-sm">Image shape</label><select id="pdp-aspect" value={aspect} onChange={e => setAspect(e.target.value as typeof aspect)} className={`${field} mt-2`}><option value="1:1">Square · 1:1</option><option value="4:5">Portrait · 4:5</option></select><label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={textOnImage} onChange={e => setText(e.target.checked)}/> Include brand copy on images</label><label htmlFor="pdp-notes" className="mt-4 block text-sm">Direction for this set</label><textarea id="pdp-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} rows={3} className={`${field} mt-2`} placeholder="What should this gallery answer for your buyer?"/></section>
      </aside>
      <div className="space-y-5">
        <section className="rounded-2xl border p-5"><div className="flex items-center gap-2"><Globe size={18}/><h2 className="font-semibold">Find the visual direction</h2></div><p className="mt-2 text-sm text-muted-foreground">Paste a competitor product page or discover product pages from its store. Choose the actual gallery images you want to rebuild.</p><label htmlFor="pdp-url" className="sr-only">Reference website</label><div className="mt-4 flex flex-wrap gap-2"><input id="pdp-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://brand.com/products/product" className={`${field} min-w-48 flex-1`}/><button className={action} disabled={!url.trim() || !!busy} onClick={() => void request("capture", { url })}>{busy === "capture" ? <Loader2 className="animate-spin" size={16}/> : <ImagePlus size={16}/>} Inspect images</button><button className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40" disabled={!url.trim() || !!busy} onClick={() => void request("discover", { url })}>Find product pages</button></div>
          {pages.length > 0 && <select className={`${field} mt-3`} aria-label="Discovered product pages" defaultValue="" onChange={e => { if (e.target.value) {
        setUrl(e.target.value);
        void request("capture", { url: e.target.value });
    } }}><option value="">Choose a discovered product page…</option>{pages.filter(x => x.kind === "pdp").map(x => <option key={x.url} value={x.url}>{x.title || x.url}</option>)}</select>}
          {busy && <p role="status" className="mt-3 text-sm text-muted-foreground">{busy === "capture" ? "Reading the live page at mobile and desktop sizes…" : busy === "create" ? "Importing references and queuing the Creative planner…" : "Working…"}</p>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </section>
        {evidence ? <section className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{evidence.title || "Captured page"}</h2><a href={evidence.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">View source page</a><p className="mt-2 text-sm text-muted-foreground">{images.length} image candidates · {selected.length}/12 selected. Select in gallery order. Navigation and cross-sell images can appear here; check against the live page.</p></div></div>
          {!!gallery.length && <button className="text-sm text-primary underline" onClick={() => setShowAll(!showAll)}>{showAll ? "Show detected product gallery only" : "Showing detected product gallery · browse all page images"}</button>}
          {evidence.warnings.map(w => <p key={w} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{w}</p>)}
          {!images.length && <p className="rounded-xl border p-6">No usable large images were visible. Try a direct product page or choose a reference from the Creative catalog.</p>}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{images.map((image, i) => { const at = selected.findIndex(s => s.url === image.url), sel = selected[at]; return <article key={image.url} className={`overflow-hidden rounded-2xl border ${sel ? "border-primary ring-1 ring-primary" : ""}`}><button className="relative block aspect-square w-full bg-muted" aria-label={`${sel ? "Remove" : "Select"} reference image ${i + 1}`} aria-pressed={!!sel} disabled={!!busy || (!sel && selected.length >= 12)} onClick={() => toggle(image.url)}><img src={image.url} alt={image.alt || `Reference image ${i + 1}`} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer"/><span className={`absolute left-2 top-2 flex size-7 items-center justify-center rounded-full text-xs font-medium ${sel ? "bg-primary text-primary-foreground" : "bg-background/90"}`}>{sel ? at + 1 : "+"}</span></button><div className="space-y-2 p-3"><p className="line-clamp-2 text-xs text-muted-foreground">{image.alt || "Unlabelled image"}</p>{sel && <><select aria-label={`Purpose for image ${at + 1}`} value={sel.type} className={`${field} !text-xs`} onChange={e => setSelected(old => old.map(s => s.url === image.url ? { ...s, type: e.target.value } : s))}>{PDP_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select><input aria-label={`Direction for image ${at + 1}`} className={`${field} !text-xs`} value={sel.direction ?? ""} maxLength={600} placeholder="Direction for this image" onChange={e => setSelected(old => old.map(s => s.url === image.url ? { ...s, direction: e.target.value } : s))}/></>}</div></article>; })}</div>
          <div className="sticky bottom-4 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-medium">{selected.length} selected references → {selected.length} images for {product?.name}</p><p className="mt-1 text-xs text-muted-foreground">Planning is paid. Review the exact words and image estimate before rendering. Existing spend limits apply.</p></div><div className="flex gap-2"><button className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40" disabled={!!busy || !selected.length} onClick={() => void request("import", { evidenceId: evidence.id, selections: selected })}>Import references</button><button className={action} disabled={!!busy || !selected.length || !product?.photos} onClick={() => void request("create", { evidenceId: evidence.id, selections: selected, productId, fidelity, aspect, textOnImage, notes })}><Sparkles size={16}/> Plan my gallery <ArrowRight size={16}/></button></div></div>
            {!!imported.length && <div className="mt-3 flex flex-wrap gap-3 border-t pt-3 text-xs"><span className="flex items-center gap-1"><Check size={14}/> References saved</span>{imported.map((r, i) => <a key={r.id} download={`reference-${i + 1}.png`} href={`/api/library/media/${r.id}`} className="flex items-center gap-1 underline"><Download size={12}/> Reference {i + 1}</a>)}</div>}
          </div>
        </section> : <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/25 p-8 text-center"><ImagePlus size={36} className="text-muted-foreground"/><h2 className="mt-4 text-xl font-semibold">A better gallery starts with the right questions</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">What is it? How does it work? Will it fit? What arrives? Import the reference images that answer these questions, then rebuild them for your own product.</p></section>}
      </div>
    </div>
    {!!p.runs.length && <section className="border-t pt-6"><h2 className="text-xl font-semibold">Your product image sets</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{p.runs.map(r => <a href={`/landing/images/${r.id}`} key={r.id} className="rounded-xl border p-4 hover:bg-muted"><p className="font-medium">{r.title}</p><p className="mt-2 text-xs text-muted-foreground">{r.count} images · {r.status}</p></a>)}</div></section>}
  </div>;
}
