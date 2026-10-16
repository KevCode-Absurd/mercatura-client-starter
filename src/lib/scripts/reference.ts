import type { ReferenceMode, ScriptLine } from "@/db/schema";
import type { RefBreakdown } from "../references/breakdown";
import { LENGTH_SECONDS, type Beat, type LengthPreset } from "../taxonomy";
export interface RefInfo {
    id: string;
    kind: string;
    title: string;
    format: string[];
    hook: string[];
    approach: string[];
    awareness: string;
    analysis: Record<string, unknown>;
}
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
export const referenceWords = (b: RefBreakdown) => (b.kind === "video" ? b.shots.reduce((n, s) => n + wordCount(s.spoken), 0) : b.elements.reduce((n, e) => n + wordCount(e.text), 0));
const PRESET_SECONDS = Object.entries(LENGTH_SECONDS) as [
    LengthPreset,
    number
][];
export const nearestLength = (seconds: number): LengthPreset => PRESET_SECONDS.reduce((best, x) => (Math.abs(x[1] - seconds) < Math.abs(best[1] - seconds) ? x : best))[0];
const header = (r: RefInfo) => `Format: ${r.format.join(", ") || "n/a"} · hook: ${r.hook.join(", ") || "n/a"} · approach: ${r.approach.join(", ") || "n/a"} · awareness: ${r.awareness || "n/a"}`;
export const shotLine = (s: RefBreakdown["shots"][number]) => [s.setting, s.framing, s.action, s.props && `Props: ${s.props}`, s.product && `Product: ${s.product}`].filter(Boolean).join(" ").replace(/\s+/g, " ");
function shotList(b: RefBreakdown): string {
    if (b.kind === "image")
        return [`Layout: ${b.layout}`, ...b.elements.map((e, i) => `${i + 1}. ${e.beat} | ${e.role}, ${e.placement} | "${e.text}"`)].join("\n");
    return b.shots.map((s, i) => `${i + 1}. [${s.start}-${s.end}s] ${s.beat} | ${clip(shotLine(s), 320)}${s.on_screen_text ? ` | overlay: "${clip(s.on_screen_text, 100)}"` : ""} | says (${wordCount(s.spoken)} words): "${s.spoken}"`).join("\n");
}
export function readingLines(a: Record<string, unknown>): string[] {
    const r = a.reading as {
        best?: {
            at?: string;
            part: string;
            why?: string;
        }[];
        weak?: {
            at?: string;
            part: string;
            why?: string;
        }[];
    } | undefined;
    const say = (x: {
        at?: string;
        part: string;
        why?: string;
    }) => `- ${x.at ? `[${clip(x.at, 30)}] ` : ""}${clip(x.part, 220)}${x.why ? ` Why: ${clip(x.why, 240)}` : ""}`;
    return [
        r?.best?.length ? `Its best parts. Keep what each of these does for the buyer, in your own words and with your own facts:\n${r.best.slice(0, 5).map(say).join("\n")}` : "",
        r?.weak?.length ? `What did not work in it. Do not repeat these; do better here:\n${r.weak.slice(0, 3).map(say).join("\n")}` : "",
    ].filter(Boolean);
}
function ideaOf(a: Record<string, unknown>): string {
    const summary = clip((a.reading as {
        summary?: string;
    } | undefined)?.summary, 500);
    return summary || [clip(a.observations, 280), clip(a.mechanism, 280)].filter(Boolean).join(" ");
}
export function referenceBlock(mode: Exclude<ReferenceMode, "exact">, r: RefInfo, b: RefBreakdown | null, brandName: string, ideaOnly = false, flow = false): string {
    const a = r.analysis;
    if (flow && mode === "principles") {
        const own = `Write ${brandName}'s own ad from the reason for this ad, the way the principles say. No order of parts is taken from the reference, and its length is not yours: the length follows this buyer's stage.`;
        return ideaOnly
            ? ["## The reference ad: its idea only", `The person chose this ${r.kind} ad for its idea. You are given what the ad is and the 1 reason it works, and nothing of how it is built. ${own} Take the idea and make it ${brandName}'s: everything else is yours. Put 1 line at the start of \`notes\` saying the idea you took.`, header(r), `The idea: ${ideaOf(a)}`, `Do not borrow: ${clip(a.do_not_transfer, 400)}`].join("\n")
            : [
                "## The reference ad: what made it work",
                `The person chose this ${r.kind} ad for what made it work. You are given why it worked, not its script. ${own} What is below shapes how this ad opens and how it persuades. Where it names a device of form (a rhythm, a count of beats, a run of very short lines), that is what the other brand did and never a rule for your sentences: yours are said the way a person talks. Put 1 line at the start of \`notes\` naming what you built on.`,
                header(r),
                `How it persuades: ${clip(a.mechanism, 900)}`,
                `What to borrow: ${clip(a.transferable_principles, 1500)}`,
                ...readingLines(a),
                `Do not borrow: ${clip(a.do_not_transfer, 600)}`,
            ].join("\n");
    }
    if (mode === "principles" && ideaOnly) {
        return [
            `REFERENCE MODE C: THE IDEA ONLY.`,
            `The user chose this ${r.kind} ad for its idea. You are given what the ad is and the 1 reason it works, and nothing of how it is built. Write ${brandName}'s own script from its research with the skill's own structure and the beat table above. Take the idea and make it ${brandName}'s: everything else is yours. Put 1 line at the start of \`notes\` saying the idea you took.`,
            header(r),
            `The idea: ${ideaOf(a)}`,
            `Do not borrow: ${clip(a.do_not_transfer, 400)}`,
        ].join("\n");
    }
    if (mode === "principles") {
        return [
            `REFERENCE MODE C: WHAT MADE IT WORK (principles only).`,
            `The user chose this ${r.kind} ad for what made it work. You are given why it worked, not its script. Write the script from ${brandName}'s research with the skill's own structure and the beat table above. The principles below are the base of the ad: they shape the hook device and how the ad persuades. Do not rebuild the reference's sequence. Put 1 line at the start of \`notes\` naming the principle you built on.`,
            header(r),
            `How it persuades: ${clip(a.mechanism, 900)}`,
            `What to borrow: ${clip(a.transferable_principles, 1500)}`,
            ...readingLines(a),
            `Do not borrow: ${clip(a.do_not_transfer, 600)}`,
        ].join("\n");
    }
    const words = b ? referenceWords(b) : 0;
    return [
        `REFERENCE MODE B: STEP BY STEP, MADE FOR ${brandName}.`,
        `Rebuild this ${r.kind} ad for ${brandName} one step at a time. Follow the skill's "Reference modes" section, mode B. Work in 2 passes.`,
        `- Pass 1, read it. For each numbered row below: what happens, and what that step does for the buyer (stops the scroll, names the problem, makes the mechanism visible, proves it, asks for the sale).`,
        `- Pass 2, make it ${brandName}'s. For each step, write the line that does the same job for ${brandName}'s buyer, with its product, its customers' language, its approved claims and its offers. Keep the order of the steps, the hook device and the rhetorical pattern (repetition, list, reveal) wherever they hold for this brand.`,
        `- The reference is another brand's ad, so not every step carries over. Where a step rests on something ${brandName} does not have (a kind of person, a setting, a way the product is used, a fact, an offer), replace it with what does that job truthfully for ${brandName}. Where nothing does, drop the step or join it to the next one. Never bend the brand to fit the reference.`,
        `- Pacing follows the reference loosely: about the same length overall, and a line takes about as long to say as its row. A step may run shorter or longer where ${brandName}'s story needs it.`,
        `- Every word is new and belongs to ${brandName}. Share no phrase of 6 or more words with the reference and take none of its claims, numbers or offer terms.`,
        `- If the device rests on a fact (a price drop, a new formula, a result), use only a fact the brand brain supports. If none fits, keep the shape of the device and build it on a fact that is true.`,
        `- Person, tense, register and hook type follow the reference where they differ from the controls above. The beat table above does not apply: the steps are the beat table.`,
        words ? `- Word target: about ${words} spoken words${b && b.duration ? ` (the reference says ${words} in ${b.duration} seconds)` : ""}. This replaces the word target above.` : "",
        `- \`visual_note\` for each line describes the shot that does that step's job with ${brandName}'s product, in ${brandName}'s world. Take the row's framing and pace where they still fit. Never carry over a setting or a prop that belongs to the other brand's product.`,
        `- A row that says 0 words is a silent shot. Write no line for it: describe it at the end of the previous line's \`visual_note\`. Never write a stage direction such as "[music]" as spoken text.`,
        `- Never carry over a real person, a celebrity, a meme of a real person or a third party's character from the reference's shots. Replace it with a generic equivalent that does the same job.`,
        `- Start \`notes\` with the step map: row -> what it did -> what yours does. Mark a step "changed" or "dropped" where you departed, with the reason in a few words.`,
        header(r),
        b?.device ? `The device: ${b.device}` : `How it persuades: ${clip(a.mechanism, 600)}`,
        b ? `Look and sound: ${clip(b.style, 300)}${b.kind === "video" ? ` Voice: ${clip(b.audio.voice, 120)}; ${clip(b.audio.delivery, 160)}. Music: ${clip(b.audio.music, 120)}.` : ""}` : "",
        b ? `The reference, row by row (its words are shown for rhythm and pattern only):\n${shotList(b)}` : `What happens: ${clip(a.observations, 1500)}\nSpoken (for structure only): ${clip(a.transcript, 2500)}`,
        ...readingLines(a),
        `Do not borrow: ${clip(a.do_not_transfer, 600)}`,
    ]
        .filter(Boolean)
        .join("\n");
}
export function productionReference(mode: ReferenceMode | null | undefined, r: RefInfo, b: RefBreakdown | null): string {
    const a = r.analysis;
    if (mode === "exact" && b) {
        return [
            `SAME AD, NEW FORMAT. The script below is this reference ad's own words. Rebuild the ad exactly in the new format: every numbered row is 1 shot, in this order, with these timings (scale them evenly if the total has to change), this action and framing, and these spoken words verbatim. Change only the visual format. Do not cut, add or reword lines.`,
            b.kind === "video" ? `Look and pace: ${clip(b.style, 300)} People: ${clip(b.people, 240)} Voice: ${clip(b.audio.voice, 120)}; ${clip(b.audio.delivery, 160)}. Music: ${clip(b.audio.music, 120)}.` : `Look: ${clip(b.style, 300)}`,
            shotList(b),
        ].join("\n");
    }
    if (mode === "structure" && b) {
        return [`STEP BY STEP. The script was written step by step on this reference ad: each line does the job of 1 of its rows, for this brand. Where a line does the same job as its row, take that row's framing, pace and editing rhythm. Where the script changed or dropped a step, the script wins. The words, the product, the setting and the props are the script's, never the reference's.`, `Look and pace: ${clip(b.style, 300)}`, shotList(b)].join("\n");
    }
    return [`A ${r.kind} ad, used as loose inspiration for craft. ${header(r)}`, `What happens: ${clip(a.observations, 900)}`, `How it persuades: ${clip(a.mechanism, 600)}`, `What to borrow: ${clip(a.transferable_principles, 900)}`, `Do not borrow: ${clip(a.do_not_transfer, 400)}`].join("\n");
}
const LOAD_BEARING: Beat[] = ["mechanism", "proof", "offer", "problem"];
export function exactScript(b: RefBreakdown): {
    lines: ScriptLine[];
    first_frame: string;
    seconds: number;
    load_bearing_beat: "mechanism" | "proof" | "offer" | "problem";
} {
    const lines: ScriptLine[] = [];
    let first_frame = "";
    if (b.kind === "image") {
        first_frame = clip(b.layout, 400);
        b.elements.forEach((e, i) => lines.push({ beat: i === 0 ? "hook" : e.beat, text: e.text, theme_ids: [], claim_ids: [], on_screen: e.text, visual_note: `${e.role}, ${e.placement}.${i === 0 ? ` Layout: ${clip(b.layout, 600)}` : ""}` }));
    }
    else {
        first_frame = b.shots[0] ? clip(shotLine(b.shots[0]), 400) : "";
        let pending = "";
        for (const s of b.shots) {
            const note = `[${s.start}-${s.end}s] ${shotLine(s)}`;
            if (!s.spoken) {
                if (lines.length)
                    lines[lines.length - 1].visual_note += ` Then ${note}`;
                else
                    pending += `${note} Then `;
                if (lines.length && s.on_screen_text)
                    lines[lines.length - 1].on_screen = [lines[lines.length - 1].on_screen, s.on_screen_text].filter(Boolean).join(" / ");
                continue;
            }
            lines.push({ beat: lines.length === 0 ? "hook" : s.beat, text: s.spoken, theme_ids: [], claim_ids: [], on_screen: s.on_screen_text, visual_note: pending + note });
            pending = "";
        }
    }
    const seen = new Map<string, number>();
    for (const l of lines)
        if (l.on_screen)
            seen.set(l.on_screen, (seen.get(l.on_screen) ?? 0) + 1);
    const shown = new Set<string>();
    for (const l of lines) {
        if (!l.on_screen || (seen.get(l.on_screen) ?? 0) < 3)
            continue;
        if (shown.has(l.on_screen))
            l.on_screen = "";
        else
            shown.add(l.on_screen);
    }
    const weight = new Map<Beat, number>();
    for (const l of lines)
        weight.set(l.beat, (weight.get(l.beat) ?? 0) + wordCount(l.text));
    const load = LOAD_BEARING.reduce((best, x) => ((weight.get(x) ?? 0) > (weight.get(best) ?? 0) ? x : best), "mechanism" as Beat);
    return { lines, first_frame, seconds: Math.round(b.duration), load_bearing_beat: load as "mechanism" | "proof" | "offer" | "problem" };
}
