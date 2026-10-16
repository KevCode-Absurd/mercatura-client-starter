"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { PhaseButton } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DEFAULT_AD_TEMPLATE, DEFAULT_ADSET_TEMPLATE, fillTemplate } from "@/lib/naming";
import { DEFAULT_WEIGHTS, rankThemes, type RankWeights, type Scorable } from "@/lib/ranking";
import type { SettingsShape } from "@/lib/settings";
import type { SkillInfo } from "@/lib/skills/registry";
import { OUTPUT_INFO, OUTPUT_TYPES, type OutputType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { saveNamingAction, saveSkillMapAction, saveWeightsAction } from "./actions";
const NONE = "__none";
export function SettingsView({ llm, weights: savedWeights, themes, skills, skillMap: savedMap, naming: savedNaming, market, }: {
    llm: {
        mode: string;
        keySet: boolean;
        models: {
            extract: string;
            script: string;
            fast: string;
        };
        skillsDir: string;
        dataDir: string;
    };
    weights: RankWeights;
    themes: Scorable[];
    skills: SkillInfo[];
    skillMap: SettingsShape["skill_map"];
    naming: SettingsShape["naming"];
    market: SettingsShape["market"];
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [w, setW] = useState(savedWeights);
    const [map, setMap] = useState(savedMap);
    const [naming, setNaming] = useState(savedNaming);
    const save = (fn: (v: unknown) => Promise<{
        ok: boolean;
        error?: string;
    }>, v: unknown, msg: string) => start(async () => {
        const res = await fn(v);
        if (res.ok) {
            toast.success(msg);
            router.refresh();
        }
        else
            toast.error(res.error);
    });
    const sum = w.w_int + w.w_freq + w.w_div;
    const before = new Map(rankThemes(themes, savedWeights).map((t) => [t.id, t.rank]));
    const preview = rankThemes(themes, w).slice(0, 10);
    const skillNames = new Set(skills.map((s) => s.name));
    return (<div className="grid gap-4 p-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Set in the .env file</CardTitle>
          <CardDescription>Keys, caps and folders. Restart the app after changing them. Which model does which step is chosen above, not here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row k="Mode" v={<span className={llm.mode === "mock" ? "font-medium text-amber-700" : "font-medium text-primary"}>{llm.mode}</span>}/>
          <Row k="API key" v={llm.keySet ? "set (hidden)" : "not set (fine in mock mode)"}/>
          <Row k="SKILLS_DIR" v={<code className="break-all">{llm.skillsDir}</code>}/>
          <Row k="DATA_DIR" v={<code className="break-all">{llm.dataDir}</code>}/>
          <p className="pt-2 text-xs text-muted-foreground">In mock mode nothing is sent to a model and nothing is spent: screens show placeholder work.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking weights</CardTitle>
          <CardDescription>score = 100 × (W_INT × intensity + W_FREQ × frequency + W_DIV × source diversity)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {([
            ["w_int", "W_INT (intensity)"],
            ["w_freq", "W_FREQ (frequency)"],
            ["w_div", "W_DIV (source diversity)"],
        ] as const).map(([k, label]) => (<div key={k} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3">
              <Label>{label}</Label>
              <Slider value={[w[k]]} min={0} max={1} step={0.05} onValueChange={([v]) => setW({ ...w, [k]: Math.round(v * 100) / 100 })} aria-label={label} data-testid={`weight-${k}`}/>
              <span className="text-right tabular-nums">{w[k].toFixed(2)}</span>
            </div>))}
          <div className={cn("text-xs", Math.abs(sum - 1) > 0.001 ? "text-red-700" : "text-muted-foreground")}>Sum {sum.toFixed(2)} (must be 1.00)</div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Live preview: top 10</div>
            <ol className="space-y-0.5" data-testid="weights-preview">
              {preview.map((t) => {
            const was = before.get(t.id) ?? t.rank;
            return (<li key={t.id} className="flex items-center gap-2">
                    <span className="w-5 text-right tabular-nums text-muted-foreground">{t.rank}</span>
                    <span className="flex-1 truncate">{t.label}</span>
                    {was !== t.rank && (<span className={cn("inline-flex items-center text-xs", was > t.rank ? "text-emerald-700" : "text-red-700")}>
                        {was > t.rank ? <ArrowUp className="size-3"/> : <ArrowDown className="size-3"/>}
                        {Math.abs(was - t.rank)}
                      </span>)}
                    <span className="w-12 text-right tabular-nums">{t.score.toFixed(1)}</span>
                  </li>);
        })}
            </ol>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(saveWeightsAction, w, "Weights saved. Insights re-ranked.")} disabled={pending || Math.abs(sum - 1) > 0.001}>
              Save weights
            </Button>
            <Button size="sm" variant="outline" onClick={() => setW(DEFAULT_WEIGHTS)}>
              Reset to 0.50 / 0.35 / 0.15
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
          <CardDescription>
            {skills.length} skill folders found in SKILLS_DIR. Map each output type to the skill that makes it. Unmapped or missing skills run as mock.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Output type → skill</div>
            <div className="space-y-1.5">
              {OUTPUT_TYPES.map((t) => {
            const v = map[t];
            const missing = v && !skillNames.has(v);
            return (<div key={t} className="grid grid-cols-[10rem_1fr] items-center gap-2 text-sm max-sm:grid-cols-1 max-sm:gap-1">
                    <span>{OUTPUT_INFO[t].label}</span>
                    <div className="flex min-w-0 items-center gap-2 max-sm:flex-wrap">
                      <Select value={v ?? NONE} onValueChange={(nv) => setMap({ ...map, [t]: nv === NONE ? null : nv } as Record<OutputType, string | null>)}>
                        <SelectTrigger size="sm" className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{OUTPUT_INFO[t].madeBy === "human" ? "Human (no skill)" : "None (mock)"}</SelectItem>
                          {v && missing && <SelectItem value={v}>{v}</SelectItem>}
                          {skills.map((s) => (<SelectItem key={s.path} value={s.name}>
                              {s.title} <span className="text-muted-foreground">({s.name})</span>
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      {missing && <span className="text-xs text-amber-700">not installed, mock runs</span>}
                    </div>
                  </div>);
        })}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => save(saveSkillMapAction, map, "Skill mapping saved.")} disabled={pending}>
                Save mapping
              </Button>
              <PhaseButton phase={4}>Test-run a skill</PhaseButton>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Found in SKILLS_DIR</div>
            <ul className="max-h-96 divide-y overflow-y-auto rounded-md border text-sm" data-testid="skills-list">
              {skills.map((s) => (<li key={s.path} className="px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{s.title}</span>
                    <code className="truncate text-xs text-muted-foreground">{s.path}</code>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                </li>))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta naming convention</CardTitle>
          <CardDescription>Tokens: {"{BRAND} {CONCEPT_ID} {PERSONA} {ANGLE_SLUG} {OFFER} {AWARENESS} {SCRIPT_ID} {VERSION} {OUTPUT_TYPE} {HOOK_ID} {CREATOR_OR_SKILL}"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Ad set</Label>
            <Input value={naming.adset} onChange={(e) => setNaming({ ...naming, adset: e.target.value })} className="font-mono text-xs"/>
            <code className="mt-1 block text-xs text-muted-foreground">
              {fillTemplate(naming.adset, { BRAND: "NP", CONCEPT_ID: "C001", PERSONA: "early_part", ANGLE_SLUG: "part-shift", OFFER: "90day", AWARENESS: "PA" })}
            </code>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Ad</Label>
            <Input value={naming.ad} onChange={(e) => setNaming({ ...naming, ad: e.target.value })} className="font-mono text-xs"/>
            <code className="mt-1 block text-xs text-muted-foreground">
              {fillTemplate(naming.ad, { BRAND: "NP", CONCEPT_ID: "C001", SCRIPT_ID: "S001", VERSION: "3", OUTPUT_TYPE: "ugc", HOOK_ID: "hk2", CREATOR_OR_SKILL: "creator-amy" })}
            </code>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save(saveNamingAction, naming, "Naming saved. Applies to new and re-saved concepts and jobs.")} disabled={pending}>
              Save naming
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNaming({ adset: DEFAULT_ADSET_TEMPLATE, ad: DEFAULT_AD_TEMPLATE })}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Currency</Label>
              <Input value={market.currency} readOnly disabled title="From the brand brain" data-testid="market-currency"/>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Accent for talent</Label>
              <Input value={market.accent} readOnly disabled title="From the brand brain" data-testid="market-accent"/>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Currency and accent are read from the brand brain. Change them there.</p>

          <p className="text-xs text-muted-foreground" data-testid="market-pace">
            How fast an ad is spoken follows the age of the person speaking: faster for a younger speaker, a little slower for an older one.
          </p>
        </CardContent>
      </Card>
    </div>);
}
function Row({ k, v }: {
    k: string;
    v: React.ReactNode;
}) {
    return (<div className="grid grid-cols-[9rem_1fr] gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span>{v}</span>
    </div>);
}
