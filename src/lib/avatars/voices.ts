import type { AvatarVoice } from "./types";
export interface ListedVoice {
    voice_id: string;
    name: string;
    gender: "male" | "female";
    preview: string;
}
const at = (id: string, file: string) => `https://d1xarpci4ikg0w.cloudfront.net/audio_voice/${id}/preview-${file}.mp3`;
const v = (name: string, gender: ListedVoice["gender"], voice_id: string, file: string): ListedVoice => ({ voice_id, name, gender, preview: at(voice_id, file) });
const STARTER: ListedVoice[] = [
    v("Grady", "male", "e2a2d2e6-9ed2-59cd-82af-feaa27f8a678", "c07e730034d0926d"),
    v("Holden", "male", "3c9d6053-6334-592c-8997-4e325286af3f", "bddba899f043d6a8"),
    v("Archie", "male", "bd072316-f77c-588b-b6e5-e46b9b03d008", "225ae0482643b360"),
    v("Benji", "male", "e6f9b893-51b1-51d3-afe9-9e0482cb7ac1", "d7f1d3d8ca52125c"),
    v("Reid", "male", "66469f5a-10db-586a-bab1-72f6ee66ba69", "d369773b53804ce8"),
    v("Emmett", "male", "3c7d32be-0182-5c5e-aa6a-663409bfbb26", "eb4f23d8867ce233"),
    v("Ainsley", "female", "731b4ffe-e95e-59f4-8c00-81608936091f", "37d345ad8f2edf91"),
    v("Brielle", "female", "a00bc7f3-0236-5e76-ac65-90137ce0f5a4", "b3150d3b115505cd"),
    v("Faye", "female", "d198dc0b-c4e5-5198-aa1d-ecf5ca0927c4", "2c0cfabdc015c510"),
    v("Delia", "female", "1550321e-7f5b-526e-b001-02328b03e9bc", "b15652c223395257"),
    v("Isla", "female", "7367e919-3069-5a0b-939e-dfb1c0fd91b4", "48b702b4d554cd90"),
    v("Maeve", "female", "64cf4f1a-61c8-5938-9aea-83d12b2e1d13", "beb7ec12bc6be2ca"),
];
export function listedVoices(): ListedVoice[] {
    return STARTER;
}
export const listedVoice = (voiceId: string): ListedVoice | undefined => listedVoices().find((x) => x.voice_id === voiceId);
export function withListedVoice(voice: AvatarVoice, voiceId: string | null): AvatarVoice {
    const { name: _name, voice_id: _id, preview: _preview, ...rest } = voice;
    if (!voiceId)
        return rest;
    const picked = listedVoice(voiceId);
    if (!picked)
        throw new Error("That voice is no longer on the list. Pick another.");
    return { ...rest, name: picked.name, voice_id: picked.voice_id, preview: picked.preview };
}
export const hasVoice = (voice: AvatarVoice): boolean => !!(voice.direction.trim() || voice.voice_id || voice.sample);
export function voiceLabel(voice: AvatarVoice): string {
    if (voice.sample)
        return "Your own recording";
    if (voice.name)
        return voice.name;
    return voice.direction.trim() ? "Described in words" : "No voice yet";
}
