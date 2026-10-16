import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { activeBrand } from "@/lib/brand-context";
import { learningModule } from "@/lib/learning/catalog";
import { guideHeadings, guideMinutes, headingId } from "@/lib/learning/presentation";
import { completedLessons } from "@/lib/learning/store";
import { LessonComplete } from "../../lesson-complete";
export default async function LessonPage({ params }: {
    params: Promise<{
        category: string;
        lessonId: string;
    }>;
}) {
    const { category, lessonId } = await params;
    const module = learningModule(category);
    const lesson = module?.lessons.find((l) => l.id === lessonId);
    if (!module || !lesson)
        notFound();
    const brand = await activeBrand();
    const related = module.lessons.filter((l) => l.topic === lesson.topic && l.id !== lesson.id).slice(0, 3);
    const headings = guideHeadings(lesson.body);
    return <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
    <Link href={`/learning/${module.id}`} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4"/> {module.title}</Link>
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
      <article className="min-w-0 max-w-3xl" data-testid="strategy-reader">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">{lesson.topic} · {guideMinutes(lesson)} min read</p><h1 className="font-serif text-4xl leading-tight md:text-5xl">{lesson.title}</h1><p className="mt-5 text-lg leading-relaxed text-muted-foreground">{lesson.summary}</p>
        <section className="my-8 rounded-xl border bg-accent/30 p-6"><h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-primary"/> When this strategy makes sense</h2><p className="text-sm leading-relaxed">{lesson.whenToUse}</p></section>
        {!!headings.length && <details className="mb-8 rounded-xl border p-4 lg:hidden"><summary className="cursor-pointer text-sm font-semibold">In this guide</summary><ol className="mt-3 space-y-2 text-sm text-muted-foreground">{headings.map((h, i) => <li key={i}><a href={`#${h.id}`} className="hover:text-primary">{h.title}</a></li>)}</ol></details>}
        <div className="space-y-5 text-base leading-8 [overflow-wrap:anywhere]" data-testid="guide-body"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            h1: ({ children }) => <h2 className="mb-4 mt-10 font-serif text-3xl leading-tight">{children}</h2>,
            h2: ({ children, node }) => <h2 id={headingId((node?.children ?? []).map((c) => "value" in c ? c.value : "children" in c ? c.children.map((v) => "value" in v ? v.value : "").join("") : "").join(""))} className="scroll-mt-24 mb-4 mt-12 border-t pt-8 font-serif text-3xl leading-tight">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-3 mt-8 text-xl font-semibold leading-snug">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc space-y-2 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal space-y-2 pl-6">{children}</ol>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary bg-accent/20 px-5 py-3">{children}</blockquote>,
            table: ({ children }) => <div className="my-6 overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm leading-relaxed">{children}</table></div>,
            th: ({ children }) => <th className="border-b bg-accent/40 p-3 font-semibold">{children}</th>,
            td: ({ children }) => <td className="border-b p-3 align-top">{children}</td>,
            pre: ({ children }) => <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-sm leading-relaxed">{children}</pre>,
            a: ({ children }) => <span>{children}</span>,
        }}>{lesson.body}</ReactMarkdown></div>
        <section id="implementation" className="mt-12 scroll-mt-24 rounded-2xl border bg-card p-6 md:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Your implementation checklist</p><h2 className="mt-3 font-serif text-3xl">Put the method to work</h2><ol className="mt-6 space-y-4">{lesson.steps.map((step, i) => <li key={i} className="flex items-start gap-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{i + 1}</span><p className="text-sm leading-relaxed">{step}</p></li>)}</ol></section>
        <section className="mt-8 space-y-5"><div><h2 className="font-semibold">Worked application</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">{lesson.example}</p></div><div><h2 className="font-semibold">Measure and decide</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.successMetric}</p></div><div className="border-l-2 border-primary pl-5"><h2 className="font-semibold">Where this can fail</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.pitfall}</p></div></section>
        <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t pt-6"><LessonComplete key={`${brand.id}:${lesson.id}`} brandId={brand.id} category={module.id} lessonId={lesson.id} initialCompleted={completedLessons(brand.id).includes(lesson.id)}/><Link href={`/learning/${module.id}#brand-plan`} className="text-sm text-primary hover:underline">Apply to {brand.name} →</Link></div>
        {!!related.length && <nav aria-label="Related strategies" className="mt-10 border-t pt-6"><h2 className="mb-4 font-semibold">Continue with {lesson.topic.toLowerCase()}</h2><div className="space-y-3">{related.map((l) => <Link key={l.id} href={`/learning/${module.id}/${l.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-4 text-sm hover:border-primary">{l.title}<ArrowRight className="size-4 shrink-0 text-primary"/></Link>)}</div></nav>}
      </article>
      <aside className="sticky top-24 hidden max-h-[75vh] overflow-y-auto lg:block"><p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">In this guide</p><nav aria-label="Guide contents" className="space-y-3 border-l pl-4">{headings.map((h, i) => <a key={i} href={`#${h.id}`} className="block text-sm leading-relaxed text-muted-foreground hover:text-primary">{h.title}</a>)}<a href="#implementation" className="block text-sm font-medium text-primary">Implementation checklist</a></nav><Link href={`/learning/${module.id}#brand-plan`} className="mt-8 block rounded-xl border bg-accent/30 p-4 text-sm font-medium text-primary">Tailor for your brand <ArrowRight className="mt-2 size-4"/></Link></aside>
    </div>
  </div>;
}
