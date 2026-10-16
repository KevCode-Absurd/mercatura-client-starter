import "server-only";
const registry = globalThis as unknown as {
    __seoVisibilityQueued?: Map<string, string>;
};
export const visibilityQueued = registry.__seoVisibilityQueued ??= new Map<string, string>();
