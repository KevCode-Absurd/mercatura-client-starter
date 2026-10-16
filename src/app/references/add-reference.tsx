"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXT = [".mp4", ".mov", ".webm"];
const ACCEPT = [...IMAGE_EXT, ...VIDEO_EXT];
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 15 * 60;
const THUMB_WIDTH = 480;
type ItemState = "ready" | "invalid" | "preparing" | "uploading" | "done" | "duplicate" | "failed";
interface Item {
    key: string;
    file: File;
    state: ItemState;
    progress: number;
    message?: string;
}
type UploadResult = {
    ok: true;
    id: string;
    duplicate: boolean;
    analysis: boolean;
} | {
    ok: false;
    error: string;
};
interface Probe {
    thumb: Blob | null;
    width?: number;
    height?: number;
    duration?: number;
}
const extOf = (name: string) => (name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
const mb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
function validate(file: File): string | null {
    if (!ACCEPT.includes(extOf(file.name)))
        return "Not supported. Use a JPG, PNG, WebP, MP4, MOV or WebM file.";
    if (file.size > MAX_BYTES)
        return `Too large (${mb(file.size)}). The limit is 100 MB.`;
    if (file.size === 0)
        return "The file is empty.";
    return null;
}
function toJpeg(src: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (!w || !h)
            return resolve(null);
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(THUMB_WIDTH, w);
        canvas.height = Math.max(1, Math.round((h * canvas.width) / w));
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return resolve(null);
        try {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, "image/jpeg", 0.82);
        }
        catch {
            resolve(null);
        }
    });
}
function probeImage(file: File): Promise<Probe> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const end = (p: Probe) => {
            URL.revokeObjectURL(url);
            resolve(p);
        };
        img.onload = async () => end({ thumb: await toJpeg(img, img.naturalWidth, img.naturalHeight), width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => end({ thumb: null });
        img.src = url;
    });
}
function probeVideo(file: File): Promise<Probe> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        const known: Probe = { thumb: null };
        let finished = false;
        const end = () => {
            if (finished)
                return;
            finished = true;
            clearTimeout(timer);
            video.removeAttribute("src");
            video.load();
            URL.revokeObjectURL(url);
            resolve(known);
        };
        const timer = setTimeout(end, 12000);
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onloadedmetadata = () => {
            known.width = video.videoWidth;
            known.height = video.videoHeight;
            if (Number.isFinite(video.duration) && video.duration > 0)
                known.duration = video.duration;
            video.currentTime = known.duration ? Math.min(Math.max(0.1, known.duration * 0.1), Math.max(0, known.duration - 0.05)) : 0.1;
        };
        video.onseeked = async () => {
            known.thumb = await toJpeg(video, video.videoWidth, video.videoHeight);
            end();
        };
        video.onerror = end;
        video.src = url;
    });
}
function send(form: FormData, onProgress: (pct: number) => void): Promise<UploadResult> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/references/upload");
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
        xhr.onload = () => {
            try {
                resolve(JSON.parse(xhr.responseText) as UploadResult);
            }
            catch {
                resolve({ ok: false, error: `Upload failed (${xhr.status}).` });
            }
        };
        xhr.onerror = () => resolve({ ok: false, error: "Upload failed. Check your connection and try again." });
        xhr.send(form);
    });
}
const STATE_LABEL: Record<ItemState, string> = {
    ready: "Ready",
    invalid: "Can't add",
    preparing: "Preparing",
    uploading: "Uploading",
    done: "Added",
    duplicate: "Already in the library",
    failed: "Failed",
};
export const filesOf = (data: DataTransfer | null): File[] => Array.from(data?.files ?? []);
export function AddReferenceDialog({ analysisEnabled, initial, onClose, onOpenReference }: {
    analysisEnabled: boolean;
    initial?: File[];
    onClose: () => void;
    onOpenReference: (id: string) => void;
}) {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);
    const advanced = useAdvanced();
    const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
    const add = (files: FileList | File[] | null) => {
        if (!files)
            return;
        const picked = Array.from(files);
        setItems((list) => {
            const have = new Set(list.map((i) => i.key));
            const next = [...list];
            for (const file of picked) {
                const key = `${file.name}:${file.size}:${file.lastModified}`;
                if (have.has(key))
                    continue;
                have.add(key);
                const error = validate(file);
                next.push({ key, file, state: error ? "invalid" : "ready", progress: 0, message: error ?? undefined });
            }
            return next;
        });
    };
    useEffect(() => {
        if (initial?.length)
            add(initial);
        const onPaste = (e: ClipboardEvent) => {
            const files = filesOf(e.clipboardData);
            if (!files.length)
                return;
            e.preventDefault();
            add(files);
        };
        window.addEventListener("paste", onPaste);
        return () => window.removeEventListener("paste", onPaste);
    }, []);
    const todo = items.filter((i) => i.state === "ready" || i.state === "failed");
    const single = items.filter((i) => i.state !== "invalid").length <= 1;
    const upload = async () => {
        setBusy(true);
        let added = 0;
        let failed = 0;
        let lastId: string | null = null;
        const duplicates: {
            id: string;
            name: string;
        }[] = [];
        for (const item of todo) {
            const video = VIDEO_EXT.includes(extOf(item.file.name));
            patch(item.key, { state: "preparing", progress: 0, message: undefined });
            const probe = await (video ? probeVideo(item.file) : probeImage(item.file));
            if (video && probe.duration && probe.duration > MAX_VIDEO_SECONDS) {
                failed++;
                patch(item.key, { state: "failed", message: "Videos over 15 minutes aren't supported." });
                continue;
            }
            const form = new FormData();
            form.set("file", item.file);
            if (probe.thumb && probe.thumb.size < 2 * 1024 * 1024)
                form.set("thumb", probe.thumb, "thumb.jpg");
            if (probe.width)
                form.set("width", String(probe.width));
            if (probe.height)
                form.set("height", String(probe.height));
            if (probe.duration)
                form.set("duration", String(probe.duration));
            if (single && title.trim())
                form.set("title", title.trim());
            if (notes.trim())
                form.set("notes", notes.trim());
            patch(item.key, { state: "uploading" });
            const res = await send(form, (progress) => patch(item.key, { progress }));
            if (!res.ok) {
                failed++;
                patch(item.key, { state: "failed", message: res.error });
            }
            else if (res.duplicate) {
                duplicates.push({ id: res.id, name: item.file.name });
                patch(item.key, { state: "duplicate", progress: 100 });
            }
            else {
                added++;
                lastId = res.id;
                patch(item.key, { state: "done", progress: 100 });
            }
        }
        setBusy(false);
        router.refresh();
        if (added)
            toast.success(`${added === 1 ? "Reference added" : `${added} references added`}. ${analysisEnabled ? "Analysis is queued." : "Analysis is off, so it is saved without one."}`);
        if (duplicates.length)
            toast.info(`Already in the library: ${duplicates.map((d) => d.name).join(", ")}`);
        if (failed) {
            toast.error(`${failed} ${failed === 1 ? "file" : "files"} could not be added.`);
            return;
        }
        onClose();
        if (duplicates.length)
            onOpenReference(duplicates[0].id);
        else if (added === 1 && lastId)
            onOpenReference(lastId);
    };
    return (<Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="add-ref-dialog">
        <DialogHeader>
          <DialogTitle>Add reference</DialogTitle>
          <DialogDescription>
            Add your own reference ads, images or videos. {analysisEnabled ? "Each one is analysed after it uploads." : advanced ? "Analysis is off (it needs live mode and a Gemini key in .env), so they are saved without one." : "Analysis is switched off on this account, so they are saved without one."}
          </DialogDescription>
        </DialogHeader>

        <div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()} onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
        }} onDragLeave={() => setOver(false)} onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (!busy)
                add(e.dataTransfer.files);
        }} className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm ${over ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} data-testid="add-ref-dropzone">
          <Upload className="size-5 text-muted-foreground"/>
          <div>Drop files here, paste one you copied, or click to choose</div>
          <div className="text-xs text-muted-foreground">JPG, PNG, WebP, MP4, MOV or WebM. Up to 100 MB each, videos up to 15 minutes.</div>
          <input ref={input} type="file" multiple accept={ACCEPT.join(",")} className="hidden" disabled={busy} onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
        }} data-testid="add-ref-file-input"/>
        </div>

        {items.length > 0 && (<ul className="max-h-48 space-y-1.5 overflow-y-auto" data-testid="add-ref-files">
            {items.map((i) => (<li key={i.key} className="rounded-md border px-2 py-1.5 text-xs" data-testid="add-ref-file" data-state={i.state}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{i.file.name}</span>
                  <span className="text-muted-foreground">{mb(i.file.size)}</span>
                  <span className={i.state === "invalid" || i.state === "failed" ? "text-red-600" : i.state === "done" ? "text-emerald-700" : "text-muted-foreground"}>
                    {(i.state === "preparing" || i.state === "uploading") && <Loader2 className="mr-1 inline size-3 animate-spin"/>}
                    {STATE_LABEL[i.state]}
                    {i.state === "uploading" && ` ${Math.round(i.progress)}%`}
                  </span>
                  {!busy && i.state !== "done" && i.state !== "duplicate" && (<button type="button" aria-label={`Remove ${i.file.name}`} onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}>
                      <X className="size-3.5 text-muted-foreground hover:text-foreground"/>
                    </button>)}
                </div>
                {i.state === "uploading" && <Progress value={i.progress} className="mt-1 h-1"/>}
                {i.message && <div className="mt-0.5 text-red-600">{i.message}</div>}
              </li>))}
          </ul>)}

        <div className="space-y-1.5">
          <Label htmlFor="add-ref-title">Title (optional)</Label>
          <Input id="add-ref-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy || !single} maxLength={200} placeholder={single ? "Defaults to the file name" : "With several files, each one keeps its file name"} data-testid="add-ref-title"/>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-ref-notes">What do you want to borrow from this ad?</Label>
          <Textarea id="add-ref-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={busy} maxLength={2000} rows={3} placeholder="For example: the hook, the pacing, how the product is shown" data-testid="add-ref-notes"/>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={upload} disabled={busy || todo.length === 0} data-testid="add-ref-submit">
            {busy && <Loader2 className="size-4 animate-spin"/>}
            {busy ? "Adding" : todo.length > 1 ? `Add ${todo.length} references` : "Add reference"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
