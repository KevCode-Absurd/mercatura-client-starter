"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlignCenter, AlignLeft, AlignRight, CaseUpper, Copy, Download, Eye, Loader2, Plus, RectangleHorizontal, Save, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { BrandFontsBox, type BrandFontFamily } from "@/components/brand-fonts-box";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { StudioVariant, TextLayer } from "@/db/schema";
import { STOCK_FONTS, drawLayers, fitSize, fontCss, inkFor, nearestWeight, missingLayerFonts, newLayer, shown, weightName, wrapLines, type FontChoice, type TypeDefaults } from "@/lib/studio/overlay";
import { cn } from "@/lib/utils";
import { makeEditableAction, readLayoutAction, setStatusAction } from "../../../actions";
import { assetUrl } from "../../../shared";
import { STOCK_FAMILY } from "./stock-fonts";
import { VariantsPanel } from "./variants-panel";
export interface EditorProps {
    returnHref?: string;
    runId: string;
    itemId: string;
    productLabel?: string;
    argument?: string;
    aspect: string;
    version: number;
    picture: string;
    base: string | null;
    size: {
        w: number;
        h: number;
    };
    initial: TextLayer[];
    fresh: boolean;
    families: BrandFontFamily[];
    type: TypeDefaults;
    palette: {
        hex: string;
        name: string;
    }[];
    siteUrl: string;
    busy: boolean;
    sizes: string[];
    variants: StudioVariant[];
    variant: {
        id: string;
        n: number;
    } | null;
    rows: Record<string, number>;
    read: boolean;
}
const ROLES: [
    string,
    string
][] = [["headline", "Headline"], ["subhead", "Subheadline"], ["point", "Point"], ["offer", "Offer"], ["price", "Price"], ["badge", "Badge"], ["quote", "Quote"], ["attribution", "Said by"], ["caption", "Caption"], ["cta", "Button"]];
const ROLE_NAME: Record<string, string> = { ...Object.fromEntries(ROLES), label: "Label", table: "Table", text: "Line" };
const brandCss = (family: string) => `ce-brand-${family.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const familyOf = (font: string) => {
    if (font.startsWith("brand:"))
        return `"${brandCss(font.slice(6))}"`;
    const family = STOCK_FAMILY[font];
    if (!family)
        throw new Error(`The selected font (${font}) is unavailable. Choose a loaded font explicitly.`);
    return family;
};
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const r3 = (n: number) => Math.round(n * 1000) / 1000;
function ruler() {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx)
        return null;
    const W = 1000;
    const at = (l: TextLayer) => (px: number) => {
        ctx.font = fontCss(l, px, familyOf(l.font));
        return (s: string) => ctx.measureText(s).width;
    };
    return { W, at, rowsOf: (l: TextLayer) => wrapLines(shown(l), l.w * W, at(l)(l.size * W)).length };
}
function fitTo(lines: TextLayer[], like: TextLayer[]): TextLayer[] {
    const r = ruler();
    if (!r)
        return lines;
    return lines.map((l) => {
        const was = like.find((x) => x.id === l.id);
        if (!was || was.text === l.text)
            return l;
        const size = fitSize(l, r.rowsOf({ ...was, font: l.font, weight: l.weight, size: l.size, w: l.w }), r.W, r.at(l));
        return size === l.size ? l : { ...l, size };
    });
}
export function TextEditor(p: EditorProps) {
    if (!p.base)
        return <MakeEditable {...p}/>;
    return <Editor {...p} base={p.base}/>;
}
function MakeEditable({ runId, itemId, aspect, picture, busy, size }: EditorProps) {
    const router = useRouter();
    const [working, setWorking] = useState(busy);
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!working)
            return;
        const t = setInterval(async () => {
            const res = await setStatusAction(runId);
            if (!res.ok || res.busy)
                return;
            setWorking(false);
            if (res.lastError)
                setError(res.lastError);
            router.refresh();
        }, 3000);
        return () => clearInterval(t);
    }, [working, runId, router]);
    const go = () => start(async () => {
        setError(null);
        const res = await makeEditableAction(runId, itemId, aspect);
        if (!res.ok)
            return void toast.error(res.error);
        setWorking(true);
    });
    return (<div className="grid gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_22rem]" data-testid="editor-locked">
      <div className="mx-auto w-full" style={{ maxWidth: `calc((100vh - 15rem) * ${size.w / size.h})` }}>

        <img src={assetUrl(picture, 1200)} alt="The picture as it was made" className="w-full rounded-lg border bg-muted" style={{ aspectRatio: `${size.w} / ${size.h}` }}/>
      </div>
      <div className="space-y-3 text-sm">
        <h2 className="display text-2xl">The words are part of this picture</h2>
        <p className="text-muted-foreground">They were painted in when the picture was made. Take them off once, and from then on every change of words, font or place is instant, and each one can be kept as a new ad.</p>
        <Button onClick={go} disabled={pending || working} data-testid="editor-make-editable">
          {pending || working ? <Loader2 className="size-4 animate-spin"/> : <Wand2 className="size-4"/>}
          {working ? "Taking the words off, about a minute" : "Make this picture editable"}
        </Button>
        <p className="text-xs text-muted-foreground">This is the only step that makes an image. It is done once for a picture.</p>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>);
}
function Editor({ runId, itemId, productLabel = itemId, argument = "Unclassified argument", aspect, version, picture, base, size, initial, fresh, families, type, palette, siteUrl, sizes, variants, variant, rows, read, busy, returnHref }: EditorProps & {
    base: string;
}) {
    const router = useRouter();
    const [reading, setReading] = useState(read);
    const asked = useRef(false);
    useEffect(() => {
        if (!read || asked.current)
            return;
        asked.current = true;
        void (async () => {
            const res = await readLayoutAction(runId, itemId, aspect).catch(() => null);
            if (res?.ok && res.found > 0)
                router.refresh();
            else
                setReading(false);
        })();
    }, [read, runId, itemId, aspect, router]);
    const [layers, setLayers] = useState<TextLayer[]>(initial);
    const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [fontsAt, setFontsAt] = useState(0);
    const [loadedFonts, setLoadedFonts] = useState<string[]>([]);
    const [cssW, setCssW] = useState(0);
    const [heights, setHeights] = useState<Record<string, number>>({});
    const [peek, setPeek] = useState(false);
    const [guide, setGuide] = useState(false);
    const [saving, setSaving] = useState<"save" | "variant" | "download" | null>(null);
    const [kept, setKept] = useState(0);
    const [dirty, setDirty] = useState(false);
    const stage = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const added = useRef(0);
    const choices: FontChoice[] = useMemo(() => [...families.map((f) => ({ id: `brand:${f.family}`, label: f.family, group: "brand" as const, weights: f.weights })), ...STOCK_FONTS.map((f) => ({ id: f.id, label: f.label, group: "standard" as const, weights: [...f.weights] }))], [families]);
    const fontGaps = missingLayerFonts(layers, loadedFonts);
    const patch = useCallback((id: string, part: Partial<TextLayer>) => {
        setLayers((cur) => cur.map((l) => (l.id === id ? { ...l, ...part } : l)));
        setDirty(true);
    }, []);
    useEffect(() => {
        const i = new Image();
        i.onload = () => setImg(i);
        i.src = assetUrl(base);
    }, [base]);
    const fontKey = JSON.stringify(families.map((f) => f.faces.map((x) => x.file)));
    useEffect(() => {
        let off = false;
        const mine: FontFace[] = [];
        void (async () => {
            const loaded = new Set<string>();
            await Promise.all(families.flatMap((fam) => fam.faces.map(async (face) => {
                const ff = new FontFace(brandCss(fam.family), `url("/api/brand-file/look/fonts/${encodeURIComponent(face.file)}")`, { weight: face.weight, style: face.style });
                try {
                    await ff.load();
                    if (!off) {
                        document.fonts.add(ff);
                        mine.push(ff);
                        loaded.add(`brand:${fam.family}`);
                    }
                }
                catch {
                }
            })));
            await Promise.all(Object.entries(STOCK_FAMILY).map(async ([id, family]) => {
                const faces = (await Promise.all([400, 800].map((w) => document.fonts.load(`${w} 24px ${family}`).catch(() => [])))).flat();
                if (faces.some((f) => f.status === "loaded"))
                    loaded.add(id);
            }));
            if (!off) {
                setLoadedFonts([...loaded]);
                setFontsAt((n) => n + 1);
            }
        })();
        return () => {
            off = true;
            for (const f of mine)
                document.fonts.delete(f);
        };
    }, [fontKey]);
    useEffect(() => {
        const el = stage.current;
        if (!el)
            return;
        const ro = new ResizeObserver(() => setCssW(el.clientWidth));
        ro.observe(el);
        setCssW(el.clientWidth);
        return () => ro.disconnect();
    }, []);
    const fitted = useRef(!fresh || !Object.keys(rows).length);
    useEffect(() => {
        if (fitted.current || !fontsAt || missingLayerFonts(layers, loadedFonts).length)
            return;
        fitted.current = true;
        const r = ruler();
        if (!r)
            return;
        setLayers((cur) => cur.map((l) => {
            const want = rows[l.id];
            if (!want)
                return l;
            const size = fitSize(l, want, r.W, r.at(l), 0.55);
            return size === l.size ? l : { ...l, size };
        }));
    }, [fontsAt, loadedFonts, layers, rows]);
    const inked = useRef(!fresh);
    useEffect(() => {
        if (inked.current || !img)
            return;
        inked.current = true;
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = Math.max(8, Math.round((64 * size.h) / size.w));
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx)
            return;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        setLayers((cur) => cur.map((l) => {
            if (rows[l.id])
                return l;
            const x = clamp(Math.floor(l.x * c.width), 0, c.width - 1);
            const y = clamp(Math.floor(l.y * c.height), 0, c.height - 1);
            const w = clamp(Math.ceil(l.w * c.width), 1, c.width - x);
            const h = clamp(Math.ceil(l.size * 2.4 * c.width), 1, c.height - y);
            const d = ctx.getImageData(x, y, w, h).data;
            let sum = 0;
            for (let i = 0; i < d.length; i += 4)
                sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            return { ...l, color: inkFor(sum / (d.length / 4) / 255) };
        }));
    }, [img, size, rows]);
    useEffect(() => {
        const c = canvas.current;
        if (!c || !img || !cssW)
            return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.round(cssW * dpr);
        const H = Math.round((W * size.h) / size.w);
        if (c.width !== W)
            c.width = W;
        if (c.height !== H)
            c.height = H;
        const ctx = c.getContext("2d");
        if (!ctx)
            return;
        ctx.drawImage(img, 0, 0, W, H);
        if (!fontsAt || missingLayerFonts(layers, loadedFonts).length)
            return;
        const laid = drawLayers(ctx, layers, W, H, familyOf);
        const next = Object.fromEntries(layers.map((l, i) => [l.id, laid[i].box.h / H]));
        setHeights((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, [img, cssW, layers, fontsAt, loadedFonts, size]);
    const drag = useRef<{
        id: string;
        mode: "move" | "width";
        px: number;
        py: number;
        x: number;
        y: number;
        w: number;
    } | null>(null);
    const down = (e: React.PointerEvent, l: TextLayer, mode: "move" | "width") => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: l.id, mode, px: e.clientX, py: e.clientY, x: l.x, y: l.y, w: l.w };
        setSel(l.id);
    };
    const move = (e: React.PointerEvent) => {
        const d = drag.current;
        const el = stage.current;
        if (!d || !el)
            return;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - d.px) / r.width;
        const dy = (e.clientY - d.py) / r.height;
        if (d.mode === "width")
            return patch(d.id, { w: r3(clamp(d.w + dx, 0.08, 1)) });
        const centred = Math.abs(d.x + dx + d.w / 2 - 0.5) < 0.012;
        setGuide(centred);
        patch(d.id, { x: r3(centred ? 0.5 - d.w / 2 : clamp(d.x + dx, -0.3, 0.95)), y: r3(clamp(d.y + dy, -0.05, 0.98)) });
    };
    const up = () => {
        drag.current = null;
        setGuide(false);
    };
    const nudge = (e: React.KeyboardEvent, l: TextLayer) => {
        const step = e.shiftKey ? 0.02 : 0.005;
        const by: Record<string, Partial<TextLayer>> = { ArrowLeft: { x: r3(l.x - step) }, ArrowRight: { x: r3(l.x + step) }, ArrowUp: { y: r3(l.y - step) }, ArrowDown: { y: r3(l.y + step) } };
        if (!by[e.key])
            return;
        e.preventDefault();
        patch(l.id, by[e.key]);
    };
    const add = () => {
        const l = newLayer(`n${Date.now().toString(36)}${added.current++}`, type);
        setLayers((cur) => [...cur, l]);
        setSel(l.id);
        setDirty(true);
    };
    const remove = (id: string) => {
        setLayers((cur) => cur.filter((l) => l.id !== id));
        setSel((s) => (s === id ? null : s));
        setDirty(true);
    };
    const flatten = useCallback(async (lines: TextLayer[]): Promise<Blob> => {
        if (!img)
            throw new Error("The picture is still loading.");
        await document.fonts.ready;
        const gaps = missingLayerFonts(lines, loadedFonts);
        if (gaps.length)
            throw new Error(`The selected font did not load (${gaps.join(", ")}). Restore that file or choose a loaded font explicitly; no replacement is drawn.`);
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (!ctx)
            throw new Error("This browser can't draw the picture.");
        ctx.drawImage(img, 0, 0);
        drawLayers(ctx, lines.filter((l) => l.text.trim()), c.width, c.height, familyOf);
        return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("The picture could not be made."))), "image/png"));
    }, [img, loadedFonts]);
    const here = `/studio/${runId}/edit/${itemId}?aspect=${encodeURIComponent(aspect)}`;
    const save = async (as: "version" | "new" | "this", approve = false) => {
        setSaving(as === "new" ? "variant" : "save");
        try {
            const form = new FormData();
            form.set("file", await flatten(layers), "ad.png");
            form.set("layers", JSON.stringify(layers.filter((l) => l.text.trim())));
            form.set("item", itemId);
            form.set("aspect", aspect);
            form.set("from", String(version));
            if (approve)
                form.set("approve", "true");
            if (as === "new")
                form.set("variant", "new");
            if (as === "this" && variant)
                form.set("variant", variant.id);
            const res = await fetch(`/api/studio/${runId}/overlay`, { method: "POST", body: form });
            const data = (await res.json()) as {
                ok: boolean;
                error?: string;
                copyStatus?: "approved" | "draft" | "unverified";
                reviewMessage?: string;
            };
            if (!data.ok)
                return void toast.error(data.error ?? "It could not be saved.");
            setDirty(false);
            if (data.reviewMessage)
                toast.warning(data.reviewMessage);
            else if (data.copyStatus === "approved")
                toast.success("Saved with approved copy. Check the finished image's text and layout before use.");
            if (as === "new") {
                setKept((n) => n + 1);
                if (!data.copyStatus)
                    toast.success("Kept as a variant of this ad. Change the words and keep the next one.");
                router.refresh();
            }
            else if (as === "this") {
                if (!data.copyStatus)
                    toast.success("Variant saved.");
                router.push(here);
                router.refresh();
            }
            else {
                if (!data.copyStatus)
                    toast.success("Saved as the newest version.");
                router.push(returnHref ?? `/studio/${runId}`);
                router.refresh();
            }
        }
        catch (e) {
            toast.error((e as Error).message);
        }
        finally {
            setSaving(null);
        }
    };
    const download = async () => {
        setSaving("download");
        try {
            const url = URL.createObjectURL(await flatten(layers));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${itemId}_${aspect.replace(":", "x")}-draft.png`;
            a.click();
            toast.info("Draft downloaded. Review its copy and finished image before use.");
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
        catch (e) {
            toast.error((e as Error).message);
        }
        finally {
            setSaving(null);
        }
    };
    const current = layers.find((l) => l.id === sel) ?? null;
    const swatches = [...new Map([...palette, { hex: "#ffffff", name: "White" }, { hex: "#111111", name: "Black" }].map((c) => [c.hex.toLowerCase(), c])).values()];
    const empty = !layers.some((l) => l.text.trim());
    return (<div className="grid gap-8 px-6 py-6 max-sm:px-4 lg:grid-cols-[minmax(0,1fr)_24rem]" data-testid="text-editor">

      <div className="min-w-0">
        <div ref={stage} className="relative mx-auto w-full select-none overflow-hidden rounded-lg border bg-muted" style={{ aspectRatio: `${size.w} / ${size.h}`, maxWidth: `calc((100vh - 15rem) * ${size.w / size.h})` }} onPointerDown={() => setSel(null)} data-testid="editor-stage">
          <canvas ref={canvas} role="img" aria-label={`${productLabel}; item ${itemId}; argument ${argument}; ${aspect}; version ${variant?.id ?? version}; editable draft preview`} className="absolute inset-0 size-full" data-testid="editor-canvas"/>
          {!img && (<div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin"/>
            </div>)}
          {guide && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-sky-400"/>}
          {!peek &&
            layers.map((l) => (<div key={l.id} role="button" tabIndex={0} aria-label={`${ROLE_NAME[l.role] ?? "Line"}: ${l.text}. Drag to move, or use the arrow keys.`} className={cn("absolute cursor-move touch-none rounded-sm outline-offset-2 hover:outline hover:outline-1 hover:outline-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400", sel === l.id && "outline outline-2 outline-sky-400 hover:outline-2 hover:outline-sky-400")} style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${(heights[l.id] ?? l.size * 1.2) * 100}%` }} onPointerDown={(e) => down(e, l, "move")} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={(e) => nudge(e, l)} onFocus={() => setSel(l.id)} data-testid="editor-line-box" data-line={l.id}>
                {sel === l.id && <span className="absolute -right-1.5 top-1/2 h-6 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-sky-500 bg-white shadow" title="Pull to change where the line wraps" onPointerDown={(e) => down(e, l, "width")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>}
              </div>))}

          {peek && <img src={assetUrl(picture, 1200)} alt="The picture as it was made" className="absolute inset-0 size-full object-cover"/>}
          {reading && (<div className="absolute inset-0 grid place-items-center bg-background/70 text-sm" data-testid="editor-reading">
              <span className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 shadow-sm">
                <Loader2 className="size-4 animate-spin"/> Putting the lines where they were
              </span>
            </div>)}
        </div>
        <div className="mx-auto mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" style={{ maxWidth: `calc((100vh - 15rem) * ${size.w / size.h})` }}>
          <span>Drag a line to move it. Pull its right edge to change where it wraps.</span>
          {picture !== base && (<Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)} onKeyDown={(e) => e.key === " " && setPeek(true)} onKeyUp={() => setPeek(false)} data-testid="editor-peek">
              <Eye className="size-3.5"/>
              Hold to see the original
            </Button>)}
        </div>
        {sizes.length > 1 && (<div className="mx-auto mt-2 flex flex-wrap items-center gap-1.5 text-xs" style={{ maxWidth: `calc((100vh - 15rem) * ${size.w / size.h})` }}>
            <span className="text-muted-foreground">Size:</span>
            {sizes.map((a) => (<Link key={a} href={`/studio/${runId}/edit/${itemId}?aspect=${encodeURIComponent(a)}`} className={cn("rounded-full border px-2 py-0.5", a === aspect ? "border-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
                {a}
              </Link>))}
          </div>)}
        <VariantsPanel productLabel={productLabel} argument={argument} runId={runId} itemId={itemId} aspect={aspect} version={version} variants={variants} layers={layers} ready={!!img && fontsAt > 0 && !fontGaps.length && !reading} flatten={flatten} fit={fitTo} busy={busy} editing={variant?.id ?? null} size={size}/>
      </div>


      <div className="min-w-0 space-y-4 text-sm" inert={reading}>
        <div className="space-y-2 rounded-lg border bg-card p-3">
          {fontsAt > 0 && fontGaps.length > 0 && <p role="alert" className="text-xs text-red-700" data-testid="editor-font-load-gap">The selected font did not load: {fontGaps.join(", ")}. Restore its file or choose a loaded font explicitly. The original picture remains visible; replacement text is not drawn.</p>}
          {variant && (<p className="flex flex-wrap items-center gap-x-2 text-xs" data-testid="editor-variant">
              <span className="font-medium">Variant {variant.n} of this ad</span>
              <Link href={here} className="text-primary hover:underline">
                Back to the ad
              </Link>
            </p>)}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => save(variant ? "this" : "version")} disabled={!!saving || empty || !img || !fontsAt || !!fontGaps.length} title={variant ? "Keeps the change to this variant" : "Keeps this as the newest version of this ad"} data-testid="editor-save">
              {saving === "save" ? <Loader2 className="size-4 animate-spin"/> : <Save className="size-4"/>}
              {variant ? "Save variant draft" : "Save draft"}
            </Button>
            <Button variant="outline" onClick={() => save(variant ? "this" : "version", true)} disabled={!!saving || empty || !img || !fontsAt || !!fontGaps.length} title="Review every overlay, feed field and variant before approving this copy" data-testid="editor-review-save">
              Review copy & save
            </Button>
            <Button variant="outline" onClick={() => save("new")} disabled={!!saving || empty || !img || !fontsAt || !!fontGaps.length} title="Keeps this under the ad as another variant of it: the same picture with these words" data-testid="editor-save-copy">
              {saving === "variant" ? <Loader2 className="size-4 animate-spin"/> : <Copy className="size-4"/>}
              {variant ? "Keep as a new variant" : "Keep as a variant"}
            </Button>
            <Button variant="ghost" size="icon" onClick={download} disabled={!!saving || empty || !img || !fontsAt || !!fontGaps.length} title="Download a draft for review" aria-label="Download a draft for review" data-testid="editor-download">
              {saving === "download" ? <Loader2 className="size-4 animate-spin"/> : <Download className="size-4"/>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="editor-kept">
            {kept > 0 ? (<>
                {kept} variant{kept === 1 ? "" : "s"} kept from this picture, under the ad.
              </>) : dirty ? ("Not saved yet. Saving makes no new image: the words are set on the picture you have.") : ("Saving makes no new image: the words are set on the picture you have.")}
          </p>
        </div>
        <ul className="space-y-2" data-testid="editor-lines">
          {layers.map((l) => (<li key={l.id} className={cn("rounded-lg border bg-card p-3", sel === l.id && "border-foreground")} onClick={() => setSel(l.id)} data-testid="editor-line">
              <div className="mb-1.5 flex items-center gap-2">
                <select aria-label="What this line is" value={ROLES.some(([r]) => r === l.role) ? l.role : "point"} onChange={(e) => patch(l.id, { role: e.target.value })} className="h-7 rounded-md border bg-background px-1 text-xs text-muted-foreground">
                  {ROLES.map(([r, name]) => (<option key={r} value={r}>
                      {name}
                    </option>))}
                </select>
                <button type="button" aria-label="Remove this line" title="Remove this line" className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-700" onClick={(e) => (e.stopPropagation(), remove(l.id))}>
                  <Trash2 className="size-3.5"/>
                </button>
              </div>
              <Textarea value={l.text} onChange={(e) => patch(l.id, { text: e.target.value.slice(0, 400) })} onFocus={() => setSel(l.id)} rows={2} className="min-h-0 resize-none text-sm" aria-label={`${ROLE_NAME[l.role] ?? "Line"} text`} data-testid="editor-text"/>
              {sel === l.id && <LineControls l={l} choices={choices} swatches={swatches} patch={patch}/>}
            </li>))}
        </ul>
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={add} data-testid="editor-add">
          <Plus className="size-3"/> Add a line
        </button>

        <details className="rounded-lg border px-3 py-2" open={!families.length} data-testid="editor-fonts">
          <summary className="cursor-pointer text-sm font-medium">The brand&apos;s own fonts</summary>
          <div className="mt-3">
            <BrandFontsBox families={families} siteUrl={siteUrl} compact/>
          </div>
        </details>

      </div>
    </div>);
}
function LineControls({ l, choices, swatches, patch }: {
    l: TextLayer;
    choices: FontChoice[];
    swatches: {
        hex: string;
        name: string;
    }[];
    patch: (id: string, part: Partial<TextLayer>) => void;
}) {
    const choice = choices.find((c) => c.id === l.font);
    const weights = choice?.weights ?? [l.weight];
    const brand = choices.filter((c) => c.group === "brand");
    const standard = choices.filter((c) => c.group === "standard");
    return (<div className="mt-3 space-y-3" data-testid="editor-controls">
      <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Font</span>
          <select value={choice ? l.font : ""} onChange={(e) => {
            const next = choices.find((c) => c.id === e.target.value);
            if (next)
                patch(l.id, { font: next.id, weight: nearestWeight(next.weights, l.weight) });
        }} className="h-8 w-full rounded-md border bg-background px-2 text-sm" data-testid="editor-font">
            {!choice && <option value="">{l.font.replace(/^brand:/, "")} (not on file)</option>}
            {brand.length > 0 && (<optgroup label="Brand fonts">
                {brand.map((c) => (<option key={c.id} value={c.id}>
                    {c.label}
                  </option>))}
              </optgroup>)}
            <optgroup label="Standard fonts">
              {standard.map((c) => (<option key={c.id} value={c.id}>
                  {c.label}
                </option>))}
            </optgroup>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Weight</span>
          <select value={nearestWeight(weights, l.weight)} onChange={(e) => patch(l.id, { weight: Number(e.target.value) })} disabled={weights.length < 2} className="h-8 w-full rounded-md border bg-background px-2 text-sm" data-testid="editor-weight">
            {weights.map((w) => (<option key={w} value={w}>
                {weightName(w)}
              </option>))}
          </select>
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="flex justify-between text-xs text-muted-foreground">
          <span>Size</span>
          <span className="tabular-nums">{Math.round(l.size * 1000) / 10}</span>
        </span>
        <Slider value={[l.size * 1000]} min={15} max={220} step={1} onValueChange={([v]) => patch(l.id, { size: v / 1000 })} aria-label="Type size" data-testid="editor-size"/>
      </label>
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Colour</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {swatches.map((c) => (<button key={c.hex} type="button" title={c.name} aria-label={`Colour: ${c.name}`} aria-pressed={l.color.toLowerCase() === c.hex.toLowerCase()} onClick={() => patch(l.id, { color: c.hex })} className={cn("size-7 rounded-full border shadow-sm", l.color.toLowerCase() === c.hex.toLowerCase() && "ring-2 ring-sky-400 ring-offset-1")} style={{ background: c.hex }} data-testid="editor-swatch"/>))}
          <input type="color" value={l.color} onChange={(e) => patch(l.id, { color: e.target.value })} className="size-7 cursor-pointer rounded border bg-transparent p-0" aria-label="Another colour" title="Another colour"/>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {([
            ["left", AlignLeft, "Align left"],
            ["center", AlignCenter, "Centre"],
            ["right", AlignRight, "Align right"],
        ] as const).map(([a, Icon, name]) => (<button key={a} type="button" title={name} aria-label={name} aria-pressed={l.align === a} onClick={() => patch(l.id, { align: a })} className={cn("rounded-md border p-1.5 text-muted-foreground hover:text-foreground", l.align === a && "border-foreground text-foreground")}>
            <Icon className="size-4"/>
          </button>))}
        <button type="button" title="All capitals" aria-label="All capitals" aria-pressed={!!l.upper} onClick={() => patch(l.id, { upper: !l.upper })} className={cn("ml-2 rounded-md border p-1.5 text-muted-foreground hover:text-foreground", l.upper && "border-foreground text-foreground")} data-testid="editor-upper">
          <CaseUpper className="size-4"/>
        </button>
        <button type="button" title="A button behind the line" aria-label="A button behind the line" aria-pressed={!!l.plate} onClick={() => patch(l.id, { plate: l.plate ? undefined : { color: swatches.find((c) => c.hex.toLowerCase() !== l.color.toLowerCase())?.hex ?? "#111111", shape: "pill" } })} className={cn("rounded-md border p-1.5 text-muted-foreground hover:text-foreground", l.plate && "border-foreground text-foreground")} data-testid="editor-plate">
          <RectangleHorizontal className="size-4"/>
        </button>
        <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => patch(l.id, { x: r3(0.5 - l.w / 2), align: "center" })}>
          Centre on the picture
        </button>
      </div>
      {l.plate && (<div className="space-y-1" data-testid="editor-plate-controls">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Behind the line
            <select value={l.plate.shape} onChange={(e) => patch(l.id, { plate: { ...l.plate!, shape: e.target.value === "box" ? "box" : "pill" } })} className="h-6 rounded-md border bg-background px-1 text-xs" aria-label="Shape behind the line">
              <option value="pill">A button</option>
              <option value="box">A panel</option>
            </select>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {swatches.map((c) => (<button key={c.hex} type="button" title={c.name} aria-label={`Behind the line: ${c.name}`} aria-pressed={l.plate!.color.toLowerCase() === c.hex.toLowerCase()} onClick={() => patch(l.id, { plate: { ...l.plate!, color: c.hex } })} className={cn("size-6 rounded-md border shadow-sm", l.plate!.color.toLowerCase() === c.hex.toLowerCase() && "ring-2 ring-sky-400 ring-offset-1")} style={{ background: c.hex }}/>))}
            <input type="color" value={l.plate.color} onChange={(e) => patch(l.id, { plate: { ...l.plate!, color: e.target.value } })} className="size-6 cursor-pointer rounded border bg-transparent p-0" aria-label="Another colour behind the line" title="Another colour"/>
          </div>
        </div>)}
    </div>);
}
