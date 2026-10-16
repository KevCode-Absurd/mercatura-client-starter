import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { DiffView, diffCounts } from "@/components/diff-view";
import { lineDiff } from "@/lib/inspect/diff";
import { fileVersions, getEdit } from "@/lib/inspect/edits";
import { watchedSkills } from "@/lib/skills/watched";
export const dynamic = "force-dynamic";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const HOW = { hand: "edited by hand", feedback: "from feedback", tighten: "tightened", restore: "put back" } as const;
export default async function ChangePage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const e = getEdit(decodeURIComponent(id));
    if (!e)
        notFound();
    const skill = watchedSkills().find((s) => s.file === e.row.file || s.also.includes(e.row.file));
    const version = fileVersions(e.row.file).find((v) => v.id === e.row.id)?.version;
    const lines = lineDiff(e.before, e.after);
    const back = skill ? `/skills/file/${e.row.file.split("/").slice(1).map(encodeURIComponent).join("/")}` : "/skills";
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: back, label: skill ? "All versions" : "Skills" }} title={`${skill?.name ?? e.row.file}${version ? `, version ${version}` : ""}`} subtitle={`${HOW[e.row.source]}${e.row.by ? ` by ${e.row.by}` : ""}, ${when(e.row.at)}. ${diffCounts(lines)}; ${e.row.charsBefore.toLocaleString("en-US")} to ${e.row.charsAfter.toLocaleString("en-US")} characters.${e.row.note ? ` ${e.row.note}` : ""}`}/>
      <div className="px-6 py-8">
        <DiffView lines={lines}/>
      </div>
    </div>);
}
