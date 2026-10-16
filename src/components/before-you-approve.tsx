import Link from "next/link";
import { brandConflicts } from "@/lib/claim-conflicts";
import { loadClaimSources } from "@/lib/claim-sources";
import { claimsHeld } from "@/lib/claims-through";
export function openClaimItems(brandId: string) {
    const pending = loadClaimSources(brandId).claims.filter((c) => c.status === "found").length;
    let conflicts: ReturnType<typeof brandConflicts> = [];
    try {
        conflicts = brandConflicts(brandId).filter((c) => c.status === "open");
    }
    catch {
    }
    return { pending, conflicts };
}
export function BeforeYouApprove({ brandId, what, holds = false }: {
    brandId: string;
    what: string;
    holds?: boolean;
}) {
    const held = claimsHeld(brandId);
    const open = openClaimItems(brandId);
    const pending = held ? open.pending : 0;
    const conflicts = open.conflicts;
    if (!pending && !conflicts.length)
        return null;
    return (<section className="border border-input" data-testid="before-you-approve">
      <h2 className="bg-signal px-4 py-2 text-sm font-bold text-signal-foreground" data-held={held && holds ? "true" : undefined}>
        Before you approve {what}
        {held && holds && <span className="font-normal">: claim checks are on, and these are still yours to decide. You can approve either way</span>}
      </h2>
      <ul className="divide-y divide-foreground/15 text-sm">
        {pending > 0 && (<li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
            <span className="numeral w-8 text-2xl">{pending}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{pending === 1 ? "Claim" : "Claims"} found on the site and in the ads, not approved yet.</span>{" "}
              <span className="text-muted-foreground">Nothing here is written into an ad until you approve it, so the ads will be built without {pending === 1 ? "it" : "them"}.</span>
            </span>
            <Link href="/brand#claim-sources" className="font-bold text-primary hover:underline">
              Approve claims
            </Link>
          </li>)}
        {conflicts.map((c) => (<li key={c.topic} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
            <span className="numeral w-8 text-2xl">{c.values.length}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">
                {c.label}: {c.values.map((v) => v.value).join(", ")}.
              </span>{" "}
              <span className="text-muted-foreground">The site and the ads state this differently, so no ad will quote any of them until you say which is right.</span>
            </span>
            <Link href="/brand#claim-sources" className="font-bold text-primary hover:underline">
              Say which is right
            </Link>
          </li>))}
      </ul>
    </section>);
}
