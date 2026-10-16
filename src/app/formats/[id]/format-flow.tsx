"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, MessageSquarePlus, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { ClaimsSwitch } from "@/components/claims-switch";
import { HooksPicker } from "@/components/hooks-picker";
import { TasteBar } from "@/components/taste-bar";
import type { Surface as TasteSurface, Taste } from "@/lib/taste/types";
import { OutputOptionsPicker, defaultOutputOptions, picturesOf, type OutputOptions } from "@/components/output-options";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import type { GalleryFormat } from "@/lib/format-gallery";
import { skillTitles } from "@/lib/skills/titles";
import type { LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { startFormatAction } from "../actions";
import { LengthPick } from "./length-pick";
import { OfferPick, type FlowOffer } from "./offer-pick";
import { AnglePick, type FlowAngle } from "./angle-pick";
import { CreatorProcess } from "@/components/creator-process";
import { AvatarReview } from "@/components/avatar-review";
import { WorkflowChoice } from "@/components/workflow-choice";
import type { WorkflowMode } from "@/lib/production/workflow";
import { HYPERREAL_DIRECTION } from "@/lib/creator-studio";
export interface FlowProduct {
    id: string;
    name: string;
    format: string;
    folder: string;
    photo: string | null;
}
export interface FlowPersona {
    id: string;
    name: string;
    summary: string;
    image: string | null;
}
const productImageUrl = (folder: string, file: string, w: number) => `/api/brand-file/assets/${encodeURIComponent(folder)}/${encodeURIComponent(file)}?w=${w}`;
function StepNote({ value, onChange, placeholder, testid }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    testid: string;
}) {
    const [open, setOpen] = useState(false);
    if (!open && !value)
        return (<button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid={`${testid}-open`}>
        <MessageSquarePlus className="size-4"/>
        Add a note
      </button>);
    return (<div className="mt-3 flex max-w-2xl items-start gap-2">
      <Textarea autoFocus={open} value={value} onChange={(e) => onChange(e.target.value.slice(0, 600))} rows={2} className="min-h-14 flex-1 text-sm" placeholder={placeholder} data-testid={testid}/>
      <VoiceNote onText={(t) => onChange(`${value}${value ? " " : ""}${t}`.slice(0, 600))} testId={`${testid}-voice`}/>
    </div>);
}
function Step({ n, title, note, children }: {
    n: number;
    title: string;
    note?: string;
    children: React.ReactNode;
}) {
    return (<section data-testid={`flow-step-${n}`}>
      <div className="flex items-baseline gap-3">
        <span className="flex size-7 shrink-0 -translate-y-0.5 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{n}</span>
        <div>
          <h2 className="display text-2xl">{title}</h2>
          {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
        </div>
      </div>
      <div className="mt-5 md:pl-10">{children}</div>
    </section>);
}
export function FormatFlow({ initialWorkflow = "guided", initialAvatarId, initialStart = false, format, example, own, lengths, offers, angles, products, personas, avatars = [], liveImages = false, live, imagesLeft, advanced, claims }: {
    initialWorkflow?: WorkflowMode;
    initialAvatarId?: string;
    initialStart?: boolean;
    format: GalleryFormat;
    example: string | null;
    own: string | null;
    lengths: LengthPreset[];
    offers?: FlowOffer[];
    angles?: FlowAngle[];
    products: FlowProduct[];
    personas: FlowPersona[];
    avatars?: {
        id: string;
        name: string;
        portrait: string | null;
        kind: "person" | "character";
    }[];
    liveImages?: boolean;
    live: boolean;
    imagesLeft: number;
    advanced: boolean;
    claims: boolean;
}) {
    const router = useRouter();
    const start = format.start;
    const [going, setGoing] = useState(initialStart);
    const [workflow, setWorkflow] = useState<WorkflowMode>(initialWorkflow);
    const [productId, setProductId] = useState<string>(products.length === 1 ? products[0].id : "");
    const [personaId, setPersonaId] = useState<string | null>(null);
    const [count, setCount] = useState(format.count?.first ?? 1);
    const [options, setOptions] = useState<OutputOptions>(defaultOutputOptions(format.words));
    const [also, setAlso] = useState(false);
    const [claimChecks, setClaimChecks] = useState(claims);
    const [length, setLength] = useState(lengths[0]);
    const [offerId, setOfferId] = useState<string | null>(offers?.[0]?.id ?? null);
    const [angleId, setAngleId] = useState<string | null>(angles?.find((a) => a.status === "unrun")?.id ?? angles?.[0]?.id ?? null);
    const claimable = start.via === "script" || (start.via === "studio" && format.words);
    const [notes, setNotes] = useState({ product: "", buyer: "", general: "" });
    const [avatarId, setAvatarId] = useState(avatars.some((a) => a.id === initialAvatarId) ? initialAvatarId! : "");
    const [characterNotes, setCharacterNotes] = useState("");
    const [hyperreal, setHyperreal] = useState(false);
    const [characterReviewed, setCharacterReviewed] = useState(false);
    const avatar = avatars.find((a) => a.id === avatarId);
    const video = format.group === "video" && start.via === "script";
    const [hooks, setHooks] = useState(1);
    const [taste, setTaste] = useState<Taste>({});
    const [pending, run] = useTransition();
    const studio = start.via === "studio";
    const studioSurface: TasteSurface = start.via !== "studio" ? "image_ad" : start.kind === "pdp" ? "pdp" : start.kind === "photoshoot" ? "photoshoot" : format.id.includes("native") ? "native_ad" : "image_ad";
    const pictures = studio ? picturesOf(count, 1, options) : 0;
    const noun = format.group === "photos" && !format.words ? "photograph" : format.group === "ads" || format.id === "pdp" ? (format.id === "pdp" ? "image" : "ad") : "piece";
    const generate = () => run(async () => {
        if (video && workflow === "guided" && avatar && !characterReviewed)
            return void toast.error("Review this character before creating the script and storyboard.");
        const res = await startFormatAction({ formatId: format.id, productId, personaId, count, notes, ...options, also, ...(video ? { ...(avatarId === "new" ? { avatarId: null } : avatarId ? { avatarId } : {}), characterNotes, hyperreal, workflow } : {}), ...(claimable ? { claimChecks } : {}), ...(length ? { length } : {}), ...(offerId ? { offerId } : {}), ...(angleId ? { angleId } : {}), taste, ...(start.via === "script" ? { hooks } : {}) });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.said);
        router.push(res.href);
    });
    return (<div className="space-y-12 px-6 pb-6 pt-10 max-md:pt-6" data-testid="format-flow">
      {video && <><WorkflowChoice value={workflow} onChange={setWorkflow} disabled={pending}/><CreatorProcess current="Format" avatarId={avatar?.id}/><Link href="/studio/creator" className="inline-flex min-h-11 items-center text-sm text-primary" data-testid="format-own-script">Already have a script? Start with your words or your avatar in Creator Studio.</Link></>}

      <details open={!going}><summary className="cursor-pointer text-sm text-muted-foreground">Example and format details</summary>
      <div className="grid gap-8 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-14">
        <div className="overflow-hidden rounded-xl border bg-muted max-md:mx-auto max-md:max-w-xs">
          {example ? (<img src={`/api/assets/${example}?w=800`} alt={`An example of ${format.label.toLowerCase()}`} className="max-h-[34rem] w-full object-cover object-top" loading="lazy" data-testid="flow-example"/>) : (<div className="flex aspect-[4/5] items-center justify-center p-6 text-center text-sm text-muted-foreground">No example picture yet.</div>)}
        </div>
        <div className="max-w-xl self-center">
          <p className="display text-3xl leading-tight text-balance md:text-4xl" data-testid="flow-what">
            {format.what}
          </p>
          <p className="mt-5 text-base">
            <span className="font-semibold">What you get.</span> {format.get}
          </p>
          {example && <p className="mt-3 text-sm text-muted-foreground">The picture is an example on a plain pack with no brand on it{format.group === "video" ? ", and a still, not a clip" : ""}. Yours is made with your real product.</p>}
          {advanced && <p className="mt-2 text-xs text-muted-foreground">Built on: {skillTitles(format.skills)}.</p>}
          {start.via === "screen" ? (<div className="mt-7 space-y-3">
              <p className="text-sm text-muted-foreground">{start.why}</p>
              <Button asChild size="lg" className="h-11 text-base" data-testid="flow-open">
                <Link href={start.href}>
                  Open it <ArrowRight className="size-4"/>
                </Link>
              </Button>
            </div>) : (!going && (<div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Button size="lg" className="h-11 text-base" onClick={() => setGoing(true)} data-testid="flow-generate-now">
                  Generate now <ArrowRight className="size-4"/>
                </Button>
                {own && (<Link href={own} className="inline-flex min-h-10 items-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" data-testid="flow-own">
                    Or choose each one yourself
                  </Link>)}
              </div>))}
        </div>
      </div></details>

      {going && start.via !== "screen" && (<>
          <Step n={1} title="Which product?" note="Your products, from the brand brain.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (<button key={p.id} type="button" onClick={() => setProductId(p.id)} aria-pressed={p.id === productId} className={cn("flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/60", p.id === productId && "border-primary bg-primary/5 ring-1 ring-primary")} data-testid={`flow-product-${p.id}`}>
                  {p.photo ? (<img src={productImageUrl(p.folder, p.photo, 160)} alt="" className="size-16 shrink-0 rounded-lg border bg-white object-contain"/>) : (<div className="flex size-14 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">No photo</div>)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{p.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.format}</div>
                  </div>
                </button>))}
            </div>
            {products.length === 0 && <p className="text-sm text-amber-800">This brand has no product yet. Add one on the Brand brain screen.</p>}
            <StepNote value={notes.product} onChange={(v) => setNotes((n) => ({ ...n, product: v }))} placeholder="Anything about the product: show it open, use the orange flavour, never show it in water..." testid="flow-note-product"/>
          </Step>

          {productId && (<Step n={2} title="Who is it for?" note="Your buyers in general, or 1 of your personas.">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPersonaId(null)} aria-pressed={personaId === null} className={cn("flex min-h-10 items-center gap-2 rounded-full border bg-card py-1 pl-1.5 pr-3.5 text-sm", personaId === null ? "border-primary bg-primary/5" : "hover:bg-muted")} data-testid="flow-persona-general">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                    <Users className="size-3.5"/>
                  </span>
                  Buyers in general
                  {personaId === null && <Check className="size-3.5 text-primary"/>}
                </button>
                {personas.map((p) => {
                    const on = personaId === p.id;
                    return (<button key={p.id} type="button" onClick={() => setPersonaId(p.id)} aria-pressed={on} title={p.summary} className={cn("flex min-h-10 items-center gap-2 rounded-full border bg-card py-1 pl-1.5 pr-3.5 text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted")} data-testid={`flow-persona-${p.id}`}>
                      {p.image ? (<img src={`/api/assets/${p.image}?w=64`} alt="" className="size-7 rounded-full object-cover"/>) : (<span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">{p.name.replace(/^The /, "").slice(0, 1)}</span>)}
                      {p.name}
                      {on && <Check className="size-3.5 text-primary"/>}
                    </button>);
                })}
              </div>
              <StepNote value={notes.buyer} onChange={(v) => setNotes((n) => ({ ...n, buyer: v }))} placeholder="Anything about the buyer: mothers of young children, people who gave up on powders..." testid="flow-note-buyer"/>
            </Step>)}

          {productId && (<Step n={3} title={format.count ? "How many, and what you get" : "What you get"}>
              <div className="max-w-2xl space-y-6">
                {video && <section className="space-y-3 rounded-xl border bg-muted/20 p-4" data-testid="format-character"><h3 className="text-base font-semibold">Character and optional enhancement</h3><label className="block space-y-1 text-sm">Saved avatar<select aria-label="Format avatar" className="block h-11 w-full rounded border bg-background px-2" value={avatarId} onChange={(e) => { setAvatarId(e.target.value); setCharacterReviewed(false); setHyperreal(false); }}><option value="">Someone like this buyer: their saved avatar, else a new character</option><option value="new">Design a new character for this script</option>{avatars.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{avatar ? <AvatarReview key={avatar.id} avatar={avatar} notes={characterNotes} hyperreal={hyperreal} onNotes={setCharacterNotes} onHyperreal={setHyperreal} reviewed={characterReviewed} onReview={setCharacterReviewed} live={liveImages}/> : <><label className="block text-sm">Character notes (optional)<Textarea value={characterNotes} maxLength={600} onChange={(e) => setCharacterNotes(e.target.value)} rows={2} placeholder="The adult character, wardrobe or one detail to change"/></label>{format.id === "ugc" && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={hyperreal} onChange={(e) => setHyperreal(e.target.checked)}/>Hyper-realistic skin and hair for AI UGC</label>}{hyperreal && <p className="text-xs text-muted-foreground">{HYPERREAL_DIRECTION}</p>}<p className="text-xs text-muted-foreground">{workflow === "guided" ? "Review each stage in Production. Approval starts the next step." : "AI creates the character, storyboard and finished video. You can pause from the run bar."}</p></>}</section>}
                {format.count && studio && (<div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">How many</span>
                    <div className="inline-flex items-center rounded-lg border bg-card" data-testid="flow-count">
                      <button type="button" className="p-3 hover:bg-muted disabled:opacity-30" disabled={count <= format.count.min} onClick={() => setCount((c) => c - 1)} aria-label="1 fewer" data-testid="flow-count-less">
                        <Minus className="size-4"/>
                      </button>
                      <span className="w-8 text-center text-base font-semibold" data-testid="flow-count-n">
                        {count}
                      </span>
                      <button type="button" className="p-3 hover:bg-muted disabled:opacity-30" disabled={count >= format.count.max} onClick={() => setCount((c) => c + 1)} aria-label="1 more" data-testid="flow-count-more">
                        <Plus className="size-4"/>
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format.count.min} to {format.count.max}
                    </span>
                  </div>)}
                {studio && (format.words || start.kind === "ad") && <OutputOptionsPicker value={options} onChange={setOptions} show={{ text: format.words, copy: format.words && start.kind === "ad", base: format.words, product: false }}/>}

                {studio && <TasteBar id="flow-taste" surface={studioSurface} format={format.id} hide={["words"]} value={taste} onChange={setTaste}/>}
                {!studio && <TasteBar id="flow-taste" surface="script" format={format.id} value={taste} onChange={setTaste}/>}
                {!studio && format.group === "ads" && <TasteBar id="flow-taste-pictures" surface="image_ad" format={format.id} hide={["look", "words", "sell", "spread"]} value={taste} onChange={setTaste}/>}
                {!studio && format.group === "video" && <TasteBar id="flow-taste-video" surface="shot_plan" format={format.id} hide={["look"]} value={{ product: "clear", ...taste }} onChange={setTaste}/>}
                {length && <LengthPick lengths={lengths} value={length} onChange={setLength}/>}
                {offers && <OfferPick offers={offers} value={offerId} onChange={setOfferId}/>}
                {angles && <AnglePick angles={angles} value={angleId} onChange={setAngleId}/>}
                {!studio && <HooksPicker id="flow-hooks" value={hooks} onChange={setHooks} label="Hooks for the script"/>}
                {!studio && <p className="text-sm text-muted-foreground">A script is written for this format first, then its plan. You approve the plan on the Production board before anything is made, and that is where its words and captions are set.</p>}
                {format.also && studio && (<label className="flex items-start gap-3 text-sm">
                    <Switch checked={also} onCheckedChange={setAlso} className="mt-0.5" data-testid="flow-also"/>
                    <span>
                      <span className="font-medium">{format.also.label}</span>
                      <span className="block text-xs text-muted-foreground">{format.also.what}</span>
                    </span>
                  </label>)}
                {claimable && <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="flow-claims"/>}
                <StepNote value={notes.general} onChange={(v) => setNotes((n) => ({ ...n, general: v }))} placeholder="Anything else: use this offer, don't use that one, a season, a mood, something to avoid..." testid="flow-note-general"/>
              </div>

              <div className="mt-8 max-w-2xl rounded-xl border bg-card p-6 text-[15px]" data-testid="flow-summary">
                {studio ? (<p>
                    <span className="font-medium">{count}</span> {noun}
                    {count === 1 ? "" : "s"}
                    {pictures !== count && (<>
                        , <span className="font-medium">{pictures}</span> pictures in all (each also without its words)
                      </>)}
                    {also && format.also ? ", and a short reel" : ""}.
                  </p>) : (<p>1 script{hooks > 1 ? ` with ${hooks} hooks` : ""}, then its plan to approve.</p>)}
                {studio && live && pictures > imagesLeft && <p className="mt-1 text-xs text-amber-700">{imagesLeft === 0 ? "No more images can be made right now: the image cap is reached. Raise it in Settings." : `Only ${imagesLeft} more image${imagesLeft === 1 ? "" : "s"} can be made under the image cap. Ask for fewer, or raise the cap in Settings.`}</p>}
                {!live && <p className="mt-1 text-xs text-muted-foreground">Writing is switched off on this account, so this is a sample.</p>}
                <Button size="lg" className="mt-4 h-11 text-base" onClick={generate} disabled={pending || !productId || (workflow === "guided" && !!avatar && !characterReviewed)} data-testid="flow-generate">
                  {pending && <Loader2 className="size-4 animate-spin"/>}

                  {studio ? `Generate ${count} ${noun}${count === 1 ? "" : "s"}` : format.group === "briefs" ? "Write the brief" : "Write the script and its plan"}
                </Button>
              </div>
            </Step>)}
        </>)}
    </div>);
}
