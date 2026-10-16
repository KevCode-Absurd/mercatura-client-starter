import { PageHeader } from "@/components/bits";
import { canChangeSkills } from "@/lib/admin";
import { lineDiff } from "@/lib/inspect/diff";
import { llmEnabled } from "@/lib/llm/gateway";
import { listProposals, openProposals, skillStates } from "@/lib/skills/proposals";
import { SkillsView, type ProposalView } from "./skills-view";
export const dynamic = "force-dynamic";
export default async function SkillsPage() {
    const skills = skillStates();
    const nameOf = (file: string) => skills.find((s) => s.file === file || s.also.includes(file))?.name ?? file.split("/").slice(1, -1).join("/");
    const view = (p: ReturnType<typeof openProposals>[number]): ProposalView => ({
        id: p.id,
        file: p.file,
        skill: nameOf(p.file),
        source: p.source,
        said: p.said,
        summary: p.summary,
        status: p.status,
        error: p.error,
        at: p.created_at,
        decidedAt: p.decided_at,
        decidedBy: p.decided_by,
        editId: p.edit_id,
        lines: p.status === "open" ? lineDiff(p.before, p.after) : [],
    });
    const open = openProposals().map(view);
    const decided = listProposals(60)
        .filter((p) => p.status !== "open")
        .slice(0, 20)
        .map(view);
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Skills" subtitle="Review how the app creates your work. Approve suggested improvements from feedback, or restore an earlier version."/>
      <SkillsView open={open} decided={decided} skills={skills} admin={canChangeSkills()} live={llmEnabled()}/>
    </div>);
}
