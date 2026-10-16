"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SeoContext } from "@/lib/seo/model";
import { slug } from "@/lib/seo/content";
import Link from "next/link";
import { EDITORIAL_RECIPES } from "@/lib/seo/editorial-quality";
import type { BlogSeed, SourcedBlogInput } from "@/lib/seo/blog";
import { createSourcedBlogAction, queueSourcedBlogAction, loadArticleResourcesAction } from "./blog-actions";
import { fetchArticleSourceAction } from "./review-actions";
import type { ResearchCapture } from "@/lib/seo/research";
import type { ArticleResource } from "@/lib/seo/article-resources";
import { AtomicFactSchema } from "@/lib/production-evidence/facts";
import { ARTICLE_DEPTHS, assessArticleBrief, type ArticleDepth } from "@/lib/seo/article-quality";
type Form = Omit<SourcedBlogInput, "reviewed"> & {
    reviewed: boolean;
};
const emptySection = () => ({ heading: "", copy: "", sourceTitle: "", sourceUrl: "", limitations: "" });
const initial = (ctx: SeoContext, seed?: BlogSeed): Form => ({ contextHash: ctx.contextHash, keyword: seed?.keyword ?? "", productId: seed?.productId ?? ctx.products[0]?.id ?? "", targetUrl: seed?.targetUrl ?? "", planId: seed?.planId, audience: seed?.audience ?? "", decision: seed?.decision ?? "", title: seed?.title ?? "", description: seed?.description ?? "", format: seed?.format ?? "article", depth: seed?.depth ?? "standard", funnelStage: seed?.funnelStage, sections: seed?.sections?.length ? seed.sections : Array.from({ length: ARTICLE_DEPTHS[seed?.depth ?? "standard"].minSections }, emptySection), decisionType: seed?.decisionType ?? "selection", originalContribution: seed?.originalContribution, reviewed: false });
export function SourcedBlogPanel({ ctx, seed, editorPath = "/seo/content" }: {
    ctx: SeoContext;
    seed?: BlogSeed;
    editorPath?: string;
}) {
    const [form, setForm] = useState<Form>(() => initial(ctx, seed));
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [tupleErrors, setTupleErrors] = useState<Record<number, string>>({});
    const [tupleDrafts, setTupleDrafts] = useState<Record<number, string>>({});
    const [draftWithAi, setDraftWithAi] = useState(true);
    const [captures, setCaptures] = useState<Record<number, ResearchCapture>>({});
    const [fetching, setFetching] = useState<number | null>(null);
    const [resources, setResources] = useState<ArticleResource[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const resourceScope = `${ctx.brandId}:${ctx.contextHash}:${form.productId}`;
    const resourceScopeRef = useRef(resourceScope);
    useEffect(() => { resourceScopeRef.current = resourceScope; }, [resourceScope]);
    const readiness = assessArticleBrief(form);
    const router = useRouter();
    useEffect(() => { setForm(initial(ctx, seed)); setError(""); setTupleDrafts({}); setTupleErrors({}); setCaptures({}); setResources([]); }, [ctx.brandId, ctx.contextHash, seed?.keyword, seed?.productId, seed?.targetUrl, seed?.planId]);
    useEffect(() => { setResources([]); }, [form.productId]);
    function patch<K extends keyof Form>(key: K, value: Form[K]) { setForm((old) => ({ ...old, [key]: value, reviewed: key === "reviewed" ? Boolean(value) : false })); setError(""); }
    const field = (key: "keyword" | "audience" | "decision" | "title" | "description" | "targetUrl", label: string, max: number, multiline = false, placeholder?: string) => <label className="grid gap-1.5 text-sm" htmlFor={`blog-brief-${key}`}><span className="font-medium">{label}</span>{multiline ? <Textarea id={`blog-brief-${key}`} required value={form[key]} maxLength={max} rows={3} placeholder={placeholder} onChange={(event) => patch(key, event.target.value)}/> : <Input id={`blog-brief-${key}`} required value={form[key]} maxLength={max} placeholder={placeholder} onChange={(event) => patch(key, event.target.value)}/>}</label>;
    function submit(event: React.FormEvent) {
        event.preventDefault();
        setError("");
        if (Object.values(tupleErrors).some(Boolean)) {
            setError("Resolve the invalid or unfinished typed-fact JSON before submitting. Old valid mappings cannot be used while this field is invalid.");
            return;
        }
        if (!form.reviewed)
            return;
        startTransition(async () => {
            try {
                const result = await (draftWithAi ? queueSourcedBlogAction : createSourcedBlogAction)(ctx.brandId, { ...form, reviewed: true });
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                toast.success(draftWithAi ? "Article queued. You can close this page; progress and any retained response remain in Production queue." : "Sourced article draft saved. Review and edit it before approving export.");
                router.push(draftWithAi ? `/production-ops?id=${result.value.id}` : `${editorPath}?id=${result.value.id}`);
                router.refresh();
            }
            catch {
                setError("Could not save the draft. Your brief is still in this form; try again.");
            }
        });
    }
    return <section className="rounded-xl border bg-card p-5" data-testid="seo-sourced-blog-panel">
    <Badge variant="outline">Source-backed article</Badge>
    <h2 className="mt-3 text-xl font-semibold">Write the answer your buyer actually needs</h2>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Add a customer question and notes backed by sources. Create a draft with citations, then check the facts and edit it before downloading.</p>
    <details className="mt-4 rounded-lg bg-muted/40 p-3 text-sm"><summary className="cursor-pointer font-medium">Shared {ctx.brandName} context</summary><p className="mt-2">{ctx.category} · {ctx.market}</p><p className="mt-2">Voice: {ctx.voice.join("; ") || "Not specified in Brand Brain."}</p><p className="mt-2">{ctx.products.length} catalogue products. Shared claim restrictions apply. Brand-wide claims are not automatically treated as evidence for a selected SKU.</p></details>
    <Link href="/seo/editorial-quality" className="mt-4 inline-block text-sm font-medium text-primary underline">Plan buyer questions, review claims and compare offline editorial quality</Link>
    <form className="mt-5 grid gap-5" onSubmit={submit}>
      {form.planId && <p className="rounded-lg bg-muted/40 p-3 text-sm">Connected to your content plan. Keep the mapped keyword, product and URL unchanged to attach this draft to that task. <button type="button" className="underline" onClick={() => patch("planId", undefined)}>Detach and create a separate article</button></p>}
      <fieldset className="grid gap-2 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">How to create the article</legend><label className="flex items-start gap-2 text-sm"><input type="radio" name="blog-draft-mode" checked={draftWithAi} onChange={() => { setDraftWithAi(true); patch("reviewed", false); }}/><span>Draft article from source notes with AI. Uses the configured text model and shared spending limit; usage is logged.</span></label><label className="flex items-start gap-2 text-sm"><input type="radio" name="blog-draft-mode" checked={!draftWithAi} onChange={() => { setDraftWithAi(false); patch("reviewed", false); }}/><span>Assemble my finished copy unchanged. No model call.</span></label></fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm">Article depth<select aria-label="Article depth" disabled={Object.values(tupleErrors).some(Boolean)} className="rounded-md border bg-background p-2" value={form.depth ?? "standard"} onChange={e => { const depth = e.target.value as ArticleDepth; const filled = form.sections.filter(s => s.heading || s.copy || s.atomicFacts?.length); setTupleDrafts({}); patch("sections", [...filled, ...Array.from({ length: Math.max(0, ARTICLE_DEPTHS[depth].minSections - filled.length) }, emptySection)]); patch("depth", depth); }}><option value="short_answer">Short answer · focused FAQ</option><option value="standard">Substantial article · 800–1,400 words</option><option value="deep">In-depth guide · 1,400–2,200 words</option></select><span className="text-xs text-muted-foreground">Editorial depth targets. Build useful coverage from evidence; word count alone does not establish quality or ranking.</span></label>
        <label className="grid gap-1.5 text-sm">Editorial format<select className="rounded-md border bg-background p-2" value={form.format ?? "article"} onChange={(e) => patch("format", e.target.value as Form["format"])}><option value="article">Blog article</option><option value="listicle">Listicle</option><option value="comparison">Comparison guide</option></select></label>
        {field("keyword", "Exact shopper question / keyword", 180, false, "How do I choose a bottle for my work bag?")}
        <label className="grid gap-1.5 text-sm" htmlFor="blog-brief-product"><span className="font-medium">Relevant shared product</span><select className="rounded-md border bg-background p-2" id="blog-brief-product" value={form.productId} required onChange={(e) => patch("productId", e.target.value)}><option value="">Select a product</option>{ctx.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        {field("audience", "Who is asking, and in what situation?", 500, true, "Describe the buyer and the moment that brought them to this question.")}
        {field("decision", "What should the reader be able to decide?", 1000, true, "Define the useful outcome without assuming the brand is always the right answer.")}
        {field("title", "Article title", 180)}
        {field("description", "Search description", 320)}
      </div>
      <fieldset className="grid gap-3 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">Existing brand resources</legend><p className="text-sm text-muted-foreground">Load the selected product's catalogue and exact product document. Review the full text, then choose relevant passages for each section. Shared site text and neighboring products are excluded.</p><Button type="button" variant="outline" disabled={loadingResources || pending || !form.productId} onClick={async () => { setLoadingResources(true); setError(""); const productId = form.productId, requestScope = resourceScope; try {
        const result = await loadArticleResourcesAction(ctx.brandId, ctx.contextHash, productId);
        if (resourceScopeRef.current !== requestScope)
            return;
        if (!result.ok)
            setError(result.error);
        else
            setResources(result.resources);
    }
    catch {
        setError("Could not load the existing brand resources.");
    }
    finally {
        setLoadingResources(false);
    } }}>{loadingResources ? "Loading resources…" : "Load existing brand resources"}</Button>{resources.map(resource => <details key={resource.id} className="rounded-lg bg-muted/30 p-3"><summary className="cursor-pointer text-sm font-medium">{resource.title}</summary><p className="my-2 text-xs text-muted-foreground">{resource.scope}</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs">{resource.text}</pre></details>)}</fieldset>
      <fieldset className="grid gap-3 rounded-lg border p-4"><legend className="px-1 text-sm font-medium">Decision structure and original contribution</legend><label className="grid gap-1.5 text-sm">Buyer decision recipe<select className="rounded-md border bg-background p-2" value={form.decisionType ?? "selection"} onChange={e => patch("decisionType", e.target.value as Form["decisionType"])}>{Object.entries(EDITORIAL_RECIPES).map(([id, recipe]) => <option key={id} value={id}>{recipe.title}</option>)}</select></label><p className="text-sm text-muted-foreground">{EDITORIAL_RECIPES[form.decisionType ?? "selection"].sections.join(" → ")}</p><p className="text-xs text-muted-foreground">Facts to supply: {EDITORIAL_RECIPES[form.decisionType ?? "selection"].requiredFacts.join("; ")}. Missing facts remain source tasks rather than filler.</p><label className="grid gap-1.5 text-sm">Useful original contribution<textarea className="min-h-24 rounded-md border bg-background p-3" required minLength={10} maxLength={2000} placeholder="What product-specific decision aid, fit worksheet, matched criteria or documented explanation will this article add? No invented experience or tests." value={form.originalContribution?.description ?? ""} onChange={e => patch("originalContribution", { type: form.originalContribution?.type ?? "fit_worksheet", description: e.target.value })}/></label><label className="grid gap-1.5 text-sm">Contribution kind<select className="rounded-md border bg-background p-2" value={form.originalContribution?.type ?? "fit_worksheet"} onChange={e => patch("originalContribution", { type: e.target.value as NonNullable<Form["originalContribution"]>["type"], description: form.originalContribution?.description ?? "" })}>{["fit_worksheet", "comparison_criteria", "product_explanation", "measurement", "expert_clarification"].map(t => <option key={t}>{t}</option>)}</select></label><p className="text-xs text-muted-foreground">The AI writer must locate this contribution in its final prose. Assembly preserves your finished copy; use the editorial review to locate and check its contribution.</p></fieldset>
      <div className="grid gap-2">{field("targetUrl", "Proposed article URL on this brand's store", 2000, false, "https://your-store.com/blogs/guides/your-topic")}<Button type="button" variant="outline" className="justify-self-start" disabled={!ctx.websiteUrl || !form.keyword} onClick={() => { if (ctx.websiteUrl)
        patch("targetUrl", new URL(`/blogs/guides/${slug(form.keyword)}`, ctx.websiteUrl).href); }}>Suggest URL from keyword</Button><p className="text-xs text-muted-foreground">A suggested URL does not create a page. Confirm the store's blog handle and check for an existing article before publishing.</p></div>
      <div className="space-y-4"><h3 className="font-semibold">Article sections and source evidence</h3><p className="text-sm text-muted-foreground">{draftWithAi ? "Keep editorial directions in the reader-task field, separate from factual source notes. Give each section a distinct reader question and enough reviewed facts for a developed explanation. Include relevant qualifiers and practical context. Each section is bound to its own notes. " : "Write original, plain-text copy supported by the source. "}Do not paste a full third-party article. Sources remain visible beside the relevant passages; URLs alone do not verify a fact.</p>
        {form.sections.map((section, index) => <fieldset className="grid gap-3 rounded-lg border p-4" key={index}>
          <legend className="px-1 text-sm font-medium">{index === 0 ? "1 · Direct answer to the target question" : `${index + 1} · Supporting explanation`}</legend>
          {!!resources.length && <label className="grid gap-1.5 text-sm">Use existing resource for section {index + 1}<select aria-label={`Use existing resource for section ${index + 1}`} className="rounded-md border bg-background p-2" value={section.resource?.id ?? ""} onChange={e => { const resource = resources.find(r => r.id === e.target.value); patch("sections", form.sections.map((old, n) => n !== index ? old : resource ? { ...old, sourceTitle: resource.title, sourceUrl: resource.url, captureId: undefined, resource: { id: resource.id, hash: resource.hash } } : { ...old, resource: undefined })); }}><option value="">Choose reviewed source</option>{resources.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select><span className="text-xs text-muted-foreground">Write or paste the relevant reviewed passage into the notes below. The complete selected source is retained with this draft.</span></label>}
          <Button type="button" variant="outline" disabled={fetching !== null || pending || !section.sourceUrl} onClick={async () => { setFetching(index); setError(""); try {
            const result = await fetchArticleSourceAction(ctx.brandId, ctx.contextHash, section.sourceUrl);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setCaptures((old) => ({ ...old, [index]: result.value }));
        }
        catch {
            setError("Could not fetch this source. Use original, reviewed notes or try another accessible public page.");
        }
        finally {
            setFetching(null);
        } }}>{fetching === index ? "Fetching source…" : "Fetch source for research"}</Button>
          {captures[index] && <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{captures[index].title}</p><a className="break-all text-primary underline" href={captures[index].url} target="_blank" rel="noreferrer">{captures[index].url}</a><p className="mt-2 text-xs text-muted-foreground">Captured {new Date(captures[index].fetchedAt).toLocaleString()} · SHA {captures[index].sourceHash.slice(0, 12)}</p>{captures[index].excerpts.map((excerpt, n) => <blockquote key={n} className="mt-2 border-l-2 pl-3">{excerpt}</blockquote>)}<p className="mt-3 text-xs text-muted-foreground">{captures[index].limits}</p><Button type="button" size="sm" className="mt-3" onClick={() => { const capture = captures[index]; patch("sections", form.sections.map((s, n) => n === index ? { ...s, sourceUrl: capture.url, sourceTitle: capture.title, captureId: capture.id, resource: undefined } : s)); }}>Use this captured source · write reviewed notes above</Button>{section.captureId && <Button type="button" variant="ghost" size="sm" onClick={() => patch("sections", form.sections.map((s, n) => n === index ? { ...s, captureId: undefined } : s))}>Detach capture</Button>}</div>}
          {([['heading', 'Section heading', 160], ['guidance', 'What should this section help the reader do? (not source evidence)', 2000], ['copy', draftWithAi ? 'Verified source notes for the writer' : 'Original, source-supported article copy', 12000], ['sourceTitle', 'Source title / owner', 180], ['sourceUrl', 'Supporting source URL', 2000], ['limitations', 'Evidence limits or scope (optional)', 1200]] as const).map(([key, label, max]) => <label className="grid gap-1.5 text-sm" key={key} htmlFor={`blog-section-${index}-${key}`}><span>{label}</span>{key === "copy" || key === "limitations" || key === "guidance" ? <Textarea id={`blog-section-${index}-${key}`} rows={key === "copy" ? 5 : 2} required={key === "copy"} minLength={key === "copy" ? 30 : undefined} maxLength={max} value={section[key] ?? ""} onChange={(e) => patch("sections", form.sections.map((old, n) => n === index ? { ...old, [key]: e.target.value } : old))}/> : <Input id={`blog-section-${index}-${key}`} type={key === "sourceUrl" ? "url" : "text"} required maxLength={max} value={section[key]} onChange={(e) => patch("sections", form.sections.map((old, n) => n === index ? { ...old, [key]: e.target.value, ...(key === "sourceUrl" ? { resource: undefined, captureId: undefined } : {}) } : old))}/>}</label>)}
          <details><summary className="cursor-pointer text-sm font-medium">Advanced: reviewed atomic facts for this section</summary><p className="my-2 text-xs text-muted-foreground">Map only facts supported by this section source. <Link href="/production-evidence" className="underline">Review/export typed source tuples</Link>. Tuple mappings hold subject, property, value, unit, serving basis and material conditions together; generated prose still needs editorial review.</p><Textarea rows={10} aria-label={`Atomic source facts for section ${index + 1}`} value={tupleDrafts[index] ?? JSON.stringify(section.atomicFacts ?? [], null, 2)} onChange={e => { setTupleDrafts(old => ({ ...old, [index]: e.target.value })); setTupleErrors(old => ({ ...old, [index]: "Finish and validate this edited fact mapping." })); patch("reviewed", false); }} onBlur={e => { try {
            const value = JSON.parse(e.target.value);
            if (!Array.isArray(value))
                throw new Error("Use a JSON array of reviewed facts.");
            const facts = value.map(f => AtomicFactSchema.parse(f));
            patch("sections", form.sections.map((old, n) => n === index ? { ...old, atomicFacts: facts } : old));
            setTupleErrors(old => ({ ...old, [index]: "" }));
        }
        catch (error) {
            setTupleErrors(old => ({ ...old, [index]: error instanceof Error ? error.message : "Invalid atomic fact JSON." }));
        } }}/>{tupleErrors[index] && <p role="alert" className="mt-2 text-xs text-destructive">{tupleErrors[index]}</p>}</details><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => { const next = [...form.sections]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; patch("sections", next); setTupleDrafts(old => ({ ...old, [index]: old[index - 1] ?? JSON.stringify(form.sections[index - 1].atomicFacts ?? [], null, 2), [index - 1]: old[index] ?? JSON.stringify(form.sections[index].atomicFacts ?? [], null, 2) })); setTupleErrors(old => ({ ...old, [index]: old[index - 1] ?? "", [index - 1]: old[index] ?? "" })); setCaptures({}); }}>Move up</Button><Button type="button" size="sm" variant="outline" disabled={form.sections.length <= 2} onClick={() => { patch("sections", form.sections.filter((_, n) => n !== index)); setTupleDrafts(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]))); setTupleErrors(old => Object.fromEntries(Object.entries(old).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? Number(key) - 1 : Number(key), value]))); setCaptures({}); }}>Remove section</Button></div>
        </fieldset>)}
        <Button type="button" variant="outline" disabled={form.sections.length >= 8} onClick={() => patch("sections", [...form.sections, emptySection()])}>Add supporting section</Button>
      </div>
      {draftWithAi && <div className="rounded-lg border p-3 text-sm" data-testid="article-brief-readiness"><p className="font-medium">Brief coverage · {readiness.sourceWordCount} source words</p>{readiness.blockers.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{readiness.blockers.map(b => <li key={b}>{b}</li>)}</ul> : <p className="mt-1">Source breadth checks passed. Final depth, repetition and fact checks run after generation.</p>}</div>}
      <label className="flex items-start gap-2 text-sm" htmlFor="blog-brief-reviewed"><input id="blog-brief-reviewed" type="checkbox" checked={form.reviewed} className="mt-1" onChange={(e) => patch("reviewed", e.target.checked)}/><span>I checked these {draftWithAi ? "source notes" : "passages"}, including product, variant, market and evidence limitations. The app has not independently verified the sources.{draftWithAi ? " I will review all AI-generated wording before approving the article." : ""}</span></label>
      {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
      <div><Button type="submit" disabled={pending || !form.reviewed || Object.values(tupleErrors).some(Boolean) || !ctx.products.length || !ctx.websiteUrl}>{pending ? draftWithAi ? "Writing article from notes…" : "Saving sourced draft…" : draftWithAi ? "Draft article from these notes" : "Create sourced article draft"}</Button><p className="mt-2 text-xs text-muted-foreground">Next: edit the article, review claims, approve the revision and export Markdown, HTML and the editorial brief. Publishing stays in your hands.</p></div>
    </form>
  </section>;
}
