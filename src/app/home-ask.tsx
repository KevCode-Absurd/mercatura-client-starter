"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VoiceNote } from "@/components/voice-note";
import { SKILL_GROUPS, STAGE_CHOICES, type SkillGroup } from "@/lib/chat/skill-calls";
import type { AwarenessStage } from "@/lib/taxonomy";
import { sendChatAction } from "./chat/actions";
type Pick = {
    id: string;
    label: string;
};
const ANY = "any";
const MAX = 6000;
const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).slice(0, MAX);
export function HomeAsk({ products, personas, angles, offers, formats, skills, example }: {
    products: Pick[];
    personas: Pick[];
    angles: Pick[];
    offers: Pick[];
    formats: Pick[];
    skills: (Pick & {
        group: SkillGroup;
    })[];
    example: string;
}) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [product, setProduct] = useState(ANY);
    const [who, setWho] = useState(ANY);
    const [angle, setAngle] = useState(ANY);
    const [offer, setOffer] = useState(ANY);
    const [format, setFormat] = useState(ANY);
    const [skill, setSkill] = useState(ANY);
    const [stage, setStage] = useState(ANY);
    const [pending, start] = useTransition();
    const before = useRef("");
    const chosen = [product, who, angle, offer, skill === ANY ? format : ANY, stage, skill].filter((v) => v !== ANY).length;
    const choosers = (m: boolean) => {
        const id = (s: string) => (m ? `${s}-m` : s);
        const wide = m ? "w-full max-w-none justify-between" : "";
        return (<>
        <Chooser label="Product" value={product} onChange={setProduct} any="Any product" options={products} className={wide}/>
        <Chooser label="Who" value={who} onChange={setWho} any="Any buyer" options={personas} className={wide}/>
        <Chooser label="Angle" value={angle} onChange={setAngle} any="You decide" options={angles} className={wide}/>
        <Chooser label="Offer" value={offer} onChange={setOffer} any="No offer" options={offers} className={wide}/>
        {skill === ANY && <Chooser label="Format" value={format} onChange={setFormat} any="You decide" options={formats} className={wide}/>}
        <Chooser label="Stage" value={stage} onChange={setStage} any="You decide" options={STAGE_CHOICES} testId={id("home-ask-stage")} className={wide}/>
        <Chooser label="Recipe" value={skill} onChange={setSkill} any="You decide" options={skills} groups={SKILL_GROUPS} testId={id("home-ask-skill")} className={wide}/>
      </>);
    };
    const make = () => start(async () => {
        const one = (v: string) => (v === ANY ? [] : [v]);
        const out = await sendChatAction({
            chatId: null,
            text,
            via,
            tags: {
                personas: one(who),
                products: one(product),
                offers: one(offer),
                references: [],
                made: [],
                format: format === ANY || skill !== ANY ? null : format,
                skill: skill === ANY ? null : skill,
                stage: stage === ANY ? null : (stage as AwarenessStage),
                angle: angle === ANY ? null : angle,
            },
        });
        if (!out.ok) {
            toast.error(out.error);
            return;
        }
        router.push(`/chat?c=${out.chat.id}`);
    });
    return (<div className="rounded-xl border bg-card p-2 shadow-[0_24px_48px_-32px_rgba(40,30,10,0.35)] focus-within:border-primary/60" data-testid="home-ask">

      <div className="flex flex-wrap items-center gap-2 px-2 pt-2 max-md:hidden" data-testid="home-ask-choices">{choosers(false)}</div>
      <div className="px-2 pt-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-sm" data-testid="home-ask-choices-button">
              <span className="text-muted-foreground">Choices</span>
              <span>{chosen ? `${chosen} set` : "Any"}</span>
              <ChevronDown className="size-3.5 text-muted-foreground"/>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-4 pb-8" data-testid="home-ask-choices-sheet">
            <SheetTitle className="mb-3 text-base">What this is for</SheetTitle>
            <div className="flex flex-col gap-2">{choosers(true)}</div>
            <SheetClose asChild>
              <button type="button" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground" data-testid="home-ask-choices-done">
                Done
              </button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
      <textarea value={text} onChange={(e) => {
            setText(e.target.value.slice(0, MAX));
            setVia("typed");
        }} onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim().length >= 2 && !pending)
                make();
        }} rows={2} placeholder={example} aria-label="What do you want to make?" className="block w-full resize-none bg-transparent px-4 pb-2 pt-4 text-lg leading-snug outline-none max-md:min-h-24 max-md:text-base placeholder:text-muted-foreground/70" data-testid="home-ask-text"/>

      <div className="flex items-center justify-between gap-3 px-2 pb-2">
        <span className="text-xs text-muted-foreground max-md:hidden">Say it or type it. Ctrl + Enter makes it.</span>
        <span className="flex shrink-0 items-center gap-2">
          <VoiceNote onStart={() => {
            before.current = text;
        }} onHeard={(heard) => {
            setText(join(before.current, heard));
            setVia("voice");
        }} onText={(t) => {
            setText(join(before.current, t));
            setVia("voice");
        }} disabled={pending} className="h-10 min-w-[6.5rem] justify-center rounded-lg px-3 text-sm" testId="home-ask-voice"/>
          <button type="button" onClick={make} disabled={pending || text.trim().length < 2} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="home-ask-make">
            Make {pending ? <Loader2 className="size-4 animate-spin"/> : <ArrowRight className="size-4"/>}
          </button>
        </span>
      </div>
    </div>);
}
function Chooser({ label, value, onChange, any, options, groups, testId, className }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    any: string;
    options: (Pick & {
        group?: string;
    })[];
    groups?: {
        id: string;
        label: string;
    }[];
    testId?: string;
    className?: string;
}) {
    if (!options.length)
        return null;
    const item = (o: Pick) => (<SelectItem key={o.id} value={o.id}>
      {o.label}
    </SelectItem>);
    return (<Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className={`max-w-52 rounded-full bg-background ${className ?? ""}`} data-testid={testId}>
        <span className="text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{any}</SelectItem>
        {groups
            ? groups.map((g) => {
                const inGroup = options.filter((o) => o.group === g.id);
                return inGroup.length ? (<SelectGroup key={g.id}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {inGroup.map(item)}
                </SelectGroup>) : null;
            })
            : options.map(item)}
      </SelectContent>
    </Select>);
}
