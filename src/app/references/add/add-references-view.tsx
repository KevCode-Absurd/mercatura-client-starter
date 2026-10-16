"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddReferenceDialog } from "../add-reference";
export function AddReferencesView({ analysisEnabled }: {
    analysisEnabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    return (<div className="p-6">
      <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
        <Upload className="mx-auto mb-4 size-7 text-muted-foreground"/>
        <h2 className="display text-2xl">A place for your inspiration</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Add reference ads to use when building creative. For a portrait scene or photo to use with an avatar, open Avatar references and choose an avatar.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => setOpen(true)}><Upload /> Add images or videos</Button>
          <Button variant="outline" asChild><Link href="/references/avatars">Avatar references</Link></Button>
        </div>
      </div>
      {open && <AddReferenceDialog analysisEnabled={analysisEnabled} onClose={() => setOpen(false)} onOpenReference={() => router.push("/references")}/>}
    </div>);
}
