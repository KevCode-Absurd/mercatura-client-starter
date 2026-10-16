import type { BrandBrain } from "./brand-brain";
import { loadBrandBrain } from "./brands";
import { brandConflicts, figuresIn, type Conflict } from "./claim-conflicts";
import { approveFound, loadClaimSources } from "./claim-sources";
import { getSetting } from "./settings";
export const claimsHeld = (brandId: string): boolean => getSetting(brandId, "checks").claims === true;
const CLAIM_CHECK_IDS = new Set(["forbidden_claims", "guardrails", "claims_and_guardrails", "number_source", "figure_disagrees", "claims_judge", "claims_substantiated", "qualifier_dropped", "renewal_price", "evidence_trace", "absolute_claim", "implied_forbidden", "implied_guardrail", "proof_strength", "personal_attributes"]);
export const isClaimCheck = (check: string): boolean => CLAIM_CHECK_IDS.has(check);
function disputed(text: string, conflicts: Conflict[]): boolean {
    return figuresIn(text).some((f) => {
        const c = conflicts.find((x) => x.topic === f.topic);
        return !!c && (c.status === "open" || (!!c.live && c.live !== f.value));
    });
}
export function approveWaiting(brandId: string): {
    used: number;
    waiting: number;
} {
    let conflicts: Conflict[] = [];
    try {
        conflicts = brandConflicts(brandId);
    }
    catch {
    }
    let used = 0;
    let waiting = 0;
    for (const c of loadClaimSources(brandId).claims.filter((x) => x.status === "found")) {
        if (c.forbidden || disputed(`${c.quote} ${c.text}`, conflicts)) {
            waiting++;
            continue;
        }
        approveFound(brandId, c.id);
        used++;
    }
    return { used, waiting };
}
export function throughClaims(brandId: string, brand: BrandBrain): BrandBrain["claims"] {
    const reg = loadClaimSources(brandId);
    const waiting = reg.claims.filter((c) => c.status === "found" && !c.forbidden && !c.same_as);
    if (!waiting.length)
        return [];
    let conflicts: Conflict[] = [];
    try {
        conflicts = brandConflicts(brandId);
    }
    catch {
    }
    const have = new Set(brand.claims.map((c) => c.text.trim().toLowerCase()));
    return waiting
        .filter((c) => !have.has(c.text.trim().toLowerCase()) && !disputed(`${c.quote} ${c.text}`, conflicts))
        .map((c) => ({ id: `clm_${c.origin === "website" ? "site" : "pub"}_${c.id.toLowerCase().replace(/[^a-z0-9]+/g, "")}`, text: c.text, status: "substantiated" as const, source: `${c.origin === "website" ? "Website" : "Ad"}: ${c.where}. As written: "${c.quote.slice(0, 200)}". Published by the brand; not reviewed in the app.`, origin: c.origin }));
}
export function writingBrain(brandId: string, held: boolean = claimsHeld(brandId)): BrandBrain {
    const brand = loadBrandBrain(brandId);
    if (held)
        return brand;
    const more = throughClaims(brandId, brand);
    return more.length ? { ...brand, claims: [...brand.claims, ...more] } : brand;
}
export function sprintHeld(brandId: string, held: boolean = claimsHeld(brandId)): string | null {
    if (!held)
        return null;
    const pending = loadClaimSources(brandId).claims.filter((c) => c.status === "found" && !c.forbidden).length;
    let open = 0;
    try {
        open = brandConflicts(brandId).filter((c) => c.status === "open").length;
    }
    catch {
    }
    if (!pending && !open)
        return null;
    const parts = [pending ? `${pending} claim${pending === 1 ? "" : "s"} from the site and the ads ${pending === 1 ? "is" : "are"} not decided` : "", open ? `${open} figure${open === 1 ? " is" : "s are"} stated 2 ways` : ""].filter(Boolean);
    return `Claim checks are on, and ${parts.join(" and ")}. The ads are written without them. Decide them on the Brand brain screen to have them used.`;
}
