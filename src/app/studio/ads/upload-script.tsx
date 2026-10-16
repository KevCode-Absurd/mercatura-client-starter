"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
const AUTO = "__auto";
export function UploadScript({ concepts, live, children, onAdded }: {
    concepts: {
        id: string;
        name: string;
    }[];
    live: boolean;
    children: React.ReactNode;
    onAdded?: (id: string) => void;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState("");
    const [concept, setConcept] = useState(AUTO);
    const [busy, setBusy] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const submit = async () => {
        setBusy(true);
        try {
            const form = new FormData();
            if (file)
                form.set("file", file);
            else
                form.set("text", text);
            if (concept !== AUTO)
                form.set("conceptId", concept);
            const res = await fetch("/api/scripts/upload", { method: "POST", body: form });
            const out = (await res.json()) as {
                ok: true;
                id: string;
            } | {
                ok: false;
                error: string;
            };
            if (!out.ok) {
                toast.error(out.error);
                return;
            }
            toast.success("Script added. Check it, then make assets from it.");
            setOpen(false);
            if (onAdded)
                onAdded(out.id);
            else
                router.push(`/scripts/${out.id}`);
        }
        catch {
            toast.error("The upload didn't go through. Check the connection and try again.");
        }
        finally {
            setBusy(false);
        }
    };
    const ready = !!file || text.replace(/\s/g, "").length >= 40;
    return (<Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl" data-testid="upload-script">
        <DialogHeader>
          <DialogTitle>Upload your own script</DialogTitle>
          <DialogDescription>Your words are kept exactly as they are. The app sorts them into lines, runs the claims and voice checks as a report, and you can then make ads from it in any format.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <input ref={input} type="file" accept=".docx,.pdf,.txt,.md" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="upload-file"/>
            <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-left hover:border-primary hover:bg-primary/5">
              <FileUp className="size-5 shrink-0 text-muted-foreground"/>
              <span>
                <span className="block font-medium">{file ? file.name : "Choose a file"}</span>
                <span className="block text-xs text-muted-foreground">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB. Click to choose another.` : `Word (.docx), PDF or text.${live ? "" : " PDF is not switched on for this account."}`}</span>
              </span>
            </button>
          </div>
          {!file && (<div>
              <div className="mb-1 text-xs text-muted-foreground">Or paste the script</div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="max-h-56 min-h-28" placeholder="Paste the full script here" data-testid="upload-text"/>
            </div>)}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">File it under</div>
            <Select value={concept} onValueChange={setConcept}>
              <SelectTrigger className="w-full" data-testid="upload-concept">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Your own scripts (no concept)</SelectItem>
                {concepts.map((c) => (<SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">Picking a concept tells production who the ad is for and which offer it sells.</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!ready || busy} data-testid="upload-submit">
            {busy && <Loader2 className="size-4 animate-spin"/>}
            {busy ? "Reading the script" : "Add the script"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
