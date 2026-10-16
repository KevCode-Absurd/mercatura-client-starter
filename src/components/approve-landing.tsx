"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ApproveLanding({ adId, size = "sm", className }: {
    adId: string;
    size?: "sm" | "default";
    className?: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<Button size={size} variant="outline" className={className} disabled={pending} title="Build a landing page that continues this ad: its words, its buyer, its offer" data-testid="approve-landing" onClick={() => start(() => router.push(`/landing/studio?ad=${encodeURIComponent(adId)}`))}>
      {pending ? <Loader2 className="size-4 animate-spin"/> : <LayoutTemplate className="size-4"/>}
      Approve for a landing page
    </Button>);
}
