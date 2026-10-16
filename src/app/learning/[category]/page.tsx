import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { learningModule } from "@/lib/learning/catalog";
import { guideSummary } from "@/lib/learning/presentation";
import { completedLessons, readPlan } from "@/lib/learning/store";
import { learningContext, summaryOf, tailoringAvailable } from "@/lib/learning/tailor";
import { TailorPanel } from "../tailor-panel";
import { GuideLibrary } from "../guide-library";
export default async function LearningCategory({ params }: {
    params: Promise<{
        category: string;
    }>;
}) {
    const module = learningModule((await params).category);
    if (!module)
        notFound();
    const brand = await activeBrand();
    const completed = completedLessons(brand.id);
    let context;
    try {
        context = learningContext(brand.id);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const saved = readPlan(brand.id, module.id);
    const plan = saved?.strategies.every((s) => module.lessons.some((l) => l.id === s.lessonId)) ? saved : null;
    return <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
    <Link href="/learning" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4"/> All learning</Link>
    <div className="mb-8"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Learning / {module.title}</p><h1 className="font-serif text-5xl">{module.title}</h1><p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{module.description}</p></div>
    <TailorPanel key={`${brand.id}:${module.id}:${context?.hash}:${plan?.createdAt}`} moduleId={module.id} brandId={brand.id} brandName={brand.name} ready={Boolean(context)} live={tailoringAvailable()} initialPlan={plan} currentContextHash={context?.hash ?? ""} contextSummary={context ? summaryOf(context) : ""} lessonTitles={Object.fromEntries(module.lessons.map((l) => [l.id, l.title]))}/>
    <GuideLibrary category={module.id} lessons={module.lessons.map(guideSummary)} completed={completed}/>
  </div>;
}
