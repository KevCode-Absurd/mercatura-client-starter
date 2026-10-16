"use client";
import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scriptText, type ScriptForExport } from "@/lib/scripts/export";
const FORMATS: [
    string,
    string
][] = [
    ["pdf", "PDF"],
    ["doc", "Word"],
    ["txt", "Text"],
];
export function ScriptExport({ script, unsaved }: {
    script: ScriptForExport;
    unsaved?: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(scriptText(script));
            setCopied(true);
            toast.success("Script copied.");
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            toast.error("Copying is blocked in this browser. Download it as text instead.");
        }
    };
    return (<span className="inline-flex items-center gap-1" data-testid="script-export">
      <Button size="sm" variant="outline" onClick={copy} data-testid="copy-script" title="Copy the spoken words">
        {copied ? <Check className="size-4"/> : <Copy className="size-4"/>}
        Copy
      </Button>
      <span className="inline-flex h-8 items-center overflow-hidden rounded-md border text-sm" title={unsaved ? "Downloads the saved version. Save your edits first." : "Download the whole script"}>
        <span className="flex items-center gap-1 pl-2.5 pr-1 text-muted-foreground">
          <Download className="size-3.5"/>
        </span>
        {FORMATS.map(([f, label]) => (<a key={f} href={`/api/scripts/${script.id}/export?format=${f}`} download className="flex h-full items-center border-l px-2.5 font-medium hover:bg-muted" data-testid={`download-script-${f}`}>
            {label}
          </a>))}
      </span>
    </span>);
}
