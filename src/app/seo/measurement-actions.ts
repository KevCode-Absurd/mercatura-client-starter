"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { parseSearchCsv, parseLighthouse, labHandoff, pageSpeedTarget, compactLighthouseJson, MAX_LIGHTHOUSE_RAW_BYTES } from "@/lib/seo/measurement";
import { loadMeasurement, saveMeasurementImport } from "@/lib/seo/measurement-store";
import { listArtifacts, saveArtifact, readFocusedAudit } from "@/lib/seo/store";
export async function runPageSpeedAction(brandId: string, input: {
    url: string;
    device: "mobile" | "desktop";
}) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        if (!input || !["mobile", "desktop"].includes(input.device))
            throw new Error("Choose mobile or desktop.");
        const ctx = seoContext(brandId), saved = readFocusedAudit(ctx);
        const crawlUrls = saved?.audit.mode === "live" && saved.audit.contextHash === ctx.contextHash ? saved.snapshot.pages.filter((p) => p.live?.htmlInspected && p.robotsAllowed !== false).map((p) => p.url) : [];
        const target = pageSpeedTarget(ctx, input.url, crawlUrls);
        const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
        endpoint.searchParams.set("url", target);
        endpoint.searchParams.set("strategy", input.device);
        endpoint.searchParams.set("category", "performance");
        if (process.env.PAGESPEED_API_KEY)
            endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY);
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(120000), redirect: "error", cache: "no-store" });
        if (!response.ok) {
            if ([401, 403, 429].includes(response.status))
                throw new Error("Google PageSpeed rejected the request because public quota or API access is unavailable. Try the public PageSpeed link and import its JSON report, or configure a server-side PageSpeed API key later.");
            throw new Error(`PageSpeed could not complete this test (HTTP ${response.status}). Try again or import a Lighthouse JSON report.`);
        }
        if (Number(response.headers.get("content-length") || 0) > MAX_LIGHTHOUSE_RAW_BYTES)
            throw new Error("PageSpeed returned a report larger than 15 MB. Use the JSON import instead.");
        if (!response.body)
            throw new Error("PageSpeed returned an empty report.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let bytes = 0, text = "";
        try {
            while (true) {
                const chunk = await reader.read();
                if (chunk.done)
                    break;
                bytes += chunk.value.byteLength;
                if (bytes > MAX_LIGHTHOUSE_RAW_BYTES) {
                    await reader.cancel();
                    throw new Error("PageSpeed returned a report larger than 15 MB. Use the JSON import instead.");
                }
                text += decoder.decode(chunk.value, { stream: true });
            }
            text += decoder.decode();
        }
        finally {
            reader.releaseLock();
        }
        const report = parseLighthouse(ctx, compactLighthouseJson(text));
        if (report.device !== input.device)
            throw new Error("PageSpeed returned a different device configuration. No report was saved.");
        if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== ctx.contextHash)
            throw new Error("Brand context changed during the test. Run it again for the current store.");
        const value = { ...report, id: randomUUID(), importedAt: new Date().toISOString() };
        saveMeasurementImport(value);
        revalidatePath("/seo", "layout");
        return { ok: true as const, id: value.id };
    }
    catch (error) {
        const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
        const message = timeout ? "PageSpeed did not finish within two minutes. Try again or import a Lighthouse JSON report." : error instanceof Error && error.message.startsWith("fetch") ? "Unable to reach Google PageSpeed. Try the public PageSpeed link or import JSON." : error instanceof Error ? error.message : "Unable to run PageSpeed. Import a Lighthouse JSON report instead.";
        return { ok: false as const, error: message };
    }
}
export async function importSeoMeasurementAction(brandId: string, input: {
    kind: "search" | "lab";
    text: string;
    segment?: string;
}) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        if (!input || !["search", "lab"].includes(input.kind) || typeof input.text !== "string" || input.text.length > 700000)
            throw new Error("Choose a supported report smaller than 700 KB.");
        const ctx = seoContext(brandId);
        const parsed = input.kind === "search" ? parseSearchCsv(ctx, input.text, input.segment ?? "") : parseLighthouse(ctx, input.text);
        const value = { ...parsed, id: randomUUID(), importedAt: new Date().toISOString() };
        saveMeasurementImport(value);
        revalidatePath("/seo", "layout");
        return { ok: true as const, id: value.id };
    }
    catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "Unable to import this report." };
    }
}
export async function createPerformanceHandoffAction(brandId: string, reportId: string, issueId: string) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        const ctx = seoContext(brandId);
        const report = loadMeasurement(brandId).lab.find((r) => r.id === reportId && r.brandId === brandId && r.contextHash === ctx.contextHash);
        const issue = report?.actions.find((a) => a.id === issueId);
        if (!report || !issue)
            throw new Error("This report is unavailable or belongs to older Brand Brain context. Import a fresh report.");
        if (listArtifacts(brandId).length >= 500)
            throw new Error("This workspace supports up to 500 saved artifacts.");
        const at = new Date().toISOString(), id = randomUUID();
        saveArtifact({ id, brandId, contextHash: ctx.contextHash, kind: "fix", title: issue.title.slice(0, 240), keyword: "", productId: null, targetUrl: report.url, description: "Developer handoff grounded in an imported Lighthouse report; human review and implementation required.", body: labHandoff(report, issue), sourceIds: [`lighthouse:${report.id}:${issue.id}`], status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: `Created from imported Lighthouse ${report.device} report tested ${report.testedAt}. No source-code or store changes applied.` }] });
        revalidatePath("/seo", "layout");
        return { ok: true as const, id };
    }
    catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "Unable to prepare the handoff." };
    }
}
