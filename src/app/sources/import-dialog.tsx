"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { SOURCE_INFO, type CustomerSource } from "@/lib/taxonomy";
import { importAction, previewImportAction, type PreviewResult } from "./actions";
const ACCEPT: Record<CustomerSource, string> = {
    call: ".txt,.vtt,.srt,.json",
    ticket: ".csv,.json",
    review: ".csv,.json",
    survey: ".csv,.json",
    community: ".json,.csv",
};
const NONE = "__none";
type Files = {
    name: string;
    content: string;
}[];
export function ImportDialog({ type, live }: {
    type: CustomerSource;
    live: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<Files>([]);
    const [paste, setPaste] = useState("");
    const [pasteUrl, setPasteUrl] = useState("");
    const [preview, setPreview] = useState<Extract<PreviewResult, {
        ok: true;
    }> | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [extractAfter, setExtractAfter] = useState(live);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const advanced = useAdvanced();
    const reset = () => {
        setFiles([]);
        setPaste("");
        setPasteUrl("");
        setPreview(null);
        setMapping({});
        setError(null);
    };
    const loadPreview = (fs: Files) => start(async () => {
        setError(null);
        const res = await previewImportAction(type, fs);
        if (!res.ok) {
            setError(res.error);
            setPreview(null);
            return;
        }
        setPreview(res);
        if (res.kind === "table")
            setMapping(res.mapping);
    });
    const onFiles = async (list: FileList | null) => {
        if (!list?.length)
            return;
        const fs = await Promise.all([...list].map(async (f) => ({ name: f.name, content: await f.text() })));
        setFiles(fs);
        loadPreview(fs);
    };
    const usePaste = () => {
        const fs: Files = type === "community"
            ? [{ name: "paste.json", content: JSON.stringify([{ url: pasteUrl, body: paste, date: new Date().toISOString().slice(0, 10) }]) }]
            : [{ name: type === "call" ? "paste.txt" : "paste.csv", content: paste }];
        setFiles(fs);
        loadPreview(fs);
    };
    const submit = () => start(async () => {
        const res = await importAction(type, files, preview?.kind === "table" ? mapping : null, extractAfter && live);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        toast.success(`Imported ${res.items} items. ${extractAfter && live ? "They are being prepared and read for insights." : "They are being prepared."}`);
        setOpen(false);
        reset();
        router.refresh();
    });
    const setField = (key: string, value: string) => setMapping((m) => ({ ...m, [key]: value }));
    const toggleMulti = (key: string, col: string) => setMapping((m) => {
        const cur = (m[key] ?? "").split(",").filter(Boolean);
        const next = cur.includes(col) ? cur.filter((c) => c !== col) : [...cur, col];
        return { ...m, [key]: next.join(",") };
    });
    return (<Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o)
        reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="import-button">
          <Upload className="size-4"/>
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle>Import {SOURCE_INFO[type].label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Accepted: {ACCEPT[type].replaceAll(",", ", ")}. {advanced ? "Names, emails and order numbers are redacted before anything reaches Claude." : "Names, emails and order numbers are taken out before anything is read."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" multiple={type === "call"} accept={ACCEPT[type]} onChange={(e) => onFiles(e.target.files)} className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1" data-testid="import-file"/>
            {files.length > 0 && <span className="text-xs text-muted-foreground">{files.map((f) => f.name).join(", ")}</span>}
          </div>

          {(type === "call" || type === "community") && (<details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Or paste {type === "call" ? "a transcript" : "a post (link + text)"}</summary>
              <div className="mt-2 space-y-2">
                {type === "community" && (<input className="w-full rounded-md border px-2 py-1 text-sm" placeholder="https://..." value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)}/>)}
                <Textarea rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={type === "call" ? "Agent: ...\nCustomer: ..." : "Post text"}/>
                <Button size="sm" variant="outline" onClick={usePaste} disabled={!paste.trim()}>
                  Use pasted text
                </Button>
              </div>
            </details>)}

          {pending && !preview && <p className="text-muted-foreground">Reading...</p>}
          {error && <p className="rounded bg-red-50 p-2 text-red-700">{error}</p>}

          {preview?.kind === "call" && (<div className="space-y-2">
              {preview.calls.map((c, i) => (<div key={i} className="rounded-md border p-2">
                  <div className="text-xs font-medium">
                    {c.file}: {c.turns} turns, {c.customerTurns} from the customer
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {c.sample.map((t, k) => (<li key={k}>
                        <span className="font-medium">{t.role}:</span> {t.text}
                      </li>))}
                  </ul>
                </div>))}
            </div>)}

          {preview?.kind === "table" && (<div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {preview.total} rows. Match each field to a column. Your choice is saved for next time.
              </p>
              <div className="grid gap-2 sm:grid-cols-2" data-testid="column-mapping">
                {preview.fields.map((f) => (<div key={f.key} className="space-y-1">
                    <div className="text-xs font-medium">
                      {f.label}
                      {f.required && <span className="text-red-600"> *</span>}
                      {f.pii && <span className="font-normal text-muted-foreground"> (not stored)</span>}
                    </div>
                    {f.multi ? (<div className="flex flex-wrap gap-1">
                        {preview.columns.map((c) => {
                        const on = (mapping[f.key] ?? "").split(",").includes(c);
                        return (<label key={c} className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
                              <Checkbox checked={on} onCheckedChange={() => toggleMulti(f.key, c)}/>
                              {c}
                            </label>);
                    })}
                      </div>) : (<Select value={mapping[f.key] || NONE} onValueChange={(v) => setField(f.key, v === NONE ? "" : v)}>
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>(none)</SelectItem>
                          {preview.columns.map((c) => (<SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>)}
                  </div>))}
              </div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      {preview.columns.map((c) => (<th key={c} className="px-2 py-1 font-medium whitespace-nowrap">
                          {c}
                        </th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (<tr key={i} className="border-t align-top">
                        {preview.columns.map((c) => (<td key={c} className="max-w-48 truncate px-2 py-1" title={r[c]}>
                            {r[c]}
                          </td>))}
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </div>)}

          <label className="flex items-center gap-2">
            <Checkbox checked={extractAfter && live} onCheckedChange={(v) => setExtractAfter(!!v)} disabled={!live}/>
            Read for insights straight after import
            {advanced ? <span className="text-xs text-muted-foreground">{live ? "(uses Claude; counts toward the spend cap)" : "(needs LLM_MODE=live)"}</span> : !live && <span className="text-xs text-muted-foreground">(not switched on for this account)</span>}
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !preview} data-testid="import-submit">
              {pending && preview ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
