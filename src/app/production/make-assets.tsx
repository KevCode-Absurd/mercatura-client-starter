"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Check, Clapperboard, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClaimsSwitch } from "@/components/claims-switch";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { useAdvanced } from "@/components/mode";
import { FORMAT_RECIPES, OUTPUT_SPECS, recipesForBeat } from "@/lib/formats";
import { OUTPUT_INFO, OUTPUT_TYPES, humanize, type OutputType } from "@/lib/taxonomy";
import { PLAN_MODELS, SHOT_PLAN_MODELS } from "@/lib/reference-modes";
import { STORYBOARD_FRAMES, avatarKindFor, clampClips } from "@/lib/production/prompts";
import { FORMAT_LOOKS } from "@/lib/format-media";
import { cn } from "@/lib/utils";
import { createJobsAction } from "./actions";
import { DEFAULT_VIDEO_AUDIO, type VideoAudio } from "@/lib/video-audio";
import { AudioSettings } from "./audio-settings";
import { pickerDataAction, type PickerData } from "./picker-actions";
import { AvatarReview } from "@/components/avatar-review";
import { CreatorProcess } from "@/components/creator-process";
import { characterDirection } from "@/lib/creator-studio";
import { WorkflowChoice } from "@/components/workflow-choice";
import type { WorkflowMode } from "@/lib/production/workflow";
import { avatarReferenceCompatible } from "@/lib/production/types";
import { clipsText, estimateNew, groupOfType, imagesText, recipeOf, usd } from "./shared";
const READY = ["approved", "ready_for_handoff"];
const OWN_PRODUCT = "__own__";
const EDUCATION_WARNING = "Unaware and problem-aware concepts need education. Prefer longer formats unless you are testing the angle with statics first.";
const GROUPS: {
    label: string;
    group: "brief" | "image" | "video";
}[] = [
    { label: "Human briefs", group: "brief" },
    { label: "Image ads", group: "image" },
    { label: "Video", group: "video" },
];
type Line = {
    key: number;
    type: OutputType;
    recipe: string;
    preset: string;
    aspect: string;
    cards: number;
    segments: number | null;
    frames: number;
    resolution: "480p" | "720p";
    notes: string;
    count: number;
    planModel: string;
    formatLook: string;
    avatarId: string;
    newCharacter: boolean;
    avatarReferenceId: string;
    characterNotes: string;
    hyperreal: boolean;
    characterReviewed: boolean;
};
const clamp = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v)) || min));
function newLine(key: number, type: OutputType, defaults: PickerData["defaults"]): Line {
    const recipe = defaults[type];
    const group = groupOfType(type);
    return { key, type, recipe, preset: Object.keys(recipeOf(recipe)?.presets ?? { default: "" })[0], aspect: group === "video" ? "9:16" : "4:5", cards: 5, segments: null, frames: STORYBOARD_FRAMES.default, resolution: "480p", notes: "", count: 1, planModel: PLAN_MODELS[0].id, formatLook: "none", avatarId: "", newCharacter: false, avatarReferenceId: "", characterNotes: "", hyperreal: false, characterReviewed: false };
}
const keptAvatar = (data: PickerData, type: OutputType, recipe: string, avatarId: string) => (avatarId && (groupOfType(type) !== "video" || (data.avatarsByFormat[recipe] ?? []).includes(avatarId)) ? avatarId : "");
const keptReference = (data: PickerData, line: Pick<Line, "recipe" | "formatLook" | "avatarId" | "avatarReferenceId">) => avatarReferenceCompatible(line.recipe, line.formatLook) && (data.avatarReferences ?? []).some((r) => r.id === line.avatarReferenceId && r.avatarId === line.avatarId) ? line.avatarReferenceId : "";
function lineCost(l: Line, needs: number, videoModel?: string) {
    const one = estimateNew(l.recipe, { ...l, segments: l.segments ?? needs, videoModel });
    return { images: one.images * l.count, videoUsd: one.videoUsd * l.count };
}
export function MakeAssetsDialog({ open, onOpenChange, scriptId, conceptId, initialAvatarId, initialAvatarReferenceId, initialRecipe, initialCharacterNotes = "", initialHyperreal = false, initialCharacterReviewed = false, initialWorkflow = "guided" }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scriptId?: string;
    conceptId?: string;
    initialAvatarId?: string;
    initialAvatarReferenceId?: string;
    initialRecipe?: string;
    initialCharacterNotes?: string;
    initialHyperreal?: boolean;
    initialCharacterReviewed?: boolean;
    initialWorkflow?: WorkflowMode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const advanced = useAdvanced();
    const [data, setData] = useState<PickerData | null>(null);
    const [workflow, setWorkflow] = useState<WorkflowMode>(initialWorkflow);
    const [failed, setFailed] = useState(false);
    const [referenceError, setReferenceError] = useState<string | null>(null);
    const [chosen, setChosen] = useState(scriptId ?? "");
    const [useAll, setUseAll] = useState(false);
    const [lines, setLines] = useState<Line[]>([]);
    const [claimsPick, setClaimsPick] = useState<boolean | null>(null);
    const [taste, setTaste] = useState<Taste>({});
    const [productPick, setProductPick] = useState("");
    const [burnCaptions, setBurnCaptions] = useState(false);
    const [videoAudio, setVideoAudio] = useState<VideoAudio>(DEFAULT_VIDEO_AUDIO);
    const [versionPick, setVersionPick] = useState<string[]>([""]);
    const [pending, start] = useTransition();
    const nextKey = useRef(1);
    useEffect(() => {
        if (!open)
            return;
        let stop = false;
        pickerDataAction()
            .then((d) => {
            if (stop)
                return;
            setData(d);
            const type = initialRecipe ? OUTPUT_TYPES.find((t) => d.defaults[t] === initialRecipe) ?? "ai_ugc" : "human_brief_ugc";
            const line = newLine(0, type, d.defaults);
            const recipe = initialRecipe ?? line.recipe;
            const selected = (d.avatarReferences ?? []).find((r) => r.id === initialAvatarReferenceId);
            const avatarId = keptAvatar(d, type, recipe, initialAvatarId ?? selected?.avatarId ?? "");
            const avatarReferenceId = keptReference(d, { recipe, formatLook: line.formatLook, avatarId, avatarReferenceId: initialAvatarReferenceId ?? "" });
            setReferenceError(initialAvatarReferenceId && !avatarReferenceId ? "This saved setting is unavailable or does not fit this avatar and format. Close this dialog and choose a current kept setting." : null);
            setLines((cur) => {
                if (cur.length)
                    return cur;
                return [{ ...line, recipe, preset: Object.keys(recipeOf(recipe)?.presets ?? { default: "" })[0], avatarId, avatarReferenceId, characterNotes: initialCharacterNotes, hyperreal: initialHyperreal, characterReviewed: initialCharacterReviewed }];
            });
            if (!scriptId && !conceptId)
                setChosen((cur) => cur || (d.scripts.find((s) => READY.includes(s.status)) ?? d.scripts[0])?.id || "");
        })
            .catch(() => !stop && setFailed(true));
        return () => {
            stop = true;
        };
    }, [open, scriptId, conceptId, initialAvatarId, initialAvatarReferenceId, initialRecipe, initialCharacterNotes, initialHyperreal, initialCharacterReviewed]);
    const batch = !!conceptId;
    const inConcept = data?.scripts.filter((s) => s.concept_id === conceptId) ?? [];
    const approved = inConcept.filter((s) => READY.includes(s.status));
    const targets = batch ? (approved.length ? approved : useAll ? inConcept : []) : (data?.scripts.filter((s) => s.id === chosen) ?? []);
    const script = batch ? (targets[0] ?? inConcept[0]) : targets[0];
    const sorted = data ? [...data.scripts].sort((a, b) => Number(READY.includes(b.status)) - Number(READY.includes(a.status))) : [];
    const recommended = script ? recipesForBeat(script.beat) : [];
    const total = (targets.length ? targets : [script]).reduce((t, s) => lines.reduce((u, l) => ({ images: u.images + lineCost(l, s?.clips ?? 1, data?.videoModel).images, videoUsd: u.videoUsd + lineCost(l, s?.clips ?? 1, data?.videoModel).videoUsd }), t), { images: 0, videoUsd: 0 });
    const jobCount = lines.reduce((n, l) => n + l.count, 0) * targets.length;
    const left = data ? { images: Math.max(0, data.usage.imageCap - data.usage.images), videoUsd: Math.max(0, data.usage.videoCapUsd - data.usage.videoUsd) } : null;
    const over = !!left && (total.images > left.images || total.videoUsd > left.videoUsd + 1e-9);
    const hasVideo = lines.some((l) => groupOfType(l.type) === "video");
    const hasPlan = lines.some((l) => groupOfType(l.type) !== "brief");
    const hasImage = lines.some((l) => groupOfType(l.type) === "image");
    const claimChecks = claimsPick ?? script?.claims ?? data?.claims ?? false;
    const patch = (key: number, change: Partial<Line>) => setLines((cur) => cur.map((l) => {
        if (l.key !== key)
            return l;
        const next = { ...l, ...change };
        return { ...next, avatarReferenceId: data ? keptReference(data, next) : "" };
    }));
    const setType = (key: number, type: OutputType) => data && setLines((cur) => cur.map((l) => {
        if (l.key !== key)
            return l;
        const next = { ...newLine(key, type, data.defaults), notes: l.notes, count: l.count, characterNotes: l.characterNotes, hyperreal: l.hyperreal, characterReviewed: l.characterReviewed, avatarId: keptAvatar(data, type, data.defaults[type], l.avatarId), avatarReferenceId: l.avatarReferenceId };
        return { ...next, avatarReferenceId: keptReference(data, next) };
    }));
    const setRecipe = (key: number, recipe: string) => data && setLines((cur) => cur.map((l) => {
        if (l.key !== key)
            return l;
        const next = { ...l, recipe, preset: Object.keys(recipeOf(recipe)?.presets ?? { default: "" })[0], avatarId: keptAvatar(data, l.type, recipe, l.avatarId) };
        return { ...next, avatarReferenceId: keptReference(data, next) };
    }));
    const submit = () => start(async () => {
        if (referenceError)
            return void toast.error(referenceError);
        if (workflow === "guided" && lines.some((l) => groupOfType(l.type) === "video" && l.avatarId && !l.characterReviewed))
            return void toast.error("Review each selected character before creating the plan.");
        const product = productPick ? { productId: productPick } : {};
        const items = lines.map((l) => {
            const group = groupOfType(l.type);
            const avatarReference = l.avatarReferenceId ? { avatarId: l.avatarId, avatarReferenceId: l.avatarReferenceId } : {};
            const notes = [l.notes.trim(), groupOfType(l.type) === "video" ? characterDirection(l.characterNotes, l.hyperreal) : ""].filter(Boolean).join("\n") || undefined;
            if (group === "brief")
                return { type: l.type, notes, count: l.count, ...product };
            if (group === "image")
                return { type: l.type, recipe: l.recipe, preset: l.preset, aspect: l.aspect, ...(recipeOf(l.recipe)?.base === "carousel" ? { cards: l.cards } : {}), notes, count: l.count, planModel: l.planModel, taste, ...product, ...avatarReference, ...(l.formatLook !== "none" ? { formatLook: l.formatLook } : {}) };
            return { type: l.type, recipe: l.recipe, preset: l.preset, aspect: l.aspect, resolution: l.resolution, ...(l.segments ? { segments: l.segments } : {}), storyboardFrames: l.frames, notes, count: l.count, planModel: l.planModel, taste, ...product, ...avatarReference, videoAudio, ...(groupOfType(l.type) === "video" ? { workflow } : {}), ...(burnCaptions ? { burnCaptions: true } : {}), ...(l.avatarId ? { avatarId: l.avatarId } : l.newCharacter ? { avatarId: null } : {}) };
        });
        let made = 0;
        for (const s of targets) {
            const picked = !batch && (s.versions?.length ?? 0) > 1 ? s.versions.filter((v) => versionPick.includes(v.id)).map((v) => v.id) : [""];
            let failed = false;
            for (const hookId of picked.length ? picked : [""]) {
                const res = await createJobsAction(s.id, items, { claimChecks, ...(hookId ? { hookId } : {}) });
                if (!res.ok) {
                    toast.error(`${s.title}: ${res.error}`);
                    failed = true;
                    break;
                }
                made += res.ids.length;
            }
            if (failed)
                break;
        }
        if (!made)
            return;
        toast.success(`${made} job${made === 1 ? "" : "s"} created. ${hasVideo ? workflow === "guided" ? "Review your script in Production to start." : "AI is creating the finished video." : "Briefs and plans are being written now."}`);
        onOpenChange(false);
        if (pathname === "/production")
            router.refresh();
        else
            router.push("/production");
    });
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="make-assets-dialog">
        <DialogHeader>
          <DialogTitle>Make assets</DialogTitle>
          <DialogDescription>
            Pick what to make from {batch ? "this concept's scripts" : "this script"}. Each line becomes its own job on the Production board.
          </DialogDescription>
        </DialogHeader>

        {!data ? (<p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            {failed ? ("Could not load the scripts. Close this and try again.") : (<>
                <Loader2 className="size-4 animate-spin"/> Loading scripts...
              </>)}
          </p>) : (<div className="space-y-4 text-sm">
            {referenceError && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{referenceError}</p>}
            <CreatorProcess current="Format" scriptId={chosen || scriptId} avatarId={lines[0]?.avatarId || undefined}/>
            {batch ? (<div className="rounded-md bg-muted px-3 py-2" data-testid="make-assets-batch">
                {approved.length > 0 ? (<>
                    Jobs are created for the {approved.length} approved script{approved.length === 1 ? "" : "s"} in this concept: {approved.map((s) => s.title).join("; ")}.
                  </>) : inConcept.length ? (<div className="space-y-2">
                    <p>None of the {inConcept.length} script{inConcept.length === 1 ? "" : "s"} in this concept is approved yet.</p>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={useAll} onCheckedChange={(v) => setUseAll(v === true)} data-testid="make-assets-use-all"/>
                      Make assets for all {inConcept.length} script{inConcept.length === 1 ? "" : "s"} anyway
                    </label>
                  </div>) : (<>This concept has no scripts yet. Write scripts first.</>)}
              </div>) : scriptId ? (<p className="rounded-md bg-muted px-3 py-2">
                {script?.title}
              </p>) : (<div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Script (approved scripts first)</Label>
                <Select value={chosen} onValueChange={setChosen}>
                  <SelectTrigger className="w-full" data-testid="make-assets-script">
                    <SelectValue placeholder="Pick a script"/>
                  </SelectTrigger>
                  <SelectContent>
                    {sorted.map((s) => (<SelectItem key={s.id} value={s.id}>
                        {s.title} ({humanize(s.status)})
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>)}

            {script && !batch && script.versions.length > 1 && (<div className="rounded-md border p-3" data-testid="make-assets-versions">
                <p className="font-medium">Which versions</p>
                <p className="text-xs text-muted-foreground">This script has {script.versions.length} hooks and 1 body. Each version ticked is made on its own, so you get that many creatives.</p>
                <ul className="mt-2 space-y-1">
                  {script.versions.map((v) => (<li key={v.n}>
                      <label className="flex cursor-pointer items-start gap-2 text-xs">
                        <Checkbox checked={versionPick.includes(v.id)} onCheckedChange={(on) => setVersionPick((cur) => (on === true ? [...new Set([...cur, v.id])] : cur.filter((x) => x !== v.id)))} className="mt-0.5" data-testid={`make-assets-version-${v.n}`}/>
                        <span>
                          <span className="font-medium">Version {v.n}</span>
                          {v.n === 1 && <span className="text-muted-foreground"> (main)</span>}: {v.opens}
                        </span>
                      </label>
                    </li>))}
                </ul>
              </div>)}

            {hasVideo && <WorkflowChoice value={workflow} onChange={setWorkflow} disabled={pending}/>}
            {script && (<div className="space-y-2 rounded-md border p-3" data-testid="format-advice">
                <p>
                  <span className="font-medium">The {humanize(script.beat)} does most of the persuading</span>
                  {recommended.length > 0 && <>: {recommended.map((r) => r.label).join(", ")} suit it</>}.
                  {batch && targets.length > 1 && <span className="text-muted-foreground"> (Shown for the first script; other scripts may differ.)</span>}
                </p>
                {(script.awareness === "unaware" || script.awareness === "problem_aware") && (<p className="flex gap-2 text-xs text-amber-800" data-testid="education-warning">
                    <AlertTriangle className="size-4 shrink-0"/>
                    {EDUCATION_WARNING}
                  </p>)}
              </div>)}

            <div className="space-y-3">
              {lines.map((l, i) => (<LineEditor key={l.key} index={i} line={l} data={data} needs={script?.clips ?? 1} personaId={script?.persona_id ?? null} recommended={recommended.map((r) => r.id)} onType={(t) => setType(l.key, t)} onRecipe={(r) => setRecipe(l.key, r)} onPatch={(c) => patch(l.key, c)} onRemove={lines.length > 1 ? () => setLines((cur) => cur.filter((x) => x.key !== l.key)) : undefined}/>))}

              <Button size="sm" variant="outline" onClick={() => setLines((cur) => [...cur, { ...newLine(nextKey.current++, "static_image", data.defaults), avatarId: cur[cur.length - 1]?.avatarId ?? "" }])} data-testid="add-line">
                <Plus className="size-4"/>
                Add another output
              </Button>
            </div>

            {data.products.length > 1 && script && (<div data-testid="make-assets-product">
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Product</Label>
                <Select value={productPick || OWN_PRODUCT} onValueChange={(v) => setProductPick(v === OWN_PRODUCT ? "" : v)}>
                  <SelectTrigger className="w-full" data-testid="make-assets-product-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OWN_PRODUCT}>
                      {targets.length > 1 ? "Each script's own product" : `The script's own: ${data.products.find((x) => x.id === script.product_id)?.name ?? data.products[0].name}`}
                    </SelectItem>
                    {data.products.map((x) => (<SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">The product whose photos, facts and lessons the plan, the pictures and the video are made from.</p>
              </div>)}
            {(hasVideo || lines.some((l) => groupOfType(l.type) === "brief")) && (<label className="flex items-start gap-2 text-xs" data-testid="make-assets-captions">
                <Checkbox checked={burnCaptions} onCheckedChange={(v) => setBurnCaptions(v === true)} className="mt-0.5"/>
                <span>
                  {hasVideo ? "Draw the on-screen text into the video" : "Tell whoever films the brief to add captions"}
                  <span className="block text-muted-foreground">Off: the video is delivered clean, with no captions in the picture, so they can be added where the ad is edited or run. A human brief says the same. You can change this on the job later.</span>
                </span>
              </label>)}
            {hasImage && <TasteBar id="make-assets-taste" surface={lines.some((l) => recipeOf(l.recipe)?.base === "carousel") ? "carousel" : "image_ad"} stage={script?.awareness} hasReference={!!script?.hasReference} hide={["words", "spread", "sell"]} value={taste} onChange={setTaste}/>}
            {hasVideo && <TasteBar id="make-assets-taste-video" surface="shot_plan" stage={script?.awareness} hide={hasImage ? ["look", "product", "people"] : []} value={hasImage ? taste : { product: "clear", ...taste }} onChange={setTaste}/>}
            {hasVideo && <AudioSettings id="make-assets" value={videoAudio} disabled={pending} onChange={setVideoAudio}/>}
            {hasPlan && <ClaimsSwitch checked={claimChecks} onChange={setClaimsPick} testid="make-assets-claims"/>}

            {!advanced && (over || !data.live) && (<div className="space-y-1 rounded-md bg-muted px-3 py-2">
                {over && <p className="text-xs text-amber-800">This is more than can be made right now, so some of these jobs will stop part-way. Make fewer, or raise the limit in Settings.</p>}
                {!data.live && (<p className="text-xs text-amber-800" data-testid="make-assets-mock">
                    Making is switched off on this account: briefs are written in full, images are samples{hasVideo ? ", and video jobs will fail" : ", and video is not made"}.
                  </p>)}
              </div>)}
            {advanced && (<div className="space-y-1 rounded-md bg-muted px-3 py-2" data-testid="make-assets-cost">
              <p className="font-medium">
                Estimated cost of this selection: {imagesText(total.images)} and {usd(total.videoUsd)} of video
                {targets.length > 1 && ` across ${targets.length} scripts`}.
              </p>
              <p className="text-xs text-muted-foreground">
                {hasVideo ? (workflow === "automatic" ? "This starts all video stages within the account's spending caps. Failed checks pause for review." : "Each approval starts the next stage. You can pause or give feedback before continuing.") : "Planning costs a few cents and briefs are free. Images wait for plan approval."}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="make-assets-caps">
                Left before the caps: {imagesText(left!.images)} (used {data.usage.images} of {data.usage.imageCap}) and {usd(left!.videoUsd)} of video (used {usd(data.usage.videoUsd)} of ${data.usage.videoCapUsd}).
              </p>
              {over && <p className="text-xs text-amber-800">This selection goes over a cap. Jobs will stop at the cap until it is raised in .env.</p>}
              {!data.live && (<p className="text-xs text-amber-800" data-testid="make-assets-mock">
                  Demo mode: briefs are created, but images are placeholders{hasVideo ? ", and video jobs will fail because they need live mode" : ", and video needs live mode"}.
                </p>)}
            </div>)}
          </div>)}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !data || !!referenceError || !targets.length || !lines.length || (workflow === "guided" && lines.some((l) => groupOfType(l.type) === "video" && l.avatarId && !l.characterReviewed))} data-testid="make-assets-submit">
            {pending ? "Creating..." : `Create ${jobCount} job${jobCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
function LineEditor({ index, line: l, data, needs, personaId, recommended, onType, onRecipe, onPatch, onRemove }: {
    index: number;
    line: Line;
    data: PickerData;
    needs: number;
    personaId: string | null;
    recommended: string[];
    onType: (t: OutputType) => void;
    onRecipe: (r: string) => void;
    onPatch: (c: Partial<Line>) => void;
    onRemove?: () => void;
}) {
    const group = groupOfType(l.type);
    const recipe = recipeOf(l.recipe);
    const base = recipeOf(data.defaults[l.type])?.base;
    const recipes = FORMAT_RECIPES.filter((r) => l.type === "ai_cinematic" ? r.id === "cinematic" || r.id === "cinematic-duo" : r.base === base);
    const presets = Object.keys(recipe?.presets ?? {});
    const direction = recipe?.presets[l.preset];
    const ratios: readonly string[] = group === "video" ? OUTPUT_SPECS.video.ratios : OUTPUT_SPECS.image.ratios;
    const cost = lineCost(l, needs, data.videoModel);
    const clips = l.segments ?? needs;
    const advanced = useAdvanced();
    const label = "mb-1.5 block text-xs font-medium text-muted-foreground";
    const fits = group === "video" ? (data.avatarsByFormat[l.recipe] ?? []).flatMap((id) => data.avatars.filter((a) => a.id === id)) : [];
    const avatars = [...fits.filter((a) => !!personaId && a.persona_id === personaId), ...fits.filter((a) => !personaId || a.persona_id !== personaId)];
    const redrawn = !!recipe && avatarKindFor(recipe) === "character" && avatars.some((a) => a.id === l.avatarId && a.kind === "person");
    const references = (data.avatarReferences ?? []).filter((r) => group === "image" || !l.avatarId || r.avatarId === l.avatarId);
    const selectedReference = references.find((r) => r.id === l.avatarReferenceId);
    const who = (on: boolean) => cn("flex items-center gap-2 rounded-md border p-2 text-left text-xs", on ? "border-primary bg-primary/5" : "hover:bg-muted");
    return (<div className="space-y-3 rounded-md border p-3" data-testid="output-line">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <Label className={label}>Output {index + 1}</Label>
          <Select value={l.type} onValueChange={(v) => onType(v as OutputType)}>
            <SelectTrigger className="w-full" data-testid="line-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (<SelectGroup key={g.group}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {OUTPUT_TYPES.filter((t) => groupOfType(t) === g.group).map((t) => (<SelectItem key={t} value={t}>
                      {OUTPUT_INFO[t].label}
                    </SelectItem>))}
                </SelectGroup>))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Label htmlFor={`line-count-${l.key}`} className={label}>
            Count (1 to 3)
          </Label>
          <Input id={`line-count-${l.key}`} type="number" min={1} max={3} value={l.count} onChange={(e) => onPatch({ count: clamp(e.target.value, 1, 3) })} data-testid="line-count"/>
        </div>
        {onRemove && (<Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove output ${index + 1}`} data-testid="line-remove">
            <Trash2 className="size-4"/>
          </Button>)}
      </div>

      {l.type === "ai_cinematic" && (<div className="max-w-xs">
          <Label className={label}>Cast</Label>
          <Select value={l.recipe} onValueChange={onRecipe}>
            <SelectTrigger className="w-full" aria-label="Cinematic cast" data-testid="line-cinematic-cast"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cinematic">1 character</SelectItem>
              <SelectItem value="cinematic-duo">2 characters</SelectItem>
            </SelectContent>
          </Select>
        </div>)}

      {recipe?.id === "anime" && (<div className="max-w-xs">
          <Label className={label}>Anime style</Label>
          <Select value={l.preset} onValueChange={(v) => onPatch({ preset: v })}>
            <SelectTrigger className="w-full" aria-label="Anime style" data-testid="line-preset"><SelectValue /></SelectTrigger>
            <SelectContent>
              {presets.map((p) => <SelectItem key={p} value={p}>{p === "retro-ova" ? "Retro OVA" : humanize(p).replace(/-/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          {direction && <p className="mt-1.5 text-xs text-muted-foreground">{direction}</p>}
        </div>)}

      {!advanced && group === "video" && recipes.length > 1 && l.type !== "ai_cinematic" && l.type !== "ai_anime" && <div><Label className={label}>Video format</Label><Select value={l.recipe} onValueChange={onRecipe}><SelectTrigger className="w-full" data-testid="line-recipe"><SelectValue /></SelectTrigger><SelectContent>{recipes.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent></Select></div>}
      {advanced && group !== "brief" && (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className={label}>Format</Label>
            <Select value={l.recipe} onValueChange={onRecipe}>
              <SelectTrigger className="w-full" data-testid="line-recipe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (<SelectItem key={r.id} value={r.id}>
                    {r.label}
                    {recommended.includes(r.id) ? " (suits this script)" : ""}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {group === "image" && (<div>
              <Label className={label}>Creative format</Label>
              <Select value={l.formatLook} onValueChange={(v) => onPatch({ formatLook: v })}>
                <SelectTrigger className="w-full" data-testid="line-format-look">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FORMAT_LOOKS.map((f) => (<SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>)}
          {presets.length > 1 && recipe?.id !== "anime" && (<div>
              <Label className={label}>Style</Label>
              <Select value={l.preset} onValueChange={(v) => onPatch({ preset: v })}>
                <SelectTrigger className="w-full" data-testid="line-preset">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (<SelectItem key={p} value={p}>
                      {humanize(p)}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>)}
          <div>
            <Label className={label}>Shape</Label>
            <Select value={l.aspect} onValueChange={(v) => onPatch({ aspect: v })}>
              <SelectTrigger className="w-full" data-testid="line-aspect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ratios.map((r) => (<SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={label}>Prompts written by</Label>
            <Select value={l.planModel} onValueChange={(v) => onPatch({ planModel: v })}>
              <SelectTrigger className="w-full" data-testid="line-plan-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>

                {(group === "video" ? SHOT_PLAN_MODELS : PLAN_MODELS).map((m, i) => (<SelectItem key={m.id} value={m.id}>
                    {m.label}
                    {i === 0 ? " (default)" : ""}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {recipe?.base === "carousel" && (<div>
              <Label htmlFor={`line-cards-${l.key}`} className={label}>
                Cards ({OUTPUT_SPECS.image.minCards} to {OUTPUT_SPECS.image.maxCards})
              </Label>
              <Input id={`line-cards-${l.key}`} type="number" min={2} max={6} value={l.cards} onChange={(e) => onPatch({ cards: clamp(e.target.value, 2, 6) })} data-testid="line-cards"/>
            </div>)}
          {group === "video" && (<>
              <div>
                <Label htmlFor={`line-segments-${l.key}`} className={label}>
                  Clips, up to 10 seconds each
                </Label>
                <Input id={`line-segments-${l.key}`} type="number" min={1} value={clips} onChange={(e) => onPatch({ segments: clampClips(e.target.value) })} data-testid="line-segments"/>
              </div>
              <div>
                <Label className={label}>Resolution</Label>
                <Select value={l.resolution} onValueChange={(v) => onPatch({ resolution: v as Line["resolution"] })}>
                  <SelectTrigger className="w-full" data-testid="line-resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_SPECS.video.resolutions.map((r) => (<SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </>)}
        </div>)}
      {group === "video" && (<p className="text-xs text-muted-foreground" data-testid="line-length">
          {clipsText(clips)} of video.{" "}
          {clips === needs
                ? "That is what this script needs to be said whole."
                : clips < needs
                    ? `This script needs ${needs} to be said whole. With fewer, whole lines are left out and the plan says which. No line is reworded.`
                    : `This script needs ${needs}. The clips left over have no spoken line.`}
        </p>)}
      {avatars.length > 0 && (<div data-testid="line-avatar">
          <Label className={label}>Who is on screen</Label>
          <div className="grid gap-2 sm:grid-cols-2">

            <button type="button" aria-pressed={!l.avatarId && !l.newCharacter} onClick={() => onPatch({ avatarId: "", newCharacter: false })} className={who(!l.avatarId && !l.newCharacter)} data-testid="line-avatar-auto">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Check className="size-4"/>
              </span>
              <span className="min-w-0">
                <span className="block font-medium">Someone like this buyer</span>
                <span className="block text-muted-foreground">Their saved avatar where one fits, else a new character of their age and gender.</span>
              </span>
            </button>
            <button type="button" aria-pressed={!l.avatarId && l.newCharacter} onClick={() => onPatch({ avatarId: "", newCharacter: true })} className={who(!l.avatarId && l.newCharacter)} data-testid="line-avatar-new">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Plus className="size-4"/>
              </span>
              <span className="min-w-0">
                <span className="block font-medium">A new character for this video</span>
                <span className="block text-muted-foreground">Written for this script, with 3 to choose from.</span>
              </span>
            </button>
            {avatars.map((a) => (<button key={a.id} type="button" aria-pressed={l.avatarId === a.id} onClick={() => onPatch({ avatarId: a.id, newCharacter: false, characterReviewed: l.avatarId === a.id && l.characterReviewed })} className={who(l.avatarId === a.id)} data-testid="line-avatar-saved">
                <span className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {a.portrait && (<img src={`/api/assets/${a.portrait}?w=96`} alt="" className="size-full object-cover" loading="lazy"/>)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.name}</span>
                  <span className="block truncate text-muted-foreground">Voice: {a.voice}</span>
                </span>
              </button>))}
          </div>
          {redrawn && (<p className="mt-1 text-xs" data-testid="line-avatar-redrawn">
              Drawn in this format&apos;s look, as the same person.
            </p>)}
          <p className="mt-1 text-xs text-muted-foreground">A saved avatar gives this video the same face and voice as the others made with it. Avatars are added and edited on the persona sheet.</p>
          {avatars.find((a) => a.id === l.avatarId) && <AvatarReview key={l.avatarId} avatar={avatars.find((a) => a.id === l.avatarId)!} notes={l.characterNotes} hyperreal={l.hyperreal} onNotes={(characterNotes) => onPatch({ characterNotes })} onHyperreal={(hyperreal) => onPatch({ hyperreal })} reviewed={l.characterReviewed} onReview={(characterReviewed) => onPatch({ characterReviewed })} live={data.live}/>}
        </div>)}
      {group !== "brief" && avatarReferenceCompatible(l.recipe, l.formatLook) && references.length > 0 && (<div className="space-y-2" data-testid="line-avatar-reference">
          <Label className={label}>Saved setting reference</Label>
          <Select value={l.avatarReferenceId || "__none__"} onValueChange={(id) => {
                const selected = references.find((r) => r.id === id);
                onPatch({ avatarReferenceId: selected?.id ?? "", ...(selected ? { avatarId: selected.avatarId, newCharacter: false, characterReviewed: l.avatarId === selected.avatarId && l.characterReviewed } : group === "image" ? { avatarId: "" } : {}) });
            }}>
            <SelectTrigger className="w-full" aria-label="Saved setting reference"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Choose a new setting for this output</SelectItem>
              {references.map((r) => <SelectItem key={r.id} value={r.id}>{data.avatars.find((a) => a.id === r.avatarId)?.name ?? "Avatar"} · {r.setting.label} · {r.aspect}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedReference && <div className="flex items-center gap-3 rounded-md border p-2">

            <img src={`/api/assets/${selectedReference.relative}?w=160`} alt={selectedReference.setting.label} className="h-20 w-16 rounded object-cover" loading="lazy"/>
            <p className="text-xs text-muted-foreground">Use this kept frame&apos;s person, wardrobe and setting. The output can change the pose and crop.</p>
          </div>}
        </div>)}
      {group === "video" && !l.avatarId && <div className="space-y-2 rounded-md border p-3" data-testid="new-character-notes"><label className="block text-xs">Character notes before the plan<Textarea value={l.characterNotes} maxLength={600} rows={2} onChange={(e) => onPatch({ characterNotes: e.target.value })} placeholder="Describe an adult creator, wardrobe, hair or expression."/></label>{recipe?.id === "ugc" && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={l.hyperreal} onChange={(e) => onPatch({ hyperreal: e.target.checked })}/>Hyper-realistic AI UGC</label>}<p className="text-xs text-muted-foreground">Choose from the generated cast, change its notes and approve its character sheet in Production before the storyboard.</p></div>}
      {group === "video" && (<div data-testid="line-storyboard">
          <Label htmlFor={`line-frames-${l.key}`} className={label}>
            Storyboard frames for each clip ({STORYBOARD_FRAMES.min} to {STORYBOARD_FRAMES.max})
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Input id={`line-frames-${l.key}`} type="number" min={STORYBOARD_FRAMES.min} max={STORYBOARD_FRAMES.max} value={l.frames} onChange={(e) => onPatch({ frames: clamp(e.target.value, STORYBOARD_FRAMES.min, STORYBOARD_FRAMES.max) })} className="w-20" data-testid="line-frames"/>
            <p className="min-w-52 flex-1 text-xs text-muted-foreground" data-testid="line-storyboard-count">
              The whole video is storyboarded before any clip is made: {imagesText(clips * l.frames)} ({clips} clip{clips === 1 ? "" : "s"} × {l.frames} frame{l.frames === 1 ? "" : "s"}). You check and approve them first, and you can change this number on the job until they are drawn.
            </p>
          </div>
        </div>)}
      {advanced && direction && recipe?.id !== "anime" && <p className="text-xs text-muted-foreground" data-testid="preset-direction">Style direction: {direction}</p>}
      <div>
        <Label htmlFor={`line-notes-${l.key}`} className={label}>
          Notes for this output (optional)
        </Label>
        <Textarea id={`line-notes-${l.key}`} rows={2} maxLength={group === "video" ? 900 : 2000} value={l.notes} onChange={(e) => onPatch({ notes: e.target.value })} placeholder={group === "brief" ? "Anything the brief should stress" : "What to stress, or what to avoid"} data-testid="line-notes"/>
      </div>
      {advanced && (<p className="text-xs text-muted-foreground" data-testid="line-cost">
        {group === "brief"
                ? "Written from the script, concept and brand brain. No media cost."
                : group === "image"
                    ? `${imagesText(cost.images)} once the plan is approved${l.count > 1 ? ` (${l.count} separate jobs)` : ""}.`
                    : `${clipsText(clips)} of video: ${usd(cost.videoUsd)} and ${imagesText(cost.images)} for the reference frames${l.count > 1 ? ` (${l.count} separate jobs)` : ""}.`}
      </p>)}
    </div>);
}
export function MakeAssetsButton({ scriptId, conceptId, initialRecipe, label = "Make assets", size = "sm", variant = "default", icon = true, testid = "make-assets" }: {
    scriptId?: string;
    conceptId?: string;
    initialRecipe?: string;
    label?: string;
    size?: "sm" | "default" | "icon";
    variant?: "default" | "outline" | "ghost";
    icon?: boolean;
    testid?: string;
}) {
    const [open, setOpen] = useState(false);
    return (<>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} data-testid={testid} aria-label={size === "icon" ? `Make assets${scriptId ? ` from ${scriptId}` : ""}` : undefined} title={size === "icon" ? "Make assets" : undefined}>
        {icon && <Clapperboard className={size === "icon" ? "size-4" : "size-3.5"}/>}
        {size !== "icon" && label}
      </Button>
      {open && <MakeAssetsDialog open onOpenChange={setOpen} scriptId={scriptId} conceptId={conceptId} initialRecipe={initialRecipe}/>}
    </>);
}
