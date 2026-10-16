"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DIRECTION_STATUS, type CreativeDirection, type ExplorationMix } from "@/lib/creative/exploration";
export function ExplorationPanel({ directions, live, pending, onGenerate }: {
    directions: CreativeDirection[];
    live: boolean;
    pending: boolean;
    onGenerate: (mix: ExplorationMix) => void;
}) {
    const [mix, setMix] = useState<ExplorationMix>({});
    const total = Object.values(mix).reduce((sum, n) => sum + (n ?? 0), 0);
    return (<details className="mx-6 mt-5 max-w-3xl rounded-xl border bg-card" data-testid="creative-exploration">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium">Explore seven different arguments</summary>
      <div className="space-y-4 border-t px-5 py-4">
        <p className="text-sm text-muted-foreground">Choose the mix before writing. These starting points use your saved personas, product details and exact research passages. Review each source for the product you are selling.</p>
        <div className="space-y-3">
          {directions.map((d) => (<div key={d.id} className="rounded-lg border p-4" data-testid={`direction-${d.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{d.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{DIRECTION_STATUS[d.status]}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  Concepts
                  <select aria-label={`Concepts: ${d.label}`} value={mix[d.id] ?? 0} disabled={pending || d.status === "needs_source"} onChange={(e) => setMix((m) => ({ ...m, [d.id]: Number(e.target.value) }))} className="rounded-md border bg-background px-2 py-1">
                    {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-sm">{d.job}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d.basis}</p>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Sources, limits and an alternative</summary>
                <div className="mt-2 space-y-2">
                  <p>{d.limits}</p>
                  {d.evidence.map((e) => <blockquote key={e.id} className="border-l-2 pl-3"><p className="whitespace-pre-wrap break-words">“{e.quote}”</p><Link className="text-xs underline" href={`/sources?item=${encodeURIComponent(e.sourceId)}&hl=${encodeURIComponent(e.id)}`}>Open {e.sourceType} source · {e.id}</Link></blockquote>)}
                  {d.registeredProof?.map((r) => <blockquote key={r.id} className="border-l-2 pl-3"><p>{r.beliefCorrection?.belief} → {r.beliefCorrection?.correction}</p><p>{r.source.excerpt}</p><p>{r.qualifiers.join(" ")}</p><Link className="text-xs underline" href="/creative-quality">Inspect bound evidence · {r.id} · revision {r.revision}</Link></blockquote>)}
                  <p className="text-muted-foreground">Alternative: {d.alternative}</p>
                </div>
              </details>
            </div>))}
        </div>
        <p role="status" className="text-sm">{total} concepts selected{total > 12 ? "; reduce the total to 12 or fewer." : "."}</p>
        <Button variant="outline" disabled={!live || pending || total < 1 || total > 12} onClick={() => onGenerate(mix)} data-testid="explore-generate">{pending ? "Writing concepts…" : "Write this mix"}</Button>
        {!live && <p className="text-xs text-muted-foreground">You can inspect the directions now. Writing the concepts uses the app's configured writing provider when live generation is enabled.</p>}
      </div>
    </details>);
}
