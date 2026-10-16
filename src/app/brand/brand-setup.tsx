"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Globe, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { cn } from "@/lib/utils";
import { convertBrandBrainAction, readSiteForBrainAction, saveBrandNotesAction } from "./actions";
interface Props {
    brandName: string;
    files: string[];
    folder: string;
    notes: string;
    founder: {
        answered: number;
        total: number;
        saved: boolean;
    };
    live: boolean;
    invalid: string | null;
}
export function BrandSetup({ brandName, files, folder, notes: savedNotes, founder, live, invalid }: Props) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState(savedNotes);
    const [reading, startRead] = useTransition();
    const [saving, startSave] = useTransition();
    const [building, startBuild] = useTransition();
    const advanced = useAdvanced();
    const hasSite = files.includes("website.md");
    const hasNotes = files.includes("notes.md");
    const others = files.filter((f) => !["website.md", "notes.md", "founder-interview.md"].includes(f));
    const ready = files.length > 0;
    const read = () => startRead(async () => {
        const res = await readSiteForBrainAction(url);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(`Read ${res.pages} page${res.pages === 1 ? "" : "s"} of the site.`);
        router.refresh();
    });
    const save = () => startSave(async () => {
        const res = await saveBrandNotesAction(notes);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(res.chars ? "Notes saved." : "Notes removed.");
        router.refresh();
    });
    const build = () => startBuild(async () => {
        const res = await convertBrandBrainAction();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("The brand brain is built. Read it through: check the products, the prices and every claim.");
        router.refresh();
    });
    return (<div className="max-w-4xl space-y-5 p-6" data-testid="brand-setup">
      {invalid && (<p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-testid="brain-invalid">
          {advanced ? <>The brand brain file exists but does not load: {invalid} Build it again below, or fix the file by hand.</> : "The brand brain could not be opened. Build it again below."}
        </p>)}
      <div>
        <h2 className="display text-2xl">Tell the app about {brandName}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">The brand brain is what every ad is written from: what the brand sells, at what price, what it may claim, who buys it and how it talks. It is built once from what you give here. Any 1 of the 3 is enough; more gives a fuller brain.</p>
      </div>

      <ol className="space-y-3">
        <Way n={1} icon={Globe} title="The brand's website" done={hasSite} note={advanced ? "Fastest. The app opens the homepage and up to 8 pages about what the brand sells, and keeps their text. Nothing is paid for." : "Fastest. The app opens the homepage and up to 8 pages about what the brand sells, and keeps their text."}>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.com" className="h-9 max-w-sm" aria-label="The brand's website address" data-testid="setup-url"/>
            <Button size="sm" variant={hasSite ? "outline" : "default"} onClick={read} disabled={reading || !url.trim()} data-testid="setup-read-site">
              {reading ? <Loader2 className="size-4 animate-spin"/> : <Globe className="size-4"/>}
              {reading ? "Reading (about 1 minute)" : hasSite ? "Read again" : "Read the website"}
            </Button>
          </div>
        </Way>

        <Way n={2} icon={FileText} title="What you already have written down" done={hasNotes || others.length > 0} note={advanced ? "Paste a product sheet, a price list, a brand guide or a brief. Or put documents (.md files) straight into the brand's folder." : "Paste a product sheet, a price list, a brand guide or a brief."}>
          <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste anything about the brand: products and prices, what it may and may not claim, who buys it, how it talks." data-testid="setup-notes"/>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={save} disabled={saving || notes.trim() === savedNotes.trim()} data-testid="setup-save-notes">
              {saving ? <Loader2 className="size-4 animate-spin"/> : null}
              Save the notes
            </Button>
            <span className="min-w-0 text-xs text-muted-foreground" title={advanced ? folder : undefined}>
              {advanced ? (others.length ? `Documents in the folder: ${others.join(", ")}.` : "No other documents in the brand's folder yet.") : others.length ? `${others.length} other document${others.length === 1 ? "" : "s"} added.` : "No other documents added yet."}
            </span>
          </div>
        </Way>

        <Way n={3} icon={MessageSquareText} title="The founder's answers" done={founder.saved} note="What no document says: why the product exists, what buyers ask, what was tried. About 20 minutes, typed or spoken. Answer any, skip any.">
          <Button size="sm" variant="outline" asChild>
            <Link href="/brand/founder" data-testid="setup-founder">
              {founder.answered ? `Open the questionnaire (${founder.answered} of ${founder.total} answered)` : "Start the questionnaire"}
            </Link>
          </Button>
          {founder.answered > 0 && !founder.saved && <span className="ml-3 text-xs text-amber-700">Press &ldquo;Save the answers&rdquo; at the end of the questionnaire so the answers are used.</span>}
        </Way>
      </ol>

      <div className={cn("flex flex-wrap items-center gap-4 rounded-lg border-2 p-4", ready ? "border-foreground" : "border-dashed")}>
        <div className="min-w-0 flex-1">
          <div className="font-bold">Build the brand brain</div>
          <p className="text-sm text-muted-foreground" data-testid="setup-state">
            {!ready ? "Give the app at least 1 of the 3 above first." : !live ? "Not switched on for this account." : advanced ? `Built from ${files.length} document${files.length === 1 ? "" : "s"}: ${files.join(", ")}. About 5 cents and 1 minute. You can edit everything afterwards.` : `Built from ${files.length} document${files.length === 1 ? "" : "s"}. About 1 minute.`}
          </p>
        </div>
        <Button onClick={build} disabled={!ready || !live || building} data-testid="setup-build">
          {building ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
          {building ? "Building" : "Build the brand brain"}
        </Button>
      </div>
    </div>);
}
function Way({ n, icon: Icon, title, note, done, children }: {
    n: number;
    icon: typeof Globe;
    title: string;
    note: string;
    done: boolean;
    children: React.ReactNode;
}) {
    return (<li className={cn("rounded-lg border p-4", done && "border-emerald-300 bg-emerald-50/40")} data-testid={`setup-way-${n}`} data-done={done ? "yes" : "no"}>
      <div className="flex items-start gap-3">
        {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600"/> : <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground"/>}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <p className="mb-2.5 text-sm text-muted-foreground">{note}</p>
          {children}
        </div>
      </div>
    </li>);
}
