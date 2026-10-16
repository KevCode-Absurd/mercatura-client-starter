"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ShowMore, useShowMore } from "@/components/show-more";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Copy, Trash2, Info, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AwarenessPill, PageHeader, StatusPill, TypePill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConceptRow } from "@/db/schema";
import type { Persona } from "@/lib/brand-brain";
import type { ConceptProposal } from "@/lib/concept-suggest";
import type { CreativeBrief, BriefEditChoices } from "@/lib/creative-brief";
import { ViewConceptAssets } from "./view-assets";
import { GuidedConceptCard } from "./guided-concept-card";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { DESIRE_EVIDENCE_TYPES, DESIRE_RULE_TOOLTIP, differentiatorWarnings, isDemographicOnly, type ConceptInput, } from "@/lib/concepts";
import { adsetName } from "@/lib/naming";
import { AWARENESS_INFO, AWARENESS_STAGES, OUTPUT_INFO, OUTPUT_TYPES, SOPHISTICATION_LABELS, type AwarenessStage, type InsightType, } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { MakeAssetsButton } from "../production/make-assets";
import { GenerateDialog, LiveGate, ScriptProgress } from "../scripts/generation";
import { deleteConceptAction, saveConceptAction, suggestConceptsAction } from "./actions";
import { ExplorationPanel } from "./exploration-panel";
import type { CreativeDirection, ExplorationMix } from "@/lib/creative/exploration";
type ThemeLite = {
    id: string;
    label: string;
    type: InsightType;
    score: number;
    rank: number;
};
type Variable = "persona" | "angle" | "offer";
const goneName = (id: string) => (id ? `${id.replace(/^per_/, "").replace(/_/g, " ")}, a persona that was removed` : "No persona");
type BuilderState = {
    input: ConceptInput;
    variant: Variable | null;
    proposal?: ConceptProposal;
} | null;
const SUGGEST_MOCK_NOTE = "Mock mode: suggestions call Claude. Set LLM_MODE=live in .env and restart to use it.";
const SUGGEST_MOCK_NOTE_NORMAL = "Not switched on for this account.";
const blank = (themeId?: string): ConceptInput => ({
    id: null,
    parent_concept_id: null,
    name: "",
    persona_id: "",
    angle: "",
    offer_id: "",
    awareness_stage: "problem_aware",
    sophistication_stage: 4,
    theme_ids: themeId ? [themeId] : [],
    desire_evidence_theme_ids: [],
    differentiator_test: { claim: "", is_proposition: false, unavailable_to_competitors: false, moves_a_stranger: false },
    formats_planned: [],
    status: "draft",
});
const fromProposal = (p: ConceptProposal): ConceptInput => ({
    ...blank(),
    name: p.name,
    persona_id: p.persona_id,
    angle: p.angle,
    offer_id: p.offer_id,
    awareness_stage: p.awareness_stage,
    sophistication_stage: p.sophistication_stage,
    theme_ids: p.theme_ids.filter((t) => !p.desire_evidence_theme_ids.includes(t)),
    desire_evidence_theme_ids: p.desire_evidence_theme_ids,
    differentiator_test: p.differentiator_test,
});
const fromRow = (c: ConceptRow): ConceptInput => ({
    id: c.id,
    parent_concept_id: c.parent_concept_id,
    name: c.name,
    persona_id: c.persona_id,
    angle: c.angle,
    offer_id: c.offer_id,
    awareness_stage: c.awareness_stage,
    sophistication_stage: c.sophistication_stage,
    theme_ids: c.theme_ids.filter((t) => !c.desire_evidence_theme_ids.includes(t)),
    desire_evidence_theme_ids: c.desire_evidence_theme_ids,
    differentiator_test: c.differentiator_test,
    formats_planned: c.formats_planned,
    status: c.status,
});
export function ConceptsView({ brandId, briefs = {}, briefId, editChoices, assetCounts = {}, concepts, themes, personas, offers, scriptCounts, speakerAges = {}, brandCode, adsetTemplate, openNewWithTheme, live, notice, directions = [], }: {
    brandId: string;
    briefs?: Record<string, CreativeBrief>;
    briefId?: string;
    editChoices: BriefEditChoices;
    assetCounts?: Record<string, number>;
    notice?: React.ReactNode;
    concepts: ConceptRow[];
    themes: ThemeLite[];
    personas: Persona[];
    offers: {
        id: string;
        name: string;
    }[];
    scriptCounts: Record<string, number>;
    speakerAges?: Record<string, string | null>;
    brandCode: string;
    adsetTemplate: string;
    openNewWithTheme: string | null;
    live: boolean;
    directions?: CreativeDirection[];
}) {
    const router = useRouter();
    const pathname = usePathname();
    const advanced = useAdvanced();
    const [builder, setBuilder] = useState<BuilderState>(null);
    const [proposals, setProposals] = useState<ConceptProposal[]>([]);
    const [suggestError, setSuggestError] = useState<string | null>(null);
    const [taste, setTaste] = useState<Taste>({});
    const [suggesting, startSuggest] = useTransition();
    const [writeFor, setWriteFor] = useState<string | null>(null);
    const visibleConcepts = concepts.filter((c) => !(briefs[c.id]?.selected_variant != null && concepts.some((parent) => parent.id === c.parent_concept_id && briefs[parent.id]?.selected_variant === null)))
        .sort((a, b) => Number(!!briefId && briefs[b.id]?.plan_id === briefId) - Number(!!briefId && briefs[a.id]?.plan_id === briefId));
    const { shown: shownConcepts, hidden: hiddenConcepts, more: moreConcepts } = useShowMore(visibleConcepts, 12);
    const themeById = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);
    const personaById = new Map(personas.map((p) => [p.id, p]));
    const offerById = new Map(offers.map((o) => [o.id, o]));
    useEffect(() => {
        if (openNewWithTheme !== null) {
            setBuilder({ input: blank(openNewWithTheme || undefined), variant: null });
            router.replace(pathname, { scroll: false });
        }
    }, [openNewWithTheme, pathname, router]);
    const suggest = (mix?: ExplorationMix) => startSuggest(async () => {
        setSuggestError(null);
        const res = await suggestConceptsAction(taste, mix);
        if (!res.ok) {
            setSuggestError(res.error);
            return;
        }
        setProposals(res.proposals);
        const requested = mix ? Object.values(mix).reduce((n, value) => n + (value ?? 0), 0) : 5;
        if (res.proposals.length && res.proposals.length < requested)
            setSuggestError(`${res.proposals.length} of ${requested} requested concepts passed the source and selection checks. Review these; missing directions were not replaced automatically.`);
        if (res.proposals.length)
            toast.success(`${res.proposals.length} concept suggestions to review`);
        else
            setSuggestError("No suggestion passed the checks (known persona, known offer, evidence of desire). Try again.");
    });
    const discard = (p: ConceptProposal) => setProposals((ps) => ps.filter((x) => x !== p));
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Concepts" subtitle="Plan an ad around a customer, a message and an offer.">
        <Button size="sm" variant="outline" asChild><Link href="/studio/brief">Plan my next ads</Link></Button>
        <LiveGate live={live} note={advanced ? SUGGEST_MOCK_NOTE : SUGGEST_MOCK_NOTE_NORMAL}>
          <Button size="sm" variant="outline" onClick={() => suggest()} disabled={!live || suggesting} data-testid="suggest-concepts">
            {suggesting ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
            {suggesting ? "Thinking, about a minute..." : "Suggest concepts"}
          </Button>
        </LiveGate>
        <Button size="sm" onClick={() => setBuilder({ input: blank(), variant: null })}>
          <Plus className="size-4"/>
          New concept
        </Button>
      </PageHeader>
      {notice}

      {directions.length > 0 && <ExplorationPanel directions={directions} live={live} pending={suggesting} onGenerate={suggest}/>}

      <div className="mx-6 mt-8 max-w-3xl rounded-xl border border-rule bg-card px-5 py-4" data-testid="suggest-taste-row">
        <p className="mb-2 text-xs text-muted-foreground">For “Suggest concepts”:</p>
        <TasteBar id="suggest-taste" surface="script" hide={["sell", "length", "spread"]} value={taste} onChange={setTaste}/>
      </div>

      <ScriptProgress live={live} className="px-6 pt-4"/>

      {suggestError && (<p className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="suggest-error">
          {suggestError}
        </p>)}

      {proposals.length > 0 && (<section className="border-b bg-muted/30 p-6" data-testid="concept-proposals">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Suggested concepts ({proposals.length})</h2>
            <p className="text-xs text-muted-foreground">Nothing here is saved. Accept one to edit it in the builder, or discard it.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {proposals.map((p, n) => {
                const warnings = differentiatorWarnings(p.differentiator_test);
                return (<Card key={n} data-testid="concept-proposal" className="gap-3 border-dashed">
                  {p.direction_id && <p className="px-6 text-xs text-muted-foreground">{directions.find((d) => d.id === p.direction_id)?.label ?? p.direction_id}</p>}
                  <CardHeader>
                    <CardTitle className="text-sm leading-snug">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1">
                      <dt className="text-muted-foreground">Persona</dt>
                      <dd>{personaById.get(p.persona_id)?.name ?? goneName(p.persona_id)}</dd>
                      <dt className="text-muted-foreground">Angle</dt>
                      <dd>{p.angle}</dd>
                      <dt className="text-muted-foreground">Offer</dt>
                      <dd>{offerById.get(p.offer_id)?.name ?? p.offer_id}</dd>
                      {advanced && (<>
                      <dt className="text-muted-foreground">Stage</dt>
                      <dd className="flex flex-wrap items-center gap-1.5">
                        <AwarenessPill stage={p.awareness_stage}/>
                        <Badge variant="outline" className="font-normal">
                          Sophistication {SOPHISTICATION_LABELS[p.sophistication_stage]}
                        </Badge>
                      </dd>
                      </>)}
                    </dl>
                    {advanced && (<div>
                      <div className="mb-1 text-xs text-muted-foreground">Rests on these themes</div>
                      <div className="flex flex-wrap gap-1">
                        {p.theme_ids.map((id) => (<Link key={id} href={`/insights?theme=${id}`}>
                            <Badge variant={p.desire_evidence_theme_ids.includes(id) ? "default" : "secondary"} className="font-normal" title={p.desire_evidence_theme_ids.includes(id) ? "Evidence of desire" : undefined}>
                              {themeById.get(id)?.label ?? id}
                            </Badge>
                          </Link>))}
                      </div>
                    </div>)}
                    <div>
                      <div className="text-xs text-muted-foreground">Why this concept</div>
                      <p>{p.rationale}</p>
                    </div>
                    {advanced && (<div className="rounded-md bg-muted px-2 py-1.5 text-xs">
                      <div className="text-muted-foreground">Differentiator test</div>
                      <p className="font-medium">{p.differentiator_test.claim || "No main claim given"}</p>
                      <ul className="mt-1 space-y-0.5">
                        {([
                            ["is_proposition", "A proposition (a specific benefit)"],
                            ["unavailable_to_competitors", "Competitors can't make it"],
                            ["moves_a_stranger", "Would move a stranger"],
                        ] as const).map(([k, label]) => (<li key={k} className={p.differentiator_test[k] ? "text-emerald-700" : "text-amber-700"}>
                            {p.differentiator_test[k] ? "Yes" : "No"}: {label}
                          </li>))}
                      </ul>
                      {warnings.length > 0 && <p className="mt-1 text-amber-700">{warnings.join(" ")}</p>}
                    </div>)}
                    {p.new_persona_note && (<div className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900" data-testid="persona-idea">
                        <div className="font-medium">Persona idea for review</div>
                        <p>{p.new_persona_note}</p>
                        <p className="mt-1 text-sky-800">Not created. Add it to the brand brain yourself if it holds up.</p>
                      </div>)}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setBuilder({ input: fromProposal(p), variant: null, proposal: p })} data-testid="proposal-accept">
                        Accept and edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => discard(p)} data-testid="proposal-discard">
                        Discard
                      </Button>
                    </div>
                  </CardContent>
                </Card>);
            })}
          </div>
        </section>)}

      <div className="grid gap-5 px-6 pt-8 md:grid-cols-2 xl:grid-cols-3">
        {shownConcepts.map((c) => {
            const brief = briefs[c.id];
            if (brief?.selected_variant === null)
                return <div key={c.id} className="md:col-span-2 xl:col-span-3"><GuidedConceptCard concept={c} brief={brief} brandId={brandId} buyer={personaById.get(c.persona_id)?.name ?? goneName(c.persona_id)} themes={themes} concepts={concepts} briefs={briefs} scriptCounts={scriptCounts} assetCounts={assetCounts} editChoices={editChoices} live={live}/></div>;
            const warnings = differentiatorWarnings(c.differentiator_test);
            const persona = personaById.get(c.persona_id);
            return (<Card key={c.id} id={c.id} data-testid="concept-card" className="gap-4 rounded-xl border-rule">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-serif text-xl font-normal leading-tight tracking-normal text-balance">{c.name}</CardTitle>
                  <StatusPill status={c.status}/>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 text-sm">
                <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-2 [&_dd]:line-clamp-4">
                  <dt className="text-muted-foreground">Persona</dt>
                  <dd title={persona ? undefined : c.persona_id}>{persona?.name ?? goneName(c.persona_id)}</dd>
                  <dt className="text-muted-foreground">Angle</dt>
                  <dd>{c.angle}</dd>
                  <dt className="text-muted-foreground">Offer</dt>
                  <dd>{offerById.get(c.offer_id)?.name ?? c.offer_id}</dd>
                  {advanced && (<>
                  <dt className="text-muted-foreground">Stage</dt>
                  <dd className="flex flex-wrap items-center gap-1.5">
                    <AwarenessPill stage={c.awareness_stage}/>
                    <Badge variant="outline" className="font-normal">
                      Sophistication {SOPHISTICATION_LABELS[c.sophistication_stage]}
                    </Badge>
                  </dd>
                  </>)}
                  <dt className="text-muted-foreground">{advanced ? "Evidence" : "Scripts"}</dt>
                  <dd>
                    {advanced && <>{c.theme_ids.length} themes ·{" "}</>}
                    <Link href={`/scripts?concept=${c.id}`} className="text-primary hover:underline">
                      {scriptCounts[c.id] ?? 0} scripts
                    </Link>
                  </dd>
                </dl>
                {advanced && (<>
                <div className="flex flex-wrap gap-1">
                  {c.theme_ids.slice(0, 6).map((id) => (<Link key={id} href={`/insights?theme=${id}`}>
                      <Badge variant="secondary" className="font-normal hover:bg-secondary/70">
                        {themeById.get(id)?.label ?? id}
                      </Badge>
                    </Link>))}
                  {c.theme_ids.length > 6 && <Badge variant="outline">+{c.theme_ids.length - 6}</Badge>}
                </div>
                {warnings.length > 0 && (<div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <AlertTriangle className="size-4 shrink-0"/>
                    <div>
                      Differentiator test: {warnings.join(" ")}
                    </div>
                  </div>)}
                <div className="rounded-md bg-muted px-2 py-1.5">
                  <div className="text-xs text-muted-foreground">Meta ad set</div>
                  <code className="text-xs break-all" data-testid="adset-name">
                    {c.meta_adset_name}
                  </code>
                </div>
                </>)}
                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-rule pt-4 [&_[data-variant=ghost]]:px-2">
                  <LiveGate live={live}>
                    <Button size="sm" variant="outline" onClick={() => setWriteFor(c.id)} disabled={!live} data-testid="write-scripts">
                      <Sparkles className="size-3.5"/>
                      Write scripts
                    </Button>
                  </LiveGate>
                  <MakeAssetsButton conceptId={c.id} variant="ghost" testid="concept-make-assets"/>
                  <ViewConceptAssets conceptId={c.id} count={assetCounts[c.id] ?? 0}/>
                  <Button size="sm" variant="ghost" onClick={() => setBuilder({ input: fromRow(c), variant: null })}>
                    <Pencil className="size-3.5"/>
                    Edit
                  </Button>
                  {advanced && (<Button size="sm" variant="outline" onClick={() => setBuilder({
                        input: { ...fromRow(c), id: null, parent_concept_id: c.id, name: `${c.name} (variant)`, status: "draft" },
                        variant: "angle",
                    })}>
                    <Copy className="size-3.5"/>
                    Change 1 variable
                  </Button>)}
                  <Button size="icon-sm" variant="ghost" className="ml-auto text-muted-foreground hover:bg-red-50 hover:text-red-700 max-md:size-10" title={scriptCounts[c.id] ? "Delete its scripts first" : "Delete this concept"} onClick={async () => {
                    if (!confirm(`Delete the concept "${c.name}"? This can't be undone.`))
                        return;
                    const res = await deleteConceptAction(c.id);
                    if (!res.ok)
                        return void toast.error(res.error);
                    toast.success("Concept deleted.");
                    router.refresh();
                }} data-testid="delete-concept">
                    <Trash2 className="size-4"/>
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>);
        })}
      </div>
      <div className="px-6"><ShowMore hidden={hiddenConcepts} page={12} onMore={moreConcepts} testId="concepts-more"/></div>

      {builder && (<ConceptBuilder key={`${builder.input.id ?? "new"}-${builder.variant}-${builder.proposal?.name ?? ""}`} initial={builder.input} variant={builder.variant} themes={themes} personas={personas} offers={offers} brandCode={brandCode} adsetTemplate={adsetTemplate} onClose={() => setBuilder(null)} onSaved={() => builder.proposal && discard(builder.proposal)}/>)}

      {writeFor && <GenerateDialog open onOpenChange={(o) => !o && setWriteFor(null)} concepts={concepts.map((c) => ({ id: c.id, name: c.name, stage: c.awareness_stage, age: speakerAges[c.persona_id] ?? null }))} conceptId={writeFor}/>}
    </div>);
}
function ConceptBuilder({ initial, variant: initialVariant, themes, personas, offers, brandCode, adsetTemplate, onClose, onSaved, }: {
    initial: ConceptInput;
    variant: Variable | null;
    themes: ThemeLite[];
    personas: Persona[];
    offers: {
        id: string;
        name: string;
    }[];
    brandCode: string;
    adsetTemplate: string;
    onClose: () => void;
    onSaved?: () => void;
}) {
    const router = useRouter();
    const [c, setC] = useState<ConceptInput>(initial);
    const [variant, setVariant] = useState<Variable | null>(initialVariant);
    const [search, setSearch] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [pending, start] = useTransition();
    const set = <K extends keyof ConceptInput>(k: K, v: ConceptInput[K]) => setC((p) => ({ ...p, [k]: v }));
    const locked = (v: Variable) => variant !== null && variant !== v;
    const themeById = new Map(themes.map((t) => [t.id, t]));
    const desireCandidates = themes.filter((t) => DESIRE_EVIDENCE_TYPES.includes(t.type));
    const persona = personas.find((p) => p.id === c.persona_id);
    const diffWarnings = differentiatorWarnings(c.differentiator_test);
    const desireMissing = c.desire_evidence_theme_ids.length === 0;
    const preview = c.persona_id && c.offer_id
        ? adsetName(adsetTemplate, {
            brandCode,
            conceptId: c.id ?? "con_new",
            personaId: c.persona_id,
            conceptName: c.name || "untitled",
            offerId: c.offer_id,
            awarenessCode: AWARENESS_INFO[c.awareness_stage].code,
        })
        : "Pick a persona and offer";
    const toggle = (key: "theme_ids" | "desire_evidence_theme_ids", id: string) => set(key, c[key].includes(id) ? c[key].filter((x) => x !== id) : [...c[key], id]);
    const save = () => start(async () => {
        const res = await saveConceptAction(c);
        if (res.ok) {
            toast.success("Concept saved.");
            onSaved?.();
            onClose();
            router.refresh();
        }
        else
            setErrors(res.errors);
    });
    return (<Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl" data-testid="concept-builder">
        <SheetHeader className="border-b">
          <SheetTitle>{initial.id ? `Edit ${initial.name || "this concept"}` : initial.parent_concept_id ? "A variant to test" : initial.name ? "New concept from a suggestion" : "New concept"}</SheetTitle>
          <SheetDescription>Persona × angle × offer. The awareness label follows the concept into every script and job.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm">
          {initialVariant && (<div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 font-medium">Change 1 thing</div>
              <div className="flex gap-2">
                {(["persona", "angle", "offer"] as const).map((v) => (<Button key={v} size="sm" variant={variant === v ? "default" : "outline"} onClick={() => setVariant(v)}>
                    {v}
                  </Button>))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Everything else stays as in the original, so the test shows what this 1 change does.</p>
            </div>)}

          <Field label="Name">
            <Input value={c.name} onChange={(e) => set("name", e.target.value)} placeholder="Persona x angle x offer"/>
          </Field>

          <Field label="Persona">
            <Select value={c.persona_id} onValueChange={(v) => set("persona_id", v)} disabled={locked("persona")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a persona"/>
              </SelectTrigger>
              <SelectContent>
                {personas.map((p) => (<SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>))}
              </SelectContent>
            </Select>
            {persona && (<p className="mt-1 text-xs text-muted-foreground">
                {persona.summary}
                {isDemographicOnly(persona.summary) && (<span className="ml-1 font-medium text-amber-700">
                    This persona is only age and gender. Describe the problem, trigger and language.
                  </span>)}
              </p>)}
          </Field>

          <Field label="Angle (1 to 2 sentences)">
            <Textarea value={c.angle} onChange={(e) => set("angle", e.target.value)} rows={3} disabled={locked("angle")}/>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Offer">
              <Select value={c.offer_id} onValueChange={(v) => set("offer_id", v)} disabled={locked("offer")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an offer"/>
                </SelectTrigger>
                <SelectContent>
                  {offers.map((o) => (<SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={c.status} onValueChange={(v) => set("status", v as ConceptInput["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["draft", "scripted", "in_production", "live", "paused"] as const).map((s) => (<SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Buyer's stage (required)">
              <Select value={c.awareness_stage} onValueChange={(v) => set("awareness_stage", v as AwarenessStage)} disabled={variant !== null}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWARENESS_STAGES.map((s) => (<SelectItem key={s} value={s}>
                      {AWARENESS_INFO[s].label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Market stage">
              <Select value={String(c.sophistication_stage)} onValueChange={(v) => set("sophistication_stage", Number(v))} disabled={variant !== null}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (<SelectItem key={n} value={String(n)}>
                      {SOPHISTICATION_LABELS[n]}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={<span className="inline-flex items-center gap-1">
                Desire evidence (at least 1)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground"/>
                  </TooltipTrigger>
                  <TooltipContent>{DESIRE_RULE_TOOLTIP}</TooltipContent>
                </Tooltip>
              </span>}>
            <div className={cn("max-h-40 space-y-1 overflow-y-auto rounded-md border p-2", desireMissing && "border-red-300")}>
              {desireCandidates.map((t) => (<ThemeCheck key={t.id} t={t} checked={c.desire_evidence_theme_ids.includes(t.id)} onToggle={() => toggle("desire_evidence_theme_ids", t.id)}/>))}
            </div>
            {desireMissing && <p className="mt-1 text-xs text-red-700">{DESIRE_RULE_TOOLTIP}</p>}
          </Field>

          <Field label={`Other evidence (${c.theme_ids.length} selected)`}>
            <Input placeholder="Search themes" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2 h-8"/>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
              {themes
            .filter((t) => !search || t.label.toLowerCase().includes(search.toLowerCase()) || t.type.includes(search.toLowerCase()))
            .map((t) => (<ThemeCheck key={t.id} t={t} checked={c.theme_ids.includes(t.id)} onToggle={() => toggle("theme_ids", t.id)}/>))}
            </div>
            {c.theme_ids.some((id) => !themeById.has(id)) && <p className="text-xs text-red-700">Some evidence themes no longer exist.</p>}
          </Field>

          <Field label="Differentiator test (main claim)">
            <Input value={c.differentiator_test.claim} onChange={(e) => set("differentiator_test", { ...c.differentiator_test, claim: e.target.value })} placeholder="The claim only we can make"/>
            <div className="mt-2 space-y-1.5">
              {([
            ["is_proposition", "It's a proposition (a specific benefit)"],
            ["unavailable_to_competitors", "Competitors can't make it"],
            ["moves_a_stranger", "It would move a stranger"],
        ] as const).map(([k, label]) => (<label key={k} className="flex items-center gap-2">
                  <Switch checked={c.differentiator_test[k]} onCheckedChange={(v) => set("differentiator_test", { ...c.differentiator_test, [k]: v })}/>
                  {label}
                </label>))}
            </div>
            {diffWarnings.length > 0 && (<p className="mt-2 flex gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="size-3.5 shrink-0"/>
                {diffWarnings.join(" ")}
              </p>)}
          </Field>

          <Field label="Formats planned">
            <div className="grid grid-cols-2 gap-1.5">
              {OUTPUT_TYPES.map((t) => (<label key={t} className="flex items-center gap-2">
                  <Checkbox checked={c.formats_planned.includes(t)} onCheckedChange={() => set("formats_planned", c.formats_planned.includes(t) ? c.formats_planned.filter((x) => x !== t) : [...c.formats_planned, t])}/>
                  {OUTPUT_INFO[t].label}
                </label>))}
            </div>
          </Field>

          <div className="rounded-md bg-muted px-3 py-2">
            <div className="text-xs text-muted-foreground">Meta ad set name (1 concept = 1 ad set)</div>
            <code className="text-xs break-all">{preview}</code>
          </div>
        </div>

        <div className="border-t p-4">
          {errors.length > 0 && (<ul className="mb-3 list-disc rounded-md bg-red-50 py-2 pr-2 pl-6 text-xs text-red-700">
              {errors.map((e) => (<li key={e}>{e}</li>))}
            </ul>)}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button onClick={save} disabled={pending || desireMissing}>
                    {pending ? "Saving..." : "Save concept"}
                  </Button>
                </span>
              </TooltipTrigger>
              {desireMissing && <TooltipContent>{DESIRE_RULE_TOOLTIP}</TooltipContent>}
            </Tooltip>
          </div>
        </div>
      </SheetContent>
    </Sheet>);
}
function Field({ label, children }: {
    label: React.ReactNode;
    children: React.ReactNode;
}) {
    return (<div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>);
}
function ThemeCheck({ t, checked, onToggle }: {
    t: ThemeLite;
    checked: boolean;
    onToggle: () => void;
}) {
    return (<label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
      <Checkbox checked={checked} onCheckedChange={onToggle}/>
      <span className="flex-1 truncate">{t.label}</span>
      <TypePill type={t.type}/>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{t.score.toFixed(1)}</span>
    </label>);
}
