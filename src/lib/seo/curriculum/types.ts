export type SearchDiscipline = "SEO" | "AEO" | "GEO";
export type SeoGuide = {
    discipline: SearchDiscipline;
    id: string;
    title: string;
    topic: string;
    summary: string;
    whenToUse: string;
    effort: "low" | "medium" | "high";
    inputs: string[];
    sourceIds: string[];
    references: string[];
    principle: string;
    method: string;
    decisions: string;
    deliverable: string;
    example: string;
    steps: string[];
    measurement: string;
    pitfalls: string;
    workflow: "planning" | "optimize" | "measurement" | "audits" | "content" | "changes" | "priorities" | "aeo" | "geo";
};
export type SeoSource = {
    disciplines: SearchDiscipline[];
    id: string;
    title: string;
    url: string;
    file: string;
    cards: number;
    use: string;
    caution: string;
    disposition: "Adapted" | "Excluded";
};
export const guide = (value: Omit<SeoGuide, "discipline"> & {
    discipline?: SearchDiscipline;
}): SeoGuide => ({ discipline: "SEO", ...value });
export const guideBody = (g: SeoGuide) => [
    `## Understand the method\n\n${g.principle}`,
    `## Work through it\n\n${g.method}`,
    `## Make the right decision\n\n${g.decisions}`,
    `## Build the deliverable\n\n${g.deliverable}`,
].join("\n\n");
export const guideWordCount = (g: SeoGuide) => [g.summary, g.whenToUse, g.principle, g.method, g.decisions, g.deliverable, g.example, ...g.steps, g.measurement, g.pitfalls].join(" ").split(/\s+/).length;
export const guideMinutes = (g: SeoGuide) => Math.max(3, Math.ceil(guideWordCount(g) / 190));
export const guideSummary = (g: SeoGuide) => ({ id: g.id, discipline: g.discipline, title: g.title, topic: g.topic, summary: g.summary, effort: g.effort, minutes: guideMinutes(g), sourceIds: g.sourceIds });
export type SeoGuideSummary = ReturnType<typeof guideSummary>;
