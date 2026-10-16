"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2, Search } from "lucide-react";
import { CRO_PAGE_TYPES, type CroRequest } from "@/lib/landing/studio-types";
import type { DiscoveredPage } from "@/lib/landing/evidence";
import { BrandCard, button, primary, input, fieldLabel, labels, type BrandReview } from "./studio-shared";
import { BuyingTaskFields, defaultBuyingTask } from "../buying-task-fields";
export type IntakeProps = {
    ads?: {
        id: string;
        title: string;
        productId: string;
        personaId: string;
        promise: string;
        awareness: string;
    }[];
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
    initialAdId?: string;
    initialUrl: string;
    initialMode: string;
    history: {
        id: string;
        title: string;
        status: string;
    }[];
    busy: boolean;
    action: (data: Record<string, unknown>) => Promise<any>;
    open: (id: string) => void;
};
const awarenessLabel = (value = "") => value.replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
export function StudioIntake(props: IntakeProps) {
    const [taskBrief, setTaskBrief] = useState(defaultBuyingTask);
    const initialAd = props.ads?.find(a => a.id === props.initialAdId);
    const [adId, setAdId] = useState(initialAd?.id || "");
    const [step, setStep] = useState(0), [pageType, setPageType] = useState<CroRequest["pageType"]>("pdp"), [productId, setProductId] = useState(initialAd?.productId || props.products[0]?.id || "");
    const [personaId, setPersonaId] = useState(initialAd?.personaId || ""), [sourceUrl, setSourceUrl] = useState(props.initialMode === "reference" ? "" : props.initialUrl), [fresh, setFresh] = useState(false), [scope, setScope] = useState<"page" | "store">("page");
    const [goal, setGoal] = useState(initialAd ? `Carry the ad promise into the page: ${initialAd.promise}` : ""), [trafficSource, setTrafficSource] = useState(initialAd ? "Paid social" : ""), [awarenessStage, setAwarenessStage] = useState(awarenessLabel(initialAd?.awareness)), [notes, setNotes] = useState("");
    const [inspirationUrl, setInspirationUrl] = useState(props.initialMode === "reference" ? props.initialUrl : ""), [fidelity, setFidelity] = useState<CroRequest["fidelity"]>("structure"), [brandConfirmed, setBrandConfirmed] = useState(false);
    const [pages, setPages] = useState<DiscoveredPage[]>([]), [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const defaultUrl = pageType === "home" || scope === "store" ? props.siteUrl : props.products.find(p => p.id === productId)?.url || props.siteUrl;
    const ownUrl = fresh ? "" : sourceUrl.trim() || defaultUrl;
    const mode = fresh ? "scratch" : inspirationUrl.trim() ? "reference" : "audit";
    const canContinue = step === 0 ? (fresh || !!ownUrl) : !!goal.trim();
    async function submit() { await props.action({ action: "create", taskBrief: taskBrief.buyerQuestion.trim() ? taskBrief : undefined, adId, mode, pageType, productId, personaId, scope: fresh ? "page" : scope, sourceUrl: ownUrl, inspirationUrl: inspirationUrl.trim(), fidelity, goal, trafficSource, awarenessStage, notes, selectedUrls: fresh ? [] : selectedUrls, build: false }); }
    return <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
    <div className="overflow-hidden rounded-2xl border bg-card"><div className="grid grid-cols-3 border-b bg-secondary/30">{["Your page", "Your brief", "Your brand"].map((label, i) => <button key={label} disabled={i > step} onClick={() => setStep(i)} className={`flex items-center justify-center gap-2 px-2 py-5 text-xs font-semibold sm:text-sm ${step === i ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}><span className={`grid size-6 place-items-center rounded-full ${step === i ? "bg-foreground text-background" : "border"}`}>{step > i ? <Check className="size-3"/> : i + 1}</span>{label}</button>)}</div>
      <div className="p-6 sm:p-8">
      {step === 0 && <div className="space-y-6"><div><p className={fieldLabel}>Start with your business</p><h2 className="font-serif text-3xl">What are we improving?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Choose your page and product first. Inspiration is optional, and every path begins with an audit.</p></div>
        <label className="block"><span className={fieldLabel}>Follow a saved ad or video script (optional)</span><select className={input} value={adId} onChange={e => { setAdId(e.target.value); const ad = props.ads?.find(a => a.id === e.target.value); if (ad) {
            if (ad.productId)
                setProductId(ad.productId);
            if (ad.personaId)
                setPersonaId(ad.personaId);
            setGoal(`Carry the ad promise into the page: ${ad.promise}`);
            setTrafficSource("Paid social");
            setAwarenessStage(awarenessLabel(ad.awareness));
        } }}><option value="">Start with the page brief</option>{props.ads?.map(ad => <option value={ad.id} key={ad.id}>{ad.title}</option>)}</select><span className="mt-2 block text-xs text-muted-foreground">Carries the saved product, audience and promise. Offer terms remain subject to Brand Brain review.</span></label><div className="grid gap-5 sm:grid-cols-2"><label><span className={fieldLabel}>Page or funnel type</span><select className={input} value={pageType} onChange={e => { setPageType(e.target.value as CroRequest["pageType"]); setSourceUrl(""); setSelectedUrls([]); setPages([]); }}>{CRO_PAGE_TYPES.map(type => <option key={type} value={type}>{labels[type]}</option>)}</select></label><label><span className={fieldLabel}>Your product</span><select className={input} value={productId} onChange={e => { setProductId(e.target.value); setSourceUrl(""); setPages([]); setSelectedUrls([]); }}><option value="">Brand / multiple products</option>{props.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
        <div className="grid gap-3 sm:grid-cols-2">{[{ id: false, title: "Improve an existing page", text: "Capture the real page and find buying friction." }, { id: true, title: "Start from first principles", text: "Audit the brief, evidence and readiness for a new page." }].map(choice => <button key={String(choice.id)} onClick={() => setFresh(choice.id)} className={`rounded-xl border p-4 text-left ${fresh === choice.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-secondary"}`}><p className="text-sm font-semibold">{choice.title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{choice.text}</p></button>)}</div>
        {!fresh && <><label className="block"><span className={fieldLabel}>Your page URL</span><input type="url" className={input} placeholder={defaultUrl || "https://your-store.com/products/your-product"} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}/><span className="mt-2 block break-all text-xs text-muted-foreground">{sourceUrl ? "This page will be audited." : `From Brand Brain: ${defaultUrl || "Add a URL to continue."}`}</span></label><div className="flex flex-wrap items-end gap-3"><label className="min-w-52 flex-1"><span className={fieldLabel}>Coverage</span><select className={input} value={scope} onChange={e => setScope(e.target.value as "page" | "store")}><option value="page">This page</option><option value="store">Discover my store</option></select></label><button className={button} disabled={props.busy || !ownUrl} onClick={async () => { const result = await props.action({ action: "discover", url: ownUrl }); if (result)
            setPages(result.pages); }}>{props.busy ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>}Find pages</button></div></>}
        {!fresh && pages.length > 0 && <div className="max-h-72 overflow-auto rounded-xl border"><p className="border-b bg-secondary/40 p-3 text-xs text-muted-foreground">Choose up to 12 additional pages to audit.</p>{pages.map(page => <label key={page.url} className="flex cursor-pointer gap-3 border-b p-3 text-sm last:border-0"><input type="checkbox" checked={selectedUrls.includes(page.url)} onChange={() => setSelectedUrls(current => current.includes(page.url) ? current.filter(url => url !== page.url) : [...current, page.url].slice(0, 12))}/><span className="min-w-0"><span className="block truncate font-medium">{page.title || page.kind}</span><span className="block truncate text-xs text-muted-foreground">{page.url}</span></span></label>)}</div>}
      </div>}
      {step === 1 && <div className="space-y-6"><div><p className={fieldLabel}>Give the page a job</p><h2 className="font-serif text-3xl">A better brief. A better page.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Set the buying goal and the visitor's context. Brand Brain supplies the product facts and voice.</p></div><label className="block"><span className={fieldLabel}>Primary goal</span><textarea className={input} rows={3} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Help first-time visitors understand the product and confidently choose their first pack."/></label>
        <div className="grid gap-5 sm:grid-cols-2"><label><span className={fieldLabel}>Customer</span><select className={input} value={personaId} onChange={e => setPersonaId(e.target.value)}><option value="">Use the product's audience</option>{props.personas.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label><span className={fieldLabel}>Traffic source</span><select className={input} value={trafficSource} onChange={e => setTrafficSource(e.target.value)}><option value="">Mixed / not yet decided</option>{["Paid social", "Paid search", "Organic search", "Email / SMS", "Direct / returning visitors", "Creator / affiliate"].map(value => <option key={value}>{value}</option>)}</select></label><label><span className={fieldLabel}>Visitor awareness</span><select className={input} value={awarenessStage} onChange={e => setAwarenessStage(e.target.value)}><option value="">Mixed / not yet decided</option>{["Unaware", "Problem aware", "Solution aware", "Product aware", "Most aware"].map(value => <option key={value}>{value}</option>)}</select></label></div>
        <BuyingTaskFields value={taskBrief} onChange={setTaskBrief}/>
        <label className="block"><span className={fieldLabel}>Context and constraints</span><textarea className={input} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Offer, objections, non-negotiables, sections to preserve, or the ad visitors saw…"/></label>
        <details open={!!inspirationUrl} className="rounded-xl border bg-secondary/20 p-5"><summary className="cursor-pointer text-sm font-semibold">Add design inspiration (optional)</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">Borrow hierarchy and structure while keeping your own brand, product and claims. Your own page is still audited independently.</p><label className="mt-4 block"><span className={fieldLabel}>Inspiration URL</span><input type="url" className={input} value={inspirationUrl} onChange={e => setInspirationUrl(e.target.value)} placeholder="https://a-brand-you-admire.com/products/example"/></label><label className="mt-4 block"><span className={fieldLabel}>Creative freedom</span><select className={input} value={fidelity} onChange={e => setFidelity(e.target.value as CroRequest["fidelity"])}><option value="exact">Close structural adaptation</option><option value="structure">Balanced adaptation</option><option value="loose">Flexible inspiration</option></select></label></details>
      </div>}
      {step === 2 && <div className="space-y-6"><div><p className={fieldLabel}>Check the source of truth</p><h2 className="font-serif text-3xl">Your brand stays yours.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Review the actual colors, fonts, language and approved facts that this project will use.</p></div><BrandCard brand={props.brandReview}/><div className="rounded-xl border p-5"><p className={fieldLabel}>Audit brief</p><p className="font-semibold">{labels[pageType]} · {props.products.find(p => p.id === productId)?.name || "Brand / multiple products"}</p><p className="mt-2 text-sm leading-6">{goal}</p><p className="mt-2 break-all text-xs text-muted-foreground">{ownUrl || "First-principles readiness audit"}</p>{inspirationUrl && <p className="mt-2 break-all text-xs text-muted-foreground">Inspiration: {inspirationUrl}</p>}<p className="mt-2 text-xs text-muted-foreground">{trafficSource || "Mixed traffic"} · {awarenessStage || "Mixed awareness"}</p></div><label className="flex items-start gap-3 rounded-xl bg-secondary/40 p-4 text-sm leading-6"><input className="mt-1.5" type="checkbox" checked={brandConfirmed} onChange={e => setBrandConfirmed(e.target.checked)}/>I have reviewed the brand details and this brief.</label><p className="text-xs leading-6 text-muted-foreground">Next: review the audit, accept or reject each recommendation, and add your notes. Building starts only after you approve that scope and click Build. Analysis uses configured models and existing spend limits.</p></div>}
      <div className="mt-8 flex items-center justify-between gap-4 border-t pt-6"><button className={button} disabled={!step || props.busy} onClick={() => setStep(value => value - 1)}><ArrowLeft className="size-4"/>Back</button>{step < 2 ? <button className={primary} disabled={!canContinue || props.busy} onClick={() => setStep(value => value + 1)}>Continue <ArrowRight className="size-4"/></button> : <button className={primary} disabled={!brandConfirmed || props.busy} onClick={submit}>{props.busy ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>}Start audit</button>}</div>
      </div>
    </div><aside className="space-y-5"><div className="rounded-2xl bg-[#182c28] p-6 text-[#f2f6ed]"><p className="text-xs uppercase tracking-[.2em] text-[#b9cdbb]">A considered workflow</p>{["Brief & Brand Brain", "Audit the experience", "Choose the improvements", "Build & refine your page"].map((title, i) => <div key={title} className="mt-5 flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/25 text-xs">{i + 1}</span><span className="text-sm">{title}</span></div>)}</div><div className="rounded-2xl border p-6"><h3 className="font-semibold">Recent projects</h3>{props.history.length ? props.history.slice(0, 8).map(project => <button className="mt-3 flex w-full items-center gap-3 border-t pt-3 text-left text-sm" key={project.id} onClick={() => props.open(project.id)}><span className="min-w-0 flex-1"><span className="block truncate">{project.title}</span><span className="text-xs capitalize text-muted-foreground">{project.status}</span></span><ChevronRight className="size-4"/></button>) : <p className="mt-3 text-sm text-muted-foreground">Your saved projects will appear here.</p>}</div></aside>
  </div>;
}
