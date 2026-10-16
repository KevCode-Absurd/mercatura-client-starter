import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { parseDoc, serializeDoc, type Section } from "./brain/md";
import { brandBrainDir, brandBrainPath, readBrandBrainFile, writeBrandBrainFile, type BrandBrain } from "./brand-brain";
import { storedSite } from "./brand-onboard";
import { getBrandRow, loadBrandBrain } from "./brands";
import { loadClaimSources } from "./claim-sources";
import { env } from "./env";
import { llmEnabled } from "./llm/gateway";
import { structuredJson } from "./llm/structured";
import { redactContactPii } from "./pipeline/redact";
import { renderPrompt } from "./prompts";
import { siteLines } from "./site-pages";
export interface VoiceCard {
    sound: string[];
    examples: string[];
    by: "written" | "rules";
}
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function publishedLines(brandId: string): string[] {
    let quotes: string[] = [];
    try {
        quotes = loadClaimSources(brandId).claims.filter((c) => !c.forbidden).map((c) => c.quote);
    }
    catch {
    }
    const seen = new Set<string>();
    return quotes
        .flatMap((q) => q.split(/\n+/))
        .map(clean)
        .filter((q) => q.length >= 12 && q.length <= 110 && /[a-z]/.test(q) && q.split(" ").length >= 3)
        .filter((q) => (seen.has(plain(q)) ? false : (seen.add(plain(q)), true)));
}
export function voiceCard(brandId: string, brand?: BrandBrain): VoiceCard {
    let b = brand;
    try {
        b = b ?? loadBrandBrain(brandId);
    }
    catch {
        return { sound: [], examples: [], by: "rules" };
    }
    if (b.voice.sound?.length)
        return { sound: b.voice.sound, examples: b.voice.examples ?? [], by: "written" };
    const quoted = b.voice.do.flatMap((d) => [...d.matchAll(/'([^']{6,80})'|"([^"]{6,80})"/g)].map((m) => clean(m[1] ?? m[2])));
    return { sound: b.voice.do.slice(0, 4), examples: [...new Set([...quoted, ...publishedLines(brandId).slice(0, 4)])].slice(0, 6), by: "rules" };
}
export function voiceCardText(brandId: string, brand?: BrandBrain): string {
    const c = voiceCard(brandId, brand);
    if (!c.sound.length && !c.examples.length)
        return "";
    return [
        "Hold every word a customer reads to this. It is how the brand sounds; a line that could have been written for any brand fails it.",
        ...c.sound.map((x) => `- ${x}`),
        c.examples.length ? "Lines the brand itself has published. Match their sound and rhythm; do not reuse their words:" : "",
        ...c.examples.map((x) => `- "${x}"`),
    ]
        .filter(Boolean)
        .join("\n");
}
const VOICE_HEADING = /\bvoice\b|\btone\b|key phrases|taglines?|slogans?|selling proposition|\busps?\b|how the brand writes/i;
export function voiceSectionsOf(md: string): string {
    const doc = parseDoc(md);
    const kept: Section[] = [];
    let under = 0;
    for (const s of doc.sections) {
        if (under && s.level > under) {
            kept.push(s);
            continue;
        }
        under = 0;
        if (VOICE_HEADING.test(s.title)) {
            kept.push(s);
            under = s.level;
        }
    }
    return kept.length ? serializeDoc({ title: "", intro: [], sections: kept }).trim() : "";
}
function material(brandId: string, brand: BrandBrain): {
    text: string;
    sources: string[];
} {
    const parts: string[] = [];
    const sources: string[] = [];
    parts.push(`## The brand\n${brand.brand.name}: ${brand.brand.one_liner}\nCategory: ${brand.brand.category}. Market: ${brand.brand.market}.`);
    parts.push(`## Voice notes already in the brand brain\nDo:\n${brand.voice.do.map((x) => `- ${x}`).join("\n")}\nDon't:\n${brand.voice.dont.map((x) => `- ${x}`).join("\n")}`);
    const lines = publishedLines(brandId).slice(0, 60);
    if (lines.length) {
        parts.push(`## Lines found on the brand's website and in its ads (word for word)\n${lines.map((x) => `- ${x}`).join("\n")}`);
        sources.push(`${lines.length} lines from the site and the ads`);
    }
    let site: ReturnType<typeof storedSite> = null;
    try {
        site = storedSite(brandId);
    }
    catch {
    }
    const fromSite = site ? siteLines(site, 80).filter((l) => !lines.includes(l)) : [];
    if (site && fromSite.length) {
        parts.push(`## Headings and short lines on the brand's website (word for word)\n${fromSite.map((x) => `- ${x}`).join("\n")}`);
        sources.push(`${site.pages.length} website page${site.pages.length === 1 ? "" : "s"}`);
    }
    const row = getBrandRow(brandId);
    const dir = row ? brandBrainDir(row.dir) : "";
    if (dir && fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir).filter((x) => /guideline|winning|voice|tone/i.test(x) && x.endsWith(".md")).sort()) {
            const raw = fs.readFileSync(path.join(dir, f), "utf-8");
            const text = /guideline/i.test(f) ? voiceSectionsOf(raw) || raw : raw;
            parts.push(`## From the brand's own file ${f}\n${redactContactPii(text).text.slice(0, 5000)}`);
            sources.push(f);
        }
    }
    return { text: parts.join("\n\n"), sources };
}
const FIGURE = /\d\s?%|[$£€]\s?\d/;
const CardOut = z.object({ sound: z.array(z.string().min(8).max(220)).min(2).max(6), examples: z.array(z.string().min(6).max(120)).max(12).default([]) });
export function saveVoiceCard(brandId: string, card: {
    sound: string[];
    examples: string[];
}): VoiceCard {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error("Unknown brand.");
    const file = brandBrainPath(row.dir);
    const brand = readBrandBrainFile(file);
    const sound = card.sound.map(clean).filter(Boolean).slice(0, 6).map((x) => x.slice(0, 220));
    const examples = [...new Set(card.examples.map(clean).filter(Boolean))].slice(0, 10).map((x) => x.slice(0, 120));
    writeBrandBrainFile(file, { ...brand, voice: { ...brand.voice, sound, examples } });
    return { sound, examples, by: "written" };
}
export async function buildVoiceCard(brandId: string): Promise<{
    card: VoiceCard;
    sources: string[];
}> {
    const brand = loadBrandBrain(brandId);
    if (!llmEnabled())
        throw new Error("Writing the style card from the brand's site and ads needs live mode. Until then the card is made from the brand's voice notes.");
    const m = material(brandId, brand);
    const p = renderPrompt("voice-card", { brand_name: brand.brand.name, material: m.text });
    const out = await structuredJson({ brandId, task: "voice_card", model: env.MODEL_COPY, system: p.system, user: p.user, schema: CardOut, effort: "low", maxTokens: 3000, refType: "brand", refId: brandId });
    const hay = plain(m.text);
    const real = out.examples.map(clean).filter((x) => hay.includes(plain(x)) && !FIGURE.test(x));
    return { card: saveVoiceCard(brandId, { sound: out.sound, examples: real }), sources: m.sources };
}
