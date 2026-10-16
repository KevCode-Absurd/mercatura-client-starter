import fs from "node:fs";
import path from "node:path";
export function cachedFileReader<T>(parse: (text: string, file: string) => T, maxEntries = 32) {
    const cache = new Map<string, {
        revision: string;
        value: T;
    }>();
    return (filename: string): T => {
        const file = path.resolve(filename);
        try {
            const stat = fs.statSync(file, { bigint: true });
            const revision = `${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
            const hit = cache.get(file);
            if (hit?.revision === revision) {
                cache.delete(file);
                cache.set(file, hit);
                return hit.value;
            }
            const value = parse(fs.readFileSync(file, "utf8"), file);
            cache.delete(file);
            cache.set(file, { revision, value });
            if (cache.size > maxEntries)
                cache.delete(cache.keys().next().value!);
            return value;
        }
        catch (error) {
            cache.delete(file);
            throw error;
        }
    };
}
