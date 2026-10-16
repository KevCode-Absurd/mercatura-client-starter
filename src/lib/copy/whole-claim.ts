const ASKED = /\bsurvey|\bpoll(?:ed|s)?\b|\bpanel\b|\brespondents?\b|\bquestionnaire\b/i;
const SHARE = /\d\s?%|\bpercent\b|\b\d+\s+(?:in|out of)\s+\d+\b/i;
export function wholeClaim(c: {
    text: string;
    source?: string | null;
}): string {
    const text = c.text.trim();
    if (!SHARE.test(text))
        return text;
    const base = (c.source ?? "").split(/(?<=[.;])\s+/).map((s) => s.replace(/[.;\s]+$/, "").trim()).find((s) => ASKED.test(s));
    if (!base || text.toLowerCase().includes(base.toLowerCase()) || (ASKED.test(text) && !/\d/.test(base)))
        return text;
    return `${text.replace(/[.\s]+$/, "")} (who was asked: ${base}).`;
}
