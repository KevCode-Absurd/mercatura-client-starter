"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pollWhileVisible } from "@/lib/visible-polling";
import { HYPERREAL_DIRECTION } from "@/lib/creator-studio";
import { chooseCreatorPortraitAction, creatorAvatarStatusAction, enhanceCreatorAvatarAction } from "@/app/studio/creator/actions";
export function AvatarReview({ avatar, notes, hyperreal, onNotes, onHyperreal, reviewed, onReview, live }: {
    avatar: {
        id: string;
        name: string;
        portrait: string | null;
        kind: "person" | "character";
    };
    notes: string;
    hyperreal: boolean;
    onNotes: (value: string) => void;
    onHyperreal: (value: boolean) => void;
    reviewed: boolean;
    onReview: (value: boolean) => void;
    live: boolean;
}) {
    const [portrait, setPortrait] = useState(avatar.portrait);
    const [history, setHistory] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [pending, start] = useTransition();
    const [error, setError] = useState("");
    const [checked, setChecked] = useState(false);
    const onReviewRef = useRef(onReview);
    onReviewRef.current = onReview;
    useEffect(() => { let stopped = false; void creatorAvatarStatusAction(avatar.id).then((s) => { if (stopped)
        return; if (s.avatar) {
        if (s.avatar.portrait !== avatar.portrait)
            onReviewRef.current(false);
        setPortrait(s.avatar.portrait);
        setHistory(s.avatar.portrait_history ?? []);
        setChecked(true);
    }
    else
        setError("This avatar is no longer saved for the active brand."); setBusy(s.busy); }).catch(() => !stopped && setError("Could not check the avatar. Reload before enhancing it.")); return () => { stopped = true; }; }, [avatar.id]);
    useEffect(() => {
        if (!busy)
            return;
        return pollWhileVisible(async () => {
            const status = await creatorAvatarStatusAction(avatar.id);
            setBusy(status.busy);
            if (status.avatar) {
                if (status.avatar.portrait !== portrait) {
                    setPortrait(status.avatar.portrait);
                    onReviewRef.current(false);
                }
                setHistory(status.avatar.portrait_history ?? []);
            }
            if (status.error)
                setError(status.error);
        }, 2500, { immediate: true });
    }, [busy, avatar.id, portrait]);
    const previous = history.at(-1);
    const url = (file: string) => `/api/assets/${file}?w=640`;
    return <div className="space-y-3 rounded-lg border bg-muted/20 p-3" data-testid="character-review">
    <p className="text-sm font-semibold">Review {avatar.name} before the storyboard</p>
    {portrait ? <div className={`grid gap-3 ${previous ? "grid-cols-2" : "grid-cols-1"}`}>
      {previous && <figure><img src={url(previous)} alt="Previous character portrait" className="h-44 w-full rounded border object-contain"/><figcaption className="mt-1 text-xs">Before enhancement<Button variant="ghost" size="sm" disabled={busy || pending} onClick={() => start(async () => { const result = await chooseCreatorPortraitAction(avatar.id, previous); if (!result.ok)
            return void toast.error(result.error); setPortrait(result.avatar.portrait); setHistory(result.avatar.portrait_history ?? []); onReview(false); })}>Use this earlier face</Button></figcaption></figure>}
      <figure><img src={url(portrait)} alt={`Current character: ${avatar.name}`} className="h-44 w-full rounded border object-contain"/><figcaption className="mt-1 text-xs">{previous ? "After / current portrait" : "Current portrait"}</figcaption></figure>
    </div> : <p className="text-xs text-muted-foreground">This avatar is described in words. Its character sheet will be generated and reviewed in Production.</p>}
    <label className="block space-y-1 text-xs">Character notes (optional)<Textarea value={notes} rows={2} maxLength={600} onChange={(e) => { onNotes(e.target.value); onReview(false); }} placeholder="One change, such as softer makeup or a plain blue shirt. Keep the face and age." data-testid="character-notes"/></label>
    {avatar.kind === "person" && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={hyperreal} onChange={(e) => { onHyperreal(e.target.checked); onReview(false); }} data-testid="character-hyperreal"/>Hyper-realistic skin and hair for AI UGC</label>}
    {hyperreal && <details className="text-xs"><summary className="cursor-pointer">What hyper-realistic changes</summary><p className="mt-2 text-muted-foreground">{HYPERREAL_DIRECTION}</p></details>}
    <div className="flex flex-wrap gap-2">
      {avatar.kind === "person" && portrait && <Button asChild variant="outline" size="sm"><Link href={`/references/avatars/packs?avatar=${encodeURIComponent(avatar.id)}`}>Create or view settings packs</Link></Button>}
      <Button variant="outline" size="sm" disabled={!portrait || !live || busy || pending || (!hyperreal && !notes.trim())} data-testid="character-enhance" onClick={() => start(async () => { setError(""); const result = await enhanceCreatorAvatarAction(avatar.id, { notes, hyperreal }); if (!result.ok)
        return void setError(result.error); onReview(false); setBusy(true); toast.success("Character enhancement started. Review its new picture when it finishes."); })}>{busy ? "Enhancement running…" : "Generate enhanced preview"}</Button>
      <Button size="sm" disabled={busy || pending || !checked} variant={reviewed ? "outline" : "default"} aria-pressed={reviewed} onClick={() => onReview(!reviewed)} data-testid="character-accept">{reviewed ? "Character reviewed" : "Use this character and notes"}</Button>
    </div>
    <p className="text-xs text-muted-foreground">Enhancement is optional and generates a new image; your original is kept. You can use the current picture, with your notes passed into the character plan. Every newly generated sheet is reviewed again in Production.</p>
    {!live && <p className="text-xs text-muted-foreground">Image generation is not enabled. Review the saved avatar and continue without enhancement.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
