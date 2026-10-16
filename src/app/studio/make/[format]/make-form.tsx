"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClaimsSwitch } from "@/components/claims-switch";
import { HooksPicker } from "@/components/hooks-picker";
import { TasteBar } from "@/components/taste-bar";
import type { Surface, Taste } from "@/lib/taste/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { arriveHref } from "@/lib/production/arrive";
import type { LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { startMakeAction } from "../actions";
import { WorkflowChoice } from "@/components/workflow-choice";
import type { WorkflowMode } from "@/lib/production/workflow";
const NONE = "__none__";
const LENGTH_WORDS: Record<LengthPreset, string> = { "15s": "15 seconds", "30s": "30 seconds", "60s": "60 seconds", "2-3m": "2 to 3 minutes", "5-10m": "5 to 10 minutes", "10m": "10 minutes" };
export interface MakeFormProps {
    video?: boolean;
    formatId: string;
    label: string;
    timed: boolean;
    lengths: LengthPreset[];
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
        summary: string;
    }[];
    offers: {
        id: string;
        name: string;
    }[];
    concepts: {
        id: string;
        name: string;
    }[];
    live: boolean;
    claims: boolean;
    needs?: Record<string, {
        label: string;
        have: boolean;
        without: string;
        field: string;
        href: string;
    }[]>;
}
export function MakeForm({ video = false, formatId, label, timed, lengths, products, personas, offers, concepts, live, claims, needs }: MakeFormProps) {
    const router = useRouter();
    const [product, setProduct] = useState(products[0]?.id ?? NONE);
    const [persona, setPersona] = useState(NONE);
    const [offer, setOffer] = useState(NONE);
    const [concept, setConcept] = useState(NONE);
    const [length, setLength] = useState<LengthPreset>(lengths[0]);
    const [brief, setBrief] = useState("");
    const [workflow, setWorkflow] = useState<WorkflowMode>("guided");
    const [claimChecks, setClaimChecks] = useState(claims);
    const [hooks, setHooks] = useState(1);
    const [taste, setTaste] = useState<Taste>({});
    const surface: Surface = timed ? "script" : /carousel/.test(formatId) ? "carousel" : /native/.test(formatId) ? "native_ad" : "image_ad";
    const [pending, start] = useTransition();
    const fromConcept = concept !== NONE;
    const pick = (v: string) => (v === NONE ? null : v);
    const field = "mb-1.5 block text-sm font-medium";
    const reads = (!fromConcept && needs?.[product]) || [];
    const gaps = reads.filter((n) => !n.have);
    const submit = () => start(async () => {
        const res = await startMakeAction({ formatId, productId: pick(product), personaId: pick(persona), offerId: pick(offer), conceptId: pick(concept), brief, length, claimChecks, hooks, taste, ...(video ? { workflow } : {}) });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(res.said);
        router.push(arriveHref(res, formatId, Date.now()));
    });
    return (<div className="max-w-2xl space-y-5" data-testid="make-form">
      {video && <WorkflowChoice value={workflow} onChange={setWorkflow} disabled={pending}/>}
      {concepts.length > 0 && (<div>
          <Label className={field}>Start from</Label>
          <Select value={concept} onValueChange={setConcept}>
            <SelectTrigger className="w-full" data-testid="make-concept">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>A new idea (say it below)</SelectItem>
              {concepts.map((c) => (<SelectItem key={c.id} value={c.id}>
                  The concept &quot;{c.name}&quot;
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>)}

      {!fromConcept && (<div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className={field}>Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger className="w-full" data-testid="make-product">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (<SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={field}>Who it is for</Label>
            <Select value={persona} onValueChange={setPersona}>
              <SelectTrigger className="w-full" data-testid="make-persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>The brand&apos;s main buyer</SelectItem>
                {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {offers.length > 1 && (<div className="sm:col-span-2">
              <Label className={field}>Offer</Label>
              <Select value={offer} onValueChange={setOffer}>
                <SelectTrigger className="w-full" data-testid="make-offer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>The product&apos;s usual offer</SelectItem>
                  {offers.map((o) => (<SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>)}
        </div>)}

      <div>
        <Label htmlFor="make-brief" className={field}>
          {fromConcept ? "Anything to add? (optional)" : "What should it say? (optional)"}
        </Label>
        <Textarea id="make-brief" value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} maxLength={1200} placeholder={fromConcept ? "A note for the plan: a place, a mood, something to avoid." : "The 1 thing it should argue, in your own words. Leave it empty and it is written from what your customers said."} data-testid="make-brief"/>
      </div>

      {timed && lengths.length > 1 && (<div>
          <Label className={field}>Length</Label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Length">
            {lengths.map((l) => (<button key={l} type="button" role="radio" aria-checked={length === l} onClick={() => setLength(l)} className={cn("rounded-full border px-3 py-1 text-sm", length === l ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`make-length-${l}`}>
                {LENGTH_WORDS[l]}
              </button>))}
          </div>
        </div>)}

      {reads.length > 0 && (<div className={cn("rounded-lg border p-4 text-sm", gaps.length ? "border-amber-200 bg-amber-50/50" : "bg-muted/30")} data-testid="make-needs">
          <p className="font-medium">{gaps.length ? `${gaps.length} of the ${reads.length} things this format reads from your brand ${gaps.length === 1 ? "is" : "are"} blank` : `Your brand has all ${reads.length} things this format reads`}</p>
          {gaps.length > 0 && <p className="mt-1 text-muted-foreground">You can still make it. Where something is blank the app guesses, and that is where a picture or a clip most often comes back wrong.</p>}
          <ul className="mt-3 space-y-1.5">
            {reads.map((n) => (<li key={n.label} className="flex gap-2" data-testid={n.have ? "make-need-have" : "make-need-blank"}>
                <span aria-hidden className={cn("mt-0.5 shrink-0", n.have ? "text-emerald-600" : "text-amber-700")}>
                  {n.have ? "✓" : "○"}
                </span>
                <span>
                  {n.label}
                  {!n.have && (<span className="text-muted-foreground">
                      . {n.without}{" "}
                      <Link href={n.href} className="underline">
                        Add it: {n.field}
                      </Link>
                    </span>)}
                </span>
              </li>))}
          </ul>
        </div>)}

      <TasteBar surface={surface} value={taste} onChange={setTaste} id="make-taste"/>

      <HooksPicker id="make-hooks" value={hooks} onChange={setHooks} label="Hooks for the script"/>
      <ClaimsSwitch checked={claimChecks} onChange={setClaimChecks} testid="make-claims"/>

      <div className="space-y-2">
        <Button onClick={submit} disabled={pending || (!fromConcept && product === NONE)} data-testid="make-submit">
          {pending ? "Starting..." : `Make the ${label.toLowerCase()}`}
        </Button>
        <p className="text-sm text-muted-foreground">
          {live ? "A script is written for this format, then its plan. Nothing is made until you approve the plan on the Production board." : "Writing is switched off on this account, so this is a sample."}
        </p>
      </div>
    </div>);
}
