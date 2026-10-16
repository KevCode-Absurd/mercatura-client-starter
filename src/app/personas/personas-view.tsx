"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ImageIcon, Loader2, Pencil, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { AWARENESS_LABEL, PERSONA_AWARENESS, SOURCE_LABEL, type DoubtPair, type PersonaAwareness, type PersonaProfile } from "@/lib/personas/types";
import { tabNames } from "@/lib/brain/file-names";
import { cn } from "@/lib/utils";
import type { Avatar } from "@/lib/avatars/types";
import type { ListedVoice } from "@/lib/avatars/voices";
import { buildPersonasAction, deletePersonaAction, drawAvatarAction, drawPersonasAction, fillDoubtsAction, fillMissingDoubtsAction, personasStatusAction, savePersonaAction } from "./actions";
import { AvatarsSection, avatarImg } from "./avatars";
interface Props {
    brandName: string;
    initial: PersonaProfile[];
    avatars: Avatar[];
    voices: ListedVoice[];
    looks: {
        id: string;
        label: string;
    }[];
    products: {
        id: string;
        name: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    live: boolean;
    data: {
        simulated: boolean;
        period: string;
        segments: number;
        source: string;
    } | null;
    inConcepts: Record<string, number>;
}
const IMAGE_USD = 0.04;
const money = (n: number) => (n >= 1000 ? `$${Math.round(n / 100) / 10}k` : `$${n.toFixed(2)}`);
const img = (p: PersonaProfile, w: number) => `/api/assets/${p.image}?w=${w}`;
const blank = (): Draft => ({ name: "", summary: "", problem: "", trigger: "", language: "", who: { age: "", gender: "", life: "" }, wants: "", identity: "", notes: "", doubts: [], tried: "", believes: "", angle: "", awareness: "problem_aware", product_ids: [], offer_id: null, sounds_like: "", look: "", status: "draft" });
interface Draft {
    id?: string;
    name: string;
    summary: string;
    problem: string;
    trigger: string;
    language: string;
    who: {
        age: string;
        gender: string;
        life: string;
    };
    wants: string;
    identity: string;
    notes: string;
    doubts: DoubtPair[];
    tried: string;
    believes: string;
    angle: string;
    awareness: PersonaAwareness;
    product_ids: string[];
    offer_id: string | null;
    sounds_like: string;
    look: string;
    status: "active" | "draft";
}
const toDraft = (p: PersonaProfile): Draft => ({ id: p.id, name: p.name, summary: p.summary, problem: p.problem, trigger: p.trigger, language: p.language.join("\n"), who: p.who, wants: p.wants, identity: p.identity ?? "", notes: p.notes ?? "", doubts: p.doubts ?? [], tried: (p.tried ?? []).join("\n"), believes: (p.believes ?? []).join("\n"), angle: p.angle, awareness: p.awareness, product_ids: p.product_ids, offer_id: p.offer_id, sounds_like: p.sounds_like.join("\n"), look: p.look, status: p.status });
const rows = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
export function PersonasView({ brandName, initial, avatars: initialAvatars, voices, looks, products, offers, live, data, inConcepts }: Props) {
    const router = useRouter();
    const [personas, setPersonas] = useState(initial);
    const [avatars, setAvatars] = useState(initialAvatars);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const [building, setBuilding] = useState(false);
    const [editing, setEditing] = useState<Draft | null>(null);
    const advanced = useAdvanced();
    const refresh = useCallback(async () => {
        const res = await personasStatusAction();
        if (res.ok) {
            setPersonas(res.personas);
            setAvatars(res.avatars);
            setBusy(res.busy);
            setError(res.lastError);
        }
        return res.ok ? res : null;
    }, []);
    const wasBusy = useRef(false);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    useEffect(() => {
        if (!busy) {
            if (wasBusy.current)
                router.refresh();
            wasBusy.current = false;
            return;
        }
        wasBusy.current = true;
        const t = setInterval(() => void refresh(), 4000);
        return () => clearInterval(t);
    }, [busy, refresh, router]);
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done?: string) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        if (done)
            toast.success(done);
        await refresh();
    });
    const active = personas.filter((p) => p.status === "active");
    const drafts = personas.filter((p) => p.status === "draft");
    const noPicture = personas.filter((p) => !p.image);
    const noProof = personas.filter((p) => !(p.doubts ?? []).some((x) => x.proof));
    const avatarsOf = (id: string) => avatars.filter((a) => a.persona_id === id);
    const loose = avatars.filter((a) => !a.persona_id || !personas.some((p) => p.id === a.persona_id));
    const drawAvatar = (id: string) => act(() => drawAvatarAction(id), "Drawing. About half a minute.");
    return (<div className="space-y-8 px-6 py-8" data-testid="personas">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setBuilding(true)} disabled={busy || pending} data-testid="build-personas">
          <Sparkles className="size-4"/>
          Build from ad results and research
        </Button>
        <Button variant="outline" onClick={() => setEditing(blank())} disabled={pending} data-testid="new-persona">
          <Plus className="size-4"/>
          Write one by hand
        </Button>
        {noPicture.length > 0 && (<Button variant="outline" onClick={() => confirm(advanced ? `Draw ${noPicture.length} picture${noPicture.length === 1 ? "" : "s"}? About $${(noPicture.length * IMAGE_USD).toFixed(2)}.` : `Draw ${noPicture.length} picture${noPicture.length === 1 ? "" : "s"}?`) && act(() => drawPersonasAction(noPicture.map((p) => p.id)), "Drawing. Each picture takes about half a minute.")} disabled={busy || pending || !live} data-testid="draw-missing">
            <ImageIcon className="size-4"/>
            Draw the {noPicture.length} without a picture
          </Button>)}
        {noProof.length > 0 && (<Button variant="outline" title={live ? "Writes each buyer's doubts and, from your brand's own facts, the proof that answers each. You can edit every one." : "Not switched on for this account."} onClick={() => act(() => fillMissingDoubtsAction(), "Writing doubts and proofs. A few seconds a persona.")} disabled={busy || pending || !live} data-testid="fill-missing-doubts">
            <Wand2 className="size-4"/>
            Fill doubts and proofs for {noProof.length}
          </Button>)}
        {busy && (<span className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="personas-busy">
            <Loader2 className="size-4 animate-spin"/>
            Working. You can leave this screen.
          </span>)}
        <span className="ml-auto text-sm text-muted-foreground" data-testid="personas-count">
          {active.length} in use{drafts.length ? `, ${drafts.length} draft${drafts.length === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {data?.simulated && (<p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900" data-testid="simulated-note">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          <span>
            <span className="mr-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-950">Example</span>
            The performance figures on this screen are simulated ({data.segments} segments, {data.period}). They stand in for {brandName}&apos;s ad account and store until those are connected, and are no record of how the brand performed.
          </span>
        </p>)}
      {error && !busy && (<p className="flex items-start gap-1.5 text-sm text-red-700" data-testid="personas-error">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          {error}
        </p>)}

      <Section title="In use" note="You can pick these for concepts, scripts, image ads and the 100-ad sprint." list={active} onOpen={(p) => setEditing(toDraft(p))} inConcepts={inConcepts} avatarsOf={avatarsOf} empty="No persona is in use yet."/>
      {drafts.length > 0 && <Section title="Drafts" note="Kept here only. Put one in use and it can be picked wherever a buyer is chosen." list={drafts} onOpen={(p) => setEditing(toDraft(p))} inConcepts={inConcepts} avatarsOf={avatarsOf} empty=""/>}
      {loose.length > 0 && <AvatarsSection persona={null} avatars={loose} voices={voices} looks={looks} personas={personas.map((p) => ({ id: p.id, name: p.name }))} live={live} busy={busy || pending} onChanged={refresh} onDraw={drawAvatar}/>}

      {building && <BuildDialog data={data} live={live} have={personas.length} onClose={() => setBuilding(false)} onStart={(b) => act(() => buildPersonasAction(b), "Building personas. About 2 minutes, plus half a minute a picture.")}/>}
      {editing && (<Editor draft={editing} was={personas.find((p) => p.id === editing.id) ?? null} products={products} offers={offers} live={live} busy={busy || pending} concepts={editing.id ? (inConcepts[editing.id] ?? 0) : 0} onClose={() => setEditing(null)} onSaved={async () => {
                setEditing(null);
                await refresh();
                router.refresh();
            }} onDraw={(id) => act(() => drawPersonasAction([id]), "Drawing. About half a minute.")} avatars={editing.id ? avatarsOf(editing.id) : []} voices={voices} looks={looks} onAvatarsChanged={refresh} onDrawAvatar={drawAvatar}/>)}
    </div>);
}
function Section({ title, note, list, onOpen, inConcepts, avatarsOf, empty }: {
    title: string;
    note: string;
    list: PersonaProfile[];
    onOpen: (p: PersonaProfile) => void;
    inConcepts: Record<string, number>;
    avatarsOf: (id: string) => Avatar[];
    empty: string;
}) {
    const advanced = useAdvanced();
    return (<section>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-4">
        <h2 className="display text-3xl">
          {title} <span className="numeral text-2xl text-muted-foreground">{list.length || ""}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      {list.length === 0 ? (<p className="mt-5 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{empty} Build a set from the data, or write one by hand, with the buttons above.</p>) : (<ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (<li key={p.id}>
              <button type="button" onClick={() => onOpen(p)} className="group flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" data-testid={`persona-${p.id}`}>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {p.image ? (<img src={img(p, 640)} alt={`A portrait for ${p.name}`} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy"/>) : (<span className="flex size-full flex-col items-center justify-center gap-2 bg-accent/40">
                      <span className="display flex size-24 items-center justify-center rounded-full bg-card text-5xl text-primary/70">{p.name.replace(/^The /, "").slice(0, 1)}</span>
                      <span className="text-xs text-muted-foreground">No picture yet</span>
                    </span>)}
                  <span className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 opacity-0 transition group-hover:opacity-100">
                    <Pencil className="size-3.5"/>
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{[p.who.gender === "all" ? "" : p.who.gender, p.who.age].filter(Boolean).join(", ") || (advanced ? p.id : "")}</div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
                  {p.language[0] && <p className="border-l-2 border-primary/30 pl-3 text-sm italic">&ldquo;{p.language[0]}&rdquo;</p>}
                  <div className="mt-auto space-y-2 pt-2">
                    {advanced && p.performance && (<div className="grid grid-cols-3 gap-1 rounded-md bg-muted/60 p-2 text-center text-xs" data-testid={`perf-${p.id}`}>
                        <Stat label="of spend" value={`${Math.round(p.performance.spend_share * 100)}%`}/>
                        <Stat label="an order" value={`$${p.performance.cpa.toFixed(0)}`}/>
                        <Stat label="return" value={`${p.performance.roas.toFixed(2)}x`}/>
                      </div>)}
                    <AvatarFaces list={avatarsOf(p.id)} id={p.id}/>
                    <div className="flex flex-wrap gap-1">
                      {p.performance?.simulated && <Badge variant="outline" className="border-amber-300 font-normal text-amber-800">Simulated figures</Badge>}
                      {!p.performance && p.share != null && <Badge variant="secondary" className="font-normal">About {p.share}% of buyers (est.)</Badge>}
                      <Badge variant="secondary" className="font-normal">{SOURCE_LABEL[p.source]}</Badge>
                      {inConcepts[p.id] > 0 && <Badge variant="secondary" className="font-normal">{inConcepts[p.id]} concept{inConcepts[p.id] === 1 ? "" : "s"}</Badge>}
                    </div>
                  </div>
                </div>
              </button>
            </li>))}
        </ul>)}
    </section>);
}
function AvatarFaces({ list, id }: {
    list: Avatar[];
    id: string;
}) {
    if (!list.length)
        return null;
    return (<div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`avatars-of-${id}`}>
      <span className="flex -space-x-1.5">
        {list.slice(0, 3).map((a) => a.portrait ? (<img key={a.id} src={avatarImg(a, 80)} alt="" className="size-6 rounded-full border-2 border-card object-cover" loading="lazy"/>) : (<span key={a.id} className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">
              {a.name.slice(0, 1).toUpperCase()}
            </span>))}
      </span>
      {list.length} avatar{list.length === 1 ? "" : "s"}
    </div>);
}
const Stat = ({ label, value }: {
    label: string;
    value: string;
}) => (<div>
    <div className="font-semibold tabular-nums">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>);
function BuildDialog({ data, live, have, onClose, onStart }: {
    data: Props["data"];
    live: boolean;
    have: number;
    onClose: () => void;
    onStart: (b: {
        count: number;
        notes: string;
        draw: boolean;
    }) => void;
}) {
    const [count, setCount] = useState(5);
    const [notes, setNotes] = useState("");
    const [draw, setDraw] = useState(true);
    const advanced = useAdvanced();
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="build-dialog">
        <DialogHeader>
          <DialogTitle>Build personas from data</DialogTitle>
          <DialogDescription>The app reads how each segment of buyers performed, what buyers say in the research and what the brand sells, and proposes the buyers worth their own ads. Each arrives as a draft for you to read, edit and put in use.</DialogDescription>
        </DialogHeader>
        {!data ? (<p className="text-sm text-amber-800">{advanced ? "This brand has no performance data yet. Put a segments file in its sample-data/performance folder, or write a persona by hand." : "This brand has no performance data yet. Write a persona by hand."}</p>) : (<div className="space-y-4 text-sm">
            <p className={cn("rounded-md border p-2.5", data.simulated ? "border-amber-200 bg-amber-50 text-amber-900" : "bg-muted/40")}>
              Reading {data.segments} segments, {data.period}
              {data.simulated ? ". These figures are simulated: the personas are an illustration, not a finding about the brand." : "."}
            </p>
            <div className="flex items-center gap-3">
              <Label htmlFor="persona-count" className="shrink-0">
                How many, at most
              </Label>
              <Input id="persona-count" type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="w-20" data-testid="build-count"/>
              <span className="text-xs text-muted-foreground">The brand has {have} now. A segment a persona already covers is not built again.</span>
            </div>
            <Textarea placeholder="Notes (optional): a buyer you want looked at, or one to leave out" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 600))} data-testid="build-notes"/>
            <label className="flex items-start gap-3">
              <Switch checked={draw} onCheckedChange={setDraw} className="mt-0.5" data-testid="build-draw"/>
              <span>
                <span className="font-medium">Draw each one</span>
                <span className="block text-xs text-muted-foreground">A lifelike portrait for each persona: a made-up adult, nobody real.{advanced && <> About ${IMAGE_USD.toFixed(2)} a picture.</>}</span>
              </span>
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{live ? (advanced ? `About $${(0.03 + (draw ? count * IMAGE_USD : 0)).toFixed(2)} in all.` : "") : "Not switched on for this account."}</span>
              <Button disabled={!live} onClick={() => {
                onStart({ count, notes, draw });
                onClose();
            }} data-testid="build-start">
                <Wand2 className="size-4"/>
                Build
              </Button>
            </div>
          </div>)}
      </DialogContent>
    </Dialog>);
}
function Editor({ draft, was, products, offers, live, busy, concepts, onClose, onSaved, onDraw, avatars, voices, looks, onAvatarsChanged, onDrawAvatar }: {
    draft: Draft;
    was: PersonaProfile | null;
    products: Props["products"];
    offers: Props["offers"];
    live: boolean;
    busy: boolean;
    concepts: number;
    onClose: () => void;
    onSaved: () => Promise<void>;
    onDraw: (id: string) => void;
    avatars: Avatar[];
    voices: ListedVoice[];
    looks: Props["looks"];
    onAvatarsChanged: () => Promise<unknown>;
    onDrawAvatar: (id: string) => void;
}) {
    const [d, setD] = useState(draft);
    const [saving, start] = useTransition();
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
    const payload = (status = d.status) => ({ ...d, status, language: rows(d.language), doubts: d.doubts.filter((x) => x.doubt.trim()).map((x) => ({ doubt: x.doubt, proof: x.proof })), tried: rows(d.tried), believes: rows(d.believes), sounds_like: rows(d.sounds_like) });
    const setDoubt = (i: number, patch: Partial<DoubtPair>) => set("doubts", d.doubts.map((x, k) => (k === i ? { ...x, ...patch, by: "owner" as const } : x)));
    const [filling, startFill] = useTransition();
    const fill = () => was &&
        startFill(async () => {
            const res = await fillDoubtsAction(was.id);
            if (!res.ok)
                return void toast.error(res.error);
            set("doubts", res.persona.doubts ?? []);
            toast.success(res.open ? `Written. ${res.open} ${res.open === 1 ? "doubt has" : "doubts have"} no proof in your brand's facts yet: add it if you have it.` : "Written from your brand's own facts. Edit any of them.");
        });
    const save = (status = d.status) => start(async () => {
        const res = await savePersonaAction(payload(status));
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(status === "active" && was?.status !== "active" ? `${res.persona.name} is in use.` : "Saved.");
        await onSaved();
    });
    const perf = was?.performance;
    const advanced = useAdvanced();
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl" data-testid="persona-editor">
        <DialogHeader>
          <DialogTitle>{was ? was.name : "A new persona"}</DialogTitle>
          <DialogDescription>{was ? `${SOURCE_LABEL[was.source]}${was.basis ? `: ${tabNames(was.basis)}` : ""}.` : "Written by hand. Put it in use and it can be picked wherever a buyer is chosen."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="space-y-3">
            <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted">
              {was?.image ? (<img src={img(was, 480)} alt={`A portrait for ${was.name}`} className="size-full object-cover" data-testid="persona-image"/>) : (<span className="flex size-full items-center justify-center p-4 text-center text-xs text-muted-foreground">No picture yet</span>)}
            </div>
            {was && (<Button size="sm" variant="outline" className="w-full" disabled={busy || !live} onClick={() => confirm(advanced ? `Draw ${was.image ? "a new" : "the"} picture? About $${IMAGE_USD.toFixed(2)}. Save your edits first: the picture is drawn from the saved persona.` : `Draw ${was.image ? "a new" : "the"} picture? Save your edits first: the picture is drawn from the saved persona.`) && onDraw(was.id)} data-testid="draw-persona">
                <ImageIcon className="size-3.5"/>
                {was.image ? "Draw again" : "Draw the picture"}
              </Button>)}
            <Field label="How they look, for the picture" hint="An adult, with 1 object from their life.">
              <Textarea rows={4} value={d.look} onChange={(e) => set("look", e.target.value)} data-testid="persona-look"/>
            </Field>
            {advanced && perf && (<div className="rounded-md border p-2.5 text-xs" data-testid="persona-performance">
                <div className="font-medium">{perf.segment}</div>
                <div className="mt-1 text-muted-foreground">
                  {perf.period}
                  {perf.simulated ? " · simulated" : ""}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  <dt className="text-muted-foreground">Spend</dt>
                  <dd className="text-right tabular-nums">{money(perf.spend)}</dd>
                  <dt className="text-muted-foreground">Orders</dt>
                  <dd className="text-right tabular-nums">{perf.purchases}</dd>
                  <dt className="text-muted-foreground">Cost an order</dt>
                  <dd className="text-right tabular-nums">${perf.cpa.toFixed(2)}</dd>
                  <dt className="text-muted-foreground">Return on spend</dt>
                  <dd className="text-right tabular-nums">{perf.roas.toFixed(2)}x</dd>
                  <dt className="text-muted-foreground">Order value</dt>
                  <dd className="text-right tabular-nums">${perf.aov.toFixed(2)}</dd>
                </dl>
              </div>)}
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="The Pill-Tired Senior" data-testid="persona-name"/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age">
                  <Input value={d.who.age} onChange={(e) => set("who", { ...d.who, age: e.target.value })} placeholder="65 and over" data-testid="persona-age"/>
                </Field>
                <Field label="Gender">
                  <Input value={d.who.gender} onChange={(e) => set("who", { ...d.who, gender: e.target.value })} placeholder="women" data-testid="persona-gender"/>
                </Field>
              </div>
            </div>
            <Field label="What marks them out" hint="A life stage, a habit, something they take or do.">
              <Input value={d.who.life} onChange={(e) => set("who", { ...d.who, life: e.target.value })} data-testid="persona-life"/>
            </Field>
            <Field label="Who they are, in 1 sentence">
              <Textarea rows={2} value={d.summary} onChange={(e) => set("summary", e.target.value)} data-testid="persona-summary"/>
            </Field>
            <Field label="How they see themselves" hint="The identity tied to the problem and the desire.">
              <Textarea rows={2} value={d.identity} onChange={(e) => set("identity", e.target.value)} data-testid="persona-identity"/>
            </Field>
            <p className="text-sm font-medium">A persona is a problem, a desire and a buying trigger. Write each so a stranger could picture the person.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="The problem" hint="What they are living with, as a scene from their day. Not a group of people.">
                <Textarea rows={3} value={d.problem} onChange={(e) => set("problem", e.target.value)} data-testid="persona-problem"/>
              </Field>
              <Field label="The desire" hint="Where they want to be instead, in their words.">
                <Textarea rows={3} value={d.wants} onChange={(e) => set("wants", e.target.value)} data-testid="persona-wants"/>
              </Field>
              <Field label="The buying trigger" hint="The moment that makes them buy now.">
                <Textarea rows={3} value={d.trigger} onChange={(e) => set("trigger", e.target.value)} data-testid="persona-trigger"/>
              </Field>
            </div>
            <Field label="What they tried before" hint="1 a line, with why they stopped.">
              <Textarea rows={3} value={d.tried} onChange={(e) => set("tried", e.target.value)} data-testid="persona-tried"/>
            </Field>
            <div className="space-y-2 rounded-lg border p-3" data-testid="persona-doubts">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Their doubts, and the proof that answers each</p>
                  <p className="text-xs text-muted-foreground">A writer raises a doubt only when its proof is here. Proof is your brand&apos;s own: a fact, a figure, a review, your guarantee.</p>
                </div>
                <Button size="sm" variant="outline" disabled={!was || !live || filling || busy} title={!was ? "Save the persona first." : !live ? "Not switched on for this account." : "Writes doubts and proofs from your brand's own facts. The ones you wrote or changed are kept as they are."} onClick={fill} data-testid="fill-doubts">
                  {filling ? <Loader2 className="size-3.5 animate-spin"/> : <Wand2 className="size-3.5"/>}
                  Fill doubts and proofs
                </Button>
              </div>
              {d.doubts.length === 0 && <p className="text-sm text-muted-foreground" data-testid="no-doubts">None yet. Add one, or have them written from your brand&apos;s facts.</p>}
              {d.doubts.map((x, i) => (<div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" data-testid={`doubt-row-${i}`}>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">The doubt</Label>
                    <Textarea rows={2} maxLength={200} value={x.doubt} onChange={(e) => setDoubt(i, { doubt: e.target.value })} placeholder="What they think just before buying" data-testid={`doubt-${i}`}/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">The proof that answers it</Label>
                    <Textarea rows={2} maxLength={300} value={x.proof} onChange={(e) => setDoubt(i, { proof: e.target.value })} placeholder="No proof yet. Add it if you have it." className={cn(!x.proof.trim() && "border-amber-300")} data-testid={`proof-${i}`}/>
                  </div>
                  <div className="flex items-center gap-1 sm:flex-col sm:items-end sm:justify-between sm:pt-5">
                    <Badge variant={x.by === "owner" ? "default" : "outline"} className="whitespace-nowrap" data-testid={`doubt-by-${i}`}>
                      {x.by === "owner" ? "Yours" : "Written for you"}
                    </Badge>
                    <Button size="sm" variant="ghost" aria-label="Delete this doubt" onClick={() => set("doubts", d.doubts.filter((_, k) => k !== i))} data-testid={`delete-doubt-${i}`}>
                      <Trash2 className="size-3.5"/>
                    </Button>
                  </div>
                </div>))}
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="outline" disabled={d.doubts.length >= 8} onClick={() => set("doubts", [...d.doubts, { doubt: "", proof: "", by: "owner" }])} data-testid="add-doubt">
                  <Plus className="size-3.5"/>
                  Add a doubt
                </Button>
                {d.doubts.some((x) => x.doubt.trim() && !x.proof.trim()) && <span className="text-xs text-amber-800">A doubt with no proof is left unsaid in ads.</span>}
              </div>
              <Field label="Other proof you have for them" hint="1 a line. Proof that answers none of the doubts above.">
                <Textarea rows={2} value={d.believes} onChange={(e) => set("believes", e.target.value)} data-testid="persona-believes"/>
              </Field>
            </div>
            <Field label="How the product is positioned for them">
              <Textarea rows={2} value={d.angle} onChange={(e) => set("angle", e.target.value)} data-testid="persona-angle"/>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Their own words" hint="1 a line, word for word from a customer. An ad may quote these.">
                <Textarea rows={3} value={d.language} onChange={(e) => set("language", e.target.value)} data-testid="persona-language"/>
              </Field>
              <Field label="How they might put it" hint="1 a line. Not from research: never quoted as a customer's.">
                <Textarea rows={3} value={d.sounds_like} onChange={(e) => set("sounds_like", e.target.value)} data-testid="persona-sounds-like"/>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {advanced && (<Field label="Where most of them are">
                <Select value={d.awareness} onValueChange={(v) => set("awareness", v as PersonaAwareness)}>
                  <SelectTrigger className="w-full" data-testid="persona-awareness">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONA_AWARENESS.map((a) => (<SelectItem key={a} value={a}>
                        {AWARENESS_LABEL[a]}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>)}
              <Field label="The offer that fits">
                <Select value={d.offer_id ?? "__none"} onValueChange={(v) => set("offer_id", v === "__none" ? null : v)}>
                  <SelectTrigger className="w-full" data-testid="persona-offer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Not set</SelectItem>
                    {offers.map((o) => (<SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="What they buy">
              <div className="flex flex-wrap gap-2">
                {products.map((p) => {
            const on = d.product_ids.includes(p.id);
            return (<button key={p.id} type="button" aria-pressed={on} onClick={() => set("product_ids", on ? d.product_ids.filter((x) => x !== p.id) : [...d.product_ids, p.id])} className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted")}>
                      {p.name}
                    </button>);
        })}
              </div>
            </Field>
          </div>
        </div>


        {was ? (<AvatarsSection persona={{ id: was.id, name: was.name, who: d.who, look: d.look }} avatars={avatars} voices={voices} looks={looks} live={live} busy={busy} onChanged={onAvatarsChanged} onDraw={onDrawAvatar}/>) : (<p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-testid="avatars-after-save">
            <span className="font-medium text-foreground">Avatars.</span> Save the persona first. Then you can add the person or character who appears in this buyer&apos;s videos, with its voice.
          </p>)}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {was && (<Button variant="ghost" size="sm" disabled={saving || busy} onClick={() => confirm(`Delete ${was.name}?`) &&
                start(async () => {
                    const res = await deletePersonaAction(was.id);
                    if (!res.ok)
                        return void toast.error(res.error);
                    toast.success("Deleted.");
                    await onSaved();
                })} data-testid="delete-persona">
              <Trash2 className="size-3.5"/>
              Delete
            </Button>)}
          {was?.status === "active" && (<Link href={`/studio/new?kind=ad&buyer=${was.id}`} className="text-sm text-primary hover:underline" data-testid="ads-for-persona">
              Make ads for this persona
            </Link>)}
          <span className="ml-auto text-xs text-muted-foreground">{concepts > 0 ? `${concepts} concept${concepts === 1 ? " is" : "s are"} written for this persona.` : ""}</span>
          {d.status === "active" ? (<>
              <Button variant="outline" disabled={saving || concepts > 0} title={concepts > 0 ? "It stays in use while concepts are written for it." : undefined} onClick={() => save("draft")} data-testid="persona-unuse">
                Take out of use
              </Button>
              <Button disabled={saving} onClick={() => save("active")} data-testid="persona-save">
                {saving && <Loader2 className="size-4 animate-spin"/>}
                Save
              </Button>
            </>) : (<>
              <Button variant="outline" disabled={saving} onClick={() => save("draft")} data-testid="persona-save">
                {saving && <Loader2 className="size-4 animate-spin"/>}
                Save as a draft
              </Button>
              <Button disabled={saving} onClick={() => save("active")} data-testid="persona-use">
                Save and put in use
              </Button>
            </>)}
        </div>
      </DialogContent>
    </Dialog>);
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
