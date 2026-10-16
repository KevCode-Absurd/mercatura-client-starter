import Link from "next/link";
import { ArrowRight, Camera, Layers, LayoutGrid, Megaphone, MessageSquare, Type } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandLook } from "@/lib/brand-look";
import { GALLERY } from "@/lib/format-gallery";
import { libraryCounts } from "@/lib/library/import";
import { KIND_INFO } from "@/lib/library/taxonomy";
import { COLUMN_LABELS, columnOf } from "@/lib/production/board";
import { createScreenData } from "@/lib/create-data";
import { OUTPUT_INFO } from "@/lib/taxonomy";
import { isAdvanced } from "@/lib/ui-mode-server";
import { cn } from "@/lib/utils";
import { exampleOf } from "../formats/examples";
import { CreatePills } from "./create-pills";
import { FormatFilter } from "./format-filter";
import { FormatTiles } from "./format-tiles";
import { KINDS, STATUS_LABEL, assetUrl, latestOutputs } from "./shared";
import { SPRINT_STATUS } from "./sprint/shared";
const ICON = { ad: Megaphone, pdp: LayoutGrid, photoshoot: Camera } as const;
const START: Record<"ad" | "pdp" | "photoshoot", {
    format: string;
    title: string;
    blurb: string;
    own: string;
}> = {
    ad: { format: "ad-layout", title: "Ads", blurb: "Static ads for Meta, built on layouts that have worked for other brands, with your product, your words and your colours.", own: "More ways to start an ad" },
    pdp: { format: "pdp", title: "Product images", blurb: "The images a product page is built from: what it does, the benefits, how it works, reviews, what makes it different.", own: "Choose each frame myself" },
    photoshoot: { format: "photoshoot", title: "Photoshoots", blurb: "Campaign photographs of your real product, rebuilt from proven looks. No words on them.", own: "Choose the looks myself" },
};
const AT_THE_TOP = [...Object.values(START).map((s) => s.format), "sprint"];
const FIRST_JOBS = 6;
const picture = "block aspect-[16/9] w-full overflow-hidden bg-muted";
function Picture({ id, icon: Icon }: {
    id: string;
    icon: typeof Megaphone;
}) {
    const example = exampleOf(id);
    return example ? (<img src={`/api/assets/${example}?w=640`} alt="" className="size-full object-cover object-top transition duration-300 group-hover:scale-[1.03]" loading="lazy"/>) : (<div className="flex size-full items-center justify-center text-muted-foreground">
      <Icon className="size-10"/>
    </div>);
}
export default async function StudioPage({ searchParams }: {
    searchParams: Promise<{
        all?: string;
        kind?: string;
    }>;
}) {
    const sp = await searchParams;
    const row = await activeBrand();
    const look = loadBrandLook(row.id);
    const counts = libraryCounts();
    const kind = (["ad", "pdp", "photoshoot"] as const).find((k) => k === sp.kind);
    const { total, counts: setCounts, ofKind, runs, sprints, jobs, jobCount } = createScreenData(row.id, { kind, all: !!sp.all });
    const advanced = await isAdvanced("create");
    const tiles = GALLERY.filter((f) => !AT_THE_TOP.includes(f.id)).length;
    const made = total + sprints.length + jobCount;
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Create" subtitle={row.name}>
        <Link href="/creative-portfolio" className="text-sm underline">Creative portfolio</Link>
        <Link href="/creative-lab" className="inline-flex h-10 items-center rounded-lg border bg-card px-4 text-sm font-medium text-primary" data-testid="open-creative-lab">Creative Lab</Link>
        <Link href="/references/competitors" className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-4 text-sm font-medium text-primary hover:border-primary/50" data-testid="create-competitor-playbook">Competitor playbook <ArrowRight className="size-4"/></Link>
        <Link href="/studio/creator" className="inline-flex h-10 items-center rounded-lg border bg-primary px-4 text-sm font-medium text-primary-foreground" data-testid="open-creator-studio">Create a video</Link>

        <Link href="/chat" className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-4 text-sm font-medium text-primary hover:border-primary/50" data-testid="create-chat">
          <MessageSquare className="size-4"/> Ask AI
        </Link>
      </PageHeader>
      <CreatePills parts={[
            { id: "start", label: "Start here" },
            { id: "formats", label: "More formats", count: tiles },
            { id: "yours", label: "Your creations", count: made },
        ]}/>
      <div className="space-y-8 px-6 pb-6 pt-6 max-md:px-4">
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-primary/20 bg-card p-5" data-testid="create-guided-brief">
          <div className="max-w-2xl"><h2 className="display text-2xl">Find your next creative direction</h2><p className="mt-2 text-sm text-muted-foreground">Turn your customer research into three concepts, each with three distinct variants. Review the brief, then take your chosen ideas into scripts and production.</p></div>
          <Link href="/studio/brief" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Plan my next ads <ArrowRight className="size-4"/></Link>
        </section>
        <section id="start" className="scroll-mt-28" data-testid="create-start">
          <h2 className="display text-3xl">Start here</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KINDS.map((k) => {
            const Icon = ICON[k.kind];
            const s = START[k.kind];
            const c = counts[k.kind];
            return (<div key={k.kind} className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/60 hover:shadow-sm" data-testid={`start-${k.kind}`}>
                  <Link href={`/formats/${s.format}`} className={picture} tabIndex={-1} aria-hidden="true">
                    <Picture id={s.format} icon={Icon}/>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="display flex items-center gap-2 text-2xl">
                      <Icon className="size-4 text-primary" aria-hidden="true"/>
                      {s.title}
                    </h3>
                    {advanced ? <p className="mt-2 text-xs text-muted-foreground">{c ? `${c.usable.toLocaleString("en-US")} references in the library` : "Library not imported yet (pnpm libraries:import)"}</p> : !c && <p className="mt-2 text-xs text-muted-foreground">The library for this is not set up yet.</p>}

                    <div className="mt-5 flex flex-col items-start gap-2">
                      <Link href={`/formats/${s.format}`} className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid={`quick-${k.kind}`}>
                        Quick start <ArrowRight className="size-4"/>
                      </Link>
                      <Link href={k.href} className="inline-flex min-h-10 items-center text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline" data-testid={`studio-${k.kind}`}>
                        {s.own}
                      </Link>
                    </div>
                  </div>
                </div>);
        })}
            <Link href="/studio/sprint" className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-primary/60 hover:shadow-sm" data-testid="studio-sprint">
              <div className={picture}>
                <Picture id="sprint" icon={Layers}/>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="display flex items-center gap-2 text-2xl">
                  <Layers className="size-4 text-primary" aria-hidden="true"/>
                  100-ad sprint
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">Create a batch of 100 static ads.</p>
                <div className="mt-5 flex flex-col items-start gap-2">
                  <span className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground group-hover:bg-primary/90">
                    {sprints.length ? "Open" : "Start"} <ArrowRight className="size-4"/>
                  </span>
                  <span className="inline-flex min-h-10 items-center text-sm text-muted-foreground">{sprints.length ? `${sprints.length} sprint${sprints.length === 1 ? "" : "s"} so far` : "None yet"}</span>
                </div>
              </div>
            </Link>
          </div>

          {!look && (<div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900" data-testid="look-missing">
              <Type className="size-5 shrink-0"/>
              <p className="flex-1">The brand&apos;s fonts and colours haven&apos;t been read from its site yet. Images will still use the real product, but the type on them will be generic.</p>
              <Link href="/brand#brand-look" className="font-medium underline">
                Scan the site
              </Link>
            </div>)}
        </section>

        <section id="formats" className="scroll-mt-28" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 3000px" }} data-testid="formats">
          <h2 className="display text-3xl">More formats</h2>
          <p className="mt-2 max-w-3xl text-[15px] text-muted-foreground">{tiles} more kinds of creative. Pick 1, answer 4 short questions, and it is made.</p>
          <div className="mt-5">
            <FormatFilter within="formats"/>
          </div>
          <div className="mt-8">
            <FormatTiles advanced={advanced} skip={AT_THE_TOP}/>
          </div>
        </section>

        <section id="yours" className="scroll-mt-28" data-testid="create-yours">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3">
            <h2 className="display text-3xl">Your creations</h2>
            {total > 0 && (<nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter sets" data-testid="sets-filter">
                {([["", `All ${total}`], ...KINDS.map((k) => [k.kind, `${KIND_INFO[k.kind].label} ${setCounts.find((r) => r.kind === k.kind)?.n ?? 0}`])] as [
                string,
                string
            ][]).map(([k, label]) => (<Link key={k || "all"} href={k ? `/studio?kind=${k}#yours` : "/studio#yours"} className={cn("inline-flex min-h-9 items-center rounded-full border px-3.5", (kind ?? "") === k ? "border-primary bg-primary/5 font-medium text-primary" : "bg-card text-muted-foreground hover:bg-muted")}>
                    {label}
                  </Link>))}
              </nav>)}
          </div>
          {made === 0 && <p className="mt-5 rounded-xl border border-dashed bg-card px-6 py-10 text-center text-[15px] text-muted-foreground">Nothing made yet. Pick 1 of the 4 at the top to start.</p>}

          {(runs.length > 0 || total > 0) && (<>
              <h3 className="mt-8 text-sm font-semibold text-muted-foreground">Image sets</h3>
              {runs.length === 0 ? (<p className="mt-2 text-sm text-muted-foreground">No set of this kind yet.</p>) : (<ul className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="studio-sets">
                  {runs.map((r) => {
                    const s = STATUS_LABEL[r.status];
                    const thumbs = r.items.flatMap((i) => latestOutputs(i.outputs).slice(0, 1)).slice(0, 4);
                    return (<li key={r.id} className="min-w-0">
                        <Link href={`/studio/${r.id}`} className="block h-full rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm" data-testid="studio-set">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 break-words">
                              <div className="text-[15px] font-semibold leading-snug">{r.title}</div>
                              <div className="mt-0.5 text-sm text-muted-foreground">
                                {KIND_INFO[r.kind].label} · {r.itemCount} image{r.itemCount === 1 ? "" : "s"}
                              </div>
                            </div>
                            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", s.tone)}>{s.label}</span>
                          </div>
                          {thumbs.length > 0 && (<div className="mt-4 grid grid-cols-4 gap-2">
                              {thumbs.map((o) => (<img key={o.path} src={assetUrl(o.path, 320)} alt="" className="aspect-square w-full rounded-lg bg-muted object-cover object-top" loading="lazy"/>))}
                            </div>)}
                        </Link>
                      </li>);
                })}
                </ul>)}
              {runs.length < ofKind && (<Link href={kind ? `/studio?kind=${kind}&all=1#yours` : "/studio?all=1#yours"} className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline" data-testid="sets-show-all">
                  Show all {ofKind} sets
                </Link>)}
            </>)}

          {sprints.length > 0 && !kind && (<>
              <h3 className="mt-10 text-sm font-semibold text-muted-foreground">100-ad sprints</h3>
              <ul className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="yours-sprints">
                {sprints.map((s) => {
                const st = SPRINT_STATUS[s.status];
                return (<li key={s.id} className="min-w-0">
                      <Link href={`/studio/sprint/${s.id}`} className="flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm" data-testid="yours-sprint">
                        <div className="min-w-0 break-words">
                          <div className="text-[15px] font-semibold leading-snug">{s.title}</div>
                          <div className="mt-0.5 text-sm text-muted-foreground">{s.size} ads</div>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", st.tone)}>{st.label}</span>
                      </Link>
                    </li>);
            })}
              </ul>
            </>)}

          {jobs.length > 0 && !kind && (<>
              <div className="mt-10 flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Videos, carousels and briefs</h3>
                <span className="text-sm text-muted-foreground">Made from a script. They are worked on at the Production board.</span>
              </div>
              <ul className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="yours-jobs">
                {jobs.slice(0, FIRST_JOBS).map((j) => (<li key={j.id} className="min-w-0">
                    <Link href={`/production?job=${j.id}`} className="flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm" data-testid="yours-job">

                      {j.assets.find((a) => a.kind === "image") && (<img src={assetUrl(j.assets.find((a) => a.kind === "image")!.path, 160)} alt="" className="size-16 shrink-0 rounded-lg bg-muted object-cover object-top" loading="lazy"/>)}
                      <div className="min-w-0 flex-1 break-words">
                        <div className="line-clamp-2 text-[15px] font-semibold leading-snug">{j.title ?? j.script_id}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {OUTPUT_INFO[j.output_type].label}
                        </div>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", columnOf(j) === "waiting" ? "border-amber-200 bg-amber-50 text-amber-700" : "text-muted-foreground")}>{COLUMN_LABELS[columnOf(j)]}</span>
                    </Link>
                  </li>))}
              </ul>
              <Link href="/production" className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline" data-testid="yours-production">
                {jobCount > FIRST_JOBS ? `All ${jobCount} on the Production board` : "Open the Production board"} <ArrowRight className="size-4"/>
              </Link>
            </>)}
        </section>
      </div>
    </div>);
}
