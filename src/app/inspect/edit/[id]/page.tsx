import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { DiffView } from "@/components/diff-view";
import { lineDiff } from "@/lib/inspect/diff";
import { getEdit } from "@/lib/inspect/edits";
import { FileLink, num, when } from "../../ui";
export const dynamic = "force-dynamic";
export default async function EditPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const e = getEdit(decodeURIComponent(id));
    if (!e)
        notFound();
    const lines = lineDiff(e.before, e.after);
    const gone = lines.filter((l) => l.kind === "gone").length;
    const added = lines.filter((l) => l.kind === "new").length;
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/inspect/notes", label: "Notes and changes" }} title={`${e.row.id}: a change to ${e.row.file.split("/").slice(-2).join("/")}`} subtitle={`${when(e.row.at)}. ${num(e.row.charsBefore)} to ${num(e.row.charsAfter)} characters; ${gone} line${gone === 1 ? "" : "s"} taken out, ${added} put in.${e.row.note ? ` Why: ${e.row.note}` : ""}`}/>
      <div className="space-y-3 p-6">
        <p className="text-xs text-muted-foreground">
          The file: <FileLink path={e.row.file}/>. To put it back, open the file and use &quot;Put back the text before this&quot; on this change.
        </p>
        <DiffView lines={lines}/>
      </div>
    </div>);
}
