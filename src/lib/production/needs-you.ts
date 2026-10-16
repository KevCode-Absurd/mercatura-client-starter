import { columnOf, type BoardJob } from "./board";
export interface Waiting<T> {
    approve: T[];
    review: T[];
}
export function waitingForYou<T extends BoardJob & {
    updated_at: string;
}>(jobs: T[]): Waiting<T> {
    const oldest = (a: T, b: T) => a.updated_at.localeCompare(b.updated_at);
    return {
        approve: jobs.filter((j) => columnOf(j) === "waiting").sort(oldest),
        review: jobs.filter((j) => columnOf(j) === "in_review").sort(oldest),
    };
}
export type WaitingKind = keyof Waiting<unknown>;
export const WAITING_LABEL: Record<WaitingKind, string> = {
    approve: "to approve before the next step",
    review: "finished, to look at",
};
export function nextInWalk(ids: string[], current: string, waits: (id: string) => boolean): string | null {
    const at = ids.indexOf(current);
    const rest = at < 0 ? ids : [...ids.slice(at + 1), ...ids.slice(0, at)];
    return rest.find((id) => id !== current && waits(id)) ?? null;
}
