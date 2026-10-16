"use client";
import { createContext, useContext, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe, ImagePlus, Loader2, Mic, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { useAdvanced } from "@/components/mode";
import type { FeedbackRow } from "@/db/schema";
import { AREAS, AREA_LABEL, CATEGORIES, type Area, type Category, type Lesson } from "@/lib/lesson-types";
import { OUTPUT_INFO, type OutputType } from "@/lib/taxonomy";
import { skillTitle } from "@/lib/skills/titles";
import { cn } from "@/lib/utils";
import type { FailureGroup, ScriptTrend } from "@/lib/failures";
import type { EditRepeat } from "@/lib/hand-edits";
import { EditRepeats } from "./edit-repeats";
import { Failing } from "./failing";
import { MergedFrom, TidyUp, foldedAway } from "./tidy";
import { confirmFeedbackAction, rereadFeedbackAction } from "./actions";
import { deleteFeedbackAction, deleteLessonAction, noteAction, promoteLessonAction, updateLessonAction } from "./actions";
import { plainMessage } from "@/lib/plain-message";
interface Props {
    brandName: string;
    mine: Lesson[];
    general: Lesson[];
    feedback: FeedbackRow[];
    products: {
        id: string;
        name: string;
    }[];
    voice: boolean;
    proposed?: Record<string, {
        status: string;
        skill: string;
    }>;
    reads: boolean;
    failing: FailureGroup[];
    trend: ScriptTrend | null;
    broken: Record<string, number>;
    edits?: EditRepeat[];
}
const Broken = createContext<Record<string, number>>({});
const FEEDBACK_STATUS: Record<FeedbackRow["status"], string> = { logged: "Kept", learned: "Became a lesson", nothing: "Kept: a one-off, no lasting rule in it", failed: "Kept, but it couldn't be read" };
export function LessonsView({ brandName, mine, general, feedback, products, voice, reads, failing, broken, trend, edits = [], proposed = {} }: Props) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [pending, start] = useTransition();
    const advanced = useAdvanced();
    const facts = mine.filter((l) => l.category === "product_use");
    const rules = mine.filter((l) => l.category !== "product_use");
    const waits = (f: FeedbackRow) => f.status === "logged" && f.lesson_ids.some((id) => mine.find((l) => l.id === id)?.status === "off");
    const add = () => start(async () => {
        const res = await noteAction({ text, via });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setText("");
        setVia("typed");
        if (res.status === "logged")
            toast.message("Kept. The rule drawn from it waits in the list at the bottom: press Add as a rule when you agree.");
        else if (res.learned.length && !advanced)
            toast.success(res.learned.filter((x) => x.isNew).length ? "Added to the lessons." : "Already known, counted again.");
        else if (res.learned.length)
            toast.success(`${res.learned.filter((x) => x.isNew).length ? "Added" : "Already known, counted again"}: ${res.learned.map((x) => x.id).join(", ")}`);
        else
            toast.message(res.status === "nothing" ? "Kept, but nothing lasting to learn from it. Say it as a rule for next time." : "Kept, but it could not be read for a rule.");
        router.refresh();
    });
    return (<Broken.Provider value={broken}>
    <div className="max-w-5xl space-y-12 px-6 py-8" data-testid="lessons-view">
      <section className="rounded-xl border bg-card p-6 max-md:p-4">
        <h2 className="display text-2xl">Tell the app something it should always get right</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Type it or say it. {reads ? "It is sorted into a rule for this brand, for 1 product, or for every brand." : "It is kept exactly as written, for this brand. Feedback left on a piece waits in the list at the bottom until you add it as a rule."} You can also leave feedback on any image in a set: it lands here the same way.
        </p>
        <Textarea className="mt-3 bg-background" value={text} onChange={(e) => {
            setText(e.target.value.slice(0, 4000));
            setVia("typed");
        }} placeholder="For example: the pouch is opened at the top, never torn down the side." data-testid="lesson-note"/>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={add} disabled={pending || text.trim().length < 4} data-testid="lesson-add">
            {pending && <Loader2 className="size-3.5 animate-spin"/>}
            Add
          </Button>
          {voice && (<VoiceNote disabled={pending} onText={(t) => {
                setText((cur) => `${cur}${cur && !/\s$/.test(cur) ? " " : ""}${t}`);
                setVia("voice");
            }}/>)}
          {!voice && <span className="text-xs text-muted-foreground">{advanced ? "Voice notes need LLM_MODE=live and GEMINI_API_KEY in .env." : "Voice notes are not switched on for this account."}</span>}
        </div>
      </section>

      {edits.length > 0 && (<p className="text-sm" data-testid="edit-repeats-count">
          <a href="#edits" className="font-medium underline underline-offset-2">
            {edits.length} {edits.length === 1 ? "change" : "changes"} you keep making
          </a>
          <span className="text-muted-foreground">: say if each should be a rule.</span>
        </p>)}
      <EditRepeats repeats={edits}/>

      <Failing groups={failing} reads={reads} trend={trend}/>

      <TidyUp mine={mine}/>

      <Group title={`How ${brandName} products are opened, held and used`} hint="Facts. Every picture and video of the product follows them, and an image that breaks one is made again." empty="Nothing yet. Add how the pack opens and how the product is used." lessons={facts} products={products} testId="lessons-facts"/>
      <Group title={`Rules for ${brandName}`} hint="Mistakes pointed out on earlier work, and this brand's own taste." empty="Nothing yet." lessons={rules} products={products} testId="lessons-brand"/>
      <Group title="Rules for every brand" hint={advanced ? "Kept in skills/creative-lessons. They apply to all brands, so change them with care." : "They apply to all brands, so change them with care."} empty="Nothing yet." lessons={general} products={products} general testId="lessons-general"/>

      <section id="feedback" data-testid="feedback-log">
        <h2 className="display text-2xl">What people said</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every note, as it was given. Deleting a note keeps the lessons learned from it.</p>
        {!feedback.length ? (<p className="mt-3 text-sm text-muted-foreground">No feedback yet.</p>) : (<ul className="mt-5 divide-y overflow-hidden rounded-lg border bg-card text-sm">
            {feedback.map((f) => (<li key={f.id} className="flex items-start gap-3 p-4" data-testid="feedback-row">
                {f.via === "voice" ? <Mic className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Voice note"/> : <Pencil className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Typed"/>}
                <div className="min-w-0 flex-1">
                  <p>{f.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {f.ref_type === "landing" && (<>
                        {" · "}
                        <Link href={`/landing/pages/${f.ref_id}`} className="hover:underline">
                          the landing page it was said on
                        </Link>
                      </>)}
                    {f.ref_type === "studio" && (<>
                        {" · "}
                        <Link href={`/studio/${f.ref_id}`} className="hover:underline">
                          the set it was said on
                          {f.item_id ? `, ${f.item_id.replace("img_", "image ")}` : ""}
                        </Link>
                      </>)}
                    {" · "}
                    {waits(f) ? "Kept. Its rule waits for a yes" : f.status === "learned" && f.lesson_ids.length > 1 ? `Became ${f.lesson_ids.length} lessons` : FEEDBACK_STATUS[f.status]}
                    {f.action === "remake" ? " · the image was made again with it" : ""}
                  </p>
                  {f.error && <p className="mt-0.5 text-xs text-red-700">{plainMessage(f.error)}</p>}
                  {proposed[f.id] && (<p className="mt-0.5 text-xs" data-testid="feedback-proposed">
                      <Link href="/skills" className="font-semibold text-primary hover:underline">
                        {proposed[f.id].status === "open" ? `A change to ${skillTitle(proposed[f.id].skill)} is waiting for an admin` : proposed[f.id].status === "accepted" ? `Changed ${skillTitle(proposed[f.id].skill)} (accepted by an admin)` : proposed[f.id].status === "rejected" ? `A change to ${skillTitle(proposed[f.id].skill)} was rejected by an admin` : `A change to ${skillTitle(proposed[f.id].skill)} could not be made`}
                      </Link>
                    </p>)}
                </div>
                {f.status === "failed" && <FeedbackReread id={f.id}/>}
                {waits(f) && <FeedbackConfirm id={f.id}/>}
                <FeedbackDelete id={f.id}/>
              </li>))}
          </ul>)}
      </section>
    </div>
    </Broken.Provider>);
}
function FeedbackConfirm({ id }: {
    id: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<Button size="sm" disabled={pending} data-testid="feedback-confirm" onClick={() => start(async () => {
            const res = await confirmFeedbackAction(id);
            if (!res.ok)
                toast.error(res.error);
            else
                toast.success("Added to this brand's rules. It is used from now on.");
            router.refresh();
        })}>
      {pending && <Loader2 className="size-3.5 animate-spin"/>}
      Add as a rule
    </Button>);
}
function FeedbackReread({ id }: {
    id: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<Button size="sm" variant="outline" disabled={pending} data-testid="feedback-reread" onClick={() => start(async () => {
            const res = await rereadFeedbackAction(id);
            if (!res.ok)
                toast.error(res.error);
            else if (!["learned", "nothing", "logged"].includes(res.status))
                toast.error("It still could not be read.");
            else
                toast.success(res.status === "logged" ? "Read. Its rule waits below for a yes." : res.learned.length ? "Read. Added to the lessons." : "Read. Nothing lasting in it: a one-off.");
            router.refresh();
        })}>
      {pending && <Loader2 className="size-3.5 animate-spin"/>}
      Read it again
    </Button>);
}
function FeedbackDelete({ id }: {
    id: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    return (<button type="button" aria-label="Delete this note" title="Delete this note" disabled={pending} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-700" onClick={() => confirm("Delete this note? The lessons learned from it stay.") &&
            start(async () => {
                const res = await deleteFeedbackAction(id);
                if (!res.ok)
                    toast.error(res.error);
                else
                    router.refresh();
            })}>
      <Trash2 className="size-3.5"/>
    </button>);
}
function Group({ title, hint, empty, lessons: all, products, general, testId }: {
    title: string;
    hint: string;
    empty: string;
    lessons: Lesson[];
    products: Props["products"];
    general?: boolean;
    testId: string;
}) {
    const lessons = all.filter((l) => !foldedAway(all, l));
    return (<section data-testid={testId}>
      <h2 className="display text-2xl">
        {title} <span className="font-sans text-sm text-muted-foreground">({lessons.length})</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {!lessons.length ? (<p className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{empty}</p>) : (<ul className="mt-5 space-y-3">
          {lessons.map((l) => (<LessonRow key={`${l.id}:${l.updated_at}:${l.status}`} lesson={l} products={products} general={!!general} originals={l.replaces.length ? all.filter((o) => o.merged_into === l.id) : []}/>))}
        </ul>)}
    </section>);
}
function LessonRow({ lesson, products, general, originals }: {
    lesson: Lesson;
    products: Props["products"];
    general: boolean;
    originals: Lesson[];
}) {
    const router = useRouter();
    const brokenTimes = useContext(Broken)[lesson.id] ?? 0;
    const [l, setL] = useState(lesson);
    const [editing, setEditing] = useState(false);
    const [rule, setRule] = useState(lesson.rule);
    const [pending, start] = useTransition();
    const file = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const advanced = useAdvanced();
    const patch = (p: Parameters<typeof updateLessonAction>[1], done?: string) => start(async () => {
        const res = await updateLessonAction(l.id, p);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setL(res.lesson);
        setRule(res.lesson.rule);
        setEditing(false);
        if (done)
            toast.success(done);
        router.refresh();
    });
    const toggleArea = (a: Area) => {
        const next = l.areas.includes(a) ? l.areas.filter((x) => x !== a) : [...l.areas, a];
        if (!next.length) {
            toast.error("A lesson has to apply to at least 1 kind of work.");
            return;
        }
        patch({ areas: next });
    };
    const where = l.scope === "product" ? `product:${l.product_id}` : l.scope;
    const setWhere = (v: string) => (v.startsWith("product:") ? patch({ scope: "product", product_id: v.slice(8) }) : patch({ scope: v as "brand" | "general", product_id: null }));
    const upload = async (f: File) => {
        setUploading(true);
        try {
            const res = await fetch(`/api/lessons/image?id=${encodeURIComponent(l.id)}`, { method: "POST", headers: { "content-type": f.type || "application/octet-stream" }, body: f });
            const out = (await res.json()) as {
                ok: true;
                lesson: Lesson;
            } | {
                ok: false;
                error: string;
            };
            if (!out.ok)
                toast.error(out.error);
            else {
                setL(out.lesson);
                toast.success("Photo saved. It is used as the example whenever a picture shows the product in use.");
            }
        }
        catch {
            toast.error("The photo couldn't be sent.");
        }
        finally {
            setUploading(false);
        }
    };
    const removePhoto = async () => {
        const res = await fetch(`/api/lessons/image?id=${encodeURIComponent(l.id)}`, { method: "DELETE" });
        const out = (await res.json()) as {
            ok: true;
            lesson: Lesson;
        } | {
            ok: false;
            error: string;
        };
        if (out.ok)
            setL(out.lesson);
        else
            toast.error(out.error);
    };
    return (<li className={cn("rounded-lg border bg-card p-4 text-sm", l.status === "off" && "opacity-60")} data-testid="lesson" data-id={l.id} data-status={l.status}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (<div className="space-y-2">
              <Textarea value={rule} onChange={(e) => setRule(e.target.value.slice(0, 500))} className="min-h-20" data-testid="lesson-rule-edit"/>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => patch({ rule }, "Saved")} disabled={pending || rule.trim().length < 8} data-testid="lesson-save">
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                setRule(l.rule);
                setEditing(false);
            }}>
                  Cancel
                </Button>
              </div>
            </div>) : (<p data-testid="lesson-rule">{l.rule}</p>)}
          {l.why && (advanced || !l.replaces.length) && <p className="mt-1 text-xs text-muted-foreground">Why: {l.why}</p>}
          <MergedFrom lesson={l} originals={originals}/>

          {(advanced || l.kind === "keep" || l.formats.length > 0 || l.times > 1 || brokenTimes > 0) && (<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {advanced && (<span className="flex items-center gap-1">
              {AREAS.map((a) => (<button key={a} type="button" disabled={pending} aria-pressed={l.areas.includes(a)} onClick={() => toggleArea(a)} className={cn("rounded-full border px-2 py-0.5", l.areas.includes(a) ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted")} title={`Use this lesson for ${AREA_LABEL[a].toLowerCase()}`}>
                  {AREA_LABEL[a]}
                </button>))}
            </span>)}
            {l.kind === "keep" && (<span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800" title="Named as a reason an ad was approved. Writers are told to keep doing it." data-testid="lesson-keep">
                Keep doing
              </span>)}
            {l.formats.length > 0 && (<button type="button" disabled={pending} onClick={() => patch({ formats: [] })} className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 hover:bg-primary/20" title="Kept for this format only. Click to use it for every format." data-testid="lesson-formats">
                Only {l.formats.map((f) => OUTPUT_INFO[f as OutputType]?.label ?? f).join(", ")} ×
              </button>)}
            {advanced && (<select aria-label="Kind of lesson" value={l.category} disabled={pending} onChange={(e) => patch({ category: e.target.value as Category })} className="h-8 rounded-md border bg-background px-2">
              {(Object.keys(CATEGORIES) as Category[]).map((c) => (<option key={c} value={c}>
                  {CATEGORIES[c]}
                </option>))}
            </select>)}
            {advanced && !general && (<select aria-label="Applies to" value={where} disabled={pending} onChange={(e) => setWhere(e.target.value)} className="h-8 max-w-56 rounded-md border bg-background px-2" data-testid="lesson-scope">
                <option value="brand">All of this brand</option>
                {products.map((p) => (<option key={p.id} value={`product:${p.id}`}>
                    Only {p.name}
                  </option>))}
                <option value="general">True of any brand</option>
              </select>)}
            {l.times > 1 && <span className="text-muted-foreground">Said {l.times} times</span>}
            {brokenTimes > 0 && (<span className="text-amber-800" data-testid="lesson-broken" title="Counted each time a check found this rule broken on a finished piece. A rule that keeps being broken is one that words alone are not fixing.">
                Broken {brokenTimes} time{brokenTimes === 1 ? "" : "s"} since
              </span>)}
            {advanced && l.status === "proposed" && (<span className="flex items-center gap-1.5">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">Used for this brand only</span>
                <button type="button" disabled={pending} className="flex items-center gap-1 text-primary hover:underline" onClick={() => confirm("Use this lesson for every brand? It then applies to all of them.") &&
                    start(async () => {
                        const res = await promoteLessonAction(l.id);
                        if (!res.ok)
                            toast.error(res.error);
                        else {
                            toast.success(`Now ${res.lesson.id}, used for every brand.`);
                            router.refresh();
                        }
                    })} data-testid="lesson-promote">
                  <Globe className="size-3"/>
                  Use for every brand
                </button>
              </span>)}
          </div>)}

          {advanced && !general && (<div className="mt-2 flex items-center gap-2 text-xs">
              {l.image ? (<>

                  <img src={`/api/assets/${l.image}?w=160&v=${encodeURIComponent(l.updated_at)}`} alt="Photo that shows this done right" className="size-14 rounded border object-cover"/>
                  <span className="text-muted-foreground">Used as the example of this done right.</span>
                  <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-red-700" onClick={() => void removePhoto()}>
                    <X className="size-3"/> Remove
                  </button>
                </>) : (<button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" disabled={uploading} onClick={() => file.current?.click()} data-testid="lesson-photo">
                  {uploading ? <Loader2 className="size-3 animate-spin"/> : <ImagePlus className="size-3"/>}
                  Add a photo that shows it done right
                </button>)}
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}/>
            </div>)}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Switch checked={l.status !== "off"} disabled={pending} onCheckedChange={(on) => patch({ status: on ? (general || l.scope !== "general" ? "active" : "proposed") : "off" })} aria-label={l.status === "off" ? "Turn this lesson on" : "Turn this lesson off"} data-testid="lesson-toggle"/>
          {!editing && (<button type="button" aria-label="Edit the wording" title="Edit the wording" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setEditing(true)} data-testid="lesson-edit">
              <Pencil className="size-3.5"/>
            </button>)}
          <button type="button" aria-label="Delete this lesson" title="Delete this lesson" disabled={pending} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-700" onClick={() => confirm(general ? "Delete this lesson for every brand?" : "Delete this lesson?") &&
            start(async () => {
                const res = await deleteLessonAction(l.id);
                if (!res.ok)
                    toast.error(res.error);
                else
                    router.refresh();
            })} data-testid="lesson-delete">
            <Trash2 className="size-3.5"/>
          </button>
        </div>
      </div>
    </li>);
}
