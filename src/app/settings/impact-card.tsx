"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveImpactAction } from "./actions";
export interface ImpactRates {
    usd_per_piece: number;
    hours_per_piece: number;
}
export function ImpactCard({ brandName, rates, start }: {
    brandName: string;
    rates: ImpactRates;
    start: ImpactRates;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const [usd, setUsd] = useState(String(rates.usd_per_piece));
    const [hours, setHours] = useState(String(rates.hours_per_piece));
    const next = { usd_per_piece: Number(usd), hours_per_piece: Number(hours) };
    const dirty = next.usd_per_piece !== rates.usd_per_piece || next.hours_per_piece !== rates.hours_per_piece;
    const bad = [usd, hours].some((v) => v.trim() === "" || !Number.isFinite(Number(v)) || Number(v) < 0);
    const isStart = next.usd_per_piece === start.usd_per_piece && next.hours_per_piece === start.hours_per_piece;
    const save = (v: ImpactRates) => begin(async () => {
        const res = await saveImpactAction(v);
        if (!res.ok)
            return void toast.error(res.error);
        setUsd(String(v.usd_per_piece));
        setHours(String(v.hours_per_piece));
        toast.success("Saved. The home screen counts with these from now.");
        router.refresh();
    });
    const field = (label: string, unit: string, value: string, set: (v: string) => void, testid: string, step: string) => (<label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        {unit === "$" && <span className="text-muted-foreground">$</span>}
        <Input type="number" min={0} step={step} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="h-10 w-32 text-base tabular-nums" data-testid={testid}/>
        {unit !== "$" && <span className="text-muted-foreground">{unit}</span>}
      </span>
    </label>);
    return (<Card data-testid="impact-card" id="impact">
      <CardHeader>
        <CardTitle className="text-lg">What a finished piece is worth</CardTitle>
        <CardDescription>
          The home screen adds up what {brandName}&apos;s finished images, scripts and assets would have cost made by hand or hired out. Put in your own figures: what you would pay for 1 piece, and the hours 1 piece takes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-6 sm:grid-cols-2">
          {field("Paid for 1 piece", "$", usd, setUsd, "impact-usd", "5")}
          {field("Hours for 1 piece", "hours", hours, setHours, "impact-hours", "0.5")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => save(next)} disabled={pending || !dirty || bad} data-testid="impact-save">
            Save
          </Button>
          {!isStart && (<Button size="sm" variant="ghost" onClick={() => save(start)} disabled={pending} data-testid="impact-reset">
              Put back (${start.usd_per_piece} and {start.hours_per_piece} hours)
            </Button>)}
        </div>
      </CardContent>
    </Card>);
}
