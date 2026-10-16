import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { db, schema } from "@/db";
import { BrandBrainError, type BrandBrain } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandLook } from "@/lib/brand-look";
import { loadBrandBrain } from "@/lib/brands";
import { openClaimItems } from "@/components/before-you-approve";
import { listFeedback, unconfirmed } from "@/lib/feedback";
import { editsWaiting } from "@/lib/hand-edits";
import { CREATIVE_TYPES } from "@/lib/chat/creative-types";
import { callName, SKILL_CALLS } from "@/lib/chat/skill-calls";
import { impact, ratesOf } from "@/lib/impact";
import { getSetting } from "@/lib/settings";
import { listAngles } from "@/lib/builder/store";
import { brandLessons } from "@/lib/lessons";
import { offerBook } from "@/lib/offers/book";
import { getSourceItems, getInsights, getThemes } from "@/lib/queries";
import { listSprints } from "@/lib/sprint/engine";
import { listRuns } from "@/lib/studio/engine";
import { listProductPhotos } from "@/lib/product-photos";
import { humanize, isBrandSource } from "@/lib/taxonomy";
import { isAdvanced } from "@/lib/ui-mode-server";
import { cn } from "@/lib/utils";
import { DashStart } from "./dash-start";
import { HomeAsk } from "./home-ask";
import { assetUrl, latestOutputs } from "./studio/shared";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const WORK_LABEL: Record<string, string> = { preprocess: "preparing sources", extract: "reading sources", cluster: "sorting themes", script: "writing scripts", analyze_reference: "studying a reference", reference_read: "reading a reference", production: "making ads", studio: "making images", sprint: "ad sprint", personas: "building personas", offers: "designing offers", chat: "chat", landing: "landing page", site_scan: "checking a page", reference_hooks: "writing hooks" };
export default async function DashboardPage() {
    const row = await activeBrand();
    const brandId = row.id;
    let brain: BrandBrain | null = null;
    try {
        brain = loadBrandBrain(brandId);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const look = loadBrandLook(brandId);
    const items = getSourceItems(brandId);
    const insights = getInsights(brandId);
    const themes = getThemes(brandId);
    const scripts = db.select({ id: schema.scripts.id, audit: schema.scripts.audit }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all();
    const jobs = db.select({ id: schema.outputJobs.id, status: schema.outputJobs.status, assets: schema.outputJobs.assets }).from(schema.outputJobs).where(eq(schema.outputJobs.brand_id, brandId)).all();
    const runs = listRuns(brandId);
    const lessons = brandLessons(brandId);
    const working = db
        .select({ kind: schema.jobs.kind, status: schema.jobs.status })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.brand_id, brandId), inArray(schema.jobs.status, ["queued", "running"])))
        .all();
    const images = runs.flatMap((r) => r.items.flatMap((i) => latestOutputs(i.outputs).slice(0, 1).map((o) => ({ run: r.id, kind: r.kind, path: o.path, flagged: o.qa?.status === "fail", check: o.qa?.status ?? null, label: i.plan?.title ?? i.label }))));
    const flagged = images.filter((i) => i.flagged).length;
    const assets = jobs.reduce((n, j) => n + j.assets.length, 0);
    const jobImages = jobs.flatMap((j) => j.assets.filter((a) => a.kind === "image").map((a) => a.path));
    const itemsPending = items.filter((i) => i.extraction_status !== "done").length;
    const scriptFails = scripts.filter((s) => s.audit.some((a) => a.status === "fail")).length;
    const jobsInReview = jobs.filter((j) => j.status === "in_review").length;
    const plansToReview = runs.filter((r) => r.status === "planned").length;
    const proposed = lessons.filter((l) => l.status === "proposed").length;
    const editAsks = editsWaiting(brandId);
    const notesWaiting = listFeedback(brandId, 60).filter((f) => unconfirmed(brandId, f, lessons).length).length;
    const claims = openClaimItems(brandId);
    const disagree = claims.conflicts.length;
    const sprints = listSprints(brandId);
    const sprintPlan = sprints.find((s) => s.status === "plan_ready");
    const sprintBriefs = sprints.find((s) => s.status === "briefs_ready");
    const attention: Need[] = [
        !brain && { n: null, href: "/brand", title: "The brand brain is not set up", why: "Nothing can be written until it is.", act: "Fix it" },
        !look && { n: null, href: "/brand#brand-look", title: "Fonts and colours not read from the site yet", why: "Images use the brand's own look once the site is scanned.", act: "Scan the site" },
        itemsPending > 0 && { n: itemsPending, href: "/sources", title: `${itemsPending === 1 ? "source item" : "source items"} not read yet`, why: "Customer words that have not been read for insights.", act: "Read them" },
        scriptFails > 0 && { n: scriptFails, href: "/scripts", title: `${scriptFails === 1 ? "script" : "scripts"} a check has flagged`, why: "A check flagged a line. Read it, then fix the line or approve the script as it is.", act: "Open scripts" },
        jobsInReview > 0 && { n: jobsInReview, href: "/production", title: `${jobsInReview === 1 ? "job" : "jobs"} waiting for review`, why: "Finished assets to approve or send back.", act: "Review" },
        plansToReview > 0 && { n: plansToReview, href: `/studio/${runs.find((r) => r.status === "planned")!.id}`, title: `${plansToReview === 1 ? "image plan" : "image plans"} ready to review`, why: "No image is made until the plan is approved.", act: "Review the plan" },
        flagged > 0 && { n: flagged, href: `/studio/${images.find((i) => i.flagged)!.run}`, title: `${flagged === 1 ? "image" : "images"} flagged by the checks`, why: "A check found a problem in the finished image.", act: "Look at them" },
        editAsks > 0 && { n: editAsks, href: "/lessons#edits", title: `${editAsks === 1 ? "change" : "changes"} you keep making`, why: "You made the same edit by hand 3 times or more. Add it as a rule, or say it is not one.", act: "Decide" },
        notesWaiting > 0 && { n: notesWaiting, href: "/lessons#feedback", title: `${notesWaiting === 1 ? "note" : "notes"} waiting to become a rule`, why: "A rule drawn from a note is used only once an admin says yes.", act: "Confirm" },
        proposed > 0 && { n: proposed, href: "/lessons", title: `${proposed === 1 ? "lesson" : "lessons"} waiting to be confirmed`, why: "Feedback turned into a rule. Confirm it or drop it.", act: "Confirm" },
        claims.pending > 0 && { n: claims.pending, href: "/brand#claim-sources", title: `${claims.pending === 1 ? "claim" : "claims"} from the site and ads waiting for approval`, why: "No ad uses a claim found there until you approve it.", act: "Approve" },
        !!sprintPlan && { n: sprintPlan.size, href: `/studio/sprint/${sprintPlan.id}`, title: "ad sprint: the plan is ready to approve", why: "Approving starts the briefs. Settle claims and figures first.", act: "Review the plan" },
        !!sprintBriefs && { n: sprintBriefs.size, href: `/studio/sprint/${sprintBriefs.id}`, title: "ad sprint: the briefs are ready to approve", why: "Approving makes the images.", act: "Review the briefs" },
        disagree > 0 && { n: disagree, href: "/brand#claim-sources", title: `${disagree === 1 ? "figure" : "figures"} stated differently on the site and in the ads`, why: "Pick the number that is true before it goes in an ad.", act: "Settle" },
    ].filter((x): x is Need => !!x);
    const customerItems = items.filter((i) => !isBrandSource(i.source_type)).length;
    const setup: {
        title: string;
        why: string;
        href: string;
        act: string;
        done: boolean;
    }[] = [
        { title: "Build the brand brain", why: "What the brand sells, what it may claim, who buys it and how it talks. Everything else reads it.", href: "/brand", act: "Open the Brand brain", done: !!brain },
        { title: "Read the brand's look", why: "Fonts and colours, read off the brand's site, so every image looks like the brand.", href: "/brand#brand-look", act: "Scan the site", done: !!look },
        { title: "Add product photos", why: "Images are made from real photos of the product. Upload a clean shot of each product on the Brand brain screen.", href: "/brand#product-photos", act: "Upload photos", done: !!brain && listProductPhotos(brandId).some((p) => p.files.length > 0) },
        { title: "Write your first scripts", why: "Pick the product, the buyer's stage, a persona, an angle, an offer and a format, say how many, and the Script builder writes them.", href: "/builder", act: "Open the Script builder", done: scripts.length > 0 },
        { title: "Bring in what customers say", why: "Reviews, support tickets, calls, surveys. Scripts and ads written after this use the buyers' own words.", href: "/sources", act: "Import a file", done: customerItems > 0 },
        { title: "Read the insights", why: "Each item is read for what buyers want, fear and tried before, then grouped into themes.", href: themes.length || !insights.length ? "/sources" : "/insights", act: insights.length ? "Sort into themes" : "Read for insights", done: themes.length > 0 },
        { title: "Make the first image ads", why: "Static ads on layouts that have worked, product page images or a photoshoot.", href: "/studio", act: "Create", done: runs.length > 0 },
    ];
    const nextStep = setup.findIndex((s) => !s.done);
    const setupDone = nextStep < 0;
    const advanced = await isAdvanced("dashboard");
    const rates = getSetting(brandId, "impact");
    const made = impact(images.length + scripts.length + assets, ratesOf(rates));
    const product = brain?.products[0]?.name;
    const askFormats = CREATIVE_TYPES.filter((t) => t.group !== "layouts" && t.group !== "looks").map((t) => ({ id: t.id, label: t.label }));
    return (<div>
      {made.ads > 0 && (<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-1 border-b bg-card px-6 py-2.5 text-sm text-muted-foreground" title={`$${rates.usd_per_piece} and ${rates.hours_per_piece} hours for each piece, made by hand or hired out. Set in Settings.`} data-testid="dash-impact">
          <span>
            <span className="numeral mr-2 align-[-3px] text-2xl text-foreground">{made.ads.toLocaleString("en-US")}</span>
            {made.ads === 1 ? "piece made" : "pieces made"}
          </span>
          <span>
            <span className="numeral mr-2 align-[-3px] text-2xl text-foreground">${made.usd.toLocaleString("en-US")}</span>
            saved
          </span>
          <span>
            <span className="numeral mr-2 align-[-3px] text-2xl text-foreground">{made.hours.toLocaleString("en-US")} h</span>
            saved
          </span>
          {attention.length > 0 && (<a href="#needs-you" className="font-semibold text-primary hover:underline">
              {attention.length} {attention.length === 1 ? "thing waits" : "things wait"} for you
            </a>)}
        </div>)}
      <div className="mx-auto max-w-[80rem] space-y-24 px-8 pt-20 max-md:space-y-14 max-md:px-5 max-md:pt-10">

        <section className="text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Creative Studio · {row.name}</p>
          <div data-testid="dash-hero">
            <h1 className="display mt-6 text-6xl text-balance md:text-7xl xl:text-[5.5rem]">What are we making today?</h1>
            {!brain && (<p className="mx-auto mt-5 max-w-3xl text-sm text-muted-foreground">
                {advanced ? "No brand brain yet. Add brand.json to the brand folder, or build it on the Brand brain screen." : "No brand brain yet. Set it up first: it takes a few minutes and is done once."}{" "}
                <Link href="/brand" className="font-semibold text-primary underline underline-offset-2">
                  Set up the brand brain
                </Link>
              </p>)}
          </div>
          {brain && (<div className="mx-auto mt-12 max-w-[76rem] text-left max-md:mt-8">
              <HomeAsk products={brain.products.map((x) => ({ id: x.id, label: x.name }))} personas={brain.personas.map((x) => ({ id: x.id, label: x.name }))} angles={listAngles(brandId).map((x) => ({ id: x.id, label: x.name }))} offers={offerBook(brandId, brain).map((x) => ({ id: x.id, label: x.name }))} formats={askFormats} skills={SKILL_CALLS.map((c) => ({ id: c.skill, label: callName(c), group: c.group }))} example={product ? `6 image ads for ${product}, for people who gave up on powders` : "Say what you want to make, in your own words"}/>
            </div>)}
        </section>

        {!setupDone && (<section className="overflow-hidden rounded-xl border bg-card" data-testid="dash-setup">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-accent/50 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="display text-3xl">
                  Set up {row.name}: step {nextStep + 1} of {setup.length}
                </h2>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">{setup[nextStep].title}.</span> <span className="text-muted-foreground">{setup[nextStep].why}</span>
                </p>
              </div>
              <Link href={setup[nextStep].href} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90" data-testid="setup-next">
                {setup[nextStep].act}
                <ArrowRight className="size-4"/>
              </Link>
            </div>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              {setup.map((s, i) => (<li key={s.title} className={cn("sm:border-r", i === nextStep && "bg-accent/40")} data-testid={`setup-step-${i + 1}`} data-done={s.done ? "yes" : "no"}>
                  <Link href={s.href} className="flex h-full items-start gap-2.5 px-4 py-3 hover:bg-muted">
                    {s.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600"/> : <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i === nextStep ? "bg-primary text-primary-foreground" : "border border-foreground/40 text-muted-foreground")}>{i + 1}</span>}
                    <span className={cn("text-sm leading-snug", s.done ? "text-muted-foreground line-through decoration-foreground/30" : i === nextStep ? "font-semibold" : "")}>{s.title}</span>
                  </Link>
                </li>))}
            </ol>
          </section>)}


        <DashStart work={images.filter((i) => !i.flagged && i.kind === "ad").map((i) => i.path)} frames={jobImages}/>

        {working.length > 0 && (<div className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium" data-testid="dash-working">
            <Loader2 className="size-4 animate-spin text-primary"/>
            Working now: {[...new Set(working.map((w) => WORK_LABEL[w.kind] ?? humanize(w.kind)))].join(", ")} ({plural(working.length, "task")})
          </div>)}


        <section data-testid="dash-create">
          <div className="flex items-baseline justify-between gap-3">
            <Link href="/studio" className="group flex items-baseline gap-3">
              <h2 className="display text-4xl group-hover:text-primary">Pick up where you left off</h2>
              <span className="text-xs text-muted-foreground">
                {plural(runs.length, "set")}, {plural(images.length, "image")}
              </span>
            </Link>
            <Link href="/studio" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="size-4"/>
            </Link>
          </div>
          {images.length ? (<div className="mt-6 grid grid-cols-2 gap-6 max-md:gap-3 md:grid-cols-3 xl:grid-cols-4">
              {images.slice(0, 8).map((im) => (<Link key={im.path} href={`/studio/${im.run}`} className="group relative block overflow-hidden rounded-2xl border bg-muted" title={im.label}>

                  <img src={assetUrl(im.path, 640)} alt={im.label} loading="lazy" className="aspect-square w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"/>
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3.5 pt-12">
                    <span className="min-w-0 truncate text-sm font-semibold text-white">{im.label}</span>
                    <span className={cn("shrink-0 rounded-full bg-card/95 px-2 py-0.5 text-xs font-semibold", CHECK[im.check ?? "none"].tone)}>{CHECK[im.check ?? "none"].label}</span>
                  </span>
                </Link>))}
            </div>) : (<Empty>No images yet. Start with ads, product page images or a photoshoot.</Empty>)}
        </section>


        <section id="needs-you" className="scroll-mt-28" data-testid="dash-attention">
          <div className="flex items-baseline gap-3">
            <h2 className="display text-4xl">Needs you</h2>
            {attention.length > 0 && <span className="rounded-full bg-signal px-2.5 py-0.5 text-sm font-semibold text-signal-foreground">{attention.length}</span>}
          </div>
          {attention.length > 0 ? (<ul className="mt-6 divide-y overflow-hidden rounded-2xl border bg-card">
              {attention.map((a) => (<li key={a.title}>
                  <Link href={a.href} className="group flex items-center gap-5 px-6 py-4 transition hover:bg-accent/40 max-md:gap-3 max-md:px-4">
                    <span className="numeral w-12 shrink-0 text-right text-4xl text-primary max-md:w-9 max-md:text-3xl">{a.n ?? "!"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug first-letter:uppercase">{a.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{a.why}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
                      <span className="max-md:sr-only">{a.act}</span> <ArrowRight className="size-4 transition group-hover:translate-x-0.5"/>
                    </span>
                  </Link>
                </li>))}
            </ul>) : (<p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4"/> Nothing is waiting on you.
            </p>)}
        </section>

      </div>
    </div>);
}
type Need = {
    n: number | null;
    href: string;
    title: string;
    why: string;
    act: string;
};
const CHECK: Record<string, {
    label: string;
    tone: string;
}> = {
    pass: { label: "Passed", tone: "text-emerald-700" },
    warn: { label: "Look at it", tone: "text-amber-700" },
    fail: { label: "Failed", tone: "text-destructive" },
    none: { label: "Not checked", tone: "text-muted-foreground" },
};
const Empty = ({ children }: {
    children: React.ReactNode;
}) => <p className="text-xs text-muted-foreground">{children}</p>;
