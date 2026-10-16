import Link from "next/link";
import { ArrowRight, FileText, FileUp, Images, LayoutTemplate, Lightbulb, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { libraryCounts } from "@/lib/library/import";
import { llmEnabled } from "@/lib/llm/gateway";
import { getConcepts, getScripts } from "@/lib/queries";
import { listRuns } from "@/lib/studio/engine";
import { UploadScript } from "./upload-script";
const card = "group flex h-full flex-col rounded-xl border bg-card p-5 text-left transition hover:border-primary/60 hover:bg-primary/5";
export default async function AdsHubPage() {
    const row = await activeBrand();
    const concepts = getConcepts(row.id).map((c) => ({ id: c.id, name: c.name }));
    const scripts = getScripts(row.id).length;
    const ads = libraryCounts().ad;
    const sets = listRuns(row.id, "ad").length;
    const live = llmEnabled();
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/studio", label: "Back" }} title="Create ads" subtitle={`5 ways to start an ad for ${row.name}. They all end in the same place: finished images in the brand's look, checked against the real product.`}/>
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <Link href="/studio/new?kind=ad" className={card} data-testid="ads-layouts">
          <LayoutTemplate className="size-6 text-primary"/>
          <h2 className="mt-3 text-base font-semibold">From a winning layout</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">Pick a product and layouts from {ads ? ads.usable.toLocaleString("en-US") : "the"} winning static ads, sorted by type and funnel stage. The app writes the words from your research and claims, and makes each ad.</p>
          <p className="mt-3 text-xs text-muted-foreground">Fastest. No script needed.{sets ? ` ${sets} set${sets === 1 ? "" : "s"} made.` : ""}</p>
          <Go />
        </Link>

        <Link href="/studio/concept" className={card} data-testid="ads-concept">
          <Lightbulb className="size-6 text-primary"/>
          <h2 className="mt-3 text-base font-semibold">A concept ad for cold audiences</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">No layout to follow. Each ad is 1 argument for 1 buyer, shown as 1 picture in 1 visual world: a miniature diorama, a thermal image, a comic panel, a billboard on a street. 23 worlds to pick from.</p>
          <p className="mt-3 text-xs text-muted-foreground">For people who have never heard of the brand. New.</p>
          <Go />
        </Link>

        <Link href="/scripts" className={card} data-testid="ads-research">
          <Sparkles className="size-6 text-primary"/>
          <h2 className="mt-3 text-base font-semibold">From your research</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">Write scripts from what customers said (concepts and themes), in many script types and feels, then turn a script into static images, a carousel or a native ad.</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {scripts} script{scripts === 1 ? "" : "s"} so far. Use &quot;Make assets&quot; on any script.
          </p>
          <Go />
        </Link>

        <UploadScript concepts={concepts} live={live}>
          <button type="button" className={card} data-testid="ads-upload">
            <FileUp className="size-6 text-primary"/>
            <h2 className="mt-3 text-base font-semibold">Upload your own script</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">Bring a script you already have as a Word file, a PDF or pasted text. It is kept word for word, checked, and then made into ads in any format.</p>
            <p className="mt-3 text-xs text-muted-foreground">Nothing is rewritten.</p>
            <Go label="Upload"/>
          </button>
        </UploadScript>

        <Link href="/references" className={card} data-testid="ads-reference">
          <Images className="size-6 text-primary"/>
          <h2 className="mt-3 text-base font-semibold">From a reference ad</h2>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">Add an ad you like, or pick one from the reference library, and choose how closely to follow it: the same ad in a new format, the same structure with your words, or loose inspiration.</p>
          <p className="mt-3 text-xs text-muted-foreground">Images and video references.</p>
          <Go />
        </Link>
      </div>
      <div className="px-6 pb-6">
        <Link href="/production" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <FileText className="size-4"/>
          Ads made from scripts are on the Production board
        </Link>
      </div>
    </div>);
}
function Go({ label = "Start" }: {
    label?: string;
}) {
    return (<span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
      {label} <ArrowRight className="size-4 transition group-hover:translate-x-0.5"/>
    </span>);
}
