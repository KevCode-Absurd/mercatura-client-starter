"use client";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductionState } from "@/db/schema";
import { TasteBar } from "@/components/taste-bar";
import { jobOptionsAction, setCaptionsAction, setJobTasteAction, setProductAction, setVideoAudioAction } from "./actions";
import { AudioSettings } from "./audio-settings";
type ActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
type Act = (fn: () => Promise<ActionResult>, done?: string, after?: () => void) => void;
export function VideoSettings({ jobId, p, video, locked, act }: {
    jobId: string;
    p: ProductionState;
    video: boolean;
    locked: boolean;
    act: Act;
}) {
    const [products, setProducts] = useState<{
        id: string;
        name: string;
    }[]>([]);
    useEffect(() => {
        if (!video)
            return;
        let stop = false;
        void jobOptionsAction(jobId).then((r) => !stop && r.ok && setProducts(r.products));
        return () => {
            stop = true;
        };
    }, [jobId, video]);
    const clipsMade = p.clips.some((c) => c.status !== "pending");
    const canAudio = video && !clipsMade && !p.joined && !["finish", "motion", "done"].includes(p.next);
    const canCaptions = video ? !p.joined && !["motion", "done"].includes(p.next) : true;
    const canProduct = video && !p.storyboard && !clipsMade && !["clips", "finish", "motion", "done"].includes(p.next);
    const on = !!p.burn_captions;
    const planWritten = p.plan_status !== "none";
    const canTaste = video && canProduct;
    if (!video && !canCaptions)
        return null;
    return (<section className="space-y-3 rounded-md border p-3 text-xs" data-testid="job-settings">
      {video && <AudioSettings id="job" value={p.video_audio} disabled={locked || !canAudio} onChange={(audio) => act(() => setVideoAudioAction(jobId, audio), "Audio settings saved")}/>}
      {video && !canAudio && <p className="text-muted-foreground">Audio choices are fixed once clips start. Use a new job to change sound or music.</p>}
      {canCaptions && (<label className="flex items-start gap-2" data-testid="job-captions">
          <Checkbox checked={on} disabled={locked} onCheckedChange={(v) => act(() => setCaptionsAction(jobId, v === true), v === true ? "Captions on" : "Captions off")} className="mt-0.5" data-testid="job-captions-switch"/>
          <span>
            {video ? "Draw the on-screen text into the video" : "Tell whoever films this to add captions"}
            <span className="block text-muted-foreground">
              {on
                ? video
                    ? "On: the plan's on-screen text is drawn in when the clips are joined."
                    : "On: under Delivery, the brief asks for captions on the whole ad, added by whoever films it."
                : video
                    ? "Off: the video is delivered clean, so captions can be added where the ad is edited or run."
                    : "Off: under Delivery, the brief asks for a clean video with nothing written on it, so captions are added in the edit. The words for the screen stay in the script either way."}
            </span>
          </span>
        </label>)}
      {canTaste && (<div className="space-y-1" data-testid="job-taste-row">
          <TasteBar id="job-taste" surface="shot_plan" value={{ product: "clear", ...(p.taste ?? {}) }} onChange={(t) => !locked && act(() => setJobTasteAction(jobId, t), "Saved")}/>
          <p className="text-muted-foreground">{planWritten ? "Used by what is made from now on: the storyboard and the cast pictures. Write the plan again for the plan itself to follow them." : "Used when the plan is written, and by the storyboard and the cast pictures after it."}</p>
        </div>)}
      {canProduct && products.length > 1 && (<div className="space-y-1" data-testid="job-product">
          <span className="font-medium">Product</span>
          <Select value={p.product_id ?? ""} disabled={locked} onValueChange={(v) => v !== p.product_id && act(() => setProductAction(jobId, v), planWritten ? "Product changed. The plan is being written again for it." : "Product changed")}>
            <SelectTrigger className="w-full sm:w-80" data-testid="job-product-select">
              <SelectValue placeholder="Choose a product"/>
            </SelectTrigger>
            <SelectContent>
              {products.map((x) => (<SelectItem key={x.id} value={x.id}>
                  {x.name}
                </SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground">
            {planWritten ? "Changing it writes the plan again for the new product, and the look frame is made again after it. The character sheet is kept." : "The product whose photos and facts the plan and the pictures are made from."} It can be changed until the storyboard is drawn.
          </p>
        </div>)}
    </section>);
}
