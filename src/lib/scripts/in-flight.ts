import type { ScriptLine } from "@/db/schema";
export interface InFlightDraft {
    id: string;
    title: string;
    lines: ScriptLine[];
}
interface Seat {
    turn: number;
    at: number;
    draft: InFlightDraft | null;
    wake: Set<() => void>;
}
const seats = new Map<string, Seat[]>();
export const WAIT_MS = 150000;
const STALE_MS = 10 * 60000;
const live = (conceptId: string, now = Date.now()): Seat[] => {
    const all = (seats.get(conceptId) ?? []).filter((s) => now - s.at < STALE_MS);
    if (all.length)
        seats.set(conceptId, all);
    else
        seats.delete(conceptId);
    return all;
};
const wakeAll = (s: Seat[]) => {
    for (const x of s) {
        const w = [...x.wake];
        x.wake.clear();
        for (const f of w)
            f();
    }
};
export interface SeatHandle {
    before(): Promise<InFlightDraft[]>;
    others(): InFlightDraft[];
    publish(d: Omit<InFlightDraft, "id">): void;
    leave(): void;
}
export function takeSeat(conceptId: string, turn: number, opts: {
    waitMs?: number;
} = {}): SeatHandle {
    const me: Seat = { turn, at: Date.now(), draft: null, wake: new Set() };
    seats.set(conceptId, [...live(conceptId), me]);
    const waitMs = opts.waitMs ?? WAIT_MS;
    const earlier = () => live(conceptId).filter((s) => s !== me && (s.turn < me.turn || (s.turn === me.turn && s.at < me.at)));
    const pending = () => earlier().filter((s) => !s.draft);
    const label = (s: Seat): InFlightDraft => ({ ...(s.draft as InFlightDraft), id: `another script of this batch (its turn ${s.turn + 1})` });
    return {
        async before() {
            const until = Date.now() + waitMs;
            while (pending().length && Date.now() < until) {
                await new Promise<void>((resolve) => {
                    const t = setTimeout(done, Math.max(0, until - Date.now()));
                    function done() {
                        clearTimeout(t);
                        for (const s of pending())
                            s.wake.delete(done);
                        resolve();
                    }
                    for (const s of pending())
                        s.wake.add(done);
                });
            }
            return earlier().filter((s) => s.draft).map(label);
        },
        others() {
            return live(conceptId).filter((s) => s !== me && s.draft).map(label);
        },
        publish(d) {
            me.draft = { id: "", title: d.title, lines: d.lines };
            wakeAll([me]);
        },
        leave() {
            seats.set(conceptId, live(conceptId).filter((s) => s !== me));
            if (!seats.get(conceptId)?.length)
                seats.delete(conceptId);
            wakeAll([me]);
        },
    };
}
export const seatsOf = (conceptId: string): number => live(conceptId).length;
