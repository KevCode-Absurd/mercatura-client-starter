import Link from "next/link";
import { ArrowRight, BookOpen, PenLine } from "lucide-react";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { categoryOfLesson, growthModule, learningModules } from "@/lib/learning/catalog";
import { guideSummary } from "@/lib/learning/presentation";
import { completedLessons, readPlan } from "@/lib/learning/store";
import { learningContext, summaryOf, tailoringAvailable } from "@/lib/learning/tailor";
import { ALL_CATEGORIES } from "@/lib/learning/types";
import { LearningCatalog } from "./learning-catalog";
import { TailorPanel } from "./tailor-panel";
export default async function LearningPage() {
    const brand = await activeBrand();
    const completed = completedLessons(brand.id);
    const count = learningModules.reduce((n, m) => n + m.lessons.length, 0);
    const growth = growthModule();
    let context;
    try {
        context = learningContext(brand.id);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const saved = readPlan(brand.id, ALL_CATEGORIES);
    const plan = saved?.strategies.every((s) => categoryOfLesson(s.lessonId)) ? saved : null;
    return <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
    <p className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary"><BookOpen className="size-4"/> Learning</p>
    <h1 className="font-serif text-5xl leading-[1.08] md:text-6xl">Go deeper. <span className="text-primary">Build a better strategy.</span></h1>
    <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Understand the mechanics behind ecommerce growth. Explore detailed methods, worked examples, decision rules, and the tradeoffs that make a strategy work.</p>
    <div className="mt-8">
      <TailorPanel key={`${brand.id}:all:${context?.hash}:${plan?.createdAt}`} moduleId={ALL_CATEGORIES} brandId={brand.id} brandName={brand.name} ready={Boolean(context)} live={tailoringAvailable()} initialPlan={plan} currentContextHash={context?.hash ?? ""} contextSummary={context ? summaryOf(context) : ""} lessonTitles={Object.fromEntries(growth.lessons.map((l) => [l.id, l.title]))} lessonCategory={Object.fromEntries(growth.lessons.map((l) => [l.id, categoryOfLesson(l.id)!]))} heading={`What would grow ${brand.name} most?`} lead="1 press gives you the 10 strategies that fit this brand best, chosen across all 8 categories. Each comes with what to make first and how to judge it. Open a category below for the top 10 of that area alone."/>
    </div>

    <Link href="/learning/models" className="group mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent/20" data-testid="learning-models">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><PenLine className="size-5"/></span>
      <span className="min-w-0 flex-1 basis-80"><span className="block text-xs font-semibold uppercase tracking-widest text-primary">Model guide</span><span className="mt-1 block text-lg font-semibold">Which model should write your copy?</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">6 models wrote the same brief and 2 judges scored it blind. See what each one wrote, how it scored and what it cost, then choose the model for each step.</span></span>
      <span className="flex items-center gap-2 text-sm font-medium text-primary">Open the guide <ArrowRight className="size-4 transition-transform group-hover:translate-x-1"/></span>
    </Link>
    <div className="my-8 flex flex-wrap gap-x-7 gap-y-2 border-y py-4 text-sm text-muted-foreground"><span><b className="text-foreground">8</b> categories</span><span><b className="text-foreground">{count}</b> strategy guides</span><span>Progress saved for <b className="text-foreground">{brand.name}</b></span></div>
    <LearningCatalog modules={learningModules.map(({ id, title, description, lessons }) => ({ id, title, description, lessons: lessons.map(guideSummary) }))} completed={completed}/>
  </div>;
}
