import type { SprintStatus } from "@/db/schema";
export const SPRINT_STATUS: Record<SprintStatus, {
    label: string;
    tone: string;
}> = {
    draft: { label: "Starting", tone: "text-muted-foreground" },
    planning: { label: "Writing the plan", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    plan_ready: { label: "Plan ready to approve", tone: "border-amber-200 bg-amber-50 text-amber-700" },
    briefing: { label: "Writing the briefs", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    briefs_ready: { label: "Briefs ready to approve", tone: "border-amber-200 bg-amber-50 text-amber-700" },
    rendering: { label: "Rendering", tone: "border-sky-200 bg-sky-50 text-sky-700" },
    done: { label: "Ads ready", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    failed: { label: "Stopped", tone: "border-red-200 bg-red-50 text-red-700" },
};
export const photoUrl = (rel: string, w?: number) => `/api/brand-file/assets/${rel.split("/").map(encodeURIComponent).join("/")}${w ? `?w=${w}` : ""}`;
