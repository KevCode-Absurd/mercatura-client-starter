import { tryBrand } from "@/lib/queries";
import { FAMILIES, MODELS } from "@/lib/llm/models";
import { providerEnabled } from "@/lib/llm/providers";
import { STEPS, contextLevel, recommended, routeFor, stepChoices, writerChoices, writerRows } from "@/lib/llm/routing";
import { writerShows } from "@/lib/llm/writer";
import { StepsCard, type StepRow } from "./steps-card";
import { activeBrandId } from "@/lib/brand-context";
import { eq, sql } from "drizzle-orm";
import { PageHeader } from "@/components/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db, schema } from "@/db";
import { budgetStatus, llmEnabled } from "@/lib/llm/gateway";
import { env } from "@/lib/env";
import { mediaModelChoices } from "@/lib/media/chosen";
import { mediaUsage } from "@/lib/media/providers";
import { getThemes } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { listSkills } from "@/lib/skills/registry";
import { getBrandRow } from "@/lib/brands";
import { ChecksCard } from "./checks-card";
import { SettingsView } from "./settings-view";
import { CapsCard } from "./caps-card";
import { MediaModelsCard } from "./media-models-card";
import { ImpactCard } from "./impact-card";
import { SETTING_DEFAULTS } from "@/lib/settings-defaults";
import { spendCaps, textCeiling } from "@/lib/spend-caps";
import { isAdvanced } from "@/lib/ui-mode-server";
export default async function SettingsPage() {
    const brandId = await activeBrandId();
    const brandName = getBrandRow(brandId)?.name ?? brandId;
    const themes = getThemes(brandId).map((t) => ({
        id: t.id,
        label: t.label,
        frequency: t.frequency,
        intensity_avg: t.intensity_avg,
        intensity_peak: t.intensity_peak,
        source_types: t.source_types,
    }));
    const c = schema.llmCalls;
    const usage = db
        .select({
        task: c.task,
        model: c.model,
        calls: sql<number> `count(*)`,
        cost: sql<number> `sum(${c.cost_usd})`,
        input: sql<number> `sum(${c.input_tokens})`,
        cached: sql<number> `sum(${c.cache_read_tokens})`,
        output: sql<number> `sum(${c.output_tokens})`,
        failed: sql<number> `sum(${c.status} != 'ok')`,
    })
        .from(c)
        .where(eq(c.brand_id, brandId))
        .groupBy(c.task, c.model)
        .all();
    const measure = (task: string) => db.get<{
        n: number;
        i: number | null;
        c: number | null;
        o: number | null;
        usd: number | null;
    }>(sql `SELECT count(*) n, avg(input_tokens + cache_read_tokens + cache_write_tokens) i, sum(cache_read_tokens) * 100.0 / max(1, sum(input_tokens + cache_read_tokens + cache_write_tokens)) c, avg(output_tokens) o, avg(cost_usd) usd
          FROM (SELECT * FROM llm_calls WHERE task = ${task} AND status = 'ok' ORDER BY created_at DESC LIMIT 20)`);
    const choices = stepChoices({ fresh: true });
    const steps: StepRow[] = STEPS.map((st) => {
        const rec = recommended(st);
        const now = routeFor(st.task, { model: rec.model, effort: rec.effort });
        const m = measure(st.task);
        return {
            task: st.task,
            area: st.area,
            label: st.label,
            makes: st.makes,
            sent: st.sent,
            why: st.why,
            vision: !!st.vision,
            recommended: { model: rec.model, effort: rec.effort ?? null, context: rec.context },
            now: { model: now.model, effort: now.effort ?? null, context: st.context.length ? contextLevel(st.task) : null, extra: st.context.length ? null : (choices[st.task]?.extra ?? null) },
            choice: choices[st.task]?.model ?? null,
            levels: st.context,
            tested: st.tested ?? {},
            suggested: st.suggested ?? [],
            measured: m.n ? { calls: m.n, input: Math.round(m.i ?? 0), cachedPct: Math.round(m.c ?? 0), output: Math.round(m.o ?? 0), cents: (m.usd ?? 0) * 100 } : null,
        };
    });
    const stepsCard = (simple: boolean) => (<StepsCard simple={simple} steps={steps} models={MODELS.map((m) => ({ ...m, available: providerEnabled(m.provider) }))} lineNames={Object.fromEntries(FAMILIES.map((f) => [f.id, f.name]))} changed={Object.keys(choices).length} writer={writerShows(writerRows(), choices, writerChoices())}/>);
    const budget = budgetStatus();
    const media = mediaUsage();
    const llmMode = llmEnabled() ? null : (<p className="text-sm text-muted-foreground" data-testid="llm-mode">
      Model calls: <span className="font-semibold text-primary">mock</span>
      <span className="max-sm:hidden"> · nothing is sent and nothing is spent</span>
    </p>);
    if (!(await isAdvanced("settings")))
        return (<div className="mx-auto w-full max-w-[80rem]">
        <PageHeader title="Settings" subtitle="The model for each step, the spend caps, the checks and what a finished piece is worth for this brand. The rest of the settings (how hard each step thinks, what it is sent, usage and naming) are in the Advanced view.">
          {llmMode}
        </PageHeader>
        <div className="px-6 pt-8">{stepsCard(true)}</div>
        <div className="px-6 pt-8">
          <CapsCard caps={spendCaps()} used={{ textUsd: budget.spent, videoUsd: media.videoUsd, images: media.images }} ceiling={textCeiling()}/>
        </div>
        <div className="px-6 pt-8">
          <ChecksCard brandName={brandName} checks={getSetting(brandId, "checks")}/>
        </div>
        <div className="px-6 py-8">
          <ImpactCard brandName={brandName} rates={getSetting(brandId, "impact")} start={SETTING_DEFAULTS.impact}/>
        </div>
      </div>);
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Settings" subtitle="Which model does each step and what it is sent, the image model and the video model, then spend, ranking, skills, naming and market.">
        {llmMode}
      </PageHeader>
      <div className="px-6 pt-8">
        {stepsCard(false)}
      </div>

      <div className="px-6 pt-8">
        <MediaModelsCard {...mediaModelChoices()}/>
      </div>
      <div className="px-6 pt-8">
        <ChecksCard brandName={brandName} checks={getSetting(brandId, "checks")}/>
        <ImpactCard brandName={brandName} rates={getSetting(brandId, "impact")} start={SETTING_DEFAULTS.impact}/>
      </div>
      <div className="px-6 pt-8">
        <Card data-testid="media-usage-card">
          <CardHeader>
            <CardTitle className="text-base">Media usage (all brands)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Images</span>
                  <span className="tabular-nums" data-testid="media-images">
                    {media.images} of {media.imageCap}
                  </span>
                </div>
                <Progress value={Math.min(100, (media.images / Math.max(1, media.imageCap)) * 100)} className="h-1.5"/>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Video</span>
                  <span className="tabular-nums" data-testid="media-video">
                    ${media.videoUsd.toFixed(2)} of ${media.videoCapUsd}
                  </span>
                </div>
                <Progress value={Math.min(100, (media.videoUsd / Math.max(0.01, media.videoCapUsd)) * 100)} className="h-1.5"/>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Images are counted and video is in dollars. Production stops a step that would go over a cap. The caps are set below.</p>
          </CardContent>
        </Card>
      </div>
      <div className="px-6 pt-8">
        <CapsCard caps={spendCaps()} used={{ textUsd: budget.spent, videoUsd: media.videoUsd, images: media.images }} ceiling={textCeiling()}/>
      </div>
      <div className="px-6 pt-8">
        <Card data-testid="llm-usage">
          <CardContent>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                Every text call for this brand, by step and model ({usage.length} rows) <span className="font-normal text-muted-foreground">· all brands ${budget.spent.toFixed(2)} of the ${budget.cap} cap. The Costs screen has the same by run.</span>
              </summary>
              <div className="overflow-x-auto pt-4">
            {usage.length ? (<table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2">Task</th>
                    <th className="pb-2">Model</th>
                    <th className="pb-2 text-right">Calls</th>
                    <th className="pb-2 text-right">Input</th>
                    <th className="pb-2 text-right">From cache</th>
                    <th className="pb-2 text-right">Output</th>
                    <th className="pb-2 text-right">Not ok</th>
                    <th className="pb-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u) => (<tr key={u.task + u.model} className="border-t tabular-nums">
                      <td className="py-1.5">{u.task.replace(/_/g, " ")}</td>
                      <td className="py-1.5 font-mono text-xs">{u.model}</td>
                      <td className="py-1.5 text-right">{u.calls}</td>
                      <td className="py-1.5 text-right">{u.input.toLocaleString()}</td>
                      <td className="py-1.5 text-right">{u.cached.toLocaleString()}</td>
                      <td className="py-1.5 text-right">{u.output.toLocaleString()}</td>
                      <td className="py-1.5 text-right">{u.failed}</td>
                      <td className="py-1.5 text-right">${u.cost.toFixed(3)}</td>
                    </tr>))}
                </tbody>
              </table>) : (<p className="text-sm text-muted-foreground">No model calls for this brand yet.</p>)}
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
      <SettingsView llm={{
            mode: env.LLM_MODE,
            keySet: env.ANTHROPIC_API_KEY.length > 0,
            models: { extract: env.MODEL_EXTRACT, script: env.MODEL_SCRIPT, fast: env.MODEL_FAST },
            skillsDir: env.SKILLS_DIR,
            dataDir: env.DATA_DIR,
        }} weights={getSetting(brandId, "rank_weights")} themes={themes} skills={listSkills()} skillMap={getSetting(brandId, "skill_map")} naming={getSetting(brandId, "naming")} market={{ ...getSetting(brandId, "market"), currency: tryBrand(brandId)?.brand.currency ?? "", accent: tryBrand(brandId)?.brand.locale_accent ?? "" }}/>
    </div>);
}
