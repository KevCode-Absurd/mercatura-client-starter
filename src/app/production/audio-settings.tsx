"use client";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { videoAudioOf, type VideoAudio } from "@/lib/video-audio";
export function AudioSettings({ id, value, disabled, onChange }: {
    id: string;
    value?: VideoAudio;
    disabled?: boolean;
    onChange: (value: VideoAudio) => void;
}) {
    const audio = videoAudioOf(value);
    const [musicDirection, setMusicDirection] = useState(audio.musicDirection ?? "");
    useEffect(() => setMusicDirection(audio.musicDirection ?? ""), [audio.musicDirection]);
    const change = (patch: Partial<VideoAudio>) => onChange({ ...audio, musicDirection, ...patch });
    return (<fieldset disabled={disabled} className="space-y-2 text-xs" data-testid={`${id}-audio`}>
      <legend className="mb-2 font-medium">Video audio</legend>
      <label className="flex items-start gap-2">
        <Checkbox checked={audio.enabled} disabled={disabled} onCheckedChange={(v) => change({ enabled: v === true })} data-testid={`${id}-audio-switch`}/>
        <span>Audio<span className="block text-muted-foreground">Off delivers a silent video, including dialogue and music.</span></span>
      </label>
      <label className="flex items-start gap-2">
        <Checkbox checked={audio.sounds} disabled={disabled || !audio.enabled} onCheckedChange={(v) => change({ sounds: v === true })} data-testid={`${id}-sounds-switch`}/>
        <span>Scene sounds<span className="block text-muted-foreground">Room ambience and action sounds. Off keeps dialogue when audio is on.</span></span>
      </label>
      <label className="flex items-start gap-2">
        <Checkbox checked={audio.music} disabled={disabled || !audio.enabled} onCheckedChange={(v) => change({ music: v === true })} data-testid={`${id}-music-switch`}/>
        <span>Background music<span className="block text-muted-foreground">Optional instrumental music beneath the dialogue.</span></span>
      </label>
      {audio.enabled && audio.music && (<label className="block space-y-1">
          <span>Music direction (optional)</span>
          <Textarea value={musicDirection} disabled={disabled} maxLength={400} rows={2} onChange={(e) => setMusicDirection(e.target.value)} onBlur={() => musicDirection !== (audio.musicDirection ?? "") && change({ musicDirection })} placeholder="Warm, minimal acoustic guitar, relaxed pace, no vocals" data-testid={`${id}-music-direction`}/>
        </label>)}
      <p className="text-muted-foreground">The generator follows these sound and music choices for each clip. Listen to check the mix and continuity; sound and music cannot be removed separately after generation.</p>
    </fieldset>);
}
