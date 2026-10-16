import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { listFeedback } from "@/lib/feedback";
import { transcriptionEnabled } from "@/lib/founder-transcribe";
import { brokenCounts, failureGroups, scriptTrend } from "@/lib/failures";
import { editRepeats } from "@/lib/hand-edits";
import { brandLessons, brandLessonsFile, generalLessons } from "@/lib/lessons";
import { geminiEnabled } from "@/lib/llm/gemini";
import { listProposals, skillStates } from "@/lib/skills/proposals";
import { isAdvanced } from "@/lib/ui-mode-server";
import { LessonsView } from "./lessons-view";
export default async function LessonsPage() {
    const row = await activeBrand();
    let products: {
        id: string;
        name: string;
    }[] = [];
    try {
        products = loadBrandBrain(row.id).products.map((p) => ({ id: p.id, name: p.name }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const advanced = await isAdvanced("lessons");
    const skills = skillStates();
    const proposed: Record<string, {
        status: string;
        skill: string;
    }> = {};
    for (const p of listProposals(200))
        if (p.feedback_id && !proposed[p.feedback_id])
            proposed[p.feedback_id] = { status: p.status, skill: skills.find((s) => s.file === p.file)?.name ?? p.file.split("/")[1] };
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Lessons" subtitle={advanced ? (<>
            What feedback on finished work has taught the app about {row.name}. Every script, image plan, prompt and check is given the lessons that apply to it. Kept in <code className="text-xs">{brandLessonsFile(row.id)}</code>.
          </>) : (<>What feedback on finished work, and the app&apos;s own checks, have taught the app about {row.name}. Everything the app makes is given the lessons that apply to it.</>)}/>
      <LessonsView brandName={row.name} mine={brandLessons(row.id)} general={generalLessons()} feedback={listFeedback(row.id)} products={products} voice={transcriptionEnabled()} reads={geminiEnabled()} failing={failureGroups(row.id)} trend={scriptTrend(row.id)} broken={Object.fromEntries(brokenCounts(row.id))} edits={editRepeats(row.id)} proposed={proposed}/>
    </div>);
}
