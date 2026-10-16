import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import sharp from "sharp";
import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { fontFamilies, listBrandFonts } from "@/lib/brand-fonts";
import { loadBrandLook } from "@/lib/brand-look";
import { loadBrandBrain } from "@/lib/brands";
import { env } from "@/lib/env";
import { mediaLive } from "@/lib/media/providers";
import { STUDIO_ASPECTS } from "@/lib/library/taxonomy";
import { getRun } from "@/lib/studio/engine";
import { baseOf, brandType, defaultLayers, STOCK_TYPE, type TypeDefaults } from "@/lib/studio/overlay";
import { planFor } from "@/lib/studio/taste";
import { approvedCopyTexts } from "@/lib/studio/static-copy";
import { setStatusAction } from "../../../actions";
import { latestOutputs } from "../../../shared";
import { TextEditor } from "./text-editor";
export default async function EditWordsPage({ params, searchParams }: {
    params: Promise<{
        id: string;
        itemId: string;
    }>;
    searchParams: Promise<{
        aspect?: string;
        variant?: string;
        copy?: string;
        fonts?: string;
    }>;
}) {
    const { id, itemId } = await params;
    const { aspect: asked, variant: askedVariant, copy: askedCopy, fonts: askedFonts } = await searchParams;
    const row = await activeBrand();
    const run = getRun(id);
    if (!run || run.brand_id !== row.id)
        notFound();
    const item = run.items.find((i) => i.id === itemId);
    const newest = item ? latestOutputs(item.outputs) : [];
    const o = newest.find((x) => x.aspect === asked) ?? newest.find((x) => x.aspect === run.aspects[0]) ?? newest[0];
    if (!item || !o)
        notFound();
    const status = await setStatusAction(id);
    const abs = (rel: string) => path.join(env.DATA_DIR, "assets", rel);
    const rel = baseOf(run.kind, item, o);
    const base = rel && fs.existsSync(abs(rel)) ? rel : null;
    const meta = await sharp(abs(o.path)).metadata().catch(() => null);
    const [w, h] = meta?.width && meta.height ? [meta.width, meta.height] : (STUDIO_ASPECTS[o.aspect]?.size ?? "1024x1024").split("x").map(Number);
    const families = fontFamilies(listBrandFonts(row.id));
    const look = loadBrandLook(row.id);
    const savedLayers = item.variants?.find((v) => v.id === askedVariant && v.aspect === o.aspect)?.layers ?? o.layers;
    const savedStandard = !!savedLayers?.length && savedLayers.every((l) => l.font.startsWith("stock:"));
    let type: TypeDefaults;
    try {
        type = askedFonts === "standard" || savedStandard || planFor(run, item).text.brandLook === "none" ? STOCK_TYPE : brandType(look, families.map((f) => f.family));
    }
    catch (error) {
        const query = new URLSearchParams({ aspect: o.aspect, fonts: "standard", ...(askedVariant ? { variant: askedVariant } : {}), ...(askedCopy ? { copy: askedCopy } : {}) });
        return <div className="mx-auto max-w-3xl space-y-4"><PageHeader back={{ href: `/studio/${id}`, label: run.title }} title="Restore the brand font"/><p role="alert" data-testid="editor-brand-font-gap">{error instanceof Error ? error.message : "The brand font input could not be read."}</p><p className="text-sm text-muted-foreground">The original picture is preserved. Added brand text waits for its font input.</p><Link className="text-sm underline" href={`/studio/${id}/edit/${itemId}?${query.toString()}`}>Choose standard fonts explicitly for this edit</Link></div>;
    }
    const approved = askedCopy === "1" ? approvedCopyTexts(item.copy_draft) : [];
    const words = approved.length ? approved : run.kind === "photoshoot" ? [] : (item.plan?.text_elements ?? []);
    const placed = o.placed && (o.texts?.length ?? words.length) === words.length ? o.placed : [];
    const variants = (item.variants ?? []).filter((v) => v.aspect === o.aspect);
    const variant = variants.find((v) => v.id === askedVariant) ?? null;
    const layers = approved.length ? defaultLayers(approved, w / h, type) : variant?.layers ?? o.layers ?? defaultLayers(words, w / h, type, placed);
    const fresh = approved.length > 0 || (!variant && !o.layers);
    const read = !approved.length && fresh && !o.placed && !!base && base !== o.path && words.length > 0 && mediaLive();
    const returnHref = run.context.sprint ? `/studio/sprint/${run.context.sprint}` : `/studio/${id}`;
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader back={{ href: returnHref, label: run.context.sprint ? "Back to images and copy" : run.title, testId: "editor-back" }} title={words.length || o.layers ? "Edit the words" : "Add words"} subtitle={`${item.plan?.title ?? item.label}, ${o.aspect}. Change a line, its font or its place, and keep each one as a variant of this ad.`}/>
      <TextEditor key={`${item.id}:${o.aspect}:${variant?.id ?? "ad"}:${placed.length}`} runId={id} returnHref={returnHref} itemId={item.id} productLabel={loadBrandBrain(row.id).products.find(p => p.id === run.product_id)?.name ?? run.product_id} argument={item.plan?.argument || item.label} aspect={o.aspect} version={o.version} picture={o.path} base={base} size={{ w, h }} initial={layers} fresh={fresh} variants={variants} variant={variant ? { id: variant.id, n: variants.indexOf(variant) + 1 } : null} rows={fresh ? Object.fromEntries(placed.map((p) => [`t${p.i}`, p.rows])) : {}} read={read} families={families.map((f) => ({ family: f.family, weights: f.weights, faces: f.faces.map((x) => ({ file: x.file, weight: x.weight, style: x.style, from: x.from })) }))} type={type} palette={(look?.palette ?? []).map((c) => ({ hex: c.hex, name: c.name }))} siteUrl={look?.site_url ?? ""} busy={status.ok ? status.busy : false} sizes={newest.map((x) => x.aspect)}/>
    </div>);
}
