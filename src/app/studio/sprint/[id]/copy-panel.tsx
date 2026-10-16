"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { StaticAdCopy } from "@/db/schema";
import { feedbackAction } from "../../actions";
import { assetUrl } from "../../shared";
import { generateSprintCopyAction, saveSprintCopyAction, type AdView } from "../actions";
export function CopyPanel({ ad, sprintId, defaultText, busy, refresh, close }: {
    ad: AdView;
    sprintId: string;
    defaultText: boolean;
    busy: boolean;
    refresh: () => Promise<void>;
    close: () => void;
}) {
    return <Dialog open onOpenChange={(open) => { if (!open)
        close(); }}>
    <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-6xl" data-testid="wall-open">
      <DialogTitle>Ad {ad.slot.n} · Image and copy</DialogTitle>
      <DialogDescription>Review the words separately. Adding text layers keeps the base image unchanged.</DialogDescription>
      <CopyForm key={`${ad.slot.n}:${JSON.stringify(ad.copy)}`} ad={ad} sprintId={sprintId} defaultText={defaultText} busy={busy} refresh={refresh}/>
    </DialogContent>
  </Dialog>;
}
function CopyForm({ ad, sprintId, defaultText, busy, refresh }: Omit<Parameters<typeof CopyPanel>[0], "close">) {
    const router = useRouter();
    const [copy, setCopy] = useState<StaticAdCopy>(ad.copy ?? { headline: "", body: "", primary_text: "", description: "", cta: "" });
    const [text, setText] = useState(defaultText);
    const [notes, setNotes] = useState("");
    const [pending, start] = useTransition();
    const [aspect, setAspect] = useState(ad.outputs[0]?.aspect ?? "4:5");
    const output = ad.outputs.find((o) => o.aspect === aspect);
    const locked = busy || pending;
    const act = (fn: () => Promise<{
        ok: boolean;
        error?: string;
    }>, message: string) => start(async () => {
        try {
            const res = await fn();
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(message);
            await refresh();
        }
        catch {
            toast.error("That didn't finish. Try again.");
        }
    });
    const save = (approve: boolean) => start(async () => {
        try {
            if (approve && text && !copy.headline.trim() && !copy.body.trim())
                return void toast.error("Add a headline or body copy to put on the image.");
            const res = await saveSprintCopyAction(sprintId, ad.slot.n, copy, approve);
            if (!res.ok) {
                toast.error(res.error);
                await refresh();
                return;
            }
            if (approve && text && ad.setId && ad.itemId && output?.base) {
                router.push(`/studio/${ad.setId}/edit/${ad.itemId}?aspect=${encodeURIComponent(aspect)}&copy=1`);
            }
            else {
                toast.success(approve ? "Copy approved. The image is unchanged." : "Draft saved. The image is unchanged.");
                await refresh();
            }
        }
        catch {
            toast.error("The copy wasn't saved. Try again.");
        }
    });
    return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
    <div className="rounded-lg border bg-muted/50 p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label="Image size" className="rounded border bg-background p-2 text-sm" value={aspect} onChange={(e) => setAspect(e.target.value)}>{ad.outputs.map((o) => <option key={o.aspect}>{o.aspect}</option>)}</select>
        {output?.base && <a className="text-sm text-primary underline" href={assetUrl(output.base)} download>Download base image</a>}
      </div>
      {output ? <img src={assetUrl(output.path)} alt={`Ad ${ad.slot.n}`} className="mx-auto max-h-[65vh] max-w-full rounded shadow-md"/> : <p>The base image is not ready yet.</p>}
      <p className="mt-4 text-xs text-muted-foreground">{ad.slot.idea}</p>
    </div>
    <aside className="space-y-4">
      <Button variant="outline" disabled={locked || !output} onClick={() => act(() => generateSprintCopyAction(sprintId, ad.slot.n), "Generating a copy draft. Review it before use.")} data-testid="generate-ad-copy">{ad.copy ? "Generate a new copy draft" : "Generate headline and body copy"}</Button>
      <fieldset disabled={locked} className="space-y-3">
        {([['headline', 'Headline'], ['body', 'Body copy on image (optional)'], ['primary_text', 'Primary text for the ad feed'], ['description', 'Description'], ['cta', 'Call to action']] as const).map(([key, label]) => <label className="block text-sm" key={key}>{label}<Textarea value={copy[key]} maxLength={{ headline: 120, body: 400, primary_text: 4000, description: 200, cta: 40 }[key]} className="mt-1" rows={key === "primary_text" ? 4 : 2} onChange={(e) => setCopy((c) => ({ ...c, [key]: e.target.value, approved_at: undefined }))} data-testid={`copy-${key}`}/></label>)}
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><Switch checked={text} onCheckedChange={setText} disabled={locked || !output?.base}/>Add approved text to the image</label>
      <p className="text-xs text-muted-foreground">{text ? "Next: place and style the approved headline and body in the text editor, then save. No image generation." : "Keep the image clean. Use the copy in your ad platform or add it yourself in Figma."}</p>
      {!output?.base && output && <p className="text-xs text-muted-foreground">This older image has baked-in text. Its copy can still be edited separately.</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={locked || !output} onClick={() => save(false)}>Save draft</Button>
        <Button disabled={locked || !output} onClick={() => save(true)} data-testid="approve-ad-copy">{text ? "Approve and place text" : "Approve copy"}</Button>
      </div>
      {ad.copy?.approved_at && <p className="text-xs text-emerald-700">Copy approved. Changing words requires approval again.</p>}
      {ad.setId && ad.itemId && output?.base && <a className="block text-sm text-primary underline" href={`/studio/${ad.setId}/edit/${ad.itemId}?aspect=${encodeURIComponent(aspect)}`}>Open text-layer editor</a>}
      <details className="border-t pt-4">
        <summary className="cursor-pointer text-sm font-medium">Comments and visual changes</summary>
        {ad.comments.length > 0 && <ul className="mt-3 space-y-2 text-sm">{ad.comments.map(c => <li key={c.id} className="rounded border p-2"><p className="whitespace-pre-wrap">{c.text}</p><span className="text-xs text-muted-foreground">{c.action === "remake" ? "Visual change requested" : "Comment"}</span></li>)}</ul>}
        <Textarea className="mt-3" aria-label="Notes on this image" placeholder="Leave a comment, or describe a visual change…" value={notes} maxLength={800} onChange={(e) => setNotes(e.target.value)}/>
        <p className="my-2 text-xs text-muted-foreground">Saving a comment preserves the image. Regenerate uses your notes to make a new image version in all selected sizes.</p>
        <div className="flex flex-wrap gap-2">{[false, true].map((remake) => <Button key={String(remake)} variant="outline" disabled={locked || notes.trim().length < 4 || !ad.setId || !ad.itemId} onClick={() => act(() => feedbackAction(ad.setId!, { itemId: ad.itemId!, text: notes, remake, keep: true }), remake ? "Making a new image version from your notes." : "Comment saved.")}>{remake ? "Regenerate image from notes" : "Save comment"}</Button>)}</div>
      </details>
    </aside>
  </div>;
}
