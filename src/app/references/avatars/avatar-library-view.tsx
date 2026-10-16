"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, ImageOff, Loader2, Search, Sparkles, Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdvanced } from "@/components/mode";
import { cn } from "@/lib/utils";
import { pollWhileVisible } from "@/lib/visible-polling";
type AvatarTags = {
    collection?: "Campaign-ready" | "UGC creators";
    gender: "Female" | "Male" | "Nonbinary";
    age: number;
    ageGroup: string;
    skinTone: string;
    ethnicity: string;
    heritage: string;
    source: "character-brief";
};
type Avatar = {
    id: string;
    label: string;
    portraitUrl: string;
    thumbnailUrl: string;
    tags?: AvatarTags;
};
type Aesthetic = {
    id: string;
    title: string;
    description: string;
    scene: string;
    lighting: string;
    imageUrl: string;
    thumbnailUrl: string;
};
type Generation = {
    id: string;
    requestId: string;
    avatarId: string;
    aestheticId: string;
    status: "queued" | "running" | "completed" | "failed" | "interrupted";
    createdAt: string;
    updatedAt: string;
    imageUrl?: string;
    originalUrl?: string;
    error?: string;
    costUsd?: number;
    note?: string;
    said?: string;
};
type Library = {
    avatars: Avatar[];
    aesthetics: Aesthetic[];
    generations: Generation[];
    generationEnabled: boolean;
    disabledReason?: string;
};
type PersonaChoice = {
    id: string;
    name: string;
};
const PAGE_SIZE = 36;
const NONE = "__none";
const TAG_FILTERS = [
    { key: "collection", label: "Collection", all: "All collections" },
    { key: "gender", label: "Gender", all: "All genders" },
    { key: "ageGroup", label: "Age group", all: "All ages" },
    { key: "skinTone", label: "Skin tone", all: "All skin tones" },
    { key: "ethnicity", label: "Ethnicity", all: "All ethnicities" },
] as const;
type TagFilter = (typeof TAG_FILTERS)[number]["key"];
const EMPTY_FILTERS: Record<TagFilter, string> = { collection: "", gender: "", ageGroup: "", skinTone: "", ethnicity: "" };
const MADE_UP = "Every avatar is a made-up adult, not a real person. The tags say how each one was described.";
const active = (g: Generation) => g.status === "queued" || g.status === "running";
async function responseJson<T>(response: Response): Promise<T> {
    const json = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(json?.error || "That did not work. Please try again.");
    if (!json)
        throw new Error("The app sent back nothing. Please try again.");
    return json as T;
}
function Portrait({ src, alt, className, eager = false }: {
    src: string;
    alt: string;
    className?: string;
    eager?: boolean;
}) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    if (failed)
        return <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}><ImageOff aria-label="This picture can't be shown"/></div>;
    return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={className} onError={() => setFailed(true)}/>;
}
function TagChips({ tags, compact = false }: {
    tags?: AvatarTags;
    compact?: boolean;
}) {
    if (!tags)
        return null;
    return <div className="flex flex-wrap gap-1.5" aria-label="Character tags">{[
            ...(tags.collection ? [{ label: "Collection", value: tags.collection }] : []),
            { label: "Gender", value: tags.gender },
            { label: "Age", value: `${tags.age} years` },
            { label: "Skin tone", value: tags.skinTone },
            { label: "Ethnicity", value: tags.ethnicity },
        ].map(({ label, value }) => <span key={label} title={`${label}: ${value}`} className={cn("rounded-full border border-border bg-muted/50 px-2 py-0.5 font-normal text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>{value}</span>)}</div>;
}
export function AvatarLibraryView({ personas, makeYourOwn }: {
    personas: PersonaChoice[];
    makeYourOwn: React.ReactNode;
}) {
    const [library, setLibrary] = useState<Library | null>(null);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const [view, setView] = useState<"avatars" | "portraits" | "own">("avatars");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [aestheticId, setAestheticId] = useState<string | null>(null);
    const [scene, setScene] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [uploadOpen, setUploadOpen] = useState(false);
    const [resultId, setResultId] = useState<string | null>(null);
    const requestIds = useRef(new Map<string, string>());
    const sending = useRef(false);
    const advanced = useAdvanced();
    const refresh = useCallback(async () => {
        try {
            const data = await responseJson<Library>(await fetch("/api/avatar-library", { cache: "no-store" }));
            setLibrary(data);
            setLoadError("");
        }
        catch (error) {
            setLoadError(error instanceof Error ? error.message : "Could not load the avatar library.");
        }
    }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    const pending = library?.generations.some(active) ?? false;
    useEffect(() => {
        if (!pending)
            return;
        return pollWhileVisible(refresh, 4000);
    }, [pending, refresh]);
    const avatar = library?.avatars.find((item) => item.id === selectedId);
    const aesthetic = library?.aesthetics.find((item) => item.id === aestheticId);
    const filtered = useMemo(() => (library?.avatars ?? []).filter((item) => `${item.label} ${item.id}`.toLowerCase().includes(search.trim().toLowerCase()) &&
        TAG_FILTERS.every(({ key }) => !filters[key] || item.tags?.[key] === filters[key])), [library?.avatars, search, filters]);
    const filterOptions = useMemo(() => Object.fromEntries(TAG_FILTERS.map(({ key }) => [key,
        [...new Set((library?.avatars ?? []).map((item) => item.tags?.[key]).filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    ])) as Record<TagFilter, string[]>, [library?.avatars]);
    const hasFilters = !!search || Object.values(filters).some(Boolean);
    const generations = useMemo(() => [...(library?.generations ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [library?.generations]);
    const avatarGenerations = generations.filter((item) => item.avatarId === selectedId);
    const generating = avatarGenerations.find(active);
    const shownResult = avatarGenerations.find((item) => item.id === resultId) ?? avatarGenerations[0];
    const scenes = [...new Set((library?.aesthetics ?? []).map((item) => item.scene).filter(Boolean))];
    const aesthetics = (library?.aesthetics ?? []).filter((item) => !scene || item.scene === scene);
    function inspect(id: string, generationId?: string) {
        setSelectedId(id);
        setResultId(generationId ?? null);
        setSubmitError("");
        if (id !== selectedId)
            setNote("");
    }
    async function generate() {
        if (!avatar || !aesthetic || sending.current || generating || !library?.generationEnabled)
            return;
        sending.current = true;
        setSubmitting(true);
        setSubmitError("");
        const key = `avatar-studio-request:${avatar.id}:${aesthetic.id}`;
        let requestId = requestIds.current.get(key);
        try {
            requestId ||= localStorage.getItem(key) ?? undefined;
        }
        catch { }
        requestId ||= crypto.randomUUID();
        requestIds.current.set(key, requestId);
        try {
            localStorage.setItem(key, requestId);
        }
        catch { }
        try {
            const { generation } = await responseJson<{
                generation: Generation;
            }>(await fetch("/api/avatar-library/generate", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarId: avatar.id, aestheticId: aesthetic.id, requestId, ...(note.trim() ? { note: note.trim() } : {}) }),
            }));
            requestIds.current.delete(key);
            try {
                localStorage.removeItem(key);
            }
            catch { }
            setLibrary((current) => current && ({ ...current, generations: [generation, ...current.generations.filter((item) => item.id !== generation.id)] }));
            setResultId(generation.id);
        }
        catch (error) {
            setSubmitError(`${error instanceof Error ? error.message : "The picture could not be started."} Try again: the same picture is never made twice.`);
        }
        finally {
            sending.current = false;
            setSubmitting(false);
        }
    }
    if (!library)
        return (<div className="p-6" role="status">
      {loadError ? <div className="rounded-lg border bg-card p-6"><p>{loadError}</p><Button className="mt-4" variant="outline" onClick={() => void refresh()}>Try again</Button></div> : <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="size-4 animate-spin"/> Loading avatars…</div>}
    </div>);
    return (<div className="space-y-6 px-6 py-6" data-testid="avatar-library">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap rounded-md border bg-card p-1" role="group" aria-label="Avatar library view">
          <Button variant={view === "avatars" ? "default" : "ghost"} size="sm" onClick={() => setView("avatars")} aria-pressed={view === "avatars"}>Avatars <span className="opacity-70">{library.avatars.length}</span></Button>
          <Button variant={view === "portraits" ? "default" : "ghost"} size="sm" onClick={() => setView("portraits")} aria-pressed={view === "portraits"}>Your portraits <span className="opacity-70">{generations.filter((item) => item.status === "completed").length}</span></Button>
          <Button variant={view === "own" ? "default" : "ghost"} size="sm" onClick={() => setView("own")} aria-pressed={view === "own"} data-testid="make-your-own-tab">Make your own</Button>
        </div>
        {view === "avatars" && <div className="relative w-full sm:w-64"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground"/><Input aria-label="Find an avatar by number" placeholder="Find an avatar by number" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE); }}/></div>}
      </div>
      {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm"><span>The list could not be read again: {loadError}</span><Button size="sm" variant="outline" onClick={() => void refresh()}>Try again</Button></div>}
      {view === "avatars" ? <>
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {TAG_FILTERS.map(({ key, label, all }) => <div key={key} className="min-w-0 space-y-1.5"><Label htmlFor={`avatar-filter-${key}`} className="text-xs">{label}</Label><Select value={filters[key] || NONE} onValueChange={(value) => { setFilters((current) => ({ ...current, [key]: value === NONE ? "" : value })); setLimit(PAGE_SIZE); }}><SelectTrigger id={`avatar-filter-${key}`} className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-primary"><SelectValue placeholder={all}/></SelectTrigger><SelectContent><SelectItem value={NONE}>{all}</SelectItem>{filterOptions[key].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{MADE_UP}</p><Button size="sm" variant="ghost" disabled={!hasFilters} onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS); setLimit(PAGE_SIZE); }}>Reset filters</Button></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><p>Choose by the picture. Can&apos;t find the right one? <button type="button" className="font-medium text-primary hover:underline" onClick={() => setView("own")}>Make your own avatar</button></p><span className="shrink-0">{filtered.length} avatars</span></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.slice(0, limit).map((item) => <button key={item.id} type="button" onClick={() => inspect(item.id)} aria-label={`Open ${item.label}`} className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" data-testid="avatar-card">
            <div className="aspect-[9/16] w-full shrink-0 overflow-hidden bg-muted"><Portrait src={item.thumbnailUrl || item.portraitUrl} alt={item.label} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"/></div>
            <div className="w-full space-y-2 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{item.label}</span><span className="text-xs text-primary">Open</span></div><TagChips tags={item.tags} compact/></div>
          </button>)}
        </div>
        {filtered.length === 0 && <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground"><p>No avatars match these filters.</p><Button className="mt-3" variant="outline" onClick={() => { setSearch(""); setFilters(EMPTY_FILTERS); setLimit(PAGE_SIZE); }}>Clear search and filters</Button></div>}
        {limit < filtered.length && <div className="text-center"><Button variant="outline" onClick={() => setLimit((value) => value + PAGE_SIZE)}>Show more avatars</Button><p className="mt-2 text-xs text-muted-foreground">Showing {Math.min(limit, filtered.length)} of {filtered.length}</p></div>}
      </> : view === "portraits" ? <>
        {generations.length === 0 ? <div className="rounded-xl border bg-card px-6 py-16 text-center"><Sparkles className="mx-auto mb-4 size-6 text-muted-foreground"/><h2 className="display text-2xl">Your portraits will appear here</h2><p className="mt-2 text-sm text-muted-foreground">Choose an avatar and a scene photo to make your first one.</p><Button className="mt-6" variant="outline" onClick={() => setView("avatars")}>Browse avatars</Button></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {generations.map((item) => { const identity = library.avatars.find((entry) => entry.id === item.avatarId); return <button type="button" key={item.id} onClick={() => inspect(item.avatarId, item.id)} className="overflow-hidden rounded-xl border bg-card text-left focus-visible:ring-2 focus-visible:ring-primary"><div className="flex aspect-[9/16] items-center justify-center bg-muted">{item.imageUrl ? <Portrait src={item.imageUrl} alt={`${identity?.label ?? "Avatar"} portrait`} className="size-full object-contain"/> : <div className="px-4 text-center text-sm text-muted-foreground">{active(item) && <Loader2 className="mx-auto mb-2 size-5 animate-spin"/>}{item.status === "interrupted" ? "Stopped" : item.status === "failed" ? "Not made" : "Making your picture…"}</div>}</div><div className="p-3"><p className="text-sm font-medium">{identity?.label ?? "Avatar"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{library.aesthetics.find((entry) => entry.id === item.aestheticId)?.title ?? "Scene photo"}</p></div></button>; })}
        </div>}
      </> : makeYourOwn}

      <Sheet open={!!avatar} onOpenChange={(open) => { if (!open)
        setSelectedId(null); }}>
        <SheetContent className="w-full gap-0 sm:max-w-4xl">
          <SheetHeader className="border-b px-6 py-5 pr-12">
            <SheetTitle className="display text-2xl">{avatar?.label}</SheetTitle>
            <SheetDescription>Use this avatar as it is, or put its face into a scene photo first. The scene photo gives the place, the pose and the light.</SheetDescription>
          </SheetHeader>
          {avatar && <>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {avatar.tags && <div className="space-y-2"><TagChips tags={avatar.tags}/><p className="text-xs text-muted-foreground">{MADE_UP}</p></div>}
              <UseAvatar key={avatar.id} avatarId={avatar.id} suggested={avatar.label} personas={personas} says="Saves this avatar, with the picture below, to your brand." testid="use-avatar"/>
              <div className="grid grid-cols-2 gap-4">
                <figure><div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:h-80"><Portrait src={avatar.portraitUrl} alt={`Selected face: ${avatar.label}`} className="size-full object-contain" eager/></div><figcaption className="mt-2 text-sm font-medium">Your avatar <span className="ml-1 text-xs font-normal text-muted-foreground">Face and build</span></figcaption></figure>
                <figure><div className="flex h-64 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:h-80">{aesthetic ? <Portrait src={aesthetic.imageUrl} alt={`Scene photo: ${aesthetic.title}`} className="size-full object-contain" eager/> : <p className="px-6 text-center text-sm text-muted-foreground">Choose a scene photo below to see it here.</p>}</div><figcaption className="mt-2 text-sm font-medium">{aesthetic?.title ?? "Your scene photo"} <span className="ml-1 text-xs font-normal text-muted-foreground">Place, pose and light</span></figcaption></figure>
              </div>
              <section aria-labelledby="aesthetic-heading">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="aesthetic-heading" className="display text-2xl">Choose a scene photo</h2><p className="mt-1 text-sm text-muted-foreground">Its place, pose and light are kept. Only the face changes. You can also add your own.</p></div><Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}><Upload /> Add a scene photo</Button></div>
                {scenes.length > 1 && <div className="mt-4"><Label htmlFor="avatar-scene" className="sr-only">Show scene photos from</Label><Select value={scene || NONE} onValueChange={(value) => setScene(value === NONE ? "" : value)}><SelectTrigger id="avatar-scene" className="h-9 max-w-full rounded-md border border-input bg-card px-3 text-sm"><SelectValue placeholder="All places"/></SelectTrigger><SelectContent><SelectItem value={NONE}>All places</SelectItem>{scenes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {aesthetics.map((item) => <button type="button" key={item.id} aria-pressed={aestheticId === item.id} onClick={() => { setAestheticId(item.id); setSubmitError(""); }} className={cn("relative overflow-hidden rounded-lg border bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-primary", aestheticId === item.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")} data-testid="aesthetic-card"><div className="aspect-[3/4] bg-muted"><Portrait src={item.thumbnailUrl || item.imageUrl} alt={item.title} className="size-full object-cover"/></div>{aestheticId === item.id && <span className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground"><Check className="size-3"/></span>}<div className="p-2.5"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description || item.lighting}</p></div></button>)}
                </div>
                {!aesthetics.length && <p className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No scene photos here yet. Add one to start.</p>}
                {aesthetic && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{aesthetic.description}{aesthetic.lighting && ` · ${aesthetic.lighting}`}</p>}
              </section>
              {shownResult && <section aria-labelledby="portrait-result-heading" className="rounded-xl border bg-card p-4" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="portrait-result-heading" className="display text-2xl">Your portrait</h2>{shownResult.imageUrl && <Button asChild variant="outline" size="sm"><a href={shownResult.imageUrl} download><Download /> Download</a></Button>}</div>
                {shownResult.status === "completed" && shownResult.imageUrl ? <Portrait src={shownResult.imageUrl} alt={`Photorealistic picture of ${avatar.label}`} className="mx-auto mt-4 max-h-[36rem] w-full rounded-lg object-contain" eager/> : <div className="py-8 text-sm text-muted-foreground">{active(shownResult) ? <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin"/>{shownResult.status === "queued" ? "Your picture is waiting its turn." : "Making your picture…"} You can close this and come back later.</p> : <p role="alert">{shownResult.error || "This picture was not made. You can ask for a new one."}</p>}</div>}
                {shownResult.note && <p className="mt-3 text-xs text-muted-foreground" data-testid="portrait-note">You asked for: {shownResult.note}</p>}
                {shownResult.status === "completed" && shownResult.said && <p className="mt-3 text-xs text-muted-foreground" data-testid="portrait-said">{shownResult.said}</p>}
                {advanced && shownResult.costUsd != null && <p className="mt-3 text-xs text-muted-foreground" data-testid="portrait-cost">Cost of this picture: ${shownResult.costUsd.toFixed(3)}</p>}
                {shownResult.status === "completed" && shownResult.imageUrl && <div className="mt-4"><UseAvatar key={shownResult.id} avatarId={avatar.id} generationId={shownResult.id} suggested={avatar.label} personas={personas} says="Saves this avatar, with this new picture, to your brand." testid="use-portrait"/></div>}
                {avatarGenerations.length > 1 && <div className="mt-4 flex gap-2 overflow-x-auto border-t pt-4" aria-label="Earlier portraits">{avatarGenerations.map((item, index) => <button type="button" aria-label={`View portrait ${avatarGenerations.length - index}`} aria-pressed={shownResult.id === item.id} key={item.id} onClick={() => setResultId(item.id)} className={cn("h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-muted text-xs", shownResult.id === item.id && "ring-2 ring-primary")}>{item.imageUrl ? <Portrait src={item.imageUrl} alt="" className="size-full object-cover"/> : active(item) ? <Loader2 className="mx-auto size-4 animate-spin"/> : "Not made"}</button>)}</div>}
              </section>}
            </div>
            <div className="space-y-3 border-t bg-background px-6 py-4">
              {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
              {!library.generationEnabled && <p className="text-sm text-muted-foreground">{library.disabledReason || "Pictures can't be made right now."}</p>}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-md"><Label htmlFor="avatar-note" className="text-xs">Anything you want changed? (optional)</Label><Input id="avatar-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={400} placeholder="For example, a plain white T-shirt" disabled={submitting || !!generating} data-testid="avatar-note"/></div>
                <Button onClick={() => void generate()} disabled={!aesthetic || !library.generationEnabled || submitting || !!generating} data-testid="generate-avatar">{submitting || generating ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}{generating ? "Making your picture…" : submitting ? "Starting…" : "Make photorealistic"}</Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Puts this avatar&apos;s face into the scene photo. The framing, the pose and the light stay as they are.</p>
            </div>
          </>}
        </SheetContent>
      </Sheet>
      <UploadBasePhoto open={uploadOpen} onClose={() => setUploadOpen(false)} onAdded={(item) => { setLibrary((current) => current && ({ ...current, aesthetics: [item, ...current.aesthetics.filter((entry) => entry.id !== item.id)] })); setAestheticId(item.id); setScene(""); setUploadOpen(false); }}/>
    </div>);
}
function UseAvatar({ avatarId, generationId, suggested, personas, says, testid }: {
    avatarId: string;
    generationId?: string;
    suggested: string;
    personas: PersonaChoice[];
    says: string;
    testid: string;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(suggested);
    const [personaId, setPersonaId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState<string | null>(null);
    const id = useId();
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError("");
        try {
            const result = await responseJson<{
                avatar: {
                    id: string;
                    name: string;
                };
            }>(await fetch("/api/avatar-library/use", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarId, ...(generationId ? { generationId } : {}), name, personaId: personaId || null }),
            }));
            setSaved(result.avatar.id);
            setOpen(false);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The avatar could not be saved. Try again.");
        }
        finally {
            setBusy(false);
        }
    }
    if (saved)
        return <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm" data-testid={`${testid}-saved`}><Check className="mr-1.5 inline size-4 text-primary"/>Saved to your avatars. Pick it when you make a video. <Link href="/personas" className="font-medium text-primary hover:underline">See your avatars</Link><Link href={`/studio/creator?avatar=${encodeURIComponent(saved)}`} className="ml-3 inline-flex min-h-11 items-center font-medium text-primary hover:underline">Create a video with this avatar</Link></p>;
    if (!open)
        return <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} data-testid={testid}><UserPlus /> Use this avatar</Button><span className="text-xs text-muted-foreground">{says} You can then pick it when you make a video.</span></div>;
    return <form onSubmit={(event) => void save(event)} className="space-y-3 rounded-lg border bg-muted/30 p-3" data-testid={`${testid}-form`}>
    <p className="text-sm font-medium">Use this avatar</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor={`${id}-name`} className="text-xs">Name</Label><Input id={`${id}-name`} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={60} disabled={busy} data-testid={`${testid}-name`}/><p className="text-xs text-muted-foreground">A name your team will know it by.</p></div>
      {personas.length > 0 && <div className="space-y-1.5"><Label htmlFor={`${id}-persona`} className="text-xs">Keep it with a persona (optional)</Label><Select value={personaId || NONE} onValueChange={(value) => setPersonaId(value === NONE ? "" : value)} disabled={busy}><SelectTrigger id={`${id}-persona`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-primary" data-testid={`${testid}-persona`}><SelectValue placeholder="No persona"/></SelectTrigger><SelectContent><SelectItem value={NONE}>No persona</SelectItem>{personas.map((persona) => <SelectItem key={persona.id} value={persona.id}>{persona.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Videos for that buyer offer it first.</p></div>}
    </div>
    <p className="text-xs text-muted-foreground">{says} What its tags say (gender, age, skin tone) is filled in for you. Add its hair, its clothes and a voice later, where your avatars are kept.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button><Button type="submit" size="sm" disabled={busy} data-testid={`${testid}-save`}>{busy ? <Loader2 className="size-4 animate-spin"/> : <Check className="size-4"/>}Save to your avatars</Button></div>
  </form>;
}
function UploadBasePhoto({ open, onClose, onAdded }: {
    open: boolean;
    onClose: () => void;
    onAdded: (item: Aesthetic) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const form = useRef<HTMLFormElement>(null);
    useEffect(() => { if (open)
        setError(""); }, [open]);
    async function upload(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
            const result = await responseJson<{
                aesthetic: Aesthetic;
            }>(await fetch("/api/avatar-library/references", { method: "POST", body: data }));
            onAdded(result.aesthetic);
            form.current?.reset();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Could not upload the photo.");
        }
        finally {
            setBusy(false);
        }
    }
    return <Dialog open={open} onOpenChange={(next) => { if (!next && !busy)
        onClose(); }}><DialogContent><DialogHeader><DialogTitle>Add a scene photo</DialogTitle><DialogDescription>Use an upright photo of 1 person. Its place, pose and light are kept, and the avatar&apos;s face goes into it.</DialogDescription></DialogHeader><form ref={form} onSubmit={(event) => void upload(event)} className="space-y-4"><div className="space-y-2"><Label htmlFor="base-title">Name for this scene photo</Label><Input id="base-title" name="title" placeholder="For example, soft window light" required maxLength={100} disabled={busy}/></div><div className="space-y-2"><Label htmlFor="base-file">Scene photo</Label><Input id="base-file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy}/><p className="text-xs text-muted-foreground">An upright photo (9:16), JPG, PNG or WebP, up to 20 MB. The final picture is framed the same way.</p></div><label className="flex items-start gap-2 text-sm leading-relaxed"><input type="checkbox" name="rightsConfirmed" value="true" required disabled={busy} className="mt-1 accent-primary"/>I have permission to use and edit this photo, including the person’s likeness.</label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin"/> : <Upload />}Add scene photo</Button></div></form></DialogContent></Dialog>;
}
