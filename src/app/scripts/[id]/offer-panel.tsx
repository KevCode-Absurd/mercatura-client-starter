"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptOfferView } from "@/lib/offers/script-offer";
import { LiveGate } from "../generation";
import { rewriteWithOfferAction } from "./offer-actions";
export function OfferPanel({ scriptId, view, live, fixed }: {
    scriptId: string;
    view: ScriptOfferView;
    live: boolean;
    fixed: boolean;
}) {
    const [picked, setPicked] = useState(view.current?.id ?? "");
    const [queued, setQueued] = useState("");
    const [pending, start] = useTransition();
    const changed = !!picked && picked !== (view.current?.id ?? "");
    const go = () => start(async () => {
        const r = await rewriteWithOfferAction(scriptId, picked);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        setQueued(r.offer);
        toast.success(`Being written again with "${r.offer}".`);
    });
    return (<div className="mx-6 mt-4 rounded-xl border border-rule bg-card px-5 py-4 text-sm" data-testid="script-offer" data-reason={view.reason}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="size-3.5"/>
          Offer
        </span>
        <span className="font-medium" data-testid="script-offer-name">
          {view.current?.name ?? "No offer"}
        </span>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground" data-testid="script-offer-reason">
          {view.label}
        </span>
        {!fixed && view.choices.length > 0 && (<div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger className="h-8 w-64 text-xs" aria-label="The offer this script states" data-testid="script-offer-select">
                <SelectValue placeholder="Pick an offer"/>
              </SelectTrigger>
              <SelectContent>
                {view.choices.map((o) => (<SelectItem key={o.id} value={o.id} data-testid={`script-offer-option-${o.id}`}>
                    {o.name}
                    {o.recommended ? " (Recommended)" : ""}
                    {!o.running ? " (not running)" : ""}
                  </SelectItem>))}
              </SelectContent>
            </Select>
            {changed && (<LiveGate live={live}>
                <Button size="sm" variant="outline" onClick={go} disabled={pending || !live} data-testid="script-offer-rewrite">
                  {pending && <Loader2 className="size-4 animate-spin"/>}
                  Rewrite with this offer
                </Button>
              </LiveGate>)}
          </div>)}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground" data-testid="script-offer-why">
        {view.why} {view.said}
        {!view.recommendedId && !fixed && (<>
            {" "}
            <Link href="/offers" className="underline underline-offset-2">
              Build an offer for this persona
            </Link>
            .
          </>)}
      </p>
      {view.current?.say && <p className="mt-1 text-xs">Said simply: {view.current.say}</p>}
      {changed && !queued && <p className="mt-1 text-xs text-muted-foreground">The script and its primary text are written again with the offer you picked, as a new version next to this one. This one stays as it is. It costs the same as writing 1 script.</p>}
      {queued && (<p className="mt-1 text-xs text-muted-foreground" data-testid="script-offer-queued">
          A version with &quot;{queued}&quot; is being written. It appears under Rebuild, beside this one, when it is done.
        </p>)}
    </div>);
}
