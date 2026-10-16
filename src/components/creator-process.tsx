import Link from "next/link";
import { CREATOR_STEPS } from "@/lib/creator-studio";
export function CreatorProcess({ current, scriptId, avatarId, jobId, brandId }: {
    current?: (typeof CREATOR_STEPS)[number];
    scriptId?: string;
    avatarId?: string;
    jobId?: string;
    brandId?: string;
}) {
    const choices = new URLSearchParams();
    if (scriptId)
        choices.set("script", scriptId);
    if (avatarId)
        choices.set("avatar", avatarId);
    const creator = `/studio/creator${choices.size ? `?${choices}` : ""}`;
    const production = jobId ? `/production?job=${encodeURIComponent(jobId)}` : scriptId ? `/production?script=${encodeURIComponent(scriptId)}` : "/production";
    const editor = jobId && brandId ? `/video-editing?mode=ad&source=production&id=${encodeURIComponent(jobId)}&brand=${encodeURIComponent(brandId)}` : "/video-editing?mode=ad";
    const hrefs = ["avatar", "character", "script", "format"].map((anchor) => `${creator}#${anchor}`).concat([production, production, editor, jobId ? `/api/production/${encodeURIComponent(jobId)}/package` : production]);
    return <nav aria-label="Creator process" className="space-y-2 rounded-xl border bg-muted/20 p-4" data-testid="creator-process">
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{CREATOR_STEPS.map((label, i) => <li key={label}><Link aria-current={current === label ? "step" : undefined} href={hrefs[i]} className={`flex min-h-11 items-center gap-2 rounded-md px-2 text-xs ${current === label ? "bg-primary text-primary-foreground" : "border hover:bg-muted"}`}><span aria-hidden="true">{i + 1}</span>{label}</Link></li>)}</ol>
  </nav>;
}
