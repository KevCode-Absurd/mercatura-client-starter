"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, FileText, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AWARENESS_STAGES, AWARENESS_INFO } from "@/lib/taxonomy";
import { CopyRequestSchema, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type CopyRequest, type CopyRun, type CopySource } from "@/lib/copy-builder/types";
type Choice = {
    id: string;
    name: string;
};
type Props = {
    brandId: string;
    brandName: string;
    products: Choice[];
    personas: Choice[];
    sources: CopySource[];
    history: CopyRun[];
    live: boolean;
};
const selectClass = "mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50";
const NONE = "__none";
async function responseJson<T>(res: Response): Promise<T> {
    const value = await res.json().catch(() => ({ error: "The request did not finish. Try again." }));
    if (!res.ok)
        throw new Error(value.error || "The request failed.");
    return value as T;
}
function CopyButton({ text, label = "Copy" }: {
    text: string;
    label?: string;
}) {
    const [copied, setCopied] = useState(false);
    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
        catch {
            toast.error("Clipboard unavailable. Select the text and copy it manually.");
        }
    }
    return <Button type="button" variant="outline" size="sm" onClick={copy}>{copied ? <Check className="size-3.5"/> : <Copy className="size-3.5"/>}{copied ? "Copied" : label}</Button>;
}
export function CopyBuilderView({ brandId, brandName, products, personas, sources, history: initialHistory, live }: Props) {
    const [mode, setMode] = useState<"existing" | "upload">(sources.length ? "existing" : "upload");
    const [existingId, setExistingId] = useState("");
    const [uploaded, setUploaded] = useState<CopySource | null>(null);
    const [search, setSearch] = useState("");
    const [productId, setProductId] = useState(products[0]?.id ?? "");
    const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
    const [stage, setStage] = useState<CopyRequest["stage"]>("problem_aware");
    const [primaryCount, setPrimaryCount] = useState(3);
    const [headlineCount, setHeadlineCount] = useState(5);
    const [length, setLength] = useState<CopyRequest["length"]>("mixed");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState<"upload" | "generate" | "save" | null>(null);
    const [error, setError] = useState("");
    const [history, setHistory] = useState(initialHistory);
    const [run, setRun] = useState<CopyRun | null>(null);
    const [dirty, setDirty] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const source = mode === "upload" ? uploaded : sources.find((s) => s.id === existingId);
    const visibleSources = sources.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
    function choose(id: string) {
        setExistingId(id);
        const ad = sources.find((s) => s.id === id);
        if (ad?.productId && products.some((p) => p.id === ad.productId))
            setProductId(ad.productId);
        if (ad?.personaId && personas.some((p) => p.id === ad.personaId))
            setPersonaId(ad.personaId);
        if (ad?.stage && AWARENESS_STAGES.includes(ad.stage as CopyRequest["stage"]))
            setStage(ad.stage as CopyRequest["stage"]);
    }
    async function upload(file: File) {
        setError("");
        const image = /\.(jpe?g|png|webp)$/i.test(file.name);
        if (!/\.(jpe?g|png|webp|mp4|mov|webm)$/i.test(file.name) || !file.size || file.size > (image ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
            setError("Choose JPG, PNG or WebP up to 15 MB, or MP4, MOV or WebM up to 100 MB.");
            return;
        }
        setBusy("upload");
        try {
            const form = new FormData();
            form.set("brandId", brandId);
            form.set("file", file);
            const data = await responseJson<{
                source: CopySource;
            }>(await fetch("/api/copy-builder/upload", { method: "POST", body: form }));
            setUploaded(data.source);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(null);
            if (fileInput.current)
                fileInput.current.value = "";
        }
    }
    async function generate() {
        setError("");
        const parsed = CopyRequestSchema.safeParse({ brandId, sourceId: source?.id, productId, personaId, stage, primaryCount, headlineCount, length, notes });
        if (!parsed.success) {
            setError("Choose an ad, product and avatar, with 1–10 primary texts and headlines.");
            return;
        }
        setBusy("generate");
        try {
            const data = await responseJson<{
                run: CopyRun;
            }>(await fetch("/api/copy-builder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }));
            setRun(data.run);
            setDirty(false);
            setHistory((prev) => [data.run, ...prev].slice(0, 30));
            toast.success("Your copy is ready and saved.");
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(null);
        }
    }
    function edit(key: "primaryTexts" | "headlines", index: number, text: string) {
        setRun((prev) => prev ? { ...prev, output: { ...prev.output, [key]: prev.output[key].map((s, i) => i === index ? text : s) } } : prev);
        setDirty(true);
    }
    async function save() {
        if (!run)
            return;
        setBusy("save");
        setError("");
        try {
            const data = await responseJson<{
                run: CopyRun;
            }>(await fetch("/api/copy-builder", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ brandId, id: run.id, output: run.output }) }));
            setRun(data.run);
            setDirty(false);
            setHistory((prev) => prev.map((item) => item.id === data.run.id ? data.run : item));
            toast.success("Edits saved.");
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(null);
        }
    }
    return <div className="space-y-6 px-6 pt-6 pb-10">
    {!live && <div className="rounded-lg border bg-muted/40 p-4 text-sm">Connect Gemini for media analysis and enable the Copy builder writer in <Link className="underline" href="/settings">Settings</Link> to generate copy. Saved copy remains available below.</div>}
    {(!products.length || !personas.length) && <div className="rounded-lg border p-4 text-sm">Add a <Link href="/brand" className="underline">product</Link> and an active <Link href="/personas" className="underline">avatar / persona</Link> before generating.</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">1. Choose your ad</h2>
        <p className="mt-1 text-sm text-muted-foreground">We read the image, or watch the video and listen to its audio.</p>
        <fieldset disabled={!!busy} className="mt-5 space-y-4">
          <div className="flex gap-2" aria-label="Ad source">
            <Button type="button" variant={mode === "existing" ? "default" : "outline"} aria-pressed={mode === "existing"} onClick={() => setMode("existing")}><FileText className="size-4"/>Existing ad</Button>
            <Button type="button" variant={mode === "upload" ? "default" : "outline"} aria-pressed={mode === "upload"} onClick={() => setMode("upload")}><Upload className="size-4"/>Upload ad</Button>
          </div>
          {mode === "existing" ? <div className="space-y-3">
            {!sources.length ? <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">No rendered ads for this brand yet. Upload an ad to get started.</p> : <>
              <input aria-label="Search existing ads" className={selectClass} placeholder="Search your ads…" value={search} onChange={(e) => setSearch(e.target.value)}/>
              <label className="block text-sm font-medium">Existing ad<Select value={existingId || NONE} onValueChange={(v) => choose(v === NONE ? "" : v)}><SelectTrigger className={selectClass} aria-label="Existing ad"><SelectValue placeholder="Select an image or video"/></SelectTrigger><SelectContent><SelectItem value={NONE}>Select an image or video</SelectItem>{visibleSources.map((s) => <SelectItem key={s.id} value={s.id}>{s.kind === "video" ? "Video" : "Image"} · {s.title}</SelectItem>)}</SelectContent></Select></label>
              {!visibleSources.length && <p className="text-sm text-muted-foreground">No ads match your search.</p>}
            </>}
          </div> : <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy && e.dataTransfer.files[0])
            void upload(e.dataTransfer.files[0]); }}>
            <ImagePlus className="mx-auto mb-3 size-8 text-muted-foreground"/>
            <p className="text-sm font-medium">Drop an image or video here</p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · 15 MB<br />MP4, MOV, WebM · 100 MB · up to 15 minutes</p>
            <input ref={fileInput} type="file" className="sr-only" aria-label="Upload ad file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" onChange={(e) => { if (e.target.files?.[0])
            void upload(e.target.files[0]); }}/>
            <Button type="button" variant="outline" className="mt-4" onClick={() => fileInput.current?.click()}>{busy === "upload" ? "Checking upload…" : uploaded ? "Replace file" : "Choose file"}</Button>
          </div>}
        </fieldset>
        {source && <figure className="mt-5 overflow-hidden rounded-lg border bg-muted/20">
          {source.kind === "video" ? <video key={source.id} src={source.preview} controls preload="metadata" className="max-h-80 w-full"/> : <img src={source.preview} alt={source.title} className="max-h-80 w-full object-contain"/>}
          <figcaption className="break-words border-t px-3 py-2 text-xs text-muted-foreground">{source.title}</figcaption>
        </figure>}
      </section>

      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">2. Shape the copy</h2>
        <p className="mt-1 text-sm text-muted-foreground">{brandName}’s voice, guidelines and emoji style are included automatically.</p>
        <fieldset disabled={!!busy} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Product<Select value={productId} onValueChange={setProductId}><SelectTrigger className={selectClass} aria-label="Product"><SelectValue placeholder="Choose product"/></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></label>
            <label className="text-sm font-medium">Avatar / persona<Select value={personaId} onValueChange={setPersonaId}><SelectTrigger className={selectClass} aria-label="Avatar / persona"><SelectValue placeholder="Choose avatar"/></SelectTrigger><SelectContent>{personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></label>
          </div>
          <label className="block text-sm font-medium">Stage of awareness<Select value={stage} onValueChange={(v) => setStage(v as CopyRequest["stage"])}><SelectTrigger className={selectClass} aria-label="Stage of awareness"><SelectValue /></SelectTrigger><SelectContent>{AWARENESS_STAGES.map((s) => <SelectItem key={s} value={s}>{AWARENESS_INFO[s].label}</SelectItem>)}</SelectContent></Select></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm font-medium">Primary texts<input type="number" min={1} max={10} step={1} className={selectClass} value={Number.isNaN(primaryCount) ? "" : primaryCount} onChange={(e) => setPrimaryCount(e.target.valueAsNumber)}/></label>
            <label className="text-sm font-medium">Headlines<input type="number" min={1} max={10} step={1} className={selectClass} value={Number.isNaN(headlineCount) ? "" : headlineCount} onChange={(e) => setHeadlineCount(e.target.valueAsNumber)}/></label>
          </div>
          <label className="block text-sm font-medium">Primary text length<Select value={length} onValueChange={(v) => setLength(v as CopyRequest["length"])}><SelectTrigger className={selectClass} aria-label="Primary text length"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mixed">A mix of lengths</SelectItem><SelectItem value="short">Short · about 25–60 words</SelectItem><SelectItem value="medium">Medium · about 60–120 words</SelectItem><SelectItem value="long">Long · about 120–220 words</SelectItem></SelectContent></Select></label>
          <label className="block text-sm font-medium">Extra direction <span className="font-normal text-muted-foreground">(optional)</span><Textarea className="mt-2" rows={3} maxLength={2000} placeholder="A platform, an angle to emphasize, or a CTA…" value={notes} onChange={(e) => setNotes(e.target.value)}/></label>
        </fieldset>
        {dirty && <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">Save your edits below before generating another set or opening saved copy.</p>}
        <Button className="mt-5 w-full" disabled={!live || !!busy || !source || !productId || !personaId || dirty} onClick={generate}>{busy === "generate" ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}{busy === "generate" ? "Analyzing your ad and writing copy…" : "Generate copy"}</Button>
        {busy && <p role="status" className="mt-3 text-sm text-muted-foreground">{busy === "generate" ? "Reading the creative, then writing in your brand’s voice. Videos may take a few minutes. Keep this page open." : busy === "upload" ? "Uploading and checking your media…" : "Saving edits…"}</p>}
        {error && <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>

    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-lg font-semibold">3. Your copy</h2><p className="mt-1 text-sm text-muted-foreground">Edit any alternative, then copy it into your ad platform.</p></div>
        {!!history.length && <label className="min-w-0 max-w-full text-sm sm:max-w-sm">Saved sets<Select value={run?.id ?? NONE} disabled={!!busy || dirty} onValueChange={(v) => { setRun(history.find((r) => r.id === v) ?? null); setDirty(false); }}><SelectTrigger className={selectClass} aria-label="Saved copy sets"><SelectValue placeholder="Open saved copy"/></SelectTrigger><SelectContent><SelectItem value={NONE}>Open saved copy</SelectItem>{history.map((r) => <SelectItem key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.sourceTitle}</SelectItem>)}</SelectContent></Select></label>}
      </div>
      {!run ? <div className="py-12 text-center text-muted-foreground"><FileText className="mx-auto mb-3 size-8"/><p className="text-sm">Your primary texts and headlines will appear here.</p></div> : <div className="mt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-4">
          <div className="min-w-0"><p className="break-words text-sm font-medium">{run.sourceTitle}</p><p className="mt-1 text-xs text-muted-foreground">{products.find((p) => p.id === run.request.productId)?.name ?? run.request.productId} · {personas.find((p) => p.id === run.request.personaId)?.name ?? run.request.personaId} · {AWARENESS_INFO[run.request.stage].label}</p></div>
          <div className="flex flex-wrap gap-2"><CopyButton label="Copy all" text={["PRIMARY TEXTS", ...run.output.primaryTexts.map((s, i) => `${i + 1}. ${s}`), "HEADLINES", ...run.output.headlines.map((s, i) => `${i + 1}. ${s}`)].join("\n\n")}/><Button variant="outline" size="sm" disabled={!dirty || !!busy} onClick={save}>{dirty ? "Save edits" : "Saved"}</Button></div>
        </div>
        <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">What we saw in the ad</summary><div className="mt-3 space-y-3 whitespace-pre-wrap text-sm text-muted-foreground"><p>{run.analysis.summary}</p>{([['Hook', run.analysis.hook], ['On-screen text', run.analysis.visibleText], ['Transcript', run.analysis.transcript], ['Offer', run.analysis.offer], ['CTA', run.analysis.cta]] as const).filter(([, text]) => text).map(([label, text]) => <p key={label}><strong className="text-foreground">{label}: </strong>{text}</p>)}{run.analysis.limitations.map((n, i) => <p key={i}>{n}</p>)}</div></details>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {(["primaryTexts", "headlines"] as const).map((key) => <div key={key} className="space-y-3"><h3 className="font-semibold">{key === "primaryTexts" ? "Primary texts" : "Headlines"} <span className="text-muted-foreground">· {run.output[key].length}</span></h3>{run.output[key].map((text, i) => <div key={`${run.id}-${key}-${i}`} className="rounded-lg border p-4"><div className="mb-3 flex items-center justify-between gap-2"><label htmlFor={`copy-${key}-${i}`} className="text-xs font-medium text-muted-foreground">{key === "primaryTexts" ? "Primary text" : "Headline"} {i + 1}</label><CopyButton text={text}/></div><Textarea id={`copy-${key}-${i}`} value={text} disabled={!!busy} rows={key === "primaryTexts" ? 6 : 2} maxLength={key === "primaryTexts" ? 6000 : 200} className="resize-y border-0 bg-muted/20 leading-relaxed shadow-none" onChange={(e) => edit(key, i, e.target.value)}/><p className="mt-2 text-xs text-muted-foreground">{Array.from(text).length} characters · {text.trim() ? text.trim().split(/\s+/).length : 0} words</p></div>)}</div>)}
        </div>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Emoji style: </span>{run.output.emojiRationale}</p>
        {!!run.output.notes.length && <div className="rounded-lg bg-muted/40 p-4 text-sm"><h3 className="mb-2 font-medium">Writing notes</h3><ul className="list-disc space-y-1 pl-5">{run.output.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
      </div>}
    </section>
  </div>;
}
