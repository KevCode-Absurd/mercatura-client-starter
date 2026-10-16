"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, Minus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { StudioVariant, TextLayer } from "@/db/schema";
import { pollVariantCompletion } from "@/lib/studio/composite-progress";
import { variantTitle, variedSlots } from "@/lib/studio/overlay";
import { galleryIdentity, GALLERY_FOCUS } from "@/lib/studio/gallery";
import { cn } from "@/lib/utils";
import { removeVariantAction, setStatusAction, writeVariantsAction, compositeVariantsAction, variantCompositeStatusAction } from "../../../actions";
import { assetUrl } from "../../../shared";
const MOST = 30;
export function VariantsPanel({ runId, itemId, productLabel = itemId, argument = "Unclassified argument", aspect, version, variants, layers, ready, flatten, fit, busy, editing, size, }: {
    runId: string;
    itemId: string;
    productLabel?: string;
    argument?: string;
    aspect: string;
    version: number;
    variants: StudioVariant[];
    layers: TextLayer[];
    ready: boolean;
    flatten: (layers: TextLayer[]) => Promise<Blob>;
    fit: (lines: TextLayer[], like: TextLayer[]) => TextLayer[];
    busy: boolean;
    editing: string | null;
    size: {
        w: number;
        h: number;
    };
}) {
    const router = useRouter();
    const heading = useRef<HTMLHeadingElement>(null);
    const identity = (v: StudioVariant) => galleryIdentity({ product: productLabel, argument, itemId, aspect: v.aspect, version: v.id, copyState: v.copy_status, imageState: v.path ? "awaiting image review" : "compositing pending" });
    const [raw, setRaw] = useState("5");
    const [budget, setBudget] = useState("");
    const [working, setWorking] = useState(busy);
    const [pending, start] = useTransition();
    const [ticked, setTicked] = useState<Set<string>>(new Set());
    const [failed, setFailed] = useState<string | null>(null);
    const count = Math.min(MOST, Math.max(1, Math.round(Number(raw) || 1)));
    const step = (by: number) => setRaw(String(Math.min(MOST, Math.max(1, count + by))));
    const before = useRef(variants.length);
    const operation = useRef<"write" | "composite">("write");
    useEffect(() => {
        if (!working)
            return;
        const t = setInterval(async () => {
            const result = await pollVariantCompletion({ operation: operation.current, before: before.current, requested: count }, () => setStatusAction(runId), () => variantCompositeStatusAction(runId, itemId, aspect));
            if (result.busy)
                return;
            setWorking(false);
            setFailed(result.message);
            router.refresh();
        }, 2500);
        return () => clearInterval(t);
    }, [working, runId, itemId, aspect, count, router]);
    const drawing = variants.filter(v => !v.path).length;
    useEffect(() => { if (working || !drawing)
        return; let active = true; void variantCompositeStatusAction(runId, itemId, aspect).then(status => { if (active && status.ok && status.progress.held.length)
        setFailed(status.progress.held.map(h => `${h.id}: ${h.findings.join(" ")}`).join("\n")); }); return () => { active = false; }; }, [working, drawing, runId, itemId, aspect]);
    const retryComposite = () => start(async () => { operation.current = "composite"; setFailed(null); const res = await compositeVariantsAction(runId, itemId); if (!res.ok)
        return void toast.error(res.error); setWorking(true); });
    const write = () => start(async () => {
        setFailed(null);
        operation.current = "write";
        const res = await writeVariantsAction(runId, itemId, aspect, count, layers, budget.trim() ? Number(budget) : undefined);
        if (!res.ok)
            return void toast.error(res.error);
        before.current = variants.length;
        setWorking(true);
    });
    const remove = (id: string) => start(async () => {
        const res = await removeVariantAction(runId, itemId, id);
        if (!res.ok)
            return void toast.error(res.error);
        setTicked((cur) => new Set([...cur].filter((x) => x !== id)));
        router.refresh();
        requestAnimationFrame(() => heading.current?.focus());
    });
    const tick = (id: string) => setTicked((cur) => {
        const next = new Set(cur);
        if (!next.delete(id))
            next.add(id);
        return next;
    });
    const made = variants.filter((v) => v.path);
    const picked = made.filter((v) => ticked.has(v.id));
    const changes = variedSlots(layers.filter((l) => l.text.trim())).length;
    const zipHref = `/api/studio/${runId}/download?item=${encodeURIComponent(itemId)}&variants=${picked.length ? picked.map((v) => v.id).join(",") : "all"}`;
    return (<section className="mt-8 space-y-3 border-t pt-6" data-testid="variants-panel">
      <div>
        <h2 ref={heading} tabIndex={-1} className={`display text-xl ${GALLERY_FOCUS}`}>Variants of this ad</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The same picture with {changes > 1 ? "another headline and subheadline" : "another headline"}. Pick how many, then keep the ones you like, fix a word in any of them, or download them. No image is made for a variant.
        </p>
      </div>
      <label className="block text-xs">Optional total text budget for this variant request, including readers and repairs (USD) <input type="number" min="0.01" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} className="rounded border p-2" placeholder="Existing global cap"/></label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-9 items-center rounded-md border bg-background" role="group" aria-label="How many variants to write">
          <button type="button" className="grid h-full w-9 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => step(-1)} disabled={count <= 1 || working} aria-label="1 fewer" data-testid="variants-minus">
            <Minus className="size-4"/>
          </button>
          <input type="text" inputMode="numeric" value={raw} onChange={(e) => setRaw(e.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => setRaw(String(count))} onKeyDown={(e) => (e.key === "ArrowUp" ? (e.preventDefault(), step(1)) : e.key === "ArrowDown" ? (e.preventDefault(), step(-1)) : undefined)} disabled={working} className="h-full w-11 border-x bg-transparent text-center text-sm tabular-nums outline-none focus-visible:bg-muted" aria-label="Number of variants" data-testid="variants-count"/>
          <button type="button" className="grid h-full w-9 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40" onClick={() => step(1)} disabled={count >= MOST || working} aria-label="1 more" data-testid="variants-plus">
            <Plus className="size-4"/>
          </button>
        </div>
        <Button onClick={write} disabled={pending || working || !ready || !!editing} title={editing ? "Go back to the ad to write more variants of it" : undefined} data-testid="variants-write">
          {working ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
          {working ? "Writing the words" : `Write ${count} variant${count === 1 ? "" : "s"}`}
        </Button>
        {made.length > 0 && (<a href={zipHref} className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="variants-download">
            <Download className="size-4"/>
            {picked.length ? `Download the ${picked.length} ticked` : `Download all ${made.length}`}
          </a>)}
      </div>
      {editing && <p className="text-xs text-muted-foreground">You are changing 1 variant. New variants are written from the ad itself.</p>}
      {drawing > 0 && (<p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="variants-drawing">
          <Loader2 className="size-4 animate-spin"/> Server compositing pending or held for {drawing} variant{drawing === 1 ? "" : "s"}. Closing this editor does not stop the worker.
        </p>)}
      {drawing > 0 && <Button variant="outline" disabled={pending || working} onClick={retryComposite}>Retry queued compositing</Button>}
      {failed && <p role="alert" className="text-xs text-red-700">{failed}</p>}
      {variants.length > 0 && (<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-testid="variants-list">
          {variants.map((v, i) => (<li key={v.id} className={cn("rounded-lg border bg-card p-2", editing === v.id && "border-foreground")} data-testid="variant" data-variant={v.id}>
              {v.path ? (<a href={assetUrl(v.path)} target="_blank" rel="noreferrer" title="Open at full size" aria-label={`Inspect ${identity(v)}; ${variantTitle(v.layers)}`}>

                  <img src={assetUrl(v.path, 480)} alt={`${identity(v)}; ${variantTitle(v.layers)}`} className="w-full rounded-md bg-muted object-cover" style={{ aspectRatio: `${size.w} / ${size.h}` }} loading="lazy"/>
                </a>) : (<div className="grid w-full place-items-center rounded-md bg-muted text-muted-foreground" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
                  <Loader2 className="size-5 animate-spin"/>
                </div>)}
              <p className="mt-2 line-clamp-2 text-xs leading-snug">{variantTitle(v.layers)}</p>
              {v.copy_status && <p className="mt-1 text-xs text-muted-foreground">{v.copy_status === "approved" ? "Copy approved · image check pending" : v.copy_status === "unverified" ? "Draft · copy review unverified" : "Draft · copy approval pending"}</p>}
              <div className="mt-1.5 flex items-center gap-1 text-muted-foreground">
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={ticked.has(v.id)} onChange={() => tick(v.id)} disabled={!v.path} className="size-3.5" aria-label={`Tick ${identity(v)}; ${variantTitle(v.layers)}`} data-testid="variant-tick"/>
                  {i + 1}
                </label>
                <Link href={`/studio/${runId}/edit/${itemId}?aspect=${encodeURIComponent(aspect)}&variant=${v.id}`} className={`ml-auto rounded p-1 hover:bg-muted hover:text-foreground ${GALLERY_FOCUS}`} title="Change the words, font or place of this variant" aria-label={`Edit ${identity(v)}; ${variantTitle(v.layers)}`} data-testid="variant-edit">
                  <Pencil className="size-3.5"/>
                </Link>
                {v.path && (<a href={assetUrl(v.path)} download={`${itemId}_${aspect.replace(":", "x")}_variant-${i + 1}.png`} className={`rounded p-1 hover:bg-muted hover:text-foreground ${GALLERY_FOCUS}`} title="Download this variant" aria-label={`Download ${identity(v)}; ${variantTitle(v.layers)}`}>
                    <Download className="size-3.5"/>
                  </a>)}
                <button type="button" className={`rounded p-1 hover:bg-muted hover:text-red-700 ${GALLERY_FOCUS}`} onClick={() => remove(v.id)} disabled={pending || working} title="Remove this variant" aria-label={`Remove ${identity(v)}; ${variantTitle(v.layers)}`} data-testid="variant-remove">
                  <Trash2 className="size-3.5"/>
                </button>
              </div>
            </li>))}
        </ul>)}
    </section>);
}
