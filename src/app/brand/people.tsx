"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PERSON_ROLES, ROLE_LABEL, type BrandPerson, type PersonRole } from "@/lib/people-types";
import { removePersonAction, setPersonConsentAction } from "./actions";
const stillUrl = (file: string, w = 240) => `/api/brand-file/people/${encodeURIComponent(file)}?w=${w}`;
export function PeopleCard({ people }: {
    people: BrandPerson[];
}) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [name, setName] = useState("");
    const [role, setRole] = useState<PersonRole>("founder");
    const [note, setNote] = useState("");
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pending, start] = useTransition();
    const upload = async (file: File) => {
        if (!name.trim())
            return void toast.error("Say who this is first.");
        setBusy(true);
        try {
            const form = new FormData();
            form.set("file", file);
            form.set("name", name);
            form.set("role", role);
            form.set("note", note);
            form.set("consent", consent ? "yes" : "no");
            const res = await fetch("/api/brand/people", { method: "POST", body: form });
            const data = (await res.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!data.ok)
                return void toast.error(data.error ?? "The upload failed.");
            toast.success(`${name} added.`);
            setName("");
            setNote("");
            setConsent(false);
            router.refresh();
        }
        finally {
            setBusy(false);
            if (input.current)
                input.current.value = "";
        }
    };
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done: string) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(done);
        router.refresh();
    });
    return (<Card className="lg:col-span-2" id="people" data-testid="people">
      <CardHeader>
        <CardTitle className="text-base">Real people: the founder, customers, experts</CardTitle>
        <CardDescription>
          A generated face is never shown as the founder, a customer or an expert. Upload a photo or a video of the real person and a founder or testimonial ad can show them. Without one, those ads carry the person&apos;s words as text. They are used only for this brand&apos;s ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {people.length > 0 && (<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="people-list">
            {people.map((p) => (<li key={p.id} className="flex gap-3 rounded-md border p-2" data-testid="person">

                <img src={stillUrl(p.still)} alt={p.name} className="size-20 shrink-0 rounded object-cover"/>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    {p.name}
                    {p.kind === "video" && <Video className="size-3.5 text-muted-foreground" aria-label="Video"/>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[p.role]}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                  <label className="mt-1 flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={p.consent} disabled={pending} onChange={(e) => act(() => setPersonConsentAction(p.id, e.target.checked), e.target.checked ? "Ads may show them now." : "Ads will not show them.")}/>
                    Agreed to be in ads
                  </label>
                </div>
                <Button size="icon" variant="ghost" className="size-7 shrink-0" disabled={pending} onClick={() => act(() => removePersonAction(p.id), "Removed.")} aria-label={`Remove ${p.name}`}>
                  <Trash2 className="size-3.5"/>
                </Button>
              </li>))}
          </ul>)}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8 w-44" aria-label="Person's name" data-testid="person-name"/>
          <select value={role} onChange={(e) => setRole(e.target.value as PersonRole)} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Role">
            {PERSON_ROLES.map((r) => (<option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>))}
          </select>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Title, as an ad may state it (optional)" className="h-8 w-72" aria-label="Title"/>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="person-consent"/>
            They agreed to be in ads
          </label>
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} data-testid="person-file"/>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()} data-testid="person-upload">
            {busy ? <Loader2 className="size-4 animate-spin"/> : <Upload className="size-4"/>}
            {busy ? "Uploading" : "Upload a photo or video"}
          </Button>
        </div>
      </CardContent>
    </Card>);
}
