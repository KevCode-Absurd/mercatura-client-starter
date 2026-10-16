import { founderWords } from "../founder-words";
import { creativeBriefText, type CreativeBrief } from "../creative-brief";
import type { ConceptRow, Guardrail, ScriptRow } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { recipesForBeat } from "../formats";
import { scriptWords } from "../script-metrics";
import { AWARENESS_INFO, OUTPUT_INFO, humanize, type OutputType } from "../taxonomy";
import type { CreativeKit } from "./kit";
const FEEL: Record<string, string> = {
    unaware: "Curious: \"I didn't know that was a thing.\"",
    problem_aware: "Seen: \"That's exactly what I do.\"",
    solution_aware: "Relieved: \"So that's why the other things didn't work.\"",
    product_aware: "Reassured: \"OK, this one is worth trying.\"",
    most_aware: "Ready: \"Fine, I'll do it now.\"",
};
const cell = (s: string | undefined) => (s ?? "").replace(/\|/g, "/").replace(/\s*\n\s*/g, " ").trim() || " ";
export interface BriefInput {
    creativeBrief?: CreativeBrief | null;
    type: OutputType;
    script: ScriptRow;
    concept: ConceptRow;
    brand: BrandBrain;
    kit: CreativeKit;
    guardrails: {
        label: string;
        guardrail: Guardrail;
    }[];
    adName: string;
    wordsPerSecond: number;
    captions?: boolean;
}
export function buildBrief(b: BriefInput): string {
    const { script, concept, brand, kit } = b;
    const persona = brand.personas.find((p) => p.id === concept.persona_id);
    const presenter = kit.presenters.find((p) => p.persona_id === concept.persona_id);
    const offer = brand.offers.find((o) => o.id === concept.offer_id);
    const who = b.type === "human_brief_founder" ? "founder" : b.type === "human_brief_editor" ? "editor" : "creator";
    const rules = b.guardrails.filter((g) => g.guardrail.applies);
    const out: string[] = [];
    const add = (...lines: string[]) => out.push(...lines);
    add(`# ${OUTPUT_INFO[b.type].label}: ${script.title}`, "");
    add(`**Brand:** ${brand.brand.name} · **Script:** ${script.id} v${script.version} · **Length:** ${script.axes.length} (${scriptWords(script.lines)} words, about ${script.est_seconds}s)`);
    add(`**Concept:** ${concept.name}`, `**Meta ad set:** \`${concept.meta_adset_name}\``, `**Ad name:** \`${b.adName}\``, "");
    add("## Who this is for", "");
    add(persona ? `${persona.name}. ${persona.summary}` : concept.persona_id);
    if (persona)
        add(`Their problem: ${persona.problem} What makes them start looking: ${persona.trigger}`);
    add("", `**Awareness stage:** ${AWARENESS_INFO[concept.awareness_stage].label}. Everyone working on this ad builds to this 1 stage.`);
    add(`**What the viewer should feel:** ${FEEL[concept.awareness_stage] ?? ""}`, "");
    add(`**The angle:** ${concept.angle}`);
    if (b.creativeBrief)
        add("", "## Creative direction", "", creativeBriefText(b.creativeBrief), "");
    if (offer)
        add(`**The offer:** ${offer.name}, ${brand.brand.currency} ${offer.price}${offer.per_day ? ` (${offer.per_day} a day)` : ""}${offer.notes ? `. ${offer.notes}` : ""}`);
    if (brand.guarantee)
        add(`**The guarantee:** ${brand.guarantee.text}`);
    add("");
    add("## The script", "");
    if (b.type === "human_brief_editor") {
        add("| Time | Beat | Spoken line | On-screen text | Visual |", "|---|---|---|---|---|");
        let t = 0;
        for (const l of script.lines) {
            const secs = Math.max(1, Math.round(scriptWords([l]) / b.wordsPerSecond));
            add(`| ${t}-${t + secs}s | ${humanize(l.beat)} | ${cell(l.text)} | ${cell(l.on_screen)} | ${cell(l.visual_note)} |`);
            t += secs;
        }
        add("", "Timings are estimates from the word count. Cut on the picture changes in the Visual column; change the picture about every 2 seconds.");
    }
    else {
        add("| Beat | Spoken line | On-screen text | Visual |", "|---|---|---|---|");
        for (const l of script.lines)
            add(`| ${humanize(l.beat)} | ${cell(l.text)} | ${cell(l.on_screen)} | ${cell(l.visual_note)} |`);
    }
    add("");
    add("## Hook variants", "", "Record every hook as a separate take. It takes minutes and gives 4 or more ads.", "");
    add("| # | Type | Spoken hook | On-screen text | First frame |", "|---|---|---|---|---|");
    script.hook_variants.forEach((h, i) => add(`| ${i + 1} | ${humanize(h.type)} | ${cell(h.text)} | ${cell(h.overlay)} | ${cell(h.first_frame)} |`));
    add("");
    if (b.type !== "human_brief_editor") {
        add(`## Notes for the ${who}`, "");
        if (b.type === "human_brief_ugc") {
            add(`- **Who should be on camera:** ${presenter ? `${presenter.gender}, ${presenter.age}; ${presenter.look}; ${presenter.wardrobe}. Setting: ${presenter.setting}.` : "someone who matches the buyer above, in a real home setting."}`);
            add(`- **Accent:** ${brand.brand.locale_accent}, for the ${brand.brand.market} market.`);
            add("- **Only say \"I\" about things you have really done with the product.** If a line isn't true for you, say it in your own words or tell us, and we'll change it.");
        }
        else {
            add("- Tell the real story. Show what only you can show: the making, the rejected samples, the product cut open.");
            const said = founderWords(script.brand_id);
            if (said)
                add("- **What you told us, to say in your own way:**", ...said.answers.slice(0, 5).map((a) => `  - "${a.answer.replace(/\s+/g, " ").slice(0, 260)}"`));
        }
        add("- Real light, a real room, phone camera. No ring-light glow, no hype voice.");
        add("- Start mid-action. No greeting, no \"so\", no logo.");
        add("- **Shoot 1 take on script and 1 in your own words. We will run both.**", "");
    }
    add("## Do and don't", "");
    for (const d of brand.voice.do)
        add(`- Do: ${d}`);
    for (const d of brand.voice.dont)
        add(`- Don't: ${d}`);
    if (brand.forbidden_claims.length)
        add(`- Never say: ${brand.forbidden_claims.map((c) => `"${c}"`).join(", ")}`);
    add("");
    if (rules.length) {
        add("## Guardrails (from refunds and complaints)", "");
        for (const g of rules)
            add(`- ${g.guardrail.rule}${g.guardrail.banned.length ? ` Banned phrases: ${g.guardrail.banned.map((x) => `"${x}"`).join(", ")}.` : ""}`);
        add("");
    }
    add("## Delivery", "");
    add("- 9:16 vertical, 1080 x 1920 or better. Keep faces, product and text clear of the top 14% and bottom 20%.");
    add(b.captions ? "- Captions on for the whole ad. The first frame and its on-screen text must make sense with the sound off." : "- Captions off: deliver the video clean, with no captions or text drawn into the picture. They are added where the ad is edited or run. The first frame must still make sense with the sound off.");
    add("- Hold the end card (action, price, guarantee) for about 2 seconds.");
    add(`- File name: \`${b.adName.replace(/\|/g, "_")}_hk1.mp4\`, then \`_hk2\`, \`_hk3\` for each hook take.`);
    const formats = recipesForBeat(script.load_bearing_beat).map((r) => r.label);
    if (formats.length)
        add(`- The ${humanize(script.load_bearing_beat)} beat does most of the persuading. Formats that suit it: ${formats.join(", ")}.`);
    if (script.test_plan)
        add("", "## What this ad tests", "", script.test_plan);
    if (script.notes)
        add("", "## Open items", "", script.notes);
    return out.join("\n");
}
