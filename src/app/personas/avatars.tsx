"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ImageIcon, Loader2, Pencil, Play, Plus, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { KIND_LABEL, PRESENTER_KEYS, PRESENTER_LABEL, avatarLine, describeFromPersona, type Avatar, type AvatarKind, type PresenterKey } from "@/lib/avatars/types";
import { voiceLabel, type ListedVoice } from "@/lib/avatars/voices";
import type { PersonaProfile } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import { deleteAvatarAction, saveAvatarAction, setAvatarVoiceAction } from "./actions";
const IMAGE_USD = 0.04;
export const avatarImg = (a: Pick<Avatar, "portrait">, w: number) => `/api/assets/${a.portrait}?w=${w}`;
const NO_LOOK = "__any";
interface Draft {
    id?: string;
    name: string;
    kind: AvatarKind;
    style: string | null;
    presenter: Record<PresenterKey, string>;
    character: string;
    direction: string;
    voice_id: string | null;
    persona_id: string | null;
}
const noOne = () => Object.fromEntries(PRESENTER_KEYS.map((k) => [k, ""])) as Record<PresenterKey, string>;
const toDraft = (a: Avatar): Draft => ({ id: a.id, name: a.name, kind: a.kind, style: a.style, presenter: { ...noOne(), ...(a.presenter ?? {}) }, character: a.character ?? "", direction: a.voice.direction, voice_id: a.voice.voice_id ?? null, persona_id: a.persona_id });
type Persona = Pick<PersonaProfile, "id" | "name" | "who" | "look">;
interface Props {
    persona: Persona | null;
    avatars: Avatar[];
    voices: ListedVoice[];
    looks: {
        id: string;
        label: string;
    }[];
    personas?: {
        id: string;
        name: string;
    }[];
    live: boolean;
    busy: boolean;
    onChanged: () => Promise<unknown> | void;
    onDraw: (id: string) => void;
}
function useListen() {
    const audio = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState<string | null>(null);
    useEffect(() => () => audio.current?.pause(), []);
    const toggle = (url: string) => {
        audio.current?.pause();
        if (playing === url)
            return setPlaying(null);
        const a = new Audio(url);
        audio.current = a;
        a.onended = () => setPlaying(null);
        setPlaying(url);
        a.play().catch(() => {
            setPlaying(null);
            toast.error("The sample could not be played. Check your connection and try again.");
        });
    };
    return { playing, toggle };
}
const Listen = ({ url, name, listen, testid }: {
    url: string;
    name: string;
    listen: ReturnType<typeof useListen>;
    testid?: string;
}) => (<Button type="button" size="sm" variant="ghost" className="h-7 px-2" aria-label={listen.playing === url ? `Stop ${name}` : `Listen to ${name}`} onClick={() => listen.toggle(url)} data-testid={testid}>
    {listen.playing === url ? <Square className="size-3.5"/> : <Play className="size-3.5"/>}
    {listen.playing === url ? "Stop" : "Listen"}
  </Button>);
