"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BoundEvidenceSchema, buildEvidencePacket, evidenceConditions, packetAtomicFacts, packetFactConflicts, type BoundEvidence } from "@/lib/standalone/evidence";
import { AtomicFactSchema, factConflicts, type AtomicFact } from "@/lib/production-evidence/facts";
import { assertionFromFact } from "@/lib/production-evidence/review";
import type { SeoContext } from "@/lib/seo/model";
import type { EvidenceWorkbench as Workspace } from "@/lib/production-evidence/store";
import { productionEvidenceAction } from "./actions";
const pretty = (v: unknown) => JSON.stringify(v, null, 2);
function Field({ label, children }: {
    label: string;
    children: React.ReactNode;
}) { return <label className="grid min-w-0 gap-1 text-sm font-medium"><span>{label}</span>{children}</label>; }
function Result({ value }: {
    value: unknown;
}) { return <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-xs">{pretty(value)}</pre>; }
export function EvidenceWorkbench({ ctx, initial: serverInitial, seeds, history: serverHistory, workspace: serverWorkspace, media, artifacts }: {
    ctx: SeoContext;
    initial: {
        revision: number;
        records: BoundEvidence[];
    };
    seeds: BoundEvidence[];
    history: {
        revision: number;
        at: string;
        count: number;
    }[];
    workspace: Workspace;
    media: {
        id: string;
        productId: string;
        title: string;
        preview: string;
    }[];
    artifacts: {
        id: string;
        title: string;
        productId: string | null;
    }[];
}) {
    const router = useRouter(), [pending, start] = useTransition(), [result, setResult] = useState<unknown>(null), [error, setError] = useState("");
    const [hydrated, setHydrated] = useState(false), [initial, setInitial] = useState(serverInitial), [workspace, setWorkspace] = useState(serverWorkspace), [history, setHistory] = useState(serverHistory);
    useEffect(() => { setHydrated(true); }, []);
    useEffect(() => { setInitial(serverInitial); setHistory(serverHistory); setWorkspace(serverWorkspace); }, [serverInitial, serverHistory, serverWorkspace]);
    const [productId, setProduct] = useState(ctx.products[0]?.id ?? ""), [variant, setVariant] = useState(""), [recordId, setRecordId] = useState(initial.records[0]?.id ?? seeds[0]?.id ?? ""), [recordDraft, setRecordDraft] = useState("");
    const [subject, setSubject] = useState(""), [predicate, setPredicate] = useState(""), [value, setValue] = useState(""), [unit, setUnit] = useState(""), [denominator, setDenominator] = useState(""), [denominatorUnit, setDenominatorUnit] = useState(""), [condition, setCondition] = useState(""), [provenance, setProvenance] = useState(""), [reviewed, setReviewed] = useState(false);
    const [locale, setLocale] = useState("en-US"), [display, setDisplay] = useState("1,500"), [parseType, setParseType] = useState<"number" | "date">("number"), [reviewer, setReviewer] = useState(""), [rationale, setRationale] = useState("");
    const [assetId, setAsset] = useState(media[0]?.id ?? ""), [mediaIdentity, setMediaIdentity] = useState<any>(null), [delivery, setDelivery] = useState(""), [claimJson, setClaimJson] = useState(""), [deriveJson, setDeriveJson] = useState("");
    const [atMs, setAtMs] = useState("0"), [capturedFrame, setCapturedFrame] = useState<any>(null), [renderJson, setRenderJson] = useState(pretty({ crop: null, frameRange: { startMs: 0, endMs: 3000 }, viewport: { width: 390, height: 844 }, method: "delivery-review-v1", rendition: "original" }));
    const [artifactId, setArtifactId] = useState(artifacts[0]?.id ?? "");
    const scope = { productId, market: ctx.market, ...(variant ? { variant } : {}) }, packet = buildEvidencePacket(scope, initial.records), facts = packetAtomicFacts(packet), conflicts = packetFactConflicts(scope, initial.records);
    const records = initial.records.length ? initial.records : seeds, selected = records.find(r => r.id === recordId), selectedFact = facts[0], selectedMedia = media.find(m => m.id === assetId);
    useEffect(() => { if (!records.some(r => r.id === recordId))
        setRecordId(records[0]?.id ?? ""); }, [records, recordId]);
    const act = (operation: string, payload: unknown) => start(async () => {
        setError("");
        try {
            const r = await productionEvidenceAction(ctx.brandId, ctx.contextHash, operation, payload);
            if (!r.ok) {
                setError(r.error);
                return;
            }
            setResult(r.result);
            if (["save_record", "restore", "resolve", "derive"].includes(operation)) {
                const saved = r.result as typeof initial;
                setHistory(old => [...old.filter(h => h.revision !== initial.revision), { revision: initial.revision, at: new Date().toISOString(), count: initial.records.length }]);
                setInitial(saved);
                if (operation === "save_record")
                    setRecordId((payload as {
                        record: BoundEvidence;
                    }).record.id);
            }
            if (["derive", "delivery", "claim_review", "benchmark"].includes(operation))
                setWorkspace(old => ({ ...old, revision: old.revision + 1 }));
            if (operation === "prepare_claim")
                setClaimJson(pretty(r.result));
            if (operation === "media") {
                setMediaIdentity(r.result);
                const v = r.result as any;
                setDelivery(pretty({ id: crypto.randomUUID(), media: { sha256: v.sha256, crop: v.crop, frameRange: v.frameRange, viewport: v.viewport, method: v.method, rendition: v.rendition }, observedIdentity: v.identity, approvedScript: "", transcript: [], transcriptSource: "plan_only", claims: [], frames: [], reviewedBy: reviewer || "Name required", method: "delivery-alignment-v1" }));
            }
            if (operation === "capture_frame") {
                const frame = r.result as any;
                setCapturedFrame(frame);
                try {
                    const old = JSON.parse(delivery);
                    setDelivery(pretty({ ...old, frames: [...old.frames, { atMs: frame.atMs, text: "Enter only text readable in this captured frame", mediaIdentity: frame.identity, frameSha256: frame.frameSha256, basis: "actual_frame", reviewedBy: reviewer || "Name required", readable: false }] }));
                }
                catch { }
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Evidence action failed.");
        }
    });
    function mapFact() {
        try {
            if (!selected || !reviewed)
                throw new Error("Select a source and confirm its applicability before mapping a fact.");
            const conditions = [...(condition ? [{ id: crypto.randomUUID(), kind: "claim_limit" as const, text: condition, display: "adjacent" as const }] : []), ...(provenance ? [{ id: crypto.randomUUID(), kind: "provenance" as const, text: provenance, display: "brief" as const }] : [])];
            const fact = AtomicFactSchema.parse({ id: crypto.randomUUID(), subject, predicate, value: /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value, unit, denominator: denominator ? { value: Number(denominator), unit: denominatorUnit } : null, comparator: "equal", direction: "none", scope, conditions, locale, authority: { kind: "approved_fact", sourceId: selected.source.id, sourceRevision: initial.records.some(r => r.id === selected.id) ? selected.revision + 1 : 1, attribution: `${reviewer}: ${rationale}` } });
            if (!reviewer.trim() || rationale.trim().length < 10)
                throw new Error("Record your name and the reasoned source review.");
            const record = { ...selected, status: "approved" as const, productIds: [productId], variants: variant ? [variant] : [], markets: [ctx.market], atomicFacts: [...(selected.atomicFacts ?? []), fact], conditions: [...(selected.conditions ?? []), ...conditions], authority: fact.authority };
            act("save_record", { record, expectedRevision: initial.revision });
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Invalid tuple.");
        }
    }
    const section = "space-y-4 rounded-xl border bg-card p-4 md:p-5";
    return <div className="min-w-0 space-y-5 [&_button]:h-auto [&_button]:min-h-9 [&_button]:whitespace-normal" data-testid="production-evidence-workbench" data-hydrated={hydrated ? "ready" : "loading"} inert={!hydrated} aria-busy={!hydrated || pending}>
    <header><p className="text-xs text-muted-foreground">{ctx.brandName} · source register revision {initial.revision} · review workspace {workspace.revision}</p><h1 className="mt-2 text-3xl font-semibold">Evidence and delivered claims</h1><p className="mt-3 max-w-3xl text-sm text-muted-foreground">Bind each quantity to its subject, property, unit and serving basis. Resolve competing sources before generating. Review delivered media and changed claims against exact source and render identities. No performance feed or paid call is used here.</p></header>
    <fieldset disabled={!hydrated || pending} className="min-w-0 space-y-5 border-0 p-0">
    <Button variant="outline" onClick={() => router.refresh()}>Reload saved sources and receipts</Button>
    <div className="grid gap-3 md:grid-cols-3"><Field label="Selected product"><select className="rounded-md border p-2" value={productId} onChange={e => setProduct(e.target.value)}>{ctx.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Exact variant (empty for variant-independent facts)"><Input value={variant} onChange={e => setVariant(e.target.value)}/></Field><Field label="Locale"><Input value={locale} onChange={e => setLocale(e.target.value)}/></Field><Field label="Reviewer name"><Input value={reviewer} onChange={e => setReviewer(e.target.value)}/></Field><Field label="Reasoned source/support review"><Textarea value={rationale} onChange={e => setRationale(e.target.value)}/></Field></div>
    <section className={section}><h2 className="text-xl font-semibold">Map a product fact from its actual passage</h2><Field label="Existing source"><select className="rounded-md border p-2" value={recordId} onChange={e => { setRecordId(e.target.value); setRecordDraft(""); setReviewed(false); }}>{records.map(r => <option key={r.id} value={r.id}>{r.id} · {r.status} · {r.text.slice(0, 90)}</option>)}</select></Field>{selected && <><blockquote className="whitespace-pre-wrap border-l-2 pl-3 text-sm">{selected.source.excerpt}</blockquote><p className="text-xs">Source {selected.source.id} · revision {selected.revision}</p><div className="grid gap-2 md:grid-cols-2"><Result value={{ adjacentMaterialConditions: evidenceConditions(selected).adjacent }}/><Result value={{ briefProvenanceNotes: evidenceConditions(selected).brief }}/></div></>}
      <div className="grid gap-3 md:grid-cols-3">{[["Subject / ingredient", subject, setSubject], ["Property / predicate", predicate, setPredicate], ["Displayed value", value, setValue], ["Unit", unit, setUnit], ["Per amount (leave empty for a package total)", denominator, setDenominator], ["Per unit", denominatorUnit, setDenominatorUnit]].map(([label, val, set], i) => <Field key={i} label={label as string}><Input value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)}/></Field>)}</div>
      <Field label="Material limit or use/safety condition (stays beside claim)"><Textarea value={condition} onChange={e => setCondition(e.target.value)}/></Field><Field label="Capture/workflow note (kept in brief)"><Textarea value={provenance} onChange={e => setProvenance(e.target.value)}/></Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/>I checked the exact passage, tuple, product, market, variant and all material limits. The app has not independently verified the source.</label><Button disabled={pending || !reviewed} onClick={mapFact}>Save reviewed fact with source revision</Button>
      <details><summary className="cursor-pointer text-sm font-medium">Advanced typed source / condition editor</summary><p className="my-2 text-xs text-muted-foreground">Use this for comparators, directions, authority roles and condition kinds. Unknown conditions must remain adjacent. Existing source identity/revision is checked on save.</p><Button variant="outline" onClick={() => setRecordDraft(pretty(selected ?? {}))}>Load selected source JSON</Button><Textarea rows={15} className="mt-2 font-mono text-xs" value={recordDraft} onChange={e => setRecordDraft(e.target.value)}/><Button className="mt-2" disabled={pending} onClick={() => { try {
        act("save_record", { record: BoundEvidenceSchema.parse(JSON.parse(recordDraft)), expectedRevision: initial.revision });
    }
    catch (e) {
        setError(String(e));
    } }}>Save exact source revision</Button></details>
      <details><summary className="cursor-pointer text-sm">Eligible atomic facts for this scope ({facts.length})</summary><Result value={facts}/><Button variant="outline" onClick={() => { const url = URL.createObjectURL(new Blob([pretty(facts)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "reviewed-atomic-facts.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Export typed facts for an article section</Button></details>
    </section>
    <section className={section}><h2 className="text-xl font-semibold">Competing source values</h2><p className="text-sm text-muted-foreground">Both values are excluded from factual generation until one authority is chosen against all pinned source revisions.</p>{conflicts.length ? conflicts.map(c => <article className="space-y-2 rounded-lg border p-3" key={c.key}><Result value={c}/>{c.status === "unresolved" && c.facts.map(f => <Button className="mr-2" key={f.id} variant="outline" disabled={pending || !reviewer || rationale.length < 10} onClick={() => act("resolve", { expectedRevision: initial.revision, resolution: { key: c.key, selectedFactId: f.id, factRevisions: Object.fromEntries(c.facts.map(f => [f.id, f.authority.sourceRevision])), reviewer, rationale } })}>Use {f.value} {f.unit} from {f.authority.sourceId}</Button>)}</article>) : <p className="text-sm">No typed source conflict is recorded. Untyped facts have not been reconciled.</p>}</section>
    <section className={section}><h2 className="text-xl font-semibold">Source history and recovery</h2><p className="text-sm text-muted-foreground">Restoration creates a new revision with sources pending review; it never erases the intervening history.</p><div className="flex flex-wrap gap-2">{history.map(h => <Button variant="outline" disabled={pending} key={h.revision} onClick={() => act("restore", { historicalRevision: h.revision, expectedRevision: initial.revision })}>Restore r{h.revision} · {h.count} records</Button>)}</div></section>
    <section className={section}><h2 className="text-xl font-semibold">Check locale and date interpretation</h2><div className="grid gap-3 md:grid-cols-3"><Field label="Displayed factual value"><Input value={display} onChange={e => setDisplay(e.target.value)}/></Field><Field label="Value type"><select value={parseType} onChange={e => setParseType(e.target.value as "number" | "date")} className="rounded-md border p-2"><option value="number">Number / currency</option><option value="date">Date</option></select></Field></div><Button disabled={pending} onClick={() => act("locale", { display, locale, type: parseType })}>Interpret using explicit locale</Button></section>
    <section className={section}><h2 className="text-xl font-semibold">Audited calculations</h2><p className="text-sm text-muted-foreground">Only matching pack totals or a unit price from current approved terms are allowed. Missing operands, changed units and health extrapolation are held.</p><Button variant="outline" disabled={facts.length < 2} onClick={() => setDeriveJson(pretty({ id: crypto.randomUUID(), operation: "pack_total", operands: facts.slice(0, 2).map(f => ({ factId: f.id, revision: f.authority.sourceRevision })), roundingDecimals: 2, scope, reviewedBy: reviewer, rationale }))}>Prepare calculation from selected scope</Button><Textarea rows={9} value={deriveJson} onChange={e => setDeriveJson(e.target.value)}/><Button disabled={pending || !deriveJson} onClick={() => { try {
        act("derive", { derivation: JSON.parse(deriveJson), expectedRevision: initial.revision, workspaceRevision: workspace.revision });
    }
    catch (e) {
        setError(String(e));
    } }}>Review calculation and save its operands</Button></section>
    <section className={section}><h2 className="text-xl font-semibold">Delivered speech and actual-frame observations</h2><Field label="Saved media belonging to this brand"><select className="rounded-md border p-2" value={assetId} onChange={e => { setAsset(e.target.value); setMediaIdentity(null); }}>{media.map(m => <option key={m.id} value={m.id}>{m.title.slice(0, 100)}</option>)}</select></Field>{selectedMedia && <a href={selectedMedia.preview} target="_blank" rel="noreferrer" className="text-sm underline">Open the actual saved media for playback/frame review</a>}<Button disabled={pending || !assetId} onClick={() => act("media", { assetId, render: { crop: null, frameRange: { startMs: 0, endMs: 3000 }, viewport: { width: 390, height: 844 }, method: "delivery-review-v1", rendition: "original" } })}>Hash current saved bytes and open review manifest</Button>{mediaIdentity && <Result value={mediaIdentity}/>}<p className="text-sm text-muted-foreground">Enter actual timestamped speech, the approved script, claim tuples and readable frame observations. Planned overlays stay unverified. Material omissions and changed quantities are located by timestamp. This records reviewer observations; it does not invent a transcript or certify source truth.</p><Textarea rows={16} className="font-mono text-xs" value={delivery} onChange={e => setDelivery(e.target.value)}/><Button disabled={pending || !delivery} onClick={() => { try {
        act("delivery", { assetId, manifest: JSON.parse(delivery), scope, workspaceRevision: workspace.revision });
    }
    catch (e) {
        setError(String(e));
    } }}>Check and record delivery alignment</Button></section>
    <section className={section}><h2 className="text-xl font-semibold">Review a changed claim beside its evidence</h2><Field label="Actual saved article revision"><select value={artifactId} className="rounded-md border p-2" onChange={e => setArtifactId(e.target.value)}>{artifacts.filter(a => a.productId === productId).map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></Field><Button variant="outline" disabled={!selectedFact || !artifactId || pending} onClick={() => selectedFact && act("prepare_claim", { artifactId, factId: selectedFact.id, scope })}>Load current artifact and exact source for revision review</Button><Textarea rows={14} className="font-mono text-xs" value={claimJson} onChange={e => setClaimJson(e.target.value)}/><Button disabled={pending || !claimJson} onClick={() => { try {
        act("claim_review", { revision: JSON.parse(claimJson), scope, reviewer, rationale, workspaceRevision: workspace.revision });
    }
    catch (e) {
        setError(String(e));
    } }}>Review exact field, conditions and source</Button><p className="text-xs text-muted-foreground">The receipt binds field content, source tuples/passage/revision and media identity. Editing unrelated fields does not change this identity; editing the reviewed claim does.</p></section>
    <section className={section}><h2 className="text-xl font-semibold">Adversarial source-schema controls</h2><p className="text-sm text-muted-foreground">Generate isolated subject, unit, denominator, comparator, direction, locale, negation, qualifier, pixel and transcript mutations from a current tuple. Controls are never saved as product evidence.</p><Button disabled={pending || !selectedFact} onClick={() => selectedFact && act("benchmark", { factId: selectedFact.id, workspaceRevision: workspace.revision })}>Run deterministic controls</Button><details><summary className="cursor-pointer text-sm">Saved delivery, derivation and claim receipts</summary><Result value={workspace}/></details></section>
    <section className={section}><h2 className="text-xl font-semibold">Capture the actual frame under review</h2><Field label="Crop, frame range, viewport and review method"><Textarea rows={8} className="font-mono text-xs" value={renderJson} onChange={e => setRenderJson(e.target.value)}/></Field><Button variant="outline" disabled={pending || !assetId} onClick={() => { try {
        act("media", { assetId, render: JSON.parse(renderJson) });
    }
    catch (e) {
        setError(String(e));
    } }}>Bind these render conditions to current bytes</Button><Field label="Frame timestamp in milliseconds"><Input type="number" min={0} value={atMs} onChange={e => setAtMs(e.target.value)}/></Field><Button disabled={pending || !mediaIdentity} onClick={() => act("capture_frame", { assetId, atMs: Number(atMs), media: mediaIdentity })}>Capture and hash actual frame</Button>{capturedFrame && <><a href={`/api/assets/${capturedFrame.path}`} target="_blank" rel="noreferrer" className="text-sm underline">Open captured frame to inspect readable words</a><img src={`/api/assets/${capturedFrame.path}`} alt={`Actual reviewed frame at ${capturedFrame.atMs} milliseconds`} className="max-h-96 max-w-full rounded-lg border"/><Result value={capturedFrame}/></>}<p className="text-xs text-muted-foreground">A captured-frame receipt is added to the delivery manifest with readability initially false. Inspect the pixels before recording readable text. Planned or uncaptured hashes cannot verify an overlay.</p></section>
    </fieldset>
    {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">{error}</p>}{result !== null && <section className={section}><h2 className="font-semibold">Review result</h2><Result value={result}/></section>}
  </div>;
}
