"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDIT_MODES, MAX_UPLOAD_BYTES, captionSrt, parseSrt, hookVariant, editFileUrl, editPlanSchema, validateTimeline, type EditMode, type EditPlan, type ClipInfo } from "@/lib/video-editing/plan";
import type { VideoEdit } from "@/lib/video-editing/store";
import { TimelinePreview } from "./timeline-preview";
type Clip = {
    file: File;
    url: string;
    info: ClipInfo;
    start: number;
    end: number;
    focalX: number;
    focalY: number;
    gainDb: number;
    fadeIn: number;
    fadeOut: number;
};
type Caption = EditPlan["captions"][number];
const field = "rounded-md border bg-background px-3 py-2 text-sm";
const ReactMarkdown = dynamic(() => import("react-markdown"), { loading: () => <p role="status">Loading editing guide…</p> });
function ExportCard({ edit }: {
    edit: VideoEdit;
}) {
    const [captioned, setCaptioned] = useState(edit.files.includes("captioned.mp4"));
    return <article className="space-y-3 rounded-xl border p-4" data-testid="video-edit-export">
    <div><h3 className="font-medium">{edit.title}</h3><p className="text-sm text-muted-foreground">{EDIT_MODES[edit.plan.mode].title} · {edit.size.join(" × ")} · {edit.seconds.toFixed(2)} seconds</p></div>
    {edit.files.includes("captioned.mp4") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={captioned} onChange={e => setCaptioned(e.target.checked)}/>Show captions on playback</label>}
    <video controls preload="metadata" className="max-h-80 w-full rounded-md bg-black" src={editFileUrl(edit.id, captioned ? "captioned.mp4" : "clean.mp4")}/>
    <div className="flex flex-wrap gap-4 text-sm">{edit.files.map((f) => <a key={f} className="underline" href={editFileUrl(edit.id, f, true)}>{f === "clean.mp4" ? "Download without added captions" : "Download with captions"}</a>)}</div>
    {!!edit.plan.captions.length && <a className="block text-sm underline" href={editFileUrl(edit.id, "captions.srt", true)}>Download subtitle SRT</a>}
    <p className="text-xs text-muted-foreground">Original footage is unchanged. Words or music already in a source clip remain unless its audio was muted; baked-in text cannot be removed here.</p>
    {edit.notes.map((n, i) => <p key={i} className="text-sm text-muted-foreground">{n}</p>)}
  </article>;
}
function AudioAudition({ file, db }: {
    file: File;
    db: number;
}) {
    const [url, setUrl] = useState<string>();
    const audio = useRef<HTMLAudioElement>(null);
    useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
    useEffect(() => { if (audio.current)
        audio.current.volume = Math.pow(10, db / 20); }, [db, url]);
    return <audio aria-label={`Audition ${file.name}`} ref={audio} src={url} controls preload="metadata" className="max-w-full"/>;
}
function FilePick({ label, button, accept, multiple, chosen, testid, onFiles }: {
    label: string;
    button: string;
    accept: string;
    multiple?: boolean;
    chosen?: string;
    testid?: string;
    onFiles: (files: File[]) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    return <div className="text-sm"><span className="block">{label}</span>
    <input ref={input} data-testid={testid} aria-label={label} className="hidden" type="file" accept={accept} multiple={multiple} onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}/>
    <div className="mt-2 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}><Upload className="size-4"/>{chosen || button}</Button></div>
  </div>;
}
export function VideoEditor({ brandId, initialMode, guides, saved, speechEnabled = false }: {
    brandId: string;
    initialMode: EditMode;
    guides: Record<string, string>;
    saved: VideoEdit[];
    speechEnabled?: boolean;
}) {
    const router = useRouter();
    const [mode, setMode] = useState(initialMode);
    const [guideOpen, setGuideOpen] = useState(false);
    const [clips, setClips] = useState<Clip[]>([]);
    const [title, setTitle] = useState("My video edit");
    const [aspect, setAspect] = useState<EditPlan["aspect"]>("9:16");
    const [fit, setFit] = useState<EditPlan["fit"]>("contain");
    const [sourceAudio, setSourceAudio] = useState(true);
    const [music, setMusic] = useState<File | null>(null);
    const [musicDb, setMusicDb] = useState(-22);
    const [musicFade, setMusicFade] = useState(0.4);
    const [voice, setVoice] = useState<File | null>(null);
    const [voiceDb, setVoiceDb] = useState(0);
    const [duckMusic, setDuckMusic] = useState(true);
    const [captions, setCaptions] = useState<Caption[]>([]);
    const [captionsEnabled, setCaptionsEnabled] = useState(true);
    const [captionReview, setCaptionReview] = useState(true);
    const [captionNotice, setCaptionNotice] = useState("");
    const [hookIndex, setHookIndex] = useState(0);
    const [importedFrom, setImportedFrom] = useState("");
    const imported = useRef(false);
    const [busy, setBusy] = useState(false);
    const [reading, setReading] = useState(false);
    const [error, setError] = useState("");
    const [made, setMade] = useState<VideoEdit | null>(null);
    const sourceUrls = useRef(new Set<string>());
    useEffect(() => () => sourceUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
    const duration = clips.reduce((n, c) => n + c.end - c.start, 0);
    const patchClip = (i: number, patch: Partial<Clip>) => { setClips((all) => all.map((c, k) => k === i ? { ...c, ...patch } : c)); if (captions.length && (patch.start !== undefined || patch.end !== undefined)) {
        setCaptionReview(false);
        setCaptionNotice("Trims changed. Check caption timing against the new timeline.");
    } };
    const patchCaption = (i: number, patch: Partial<Caption>) => setCaptions((all) => all.map((c, k) => k === i ? { ...c, ...patch } : c));
    async function addFiles(files: File[]) {
        setError("");
        setReading(true);
        const added: Clip[] = [];
        try {
            if (clips.length + files.length > 12)
                throw new Error("Choose up to 12 clips.");
            if ([...clips.map((c) => c.file), ...files, ...(music ? [music] : []), ...(voice ? [voice] : [])].reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES)
                throw new Error("Keep the combined uploads under 256 MB.");
            for (const file of files) {
                const url = URL.createObjectURL(file);
                sourceUrls.current.add(url);
                const video = document.createElement("video");
                video.preload = "metadata";
                try {
                    await new Promise<void>((resolve, reject) => {
                        const timer = setTimeout(() => reject(new Error(`Could not read ${file.name}. Try an MP4, MOV or WebM export.`)), 15000);
                        video.onloadedmetadata = () => { clearTimeout(timer); resolve(); };
                        video.onerror = () => { clearTimeout(timer); reject(new Error(`Could not read ${file.name}. Try an MP4, MOV or WebM export.`)); };
                        video.src = url;
                    });
                    if (!Number.isFinite(video.duration) || video.duration <= 0)
                        throw new Error(`Could not read the duration of ${file.name}.`);
                    added.push({ file, url, info: { duration: video.duration, width: video.videoWidth, height: video.videoHeight, hasAudio: true }, start: 0, end: Number(video.duration.toFixed(3)), focalX: 0.5, focalY: 0.5, gainDb: 0, fadeIn: 0, fadeOut: 0 });
                }
                catch (e) {
                    URL.revokeObjectURL(url);
                    throw e;
                }
            }
            setClips((all) => [...all, ...added]);
            return true;
        }
        catch (e) {
            added.forEach((c) => URL.revokeObjectURL(c.url));
            setError((e as Error).message);
            return false;
        }
        finally {
            setReading(false);
        }
    }
    useEffect(() => {
        const query = new URLSearchParams(window.location.search), id = query.get("id");
        if (imported.current || query.get("source") !== "production" || !id)
            return;
        imported.current = true;
        if (query.get("brand") !== brandId) {
            setError("Switch to the source brand before opening these clips.");
            return;
        }
        void (async () => {
            setReading(true);
            try {
                const res = await fetch(`/api/production/${encodeURIComponent(id)}/editor-sources`);
                const data = await res.json() as {
                    ok?: boolean;
                    error?: string;
                    brandId?: string;
                    title?: string;
                    clips?: {
                        name: string;
                        url: string;
                        mimeType?: string;
                    }[];
                    captions?: Caption[];
                    captionNote?: string;
                };
                if (!res.ok || data.brandId !== brandId || !Array.isArray(data.clips) || !data.clips.length)
                    throw new Error(data.error ?? "No completed clips are available for this brand.");
                if (data.clips.length > 12)
                    throw new Error("Open at most 12 clips in one edit.");
                let bytes = 0;
                const files: File[] = [];
                for (const c of data.clips) {
                    const url = new URL(c.url, window.location.origin);
                    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/"))
                        throw new Error("This source is not an app-owned local clip.");
                    const media = await fetch(url.href);
                    if (!media.ok || bytes + Number(media.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES)
                        throw new Error("Source clips are unavailable or exceed the 256 MB editor limit.");
                    const blob = await media.blob();
                    bytes += blob.size;
                    if (bytes > MAX_UPLOAD_BYTES)
                        throw new Error("Keep the combined clips under 256 MB.");
                    files.push(new File([blob], c.name, { type: c.mimeType ?? "video/mp4" }));
                }
                if (!(await addFiles(files)))
                    throw new Error("These clips could not be loaded into the editor.");
                setTitle(data.title?.slice(0, 100) || "Creator Studio edit");
                setImportedFrom(id);
                if (data.captions?.length) {
                    setCaptions(editPlanSchema.shape.captions.parse(data.captions));
                    setCaptionReview(false);
                    setCaptionNotice("Carried-over storyboard text, not an automatic speech transcript. Review these words and timing against the actual clips.");
                }
                else if (data.captionNote)
                    setCaptionNotice(data.captionNote);
            }
            catch (e) {
                setError((e as Error).message);
            }
            finally {
                setReading(false);
            }
        })();
    }, [brandId]);
    const planData = { mode, title, aspect, fit, sourceAudio, musicDb, musicFade, voiceDb, duckMusic, captionsEnabled, clips: clips.map((c, file) => ({ file, start: c.start, end: c.end, focalX: c.focalX, focalY: c.focalY, gainDb: c.gainDb, fadeIn: c.fadeIn, fadeOut: c.fadeOut })), captions };
    const previewClips = useMemo(() => clips.map(c => ({ ...c, name: c.file.name })), [clips]);
    function formFor(plan: EditPlan) { const form = new FormData(); form.set("brand", brandId); form.set("plan", JSON.stringify(plan)); clips.forEach(c => form.append("clips", c.file)); if (music)
        form.set("music", music); if (voice)
        form.set("voice", voice); return form; }
    async function automaticCaptions() {
        setError("");
        setBusy(true);
        try {
            const plan = editPlanSchema.parse({ ...planData, captions: [] });
            validateTimeline(plan, clips.map(c => c.info));
            const result = await (await fetch("/video-editing/captions", { method: "POST", body: formFor(plan) })).json();
            if (!result.ok)
                throw new Error(result.error ?? "Caption transcription failed.");
            setCaptions(editPlanSchema.shape.captions.parse(result.captions));
            setCaptionReview(!result.captions.length);
            setCaptionNotice(result.captions.length ? result.review : "No intelligible speech was found. Add captions manually if needed.");
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function exportVideo(variant = false) {
        setError("");
        setBusy(true);
        try {
            if (captions.length && !captionReview)
                throw new Error("Review the caption words and timing, then mark them checked before exporting.");
            let plan = editPlanSchema.parse(planData);
            if (variant)
                plan = hookVariant(plan, plan.clips[hookIndex], `${title.slice(0, 75)} — hook ${hookIndex + 1}`);
            validateTimeline(plan, clips.map((c) => c.info));
            const form = formFor(plan);
            const res = await fetch("/video-editing/render", { method: "POST", body: form });
            const result = await res.json();
            if (!result.ok)
                throw new Error(result.error || "The export failed.");
            setMade(result.edit);
            router.refresh();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <div className="space-y-6 px-6 py-6">
    <ol className="flex flex-wrap gap-3 text-sm" aria-label="Video editing process">{["Clips", "Crop & preview", "Voice & music", "Optional captions", "Export"].map((s, i) => <li key={s} className="rounded-full border px-3 py-1">{i + 1}. {s}</li>)}</ol>
    {importedFrom && <p className="rounded border p-3 text-sm">Completed Creator Studio clips loaded. Arrange, caption and mix them here, then export.</p>}
    <fieldset disabled={busy || reading} className="space-y-6 disabled:opacity-70">
      <div className="flex flex-wrap gap-2" aria-label="Editing mode">{Object.entries(EDIT_MODES).map(([id, m]) => <Button key={id} type="button" variant={mode === id ? "default" : "outline"} aria-pressed={mode === id} onClick={() => setMode(id as EditMode)}>{m.title}</Button>)}</div>
      <p className="text-sm text-muted-foreground" data-testid="video-edit-purpose">{EDIT_MODES[mode].purpose}</p>
      <details className="rounded-lg border p-4" onToggle={e => setGuideOpen(e.currentTarget.open)}><summary className="cursor-pointer font-medium">Read the {mode === "ad" ? "ecommerce ad" : "organic content"} editing skill</summary>{guideOpen && <div className="prose prose-sm dark:prose-invert mt-4 max-w-none"><ReactMarkdown>{guides[mode]}</ReactMarkdown></div>}</details>
      <div className="flex flex-wrap gap-4">
        <label className="space-y-1 text-sm">Edit name<Input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)}/></label>
        <label className="flex flex-col gap-1 text-sm">Output shape<Select value={aspect} onValueChange={(v) => setAspect(v as EditPlan["aspect"])}><SelectTrigger className={field} aria-label="Output shape"><SelectValue /></SelectTrigger><SelectContent>{["9:16", "4:5", "1:1", "16:9"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex flex-col gap-1 text-sm">Fit footage<Select value={fit} onValueChange={(v) => setFit(v as EditPlan["fit"])}><SelectTrigger className={field} aria-label="Fit footage"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contain">Keep whole frame (add bars)</SelectItem><SelectItem value="cover">Fill frame (adjust focal crop)</SelectItem></SelectContent></Select></label>
      </div>
      {fit === "cover" && <p className="text-sm">Check the face, hands and packaging after cropping. Use Keep whole frame if a product detail is cut off.</p>}
      <section className="space-y-3"><h2 className="font-medium">1. Add and arrange your clips</h2><p className="text-sm text-muted-foreground">Up to 12 clips, 256 MB combined. Set in/out times in source seconds; clips join in the order below at their original speed.</p>
        <FilePick label="Add video clips" button="Choose clips" accept="video/*,.mov" multiple testid="video-edit-upload" onFiles={(files) => void addFiles(files)}/>
        {clips.map((c, i) => <article key={c.url} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[160px_1fr]">
          <video controls preload="metadata" className="max-h-40 w-full rounded bg-black" src={c.url}/>
          <div className="space-y-2 min-w-0"><p className="break-words text-sm font-medium">{i + 1}. {c.file.name}</p><p className="text-xs text-muted-foreground">Source: {c.info.duration.toFixed(2)} seconds · {c.info.width} × {c.info.height}</p>
            <div className="flex flex-wrap gap-2">{(["start", "end"] as const).map((key) => <label key={key} className="text-sm">{key === "start" ? "In" : "Out"} (seconds)<Input aria-label={`Clip ${i + 1} ${key}`} className="w-28" type="number" step="0.01" min={0} max={c.info.duration} value={c[key]} onChange={(e) => patchClip(i, { [key]: Number(e.target.value) })}/></label>)}</div>
            {fit === "cover" && <div className="flex flex-wrap gap-3">{(["focalX", "focalY"] as const).map(key => <label key={key} className="text-xs">{key === "focalX" ? "Horizontal focal point" : "Vertical focal point"} ({Math.round(c[key] * 100)}%)<input aria-label={`Clip ${i + 1} ${key}`} className="block" type="range" min={0} max={1} step={0.01} value={c[key]} onChange={e => patchClip(i, { [key]: Number(e.target.value) })}/></label>)}</div>}
            <div className="flex flex-wrap gap-2">{(["gainDb", "fadeIn", "fadeOut"] as const).map(key => <label key={key} className="text-xs">{key === "gainDb" ? "Source level (dB)" : key === "fadeIn" ? "Audio fade in (s)" : "Audio fade out (s)"}<Input aria-label={`Clip ${i + 1} ${key}`} className="w-24" type="number" step={key === "gainDb" ? 1 : 0.1} min={key === "gainDb" ? -40 : 0} max={key === "gainDb" ? 0 : 5} value={c[key]} onChange={e => patchClip(i, { [key]: Number(e.target.value) })}/></label>)}</div>
            <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={!i} onClick={() => { setClips((all) => { const next = [...all]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; }); if (captions.length) {
            setCaptionReview(false);
            setCaptionNotice("Clip order changed. Check caption timing.");
        } }}>Move earlier</Button><Button type="button" size="sm" variant="outline" onClick={() => { setClips((all) => all.filter((_, k) => k !== i)); if (captions.length)
            setCaptionReview(false); setHookIndex(0); }}>Remove clip {i + 1}</Button></div>
          </div>
        </article>)}
        {!!clips.length && <p className="text-sm">Edited duration: {duration.toFixed(2)} seconds</p>}
      </section>
      {!!clips.length && <TimelinePreview clips={previewClips} plan={planData as EditPlan} music={music} voice={voice}/>}
      <section className="space-y-3"><h2 className="font-medium">2. Choose the sound</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sourceAudio} onChange={(e) => setSourceAudio(e.target.checked)}/>Keep source audio</label>
        <p className="text-xs text-muted-foreground">Turning this off removes all sound already in the clips, including voice. A mixed source track cannot be split into voice, music and effects here.</p>
        <FilePick label="Separate voice track (optional)" button="Choose a voice file" accept="audio/*" chosen={voice?.name} onFiles={(files) => setVoice(files[0] ?? null)}/>
        {voice && <div className="space-y-2"><p className="text-sm">{voice.name} · starts at timeline 0</p><AudioAudition file={voice} db={voiceDb}/><label className="block text-sm">Voice level (dB)<Input className="w-24" type="number" min={-40} max={0} value={voiceDb} onChange={e => setVoiceDb(Number(e.target.value))}/></label><Button type="button" variant="outline" size="sm" onClick={() => setVoice(null)}>Remove voice track</Button></div>}
        <FilePick label="Background music (optional)" button="Choose a music file" accept="audio/*" chosen={music?.name} onFiles={(files) => setMusic(files[0] ?? null)}/>
        {music && <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{music.name}</span><label className="text-sm">Music level (dB)<Input className="w-24" type="number" min={-40} max={-8} value={musicDb} onChange={(e) => setMusicDb(Number(e.target.value))}/></label><Button type="button" variant="outline" size="sm" onClick={() => setMusic(null)}>Remove music</Button></div>}
        {music && <><AudioAudition file={music} db={musicDb}/><label className="block text-sm">Music fades (seconds)<Input className="w-24" type="number" min={0} max={5} step={0.1} value={musicFade} onChange={e => setMusicFade(Number(e.target.value))}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={duckMusic} onChange={e => setDuckMusic(e.target.checked)}/>Lower music automatically under voice/source audio</label></>}
        <p className="text-xs text-muted-foreground">Use a track cleared for this use; paid ads can require different rights from organic posts. For a silent export, turn off source audio and remove both voice and music tracks.</p>
      </section>
      <section className="space-y-3"><h2 className="font-medium">3. Add timed captions (optional)</h2><p className="text-sm text-muted-foreground">Times refer to the edited timeline. Enter the exact spoken words or approved on-screen copy, using short phrases. Exports include a separate copy without these captions.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={captionsEnabled} onChange={e => setCaptionsEnabled(e.target.checked)}/>Add captions to the video (keep a clean export too)</label>
        <Button type="button" variant="outline" disabled={!speechEnabled || !clips.length} onClick={() => void automaticCaptions()}>Generate speech captions</Button>
        <p className="text-xs text-muted-foreground">Transcription listens to the separate voice track when supplied; otherwise it listens to the trimmed source clips. Check the draft against the mix before export.</p>
        {!speechEnabled && <p className="text-xs text-muted-foreground">Automatic transcription becomes available when the speech provider is connected in Settings. Manual captions and SRT import work now.</p>}
        <FilePick label="Import subtitle SRT" button="Choose an SRT file" accept=".srt" onFiles={(files) => { const f = files[0]; if (!f)
        return; void f.text().then(text => { if (text.length > 100000)
        throw new Error("Keep the SRT file under 100 KB."); const next = parseSrt(text); const plan = editPlanSchema.parse({ ...planData, captions: next }); validateTimeline(plan, clips.map(c => c.info)); setCaptions(next); setCaptionReview(false); setCaptionNotice("Imported subtitles: review names and timing."); }).catch(e => setError(e.message)); }}/>
        {captionNotice && <p role="status" className="text-sm">{captionNotice}</p>}
        {!!captions.length && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={captionReview} onChange={e => setCaptionReview(e.target.checked)}/>I checked caption words and timing</label>}
        {!!captions.length && <Button type="button" variant="outline" onClick={() => { try {
        const plan = editPlanSchema.parse(planData);
        validateTimeline(plan, clips.map(c => c.info));
        const url = URL.createObjectURL(new Blob([captionSrt(plan.captions)], { type: "application/x-subrip" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9_-]/gi, "_")}.srt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    catch (e) {
        setError((e as Error).message);
    } }}>Download editable subtitles</Button>}
        {captions.map((c, i) => <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">{(["start", "end"] as const).map((key) => <label key={key} className="text-xs">{key === "start" ? "From" : "To"} (seconds)<Input aria-label={`Caption ${i + 1} ${key}`} className="w-24" type="number" step="0.01" min={0} value={c[key]} onChange={(e) => patchCaption(i, { [key]: Number(e.target.value) })}/></label>)}<label className="flex-1 min-w-40 text-xs">Caption text<Input aria-label={`Caption ${i + 1} text`} value={c.text} maxLength={160} onChange={(e) => patchCaption(i, { text: e.target.value })}/></label><label className="text-xs">Position<Select value={c.position} onValueChange={(v) => patchCaption(i, { position: v as Caption["position"] })}><SelectTrigger className={field} aria-label={`Caption ${i + 1} position`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bottom">Lower</SelectItem><SelectItem value="top">Upper</SelectItem></SelectContent></Select></label><Button type="button" variant="outline" size="sm" onClick={() => setCaptions((all) => all.filter((_, k) => k !== i))}>Remove caption {i + 1}</Button></div>)}
        <Button type="button" variant="outline" disabled={captions.length >= 40} onClick={() => setCaptions((all) => [...all, { start: all.at(-1)?.end ?? 0, end: Math.min(duration || 2, (all.at(-1)?.end ?? 0) + 2), text: "", position: "bottom" }])}>Add caption</Button>
      </section>
      {clips.length > 1 && <section className="space-y-3 rounded-lg border p-4"><h2 className="font-medium">Hook-only export variant</h2><p className="text-sm text-muted-foreground">Replace only the first clip with another uploaded clip. The remaining clips keep their order, crop, audio and captions. Opening captions are removed so you can review or add the new hook’s words separately.</p><label className="block text-sm">Alternative opening<Select value={String(hookIndex)} onValueChange={(v) => setHookIndex(Number(v))}><SelectTrigger className={field} aria-label="Alternative opening"><SelectValue /></SelectTrigger><SelectContent>{clips.map((c, i) => <SelectItem key={c.url} value={String(i)}>{i + 1}. {c.file.name} ({(c.end - c.start).toFixed(2)}s)</SelectItem>)}</SelectContent></Select></label><p className="text-xs">Export order: {clips[hookIndex]?.file.name} → {clips.slice(1).map(c => c.file.name).join(" → ")}</p><Button type="button" variant="outline" disabled={hookIndex === 0} onClick={() => void exportVideo(true)}>Export hook variant</Button></section>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button data-testid="video-edit-render" disabled={busy || reading || !clips.length} onClick={() => void exportVideo()}>{busy ? "Exporting…" : reading ? "Reading clips…" : "Export video"}</Button>
    <p className="text-xs text-muted-foreground">Review the export at phone size with sound on and off, including the first frame, every cut, the product label and the ending.</p>
    {made && <ExportCard edit={made}/>}
    {saved.filter((e) => e.id !== made?.id).length > 0 && <section className="space-y-3"><h2 className="font-medium">Previous edits for this brand</h2>{saved.filter((e) => e.id !== made?.id).map((e) => <ExportCard key={e.id} edit={e}/>)}</section>}
  </div>;
}
