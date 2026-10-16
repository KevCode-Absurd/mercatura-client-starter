"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import type { ProductionState, StoryboardFrame } from "@/db/schema";
import { STORYBOARD_FRAMES, framesPerClip, hasStoryboard, segmentSeconds, shortClipsText, storyboardImages, storyboardWords } from "@/lib/production/prompts";
import { cn } from "@/lib/utils";
import { redoFrameAction, saveFrameWordsAction, setStoryboardFramesAction, storyboardPreviewAction } from "./actions";
import { assetUrl, imagesText, usd } from "./shared";
type ActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
type Act = (fn: () => Promise<ActionResult>, done?: string, after?: () => void) => void;
type Frame = Omit<StoryboardFrame, "file" | "prompt"> & {
    file?: string;
    prompt?: string;
};
export function StoryboardBoard({ jobId, p, locked, planDirty, act }: {
    jobId: string;
    p: ProductionState;
    locked: boolean;
    planDirty: boolean;
    act: Act;
}) {
    const advanced = useAdvanced();
    const plan = p.video_plan;
    const [extra, setExtra] = useState<{
        prompts: string[];
        usdEach: number;
        measured: boolean;
    } | null>(null);
    const drawn = p.storyboard?.frames;
    const stamp = `${p.storyboard_frames}|${drawn?.map((f) => f.file).join(",")}|${p.look?.file}|${p.character?.file}`;
    useEffect(() => {
        if (!advanced || !plan)
            return;
        let stop = false;
        void storyboardPreviewAction(jobId).then((r) => !stop && r.ok && setExtra({ prompts: r.frames.map((f) => f.prompt), usdEach: r.usdEach, measured: r.measured }));
        return () => {
            stop = true;
        };
    }, [advanced, jobId, stamp, !!plan]);
    if (!plan || !hasStoryboard(p))
        return null;
    if (p.storyboard && !drawn)
        return null;
    const perClip = framesPerClip(p);
    const lengths = plan.segments.map(segmentSeconds);
    const startOf = (clip: number) => lengths.slice(0, clip).reduce((n, s) => n + s, 0);
    const frames: Frame[] = drawn ?? storyboardWords(plan, perClip);
    const images = drawn ? frames.length : storyboardImages(p);
    const short = drawn ? "" : shortClipsText(plan, perClip);
    const sum = `${p.segments} clip${p.segments === 1 ? "" : "s"}, up to ${perClip} frame${perClip === 1 ? "" : "s"} each`;
    const clipsMade = p.clips.some((c) => c.status !== "pending");
    const canCount = !p.storyboard && !clipsMade && !["clips", "finish", "motion", "done"].includes(p.next);
    const canEdit = !clipsMade && !locked;
    const approved = p.storyboard?.status === "approved";
    const stale = frames.filter((f) => f.stale).length;
    return (<section className="space-y-3" data-testid="storyboard-board" data-drawn={!!drawn} data-frames={frames.length}>
      <h3 className="text-sm font-medium">Storyboard: the whole video, frame by frame</h3>
      <p className="text-xs text-muted-foreground" data-testid="storyboard-count">
        {drawn
            ? `${imagesText(frames.length)}: ${sum}. ${approved ? "Approved: the clips are made from these frames." : "Check every frame, then approve the storyboard above. No clip is made before you do."}`
            : `The storyboard will draw ${imagesText(images)}: ${sum}. ${short ? `${short} ` : ""}They are drawn after the look frame is approved, and no clip is made until you approve them.`}
        {advanced && extra && (<span data-testid="storyboard-cost">
            {" "}
            {drawn ? "Drawing 1 frame again costs about" : "Estimated cost: about"} {usd(drawn ? extra.usdEach : extra.usdEach * images)}
            {extra.measured ? " (from what this brand's storyboard frames have cost so far)" : " (an estimate: no storyboard frame has been drawn for this brand yet)"}.
          </span>)}
      </p>
      {canCount && (<div className="flex flex-wrap items-center gap-2 text-xs" data-testid="storyboard-frames-choice">
          <span>Frames for each clip:</span>
          {Array.from({ length: STORYBOARD_FRAMES.max - STORYBOARD_FRAMES.min + 1 }, (_, i) => i + STORYBOARD_FRAMES.min).map((n) => (<Button key={n} size="sm" variant={n === perClip ? "default" : "outline"} disabled={locked || n === perClip} onClick={() => act(() => setStoryboardFramesAction(jobId, n), `${n} frame${n === 1 ? "" : "s"} a clip: ${imagesText(n * p.segments)}`)} aria-pressed={n === perClip} data-testid="storyboard-frames-pick">
              {n}
            </Button>))}
          <span className="text-muted-foreground">The last frame is where the clip ends. The others are moments in the middle, each a different pose. A clip with fewer moments gets fewer frames. More frames use more images and keep the clip closer to what you approved.</span>
        </div>)}
      {stale > 0 && (<p className="flex gap-2 text-xs text-amber-800" data-testid="storyboard-stale">
          <AlertTriangle className="size-4 shrink-0"/>
          {stale === 1 ? "1 frame's words were changed after it was drawn" : `${stale} frames' words were changed after they were drawn`}. Draw {stale === 1 ? "it" : "them"} again so the picture shows the new words.
        </p>)}
      {plan.segments.map((seg, clip) => {
            const mine = frames.map((f, i) => ({ f, i })).filter((x) => x.f.clip === clip);
            const startFile = clip === 0 ? p.look?.file : frames.filter((f) => f.clip === clip - 1 && f.moment === "end")[0]?.file;
            return (<div key={clip} className="space-y-2 rounded-md border p-3" data-testid="storyboard-clip">
            <div className="text-xs font-medium">
              Clip {clip + 1} <span className="font-normal text-muted-foreground">· {startOf(clip)} to {startOf(clip) + lengths[clip]} seconds</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <figure className="space-y-1 text-xs" data-testid="storyboard-start">
                {startFile ? <img src={assetUrl(startFile)} alt={`Clip ${clip + 1} starts here`} className="w-full rounded border"/> : <div className="flex aspect-[9/16] max-h-40 w-full items-center justify-center rounded border border-dashed text-muted-foreground">Not drawn yet</div>}
                <figcaption>
                  <span className="font-medium">Starts on</span> <span className="text-muted-foreground">{clip === 0 ? "the look frame" : `the last frame of clip ${clip}`}</span>
                  {seg.start && <p className="mt-1 break-words text-muted-foreground">{seg.start}</p>}
                </figcaption>
              </figure>
              {mine.map(({ f, i }) => (<FrameCard key={`${i}|${f.file ?? ""}|${f.description}`} jobId={jobId} index={i} frame={f} prompt={advanced ? (extra?.prompts[i] ?? f.prompt) : undefined} canEdit={canEdit && !planDirty} canRedo={canEdit && !!drawn} act={act}/>))}
            </div>
          </div>);
        })}
    </section>);
}
function FrameCard({ jobId, index, frame: f, prompt, canEdit, canRedo, act }: {
    jobId: string;
    index: number;
    frame: Frame;
    prompt?: string;
    canEdit: boolean;
    canRedo: boolean;
    act: Act;
}) {
    const [text, setText] = useState(f.description);
    const [notes, setNotes] = useState("");
    const dirty = text.trim() !== f.description.trim();
    const label = f.moment === "end" ? "Ends on" : `Key moment, about ${Math.round(f.at)}s`;
    return (<figure className={cn("space-y-1.5 text-xs", f.stale && "rounded-md ring-2 ring-amber-300 ring-offset-2")} data-testid="storyboard-frame" data-moment={f.moment} data-stale={!!f.stale}>
      {f.file ? <img src={assetUrl(f.file)} alt={`${label}: ${f.description}`} className="w-full rounded border"/> : <div className="flex aspect-[9/16] max-h-40 w-full items-center justify-center rounded border border-dashed text-muted-foreground">Not drawn yet</div>}
      <figcaption className="space-y-1.5">
        <div className="font-medium">
          {label}
          {f.stale && <span className="font-normal text-amber-800"> · words changed, picture is the old one</span>}
        </div>
        {canEdit ? (<Textarea rows={3} maxLength={260} value={text} onChange={(e) => setText(e.target.value)} aria-label={`What frame ${index + 1} shows`} data-testid="storyboard-frame-words"/>) : (<p className="break-words text-muted-foreground">{f.description}</p>)}
        {canEdit && dirty && (<div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(() => saveFrameWordsAction(jobId, index, text), "Frame words saved")} data-testid="storyboard-frame-save">
              Save words
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setText(f.description)}>
              Undo
            </Button>
          </div>)}
        {canRedo && f.file && !dirty && (<details data-testid="storyboard-frame-redo">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Not right? Change this picture or draw a fresh one</summary>
            <div className="mt-1.5 space-y-1.5">
              <Textarea rows={2} maxLength={1200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should look different" data-testid="storyboard-frame-notes"/>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={notes.trim().length < 4} onClick={() => act(() => redoFrameAction(jobId, index, notes.trim(), { keep: true }), "Changing this picture", () => setNotes(""))} title="Sends this picture back with your change. Everything you did not name stays as it is." data-testid="storyboard-frame-change">
                  Change this picture
                </Button>
                <Button size="sm" variant="outline" onClick={() => act(() => redoFrameAction(jobId, index, notes.trim()), "Drawing this frame again", () => setNotes(""))} title="Draws a new picture from the start" data-testid="storyboard-frame-redo-submit">
                  Draw a fresh one
                </Button>
              </div>
              <p className="text-muted-foreground">1 image either way. Change this picture keeps everything you did not name.</p>
            </div>
          </details>)}
        {prompt && (<details>
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Prompt ({prompt.length} characters)</summary>
            <pre className="mt-1 font-sans whitespace-pre-wrap text-muted-foreground">{prompt}</pre>
          </details>)}
      </figcaption>
    </figure>);
}
