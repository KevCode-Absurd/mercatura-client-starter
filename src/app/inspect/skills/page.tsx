import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { openNotes } from "@/lib/inspect/notes";
import { skillMap, type MapGroup } from "@/lib/inspect/skill-map";
import { cn } from "@/lib/utils";
import { FileLink, InspectTabs, num, r, td, th, when } from "../ui";
export const dynamic = "force-dynamic";
const STATE: Record<MapGroup["state"], {
    label: string;
    cls: string;
    note: string;
}> = {
    loads: { label: "Loads", cls: "border-emerald-300 bg-emerald-50 text-emerald-800", note: "Its words were in 1 of a step's 8 most recent calls." },
    earlier: { label: "Earlier only", cls: "border-amber-300 bg-amber-50 text-amber-800", note: "Its words are in older calls and in none of the recent ones." },
    named: { label: "In the code, not seen", cls: "border-sky-300 bg-sky-50 text-sky-800", note: "The code names it, and no call in the log carries its words: a path nobody has run, a folder of pictures, or a file read by code and not sent." },
    unused: { label: "Not used", cls: "border-zinc-300 bg-zinc-50 text-zinc-700", note: "Nothing in the code names it and no call carries its words." },
};
function Group({ g }: {
    g: MapGroup;
}) {
    const used = g.files.filter((f) => f.uses.length);
    const idle = g.files.filter((f) => !f.uses.length);
    const s = STATE[g.state];
    return (<details className="border-b last:border-b-0" data-testid="skill-group" data-state={g.state}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm hover:bg-muted/40">
        <span className="font-medium">{g.name}</span>
        <span className={cn("rounded border px-1.5 text-xs", s.cls)} title={s.note}>
          {s.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {g.files.length} text file{g.files.length === 1 ? "" : "s"}, {num(g.chars)} characters{g.otherFiles ? `, ${num(g.otherFiles)} other files` : ""}
        </span>
        {g.tasks.length > 0 && <span className="text-xs">sent to: {g.tasks.map((t) => t.replace(/_/g, " ")).join(", ")}</span>}
      </summary>
      <div className="space-y-3 px-3 pb-4 pt-1">
        {g.description && <p className="max-w-3xl text-xs text-muted-foreground">{g.description}</p>}
        {used.length > 0 && (<div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>File</th>
                  <th className={cn(th, r)}>Characters</th>
                  <th className={th}>Sent to</th>
                  <th className={th}>How much of it</th>
                  <th className={th}>Last sent</th>
                </tr>
              </thead>
              <tbody>
                {used.flatMap((f) => f.uses.map((u, i) => (<tr key={`${f.rel}${u.task}${u.where}`}>
                      <td className={td}>{i === 0 ? <FileLink path={`${f.root}/${f.rel}`} className="text-xs"/> : null}</td>
                      <td className={cn(td, r)}>{i === 0 ? num(f.chars) : ""}</td>
                      <td className={td}>
                        <Link href={`/inspect/step/${u.task}`} className="text-primary hover:underline">
                          {u.task.replace(/_/g, " ")}
                        </Link>{" "}
                        <span className="text-muted-foreground">({u.where} prompt)</span>
                      </td>
                      <td className={td}>{u.share >= 0.9 ? "whole" : `about ${Math.round(u.share * 100)}%`}</td>
                      <td className={cn(td, "whitespace-nowrap", u.recent ? "" : "text-amber-700")}>
                        {when(u.last)}
                        {u.recent ? "" : " (not in recent calls)"}
                      </td>
                    </tr>)))}
              </tbody>
            </table>
          </div>)}
        {idle.length > 0 && (<div className="text-xs">
            <div className="mb-1 text-muted-foreground">
              {used.length ? "Files of it that no call carries" : "Its text files"} ({idle.length}):
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {idle.slice(0, 40).map((f) => (<FileLink key={f.rel} path={`${f.root}/${f.rel}`} className="text-xs"/>))}
              {idle.length > 40 && <span className="text-muted-foreground">and {idle.length - 40} more</span>}
            </div>
          </div>)}
        {g.namedIn.length > 0 && (<p className="text-xs text-muted-foreground">
            Named in the code: <span className="font-mono">{g.namedIn.slice(0, 8).join(", ")}</span>
            {g.namedIn.length > 8 ? ` and ${g.namedIn.length - 8} more` : ""}
          </p>)}
      </div>
    </details>);
}
export default async function SkillsPage({ searchParams }: {
    searchParams: Promise<{
        fresh?: string;
    }>;
}) {
    const map = skillMap((await searchParams).fresh === "1");
    const skills = map.groups.filter((g) => g.root === "skills");
    const prompts = map.groups.filter((g) => g.root === "prompts");
    const count = (list: MapGroup[], s: MapGroup["state"]) => list.filter((g) => g.state === s).length;
    const order: MapGroup["state"][] = ["loads", "earlier", "named", "unused"];
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Inspect" subtitle="Every skill and every prompt file: which steps are sent it, how much of it, and when last. Open a file to change it or to leave a note on it. A file counts as sent when its own lines are found in what a step was sent, so this is what really happened, not what the code intends.">
        <Link href="/inspect/skills?fresh=1" className="text-sm text-primary hover:underline">
          Read the log again
        </Link>
      </PageHeader>
      <InspectTabs at="/inspect/skills" open={openNotes().open}/>
      <div className="space-y-10 px-6 py-8">
        <div className="grid gap-3 text-sm sm:grid-cols-4" data-testid="skill-counts">
          {order.map((s) => (<div key={s} className="rounded-lg border p-3" title={STATE[s].note}>
              <div className="text-xs text-muted-foreground">{STATE[s].label}</div>
              <div className="text-xl font-semibold tabular-nums">
                {count(skills, s)} <span className="text-xs font-normal text-muted-foreground">skill folders</span>
              </div>
              <div className="text-xs text-muted-foreground">{STATE[s].note}</div>
            </div>))}
        </div>
        {order.map((s) => {
            const list = skills.filter((g) => g.state === s);
            if (!list.length)
                return null;
            return (<section key={s}>
              <h2 className="mb-3 text-lg font-semibold">
                Skills: {STATE[s].label.toLowerCase()} ({list.length})
              </h2>
              <div className="rounded-md border">{list.map((g) => <Group key={g.name} g={g}/>)}</div>
            </section>);
        })}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Prompt files ({prompts.length})</h2>
          <div className="rounded-md border">{prompts.map((g) => <Group key={g.name} g={g}/>)}</div>
        </section>
        {map.loose.length > 0 && (<section>
            <h2 className="mb-3 text-lg font-semibold">Source material that was never made a skill ({map.loose.length})</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {map.loose.map((f) => (<li key={f}>{f}</li>))}
            </ul>
          </section>)}
        <p className="text-xs text-muted-foreground">
          Read {when(map.builtAt)} from {map.callsRead} recent calls and every system prompt in the log.
        </p>
      </div>
    </div>);
}
