import { measure } from "./speed";
import { finishScan, getScan } from "./store";
export async function runScan(id: string): Promise<void> {
    const scan = getScan(id);
    if (!scan)
        return;
    finishScan(id, { status: "running" });
    try {
        if (scan.kind === "speed") {
            const runs = Number((scan.result as {
                runs?: number;
            } | null)?.runs ?? 3);
            const result = await measure(scan.url, id, runs);
            finishScan(id, { status: "done", result: result as unknown as Record<string, unknown> });
        }
        else if (scan.kind === "security") {
            const { securityScan } = await import("./security");
            const result = await securityScan(scan.url);
            finishScan(id, { status: "done", result: result as unknown as Record<string, unknown> });
        }
        else
            throw new Error(`A ${scan.kind} is not run as a job.`);
    }
    catch (e) {
        const m = (e as Error).message.split("\n")[0];
        finishScan(id, { status: "failed", error: /TUNNEL|PROXY|NAME_NOT_RESOLVED|ENOTFOUND|ECONNREFUSED|ERR_CONNECTION/i.test(m) ? `The site could not be reached from this machine (${m.slice(0, 120)}). Check the address, or that this machine's network allows it.` : m });
    }
}
