"use client";
import { useState } from "react";
import Link from "next/link";
import { suggestCreativeFormats, type CreatorObjective, type CreatorAudience, type CreatorAssets } from "@/lib/creator-studio";
export function FormatSuggestions() {
    const [objective, setObjective] = useState<CreatorObjective>("introduce");
    const [audience, setAudience] = useState<CreatorAudience>("new");
    const [assets, setAssets] = useState<CreatorAssets>({ product: true, avatar: false, proof: false, offer: false });
    const suggested = suggestCreativeFormats(objective, audience, assets);
    return <details className="rounded-xl border bg-card p-4" data-testid="format-suggestions">
    <summary className="cursor-pointer text-base font-semibold">Help me choose a format</summary>
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">Objective<select aria-label="Creative objective" value={objective} onChange={(e) => setObjective(e.target.value as CreatorObjective)} className="block h-11 w-full rounded border bg-background px-2"><option value="introduce">Introduce the brand or problem</option><option value="explain">Explain a feature or real use</option><option value="prove">Support the buying argument</option><option value="convert">Make the offer and next step clear</option></select></label>
        <label className="space-y-1 text-sm">Audience<select aria-label="Creative audience" value={audience} onChange={(e) => setAudience(e.target.value as CreatorAudience)} className="block h-11 w-full rounded border bg-background px-2"><option value="new">New to this brand</option><option value="comparing">Comparing options</option><option value="returning">Returning buyers</option></select></label>
      </div>
      <fieldset className="space-y-2 text-sm"><legend className="mb-2 font-medium">Assets you have</legend>{([{ key: "product", label: "Accurate product photos and facts" }, { key: "avatar", label: "An adult avatar" }, { key: "proof", label: "Approved quotes or substantiated evidence" }, { key: "offer", label: "An approved actual offer" }] as const).map(({ key, label }) => <label key={key} className="flex min-h-9 items-center gap-2"><input type="checkbox" checked={assets[key]} onChange={(e) => setAssets((a) => ({ ...a, [key]: e.target.checked }))}/>{label}</label>)}</fieldset>
      <div className="grid gap-3 md:grid-cols-3">{suggested.map((r) => <article key={r.id} className="space-y-2 rounded-lg border p-3" data-testid="format-suggestion"><h3 className="font-semibold">{r.label}</h3><p className="text-sm">{r.reason}</p><p className="text-xs text-muted-foreground">Requires: {r.requirements.join("; ")}.</p>{r.missing.length > 0 && <p className="text-xs text-amber-800">Prepare first: {r.missing.join("; ")}.</p>}<Link href={`/formats/${r.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary">Explore this format</Link></article>)}</div>
      <p className="text-xs text-muted-foreground">Optional guidance from the choices above. You can choose any format; suitability does not predict ad performance.</p>
    </div>
  </details>;
}
