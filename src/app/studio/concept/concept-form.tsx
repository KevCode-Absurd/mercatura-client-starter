"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ClaimsSwitch } from "@/components/claims-switch";
import { TasteBar } from "@/components/taste-bar";
import type { Stage, Taste } from "@/lib/taste/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ARCHETYPES, FAMILY_LABEL, FUNNELS, MODES, WORLDS, archetypeOf, suggestConcepts, worldOf, type ConceptPick, type FunnelId, type WorldFamily } from "@/lib/studio/worlds";
import { cn } from "@/lib/utils";
import { createSetAction } from "../actions";
const NONE = "__none__";
const FAMILIES: WorldFamily[] = ["photoreal", "3d", "illustration", "native"];
const COUNTS = [4, 6, 8, 12];
export interface ConceptFormProps {
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    aspects: string[];
    live: boolean;
    imagesLeft: number;
    funnel?: FunnelId;
    claims: boolean;
}
const STAGE_OF: Record<FunnelId, Stage> = { cold: "problem_aware", warm: "solution_aware", ready: "most_aware", review: "solution_aware" };
const FREE = "free";
const PICKABLE = FUNNELS.filter((f) => f.id !== "review");
export function ConceptForm({ products, personas, offers, aspects, live, imagesLeft, funnel: startFunnel = "cold", claims }: ConceptFormProps) {
    const router = useRouter();
    const [product, setProduct] = useState(products[0]?.id ?? "");
    const [seed, setSeed] = useState(0);
    const [funnel, setFunnel] = useState<FunnelId>(startFunnel);
    const [rows, setRows] = useState<ConceptPick[]>(() => suggestConcepts(4, 0, startFunnel));
    const [buyers, setBuyers] = useState<string[]>([]);
    const [offer, setOffer] = useState(startFunnel === "ready" ? (offers[0]?.id ?? NONE) : NONE);
    const [sizes, setSizes] = useState<string[]>(["4:5"]);
    const [notes, setNotes] = useState("");
    const [auto, setAuto] = useState(false);
    const [taste, setTaste] = useState<Taste>({});
    const [claimChecks, setClaimChecks] = useState(claims);
    const [pending, start] = useTransition();
    const field = "mb-1.5 block text-sm font-medium";
    const taken = (at: number) => new Set(rows.filter((_, k) => k !== at).map((r) => r.world));
    const need = rows.length * sizes.length;
    const resize = (n: number) => setRows(suggestConcepts(n, seed, funnel));
    const pickFunnel = (f: FunnelId) => {
        setFunnel(f);
        setRows(suggestConcepts(rows.length, seed, f));
        setOffer(f === "ready" ? (offers[0]?.id ?? NONE) : NONE);
    };
    const setKind = (at: number, id: string) => setRows((cur) => cur.map((r, k) => {
        if (k !== at)
            return r;
        if (id === FREE)
            return { world: r.world, mode: worldOf(r.world)?.modes[0] ?? r.mode };
        const a = archetypeOf(id);
        if (!a)
            return r;
        const others = new Set(cur.filter((_, j) => j !== at).map((x) => x.world));
        return { archetype: a.id, mode: a.mode, world: a.worlds.find((w) => !others.has(w)) ?? r.world };
    }));
    const shuffle = () => {
        const next = seed + 3;
        setSeed(next);
        setRows(suggestConcepts(rows.length, next, funnel));
    };
    const setWorld = (at: number, world: string) => setRows((cur) => cur.map((r, k) => (k === at ? { ...r, world, mode: r.archetype ? r.mode : (worldOf(world)?.modes[0] ?? r.mode) } : r)));
    const setMode = (at: number, mode: ConceptPick["mode"]) => setRows((cur) => cur.map((r, k) => (k === at ? { ...r, mode } : r)));
    const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    const submit = () => start(async () => {
        const res = await createSetAction({ kind: "ad", productId: product, picks: rows.map((r) => ({ world: r.world, mode: r.mode, ...(r.archetype ? { archetype: r.archetype } : {}) })), aspects: sizes, notes, buyers, ...(offer !== NONE ? { offer } : {}), auto, claimChecks, taste, stage: STAGE_OF[funnel] });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(auto ? "The plan is being written. The images follow it." : "The plan is being written. You review it before any image is made.");
        router.push(`/studio/${res.id}`);
    });
    return (<div className="max-w-3xl space-y-6" data-testid="concept-form">
      <fieldset>
        <legend className={field}>Who these ads are for</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who these ads are for">
          {PICKABLE.map((f) => (<button key={f.id} type="button" role="radio" aria-checked={funnel === f.id} onClick={() => pickFunnel(f.id)} className={cn("rounded-lg border p-3 text-left", funnel === f.id ? "border-primary bg-primary/5" : "hover:bg-muted/40")} data-testid={`concept-funnel-${f.id}`}>
              <span className="block text-sm font-medium">{f.label}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{f.who}</span>
            </button>))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <div>
          <Label className={field}>Product</Label>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="w-full" data-testid="concept-product">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (<SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={field}>How many ads</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How many ads">
            {COUNTS.map((n) => (<button key={n} type="button" role="radio" aria-checked={rows.length === n} onClick={() => resize(n)} className={cn("rounded-full border px-3 py-1 text-sm", rows.length === n ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`concept-count-${n}`}>
                {n}
              </button>))}
          </div>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">{funnel === "cold" ? "The visual world of each ad" : "The kind of ad, and its visual world"}</h2>
            <p className="text-sm text-muted-foreground">{funnel === "cold" ? "No world is used twice. The app finds the argument and the picture for each one from your research. To steer a row, give it a kind of ad: the problem at its moment, the buyer recognised, or a belief corrected." : "Each ad is 1 kind of proof or offer. It is made only from what your brand's facts and research hold: a quote is a real quote, a deadline is a real deadline."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={shuffle} data-testid="concept-shuffle">
            <Shuffle className="size-4"/>
            Other worlds
          </Button>
        </div>
        <ol className="mt-3 space-y-2" data-testid="concept-rows">
          {rows.map((r, at) => {
            const w = worldOf(r.world);
            const used = taken(at);
            return (<li key={`${at}-${r.world}`} className="rounded-lg border p-3" data-testid="concept-row">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">{at + 1}</span>
                  {(r.archetype || funnel === "cold") && (<div className="w-full min-w-0 flex-1 sm:w-auto sm:min-w-56">
                      <Select value={r.archetype ?? FREE} onValueChange={(v) => setKind(at, v)}>
                        <SelectTrigger className="w-full" aria-label={`Kind of ad ${at + 1}`} data-testid="concept-kind">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {funnel === "cold" && <SelectItem value={FREE}>Free: the app finds the argument</SelectItem>}
                          {ARCHETYPES.filter((a) => a.funnel === funnel).map((a) => (<SelectItem key={a.id} value={a.id}>
                              {a.label}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>)}
                  <div className="w-full min-w-0 flex-1 sm:w-auto sm:min-w-56">
                    <Select value={r.world} onValueChange={(v) => setWorld(at, v)}>
                      <SelectTrigger className="w-full" aria-label={`World of ad ${at + 1}`} data-testid="concept-world">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FAMILIES.map((f) => (<SelectGroup key={f}>
                            <SelectLabel>{FAMILY_LABEL[f]}</SelectLabel>
                            {WORLDS.filter((x) => x.family === f).map((x) => (<SelectItem key={x.id} value={x.id} disabled={used.has(x.id)}>
                                {x.label}
                              </SelectItem>))}
                          </SelectGroup>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-44">
                    <Select value={r.mode} onValueChange={(v) => setMode(at, v as ConceptPick["mode"])}>
                      <SelectTrigger className="w-full" aria-label={`Mode of ad ${at + 1}`} data-testid="concept-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODES.map((m) => (<SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {rows.length > 1 && (<Button variant="ghost" size="sm" onClick={() => setRows((cur) => cur.filter((_, k) => k !== at))} aria-label={`Remove ad ${at + 1}`}>
                      <Trash2 className="size-4"/>
                    </Button>)}
                </div>
                {r.archetype ? (<p className="mt-1.5 pl-8 text-sm text-muted-foreground" data-testid="concept-needs">
                    {archetypeOf(r.archetype)?.picture} <span className="text-foreground">Needs:</span> {archetypeOf(r.archetype)?.needs}
                  </p>) : (w && <p className="mt-1.5 pl-8 text-sm text-muted-foreground">{w.look}</p>)}
              </li>);
        })}
        </ol>
      </section>

      {personas.length > 0 && (<fieldset>
          <legend className={field}>Who they are for (optional)</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {personas.map((p) => (<label key={p.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={buyers.includes(p.id)} onCheckedChange={() => setBuyers((cur) => toggle(cur, p.id))}/>
                {p.name}
              </label>))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">None ticked: each ad picks the buyer its argument fits.</p>
        </fieldset>)}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className={field}>Sizes</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {aspects.map((a) => (<label key={a} className="flex items-center gap-2 text-sm">
                <Checkbox checked={sizes.includes(a)} onCheckedChange={() => setSizes((cur) => (cur.includes(a) && cur.length === 1 ? cur : toggle(cur, a)))}/>
                {a}
              </label>))}
          </div>
        </fieldset>
        {offers.length > 0 && (<div>
            <Label className={field}>Offer to state (optional)</Label>
            <Select value={offer} onValueChange={setOffer}>
              <SelectTrigger className="w-full" data-testid="concept-offer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{funnel === "cold" ? "No offer: these are for cold audiences" : "No offer"}</SelectItem>
                {offers.map((o) => (<SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>)}
      </div>

      <div>
        <Label htmlFor="concept-notes" className={field}>
          Anything to steer them? (optional)
        </Label>
        <Textarea id="concept-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1500} placeholder="An angle to lean on, a season, something to stay away from." data-testid="concept-notes"/>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={auto} onCheckedChange={(v) => setAuto(v === true)} className="mt-0.5"/>
        <span>Make the images as soon as the plan is written, without reading it first.</span>
      </label>

      <TasteBar surface="image_ad" stage={STAGE_OF[funnel]} format={rows[0]?.world} value={taste} onChange={setTaste} hide={["look"]} id="concept-taste"/>

      <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="concept-claims"/>

      <div className="space-y-2">
        <Button onClick={submit} disabled={pending || !product || !rows.length || (live && need > imagesLeft)} data-testid="concept-submit">
          {pending ? "Starting..." : `Make ${rows.length} ${funnel === "cold" ? "concept ad" : funnel === "warm" ? "proof ad" : "offer ad"}${rows.length === 1 ? "" : "s"}`}
        </Button>
        <p className="text-sm text-muted-foreground">
          {!live ? "Writing is switched off on this account, so this is a sample." : need > imagesLeft ? `This needs ${need} images and ${imagesLeft} can still be made under the image cap. Pick fewer ads or sizes, or raise the cap in Settings.` : `${need} image${need === 1 ? "" : "s"} will be made.`}
        </p>
      </div>
    </div>);
}
