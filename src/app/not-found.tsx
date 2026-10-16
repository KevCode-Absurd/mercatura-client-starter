import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
    return <div className="mx-auto max-w-2xl px-6 py-16"><div className="rounded-2xl border bg-card p-8 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-primary">Page not found</p>
    <h1 className="mt-3 font-serif text-3xl">Let’s get you back to work.</h1>
    <p className="mt-4 leading-relaxed text-muted-foreground">This link may be out of date, or the item may no longer be available. Choose a workspace to continue.</p>
    <div className="mt-6 flex flex-wrap gap-3">{[["/", "Creative Studio"], ["/landing", "CRO Studio"], ["/seo", "SEO"]].map(([href, label]) => <Button key={href} asChild variant="outline"><Link href={href}>{label}</Link></Button>)}</div>
  </div></div>;
}
