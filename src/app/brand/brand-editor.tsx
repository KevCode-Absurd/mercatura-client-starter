"use client";
import { useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { saveBrandBrainAction } from "./actions";
export function BrandEditor({ initial }: {
    initial: string;
}) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const router = useRouter();
    useUnsavedWarning(open && text !== initial);
    const save = () => start(async () => {
        const res = await saveBrandBrainAction(text);
        if (res.ok) {
            setError(null);
            setOpen(false);
            toast.success("Brand details saved. A backup of the previous version is available.");
            router.refresh();
        }
        else
            setError(res.error);
    });
    return (<Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o)
        setText(initial); }}>
      <SheetTrigger asChild>
        <Button size="sm">Edit</Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-3 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit brand data</SheetTitle>
          <SheetDescription>Edit the brand data as JSON. Required fields are checked before saving.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          <Textarea className="min-h-0 flex-1 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label="brand.json"/>
          {error && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-700">{error}</pre>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>);
}
