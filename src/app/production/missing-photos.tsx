"use client";
import { useRef, useState } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProductionState } from "@/db/schema";
import { partFlag, partsWithoutPhoto } from "@/lib/production/prompts";
export function MissingPhotos({ jobId, p, locked }: {
    jobId: string;
    p: ProductionState;
    locked: boolean;
}) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [part, setPart] = useState("");
    const [busy, setBusy] = useState(false);
    const plan = p.video_plan;
    const names = plan ? partsWithoutPhoto(plan) : [];
    const drawn = !!p.storyboard || p.clips.some((c) => c.status !== "pending") || ["clips", "finish", "motion", "done"].includes(p.next);
    if (!names.length || drawn)
        return null;
    const upload = async (file: File) => {
        setBusy(true);
        try {
            const form = new FormData();
            form.set("job", jobId);
            form.set("part", part);
            form.set("file", file);
            const res = await fetch("/production/part-photo", { method: "POST", body: form });
            const out = (await res.json()) as {
                ok: boolean;
                error?: string;
                lookIsOlder?: boolean;
            };
            if (!out.ok)
                toast.error(out.error ?? "The photo could not be saved.");
            else
                toast.success(out.lookIsOlder ? "Photo saved. The look frame was made without it: make it again to use the photo there too." : "Photo saved. The pictures are drawn from it.");
            router.refresh();
        }
        catch {
            toast.error("The photo could not be sent. Try again.");
        }
        finally {
            setBusy(false);
            if (input.current)
                input.current.value = "";
        }
    };
    return (<section className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" data-testid="missing-photos">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} data-testid="missing-photo-input"/>
      {names.map((name) => (<div key={name} className="flex flex-wrap items-start gap-2" data-testid="missing-photo">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          <p className="min-w-0 flex-1 break-words">{partFlag(name)}</p>
          <Button size="sm" variant="outline" disabled={locked || busy || !p.product_id} onClick={() => {
                setPart(name);
                input.current?.click();
            }} data-testid="missing-photo-upload">
            <Upload className="size-3.5"/>
            Upload a photo
          </Button>
        </div>))}
      <p>
        {p.product_id ? "The photo is kept with the product's other photos and used in every later job. " : "This job is not about 1 product, so a photo can't be kept for it here. "}
        You can go on without one: {names.length === 1 ? "it is" : "they are"} then drawn plain, with no small print.
      </p>
    </section>);
}
