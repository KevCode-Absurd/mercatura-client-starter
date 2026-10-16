import type { SearchDiscipline, SeoGuideSummary, SeoSource } from "./types";
export type DisciplineFilter = "All" | SearchDiscipline;
export const disciplineGuides = (guides: SeoGuideSummary[], discipline: DisciplineFilter) => guides.filter(g => discipline === "All" || g.discipline === discipline);
export const disciplineSources = (sources: SeoSource[], discipline: DisciplineFilter) => sources.filter(s => discipline === "All" || s.disciplines.includes(discipline));
export function filterGuides(guides: SeoGuideSummary[], filters: {
    discipline: DisciplineFilter;
    topic: string;
    source: string;
    query: string;
    unread: boolean;
}, completed: string[]) {
    const q = filters.query.trim().toLowerCase();
    return disciplineGuides(guides, filters.discipline).filter(g => (filters.topic === "All topics" || g.topic === filters.topic) &&
        (filters.source === "All sources" || g.sourceIds.includes(filters.source)) &&
        (!filters.unread || !completed.includes(g.id)) &&
        `${g.title} ${g.summary} ${g.topic} ${g.discipline}`.toLowerCase().includes(q));
}
