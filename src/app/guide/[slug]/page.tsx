import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { chapter, chapters } from "@/lib/guide";
import { GuideMarkdown } from "../markdown";
export default async function ChapterPage({ params }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    const c = chapter(slug);
    if (!c)
        notFound();
    const all = chapters();
    const at = all.findIndex((x) => x.slug === slug);
    const prev = all[at - 1];
    const next = all[at + 1];
    const sections = c.body.split(/\r?\n/).filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());
    const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/guide", label: "All chapters" }} title={c.title} subtitle={c.group === "Using the app" ? `Guide, chapter ${at + 1} of ${all.filter((x) => x.group === c.group).length}` : "Guide: how the app works"}/>
      <div className="flex gap-12 px-6 py-8">
        <article className="min-w-0 max-w-3xl flex-1">
          <GuideMarkdown body={c.body}/>
          <nav className="mt-10 flex justify-between gap-3 border-t pt-4 text-sm">
            {prev ? (<Link href={`/guide/${prev.slug}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                <ArrowLeft className="size-4"/> {prev.title}
              </Link>) : (<span />)}
            {next && (<Link href={`/guide/${next.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline" data-testid="guide-next">
                {next.title} <ArrowRight className="size-4"/>
              </Link>)}
          </nav>
        </article>
        {sections.length > 2 && (<aside className="sticky top-[calc(var(--top,0px)+1.5rem)] hidden h-fit w-56 shrink-0 text-sm xl:block">
            <div className="text-xs font-medium text-muted-foreground">On this page</div>
            <ul className="mt-2 space-y-1.5 border-l pl-3">
              {sections.map((s) => (<li key={s}>
                  <a href={`#${anchor(s)}`} className="text-muted-foreground hover:text-foreground">
                    {s}
                  </a>
                </li>))}
            </ul>
          </aside>)}
      </div>
    </div>);
}
