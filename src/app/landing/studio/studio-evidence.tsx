import type { PageEvidence } from "@/lib/landing/evidence";
import { findingEvidence, inspectionSummary, UNTESTED_PURCHASE_BEHAVIOR } from "@/lib/landing/evidence-inspection";
export function StudioEvidence({ evidence, finding }: {
    evidence: PageEvidence;
    finding: {
        sectionId: string;
        viewport: "mobile" | "desktop";
        evidenceQuote: string;
    };
}) {
    const source = findingEvidence(evidence, finding);
    return (<details className="rounded-xl border bg-secondary/20 p-4 text-sm" data-testid="cro-evidence-details">
      <summary className="cursor-pointer font-semibold">Evidence details · {source.label}</summary>
      <div className="mt-4 space-y-4 text-xs leading-6 text-muted-foreground">
        <p>Captured {new Date(source.capturedAt).toLocaleString()} · {finding.viewport} · section {finding.sectionId}</p>
        <p className="break-all">Reference: {source.reference}</p>
        <p className="break-all">Source: <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.url}</a></p>
        {source.outsideScreenshot && <p>Some or all of this section lies beyond the saved screenshot. Its captured text does not establish the uncaptured visual appearance.</p>}
        <div>
          <p className="font-semibold text-foreground">Controls observed in this section</p>
          {source.controls.length ? <ul className="mt-2 space-y-2">{source.controls.map(control => <li key={control.id} className="break-words"><span className="font-medium text-foreground">{control.label}</span> · {control.kind} · {control.disabled ? "disabled at capture" : "not marked disabled"}{control.target && <span className="block break-all">Destination: {control.target}</span>}</li>)}</ul> : <p>{source.inspection ? "No controls recorded here within the captured inventory. Hidden or capped content may be incomplete." : "This older capture has no control inventory."}</p>}
        </div>
        <div><p className="font-semibold text-foreground">Capture coverage</p>{inspectionSummary(evidence).map((text, i) => <p className="mt-2" key={i}>{text}</p>)}</div>
        {source.warnings.length > 0 && <div><p className="font-semibold text-foreground">Capture limitations</p>{source.warnings.map((warning, i) => <p className="mt-2" key={i}>{warning}</p>)}</div>}
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{UNTESTED_PURCHASE_BEHAVIOR}</p>
      </div>
    </details>);
}
