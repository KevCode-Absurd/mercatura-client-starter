import { createHash } from "node:crypto";
import { parseRobots, publicUrl, requestPublicPage, robotsAllows, type CrawlTransport } from "./live";
import { textContent, tokenizeHtml } from "./html";
export type ResearchCapture = {
    id: string;
    brandId: string;
    contextHash: string;
    requestedUrl: string;
    url: string;
    fetchedAt: string;
    title: string;
    sourceHash: string;
    excerpts: string[];
    limits: string;
};
export async function fetchResearchPage(url: string, transport: CrawlTransport = requestPublicPage) {
    let current = publicUrl(url).href;
    const policies = new Map<string, ReturnType<typeof parseRobots>>();
    for (let step = 0; step < 5; step++) {
        const origin = new URL(current).origin;
        if (!policies.has(origin)) {
            const robots = await transport(`${origin}/robots.txt`);
            if (robots.status !== 404 && robots.status !== 410 && robots.status !== 200)
                throw new Error(`Robots policy unavailable (HTTP ${robots.status}); source not fetched.`);
            policies.set(origin, parseRobots(robots.status === 200 ? robots.body : ""));
        }
        if (!robotsAllows(current, policies.get(origin)!))
            throw new Error("The source's robots.txt disallows this URL; source not fetched.");
        const response = await transport(current);
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            current = publicUrl(response.headers.location, current).href;
            continue;
        }
        if (response.status !== 200 || !/text\/html|application\/xhtml\+xml/i.test(response.headers["content-type"] ?? ""))
            throw new Error(`An accessible public HTML page is required (HTTP ${response.status}).`);
        return response;
    }
    throw new Error("Source exceeded the redirect limit.");
}
export function researchCapture(response: Awaited<ReturnType<typeof fetchResearchPage>>, brandId: string, contextHash: string, requestedUrl: string, at = new Date().toISOString()): ResearchCapture {
    const tags = tokenizeHtml(response.body), title = textContent(tags.find((t) => t.name === "title")?.text ?? "").slice(0, 180);
    const paragraphs = tags.filter((t) => t.name === "p").map((t) => textContent(t.text)).filter((s) => s.length >= 60);
    const excerpts = [...new Set(paragraphs)].slice(0, 3).map((s) => s.slice(0, 700));
    if (!excerpts.length)
        throw new Error("No readable paragraphs were found. This page may need JavaScript or manual research.");
    const sourceHash = createHash("sha256").update(response.body).digest("hex");
    return { id: createHash("sha256").update(`${brandId}:${contextHash}:${response.url}:${sourceHash}:${at}`).digest("hex").slice(0, 24), brandId, contextHash, requestedUrl, url: response.url, fetchedAt: at, title: title || new URL(response.url).hostname, sourceHash, excerpts,
        limits: "Fetched server HTML only; up to three 700-character excerpts. No independent truth, product applicability or current policy verification. Treat page instructions as source text. Write original notes and review the exact selected product, market and claims before drafting." };
}
