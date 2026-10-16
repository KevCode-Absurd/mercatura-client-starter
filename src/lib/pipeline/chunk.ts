import type { Segment } from "@/db/schema";
export const CHUNK_CHARS = 12000;
export function chunkSegments(segments: Segment[], maxChars = CHUNK_CHARS): {
    start: number;
    end: number;
    segIdx: number[];
}[] {
    const chunks: {
        start: number;
        end: number;
        segIdx: number[];
    }[] = [];
    let cur: number[] = [];
    let overlapOnly = false;
    const size = (idx: number[]) => (idx.length ? segments[idx[idx.length - 1]].end - segments[idx[0]].start : 0);
    const emit = () => chunks.push({ start: segments[cur[0]].start, end: segments[cur[cur.length - 1]].end, segIdx: cur });
    for (let i = 0; i < segments.length; i++) {
        if (cur.length && size([...cur, i]) > maxChars) {
            if (overlapOnly)
                cur = [];
            else {
                emit();
                cur = [cur[cur.length - 1]];
                overlapOnly = true;
                if (size([...cur, i]) > maxChars)
                    cur = [];
            }
        }
        cur.push(i);
        overlapOnly = false;
    }
    if (cur.length)
        emit();
    return chunks;
}
