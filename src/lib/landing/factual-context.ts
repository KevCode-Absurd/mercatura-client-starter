import { assessEvidence, type BoundEvidence } from "../standalone/evidence";
import type { LandingContext } from "./context";
const promotional = /[$£€₹]|\b(?:free gifts?|discount|save \d|\d+\s*%\s*off|limited[- ]time|shipping|subscribe|subscription|renewal|money[- ]back|guarantee)\b/i;
export function factualLandingContext(ctx: LandingContext, productId: string, records: BoundEvidence[] = [], omitOffer = false): LandingContext {
    const eligible = records.filter(r => assessEvidence(r, { productId, market: ctx.brand.brand.market }).eligible), active = records.length > 0;
    const admitted = (id: string, kind: "claim" | "offer") => eligible.some(r => r.kind === kind && (r.id === id || r.id === `${kind}:${id}`));
    const claims = ctx.brand.claims.filter(c => (!active || admitted(c.id, "claim")) && (!omitOffer || !promotional.test(c.text)));
    const offers = omitOffer ? [] : ctx.brand.offers.filter(o => !active || admitted(o.id, "offer"));
    const guarantee = !omitOffer && (!active || eligible.some(r => (r.kind === "claim" || r.kind === "fact") && r.text.includes(ctx.brand.guarantee?.text || "\u0000"))) ? ctx.brand.guarantee : undefined;
    const quotes = ctx.quotes.filter(q => (!active || eligible.some(r => r.kind === "quote" && r.quoteRole === "customer" && r.authenticity === "original" && r.text === q.text)) && (!omitOffer || !promotional.test(q.text)));
    const photos = omitOffer ? Object.fromEntries(Object.entries(ctx.photos).map(([id, items]) => [id, items.filter(photo => photo.bucket === "product-shot" || photo.bucket === "occasions")])) : ctx.photos;
    return { ...ctx, photos, brand: { ...ctx.brand, claims, offers, guarantee, proof_assets: active ? claims.filter(c => /reviews|ratings|stars|tested/i.test(c.text)).map(c => c.text) : ctx.brand.proof_assets }, quotes, objections: ctx.objections.filter(o => (!omitOffer || !promotional.test(`${o.q} ${o.a}`)) && (!active || eligible.some(r => r.text.includes(o.a)))) };
}
