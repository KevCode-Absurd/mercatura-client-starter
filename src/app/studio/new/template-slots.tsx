"use client";
import { ImageOff, Plus, Repeat2, X } from "lucide-react";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PDP_BUCKETS, pdpBucket } from "@/lib/library/buckets";
import { cn } from "@/lib/utils";
import type { RefCard } from "../actions";
import { frameUrl, mediaUrl, thumbUrl } from "../shared";
export interface Slot {
    bucket: string;
    on: boolean;
    ref: RefCard | null;
    direction: string;
}
export interface Extra extends RefCard {
    direction: string;
}
export const MAX_IMAGES = 12;
export function TemplateSlots({ slots, extras, onSlots, onExtras, onSwap, onAdd }: {
    slots: Slot[];
    extras: Extra[];
    onSlots: (next: Slot[]) => void;
    onExtras: (next: Extra[]) => void;
    onSwap: (bucket: string) => void;
    onAdd: () => void;
}) {
    const advanced = useAdvanced();
    const count = slots.filter((s) => s.on).length + extras.length;
    const set = (bucket: string, patch: Partial<Slot>) => onSlots(slots.map((s) => (s.bucket === bucket ? { ...s, ...patch } : s)));
    return (<div className="mt-3 space-y-3" data-testid="template-slots">
      <p className="text-xs text-muted-foreground">
        The template is a starting structure, not a design. Each image keeps the frame&apos;s job and bends the rest to your product: fewer points, a different split, another kind of proof.{" "}
        <a href={frameUrl("framework")} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          See all 12 frames on 1 sheet
        </a>
      </p>
      <ol className="space-y-3">
        {slots.map((s) => {
            const b = PDP_BUCKETS.find((x) => x.id === s.bucket)!;
            const full = !s.on && count >= MAX_IMAGES;
            return (<li key={s.bucket} className={cn("rounded-lg border p-3", !s.on && "bg-muted/30")} data-testid="slot" data-bucket={s.bucket} data-on={s.on}>
              <div className="grid gap-4 md:grid-cols-[9rem_9rem_minmax(0,1fr)]">

                <figure className={cn(!s.on && "opacity-50")}>
                  <a href={frameUrl(s.bucket)} target="_blank" rel="noreferrer" title="Open the template frame at full size">

                    <img src={frameUrl(s.bucket)} alt={`Template frame: ${b.title}`} className="aspect-square w-full rounded border bg-white object-cover" loading="lazy"/>
                  </a>
                  <figcaption className="mt-1 text-[11px] text-muted-foreground">Template frame</figcaption>
                </figure>


                <figure className={cn(!s.on && "opacity-50")} data-testid="slot-ref" data-ref={s.ref?.id ?? ""}>
                  {s.ref ? (<a href={mediaUrl(s.ref.id)} target="_blank" rel="noreferrer" title="Open the reference at full size">

                      <img src={thumbUrl(s.ref.id)} alt={`Reference for ${b.title}`} className="aspect-square w-full rounded border bg-muted object-cover" loading="lazy"/>
                    </a>) : (<div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded border border-dashed bg-muted/40 p-2 text-center text-[11px] text-muted-foreground">
                      <ImageOff className="size-4"/>
                      No example: built from the frame alone
                    </div>)}
                  <figcaption className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <button type="button" className="flex items-center gap-1 hover:text-foreground hover:underline" onClick={() => onSwap(s.bucket)} disabled={!s.on} data-testid="slot-swap">
                      <Repeat2 className="size-3"/>
                      {s.ref ? "Swap" : "Pick an example"}
                    </button>
                    {s.ref && (<button type="button" className="flex items-center gap-1 hover:text-foreground hover:underline" onClick={() => set(s.bucket, { ref: null })} disabled={!s.on} title="Build this image from the frame alone" data-testid="slot-noref">
                        <X className="size-3"/>
                        None
                      </button>)}
                  </figcaption>
                </figure>


                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn(!s.on && "opacity-60")}>
                      <div className="text-sm font-medium leading-tight">
                        {b.n}. {b.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{b.question}</div>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {s.on ? "In the set" : full ? "Set is full" : "Left out"}
                      <Switch checked={s.on} disabled={full} onCheckedChange={(on) => set(s.bucket, { on })} aria-label={`${s.on ? "Leave out" : "Include"} ${b.title}`} data-testid="slot-toggle"/>
                    </label>
                  </div>
                  {s.on && (<>
                      <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <div>
                          <dt className="inline font-medium text-foreground/80">Needs: </dt>
                          <dd className="inline">{b.needs}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-foreground/80">How it bends: </dt>
                          <dd className="inline">{b.flex}</dd>
                        </div>
                        {s.ref && (<div title={s.ref.why}>
                            <dt className="inline font-medium text-foreground/80">Example: </dt>
                            <dd className="inline">
                              {s.ref.brand ? `${s.ref.brand}. ` : ""}
                              {s.ref.reason}
                            </dd>
                          </div>)}
                      </dl>
                      {advanced && <Textarea className="mt-2 min-h-12 text-xs md:text-xs" placeholder="Your direction for this image (optional): what to say, what to show, what to leave out" value={s.direction} onChange={(e) => set(s.bucket, { direction: e.target.value.slice(0, 600) })} data-testid="slot-direction"/>}
                    </>)}
                </div>
              </div>
            </li>);
        })}
      </ol>


      {extras.length > 0 && (<ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="extras">
          {extras.map((p) => (<li key={p.id} className="flex gap-3 rounded-lg border p-3" data-testid="extra">
              <a href={mediaUrl(p.id)} target="_blank" rel="noreferrer" className="shrink-0">

                <img src={thumbUrl(p.id)} alt={`${p.label} reference`} className="size-24 rounded border bg-muted object-cover" loading="lazy"/>
              </a>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-1">
                  <div className="text-sm font-medium leading-tight">{pdpBucket(p.bucket)?.title ?? p.label}</div>
                  <button type="button" aria-label="Remove" title="Remove" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onExtras(extras.filter((x) => x.id !== p.id))} data-testid="extra-remove">
                    <X className="size-3.5"/>
                  </button>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">Extra image. {p.reason}</p>
                {advanced && <Textarea className="mt-1.5 min-h-10 text-xs md:text-xs" placeholder="Your direction (optional)" value={p.direction} onChange={(e) => onExtras(extras.map((x) => (x.id === p.id ? { ...x, direction: e.target.value.slice(0, 600) } : x)))}/>}
              </div>
            </li>))}
        </ul>)}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={onAdd} disabled={count >= MAX_IMAGES} data-testid="pick-add">
          <Plus className="size-4"/>
          Add an image outside the template
        </Button>
        <span className="text-xs text-muted-foreground" data-testid="slot-count">
          {count} of {MAX_IMAGES} images
        </span>
      </div>
    </div>);
}
