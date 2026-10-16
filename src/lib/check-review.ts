import type { AuditItem, HumanCheckOverride, JobAsset, OutputJobRow, ProductionState } from "@/db/schema";
export function humanCheckOverride(stage: string, findings: AuditItem[]): HumanCheckOverride | undefined {
    const failed = findings.filter((finding) => finding.status === "fail");
    if (!failed.length)
        return undefined;
    return { at: new Date().toISOString(), stage, findings: failed.map((finding) => ({ ...finding })) };
}
export function assetFindings(assets: JobAsset[]): AuditItem[] {
    return assets.flatMap((asset) => asset.qa?.status === "fail"
        ? [{ check: "image_quality", status: "fail" as const, message: `${asset.caption ?? asset.path}: ${asset.qa.notes.join("; ") || "Image quality check failed"}` }]
        : []);
}
export function productionFindings(p: ProductionState, scriptAudit: AuditItem[] = [], assets: JobAsset[] = []): AuditItem[] {
    const stage = p.next.replace(/^approve:/, "");
    if (stage === "script")
        return scriptAudit.filter((a) => a.status === "fail");
    if (stage === "plan")
        return [...p.audit, ...scriptAudit].filter((a) => a.status === "fail");
    return assetFindings(assets);
}
export function acceptFinalChecks(job: Pick<OutputJobRow, "production" | "assets">) {
    const override = humanCheckOverride("final", [...(job.production?.audit ?? []), ...assetFindings(job.assets)]);
    if (override && job.production) {
        job.production.check_overrides = [...(job.production.check_overrides ?? []), override];
        job.production.log.push({ at: override.at, step: "review", message: `Human override: ${override.findings.map((a) => a.message).join("; ")}` });
    }
    for (const asset of job.assets) {
        const decision = humanCheckOverride(`final image ${asset.path}`, assetFindings([asset]));
        if (decision)
            asset.check_override = decision;
    }
    return { production: job.production, assets: job.assets };
}
