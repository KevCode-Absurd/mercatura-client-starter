import { z } from "zod";
export const videoAudioSchema = z.object({
    enabled: z.boolean(),
    sounds: z.boolean(),
    music: z.boolean(),
    musicDirection: z.string().trim().max(400).optional(),
});
export type VideoAudio = z.infer<typeof videoAudioSchema>;
export const DEFAULT_VIDEO_AUDIO: VideoAudio = { enabled: true, sounds: true, music: false };
export const videoAudioOf = (audio?: VideoAudio): VideoAudio => ({ ...DEFAULT_VIDEO_AUDIO, ...audio });
export function videoAudioDirection(audio: VideoAudio | undefined, spoken: boolean): string {
    const a = videoAudioOf(audio);
    if (!a.enabled)
        return "Audio settings: silent video. No audible dialogue, voice-over, environmental sounds, sound effects or music. Any provided words guide the silent performance only.";
    return [
        "Audio settings override other soundtrack directions and reference audio. Generate audio with the video.",
        spoken ? "The approved dialogue is clear and close, with natural delivery; preserve every word." : "No voices or dialogue.",
        a.sounds ? `Sound: subtle room ambience and sounds from visible actions, naturally synchronized${spoken ? ", quieter than the voice" : ""}.` : "No environmental sounds, ambience or sound effects.",
        a.music ? `Background music: ${a.musicDirection || "a restrained instrumental bed suited to the scene"}. Instrumental only, no singing or extra voices${spoken ? "; keep it beneath the dialogue so every word is clear" : ""}. Keep the same musical character across clips; avoid a new intro or abrupt ending at each cut.` : "No music: no score and no BGM.",
    ].join(" ");
}
