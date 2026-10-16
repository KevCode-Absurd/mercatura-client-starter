"use client";
import { BRIEF_GOALS, type BriefEditChoices, type BriefSetup } from "@/lib/creative-brief";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
export function BriefSetupFields({ value, onChange, choices, disabled }: {
    value: BriefSetup;
    onChange: (setup: BriefSetup) => void;
    choices: Pick<BriefEditChoices, "products" | "personas" | "offers">;
    disabled?: boolean;
}) {
    const field = "h-11 w-full rounded-lg border bg-background px-3 text-sm";
    return <fieldset disabled={disabled} className="space-y-5" data-testid="brief-setup-fields">
    <legend className="mb-3 font-serif text-2xl">What should these ads do?</legend>
    <div className="grid gap-3 sm:grid-cols-2">{BRIEF_GOALS.map((goal) => <label key={goal.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${value.goal === goal.id ? "border-primary bg-primary/5" : "bg-card"}`}><input className="mt-1 accent-primary" type="radio" name="brief-goal" value={goal.id} checked={value.goal === goal.id} onChange={() => onChange({ ...value, goal: goal.id })}/><span><span className="block text-sm font-medium">{goal.label}</span><span className="mt-1 block text-sm text-muted-foreground">{goal.description}</span></span></label>)}</div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Label className="grid gap-2">Product<select className={field} value={value.product_id} required onChange={(e) => onChange({ ...value, product_id: e.target.value })}>{!choices.products.length && <option value="">Add a product in Brand brain</option>}{choices.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Label>
      <Label className="grid gap-2">Who are we speaking to?<select className={field} value={value.persona_id} onChange={(e) => onChange({ ...value, persona_id: e.target.value })}><option value="">Let the research guide the buyer</option>{choices.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Label>
      <Label className="grid gap-2">Offer available to this buyer<select className={field} value={value.offer_id} required onChange={(e) => onChange({ ...value, offer_id: e.target.value })}>{!choices.offers.length && <option value="">Add an offer in Brand brain</option>}{choices.offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Label>
      <Label className="grid gap-2">What will we make?<select className={field} value={value.medium} onChange={(e) => onChange({ ...value, medium: e.target.value as BriefSetup["medium"] })}><option value="both">Images and video</option><option value="image">Image ads</option><option value="video">Video ads</option></select></Label>
    </div>
    <Label className="grid gap-2">Anything to build on or avoid? <span className="font-normal text-muted-foreground">Optional</span><Textarea value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} maxLength={1600} rows={3} placeholder={value.goal === "improve" ? "Name the existing concept and what you want to explore differently." : "A launch detail, an existing idea, a customer moment or a constraint."}/></Label>
  </fieldset>;
}
