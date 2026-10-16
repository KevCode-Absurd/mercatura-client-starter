"use client";
import { useEffect, useTransition } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({ error, retry }: {
    error: Error & {
        digest?: string;
    };
    retry: () => void;
}) {
    const [pending, start] = useTransition();
    useEffect(() => { console.error(error); }, [error]);
    return <div className="mx-auto max-w-2xl px-6 py-16">
    <div className="rounded-2xl border bg-card p-8 shadow-sm" role="alert">
      <h1 className="font-serif text-3xl">This screen could not be loaded</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">Try opening it again. If the problem continues, return home and open another workspace.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Button disabled={pending} onClick={() => start(() => retry())}><RefreshCw className={pending ? "motion-safe:animate-spin" : ""}/>{pending ? "Trying again…" : "Try again"}</Button><Button asChild variant="outline"><Link href="/">Return home</Link></Button></div>
      {error.digest && <p className="mt-6 break-all text-xs text-muted-foreground">Error reference: {error.digest}</p>}
    </div>
  </div>;
}
