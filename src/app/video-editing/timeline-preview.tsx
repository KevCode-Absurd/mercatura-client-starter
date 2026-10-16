"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { editSize, type EditPlan } from "@/lib/video-editing/plan";
import { timelinePosition, previewGain, type PreviewClip } from "@/lib/video-editing/timeline";
function useTrack(file: File | null) {
    const [url, setUrl] = useState<string>();
    useEffect(() => { if (!file) {
        setUrl(undefined);
        return;
    } const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
    return url;
}
export function TimelinePreview({ clips, plan, music, voice }: {
    clips: PreviewClip[];
    plan: EditPlan;
    music: File | null;
    voice: File | null;
}) {
    const video = useRef<HTMLVideoElement>(null), musicRef = useRef<HTMLAudioElement>(null), voiceRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false), [time, setTime] = useState(0), [index, setIndex] = useState(0);
    const [failure, setFailure] = useState("");
    const pending = useRef(0), frame = useRef<number>(0), playback = useRef(false);
    const timelineTime = useRef(0);
    const musicUrl = useTrack(music), voiceUrl = useTrack(voice);
    const duration = clips.reduce((n, c) => n + Math.max(0, c.end - c.start), 0);
    const musicFade = Math.min(plan.musicFade ?? 0.4, duration / 2);
    const active = clips[index];
    const size = editSize(plan.aspect);
    playback.current = playing;
    function syncTracks(target: number, resume: boolean) {
        for (const [element, loop] of [[musicRef.current, true], [voiceRef.current, false]] as const) {
            if (!element || !Number.isFinite(element.duration) || element.duration <= 0)
                continue;
            const trackTime = loop ? target % element.duration : Math.min(target, element.duration);
            if (Math.abs(element.currentTime - trackTime) > 0.08)
                element.currentTime = trackTime;
            if (resume && (loop || target < element.duration))
                void element.play().catch(() => setFailure("Use Play to start the audio preview."));
            else
                element.pause();
        }
    }
    function seek(target: number, resume = playing) {
        const pos = timelinePosition(clips, Math.max(0, Math.min(duration, target)));
        pending.current = pos.sourceTime;
        timelineTime.current = target;
        setTime(target);
        setPlaying(resume);
        if (pos.index !== index) {
            musicRef.current?.pause();
            voiceRef.current?.pause();
        }
        if (pos.index !== index)
            setIndex(pos.index);
        else if (video.current) {
            video.current.currentTime = pos.sourceTime;
            if (resume)
                void video.current.play().catch(() => setFailure("Use Play to start this browser preview."));
        }
        if (pos.index === index)
            syncTracks(target, resume);
    }
    useEffect(() => {
        setPlaying(false);
        setTime(0);
        setIndex(0);
        pending.current = clips[0]?.start ?? 0;
        timelineTime.current = 0;
        if (video.current) {
            video.current.pause();
            video.current.currentTime = pending.current;
        }
        musicRef.current?.pause();
        voiceRef.current?.pause();
    }, [clips]);
    useEffect(() => {
        if (musicRef.current)
            musicRef.current.volume = previewGain(plan.musicDb, timelineTime.current, duration, musicFade, musicFade);
        if (voiceRef.current)
            voiceRef.current.volume = previewGain(plan.voiceDb ?? 0, timelineTime.current, duration);
        if (playing)
            void video.current?.play().catch(() => setFailure("Playback could not start. Try Play again."));
        else
            video.current?.pause();
        syncTracks(timelineTime.current, playing && (video.current?.readyState ?? 0) >= 2);
    }, [playing, musicUrl, voiceUrl]);
    useEffect(() => {
        if (!playing || !active)
            return;
        const update = () => {
            const el = video.current;
            if (el && el.readyState >= 2) {
                const before = clips.slice(0, index).reduce((n, c) => n + Math.max(0, c.end - c.start), 0);
                const at = Math.min(duration, before + Math.max(0, el.currentTime - active.start));
                timelineTime.current = at;
                setTime(at);
                el.volume = plan.sourceAudio ? previewGain(active.gainDb ?? 0, el.currentTime - active.start, active.end - active.start, active.fadeIn, active.fadeOut) : 0;
                if (voiceRef.current)
                    voiceRef.current.volume = previewGain(plan.voiceDb ?? 0, at, duration);
                if (musicRef.current)
                    musicRef.current.volume = previewGain(plan.musicDb, at, duration, musicFade, musicFade);
                if (el.currentTime >= active.end - 0.015) {
                    if (index + 1 < clips.length) {
                        pending.current = clips[index + 1].start;
                        musicRef.current?.pause();
                        voiceRef.current?.pause();
                        setIndex(index + 1);
                    }
                    else {
                        setPlaying(false);
                        setTime(duration);
                    }
                    return;
                }
            }
            frame.current = requestAnimationFrame(update);
        };
        frame.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame.current);
    }, [playing, index, active, clips, duration, plan]);
    const caption = plan.captionsEnabled === false ? undefined : plan.captions.find(c => c.start <= time && c.end > time);
    if (!active)
        return null;
    return <section className="space-y-3 rounded-xl border p-4" data-testid="timeline-preview">
    <h2 className="font-medium">Assembled timeline preview</h2>
    <div className="relative mx-auto overflow-hidden bg-black" style={{ aspectRatio: `${size[0]}/${size[1]}`, width: `min(100%, ${Math.round(360 * size[0] / size[1])}px)` }}>
      <video ref={video} src={active.url} playsInline preload="auto" style={{ width: "100%", height: "100%", objectFit: plan.fit, objectPosition: `${(active.focalX ?? 0.5) * 100}% ${(active.focalY ?? 0.5) * 100}%` }} onLoadedMetadata={() => { if (video.current) {
        video.current.currentTime = pending.current;
        video.current.volume = plan.sourceAudio ? previewGain(active.gainDb ?? 0, pending.current - active.start, active.end - active.start, active.fadeIn, active.fadeOut) : 0;
        if (playback.current)
            void video.current.play().catch(() => setPlaying(false));
    } }} onPlaying={() => syncTracks(timelineTime.current, playback.current)} onWaiting={() => { musicRef.current?.pause(); voiceRef.current?.pause(); }} onEnded={() => { musicRef.current?.pause(); voiceRef.current?.pause(); if (index + 1 < clips.length) {
        pending.current = clips[index + 1].start;
        setIndex(index + 1);
    }
    else {
        setPlaying(false);
        setTime(duration);
    } }}/>
      {caption && <span data-testid="timeline-caption" className="absolute left-[10%] w-[80%] bg-black/85 px-2 py-1 text-center text-xs text-white" style={{ top: caption.position === "top" ? "10%" : "auto", bottom: caption.position === "bottom" ? "22%" : "auto" }}>{caption.text}</span>}
    </div>
    {musicUrl && <audio ref={musicRef} src={musicUrl} loop preload="auto" onLoadedMetadata={() => syncTracks(timelineTime.current, playback.current && (video.current?.readyState ?? 0) >= 2)}/>}{voiceUrl && <audio ref={voiceRef} src={voiceUrl} preload="auto" onLoadedMetadata={() => syncTracks(timelineTime.current, playback.current && (video.current?.readyState ?? 0) >= 2)}/>}
    <div className="flex items-center gap-3"><Button type="button" variant="outline" onClick={() => { setFailure(""); if (time >= duration)
        seek(0, true);
    else
        setPlaying(!playing); }}>{playing ? "Pause timeline" : "Play timeline"}</Button><span className="text-sm tabular-nums" data-testid="timeline-time">{time.toFixed(2)} / {duration.toFixed(2)} seconds</span></div>
    <input aria-label="Timeline position" type="range" min={0} max={duration} step={0.01} value={Math.min(time, duration)} onChange={e => seek(Number(e.target.value))} className="w-full"/>
    <div className="flex min-w-0 gap-1">{clips.map((c, i) => <button type="button" key={`${c.url}-${i}`} aria-label={`Preview clip ${i + 1}`} aria-current={i === index ? "step" : undefined} className={`min-w-0 truncate rounded px-2 py-2 text-xs ${i === index ? "bg-primary text-primary-foreground" : "bg-muted"}`} style={{ flex: Math.max(0.1, c.end - c.start) }} onClick={() => seek(clips.slice(0, i).reduce((n, c) => n + c.end - c.start, 0), false)}>{i + 1}. {c.name}</button>)}</div>
    <p className="text-xs text-muted-foreground">Cuts, crop, caption timing and track levels preview here. Browser decoding may pause at a cut. Export uses continuous frames, brand caption styling and {plan.duckMusic ? "speech-sensitive music ducking" : "the selected audio levels"}; listen to the export to check the final mix.</p>
    {failure && <p role="status" className="text-xs">{failure}</p>}
  </section>;
}
