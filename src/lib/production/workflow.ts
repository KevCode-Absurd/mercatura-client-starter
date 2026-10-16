import type { AuditItem, JobAsset, ProductionState } from "@/db/schema";
import { productionFindings } from "@/lib/check-review";
export type WorkflowMode = "guided" | "automatic";
export type WorkflowSnapshot = {
    production: ProductionState;
    error?: string | null;
    scriptAudit?: AuditItem[];
    assets?: JobAsset[];
};
type Driver = {
    read: () => WorkflowSnapshot;
    run: () => Promise<unknown>;
    approve: () => Promise<unknown>;
    checkpoint: () => void;
    hold: (reason: string) => void;
};
export async function driveProduction(driver: Driver): Promise<void> {
    for (let moves = 0; moves < 24; moves++) {
        driver.checkpoint();
        const { production: p, error, scriptAudit, assets } = driver.read();
        if (p.next === "done")
            return;
        if (p.next.startsWith("approve:")) {
            if (p.workflow !== "automatic")
                return;
            const failed = productionFindings(p, scriptAudit, assets);
            if (failed.length) {
                driver.hold(`Review needed: ${failed[0].message}`);
                return;
            }
            await driver.approve();
        }
        else {
            if (error && moves > 0)
                return;
            await driver.run();
        }
        const after = driver.read();
        if (!p.workflow || after.production.next === p.next || after.production.prompts_ready)
            return;
    }
    driver.hold("Review needed: this production flow did not finish. Completed work is saved.");
}
