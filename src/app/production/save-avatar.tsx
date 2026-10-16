"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductionState } from "@/db/schema";
import { saveCharacterAvatarAction } from "./actions";
export function SaveAvatar({ jobId, p, locked }: {
    jobId: string;
    p: ProductionState;
    locked: boolean;
}) {
    const label = p.video_plan?.cast_options?.[p.video_plan.cast_choice ?? 0]?.label ?? "";
    const [name, setName] = useState(/^Option \d+$/.test(label) ? "" : label);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [pending, start] = useTransition();
    const save = () => start(async () => {
        setError("");
        const res = await saveCharacterAvatarAction(jobId, name);
        if (res.ok)
            setSaved(true);
        else
            setError(res.error);
    });
    if (saved) {
        return (<p className="rounded-md border p-3 text-xs" data-testid="avatar-saved">
        Saved. Edit its voice on the{" "}
        <Link href="/personas" className="text-primary hover:underline">
          persona sheet
        </Link>
        .
      </p>);
    }
    return (<section className="space-y-2 rounded-md border p-3" data-testid="save-avatar">
      <div>
        <h3 className="text-sm font-medium">Save this character as an avatar</h3>
        <p className="text-xs text-muted-foreground">Keep this face for the next videos. It is saved on the persona sheet with its pictures, and you choose its voice there.</p>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor={`save-avatar-${jobId}`} className="text-xs font-medium">
            Name
          </Label>
          <Input id={`save-avatar-${jobId}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Maya, the night nurse" data-testid="save-avatar-name"/>
        </div>
        <Button size="sm" variant="outline" disabled={locked || pending || name.trim().length < 2} title={name.trim().length < 2 ? "Give it a name first." : undefined} onClick={save} data-testid="save-avatar-submit">
          {pending ? <Loader2 className="size-3.5 animate-spin"/> : <UserPlus className="size-3.5"/>}
          Save as an avatar
        </Button>
      </div>
      {error && (<p className="text-xs text-red-700" data-testid="save-avatar-error">
          {error}
        </p>)}
    </section>);
}
