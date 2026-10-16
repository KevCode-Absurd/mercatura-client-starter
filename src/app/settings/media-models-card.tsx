"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ImageQuality, MediaModelChoices } from "@/lib/media/chosen";
import { saveMediaModelAction } from "./media-actions";
const QUALITIES: {
    id: ImageQuality;
    label: string;
}[] = [
    { id: "high", label: "Final (about 8 cents a picture)" },
    { id: "medium", label: "Draft (about 3 cents a picture)" },
];
export function MediaModelsCard({ image, video, quality = "high" }: {
    image: MediaModelChoices;
    video: MediaModelChoices;
    quality?: ImageQuality;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const save = (kind: "image" | "video" | "quality", id: string) => start(async () => {
        const res = await saveMediaModelAction({ kind, id });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(`Saved. It applies from the next ${kind === "video" ? "clip" : "picture"}.`);
        router.refresh();
    });
    const qualityField = (<div className="space-y-1.5 text-sm">
      <div className="font-medium">Picture quality</div>
      <Select value={quality} onValueChange={(v) => save("quality", v)} disabled={pending}>
        <SelectTrigger className="w-full" data-testid="media-quality"><SelectValue>{QUALITIES.find((q) => q.id === quality)?.label ?? quality}</SelectValue></SelectTrigger>
        <SelectContent>{QUALITIES.map((q) => <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>)}</SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Draft pictures are made at a lower quality setting; a kept ad can be made again at Final.</p>
    </div>);
    const field = (kind: "image" | "video", label: string, c: MediaModelChoices) => {
        const now = c.options.find((o) => o.id === c.now);
        return (<div className="space-y-1.5 text-sm">
        <div className="font-medium">{label}</div>
        <Select value={c.now} onValueChange={(v) => save(kind, v)} disabled={pending}>
          <SelectTrigger className="w-full" data-testid={`media-model-${kind}`}>

            <SelectValue>{`${now?.name ?? c.now}${c.now === c.start ? " (default)" : ""}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {c.options.map((o) => (<SelectItem key={o.id} value={o.id}>
                {o.name}
                {o.id === c.start ? " (default)" : ""} · {o.price}
                {o.note ? " · not connected yet" : ""}
              </SelectItem>))}
          </SelectContent>
        </Select>
        {now?.note && (<p className="text-xs text-amber-700" data-testid={`media-model-${kind}-note`}>
            {now.note}
          </p>)}
        {now && <p className="text-xs text-muted-foreground">{now.takes}</p>}
      </div>);
    };
    return (<Card data-testid="media-models-card" id="media-models">
      <CardHeader>
        <CardTitle className="text-base">Image model and video model</CardTitle>
        <CardDescription className="max-w-3xl">The model that makes the pictures and the model that makes the video clips. Choose another to switch: the change applies from the next picture or clip, for every brand. A new model shows up in these lists when it is added to the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          {field("image", "Image model", image)}
          {qualityField}
          {field("video", "Video model", video)}
        </div>
      </CardContent>
    </Card>);
}
