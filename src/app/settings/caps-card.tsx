"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SpendCaps } from "@/lib/spend-caps";
import { saveCapsAction } from "./caps-actions";
export function CapsCard({ caps, used, ceiling }: {
    caps: SpendCaps;
    used: SpendCaps;
    ceiling: number;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const [text, setText] = useState(String(caps.textUsd));
    const [video, setVideo] = useState(String(caps.videoUsd));
    const [images, setImages] = useState(String(caps.images));
    const next = { textUsd: Number(text), videoUsd: Number(video), images: Number(images) };
    const dirty = next.textUsd !== caps.textUsd || next.videoUsd !== caps.videoUsd || next.images !== caps.images;
    const bad = [text, video, images].some((v) => v.trim() === "" || !Number.isFinite(Number(v)) || Number(v) < 0);
    const under = [next.textUsd < used.textUsd ? "text" : "", next.videoUsd < used.videoUsd ? "video" : "", next.images < used.images ? "images" : ""].filter(Boolean);
    const save = () => begin(async () => {
        const res = await saveCapsAction(next);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Caps saved. They apply from the next step that runs.");
        router.refresh();
    });
    const field = (label: string, unit: string, value: string, set: (v: string) => void, usedText: string, testid: string, step: string) => (<label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        {unit === "$" && <span className="text-muted-foreground">$</span>}
        <Input type="number" min={0} step={step} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="h-10 w-32 text-base tabular-nums" data-testid={testid}/>
        {unit !== "$" && <span className="text-muted-foreground">{unit}</span>}
      </span>
      <span className="block text-xs text-muted-foreground">{usedText}</span>
    </label>);
    return (<Card data-testid="caps-card" id="caps">
      <CardHeader>
        <CardTitle className="text-lg">Spend caps</CardTitle>
        <CardDescription>The most this installation may spend, across every brand, since it was set up. A step that would go over a cap is stopped before it is paid for. Raise a cap when you reach it; lower one to hold spending.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-6 sm:grid-cols-3">
          {field("Text (writing and checks)", "$", text, setText, `$${used.textUsd.toFixed(2)} used so far. The limit for this installation is $${ceiling}.`, "cap-text", "1")}
          {field("Video", "$", video, setVideo, `$${used.videoUsd.toFixed(2)} used so far.`, "cap-video", "1")}
          {field("Images", "images", images, setImages, `${used.images} made so far.`, "cap-images", "10")}
        </div>
        {under.length > 0 && !bad && (<p className="text-xs text-amber-700" data-testid="caps-under">
            The {under.join(" and ")} cap would be under what is already used: every step that uses it stops until it is raised.
          </p>)}
        <Button onClick={save} disabled={pending || !dirty || bad} data-testid="caps-save">
          Save caps
        </Button>
      </CardContent>
    </Card>);
}
