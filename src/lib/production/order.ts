interface Dated {
    id: string;
    created_at: string;
    updated_at: string;
}
const at = (s: string) => Date.parse(s) || 0;
export function newestFirst<T extends Dated>(rows: T[]): T[] {
    return [...rows].sort((a, b) => at(b.updated_at) - at(a.updated_at) || at(b.created_at) - at(a.created_at) || b.id.localeCompare(a.id, undefined, { numeric: true }));
}
