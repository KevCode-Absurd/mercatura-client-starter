"use client";
import type { CroRun } from "@/lib/landing/studio-types";
import { button } from "./studio-shared";
export function StudioDesignGuide({ run }: {
    run: CroRun;
}) {
    const spec = run.storyboard?.visualSpec, system = spec?.designSystem;
    if (!spec)
        return null;
    const roles = [
        ["Heading", run.brand.tokens["font-heading"], system?.typography.heading],
        ["Body", run.brand.tokens["font-body"], system?.typography.body],
        ["Action", run.brand.tokens["font-button"] || run.brand.tokens["font-body"], system?.typography.action],
    ];
    return <section aria-label="Page design system" data-testid="cro-design-system" className="overflow-hidden rounded-2xl border bg-card">
    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div><h3 className="font-serif text-2xl">Page design system</h3><p className="mt-3 max-w-2xl text-sm leading-7">{system?.focalMove || spec.concept}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{spec.mobileFirstScreen}</p></div>
      <div><h4 className="text-sm font-semibold">Brand palette and roles</h4><div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">{(system?.palette || ["paper", "ink", "primary", "cta"].map(token => ({ token, role: token }))).map(color => <div key={color.token} className="max-w-44"><span aria-hidden="true" className="mb-2 block h-2 w-12 rounded-full border" style={{ background: run.brand.tokens[color.token] }}/><p className="text-xs font-semibold">{color.role}</p><p className="mt-1 text-xs text-muted-foreground">{color.token} · {run.brand.tokens[color.token] || "Token unavailable"}</p></div>)}</div></div>
    </div>
    <details className="border-t px-5 py-4 sm:px-6"><summary className="cursor-pointer text-sm font-semibold">Typography, layout and buying path</summary>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">{roles.map(([role, family, purpose]) => <div key={role}><h4 className="text-sm font-semibold">{role} · {family || "Brand font unavailable"}</h4>{purpose && <p className="mt-1 text-sm leading-6 text-muted-foreground">{purpose}</p>}</div>)}<p className="text-xs text-muted-foreground">{spec.bodyPx}px body · {spec.bodyLineHeight} line height · {system?.readingMeasureCh || 65}ch long prose</p></div>
        <div><h4 className="text-sm font-semibold">Buying path on mobile</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">{spec.mobilePurchaseAccess}</p>{system && <><ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">{system.layoutPrinciples.map((principle, i) => <li key={i}>{principle}</li>)}</ul><p className="mt-4 text-sm leading-6 text-muted-foreground">{system.accessibility}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{system.motion}</p></>}</div>
      </div>
    </details>
    {run.storyboard && <details className="border-t px-5 py-4 sm:px-6"><summary className="cursor-pointer text-sm font-semibold">Section plan and buyer questions</summary><ol className="mt-4 divide-y">{run.storyboard.sections.map(section => <li key={section.id} className="py-3"><p className="text-sm font-semibold">{section.label} · {section.buyerQuestion}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{section.mobileComposition}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">Desktop: {section.desktopTransformation}</p></li>)}</ol></details>}
  </section>;
}
export function StudioDesignChecks({ run, onInspect }: {
    run: CroRun;
    onInspect: (sectionId: string, note: string) => void;
}) {
    const quality = run.quality;
    if (!quality)
        return null;
    const issueCount = quality.designChecks?.reduce((sum, check) => sum + check.issueCount, 0) || 0;
    const unknown = quality.designChecks?.reduce((sum, check) => sum + check.contrastUnverified, 0) || 0;
    const flagged = quality.failures.length || quality.warnings.length;
    return <section aria-label="Rendered-page checks" className="border-t bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Layout and accessibility checks</h4><span className={`text-xs font-semibold ${flagged ? "text-amber-800" : "text-emerald-700"}`}>{flagged ? "Needs review" : "No issues detected"}</span></div>
    <p className="mt-2 text-xs leading-6 text-muted-foreground">{quality.designChecks?.length ? `${quality.designChecks.length} viewport ${quality.designChecks.length === 1 ? "size" : "sizes"} checked. ` : "Mobile and desktop layout checked. "}Local rendering checks support the visual review; they do not certify accessibility or live checkout behavior.</p>
    {!!unknown && <p className="mt-2 text-sm leading-6 text-amber-800">Some text appears over imagery or effects. Inspect those areas visually before deciding that contrast is sufficient.</p>}
    {quality.designChecks && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Design check details · {issueCount} {issueCount === 1 ? "signal" : "signals"} across viewports</summary><div className="mt-3 space-y-5">{quality.designChecks.map(check => <div key={check.viewport}><h5 className="text-sm font-semibold">{check.viewport} · {check.contrastChecked} text surfaces assessed</h5>{!!check.contrastUnverified && <p className="mt-1 text-xs text-muted-foreground">{check.contrastUnverified} contrast checks need visual inspection.</p>}{check.truncated && <p className="mt-1 text-xs text-amber-800">The check reached its reporting limit; additional inspection is needed.</p>}<ul className="mt-2 space-y-3">{check.issues.map((issue, i) => <li key={i} className="border-l border-border pl-3"><p className="text-sm leading-6">{issue.message}</p><p className="mt-1 text-xs text-muted-foreground">{issue.sectionId || "Page chrome"} · {issue.element}</p>{run.sections.some(section => section.id === issue.sectionId) && <button className={`${button} mt-2 text-xs`} onClick={() => onInspect(issue.sectionId, issue.message)}>Inspect {run.sections.find(section => section.id === issue.sectionId)?.label}</button>}</li>)}</ul></div>)}</div></details>}
    {!!flagged && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">All rendering notes ({quality.failures.length + quality.warnings.length})</summary>{[...quality.failures, ...quality.warnings].map((warning, i) => <p className="mt-2 text-sm leading-6 text-amber-800" key={i}>{warning}</p>)}</details>}
  </section>;
}
