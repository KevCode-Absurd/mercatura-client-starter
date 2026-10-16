import { founderWords } from "@/lib/founder-words";
import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { brandConflicts } from "@/lib/claim-conflicts";
import { libraryCounts } from "@/lib/library/import";
import { llmEnabled } from "@/lib/llm/gateway";
import { COST, listSprints } from "@/lib/sprint/engine";
import { FORMATS, GROUPS } from "@/lib/sprint/formats";
import { SPRINT_LOOKS, lookExampleId, lookOf } from "@/lib/sprint/looks";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { exampleOf } from "../../formats/examples";
import { isAdvanced } from "@/lib/ui-mode-server";
import { cn } from "@/lib/utils";
import { NeedsBrain } from "@/components/needs-brain";
import { tryBrand } from "@/lib/queries";
import { mediaUsage } from "@/lib/media/providers";
import { imageQuality } from "@/lib/media/chosen";
import { listPersonas } from "@/lib/personas/store";
import { getSetting } from "@/lib/settings";
import { NewSprint } from "./new-sprint";
import { SPRINT_STATUS } from "./shared";
import { ExampleTeaser } from "./example-teaser";
export default async function SprintsPage() {
    const row = await activeBrand();
    const brand = tryBrand(row.id);
    if (!brand)
        return <><NeedsBrain title="100-ad sprint" brandName={row.name}/><div className="m-6"><ExampleTeaser /></div></>;
    const sprints = listSprints(row.id);
    const ads = libraryCounts().ad;
    const open = brandConflicts(row.id).filter((c) => c.status === "open");
    const advanced = await isAdvanced("create");
    const kit = loadCreativeKit(row.id);
    const products = brand.products.map((p) => {
        const c = productImageChoices(row.id, kit, p.id);
        return { id: p.id, name: p.name, folder: c.folder, photo: c.hero || c.files[0] || null };
    });
    const pictures = Object.fromEntries(SPRINT_LOOKS.map((l) => [l.id, exampleOf(lookExampleId(l.id)) ?? (l.standIn ? exampleOf(l.standIn) : null)]));
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader back={{ href: "/studio", label: "Create" }} title="100-ad sprint" subtitle={`100 static ads for ${row.name} that differ on purpose: format, angle, buyer, stage, hook, product, layout and photo, in the types of ad you pick. Base images first, then review copy and optionally add editable text.`}/>
      <div className="space-y-14 px-6 pb-6 pt-8 max-md:space-y-10">
        <ExampleTeaser />
        {sprints.length > 0 && (<section>
            <h2 className="display text-3xl">Your sprints</h2>
            <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="sprints">
              {sprints.map((s) => {
                const st = SPRINT_STATUS[s.status];
                return (<li key={s.id}>
                    <Link href={`/studio/sprint/${s.id}`} className="block h-full rounded-xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm" data-testid="sprint-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[15px] font-semibold leading-snug">{s.title}</div>
                          <div className="mt-0.5 text-sm text-muted-foreground">
                            {advanced && <><span className="font-mono">{s.id}</span> · </>}{s.size} ads{s.options?.looks ? ` · ${Object.keys(s.options.looks).map((id) => lookOf(id)?.label.toLowerCase()).filter(Boolean).join(", ")}` : ""}{advanced && <> · {s.angles.length} angles</>}
                          </div>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs", st.tone)}>{st.label}</span>
                      </div>
                    </Link>
                  </li>);
            })}
            </ul>
          </section>)}

        {open.length > 0 && (<p className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900" data-testid="sprint-conflicts">
            {open.map((c) => `${c.label}: ${c.values.map((v) => v.value).join(", ")}`).join(". ")}. The site and the ads state {open.length === 1 ? "this" : "these"} differently, so the sprint will quote none of them.{" "}
            <Link href="/brand#claim-sources" className="font-medium underline">
              Say which is right
            </Link>
          </p>)}

        <section id="start-sprint" className="scroll-mt-6">
          <h2 className="display mb-5 text-3xl">Start a sprint</h2>
          <NewSprint structures={FORMATS.filter(f => f.needs === "offer" ? brand.offers.length > 0 : f.needs === "proof" ? brand.proof_assets.length > 0 : f.needs === "founder" ? !!founderWords(row.id) : true).map(f => ({ id: f.id, label: f.label }))} products={products} personas={listPersonas(row.id).filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name, products: p.product_ids, image: p.image }))} pictures={pictures} live={llmEnabled()} cost={{ plan: COST.plan, brief: COST.brief, image: COST.image }} claims={getSetting(row.id, "checks").claims} imagesLeft={Math.max(0, mediaUsage().imageCap - mediaUsage().images)} quality={imageQuality()}/>
        </section>

        {advanced && (<section className="grid gap-6 text-sm lg:grid-cols-2" data-testid="sprint-how">
            <div>
              <h2 className="font-medium">How the 100 are split</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Visual formats receive equal shares, with at least one image per enabled format. The ad structures below describe what each image communicates.</p>
              <table className="mt-2 w-full text-xs">
                <tbody>
                  {GROUPS.map((g) => (<tr key={g.id} className="border-t align-top">
                      <td className="w-14 py-1.5 tabular-nums">{FORMATS.filter(f => f.group === g.id).length} types</td>
                      <td className="w-44 py-1.5 font-medium">{g.label}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {FORMATS.filter((f) => f.group === g.id)
                    .map((f) => f.label)
                    .join(", ")}
                        . {g.why}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>9 or 10 angles from the personas, the research, competitor gaps and the brand&apos;s own winning ads. No angle carries more than 6 ads.</li>
              <li>A classic static is built on its own layout from the library of {ads ? ads.usable.toLocaleString("en-US") : 0} analysed static ads. No layout is used twice. An ad of another type is drawn from its idea, with no layout.</li>
              <li>No children are shown. A founder ad shows the founder only from a photo uploaded on the Brand screen; without one it is a signed note.</li>
              <li>Every brief is written with the brand&apos;s style card, then goes through the copy pass and the voice check (and the claims read, when claim checks are on). Every image gets 2 looks and 1 retry.</li>
            </ul>
          </section>)}
      </div>
    </div>);
}
