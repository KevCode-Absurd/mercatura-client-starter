import { readAllDocs, sec } from "../brain/docs";
import { itemsOf, plainText } from "../brain/md";
import { BrandBrainError } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { coverageInput } from "../coverage/account";
import { coverage } from "../coverage/analyze";
import { industriesOf, type BrandFit, type GapNote } from "./for-brand";
const EMPTY = (name: string): BrandFit => ({ brandName: name, industries: [], marketStage: null, gaps: { awareness: {}, sophistication: {}, format: {} }, winners: [], works: [], avoid: [], simulated: false, basis: [] });
export function brandFit(brandId: string, brandName: string): BrandFit {
    const fit = EMPTY(brandName);
    try {
        const brand = loadBrandBrain(brandId);
        const byCategory = industriesOf(brand.brand.category);
        fit.industries = byCategory.length ? byCategory : industriesOf(brand.products.map((p) => `${p.name} ${p.format}`).join(" "));
        fit.marketStage = brand.market_sophistication_stage;
        fit.basis.push(`The brand's facts: ${fit.industries.length ? fit.industries.join(", ").toLowerCase() : "no industry read from its category"}, market at stage ${fit.marketStage}.`);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        fit.basis.push("The brand's facts are not set up yet, so its industry and market stage are not known.");
        return fit;
    }
    try {
        const input = coverageInput(brandId);
        const cov = coverage(input);
        fit.simulated = input.account.simulated;
        fit.marketStage = input.account.market.stage || fit.marketStage;
        for (const g of cov.gaps) {
            const into: Record<string, GapNote> | undefined = g.dimension === "awareness" ? fit.gaps.awareness : g.dimension === "sophistication" ? fit.gaps.sophistication : g.dimension === "format" ? fit.gaps.format : undefined;
            if (into)
                into[g.key] = { weight: g.weight, why: g.why };
        }
        fit.winners = cov.winners.map((w) => ({ name: w.ad.name, awareness: w.ad.awareness, format: w.ad.format }));
        const n = Object.keys(fit.gaps.awareness).length + Object.keys(fit.gaps.sophistication).length + Object.keys(fit.gaps.format).length;
        fit.basis.push(`${input.account.simulated ? "A simulated ad account" : "The ad account"} (${input.account.period}): ${cov.totals.ads} ads, ${n} gap${n === 1 ? "" : "s"}, ${fit.winners.length} ad${fit.winners.length === 1 ? "" : "s"} that work${fit.winners.length === 1 ? "s" : ""}.`);
    }
    catch {
        fit.basis.push("No ad account to read, so gaps are not known: the order rests on industry and market stage alone.");
    }
    try {
        const docs = readAllDocs(brandId);
        const lines = (key: "works" | "avoid") => itemsOf(sec(docs.brain.doc, key)).map((x) => plainText(x)).filter((x) => x.length > 12).slice(0, 12);
        fit.works = lines("works");
        fit.avoid = lines("avoid");
        fit.basis.push(`The brain: ${fit.works.length} thing${fit.works.length === 1 ? "" : "s"} that work${fit.works.length === 1 ? "s" : ""}, ${fit.avoid.length} to avoid.`);
    }
    catch {
    }
    return fit;
}
