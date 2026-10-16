"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdvanced } from "@/components/mode";
import type { BrandLook } from "@/lib/brand-look";
import { scanBrandLookAction } from "./actions";
import { lookIntoGuidelinesAction } from "./brain-actions";
import { LogoUpload } from "./product-photos";
import { BrandFontsBox, type BrandFontFamily } from "@/components/brand-fonts-box";
const file = (name: string, w?: number) => `/api/brand-file/look/${encodeURIComponent(name)}${w ? `?w=${w}` : ""}`;
const ROLE: Record<string, string> = { heading: "Headlines", display: "Big statement lines", body: "Body text", accent: "Small tags" };
export function BrandLookCard({ look, defaultUrl, embedded = false, tools, fonts = [] }: {
    look: BrandLook | null;
    defaultUrl: string;
    embedded?: boolean;
    tools?: React.ReactNode;
    fonts?: BrandFontFamily[];
}) {
    const router = useRouter();
    const [url, setUrl] = useState(look?.site_url ?? defaultUrl);
    const [pending, start] = useTransition();
    const [warnings, setWarnings] = useState<string[]>([]);
    const advanced = useAdvanced();
    const scan = () => start(async () => {
        const res = await scanBrandLookAction(url);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setWarnings(res.warnings);
        const filled = embedded ? await lookIntoGuidelinesAction() : null;
        toast.success(filled?.ok ? "Fonts, colours and logo read from the site, and written below." : "Fonts, colours and logo read from the site.");
        router.refresh();
    });
    const body = (<>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.com" className="h-8 max-w-sm" aria-label="Website address" data-testid="look-url"/>
          <Button size="sm" variant={look ? "outline" : "default"} onClick={scan} disabled={pending || url.trim().length < 4} data-testid="look-scan">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <ScanSearch className="size-4"/>}
            {pending ? "Reading the site (about 30 seconds)" : look ? "Scan again" : "Scan the site"}
          </Button>
          {look && <span className="text-xs text-muted-foreground">Last read {new Date(look.scanned_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>}
          {tools}
        </div>
        {warnings.map((w) => (<p key={w} className="text-xs text-amber-700">
            {w}
          </p>))}

        <div data-testid="look-font-files">
          <div className="mb-1 text-xs text-muted-foreground">Font files, for editing the words on an ad as real type</div>
          <BrandFontsBox families={fonts} siteUrl={look?.site_url ?? defaultUrl}/>
        </div>

        {look && (<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="space-y-4">
              {!embedded && (<>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Type</div>
                <table className="w-full">
                  <tbody>
                    {look.fonts.map((f) => (<tr key={f.role} className="border-t first:border-t-0" data-testid="look-font">
                        <td className="w-36 py-1.5 align-top text-muted-foreground">{ROLE[f.role] ?? f.role}</td>
                        <td className="py-1.5">
                          <span className="font-medium">{f.family}</span>, weight {f.weight}
                          {f.letter_case !== "sentence" ? `, ${f.letter_case} case` : ""}
                          {f.tracking !== "normal" ? `, tracking ${f.tracking}` : ""}
                          {f.use && <span className="block text-xs text-muted-foreground">On the site: {f.use}.</span>}
                          {advanced && (<span className="block text-xs text-muted-foreground">
                            Described to the image model as: {f.attributes}
                            {f.well_known ? `, the typeface ${f.family}` : f.lookalike ? `, similar in feel to ${f.lookalike}` : ""}
                          </span>)}
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Colours</div>
                <div className="flex flex-wrap gap-2">
                  {look.palette.map((c) => (<div key={c.role + c.hex} className="flex items-center gap-2 rounded-md border px-2 py-1" title={c.use} data-testid="look-color">
                      <span className="size-6 rounded border" style={{ background: c.hex }}/>
                      <span>
                        <span className="capitalize">{c.role}</span>: {c.name}
                        <span className="block font-mono text-xs text-muted-foreground">{c.hex.toUpperCase()}</span>
                      </span>
                    </div>))}
                </div>
              </div>
              </>)}
              <dl className={embedded ? "grid gap-x-4 gap-y-2 sm:grid-cols-[13rem_1fr]" : "grid gap-x-4 gap-y-1 md:grid-cols-[9rem_1fr]"}>
                {look.button && (<>
                    <dt className="text-muted-foreground">Button</dt>
                    <dd>{look.button}</dd>
                  </>)}
                {look.aesthetic && (<>
                    <dt className="text-muted-foreground">Feel</dt>
                    <dd>{look.aesthetic}</dd>
                  </>)}
                {look.vertical && (<>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{look.vertical} (used to find reference ads that suit this brand)</dd>
                  </>)}
                <dt className="text-muted-foreground">Logo</dt>
                <dd>
                  {look.logo ? (<img src={file(look.logo)} alt="Brand logo as captured" className="h-10 rounded border bg-neutral-400 object-contain p-1"/>) : (<span className="text-amber-700">Not found on the site. Upload it here.</span>)}
                  <span className="ml-2 inline-block align-middle">
                    <LogoUpload has={!!look.logo}/>
                  </span>
                </dd>
              </dl>
            </div>
            <div className="space-y-2">
              {look.specimen && (<a href={file(look.specimen)} target="_blank" rel="noreferrer" title="Open the type specimen">

                  <img src={file(look.specimen, 520)} alt="Type specimen in the brand's own fonts" className="w-full rounded border" data-testid="look-specimen"/>
                </a>)}
              {look.homepage && (<a href={file(look.homepage)} target="_blank" rel="noreferrer" title="Open the homepage capture">

                  <img src={file(look.homepage, 520)} alt="The brand's homepage as scanned" className="w-full rounded border"/>
                </a>)}
            </div>
          </div>)}
    </>);
    if (embedded)
        return (<div className="space-y-4 text-sm" id="brand-look" data-testid="brand-look">
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">The colours and typefaces here are read from the brand&apos;s website, so every image is set in its real type and colours. Read the site again and the rows below are filled in; a row you changed yourself is kept.</p>
        {body}
      </div>);
    return (<Card className="lg:col-span-2" id="brand-look" data-testid="brand-look">
      <CardHeader>
        <CardTitle className="text-base">Brand look: fonts, colours and logo</CardTitle>
        <CardDescription>Read from the brand&apos;s live website, so images are set in its real type and colours. The specimen below is used for every image that has words on it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">{body}</CardContent>
    </Card>);
}
