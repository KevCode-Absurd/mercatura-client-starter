import { fingerprint } from "./store";
type Entry = {
    value: unknown;
    expires: number;
};
const cache = new Map<string, Entry>();
let hits = 0, misses = 0;
export function cachedContext<T>(input: {
    namespace: string;
    revision: unknown;
    scope: unknown;
    method: string;
    validUntil?: number;
    now?: number;
    ttlMs?: number;
    valueExpiry?: (value: T) => number | undefined;
}, build: () => T): T {
    const now = input.now ?? Date.now(), key = fingerprint({ namespace: input.namespace, revision: input.revision, scope: input.scope, method: input.method });
    const old = cache.get(key);
    if (old && old.expires > now) {
        hits++;
        cache.delete(key);
        cache.set(key, old);
        return structuredClone(old.value) as T;
    }
    misses++;
    const value = build(), expires = Math.min(now + (input.ttlMs ?? 60000), input.validUntil ?? Infinity, input.valueExpiry?.(value) ?? Infinity);
    if (expires > now) {
        cache.set(key, { value: structuredClone(value), expires });
        while (cache.size > 128)
            cache.delete(cache.keys().next().value!);
    }
    return structuredClone(value);
}
export function contextCacheStats() { return { entries: cache.size, hits, misses }; }
export function clearContextCache() { cache.clear(); hits = 0; misses = 0; }
