"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Copy, FileDown, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { founderProgress, isAnswered, type FounderAnswer, type FounderSection } from "@/lib/founder-questions";
import { cn } from "@/lib/utils";
import { saveFounderAnswerAction, writeFounderFileAction } from "./actions";
const MAX_SECONDS = 600;
const RECORD_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
interface Props {
    sections: FounderSection[];
    initial: Record<string, FounderAnswer>;
    questionnaire: string;
    file: string;
    fileExists: boolean;
    voice: {
        enabled: boolean;
        reason: string | null;
    };
}
export function FounderForm({ sections, initial, questionnaire, file, fileExists, voice }: Props) {
    const [answers, setAnswers] = useState(initial);
    const [saved, setSaved] = useState(initial);
    const [coreOnly, setCoreOnly] = useState(false);
    const [active, setActive] = useState(sections[0].n);
    const [saving, setSaving] = useState<string | null>(null);
    const [written, setWritten] = useState(fileExists);
    const [writing, startWrite] = useTransition();
    const [micOk, setMicOk] = useState<boolean | null>(null);
    const [listening, setListening] = useState<string | null>(null);
    const [transcribing, setTranscribing] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(0);
    const advanced = useAdvanced();
    const recorder = useRef<MediaRecorder | null>(null);
    const latest = useRef(answers);
    useEffect(() => {
        latest.current = answers;
    }, [answers]);
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    useEffect(() => {
        setMicOk(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
        return () => recorder.current?.stop();
    }, []);
    useEffect(() => () => recorder.current?.stop(), [active, coreOnly]);
    useEffect(() => {
        if (!listening)
            return;
        const t = setInterval(() => {
            setSeconds((n) => {
                if (n + 1 >= MAX_SECONDS)
                    recorder.current?.stop();
                return n + 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [listening]);
    const progress = useMemo(() => founderProgress(sections, answers), [sections, answers]);
    const section = sections.find((s) => s.n === active) ?? sections[0];
    const shown = section.questions.filter((q) => !coreOnly || q.core);
    const save = async (id: string, next: FounderAnswer) => {
        const before = saved[id];
        if ((before?.answer ?? "") === next.answer.trim() && (before?.skipped ?? false) === next.skipped)
            return;
        setSaving(id);
        const res = await saveFounderAnswerAction(id, next.answer, next.skipped);
        setSaving(null);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setSaved((cur) => ({ ...cur, [id]: { answer: next.answer.trim(), skipped: next.skipped } }));
    };
    const edit = (id: string, answer: string) => setAnswers((cur) => ({ ...cur, [id]: { answer, skipped: false } }));
    const skip = (id: string) => {
        const next = { answer: answers[id]?.answer ?? "", skipped: !answers[id]?.skipped };
        setAnswers((cur) => ({ ...cur, [id]: next }));
        void save(id, next);
    };
    const transcribe = async (id: string, audio: Blob) => {
        setTranscribing(id);
        try {
            const res = await fetch(`/api/founder/transcribe?q=${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": audio.type }, body: audio });
            const out = (await res.json()) as {
                ok: true;
                text: string;
            } | {
                ok: false;
                error: string;
            };
            if (!out.ok) {
                toast.error(out.error);
                return;
            }
            if (!out.text) {
                toast.message("Nothing was heard in that recording.");
                return;
            }
            const prev = latest.current[id]?.answer ?? "";
            const answer = `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${out.text}`;
            setAnswers((cur) => ({ ...cur, [id]: { answer, skipped: false } }));
            await save(id, { answer, skipped: false });
        }
        catch {
            toast.error("The recording couldn't be sent. Check the connection and try again.");
        }
        finally {
            setTranscribing(null);
        }
    };
    const speak = async (id: string) => {
        if (listening === id) {
            recorder.current?.stop();
            return;
        }
        if (listening || transcribing)
            return;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        catch (e) {
            const name = (e as Error).name;
            toast.error(name === "NotFoundError" ? "No microphone was found." : "The microphone is blocked. Allow it for this site in the browser, then try again.");
            return;
        }
        const mimeType = RECORD_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
        const r = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
        const chunks: Blob[] = [];
        r.ondataavailable = (e) => {
            if (e.data.size)
                chunks.push(e.data);
        };
        r.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            recorder.current = null;
            setListening(null);
            const audio = new Blob(chunks, { type: r.mimeType || mimeType || "audio/webm" });
            if (audio.size)
                void transcribe(id, audio);
        };
        recorder.current = r;
        setSeconds(0);
        setListening(id);
        r.start();
    };
    const copy = async () => {
        await navigator.clipboard.writeText(questionnaire);
        toast.success("Questions copied. Paste them into an email or a doc for the founder.");
    };
    const write = () => startWrite(async () => {
        const res = await writeFounderFileAction();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setWritten(true);
        toast.success(advanced ? "Saved to the brand folder as founder-interview.md" : "Answers saved.");
    });
    return (<div className="grid gap-6 p-6 lg:grid-cols-[16rem_1fr]" data-testid="founder-form">
      <aside className="space-y-4">
        <div className="rounded-md border p-3 text-sm" data-testid="founder-progress">
          <div className="font-medium">
            {progress.answered} of {progress.total} answered
          </div>
          <div className="text-xs text-muted-foreground">
            {progress.coreAnswered} of {progress.core} core questions
            {progress.skipped ? `, ${progress.skipped} skipped` : ""}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={coreOnly} onCheckedChange={setCoreOnly} data-testid="founder-core-only"/>
          Core questions only
        </label>
        {(!voice.enabled || micOk === false) && (<p className="text-xs text-muted-foreground" data-testid="founder-voice-unavailable">
            Spoken answers are off. {voice.reason ?? "This browser can't record from a microphone."}
          </p>)}
        <nav className="space-y-0.5">
          {sections.map((s) => {
            const qs = s.questions.filter((q) => !coreOnly || q.core);
            const done = qs.filter((q) => isAnswered(answers[q.id])).length;
            return (<button key={s.n} type="button" onClick={() => setActive(s.n)} data-testid={`founder-section-${s.n}`} className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm", s.n === section.n ? "bg-muted font-medium" : "hover:bg-muted/50")}>
                <span>
                  {s.n}. {s.title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {done}/{qs.length}
                </span>
              </button>);
        })}
        </nav>
        <div className="space-y-2 border-t pt-3">
          <Button size="sm" variant="outline" className="w-full justify-start" onClick={copy} data-testid="founder-copy">
            <Copy className="size-3.5"/>
            Copy questions for the founder
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start" onClick={write} disabled={writing || progress.answered === 0} data-testid="founder-write">
            {writing ? <Loader2 className="size-3.5 animate-spin"/> : <FileDown className="size-3.5"/>}
            {written ? "Save the changes" : "Save the answers"}
          </Button>
          {advanced ? (<p className="text-xs text-muted-foreground">
            Writes <code>founder-interview.md</code> next to the other brand files, so the next brand.json build reads it. Answers are kept in the app either way.
          </p>) : (<p className="text-xs text-muted-foreground">Keeps the answers with the brand&apos;s other documents, so the next rebuild of the brand brain reads them. Answers are kept in the app either way.</p>)}
          {advanced && written && <p className="break-all text-xs text-muted-foreground">{file}</p>}
        </div>
      </aside>

      <div className="max-w-3xl">
        <h2 className="text-base font-semibold">
          {section.n}. {section.title}
        </h2>
        {section.intro && <p className="mt-0.5 text-sm text-muted-foreground">{section.intro}</p>}
        {!shown.length && <p className="mt-4 text-sm text-muted-foreground">No core questions in this section.</p>}
        <ol className="mt-4 space-y-5">
          {shown.map((q) => {
            const a = answers[q.id];
            const dirty = (a?.answer ?? "").trim() !== (saved[q.id]?.answer ?? "");
            return (<li key={q.id} data-testid={`founder-q-${q.id}`} data-skipped={!!a?.skipped}>
                <div className="flex items-start gap-2">
                  {advanced && <span className="mt-0.5 font-mono text-xs text-muted-foreground">{q.id}</span>}
                  <p className="flex-1 text-sm">
                    <span className={cn(a?.skipped && "text-muted-foreground line-through")}>{q.text}</span>
                    {q.core && <span className="ml-1.5 rounded-full border px-1.5 py-px align-middle text-xs text-muted-foreground">core</span>}
                  </p>
                </div>
                {!a?.skipped && (<Textarea className="mt-1.5" value={a?.answer ?? ""} readOnly={!ready} onChange={(e) => edit(q.id, e.target.value)} onBlur={() => void save(q.id, { answer: answers[q.id]?.answer ?? "", skipped: false })} placeholder="The founder's answer, in their words" data-testid={`founder-a-${q.id}`}/>)}
                {listening === q.id && (<p className="mt-1 text-xs text-muted-foreground" data-testid="founder-hearing">
                    <span className="mr-1.5 inline-block size-2 animate-pulse rounded-full bg-red-500 align-middle"/>
                    Recording {clock(seconds)}. Press Stop when you&apos;ve finished and it is written into the box.
                  </p>)}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {voice.enabled && micOk && !a?.skipped && (<button type="button" className={cn("flex items-center gap-1 hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50", listening === q.id && "font-medium text-red-600")} onClick={() => void speak(q.id)} disabled={transcribing !== null || (listening !== null && listening !== q.id)} aria-pressed={listening === q.id} data-testid={`founder-voice-${q.id}`}>
                      {transcribing === q.id ? <Loader2 className="size-3 animate-spin"/> : listening === q.id ? <Square className="size-3"/> : <Mic className="size-3"/>}
                      {transcribing === q.id ? "Writing it down..." : listening === q.id ? "Stop" : "Speak"}
                    </button>)}
                  <button type="button" className="hover:text-foreground hover:underline" onClick={() => skip(q.id)} data-testid={`founder-skip-${q.id}`}>
                    {a?.skipped ? "Answer this after all" : "Skip"}
                  </button>
                  {saving === q.id ? (<span>Saving...</span>) : listening === q.id || transcribing === q.id ? null : dirty ? (<span>Not saved yet</span>) : isAnswered(a) ? (<span className="flex items-center gap-1 text-emerald-700" data-testid={`founder-saved-${q.id}`}>
                      <Check className="size-3"/>
                      Saved
                    </span>) : null}
                </div>
              </li>);
        })}
        </ol>
        <div className="mt-6 flex gap-2">
          {section.n > sections[0].n && (<Button size="sm" variant="outline" onClick={() => setActive(section.n - 1)}>
              Previous
            </Button>)}
          {section.n < sections[sections.length - 1].n && (<Button size="sm" onClick={() => setActive(section.n + 1)} data-testid="founder-next">
              Next section
            </Button>)}
        </div>
      </div>
    </div>);
}