async function send(fields: Record<string, string>, file: File): Promise<{
    ok: true;
    avatar: Avatar;
} | {
    ok: false;
    error: string;
}> {
    const form = new FormData();
    form.set("file", file);
    for (const [k, v] of Object.entries(fields))
        form.set(k, v);
    try {
        const res = await fetch("/api/brand/avatars", { method: "POST", body: form });
        const data = (await res.json()) as {
            ok: boolean;
            error?: string;
            avatar?: Avatar;
        };
        return data.ok && data.avatar ? { ok: true, avatar: data.avatar } : { ok: false, error: data.error ?? "The upload failed. Try again." };
    }
    catch {
        return { ok: false, error: "The upload failed. Check your connection and try again." };
    }
}
export function AvatarsSection({ persona, avatars, voices, looks, personas = [], live, busy, onChanged, onDraw }: Props) {
    const [form, setForm] = useState<{
        mode: "edit" | "describe";
        draft: Draft;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pending, start] = useTransition();
    const listen = useListen();
    const lookName = (id: string | null) => looks.find((l) => l.id === id)?.label ?? null;
    const editing = form?.draft.id ? avatars.find((a) => a.id === form.draft.id) : undefined;
    const remove = (a: Avatar) => confirm(`Remove ${a.name}? Its pictures and its recording are deleted. Videos already made with it keep theirs.`) &&
        start(async () => {
            const res = await deleteAvatarAction(a.id);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success("Removed.");
            if (form?.draft.id === a.id)
                setForm(null);
            await onChanged();
        });
    return (<section className="space-y-3 rounded-lg border p-3" data-testid={persona ? "persona-avatars" : "brand-avatars"}>
      <div>
        <p className="text-sm font-medium">{persona ? "Avatars" : "Avatars on no persona's sheet"}</p>
        <p className="text-xs text-muted-foreground">{persona ? "The person or character who appears in this buyer's videos. Save one and every video can use the same face and voice." : "Saved from the avatar library with no persona, or their persona was deleted. They are the brand's, and a video can still use them. Edit one to keep it on a persona's sheet."}</p>
      </div>

      {avatars.length === 0 ? (<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground" data-testid="no-avatars">
          No avatar yet. Add one below and this buyer&apos;s videos can all show the same face and speak in the same voice.
        </p>) : (<ul className="grid gap-3 sm:grid-cols-2" data-testid="avatar-list">
          {avatars.map((a) => (<li key={a.id} className={cn("flex gap-3 rounded-md border p-2", form?.draft.id === a.id && "border-primary")} data-testid={`avatar-${a.id}`}>
              <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {a.portrait ? (<img src={avatarImg(a, 240)} alt={`${a.name}, an avatar`} className="size-full object-cover" loading="lazy"/>) : (<span className="flex size-full items-center justify-center p-1 text-center text-xs text-muted-foreground">{busy ? <Loader2 className="size-4 animate-spin"/> : "No picture yet"}</span>)}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold leading-tight">{a.name}</span>
                  <Badge variant="secondary" className="font-normal">{a.kind === "character" ? (lookName(a.style) ?? KIND_LABEL.character) : KIND_LABEL.person}</Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{avatarLine(a) || "Not described yet."}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Voice:</span>
                  <span data-testid={`avatar-voice-${a.id}`}>{voiceLabel(a.voice)}</span>
                  {!a.voice.sample && a.voice.preview && a.voice.name && <Listen url={a.voice.preview} name={a.voice.name} listen={listen}/>}
                </div>
                {a.voice.sample && <audio controls preload="none" src={`/api/assets/${a.voice.sample}`} className="h-8 w-full max-w-64" aria-label={`The recording of ${a.name}'s voice`}/>}
                {a.voice.direction && <p className="line-clamp-2 text-xs italic text-muted-foreground">&ldquo;{a.voice.direction}&rdquo;</p>}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {a.kind === "person" && a.portrait && <Button asChild size="sm" variant="outline" className="h-7"><Link href={`/references/avatars/packs?avatar=${encodeURIComponent(a.id)}`} data-testid={`settings-pack-avatar-${a.id}`}>Settings pack</Link></Button>}
                  <Button type="button" size="sm" variant="outline" className="h-7" disabled={pending} onClick={() => setForm({ mode: "edit", draft: toDraft(a) })} data-testid={`edit-avatar-${a.id}`}>
                    <Pencil className="size-3.5"/>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7" disabled={pending} onClick={() => remove(a)} data-testid={`remove-avatar-${a.id}`}>
                    <Trash2 className="size-3.5"/>
                    Remove
                  </Button>
                </div>
              </div>
            </li>))}
        </ul>)}
      {busy && (<p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="avatars-busy">
          <Loader2 className="size-3.5 animate-spin"/>
          Working. A picture takes about half a minute and appears here when it is ready. You can keep editing.
        </p>)}

      {form ? (<AvatarForm key={form.draft.id ?? form.mode} mode={form.mode} draft={form.draft} saved={editing ?? null} voices={voices} looks={looks} personas={persona ? [] : personas} live={live} busy={busy} listen={listen} onClose={() => setForm(null)} onSaved={async (a, draw) => {
                setForm(null);
                if (draw)
                    onDraw(a.id);
                else
                    await onChanged();
            }} onChanged={onChanged} onDraw={onDraw}/>) : uploading && persona ? (<UploadForm persona={persona} looks={looks} onClose={() => setUploading(false)} onDone={async (a) => {
                setUploading(false);
                await onChanged();
                setForm({ mode: "edit", draft: toDraft(a) });
            }}/>) : (persona && (<div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium">Add an avatar:</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setUploading(true)} data-testid="avatar-upload-start">
                <Upload className="size-3.5"/>
                Upload a character you made before
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm({ mode: "describe", draft: { name: "", kind: "person", style: null, presenter: { ...noOne(), ...(describeFromPersona(persona, "person").presenter ?? {}) }, character: persona.look, direction: "", voice_id: null, persona_id: persona.id } })} data-testid="avatar-describe-start">
                <Plus className="size-3.5"/>
                Describe one and draw it
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Describing one makes 1 picture. You can also save the character of any video you make as an avatar.</p>
          </div>))}
    </section>);
}
function AvatarForm({ mode, draft, saved, voices, looks, personas, live, busy, listen, onClose, onSaved, onChanged, onDraw }: {
    mode: "edit" | "describe";
    draft: Draft;
    saved: Avatar | null;
    voices: ListedVoice[];
    looks: Props["looks"];
    personas: {
        id: string;
        name: string;
    }[];
    live: boolean;
    busy: boolean;
    listen: ReturnType<typeof useListen>;
    onClose: () => void;
    onSaved: (a: Avatar, draw: boolean) => Promise<void>;
    onChanged: Props["onChanged"];
    onDraw: (id: string) => void;
}) {
    const [d, setD] = useState(draft);
    const [saving, start] = useTransition();
    const [sending, setSending] = useState<"portrait" | "voice" | null>(null);
    const [made, setMade] = useState(false);
    const [ours, setOurs] = useState(false);
    const picture = useRef<HTMLInputElement>(null);
    const recording = useRef<HTMLInputElement>(null);
    const advanced = useAdvanced();
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
    const described = d.kind === "person" ? PRESENTER_KEYS.some((k) => d.presenter[k].trim()) : !!d.character.trim();
    const save = (draw: boolean) => start(async () => {
        const res = await saveAvatarAction({ id: d.id, persona_id: d.persona_id, name: d.name, kind: d.kind, style: d.kind === "character" ? d.style : null, presenter: d.presenter, character: d.character, voice: { direction: d.direction, voice_id: d.voice_id } });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(draw ? "Saved. Drawing the picture: about half a minute." : "Saved.");
        await onSaved(res.avatar, draw);
    });
    const upload = async (kind: "portrait" | "voice", file: File) => {
        if (!saved)
            return;
        setSending(kind);
        const res = await send({ kind, avatar_id: saved.id, stated: (kind === "portrait" ? made : ours) ? "yes" : "no" }, file);
        setSending(null);
        if (picture.current)
            picture.current.value = "";
        if (recording.current)
            recording.current.value = "";
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(kind === "portrait" ? "The picture is saved." : "The recording is saved.");
        await onChanged();
    };
    const clearRecording = () => saved &&
        start(async () => {
            const res = await setAvatarVoiceAction(saved.id, { clear_sample: true });
            if (!res.ok)
                return void toast.error(res.error);
            toast.success("The recording is removed.");
            await onChanged();
        });
    return (<div className="space-y-4 rounded-md border bg-muted/30 p-3" data-testid="avatar-form">
      <div>
        <p className="text-sm font-medium">{mode === "describe" ? "A new avatar, from a description" : `Edit ${draft.name}`}</p>
        {mode === "describe" && <p className="text-xs text-muted-foreground">Started from this persona. Change anything. An avatar is always a made-up adult, never a real person.</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" hint="A name your team will know it by.">
          <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={60} placeholder="Maya, the night nurse" data-testid="avatar-name"/>
        </Field>
        <Field label="What it is">
          <div className="flex flex-wrap gap-2">
            {(["person", "character"] as const).map((k) => (<button key={k} type="button" aria-pressed={d.kind === k} onClick={() => set("kind", k)} className={cn("rounded-full border px-3 py-1 text-xs", d.kind === k ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted")} data-testid={`avatar-kind-${k}`}>
                {KIND_LABEL[k]}
              </button>))}
          </div>
          <p className="text-xs text-muted-foreground">{d.kind === "person" ? "Looks filmed, like someone holding a phone." : "Clay, paper, drawn, a skeleton, an object with a face."}</p>
        </Field>
      </div>

      {d.kind === "person" ? (<div className="grid gap-3 sm:grid-cols-2">
          {PRESENTER_KEYS.map((k) => (<Field key={k} label={PRESENTER_LABEL[k].label}>
              <Input value={d.presenter[k]} onChange={(e) => set("presenter", { ...d.presenter, [k]: e.target.value })} maxLength={300} placeholder={PRESENTER_LABEL[k].hint} data-testid={`avatar-${k}`}/>
            </Field>))}
        </div>) : (<div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <Field label="The character, in 1 sentence" hint="What it is, what it is made of, its build, its colours, its face, what it wears or carries.">
            <Textarea rows={3} maxLength={600} value={d.character} onChange={(e) => set("character", e.target.value)} data-testid="avatar-character"/>
          </Field>
          <Field label="The look it is made in" hint="It is offered to videos of this look.">
            <Select value={d.style ?? NO_LOOK} onValueChange={(v) => set("style", v === NO_LOOK ? null : v)}>
              <SelectTrigger className="w-full" data-testid="avatar-look">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_LOOK}>Any look</SelectItem>
                {looks.map((l) => (<SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </Field>
        </div>)}

      {personas.length > 0 && (<Field label="Keep it on the sheet of">
          <Select value={d.persona_id ?? NO_LOOK} onValueChange={(v) => set("persona_id", v === NO_LOOK ? null : v)}>
            <SelectTrigger className="w-full sm:w-72" data-testid="avatar-persona">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LOOK}>No persona</SelectItem>
              {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </Field>)}

      <div className="space-y-3 rounded-md border bg-background p-3" data-testid="avatar-voice">
        <p className="text-sm font-medium">Its voice</p>
        <Field label="How the voice sounds" hint="Age, pace, accent and mood. This is what a video is told.">
          <Textarea rows={2} maxLength={600} value={d.direction} onChange={(e) => set("direction", e.target.value)} placeholder="Warm and unhurried, mid 30s, a soft northern English accent, sounds like she is smiling" data-testid="avatar-voice-direction"/>
        </Field>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Or pick a voice from the list</Label>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" data-testid="voice-list">
            {voices.map((v) => {
            const on = d.voice_id === v.voice_id;
            return (<li key={v.voice_id} className={cn("flex items-center gap-1 rounded-md border pl-1 pr-0.5", on ? "border-primary bg-primary/5" : "bg-background")}>
                  <button type="button" aria-pressed={on} onClick={() => set("voice_id", on ? null : v.voice_id)} className="min-w-0 flex-1 px-2 py-1.5 text-left text-xs" data-testid={`voice-${v.name.toLowerCase()}`}>
                    <span className={cn(on && "font-medium")}>{v.name}</span>
                    <span className="ml-1.5 text-muted-foreground">{v.gender === "female" ? "woman" : "man"}</span>
                  </button>
                  <Listen url={v.preview} name={v.name} listen={listen} testid={`listen-${v.name.toLowerCase()}`}/>
                </li>);
        })}
          </ul>
          {d.voice_id && (<button type="button" className="text-xs text-primary hover:underline" onClick={() => set("voice_id", null)} data-testid="voice-clear">
              Use no voice from the list
            </button>)}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Or upload a recording of its voice</Label>
          {!saved ? (<p className="text-xs text-muted-foreground">Save the avatar first, then come back to add a recording.</p>) : (<>
              {saved.voice.sample && (<div className="flex flex-wrap items-center gap-2">
                  <audio controls preload="none" src={`/api/assets/${saved.voice.sample}`} className="h-8 w-full max-w-72" aria-label="The uploaded recording" data-testid="avatar-sample"/>
                  <Button type="button" size="sm" variant="ghost" className="h-7" disabled={saving} onClick={clearRecording} data-testid="avatar-sample-clear">
                    <Trash2 className="size-3.5"/>
                    Remove the recording
                  </Button>
                </div>)}
              <label className="flex items-start gap-1.5 text-xs">
                <input type="checkbox" className="mt-0.5" checked={ours} onChange={(e) => setOurs(e.target.checked)} data-testid="avatar-voice-stated"/>
                This voice is ours to use in ads: we made it, or the person who spoke agreed.
              </label>
              <input ref={recording} type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" className="hidden" onChange={(e) => e.target.files?.[0] && void upload("voice", e.target.files[0])} data-testid="avatar-voice-file"/>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={!ours || !!sending} onClick={() => recording.current?.click()} data-testid="avatar-voice-upload">
                  {sending === "voice" ? <Loader2 className="size-3.5 animate-spin"/> : <Upload className="size-3.5"/>}
                  {saved.voice.sample ? "Upload another recording" : "Upload a recording"}
                </Button>
                <span className="text-xs text-muted-foreground">MP3, WAV or M4A, up to 10 MB. A recording is what a video matches, ahead of a voice from the list.</span>
              </div>
            </>)}
        </div>
      </div>

      {saved && (<div className="space-y-1.5 rounded-md border bg-background p-3" data-testid="avatar-picture">
          <p className="text-sm font-medium">Its picture</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy || !live || saving} title={!live ? "Not switched on for this account." : undefined} onClick={() => confirm(advanced ? `Draw ${saved.portrait ? "a new" : "the"} picture? About $${IMAGE_USD.toFixed(2)}. Save your edits first: the picture is drawn from the saved description.` : `Draw ${saved.portrait ? "a new" : "the"} picture? Save your edits first: the picture is drawn from the saved description.`) && onDraw(saved.id)} data-testid="avatar-draw">
              <ImageIcon className="size-3.5"/>
              {saved.portrait ? "Draw again" : "Draw the picture"}
            </Button>
            <input ref={picture} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload("portrait", e.target.files[0])} data-testid="avatar-picture-file"/>
            <Button type="button" size="sm" variant="outline" disabled={!made || !!sending} onClick={() => picture.current?.click()} data-testid="avatar-picture-upload">
              {sending === "portrait" ? <Loader2 className="size-3.5 animate-spin"/> : <Upload className="size-3.5"/>}
              Upload a picture
            </Button>
          </div>
          <NotARealPerson checked={made} onChange={setMade} testid="avatar-picture-stated"/>
        </div>)}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onClose} data-testid="avatar-cancel">
          Cancel
        </Button>
        {mode === "describe" ? (<>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => save(false)} data-testid="avatar-save">
              Save without a picture
            </Button>
            <Button type="button" size="sm" disabled={saving || busy || !live || !described} title={!live ? "Not switched on for this account." : !described ? "Describe it first." : undefined} onClick={() => save(true)} data-testid="avatar-save-draw">
              {saving ? <Loader2 className="size-4 animate-spin"/> : <ImageIcon className="size-4"/>}
              Save and draw it{advanced ? ` (about $${IMAGE_USD.toFixed(2)})` : ""}
            </Button>
          </>) : (<Button type="button" size="sm" disabled={saving} onClick={() => save(false)} data-testid="avatar-save">
            {saving && <Loader2 className="size-4 animate-spin"/>}
            Save the avatar
          </Button>)}
      </div>
    </div>);
}
function UploadForm({ persona, looks, onClose, onDone }: {
    persona: Persona;
    looks: Props["looks"];
    onClose: () => void;
    onDone: (a: Avatar) => Promise<void>;
}) {
    const [name, setName] = useState("");
    const [kind, setKind] = useState<AvatarKind>("character");
    const [style, setStyle] = useState<string | null>(null);
    const [made, setMade] = useState(false);
    const [sending, setSending] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const upload = async (file: File) => {
        setSending(true);
        const res = await send({ kind: "portrait", name, persona_id: persona.id, avatar_kind: kind, style: kind === "character" ? (style ?? "") : "", stated: made ? "yes" : "no" }, file);
        setSending(false);
        if (input.current)
            input.current.value = "";
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(`${res.avatar.name} is saved. Now describe it and give it a voice.`);
        await onDone(res.avatar);
    };
    return (<div className="space-y-3 rounded-md border bg-muted/30 p-3" data-testid="avatar-upload-form">
      <div>
        <p className="text-sm font-medium">Upload a character you made before</p>
        <p className="text-xs text-muted-foreground">1 clear picture of it, front on. PNG, JPG or WebP, up to 20 MB.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" hint="A name your team will know it by.">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Maya, the night nurse" data-testid="avatar-upload-name"/>
        </Field>
        <Field label="What it is">
          <div className="flex flex-wrap gap-2">
            {(["character", "person"] as const).map((k) => (<button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("rounded-full border px-3 py-1 text-xs", kind === k ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted")} data-testid={`avatar-upload-kind-${k}`}>
                {k === "person" ? "A made-up person" : KIND_LABEL.character}
              </button>))}
          </div>
          <p className="text-xs text-muted-foreground">{kind === "person" ? "Looks filmed, but nobody real: a face your team generated." : "Clay, paper, drawn, a skeleton, an object with a face."}</p>
        </Field>
      </div>
      {kind === "character" && (<Field label="The look it is made in" hint="It is offered to videos of this look.">
          <Select value={style ?? NO_LOOK} onValueChange={(v) => setStyle(v === NO_LOOK ? null : v)}>
            <SelectTrigger className="w-full sm:w-72" data-testid="avatar-upload-look">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LOOK}>Any look</SelectItem>
              {looks.map((l) => (<SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </Field>)}
      <NotARealPerson checked={made} onChange={setMade} testid="avatar-upload-stated"/>
      <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} data-testid="avatar-upload-file"/>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={sending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={sending || !made || name.trim().length < 2} title={name.trim().length < 2 ? "Give it a name first." : !made ? "Tick the box first." : undefined} onClick={() => input.current?.click()} data-testid="avatar-upload-choose">
          {sending ? <Loader2 className="size-4 animate-spin"/> : <Upload className="size-4"/>}
          {sending ? "Uploading" : "Choose the picture"}
        </Button>
      </div>
    </div>);
}
function NotARealPerson({ checked, onChange, testid }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    testid: string;
}) {
    return (<div className="space-y-1">
      <label className="flex items-start gap-1.5 text-xs">
        <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testid}/>
        This is a character our team made. It is not a real person.
      </label>
      <p className="text-xs text-muted-foreground">
        A real person (your founder, a customer, an expert, someone on your team) is never an avatar. Add them under{" "}
        <Link href="/brand?tab=customers#people" className="text-primary hover:underline">
          Real people
        </Link>{" "}
        on the Brand screen, under Customers, with their consent.
      </p>
    </div>);
}
function Field({ label, hint, children }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (<div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>);
}
