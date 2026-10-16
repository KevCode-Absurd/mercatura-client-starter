import type { CroRun, CroSection } from "./studio-types";
export const defaultSectionVisual = { spacePx: 24, readingCh: 65, imageRatio: "original" as const, focalX: 50, focalY: 50 };
export function sectionVisualCss(section: CroSection, root = `#cro-${section.id}`): string {
    const v = section.visual;
    if (!v)
        return "";
    const ratio = v.imageRatio === "original" ? "auto" : v.imageRatio.replace(":", " / ");
    return `${root}{padding-block:${v.spacePx}px!important}${root} p,${root} li,${root} h1,${root} h2{max-inline-size:${v.readingCh}ch}${root} img{aspect-ratio:${ratio}!important;object-fit:${v.imageRatio === "original" ? "contain" : "cover"}!important;object-position:${v.focalX}% ${v.focalY}%!important}`;
}
export type ContinuityFinding = {
    area: "product" | "audience" | "promise" | "offer";
    status: "match" | "review" | "unknown";
    before: string;
    after: string;
    reason: string;
};
export function adContinuity(run: CroRun): ContinuityFinding[] {
    const ad = run.request.adContext;
    if (!ad)
        return [];
    const text = run.sections.filter(s => s.enabled).flatMap(s => s.copy.map(c => c.text)).join(" ").toLowerCase();
    const words = (value: string) => value.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
    const coverage = (value: string) => { const terms = [...new Set(words(value))]; return terms.length ? terms.filter(t => text.includes(t)).length / terms.length : 0; };
    return [
        { area: "product", status: !ad.productId ? "unknown" : ad.productId === run.request.productId ? "match" : "review", before: ad.productId || "Not recorded in ad", after: run.request.productId || "Brand / multiple products", reason: !ad.productId ? "Select and confirm the advertised product." : ad.productId === run.request.productId ? "The same product is selected." : "The selected product differs from the ad." },
        { area: "audience", status: !ad.personaId ? "unknown" : ad.personaId === run.request.personaId ? "match" : "review", before: ad.personaId || "Not recorded in ad", after: run.request.personaId || "Product audience", reason: "Compare the ad's customer with the page brief; IDs establish selection, not suitability." },
        { area: "promise", status: !run.sections.length ? "unknown" : coverage(ad.promise) >= .4 ? "match" : "review", before: ad.promise, after: run.sections[0]?.copy.map(c => c.text).join(" · ") || "Design not built", reason: "Word overlap highlights a possible message gap. It cannot establish semantic agreement or substantiate a claim." },
        { area: "offer", status: !ad.offer ? "unknown" : !run.sections.length ? "unknown" : coverage(ad.offer) >= .6 ? "match" : "review", before: ad.offer || "No explicit offer recorded", after: run.sections.filter(s => s.enabled).flatMap(s => s.copy).filter(c => words(ad.offer).some(w => c.text.toLowerCase().includes(w))).slice(0, 4).map(c => c.text).join(" · ") || "No matching offer text found in the saved design", reason: "Review price, eligibility and terms against Brand Brain before carrying an offer into the page." },
    ];
}
export function retargetSection(source: CroSection, targetId: string, copy: CroSection["copy"], keepAssetIds: readonly string[]): CroSection {
    const ids: Record<string, string> = { [`cro-${source.id}`]: `cro-${targetId}` };
    for (const m of source.html.matchAll(/\bid="([a-zA-Z][\w-]*)"/g))
        if (!ids[m[1]])
            ids[m[1]] = `${targetId}-${m[1]}`.slice(0, 120);
    const replace = (value: string) => Object.entries(ids).reduce((s, [old, next]) => s.replaceAll(`#${old}`, `#${next}`).replaceAll(`id="${old}"`, `id="${next}"`), value);
    return { ...structuredClone(source), id: targetId, version: 1, html: replace(source.html).replace(/\{\{product:[a-zA-Z0-9_-]+\}\}/g, "{{link}}"), css: replace(source.css), copy: source.copy.map(c => ({ key: c.key, text: copy.find(x => x.key === c.key)?.text ?? "" })), images: source.images.map(i => ({ ...i, assetId: keepAssetIds.includes(i.assetId) ? i.assetId : "", alt: keepAssetIds.includes(i.assetId) ? i.alt : "" })) };
}
