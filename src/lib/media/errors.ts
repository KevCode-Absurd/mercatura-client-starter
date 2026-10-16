export class MediaDisabledError extends Error {
}
export class MediaCapError extends Error {
}
export class ClipFailedError extends Error {
}
export class ProviderRefused extends Error {
    constructor(message: string, public status: number) {
        super(message);
    }
}
export const neverBilled = (e: unknown): e is ProviderRefused => e instanceof ProviderRefused && [401, 402, 403, 429].includes(e.status);
export function providerError(label: string, status: number): Error {
    const msg: Record<number, string> = {
        400: "request was rejected; check the prompt and media",
        401: "API key was rejected",
        402: "not enough provider credits",
        403: "model access was denied",
        429: "rate limit reached; try again later",
    };
    return new ProviderRefused(`${label}: ${msg[status] ?? "provider returned an error"} (HTTP ${status}).`, status);
}
