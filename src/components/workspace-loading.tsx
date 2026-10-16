export default function WorkspaceLoading() {
    return <div className="mx-auto max-w-7xl space-y-8 px-6 py-10" role="status" aria-label="Loading workspace">
    <p className="text-sm text-muted-foreground">Opening your workspace…</p>
    <div aria-hidden="true" className="space-y-8 motion-safe:animate-pulse">
      <div className="space-y-3"><div className="h-9 w-2/3 max-w-lg rounded-lg bg-muted"/><div className="h-4 w-5/6 max-w-2xl rounded bg-muted"/></div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(n => <div key={n} className="h-56 rounded-2xl border bg-card p-6"><div className="mb-6 size-10 rounded-xl bg-muted"/><div className="mb-3 h-5 w-2/3 rounded bg-muted"/><div className="h-4 w-full rounded bg-muted"/></div>)}</div>
    </div>
  </div>;
}
