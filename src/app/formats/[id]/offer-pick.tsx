"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
export interface FlowOffer {
    id: string;
    name: string;
}
export function OfferPick({ offers, value, onChange }: {
    offers: FlowOffer[];
    value: string | null;
    onChange: (id: string) => void;
}) {
    if (!offers.length)
        return (<p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="flow-no-offer">
        This brand has no offer on file, so these ads would have no price or deal to state.{" "}
        <Link href="/offers" className="font-medium underline">
          Add an offer first
        </Link>
        , or pick another kind of ad.
      </p>);
    return (<div className="flex flex-wrap items-center gap-3 text-sm" data-testid="flow-offer">
      <span className="font-medium">Which offer</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Which offer">
        {offers.map((o) => (<button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn("rounded-full border px-3 py-1", value === o.id ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`flow-offer-${o.id}`}>
            {o.name}
          </button>))}
      </div>
    </div>);
}
