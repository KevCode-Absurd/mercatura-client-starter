"use client";
import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import type { HandoffPack } from "@/lib/production/handoff";
import { checkPack } from "@/lib/production/pack-check";
import { clipsSaid } from "@/lib/production/prompts";
import { handoffAction } from "./actions";
import { assetUrl } from "./shared";
export function HandoffSection({ jobId, approved, open }: {
    jobId: string;
    approved: boolean;
    open?: boolean;
}) {
    const [pack, setPack] = useState<HandoffPack | null>(null);
    const [pending, start] = useTransition();
    const advanced = useAdvanced();
    const build = () => start(async () => {
        const res = await handoffAction(jobId);
        if (res.ok)
            setPack(res.pack);
        else
            toast.error(res.error);
    });
    useEffect(() => {
        if (open)
            build();
    }, [open, jobId]);
    const copy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        }
        catch {
            toast.error("Could not copy. Select the text and copy it by hand.");
        }
    };
    const check = pack ? checkPack(pack) : null;
    return (<section className="space-y-2" data-testid="handoff-pack">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Prompt pack</h3>
      <p className="text-xs text-muted-foreground">
        To make this video yourself (for example in Seedance 2.0 or 2.5 on Higgsfield): 1 prompt for each clip, and the pictures to attach with it, in order. Building the pack is free and makes no
        clip.{!approved && " The plan isn't approved yet, so the prompts may still change."}
      </p>
      <Button size="sm" variant="outline" onClick={build} disabled={pending} data-testid="handoff-build">
        {pending && <Loader2 className="size-3.5 animate-spin"/>}
        {pack ? "Rebuild the prompt pack" : "Build the prompt pack"}
      </Button>
      {pack && (<div className="space-y-3" data-testid="handoff-clips">
          <p className="text-xs text-muted-foreground">
            {clipsSaid(pack.clips.map((c) => c.seconds ?? pack.seconds))}, {pack.aspect}. For each clip: attach the pictures in the order shown, paste the prompt, and set the length shown on the clip. From clip 2 on, also attach the clip you
            just made as the video reference.{" "}
            <a href={assetUrl(`${pack.dir}/${pack.index}`)} target="_blank" rel="noreferrer" className="text-primary hover:underline" data-testid="handoff-index">
              Open the whole pack on 1 page
            </a>
            {advanced && (<>
                . The files are saved in <span className="font-mono">data/{pack.dir}</span>, 1 folder per clip.
              </>)}
          </p>
          {check && (<p className={check.ok ? "flex items-center gap-1.5 text-xs text-emerald-700" : "flex items-start gap-1.5 text-xs text-amber-800"} data-testid="handoff-check">
              {check.ok ? <Check className="size-3.5 shrink-0"/> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0"/>}
              <span>
                {check.ok
                    ? "Checked: every prompt names each picture it is given and what it is for, says its length, and asks for no captions."
                    : `Checked: ${check.clips.filter((c) => !c.ok).length} of ${check.clips.length} clips have something to look at before you paste. You can still copy every prompt.`}
                {check.order ? ` ${check.order}` : ""}
              </span>
            </p>)}
          {pack.clips.map((c, at) => (<div key={c.index} className="space-y-2 rounded-md border p-3 text-xs" data-testid="handoff-clip">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  Clip {c.index + 1} · {c.seconds ?? pack.seconds} seconds · {c.refs.filter((r) => r.file).length} pictures · {c.prompt.length} of {pack.limit} characters
                </span>
                <Button size="sm" variant="outline" onClick={() => copy(c.prompt, `Clip ${c.index + 1} prompt`)} data-testid="handoff-copy">
                  <Copy className="size-3.5"/>
                  Copy prompt
                </Button>
              </div>
              {check?.clips[at]?.ok ? (<p className="flex items-center gap-1 text-emerald-700" data-testid="handoff-clip-ok">
                  <Check className="size-3.5"/> Ready to paste
                </p>) : (<ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900" data-testid="handoff-clip-warnings">
                  {(check?.clips[at]?.warnings ?? []).map((w) => (<li key={w} className="flex items-start gap-1.5">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0"/>
                      <span>{w}</span>
                    </li>))}
                </ul>)}
              <ol className="space-y-1.5">
                {c.refs.map((r) => (<li key={r.tag} className="flex items-start gap-2" data-testid="handoff-ref">
                    {r.file ? (<a href={assetUrl(`${pack.dir}/${r.file}`)} target="_blank" rel="noreferrer" className="shrink-0">

                        <img src={assetUrl(`${pack.dir}/${r.file}`)} alt={r.tag} loading="lazy" className="size-12 rounded border object-cover"/>
                      </a>) : (<span className="flex size-12 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground">video</span>)}
                    <span>
                      <span className="font-mono font-medium">{r.tag}</span>{" "}
                      {r.file ? (<a href={assetUrl(`${pack.dir}/${r.file}`)} download className="text-primary hover:underline">
                          {r.file.split("/").pop()}
                        </a>) : (<span className="text-muted-foreground">your previous clip</span>)}
                      <span className="block text-muted-foreground">{r.purpose}</span>
                    </span>
                  </li>))}
              </ol>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap" data-testid="handoff-prompt">
                {c.prompt}
              </pre>
            </div>))}
        </div>)}
    </section>);
}
