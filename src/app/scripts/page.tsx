import { EmptyNext } from "@/components/empty-next";
import { activeBrandId } from "@/lib/brand-context";
import { llmEnabled } from "@/lib/llm/gateway";
import { getConcepts, getJobs, getScripts } from "@/lib/queries";
import { modelLabel, isUploadedScript } from "@/lib/reference-modes";
import { scriptWords } from "@/lib/script-metrics";
import { auditSummary } from "@/lib/scripts/audit";
import { madeInto } from "@/lib/scripts/made-into";
import { speakerAges } from "@/lib/scripts/pace";
import { ScriptList } from "./script-list";
import { creativeBriefsFor } from "@/lib/creative-brief-store";
export default async function ScriptsPage({ searchParams }: {
    searchParams: Promise<{
        concept?: string;
    }>;
}) {
    const brandId = await activeBrandId();
    const sp = await searchParams;
    const made = madeInto(getJobs(brandId));
    const scripts = getScripts(brandId).map((s) => {
        const { fails, warnings } = auditSummary(s.audit);
        return {
            id: s.id,
            title: s.title,
            concept_id: s.concept_id,
            length: s.axes.native ? "native" : s.axes.length,
            status: s.status,
            made: made.get(s.id) ?? null,
            version: s.version,
            fails,
            warns: warnings,
            similar: s.similar_to,
            hook_variant_of: s.hook_variant_of,
            hooks: s.hook_variants.length,
            words: scriptWords(s.lines),
            est_seconds: s.est_seconds,
            written_by: isUploadedScript(s) ? "you (uploaded)" : s.reference_mode === "exact" ? "reference copy" : modelLabel(s.model) || "-",
        };
    });
    const briefs = creativeBriefsFor(brandId);
    const rows = getConcepts(brandId).filter((c) => briefs[c.id]?.selected_variant !== null && briefs[c.id]?.basis !== "preview");
    const ages = speakerAges(brandId, rows.map((c) => c.persona_id));
    const concepts = rows.map((c) => ({ id: c.id, name: c.name, stage: c.awareness_stage, age: ages[c.persona_id] ?? null }));
    const notice = scripts.length ? null : <EmptyNext title="No scripts yet" why="A script is 6 choices: the product, the buyer's stage, a persona, an angle, an offer and a format. Pick them in the Script builder, say how many, and they are written. You can also bring a script you already have." href="/builder" act="Open the Script builder" also={{ href: "/studio/ads", label: "Other ways to start" }}/>;
    return <ScriptList scripts={scripts} concepts={concepts} initialConcept={sp.concept ?? null} live={llmEnabled()} notice={notice}/>;
}
