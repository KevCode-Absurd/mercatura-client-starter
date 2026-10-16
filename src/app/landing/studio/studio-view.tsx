"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, ImagePlus, Loader2, Plus, Search } from "lucide-react";
import type { CroRun, CroReviewFinding } from "@/lib/landing/studio-types";
import { StudioIntake } from "./studio-intake";
import { StudioAudit } from "./studio-audit";
import { StudioCanvas } from "./studio-canvas";
import { BrandCard, button, labels, type BrandReview } from "./studio-shared";
type Props = {
    ads: {
        id: string;
        title: string;
        productId: string;
        personaId: string;
        promise: string;
        awareness: string;
    }[];
    brandId: string;
    brandName: string;
    brandReview: BrandReview;
    siteUrl: string;
    products: {
        id: string;
        name: string;
        url: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    initialId?: string;
    initialAdId?: string;
    initialUrl: string;
    initialMode: string;
    history: {
        id: string;
        title: string;
        status: string;
    }[];
};
export function CroStudio(props: Props) {
    const [run, setRun] = useState<CroRun | null>(null), [findings, setFindings] = useState<CroReviewFinding[]>([]), [busy, setBusy] = useState(false), [loading, setLoading] = useState(!!props.initialId), [error, setError] = useState("");
    const [view, setView] = useState<"audit" | "design" | "brief">("audit"), [dirty, setDirty] = useState(false), [jobError, setJobError] = useState(""), [jobStatus, setJobStatus] = useState("");
    const [reviewDirty, setReviewDirty] = useState(false);
    const savedSections = useRef<CroRun["sections"]>([]);
    useEffect(() => { const prevent = (event: BeforeUnloadEvent) => { if (dirty || reviewDirty) {
        event.preventDefault();
        event.returnValue = "";
    } }; window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent); }, [dirty, reviewDirty]);
    const dirtyRef = useRef(false);
    dirtyRef.current = dirty;
    const working = !!run && ["queued", "running"].includes(run.status) && !["failed", "paused", "stopped"].includes(jobStatus);
    const pdpImagesUrl = run?.evidence ? `/landing/images?evidence=${encodeURIComponent(run.evidence.id)}&product=${encodeURIComponent(run.request.productId)}` : "/landing/images";
    async function load(id: string) { const response = await fetch(`/api/landing/studio?id=${encodeURIComponent(id)}`), data = await response.json(); if (!response.ok)
        throw new Error(data.error || "Could not load this project."); if (!dirtyRef.current) {
        setRun(data.run);
        savedSections.current = structuredClone(data.run.sections);
        setFindings(data.reviewFindings || []);
        setJobError(data.job?.error || "");
        setJobStatus(data.job?.status || "");
    } return data.run as CroRun; }
    useEffect(() => { if (props.initialId)
        load(props.initialId).catch(error => setError(error.message)).finally(() => setLoading(false)); }, [props.initialId]);
    useEffect(() => { if (!run || !working)
        return; return pollWhileVisible(() => load(run.id).catch(error => setError(error.message)), 2500); }, [run?.id, working]);
    async function action(data: Record<string, unknown>) { setBusy(true); setError(""); try {
        const response = await fetch(["local-check", "choose-section", "reuse-section", "create-slot-image", "assign-slot-image"].includes(String(data.action)) ? "/api/landing/studio/workbench" : "/api/landing/studio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: props.brandId, ...data }) }), result = await response.json();
        if (!response.ok)
            throw new Error(result.error || "Could not complete this action.");
        if (result.run) {
            setRun(result.run);
            savedSections.current = structuredClone(result.run.sections);
            setDirty(false);
            dirtyRef.current = false;
            setJobError("");
            setJobStatus(result.jobId ? "queued" : "done");
            if (result.reviewFindings)
                setFindings(result.reviewFindings);
            else if (data.action === "create")
                setFindings([]);
            window.history.replaceState({}, "", `/landing/studio?id=${result.run.id}`);
            if (data.action === "create")
                setView("audit");
        }
        return result;
    }
    catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong.");
        return null;
    }
    finally {
        setBusy(false);
    } }
    async function open(id: string) { setLoading(true); setError(""); try {
        await load(id);
        setView("audit");
        window.history.replaceState({}, "", `/landing/studio?id=${id}`);
    }
    catch (error) {
        setError(error instanceof Error ? error.message : "Could not open project.");
    }
    finally {
        setLoading(false);
    } }
    const exportUrl = (format: string) => `/api/landing/studio/${run?.id}/export?format=${format}`;
    const stage = run ? (working ? (run.request.build ? "Building your approved page" : "Auditing & preparing your review") : run.status === "done" && run.sections.length ? "Design ready to review" : run.status === "failed" ? "Needs attention" : run.approval ? "Scope approved" : run.audit ? "Ready for your review" : "Preparing project") : "";
    return <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-8 sm:px-8" data-testid="cro-studio">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground"><span className="size-2 rounded-full bg-emerald-500"/>D2C commerce / {props.brandName}</div><h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Build the reason to buy.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A clear brief. An evidence-led audit. A page built around the changes you choose.</p></div><div className="flex flex-wrap gap-2"><Link href={run ? `/landing/quality?source=${encodeURIComponent(run.id)}` : "/landing/quality"} className={button}>Page quality</Link><Link href="/landing/inspiration" className={button}><Search className="size-4"/>Inspiration</Link><Link href={pdpImagesUrl} className={button}><ImagePlus className="size-4"/>PDP images</Link>{run && <button disabled={dirty || reviewDirty || busy} className={button} onClick={() => { setRun(null); setFindings([]); setDirty(false); setJobError(""); setJobStatus(""); setView("audit"); window.history.replaceState({}, "", "/landing/studio"); }}><Plus className="size-4"/>New project</button>}</div></header>
    {(error || jobError) && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || jobError}</div>}
    {loading ? <div className="flex items-center justify-center gap-3 rounded-2xl border p-20 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin"/>Loading saved project…</div> : !run ? <StudioIntake {...props} busy={busy} action={action} open={open}/> : <>
      <div className="mb-6 rounded-2xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{labels[run.request.pageType]} · {run.auditKind === "readiness" ? "First principles" : run.request.inspirationUrl ? "With design inspiration" : "Own-page improvement"}</p><h2 className="mt-2 text-xl font-semibold">{run.blueprint?.title || run.evidence?.title || run.brand.name}</h2><p className="mt-2 flex items-center gap-2 text-sm font-medium">{working && <Loader2 className="size-4 animate-spin"/>}{stage}</p><p className="mt-1 text-xs text-muted-foreground" role="status">{run.stage}</p></div><div className="flex flex-wrap gap-2">{run.audit && <a className={button} href={exportUrl("report-md")}><Download className="size-4"/>Audit report</a>}{run.sections.length > 0 && <><a aria-disabled={dirty} className={`${button} ${dirty ? "pointer-events-none opacity-40" : ""}`} href={dirty ? undefined : exportUrl("html")}>HTML</a><a aria-disabled={dirty} className={`${button} ${dirty ? "pointer-events-none opacity-40" : ""}`} href={dirty ? undefined : exportUrl("liquid")}>Shopify Liquid</a></>}{(run.status === "failed" || jobError) && !working && <button className={button} disabled={busy || dirty} onClick={() => action({ action: "retry", id: run.id, revision: run.revision })}>Resume saved work</button>}</div></div>{run.error && <p className="mt-3 text-sm text-red-700">{run.error}</p>}<div className="mt-5 flex flex-wrap items-center gap-1 border-t pt-4">{(["audit", "design", "brief"] as const).map(tab => <button key={tab} onClick={() => setView(tab)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === tab ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"}`}>{tab === "audit" ? "Visual audit" : tab === "design" ? "Page design" : "Strategy & evidence"}</button>)}<span className="ml-auto text-xs text-muted-foreground">Model spend ${run.costUsd.toFixed(2)}</span></div></div>
      <div hidden={view !== "audit"}><StudioAudit key={run.id} run={run} findings={findings} busy={busy || dirty} working={working} action={action} onDirty={setReviewDirty} onBuild={async () => { const result = await action({ action: "build", id: run.id, revision: run.revision }); if (result)
            setView("design"); }}/></div>
      <div hidden={view !== "design"}><StudioCanvas run={run} busy={busy} working={working} dirty={dirty} onSections={sections => { setRun({ ...run, sections }); setDirty(JSON.stringify(sections) !== JSON.stringify(savedSections.current)); }} action={action}/></div>
      {view === "brief" && <div className="grid items-start gap-6 lg:grid-cols-2"><div className="space-y-6"><div className="rounded-2xl border p-6"><h3 className="font-serif text-2xl">The page argument</h3><p className="mt-4 text-sm leading-7 text-muted-foreground">{run.blueprint?.strategy || run.request.goal || "The strategy appears after your audit and explicit build approval."}</p>{run.blueprint?.sections.map((section, index) => <div className="mt-5 border-t pt-4" key={section.id}><h4 className="font-semibold">{index + 1}. {section.label}</h4><p className="mt-2 whitespace-pre-line text-sm leading-6">{section.purpose}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{section.layout}</p></div>)}</div><div className="rounded-2xl border p-6"><h3 className="font-semibold">Knowledge used in this project</h3>{run.knowledge.map(item => <div key={item.id} className="mt-4 border-t pt-3"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 break-all text-xs text-muted-foreground">{item.source}</p></div>)}</div></div><BrandCard brand={{ ...props.brandReview, snapshot: run.brand }}/></div>}
    </>}
  </div>;
}
