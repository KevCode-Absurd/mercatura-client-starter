"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { scriptPreviewAction } from "@/app/scripts/preview-actions";
export function ScriptPreview({ id, hookId }: {
    id: string;
    hookId?: string;
}) {
    const [data, setData] = useState<Awaited<ReturnType<typeof scriptPreviewAction>>>();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let stopped = false;
        setData(undefined);
        setFailed(false);
        scriptPreviewAction(id, hookId).then((result) => { if (!stopped)
            setData(result); }).catch(() => { if (!stopped)
            setFailed(true); });
        return () => { stopped = true; };
    }, [id, hookId]);
    return <div className="space-y-2">
    <div className="max-h-64 space-y-2 overflow-y-auto rounded border p-3 text-sm" data-testid="creator-script-preview" aria-busy={data === undefined && !failed}>
      {data ? data.lines.map((line, i) => <p key={i}>{line.text}</p>) : <p className="text-muted-foreground">{failed || data === null ? "Could not load this script. Open it to review." : "Loading script…"}</p>}
    </div>
    {data?.audit.filter((check) => check.status === "fail").map((check, i) => <p key={i} className="text-xs text-amber-800">Review: {check.message}</p>)}
    <Link href={`/scripts/${id}`} className="inline-flex min-h-11 items-center text-sm text-primary">Edit this script and its hooks</Link>
  </div>;
}
