"use client";
import { useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScriptKit } from "@/lib/builder/types";
import { saveKitTextAction } from "@/app/builder/actions";
type Text = {
    primary_text: string;
    headline: string;
};
const textsOf = (kit: ScriptKit): Text[] => [{ primary_text: kit.primary_text ?? "", headline: kit.headline ?? "" }, ...(kit.more_texts ?? [])];
const copy = (s: string, what: string) => navigator.clipboard.writeText(s).then(() => toast.success(`${what} copied.`), () => toast.error("Could not copy. Select the text instead."));
function CopyIt({ text, what }: {
    text: string;
    what: string;
}) {
    return (<button type="button" onClick={() => copy(text, what)} disabled={!text} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label={`Copy the ${what.toLowerCase()}`}>
      <Copy className="size-3.5"/>
      Copy
    </button>);
}
export function KitPanel({ scriptId, kit, part }: {
    scriptId: string;
    kit: ScriptKit;
    part?: "text" | "prompts";
}) {
    const [texts, setTexts] = useState<Text[]>(() => textsOf(kit));
    const [busy, start] = useTransition();
    const changed = JSON.stringify(texts) !== JSON.stringify(textsOf(kit));
    const edit = (i: number, patch: Partial<Text>) => setTexts((all) => all.map((t, j) => (j === i ? { ...t, ...patch } : t)));
    const hasText = kit.want.primary_text && !!(kit.primary_text || kit.headline);
    const want = kit.want.words ?? "without";
    const made = (kit.image_prompts ?? []).flatMap((p) => [want !== "with" || !p.words ? { file: p.file, label: p.title } : null, want !== "without" && p.words ? { file: p.words_file, label: `${p.title}, with words` } : null]).filter((x): x is {
        file: string;
        label: string;
    } => !!x?.file);
    const showText = part !== "prompts" && (hasText || !!kit.error || !!kit.asked);
    const showPrompts = part !== "text" && !!kit.image_prompts?.length;
    if (!showText && !showPrompts)
        return null;
    const many = texts.length > 1;
    return (<section className={part === "text" ? "mx-6 mt-4 space-y-3 rounded-xl border border-rule bg-card p-5" : "mx-6 mb-6 space-y-4 rounded-xl border border-rule bg-card p-5"} data-testid={part === "prompts" ? "script-kit-prompts" : "script-kit"}>
      {showText && (<>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Headline and primary text</h2>
              <p className="text-xs text-muted-foreground">
                The words that run with this script in the feed. Change them here; the script itself is below.
                {kit.run ? ` Written in the Script builder for ${[kit.product, kit.angle, kit.offer, kit.format].filter(Boolean).join(" · ")}.` : ""}
              </p>
              {kit.asked && <p className="mt-1 text-xs text-muted-foreground">Your note to the writer: {kit.asked}</p>}
            </div>
            {hasText && !many && (<Button size="sm" variant="outline" onClick={() => copy(`${texts[0].headline}\n\n${texts[0].primary_text}`, "Headline and primary text")}>
                <Copy className="size-4"/>
                Copy both
              </Button>)}
          </div>
          {kit.error && <p className="text-sm text-amber-800">A part that goes with this script was not made. Write the script again from the Script builder to get it.</p>}
          {hasText &&
                texts.map((t, i) => (<div key={i} className="space-y-2" data-testid="kit-version">
                {many && (<div className="flex items-center justify-between gap-2 border-t pt-3">
                    <p className="text-sm font-medium">
                      Version {i + 1} of {texts.length}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => copy(`${t.headline}\n\n${t.primary_text}`, `Version ${i + 1}`)}>
                      <Copy className="size-4"/>
                      Copy both
                    </Button>
                  </div>)}
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`kit-headline-${i}`} className="text-xs font-medium">
                        Headline
                      </Label>
                      <CopyIt text={t.headline} what="Headline"/>
                    </div>
                    <Input id={`kit-headline-${i}`} value={t.headline} onChange={(e) => edit(i, { headline: e.target.value })} data-testid={i ? `kit-headline-${i + 1}` : "kit-headline"}/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`kit-text-${i}`} className="text-xs font-medium">
                        Primary text
                      </Label>
                      <CopyIt text={t.primary_text} what="Primary text"/>
                    </div>
                    <Textarea id={`kit-text-${i}`} rows={Math.min(12, Math.max(4, Math.ceil(t.primary_text.length / 110)))} value={t.primary_text} onChange={(e) => edit(i, { primary_text: e.target.value })} data-testid={i ? `kit-text-${i + 1}` : "kit-text"}/>
                  </div>
                </div>
              </div>))}
          {hasText && changed && (<Button size="sm" disabled={busy} onClick={() => start(async () => {
                    const r = await saveKitTextAction(scriptId, texts);
                    if (r.ok)
                        toast.success("Saved.");
                    else
                        toast.error(r.error);
                })} data-testid="kit-save">
              {busy && <Loader2 className="size-4 animate-spin"/>}
              Save the headline and primary text
            </Button>)}
        </>)}
      {showPrompts && (<>
          <h2 className="text-base font-semibold">{kit.want.images ? "Pictures for this script" : "Picture descriptions for this script"}</h2>
          {made.length > 0 && (<div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4" data-testid="kit-pictures">
              {made.map((p, i) => (<figure key={i} className="space-y-1">
                  <a href={`/api/${p.file}`} target="_blank" rel="noreferrer">

                    <img src={`/api/${p.file}?w=800`} alt={p.label} loading="lazy" className="aspect-[4/5] w-full rounded-md border object-cover"/>
                  </a>
                  <figcaption className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">{p.label}</span>
                    <a href={`/api/${p.file}`} download className="shrink-0 underline">
                      Download
                    </a>
                  </figcaption>
                </figure>))}
            </div>)}
          {kit.image_prompts!.map((p, i) => (<div key={i} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {kit.want.images ? "How this picture was described" : "Picture description"}: {p.title}
                </p>
                <CopyIt text={p.prompt} what="Picture description"/>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{p.prompt}</pre>
              {p.words && <p className="text-xs text-muted-foreground">Words set on it: &ldquo;{p.words}&rdquo;</p>}
            </div>))}
        </>)}
    </section>);
}
