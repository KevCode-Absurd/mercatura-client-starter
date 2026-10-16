"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pullBrandFontsAction, removeBrandFontAction } from "@/app/brand/font-actions";
export interface BrandFontFamily {
    family: string;
    weights: number[];
    faces: {
        file: string;
        weight: string;
        style: string;
        from: string;
    }[];
}
export function BrandFontsBox({ families, siteUrl, compact = false }: {
    families: BrandFontFamily[];
    siteUrl: string;
    compact?: boolean;
}) {
    const router = useRouter();
    const [url, setUrl] = useState(siteUrl);
    const [pending, start] = useTransition();
    const [uploading, setUploading] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);
    const input = useRef<HTMLInputElement>(null);
    const pull = () => start(async () => {
        const res = await pullBrandFontsAction(url);
        if (!res.ok)
            return void toast.error(res.error);
        setWarnings(res.warnings);
        const n = new Set(res.files.filter((f) => f.from === "site").map((f) => f.family)).size;
        if (n)
            toast.success(`${n} font famil${n === 1 ? "y" : "ies"} read from the site.`);
        else
            toast.error("No font files could be read from the site. Upload them instead.");
        router.refresh();
    });
    const upload = async (files: FileList | null) => {
        if (!files?.length)
            return;
        setUploading(true);
        try {
            const form = new FormData();
            for (const f of Array.from(files))
                form.append("file", f);
            const res = await fetch("/api/brand/fonts", { method: "POST", body: form });
            const data = (await res.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!data.ok)
                return void toast.error(data.error ?? "The upload failed.");
            toast.success(files.length === 1 ? "Font saved." : `${files.length} fonts saved.`);
            router.refresh();
        }
        finally {
            setUploading(false);
        }
    };
    const remove = (family: BrandFontFamily) => start(async () => {
        for (const f of family.faces) {
            const res = await removeBrandFontAction(f.file);
            if (!res.ok)
                return void toast.error(res.error);
        }
        router.refresh();
    });
    return (<div className="space-y-2 text-sm" data-testid="brand-fonts">
      {families.length > 0 ? (<ul className="flex flex-wrap gap-1.5">
          {families.map((f) => (<li key={f.family} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-1 text-xs" data-testid="brand-font">
              <span className="font-medium">{f.family}</span>
              <span className="text-muted-foreground">
                {f.weights.length} weight{f.weights.length === 1 ? "" : "s"}
              </span>
              <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" title={`Remove ${f.family}`} aria-label={`Remove ${f.family}`} disabled={pending} onClick={() => confirm(`Remove ${f.family}? Lines set in it fall back to a standard font.`) && remove(f)}>
                <X className="size-3"/>
              </button>
            </li>))}
        </ul>) : (<p className="text-muted-foreground">{compact ? "The brand's own fonts are not here yet." : "No font files yet. Read them from the brand's website, or upload them, and the words editor sets every line in the brand's real typefaces."}</p>)}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.com" className="h-8 max-w-60 text-sm" aria-label="Website address" data-testid="fonts-url"/>
        <Button size="sm" variant="outline" onClick={pull} disabled={pending || url.trim().length < 4} data-testid="fonts-pull">
          {pending ? <Loader2 className="size-4 animate-spin"/> : <Globe className="size-4"/>}
          {pending ? "Reading the site" : families.length ? "Read the site again" : "Get the fonts from the site"}
        </Button>
        <input ref={input} type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" multiple className="hidden" data-testid="fonts-upload-input" onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
        }}/>
        <Button size="sm" variant="outline" onClick={() => input.current?.click()} disabled={uploading} data-testid="fonts-upload">
          {uploading ? <Loader2 className="size-4 animate-spin"/> : <Upload className="size-4"/>}
          Upload a font file
        </Button>
      </div>
      {warnings.map((w) => (<p key={w} className="text-xs text-amber-700">
          {w}
        </p>))}
      {!compact && <p className="text-xs text-muted-foreground">A brand&apos;s fonts are licensed to the brand. They are kept in its own folder and used only for its own images.</p>}
    </div>);
}
