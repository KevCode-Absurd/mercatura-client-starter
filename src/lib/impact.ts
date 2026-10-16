import { SETTING_DEFAULTS } from "./settings-defaults";
export const IMPACT_RATES = { usdPerAd: SETTING_DEFAULTS.impact.usd_per_piece, hoursPerAd: SETTING_DEFAULTS.impact.hours_per_piece } as const;
export const ratesOf = (saved: {
    usd_per_piece: number;
    hours_per_piece: number;
}) => ({ usdPerAd: saved.usd_per_piece, hoursPerAd: saved.hours_per_piece });
export interface Impact {
    ads: number;
    usd: number;
    hours: number;
}
export function impact(ads: number, rates: {
    usdPerAd: number;
    hoursPerAd: number;
} = IMPACT_RATES): Impact {
    const n = Math.max(0, Math.floor(ads));
    return { ads: n, usd: Math.round(n * rates.usdPerAd), hours: Math.round(n * rates.hoursPerAd) };
}
