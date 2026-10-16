"use client";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { BRIEF_LAYOUTS, variantDifferences, type BriefConcept, type CreativeBrief, type BriefEditChoices } from "@/lib/creative-brief";
import { useState } from "react";
import { AWARENESS_INFO, AWARENESS_STAGES } from "@/lib/taxonomy";
export function CreativeBriefDetails({ concept, proof, themes, selected, onSelect, onChange, editChoices, editorOpen = false }: {
    concept: BriefConcept;
    proof: CreativeBrief["proof"];
    themes: {
        id: string;
        label: string;
    }[];
    selected: number;
    onSelect: (index: number) => void;
    onChange?: (concept: BriefConcept) => void;
    editChoices?: Pick<BriefEditChoices, "personas" | "claims" | "themes">;
    editorOpen?: boolean;
}) {
    const v = concept.variants[selected];
    const update = (field: keyof BriefConcept, value: string) => onChange?.({ ...concept, [field]: value });
    const updateVariant = (field: keyof typeof v, value: string) => onChange?.({ ...concept, variants: concept.variants.map((item, i) => i === selected ? { ...item, [field]: value } : item) });
    return <div className="space-y-5" data-testid="creative-brief-details">
    <dl className="grid gap-4 sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">What stops them buying</dt><dd className="mt-1 text-sm">{concept.blocking_belief}</dd></div>
      <div><dt className="text-xs text-muted-foreground">What the ad helps them believe</dt><dd className="mt-1 text-sm">{concept.desired_belief}</dd></div>
      <div><dt className="text-xs text-muted-foreground">The moment we meet them</dt><dd className="mt-1 text-sm">{concept.moment}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Why this concept</dt><dd className="mt-1 text-sm">{concept.rationale}</dd></div>
    </dl>
    <details className="rounded-lg border p-3" data-testid="brief-evidence">
      <summary className="cursor-pointer text-sm font-medium">Supporting proof and customer research</summary>
      <ul className="mt-3 space-y-2 text-sm">{proof.map((p) => <li key={p.id}>{p.text}<span className="ml-1 text-xs text-muted-foreground">— {p.source || "Brand claim register"}</span></li>)}</ul>
      <div className="mt-3 flex flex-wrap gap-2">{concept.theme_ids.map((id) => <Link key={id} href={`/insights?theme=${encodeURIComponent(id)}`} className="text-xs text-primary underline underline-offset-2">{themes.find((t) => t.id === id)?.label ?? "View source theme"}</Link>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Beliefs and moments are creative hypotheses. Customer research and substantiated brand claims support this direction; ad performance is not measured.</p>
    </details>
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Three ways to tell this idea</h3><span className="text-xs text-muted-foreground">Choose a variant to inspect</span></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Creative variants">{concept.variants.map((item, i) => <Button key={item.label} type="button" size="sm" variant={selected === i ? "default" : "outline"} aria-pressed={selected === i} onClick={() => onSelect(i)} data-testid={`brief-variant-${item.label}`}>Variant {item.label}</Button>)}</div>
      <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-4" aria-live="polite" data-testid="brief-variant-detail">
        <p className="font-serif text-xl">{v.headline}</p>{v.subheadline && <p className="text-sm text-muted-foreground">{v.subheadline}</p>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Specific buyer</dt><dd>{v.sub_persona}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Feeling / awareness</dt><dd>{v.emotion} · {AWARENESS_INFO[v.awareness].label}</dd></div>
          <div><dt className="text-xs text-muted-foreground">How it opens</dt><dd>{v.opener}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Layout / tone</dt><dd>{v.layout} · {v.tone} · {v.headline.split(/\s+/).length} headline words</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">What we see</dt><dd>{v.visual_direction}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2 border-t pt-3">{concept.variants.filter((_, i) => i !== selected).map((other) => <Badge key={other.label} variant="outline" className="whitespace-normal font-normal">Compared with {other.label}: {variantDifferences(v, other).join(", ") || "needs more difference"}</Badge>)}</div>
      </div>
    </div>
    {onChange && <details open={editorOpen || undefined} className="rounded-lg border p-3" data-testid="brief-editor">
      <summary className="cursor-pointer text-sm font-medium">Edit this concept and variant {v.label}</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {editChoices && <Label className="grid gap-2">Concept buyer<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={concept.persona_id} onChange={(e) => update("persona_id", e.target.value)}>{editChoices.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Label>}
        <Label className="grid gap-2">Concept awareness<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={concept.awareness} onChange={(e) => update("awareness", e.target.value)}>{AWARENESS_STAGES.map((stage) => <option key={stage} value={stage}>{AWARENESS_INFO[stage].label}</option>)}</select></Label>
        {([['name', 'Concept name'], ['angle', 'The argument'], ['blocking_belief', 'What stops them buying'], ['desired_belief', 'What they should believe'], ['moment', 'The customer moment'], ['rationale', 'Why this idea']] as const).map(([field, label]) => <Label key={field} className="grid gap-2">{label}<Textarea aria-label={label} value={concept[field]} maxLength={field === "name" ? 120 : 700} rows={2} onChange={(e) => update(field, e.target.value)}/></Label>)}
        {([['sub_persona', 'Specific buyer'], ['emotion', 'Feeling'], ['opener', 'Opening mechanism'], ['tone', 'Tone'], ['headline', 'Headline'], ['subheadline', 'Supporting line'], ['visual_direction', 'Visual direction']] as const).map(([field, label]) => <Label key={field} className="grid gap-2">Variant {v.label}: {label}<Input value={v[field]} maxLength={field === "headline" ? 160 : field === "subheadline" ? 250 : 700} onChange={(e) => updateVariant(field, e.target.value)}/></Label>)}
        <Label className="grid gap-2">Variant {v.label}: awareness<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={v.awareness} onChange={(e) => updateVariant("awareness", e.target.value)}>{AWARENESS_STAGES.map((stage) => <option key={stage} value={stage}>{AWARENESS_INFO[stage].label}</option>)}</select></Label>
        <Label className="grid gap-2">Variant {v.label}: layout<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={v.layout} onChange={(e) => updateVariant("layout", e.target.value)}>{BRIEF_LAYOUTS.map((layout) => <option key={layout} value={layout}>{layout}</option>)}</select></Label>
      </div>
      {editChoices && <div className="mt-5 space-y-4"><EvidencePicker label="Approved supporting proof" items={editChoices.claims.map((c) => ({ id: c.id, label: c.text }))} selected={concept.claim_ids} onChange={(claim_ids) => onChange({ ...concept, claim_ids })}/><EvidencePicker label="Customer research" items={editChoices.themes} selected={concept.theme_ids} onChange={(theme_ids) => onChange({ ...concept, theme_ids })}/></div>}
    </details>}
  </div>;
}
function EvidencePicker({ label, items, selected, onChange }: {
    label: string;
    items: {
        id: string;
        label: string;
    }[];
    selected: string[];
    onChange: (ids: string[]) => void;
}) {
    const [query, setQuery] = useState("");
    const shown = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)));
    return <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">{label}</legend><Input aria-label={`Find ${label.toLowerCase()}`} placeholder={`Find ${label.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)}/><div className="max-h-48 space-y-2 overflow-y-auto">{shown.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={selected.includes(item.id)} onChange={(e) => onChange(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))}/><span>{item.label}</span></label>)}{!shown.length && <p className="text-xs text-muted-foreground">No matching evidence. Add approved facts in Brand brain or customer research in Sources.</p>}</div><p className="text-xs text-muted-foreground">{selected.length} selected</p></fieldset>;
}
