"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, Film, Upload } from "lucide-react";
import type { ComplianceCheckRow } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Working } from "@/components/working";
import { VERDICT_LABEL } from "@/lib/compliance/labels";
import { NO_TIME_YET } from "@/lib/jobs/past-time";
import { aboutTime } from "@/lib/studio/timing";
import { cn } from "@/lib/utils";
import { checkSourceAction, checkUploadAction, checkWordsAction } from "./actions";
import { CheckResult, type PolicyNames } from "./result";
interface Source {
    kind: "image" | "script" | "video";
    ref: string;
    label: string;
    thumb?: string;
    at: string;
}
interface PastCheck {
    id: string;
    kind: string;
    summary: string;
    verdict: ComplianceCheckRow["verdict"];
    findings: number;
    created_at: string;
}
const WAYS = [
    { id: "words", label: "Paste the words" },
    { id: "upload", label: "Upload a picture or video" },
    { id: "pick", label: "Pick from the brand" },
] as const;
type Way = (typeof WAYS)[number]["id"];
const KIND_WORD: Record<string, string> = { copy: "Words", script: "Script", image: "Image", video: "Video" };
const VERDICT_TONE: Record<string, string> = { ready: "text-emerald-700 dark:text-emerald-300", fix: "text-amber-700 dark:text-amber-300", rejected: "text-red-700 dark:text-red-300" };
const when = (iso: string) => new Date(iso.endsWith("Z") ? iso : `${iso}Z`).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export function ComplianceView({ names, sources, checks, advanced, live, expect }: {
    names: PolicyNames;
    sources: {
        images: Source[];
        scripts: Source[];
        videos: Source[];
    };
    checks: PastCheck[];
    advanced: boolean;
    live: boolean;
    expect: number;
}) {
    const router = useRouter();
    const [way, setWay] = useState<Way>("words");
    const [text, setText] = useState("");
    const [running, setRunning] = useState<{
        title: string;
        since: string;
    } | null>(null);
    const [result, setResult] = useState<ComplianceCheckRow | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<Source | null>(null);
    const [upload, setUpload] = useState<{
        file: string;
        name: string;
        kind: "image" | "video";
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const run = async (title: string, go: () => Promise<{
        ok: true;
        check: ComplianceCheckRow;
    } | {
        ok: false;
        error: string;
    }>) => {
        setError(null);
        setResult(null);
        setRunning({ title, since: new Date().toISOString() });
        try {
            const res = await go();
            if (res.ok) {
                setResult(res.check);
                router.refresh();
            }
            else
                setError(res.error);
        }
        finally {
            setRunning(null);
        }
    };
    const onFile = async (f: File | undefined) => {
        if (!f)
            return;
        setError(null);
        setUploading(true);
        try {
            const body = new FormData();
            body.append("file", f);
            const res = await fetch("/api/compliance/upload", { method: "POST", body });
            const json = (await res.json()) as {
                ok: boolean;
                file?: string;
                kind?: "image" | "video";
                name?: string;
                error?: string;
            };
            if (!res.ok || !json.ok || !json.file)
                throw new Error(json.error ?? "The file could not be kept.");
            setUpload({ file: json.file, name: json.name ?? f.name, kind: json.kind ?? "image" });
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setUploading(false);
            if (fileInput.current)
                fileInput.current.value = "";
        }
    };
    const timeLine = expect > 0 ? `${aboutTime(expect)}, from past runs` : NO_TIME_YET;
    return (<div className="px-6 py-8">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to check">
        {WAYS.map((w) => (<button key={w.id} type="button" role="tab" aria-selected={way === w.id} onClick={() => setWay(w.id)} data-testid={`way-${w.id}`} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", way === w.id ? "border-primary bg-accent text-primary" : "bg-card text-muted-foreground hover:text-foreground")}>
            {w.label}
          </button>))}
      </div>

      <div className="mt-5 rounded-xl border bg-card p-5">
        {way === "words" && (<div className="space-y-3">
            <p className="text-sm text-muted-foreground">The primary text, the headline, the words on the picture, or a whole script: paste it as it would run.</p>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the ad's words here" className="min-h-40" data-testid="check-words" disabled={!!running}/>
            <Button onClick={() => run("Reading the words against Meta's standards", () => checkWordsAction({ text }))} disabled={!!running || text.trim().length < 8} data-testid="check-run">
              Check it
            </Button>
          </div>)}
        {way === "upload" && (<div className="space-y-3">
            <p className="text-sm text-muted-foreground">A finished image ad (PNG, JPG, WebP) or a video ad (MP4, MOV, WebM, up to 200 MB).</p>
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.mp4,.mov,.webm,.m4v" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="check-file"/>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading || !!running} data-testid="check-choose-file">
                <Upload /> {uploading ? "Uploading…" : "Choose a file"}
              </Button>
              {upload && (<span className="flex items-center gap-1.5 text-sm" data-testid="check-upload-name">
                  {upload.kind === "video" ? <Film className="size-4"/> : <ImageIcon className="size-4"/>}
                  {upload.name}
                </span>)}
            </div>
            {upload && (<Button onClick={() => run(upload.kind === "video" ? "Watching the video against Meta's standards" : "Reading the picture against Meta's standards", () => checkUploadAction({ file: upload.file, name: upload.name }))} disabled={!!running} data-testid="check-run">
                Check it
              </Button>)}
            {!live && <p className="text-xs text-muted-foreground">No model is switched on here, so a picture or a video is not looked at: only words can be read.</p>}
          </div>)}
        {way === "pick" && (<div className="space-y-5">
            <SourceList title="Image ads" icon={ImageIcon} items={sources.images} picked={picked} onPick={setPicked} empty="No image ads made yet."/>
            <SourceList title="Scripts" icon={FileText} items={sources.scripts} picked={picked} onPick={setPicked} empty="No scripts yet."/>
            <SourceList title="Videos" icon={Film} items={sources.videos} picked={picked} onPick={setPicked} empty="No rendered videos yet."/>
            {picked && (<Button onClick={() => run(picked.kind === "video" ? "Watching the video against Meta's standards" : picked.kind === "image" ? "Reading the picture against Meta's standards" : "Reading the script against Meta's standards", () => checkSourceAction({ kind: picked.kind, ref: picked.ref }))} disabled={!!running} data-testid="check-run">
                Check {picked.label}
              </Button>)}
          </div>)}
      </div>

      {running && (<div className="mt-6 rounded-xl border bg-card p-5">
          <Working title={running.title} job="write" startedAt={running.since} expect={expect} note={timeLine} testId="check-working"/>
        </div>)}
      {error && (<p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert" data-testid="check-error">
          {error}
        </p>)}
      {result && !running && (<div className="mt-6">
          <CheckResult check={result} names={names} advanced={advanced}/>
        </div>)}

      <section className="mt-10">
        <h2 className="display text-2xl">Past checks</h2>
        {checks.length ? (<ul className="mt-3 divide-y rounded-xl border bg-card" data-testid="past-checks">
            {checks.map((c) => (<li key={c.id}>
                <Link href={`/compliance/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-muted/50" data-testid="past-check">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">{KIND_WORD[c.kind] ?? c.kind}</span>
                  <span className="min-w-0 flex-1 truncate">{c.summary || c.id}</span>
                  <span className={cn("font-semibold", VERDICT_TONE[c.verdict])}>{VERDICT_LABEL[c.verdict]}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.findings} finding{c.findings === 1 ? "" : "s"} · {when(c.created_at)}
                  </span>
                </Link>
              </li>))}
          </ul>) : (<p className="mt-2 text-sm text-muted-foreground">Nothing checked yet.</p>)}
      </section>
    </div>);
}
function SourceList({ title, icon: Icon, items, picked, onPick, empty }: {
    title: string;
    icon: typeof FileText;
    items: Source[];
    picked: Source | null;
    onPick: (s: Source) => void;
    empty: string;
}) {
    return (<div>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="size-4"/> {title}
      </h3>
      {items.length ? (<ul className="mt-2 flex flex-wrap gap-2" data-testid={`sources-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {items.map((s) => (<li key={s.ref}>
              <button type="button" onClick={() => onPick(s)} aria-pressed={picked?.ref === s.ref} className={cn("flex max-w-xs items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm", picked?.ref === s.ref ? "border-primary bg-accent text-primary" : "bg-background hover:bg-muted")} data-testid="source-item">
                {s.thumb && <img src={s.thumb} alt="" className="size-9 shrink-0 rounded object-cover"/>}
                <span className="truncate">{s.label}</span>
              </button>
            </li>))}
        </ul>) : (<p className="mt-1 text-xs text-muted-foreground">{empty}</p>)}
    </div>);
}
