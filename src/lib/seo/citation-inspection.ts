import "server-only";
import type { SeoContext } from "./model";
import { parseRobots, publicUrl, requestPublicPage, robotsAllows, type CrawlTransport } from "./live";
import { textContent, tokenizeHtml } from "./html";
import { sourceBrandPresence, type CitationInspection } from "./citation-outreach";
export async function inspectCitation(ctx: SeoContext, input: string, transport: CrawlTransport = requestPublicPage): Promise<CitationInspection> {
    const checkedAt = new Date().toISOString();
    let url = publicUrl(input).href;
    const started = Date.now(), policies = new Map<string, ReturnType<typeof parseRobots>>();
    const deadline = () => { if (Date.now() - started > 45000)
        throw new Error("Page inspection reached its time limit."); };
    try {
        for (let redirects = 0; redirects <= 4; redirects++) {
            deadline();
            const origin = new URL(url).origin;
            if (!policies.has(origin)) {
                const robots = await transport(`${origin}/robots.txt`);
                if (robots.status !== 404 && (robots.status < 200 || robots.status >= 300))
                    throw new Error("Publisher robots policy could not be assessed; page was not fetched.");
                policies.set(origin, parseRobots(robots.status === 404 ? "" : robots.body));
            }
            const policy = policies.get(origin)!;
            if (!robotsAllows(url, policy))
                throw new Error("Publisher robots policy disallows this page.");
            if (policy.delayMs > 0)
                throw new Error("Publisher requests a crawl delay; review the page in your browser.");
            deadline();
            const response = await transport(url);
            if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
                url = publicUrl(response.headers.location, url).href;
                continue;
            }
            if (response.status !== 200)
                throw new Error(`Publisher returned HTTP ${response.status}; article text was not assessed.`);
            if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(response.headers["content-type"] ?? ""))
                throw new Error("This citation did not return an HTML article.");
            const html = response.body;
            const region = html.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i)?.[1] ?? html.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i)?.[1];
            const content = textContent(region ?? html.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " "));
            const title = textContent(tokenizeHtml(html).find(t => t.name === "title")?.text ?? "").slice(0, 300);
            const present = sourceBrandPresence(ctx, content);
            const substantial = !!region && content.length >= 800 && !/subscribe to (?:read|continue)|sign in to (?:read|continue)|enable javascript|access denied|verify you are human/i.test(content);
            return { checkedAt, finalUrl: url, title, excerpt: content.slice(0, 1600), brandPresence: present ? "present" : substantial ? "not-found" : "unknown",
                note: present ? "Brand name found in fetched page text. This does not establish a recommendation or product fit."
                    : substantial ? "Brand name not found in fetched article text. Rendered, gated or later content may differ."
                        : "Fetched text is insufficient to establish absence; inspect the article in your browser." };
        }
        throw new Error("Publisher exceeded the redirect limit.");
    }
    catch (error) {
        return { checkedAt, finalUrl: url, title: "", excerpt: "", brandPresence: "unknown", note: error instanceof Error ? error.message : "Publisher page could not be inspected." };
    }
}
