import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { BrandBrain } from "../brand-brain";
import { brandVoiceText } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { checkWordsQuietly } from "../copy/checked";
import { floorText, leftLine } from "../copy/words-read";
import { lessonsFor } from "../lessons";
import { adviceBlock } from "../scripts/flow";
import { env } from "../env";
import { callStructured, llmEnabled } from "../llm/gateway";
import { currencySymbol } from "../money";
import { getPersona } from "../personas/store";
import { renderPrompt } from "../prompts";
import { bookOffer, saveBrandOffer, type BrandOffer } from "./book";
import { ADDON_CHOICE, ADDON_IDS, MECHANIC_CHOICE, dealFacts, dealPrice, numbersTable, partsOfPath, type AddonId, type MainMechanic, type OfferPath } from "./path";
const Out = z.object({
    name: z.string().min(2).max(80),
    page_line: z.string().min(4).max(300),
    say: z.string().min(8).max(400),
    why: z.string().default(""),
    gift_fit: z.string().default(""),
    gift_note: z.string().default(""),
});
export interface OfferWords {
    name: string;
    page_line: string;
    say: string;
    why: string;
    gift: {
        fit: "yes" | "unsure" | "no";
        note: string;
    } | null;
    written: boolean;
    costUsd: number;
    notes?: string[];
}
const snippetsDir = () => path.join(env.SKILLS_DIR, "offer-building", "snippets");
const bare = (s: string) => s.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
export function mechanicSnippet(m: MainMechanic): string {
    const f = path.join(snippetsDir(), `${m}.md`);
    return fs.existsSync(f) ? bare(fs.readFileSync(f, "utf-8")) : `Mechanic: ${MECHANIC_CHOICE[m].label}. ${MECHANIC_CHOICE[m].plain}`;
}
export function addonSnippets(ids: AddonId[]): string {
    const f = path.join(snippetsDir(), "addons.md");
    const lines = fs.existsSync(f) ? bare(fs.readFileSync(f, "utf-8")).split(/\r?\n/) : [];
    return ids.map((id) => `- ${ADDON_CHOICE[id].label}: ${lines.find((l) => l.startsWith(`${id}:`))?.slice(id.length + 1).trim() ?? ADDON_CHOICE[id].plain}`).join("\n");
}
const clip = (s: string, n: number) => (s.trim().length > n ? `${s.trim().slice(0, n - 1).trimEnd()}…` : s.trim());
const ticked = (p: OfferPath) => ADDON_IDS.filter((id) => (p.addons[id] ?? "").trim());
export function wordsPrompt(brand: Pick<BrandBrain, "brand" | "products">, p: OfferPath, persona?: {
    problem?: string;
} | null, voice = "", lessons = "", floor = ""): {
    system: string;
    user: string;
} {
    const sym = currencySymbol(brand.brand.currency);
    const format = brand.products.find((x) => x.id === p.product_id)?.format ?? "";
    return renderPrompt("offer-words", {
        brand_name: brand.brand.name,
        floor,
        brand_voice: voice,
        lessons,
        buyer: [`${p.persona_name ? `Our label for them (never written): ${p.persona_name}` : p.audience === "returning" ? "A returning buyer" : "A new buyer"}${persona?.problem ? `. ${clip(persona.problem, 200)}` : ""}`, p.objection ? `Their biggest doubt: "${clip(p.objection, 200)}"` : "", p.proof ? `What the brand can answer it with: ${clip(p.proof, 300)}` : "", p.angle ? `The angle of the ad it goes with: ${clip(p.angle, 200)}` : ""].filter(Boolean).join("\n"),
        mechanic: mechanicSnippet(p.mechanic),
        addons: ticked(p).length ? `Added to it:\n${addonSnippets(ticked(p))}` : "Nothing is added to it.",
        facts: [...dealFacts(p, sym), format ? `What 1 ${p.product_name} is: ${clip(format, 160)}` : ""].filter(Boolean).map((l) => `- ${l}`).join("\n"),
    });
}
export function plainWords(p: OfferPath, sym: string): OfferWords {
    const pays = `${sym}${dealPrice(p).toFixed(2)}`;
    const qty = Math.max(1, Math.round(p.qty));
    const what = qty > 1 ? `${qty} x ${p.product_name}` : p.product_name;
    const extra = p.addons.free_extra ? `, with ${p.addons.free_extra} included` : "";
    const name = `${MECHANIC_CHOICE[p.mechanic].label}${p.persona_name ? `, ${p.persona_name.replace(/^The\s+/, "")}` : ""}`.slice(0, 70);
    return { name, page_line: `${what} for ${pays}${extra}.`, say: `You get ${what} for ${pays}${extra}${p.addons.risk_reversal ? `, and ${p.addons.risk_reversal.replace(/\.$/, "")}` : ""}.`, why: p.objection ? `Built to answer: "${p.objection}"` : "", gift: null, written: false, costUsd: 0 };
}
const numbersOf = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.$/, "").replace(/\.00$/, ""));
export function figuresHeld(words: string, sent: string): boolean {
    const have = new Set(numbersOf(sent));
    return numbersOf(words).every((n) => have.has(n));
}
export async function writeOfferWords(brandId: string, p: OfferPath, opts: {
    model?: string;
} = {}): Promise<OfferWords> {
    const brand = loadBrandBrain(brandId);
    const sym = currencySymbol(brand.brand.currency);
    if (!llmEnabled())
        return plainWords(p, sym);
    const persona = p.persona_id ? getPersona(brandId, p.persona_id) : null;
    const voice = brandVoiceText(brandId, { surfaces: ["headline"], brand });
    const prompt = wordsPrompt(brand, p, persona, voice, adviceBlock(lessonsFor(brandId, { area: "words" }).filter((l) => l.category !== "product_use")), floorText());
    const res = await callStructured({ brandId, task: "offer_words", model: opts.model ?? env.MODEL_REFERENCE, pin: !!opts.model, system: prompt.system, user: prompt.user, schema: Out, effort: "low", maxTokens: 700, refType: "brand", refId: brandId });
    const d = res.data;
    const plain = plainWords(p, sym);
    const read = await checkWordsQuietly({
        brandId,
        brandName: brand.brand.name,
        refType: "brand",
        refId: brandId,
        stage: null,
        about: [`The offer "${d.name.trim()}" on ${p.product_name}.`, `For: ${p.audience === "returning" ? "a returning buyer" : "a new buyer"}${persona?.problem ? `. ${clip(persona.problem, 200)}` : ""}`, p.objection ? `Their biggest doubt: "${clip(p.objection, 200)}"` : "", "The offer line is the offer as its page states it, with the 1 figure that matters most. The script line is the whole offer in 1 sentence, the way a person would tell a friend out loud: it is 1 line that a script ends on, not an ad, so it tells no story and is judged only on whether a person would say it, whether it is plain, and whether it is true to the facts. They are 2 separate pieces."].filter(Boolean).join("\n"),
        brandVoice: voice,
        lines: [
            { id: "page", surface: "offer", text: d.page_line.trim() },
            { id: "say", surface: "spoken", text: d.say.trim() },
        ],
        facts: prompt.user.split("=== PER CALL ===").pop()!.trim(),
        max: { page: Math.max(120, d.page_line.trim().length) },
    }, { read: true, fix: true });
    const said = (id: string, was: string) => {
        const now = read.lines.find((l) => l.id === id)?.text.trim();
        return now && now.length <= (id === "say" ? 400 : 300) ? now : was;
    };
    const keep = (s: string, fallback: string) => (figuresHeld(s, prompt.user) ? s.replace(/\s*[—–]\s*/g, ", ").trim() : fallback);
    const fit = d.gift_fit.trim().toLowerCase();
    const notes = [...(read.failed ? [`The reading of these words didn't run: ${read.failed}`] : []), ...read.left.map((f) => `${f.id === "say" ? "How a person says it" : "The line on its page"}: ${leftLine(f)}`)];
    return { name: keep(d.name, plain.name), page_line: keep(said("page", d.page_line), plain.page_line), say: keep(said("say", d.say), plain.say), why: keep(d.why, plain.why), gift: p.addons.free_extra && (fit === "yes" || fit === "unsure" || fit === "no") ? { fit, note: d.gift_note.trim() } : null, written: true, costUsd: res.costUsd, ...(notes.length ? { notes } : {}) };
}
export const termsOfPath = (p: OfferPath, sym: string) => [`For ${p.product_name}.`, ...dealFacts(p, sym).filter((l) => !l.startsWith("Background, the standing price"))].join(" ").slice(0, 600);
export interface PathSave {
    id?: string;
    name: string;
    page_line: string;
    say: string;
    why: string;
    running: boolean;
}
export function offerWordEdits(draft: Partial<Pick<OfferWords, "name" | "page_line" | "say">> | null | undefined, saved: Pick<PathSave, "name" | "page_line" | "say">): {
    surface: string;
    before: string;
    after: string;
}[] {
    if (!draft)
        return [];
    return (["name", "page_line", "say"] as const).flatMap((k) => {
        const before = (draft[k] ?? "").trim();
        const after = saved[k].trim();
        return before && before !== after ? [{ surface: `offer:${k}`, before, after }] : [];
    });
}
export function savePathOffer(brandId: string, p: OfferPath, w: PathSave): BrandOffer {
    const brand = loadBrandBrain(brandId);
    const sym = currencySymbol(brand.brand.currency);
    const t = numbersTable(p.numbers);
    const fin = (n: number) => (Number.isFinite(n) ? n : null);
    const persona = p.persona_id && brand.personas.some((x) => x.id === p.persona_id) ? p.persona_id : null;
    const { id } = saveBrandOffer(brandId, {
        id: w.id,
        name: w.name,
        price: dealPrice(p),
        terms: termsOfPath(p, sym),
        say: w.say,
        why: w.why,
        running: w.running,
        persona_ids: persona ? [persona] : [],
        mechanic: p.mechanic,
        parts: partsOfPath(p, sym),
        objection: p.objection,
        angle: p.angle,
        page_line: w.page_line,
        audience: p.audience,
        addons: Object.fromEntries(ticked(p).map((a) => [a, p.addons[a]!.trim().slice(0, 300)])),
        numbers: { units: t.after.units, pays: t.after.revenue, keeps: t.after.margin, keeps_today: t.before.margin, break_even: fin(t.after.break_even), needed_roas: fin(t.hold.roas), roas_today: p.numbers.roas, discount: p.numbers.discount },
        downstream: p.downstream.filter((r) => r.item.trim()).slice(0, 8),
    });
    return bookOffer(brandId, id)!;
}
