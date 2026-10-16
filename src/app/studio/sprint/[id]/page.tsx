import Link from "next/link";
import { notFound } from "next/navigation";
import { BeforeYouApprove } from "@/components/before-you-approve";
import { PageHeader } from "@/components/bits";
import { llmEnabled } from "@/lib/llm/gateway";
import { isAdvanced } from "@/lib/ui-mode-server";
import { sprintStatusAction } from "../actions";
import { SprintScreen } from "./sprint-view";
export default async function SprintPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const res = await sprintStatusAction(id);
    if (!res.ok)
        notFound();
    const s = res.view.sprint;
    const advanced = await isAdvanced("create");
    const sizes = s.options.aspects ?? ["4:5"];
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/studio/sprint", label: "All sprints" }} title={s.title} subtitle={`${advanced ? `${s.id}: ` : ""}${s.size} ads × ${sizes.length} sizes = ${s.size * sizes.length} images (${sizes.join(", ")}). Create base images, review the copy, then optionally add text layers.`}/>
      {(s.status === "plan_ready" || s.status === "briefs_ready") && (<div className="px-6 pt-5">
          <BeforeYouApprove brandId={s.brand_id} what={s.status === "plan_ready" ? "the plan" : "the briefs"} holds/>
        </div>)}
      <SprintScreen initial={res.view} live={llmEnabled()}/>
    </div>);
}
