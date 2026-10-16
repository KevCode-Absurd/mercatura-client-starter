import { costUsd } from "../llm/pricing";
type Value = Record<string, unknown>;
const object = (v: unknown): Value => v && typeof v === "object" && !Array.isArray(v) ? v as Value : {};
const list = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const count = (v: unknown): number | null => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
export function anthropicVisibilityUsage(raw: unknown, model: string) {
    const usage = object(object(raw).usage), input = count(usage.input_tokens), output = count(usage.output_tokens);
    const cached = count(usage.cache_read_input_tokens ?? 0), written = count(usage.cache_creation_input_tokens ?? 0);
    const searches = count(object(usage.server_tool_use).web_search_requests);
    if (input === null || output === null || cached === null || written === null || searches === null)
        return null;
    const tokens = { input_tokens: input, output_tokens: output, cache_read_tokens: cached, cache_write_tokens: written };
    return { tokens, costUsd: costUsd(model, tokens) + searches * 0.01 };
}
export function parseAnthropicVisibility(raw: unknown, safeUrl: (v: unknown) => string | null) {
    const body = object(raw), blocks = list(body.content).map(object);
    if (body.stop_reason !== "end_turn")
        throw new Error("Anthropic did not finish the answer (paused or truncated). Retry this observation; it remains unmeasured.");
    const results = blocks.filter(b => b.type === "web_search_tool_result");
    if (results.some(b => object(b.content).type === "web_search_tool_result_error"))
        throw new Error("Anthropic web search reported a tool error. Check search access and retry; this observation remains unmeasured.");
    if (!results.some(b => Array.isArray(b.content)))
        throw new Error("Anthropic returned no completed web search. An ungrounded answer cannot count as a visibility observation.");
    const searches = blocks.filter(b => b.type === "server_tool_use" && b.name === "web_search");
    const searchQueries = [...new Set(searches.map(b => object(b.input).query).filter((q): q is string => typeof q === "string" && !!q.trim()))].slice(0, 50);
    const text = blocks.filter(b => b.type === "text" && typeof b.text === "string");
    const answer = text.map(b => b.text as string).join("\n\n").trim();
    if (!answer)
        throw new Error("Anthropic completed without a usable answer. This observation remains unmeasured.");
    const retrievedSources = results.flatMap(b => list(b.content).map(object).flatMap(s => {
        const url = s.type === "web_search_result" ? safeUrl(s.url) : null;
        return url ? [{ url, title: typeof s.title === "string" ? s.title : new URL(url).hostname }] : [];
    })).slice(0, 100);
    const citations = new Map<string, {
        url: string;
        title: string;
    }>();
    let citationAssessmentComplete = true;
    for (const part of text)
        for (const citation of list(part.citations).map(object)) {
            if (citation.type !== "web_search_result_location")
                continue;
            const url = safeUrl(citation.url);
            if (!url) {
                citationAssessmentComplete = false;
                continue;
            }
            citations.set(url, { url, title: typeof citation.title === "string" ? citation.title : new URL(url).hostname });
        }
    return { answer, citations: [...citations.values()], retrievedSources, searchQueries, citationAssessmentComplete };
}
