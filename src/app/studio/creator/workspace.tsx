"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Avatar } from "@/lib/avatars/types";
import { ScriptPreview } from "@/components/script-preview";
import { FORMAT_RECIPES } from "@/lib/formats";
import { CreatorProcess } from "@/components/creator-process";
import { AvatarReview } from "@/components/avatar-review";
import { FormatSuggestions } from "@/components/format-suggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import dynamic from "next/dynamic";
import { WorkflowChoice } from "@/components/workflow-choice";
import type { WorkflowMode } from "@/lib/production/workflow";
const MakeAssetsDialog = dynamic(() => import("@/app/production/make-assets").then((m) => m.MakeAssetsDialog));
import { UploadScript } from "../ads/upload-script";
const NONE = "__none";
type Props = {
    brandId: string;
    recipeRoutes: Record<string, string>;
    recipeKinds: Record<string, "person" | "character" | null>;
    avatars: Avatar[];
    scripts: {
        id: string;
        title: string;
        status: string;
    }[];
    concepts: {
        id: string;
        name: string;
    }[];
    jobs: {
        id: string;
        scriptId: string;
        next: string;
        completedClips: number;
        plannedClips: number;
        joined: boolean;
        avatarId: string | null;
    }[];
    liveImages: boolean;
    liveScript: boolean;
    initialAvatarId?: string;
    initialScriptId?: string;
};
export function CreatorWorkspace({ brandId, recipeRoutes, recipeKinds, avatars, scripts, concepts, jobs, liveImages, liveScript, initialAvatarId, initialScriptId }: Props) {
    const router = useRouter();
    const [workflow, setWorkflow] = useState<WorkflowMode>("guided");
    const [avatarId, setAvatarId] = useState(initialAvatarId ?? "");
    const [scriptId, setScriptId] = useState(initialScriptId ?? "");
    const [startWith, setStartWith] = useState<"avatar" | "script">(initialScriptId ? "script" : "avatar");
    const [notes, setNotes] = useState("");
    const [hyperreal, setHyperreal] = useState(false);
    const [reviewed, setReviewed] = useState(false);
    const [recipe, setRecipe] = useState("ugc");
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [recovered, setRecovered] = useState(false);
    const key = `creator-choices:${brandId}`;
    useEffect(() => {
        try {
            const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
            if (saved) {
                if (!initialAvatarId && avatars.some((a) => a.id === saved.avatarId))
                    setAvatarId(saved.avatarId);
                if (!initialScriptId && scripts.some((s) => s.id === saved.scriptId))
                    setScriptId(saved.scriptId);
                if (saved.workflow === "guided" || saved.workflow === "automatic")
                    setWorkflow(saved.workflow);
                if (typeof saved.notes === "string")
                    setNotes(saved.notes.slice(0, 600));
                if (typeof saved.hyperreal === "boolean")
                    setHyperreal(saved.hyperreal);
                if (FORMAT_RECIPES.some((r) => r.id === saved.recipe))
                    setRecipe(saved.recipe);
            }
        }
        catch { }
        setRecovered(true);
    }, [key]);
    useEffect(() => { if (recovered) {
        try {
            sessionStorage.setItem(key, JSON.stringify({ avatarId, scriptId, notes, hyperreal, recipe, workflow }));
        }
        catch { }
    } }, [key, avatarId, scriptId, notes, hyperreal, recipe, workflow, recovered]);
    const avatar = avatars.find((a) => a.id === avatarId);
    const script = scripts.find((s) => s.id === scriptId);
    const fits = FORMAT_RECIPES.filter((r) => r.base === "ugc" || r.base === "demo").filter((r) => !avatar || (!!recipeKinds[r.id] && (avatar.kind === "person" || (recipeKinds[r.id] === "character" && (!avatar.style || r.id === avatar.style)))));
    const validRecipe = fits.some((r) => r.id === recipe) ? recipe : fits[0]?.id ?? "ugc";
    const mine = jobs.filter((j) => (!scriptId || j.scriptId === scriptId) && (!avatarId || j.avatarId === avatarId));
    const latestJob = mine.at(-1);
    const aiStart = `${recipeRoutes[validRecipe] ?? "/formats/ugc"}?workflow=${workflow}&start=1${avatarId ? `&avatar=${encodeURIComponent(avatarId)}` : ""}`;
    const scriptSection = <section id="script" className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5" data-testid="creator-script-step"><h2 className="text-xl font-semibold">Script: your words or a generated draft</h2><div className="flex flex-wrap gap-3"><Button asChild><Link href={aiStart} data-testid="creator-ai-script">Write the script with AI</Link></Button><UploadScript concepts={concepts} live={liveScript} onAdded={(id) => { setScriptId(id); router.refresh(); }}><Button variant="outline" data-testid="creator-upload-script">Paste or upload my script</Button></UploadScript><Button asChild variant="outline"><Link href="/builder">Build a script from the Brand Brain</Link></Button></div><label className="block space-y-1 text-sm">Choose a saved script<Select disabled={!recovered} value={scriptId || NONE} onValueChange={(v) => setScriptId(v === NONE ? "" : v)}><SelectTrigger aria-label="Creator script" data-value={scriptId} className="h-11 w-full rounded border bg-background px-2"><SelectValue placeholder="Choose a script"/></SelectTrigger><SelectContent><SelectItem value={NONE}>Choose a script</SelectItem>{scripts.map((s) => <SelectItem value={s.id} key={s.id}>{s.title}</SelectItem>)}</SelectContent></Select></label>{script && <ScriptPreview id={script.id}/>}</section>;
    const avatarSection = <section id="avatar" className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5" data-testid="creator-avatar-step"><h2 className="text-xl font-semibold">Choose the avatar</h2><div className="flex flex-wrap items-center gap-3"><Input aria-label="Find a saved creator" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a saved creator" className="sm:max-w-xs"/><Link href="/references/avatars" className="inline-flex min-h-11 items-center text-sm text-primary">Browse the avatar library or make your own</Link></div><div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-5"><button type="button" aria-pressed={!avatarId} onClick={() => { setAvatarId(""); setReviewed(false); }} className="min-h-36 rounded-lg border p-3 text-sm">Create a new character with this script</button>{avatars.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())).map((a) => <button key={a.id} type="button" aria-pressed={a.id === avatarId} onClick={() => { setAvatarId(a.id); setReviewed(false); setNotes(""); setHyperreal(false); }} className={`space-y-2 rounded-lg border p-2 text-left ${a.id === avatarId ? "border-primary bg-primary/5" : "hover:bg-muted"}`} data-testid="creator-saved-avatar">{a.portrait && <img src={`/api/assets/${a.portrait}?w=240`} alt={a.name} className="aspect-[4/5] w-full rounded object-cover" loading="lazy"/>}<span className="block text-sm font-medium">{a.name}</span></button>)}</div><div id="character" className="scroll-mt-24">{avatar ? <AvatarReview key={avatar.id} avatar={avatar} notes={notes} hyperreal={hyperreal} onNotes={setNotes} onHyperreal={setHyperreal} reviewed={reviewed} onReview={setReviewed} live={liveImages}/> : <div className="space-y-3 rounded border p-3"><p className="text-sm text-muted-foreground">A new character is designed from the script. Choose the cast, add notes and review its generated character sheet in Production before any clips.</p><label className="block text-sm">Character notes (optional)<Textarea maxLength={600} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Describe a fictional adult, wardrobe or one detail to change" data-testid="new-character-notes"/></label>{validRecipe === "ugc" && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={hyperreal} onChange={(e) => setHyperreal(e.target.checked)} data-testid="new-character-hyperreal"/>Hyper-realistic skin and hair for AI UGC</label>}</div>}</div></section>;
    return <div className="space-y-6 p-4 sm:p-6" data-testid="creator-workspace" data-ready={recovered}><WorkflowChoice value={workflow} onChange={setWorkflow} disabled={!recovered}/><CreatorProcess current={startWith === "avatar" ? "Avatar" : "Script"} scriptId={scriptId || undefined} avatarId={avatarId || undefined} jobId={latestJob?.id} brandId={brandId}/><div className="flex flex-wrap gap-3" aria-label="Creator starting point"><Button variant={startWith === "avatar" ? "default" : "outline"} onClick={() => setStartWith("avatar")} aria-pressed={startWith === "avatar"}>Start with an avatar</Button><Button variant={startWith === "script" ? "default" : "outline"} onClick={() => setStartWith("script")} aria-pressed={startWith === "script"}>Start with a script</Button></div>{startWith === "avatar" ? <>{avatarSection}{scriptSection}</> : <>{scriptSection}{avatarSection}</>}<section id="format" className="scroll-mt-24 space-y-4 rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Choose the format and storyboard</h2><details><summary className="cursor-pointer text-sm text-muted-foreground">Help me choose a format</summary><FormatSuggestions /></details><label className="block space-y-1 text-sm">Video format<Select value={validRecipe} onValueChange={setRecipe}><SelectTrigger aria-label="Creator video format" className="h-11 w-full rounded border bg-background px-2"><SelectValue /></SelectTrigger><SelectContent>{fits.map((r) => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent></Select></label><p className="text-sm text-muted-foreground">{workflow === "guided" ? "Review the script and plan, character, storyboard and clips. Each approval starts the next step." : "AI runs from the plan to the finished video. Failed checks pause for your review."}</p><Button onClick={() => setOpen(true)} disabled={!recovered || !script || (workflow === "guided" && !!avatar && !reviewed)} data-testid="creator-make-storyboard">Set up this creative</Button>{workflow === "guided" && !!avatar && !reviewed && <p className="text-xs text-amber-800">Use this character and notes above to continue.</p>}</section><section className="space-y-3 rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Storyboard → clips → edit → delivery</h2><p className="text-sm text-muted-foreground">These are saved jobs, with their actual progress. The editor opens completed footage directly and lets you join clips, crop, add or remove captions and choose music.</p>{mine.length ? mine.slice(-12).reverse().map((j) => <div className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm" key={j.id}><span className="flex-1">{scripts.find((s) => s.id === j.scriptId)?.title ?? "Creative"}: {j.next.replace("approve:", "Review ").replace(/_/g, " ") || "Review assets"} · {j.completedClips}/{j.plannedClips} clips available{j.joined ? " · joined video available" : ""}</span><Link href={`/production?job=${j.id}`} className="text-primary">Open production</Link>{j.completedClips > 0 && <Link href={`/video-editing?mode=ad&source=production&id=${j.id}&brand=${brandId}`} className="text-primary">Edit footage</Link>}<a href={`/api/production/${j.id}/package`} download className="text-primary">Download package</a></div>) : <p className="text-sm text-muted-foreground">No creative matches these choices yet. Your new job appears on Production after setup.</p>}<Link href="/production" className="inline-flex min-h-11 items-center text-sm text-primary">All production jobs</Link></section>{open && <MakeAssetsDialog initialWorkflow={workflow} key={`${scriptId}:${avatarId}:${validRecipe}`} open={open} onOpenChange={setOpen} scriptId={scriptId || undefined} initialAvatarId={avatarId || undefined} initialRecipe={validRecipe} initialCharacterNotes={notes} initialHyperreal={hyperreal} initialCharacterReviewed={reviewed}/>}</div>;
}
