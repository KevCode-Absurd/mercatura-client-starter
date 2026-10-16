"use client";
import { useState, useTransition } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { pageFeedbackAction } from "../../actions";
export function PageFeedback({ pageId, voice }: {
    pageId: string;
    voice: boolean;
}) {
    const [text, setText] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [pending, start] = useTransition();
    const send = () => start(async () => {
        const res = await pageFeedbackAction(pageId, { text, via });
        if (!res.ok)
            return void toast.error(res.error);
        setText("");
        setVia("typed");
        toast.success(res.proposed ? "Noted. It holds something true of any page, so a change to the method is waiting for an admin on Skills." : res.status === "logged" ? "Noted. The rule drawn from it waits on the Lessons screen for an admin's yes." : res.learned ? "Noted, and kept as a rule for this brand's pages." : "Noted. Kept with this page.");
    });
    return (<div className="mb-3 rounded-md border border-input p-3" data-testid="page-feedback">
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
        <MessageSquarePlus className="size-4"/> What should the app get right next time?
      </div>
      <Textarea rows={2} value={text} onChange={(e) => (setText(e.target.value), setVia("typed"))} placeholder="In your own words: the guarantee should come before the price; never a price per day for a one-off buy." data-testid="page-feedback-text"/>
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={send} disabled={pending || text.trim().length < 4} data-testid="page-feedback-send">
          {pending ? <Loader2 className="size-3.5 animate-spin"/> : null} Tell the app
        </Button>
        {voice && <VoiceNote onText={(t) => (setText((was) => (was ? `${was} ${t}` : t)), setVia("voice"))} disabled={pending} testId="page-feedback-voice"/>}
        <span className="text-xs text-muted-foreground">Brand feedback is saved immediately. Changes to how the app writes need admin approval.</span>
      </div>
    </div>);
}
