export default function LearningLoading() {
    return <div className="mx-auto max-w-7xl px-6 py-12" role="status"><p className="text-sm text-muted-foreground">Opening your learning library…</p><div className="mt-6 h-12 w-2/3 animate-pulse rounded-lg bg-muted"/><div className="mt-8 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((n) => <div key={n} className="h-56 animate-pulse rounded-xl bg-muted"/>)}</div></div>;
}
