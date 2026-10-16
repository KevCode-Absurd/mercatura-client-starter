"use client";
import { useAdvanced } from "@/components/mode";
import { useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Competitor } from "@/lib/brain/competitors";
import type { CatalogProduct } from "@/lib/brain/products";
import type { Section } from "@/lib/brain/md";
import { cn } from "@/lib/utils";
import { addCompetitorAction, addLearningAction, addProductAction, draftCompetitorAction, ensureDocsAction, logChangeAction, lookAtImagesAction, lookIntoGuidelinesAction, pullSiteImagesAction, pullStoreAction, readCompetitorSiteAction, removeCompetitorAction, saveCompetitorAction, writeTokensAction } from "./brain-actions";
import { Inline, SectionCard } from "./doc-view";
type Result = {
    ok: true;
} | {
    ok: false;
    error: string;
};
function useAct() {
    const router = useRouter();
    const [busy, start] = useTransition();
    const act = (fn: () => Promise<Result>, done?: string | ((r: Result & {
        ok: true;
    }) => string)) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        if (done)
            toast.success(typeof done === "string" ? done : done(res));
        router.refresh();
    });
    return { busy, act };
}
const GROUPS: {
    title: string;
    keys: string[];
}[] = [
    { title: "Who they are", keys: ["What they sell", "Positioning", "Homepage headline", "Who they sell to"] },
    { title: "What they offer", keys: ["Price", "Offer", "Proof they use", "Ad angles they push"] },
    { title: "Where they stand", keys: ["What they do well", "Where they are weak", "What their customers complain about"] },
    { title: "Against them", keys: ["Gap we can own", "How we answer them"] },
];
export function CompetitorCard({ c, fields, live, siteRead }: {
    c: Competitor;
    fields: {
        key: string;
        hint: string;
    }[];
    live: boolean;
    siteRead: string;
}) {
    const { busy, act } = useAct();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Record<string, string>>({});
    useUnsavedWarning(editing && fields.some((f) => (draft[f.key] ?? "") !== (c.fields[f.key] ?? "")));
    const url = (c.fields["URL"] ?? "").split(/\s/)[0];
    const href = url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : "";
    const open = () => {
        setDraft(Object.fromEntries(fields.map((f) => [f.key, c.fields[f.key] ?? ""])));
        setEditing(true);
    };
    return (<article className="min-w-0 rounded-lg border bg-card p-4" data-testid={`competitor-${c.id.split("/").pop()}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{c.name}</h3>
          {href && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">{url} <ExternalLink className="size-3"/></a>}
          <div className="mt-1 text-xs text-muted-foreground" data-testid="competitor-filled">
            {c.filled} of {fields.length} fields filled{c.fields["Last checked"] ? ` · checked ${c.fields["Last checked"]}` : ""}
          </div>
        </div>
        {!editing && (<div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" className="h-auto min-h-8 shrink whitespace-normal" disabled={busy || !url} title={url ? "Reads their homepage and up to 4 more pages. Free." : "Give their website first"} onClick={() => act(() => readCompetitorSiteAction(c.id), "Their site was read")} data-testid="competitor-read">
              {siteRead ? "Read their site again" : "Read their site"}
            </Button>
            <Button variant="outline" size="sm" className="h-auto min-h-8 shrink whitespace-normal" disabled={busy || !live || !siteRead} title={!live ? "Not switched on for this account" : !siteRead ? "Read their site first" : "Fills the blank fields from the pages read."} onClick={() => act(() => draftCompetitorAction(c.id), "Blank fields were drafted")} data-testid="competitor-draft">
              Draft the blank fields
            </Button>
            <Button variant="ghost" size="sm" onClick={open} data-testid="competitor-edit"><Pencil className="size-3.5"/> Edit</Button>
            <Button variant="ghost" size="icon" disabled={busy} title="Remove this competitor" onClick={() => window.confirm(`Remove ${c.name} from the competitors?`) && act(() => removeCompetitorAction(c.id))} data-testid="competitor-remove"><Trash2 className="size-3.5"/></Button>
          </div>)}
      </div>
      {!editing ? (<div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {GROUPS.map((g) => (<div key={g.title}>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{g.title}</div>
              <dl className="space-y-1.5 text-sm">
                {g.keys.map((k) => (<div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className={cn(!c.fields[k] && "italic text-muted-foreground")}>{c.fields[k] ? <Inline text={c.fields[k]}/> : "Blank"}</dd>
                  </div>))}
              </dl>
            </div>))}
          {c.fields["Sources"] && <p className="text-xs text-muted-foreground md:col-span-2">Sources: <Inline text={c.fields["Sources"]}/></p>}
        </div>) : (<div className="mt-3 space-y-2">
          {fields.map((f) => (<div key={f.key} className="grid grid-cols-1 gap-1 sm:grid-cols-[13rem_1fr]">
              <label className="pt-2 text-sm">
                {f.key}
                <span className="block text-xs text-muted-foreground">{f.hint}</span>
              </label>
              <Textarea value={draft[f.key] ?? ""} rows={Math.min(6, Math.max(1, Math.ceil((draft[f.key] ?? "").length / 90)))} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} data-testid={`competitor-field-${f.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}/>
            </div>))}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" disabled={busy} data-testid="competitor-save" onClick={() => act(async () => { const r = await saveCompetitorAction(c.id, draft); if (r.ok)
            setEditing(false); return r; }, "Saved")}>Save</Button>
          </div>
        </div>)}
    </article>);
}
export function AddCompetitor() {
    const { busy, act } = useAct();
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    return (<div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3" data-testid="add-competitor">
      <div className="min-w-0 flex-1 basis-40">
        <label className="text-xs text-muted-foreground">Competitor</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" data-testid="competitor-name"/>
      </div>
      <div className="min-w-0 flex-1 basis-52">
        <label className="text-xs text-muted-foreground">Website</label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="theirsite.com" data-testid="competitor-url"/>
      </div>
      <Button disabled={busy || !name.trim()} data-testid="competitor-add" onClick={() => act(async () => { const r = await addCompetitorAction(name, url); if (r.ok) {
        setName("");
        setUrl("");
    } return r; }, "Added")}>
        <Plus className="size-4"/> Add competitor
      </Button>
    </div>);
}
const photo = (folder: string, f: string, w = 320) => `/api/brand-file/assets/${encodeURIComponent(folder)}/${encodeURIComponent(f)}${w ? `?w=${w}` : ""}`;
const whole = (folder: string, f: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.dataset.whole)
        return;
    el.dataset.whole = "1";
    el.src = photo(folder, f, 0);
};
export function ProductCard({ p, section }: {
    p: CatalogProduct;
    section: Section;
}) {
    const [open, setOpen] = useState(false);
    const href = p.url.split(/\s/)[0];
    return (<article className="rounded-lg border bg-card" data-testid="catalog-product">
      <div className="flex flex-wrap gap-5 p-5 max-md:gap-4 max-md:p-4">
        <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted max-md:size-24">

          {p.photos[0] ? <img src={photo(p.folder, p.photos[0])} onError={whole(p.folder, p.photos[0])} alt={p.name} className="size-full object-contain" loading="lazy"/> : <span className="px-1 text-center text-xs text-muted-foreground">No photo</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-semibold leading-snug">{p.name}</h3>
            {p.tags.map((t) => <Badge key={t} variant="secondary" className="h-5 text-xs font-normal">{t}</Badge>)}
          </div>
          <div className="mt-1 text-sm tabular-nums">{p.price ? <Inline text={p.price}/> : <span className="italic text-muted-foreground">No price</span>}</div>
          {p.benefit && <p className="mt-2 text-sm text-muted-foreground"><Inline text={p.benefit}/></p>}
          {p.angle && <p className="mt-1 text-sm"><span className="text-muted-foreground">Angle:</span> <Inline text={p.angle}/></p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{p.photos.length} photo{p.photos.length === 1 ? "" : "s"}</span>
            {/^https?:\/\//.test(href) && <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Product page <ExternalLink className="size-3"/></a>}
            <button type="button" className="font-semibold text-primary hover:underline" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="catalog-open">{open ? "Close" : "Details and edit"}</button>
          </div>
        </div>
      </div>
      {open && (<div className="border-t p-3">
          {p.photos.length > 1 && (<div className="mb-3 flex gap-2 overflow-x-auto">

              {p.photos.slice(0, 10).map((f) => <img key={f} src={photo(p.folder, f, 200)} onError={whole(p.folder, f)} alt={f} title={f} className="size-20 shrink-0 rounded border object-contain" loading="lazy"/>)}
            </div>)}
          <SectionCard doc="products" section={section} removable hideTitle className="border-0 p-0"/>
        </div>)}
    </article>);
}
const lookedLine = (r: {
    looked: number;
    moved: number;
}) => `${r.looked} picture${r.looked === 1 ? "" : "s"} looked at${r.moved ? `, ${r.moved} moved to the product ${r.moved === 1 ? "it shows" : "they show"}` : ""}.`;
function SitePictures({ url, pulled, waiting, canLook }: {
    url: string;
    pulled: number;
    waiting: number;
    canLook: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [step, setStep] = useState<"" | "pull" | "look">("");
    const [busy, start] = useTransition();
    const look = async () => {
        const r = await lookAtImagesAction();
        if (!r.ok)
            toast.error(r.error);
        else if (r.looked)
            toast.success(lookedLine(r));
    };
    const run = (first: "pull" | "look", work: () => Promise<void>) => {
        setStep(first);
        start(async () => {
            await work();
            setStep("");
            router.refresh();
        });
    };
    const pull = () => run("pull", async () => {
        const r = await pullSiteImagesAction(url);
        if (!r.ok)
            toast.error(r.error);
        else {
            const withProduct = r.saved - r.forBrand;
            toast.success(r.saved ? `${r.saved} picture${r.saved === 1 ? "" : "s"} saved from ${r.pages} page${r.pages === 1 ? "" : "s"}: ${withProduct} with a product, ${r.forBrand} for the whole brand.${r.cut ? ` ${r.cut} more were left: a product keeps 40 from the site and the brand 120.` : ""}` : `No new pictures on the ${r.pages} page${r.pages === 1 ? "" : "s"} read: what is there is already here.`);
            if (r.pagesFailed)
                toast.message(`${r.pagesFailed} page${r.pagesFailed === 1 ? "" : "s"} did not answer and ${r.pagesFailed === 1 ? "was" : "were"} skipped.`);
            if (r.waiting && r.canLook) {
                setStep("look");
                await look();
            }
        }
    });
    return (<div className="md:col-span-2 md:border-t md:pt-5" data-testid="site-pictures">
      <div className="text-sm font-medium">Pull the pictures from the site&apos;s pages</div>
      <p className="max-w-3xl text-xs text-muted-foreground">
        Reads each product&apos;s page and the main pages of the site, and saves the pictures on them: people, places, the product in a hand and in use. A picture on 1 product&apos;s page is kept with that product. The rest are kept for the whole brand. You pick from them when you make images. Reading the site is free.
        {advanced && " Looking at each picture, so the app knows what it shows, is about 0.2 cents a picture, once (measured on 112 photos)."}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={busy || !url.trim()} onClick={pull} data-testid="site-pictures-pull">
          {step === "pull" ? "Reading the site" : step === "look" ? "Looking at the pictures" : "Pull pictures"}
        </Button>
        <span className="text-xs text-muted-foreground" data-testid="site-pictures-count">
          {pulled ? `${pulled} picture${pulled === 1 ? "" : "s"} from the site so far.` : "None pulled yet."}
        </span>
      </div>
      {waiting > 0 && !busy && (canLook || pulled > 0) && (<p className="mt-2 text-xs text-amber-800" data-testid="site-pictures-waiting">
          {waiting} of the brand&apos;s pictures {waiting === 1 ? "has" : "have"} not been looked at yet, so {waiting === 1 ? "it" : "they"} cannot be picked.{" "}
          {canLook ? (<button type="button" className="font-medium underline" onClick={() => run("look", look)} data-testid="site-pictures-look">
              Look at {waiting === 1 ? "it" : "them"} now
            </button>) : ("Looking at pictures is switched off on this account.")}
        </p>)}
    </div>);
}
export function CatalogTools({ defaultUrl, sitePictures }: {
    defaultUrl: string;
    sitePictures: {
        pulled: number;
        waiting: number;
        canLook: boolean;
    };
}) {
    const { busy, act } = useAct();
    const [url, setUrl] = useState(defaultUrl);
    const [images, setImages] = useState(false);
    const [name, setName] = useState("");
    return (<div className="grid grid-cols-1 gap-6 rounded-lg border bg-card p-5 md:grid-cols-2" data-testid="catalog-tools">
      <div>
        <div className="text-sm font-medium">Pull from the store</div>
        <p className="text-xs text-muted-foreground">Reads the store&apos;s public product list. New products are added; price and stock are refreshed. What you wrote is kept. Free.</p>
        <div className="mt-2 flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourstore.com" data-testid="store-url"/>
          <Button disabled={busy || !url.trim()} data-testid="store-pull" onClick={() => act(() => pullStoreAction(url, images), (r) => { const x = r as unknown as {
        found: number;
        added: string[];
        refreshed: string[];
        images: {
            saved: number;
        };
    }; return `${x.found} found: ${x.added.length} added, ${x.refreshed.length} refreshed${x.images.saved ? `, ${x.images.saved} pictures saved` : ""}`; })}>
            {busy ? "Reading" : "Pull"}
          </Button>
        </div>
        <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={images} onChange={(e) => setImages(e.target.checked)} data-testid="store-images"/> Also download the pictures of products that have none (up to 10 each)
        </label>
      </div>
      <div>
        <div className="text-sm font-medium">Add a product by hand</div>
        <p className="text-xs text-muted-foreground">For a product the store list does not show, or a store that has no list.</p>
        <div className="mt-2 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" data-testid="product-name"/>
          <Button variant="outline" disabled={busy || !name.trim()} data-testid="product-add" onClick={() => act(async () => { const r = await addProductAction(name); if (r.ok)
        setName(""); return r; }, "Added")}>Add</Button>
        </div>
      </div>
      <SitePictures url={url} {...sitePictures}/>
    </div>);
}
export function AddChange({ types }: {
    types: readonly string[];
}) {
    const { busy, act } = useAct();
    const [type, setType] = useState(types[0]);
    const [text, setText] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    return (<div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3" data-testid="add-change">
      <div>
        <label className="block text-xs text-muted-foreground">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full max-w-40" data-testid="change-date"/>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Kind</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" data-testid="change-type">
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="min-w-0 flex-1 basis-60">
        <label className="block text-xs text-muted-foreground">What changed</label>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="A launch, a promotion, a product out of stock, a new price" data-testid="change-text"/>
      </div>
      <Button disabled={busy || !text.trim()} data-testid="change-add" onClick={() => act(async () => { const r = await logChangeAction(type, text, date); if (r.ok)
        setText(""); return r; }, "Logged")}><Plus className="size-4"/> Log it</Button>
    </div>);
}
const KINDS = [
    { id: "works", label: "It worked" },
    { id: "avoid", label: "Avoid this" },
    { id: "questions", label: "Open question" },
    { id: "ideas", label: "Idea to try" },
    { id: "productNotes", label: "Product note" },
];
export function AddLearning() {
    const { busy, act } = useAct();
    const [kind, setKind] = useState("works");
    const [text, setText] = useState("");
    return (<div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-5" data-testid="add-learning">
      <div>
        <label htmlFor="learning-kind" className="mb-1 block text-xs font-medium text-muted-foreground">We learned</label>
        <select id="learning-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" data-testid="learning-kind">
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </div>
      <div className="min-w-0 flex-1 basis-60">
        <label htmlFor="learning-text" className="mb-1 block text-xs font-medium text-muted-foreground">In 1 line</label>
        <Input id="learning-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="An angle that worked, a format that fell flat, something a customer said" data-testid="learning-text"/>
      </div>
      <Button variant="outline" disabled={busy || !text.trim()} data-testid="learning-add" onClick={() => act(async () => { const r = await addLearningAction(kind, text); if (r.ok)
        setText(""); return r; }, "Added to the brain")}><Plus className="size-4"/> Add</Button>
    </div>);
}
export function EnsureDocs({ missing }: {
    missing: string[];
}) {
    const { busy, act } = useAct();
    if (!missing.length)
        return null;
    return (<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="ensure-docs">
      <span>Not written yet: {missing.join(", ")}. They are shown empty.</span>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => ensureDocsAction(), "The documents were made")} data-testid="ensure-docs-go">Make them</Button>
    </div>);
}
export function LookTools({ hasLook }: {
    hasLook: boolean;
}) {
    const { busy, act } = useAct();
    const advanced = useAdvanced();
    return (<>
      <Button size="sm" variant="outline" className="h-auto min-h-8 shrink whitespace-normal" disabled={busy || !hasLook} title={hasLook ? "Puts the colours and typefaces last read from the website into the rows below. Rows you wrote are kept." : "Read the website first"} onClick={() => act(() => lookIntoGuidelinesAction(), (r) => { const x = r as unknown as {
        colors: number;
        fonts: number;
    }; return `${x.colors} colours and ${x.fonts} typefaces brought in`; })} data-testid="look-into-guidelines">
        Fill the rows below from the last read
      </Button>
      {advanced && <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => writeTokensAction(), "brand-tokens.md written to the brand's folder")} data-testid="write-tokens">Write the tokens file</Button>}
    </>);
}
