"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Camera, Check, LayoutTemplate, Loader2, MessageCircle, PenLine, Shapes, Sparkles, Users, Zap, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { Textarea } from "@/components/ui/textarea";
import { explorationLooks, SPRINT_DEFAULT, SPRINT_MAX } from "@/lib/sprint/diversity";
import { STUDIO_ASPECTS } from "@/lib/library/taxonomy";
import { apportion } from "@/lib/sprint/formats";
import { LAYOUTS, SPRINT_FORMATS as SPRINT_LOOKS } from "@/lib/sprint/looks";
import { cn } from "@/lib/utils";
import { productImageUrl } from "../shared";
import { createSprintAction } from "./actions";
import { castChoicesAction, type CastFace } from "./actions";
interface Props {
    products: {
        id: string;
        name: string;
        folder: string;
        photo: string | null;
    }[];
    personas: {
        id: string;
        name: string;
        products: string[];
        image: string | null;
    }[];
    pictures: Record<string, string | null>;
    live: boolean;
    cost: {
        plan: number;
        brief: number;
        image: number;
    };
    claims: boolean;
    imagesLeft: number;
    structures: {
        id: string;
        label: string;
    }[];
    quality?: "medium" | "high";
}
const PICTURE_COST: Record<"medium" | "high", number> = { high: 0.08, medium: 0.03 };
const SIZES = [10, 25, 50, 100];
const LOOK_ICON: Record<string, LucideIcon> = { layouts: LayoutTemplate, "product-shoot": Camera, comic: BookOpen, clay: Shapes, drawn: PenLine, post: MessageCircle, surreal: Zap };
function moved(cur: number[], i: number, value: number, size: number): number[] {
    if (cur.length === 1)
        return [size];
    const v = Math.max(0, Math.min(size, Math.round(value)));
    const others = cur.map((x, k) => (k === i ? 0 : x));
    const dealt = apportion(size - v, others.some((x) => x > 0) ? others : others.map((_, k) => (k === i ? 0 : 1)));
    return cur.map((_, k) => (k === i ? v : dealt[k]));
}
function Step({ n, title, note, children, testid }: {
    n: number;
    title: string;
    note?: string;
    children: React.ReactNode;
    testid?: string;
}) {
    return (<section className="rounded-xl border bg-card p-6 max-sm:p-4" data-testid={testid}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{n}</span>
        <div className="min-w-0">
          <h2 className="display text-2xl leading-7">{title}</h2>
          {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>);
}
function Shares({ rows, size, onShare, ids }: {
    rows: {
        id: string;
        name: string;
        n: number;
        thumb?: React.ReactNode;
    }[];
    size: number;
    onShare: (i: number, v: number) => void;
    ids: (id: string) => {
        count: string;
        split: string;
    };
}) {
    return (<div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
      {rows.map((r, i) => (<div key={r.id} className="flex min-w-0 items-center gap-3 text-sm">
          {r.thumb}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate font-medium" title={r.name}>
                {r.name}
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                <span className="text-sm font-semibold text-foreground" data-testid={ids(r.id).count}>
                  {r.n}
                </span>{" "}
                ads · {size ? Math.round((r.n / size) * 100) : 0}%
              </span>
            </div>
            <input type="range" min={0} max={size} step={1} value={r.n} disabled={rows.length === 1} onChange={(e) => onShare(i, Number(e.target.value))} className="mt-1.5 h-1.5 w-full cursor-pointer accent-primary disabled:cursor-default" aria-label={`Ads for ${r.name}`} data-testid={ids(r.id).split}/>
          </div>
        </div>))}
    </div>);
}
interface CastChoice {
    ages: [
        string,
        string
    ];
    women: number;
    from: "market" | "anywhere";
    people: CastFace[];
    own: boolean;
}
const CAST_UNTOUCHED: CastChoice = { ages: ["18", "30"], women: 0.75, from: "market", people: [], own: false };
const WOMEN_AND_MEN = [{ id: "mostly-women", label: "Mostly women", share: 0.75 }, { id: "even", label: "Even", share: 0.5 }, { id: "mostly-men", label: "Mostly men", share: 0.25 }, { id: "women-only", label: "Women only", share: 1 }, { id: "men-only", label: "Men only", share: 0 }] as const;
const CAST_FROM = [{ id: "market", label: "The brand's market" }, { id: "anywhere", label: "Anywhere" }] as const;
const castAgesOf = (ages: [
    string,
    string
]): [
    number,
    number
] => { const read = (text: string, fallback: number) => Math.max(18, Math.min(90, Math.round(Number(text)) || fallback)); const a = read(ages[0], 18); const b = read(ages[1], 30); return [Math.min(a, b), Math.max(a, b)]; };
function CastBriefPanel({ value, onChange, needed }: {
    value: CastChoice;
    onChange: (next: CastChoice | ((was: CastChoice) => CastChoice)) => void;
    needed: number;
}) {
    const [picking, setPicking] = useState(false);
    const [fit, setFit] = useState<{
        count: number;
        people: CastFace[];
    } | null>(null);
    const [ageMin, ageMax] = castAgesOf(value.ages);
    const { women, from } = value;
    useEffect(() => {
        let stale = false;
        const timer = setTimeout(async () => {
            const res = await castChoicesAction({ ages: [ageMin, ageMax], women, from }).catch(() => null);
            if (!stale && res?.ok)
                setFit({ count: res.count, people: res.people });
        }, 300);
        return () => { stale = true; clearTimeout(timer); };
    }, [ageMin, ageMax, women, from, picking]);
    const set = (patch: Partial<CastChoice> | ((was: CastChoice) => Partial<CastChoice>)) => onChange((was) => ({ ...was, ...(typeof patch === "function" ? patch(was) : patch), own: true }));
    const tidyAges = () => onChange((was) => ({ ...was, ages: castAgesOf(was.ages).map(String) as [
            string,
            string
        ] }));
    const isPicked = (id: string) => value.people.some((p) => p.id === id);
    const toggle = (face: CastFace) => set((was) => ({ people: was.people.some((p) => p.id === face.id) ? was.people.filter((p) => p.id !== face.id) : was.people.length < 6 ? [...was.people, face] : was.people }));
    const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-sm transition", on ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:border-primary/40 hover:text-foreground");
    const word = (g: CastFace["gender"]) => (g === "Female" ? "Woman" : g === "Male" ? "Man" : "Person");
    const count = !fit ? "Looking in the library…" : fit.count === 0 ? "No one in the library fits. The sprint will cast from a wider range." : `${fit.count} ${fit.count === 1 ? "person" : "people"} in the library ${fit.count === 1 ? "fits" : "fit"}${fit.count < needed ? `, fewer than the ${needed} this sprint casts: the rest come from a wider range` : ""}`;
    return (<div className="rounded-xl border p-4" data-testid="sprint-cast-brief">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Who is in the ads</h3>
        {value.own && <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => onChange(CAST_UNTOUCHED)} data-testid="sprint-cast-follow">Follow each ad&apos;s buyer again</button>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground" data-testid="sprint-cast-rule">{value.own ? "Your choice holds for every ad in this sprint." : "The people in each ad follow the buyer it is for. Where a buyer has no age or gender on file, these apply. Change anything here and it holds for every ad."}</p>
      <div className="mt-3 grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="font-medium">Ages</span>
        <div className="flex items-center gap-2">
          <Input type="number" min={18} max={90} value={value.ages[0]} onChange={(e) => set((was) => ({ ages: [e.target.value, was.ages[1]] }))} onBlur={tidyAges} className="h-8 w-20" aria-label="Youngest age" data-testid="sprint-cast-ages-min"/>
          <span className="text-muted-foreground">to</span>
          <Input type="number" min={18} max={90} value={value.ages[1]} onChange={(e) => set((was) => ({ ages: [was.ages[0], e.target.value] }))} onBlur={tidyAges} className="h-8 w-20" aria-label="Oldest age" data-testid="sprint-cast-ages-max"/>
        </div>
        <span className="font-medium">Women and men</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Women and men" data-testid="sprint-cast-women">
          {WOMEN_AND_MEN.map((w) => <button key={w.id} type="button" aria-pressed={women === w.share} onClick={() => set({ women: w.share })} className={chip(women === w.share)} data-testid={`sprint-cast-women-${w.id}`}>{w.label}</button>)}
        </div>
        <span className="font-medium">From</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="From" data-testid="sprint-cast-from">
          {CAST_FROM.map((f) => <button key={f.id} type="button" aria-pressed={from === f.id} onClick={() => set({ from: f.id })} className={chip(from === f.id)} data-testid={`sprint-cast-from-${f.id}`}>{f.label}</button>)}
        </div>
      </div>
      <p className="mt-3 text-sm" aria-live="polite" data-testid="sprint-cast-count">{count}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" aria-expanded={picking} onClick={() => setPicking((on) => !on)} data-testid="sprint-cast-pick">Choose the people yourself</Button>
        {value.people.map((p) => (<img key={p.id} src={p.thumb} alt={`${word(p.gender)}, ${p.age}`} className="size-8 rounded-full border object-cover object-top" data-testid="sprint-cast-picked"/>))}
        {value.people.length > 0 && <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => set({ people: [] })} data-testid="sprint-cast-clear">Clear</button>}
      </div>
      {picking && (<div className="mt-3" data-testid="sprint-cast-grid">
          <p className="text-xs text-muted-foreground">{!fit ? "Looking in the library…" : !fit.people.length ? "No one fits yet. Widen the ages, or choose Anywhere." : `Pick up to 6. The people you pick are in the ads first; the rest are chosen to fit.${fit.count > fit.people.length ? ` Showing ${fit.people.length} of ${fit.count}: narrow the ages to see the others.` : ""}`}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {(fit?.people ?? []).map((p) => {
                const on = isPicked(p.id);
                return (<button key={p.id} type="button" aria-pressed={on} aria-label={`${word(p.gender)}, ${p.age}`} disabled={!on && value.people.length >= 6} onClick={() => toggle(p)} className={cn("relative overflow-hidden rounded-lg border text-left transition disabled:opacity-40", on ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")} data-testid="sprint-cast-face">

                  <img src={p.thumb} alt="" loading="lazy" decoding="async" className="aspect-[3/4] w-full bg-muted object-cover object-top"/>
                  <span className="block px-1.5 py-1 text-center text-xs tabular-nums text-muted-foreground">{p.age}</span>
                  {on && <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground"><Check className="size-3"/></span>}
                </button>);
            })}
          </div>
        </div>)}
    </div>);
}
export function NewSprint({ products, personas, pictures, live, cost: baseCost, claims, imagesLeft, structures, quality = "high" }: Props) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [size, setSize] = useState(SPRINT_DEFAULT);
    const even = (n: number) => apportion(n, products.map((_, i) => (i === 0 ? 6 : i === 1 ? 3 : 1)));
    const [split, setSplit] = useState<number[]>(even(SPRINT_DEFAULT));
    const [mix, setMix] = useState<Record<string, number>>(explorationLooks(SPRINT_DEFAULT));
    const [selectedStructures, setSelectedStructures] = useState(structures.map(f => f.id));
    const [aspects, setAspects] = useState<("4:5" | "1:1" | "9:16")[]>(["4:5"]);
    const [notes, setNotes] = useState("");
    const [everyone, setEveryone] = useState(true);
    const [buyers, setBuyers] = useState<string[]>([]);
    const [cast, setCast] = useState(true);
    const [castChoice, setCastChoice] = useState<CastChoice>(CAST_UNTOUCHED);
    const [pictureQuality, setPictureQuality] = useState<"medium" | "high">(quality);
    const perPicture = PICTURE_COST[pictureQuality];
    const cost = { ...baseCost, image: perPicture };
    const [textOnImage, setTextOnImage] = useState(false);
    const [auto, setAuto] = useState(true);
    const [claimChecks, setClaimChecks] = useState(claims);
    const [taste, setTaste] = useState<Taste>({});
    const [pending, start] = useTransition();
    const total = split.reduce((a, b) => a + b, 0);
    const chosenLooks = SPRINT_LOOKS.filter((l) => l.id in mix);
    const resize = (n: number) => {
        setSize(n);
        setSplit(even(n));
        setMix((cur) => Object.fromEntries(Object.keys(cur).map((id, i) => [id, Math.floor(n / Object.keys(cur).length) + (i < n % Object.keys(cur).length ? 1 : 0)])));
    };
    const toggleLook = (id: string) => setMix(cur => {
        const ids = id in cur ? Object.keys(cur).filter(x => x !== id) : [...Object.keys(cur), id];
        if (!ids.length)
            return cur;
        return Object.fromEntries(ids.map((id, i) => [id, Math.floor(size / ids.length) + (i < size % ids.length ? 1 : 0)]));
    });
    const tooFew = size < Math.max(chosenLooks.length, selectedStructures.length);
    const imageCount = size * aspects.length;
    const toggleBuyer = (id: string) => setBuyers((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    const chosen = everyone ? personas : personas.filter((p) => buyers.includes(p.id));
    const inSprint = products.filter((_, i) => (split[i] ?? 0) > 0).map((p) => p.id);
    const left = chosen.filter((p) => p.products.length && !p.products.some((id) => inSprint.includes(id)));
    const castShots = (ads: number) => { const castable = Math.round(ads / 2); return castable > 0 ? Math.max(Math.min(castable, 6, Math.max(3, Math.round(castable / 4))), Math.min(castChoice.people.length, castable)) : 0; };
    const short = live && auto && imageCount + (cast ? castShots(size) : 0) > imagesLeft;
    const looksSent = Object.fromEntries(Object.entries(mix).filter(([, n]) => n > 0));
    const typed = Object.keys(looksSent).some((id) => id !== LAYOUTS);
    const go = () => start(async () => {
        const res = await createSprintAction({ size, split: Object.fromEntries(products.map((p, i) => [p.id, split[i] ?? 0])), notes, options: { formats: Object.keys(mix), structures: selectedStructures, aspects, claimChecks, auto, cast, ...(cast && castChoice.own ? { castBrief: { ages: castAgesOf(castChoice.ages), women: castChoice.women, from: castChoice.from, people: castChoice.people.map((p) => p.id) } } : {}), pictureQuality, textOnImage, personas: everyone ? [] : buyers, ...(typed ? { looks: looksSent } : {}), ...(Object.keys(taste).length ? { taste } : {}) } });
        if (!res.ok)
            return void toast.error(res.error);
        router.push(`/studio/sprint/${res.id}`);
    });
    const chip = (on: boolean) => cn("rounded-full border text-sm transition", on ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:border-primary/40 hover:text-foreground");
    const thumb = (src: string | null, alt = "") => src ? (<img src={src} alt={alt} className="size-12 shrink-0 rounded border bg-white object-contain" loading="lazy"/>) : (<span className="flex size-12 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">No photo</span>);
    return (<div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]" data-testid="new-sprint">
      <div className="min-w-0 space-y-6">
        <Step n={1} title="How many ads" note="100 by default. Every enabled format gets an even share; disable formats to make a smaller batch.">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="number" min={4} max={SPRINT_MAX} value={size} onChange={(e) => resize(Math.max(0, Math.min(SPRINT_MAX, Number(e.target.value) || 0)))} className="numeral h-12 w-24 text-center !text-3xl" aria-label="Ads" data-testid="sprint-size"/>
            <span className="mr-2 text-sm text-muted-foreground">ads</span>
            {SIZES.map((n) => (<button key={n} type="button" onClick={() => resize(n)} aria-pressed={size === n} className={cn(chip(size === n), "px-3 py-1 tabular-nums")} data-testid={`sprint-size-${n}`}>
                {n}
              </button>))}
          </div>
        </Step>

        <section className="rounded-xl border p-6"><h2 className="text-lg font-medium">Image sizes</h2><p className="mb-3 text-sm text-muted-foreground">Each ad is created in every selected size.</p><div className="flex flex-wrap gap-3">{(["4:5", "1:1", "9:16"] as const).map(a => <label key={a} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={aspects.includes(a)} onChange={() => setAspects(cur => cur.includes(a) ? cur.length > 1 ? cur.filter(x => x !== a) : cur : [...cur, a])}/>{STUDIO_ASPECTS[a].label} · {STUDIO_ASPECTS[a].size}</label>)}</div><p className="mt-3 font-medium" data-testid="sprint-image-total">{size} ads × {aspects.length} sizes = {imageCount} images</p></section>
        <Step n={2} title="Which products" note={products.length > 1 ? `How the ${size} are split. Move 1 slider and the others make room.` : "Every ad is for this product."} testid="sprint-products">
          <Shares rows={products.map((p, i) => ({ id: p.id, name: p.name, n: split[i] ?? 0, thumb: thumb(p.photo ? productImageUrl(p.folder, p.photo, 120) : null) }))} size={size} onShare={(i, v) => setSplit((cur) => moved(cur, i, v, size))} ids={(id) => ({ count: `sprint-count-${id}`, split: `sprint-split-${id}` })}/>
          {total !== size && <p className="mt-2 text-xs text-red-700">The products add up to {total}, not {size}.</p>}
        </Step>

        <label className="flex items-center gap-3 rounded-xl border p-4"><Switch checked={cast} onCheckedChange={setCast}/>Use a few realistic people where the concept calls for them, their pictures reused across the ads (at most {castShots(size)} extra reference image{castShots(size) === 1 ? "" : "s"}, none for a person already pictured)</label>
        {cast && <CastBriefPanel value={castChoice} onChange={setCastChoice} needed={castShots(size)}/>}
        <div className="rounded-xl border p-4" data-testid="sprint-picture-quality">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">Pictures:</span>
            {(["high", "medium"] as const).map((q) => <Button key={q} type="button" size="sm" variant={pictureQuality === q ? "default" : "outline"} aria-pressed={pictureQuality === q} onClick={() => setPictureQuality(q)} data-testid={`sprint-pictures-${q === "high" ? "final" : "draft"}`}>{q === "high" ? "Final" : "Draft"}</Button>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{pictureQuality === "high" ? "Final: about 8 cents a picture." : "Draft: about 3 cents a picture, at a lower quality setting. A kept ad can be made again at Final."}</p>
        </div>
        <div className="rounded-xl border p-4">
          <label className="flex items-center gap-3"><Switch checked={textOnImage} onCheckedChange={setTextOnImage} data-testid="sprint-text-on-image"/>Add text to images after review</label>
          <p className="mt-2 text-sm text-muted-foreground">Off by default. Create the base images first, then write your own copy or generate headlines and body copy for one ad or all ads. Add approved words as editable layers, or download the images for Figma.</p>
        </div>
        <Step n={3} title="Visual formats" note="All enabled by default. Untick any format to exclude it. Counts are balanced automatically, with at least one per enabled format." testid="sprint-looks">
          <div className="mb-4 flex gap-2"><Button variant="outline" size="sm" onClick={() => setMix(Object.fromEntries(SPRINT_LOOKS.map((l, i) => [l.id, Math.floor(size / SPRINT_LOOKS.length) + (i < size % SPRINT_LOOKS.length ? 1 : 0)])))}>Enable all formats</Button><Button variant="outline" size="sm" onClick={() => setMix({ layouts: size })}>Start with classic only</Button></div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {SPRINT_LOOKS.map((l) => {
            const on = l.id in mix;
            const Icon = LOOK_ICON[l.id] ?? Sparkles;
            return (<button key={l.id} type="button" onClick={() => toggleLook(l.id)} aria-pressed={on} className={cn("group flex min-w-0 flex-col overflow-hidden rounded-lg border text-left transition hover:border-primary/60", on && "border-primary ring-1 ring-primary")} data-testid={`sprint-look-${l.id}`}>
                  <div className="relative aspect-square w-full overflow-hidden bg-secondary">
                    {pictures[l.id] ? (<img src={`/api/assets/${pictures[l.id]}?w=480`} alt={`An example of ${l.label.toLowerCase()}`} className={cn("absolute inset-0 size-full object-cover object-top transition", !on && "opacity-85 group-hover:opacity-100")} loading="lazy"/>) : (<span className="flex size-full items-center justify-center text-primary/60">
                        <Icon className="size-9"/>
                      </span>)}
                    {on && (<span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
                        <Check className="size-3"/>
                        {mix[l.id]} ads
                      </span>)}
                  </div>
                  <div className={cn("flex-1 p-3.5", on && "bg-primary/5")}>
                    <div className="text-sm font-semibold leading-tight">{l.label}</div>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{l.what}</p>
                  </div>
                </button>);
        })}
          </div>
          <p className="mt-3 text-sm" data-testid="format-distribution">{chosenLooks.length} enabled formats · {size} ads · {tooFew ? "Increase the ad count or disable formats to include every selection." : Math.floor(size / chosenLooks.length) + "–" + Math.ceil(size / chosenLooks.length) + " ads per format"}</p>
          {tooFew && <p role="alert" className="text-sm text-red-700">Choose at least {Math.max(chosenLooks.length, selectedStructures.length)} ads or disable some formats. Every enabled format must get an image.</p>}
        </Step>

        <details className="rounded-xl border p-4" data-testid="sprint-structures"><summary className="cursor-pointer font-medium">Ad structures · {selectedStructures.length} enabled</summary><p className="my-3 text-sm text-muted-foreground">All structures supported by this brand are enabled. Each gets an equal share. Offers, founder stories and authority ads require supporting brand material.</p><div className="grid gap-3 sm:grid-cols-3">{structures.map(f => <label key={f.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selectedStructures.includes(f.id)} onChange={() => setSelectedStructures(cur => cur.includes(f.id) ? cur.length > 1 ? cur.filter(x => x !== f.id) : cur : [...cur, f.id])}/>{f.label}</label>)}</div></details>
        {personas.length > 0 && (<Step n={4} title="Who the ads are for" testid="sprint-buyers">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setEveryone(true)} aria-pressed={everyone} className={cn(chip(everyone), "flex items-center gap-2 py-1 pl-1 pr-3")} data-testid="sprint-buyers-all">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground">
                  <Users className="size-3.5"/>
                </span>
                Every buyer ({personas.length})
              </button>
              <button type="button" onClick={() => setEveryone(false)} aria-pressed={!everyone} className={cn(chip(!everyone), "px-3 py-1.5")} data-testid="sprint-buyers-some">
                Choose buyers
              </button>
            </div>
            {everyone ? (<p className="mt-2 text-xs text-muted-foreground">The ads are spread across all {personas.length} personas, each on the products it buys, so you learn which buyer answers.</p>) : (<>
                <div className="mt-3 flex flex-wrap gap-2">
                  {personas.map((p) => {
                    const on = buyers.includes(p.id);
                    return (<button key={p.id} type="button" onClick={() => toggleBuyer(p.id)} aria-pressed={on} className={cn(chip(on), "flex items-center gap-2 py-1 pl-1 pr-3")} data-testid={`sprint-buyer-${p.id}`}>
                        {p.image ? (<img src={`/api/assets/${p.image}?w=64`} alt="" className="size-7 rounded-full object-cover" loading="lazy"/>) : (<span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">{p.name.replace(/^The /, "").slice(0, 1)}</span>)}
                        {p.name}
                        {on && <Check className="size-3.5"/>}
                      </button>);
                })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{buyers.length === 0 ? "Pick 1 buyer to write every ad for that person, or a few to split the ads between them." : buyers.length === 1 ? `All ${size} ads are written for this 1 buyer, from as many angles as the plan can find.` : `The ${size} ads are split between these ${buyers.length} buyers.`}</p>
              </>)}
            {left.length > 0 && <p className="mt-1 text-xs text-amber-700">{left.map((p) => p.name).join(", ")} {left.length === 1 ? "buys" : "buy"} none of the products in this sprint, so {left.length === 1 ? "it gets" : "they get"} no ads.</p>}
          </Step>)}
        <Step n={personas.length > 0 ? 5 : 4} title="The look of the ads" note="Optional. Leave it alone and every ad follows its own buyer: someone who has never heard of the brand gets no product in the picture, someone ready to buy gets the product as the hero." testid="sprint-taste-step">

          <TasteBar hide={["words"]} surface="sprint_ad" value={taste} onChange={setTaste} follows={{ product: "Each ad decides from its own buyer. Pick a stop to show the product the same way in every ad." }} id="sprint-taste"/>
        </Step>
      </div>

      <aside className="rounded-xl border bg-card p-6 xl:sticky xl:top-[calc(var(--top)+1rem)]" data-testid="sprint-summary">
        <h2 className="text-sm font-medium text-muted-foreground">Your sprint</h2>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="numeral text-6xl text-primary">{size}</span>
          <span className="text-lg font-semibold">ads</span>
        </p>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Products</dt>
            <dd>{products.filter((_, i) => (split[i] ?? 0) > 0).map((p) => `${split[products.indexOf(p)]} ${p.name}`).join(" · ") || "None yet"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">{size} ads × {aspects.length} sizes = {imageCount} images</dt>
            <dd className="max-h-40 overflow-auto" data-testid="sprint-summary-looks">{chosenLooks.filter((l) => mix[l.id] > 0).map((l) => `${mix[l.id]} ${l.label.toLowerCase()}`).join(" · ")}</dd>
          </div>
          {personas.length > 0 && (<div>
              <dt className="text-xs font-medium text-muted-foreground">For</dt>
              <dd>{everyone ? `Every buyer (${personas.length})` : chosen.length ? chosen.map((p) => p.name).join(", ") : "No buyer chosen yet"}</dd>
            </div>)}
        </dl>

        <div className="mt-5 space-y-3 border-t pt-4" data-testid="sprint-switches">
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={auto} onCheckedChange={setAuto} data-testid="sprint-auto" className="mt-0.5"/>
            <span>
              <span className="font-medium">{auto ? "Make the ads automatically" : "Approve each step"}</span>
              <span className="block text-xs text-muted-foreground">{auto ? "On: the plan, visual briefs and base images are made one after the other. Copy is written and reviewed afterwards." : "Off: approve the plan and visual briefs before the base images are made. Copy comes afterwards."}</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={claimChecks} onCheckedChange={setClaimChecks} data-testid="sprint-claims" className="mt-0.5"/>
            <span>
              <span className="font-medium">Check claims</span>
              <span className="block text-xs text-muted-foreground">{claimChecks ? "On: every word is read against the brand's approved claims, and an ad that fails is written again. Slower." : "Off: nothing is held back for its claims. You can check the claims of any set afterwards."}</span>
            </span>
          </label>
        </div>

        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Direction for the whole sprint (optional): a season, an offer to lead with, something to stay away from" className="mt-4 min-h-20 text-sm" data-testid="sprint-notes"/>
        <Button size="lg" className="mt-3 w-full" onClick={go} disabled={pending || tooFew || total !== size || size < 4 || (!everyone && !buyers.length) || short} data-testid="sprint-start">
          {pending ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
          {auto ? `Make the ${size} ads` : "Write the plan"}
          {advanced ? (live ? ` (about $${(auto ? cost.plan + size * cost.brief + imageCount * cost.image + (cast ? castShots(size) * 0.15 : 0) : cost.plan).toFixed(2)})` : " (mock)") : live ? "" : " (sample)"}
        </Button>
        {short && <p className="mt-2 text-xs text-amber-700">{imagesLeft} image{imagesLeft === 1 ? " is" : "s are"} left under the image cap and this reserves {imageCount + (cast ? castShots(size) : 0)} including character references. Raise the cap in Settings, make fewer ads, or turn off &quot;Make the ads automatically&quot;.</p>}
        {advanced ? (<p className="mt-2 text-xs text-muted-foreground">
            {auto ? `The plan is about $${cost.plan.toFixed(2)}, the briefs about $${(size * cost.brief).toFixed(0)} and the images about $${(imageCount * perPicture).toFixed(0)}. Stop on the run bar ends it where it is; what is made is kept.` : `The plan is the only step this starts. Briefs for ${size} ads are about $${(size * cost.brief).toFixed(0)} and the images about $${(imageCount * perPicture).toFixed(0)}; each waits for your approval.`}
          </p>) : (<p className="mt-2 text-xs text-muted-foreground">{auto ? "You can stop it at any point from the bar at the top; what is made is kept." : "The plan is the only step this starts. The visual briefs and the images each wait for your approval."}</p>)}
      </aside>
    </div>);
}
