import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { getCheck } from "@/lib/compliance/checks";
import { policies } from "@/lib/compliance/policies";
import { isAdvanced } from "@/lib/ui-mode-server";
import { CheckResult, type PolicyNames } from "../result";
const KIND_WORD: Record<string, string> = { copy: "Words", script: "Script", image: "Image", video: "Video" };
export default async function CheckPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const row = await activeBrand();
    const check = getCheck(row.id, id);
    if (!check)
        notFound();
    const advanced = await isAdvanced("compliance");
    const names: PolicyNames = Object.fromEntries(policies().map((p) => [p.id, { name: p.name, url: p.url }]));
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title={`${KIND_WORD[check.kind] ?? "Check"}: ${check.summary || check.id}`} subtitle={`Checked ${new Date(check.created_at.endsWith("Z") ? check.created_at : `${check.created_at}Z`).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}.`} back={{ href: "/compliance", label: "Compliance" }}/>
      <div className="px-6 py-8">
        <CheckResult check={check} names={names} advanced={advanced}/>
      </div>
    </div>);
}
