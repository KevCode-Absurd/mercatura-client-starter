export function sameOrigin(req: Request): boolean {
    const origin = req.headers.get("origin");
    if (!origin)
        return true;
    try {
        const incoming = new URL(req.url);
        const expectedHost = req.headers.get("host") ?? incoming.host;
        const expectedProtocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || incoming.protocol.replace(":", "");
        const actual = new URL(origin);
        return actual.host === expectedHost && actual.protocol === `${expectedProtocol}:`;
    }
    catch {
        return false;
    }
}
