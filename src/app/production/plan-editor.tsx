"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import type { CardPlan, ImagePlan, ReferenceMode, Scene, VideoPlan } from "@/db/schema";
import { maxWords, mostShots, planLengths, withScenes } from "@/lib/production/prompts";
import { humanize } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { words } from "./shared";
const CTAS = ["Shop now", "Learn more", "Order now", "Get offer", "Buy now", "Sign up", "Subscribe", "See more"];
const HEADLINE_MAX = 40;
const DIRECTION_MAX = 220;
const VISUAL_MAX = 180;
const SHOT_VISUAL_MAX = 200;
const secs1 = (n: number) => String(Math.round(n * 10) / 10);
const label = "mb-1 block text-xs font-medium text-muted-foreground";
const Count = ({ n, max, unit }: {
    n: number;
    max?: number;
    unit: string;
}) => (<span className={cn("text-xs tabular-nums", max != null && n > max ? "font-medium text-amber-700" : "text-muted-foreground")}>
    {n}
    {max != null ? ` of ${max}` : ""} {unit}
  </span>);
interface EditorProps<T> {
    plan: T;
    locked: boolean;
    saving: boolean;
    onSave: (plan: T) => void;
    onDirty: (dirty: boolean) => void;
}
function SaveBar({ dirty, problems, saving, onSave, onReset }: {
    dirty: boolean;
    problems: string[];
    saving: boolean;
    onSave: () => void;
    onReset: () => void;
}) {
    return (<div className="space-y-2">
      {problems.length > 0 && (<ul className="list-disc space-y-0.5 pl-5 text-xs text-red-700" data-testid="plan-problems">
          {problems.map((p) => (<li key={p}>{p}</li>))}
        </ul>)}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={!dirty || saving || problems.length > 0} data-testid="plan-save">
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {dirty && (<>
            <Button size="sm" variant="ghost" onClick={onReset} disabled={saving}>
              Undo edits
            </Button>
            <span className="text-xs text-amber-700" data-testid="plan-unsaved">
              Unsaved edits. Save them before approving.
            </span>
          </>)}
      </div>
    </div>);
}
function FeedCopyEditor({ value, onChange }: {
    value: ImagePlan["ad_copy"];
    onChange: (copy: ImagePlan["ad_copy"]) => void;
}) {
    const change = (patch: Partial<ImagePlan["ad_copy"]>) => onChange({ ...value, ...patch });
    const headlines = [...value.headlines, "", "", ""].slice(0, Math.max(3, value.headlines.length));
    const ctas = CTAS.includes(value.cta) || !value.cta ? CTAS : [value.cta, ...CTAS];
    return (<div className="space-y-3 rounded-md border p-3" data-testid="plan-copy">
      <div className="text-xs font-medium">Copy for the Meta ad</div>
      {(["short", "medium", "long"] as const).map((k) => (<div key={k}>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Primary text, {k}</Label>
            <Count n={words(value.primary_text[k])} unit="words"/>
          </div>
          <Textarea rows={k === "short" ? 2 : k === "medium" ? 4 : 7} value={value.primary_text[k]} onChange={(e) => change({ primary_text: { ...value.primary_text, [k]: e.target.value } })} data-testid={`primary-${k}`}/>
        </div>))}
      {headlines.map((h, i) => (<div key={i}>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Headline {i + 1}</Label>
            <Count n={h.length} max={HEADLINE_MAX} unit="characters"/>
          </div>
          <Input value={h} onChange={(e) => change({ headlines: headlines.map((x, j) => (j === i ? e.target.value : x)) })} data-testid="plan-headline"/>
          {h.length > HEADLINE_MAX && <p className="mt-1 text-xs text-amber-700">About {HEADLINE_MAX} characters show. The rest is cut off.</p>}
        </div>))}
      <div>
        <Label className={label}>Description</Label>
        <Input value={value.description} onChange={(e) => change({ description: e.target.value })} data-testid="plan-description"/>
      </div>
      <div className="w-48">
        <Label className={label}>Button</Label>
        <Select value={value.cta || undefined} onValueChange={(v) => change({ cta: v })}>
          <SelectTrigger className="w-full" data-testid="plan-cta">
            <SelectValue placeholder="Pick a button"/>
          </SelectTrigger>
          <SelectContent>
            {ctas.map((c) => (<SelectItem key={c} value={c}>
                {c}
              </SelectItem>))}
          </SelectContent>
        </Select>
      </div>
    </div>);
}
export function ImagePlanEditor({ plan, locked, saving, onSave, onDirty, feedOnly = false }: EditorProps<ImagePlan> & {
    feedOnly?: boolean;
}) {
    const [draft, setDraft] = useState<ImagePlan>(plan);
    const advanced = useAdvanced();
    const dirty = JSON.stringify(draft) !== JSON.stringify(plan);
    useEffect(() => onDirty(dirty), [dirty, onDirty]);
    const card = (i: number, change: Partial<CardPlan>) => setDraft((d) => ({ ...d, cards: d.cards.map((c, j) => (j === i ? { ...c, ...change } : c)) }));
    const element = (i: number, k: number, change: Partial<CardPlan["text_elements"][number]>) => card(i, { text_elements: draft.cards[i].text_elements.map((t, j) => (j === k ? { ...t, ...change } : t)) });
    const problems: string[] = [];
    draft.cards.forEach((c, i) => {
        if (c.description.trim().length < 5)
            problems.push(`Card ${i + 1}: the description is too short.`);
        if (c.prompt.trim().length < 20)
            problems.push(`Card ${i + 1}: the art direction needs at least 20 characters.`);
        if (c.text_elements.some((t) => !t.text.trim()))
            problems.push(`Card ${i + 1}: remove the empty text line or fill it in.`);
    });
    for (const k of ["short", "medium", "long"] as const)
        if (draft.ad_copy.primary_text[k].trim().length < 10)
            problems.push(`The ${k} primary text is too short.`);
    if (!draft.ad_copy.headlines.some((h) => h.trim()))
        problems.push("Write at least 1 headline.");
    const save = () => onSave({ ...draft, ad_copy: { ...draft.ad_copy, headlines: draft.ad_copy.headlines.map((h) => h.trim()).filter(Boolean) } });
    return (<div className="space-y-4" data-testid="image-plan-editor">
      <fieldset disabled={locked || saving} className="space-y-4">
        {!feedOnly && draft.visual_direction && (<p className="text-xs text-muted-foreground">
            <span className="font-medium">Shared look:</span> {draft.visual_direction}
          </p>)}
        {!feedOnly && draft.cards.map((c, i) => (<div key={i} className="space-y-2 rounded-md border p-3" data-testid="plan-card">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>
                Card {i + 1} of {draft.cards.length}
              </span>
              <span className="text-muted-foreground">{c.purpose ? `Job of this card: ${c.purpose}` : ""}</span>
            </div>
            <div>
              <Label className={label}>What the card shows</Label>
              <Input value={c.description} onChange={(e) => card(i, { description: e.target.value })} data-testid="card-description"/>
            </div>
            <div>
              <Label className={label}>Job of this card</Label>
              <Input value={c.purpose} onChange={(e) => card(i, { purpose: e.target.value })}/>
            </div>
            {advanced && (<div>
              <Label className={label}>Art direction given to the image model</Label>
              <Textarea rows={4} value={c.prompt} onChange={(e) => card(i, { prompt: e.target.value })} data-testid="card-prompt"/>
            </div>)}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Text on the image, exactly as written</Label>
                <Count n={c.text_elements.reduce((n, t) => n + words(t.text), 0)} max={20} unit="words"/>
              </div>
              <div className="space-y-1.5">
                {c.text_elements.map((t, k) => (<div key={k} className="grid grid-cols-[1fr_7rem_9rem_auto] gap-1.5" data-testid="text-element">
                    <Input value={t.text} onChange={(e) => element(i, k, { text: e.target.value })} placeholder="Text" aria-label="Text" data-testid="text-element-text"/>
                    <Input value={t.role} onChange={(e) => element(i, k, { role: e.target.value })} placeholder="Role" aria-label="Role"/>
                    <Input value={t.placement} onChange={(e) => element(i, k, { placement: e.target.value })} placeholder="Placement" aria-label="Placement"/>
                    <Button size="sm" variant="ghost" aria-label="Remove this text" onClick={() => card(i, { text_elements: c.text_elements.filter((_, j) => j !== k) })}>
                      <Trash2 className="size-4"/>
                    </Button>
                  </div>))}
                {!c.text_elements.length && <p className="text-xs text-muted-foreground">No added text: the image carries only the pack's own printing.</p>}
                {!locked && c.text_elements.length < 12 && (<Button size="sm" variant="outline" onClick={() => card(i, { text_elements: [...c.text_elements, { text: "", role: "text", placement: "" }] })} data-testid="text-element-add">
                    <Plus className="size-3.5"/>
                    Add text
                  </Button>)}
              </div>
            </div>
          </div>))}

        <FeedCopyEditor value={draft.ad_copy} onChange={(ad_copy) => setDraft((d) => ({ ...d, ad_copy }))}/>
      </fieldset>

      {(draft.placeholders.length > 0 || draft.compliance_flags.length > 0) && (<div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          {draft.placeholders.length > 0 && (<div data-testid="plan-placeholders">
              <div className="font-medium">Still to fill in before this runs</div>
              <ul className="list-disc pl-5">
                {draft.placeholders.map((x) => (<li key={x}>{x}</li>))}
              </ul>
            </div>)}
          {draft.compliance_flags.length > 0 && (<div data-testid="plan-flags">
              <div className="font-medium">Check before publishing</div>
              <ul className="list-disc pl-5">
                {draft.compliance_flags.map((x) => (<li key={x}>{x}</li>))}
              </ul>
            </div>)}
        </div>)}

      {!locked && <SaveBar dirty={dirty} problems={problems} saving={saving} onSave={save} onReset={() => setDraft(plan)}/>}
    </div>);
}
export function VideoPlanEditor({ plan, locked, saving, onSave, onDirty, seconds = 10, mode }: EditorProps<VideoPlan> & {
    seconds?: number;
    mode?: ReferenceMode | null;
}) {
    const [draft, setDraft] = useState<VideoPlan>(plan);
    const dirty = JSON.stringify(draft) !== JSON.stringify(plan);
    useEffect(() => onDirty(dirty), [dirty, onDirty]);
    const lengths = planLengths(plan, seconds);
    const cast = (change: Partial<VideoPlan["cast"]>) => setDraft((d) => ({ ...d, cast: { ...d.cast, ...change } }));
    const scenes = (i: number, next: Scene[]) => setDraft((d) => withScenes(d, i, next));
    const scene = (i: number, k: number, change: Partial<Scene>) => scenes(i, draft.segments[i].scenes.map((s, j) => (j === k ? { ...s, ...change } : s)));
    const place = (i: number, k: number, value: string) => scenes(i, draft.segments[i].scenes.map((s, j) => {
        if (j !== k)
            return s;
        const next = { ...s };
        if (value.trim())
            next.place = value;
        else
            delete next.place;
        return next;
    }));
    const shots = !!draft.cut;
    const unit = shots ? "shot" : "scene";
    const visualMax = shots ? SHOT_VISUAL_MAX : VISUAL_MAX;
    const problems: string[] = [];
    draft.segments.forEach((s, i) => {
        if (s.scenes.some((x) => !(x.seconds > 0)))
            problems.push(`Clip ${i + 1}: every ${unit} needs a length in seconds.`);
        if (s.scenes.some((x) => x.visual.trim().length < 3))
            problems.push(`Clip ${i + 1}: every ${unit} needs a visual.`);
        if (shots && s.scenes.some((x) => !x.shot?.trim() && !(draft.cut?.cover && x.size?.trim() && x.angle?.trim() && x.move?.trim())))
            problems.push(`Clip ${i + 1}: say how every shot is filmed, like "from the chest up, the camera at counter height".`);
    });
    return (<div className="space-y-4" data-testid="video-plan-editor">
      <fieldset disabled={locked || saving} className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Visual direction for the whole video</Label>
            <Count n={draft.visual_direction.length} max={DIRECTION_MAX} unit="characters"/>
          </div>
          <Textarea rows={3} value={draft.visual_direction} onChange={(e) => setDraft((d) => ({ ...d, visual_direction: e.target.value }))} data-testid="video-direction"/>
          {draft.visual_direction.length > DIRECTION_MAX && <p className="mt-1 text-xs text-amber-700">Keep this under {DIRECTION_MAX} characters, or the plan can&apos;t be approved.</p>}
        </div>

        <div className="space-y-2 rounded-md border p-3" data-testid="plan-cast">
          <div className="text-xs font-medium">Who and what is on screen</div>
          {draft.cast.presenter && (<div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(draft.cast.presenter).map(([k, v]) => (<div key={k}>
                  <Label className={label}>Presenter: {humanize(k)}</Label>
                  <Input value={v} onChange={(e) => cast({ presenter: { ...draft.cast.presenter, [k]: e.target.value } })}/>
                </div>))}
            </div>)}
          {draft.cast.character != null && (<div>
              <Label className={label}>Character</Label>
              <Textarea rows={2} value={draft.cast.character} onChange={(e) => cast({ character: e.target.value })}/>
            </div>)}
          <div>
            <Label className={label}>Setting</Label>
            <Input value={draft.cast.setting} onChange={(e) => cast({ setting: e.target.value })} data-testid="cast-setting"/>
          </div>
          <div>
            <Label className={label}>Voice</Label>
            <Input value={draft.cast.voice_direction} onChange={(e) => cast({ voice_direction: e.target.value })}/>
          </div>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            <div>
              <Label className={label}>How the product is handled</Label>
              <Select value={draft.cast.handling} onValueChange={(v) => cast({ handling: v as VideoPlan["cast"]["handling"] })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">On display only</SelectItem>
                  <SelectItem value="hold">Held</SelectItem>
                  <SelectItem value="use">Used on camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={label}>Product details to keep exact</Label>
              <Input value={draft.cast.product_details} onChange={(e) => cast({ product_details: e.target.value })}/>
            </div>
          </div>
        </div>

        {shots && (<p className="text-xs text-muted-foreground" data-testid="plan-shots-note">
            Each clip is cut into shots. A new picture about every {draft.cut?.montage ? "second or 2" : "2 seconds"}.
          </p>)}

        {draft.segments.map((seg, i) => {
            const secs = seg.scenes.reduce((n, s) => n + (Number(s.seconds) || 0), 0);
            const spoken = seg.scenes.reduce((n, s) => n + words(s.dialogue), 0);
            const own = lengths[i] ?? seconds;
            const clipWords = maxWords(own, mode, draft.speech?.rate);
            const secsOk = Math.abs(secs - own) < 0.01;
            return (<div key={i} className="space-y-2 rounded-md border p-3" data-testid="plan-clip">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium">
                  Clip {i + 1} of {draft.segments.length}
                </span>
                <span className="flex gap-3" data-testid="clip-totals">
                  <span className={cn("tabular-nums", secsOk ? "text-muted-foreground" : "font-medium text-red-700")}>
                    {secs} of {own} seconds{secsOk ? "" : ` (must add up to ${own})`}
                  </span>
                  <span className={cn("tabular-nums", spoken <= clipWords ? "text-muted-foreground" : "font-medium text-red-700")}>
                    {spoken} of {clipWords} spoken words
                  </span>
                </span>
              </div>
              {seg.scenes.map((s, k) => {
                    const from = seg.scenes.slice(0, k).reduce((n, x) => n + (Number(x.seconds) || 0), 0);
                    const to = from + (Number(s.seconds) || 0);
                    return (<div key={k} className="space-y-1.5 rounded bg-muted/50 p-2" data-testid="plan-scene">
                  {shots && (<div className="text-xs font-medium tabular-nums" data-testid="shot-label">
                      Shot {k + 1} · {secs1(from)} to {secs1(to)}s
                    </div>)}
                  <div className="flex items-end gap-2">
                    <div className="w-24">
                      <Label className={label}>Seconds</Label>
                      <Input type="number" min={draft.cut?.montage ? 0.5 : 1} max={own} step={0.1} value={s.seconds} onChange={(e) => scene(i, k, { seconds: Number(e.target.value) })} data-testid="scene-seconds"/>
                    </div>
                    <div className="flex-1 text-right">
                      <Count n={s.visual.length} max={visualMax} unit="characters in the visual"/>
                    </div>
                    {!locked && seg.scenes.length > 1 && (<Button size="sm" variant="ghost" aria-label={`Remove this ${unit}`} onClick={() => scenes(i, seg.scenes.filter((_, j) => j !== k))}>
                        <Trash2 className="size-4"/>
                      </Button>)}
                  </div>
                  {shots && (<div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className={label}>How it is filmed</Label>
                        <Input value={s.shot ?? ""} onChange={(e) => scene(i, k, { shot: e.target.value })} placeholder="from the chest up, the camera at counter height" data-testid="scene-shot"/>
                      </div>
                      <div>
                        <Label className={label}>Place</Label>
                        <Input value={s.place ?? ""} onChange={(e) => place(i, k, e.target.value)} placeholder="only when it leaves the main place" data-testid="scene-place"/>
                      </div>
                    </div>)}
                  {shots && (s.size || s.angle || s.move) && (<p className="text-xs text-muted-foreground" data-testid="scene-cover">
                      Camera: {[s.size, s.angle, s.move].filter(Boolean).join(", ")}
                    </p>)}
                  {shots && Array.isArray(s.props) && (<p className="text-xs text-muted-foreground" data-testid="scene-props">
                      {s.props.length ? `In this shot: ${s.props.join(", ")}` : "Nothing of the product in this shot"}
                    </p>)}
                  <div>
                    <Label className={label}>What we see</Label>
                    <Textarea rows={2} value={s.visual} onChange={(e) => scene(i, k, { visual: e.target.value })} data-testid="scene-visual"/>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className={label}>Spoken line</Label>
                      <Textarea rows={2} value={s.dialogue} onChange={(e) => scene(i, k, { dialogue: e.target.value })} data-testid="scene-dialogue"/>
                    </div>
                    <div>
                      <Label className={label}>On-screen caption</Label>
                      <Textarea rows={2} value={s.overlay} onChange={(e) => scene(i, k, { overlay: e.target.value })} data-testid="scene-overlay"/>
                    </div>
                  </div>
                </div>);
                })}
              {!locked && seg.scenes.length < (shots ? mostShots(draft.cut) : 3) && (<Button size="sm" variant="outline" onClick={() => scenes(i, [...seg.scenes, { seconds: 2, visual: "", dialogue: "", overlay: "", ...(shots ? { shot: "" } : {}) }])}>
                  <Plus className="size-3.5"/>
                  Add a {unit}
                </Button>)}
            </div>);
        })}
        {draft.ad_copy && <FeedCopyEditor value={draft.ad_copy} onChange={(ad_copy) => setDraft((d) => ({ ...d, ad_copy }))}/>}
      </fieldset>
      {draft.notes && (<p className="text-xs text-muted-foreground">
          <span className="font-medium">Planner notes:</span> {draft.notes}
        </p>)}
      {!locked && <SaveBar dirty={dirty} problems={problems} saving={saving} onSave={() => onSave(draft)} onReset={() => setDraft(plan)}/>}
    </div>);
}
