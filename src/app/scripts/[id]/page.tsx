import { eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { CreatorProcess } from "@/components/creator-process";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { editRepeats } from "@/lib/hand-edits";
import { llmEnabled } from "@/lib/llm/gateway";
import { offerBook } from "@/lib/offers/book";
import { scriptOfferView } from "@/lib/offers/script-offer";
import { bankForScript } from "@/lib/hooks/for-script";
import { getPersona } from "@/lib/personas/store";
import { getBrand, getConcepts, getInsights, getScript, getThemes } from "@/lib/queries";
import { auditSummary } from "@/lib/scripts/audit";
import { speakerAge } from "@/lib/scripts/pace";
import { AWARENESS_INFO } from "@/lib/taxonomy";
import { isAdvanced } from "@/lib/ui-mode-server";
import { ApproveLanding } from "@/components/approve-landing";
import { EditRepeats } from "../../lessons/edit-repeats";
import { KitPanel } from "./kit-panel";
import { OfferPanel } from "./offer-panel";
import { HookBank } from "./hook-bank";
import { HookVersions } from "./hook-versions";
import { ScriptStudio } from "./script-studio";
export default async function ScriptStudioPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const brandId = await activeBrandId();
    const { id } = await params;
    const script = getScript(id);
    if (!script || script.brand_id !== brandId)
        notFound();
    const brand = getBrand(brandId);
    const bank = bankForScript(script);
    const concept = getConcepts(brandId).find((c) => c.id === script.concept_id) ?? null;
    const themes = getThemes(brandId);
    const insights = getInsights(brandId);
    const evidence = Object.fromEntries(themes.map((t) => [
        t.id,
        {
            id: t.id,
            label: t.label,
            type: t.type,
            score: t.score,
            quotes: insights
                .filter((i) => i.theme_id === t.id)
                .sort((a, b) => b.intensity - a.intensity)
                .slice(0, 3)
                .map((i) => ({ id: i.id, quote: i.quote, source_item_id: i.source_item_id, source_type: i.source_type })),
        },
    ]));
    const claims = Object.fromEntries(brand.claims.map((c) => [c.id, c]));
    const conceptThemes = concept ? concept.theme_ids.map((id) => evidence[id]).filter(Boolean) : [];
    const otherId = script.hook_variant_of ?? script.similar_to?.script_id;
    const other = otherId ? getScript(otherId) : undefined;
    const references = script.reference_ids.length
        ? db
            .select({ id: schema.adReferences.id, title: schema.adReferences.title, kind: schema.adReferences.kind, thumb: schema.adReferences.thumb_path })
            .from(schema.adReferences)
            .where(inArray(schema.adReferences.id, script.reference_ids))
            .all()
            .map((r) => ({ id: r.id, title: r.title, kind: r.kind, hasThumb: !!r.thumb }))
        : [];
    const root = script.alt_of ?? script.id;
    const alternatives = db
        .select({ id: schema.scripts.id, title: schema.scripts.title, model: schema.scripts.model, audit: schema.scripts.audit, brand_id: schema.scripts.brand_id, axes: schema.scripts.axes })
        .from(schema.scripts)
        .where(or(eq(schema.scripts.id, root), eq(schema.scripts.alt_of, root)))
        .all()
        .filter((s) => s.id !== script.id && s.brand_id === brandId)
        .map((s) => ({ id: s.id, title: s.title, model: s.model, voice: `${s.axes.person === "first" ? "1st" : s.axes.person === "second" ? "2nd" : "3rd"} ${s.axes.tense}`, ...auditSummary(s.audit) }));
    const offerView = concept
        ? scriptOfferView(offerBook(brandId), concept, { noOffer: !!script.axes.no_offer, personaName: brand.personas.find((p) => p.id === concept.persona_id)?.name, personaOfferId: getPersona(brandId, concept.persona_id)?.offer_id ?? null, firstOfferId: brand.offers[0]?.id ?? null })
        : null;
    const repeats = editRepeats(brandId).filter((r) => r.scripts.includes(script.id));
    const advanced = await isAdvanced("scripts");
    return (<div className={advanced ? "mx-auto max-w-[100rem]" : "mx-auto max-w-5xl"}>
      <EditRepeats repeats={repeats} scriptId={script.id} max={2}/>
      <div className="space-y-3 px-6 pt-4"><CreatorProcess current="Script" scriptId={script.id}/><div className="flex flex-wrap gap-4 text-sm"><Link className="inline-flex min-h-11 items-center text-primary" href={`/studio/creator?script=${encodeURIComponent(script.id)}`} data-testid="script-to-creator">Choose an avatar and create this video</Link><Link className="inline-flex min-h-11 items-center text-primary" href={`/landing/studio?ad=${encodeURIComponent(`script:${script.id}`)}`} data-testid="script-to-landing">Create a landing page from this argument</Link></div></div>

      <p className="px-6 pt-8 pb-2 text-sm text-muted-foreground" data-testid="script-top-title">
        Script: <span className="display mt-1 block text-4xl text-balance text-foreground max-md:text-3xl">{script.title}</span>
      </p>

      {offerView && <OfferPanel key={`offer:${script.id}`} scriptId={script.id} view={offerView} live={llmEnabled()} fixed={script.reference_mode === "exact"}/>}

      {script.kit && <KitPanel key={`kit-text:${script.id}`} scriptId={script.id} kit={script.kit} part="text"/>}

      <HookVersions key={`hooks:${script.id}:${script.version}`} scriptId={script.id} lines={script.lines} hooks={script.hook_variants} live={llmEnabled()} variety={script.axes.variety} taste={script.axes.taste} texts={script.kit?.hook_texts}/>

      <HookBank {...bank} gifting={bank.occasions.includes("gifting")} stage={AWARENESS_INFO[bank.stage].label.toLowerCase()}/>
    <ScriptStudio key={`${script.id}:${script.version}`} script={script} concept={concept ? { id: concept.id, name: concept.name, awareness_stage: concept.awareness_stage } : null} evidence={evidence} claims={claims} conceptThemes={conceptThemes} speakerAge={concept ? speakerAge(brandId, concept.persona_id) : null} other={other && other.brand_id === brandId ? { id: other.id, title: other.title, lines: other.lines } : null} references={references} alternatives={alternatives} live={llmEnabled()}/>
      {script.kit && <KitPanel key={`kit-prompts:${script.id}`} scriptId={script.id} kit={script.kit} part="prompts"/>}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule px-6 pt-6 pb-8 text-sm text-muted-foreground" data-testid="script-landing">
        <ApproveLanding adId={`script:${script.id}`}/>
        A landing page that continues this script: its hook, its buyer, its offer.
      </div>
    </div>);
}
