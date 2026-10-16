import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { env } from "../env";
import type { Economics } from "./economics";
import { FAILURE_IDS, type FailureId } from "./evaluate";
import { sourceNote } from "./own-numbers";
import type { Industry, IndustryGroup } from "./types";
const n = z.number().finite();
export const EconomicsSchema = z.object({
    simulated: z.boolean().default(true),
    costs_entered: z.boolean().default(false),
    history_entered: z.boolean().default(false),
    source: z.string().default(""),
    period: z.string().default(""),
    currency: z.string().default("USD"),
    products: z.array(z.object({ product_id: z.string(), unit_cost: n.min(0), cycle_days: n.positive().optional() })).min(1),
    shipping: z.array(n.min(0)).min(1).max(12),
    fee_rate: n.min(0).max(0.3).default(0.03),
    roas: n.positive(),
    retention: z.array(n.min(0).max(1)).max(24).default([]),
    reorder_offer_id: z.string().optional(),
    mix: z.array(z.object({ product_id: z.string(), share: n.min(0).max(1) })).default([]),
    order_values: z.array(z.object({ from: n.min(0), to: n.min(0), share: n.min(0) })).default([]),
    discount_history: z.array(z.object({ discount: n.min(0).max(0.9), units: n.min(0.5), roas_lift: n })).default([]),
    promos: z.array(z.object({ name: z.string(), month: z.string(), discount: n.min(0).max(1) })).default([]),
    monthly: z.array(z.object({ month: z.string(), index: n.min(0) })).default([]),
    has: z.object({ cart_addon: z.boolean(), checkout_addon: z.boolean(), post_purchase: z.boolean(), returning_offer: z.boolean() }).default({ cart_addon: false, checkout_addon: false, post_purchase: false, returning_offer: false }),
});
const dirOf = (brandId: string) => {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
};
const ownFile = (brandId: string) => path.join(brandBrainDir(dirOf(brandId)), "economics.json");
const sampleFile = (brandId: string) => path.join(env.BRANDS_DIR, dirOf(brandId), "sample-data", "performance", "economics.json");
export function loadEconomics(brandId: string): Economics | null {
    for (const file of [ownFile(brandId), sampleFile(brandId)]) {
        if (!fs.existsSync(file))
            continue;
        const parsed = EconomicsSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
        if (parsed.success)
            return parsed.data;
    }
    return null;
}
export function saveEconomics(brandId: string, input: unknown, opts: {
    entered?: boolean;
} = {}): Economics {
    const was = loadEconomics(brandId);
    const today = new Date().toISOString().slice(0, 10);
    const data = EconomicsSchema.parse({ ...(was ?? {}), ...(input as object), ...(opts.entered ? { costs_entered: true, simulated: was?.simulated ?? false, source: sourceNote({ simulated: was?.simulated ?? false, costs_entered: true, history_entered: was?.history_entered }, today) } : {}) });
    fs.writeFileSync(ownFile(brandId), `${JSON.stringify(data, null, 2)}\n`, "utf-8");
    return data;
}
export interface FailureInfo {
    n: number;
    id: FailureId;
    name: string;
    what: string;
    test: string;
    fix: string;
}
const failuresFile = () => path.join(env.SKILLS_DIR, "offer-building", "failures.md");
export function loadFailures(): FailureInfo[] {
    const md = fs.existsSync(failuresFile()) ? fs.readFileSync(failuresFile(), "utf-8") : "";
    const line = (block: string, label: string) => new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`).exec(block)?.[1].trim() ?? "";
    return md
        .split(/^(?=## )/m)
        .map((block) => {
        const head = /^## +(\d+)\.\s*([a-z0-9_]+)\s*\|\s*(.+)$/m.exec(block);
        if (!head || !(FAILURE_IDS as readonly string[]).includes(head[2]))
            return null;
        return { n: Number(head[1]), id: head[2] as FailureId, name: head[3].trim(), what: line(block, "What it is"), test: line(block, "How the app tests it"), fix: line(block, "The fix") };
    })
        .filter((x): x is FailureInfo => !!x)
        .sort((a, b) => a.n - b.n);
}
export const failuresCard = () => loadFailures().map((f) => `${f.n}. ${f.name}. ${f.fix}`).join("\n");
const Pattern = z.object({ name: z.string(), how: z.string(), example: z.string().optional(), source: z.string().optional() });
const IndustriesFile = z.object({
    note: z.string().default(""),
    groups: z.array(z.object({ id: z.string(), name: z.string(), hue: z.number() })),
    industries: z.array(z.object({ id: z.string(), name: z.string(), group: z.string(), icon: z.string(), patterns: z.array(Pattern) })),
});
export const ResearchSchema = z.object({ at: z.string(), model: z.string().default(""), summary: z.string(), sources: z.array(z.string()).default([]), patterns: z.array(Pattern).max(12) });
export type IndustryResearch = z.infer<typeof ResearchSchema>;
const industriesDir = () => path.join(env.SKILLS_DIR, "offer-building");
export const researchFile = (id: string) => path.join(industriesDir(), "research", `${id}.json`);
export function loadIndustries(): {
    note: string;
    groups: IndustryGroup[];
    industries: Industry[];
} {
    const file = path.join(industriesDir(), "industries.json");
    if (!fs.existsSync(file))
        return { note: "", groups: [], industries: [] };
    const data = IndustriesFile.parse(JSON.parse(fs.readFileSync(file, "utf-8")));
    return {
        note: data.note,
        groups: data.groups,
        industries: data.industries.map((i) => {
            const r = readResearch(i.id);
            return { ...i, patterns: r ? [...r.patterns, ...i.patterns.filter((p) => !r.patterns.some((x) => x.name.toLowerCase() === p.name.toLowerCase()))] : i.patterns, researched: r ? { at: r.at, summary: r.summary, sources: r.sources } : null };
        }),
    };
}
export const getIndustry = (id: string) => loadIndustries().industries.find((i) => i.id === id);
export function readResearch(id: string): IndustryResearch | null {
    const f = researchFile(id);
    if (!/^[a-z0-9_]+$/.test(id) || !fs.existsSync(f))
        return null;
    const parsed = ResearchSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf-8")));
    return parsed.success ? parsed.data : null;
}
export function writeResearch(id: string, r: IndustryResearch) {
    fs.mkdirSync(path.dirname(researchFile(id)), { recursive: true });
    fs.writeFileSync(researchFile(id), `${JSON.stringify(ResearchSchema.parse(r), null, 2)}\n`, "utf-8");
}
