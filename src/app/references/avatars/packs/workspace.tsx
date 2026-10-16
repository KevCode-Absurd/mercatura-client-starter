"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PACK_SETTINGS } from "@/lib/avatar-packs/presets";
import type { AvatarPack } from "@/lib/avatar-packs/types";
import { pollWhileVisible } from "@/lib/visible-polling";
import { Adv, Simple } from "@/components/mode";
const MakeAssetsDialog = dynamic(() => import("@/app/production/make-assets").then(m => m.MakeAssetsDialog));
type Setting = {
    label: string;
    location: string;
    action: string;
    wardrobe: string;
    camera: string;
    lighting: string;
};
type DraftSetting = Setting & {
    key: string;
};
type Creation = {
    op: "create";
    requestId: string;
    avatarId: string;
    name: string;
    aspect: "9:16" | "4:5" | "1:1";
    settings: Setting[];
};
type Pending = Creation | {
    op: "rerun";
    packId: string;
    frameId: string;
    requestId: string;
    correction: string;
};
type Data = {
    avatars: {
        id: string;
        name: string;
        portrait: string;
    }[];
    packs: AvatarPack[];
    generationEnabled: boolean;
    disabledReason?: string;
    remainingImages: number;
    modelName: string;
    priceNote: string;
};
const ACTIVE = ["queued", "running"];
const fieldClass = "block w-full rounded-md border bg-background px-3 py-2 text-sm";
export function AvatarPacksWorkspace({ brandId, brandName, initialAvatarId }: {
    brandId: string;
    brandName: string;
    initialAvatarId?: string;
}) {
    const [data, setData] = useState<Data | null>(null);
    const [loadError, setLoadError] = useState("");
    const [avatarId, setAvatarId] = useState(initialAvatarId ?? "");
    const [name, setName] = useState(`${brandName} settings`.slice(0, 80));
    const [aspect, setAspect] = useState<Creation["aspect"]>("9:16");
    const [settings, setSettings] = useState<DraftSetting[]>([]);
    const [summary, setSummary] = useState<Creation | null>(null);
    const [pending, setPending] = useState<Pending | null>(null);
    const [busy, setBusy] = useState(false);
    const [ready, setReady] = useState(false);
    const [reuse, setReuse] = useState<{
        avatarId: string;
        frameId: string;
        recipe: string;
    } | null>(null);
    const lock = useRef(false);
    const storageKey = `avatar-pack-request:${brandId}`;
    const refresh = useCallback(async () => {
        const response = await fetch("/api/avatar-packs", { cache: "no-store" });
        if (!response.ok)
            throw new Error("Could not load saved settings packs.");
        const next = await response.json() as Data;
        setData(next);
        setLoadError("");
        setAvatarId(current => current || next.avatars[0]?.id || "");
    }, []);
    useEffect(() => {
        void refresh().catch(e => setLoadError(e.message));
        try {
            const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
            if (saved?.requestId && (saved.op === "create" || saved.op === "rerun"))
                setPending(saved);
        }
        catch { }
        setReady(true);
    }, [refresh, storageKey]);
    const working = data?.packs.some(p => p.frames.some(f => ACTIVE.includes(f.status))) ?? false;
    useEffect(() => working ? pollWhileVisible(refresh, 3000) : undefined, [working, refresh]);
    const remember = (request: Pending | null) => { setPending(request); try {
        if (request)
            sessionStorage.setItem(storageKey, JSON.stringify(request));
        else
            sessionStorage.removeItem(storageKey);
    }
    catch { } };
    const send = async (body: Record<string, unknown>): Promise<AvatarPack> => {
        const response = await fetch("/api/avatar-packs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok || !result.pack)
            throw Object.assign(new Error(result.error ?? "Could not update this pack."), { answered: true });
        return result.pack;
    };
    const generate = async (request: Pending) => {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        remember(request);
        try {
            const pack = await send(request);
            setData(old => old ? { ...old, packs: [pack, ...old.packs.filter(p => p.id !== pack.id)] } : old);
            remember(null);
            setSummary(null);
            toast.success(request.op === "create" ? "Selected settings queued. Review each image when it is ready." : "Only this frame was queued again.");
            await refresh().catch(() => toast.error("The request was saved, but the latest progress could not be loaded. Reload to check it."));
        }
        catch (error) {
            if ((error as {
                answered?: boolean;
            }).answered)
                remember(null);
            toast.error((error as {
                answered?: boolean;
            }).answered ? (error as Error).message : "The response was lost. Check this same request again before starting another pack.");
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    };
    const review = async (packId: string, frameId: string, decision: "kept" | "rejected") => {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        try {
            const pack = await send({ op: "review", packId, frameId, decision });
            setData(old => old ? { ...old, packs: old.packs.map(p => p.id === pack.id ? pack : p) } : old);
        }
        catch (e) {
            toast.error((e as Error).message);
            await refresh().catch(() => { });
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    };
    const change = (key: string, field: keyof Setting, value: string) => { setSettings(old => old.map(s => s.key === key ? { ...s, [field]: value } : s)); setSummary(null); };
    const chosenAvatar = data?.avatars.find(a => a.id === avatarId);
    const valid = !!chosenAvatar && !!name.trim() && settings.length > 0 && settings.length <= 6 && settings.every(s => Object.entries(s).every(([k, v]) => k === "key" || !!v.trim()));
    return <div className="space-y-8 p-4 sm:p-6" data-testid="settings-pack-workspace" data-ready={ready}>
    {loadError && <div role="alert" className="rounded-lg border p-4 text-sm">{loadError}<Button variant="outline" className="ml-3" onClick={() => void refresh().catch(e => setLoadError(e.message))}>Try loading again</Button></div>}
    {!data && !loadError && <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin"/>Loading saved avatars and settings…</p>}
    {pending && <div role="alert" className="space-y-2 rounded-lg border border-amber-500 p-4 text-sm" data-testid="pack-pending-request"><p>A generation request needs its result checked. The saved request keeps the same choices, so checking it cannot queue duplicate images.</p><Button disabled={busy} onClick={() => void generate(pending)}>Check this request again</Button></div>}
    {data && <>
      <section className="space-y-5 rounded-xl border bg-card p-5">
        <div><h2 className="text-xl font-semibold">Choose settings for your brand</h2><p className="mt-1 text-sm text-muted-foreground">Start with a saved fictional adult. Every setting uses the same face master. Edit the location, clothes and camera to fit {brandName}.</p></div>
        {!data.avatars.length ? <p className="text-sm">Save an avatar with a portrait first. <Link className="text-primary underline" href="/references/avatars">Browse or make an avatar</Link>.</p> : <>
          <div className="flex gap-4">{chosenAvatar && <img src={`/api/assets/${chosenAvatar.portrait}?w=240`} alt={`${chosenAvatar.name} identity master`} className="h-28 w-24 rounded-lg object-cover"/>}<div className="grid flex-1 gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm">Avatar<select aria-label="Avatar" className={fieldClass} value={avatarId} disabled={busy || !!pending || !!summary} onChange={e => setAvatarId(e.target.value)}>{data.avatars.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
            <label className="space-y-1 text-sm">Pack name<Input aria-label="Pack name" maxLength={80} value={name} disabled={busy || !!pending || !!summary} onChange={e => setName(e.target.value)}/></label>
            <label className="space-y-1 text-sm">Aspect ratio<select aria-label="Aspect ratio" className={fieldClass} value={aspect} disabled={busy || !!pending || !!summary} onChange={e => setAspect(e.target.value as Creation["aspect"])}><option value="9:16">9:16 · portrait video</option><option value="4:5">4:5 · feed image</option><option value="1:1">1:1 · square</option></select></label>
          </div></div>
          {!summary ? <>
            <fieldset disabled={busy || !!pending} className="space-y-3"><legend className="mb-3 text-sm font-medium">Select up to six settings</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{PACK_SETTINGS.map(p => <label key={p.id} className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm ${settings.some(s => s.key === p.id) ? "border-primary bg-primary/5" : ""}`}><input type="checkbox" data-testid={`preset-${p.id}`} aria-label={p.label} checked={settings.some(s => s.key === p.id)} disabled={!settings.some(s => s.key === p.id) && settings.length >= 6} onChange={e => setSettings(old => e.target.checked ? [...old, { key: p.id, label: p.label, location: p.location, action: p.action, wardrobe: p.wardrobe, camera: p.camera, lighting: p.lighting }] : old.filter(s => s.key !== p.id))}/><span><span className="block font-medium">{p.label}</span><span className="mt-1 block text-xs text-muted-foreground">{p.for}</span></span></label>)}</div></fieldset>
            <div className="space-y-4">{settings.map(s => <fieldset key={s.key} disabled={busy || !!pending} className="space-y-3 rounded-lg border p-4"><div className="flex items-center justify-between"><legend className="font-medium">{s.label || "Custom setting"}</legend><Button size="sm" variant="ghost" onClick={() => setSettings(old => old.filter(x => x.key !== s.key))}>Remove {s.label || "setting"}</Button></div><label className="block text-sm">Setting name<Input aria-label={`${s.key} setting name`} maxLength={80} value={s.label} onChange={e => change(s.key, "label", e.target.value)}/></label><div className="grid gap-3 sm:grid-cols-2">{(["location", "action", "wardrobe", "camera", "lighting"] as const).map(field => <label key={field} className="block space-y-1 text-sm"><span className="capitalize">{field === "action" ? "Visible action" : field}</span><Textarea aria-label={`${s.label} ${field}`} rows={2} maxLength={300} value={s[field]} onChange={e => change(s.key, field, e.target.value)}/></label>)}</div></fieldset>)}</div>
            <Button variant="outline" disabled={busy || !!pending || settings.length >= 6} onClick={() => setSettings(old => [...old, { key: `custom-${crypto.randomUUID()}`, label: "Custom setting", location: "", action: "", wardrobe: "", camera: "", lighting: "" }])}><Plus className="size-4"/>Add a custom setting</Button>
            <p className="text-xs text-muted-foreground">Make clean creator references here. Add approved products and ad copy later when setting up the creative.</p>
            <Button disabled={!valid || busy || !!pending} onClick={() => setSummary({ op: "create", requestId: crypto.randomUUID(), avatarId, name: name.trim(), aspect, settings: settings.map(({ key: _key, ...s }) => s) })}>Review pack</Button>
          </> : <div className="space-y-4 rounded-lg border bg-muted/30 p-4" data-testid="pack-review-summary">
            <h3 className="font-semibold">Review before generating</h3><p className="text-sm">{summary.name} · {chosenAvatar?.name} · {summary.aspect} · {summary.settings.length} separate images</p><ul className="space-y-2 text-sm">{summary.settings.map((s, i) => <li key={i}><strong>{s.label}</strong>: {s.location}. {s.action}. {s.wardrobe}. {s.camera}. {s.lighting}.</li>)}</ul>
            <p className="text-sm">Reference: {chosenAvatar?.name}&apos;s saved face master, used for identity in every image. Scene lighting can change; facial identity stays fixed. Check likeness, hands and framing before keeping a result.</p>

            <Simple><p className="text-sm">This makes {summary.settings.length} {summary.settings.length === 1 ? "picture" : "pictures"}, counted against the picture limit. No video is made.</p></Simple>
            <Adv><p className="text-sm">{data.modelName}: {data.priceNote}. This requests {summary.settings.length} images against the image limit; actual usage and charges appear with results. Provider fallback may change the price. No video is generated.</p></Adv>
            {!data.generationEnabled && <p role="alert" className="text-sm text-amber-700">{data.disabledReason}</p>}{data.remainingImages < summary.settings.length && <p role="alert" className="text-sm text-amber-700">Only {data.remainingImages} image slots remain. Choose fewer settings or raise the limit in Settings.</p>}
            <div className="flex flex-wrap gap-2"><Button disabled={busy || !!pending || !data.generationEnabled || data.remainingImages < summary.settings.length} onClick={() => void generate(summary)}>{busy ? <Loader2 className="size-4 animate-spin"/> : null}Generate pack</Button><Button variant="outline" disabled={busy || !!pending} onClick={() => setSummary(null)}>Back to settings</Button></div>
          </div>}
        </>}
      </section>
      <section className="space-y-5"><h2 className="text-xl font-semibold">Saved packs</h2><p className="text-sm text-muted-foreground">Keep the images that match your avatar and brand. Kept references are available in Make assets for future images and videos.</p>{!data.packs.length && <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No settings pack yet. Your selected images will appear here.</p>}{data.packs.map(pack => <div key={pack.id} className="space-y-4 rounded-xl border bg-card p-5" data-testid={`settings-pack-${pack.id}`}><div className="flex items-center gap-3"><a href={`/api/assets/${pack.sourceSnapshot}`} target="_blank" rel="noreferrer"><img src={`/api/assets/${pack.sourceSnapshot}?w=160`} alt={`${pack.name} source identity master`} className="h-20 w-16 rounded-md border object-cover" loading="lazy"/></a><div><h3 className="font-semibold">{pack.name}</h3><p className="text-xs text-muted-foreground">{data.avatars.find(a => a.id === pack.avatarId)?.name ?? "Earlier avatar"} · {pack.aspect} · {pack.frames.length} settings</p><p className="mt-1 text-xs text-muted-foreground">Compare each result with this saved identity master.</p></div></div>{!pack.current && <p role="alert" className="rounded-md bg-amber-500/10 p-3 text-sm">The avatar master changed or is no longer saved. This pack needs review. Its images remain here; create a new pack from the current master before reusing references.</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pack.frames.map(frame => <Frame key={frame.id} pack={pack} frame={frame} disabled={busy || !!pending} generationEnabled={data.generationEnabled} onReview={decision => void review(pack.id, frame.id, decision)} onRerun={correction => void generate({ op: "rerun", packId: pack.id, frameId: frame.id, requestId: crypto.randomUUID(), correction })} onUse={recipe => setReuse({ frameId: frame.id, avatarId: pack.avatarId, recipe })}/>)}</div></div>)}</section>
    </>}
    {reuse && <MakeAssetsDialog open onOpenChange={open => { if (!open)
        setReuse(null); }} initialRecipe={reuse.recipe} initialAvatarId={reuse.avatarId} initialAvatarReferenceId={reuse.frameId}/>}
  </div>;
}
function Frame({ pack, frame, disabled, generationEnabled, onReview, onRerun, onUse }: {
    pack: AvatarPack;
    frame: AvatarPack["frames"][number];
    disabled: boolean;
    generationEnabled: boolean;
    onReview: (decision: "kept" | "rejected") => void;
    onRerun: (correction: string) => void;
    onUse: (recipe: string) => void;
}) {
    const [correction, setCorrection] = useState("");
    const attempt = frame.currentAttempt;
    const complete = frame.status === "completed";
    const usable = complete && frame.review === "kept" && pack.current;
    return <article className="space-y-3 rounded-lg border p-3" data-testid={`pack-frame-${frame.id}`}>
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{frame.setting.label}</h4><span className="text-xs capitalize" data-testid="frame-status">{frame.status}</span></div>
    {attempt.imageUrl ? <a href={attempt.imageUrl} target="_blank" rel="noreferrer"><img src={attempt.imageUrl} alt={`${frame.setting.label} reference`} className="aspect-[4/5] w-full rounded-md bg-muted object-contain" loading="lazy"/></a> : <div className="flex aspect-[4/5] items-center justify-center rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">{ACTIVE.includes(frame.status) ? <><Loader2 className="mr-2 size-4 animate-spin"/>Making this setting…</> : "No image was returned for this attempt."}</div>}
    <p className="text-xs text-muted-foreground">{frame.setting.location} · {frame.setting.wardrobe}</p>
    <details className="text-xs"><summary className="cursor-pointer py-1">Setting brief</summary><dl className="space-y-1 text-muted-foreground">{(["location", "action", "wardrobe", "camera", "lighting"] as const).map(key => <div key={key}><dt className="inline font-medium capitalize">{key}: </dt><dd className="inline">{frame.setting[key]}</dd></div>)}</dl></details>

    <Adv><div className="text-xs text-muted-foreground">{attempt.width && attempt.height ? `${attempt.width} × ${attempt.height} pixels · ` : ""}{attempt.costUsd !== undefined ? `$${attempt.costUsd.toFixed(3)} logged` : "Cost recorded after generation"}</div></Adv>
    {attempt.error && <p role="alert" className="text-xs text-destructive">{attempt.error}</p>}
    <p className="text-xs" data-testid="frame-review">{frame.review === "kept" ? "Kept as reference" : frame.review === "rejected" ? "Rejected" : "Awaiting your review"}</p>
    {complete && <div className="flex flex-wrap gap-2"><Button size="sm" variant={frame.review === "kept" ? "default" : "outline"} disabled={disabled || !pack.current} data-testid="keep-frame" onClick={() => onReview("kept")}>Keep</Button><Button size="sm" variant="outline" disabled={disabled} data-testid="reject-frame" onClick={() => onReview("rejected")}>Reject</Button><a className="inline-flex items-center text-xs text-primary underline" href={attempt.imageUrl} download>Download image</a></div>}
    {usable && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={disabled} data-testid="use-reference-image" onClick={() => onUse("static-concept")}>Use in image</Button><Button size="sm" variant="outline" disabled={disabled} data-testid="use-reference-video" onClick={() => onUse("ugc")}>Use in video</Button></div>}
    {!ACTIVE.includes(frame.status) && <details><summary className="cursor-pointer py-2 text-xs">Correct and rerun this frame</summary><div className="space-y-2"><Textarea aria-label={`Correction for ${frame.setting.label}`} data-testid="correction" rows={2} maxLength={600} placeholder="Describe one concrete correction, e.g. keep the master eye shape and relax the hand." value={correction} onChange={e => setCorrection(e.target.value)} disabled={disabled}/><p className="text-xs text-muted-foreground">Makes one new image. Earlier attempts and other settings are kept. Review the new result again.</p>{frame.status === "uncertain" && <p className="text-xs text-amber-700">The earlier request may have been charged. This explicitly starts a new paid attempt.</p>}<Button size="sm" variant="outline" data-testid="rerun-frame" disabled={disabled || !pack.current || !generationEnabled || !correction.trim()} onClick={() => onRerun(correction.trim())}>Rerun frame</Button></div></details>}
    {frame.attempts.length > 1 && <details><summary className="cursor-pointer py-2 text-xs">Earlier attempts ({frame.attempts.length - 1})</summary><ul className="space-y-2 text-xs">{frame.attempts.filter(a => a.id !== frame.currentAttemptId).map(a => <li key={a.id}>{a.imageUrl && <a href={a.imageUrl} target="_blank" rel="noreferrer" className="text-primary underline">View earlier image</a>} · {a.status} · {a.review}</li>)}</ul></details>}
  </article>;
}
