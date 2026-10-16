import Link from "next/link";
import { listBrands } from "@/lib/brands";
import { AddBrandForm } from "@/app/brands/brand-forms";

export default function OnboardingPage() {
  const brands = listBrands();
  return <div className="mx-auto max-w-3xl space-y-8 px-6 py-14">
    <div><p className="text-sm text-muted-foreground">Mercatura · new client workspace</p><h1 className="mt-3 font-serif text-4xl">Start with your first client</h1><p className="mt-4 text-muted-foreground">This installation starts empty. Add a brand, upload its own resources, and review the facts before generating work.</p></div>
    <section className="space-y-4 rounded-xl border bg-card p-6"><h2 className="text-xl font-semibold">Add a brand</h2><AddBrandForm/><p className="text-sm text-muted-foreground">A name creates a workspace. It does not add products, claims, reviews, examples or API connections.</p></section>
    {brands.length>0&&<p><Link className="underline" href="/brands">Open your {brands.length} saved brand workspace{brands.length===1?"":"s"}</Link></p>}
    <section className="space-y-3"><h2 className="text-xl font-semibold">Prepare the client resources</h2><ol className="list-decimal space-y-2 pl-5"><li>Upload the website, product documents, labels, brand guidelines and owned product photos.</li><li>Confirm product variants, offers, allowed claims and source limitations.</li><li>Add customer research with permission and review the extracted evidence.</li><li>Configure your own generation keys and an explicit spending limit.</li><li>Review a small pilot of images, scripts, a page and an article before increasing volume.</li></ol></section>
    <p className="text-sm"><Link className="underline" href="/connections">Connection readiness</Link> · <Link className="underline" href="/guide">Operator guide</Link></p>
    <p className="rounded-lg bg-secondary p-4 text-sm">This starter is for a local operator. Hosted team authentication, agency permissions, OAuth token storage and scheduled API ingestion are specified in the implementation plan and are not yet a security boundary in this app.</p>
  </div>;
}
