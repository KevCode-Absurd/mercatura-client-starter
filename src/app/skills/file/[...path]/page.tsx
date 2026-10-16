import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { canChangeSkills } from "@/lib/admin";
import { fileVersions } from "@/lib/inspect/edits";
import { readInstructionFile } from "@/lib/inspect/skill-map";
import { wordCount } from "@/lib/skills/patch";
import { watchedSkills } from "@/lib/skills/watched";
import { Versions } from "./versions";
export const dynamic = "force-dynamic";
export default async function SkillHistoryPage({ params }: {
    params: Promise<{
        path: string[];
    }>;
}) {
    const { path } = await params;
    const file = `skills/${path.map(decodeURIComponent).join("/")}`;
    const skill = watchedSkills().find((s) => s.file === file || s.also.includes(file));
    const cur = readInstructionFile(file);
    if (!skill || !cur)
        notFound();
    const versions = fileVersions(file);
    const now = versions.length ? versions[versions.length - 1].version : 1;
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/skills", label: "All skills" }} title={skill.name} subtitle={`${file}. Now at version ${now}, ${wordCount(cur.text).toLocaleString("en-US")} words. ${skill.description}`}/>
      <div className="px-6 py-10 max-md:py-6">
        <Versions file={file} current={now} admin={canChangeSkills()} rows={versions.map((v) => ({ id: v.id, version: v.version, at: v.at, note: v.note, source: v.source, by: v.by, charsBefore: v.charsBefore, charsAfter: v.charsAfter }))}/>
        {skill.also.length > 0 && (<p className="mt-8 text-xs text-muted-foreground">
            The skill&apos;s other files: {skill.also.map((f) => f.replace(`skills/${skill.folder}/`, "")).join(", ")}. A change from feedback goes into the file above, the one the steps are sent; the others are changed by hand on Inspect.
          </p>)}
      </div>
    </div>);
}
