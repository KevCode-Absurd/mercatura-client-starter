import { EmptyNext } from "@/components/empty-next";
import { and, eq, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/bits";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage } from "@/lib/media/providers";
import { boardJob } from "@/lib/production/board-job";
import { pastTime } from "@/lib/jobs/past-time-server";
import { getJobs, getScripts } from "@/lib/queries";
import { isAdvanced } from "@/lib/ui-mode-server";
import { BeingMade } from "./being-made";
import { Kanban, UsageMeter } from "./kanban";
import { MakeAssetsButton } from "./make-assets";
import type { Busy } from "./shared";
import Link from "next/link";
import { CreatorProcess } from "@/components/creator-process";
import { conceptAssetScope, finishedCreative } from "@/lib/concept-assets";
import { notFound } from "next/navigation";
export default async function ProductionPage({ searchParams }: {
    searchParams: Promise<{
        job?: string;
        making?: string;
        at?: string;
        script?: string;
        concept?: string;
        variant?: string;
        finished?: string;
    }>;
}) {
    const { job: openId, making, at, script: onlyScript, concept: conceptId, variant, finished } = await searchParams;
    const brandId = await activeBrandId();
    const scope = conceptId ? conceptAssetScope(brandId, conceptId, variant) : null;
    if (conceptId && !scope)
        notFound();
    const backToConcept = scope ? `/concepts${scope.planId ? `?brief=${encodeURIComponent(scope.planId)}` : ""}#${encodeURIComponent(scope.concept.id)}` : "/concepts";
    const allScripts = getScripts(brandId);
    const scopedScripts = new Set(allScripts.filter((s) => !scope || scope.ids.includes(s.concept_id)).map((s) => s.id));
    const jobs = getJobs(brandId).filter((j) => scopedScripts.has(j.script_id) && (finished !== "1" || finishedCreative(j))).map(boardJob);
    const scripts = Object.fromEntries(allScripts.filter((s) => scopedScripts.has(s.id)).map((s) => [s.id, { id: s.id, title: s.title, hooks: s.hook_variants.map((h) => ({ id: h.id, text: h.text })) }]));
    const busy: Record<string, Busy> = {};
    const live = db
        .select({ ref: schema.jobs.ref_id, status: schema.jobs.status, since: schema.jobs.updated_at })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "production"), inArray(schema.jobs.status, ["queued", "running"])))
        .all();
    for (const j of live)
        if (j.ref && (j.status === "queued" || j.status === "running"))
            busy[j.ref] = { status: j.status, since: j.since };
    const advanced = await isAdvanced("production");
    return (<div className="mx-auto max-w-[100rem]">
      <PageHeader title="Production" subtitle={advanced ? "Briefs, image ads and videos made from your scripts. Paid steps only run when you click." : "Briefs, image ads and videos made from your scripts. Steps only run when you click."}>
        {advanced && <UsageMeter usage={mediaUsage()}/>}
        <MakeAssetsButton />
        <Link className="text-sm underline" href={onlyScript ? `/studio/creator?script=${encodeURIComponent(onlyScript)}` : "/studio/creator"}>Choose or review a creator</Link>
        <Link className="text-sm underline" href="/video-editing?mode=ad">Edit existing ad footage</Link>
      </PageHeader>
      {scope && <div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-4 text-sm" data-testid="concept-assets-filter"><span>{finished === "1" ? "Finished assets" : "Assets"} for <strong>{scope.concept.name}{variant ? ` · Variant ${variant}` : ""}</strong>. Includes earlier saved versions.</span><Link href={backToConcept} className="text-primary underline">Back to concepts</Link><Link href="/production" className="ml-auto text-primary underline">Show all production</Link></div>}

      {(onlyScript || jobs.some((j) => j.id === openId)) && <div className="px-6 pt-4"><CreatorProcess current="Storyboard" scriptId={onlyScript || jobs.find((j) => j.id === openId)?.script_id || undefined} jobId={jobs.some((j) => j.id === openId) ? openId : undefined} brandId={brandId} avatarId={jobs.find((j) => j.id === openId)?.production?.avatar_id ?? undefined}/></div>}
      <BeingMade making={making} at={at} jobs={jobs} now={Date.now()} scriptTime={pastTime("script")}/>
      {jobs.length === 0 && (scope ? <EmptyNext title="No finished creatives yet" why="Finished images, videos and creator briefs for this concept appear here after production." href={backToConcept} act="Back to concepts"/> : Object.keys(scripts).length ? <EmptyNext title="Nothing in production yet" why="Briefs, image ads and videos are made from a script. Press Make assets above and pick a script and a format." href="/scripts" act="Open the scripts"/> : <EmptyNext title="Nothing in production yet, and no script to make it from" why="Production turns a script into a brief, a static ad, a carousel or a video. Write or upload a script first. For image ads with no script, use Create." href="/scripts" act="Go to Scripts" also={{ href: "/studio", label: "Create image ads" }}/>)}
      <Kanban finishedOnly={finished === "1"} key={`${conceptId ?? ""}:${variant ?? ""}:${finished ?? ""}:${onlyScript ?? ""}`} scriptId={onlyScript && scripts[onlyScript] ? onlyScript : undefined} openId={jobs.some((j) => j.id === openId) ? openId : undefined} jobs={jobs} scripts={scripts} busy={busy} live={llmEnabled()}/>
    </div>);
}
