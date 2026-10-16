"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAdvanced } from "@/components/mode";
import { saveChecksAction } from "./actions";
export function ChecksCard({ brandName, checks }: {
    brandName: string;
    checks: {
        claims: boolean;
        ad_review: boolean;
    };
}) {
    const router = useRouter();
    const [c, setC] = useState(checks);
    const [pending, start] = useTransition();
    const advanced = useAdvanced();
    const save = (next: typeof c) => {
        setC(next);
        start(async () => {
            const res = await saveChecksAction(next);
            if (res.ok) {
                toast.success("Saved.");
                router.refresh();
            }
            else {
                setC(c);
                toast.error(res.error);
            }
        });
    };
    return (<Card data-testid="checks-card">
      <CardHeader>
        <CardTitle className="text-lg">Checks for {brandName}</CardTitle>
        <CardDescription>Choose the default checks for this brand. You can also enable them on individual work. Failed checks pause automatic production; a human can override them, with the decision recorded.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <label className="flex items-start gap-3">
          <Switch checked={c.claims} disabled={pending} onCheckedChange={(v) => save({ ...c, claims: v })} className="mt-0.5" data-testid="checks-claims"/>
          <span>
            <span className="text-[15px] font-semibold">Check claims</span>
            <span className="mt-0.5 block max-w-3xl text-sm text-muted-foreground">
              {!advanced
            ? c.claims
                ? "On. Every script and ad is read against the claims the brand has approved, and anything that fails is written again. This is slower. For a brand in a regulated category."
                : "Off. Scripts and ads are written freely and the person approving them verifies the facts. This is faster; a draft can state something the brand has not approved."
            : c.claims
                ? "On. The writer cites the brand's approved claims, a second model reads every word against them, and a failure is written again. For a brand in a regulated category."
                : "Off. Scripts and ads are written freely and the person approving them verifies the facts. Costs about a third less and reads better; a draft can state something the brand has not approved."}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <Switch checked={c.ad_review} disabled={pending} onCheckedChange={(v) => save({ ...c, ad_review: v })} className="mt-0.5" data-testid="checks-ad-review"/>
          <span>
            <span className="text-[15px] font-semibold">Ad review</span>
            <span className="mt-0.5 block max-w-3xl text-sm text-muted-foreground">
              {c.ad_review ? "On. Every image ad gets a second read before its picture is made." : "Off. Image ads are made without a second read. You can still ask for one on any set of image ads, with 1 press on its plan."}
            </span>
            <span className="mt-1.5 block max-w-3xl text-sm text-muted-foreground">
              {advanced ? "A second model, not the one that wrote the ad, reads" : "The review reads"} each ad the way a stranger scrolling past would: would the picture and headline stop them, does the ad say 1 thing, does every claim change something in the buyer&apos;s day, does it sound like a person and like {brandName}, does it fit how much the buyer already knows, can it be read on a phone, and do the picture and the text that runs with it agree.
            </span>
            <span className="mt-1.5 block max-w-3xl text-sm text-muted-foreground">
              You get up to 3 points an ad, the most damaging first, each with what to change. They are shown with the ad. Nothing is rewritten for you and no ad is held back, which is why this starts switched off. {advanced ? "About 0.7 cents an ad." : "Switched on, each set takes a little longer."}
            </span>
          </span>
        </label>
      </CardContent>
    </Card>);
}
