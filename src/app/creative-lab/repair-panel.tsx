"use client";
import { useState } from "react";
import { diagnoseCreativePersuasion } from "./actions";
import { applyRepair, comparisonReview, reviewDraft } from "@/lib/creative-lab/engine";
import type { ComparisonArm, LabDraft } from "@/lib/creative-lab/types";
import { buildEvidencePacket, type BoundEvidence } from "@/lib/standalone/evidence";
import { download } from "./preview";
import { Field, Findings, Section, box, button, nameOf, type PanelProps } from "./ui";
export function RepairPanel({ d, patch, status, evidence, market, live = false }: PanelProps & {
    evidence: BoundEvidence[];
    market: string;
    live?: boolean;
}) {
    const comparison = comparisonReview(d);
    const [diagnosing, setDiagnosing] = useState(false);
    async function diagnose() { setDiagnosing(true); try {
        const repair = await diagnoseCreativePersuasion(d);
        patch({ repair });
        status("The independent reader proposed one exact-region repair. The body is unchanged until you apply it; inspect the cited source conditions.");
    }
    catch (e) {
        status(e instanceof Error ? e.message : "Critique failed.");
    }
    finally {
        setDiagnosing(false);
    } }
    function capture() { const h = d.hooks.find(h => h.id === d.selectedHook) ?? d.hooks[0]; const baseline: ComparisonArm = { headline: d.headline, opening: `${h?.visual ?? ""}\n${h?.spoken ?? ""}\n${h?.overlay ?? ""}`, proof: d.proofPlacement, layout: d.art.composition, argument: d.argument, product: d.productId, offer: "", qualification: d.qualification }; patch({ comparison: { ...d.comparison, baseline, variant: { ...baseline }, assets: { baseline: d.mediaUrl, variant: "" } } }); }
    return <div className="space-y-5"><Section title="Repair one persuasion link" description="Record an editorial observation and replace one exact passage. The rest of the body stays byte-for-byte intact."><button className={button} disabled={!live || diagnosing || !d.body.trim()} onClick={() => void diagnose()}>{diagnosing ? "Reading the actual draft…" : "Diagnose the weakest persuasion link"}</button><p className="text-xs">{live ? "Uses the existing independent writing-review provider when clicked." : "Live critique is disabled; the exact-passage local repair remains available."}</p><label className="block text-sm">Weakest link<select aria-label="Weakest link" className={`${box} mt-1`} value={d.repair.region} onChange={e => patch({ repair: { ...d.repair, region: e.target.value as LabDraft["repair"]["region"] } })}>{["trigger", "emotion", "evidence", "payoff", "bridge", "action"].map(r => <option key={r}>{r}</option>)}</select></label><div className="grid gap-4 md:grid-cols-2">{(["observed", "before", "after", "support", "preserved"] as const).map(k => <Field key={k} label={`Repair ${nameOf(k).toLowerCase()}`} value={d.repair[k]} onChange={v => patch({ repair: { ...d.repair, [k]: v, applied: false } })} multiline/>)}</div><button className={button} onClick={() => { try {
        patch(applyRepair(d));
        status("Applied the exact passage repair. Other body passages are preserved; inspect new factual wording against the full evidence packet.");
    }
    catch (e) {
        status(e instanceof Error ? e.message : "Repair failed.");
    } }}>Apply targeted repair</button><p className="text-xs">State: {d.repair.applied ? "applied; save to retain the repair log" : "proposed"} · editorial hypothesis; no measured hook or hold claim.</p><pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-muted p-3 text-sm">{d.body}</pre></Section>
    <Section title="Controlled learning comparison" description="Capture a baseline, change one named variable and export the question and fixed controls beside both arms."><button className={button} onClick={capture}>Capture current draft as baseline</button><Field label="Comparison hypothesis" value={d.comparison.hypothesis} onChange={v => patch({ comparison: { ...d.comparison, hypothesis: v } })}/><label className="block text-sm">Changed variable<select aria-label="Changed variable" className={`${box} mt-1`} value={d.comparison.variable} onChange={e => patch({ comparison: { ...d.comparison, variable: e.target.value as LabDraft["comparison"]["variable"] } })}>{["headline", "opening", "proof", "layout"].map(v => <option key={v}>{v}</option>)}</select></label><div className="grid gap-5 xl:grid-cols-2">{(["baseline", "variant"] as const).map(arm => <article key={arm} className="space-y-3 rounded border p-4"><h3 className="font-semibold">{nameOf(arm)}</h3>{(Object.keys(d.comparison[arm]) as (keyof ComparisonArm)[]).map(k => <Field key={k} label={`${nameOf(arm)} ${k}`} value={d.comparison[arm][k]} onChange={v => patch({ comparison: { ...d.comparison, [arm]: { ...d.comparison[arm], [k]: v } } })} disabled={arm === "variant" && k !== d.comparison.variable} multiline={k === "opening"}/>)}</article>)}</div><p className={`text-sm ${comparison.valid ? "text-green-700" : "text-amber-800"}`}>{comparison.valid ? "One selected variable changed; fixed controls match." : comparison.findings.join(" ")}</p><div className="grid gap-4 md:grid-cols-2"><Field label="Baseline asset reference" value={d.comparison.assets.baseline} onChange={v => patch({ comparison: { ...d.comparison, assets: { ...d.comparison.assets, baseline: v } } })}/><Field label="Variant asset reference" value={d.comparison.assets.variant} onChange={v => patch({ comparison: { ...d.comparison, assets: { ...d.comparison.assets, variant: v } } })}/><Field label="Editorial preference" value={d.comparison.preference} onChange={v => patch({ comparison: { ...d.comparison, preference: v } })}/><Field label="Concrete passage and reason" value={d.comparison.reason} onChange={v => patch({ comparison: { ...d.comparison, reason: v } })} multiline/></div><p className="text-xs">{comparison.limits}</p><button className={button} disabled={!comparison.valid} onClick={() => download("controlled-creative-comparison.json", JSON.stringify({ ...d.comparison, review: comparison, evidence: buildEvidencePacket({ productId: d.productId, market }, evidence) }, null, 2))}>Export controlled comparison</button></Section><Section title="Production findings" description="Checks locate an editable region. They do not establish a market winner or independently verify a source."><Findings findings={reviewDraft(d)}/></Section></div>;
}
