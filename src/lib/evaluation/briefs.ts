export interface EvaluationBrief {
    id: string;
    label: string;
    format: string;
    type: string;
    buyer: string;
    awareness: string;
    age: number;
    direction: string;
}
export const STATIC_BRIEFS: EvaluationBrief[] = [];
