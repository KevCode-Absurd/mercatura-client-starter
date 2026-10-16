import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ScriptLine, ScriptRow } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { geminiEnabled, geminiJson } from "../llm/gemini";
import { renderPrompt } from "../prompts";
import { scriptWords } from "../script-metrics";
import { listSkills } from "../skills/registry";
import { AWARENESS_INFO, LENGTH_PRESETS, type LengthPreset } from "../taxonomy";
import { nearestLength } from "./reference";
import { DEFAULT_NEEDS, NO_ROOM, PROPS, scoreSurfaces, type LoadBearing, type Needs, type ScriptSurfaces } from "./surface-types";
import { buyerOf } from "../choices";
export * from "./surface-types";
const NeedOut = z.object({ need: z.enum(["must", "helps", "no"]).catch("no"), why: z.string().default("") });
const Out = z.object({
    load_bearing_beat: z.enum(["mechanism", "proof", "offer", "problem"]),
    edge: z.enum(["invisible", "visible", "terms", "shared_experience"]),
    why: z.string(),
    needs: z.object({ face: NeedOut, unshowable: NeedOut, order: NeedOut, sound: NeedOut, attention: NeedOut, person: NeedOut }),
    length: z.object({ verdict: z.enum(["fits", "too_short", "too_long"]).catch("fits"), recommended: z.enum(LENGTH_PRESETS).catch("60s"), why: z.string().default(""), extend: z.string().default("") }),
    blend: z.string().default(""),
});
function skillText(): string {
    const hit = listSkills().find((s) => s.name === "script-surfaces");
    const file = hit ? path.join(env.SKILLS_DIR, hit.path, "SKILL.md") : "";
    return file && fs.existsSync(file) ? fs.readFileSync(file, "utf-8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim() : "(script-surfaces skill not installed)";
}
const toLoadBearing = (b: string): LoadBearing => (["mechanism", "proof", "offer", "problem"].includes(b) ? (b as LoadBearing) : "problem");
const scriptAsText = (lines: ScriptLine[]) => lines.map((l, i) => `${i + 1}. [${l.beat}] ${l.text}${l.on_screen ? `\n   on screen: ${l.on_screen}` : ""}${l.visual_note ? `\n   picture: ${l.visual_note}` : ""}`).join("\n");
export function squeezedBeats(lines: Pick<ScriptLine, "beat">[], length: LengthPreset): string[] {
    const present = new Set(lines.map((l) => l.beat as string));
    return (NO_ROOM[length] ?? []).filter((b) => present.has(b));
}
export function rulesSurfaces(script: Pick<ScriptRow, "lines" | "load_bearing_beat" | "est_seconds" | "axes" | "version">): ScriptSurfaces {
    const lb = toLoadBearing(script.load_bearing_beat);
    const d = DEFAULT_NEEDS[lb];
    const planned = (LENGTH_PRESETS as readonly string[]).includes(script.axes.length) ? (script.axes.length as LengthPreset) : nearestLength(script.est_seconds);
    const squeezed = squeezedBeats(script.lines, planned);
    const needs = Object.fromEntries(PROPS.map((p) => [p, { need: d.needs[p], why: "The usual need of a script that rests on this beat. No model has read this script yet." }])) as Needs;
    return {
        checked_at: new Date().toISOString(),
        by: "rules",
        version: script.version,
        load_bearing_beat: lb,
        edge: d.edge,
        why: "Taken from the beat the writer named as load-bearing.",
        needs,
        fits: scoreSurfaces(needs, lb),
        length: { seconds: script.est_seconds, planned, verdict: squeezed.length ? "too_short" : "fits", recommended: squeezed.length ? (planned === "15s" ? "30s" : "60s") : planned, why: squeezed.length ? `A ${planned} ad has no room for: ${squeezed.join(", ")}.` : "", extend: "", squeezed },
        blend: "",
    };
}
export async function checkSurfaces(scriptId: string): Promise<ScriptSurfaces> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error(`Script ${scriptId} not found`);
    let result = rulesSurfaces(script);
    if (geminiEnabled()) {
        const brand = loadBrandBrain(script.brand_id);
        const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
        const persona = buyerOf(brand, concept?.persona_id);
        const p = renderPrompt("script-surfaces", {
            brand_name: brand.brand.name,
            skill: skillText(),
            lengths: LENGTH_PRESETS.join(", "),
            context: [`Brand: ${brand.brand.name}, ${brand.brand.category}.`, `Products: ${brand.products.map((x) => `${x.name} (${x.format})`).join("; ")}`, persona ? `Buyer: ${persona.name}. ${persona.summary}` : "", concept ? `Angle: ${concept.angle}` : "", `Awareness stage: ${AWARENESS_INFO[script.awareness_stage].label}`, `The writer named the load-bearing beat as: ${script.load_bearing_beat}`, script.axes.native ? "This was written as a native long-copy static: it will be read, not heard." : ""].filter(Boolean).join("\n"),
            seconds: String(script.est_seconds),
            words: String(scriptWords(script.lines)),
            length: script.axes.length,
            script: scriptAsText(script.lines),
        });
        const out = await geminiJson({ brandId: script.brand_id, task: "script_surfaces", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: 3000, refType: "script", refId: script.id });
        const needs = out.needs;
        if (out.load_bearing_beat === "mechanism" && out.edge === "invisible" && needs.unshowable.need !== "must")
            needs.unshowable = { need: "must", why: needs.unshowable.why || "The mechanism works where no camera can film it, so the ad has to draw it." };
        if (script.axes.native) {
            needs.sound = { need: "no", why: "Written to be read, not heard." };
            if (needs.order.need === "must")
                needs.order = { need: "helps", why: `${needs.order.why} As long copy it is read top to bottom, so the copy carries its own order.` };
        }
        const order = LENGTH_PRESETS as readonly LengthPreset[];
        const longer = (a: LengthPreset) => order[Math.min(order.length - 1, order.indexOf(a) + 1)];
        const recommended = result.length.squeezed.length && order.indexOf(out.length.recommended) <= order.indexOf(result.length.planned as LengthPreset) ? longer(result.length.planned as LengthPreset) : out.length.recommended;
        result = {
            ...result,
            by: env.MODEL_REFERENCE,
            load_bearing_beat: out.load_bearing_beat,
            edge: out.edge,
            why: out.why.trim(),
            needs,
            fits: scoreSurfaces(needs, out.load_bearing_beat),
            length: { ...result.length, verdict: result.length.squeezed.length ? "too_short" : out.length.verdict, recommended, why: [result.length.squeezed.length ? result.length.why : "", out.length.why.trim()].filter(Boolean).join(" "), extend: out.length.extend.trim() },
            blend: out.blend.trim(),
        };
    }
    db.update(schema.scripts).set({ surfaces: result }).where(eq(schema.scripts.id, scriptId)).run();
    return result;
}
export async function checkSurfacesQuietly(scriptId: string): Promise<void> {
    try {
        await checkSurfaces(scriptId);
    }
    catch (e) {
        console.error(`[surfaces] ${scriptId}: ${(e as Error).message.slice(0, 160)}`);
    }
}
