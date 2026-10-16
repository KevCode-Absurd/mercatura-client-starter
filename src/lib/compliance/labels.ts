import type { ComplianceFinding, ComplianceVerdict } from "@/db/schema";
export const VERDICT_LABEL: Record<ComplianceVerdict, string> = { ready: "Ready to run", fix: "Fix first", rejected: "Likely rejected" };
export const SEVERITY_LABEL: Record<ComplianceFinding["severity"], string> = { reject: "Would reject", restriction: "Needs a restriction", warning: "Warning" };
