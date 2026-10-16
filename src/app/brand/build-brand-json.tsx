"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import { convertBrandBrainAction } from "./actions";
export function BuildBrandJson({ disabled, reason, rebuild }: {
    disabled?: boolean;
    reason?: string | null;
    rebuild?: boolean;
}) {
    const [pending, start] = useTransition();
    const router = useRouter();
    const advanced = useAdvanced();
    const run = () => {
        if (rebuild && !confirm(advanced ? "Rebuild brand.json from the markdown files? The current file is kept as brand.json.bak." : "Rebuild the brand brain from the brand's documents? The current one is kept as a backup."))
            return;
        start(async () => {
            const res = await convertBrandBrainAction();
            if (res.ok) {
                toast.success(advanced ? "brand.json built from the brand-brain files. Check the claims before using it." : "The brand brain is rebuilt. Check the claims before using it.");
                router.refresh();
            }
            else
                toast.error(res.error);
        });
    };
    return (<span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <Button size="sm" variant={rebuild ? "outline" : "default"} onClick={run} disabled={disabled || pending}>
        <Sparkles className="size-4"/>
        {!advanced ? (pending ? "Building..." : rebuild ? "Rebuild" : "Build the brand brain") : pending ? "Building with Claude..." : rebuild ? "Rebuild from files" : "Build brand.json with Claude"}
      </Button>
      {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
    </span>);
}
