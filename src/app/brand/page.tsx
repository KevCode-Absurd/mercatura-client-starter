import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, CircleDashed, ExternalLink, History, Package, Plug, Printer, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, schema } from "@/db";
import { BrandBrainError, brandBrainPath, type BrandBrain } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandLook } from "@/lib/brand-look";
import { readBrandNotes } from "@/lib/brand-onboard";
import { brandFolderStatus, loadBrandBrain } from "@/lib/brands";
import { brainBrief, briefText } from "@/lib/brain/brief";
import { competitorSite, competitorsOf, PROFILE_FIELDS } from "@/lib/brain/competitors";
import { BRAIN_DOCS, CHANGE_TYPES, readAllDocs, sec, type DocId } from "@/lib/brain/docs";
import { tabNames } from "@/lib/brain/file-names";
import { childrenOf, itemsOf, sectionById, tableOf } from "@/lib/brain/md";
import { assetFolders, catalogOf } from "@/lib/brain/products";
import { siteImageRecords } from "@/lib/brain/site-images";
import { geminiEnabled } from "@/lib/llm/gemini";
import { unreadAssets } from "@/lib/sprint/assets";
import { reviewBrain, type CheckStatus } from "@/lib/brain/review";
import { sourceStates } from "@/lib/brain/sources";
import { brandConflicts } from "@/lib/claim-conflicts";
import { loadClaimSources } from "@/lib/claim-sources";
import { claimsHeld } from "@/lib/claims-through";
import { accountFile } from "@/lib/coverage/account";
import { getFounderAnswers, loadQuestionnaire } from "@/lib/founder";
import { founderProgress } from "@/lib/founder-questions";
import { llmEnabled } from "@/lib/llm/gateway";
import { currencySymbol } from "@/lib/money";
import { loadPeople } from "@/lib/people";
import { listProductPhotos } from "@/lib/product-photos";
import { loadCreativeKit } from "@/lib/production/kit";
import { SOPHISTICATION_LABELS } from "@/lib/taxonomy";
import { isAdvanced } from "@/lib/ui-mode-server";
import { cn } from "@/lib/utils";
import { voiceCard } from "@/lib/voice-card";
import { AddChange, AddCompetitor, AddLearning, CatalogTools, CompetitorCard, EnsureDocs, LookTools, ProductCard } from "./brain-tabs";
import { BrandEditor } from "./brand-editor";
import { AddWinner, LearningCard } from "./learning";
import { WINNER_KINDS, learnInput, loadLearning } from "@/lib/brain/learn";
import { proposeLearnings } from "@/lib/brain/learn-rules";
import { getSetting } from "@/lib/settings";
import { BrandLookCard } from "./brand-look";
import { fontFamilies, listBrandFonts } from "@/lib/brand-fonts";
import { BrandSetup } from "./brand-setup";
import { BuildBrandJson } from "./build-brand-json";
import { ClaimSourcesCard } from "./claim-sources";
import { CreativeKitCard } from "./creative-kit";
import { DocView, SectionCard } from "./doc-view";
import { PeopleCard } from "./people";
import { ProductPhotosCard } from "./product-photos";
import { VoiceCardPanel } from "./voice-card";
import { WriterBrief, type BriefPart } from "./writer-brief";
const TABS = [
    { id: "overview", label: "Overview", doc: "brain" },
    { id: "guidelines", label: "Guidelines", doc: "guidelines" },
    { id: "products", label: "Products", doc: "products" },
    { id: "customers", label: "Customers", doc: "avatars" },
    { id: "competitors", label: "Competitors", doc: "competitors" },
    { id: "winning", label: "Winning ads", doc: "winning" },
    { id: "changes", label: "Changes", doc: "changes" },
    { id: "facts", label: "Facts and claims", doc: null },
    { id: "sources", label: "Data sources", doc: null },
] as const;
type TabId = (typeof TABS)[number]["id"];
function siteUrl(brainDir: string): string {
    for (const f of [".claude/CLAUDE.md", "README.md", "brain.md", "brand-guidelines.md", "website.md"]) {
        const file = path.join(brainDir, f);
        if (!fs.existsSync(file))
            continue;
        const m = fs.readFileSync(file, "utf-8").match(/Website\*{0,2}:\s*(https?:\/\/[^\s)>]+)/i);
        if (m)
            return m[1];
    }
    return "";
}
const ICON: Record<CheckStatus, React.ReactNode> = {
    pass: <CheckCircle2 className="size-4 shrink-0 text-emerald-600"/>,
    warn: <CircleAlert className="size-4 shrink-0 text-amber-600"/>,
    fail: <CircleDashed className="size-4 shrink-0 text-red-600"/>,
};
const TAB_OF_DOC: Partial<Record<DocId, TabId>> = { brain: "overview", guidelines: "guidelines", products: "products", avatars: "customers", competitors: "competitors", winning: "winning", changes: "changes" };
export default async function BrandPage({ searchParams }: {
    searchParams: Promise<{
        tab?: string;
    }>;
}) {
    const row = await activeBrand();
    const folder = brandFolderStatus(row);
    const founder = founderProgress(loadQuestionnaire(), getFounderAnswers(row.id));
    const founderLink = (<Link href="/brand/founder" className="text-sm text-primary hover:underline" data-testid="founder-link">
      Founder questionnaire (optional){founder.answered ? `: ${founder.answered} of ${founder.total} answered` : ""}
    </Link>);
    let brand: BrandBrain;
    try {
        brand = loadBrandBrain(row.id);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        return (<div className="mx-auto w-full max-w-[80rem]">
        <PageHeader title="Brand brain" subtitle={`${row.name} has no brand brain yet. Build it here, once, and every other screen opens up.`}/>
        <BrandSetup brandName={row.name} files={folder.markdownFiles} folder={folder.brainDir} notes={readBrandNotes(row.id)} founder={{ answered: founder.answered, total: founder.total, saved: folder.markdownFiles.includes("founder-interview.md") }} live={llmEnabled()} invalid={folder.brandJson === "invalid" ? e.message : null}/>
      </div>);
    }
    const b = brand.brand;
    const wanted = (await searchParams).tab ?? "overview";
    const tab: TabId = TABS.some((t) => t.id === wanted) ? (wanted as TabId) : "overview";
    const advanced = await isAdvanced("brand");
    const live = llmEnabled();
    const docs = readAllDocs(row.id);
    const learning = (() => {
        const state = loadLearning(row.id);
        const known = new Map(state.entries.map((e) => [e.subject, e]));
        const pending = proposeLearnings(learnInput(row.id)).filter((p) => { const was = known.get(p.subject); return !was || (was.status === "applied" && (was.text !== p.text || was.target !== p.target)); });
        return { pending, learned: [...state.entries].sort((a, b) => b.at.localeCompare(a.at)), lastRun: state.runs.at(-1)?.at ?? null };
    })();
    const review = reviewBrain(docs, { productNames: brand.products.map((p) => p.name), folders: assetFolders(row.id) });
    const look = loadBrandLook(row.id);
    const site = look?.site_url ?? siteUrl(folder.brainDir);
    const missing = BRAIN_DOCS.filter((d) => !docs[d.id].exists).map((d) => d.label);
    const openChecks = (doc: DocId) => review.checks.filter((c) => c.doc === doc && c.status !== "pass");
    const claimTone = {
        substantiated: "bg-emerald-50 text-emerald-700 border-emerald-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        rejected: "bg-red-50 text-red-700 border-red-200",
    } as const;
    const productNames = Object.fromEntries(brand.products.map((x) => [x.id, x.name]));
    const current = TABS.find((t) => t.id === tab)!;
    const doc = current.doc ? docs[current.doc] : null;
    const todo = (id: DocId) => {
        const open = openChecks(id);
        if (!open.length)
            return null;
        return (<ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm" data-testid="tab-todo">
        {open.map((c) => (<li key={c.id} className="flex gap-2">
            {ICON[c.status]}
            <span>
              <span className="font-medium">{c.label}.</span> {c.detail}
            </span>
          </li>))}
      </ul>);
    };
    const checkRow = (c: (typeof review.checks)[number]) => (<li key={c.id} className="flex gap-2.5" data-testid={`check-${c.id}`} data-status={c.status}>
      <span className="mt-0.5">{ICON[c.status]}</span>
      <span className="min-w-0">
        {c.doc && c.status !== "pass" ? (<Link href={TAB_OF_DOC[c.doc] === "overview" ? "/brand" : `/brand?tab=${TAB_OF_DOC[c.doc]}`} className="font-medium text-primary hover:underline">
            {c.label}
          </Link>) : (<span className="font-medium">{c.label}</span>)}
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{c.detail}</span>
      </span>
    </li>);
    const home = tab === "overview";
    const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
    const pack = home ? listProductPhotos(row.id).find((x) => x.main) : undefined;
    const brief = brainBrief(row.id);
    const tabHref = (id: TabId) => (id === "overview" ? "/brand" : `/brand?tab=${id}`);
    const ROOMS: {
        id: TabId;
        icon: React.ReactNode;
        what: string;
        holds: string;
    }[] = [
        { id: "guidelines", icon: <BookOpen className="size-5"/>, what: "How the brand looks and sounds, what it wins on, and what it never says or shows.", holds: plural(itemsOf(sec(docs.guidelines.doc, "usps")).length, "selling point") },
        { id: "products", icon: <Package className="size-5"/>, what: "Every product with its price, what it does, and its photos.", holds: `${plural(catalogOf(docs.products.doc, assetFolders(row.id)).length, "product")} in the catalogue` },
        { id: "customers", icon: <Users className="size-5"/>, what: "Who buys, what they want, and the words they use.", holds: plural(brand.personas.length, "buyer") },
        { id: "competitors", icon: <Swords className="size-5"/>, what: "Who else they could buy from, and the gap each one leaves.", holds: plural(competitorsOf(docs.competitors.doc).length, "competitor") },
        { id: "winning", icon: <Trophy className="size-5"/>, what: "The brand's own ads that worked, to learn from.", holds: `${plural(docs.winning.doc.sections.filter((x) => /^ad\s*\d+/i.test(x.title)).length, "ad")} recorded` },
        { id: "changes", icon: <History className="size-5"/>, what: "Launches, promotions, price and stock changes, newest first.", holds: `${plural(tableOf(sec(docs.changes.doc, "changeLog"))?.rows.length ?? 0, "change")} logged` },
        { id: "facts", icon: <ShieldCheck className="size-5"/>, what: "The numbers and claims an ad may state, and where each comes from.", holds: `${plural(brand.claims.length, "claim")} on file` },
        { id: "sources", icon: <Plug className="size-5"/>, what: "Where all of this is read from, and what is connected.", holds: "Store, ads, reviews, email" },
    ];
    const guidelinesTab = { href: tabHref("guidelines"), label: "Guidelines" };
    const below = { href: "/brand", label: "the brain document, further down this page" };
    const BRIEF: BriefPart[] = [
        { key: "wins", title: "What the brand wins on", lines: brief.selling_points, cut: "A writer is sent the first 5 points, each cut to its first 2 sentences.", doc: "guidelines", section: sec(docs.guidelines.doc, "usps") ?? null, tab: guidelinesTab },
        {
            key: "guardrails",
            title: "Guardrails",
            lines: [brief.never_say && `Never say: ${brief.never_say}`, brief.never_show && `Never show: ${brief.never_show}`, brief.always && `Always: ${brief.always}`].filter((x): x is string => !!x),
            cut: "A writer is sent these 3 lines: Never say, Never show, Always.",
            doc: "guidelines",
            section: sec(docs.guidelines.doc, "guardrails") ?? null,
            tab: guidelinesTab,
        },
        { key: "works", title: "What has worked", lines: brief.works, cut: "A writer is sent the first 5 lines.", doc: "brain", section: sec(docs.brain.doc, "works") ?? null, tab: below },
        { key: "avoid", title: "What to avoid", lines: brief.avoid, cut: "A writer is sent the first 6 lines.", doc: "brain", section: sec(docs.brain.doc, "avoid") ?? null, tab: below },
        { key: "now", title: "What changed lately", lines: brief.now, cut: "A writer is sent the 5 newest rows of the last 45 days. Setup, learning, competitor and retail rows are left out.", doc: "changes", section: sec(docs.changes.doc, "changeLog") ?? null, tab: { href: tabHref("changes"), label: "Changes" } },
    ];
    return (<div className="mx-auto w-full max-w-[80rem]">

      <header className={cn("mx-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-rule max-md:pt-6", home ? "pb-7 pt-12" : "pb-5 pt-10")} data-testid="brand-hero">
        <div className="flex min-w-0 flex-1 basis-[30rem] items-end gap-7">
          {pack && (<img src={`/api/brand-file/assets/${encodeURIComponent(pack.folder)}/${encodeURIComponent(pack.main)}?w=320`} alt="" className="size-32 shrink-0 rounded-2xl border bg-card object-contain p-2 max-md:hidden"/>)}
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase" data-testid="brand-eyebrow">Brand brain</p>
            <h1 className={cn("display", home ? "mt-3 text-6xl max-md:text-5xl" : "mt-2 text-4xl")}>{b.name}</h1>
            {home && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground max-md:text-base">{b.one_liner}</p>}
          </div>
        </div>
        <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          {founderLink}
          <Link href="/creators" className="text-sm text-primary hover:underline" data-testid="find-creators-link">Find creators</Link>
          <a href="/brand/guide" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline" data-testid="open-guide">
            <Printer className="size-3.5"/> Brand guide
          </a>
          {advanced && <BrandEditor initial={JSON.stringify(brand, null, 2)}/>}
          {folder.markdownFiles.length > 0 && <BuildBrandJson rebuild disabled={!live} reason={!live ? (advanced ? "Needs LLM_MODE=live in .env." : "Not switched on for this account.") : null}/>}
        </div>
      </header>

      <nav className="mx-6 mt-4 flex gap-x-2 border-b max-md:overflow-x-auto md:flex-wrap md:gap-y-1 [&>a]:shrink-0 [&>a]:whitespace-nowrap" data-testid="brain-tabs" aria-label="Brand brain sections">
        {TABS.map((t) => {
            const open = t.doc ? openChecks(t.doc).length : 0;
            return (<Link key={t.id} href={tabHref(t.id)} scroll={false} data-testid={`tab-${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={cn("-mb-px flex min-h-11 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm", t.id === tab ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
              {open > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs font-medium text-amber-800" title={`${open} thing${open === 1 ? "" : "s"} to tighten`}>{open}</span>}
            </Link>);
        })}
      </nav>

      <div className={cn("px-6 py-8 [&_.grid>*]:min-w-0 [overflow-wrap:anywhere]", home ? "space-y-14" : "space-y-8")}>
        {doc && !home && (<p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground" data-testid="doc-job">
            {doc.info.job}
            {doc.updated ? ` Last updated ${doc.updated}.` : ""}
          </p>)}
        <EnsureDocs missing={missing}/>

        {home && (<>
            <section className="space-y-6">
              <div className="space-y-3">
                <p className="max-w-3xl text-[15px] leading-relaxed">
                  This is everything the app knows about {b.name}. Every script and every ad is made from it, so the more that is true here, the more the work sounds like the brand. Anything can be changed.
                </p>
                <dl className="flex flex-wrap gap-x-7 gap-y-1 text-sm [&_dd]:font-medium [&_dt]:shrink-0 [&_dt]:whitespace-nowrap [&_dt]:text-muted-foreground [&>div]:flex [&>div]:gap-1.5">
                  <div><dt>Category</dt><dd>{b.category}</dd></div>
                  <div><dt>Market</dt><dd>{b.market} · {b.currency}</dd></div>
                  <div><dt>Accent for talent</dt><dd>{b.locale_accent}</dd></div>
                  {site && <div><dt>Website</dt><dd><a href={site} target="_blank" rel="noreferrer" className="text-primary hover:underline">{site.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a></dd></div>}
                  {advanced && <div><dt>Sophistication</dt><dd>{SOPHISTICATION_LABELS[brand.market_sophistication_stage]}</dd></div>}
                  {advanced && <div><dt>Kept in</dt><dd title={brandBrainPath(row.dir)} className="cursor-help underline decoration-dotted">the brand&apos;s folder</dd></div>}
                </dl>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="brain-rooms">
                {ROOMS.map((r) => {
                const t = TABS.find((x) => x.id === r.id)!;
                const open = t.doc ? openChecks(t.doc).length : 0;
                return (<Link key={r.id} href={tabHref(r.id)} scroll={false} className="group flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:border-primary/50 hover:shadow-[0_18px_36px_-28px_rgba(40,30,10,0.45)]" data-testid={`room-${r.id}`}>
                      <span className="flex items-center justify-between">
                        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">{r.icon}</span>
                        {open > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{open} to tighten</span>}
                      </span>
                      <span className="display mt-4 text-2xl">{t.label}</span>
                      <span className="mt-1 text-sm font-medium">{r.holds}</span>
                      <span className="mt-2 flex-1 text-sm leading-snug text-muted-foreground">{r.what}</span>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5"/>
                      </span>
                    </Link>);
            })}
              </div>
            </section>

            <section className="space-y-5" data-testid="writer-brief">
              <div>
                <h2 className="display text-3xl">What every writer is told</h2>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">These few lines go with every script and every image ad, beside the brand&apos;s facts and its voice. They are cut from the documents, so change a part here and the document changes with it.</p>
              </div>
              <div className="rounded-xl border bg-card p-7 max-md:p-4">
                <WriterBrief parts={BRIEF}/>
                {advanced && (<details className="mt-7 border-t pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">See it as it is sent</summary>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-[13px] leading-relaxed">{briefText(brief) || "Nothing yet: the guidelines and the brain are empty."}</pre>
                  </details>)}
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="display text-3xl">How complete it is</h2>
              <Card data-testid="brain-check">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-end justify-between gap-3 text-base">
                    <span>Brain check</span>
                    <span className="font-normal text-muted-foreground" data-testid="brain-check-score">
                      <span className="numeral mr-0.5 text-4xl leading-none text-foreground">{review.passed}</span>{" "}
                      <span className="text-sm">of {review.total} pass</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm">
                  <p className="max-w-3xl text-[15px] leading-relaxed">{review.summary} <span className="text-muted-foreground">Checked by rule on every visit, at no cost. A quote or a number that is missing is listed here, never filled in.</span></p>

                  {review.checks.some((c) => c.status !== "pass") && <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">{review.checks.filter((c) => c.status !== "pass").map(checkRow)}</ul>}
                  <details className="group border-t pt-3" open={review.passed === review.total || undefined}>
                    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md text-sm font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
                      <CheckCircle2 className="size-4 text-emerald-600"/>
                      <span className="group-open:hidden">Show the {review.passed} that pass</span>
                      <span className="hidden group-open:inline">Hide the {review.passed} that pass</span>
                    </summary>
                    <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">{review.checks.filter((c) => c.status === "pass").map(checkRow)}</ul>
                  </details>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-5">
              <div>
                <h2 className="display text-3xl">What the brain is learning</h2>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">It grows with the work: what the ad account shows, what you said about a piece, and anything you add here in a line.</p>
              </div>
              <AddLearning />
              <LearningCard auto={getSetting(row.id, "brain_learning").auto} pending={learning.pending} learned={learning.learned} lastRun={learning.lastRun}/>
            </section>

            <section className="space-y-5">
              <div>
                <h2 className="display text-3xl">What we know so far</h2>
                {doc && (<p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground" data-testid="doc-job">
                    {doc.info.job}
                    {doc.updated ? ` Last updated ${doc.updated}.` : ""}
                  </p>)}
              </div>
              <DocView doc="brain" sections={docs.brain.doc.sections}/>
            </section>
          </>)}

        {tab === "guidelines" &&
            (() => {
                const visual = docs.guidelines.doc.sections.find((x) => /^visual identity/i.test(x.title.trim()));
                const lookCard = (embedded: boolean) => <BrandLookCard look={look} defaultUrl={site} fonts={fontFamilies(listBrandFonts(row.id))} embedded={embedded} tools={embedded ? <LookTools hasLook={!!look}/> : undefined}/>;
                return (<>
                {todo("guidelines")}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!visual && <span className="mr-auto flex flex-wrap gap-2"><LookTools hasLook={!!look}/></span>}
                  <a href="/brand/guide" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Open the printable brand guide <ExternalLink className="size-3.5"/></a>
                </div>
                <DocView doc="guidelines" sections={docs.guidelines.doc.sections} slots={visual ? { [visual.id]: lookCard(true) } : {}}/>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <VoiceCardPanel card={voiceCard(row.id, brand)} live={live}/>
                  {!visual && lookCard(false)}
                </div>
              </>);
            })()}

        {tab === "products" &&
            (() => {
                const d = docs.products.doc;
                const folders = assetFolders(row.id);
                const catalog = catalogOf(d, folders);
                const root = sec(d, "catalog");
                const inCatalog = new Set(root ? [root.id, ...childrenOf(d, root).map((s) => s.id)] : []);
                return (<>
                {todo("products")}
                <CatalogTools defaultUrl={site} sitePictures={{ pulled: Object.keys(siteImageRecords(row.id).images).length, waiting: unreadAssets(row.id), canLook: geminiEnabled() }}/>
                <div>
                  <h2 className="display mb-4 text-3xl" data-testid="catalog-count">
                    Catalogue: {catalog.length} product{catalog.length === 1 ? "" : "s"}
                  </h2>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {catalog.map((p) => (<ProductCard key={p.id} p={p} section={sectionById(d, p.id)!}/>))}
                  </div>
                  {!catalog.length && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No products yet. Pull them from the store, or add one by hand.</p>}
                </div>
                <DocView doc="products" sections={d.sections} skip={[...inCatalog]}/>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">The products ads are made for</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">Every product in the catalogue above can be picked for a script, an image ad or a sprint. Where a product has its ingredients and doses written out, they are shown here, and a check holds a writer to them.</p>
                    {brand.products.map((p) => (<div key={p.id}>
                        <div className="font-medium">
                          {p.name} <span className="font-normal text-muted-foreground">· {p.format}{p.cycle_days ? ` · ${p.cycle_days}-day cycle` : ""}</span>
                        </div>
                        <table className="mt-2 w-full">
                          <tbody>
                            {p.ingredients?.map((i) => (<tr key={i.name} className="border-t">
                                <td className="py-1.5 pr-2 font-medium">{i.name}</td>
                                <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">{i.dose}</td>
                                <td className="py-1.5">{i.job}</td>
                              </tr>))}
                          </tbody>
                        </table>
                      </div>))}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ProductPhotosCard products={listProductPhotos(row.id)} names={productNames}/>
                  {advanced && <CreativeKitCard kit={loadCreativeKit(row.id)} live={live} productNames={productNames}/>}
                </div>
              </>);
            })()}

        {tab === "customers" && (<>
            {todo("avatars")}
            {review.avatars.length > 0 && (<div className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="avatar-evidence">
                {review.avatars.map((a) => (<div key={a.name} className="rounded-lg border bg-card p-3 text-sm">
                    <div className="font-medium">{a.name}</div>
                    <div className="mt-1 text-muted-foreground">
                      {a.share ? `About ${a.share}% of buyers` : "Share not stated"} · {a.intensity ? `${a.intensity} intensity` : "intensity not stated"}
                    </div>
                    <div className={cn("mt-1", a.quotes >= 2 ? "text-emerald-700" : a.inferred ? "text-amber-700" : "text-red-700")}>{a.quotes >= 2 ? `Backed by ${a.quotes} customer quotes` : a.inferred ? "Inferred: not yet backed by reviews" : "No customer quotes behind it"}</div>
                  </div>))}
              </div>)}
            <DocView doc="avatars" sections={docs.avatars.doc.sections}/>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    Personas in use for ads
                    <Link href="/personas" className="text-xs font-normal text-primary hover:underline" data-testid="open-personas">
                      Open the persona builder
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {brand.personas.map((p) => (<div key={p.id} className="rounded-md border p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium">{p.name}</span>
                        {advanced && <span className="text-xs text-muted-foreground">{p.id}</span>}
                      </div>
                      <p className="text-muted-foreground">{p.summary}</p>
                      <div className="mt-1">
                        <span className="text-muted-foreground">Problem:</span> {p.problem}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trigger:</span> {p.trigger}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.language.map((l) => (<Badge key={l} variant="secondary" className="h-auto max-w-full shrink justify-start whitespace-normal rounded-md text-left font-normal">
                            “{l}”
                          </Badge>))}
                      </div>
                    </div>))}
                </CardContent>
              </Card>
              <PeopleCard people={loadPeople(row.id)}/>
            </div>
          </>)}

        {tab === "competitors" &&
            (() => {
                const d = docs.competitors.doc;
                const list = competitorsOf(d);
                const root = sec(d, "profiles");
                const land = sec(d, "landscape");
                const skip = [...(root ? [root.id, ...childrenOf(d, root).map((s) => s.id)] : []), ...(land ? [land.id] : [])];
                return (<>
                {todo("competitors")}
                <div>
                  <h2 className="display mb-4 text-3xl" data-testid="competitor-count">
                    {list.length} competitor{list.length === 1 ? "" : "s"}
                  </h2>
                  <div className="space-y-3">
                    {list.map((c) => (<CompetitorCard key={c.id} c={c} fields={PROFILE_FIELDS.map((f) => ({ key: f.key, hint: f.hint }))} live={live} siteRead={competitorSite(row.id, c.name)?.at ?? ""}/>))}
                    <AddCompetitor />
                  </div>
                </div>
                {land && (<Card>
                    <CardHeader>
                      <CardTitle className="text-base">The landscape at a glance</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="mb-2 text-muted-foreground">Built from the profiles above: edit a profile and this table follows.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm" data-testid="landscape">
                          <thead>
                            <tr>
                              {["Competitor", "Positioning", "Price", "What they do well", "Gap we can own"].map((h) => (<th key={h} className="border-b border-rule py-1.5 pr-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((c) => (<tr key={c.id} className="border-b align-top last:border-b-0">
                                <td className="py-1.5 pr-3 font-medium">{c.name}</td>
                                {["Positioning", "Price", "What they do well", "Gap we can own"].map((k) => (<td key={k} className="py-1.5 pr-3">{c.fields[k] || <span className="italic text-muted-foreground">Blank</span>}</td>))}
                              </tr>))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>)}
                <DocView doc="competitors" sections={d.sections} skip={skip}/>
              </>);
            })()}

        {tab === "winning" && (<>
            {todo("winning")}
            <AddWinner kinds={WINNER_KINDS}/>
            <DocView doc="winning" sections={docs.winning.doc.sections}/>
          </>)}

        {tab === "changes" && (<>
            {todo("changes")}
            <AddChange types={CHANGE_TYPES}/>
            {sec(docs.changes.doc, "changeLog") && <SectionCard doc="changes" section={sec(docs.changes.doc, "changeLog")!}/>}
            <DocView doc="changes" sections={docs.changes.doc.sections} skip={sec(docs.changes.doc, "changeLog") ? [sec(docs.changes.doc, "changeLog")!.id] : []}/>
          </>)}

        {tab === "facts" && (<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <p className="max-w-3xl text-sm text-muted-foreground lg:col-span-2">The facts a check can hold a writer to: prices, the guarantee, the claims the brand can stand behind and the ones it must never make.</p>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Offers and guarantee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {brand.offers.map((o) => (<div key={o.id} className="rounded-md border p-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{o.name}</span>
                      <span className="tabular-nums">
                        {currencySymbol(b.currency)}
                        {o.price}
                        {o.per_day !== undefined && <span className="text-muted-foreground"> · {currencySymbol(b.currency)}{o.per_day.toFixed(2)}/day</span>}
                      </span>
                    </div>
                    {advanced && <div className="text-xs text-muted-foreground">{o.id}</div>}
                    {o.notes && <p className="mt-1 text-muted-foreground">{o.notes}</p>}
                  </div>))}
                {brand.guarantee && (<div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="font-medium">Guarantee · {brand.guarantee.window_days} days</div>
                    <p>{brand.guarantee.text}</p>
                  </div>)}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Forbidden claims</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {brand.forbidden_claims.map((f) => (<span key={f} className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                      {f}
                    </span>))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Proof assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {brand.proof_assets.map((p) => (<li key={p}>{tabNames(p)}</li>))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {brand.claims.map((c) => (<tr key={c.id} className="border-t first:border-t-0">
                        <td className="py-2 pr-3">{c.text}</td>
                        <td className="w-32 py-2">
                          <span className={cn("rounded-full border px-2 py-0.5 text-xs", claimTone[c.status])}>{c.status === "substantiated" ? "Approved" : c.status === "pending" ? "Waiting" : "Rejected"}</span>
                        </td>
                        {advanced && (<td className="w-72 py-2 text-xs text-muted-foreground">
                            <span className={cn("mr-1.5 rounded-full border px-1.5 py-0.5", c.origin === "website" ? "border-sky-200 bg-sky-50 text-sky-700" : c.origin === "ad" ? "border-violet-200 bg-violet-50 text-violet-700" : "")} data-testid="claim-origin">
                              {c.origin === "website" ? "Website" : c.origin === "ad" ? "Ad" : "Brand documents"}
                            </span>
                            {tabNames(c.source)}
                          </td>)}
                      </tr>))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <ClaimSourcesCard register={loadClaimSources(row.id)} conflicts={brandConflicts(row.id)} defaultUrl={site} live={live} held={claimsHeld(row.id)}/>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Voice rules the checks use</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <div className="mb-1 font-medium text-emerald-700">Do</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {brand.voice.do.map((v) => (<li key={v}>{v}</li>))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 font-medium text-red-700">Don&apos;t</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {brand.voice.dont.map((v) => (<li key={v}>{v}</li>))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>)}

        {tab === "sources" &&
            (() => {
                const counts = Object.fromEntries(db
                    .select({ t: schema.sourceItems.source_type, n: sql<number> `count(*)` })
                    .from(schema.sourceItems)
                    .where(eq(schema.sourceItems.brand_id, row.id))
                    .groupBy(schema.sourceItems.source_type)
                    .all()
                    .map((r) => [r.t, r.n]));
                const catalog = catalogOf(docs.products.doc);
                const states = sourceStates(counts, {
                    website: !!look || folder.markdownFiles.includes("website.md"),
                    store: catalog.some((p) => /\/products\//.test(p.url)),
                    account: fs.existsSync(accountFile(row.dir)),
                    winning: docs.winning.doc.sections.filter((s) => /^ad\s*\d+/i.test(s.title)).length,
                    competitors: competitorsOf(docs.competitors.doc).length,
                });
                const tone = { live: "border-emerald-200 bg-emerald-50 text-emerald-700", files: "border-sky-200 bg-sky-50 text-sky-700", none: "border-border bg-muted text-muted-foreground" } as const;
                const word = { live: "Read by the app", files: "Added by hand", none: "Not connected" } as const;
                const groups = [...new Set(states.map((s) => s.group))];
                return (<div className="space-y-4" data-testid="data-sources">
                <p className="max-w-3xl text-sm text-muted-foreground">Where the brain&apos;s facts come from. No account is connected yet: each row says what the account would give the brain, and what stands in for it today. A source with nothing behind it stays empty. Nothing is made up to fill it.</p>
                {groups.map((g) => (<Card key={g}>
                    <CardHeader>
                      <CardTitle className="text-base">{g}</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {states
                            .filter((s) => s.group === g)
                            .map((s) => (<tr key={s.id} className="border-t align-top first:border-t-0" data-testid={`source-${s.id}`}>
                                <td className="w-44 py-2 pr-3 font-medium">{s.name}</td>
                                <td className="w-36 py-2 pr-3">
                                  <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-xs", tone[s.status])}>{word[s.status]}</span>
                                </td>
                                <td className="py-2 pr-3">
                                  {s.gives}
                                  <span className="block text-xs text-muted-foreground">
                                    Feeds: {s.feeds.map((f) => BRAIN_DOCS.find((d) => d.id === f)!.label).join(", ")}. {s.holds}.{s.standIn ? ` Today: ${s.standIn}` : ""}
                                  </span>
                                </td>
                              </tr>))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>))}
              </div>);
            })()}
      </div>
    </div>);
}
