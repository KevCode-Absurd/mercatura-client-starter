import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
export function publicAddress(ip: string): boolean {
    if (net.isIP(ip) === 4) {
        const [a, b] = ip.split(".").map(Number);
        return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
    }
    return net.isIP(ip) === 6 && /^[23][0-9a-f]{3}:/i.test(ip) && !/^2001:(?:db8|0):/i.test(ip);
}
export function publicWebsite(raw: string): URL {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443") || host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost") || (net.isIP(host) && !publicAddress(host)))
        throw new Error("Use a public HTTPS website or image URL.");
    return u;
}
export async function publicFetch(raw: string, maxBytes = 8 * 1024 * 1024, redirects = 0, deadline = Date.now() + 15000): Promise<{
    bytes: Buffer;
    type: string;
    url: string;
}> {
    if (redirects > 4)
        throw new Error("Too many redirects from the public site.");
    if (Date.now() >= deadline)
        throw new Error("The public site timed out.");
    const url = publicWebsite(raw);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([
        dns.lookup(host, { all: true }),
        new Promise<never>((_resolve, reject) => { dnsTimer = setTimeout(() => reject(new Error("The site's DNS lookup timed out.")), Math.min(5000, deadline - Date.now())); }),
    ]).finally(() => clearTimeout(dnsTimer));
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
        throw new Error("The site resolves to a private or reserved address.");
    const chosen = addresses[0];
    return new Promise((resolve, reject) => {
        const req = https.get(url, { signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())), headers: { "user-agent": "CreativeEngine/1.0 (public competitor research)", accept: "*/*" }, lookup: (_host, options, callback) => {
                if (options.all)
                    callback(null, [chosen]);
                else
                    callback(null, chosen.address, chosen.family);
            } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                void publicFetch(new URL(res.headers.location, url).href, maxBytes, redirects + 1, deadline).then(resolve, reject);
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`The public site returned HTTP ${res.statusCode}.`));
                return;
            }
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (chunk: Buffer) => {
                size += chunk.length;
                if (size > maxBytes) {
                    res.destroy();
                    reject(new Error("The public response is too large."));
                    return;
                }
                chunks.push(chunk);
            });
            res.on("end", () => resolve({ bytes: Buffer.concat(chunks), type: res.headers["content-type"] ?? "", url: url.href }));
            res.on("error", reject);
        });
        req.setTimeout(15000, () => req.destroy(new Error("The public site timed out.")));
        req.on("error", reject);
    });
}
