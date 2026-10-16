import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { claimsHeld } from "@/lib/claims-through";
import { skillTitles } from "@/lib/skills/titles";
import { formatReadiness } from "@/lib/brain/readiness";
import { loadBrandBrain } from "@/lib/brands";
import { MEDIUM_INFO, formatById } from "@/lib/catalogue";
import { llmEnabled } from "@/lib/llm/gateway";
import { getConcepts } from "@/lib/queries";
import { offerChoices } from "@/lib/offers/book";
import { isAdvanced } from "@/lib/ui-mode-server";
import { MakeForm } from "./make-form";
export default async function MakePage({ params }: {
    params: Promise<{
        format: string;
    }>;
}) {
    const { format: id } = await params;
    const format = formatById(id);
    if (!format || format.start.how !== "script")
        notFound();
    const row = await activeBrand();
    const advanced = await isAdvanced("create");
    let products: {
        id: string;
        name: string;
    }[] = [];
    let personas: {
        id: string;
        name: string;
        summary: string;
    }[] = [];
    let offers: {
        id: string;
        name: string;
    }[] = [];
    let problem = "";
    const needs: Record<string, NonNullable<ReturnType<typeof formatReadiness>>["needs"]> = {};
    try {
        const brand = loadBrandBrain(row.id);
        products = brand.products.map((p) => ({ id: p.id, name: p.name }));
        personas = brand.personas.map((p) => ({ id: p.id, name: p.name, summary: p.summary }));
        offers = offerChoices(row.id, brand).map((o) => ({ id: o.id, name: o.name }));
        for (const p of brand.products) {
            const r = formatReadiness(row.id, brand, format.id, p.name);
            if (r)
                needs[p.id] = r.needs;
        }
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        problem = `${row.name} is not set up yet. Build the brand brain first.`;
    }
    const concepts = getConcepts(row.id).map((c) => ({ id: c.id, name: c.name }));
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/studio", label: "Back" }} title={format.label} subtitle={`${format.makes}. For ${row.name}.`}/>
      <div className="space-y-6 p-6">
        <div className="max-w-2xl rounded-lg border bg-muted/30 p-4 text-sm" data-testid="make-about">
          <p>
            <span className="font-medium">When to pick it.</span> {format.when}
          </p>
          {!format.tried && <p className="mt-2 text-amber-800">This format is new. Read the plan closely before you make it.</p>}
          {advanced && (<p className="mt-2 text-xs text-muted-foreground">
              {MEDIUM_INFO[format.medium].label}. Built on: {skillTitles(format.skills)}.{" "}
              <Link href="/inspect/skills" className="underline">
                See the skill files
              </Link>
            </p>)}
        </div>
        {problem ? (<p className="text-sm text-amber-800">
            {problem}{" "}
            <Link href="/brand" className="underline">
              Open the Brand brain
            </Link>
          </p>) : (<MakeForm video={format.medium === "video"} formatId={format.id} label={format.label} timed={format.medium !== "image"} lengths={format.start.lengths} products={products} personas={personas} offers={offers} concepts={concepts} live={llmEnabled()} claims={claimsHeld(row.id)} needs={needs}/>)}
      </div>
    </div>);
}
