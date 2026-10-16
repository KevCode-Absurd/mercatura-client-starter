"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function ClipUpload({ jobId, index, has, locked }: {
    jobId: string;
    index: number;
    has: boolean;
    locked: boolean;
}) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const upload = async (file: File) => {
        setBusy(true);
        try {
            const form = new FormData();
            form.set("job", jobId);
            form.set("clip", String(index));
            form.set("file", file);
            const res = await fetch("/production/clip-upload", { method: "POST", body: form });
            const out = (await res.json()) as {
                ok: boolean;
                error?: string;
                missing?: number;
            };
            if (!out.ok)
                toast.error(out.error ?? "The clip could not be saved.");
            else
                toast.success(out.missing ? `Clip ${index + 1} added. ${out.missing} more to go.` : "Every clip is in. The video is ready to be joined.");
            router.refresh();
        }
        catch {
            toast.error("The clip could not be sent. Try again.");
        }
        finally {
            setBusy(false);
            if (input.current)
                input.current.value = "";
        }
    };
    return (<>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} data-testid="clip-upload-input"/>
      <Button size="sm" variant="outline" disabled={locked || busy} onClick={() => input.current?.click()} data-testid="clip-upload">
        <Upload className="size-3.5"/>
        {busy ? "Adding the clip" : has ? "Use another file" : "Add the clip you made"}
      </Button>
    </>);
}
