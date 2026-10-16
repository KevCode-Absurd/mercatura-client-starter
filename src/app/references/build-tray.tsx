"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hammer, Loader2, Minus, Play, Plus, Send, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { ClaimsSwitch } from "@/components/claims-switch";
import { HooksPicker } from "@/components/hooks-picker";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { OutputOptionsPicker, defaultOutputOptions, picturesOf, type OutputOptions } from "@/components/output-options";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { cn } from "@/lib/utils";
import { buildFromReferencesAction } from "./build-actions";
import { ALL_BUYERS, CHOICE_LABEL, NO_OFFER, WHOLE_BRAND } from "@/lib/choices";
export interface Picked {
    id: string;
    kind: "image" | "video";
    title: string;
    note: string;
    variants: number;
    productId: string;
    personaId: string;
}
export interface BuildChoices {
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
    live: boolean;
    claims: boolean;
}
const SAME = "__same";
const OFFER_FITS = "__fits";
const ANY = "__any";
export const MAX_VARIANTS = 4;
export function NoteBox({ pick, choices, onChange, onDone, onRemove }: {
    pick: Picked;
    choices: BuildChoices;
    onChange: (p: Picked) => void;
    onDone: () => void;
    onRemove: () => void;
}) {
    const [text, setText] = useState(pick.note);
    const send = () => {
        onChange({ ...pick, note: text.trim() });
        onDone();
    };
    return (<div className="w-full max-w-xl rounded-xl border bg-background p-3 shadow-lg" data-testid="ref-note-box" data-ref-id={pick.id}>
      <div className="flex items-center gap-2">

        <img src={`/api/references/thumb/${pick.id}?w=160`} alt="" className="size-10 shrink-0 rounded border bg-muted object-cover"/>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{pick.title}</div>
          <div className="text-xs text-muted-foreground">{pick.kind === "video" ? "A video: a script is written that keeps its structure." : "An image: a static ad is built on it."}</div>
        </div>
        <button type="button" onClick={onDone} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Close the note" title="Close">
          <X className="size-4"/>
        </button>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value.slice(0, 380))} onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        }} rows={2} className="min-h-14 flex-1 text-sm" placeholder="What should this one do? Keep the layout, lead with the offer, make it for mornings... (optional)" data-testid="ref-note-text"/>
        <div className="flex flex-col gap-1.5">
          <VoiceNote onText={(t) => setText((cur) => `${cur}${cur ? " " : ""}${t}`.slice(0, 380))} testId="ref-note-voice"/>
          <Button size="sm" onClick={send} data-testid="ref-note-send" title="Keep the note">
            <Send className="size-4"/>
            Save note
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">How many</span>
        <div className="inline-flex items-center rounded-md border" data-testid="ref-note-variants">
          <button type="button" className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pick.variants <= 1} onClick={() => onChange({ ...pick, note: text.trim(), variants: pick.variants - 1 })} aria-label="1 fewer">
            <Minus className="size-3.5"/>
          </button>
          <span className="w-6 text-center text-sm font-medium" data-testid="ref-note-variants-n">
            {pick.variants}
          </span>
          <button type="button" className="p-1.5 hover:bg-muted disabled:opacity-30" disabled={pick.variants >= MAX_VARIANTS} onClick={() => onChange({ ...pick, note: text.trim(), variants: pick.variants + 1 })} aria-label="1 more" data-testid="ref-note-more">
            <Plus className="size-3.5"/>
          </button>
        </div>
        <Select value={pick.productId || SAME} onValueChange={(v) => onChange({ ...pick, note: text.trim(), productId: v === SAME ? "" : v })}>
          <SelectTrigger size="sm" className="w-44" data-testid="ref-note-product">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SAME}>The build&apos;s product</SelectItem>
            {choices.products.map((p) => (<SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>))}
            <SelectItem value={WHOLE_BRAND}>{CHOICE_LABEL[WHOLE_BRAND]}</SelectItem>
          </SelectContent>
        </Select>
        {choices.personas.length > 0 && (<Select value={pick.personaId || ANY} onValueChange={(v) => onChange({ ...pick, note: text.trim(), personaId: v === ANY ? "" : v })}>
            <SelectTrigger size="sm" className="w-44" data-testid="ref-note-persona">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any buyer</SelectItem>
              {choices.personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>))}
              <SelectItem value={ALL_BUYERS}>{CHOICE_LABEL[ALL_BUYERS]}</SelectItem>
            </SelectContent>
          </Select>)}
        <button type="button" className="ml-auto text-muted-foreground hover:text-red-700 hover:underline" onClick={onRemove} data-testid="ref-note-remove">
          Untick
        </button>
      </div>
    </div>);
}
export function BuildTray({ picks, choices, noting, onNote, onChange, onRemove, onClear }: {
    picks: Picked[];
    choices: BuildChoices;
    noting: string | null;
    onNote: (id: string | null) => void;
    onChange: (p: Picked) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
}) {
    const router = useRouter();
    const [productId, setProductId] = useState(choices.products[0]?.id ?? WHOLE_BRAND);
    const [offerId, setOfferId] = useState("");
    const [options, setOptions] = useState<OutputOptions>(defaultOutputOptions());
    const [more, setMore] = useState(false);
    const [notes, setNotes] = useState("");
    const [claimChecks, setClaimChecks] = useState(choices.claims);
    const [hooks, setHooks] = useState(1);
    const [taste, setTaste] = useState<Taste>({});
    const [pending, start] = useTransition();
    const images = picks.filter((p) => p.kind === "image");
    const videos = picks.filter((p) => p.kind === "video");
    const ads = images.reduce((n, p) => n + p.variants, 0);
    const scripts = videos.reduce((n, p) => n + p.variants, 0);
    const pictures = picturesOf(ads, 1, options);
    const open = picks.find((p) => p.id === noting);
    const build = () => start(async () => {
        const res = await buildFromReferencesAction({ picks: picks.map((p) => ({ id: p.id, note: p.note, variants: p.variants, productId: p.productId, personaId: p.personaId })), productId, ...(offerId ? { offerId } : {}), ...options, notes, claimChecks, taste, ...(videos.length ? { hooks } : {}) });
        if (!res.ok)
            return void toast.error(res.error);
        for (const line of res.said)
            toast.message(line);
        toast.success([res.ads ? `${res.ads} ad${res.ads === 1 ? "" : "s"} started` : "", res.scripts ? `${res.scripts} script${res.scripts === 1 ? "" : "s"} being written` : ""].filter(Boolean).join(", ") + ".");
        onClear();
        router.push(res.sets.length === 1 ? `/studio/${res.sets[0]}` : res.sets.length ? "/studio" : "/scripts");
    });
    return (<div className="sticky z-20 -mx-6 mt-4 space-y-2 px-6 pb-3" style={{ bottom: "var(--run-bar, 0px)" }} data-testid="build-tray">
      {open && (<div className="flex justify-center">
          <NoteBox key={open.id} pick={open} choices={choices} onChange={onChange} onDone={() => onNote(null)} onRemove={() => onRemove(open.id)}/>
        </div>)}
      <div className="rounded-xl border bg-background p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto" data-testid="tray-picks">
            {picks.map((p) => (<button key={p.id} type="button" onClick={() => onNote(noting === p.id ? null : p.id)} title={p.note ? `${p.title}: ${p.note}` : `${p.title}: add a note`} className={cn("relative shrink-0 rounded border", noting === p.id ? "border-primary ring-1 ring-primary" : "hover:border-primary/60")} data-testid="tray-pick" data-ref-id={p.id}>

                <img src={`/api/references/thumb/${p.id}?w=160`} alt={p.title} className="size-11 rounded object-cover"/>
                {p.kind === "video" && <Play className="absolute bottom-0.5 left-0.5 size-3 rounded-sm bg-black/70 p-0.5 text-white"/>}
                {p.variants > 1 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">×{p.variants}</span>}
                {p.note && <span className="absolute -bottom-1 -right-1 size-2.5 rounded-full border border-background bg-emerald-500" title="Has a note"/>}
              </button>))}
          </div>
          <div className="text-sm" data-testid="tray-count">
            <span className="font-medium">{picks.length}</span> reference{picks.length === 1 ? "" : "s"}
            <span className="text-muted-foreground">
              {" "}
              · {[ads ? `${ads} ad${ads === 1 ? "" : "s"}, ${pictures} picture${pictures === 1 ? "" : "s"}` : "", scripts ? `${scripts} script${scripts === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger size="sm" className="w-48" data-testid="tray-product" aria-label="Product">
                <SelectValue placeholder="Which product?"/>
              </SelectTrigger>
              <SelectContent>
                {choices.products.map((p) => (<SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>))}
                <SelectItem value={WHOLE_BRAND}>{CHOICE_LABEL[WHOLE_BRAND]}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={offerId || OFFER_FITS} onValueChange={(v) => setOfferId(v === OFFER_FITS ? "" : v)}>
              <SelectTrigger size="sm" className="w-44" data-testid="tray-offer" aria-label="Offer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OFFER_FITS}>The offer that fits</SelectItem>
                {choices.offers.map((o) => (<SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>))}
                <SelectItem value={NO_OFFER}>{CHOICE_LABEL[NO_OFFER]}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setMore((m) => !m)} aria-expanded={more} data-testid="tray-options">
              <SlidersHorizontal className="size-4"/>
              Options
            </Button>
            <Button size="sm" variant="ghost" onClick={onClear} data-testid="tray-clear">
              Clear
            </Button>
            <Button size="sm" onClick={build} disabled={pending || !productId} data-testid="tray-build">
              {pending ? <Loader2 className="size-4 animate-spin"/> : <Hammer className="size-4"/>}
              Build
            </Button>
          </div>
        </div>
        {more && (<div className="mt-3 grid gap-4 border-t pt-3 md:grid-cols-2" data-testid="tray-more">
            <div className="space-y-2">
              <TasteBar id="tray-taste" surface={images.length ? "image_ad" : "script"} hasReference hide={["words"]} value={taste} onChange={setTaste}/>
              {images.length > 0 && <OutputOptionsPicker value={options} onChange={setOptions} show={{ text: true, copy: true, base: true, product: false }}/>}
              <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="tray-claims"/>
              {videos.length > 0 && <HooksPicker id="tray-hooks" value={hooks} onChange={setHooks} label="Hooks for each script"/>}
            </div>
            <div>
              <div className="text-sm font-medium">A note for all of them</div>
              <Textarea className="mt-1.5 text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 1200))} placeholder="An offer to use or to leave out, a season, something to stress or avoid (optional)" data-testid="tray-notes"/>
            </div>
          </div>)}
        <p className="mt-2 text-xs text-muted-foreground">
          {choices.live ? `${!images.length ? "Build writes a script for each reference you ticked. No picture or video is made yet." : !videos.length ? "Build writes the plan for each ad and makes the images straight after it." : "Build writes a script for each video you ticked. For each image it writes the plan and makes the picture straight after it."} Each one is built on its reference, with your note. How close it stays is under Options.` : "Writing is switched off on this account, so this is a sample."}
          {!choices.products.length && " This brand has no product yet: add one on the Brand brain screen."}
        </p>
      </div>
    </div>);
}
