"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Repeat2, X } from "lucide-react";
import { toast } from "sonner";
import { useAdvanced } from "@/components/mode";
import { OutputOptionsPicker, defaultOutputOptions, picturesOf, type OutputOptions } from "@/components/output-options";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryKind } from "@/db/schema";
import { ALL_BUCKETS, BUCKET_OTHER } from "@/lib/library/buckets";
import { STUDIO_ASPECTS } from "@/lib/library/taxonomy";
import type { LookType } from "@/lib/format-media";
import { cn } from "@/lib/utils";
import { createSetAction, searchRefsAction, suggestAction, type RefCard } from "../actions";
import { PRODUCT } from "@/lib/taste/decisions";
import { PRODUCT_BY_STAGE } from "@/lib/taste/defaults";
import { MAX_LOOK_POOL, MAX_PRODUCT_PHOTOS, MAX_WORLD_POOL } from "@/lib/studio/views";
import { STAGES, type Stage, type Surface, type Taste } from "@/lib/taste/types";
import { FormatLookPicker } from "../format-look-picker";
import { StudioTaste } from "../look-controls";
import { lookUrl, mediaUrl, productImageUrl, thumbUrl } from "../shared";
import { MAX_IMAGES, TemplateSlots, type Extra, type Slot } from "./template-slots";
export interface PhotoOption {
    name: string;
    label: string;
    shows: boolean;
    locked: boolean;
    why: string;
    note: string;
}
export interface BrandImageOption {
    rel: string;
    kind: "designed" | "photo";
    productId: string;
    note: string;
}
export interface ProductOption {
    id: string;
    name: string;
    format: string;
    folder: string;
    files: string[];
    chosen: string[];
    photos: PhotoOption[];
    brandPicked: string[];
}
export interface TypeOption {
    id: string;
    label: string;
    group: string;
    hint: string;
}
interface Props {
    kind: LibraryKind;
    info: {
        label: string;
        noun: string;
        one: string;
        defaultAspects: string[];
        aspects: string[];
    };
    brandName: string;
    products: ProductOption[];
    brandImages?: BrandImageOption[];
    unreadImages?: number;
    initialProduct: string | null;
    types: TypeOption[];
    groups: {
        id: string;
        label: string;
    }[];
    verticals: string[];
    live: boolean;
    look: {
        fonts: string[];
        colors: string[];
        specimen: string;
    } | null;
    imagesLeft: number;
    personas: {
        id: string;
        name: string;
        summary: string;
        image?: string | null;
    }[];
    initialBuyers?: string[];
    offers?: {
        id: string;
        name: string;
        price: string;
        designed: boolean;
    }[];
    initialOffer?: string | null;
    checks: {
        claims: boolean;
        ad_review: boolean;
    };
    initialFormatLook?: string | null;
    initialNotes?: string;
    initialAspects?: string[];
    initialTextOnImage?: boolean;
}
interface Pick extends RefCard {
    direction: string;
}
const ALL = "__all";
const EACH = "__each__";
const STAGE_LABEL: Record<Stage, string> = { unaware: "Unaware", problem_aware: "Problem aware", solution_aware: "Solution aware", product_aware: "Product aware", most_aware: "Most aware" };
export function NewSet({ kind, info, brandName, products, brandImages = [], unreadImages = 0, initialProduct, types, groups, verticals, live, look, imagesLeft, personas, initialBuyers = [], offers = [], initialOffer = null, checks, initialFormatLook = null, initialNotes = "", initialAspects, initialTextOnImage }: Props) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [productId, setProductId] = useState<string | null>(initialProduct);
    const product = products.find((p) => p.id === productId) ?? null;
    const [photos, setPhotos] = useState<string[]>(product?.chosen ?? []);
    const [brandPicks, setBrandPicks] = useState<string[]>(product?.brandPicked ?? []);
    const [allBrandImages, setAllBrandImages] = useState(false);
    const [picks, setPicks] = useState<Pick[]>([]);
    const [profile, setProfile] = useState<{
        vertical: string;
        format: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [aspects, setAspects] = useState<string[]>(initialAspects?.filter(a => info.aspects.includes(a)).length ? initialAspects.filter(a => info.aspects.includes(a)) : info.defaultAspects);
    const [notes, setNotes] = useState(initialNotes);
    const [buyers, setBuyers] = useState<string[]>(initialBuyers);
    const [offer, setOffer] = useState<string | null>(initialOffer);
    const [claimChecks, setClaimChecks] = useState(checks.claims);
    const [adReview, setAdReview] = useState(checks.ad_review);
    const [auto, setAuto] = useState(true);
    const [taste, setTaste] = useState<Taste>(kind === "photoshoot" ? { look: "reference" } : {});
    const [stage, setStage] = useState<Stage | null>(null);
    const [formatLook, setFormatLook] = useState<string | null>(initialFormatLook ?? null);
    const [lookType, setLookType] = useState<LookType>("brand");
    const surface: Surface = kind === "pdp" ? "pdp" : kind === "photoshoot" ? "photoshoot" : "image_ad";
    const [output, setOutput] = useState<OutputOptions>({ ...defaultOutputOptions(kind !== "photoshoot"), ...(initialTextOnImage === undefined ? {} : { textOnImage: initialTextOnImage }) });
    const template = kind === "pdp";
    const [slots, setSlots] = useState<Slot[]>([]);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [picker, setPicker] = useState<{
        replace: number | null;
        type: string;
        slot?: string;
    } | null>(null);
    const [creating, start] = useTransition();
    const asked = useRef(0);
    const suggest = useCallback(async (id: string) => {
        setLoading(true);
        const mine = ++asked.current;
        const res = await suggestAction(kind, id);
        if (mine !== asked.current)
            return;
        setLoading(false);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        if (res.slots) {
            setSlots(res.slots.map((s) => ({ bucket: s.bucket, on: true, ref: s.ref, direction: "" })));
            setExtras([]);
        }
        else
            setPicks(res.picks.map((p) => ({ ...p, direction: p.direction ?? "" })));
        setProfile(res.profile);
    }, [kind]);
    useEffect(() => {
        if (initialProduct)
            void suggest(initialProduct);
    }, [initialProduct, suggest]);
    const choose = (p: ProductOption) => {
        if (p.id === productId)
            return;
        setProductId(p.id);
        setPhotos(p.chosen);
        setBrandPicks(p.brandPicked);
        void suggest(p.id);
    };
    const togglePhoto = (f: string) => setPhotos((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : cur.length >= MAX_PRODUCT_PHOTOS ? cur : [...cur, f]));
    const kindOf = (rel: string) => brandImages.find((b) => b.rel === rel)?.kind;
    const toggleBrand = (rel: string) => setBrandPicks((cur) => (cur.includes(rel) ? cur.filter((x) => x !== rel) : cur.filter((x) => kindOf(x) === kindOf(rel)).length >= (kindOf(rel) === "designed" ? MAX_LOOK_POOL : MAX_WORLD_POOL) ? cur : [...cur, rel]));
    const offered = (product?.photos ?? []).filter((p) => !p.locked);
    const ofProduct = (b: BrandImageOption) => b.productId === productId || (!!product?.folder && b.rel.startsWith(`${product.folder}/`));
    const brandShown = kind !== "photoshoot" ? [...brandImages].sort((a, b) => Number(ofProduct(b)) - Number(ofProduct(a))) : [];
    const move = (i: number, by: number) => setPicks((cur) => {
        const next = [...cur];
        const j = i + by;
        if (j < 0 || j >= next.length)
            return cur;
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });
    const onPicked = (ref: RefCard) => {
        if (template) {
            const slot = picker?.slot;
            if (slot)
                setSlots((cur) => cur.map((s) => (s.bucket === slot ? { ...s, ref } : s)));
            else
                setExtras((cur) => (cur.some((x) => x.id === ref.id) ? cur : [...cur, { ...ref, direction: "" }]));
            setPicker(null);
            return;
        }
        setPicks((cur) => {
            if (cur.some((p) => p.id === ref.id))
                return cur;
            if (picker?.replace != null)
                return cur.map((p, i) => (i === picker.replace ? { ...ref, direction: p.direction } : p));
            return cur.length >= 12 ? cur : [...cur, { ...ref, direction: "" }];
        });
        setPicker(null);
    };
    const count = template ? slots.filter((s) => s.on).length + extras.length : picks.length;
    const hasReference = template ? slots.some((s) => s.on && !!s.ref) || extras.length > 0 : picks.length > 0;
    const sentTaste: Taste = taste.look === "reference" && !hasReference ? { ...taste, look: undefined } : taste;
    const wordsOn = kind !== "photoshoot" && taste.words !== "none";
    const images = kind === "photoshoot" ? count * aspects.length : picturesOf(count, aspects.length, { ...output, textOnImage: wordsOn });
    const taken = template ? [...slots.flatMap((s) => (s.on && s.ref ? [s.ref.id] : [])), ...extras.map((x) => x.id)] : picks.map((p) => p.id);
    useUnsavedWarning(notes.trim().length > 0 || [...picks, ...slots, ...extras].some((x) => x.direction.trim().length > 0));
    const create = () => start(async () => {
        if (!productId)
            return;
        const chosen = template
            ? [...slots.filter((s) => s.on).map((s) => ({ refId: s.ref?.id ?? null, bucket: s.bucket, direction: s.direction, reason: s.ref?.reason })), ...extras.map((x) => ({ refId: x.id, bucket: x.bucket === BUCKET_OTHER ? undefined : x.bucket, direction: x.direction, reason: x.reason }))]
            : picks.map((p) => ({ refId: p.id, direction: p.direction, reason: p.reason, ...(kind === "photoshoot" ? { label: p.label } : {}) }));
        const res = await createSetAction({ kind, productId, picks: chosen, aspects, notes, productImages: photos, ...(brandShown.length ? { brandImages: brandPicks } : {}), buyers, ...(offer ? { offer } : {}), claimChecks, adReview, auto, taste: sentTaste, ...(kind === "ad" && stage ? { stage } : {}), ...(kind === "ad" && formatLook ? { formatLook, lookType } : {}), ...(kind === "photoshoot" ? {} : { textOnImage: wordsOn, feedCopy: output.feedCopy, baseImage: output.baseImage }) });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        router.push(`/studio/${res.id}`);
    });
    return (<div className="space-y-8 p-6" data-testid="new-set">

      <section>
        <StepTitle n={1} title="Which product?" note={`${brandName}'s products, from the brand brain.`}/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (<button key={p.id} type="button" onClick={() => choose(p)} data-testid={`product-${p.id}`} aria-pressed={p.id === productId} className={cn("flex gap-3 rounded-lg border p-3 text-left transition hover:border-primary/60", p.id === productId && "border-primary bg-primary/5 ring-1 ring-primary")}>
              {p.chosen[0] ? (<img src={productImageUrl(p.folder, p.chosen[0], 160)} alt="" className="size-16 shrink-0 rounded border bg-white object-contain"/>) : (<div className="flex size-16 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">No photo</div>)}
              <div className="min-w-0">
                <div className="text-sm font-medium leading-tight">{p.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.format}</div>
                {!p.chosen[0] && <div className="mt-1 text-xs text-amber-700">No product photo yet. Images can&apos;t be made without one: <Link href="/brand#product-photos" className="underline" onClick={(e) => e.stopPropagation()}>upload one</Link>.</div>}
              </div>
            </button>))}
        </div>

        {product && offered.length > 0 && (<div className="mt-4" data-testid="product-photos">
            <div className="text-sm font-medium">
              {photos.length} of {offered.length} photo{offered.length === 1 ? "" : "s"} of this product {photos.length === 1 ? "goes" : "go"} with every picture
            </div>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              They tell the image model what the product is: its shape, its colours and its label. How it is posed is left to each picture, so the pictures do not all look alike. Press a photo to add it or take it out (up to {MAX_PRODUCT_PHOTOS}). The app picked 1 for each view it found.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {offered.map((p) => {
                const on = photos.includes(p.name);
                return (<button key={p.name} type="button" onClick={() => togglePhoto(p.name)} title={[p.note, p.why].filter(Boolean).join(" ") || p.name} aria-pressed={on} data-testid="product-photo" className={cn("relative w-24 rounded border bg-white p-0.5 text-left", on ? "border-primary ring-1 ring-primary" : "opacity-60 hover:opacity-100")}>

                    <img src={productImageUrl(product.folder, p.name, 160)} alt={p.label} className="h-20 w-full object-contain" loading="lazy"/>
                    <span className="block px-0.5 pt-0.5 text-[10px] leading-tight text-muted-foreground">{p.shows ? p.label : p.why || p.label}</span>
                    {on && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">Sent</span>}
                  </button>);
            })}
            </div>
            {product.photos.length > offered.length && (<p className="mt-1.5 text-xs text-muted-foreground">
                {product.photos.length - offered.length} more image{product.photos.length - offered.length === 1 ? "" : "s"} in this product&apos;s folder {product.photos.length - offered.length === 1 ? "is" : "are"} not offered as the product: {product.photos.length - offered.length === 1 ? "it has" : "they have"} words designed onto {product.photos.length - offered.length === 1 ? "it" : "them"}, or a child or a licensed character in {product.photos.length - offered.length === 1 ? "it" : "them"}.
              </p>)}
          </div>)}

        {product && brandShown.length > 0 && (<div className="mt-5" data-testid="brand-images">
            <div className="text-sm font-medium">
              {brandPicks.length} of {brandShown.length} of {brandName}&apos;s own images {brandPicks.length === 1 ? "is" : "are"} shared out across the pictures
            </div>
            <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
              Each picture is sent 1 or 2 of them, a different one each time, so the set varies and still looks like {brandName}. A designed image shows how the brand dresses a picture. A photograph shows its people, places and light. Neither is sent as the product. Up to {MAX_LOOK_POOL} designed images and {MAX_WORLD_POOL} photographs.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(allBrandImages ? brandShown : brandShown.filter((b) => brandPicks.includes(b.rel))).map((b) => {
                const on = brandPicks.includes(b.rel);
                const [folder, ...rest] = b.rel.split("/");
                return (<button key={b.rel} type="button" onClick={() => toggleBrand(b.rel)} title={b.note || b.rel} aria-pressed={on} data-testid="brand-image" className={cn("relative w-24 rounded border bg-white p-0.5 text-left", on ? "border-primary ring-1 ring-primary" : "opacity-60 hover:opacity-100")}>

                    <img src={productImageUrl(folder, rest.join("/"), 160)} alt={b.note} className="h-20 w-full object-cover" loading="lazy"/>
                    <span className="block px-0.5 pt-0.5 text-[10px] leading-tight text-muted-foreground">{b.kind === "designed" ? "Designed image" : "Photograph"}</span>
                    {on && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">Sent</span>}
                  </button>);
            })}
              {!allBrandImages && !brandPicks.length && <span className="text-xs text-muted-foreground">None is sent.</span>}
            </div>
            <button type="button" className="mt-1.5 text-xs font-medium text-primary hover:underline" onClick={() => setAllBrandImages((v) => !v)} data-testid="brand-images-all">
              {allBrandImages ? "Show only the ones sent" : `Choose from all ${brandShown.length}`}
            </button>
          </div>)}
        {product && live && kind !== "photoshoot" && unreadImages > 0 && (<p className="mt-3 max-w-3xl text-xs text-muted-foreground" data-testid="unread-images">
            {unreadImages} more of {brandName}&apos;s pictures {unreadImages === 1 ? "has" : "have"} not been looked at yet, so the app does not know what {unreadImages === 1 ? "it shows" : "they show"}. {unreadImages === 1 ? "It is" : "They are"} looked at when this set is made, or now on the <Link href="/brand?tab=products" className="underline">Brand brain</Link>.
          </p>)}
      </section>


      {product && (<section>
          <StepTitle n={2} title={kind === "photoshoot" ? "Which looks?" : kind === "pdp" ? "The product page template: 12 images" : "Which ad layouts?"} note={profile && template ? `Each frame is shown beside a real example picked for ${profile.vertical ? profile.vertical.toLowerCase() : "this brand"}${profile.format ? `, a ${profile.format}` : ""}. Swap the example, or switch a frame off.` : profile ? `Suggested for ${profile.vertical ? profile.vertical.toLowerCase() : "this brand"}${profile.format ? `, a ${profile.format}` : ""}. The order here is the order of the set.` : "Finding references that suit this product..."}/>
          {loading ? (<p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin"/> Matching the library to this product
            </p>) : template ? (<>
              <TemplateSlots slots={slots} extras={extras} onSlots={setSlots} onExtras={setExtras} onSwap={(bucket) => setPicker({ replace: null, type: ALL, slot: bucket })} onAdd={() => setPicker({ replace: null, type: ALL })}/>
              <button type="button" className="mt-2 text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => productId && void suggest(productId)}>
                Reset to the suggested examples
              </button>
            </>) : (<>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="picks">
                {picks.map((p, i) => (<li key={p.id} className="flex gap-3 rounded-lg border p-3" data-testid="pick">
                    <a href={mediaUrl(p.id)} target="_blank" rel="noreferrer" className="shrink-0" title="Open the reference at full size">

                      <img src={thumbUrl(p.id)} alt={`${p.label} reference`} className="h-32 w-28 rounded border bg-muted object-cover" loading="lazy"/>
                    </a>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-1">
                        <div className="text-sm font-medium leading-tight">
                          {i + 1}. {p.label}
                        </div>
                        <div className="flex shrink-0 items-center">
                          <IconButton label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}>
                            <ArrowUp className="size-3.5"/>
                          </IconButton>
                          <IconButton label="Move later" onClick={() => move(i, 1)} disabled={i === picks.length - 1}>
                            <ArrowDown className="size-3.5"/>
                          </IconButton>
                          {advanced && (<IconButton label="Swap for another reference of this type" onClick={() => setPicker({ replace: i, type: p.type })} testid="pick-swap">
                            <Repeat2 className="size-3.5"/>
                          </IconButton>)}
                          <IconButton label="Remove" onClick={() => setPicks((cur) => cur.filter((x) => x.id !== p.id))} testid="pick-remove">
                            <X className="size-3.5"/>
                          </IconButton>
                        </div>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={p.why}>
                        {p.brand ? `${p.brand}. ` : ""}
                        {p.reason}
                      </p>
                      {advanced && (<Textarea className="mt-1.5 min-h-12 text-xs md:text-xs" placeholder="Your direction for this one (optional)" value={p.direction} onChange={(e) => setPicks((cur) => cur.map((x) => (x.id === p.id ? { ...x, direction: e.target.value.slice(0, 600) } : x)))} data-testid="pick-direction"/>)}
                    </div>
                  </li>))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => setPicker({ replace: null, type: ALL })} disabled={picks.length >= 12} data-testid="pick-add">
                  <Plus className="size-4"/>
                  Add from the library
                </Button>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => productId && void suggest(productId)}>
                  Reset to the suggested set
                </button>
                <span className="text-xs text-muted-foreground">{picks.length} of 12</span>
              </div>
            </>)}
        </section>)}


      {product && count > 0 && !loading && (<section className="max-w-3xl">
          <StepTitle n={3} title="Sizes and notes" note="Each size is composed for its shape, not cropped from another."/>
          <div className="mt-3 flex flex-wrap gap-2">
            {info.aspects.map((a) => {
                const on = aspects.includes(a);
                return (<button key={a} type="button" aria-pressed={on} data-testid={`aspect-${a}`} onClick={() => setAspects((cur) => (on ? cur.filter((x) => x !== a) : [...cur, a]))} className={cn("rounded-md border px-3 py-1.5 text-left text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                  <span className="flex items-center gap-1.5 font-medium">
                    {on && <Check className="size-3.5 text-primary"/>}
                    {STUDIO_ASPECTS[a]?.label ?? a}
                  </span>
                  <span className="block text-xs text-muted-foreground">{STUDIO_ASPECTS[a]?.use}</span>
                </button>);
            })}
          </div>
          <Textarea className="mt-3" placeholder="Notes for the whole set (optional): a campaign, a season, something to stress or avoid" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 2000))} data-testid="set-notes"/>

          {kind !== "photoshoot" && personas.length > 0 && (<div className="mt-4" data-testid="set-buyers">
              <div className="text-sm font-medium">Who are these for?</div>
              <p className="text-xs text-muted-foreground">Optional. Pick 1 or more personas and every {info.one} is written for them. Pick none and the writer chooses a buyer for each.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {personas.map((p) => {
                    const on = buyers.includes(p.id);
                    return (<button key={p.id} type="button" aria-pressed={on} title={p.summary} data-testid={`buyer-${p.id}`} onClick={() => setBuyers((cur) => (on ? cur.filter((x) => x !== p.id) : cur.length < 6 ? [...cur, p.id] : cur))} className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                      {p.image ? (<img src={`/api/assets/${p.image}?w=64`} alt="" className="size-7 rounded-full object-cover"/>) : (<span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">{p.name.replace(/^The /, "").slice(0, 1)}</span>)}
                      {p.name}
                      {on && <Check className="size-3.5 text-primary"/>}
                    </button>);
                })}
              </div>
            </div>)}

          {kind === "ad" && offers.length > 0 && (<div className="mt-4" data-testid="set-offer">
              <div className="text-sm font-medium">Which offer?</div>
              <p className="text-xs text-muted-foreground">Optional. Pick one and every ad states it, exactly as the brand gives it. Pick none and the writer uses the brand&apos;s price points as it sees fit.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {offers.map((o) => {
                    const on = offer === o.id;
                    return (<button key={o.id} type="button" aria-pressed={on} title={o.name} data-testid={`offer-${o.id}`} onClick={() => setOffer(on ? null : o.id)} className={cn("flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                      {o.designed && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Offer</span>}
                      <span className="truncate">{o.name.length > 60 ? `${o.name.slice(0, 58)}…` : o.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{o.price}</span>
                      {on && <Check className="size-3.5 shrink-0 text-primary"/>}
                    </button>);
                })}
              </div>
            </div>)}

          {kind === "ad" && (<div className="mt-4" data-testid="set-stage-row">
              <div className="text-sm font-medium">Where is the buyer?</div>
              <Select value={stage ?? EACH} onValueChange={(v) => setStage(v === EACH ? null : (v as Stage))}>
                <SelectTrigger className="mt-1.5 w-full sm:w-72" aria-label="Where is the buyer" data-testid="set-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EACH}>Each ad its own stage</SelectItem>
                  {STAGES.map((s) => (<SelectItem key={s} value={s} data-testid={`set-stage-${s}`}>
                      {STAGE_LABEL[s]}
                    </SelectItem>))}
                </SelectContent>
              </Select>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground" data-testid="set-stage-hint">
                {stage ? `Every ad is written for a ${STAGE_LABEL[stage].toLowerCase()} buyer. The product starts at "${PRODUCT[PRODUCT_BY_STAGE[stage]].label}".` : "The app picks a stage for each ad, and the stage decides how the product is shown. Unaware and problem aware: not shown. Solution aware: in the scene. Product aware: clearly shown. Most aware: the hero. You can change this below."}
              </p>
            </div>)}

          {kind === "ad" && <FormatLookPicker className="mt-4" value={formatLook} onChange={setFormatLook} lookType={lookType} onLookType={setLookType}/>}

          <StudioTaste className="mt-4" surface={surface} stage={stage} hasReference={hasReference} value={sentTaste} onChange={setTaste} follows={kind === "ad" && !stage ? { product: "Each ad decides from its own buyer's stage. Pick a stop to show the product the same way in every ad." } : undefined} feedCopy={kind === "ad" && output.feedCopy}/>

          {kind !== "photoshoot" && <OutputOptionsPicker className="mt-4" value={{ ...output, textOnImage: wordsOn }} onChange={setOutput} show={{ text: false, copy: kind === "ad", base: true, product: false }}/>}

          <div className="mt-4 space-y-2" data-testid="set-checks">
              <label className="flex items-start gap-3 text-sm" data-testid="set-auto-row">
                <Switch checked={auto} onCheckedChange={setAuto} data-testid="set-auto" className="mt-0.5"/>
                <span>
                  <span className="font-medium">{auto ? "Make the images automatically" : "Approve the plan first"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {auto ? "On: the plan is written and the images are made straight after it. Turn off to read and edit the plan before any image is made." : "Off: the plan waits for you. No image is made until you approve it."}
                  </span>
                </span>
              </label>
              {kind !== "photoshoot" && (<label className="flex items-start gap-3 text-sm" data-testid="set-claim-checks-row">
                <Switch checked={claimChecks} onCheckedChange={setClaimChecks} data-testid="set-claim-checks" className="mt-0.5"/>
                <span>
                  <span className="font-medium">Check claims</span>
                  <span className="block text-xs text-muted-foreground">
                    {claimChecks ? `On: every word is read against the brand's approved claims, and a failure is written again. Slower${advanced ? ", and about half as much again" : ""}.` : "Off: nothing is held back for its claims. You can still check the claims of a finished plan with 1 press."}
                  </span>
                </span>
              </label>)}
              {kind === "ad" && (<label className="flex items-start gap-3 text-sm" data-testid="set-ad-review-row">
                  <Switch checked={adReview} onCheckedChange={setAdReview} data-testid="set-ad-review" className="mt-0.5"/>
                  <span>
                    <span className="font-medium">Ad review</span>
                    <span className="block text-xs text-muted-foreground">{adReview ? "On: a second model reads each ad as a stranger would and lists what it would fix. Advice only." : "Off. You can ask for the review on the finished plan with 1 press."}</span>
                  </span>
                </label>)}
          </div>

          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <span className="font-medium">{count}</span> {count === 1 ? info.one : info.noun} × <span className="font-medium">{aspects.length}</span> size{aspects.length === 1 ? "" : "s"}{images !== count * aspects.length ? ", each also without its words," : ""} = <span className="font-medium">{images}</span> image{images === 1 ? "" : "s"}
              </div>
              {look ? advanced && (<div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="look-summary">
                  {look.specimen && (<img src={lookUrl(look.specimen, 80)} alt="" className="size-8 rounded border object-cover object-top"/>)}
                  Brand type: {[...new Set(look.fonts)].slice(0, 2).join(", ")}
                  <span className="flex gap-0.5">
                    {look.colors.slice(0, 6).map((c) => (<span key={c} className="size-3.5 rounded-full border" style={{ background: c }} title={c}/>))}
                  </span>
                </div>) : (<Link href="/brand#brand-look" className="text-xs text-amber-700 underline">
                  Brand fonts and colours not scanned yet
                </Link>)}
            </div>
            {advanced ? (<p className="mt-2 text-xs text-muted-foreground">
              {auto ? "Next, the plan is written (what each image argues, the exact words on it and the prompt) and the images are rendered straight after." : "Next, the plan is written: what each image argues, the exact words on it and the prompt. You review and edit it. No image is rendered until you say so."}
              {live ? ` Writing the plan costs about $${(count * ((kind === "ad" ? 0.022 : 0.15) + (claimChecks ? 0.015 : 0) + (kind === "ad" && adReview ? 0.007 : 0))).toFixed(2)}.` : " The app is in mock mode, so the plan and images will be placeholders."}
            </p>) : (<p className="mt-2 text-xs text-muted-foreground">
              {auto ? "Next, the plan is written and the images are made straight after it." : "Next, the plan is written: what each image says and the exact words on it. You review and edit it. No image is made until you say so."}
              {!live && " Writing is switched off on this account, so this is a sample."}
            </p>)}
            {advanced && images > imagesLeft && live && <p className="mt-1 text-xs text-amber-700">Only {imagesLeft} images are left under the image cap. You can still plan; rendering will ask you to raise MEDIA_IMAGE_CAP or render fewer.</p>}
            {!advanced && images > imagesLeft && live && <p className="mt-1 text-xs text-amber-700">{imagesLeft === 0 ? "No more images can be made right now. You can still write the plan." : `Only ${imagesLeft} image${imagesLeft === 1 ? "" : "s"} can still be made, and this set has ${images}. Take some out or pick fewer sizes.`}</p>}
            <Button className="mt-3" onClick={create} disabled={creating || !aspects.length || (live && !photos.length)} data-testid="create-set">
              {creating && <Loader2 className="size-4 animate-spin"/>}
              {auto ? `Make the ${info.noun}` : "Write the plan"}
            </Button>
            {live && !photos.length && <p className="mt-1 text-xs text-amber-700">Pick at least 1 product photo above.</p>}
          </div>
        </section>)}

      {picker && productId && <RefPicker kind={kind} productId={productId} types={types} groups={groups} verticals={verticals} brandVertical={profile?.vertical ?? ""} initialType={picker.type} initialBucket={picker.slot} taken={taken} onPick={onPicked} onClose={() => setPicker(null)} replacing={picker.replace != null || !!picker.slot}/>}
    </div>);
}
function StepTitle({ n, title, note }: {
    n: number;
    title: string;
    note: string;
}) {
    return (<div className="flex items-baseline gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
    </div>);
}
function IconButton({ label, onClick, disabled, children, testid }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    testid?: string;
}) {
    return (<button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} data-testid={testid} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
      {children}
    </button>);
}
function RefPicker({ kind, productId, types, groups, verticals, brandVertical, initialType, initialBucket, taken, onPick, onClose, replacing }: {
    kind: LibraryKind;
    productId: string;
    types: TypeOption[];
    groups: {
        id: string;
        label: string;
    }[];
    verticals: string[];
    brandVertical: string;
    initialType: string;
    initialBucket?: string;
    taken: string[];
    onPick: (r: RefCard) => void;
    onClose: () => void;
    replacing: boolean;
}) {
    const advanced = useAdvanced();
    const [type, setType] = useState(initialType);
    const [group, setGroup] = useState(ALL);
    const byBucket = kind === "pdp";
    const [bucket, setBucket] = useState(initialBucket ?? ALL);
    const [vertical, setVertical] = useState(ALL);
    const [mine, setMine] = useState(false);
    const [refs, setRefs] = useState<RefCard[]>([]);
    const [more, setMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async (offset: number) => {
        setLoading(true);
        const res = await searchRefsAction({ kind, productId, type: type === ALL ? undefined : type, group: group === ALL ? undefined : group, vertical: mine && brandVertical ? brandVertical : vertical === ALL ? undefined : vertical, bucket: byBucket && bucket !== ALL ? bucket : undefined, offset });
        setLoading(false);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setRefs((cur) => (offset ? [...cur, ...res.refs] : res.refs));
        setMore(res.more);
    }, [kind, productId, type, group, vertical, mine, brandVertical, byBucket, bucket]);
    useEffect(() => {
        void load(0);
    }, [load]);
    const shownTypes = group === ALL ? types : types.filter((t) => t.group === group);
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl" data-testid="ref-picker">
        <DialogHeader>
          <DialogTitle>{replacing ? "Swap this reference" : "Add from the library"}</DialogTitle>
          <DialogDescription>Best matches for this product come first. Click one to {replacing ? "use it instead" : "add it to the set"}.</DialogDescription>
        </DialogHeader>
        {(advanced || byBucket) && (<div className="flex flex-wrap items-center gap-2">
          {byBucket && (<Select value={bucket} onValueChange={setBucket}>
              <SelectTrigger size="sm" className="w-64" data-testid="picker-bucket">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Every frame</SelectItem>
                {ALL_BUCKETS.map((b) => (<SelectItem key={b.id} value={b.id}>
                    {b.n}. {b.title}
                  </SelectItem>))}
                <SelectItem value={BUCKET_OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>)}
          {advanced && groups.length > 0 && !byBucket && (<Select value={group} onValueChange={(v) => { setGroup(v); setType(ALL); }}>
              <SelectTrigger size="sm" className="w-56" data-testid="picker-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Every stage</SelectItem>
                {groups.map((g) => (<SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>))}
              </SelectContent>
            </Select>)}
          {advanced && (<>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger size="sm" className={cn("w-56", byBucket && "hidden")} data-testid="picker-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every type</SelectItem>
              {shownTypes.map((t) => (<SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={mine ? brandVertical : vertical} onValueChange={(v) => { setMine(false); setVertical(v); }}>
            <SelectTrigger size="sm" className="w-56" data-testid="picker-vertical">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Every category</SelectItem>
              {verticals.map((v) => (<SelectItem key={v} value={v}>
                  {v}
                </SelectItem>))}
            </SelectContent>
          </Select>
          {brandVertical && (<label className="flex items-center gap-2 text-xs">
              <Switch checked={mine} onCheckedChange={setMine}/>
              Only {brandVertical.toLowerCase()}
            </label>)}
          </>)}
        </div>)}
        {advanced && type !== ALL && <p className="text-xs text-muted-foreground">{types.find((t) => t.id === type)?.hint}</p>}
        <div className="min-h-64 flex-1 overflow-y-auto">
          {!loading && refs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nothing in the library matches these filters.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {refs.map((r) => {
            const used = taken.includes(r.id);
            return (<li key={r.id}>
                  <button type="button" disabled={used} onClick={() => onPick(r)} data-testid="picker-ref" className={cn("block w-full rounded-lg border p-1.5 text-left transition hover:border-primary", used && "opacity-40")}>

                    <img src={thumbUrl(r.id)} alt={r.label} className="aspect-[4/5] w-full rounded bg-muted object-cover" loading="lazy"/>
                    <div className="mt-1 text-xs font-medium">{byBucket ? (ALL_BUCKETS.find((b) => b.id === r.bucket)?.title ?? r.label) : r.label}</div>
                    <div className="line-clamp-2 text-[11px] text-muted-foreground" title={r.why}>
                      {used ? "Already in the set" : `${r.brand ? `${r.brand}. ` : ""}${r.reason}`}
                    </div>
                  </button>
                </li>);
        })}
          </ul>
          <div className="flex justify-center py-3">
            {loading ? <Loader2 className="size-5 animate-spin text-muted-foreground"/> : more ? <Button size="sm" variant="outline" onClick={() => void load(refs.length)}>Show more</Button> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
