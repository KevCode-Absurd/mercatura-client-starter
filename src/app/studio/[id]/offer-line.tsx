"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeOfferLineAction } from "../offer-bank-actions";
export function OfferLineBar({ runId, line, ads, twins }: {
    runId: string;
    line: string;
    ads: number;
    twins: [
        number,
        number
    ][];
}) {
    const [text, setText] = useState(line);
    const [pending, start] = useTransition();
    const change = () => start(async () => {
        const res = await changeOfferLineAction(runId, text);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.pictures ? `The offer line is changed on ${res.changed} ad${res.changed === 1 ? "" : "s"}. ${res.pictures} picture${res.pictures === 1 ? " is" : "s are"} being changed, the rest of each kept.` : `The offer line is changed on ${res.changed} ad${res.changed === 1 ? "" : "s"}.`);
        window.location.reload();
    });
    return (<div className="rounded-xl border bg-card p-4" data-testid="offer-line">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className="min-w-0 flex-1 basis-80 text-sm">
          <span className="font-medium">The offer line, on all {ads} ads</span>
          <span className="block text-xs text-muted-foreground">The offer&apos;s own words: the price, the saving, the last day. Change it here and every ad changes: the picture is kept and only this line is set again.</span>
          <Input className="mt-1.5" value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder={line ? undefined : "No ad has an offer line yet: it is written with the plan"} data-testid="offer-line-input"/>
        </label>
        <Button onClick={change} disabled={pending || !line || text.trim() === line || text.trim().length < 2} data-testid="offer-line-change">
          {pending ? "Changing..." : "Change it on every ad"}
        </Button>
      </div>
      {twins.length > 0 && (<p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="offer-twins">
          At thumbnail size, images {twins.slice(0, 4).map(([a, b]) => `${a} and ${b}`).join("; ")} look like the same ad. Put them side by side at 300 pixels wide: if you cannot name the argument of each without reading it, they are 1 ad made twice.
        </p>)}
    </div>);
}
