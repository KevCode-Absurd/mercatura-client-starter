"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { ConceptRow } from "@/db/schema";
import type { CreativeBrief, BriefEditChoices } from "@/lib/creative-brief";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import { ViewConceptAssets } from "./view-assets";
import { CreativeBriefDetails } from "@/components/creative-brief-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateDialog } from "../scripts/generation";
import { MakeAssetsButton } from "../production/make-assets";
import { prepareBriefVariantAction, reviseConceptBriefAction } from "../studio/brief/actions";
export function GuidedConceptCard({ concept, brief, brandId, buyer, themes, concepts, briefs, scriptCounts, assetCounts, editChoices, live }: {
    concept: ConceptRow;
    brief: CreativeBrief;
    brandId: string;
    buyer: string;
    themes: {
        id: string;
        label: string;
    }[];
    concepts: ConceptRow[];
    briefs: Record<string, CreativeBrief>;
    scriptCounts: Record<string, number>;
    live: boolean;
    assetCounts: Record<string, number>;
    editChoices: BriefEditChoices;
}) {
    const [selected, setSelected] = useState(0);
    const [prepared, setPrepared] = useState<Record<number, ConceptRow>>({});
    const [writing, setWriting] = useState<ConceptRow | null>(null);
    const [pending, start] = useTransition();
    const [editing, setEditing] = useState(false);
    const [editBase, setEditBase] = useState(brief);
    const [draft, setDraft] = useState(brief.concept);
    const [error, setError] = useState("");
    const dirty = editing && JSON.stringify(draft) !== JSON.stringify(editBase.concept);
    useUnsavedWarning(dirty);
    const variants = concepts.filter((c) => c.parent_concept_id === concept.id && briefs[c.id]?.selected_variant === selected);
    const child = variants.find((c) => (briefs[c.id]?.revision ?? 0) === (brief.revision ?? 0)) ?? prepared[selected];
    const count = child ? scriptCounts[child.id] ?? 0 : 0;
    const assets = assetCounts[concept.id] ?? 0;
    const shown = editing ? draft : brief.concept;
    const claimIds = editChoices.products.find((p) => p.id === brief.setup.product_id)?.claim_ids ?? [];
    const choices = { ...editChoices, claims: editChoices.claims.filter((c) => claimIds.includes(c.id)), personas: brief.setup.persona_id ? editChoices.personas.filter((p) => p.id === brief.setup.persona_id) : editChoices.personas };
    const save = () => start(async () => {
        try {
            setError("");
            const res = await reviseConceptBriefAction(brandId, concept.id, draft, editBase.revision ?? 0);
            if (!res.ok)
                return void setError(res.error);
            setDraft(res.brief.concept);
            setPrepared({});
            setEditing(false);
            toast.success("Concept saved. New scripts will use these inputs.");
        }
        catch {
            setError("Could not save this concept. Your edits are still here; try again.");
        }
    });
    const write = () => start(async () => {
        try {
            const res = await prepareBriefVariantAction(brandId, concept.id, selected, brief.revision ?? 0);
            if (!res.ok)
                return void toast.error(res.error);
            setPrepared((items) => ({ ...items, [selected]: res.concept }));
            setWriting(res.concept);
        }
        catch {
            toast.error("Could not open this variant. Your approved brief is saved; try again.");
        }
    });
    return <Card id={concept.id} className="gap-4 scroll-mt-24" data-testid="guided-concept-card">
    <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{concept.name}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{buyer} · {concept.angle}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{brief.basis === "preview" ? "Preview only" : brief.revision ? "Saved brief" : "Approved brief"}</Badge><Button size="sm" variant="outline" disabled={pending || editing} onClick={() => { setEditBase(brief); setDraft(brief.concept); setError(""); setEditing(true); }} data-testid="edit-guided-concept"><Pencil className="size-3.5"/>Edit concept</Button></div></div></CardHeader>
    <CardContent className="space-y-5">
      <CreativeBriefDetails concept={shown} proof={editing ? choices.claims.filter((c) => shown.claim_ids.includes(c.id)) : brief.proof} themes={themes} selected={selected} onSelect={setSelected} onChange={editing && !pending ? setDraft : undefined} editChoices={choices} editorOpen={editing}/>
      {editing && <div className="space-y-3" data-testid="guided-concept-save"><p className="text-sm text-muted-foreground">Edit the strategy, evidence and any variant before writing. Existing scripts and assets keep the inputs they were made from.</p><p className="text-sm">Product: {editChoices.products.find((p) => p.id === brief.setup.product_id)?.name ?? "Product removed"} · Offer: {editChoices.offers.find((o) => o.id === brief.setup.offer_id)?.name ?? "Offer removed"}. <Link className="text-primary underline" href={`/studio/brief?draft=${encodeURIComponent(brief.plan_id)}#brief-setup`}>Edit the original brief setup</Link></p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={pending || !dirty} onClick={save} data-testid="save-guided-concept">{pending ? "Saving..." : "Save changes"}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => { setEditing(false); setDraft(brief.concept); setError(""); }}>Cancel edits</Button>{dirty && <span className="text-xs text-amber-700">Save your edits before writing scripts or making assets.</span>}</div></div>}
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button size="sm" onClick={write} disabled={pending || editing || !live || brief.basis === "preview"} data-testid="brief-write-variant">{pending ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}Write scripts for variant {brief.concept.variants[selected].label}</Button>
        {child && <Link className="inline-flex min-h-9 items-center px-2 text-sm text-primary underline-offset-2 hover:underline" href={`/scripts?concept=${child.id}`}>{count} script{count === 1 ? "" : "s"}</Link>}
        {!editing && child && count > 0 && brief.setup.medium !== "video" && <MakeAssetsButton conceptId={child.id} initialRecipe="static-concept" label="Make image assets" variant="outline" testid="brief-make-assets"/>}
        {!editing && child && count > 0 && brief.setup.medium !== "image" && <MakeAssetsButton conceptId={child.id} initialRecipe="ugc" label="Make video assets" variant="outline" testid="brief-make-video-assets"/>}
        <ViewConceptAssets conceptId={concept.id} count={assets}/>
        <Link href={`/studio/brief?draft=${encodeURIComponent(brief.plan_id)}`} className="ml-auto inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-primary">View / edit full brief</Link>
        <p className="w-full text-xs text-muted-foreground">{brief.basis === "preview" ? "Generate a live brief to create original concepts for production." : count ? "Review and approve this variant's scripts, then make assets from them. The chosen brief follows into production." : "Write this variant's script first. Review it, then use Make assets to create images, video or a creator brief."}</p>
      </div>
    </CardContent>
    {writing && <GenerateDialog open onOpenChange={(open) => !open && setWriting(null)} concepts={[{ id: writing.id, name: writing.name, stage: writing.awareness_stage, age: null }]} conceptId={writing.id} initialFormat={brief.setup.medium === "image" ? "static_image" : "ai_ugc"} initialCount={1} initialClaimChecks/>}
  </Card>;
}
