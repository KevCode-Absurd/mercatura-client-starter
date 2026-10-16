"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CreativeBriefPlanRow } from "@/db/schema";
import { BRIEF_GOALS, type BriefPlan, type BriefSetup, type BriefEditChoices } from "@/lib/creative-brief";
import { CreativeBriefDetails } from "@/components/creative-brief-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefSetupFields } from "@/components/brief-setup-fields";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import { approveBriefAction, generateBriefAction, reviseBriefAction } from "./actions";
type Choice = {
    id: string;
    name: string;
};
export function BriefFlow({ brandId, brandName, products, personas, offers, claims, themes, initial, recent, live, editChoices }: {
    brandId: string;
    brandName: string;
    products: Choice[];
    personas: Choice[];
    offers: Choice[];
    claims: {
        id: string;
        text: string;
        source: string;
    }[];
    themes: {
        id: string;
        label: string;
    }[];
    initial: CreativeBriefPlanRow | null;
    recent: CreativeBriefPlanRow[];
    live: boolean;
    editChoices: BriefEditChoices;
}) {
    const router = useRouter();
    const [draft, setDraft] = useState(initial);
    const [setup, setSetup] = useState<BriefSetup>(initial?.setup ?? { goal: "new_customers", product_id: products[0]?.id ?? "", persona_id: "", offer_id: offers[0]?.id ?? "", medium: "both", notes: "" });
    const [plan, setPlan] = useState<BriefPlan | null>(initial?.plan ?? null);
    const [selected, setSelected] = useState([0, 1, 2]);
    const [variants, setVariants] = useState([0, 0, 0]);
    const [error, setError] = useState("");
    const [pending, start] = useTransition();
    const [operation, setOperation] = useState("");
    const approved = !!draft?.approved_ids.length;
    const dirty = !!draft && (JSON.stringify(plan) !== JSON.stringify(draft.plan) || JSON.stringify(setup) !== JSON.stringify(draft.setup));
    useUnsavedWarning(dirty);
    const updateSetup = (next: BriefSetup) => {
        if (plan) {
            const allowed = editChoices.products.find((p) => p.id === next.product_id)?.claim_ids ?? [];
            setPlan({ concepts: plan.concepts.map((c) => ({ ...c, ...(next.persona_id ? { persona_id: next.persona_id } : {}), ...(setup.product_id !== next.product_id ? { claim_ids: c.claim_ids.filter((id) => allowed.includes(id)) } : {}) })) });
        }
        setSetup(next);
    };
    const act = (label: string, fn: () => Promise<void>) => { setError(""); setOperation(label); start(async () => { try {
        await fn();
    }
    catch {
        setError("The request could not finish. Your saved draft is still available; try again.");
    } }); };
    const generate = () => act("Planning your brief", async () => {
        const res = await generateBriefAction(brandId, setup);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        setDraft(res.draft);
        setPlan(res.draft.plan);
        setSelected([0, 1, 2]);
        router.replace(`/studio/brief?draft=${encodeURIComponent(res.draft.id)}`);
    });
    const save = () => {
        if (draft && plan)
            act("Saving draft", async () => {
                const res = await reviseBriefAction(brandId, draft.id, plan, setup, draft.updated_at);
                if (!res.ok) {
                    setError(res.error);
                    return;
                }
                setDraft(res.draft);
                setPlan(res.draft.plan);
                setSetup(res.draft.setup);
                toast.success(approved ? "Brief changes saved. New scripts will use these inputs." : "Brief draft saved. No concepts or assets created.");
            });
    };
    const approve = () => {
        if (draft && plan)
            act("Approving concepts", async () => {
                const res = await approveBriefAction(brandId, draft.id, plan, selected, { setup, updatedAt: draft.updated_at });
                if (!res.ok) {
                    setError(res.error);
                    return;
                }
                toast.success(`${res.ids.length} concepts saved. Choose a variant to write its script.`);
                router.push(`/concepts?brief=${encodeURIComponent(draft.id)}`);
            });
    };
    return <div className="space-y-8 p-6 max-md:p-4" data-testid="guided-brief-flow">
    <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Brief progress">
      <li className={!draft ? "font-medium text-primary" : ""} aria-current={!draft ? "step" : undefined}>1. Set the direction</li>
      <li className={draft && !approved ? "font-medium text-primary" : ""} aria-current={draft && !approved ? "step" : undefined}>2. Review your brief</li>
      <li className={approved ? "font-medium text-primary" : ""} aria-current={approved ? "step" : undefined}>3. Create from concepts</li>
    </ol>
    {!live && <p className="rounded-lg border bg-muted/50 p-4 text-sm" data-testid="brief-preview-notice">Preview mode: explore the flow with example concepts. Original strategy and script generation are available when live generation is enabled. Preview concepts stay labelled.</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    {!draft ? <form className="max-w-4xl space-y-6" onSubmit={(e) => { e.preventDefault(); generate(); }}>
      <BriefSetupFields value={setup} onChange={updateSetup} choices={editChoices} disabled={pending}/>
      <div className="rounded-xl border bg-card p-4 text-sm"><p className="font-medium">Already included from {brandName}</p><p className="mt-1 text-muted-foreground">{products.length} products · {personas.length} buyers · {themes.length} research themes · {claims.length} substantiated claims</p><p className="mt-2 text-muted-foreground">The brief uses customer research, your brand voice and approved product facts. You review it before any scripts or assets are made.</p></div>
      {(!personas.length || !claims.length || !themes.length) && <p className="text-sm text-muted-foreground">Complete your <Link href="/brand" className="text-primary underline">Brand brain</Link> and add <Link href="/sources" className="text-primary underline">customer research</Link> to give the brief evidence.</p>}
      <Button type="submit" disabled={pending || !products.length || !offers.length || !personas.length || !claims.length || !themes.length} data-testid="generate-guided-brief">{pending ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}{pending ? operation : live ? "Plan three concepts" : "Preview three concepts"}</Button>
    </form> : plan && <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-serif text-3xl">{approved ? "Your approved brief" : "Review your creative direction"}</h2><p className="mt-2 text-sm text-muted-foreground">{BRIEF_GOALS.find((g) => g.id === draft.setup.goal)?.label} · {products.find((p) => p.id === draft.setup.product_id)?.name ?? "Product removed"} · {draft.setup.medium === "both" ? "Images and video" : draft.setup.medium === "image" ? "Image ads" : "Video ads"}</p><p className="mt-1 text-xs text-muted-foreground">Saved as a brief draft. Beliefs and scenes are hypotheses; measured performance is not supplied.</p></div><Badge variant="outline">{draft.preview ? "Preview only" : "Customer research"}</Badge></div>
      <section id="brief-setup" className="max-w-4xl space-y-4 rounded-xl border p-4" data-testid="edit-brief-setup"><h3 className="font-serif text-2xl">Edit the original brief setup</h3><p className="text-sm text-muted-foreground">These inputs apply to every concept in this brief. Review each concept's wording and proof after changing the product or buyer. Existing scripts and finished creatives keep their original inputs.</p><BriefSetupFields value={setup} onChange={updateSetup} choices={editChoices} disabled={pending}/></section>
      {draft.setup.notes && <p className="max-w-4xl whitespace-pre-wrap text-sm"><span className="font-medium">Your direction: </span>{draft.setup.notes}</p>}
      {plan.concepts.map((concept, index) => <Card key={index} id={`brief-concept-${index}`} data-testid="brief-review-concept"><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-serif text-2xl">{concept.name}</CardTitle><p className="mt-2 text-sm text-muted-foreground">{personas.find((p) => p.id === concept.persona_id)?.name ?? "Buyer removed"} · {concept.angle}</p></div>{!approved && <label className="flex min-h-10 shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(index)} disabled={pending} onChange={(e) => setSelected(e.target.checked ? [...selected, index] : selected.filter((i) => i !== index))} aria-label={`Include ${concept.name}`}/>Include concept</label>}</div></CardHeader><CardContent><CreativeBriefDetails concept={concept} proof={concept.claim_ids.flatMap((id) => { const p = claims.find((c) => c.id === id); return p ? [p] : []; })} themes={themes} selected={variants[index]} onSelect={(variant) => setVariants(variants.map((v, i) => i === index ? variant : v))} editChoices={{ ...editChoices, personas: setup.persona_id ? editChoices.personas.filter((p) => p.id === setup.persona_id) : editChoices.personas, claims: editChoices.claims.filter((c) => (editChoices.products.find((p) => p.id === setup.product_id)?.claim_ids ?? []).includes(c.id)) }} onChange={!pending ? (next) => setPlan({ concepts: plan.concepts.map((c, i) => i === index ? next : c) }) : undefined}/></CardContent></Card>)}
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">{approved ? <>{dirty ? <Button disabled>Save edits before opening concepts</Button> : <Button asChild><Link href={`/concepts?brief=${encodeURIComponent(draft.id)}`}>Open concepts <ArrowRight className="size-4"/></Link></Button>}<Button disabled={pending || !dirty} onClick={save} data-testid="save-guided-brief">{pending ? operation : "Save changes"}</Button></> : <><Button disabled={pending || !selected.length} onClick={approve} data-testid="approve-guided-brief">{pending ? <Loader2 className="size-4 animate-spin"/> : <Check className="size-4"/>}{pending ? operation : `Approve ${selected.length} concept${selected.length === 1 ? "" : "s"}`}</Button><Button variant="outline" disabled={pending || !dirty} onClick={save} data-testid="save-guided-brief">Save draft</Button></>}{dirty && <Button variant="ghost" disabled={pending} onClick={() => { setPlan(draft.plan); setSetup(draft.setup); setError(""); }}>Undo edits</Button>}<Button variant="ghost" disabled={pending} asChild><Link href="/studio/brief">Start another brief</Link></Button><p className="w-full text-xs text-muted-foreground">{dirty && "Unsaved edits. Save them before creating from these concepts. "}Approval saves concepts. Choose a variant in Concepts to write scripts, review them, then use Make assets in the existing production flow.</p></div>
    </div>}
    {!draft && recent.length > 0 && <section className="max-w-4xl border-t pt-6"><h2 className="mb-3 font-serif text-2xl">Recent briefs</h2><ul className="divide-y">{recent.map((item) => <li key={item.id}><Link href={`/studio/brief?draft=${encodeURIComponent(item.id)}`} className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm hover:text-primary"><span>{BRIEF_GOALS.find((g) => g.id === item.setup.goal)?.label} · {products.find((p) => p.id === item.setup.product_id)?.name ?? "Product removed"}</span><span className="text-xs text-muted-foreground">{item.created_at.slice(0, 10)} · {item.preview ? "Preview · " : ""}{item.approved_ids.length ? "Approved" : "Draft"}</span></Link></li>)}</ul></section>}
  </div>;
}
