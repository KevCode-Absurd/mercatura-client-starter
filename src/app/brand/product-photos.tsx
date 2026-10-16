"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductPhotos } from "@/lib/product-photos";
import { cn } from "@/lib/utils";
import { removeProductPhotoAction, setMainPhotoAction } from "./photo-actions";
const url = (folder: string, f: string, w = 200) => `/api/brand-file/assets/${encodeURIComponent(folder)}/${encodeURIComponent(f)}?w=${w}`;
async function send(form: FormData): Promise<{
    ok: boolean;
    error?: string;
    saved?: number;
}> {
    const res = await fetch("/api/brand/product-photos", { method: "POST", body: form });
    return (await res.json()) as {
        ok: boolean;
        error?: string;
        saved?: number;
    };
}
export function ProductPhotosCard({ products, names }: {
    products: ProductPhotos[];
    names: Record<string, string>;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const upload = async (productId: string, files: FileList | null) => {
        if (!files?.length)
            return;
        setBusy(productId);
        try {
            const form = new FormData();
            form.set("product", productId);
            for (const f of Array.from(files))
                form.append("file", f);
            const data = await send(form);
            if (!data.ok)
                return void toast.error(data.error ?? "The upload failed.");
            toast.success(`${data.saved} photo${data.saved === 1 ? "" : "s"} added.`);
            router.refresh();
        }
        finally {
            setBusy(null);
        }
    };
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done: string) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(done);
        router.refresh();
    });
    return (<Card className="lg:col-span-2" id="product-photos" data-testid="product-photos-card">
      <CardHeader>
        <CardTitle className="text-base">Product photos</CardTitle>
        <CardDescription>Every image the app makes is built from real photos of the product. Add clean shots of each one: the product on its own on a plain background first, then in use. The main photo is the one the product is copied from.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {products.map((p) => (<div key={p.product_id} className="rounded-md border p-3" data-testid={`photos-${p.product_id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{names[p.product_id] ?? p.product_id}</div>
                <div className={cn("text-xs", p.files.length ? "text-muted-foreground" : "text-amber-700")}>{p.files.length ? `${p.files.length} photo${p.files.length === 1 ? "" : "s"}` : "No photo yet. Images of this product can't be made until it has one."}</div>
              </div>
              <UploadButton label={p.files.length ? "Add photos" : "Upload photos"} primary={!p.files.length} busy={busy === p.product_id} multiple onFiles={(f) => void upload(p.product_id, f)} testid={`upload-${p.product_id}`}/>
            </div>
            {p.files.length > 0 && (<ul className="mt-3 flex flex-wrap gap-2">
                {p.files.map((f) => (<li key={f} className={cn("group relative rounded border bg-white p-0.5", f === p.main && "border-primary ring-1 ring-primary")} data-testid="product-photo">

                    <img src={url(p.folder, f)} alt={f} title={f} className="size-24 object-contain" loading="lazy"/>
                    {f === p.main && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">Main</span>}
                    <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-background/90 py-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      {f !== p.main && (<button type="button" disabled={pending} onClick={() => act(() => setMainPhotoAction(p.product_id, f), "Main photo changed.")} title="Make this the main photo" aria-label={`Make ${f} the main photo`} className="rounded p-1 hover:bg-muted">
                          <Star className="size-3.5"/>
                        </button>)}
                      <button type="button" disabled={pending} onClick={() => confirm("Remove this photo? It is deleted for good.") && act(() => removeProductPhotoAction(p.product_id, f), "Photo removed.")} title="Remove this photo" aria-label={`Remove ${f}`} className="rounded p-1 text-red-700 hover:bg-muted">
                        <Trash2 className="size-3.5"/>
                      </button>
                    </span>
                  </li>))}
              </ul>)}
          </div>))}
        {!products.length && <p className="text-muted-foreground">The brand brain lists no products yet.</p>}
      </CardContent>
    </Card>);
}
export function UploadButton({ label, onFiles, busy, multiple, primary, accept = "image/png,image/jpeg,image/webp", testid }: {
    label: string;
    onFiles: (f: FileList | null) => void;
    busy?: boolean;
    multiple?: boolean;
    primary?: boolean;
    accept?: string;
    testid?: string;
}) {
    const input = useRef<HTMLInputElement>(null);
    return (<>
      <input ref={input} type="file" accept={accept} multiple={multiple} className="hidden" data-testid={testid ? `${testid}-input` : undefined} onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
        }}/>
      <Button size="sm" variant={primary ? "default" : "outline"} disabled={busy} onClick={() => input.current?.click()} data-testid={testid}>
        {busy ? <Loader2 className="size-4 animate-spin"/> : <ImagePlus className="size-4"/>}
        {busy ? "Uploading" : label}
      </Button>
    </>);
}
export function LogoUpload({ has }: {
    has: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const upload = async (files: FileList | null) => {
        if (!files?.length)
            return;
        setBusy(true);
        try {
            const form = new FormData();
            form.set("kind", "logo");
            form.append("file", files[0]);
            const data = await send(form);
            if (!data.ok)
                return void toast.error(data.error ?? "The upload failed.");
            toast.success("Logo saved.");
            router.refresh();
        }
        finally {
            setBusy(false);
        }
    };
    return <UploadButton label={has ? "Replace the logo" : "Upload the logo"} busy={busy} accept="image/png,image/svg+xml,image/jpeg,image/webp" onFiles={(f) => void upload(f)} testid="upload-logo"/>;
}
