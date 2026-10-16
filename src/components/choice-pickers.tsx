"use client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_BUYERS, CHOICE_HELP, CHOICE_LABEL, NO_OFFER, WHOLE_BRAND } from "@/lib/choices";
export interface Named {
    id: string;
    name: string;
}
export const OFFER_AUTO = "";
const AUTO = "__auto";
const help = "text-xs text-muted-foreground";
export function SubjectPicker({ products, value, onChange, testId = "pick-subject", label = "What is it about?" }: {
    products: Named[];
    value: string;
    onChange: (v: string) => void;
    testId?: string;
    label?: string;
}) {
    return (<div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {products.map((p) => (<SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>))}
          {products.length > 0 && <SelectSeparator />}
          <SelectItem value={WHOLE_BRAND} data-testid={`${testId}-brand`}>
            {CHOICE_LABEL[WHOLE_BRAND]}
          </SelectItem>
        </SelectContent>
      </Select>
      {value === WHOLE_BRAND && <p className={help}>{CHOICE_HELP[WHOLE_BRAND]}</p>}
    </div>);
}
export function BuyerPicker({ personas, value, onChange, testId = "pick-buyer", label = "Who is it for?" }: {
    personas: Named[];
    value: string;
    onChange: (v: string) => void;
    testId?: string;
    label?: string;
}) {
    return (<div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>))}
          {personas.length > 0 && <SelectSeparator />}
          <SelectItem value={ALL_BUYERS} data-testid={`${testId}-all`}>
            {CHOICE_LABEL[ALL_BUYERS]}
          </SelectItem>
        </SelectContent>
      </Select>
      {value === ALL_BUYERS && <p className={help}>{CHOICE_HELP[ALL_BUYERS]}</p>}
    </div>);
}
export function OfferPicker({ offers, value, onChange, testId = "pick-offer", label = "Offer" }: {
    offers: Named[];
    value: string;
    onChange: (v: string) => void;
    testId?: string;
    label?: string;
}) {
    return (<div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || AUTO} onValueChange={(v) => onChange(v === AUTO ? OFFER_AUTO : v)}>
        <SelectTrigger className="w-full" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {offers.length > 0 && <SelectItem value={AUTO}>The offer that fits this buyer</SelectItem>}
          {offers.map((o) => (<SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>))}
          {offers.length > 0 && <SelectSeparator />}
          <SelectItem value={NO_OFFER} data-testid={`${testId}-none`}>
            {CHOICE_LABEL[NO_OFFER]}
          </SelectItem>
        </SelectContent>
      </Select>
      {value === NO_OFFER && <p className={help}>{CHOICE_HELP[NO_OFFER]}</p>}
    </div>);
}
