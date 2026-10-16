"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuyerPicker, OfferPicker, SubjectPicker } from "@/components/choice-pickers";
import { ClaimsSwitch } from "@/components/claims-switch";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { STAGE_CHOICES } from "@/lib/chat/skill-calls";
import { ALL_BUYERS, NO_OFFER, WHOLE_BRAND } from "@/lib/choices";
import { CLOSENESS, CLOSENESS_DEFAULT, CLOSENESS_INFO, MAX_STATICS, MAX_VIDEOS, STATIC_SIZES, VIDEO_SIZES, firstFormat, refFormat, suggestedFor, type Closeness, type MadeFromReference, type RefFormat, type RefFormats, type RefPart, type RefReading } from "@/lib/references/reading-types";
import type { ProductInPicture } from "@/lib/product-in-picture";
import { LENGTH_PRESETS, type LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { makeFromReferenceFlowAction, readReferenceAction, readingStateAction, type ReadingState } from "../../make-actions";
const NOTE_MAX = 600;
const AUTO_STAGE = "__auto";
const PRODUCT_IN: {
    id: ProductInPicture;
    label: string;
    hint: string;
}[] = [
    { id: "shown", label: "Show the product", hint: "Your product, drawn from its own photos, where this ad shows a product." },
    { id: "background", label: "In the background", hint: "Your product is in the scene, small, drawn from its own photos." },
    { id: "none", label: "Leave the product out", hint: "No product in the picture, and none of its photos are sent." },
    { id: "auto", label: "Decide by where the buyer is", hint: "Left out for a buyer who does not know the problem yet. Shown once they are comparing or know the product." },
];
const SIZE_LABEL: Record<string, string> = { "4:5": "Feed (4:5)", "1:1": "Square (1:1)", "9:16": "Story and Reels (9:16)", "16:9": "Wide (16:9)" };
interface Reference {
    id: string;
    kind: string;
    label: string;
    seconds: number | null;
    hasMedia: boolean;
    analyzed: boolean;
    stage: string;
    mechanism: string;
    principles: string;
    transcript: string;
    copy: string;
}
interface Props {
    reference: Reference;
    formats: RefFormat[];
    reading: RefReading | null;
    suggested: RefFormats | null;
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
        stage: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    live: boolean;
    claims: boolean;
}
const card = (on: boolean) => cn("flex w-full cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left text-sm transition-colors", on ? "border-primary bg-primary/5" : "hover:bg-muted/50");
const stageName = (id: string) => STAGE_CHOICES.find((s) => s.id === id)?.label.toLowerCase() ?? "";
function Step({ n, title, children }: {
    n: number;
    title: string;
    children: React.ReactNode;
}) {
    return (<section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>);
}
function Parts({ title, parts, testId }: {
    title: string;
    parts: RefPart[];
    testId: string;
}) {
    if (!parts.length)
        return null;
    return (<div data-testid={testId}>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="space-y-2">
        {parts.map((p, i) => (<li key={i} className="text-sm">
            {p.at && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{p.at}</span>}
            <span className="font-medium">{p.part}</span>
            {p.why && <span className="block text-muted-foreground">{p.why}</span>}
          </li>))}
      </ul>
    </div>);
}
function FormatChoice({ medium, formats, suggested, value, onChange, finding }: {
    medium: "image" | "video";
    formats: RefFormat[];
    suggested: RefFormats | null;
    value: string;
    onChange: (id: string) => void;
    finding: boolean;
}) {
    const picks = suggestedFor(formats, suggested?.picks, medium).slice(0, 3);
    const all = formats.filter((f) => f.medium === medium);
    const listed = picks.some((p) => p.id === value);
    return (<div className="space-y-2" data-testid={`make-ref-formats-${medium}`}>
      <Label>Format</Label>
      {finding && !picks.length && (<p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin"/> Finding the formats that suit this ad…
        </p>)}
      {picks.length > 0 && (<div className="grid gap-2 sm:grid-cols-3">
          {picks.map((f, i) => (<button type="button" key={f.id} className={card(value === f.id)} onClick={() => onChange(f.id)} data-testid={`make-ref-format-${f.id}`} aria-pressed={value === f.id}>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 font-medium">
                  {f.label}
                  {i === 0 && (<span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                      <Sparkles className="size-3"/> Recommended
                    </span>)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{f.why || f.when}</span>
              </span>
            </button>))}
        </div>)}
      <Select value={listed ? "" : value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-80" data-testid={`make-ref-format-all-${medium}`}>
          <SelectValue placeholder={picks.length ? "Or choose another format" : "Choose a format"}/>
        </SelectTrigger>
        <SelectContent>
          {all.map((f) => (<SelectItem key={f.id} value={f.id}>
              {f.label}
            </SelectItem>))}
        </SelectContent>
      </Select>
      {!listed && refFormat(formats, value) && <p className="text-xs text-muted-foreground">{refFormat(formats, value)!.when}</p>}
    </div>);
}
export function MakeFromReferenceView({ reference: ref, formats, reading: reading0, suggested: suggested0, products, personas, offers, live, claims }: Props) {
    const advanced = useAdvanced();
    const video = ref.kind === "video";
    const [state, setState] = useState<ReadingState>({ reading: reading0, formats: suggested0, working: false, failed: "", blocked: ref.analyzed ? "" : "This ad has to be analysed first, so its words and its pictures are known." });
    const [closeness, setCloseness] = useState<Closeness>(CLOSENESS_DEFAULT);
    const [productId, setProductId] = useState(products[0]?.id ?? WHOLE_BRAND);
    const [personaId, setPersonaId] = useState((personas.find((p) => p.stage && p.stage === ref.stage) ?? personas[0])?.id ?? ALL_BUYERS);
    const [offerId, setOfferId] = useState(offers.length ? "" : NO_OFFER);
    const [stage, setStage] = useState("");
    const [note, setNote] = useState("");
    const [wantStatic, setWantStatic] = useState(!video || !live);
    const [wantVideo, setWantVideo] = useState(video && live);
    const [staticFormat, setStaticFormat] = useState(firstFormat(formats, suggested0?.picks, "image")?.id ?? "");
    const [videoFormat, setVideoFormat] = useState(firstFormat(formats, suggested0?.picks, "video")?.id ?? "");
    const [staticCount, setStaticCount] = useState(1);
    const [sizes, setSizes] = useState<string[]>(["4:5"]);
    const [productPick, setProductPick] = useState<ProductInPicture | null>(null);
    const [videoCount, setVideoCount] = useState(1);
    const [videoSize, setVideoSize] = useState("9:16");
    const [length, setLength] = useState<LengthPreset>("30s");
    const [hooks, setHooks] = useState(1);
    const [keepWords, setKeepWords] = useState(false);
    const [claimChecks, setClaimChecks] = useState(claims);
    const [made, setMade] = useState<MadeFromReference | null>(null);
    const [pending, start] = useTransition();
    const touched = useRef({ image: false, video: false });
    const asked = useRef(false);
    useEffect(() => {
        if (asked.current || !ref.analyzed)
            return;
        asked.current = true;
        readReferenceAction(ref.id).then((r) => {
            if (r.ok)
                setState(r.state);
            else
                setState((s) => ({ ...s, failed: r.error }));
        });
    }, [ref.id, ref.analyzed]);
    useEffect(() => {
        if (!state.working)
            return;
        const t = setInterval(() => readingStateAction(ref.id).then((r) => r.ok && setState(r.state)), 3000);
        return () => clearInterval(t);
    }, [state.working, ref.id]);
    useEffect(() => {
        if (!state.formats)
            return;
        if (!touched.current.image)
            setStaticFormat((cur) => firstFormat(formats, state.formats?.picks, "image")?.id ?? cur);
        if (!touched.current.video)
            setVideoFormat((cur) => firstFormat(formats, state.formats?.picks, "video")?.id ?? cur);
    }, [state.formats, formats]);
    const info = CLOSENESS_INFO[closeness];
    const stillSends = refFormat(formats, staticFormat)?.how === "idea" || video ? info.idea : info.image;
    const productIn: ProductInPicture = productPick ?? (!video && refFormat(formats, staticFormat)?.how !== "idea" && refFormat(formats, staticFormat)?.how !== "script" ? "shown" : "auto");
    const vFormat = refFormat(formats, videoFormat);
    const lengths = useMemo(() => (vFormat?.lengths?.length ? LENGTH_PRESETS.filter((l) => vFormat.lengths!.includes(l)) : [...LENGTH_PRESETS]), [vFormat]);
    const fixedLength = closeness === "recreate" && video;
    const persona = personas.find((p) => p.id === personaId);
    const stageHint = [ref.stage ? `This ad speaks to a ${stageName(ref.stage)} buyer.` : "", !stage && persona?.stage ? `${persona.name} is ${stageName(persona.stage)}, so the new ad is written for that.` : ""].filter(Boolean).join(" ");
    const noOfferFits = (stage || persona?.stage) === "unaware" && offerId !== NO_OFFER;
    const nothing = !wantStatic && !wantVideo;
    const summary = [wantStatic ? `${staticCount} static ad${staticCount === 1 ? "" : "s"} in ${sizes.length} size${sizes.length === 1 ? "" : "s"}` : "", wantVideo ? `${videoCount} video script${videoCount === 1 ? "" : "s"}, each with its plan` : ""].filter(Boolean).join(" and ");
    const run = () => start(async () => {
        const res = await makeFromReferenceFlowAction({
            referenceId: ref.id,
            closeness,
            productId,
            personaId,
            offerId,
            stage,
            note,
            ...(wantStatic ? { statics: { formatId: staticFormat, count: staticCount, sizes, productInPicture: productIn } } : {}),
            ...(wantVideo ? { videos: { formatId: videoFormat, count: videoCount, size: videoSize, ...(fixedLength ? {} : { length: lengths.includes(length) ? length : lengths[0] }), hooks, ...(keepWords ? { keepWords: true } : {}) } } : {}),
            claimChecks,
        });
        if (res.ok)
            setMade(res);
        else
            toast.error(res.error);
    });
    return (<div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" data-testid="make-ref">

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="overflow-hidden rounded-lg border bg-muted/30">
          {ref.hasMedia ? (video ? (<video src={`/api/references/media/${ref.id}`} poster={`/api/references/thumb/${ref.id}`} controls preload="none" className="max-h-[52vh] w-full bg-black"/>) : (<img src={`/api/references/media/${ref.id}`} alt="" className="max-h-[52vh] w-full object-contain"/>)) : (<img src={`/api/references/thumb/${ref.id}`} alt="" className="max-h-[40vh] w-full object-contain" onError={(e) => (e.currentTarget.parentElement!.style.display = "none")}/>)}
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4" data-testid="make-ref-reading">
          <div>
            <div className="text-sm font-semibold">{ref.label}</div>
            <div className="text-xs text-muted-foreground">
              {video ? `Video ad${ref.seconds ? `, ${Math.round(ref.seconds)} seconds` : ""}` : "Image ad"}
              {ref.stage ? `. Written for a ${stageName(ref.stage)} buyer.` : ""}
            </div>
          </div>
          {state.blocked ? (<p className="text-sm text-amber-700" data-testid="make-ref-blocked">
              {state.blocked}
            </p>) : (<>
              {state.reading?.summary && <p className="text-sm">{state.reading.summary}</p>}
              {ref.mechanism && (<div>
                  <div className="mb-0.5 text-xs font-medium text-muted-foreground">Why it works</div>
                  <p className="text-sm">{ref.mechanism}</p>
                </div>)}
              {state.working && !state.reading && (<p className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="make-ref-reading-working">
                  <Loader2 className="size-3.5 animate-spin"/> Finding its best parts…
                </p>)}
              <Parts title="Its best parts" parts={state.reading?.best ?? []} testId="make-ref-best"/>
              <Parts title="What did not work" parts={state.reading?.weak ?? []} testId="make-ref-weak"/>
              {state.failed && (<p className="text-xs text-amber-700" data-testid="make-ref-reading-failed">
                  The best parts could not be found just now. You can still make the ad.
                </p>)}
              {!live && !state.reading && <p className="text-xs text-muted-foreground">Its best parts are found when the app is running on live models.</p>}
              {(ref.transcript || ref.copy) && (<details className="text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">{video ? "Everything that is said" : "The words on it"}</summary>
                  <p className="mt-1.5 max-h-72 overflow-y-auto text-sm whitespace-pre-line" data-testid="make-ref-transcript">
                    {video ? ref.transcript || ref.copy : ref.copy}
                  </p>
                </details>)}
            </>)}
        </div>
      </aside>


      {made ? (<div className="space-y-3 self-start rounded-lg border bg-card p-5" data-testid="make-ref-made">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Check className="size-4 text-primary"/> Started
          </h2>
          {made.sets.length > 0 && (<p className="text-sm">
              Your static ads are being planned and made.{" "}
              {made.sets.map((id) => (<Link key={id} href={`/studio/${id}`} className="underline" data-testid="make-ref-open-set">
                  Open them
                </Link>))}
            </p>)}
          {made.scripts > 0 && (<p className="text-sm">
              {made.scripts === 1 ? "The script is" : `The ${made.scripts} scripts are`} being written and will appear in{" "}
              <Link href="/scripts" className="underline">
                Scripts
              </Link>
              . Each one&apos;s plan then appears on the{" "}
              <Link href="/production" className="underline">
                Production board
              </Link>{" "}
              for you to approve.
            </p>)}
          {made.said.map((s) => (<p key={s} className="text-sm text-amber-700">
              {s}
            </p>))}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setMade(null)} data-testid="make-ref-again">
              Make another from this ad
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/references">Back to References</Link>
            </Button>
          </div>
        </div>) : (<div className="space-y-4">
          <Step n={1} title="How close should it stay?">
            <div className="grid gap-2 sm:grid-cols-3">
              {CLOSENESS.map((c) => (<button type="button" key={c} className={card(closeness === c)} onClick={() => setCloseness(c)} data-testid={`make-ref-close-${c}`} aria-pressed={closeness === c}>
                  <span>
                    <span className="font-medium">{CLOSENESS_INFO[c].label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{CLOSENESS_INFO[c].line}</span>
                  </span>
                </button>))}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="make-ref-close-sends">
              {wantVideo && !wantStatic ? info.video : wantStatic && !wantVideo ? stillSends : `Static: ${stillSends} Video: ${info.video}`}
            </p>
          </Step>

          <Step n={2} title="What it is about, and who it is for">
            <div className="grid gap-3 sm:grid-cols-2">
              <SubjectPicker products={products} value={productId} onChange={setProductId} testId="make-ref-subject"/>
              <BuyerPicker personas={personas} value={personaId} onChange={setPersonaId} testId="make-ref-buyer"/>
              <div>
                <OfferPicker offers={offers} value={offerId} onChange={setOfferId} testId="make-ref-offer"/>
                {noOfferFits && <p className="mt-1.5 text-xs text-muted-foreground">A buyer who does not see the problem yet is rarely ready for a deal. No offer is the usual choice here.</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Where the buyer is</Label>
                <Select value={stage || AUTO_STAGE} onValueChange={(v) => setStage(v === AUTO_STAGE ? "" : v)}>
                  <SelectTrigger className="w-full" data-testid="make-ref-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_STAGE}>Follow the buyer chosen</SelectItem>
                    {STAGE_CHOICES.map((s) => (<SelectItem key={s.id} value={s.id}>
                        {s.label}: {s.hint.toLowerCase()}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
                {stageHint && <p className="text-xs text-muted-foreground">{stageHint}</p>}
              </div>
            </div>
          </Step>

          <Step n={3} title="What to make">
            <div className="space-y-3">
              <div className={cn("space-y-3 rounded-md border p-3", wantStatic && "border-primary/50")}>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={wantStatic} onChange={(e) => setWantStatic(e.target.checked)} data-testid="make-ref-want-static"/>
                  Static ads
                </label>
                {wantStatic && (<>
                    <FormatChoice medium="image" formats={formats} suggested={state.formats} value={staticFormat} finding={state.working} onChange={(id) => {
                    touched.current.image = true;
                    setStaticFormat(id);
                }}/>
                    <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                      <div className="space-y-1.5">
                        <Label>How many</Label>
                        <Select value={String(staticCount)} onValueChange={(v) => setStaticCount(Number(v))}>
                          <SelectTrigger className="w-full" data-testid="make-ref-static-count">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: MAX_STATICS }, (_, i) => i + 1).map((x) => (<SelectItem key={x} value={String(x)}>
                                {x}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sizes</Label>
                        <div className="flex flex-wrap gap-2">
                          {STATIC_SIZES.map((s) => {
                    const on = sizes.includes(s);
                    return (<button type="button" key={s} aria-pressed={on} onClick={() => setSizes((cur) => (on ? (cur.length > 1 ? cur.filter((x) => x !== s) : cur) : [...cur, s]))} className={cn("rounded-md border px-2.5 py-1.5 text-xs", on ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50")} data-testid={`make-ref-size-${s.replace(":", "x")}`}>
                                {SIZE_LABEL[s]}
                              </button>);
                })}
                        </div>
                        <p className="text-xs text-muted-foreground">Every ad is made in every size you pick.</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>The product in the picture</Label>
                      <Select value={productIn} onValueChange={(v) => setProductPick(v as ProductInPicture)}>
                        <SelectTrigger className="w-full sm:max-w-xs" data-testid="make-ref-product-in">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRODUCT_IN.map((p) => (<SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{PRODUCT_IN.find((p) => p.id === productIn)?.hint}</p>
                    </div>
                  </>)}
              </div>

              <div className={cn("space-y-3 rounded-md border p-3", wantVideo && "border-primary/50")}>
                <label className={cn("flex items-center gap-2 text-sm font-medium", live ? "cursor-pointer" : "text-muted-foreground")}>
                  <input type="checkbox" checked={wantVideo} disabled={!live} onChange={(e) => setWantVideo(e.target.checked)} data-testid="make-ref-want-video"/>
                  Video
                </label>
                {!live && (<p className="text-xs text-muted-foreground" data-testid="make-ref-video-off">
                    {advanced ? "A video starts with a script, and scripts are written in live mode (LLM_MODE=live and an API key in .env)." : "A video starts with a script, and script writing is not switched on here."}
                  </p>)}
                {wantVideo && (<>
                    <FormatChoice medium="video" formats={formats} suggested={state.formats} value={videoFormat} finding={state.working} onChange={(id) => {
                    touched.current.video = true;
                    setVideoFormat(id);
                }}/>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1.5">
                        <Label>How many</Label>
                        <Select value={String(videoCount)} onValueChange={(v) => setVideoCount(Number(v))}>
                          <SelectTrigger className="w-full" data-testid="make-ref-video-count">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: MAX_VIDEOS }, (_, i) => i + 1).map((x) => (<SelectItem key={x} value={String(x)}>
                                {x}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Length</Label>
                        {fixedLength ? (<p className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground" data-testid="make-ref-length-fixed">
                            Same as the ad{ref.seconds ? ` (${Math.round(ref.seconds)}s)` : ""}
                          </p>) : (<Select value={lengths.includes(length) ? length : lengths[0]} onValueChange={(v) => setLength(v as LengthPreset)}>
                            <SelectTrigger className="w-full" data-testid="make-ref-length">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {lengths.map((l) => (<SelectItem key={l} value={l}>
                                  {l}
                                </SelectItem>))}
                            </SelectContent>
                          </Select>)}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shape</Label>
                        <Select value={videoSize} onValueChange={setVideoSize}>
                          <SelectTrigger className="w-full" data-testid="make-ref-video-size">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_SIZES.map((s) => (<SelectItem key={s} value={s}>
                                {SIZE_LABEL[s]}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Openings for each</Label>
                        <Select value={String(hooks)} onValueChange={(v) => setHooks(Number(v))}>
                          <SelectTrigger className="w-full" data-testid="make-ref-hooks">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((x) => (<SelectItem key={x} value={String(x)}>
                                {x}
                              </SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">The script is written first. Then its plan, its pictures and the prompt for every clip are made for you to approve.</p>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground" data-testid="make-ref-keep-words">
                      <input type="checkbox" className="mt-0.5" checked={keepWords} onChange={(e) => setKeepWords(e.target.checked)}/>
                      <span>This is my own ad: keep its words exactly and only change the format. Nothing is rewritten, so the buyer, the offer and the choices above are not used.</span>
                    </label>
                  </>)}
              </div>
            </div>
          </Step>

          <Step n={4} title="Anything else to change?">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="make-ref-note" className="text-muted-foreground">
                  Optional. Say it or type it.
                </Label>
                <VoiceNote onText={(t) => setNote((cur) => `${cur}${cur ? " " : ""}${t}`.slice(0, NOTE_MAX))} testId="make-ref-voice"/>
              </div>
              <Textarea id="make-ref-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))} rows={3} className="text-sm" placeholder="Make it for mornings. Leave out the doctor. Open on the price." data-testid="make-ref-note"/>
            </div>
            <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="make-ref-claims"/>
          </Step>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground" data-testid="make-ref-summary">
              {nothing ? "Tick a static ad, a video, or both." : `This makes ${summary}.`}
            </p>
            <Button onClick={run} disabled={pending || nothing || !!state.blocked || (wantStatic && !staticFormat) || (wantVideo && !videoFormat)} data-testid="make-ref-submit">
              {pending && <Loader2 className="size-4 animate-spin"/>}
              Make
            </Button>
          </div>
        </div>)}
    </div>);
}
