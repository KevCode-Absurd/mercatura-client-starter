"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SeoAudit, SeoContext, SeoSnapshot } from "@/lib/seo/model";
import type { SeoArtifact } from "@/lib/seo/content";
import { optimizationModes, optimizationTargets, type OptimizationInput, type OptimizationMode } from "@/lib/seo/optimization";
import { createOptimizationAction } from "./optimization-actions";
import { createOptimizationBatchAction } from "./review-actions";
import { schemaReconciliation } from "@/lib/seo/review-tools";
import { studyFor } from "@/lib/seo/study";
import { StudyEvidenceNotes } from "./study-evidence";
const controlClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const initial = (ctx: SeoContext): OptimizationInput => ({ mode: "pdp", contextHash: ctx.contextHash, targetUrl: "", verified: false });
export function OptimizationPanel({ ctx, snapshot, audit }: {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
    audit: SeoAudit;
}) {
    const [hydrated, setHydrated] = useState(false);
    const [input, setInput] = useState<OptimizationInput>(() => initial(ctx));
    const [saved, setSaved] = useState<SeoArtifact | null>(null);
    const [batch, setBatch] = useState<OptimizationInput[]>([]);
    const [batchSaved, setBatchSaved] = useState<SeoArtifact[]>([]);
    const [pending, startTransition] = useTransition();
    const targets = useMemo(() => optimizationTargets(ctx, snapshot), [ctx, snapshot]);
    const productMode = ["pdp", "schema", "feed"].includes(input.mode);
    const filtered = targets.filter((p) => productMode ? p.kind === "pdp" : input.mode === "collection" ? p.kind === "collection" : true);
    useEffect(() => { setHydrated(true); }, []);
    const target = filtered.find((p) => p.url === input.targetUrl);
    const observed = snapshot.pages.find((p) => p.url === input.targetUrl);
    const findings = audit.findings.filter((f) => f.url === input.targetUrl);
    const patch = (key: keyof OptimizationInput, value: string | boolean) => setInput((previous) => ({ ...previous, [key]: value, ...(key !== "verified" ? { verified: false } : {}) }));
    const field = (key: keyof OptimizationInput, label: string, max: number, multiline = false, placeholder?: string) => (<label className="grid gap-1.5 text-sm" key={key} htmlFor={`opt-${key}`}>
      <span className="font-medium">{label}</span>
      {multiline ? <Textarea id={`opt-${key}`} value={String(input[key] ?? "")} maxLength={max} rows={4} placeholder={placeholder} onChange={(event) => patch(key, event.target.value)}/> : <Input id={`opt-${key}`} value={String(input[key] ?? "")} maxLength={max} placeholder={placeholder} onChange={(event) => patch(key, event.target.value)}/>}
    </label>);
    function selectTarget(url: string) {
        const page = snapshot.pages.find((p) => p.url === url);
        const product = ctx.products.find((p) => p.url === url);
        setInput((previous) => ({ mode: previous.mode, contextHash: ctx.contextHash, targetUrl: url, title: page?.title ?? "", heading: page?.h1 ?? "", description: page?.description ?? "", productName: product?.name ?? "", verified: false }));
        setSaved(null);
    }
    function generate() {
        startTransition(async () => {
            try {
                const result = await createOptimizationAction(ctx.brandId, input);
                if (!result.ok) {
                    toast.error(result.error);
                    return;
                }
                setSaved(result.value);
                toast.success("Draft saved. Review it in Developer handoff before exporting.");
            }
            catch {
                toast.error("Unable to prepare the package. Refresh and try again.");
            }
        });
    }
    return <section data-testid="seo-optimization-panel" className="grid gap-6">
    <div className="rounded-2xl border bg-card p-6">
      <Badge variant="outline">Human implementation</Badge>
      <h2 className="mt-3 text-xl font-semibold">Improve a store page</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Choose a page and prepare changes using verified product facts from your {ctx.brandName} Brand Brain. Review each draft before applying it to your store.</p>
      <fieldset disabled={!hydrated} className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
        <label htmlFor="opt-mode" className="grid gap-1.5 text-sm"><span className="font-medium">Package type</span><select id="opt-mode" className={controlClass} value={input.mode} onChange={(event) => { setInput({ ...initial(ctx), mode: event.target.value as OptimizationMode }); setSaved(null); }}>{Object.entries(optimizationModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label htmlFor="opt-target" className="grid gap-1.5 text-sm"><span className="font-medium">Target store page</span><select id="opt-target" className={controlClass} value={target?.url ?? ""} onChange={(event) => selectTarget(event.target.value)}><option value="">Choose a page</option>{filtered.map((p) => <option key={p.url} value={p.url}>{p.label.slice(0, 80)} · {new URL(p.url).pathname}</option>)}</select></label>
      </fieldset>
      <StudyEvidenceNotes findings={studyFor({ mode: input.mode })}/>
      {!filtered.length && <p role="status" className="mt-3 text-sm text-muted-foreground">No matching pages are available. Run the store audit or add exact product URLs to the shared catalogue.</p>}
      {target && <div className="mt-4 rounded-lg bg-muted/40 p-4 text-sm"><p className="break-all font-medium">{target.url}</p><p className="mt-1 text-muted-foreground">{observed ? `Captured ${new Date(snapshot.observedAt).toLocaleString()} · HTTP ${observed.statusCode ?? "unknown"} · ${findings.length} findings` : "Shared catalogue reference; no captured HTML for this page."}</p>{observed?.title && <p className="mt-2">Current title: {observed.title}</p>}{findings.slice(0, 4).map((f) => <p key={f.id} className="mt-1 text-muted-foreground">{f.priority} · {f.title}</p>)}</div>}
    </div>
    {target && <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-semibold">{optimizationModes[input.mode]}</h3>
      <div className="mt-4 grid gap-4">
        {["pdp", "collection"].includes(input.mode) && <>
          {field("keyword", "Primary buyer search term", 180, false, "A specific term this page should answer")}
          {field("title", "Proposed search title", 200)}
          {field("description", "Proposed search description", 1000, true)}
          {field("heading", "Visible page heading", 200)}
          {field("facts", "Supported page introduction and product / assortment facts", 6000, true, "Write the final proposed visible copy. Include only facts supported by the evidence URL below.")}
        </>}
        {input.mode === "answer" && <>{field("question", "Exact shopper question", 300)}{field("answer", "Verified direct answer", 4000, true, "Provide the actual answer from a current product or policy source.")}</>}
        {["schema", "feed"].includes(input.mode) && <>
          <div className="rounded-lg border bg-muted/40 p-3" data-testid="seo-schema-reconciliation"><h4 className="font-medium">Reconcile with captured schema and visible facts</h4><ul className="mt-2 list-disc space-y-2 pl-4 text-xs text-muted-foreground">{schemaReconciliation(observed, input).map((note) => <li key={note}>{note}</li>)}</ul></div>
          <p className="text-sm text-muted-foreground">Enter the exact selected variant and market. Catalogue identity does not establish SKU, price, stock or product claims.</p>
          <div className="grid gap-4 md:grid-cols-2">{field("productName", "Verified product / variant name", 150)}{field("sku", "Verified SKU / stable ID", 50)}{field("price", "Current price (number only)", 20, false, "29.99")}{field("currency", "Currency code", 3, false, "USD")}</div>
          {field("imageUrl", "Exact product image URL", 2000)}
          {field("description", "Verified product description", 1000, true)}
          <label htmlFor="opt-stock" className="grid gap-1.5 text-sm"><span className="font-medium">Verified availability</span><select id="opt-stock" className={controlClass} value={input.availability ?? ""} onChange={(e) => patch("availability", e.target.value)}><option value="">Select stock status</option><option value="InStock">In stock</option><option value="OutOfStock">Out of stock</option><option value="PreOrder">Preorder</option><option value="BackOrder">Backorder</option></select></label>
          <div className="grid gap-4 md:grid-cols-2">{field("gtin", "GTIN (only if verified; otherwise leave blank)", 14)}{field("mpn", "Manufacturer part number (if applicable)", 70)}</div>
          {input.mode === "schema" ? <><p className="text-sm text-muted-foreground">Optional breadcrumbs: enter both fields only if this hierarchy is visibly present. Product schema must replace or repair the existing theme/app owner.</p>{field("breadcrumbName", "Visible parent breadcrumb label", 100)}{field("breadcrumbUrl", "Visible parent breadcrumb URL", 2000)}</> : <><label htmlFor="opt-condition" className="grid gap-1.5 text-sm"><span className="font-medium">Verified condition</span><select id="opt-condition" className={controlClass} value={input.condition ?? ""} onChange={(e) => patch("condition", e.target.value)}><option value="">Select condition</option><option value="new">New</option><option value="refurbished">Refurbished</option><option value="used">Used</option></select></label><p className="text-sm text-muted-foreground">The CSV is a review preview. Missing identifiers, variant attributes and market requirements remain flagged for completion before Merchant Center submission.</p></>}
        </>}
        {input.mode === "trust" && <>{field("facts", "Exact evidence statement and product applicability", 6000, true)}{field("rationale", "Evidence limitations, named reviewer and review date", 3000, true)}</>}
        {input.mode === "policy" && <>
          <label htmlFor="opt-policy" className="grid gap-1.5 text-sm"><span className="font-medium">Page scenario</span><select id="opt-policy" className={controlClass} value={input.policy ?? "canonical"} onChange={(e) => patch("policy", e.target.value)}><option value="canonical">Canonical correction</option><option value="filters">Filters and sorting</option><option value="variants">Product variants</option><option value="temporary-stock">Temporarily out of stock</option><option value="discontinued">Permanently discontinued</option></select></label>
          {field("destinationUrl", "Proposed canonical / equivalent replacement URL (optional)", 2000)}
          {field("rationale", "Page-specific rationale and intended behavior", 3000, true, "Explain what is wrong, which pages are equivalent, and why this treatment is appropriate.")}
        </>}
        {input.mode !== "policy" && <>
          {field("evidenceUrl", "Source URL supporting these exact facts", 2000)}
          <label className="flex items-start gap-2 text-sm" htmlFor="opt-verified"><input id="opt-verified" type="checkbox" className="mt-1" checked={input.verified ?? false} onChange={(e) => patch("verified", e.target.checked)}/><span>I checked the supplied facts against the source and confirmed they apply to this exact page, variant and market. This records my review, not automatic verification.</span></label>
        </>}
      </div>
      <Button className="mt-5" onClick={generate} disabled={pending || (input.mode !== "policy" && !input.verified)}>{pending ? "Preparing draft…" : "Create developer handoff draft"}</Button>
      {["pdp", "collection"].includes(input.mode) && <Button variant="outline" className="mt-5 sm:ml-2" disabled={pending || !input.verified || batch.length >= 10 && !batch.some((b) => b.targetUrl === input.targetUrl)} onClick={() => { setBatch((old) => [...old.filter((b) => b.targetUrl !== input.targetUrl), { ...input }]); toast.success("Reviewed page added to the batch. Choose another page above."); }}>Add this reviewed page to batch</Button>}
    </div>}
    <section className="space-y-3 rounded-xl border bg-card p-5" data-testid="seo-optimization-batch"><h3 className="font-semibold">Product and collection batch · {batch.length} / 10</h3><p className="text-sm text-muted-foreground">Review each page's own copy, metadata and evidence in the form, then add it here. Each row becomes a separate editable draft; no generic claims are copied across products.</p>{batch.map((row) => <article className="space-y-2 rounded-lg border p-3 text-sm" key={row.targetUrl}><strong>{row.title}</strong><p className="break-all text-xs">{row.targetUrl}</p><p className="text-xs text-muted-foreground">{row.description}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setInput({ ...row }); setSaved(null); }}>Review or edit row</Button><Button size="sm" variant="ghost" onClick={() => setBatch((old) => old.filter((b) => b.targetUrl !== row.targetUrl))}>Remove</Button></div></article>)}<Button disabled={pending || !batch.length} onClick={() => startTransition(async () => { try {
        const r = await createOptimizationBatchAction(ctx.brandId, ctx.contextHash, batch);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        setBatchSaved(r.value);
        setBatch([]);
        toast.success(`${r.value.length} separate draft proposals saved for approval.`);
    }
    catch {
        toast.error("Could not save this batch; your rows remain here.");
    } })}>{pending ? "Preparing separate drafts…" : "Save reviewed batch proposals"}</Button>{batchSaved.map((a) => <Link className="block break-words text-sm text-primary underline" key={a.id} href={`/seo/content?id=${a.id}`}>Review {a.title} · {a.targetUrl}</Link>)}</section>
    {saved && <div className="rounded-2xl border bg-card p-6" role="status">
      <Badge variant="outline">Draft saved · not applied</Badge><h3 className="mt-3 font-semibold">{saved.title}</h3><p className="mt-2 text-sm text-muted-foreground">Review and download your changes in Handoff, then record when they are applied to your store.</p>
      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-xs">{saved.body}</pre>
      {saved.codeFiles?.map((file) => <details className="mt-3 rounded-lg border p-3" key={file.name}><summary className="cursor-pointer text-sm font-medium">{file.name} · proposed code</summary><p className="mt-3 text-sm">{file.placement}</p><pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs">{file.code}</pre><p className="mt-3 text-sm text-muted-foreground">Verify: {file.validation}</p></details>)}
      <Button asChild variant="outline" className="mt-4"><Link href={`/seo/content?id=${saved.id}`}>Review and export handoff</Link></Button>
    </div>}
  </section>;
}
