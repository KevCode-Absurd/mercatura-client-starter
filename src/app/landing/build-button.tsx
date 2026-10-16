"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PageKind } from "@/lib/landing/types";
import { createPageAction } from "./actions";
export function BuildButton({ adId, personaId, kind, label = "Build its page", size = "sm", variant = "default", testid }: {
    adId?: string;
    personaId?: string;
    kind?: PageKind;
    label?: string;
    size?: "sm" | "default";
    variant?: "default" | "outline";
    testid?: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<Button size={size} variant={variant} disabled={pending} data-testid={testid} onClick={() => start(async () => {
            const res = await createPageAction(adId ? { from: "ad", adId, kind } : { from: "persona", personaId, kind });
            if (!res.ok)
                return void toast.error(res.error);
            toast.success("Page drafted from the brand's own facts.");
            router.push(`/landing/pages/${res.id}`);
        })}>
      {pending ? <Loader2 className="size-4 animate-spin"/> : <Wand2 className="size-4"/>}
      {label}
    </Button>);
}
