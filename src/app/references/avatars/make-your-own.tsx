"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { drawAvatarAction, personasStatusAction } from "@/app/personas/actions";
import { AvatarsSection } from "@/app/personas/avatars";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Avatar } from "@/lib/avatars/types";
import type { ListedVoice } from "@/lib/avatars/voices";
import type { PersonaProfile } from "@/lib/personas/types";
import { pollWhileVisible } from "@/lib/visible-polling";
interface Props {
    personas: Pick<PersonaProfile, "id" | "name" | "who" | "look">[];
    avatars: Avatar[];
    voices: ListedVoice[];
    looks: {
        id: string;
        label: string;
    }[];
    live: boolean;
}
export function MakeYourOwn({ personas, avatars: initial, voices, looks, live }: Props) {
    const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
    const [avatars, setAvatars] = useState(initial);
    const [busy, setBusy] = useState(false);
    const refresh = useCallback(async () => {
        const res = await personasStatusAction();
        if (res.ok) {
            setAvatars(res.avatars);
            setBusy(res.busy);
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    useEffect(() => {
        if (!busy)
            return;
        return pollWhileVisible(refresh, 4000);
    }, [busy, refresh]);
    const draw = async (id: string) => {
        const res = await drawAvatarAction(id);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Drawing. About half a minute.");
        await refresh();
    };
    const persona = personas.find((p) => p.id === personaId);
    if (!persona)
        return (<div className="rounded-xl border bg-card px-6 py-12 text-center" data-testid="make-your-own">
        <h2 className="display text-2xl">Make your own avatar</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">An avatar you make is kept with one of your personas, the buyer whose videos it appears in. Add a persona first, then come back.</p>
        <Link href="/personas" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Go to Personas
        </Link>
      </div>);
    return (<div className="space-y-4" data-testid="make-your-own">
      <div>
        <h2 className="display text-2xl">Make your own avatar</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Describe a person or a character and it is drawn for you, or upload a character your team made before. It is kept with the persona you pick, and every video for that buyer can use it.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="own-avatar-persona" className="text-xs">
          Who is it for?
        </Label>
        <Select value={personaId} onValueChange={setPersonaId}>
          <SelectTrigger id="own-avatar-persona" className="h-9 w-full max-w-sm rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <AvatarsSection key={persona.id} persona={persona} avatars={avatars.filter((a) => a.persona_id === persona.id)} voices={voices} looks={looks} live={live} busy={busy} onChanged={refresh} onDraw={(id) => void draw(id)}/>
    </div>);
}
