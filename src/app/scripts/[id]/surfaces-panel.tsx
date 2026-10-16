"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Minus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EDGE_LABEL, PROPS, PROP_INFO, SURFACES, type ScriptSurfaces, type SurfaceFit } from "@/lib/scripts/surface-types";
import { OUTPUT_INFO, humanize } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { checkSurfacesAction } from "../actions";
const FIT: Record<SurfaceFit["fit"], {
    label: string;
    tone: string;
}> = {
    recommended: { label: "Recommended", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    possible: { label: "Possible", tone: "border-amber-200 bg-amber-50 text-amber-800" },
    poor: { label: "Poor fit", tone: "border-red-200 bg-red-50 text-red-700" },
};
const NEED = { must: "Must have", helps: "Helps", no: "Not needed" } as const;
const VERDICT = { fits: "Fits its length", too_short: "Too short for what it argues", too_long: "Longer than it needs" } as const;
const outputs = (f: SurfaceFit) => f.outputs.map((o) => OUTPUT_INFO[o].label).join(", ");
export function SurfacesPanel({ scriptId, version, beat, surfaces, live }: {
    scriptId: string;
    version: number;
    beat: string;
    surfaces: ScriptSurfaces | null;
    live: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, start] = useTransition();
    const run = () => start(async () => {
        const res = await checkSurfacesAction(scriptId);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Surfaces checked.");
        router.refresh();
    });
    const s = surfaces;
    const stale = !!s && s.version !== version;
    const best = s?.fits.filter((f) => f.fit === "recommended") ?? [];
    const poor = s?.fits.filter((f) => f.fit === "poor") ?? [];
    return (<div className="rounded-md border p-3" data-testid="format-chooser">
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground">What it should be made as</div>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={run} disabled={pending} data-testid="surfaces-check">
          {pending ? <Loader2 className="size-3 animate-spin"/> : <RefreshCw className="size-3"/>}
          {s ? "Check again" : "Check"}
        </Button>
      </div>
      {!s ? (<p className="mt-1 text-xs text-muted-foreground">
          Load-bearing beat: <span className="font-medium text-foreground">{humanize(beat)}</span>. Not checked yet: the check reads the script and scores each kind of ad against what it needs{live ? " (about 1 cent)" : ""}.
        </p>) : (<div data-testid="surfaces">
          <div className="mt-1 font-medium">
            The {humanize(s.load_bearing_beat)} carries this script
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.why}</p>
          {s.by !== "rules" && s.load_bearing_beat !== beat && (<p className="mt-1 text-xs text-amber-700" data-testid="surfaces-disagree">
              The writer meant the {humanize(beat)} to carry it. As written, the {humanize(s.load_bearing_beat)} does: either that is the ad, or the {humanize(beat)} needs more of the script.
            </p>)}
          <p className="mt-2 text-xs">
            <span className="text-muted-foreground">Recommended: </span>
            <span data-testid="surfaces-recommended">{best.length ? best.map((f) => f.label).join(", ") : "Nothing fits cleanly: see the detail"}</span>
          </p>
          {poor.length > 0 && (<p className="mt-1 text-xs">
              <span className="text-muted-foreground">Poor fit: </span>
              {poor.map((f) => f.label).join(", ")}
            </p>)}
          <p className={cn("mt-1 text-xs", s.length.verdict !== "fits" && "text-amber-700")}>
            <span className={s.length.verdict === "fits" ? "text-muted-foreground" : ""}>Length: </span>
            {VERDICT[s.length.verdict]}
            {s.length.recommended !== s.length.planned ? `. Best at ${s.length.recommended}` : ""}
          </p>
          {stale && <p className="mt-1 text-xs text-amber-700">The script changed since this was checked (version {s.version}). Check again.</p>}
          <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={() => setOpen(true)} data-testid="surfaces-open">
            See the full check
          </button>
        </div>)}

      {s && (<Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-4xl" data-testid="surfaces-detail">
            <DialogHeader>
              <DialogTitle>What this script should be made as</DialogTitle>
              <DialogDescription>
                The script comes first; the format follows from what its argument needs. Checked by {s.by === "rules" ? "the app's rules (no model read it)" : s.by} on version {s.version}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 text-sm">
              <section>
                <h3 className="font-medium">1. The load-bearing beat: {humanize(s.load_bearing_beat)}</h3>
                <p className="text-xs text-muted-foreground">{EDGE_LABEL[s.edge]}.</p>
                <p className="mt-1">{s.why}</p>
              </section>

              <section>
                <h3 className="font-medium">2. What the script needs from a surface</h3>
                <ul className="mt-2 divide-y rounded-md border">
                  {PROPS.map((p) => (<li key={p} className="grid gap-1 p-2.5 sm:grid-cols-[13rem_6.5rem_1fr]" data-testid="surface-need" data-need={s.needs[p].need}>
                      <span className="font-medium">{PROP_INFO[p].label}</span>
                      <span className={cn("text-xs", s.needs[p].need === "must" ? "font-medium text-foreground" : "text-muted-foreground")}>{NEED[s.needs[p].need]}</span>
                      <span className="text-xs text-muted-foreground">{s.needs[p].why}</span>
                    </li>))}
                </ul>
              </section>

              <section>
                <h3 className="font-medium">3. Each kind of ad against those needs</h3>
                <div className="mt-2 overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[44rem] text-xs">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="p-2 font-medium">Surface</th>
                        {PROPS.map((p) => (<th key={p} className={cn("p-2 font-medium", s.needs[p].need === "must" && "text-foreground")} title={PROP_INFO[p].question}>
                            {PROP_INFO[p].label}
                            {s.needs[p].need === "must" ? " (must)" : ""}
                          </th>))}
                        <th className="p-2 font-medium">Fit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.fits.map((f) => {
                const surface = SURFACES.find((x) => x.id === f.id)!;
                return (<tr key={f.id} className="border-t align-top" data-testid="surface-row" data-fit={f.fit}>
                            <td className="p-2">
                              <div className="font-medium">{f.label}</div>
                              <div className="text-muted-foreground">{surface.what}</div>
                            </td>
                            {PROPS.map((p) => {
                        const has = surface.has[p];
                        const broken = s.needs[p].need === "must" && has === "no";
                        return (<td key={p} className={cn("p-2", broken && "bg-red-50")}>
                                  {has === "yes" ? <Check className="size-4 text-emerald-600" aria-label="Yes"/> : has === "partly" ? <Minus className="size-4 text-amber-600" aria-label="Partly"/> : <X className={cn("size-4", broken ? "text-red-600" : "text-muted-foreground/50")} aria-label="No"/>}
                                </td>);
                    })}
                            <td className="p-2">
                              <span className={cn("rounded-full border px-2 py-0.5", FIT[f.fit].tone)}>{FIT[f.fit].label}</span>
                            </td>
                          </tr>);
            })}
                    </tbody>
                  </table>
                </div>
                <ul className="mt-3 space-y-2">
                  {s.fits.map((f) => (<li key={f.id} className="text-xs">
                      <span className="font-medium">{f.label}</span> <span className="text-muted-foreground">({outputs(f)})</span>
                      {f.fit === "recommended" && !f.cautions.length && <span className="text-muted-foreground">: holds everything the script needs.</span>}
                      {[...f.breaks, ...f.cautions].map((m) => (<div key={m} className={f.breaks.includes(m) ? "text-red-700" : "text-amber-800"}>
                          {m}
                        </div>))}
                    </li>))}
                </ul>
                {s.blend && (<p className="mt-3 rounded-md bg-muted p-2.5 text-xs">
                    <span className="font-medium">Changing surface inside 1 video: </span>
                    {s.blend}
                  </p>)}
                <p className="mt-2 text-xs text-muted-foreground">No surface is better in general. You can make this script as any of them; a poor fit means a beat the script rests on has nowhere to go.</p>
              </section>

              <section>
                <h3 className="font-medium">4. Length</h3>
                <p className="mt-1">
                  {VERDICT[s.length.verdict]}. It runs about {s.length.seconds} seconds as written and was planned as {s.length.planned}
                  {s.length.recommended !== s.length.planned ? `; it is best made at ${s.length.recommended}` : ""}.
                </p>
                {s.length.why && <p className="mt-1 text-xs text-muted-foreground">{s.length.why}</p>}
                {s.length.extend && (<p className="mt-1 text-xs">
                    <span className="font-medium">For a longer version: </span>
                    {s.length.extend} Write it as its own script; a long script cut down makes a poor short ad.
                  </p>)}
              </section>
            </div>
          </DialogContent>
        </Dialog>)}
    </div>);
}
