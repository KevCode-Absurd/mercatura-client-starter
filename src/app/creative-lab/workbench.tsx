"use client";
import { useState, useTransition } from "react";
import type { LabDraft, LabRevision, LabSource } from "@/lib/creative-lab/types";
import { exportPack, fingerprint, handoff, reviewDraft } from "@/lib/creative-lab/engine";
import { assessEvidence, buildEvidencePacket, type BoundEvidence } from "@/lib/standalone/evidence";
import { saveCreativeLab } from "./actions";
import { CopyPanel, CarouselPanel } from "./copy-panels";
import { DesignPanel, PhotosPanel } from "./design-panels";
import { VideoPanel } from "./video-panel";
import { RepairPanel } from "./repair-panel";
import { Field, box, button } from "./ui";
import { download } from "./preview";
type Props = {
    initial: LabDraft;
    revisions: LabRevision[];
    sources: LabSource[];
    products: {
        id: string;
        name: string;
        facts: string;
    }[];
    assets: {
        title: string;
        url: string;
        kind: "image" | "video";
        productId: string;
    }[];
    evidence: BoundEvidence[];
    market: string;
    acceptedRepairs?: string;
    live?: boolean;
};
const TABS = ["Opening & copy", "Carousel", "Video & sound", "Design & display", "Photos & world", "Repair & compare"];
export function CreativeLab({ initial, revisions: initialRevisions, sources, products, assets, evidence, market, acceptedRepairs = "", live = false }: Props) {
    const [d, setD] = useState(initial), [revisions, setRevisions] = useState(initialRevisions), [tab, setTab] = useState(TABS[0]), [status, setStatus] = useState("");
    const [pending, start] = useTransition();
    const productionRevision = revisions.findLast(r => fingerprint(r.draft) === fingerprint(d) && !!r.draft.approvedHandoff && r.draft.approvedHandoff === fingerprint(handoff(r.draft)));
    const patch = (v: Partial<LabDraft>) => setD(s => ({ ...s, ...v }));
    const panel = { d, patch, status: setStatus };
    const evidenceProps = { evidence, market };
    const packet = buildEvidencePacket({ productId: d.productId, market }, evidence, { choices: { textMode: d.textMode, grammar: d.grammar } });
    function save() { start(async () => { try {
        const r = await saveCreativeLab(d, revisions.at(-1)?.version ?? 0);
        setRevisions(s => [...s, r]);
        setStatus(`Saved revision ${r.version}. This world and handoff can be reconstructed later.`);
    }
    catch (e) {
        setStatus(e instanceof Error ? e.message : "Save failed.");
    } }); }
    function importSource(id: string) { const s = sources.find(s => s.id === id); if (!s)
        return; if (d.bodyLocked) {
        setStatus("Unlock the body before importing another script.");
        return;
    } patch({ sourceScriptId: s.id, name: s.title, body: s.body, scenes: s.scenes, hooks: s.hooks.length ? s.hooks : d.hooks, mode: "video", measuredSeconds: null, readTimings: [], ...(s.productId && products.some(p => p.id === s.productId) ? { productId: s.productId, facts: products.find(p => p.id === s.productId)?.facts ?? "" } : {}) }); setStatus(s.productId ? "Imported the local script and its selected product. Inspect each opening with its actual continuation." : "Imported the local script. Its product is unbound; confirm the selected product and inspect the full evidence packet before production."); }
    return <div className="space-y-5 p-4 md:p-6" data-testid="creative-lab"><p className="max-w-4xl text-sm text-muted-foreground">Build from saved scripts, actual product facts and local media. These tools expose editable production plans and editorial checks. No account connection or campaign metric is needed.</p><div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save revision"}</button><button className={button} onClick={() => download(`creative-${d.name.replace(/[^a-z0-9-]/gi, "-")}.json`, JSON.stringify({ ...exportPack(d), evidencePacket: packet, acceptedRepairs, savedRevision: revisions.at(-1)?.version ?? null }, null, 2))}>Export production pack</button>{productionRevision ? <a className={button} href={`/studio/new?kind=ad&product=${encodeURIComponent(d.productId)}&labRevision=${productionRevision.id}`}>Create from saved v{productionRevision.version}</a> : <button className={button} disabled>Approve and save to use in Create</button>}<span className="self-center text-xs text-muted-foreground">{revisions.length} saved revisions · {reviewDraft(d).filter(f => f.severity === "fix").length} findings to inspect</span></div>{status && <p role="status" className="rounded-lg border bg-muted p-3 text-sm">{status}</p>}
    <div className="grid gap-4 rounded-xl border p-4 md:grid-cols-3"><Field label="Creative name" value={d.name} onChange={v => patch({ name: v })}/><label className="space-y-1 text-sm">Selected product<select aria-label="Selected product" className={box} value={d.productId} onChange={e => { const p = products.find(p => p.id === e.target.value); const scope = { productId: e.target.value, market }; patch({ productId: e.target.value, facts: p?.facts ?? "", qualification: evidence.filter(r => assessEvidence(r, scope).eligible).flatMap(r => r.qualifiers).join("\n") }); }}><option value="">Choose a product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="space-y-1 text-sm">Local script<select aria-label="Local script" className={box} value={d.sourceScriptId} onChange={e => importSource(e.target.value)}><option value="">Paste your own below</option>{sources.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label></div>
    <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Brief, product evidence and revision history</summary><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Buyer situation" value={d.buyer} onChange={v => patch({ buyer: v })} multiline/><Field label="Approved argument" value={d.argument} onChange={v => patch({ argument: v })} multiline/><Field label="Supplied product notes" value={d.facts} onChange={v => patch({ facts: v })} multiline help="Editable notes are not independent verification. Full product-bound records are retained in exports."/><Field label="Required qualification" value={d.qualification} onChange={v => patch({ qualification: v })} multiline/></div><div className="mt-4 space-y-2"><p className="text-sm">{packet.records.filter(r => r.eligible).length} eligible product/market records; {packet.records.filter(r => !r.eligible).length} unbound or unavailable records are excluded from factual support.</p>{packet.records.map(r => <details key={r.id} className="rounded border p-2 text-xs"><summary>{r.id} · {r.eligible ? "eligible within scope" : r.issues.join(" ")}</summary><p className="mt-2 whitespace-pre-wrap">{r.text}</p><p>{r.qualifiers.join("; ")}</p><blockquote>{r.source.excerpt}</blockquote></details>)}</div>{acceptedRepairs && <p className="mt-4 whitespace-pre-wrap rounded border p-3 text-sm">{acceptedRepairs}</p>}<div className="mt-4 flex flex-wrap gap-2">{revisions.map(r => <button key={r.id} className={button} onClick={() => { setD(structuredClone(r.draft)); setStatus(`Restored revision ${r.version} for editing; a new save preserves all history.`); }}>Restore v{r.version}</button>)}</div></details>
    <nav className="flex flex-wrap gap-2" aria-label="Creative Lab tools">{TABS.map(t => <button key={t} className={`${button} ${tab === t ? "border-primary bg-primary text-primary-foreground" : ""}`} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</nav>
    {tab === TABS[0] && <CopyPanel {...panel}/>}{tab === TABS[1] && <CarouselPanel {...panel}/>}{tab === TABS[2] && <VideoPanel {...panel} assets={assets} live={live}/>}{tab === TABS[3] && <DesignPanel {...panel} {...evidenceProps} assets={assets} live={live}/>}{tab === TABS[4] && <PhotosPanel {...panel} {...evidenceProps} revisions={revisions}/>}{tab === TABS[5] && <RepairPanel {...panel} {...evidenceProps} live={live}/>}
  </div>;
}
