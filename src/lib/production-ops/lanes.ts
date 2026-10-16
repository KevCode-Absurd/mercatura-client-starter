export type ResourceLane = "text" | "image" | "browser" | "cpu";
type Entry = {
    run: () => void;
    reject: (e: Error) => void;
    priority: "interactive" | "batch";
    cancel: () => void;
};
type Lane = {
    active: number;
    limit: number;
    queue: Entry[];
    interactiveTurns: number;
};
const globalLanes = globalThis as unknown as {
    __productionLanes?: Record<ResourceLane, Lane>;
};
const lanes = globalLanes.__productionLanes ?? (globalLanes.__productionLanes = Object.fromEntries(Object.entries({ text: 4, image: 2, browser: 2, cpu: 2 }).map(([k, limit]) => [k, { active: 0, limit, queue: [], interactiveTurns: 0 }])) as unknown as Record<ResourceLane, Lane>);
function drain(lane: Lane) { while (lane.active < lane.limit && lane.queue.length) {
    const batch = lane.queue.findIndex(q => q.priority === 'batch'), interactive = lane.queue.findIndex(q => q.priority === 'interactive');
    const at = interactive >= 0 && (lane.interactiveTurns < 3 || batch < 0) ? interactive : Math.max(0, batch);
    const entry = lane.queue.splice(at, 1)[0];
    lane.interactiveTurns = entry.priority === 'interactive' ? lane.interactiveTurns + 1 : 0;
    lane.active++;
    entry.run();
} }
export function laneStatus() { return Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, { active: v.active, waiting: v.queue.length, limit: v.limit }])) as Record<ResourceLane, {
    active: number;
    waiting: number;
    limit: number;
}>; }
export function configureLanes(limits: Partial<Record<ResourceLane, number>>) { for (const [key, n] of Object.entries(limits)) {
    if (!Number.isInteger(n) || n! < 1 || n! > 32)
        throw new Error("Resource limits must be integers from 1 to 32.");
    lanes[key as ResourceLane].limit = n!;
    drain(lanes[key as ResourceLane]);
} }
export async function withResourceLane<T>(name: ResourceLane, fn: (signal: AbortSignal) => Promise<T>, options: {
    signal?: AbortSignal;
    priority?: "interactive" | "batch";
    timeoutMs?: number;
    operationId?: string;
} = {}): Promise<T> {
    const lane = lanes[name], controller = new AbortController();
    const reason = () => options.signal?.reason instanceof Error ? options.signal.reason : new Error("Work cancelled.");
    if (options.signal?.aborted)
        throw reason();
    let timer: ReturnType<typeof setTimeout> | undefined;
    return new Promise<T>((resolve, reject) => {
        const entry: Entry = { priority: options.priority ?? "batch", reject, cancel: () => { }, run: () => {
                if (controller.signal.aborted) {
                    lane.active--;
                    drain(lane);
                    reject(controller.signal.reason);
                    return;
                }
                Promise.resolve().then(() => fn(controller.signal)).then(value => { if (controller.signal.aborted)
                    reject(controller.signal.reason);
                else
                    resolve(value); }, reject).finally(() => { if (timer)
                    clearTimeout(timer); options.signal?.removeEventListener('abort', entry.cancel); lane.active--; drain(lane); });
            } };
        entry.cancel = () => { const error = reason(); controller.abort(error); const at = lane.queue.indexOf(entry); if (at >= 0) {
            lane.queue.splice(at, 1);
            if (timer)
                clearTimeout(timer);
            options.signal?.removeEventListener('abort', entry.cancel);
            reject(error);
        } };
        options.signal?.addEventListener('abort', entry.cancel, { once: true });
        if (options.timeoutMs)
            timer = setTimeout(() => { controller.abort(new Error(`${name} work deadline exceeded.`)); const at = lane.queue.indexOf(entry); if (at >= 0) {
                lane.queue.splice(at, 1);
                options.signal?.removeEventListener('abort', entry.cancel);
                reject(controller.signal.reason);
            } }, options.timeoutMs);
        lane.queue.push(entry);
        drain(lane);
    });
}
