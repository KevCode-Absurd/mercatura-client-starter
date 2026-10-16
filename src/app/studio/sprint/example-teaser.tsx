import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SHOWCASE, showcaseImage } from "@/lib/sprint/showcase";
export function ExampleTeaser() {
    return <Link href="/studio/sprint/examples" className="group grid gap-5 overflow-hidden rounded-2xl border bg-muted/30 p-5 transition hover:border-primary/50 md:grid-cols-[1fr_320px] md:items-center" data-testid="sprint-examples">
    <div><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Explore before you create</p><h2 className="display mt-2 text-3xl">See 100 selected examples</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Paper craft, skeletons, knitted characters, photography and more. Our picks from 333 generated ad concepts, across 27 visual styles.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Browse the gallery <ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></div>
    <div className="grid grid-cols-4 gap-2" aria-hidden="true">{SHOWCASE.slice(0, 4).map(e => <img key={e.id} src={showcaseImage(e.id, true)} alt="" width={160} height={200} loading="lazy" className="aspect-[4/5] w-full rounded-lg object-contain"/>)}</div>
  </Link>;
}
