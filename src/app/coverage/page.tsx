import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { claimsHeld } from "@/lib/claims-through";
import { coverageInput } from "@/lib/coverage/account";
import { coverage } from "@/lib/coverage/analyze";
import type { CoverageInput } from "@/lib/coverage/model";
import { familiesOfBrand } from "@/lib/formats/tally";
import { llmEnabled } from "@/lib/llm/gateway";
import { isAdvanced } from "@/lib/ui-mode-server";
import { CoverageView } from "./coverage-view";
import { FamilyCard } from "./family-card";
export default async function CoveragePage() {
    const row = await activeBrand();
    const advanced = await isAdvanced("coverage");
    let input: CoverageInput | null = null;
    let problem = "";
    try {
        input = coverageInput(row.id);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            problem = `${row.name} is not set up yet. Build the brand brain first.`;
        else
            problem = e instanceof Error ? e.message : String(e);
    }
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Coverage" subtitle={`What ${row.name}'s ads cover today, what they miss, and what is working. Then the scripts that fill the gaps, written for you.`}/>
      <div className="space-y-14 px-6 pb-6 pt-8 max-md:space-y-10">
        {!input ? (<p className="text-sm text-amber-800" data-testid="coverage-problem">
            {problem}{" "}
            <Link href="/brand" className="underline">
              Open the Brand brain
            </Link>
          </p>) : !input.personas.length ? (<p className="text-sm text-amber-800" data-testid="coverage-problem">
            {row.name} has no persona in use yet, so there is nobody to plan a script for.{" "}
            <Link href="/personas" className="underline">
              Open Personas
            </Link>
          </p>) : (<>
            <CoverageView cov={coverage(input)} input={input} advanced={advanced} live={llmEnabled()} claims={claimsHeld(row.id)}/>

            <FamilyCard {...familiesOfBrand(row.id)}/>
          </>)}
      </div>
    </div>);
}
