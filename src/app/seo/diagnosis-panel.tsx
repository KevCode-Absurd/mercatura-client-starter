"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { codeProposal, replaceInSuppliedSource, suggestedCodeReplacement } from "@/lib/seo/review-tools";
import { saveCodeProposalAction } from "./review-actions";
import { diagnoseFinding } from "@/lib/seo/diagnostics";
import type { SeoContext, SeoFinding, SeoPage } from "@/lib/seo/model";
export function DiagnosisPanel({ finding, page, ctx }: {
    finding: SeoFinding;
    page?: SeoPage;
    ctx: SeoContext;
}) {
    const [open, setOpen] = useState(false);
    const [sampleIndex, setSampleIndex] = useState(0);
    const [replacement, setReplacement] = useState<string | null>(null);
    const [reason, setReason] = useState("");
    const [source, setSource] = useState<{
        name: string;
        code: string;
    } | null>(null);
    const [pending, start] = useTransition();
    const router = useRouter();
    const d = open ? diagnoseFinding(finding, page, ctx) : null;
    const samples = page?.live?.sourceSamples?.filter((s) => s.ruleId === finding.ruleId.replace("SEO-DUPLICATE-", "SEO-")) ?? [];
    const after = replacement ?? (page && samples[sampleIndex] ? suggestedCodeReplacement(finding, page, ctx, samples[sampleIndex].code) : null) ?? samples[sampleIndex]?.code ?? "";
    let proposal: ReturnType<typeof codeProposal> | null = null;
    try {
        if (page && d)
            proposal = codeProposal(finding, page, sampleIndex, after, reason || d.recommendation);
    }
    catch { }
    function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return <details className="mt-4 min-w-0 break-words border-t pt-3 text-sm" onToggle={(e) => setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer font-medium text-primary">See the issue and how to fix it</summary>
    {d && <div className="mt-5 space-y-5">
      <section><h3 className="font-semibold">What is happening</h3><p className="mt-2 leading-6">{d.explanation}</p><p className="mt-2 whitespace-pre-line leading-6 text-muted-foreground">{d.mechanism}</p></section>
      <section className="rounded-lg border bg-accent/40 p-4"><h3 className="font-semibold">Recommended option</h3><p className="mt-2 leading-6">{d.recommendation}</p></section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="min-w-0"><h3 className="mb-2 font-semibold">Before · observed evidence</h3><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs">{d.before}</pre><p className="mt-2 text-xs text-muted-foreground">{d.capturedAt ? `Captured ${new Date(d.capturedAt).toLocaleString()}. Lines refer to fetched HTML, not theme files.` : "No capture date available."}</p></section>
        <section className="min-w-0"><h3 className="mb-2 font-semibold">After · proposed for review</h3><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs">{d.after}</pre><p className="mt-2 text-xs text-muted-foreground">Not applied or tested on the live store. Replace placeholders and confirm the correct template/app owner.</p></section>
      </div>
      {!!samples.length && <section className="min-w-0 space-y-3 rounded-lg border p-4 [&_button]:h-auto [&_button]:min-h-9 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:break-words" data-testid="seo-code-proposal"><h3 className="font-semibold">Turn this captured code into a reviewable edit</h3><p className="text-xs text-muted-foreground">The before code below is the exact stored response excerpt. Edit only its replacement. This prepares a proposal; it does not modify or test your store.</p><label className="grid gap-2">Captured excerpt<select className="min-w-0 w-full rounded border bg-background p-2" value={sampleIndex} onChange={(e) => { setSampleIndex(Number(e.target.value)); setReplacement(null); }}>{samples.map((s, n) => <option key={n} value={n}>Response line {s.line} · excerpt {n + 1}</option>)}</select></label><div className="grid min-w-0 gap-4 md:grid-cols-2"><div className="min-w-0"><h4 className="mb-2 font-medium">Before · actual code</h4><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">{samples[sampleIndex]?.code}</pre></div><label className="grid min-w-0 gap-2"><span className="font-medium">After · proposed code</span><Textarea className="min-h-48 font-mono text-xs" maxLength={20000} value={after} onChange={(e) => setReplacement(e.target.value)}/></label></div><label className="grid gap-2">Why make this change?<Textarea maxLength={2000} value={reason || d.recommendation} onChange={(e) => setReason(e.target.value)}/></label>{proposal ? <><p className="text-xs">Excerpt bytes: {proposal.bytesBefore} → {proposal.bytesAfter} ({proposal.byteReduction >= 0 ? `${proposal.byteReduction} fewer` : `${-proposal.byteReduction} more`} UTF-8 bytes). {proposal.effect}</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => proposal && download(`${finding.ruleId.toLowerCase()}-response-excerpt.patch`, proposal.patch)}>Download excerpt patch</Button><Button disabled={pending} onClick={() => start(async () => { try {
            const r = await saveCodeProposalAction(ctx.brandId, ctx.contextHash, finding.id, sampleIndex, after, reason || d.recommendation);
            if (!r.ok) {
                toast.error(r.error);
                return;
            }
            router.push(`/seo/content?id=${r.value.id}`);
        }
        catch {
            toast.error("Could not save this code proposal.");
        } })}>Save replacement for review</Button></div><label className="grid gap-2 text-sm">Optional: provide the actual source file for a complete edited download<input className="min-w-0 w-full max-w-full" type="file" accept=".html,.htm,.liquid,.txt" onChange={async (e) => { const f = e.target.files?.[0]; if (!f)
            return; if (f.size > 500000) {
            toast.error("Choose a source file smaller than 500 KB.");
            return;
        } setSource({ name: f.name, code: await f.text() }); }}/></label>{source && <Button variant="outline" onClick={() => { try {
            download(`proposed-${source.name}`, replaceInSuppliedSource(source.code, proposal!.before, proposal!.after));
        }
        catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not match this source.");
        } }}>Download proposed complete source · {source.name}</Button>}</> : <p className="text-xs text-muted-foreground">A complete, changed replacement and untruncated dated source excerpt are required before a patch can be prepared.</p>}</section>}
      {proposal && <p className="text-xs text-muted-foreground">Parsed excerpt counts: title elements {proposal.countsBefore.title} → {proposal.countsAfter.title}; canonical tags {proposal.countsBefore.canonical} → {proposal.countsAfter.canonical}; images missing alt attributes {proposal.countsBefore.missingAlt} → {proposal.countsAfter.missingAlt}. These count only this exact excerpt; they do not assert whole-page resolution or alt-text accuracy.</p>}
      <section><h3 className="font-semibold">Where to change it</h3><p className="mt-2 leading-6">{d.location}</p></section>
      <section><h3 className="font-semibold">How to verify the fix</h3><ol className="mt-2 list-decimal space-y-2 pl-5">{d.validation.map((v) => <li key={v}>{v}</li>)}</ol></section>
      <section><h3 className="font-semibold">Alternative and rollback</h3><p className="mt-2 leading-6">{d.alternative}</p><p className="mt-2 leading-6">{d.rollback}</p></section>
      <p className="text-xs leading-5 text-muted-foreground">{d.scope}</p><a className="text-primary underline" href={d.reference} target="_blank" rel="noreferrer">Read the technical reference</a>
    </div>}
  </details>;
}
