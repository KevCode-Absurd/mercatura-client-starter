import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { BudgetExceededError, LlmDisabledError } from "../llm/gateway";
import { asStop, checkpoint, RunStoppedError } from "../llm/run-control";
import { errorText } from "../plain-message";
import type { VisibilityAnswer } from "../seo/visibility-provider";
import { getDiscovery, saveDiscovery } from "./store";
import { webCreatorProvider, type CreatorResearchProvider } from "./provider";
import { CandidateSchema, FitSchema, PostSchema, fitScore, profileIdentity, rankCreators, type DiscoveryRun, type DiscoveredCreator } from "./types";
export function researchJson(answer: string): Record<string, unknown> {
    const start = answer.indexOf("{");
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i >= 0 && i < answer.length; i++) {
        const c = answer[i];
        if (quoted) {
            if (escaped)
                escaped = false;
            else if (c === "\\")
                escaped = true;
            else if (c === '"')
                quoted = false;
        }
        else if (c === '"')
            quoted = true;
        else if (c === "{")
            depth++;
        else if (c === "}" && --depth === 0) {
            const value = JSON.parse(answer.slice(start, i + 1));
            if (value && typeof value === "object" && !Array.isArray(value))
                return value;
            break;
        }
    }
    throw new Error("Search returned no usable JSON. Its usage was recorded; no creators were invented.");
}
function sourceKey(raw: string): string | null {
    try {
        const u = new URL(raw);
        if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.port || isIP(u.hostname) || !u.hostname.includes(".") || /(?:^|\.)(localhost|local|internal|invalid|test)$/.test(u.hostname))
            return null;
        u.hash = "";
        return u.href.replace(/\/$/, "");
    }
    catch {
        return null;
    }
}
function supportedSources(urls: string[], response: VisibilityAnswer, identityTokens: string[] = []) {
    const wanted = new Set(urls.map(sourceKey).filter(Boolean));
    if (response.provider === "gemini")
        for (const segment of response.citationSegments ?? []) {
            if (identityTokens.some(token => segment.text.includes(JSON.stringify(token))))
                for (const raw of segment.urls) {
                    const key = sourceKey(raw);
                    if (key)
                        wanted.add(key);
                }
        }
    return response.citations.filter(s => { const key = sourceKey(s.url); return !!key && wanted.has(key); }).map(s => ({ url: s.url,
        title: `${/^(vertexaisearch\.cloud\.google\.com|grounding-api-redirects\.googleapis\.com)$/.test(new URL(s.url).hostname) ? "Google citation (destination unverified): " : ""}${s.title}`.slice(0, 300) }));
}
export function candidatesFromSearch(response: VisibilityAnswer, run: DiscoveryRun): DiscoveredCreator[] {
    const json = researchJson(response.answer);
    if (!Array.isArray(json.creators))
        throw new Error("Search returned no creator list.");
    const seen = new Set(run.creators.map(c => c.id));
    const output: DiscoveredCreator[] = [];
    for (const raw of json.creators.slice(0, 30)) {
        const parsed = CandidateSchema.safeParse(raw);
        if (!parsed.success)
            continue;
        const c = parsed.data;
        if (run.options.platform !== "all" && c.platform !== run.options.platform)
            continue;
        const identity = profileIdentity(c.profile_url, c.platform);
        if (!identity || identity.handle.toLowerCase() !== c.handle.replace(/^@?/, "@").toLowerCase())
            continue;
        const sources = supportedSources(c.source_urls, response, [c.handle, c.profile_url]);
        if (!sources.length)
            continue;
        const id = createHash("sha256").update(`${c.platform}:${identity.handle.toLowerCase()}`).digest("hex").slice(0, 24);
        if (seen.has(id))
            continue;
        seen.add(id);
        const { source_urls: _, ...candidate } = c;
        output.push({ ...candidate, handle: identity.handle, profile_url: identity.url, id, sources, score: fitScore(c.fit, c.market_evidence), posts: [],
            review: run.options.reviewRecent ? "pending" : "not_requested", review_note: "", reviewed_at: null });
    }
    return output.slice(0, 4);
}
function isCreatorPost(raw: string, creator: DiscoveredCreator): boolean {
    if (!sourceKey(raw))
        return false;
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (creator.platform === "instagram")
        return host === "instagram.com" && /^\/(p|reel)\/[\w-]+\/?$/.test(u.pathname);
    if (creator.platform === "tiktok")
        return host === "tiktok.com" && u.pathname.toLowerCase().startsWith(`/${creator.handle.toLowerCase()}/video/`) && /^\/@[\w.-]+\/video\/\d+\/?$/.test(u.pathname);
    return host === "youtube.com" && ((u.pathname === "/watch" && /^[\w-]{11}$/.test(u.searchParams.get("v") ?? "")) || /^\/shorts\/[\w-]{11}\/?$/.test(u.pathname));
}
export function reviewFromSearch(response: VisibilityAnswer, creator: DiscoveredCreator, now = new Date()): DiscoveredCreator {
    const json = researchJson(response.answer);
    if (!Array.isArray(json.posts))
        throw new Error("Search returned no post review.");
    const seen = new Set<string>();
    const posts: DiscoveredCreator["posts"] = [];
    for (const raw of json.posts.slice(0, 20)) {
        const parsed = PostSchema.safeParse(raw);
        if (!parsed.success)
            continue;
        const p = parsed.data;
        const date = new Date(`${p.published_at}T00:00:00Z`);
        const age = now.getTime() - date.getTime();
        if (Number.isNaN(age) || date.toISOString().slice(0, 10) !== p.published_at || age < 0 || age > 90 * 86400000 || !isCreatorPost(p.url, creator))
            continue;
        const key = sourceKey(p.url)!;
        const sources = supportedSources(p.source_urls, response, [p.url]);
        if (seen.has(key) || !sources.length)
            continue;
        seen.add(key);
        const { source_urls: _, ...post } = p;
        posts.push({ ...post, sources });
    }
    posts.sort((a, b) => b.published_at.localeCompare(a.published_at));
    const kept = posts.slice(0, 3);
    const fit = FitSchema.safeParse(json.fit);
    const newFit = kept.length && fit.success ? fit.data : creator.fit;
    return { ...creator, posts: kept, fit: newFit, score: fitScore(newFit, creator.market_evidence),
        review: kept.length === 3 ? "three_posts" : kept.length ? "partial" : "unavailable",
        reviewed_at: now.toISOString(),
        review_note: `Public text reviewed; video visuals and latest-post order are unverified. ${typeof json.note === "string" ? json.note.slice(0, 650) : "Access was limited to dated public posts."}`.slice(0, 800) };
}
function addUsage(run: DiscoveryRun, response: VisibilityAnswer) {
    run.cost_usd += response.costUsd;
    if (response.searchEntryPointHtml)
        run.search_suggestions.push(response.searchEntryPointHtml.slice(0, 100000));
}
function failedUsage(run: DiscoveryRun, error: unknown) {
    const cost = (error as {
        costUsd?: unknown;
    })?.costUsd;
    if (typeof cost === "number" && Number.isFinite(cost) && cost >= 0)
        run.cost_usd += cost;
}
function warning(run: DiscoveryRun, message: string) { run.warnings = [...run.warnings, message].slice(-50); }
function fatal(error: unknown): unknown {
    const stopped = asStop(error);
    if (stopped instanceof RunStoppedError || stopped instanceof BudgetExceededError || stopped instanceof LlmDisabledError)
        throw stopped;
    return stopped;
}
export async function runCreatorDiscovery(brandId: string, id: string, provider: CreatorResearchProvider = webCreatorProvider): Promise<void> {
    const run = getDiscovery(brandId, id);
    if (run.status === "complete" || run.status === "stopped")
        return;
    run.status = "running";
    if (!run.creators.length && run.batches_done >= Math.ceil(run.options.count / 4) + 2)
        run.batches_done = 0;
    saveDiscovery(run);
    try {
        const maxBatches = Math.ceil(run.options.count / 4) + 2;
        while (run.batches_done < maxBatches && run.creators.length < run.options.count) {
            checkpoint();
            run.progress = `Finding creators · ${run.creators.length} of ${run.options.count} supported so far`;
            saveDiscovery(run);
            try {
                const response = await provider.discover(run, run.batches_done);
                addUsage(run, response);
                run.creators = rankCreators([...run.creators, ...candidatesFromSearch(response, run)]).slice(0, run.options.count);
            }
            catch (error) {
                failedUsage(run, error);
                fatal(error);
                warning(run, `Search batch ${run.batches_done + 1} could not produce supported candidates. Completed results are kept.`);
            }
            run.batches_done++;
            saveDiscovery(run);
        }
        if (run.options.reviewRecent) {
            for (const creator of [...run.creators]) {
                if (creator.reviewed_at)
                    continue;
                checkpoint();
                run.progress = `Reviewing public posts · ${creator.handle} · ${run.creators.filter(c => c.reviewed_at).length + 1} of ${run.creators.length}`;
                saveDiscovery(run);
                let reviewed: DiscoveredCreator;
                try {
                    const response = await provider.review(run, creator);
                    addUsage(run, response);
                    reviewed = reviewFromSearch(response, creator);
                }
                catch (error) {
                    failedUsage(run, error);
                    fatal(error);
                    reviewed = { ...creator, review: "unavailable", reviewed_at: new Date().toISOString(), review_note: "Public-post review could not complete. Profile evidence is kept; video content remains unreviewed." };
                    warning(run, `${creator.handle}: public posts could not be reviewed.`);
                }
                run.creators = rankCreators(run.creators.map(c => c.id === creator.id ? reviewed : c));
                saveDiscovery(run);
            }
        }
        checkpoint();
        if (run.creators.length < run.options.count)
            warning(run, `Found ${run.creators.length} supported creators of ${run.options.count} requested. The list was not padded with unsupported matches.`);
        run.status = !run.creators.length && run.warnings.some(w => w.startsWith("Search batch")) ? "failed" : "complete";
        run.progress = run.status === "failed" ? "Research failed to produce a supported shortlist. Check the connection and retry." : `Research complete · ${run.creators.length} creators`;
        saveDiscovery(run);
        if (run.status === "failed")
            throw new Error(run.progress);
    }
    catch (error) {
        const stopped = asStop(error);
        run.status = stopped instanceof RunStoppedError ? stopped.mode === "pause" ? "paused" : "stopped" : "failed";
        run.progress = errorText(stopped);
        saveDiscovery(run);
        throw stopped;
    }
}
