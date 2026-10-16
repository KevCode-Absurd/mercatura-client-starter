export default function PageLoading({ title = "Opening…", cards = 3, wide = false }: {
    title?: string;
    cards?: number;
    wide?: boolean;
}) {
    return (<div className={wide ? "mx-auto max-w-[100rem]" : "mx-auto w-full max-w-[80rem]"} role="status" aria-label={title} data-testid="page-loading">
      <div className="animate-[page-loading-in_200ms_ease-out_150ms_both]">
        <div className="mx-6 border-b border-rule pb-5 pt-10">
          <div className="h-10 w-56 rounded-lg bg-muted"/>
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-muted"/>
          <div className="mt-2 h-4 w-2/3 max-w-xl rounded bg-muted"/>
        </div>
        <div className="grid gap-4 px-6 py-8 md:grid-cols-2 lg:grid-cols-3 motion-safe:animate-pulse" aria-hidden="true">
          {Array.from({ length: cards }, (_, n) => (<div key={n} className="h-48 rounded-xl border bg-card p-6">
              <div className="mb-5 size-9 rounded-full bg-muted"/>
              <div className="mb-3 h-5 w-2/3 rounded bg-muted"/>
              <div className="h-4 w-full rounded bg-muted"/>
            </div>))}
        </div>
        <span className="sr-only">{title}</span>
      </div>
    </div>);
}
