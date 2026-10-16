"use client";
import { useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buildVoiceCardAction, saveVoiceCardAction } from "./actions";
export function VoiceCardPanel({ card, live }: {
    card: {
        sound: string[];
        examples: string[];
        by: "written" | "rules";
    };
    live: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [sound, setSound] = useState(card.sound.join("\n"));
    const [examples, setExamples] = useState(card.examples.join("\n"));
    const [pending, start] = useTransition();
    const dirty = sound !== card.sound.join("\n") || examples !== card.examples.join("\n");
    useUnsavedWarning(dirty);
    const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
    const build = () => start(async () => {
        const res = await buildVoiceCardAction();
        if (!res.ok)
            return void toast.error(res.error);
        setSound(res.card.sound.join("\n"));
        setExamples(res.card.examples.join("\n"));
        toast.success(`Style card written from ${res.sources.join(", ") || "the brand's voice notes"}.`);
        router.refresh();
    });
    const save = () => start(async () => {
        const res = await saveVoiceCardAction({ sound: lines(sound), examples: lines(examples) });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Style card saved. Everything written from now on is given it.");
        router.refresh();
    });
    return (<Card className="lg:col-span-2" data-testid="voice-card">
      <CardHeader>
        <CardTitle className="text-base">How the brand sounds (style card)</CardTitle>
        <CardDescription>
          A few lines on how the brand writes, and lines it has published itself. Every step that writes a word a customer reads is given this card: ads, headlines, scripts, product page images, offers and personas.
          {card.by === "rules" && " None is saved yet: the one below is made from the voice notes, until you write or edit one."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-medium">How it sounds (1 a line, 3 to 5 lines)</span>
          <Textarea value={sound} onChange={(e) => setSound(e.target.value)} className="min-h-40 text-sm" data-testid="voice-card-sound"/>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Lines the brand has published (1 a line)</span>
          <Textarea value={examples} onChange={(e) => setExamples(e.target.value)} className="min-h-40 text-sm" data-testid="voice-card-examples"/>
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <Button size="sm" onClick={save} disabled={pending || !dirty || !lines(sound).length} data-testid="voice-card-save">
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={build} disabled={pending || !live} data-testid="voice-card-build">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
            Write it from the site and the ads{advanced && live ? " (a few cents)" : ""}
          </Button>
          {!live && <span className="text-xs text-muted-foreground">Not switched on for this account. You can still write it by hand.</span>}
        </div>
      </CardContent>
    </Card>);
}
