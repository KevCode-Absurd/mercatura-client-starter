import { loadBrandBrain } from "./brands";
import type { GalleryFormat } from "./format-gallery";
import { loadCreativeKit } from "./production/kit";
import type { NewRun } from "./studio/engine";
import { PHOTO_FRAMES, distinctRefs, productProfile, rankRefs, suggestFrames, suggestLayouts, suggestTemplate } from "./studio/select";
import { suggestConcepts } from "./studio/worlds";
import type { MinedAngle } from "./angles/library";
import { reviewPicks } from "./studio/review-ads";
import { bankPicks } from "./studio/offer-bank";
const FLASH_FRAMES = ["moment_of_use", "in_hand", "shared", "motion", "at_home", "on_the_go", "routine", "hero"];
export function picksFor(brandId: string, format: GalleryFormat, productId: string, count: number, opts: {
    angle?: MinedAngle;
    stage?: string | null;
} = {}): NewRun["picks"] {
    if (format.start.via !== "studio")
        return [];
    if (format.start.picks === "review")
        return opts.angle ? reviewPicks(opts.angle, count) : [];
    if (format.id === "ad-offer")
        return bankPicks(count);
    const brand = loadBrandBrain(brandId);
    const profile = { ...productProfile(brandId, brand, loadCreativeKit(brandId), productId), stage: opts.stage };
    const how = format.start.picks;
    if (how === "cold" || how === "warm" || how === "ready")
        return suggestConcepts(count, 0, how).map((c) => ({ world: c.world, mode: c.mode, ...(c.archetype ? { archetype: c.archetype } : {}) }));
    if (how === "template")
        return suggestTemplate(profile).slice(0, count).map((s) => ({ refId: s.pick?.ref.id ?? null, bucket: s.bucket, reason: s.pick?.reason }));
    if (how === "frames" || how === "flash") {
        const frames = how === "flash" ? FLASH_FRAMES.map((id) => PHOTO_FRAMES.find((f) => f.id === id)!).filter(Boolean) : PHOTO_FRAMES;
        return suggestFrames(profile, frames.slice(0, count)).map((x) => ({ refId: x.pick.ref.id, direction: x.frame.direction, label: x.frame.label, reason: x.pick.reason }));
    }
    const own = brand.brand.name.toLowerCase();
    const first = suggestLayouts(profile, count, { stage: opts.stage, skipBrand: own });
    const seen = new Set(first.map((s) => s.ref.id));
    const more = first.length >= count ? [] : rankRefs("ad", profile, { limit: 80 }).filter((s) => !seen.has(s.ref.id) && s.ref.brand?.toLowerCase() !== own);
    return distinctRefs([...first, ...more], count).map((s) => ({ refId: s.ref.id, reason: s.reason }));
}
