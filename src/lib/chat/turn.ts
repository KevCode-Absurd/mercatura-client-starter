import { eq } from "drizzle-orm";
import { STORYBOARD_FRAMES, clampFrames } from "../production/prompts";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AskIntent, ChatAction, ChatMessageRow, ChatQuestion, ChatTags, ChatTool } from "@/db/schema";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { listAvatars } from "../avatars/store";
import { avatarProblem } from "../make";
import { lookNamed } from "../studio/worlds";
import { historyText, madeIn, madeText, turnContext, type Made } from "./context";
import { galleryFormat } from "../format-gallery";
import { creativeType, typeWords, type CreativeType } from "./creative-types";
import { brandNames } from "./names";
import { claimsAsked, hooksAsked, countOf, kindOf, lengthOf, readByRule, settle, stageAsked } from "./request";
import { callName, linkIn, skillCall, type SkillCall } from "./skill-calls";
import { AWARENESS_STAGES, OUTPUT_INFO, type OutputType } from "../taxonomy";
import { tasteAsked } from "../taste/ask";
import { clampHooks } from "../scripts/versions";
import { ASK_KINDS, isImageKind, planSentence, type AskContext } from "./request-types";
import { COPY_KINDS, MAKE_FORMATS, type CopyKind, type MakeFormat } from "./types";
export interface Turn {
    reply: string;
    actions: ChatAction[];
    question: ChatQuestion | null;
    suggestions: string[];
    sources: string[];
    readBy: "rules" | "model";
    title: string;
}
const TOOLS = ["make_images", "change_image", "write_scripts", "change_script", "write_copy", "check_claims", "make_from_script", "job_step", "join_clips", "write_hooks", "make_hook_clip", "build_offers", "plan_sprint", "audit_page", "audit_gaps", "print_guide", "founder_questions", "draft_page", "transpose_script", "list_angles", "list_hooks", "organic_plan", "video_editor"] as const;
const MAKERS: readonly string[] = ["make_images", "write_scripts", "make_from_script", "write_hooks", "build_offers", "plan_sprint", "audit_page", "audit_gaps", "print_guide", "founder_questions", "draft_page", "transpose_script", "list_angles", "list_hooks", "organic_plan", "video_editor"];
const str = z.string().nullable().default(null);
const ActionOut = z.object({
    tool: z.string(),
    kind: str,
    count: z.number().nullable().default(null),
    product_id: str,
    persona_ids: z.array(z.string()).nullable().default([]),
    offer_id: str,
    concept_id: str,
    reference_id: str,
    reference_mode: str,
    length: str,
    aspects: z.array(z.string()).nullable().default([]),
    audience: str,
    brief: str,
    title: str,
    target_id: str,
    item_id: str,
    instruction: str,
    rewrite: z.boolean().nullable().default(false),
    text_changes: z.array(z.object({ from: z.string(), to: z.string() })).nullable().default([]),
    copy_kind: str,
    format: str,
    cards: z.number().nullable().default(null),
    step: str,
    text: str,
    claim_checks: z.boolean().nullable().default(null),
    hooks: z.number().nullable().default(null),
    stage: str,
});
const TurnOut = z.object({
    reply: z.string().default(""),
    actions: z.array(ActionOut).max(4).default([]),
    question: z.object({ text: z.string(), options: z.array(z.string()).max(8).default([]) }).nullable().default(null),
    suggestions: z.array(z.string()).max(4).default([]),
    title: z.string().default(""),
});
export interface RawAction {
    tool: string;
    kind: string | null;
    count: number | null;
    product_id: string | null;
    persona_ids: string[];
    offer_id: string | null;
    concept_id: string | null;
    reference_id: string | null;
    reference_mode: string | null;
    length: string | null;
    aspects: string[];
    audience: string;
    brief: string;
    title: string;
    target_id: string | null;
    item_id: string | null;
    instruction: string;
    rewrite: boolean;
    text_changes: {
        from: string;
        to: string;
    }[];
    copy_kind: string | null;
    format: string | null;
    cards: number | null;
    step: string | null;
    text: string;
    claim_checks: boolean | null;
    hooks: number | null;
    stage: string | null;
}
const id = (v: string | null) => (v && v.trim() && !/^(null|none|n\/a)$/i.test(v.trim()) ? v.trim() : null);
const tidy = (a: z.infer<typeof ActionOut>): RawAction => ({
    tool: a.tool,
    kind: id(a.kind),
    count: a.count,
    product_id: id(a.product_id),
    persona_ids: a.persona_ids ?? [],
    offer_id: id(a.offer_id),
    concept_id: id(a.concept_id),
    reference_id: id(a.reference_id),
    reference_mode: id(a.reference_mode),
    length: id(a.length),
    aspects: a.aspects ?? [],
    audience: id(a.audience) ?? "",
    brief: id(a.brief) ?? "",
    title: id(a.title) ?? "",
    target_id: id(a.target_id),
    item_id: id(a.item_id),
    instruction: id(a.instruction) ?? "",
    rewrite: !!a.rewrite,
    text_changes: a.text_changes ?? [],
    copy_kind: id(a.copy_kind),
    format: id(a.format),
    cards: a.cards,
    step: id(a.step),
    text: id(a.text) ?? "",
    claim_checks: a.claim_checks ?? null,
    hooks: a.hooks ?? null,
    stage: id(a.stage),
});
export function framesAsked(text: string): number | null {
    const m = /\b(\d{1,2})\s*(?:storyboard\s+)?(?:frames?|stills?|pictures?)\s*(?:a|per|each|for each|for every|in each|in every)\s*clip\b/i.exec(text) ?? /\bstoryboards?\s+(?:of|with)\s+(\d{1,2})\s*(?:frames?|stills?|pictures?)\b/i.exec(text);
    return m ? clampFrames(Number(m[1])) : null;
}
export function avatarNamed<T extends {
    id: string;
    name: string;
}>(text: string, avatars: T[]): T | null {
    const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, " ").trim();
    const t = ` ${words(text)} `;
    const whole = avatars.filter((a) => words(a.name) && (t.includes(` ${words(a.name)} `) || t.includes(` ${a.id} `))).sort((a, b) => b.name.length - a.name.length)[0];
    if (whole || !/ avatars? /.test(t))
        return whole ?? null;
    const first = (a: T) => words(a.name).split(" ")[0];
    const hits = avatars.filter((a) => first(a).length > 2 && t.includes(` ${first(a)} `));
    return hits.length === 1 ? hits[0] : null;
}
const blank = (tool: string, more: Partial<RawAction> = {}): RawAction => ({ tool, kind: null, count: null, product_id: null, persona_ids: [], offer_id: null, concept_id: null, reference_id: null, reference_mode: null, length: null, aspects: [], audience: "", brief: "", title: "", target_id: null, item_id: null, instruction: "", rewrite: false, text_changes: [], copy_kind: null, format: null, cards: null, step: null, text: "", claim_checks: null, hooks: null, stage: null, ...more });
const BARE_COUNT = /^\s*(?:make |give me |do |i want |i need )?(\d{1,2})\b(?!\s*(?:-|to\b|%|s\b|sec|min|year|yr))/i;
function asType(raw: RawAction[], type: CreativeType, said: string, tags: ChatTags, names: AskContext): RawAction {
    const read = readByRule(said, tags, names);
    const bare = BARE_COUNT.exec(said);
    const found = raw.find((a) => a.tool === "make_images" || a.tool === "write_scripts" || a.tool === "make_from_script");
    const base = found ?? blank("make_images", { product_id: read.product_id, persona_ids: read.persona_ids, offer_id: read.offer_id, reference_id: read.reference_id, reference_mode: read.reference_mode, length: read.length, aspects: read.aspects, audience: read.audience, brief: read.brief });
    const count = base.count ?? countOf(said) ?? (bare ? Number(bare[1]) : null);
    if (type.make.tool === "make_images")
        return { ...base, tool: "make_images", kind: type.make.kind, format: null, count };
    return { ...base, tool: "make_from_script", kind: null, format: type.make.format, target_id: base.tool === "make_from_script" ? base.target_id : null, count };
}
function asSkill(raw: RawAction[], call: SkillCall, said: string, tags: ChatTags, names: AskContext): RawAction {
    const read = readByRule(said, tags, names);
    const bare = BARE_COUNT.exec(said);
    const found = raw.find((a) => MAKERS.includes(a.tool));
    const base = found ?? blank("make_images", { product_id: read.product_id, persona_ids: read.persona_ids, offer_id: read.offer_id, reference_id: read.reference_id, length: read.length, aspects: read.aspects, audience: read.audience, brief: read.brief });
    const count = base.count ?? countOf(said) ?? (bare ? Number(bare[1]) : null);
    const m = call.make;
    if (m.tool === "video_editor")
        return { ...base, tool: m.tool, kind: null, format: m.mode };
    if (m.tool === "make_images")
        return { ...base, tool: "make_images", kind: m.kind, format: null, reference_mode: null, count };
    if (m.tool === "write_scripts")
        return { ...base, tool: "write_scripts", kind: "scripts", format: null, reference_mode: m.start === "research" || m.start === "native" || m.start === "indirect" ? null : m.start, count };
    if (m.tool === "make_from_script")
        return { ...base, tool: "make_from_script", kind: null, format: m.format, target_id: base.tool === "make_from_script" ? base.target_id : null, count };
    return { ...base, tool: m.tool, kind: null, format: null, reference_mode: null, target_id: base.tool === m.tool ? base.target_id : null, count };
}
const numberIn = (text: string): number | null => {
    const m = /(?<![\d.])(\d{1,2})(?!\s*(?:-|to\b|%|s\b|sec|min|year|yr|yo|\d))/i.exec(text.replace(/https?:\/\/\S+/gi, ""));
    return m ? Number(m[1]) : null;
};
export function hookNumber(text: string): number | null {
    const m = /\bhooks?\s*#?(\d{1,2})\b/i.exec(text);
    return m ? Number(m[1]) : imageNumber(text);
}
export function voiceAsked(text: string): {
    person: "first" | "second" | "third" | null;
    tense: "past" | "present" | "future" | null;
} {
    const t = text.toLowerCase();
    const person = /\b(first|1st)[ -]person\b|\bas (me|i)\b|\bin my (own )?(voice|words)\b/.test(t) ? "first" : /\b(second|2nd)[ -]person\b|\bas you\b|\bto the (reader|viewer|buyer)\b/.test(t) ? "second" : /\b(third|3rd)[ -]person\b|\babout (her|him|them)\b|\bas a story about\b/.test(t) ? "third" : null;
    const tense = /\bpast( tense)?\b|\blooking back\b|\bback then\b/.test(t) ? "past" : /\bpresent( tense)?\b|\bright now\b|\bas it happens\b/.test(t) ? "present" : /\bfuture( tense)?\b|\bwhat will\b/.test(t) ? "future" : null;
    return { person, tense };
}
const VOICE_WORDS = (person: string, tense: string) => `the ${person} person, ${tense} tense`;
const hookClipType = (t: string): OutputType => (/\bpodcast\b/i.test(t) ? "ai_podcast" : /\btalking object\b/i.test(t) ? "ai_talking_object" : /\bclay/i.test(t) ? "ai_claymation" : /\b(satisfying|wordless|demo)\b/i.test(t) ? "ai_satisfying" : "ai_ugc");
const pageKindAsked = (t: string) => (/\blisticle\b|\breasons (why|to)\b/i.test(t) ? "listicle" : /\badvertorial\b|\barticle\b|\bstory page\b/i.test(t) ? "advertorial" : "pdp");
const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, last: -1 };
export interface Settled {
    actions: ChatAction[];
    question: ChatQuestion | null;
    notes: string[];
}
export function settleActions(raw: RawAction[], said: string, tags: ChatTags, names: AskContext, made: Made, brandId: string): Settled {
    const out: ChatAction[] = [];
    const notes: string[] = [];
    let question: ChatQuestion | null = null;
    const call = skillCall(tags.skill);
    const type = call ? undefined : creativeType(tags.format);
    if (call?.needs.includes("reference") && !tags.references.length)
        return { actions: [], question: null, notes: [`${callName(call)} works from a reference ad. Tag one with @ or attach it, then ask again.`] };
    const list = call ? [asSkill(raw, call, said, tags, names)] : type ? [asType(raw, type, said, tags, names)] : raw;
    const makes = list.filter((a) => MAKERS.includes(a.tool)).length;
    const by = call ? ` With ${callName(call)}.` : "";
    const push = (tool: ChatTool, says: string, args: Record<string, unknown>) => out.push({ id: `a${out.length + 1}`, tool, says: `${says}${by && MAKERS.includes(tool) ? `${/[.!?]$/.test(says) ? "" : "."}${by}` : ""}`, args, status: "waiting", result: {} });
    const ownSet = (id: string | null) => (id && made.sets.find((s) => s.id === id)) || undefined;
    const ownScript = (id: string | null) => {
        if (!id)
            return undefined;
        const inChat = made.scripts.find((s) => s.id === id);
        if (inChat)
            return inChat;
        const row = db.select({ id: schema.scripts.id, title: schema.scripts.title, brand: schema.scripts.brand_id }).from(schema.scripts).where(eq(schema.scripts.id, id)).get();
        return row && row.brand === brandId ? { id: row.id, title: row.title, seconds: 0, opening: "" } : undefined;
    };
    const intentOf = (a: RawAction, kind: AskIntent["kind"]): AskIntent => {
        const chosen = call?.make.tool === "make_images" ? galleryFormat(call.make.format) : type?.make.tool === "make_images" ? galleryFormat(type.make.format ?? "") : undefined;
        const stage = tags.stage ?? (makes === 1 ? stageAsked(said) : null) ?? (AWARENESS_STAGES as readonly string[]).find((s) => s === a.stage) ?? null;
        const count = (makes === 1 ? countOf(said) : null) ?? a.count ?? chosen?.count?.first ?? (kind === "unknown" ? 1 : ASK_KINDS[kind].usual);
        return {
            kind,
            count,
            product_id: a.product_id,
            persona_ids: a.persona_ids,
            offer_id: a.offer_id,
            concept_id: a.concept_id,
            reference_id: a.reference_id ?? tags.references[0] ?? null,
            reference_mode: (["exact", "structure", "principles"] as const).find((m) => m === a.reference_mode) ?? null,
            length: (makes === 1 ? lengthOf(said) : null) ?? (["15s", "30s", "60s", "2-3m", "5-10m", "10m"] as const).find((l) => l === a.length) ?? null,
            aspects: a.aspects,
            audience: a.audience.slice(0, 160),
            brief: a.brief.slice(0, 1200),
            title: a.title.slice(0, 70),
            claim_checks: a.claim_checks ?? (makes === 1 ? claimsAsked(said) : null),
            hooks: (makes === 1 ? hooksAsked(said) : null) ?? (a.hooks ? clampHooks(a.hooks) : null),
            look: call ? null : type ? (type.make.tool === "make_images" ? (type.make.look ?? null) : null) : lookNamed(makes === 1 ? `${said} ${a.brief}` : a.brief),
            format_id: chosen?.id ?? null,
            layout_type: type?.make.tool === "make_images" ? (type.make.layout ?? null) : null,
            taste: { ...tasteAsked(makes === 1 ? `${said} ${a.brief}` : a.brief), ...(call?.make.tool === "make_images" && call.make.onReference ? { look: "reference" as const } : {}) },
            ...(call ? { skill: call.skill } : {}),
            ...(stage ? { stage: stage as AskIntent["stage"] } : {}),
        };
    };
    for (const a of list.slice(0, 3)) {
        if (!(TOOLS as readonly string[]).includes(a.tool))
            continue;
        const tool = a.tool as ChatTool;
        if (tool === "make_images" || tool === "write_scripts") {
            const kind = tool === "write_scripts" ? "scripts" : ((["image_ads", "product_page", "photoshoot"] as const).find((k) => k === a.kind) ?? "image_ads");
            const s = settle(intentOf(a, kind), tags, names);
            if (s.question) {
                question = { text: s.question.text, options: s.question.options.map((o) => o.label) };
                continue;
            }
            if (s.note)
                notes.push(s.note);
            push(tool, planSentence(s.intent, names), { intent: s.intent });
            continue;
        }
        if (tool === "change_image") {
            const tagged = tags.made.find((m) => m.type === "image");
            const set = ownSet(tagged?.id ?? a.target_id) ?? made.sets[made.sets.length - 1];
            if (!set) {
                notes.push("There is no image in this chat to change yet.");
                continue;
            }
            const item = set.items.find((i) => i.id === (tagged?.item ?? a.item_id)) ?? (set.items.length === 1 ? set.items[0] : undefined);
            if (!item) {
                notes.push(`Say which image of "${set.title}" to change: press the image, or say its number.`);
                continue;
            }
            const changes = a.text_changes.filter((c) => c.from.trim() && c.to.trim() && item.texts.some((t) => t.text.trim() === c.from.trim()));
            const instruction = a.instruction.trim() || said.trim();
            push(tool, `Image ${item.n} of "${set.title}", changed: ${instruction.slice(0, 110)}`, { set_id: set.id, item_id: item.id, instruction: instruction.slice(0, 800), rewrite: a.rewrite && !changes.length, text_changes: changes });
            continue;
        }
        if (tool === "change_script") {
            const tagged = tags.made.find((m) => m.type === "script");
            const script = ownScript(tagged?.id ?? a.target_id) ?? made.scripts[made.scripts.length - 1];
            if (!script) {
                notes.push("There is no script in this chat to change yet.");
                continue;
            }
            push(tool, `The script "${script.title}", rewritten: ${(a.instruction || said).trim().slice(0, 110)}`, { script_id: script.id, instruction: (a.instruction || said).trim().slice(0, 1500) });
            continue;
        }
        if (tool === "write_copy") {
            const kind: CopyKind = (Object.keys(COPY_KINDS) as CopyKind[]).find((k) => k === a.copy_kind) ?? "headlines";
            const info = COPY_KINDS[kind];
            const count = Math.max(1, Math.min(info.max, Math.round((makes === 0 ? countOf(said) : null) ?? a.count ?? info.usual)));
            const has = <T extends {
                id: string;
            }>(rows: T[], id: string | null) => (id && rows.some((r) => r.id === id) ? id : null);
            const product = has(names.products, tags.products[0] ?? a.product_id) ?? (names.products.length === 1 ? names.products[0].id : null);
            const personas = (tags.personas.length ? tags.personas : a.persona_ids).filter((id) => names.personas.some((p) => p.id === id)).slice(0, 4);
            const target = ownSet(a.target_id)?.id ?? ownScript(a.target_id)?.id ?? null;
            const who = names.personas.filter((p) => personas.includes(p.id)).map((p) => p.name);
            const stage = tags.stage ?? (makes === 0 ? stageAsked(said) : null) ?? (AWARENESS_STAGES as readonly string[]).find((s) => s === a.stage) ?? null;
            push(tool, `${count} ${count === 1 ? info.one : info.label.toLowerCase()}${product ? ` for ${names.products.find((p) => p.id === product)?.name}` : ""}${who.length ? `, written for ${who.join(" and ")}` : ""}`, { kind, count, product_id: product, persona_ids: personas, offer_id: has(names.offers, tags.offers[0] ?? a.offer_id), brief: (a.brief || said).slice(0, 1200), audience: a.audience.slice(0, 160), target_id: target, taste: tasteAsked(`${said} ${a.brief}`, false), ...(stage ? { stage } : {}) });
            continue;
        }
        if (tool === "check_claims") {
            const tagged = tags.made[0];
            const id = tagged?.id ?? a.target_id;
            const set = ownSet(id);
            const script = !set ? ownScript(id) : undefined;
            const job = !set && !script ? made.jobs.find((j) => j.id === id) : undefined;
            const pasted = a.text.trim();
            if (set)
                push(tool, `The claims in the images of "${set.title}"`, { target: { type: "set", id: set.id } });
            else if (script)
                push(tool, `The claims in the script "${script.title}"`, { target: { type: "script", id: script.id } });
            else if (job)
                push(tool, `The claims in the ${job.label.toLowerCase()} from "${job.title}"`, { target: { type: "job", id: job.id } });
            else if (pasted.length > 12)
                push(tool, "The claims in the words you gave", { text: pasted.slice(0, 6000), about: "the words you gave" });
            else {
                const copy = made.copy[made.copy.length - 1];
                const lastSet = made.sets[made.sets.length - 1];
                const lastScript = made.scripts[made.scripts.length - 1];
                if (copy)
                    push(tool, `The claims in the ${copy.what.toLowerCase()} written here`, { text: copy.options.join("\n"), about: `the ${copy.what.toLowerCase()} written here` });
                else if (lastSet)
                    push(tool, `The claims in the images of "${lastSet.title}"`, { target: { type: "set", id: lastSet.id } });
                else if (lastScript)
                    push(tool, `The claims in the script "${lastScript.title}"`, { target: { type: "script", id: lastScript.id } });
                else
                    notes.push("There is nothing in this chat to check yet. Paste the words, or make something first.");
            }
            continue;
        }
        if (tool === "make_from_script") {
            const format = MAKE_FORMATS.find((f) => f.id === (a.format as MakeFormat)) ?? MAKE_FORMATS.find((f) => f.id === "static-concept")!;
            const tagged = tags.made.find((m) => m.type === "script");
            const script = ownScript(tagged?.id ?? a.target_id);
            const s = settle({ ...intentOf(a, "scripts"), count: 1 }, tags, names);
            const cards = format.id === "carousel" ? Math.max(2, Math.min(6, Math.round(a.cards ?? 5))) : null;
            const frames = format.type.startsWith("ai_") ? framesAsked(`${a.instruction} ${a.brief}`) : null;
            const avatar = format.type.startsWith("ai_") ? avatarNamed(`${said} ${a.instruction} ${a.brief}`, listAvatars(brandId)) : null;
            const refused = avatar ? avatarProblem(brandId, avatar.id, format.id) : null;
            if (refused) {
                notes.push(refused);
                continue;
            }
            push(tool, `${format.label}${cards ? ` of ${cards} cards` : ""}${format.type.startsWith("ai_") ? `, storyboard of ${frames ?? STORYBOARD_FRAMES.default} frames a clip` : ""}${avatar ? `, with ${avatar.name} on screen` : ""}${script ? ` from the script "${script.title}"` : ", from a script written for it"}`, { format: format.id, type: format.type, script_id: script?.id ?? null, intent: { ...s.intent, title: s.intent.title || format.label }, cards, frames, ...(avatar ? { avatar: avatar.id } : {}), notes: a.instruction.slice(0, 1500), reference_id: s.intent.reference_id });
            continue;
        }
        if (tool === "job_step") {
            const tagged = tags.made.find((m) => m.type === "job");
            const job = made.jobs.find((j) => j.id === (tagged?.id ?? a.target_id)) ?? made.jobs[made.jobs.length - 1];
            if (!job) {
                notes.push("There is no ad in production in this chat yet.");
                continue;
            }
            const step = (["approve", "run", "redo", "skip_motion"] as const).find((x) => x === a.step) ?? "run";
            const says = step === "approve" ? "Approved, and carrying on" : step === "redo" ? `Made again: ${a.instruction.slice(0, 110)}` : step === "skip_motion" ? "Finished without motion graphics" : "The next step";
            push(tool, `${job.label} from "${job.title}". ${says}`, { job_id: job.id, step, instruction: a.instruction.slice(0, 1200) });
            continue;
        }
        if (tool === "write_hooks") {
            const id = tags.references[0] ?? a.reference_id;
            const ref = names.references.find((r) => r.id === id);
            if (!ref) {
                notes.push("Tag the video ad to write new hooks for, with @ or Attach.");
                continue;
            }
            if (ref.kind !== "video") {
                notes.push(`New hooks are written for video ads: "${ref.title}" is not a video.`);
                continue;
            }
            const count = Math.max(3, Math.min(8, Math.round(countOf(said) ?? numberIn(said) ?? a.count ?? 6)));
            push(tool, `${count} new hooks for "${ref.title}", each a 5 second opening to cut onto its front`, { reference_id: ref.id, count, note: (a.instruction || a.brief).slice(0, 1200) });
            continue;
        }
        if (tool === "make_hook_clip") {
            const hooks = made.hooks ?? [];
            const set = hooks[hooks.length - 1];
            if (!set) {
                notes.push("Write new hooks for a reference ad first, then say which one to make as a clip.");
                continue;
            }
            const n = hookNumber(said) ?? (set.ids.length === 1 ? 1 : null);
            const hook = n ? set.ids[n === -1 ? set.ids.length - 1 : n - 1] : undefined;
            if (!hook) {
                notes.push(`"${set.title}" has ${set.ids.length} new hooks: say which one ("make a clip of hook 2").`);
                continue;
            }
            const type = hookClipType(said);
            push(tool, `Hook ${n === -1 ? set.ids.length : n} for "${set.title}", made as a 5 second ${OUTPUT_INFO[type]?.label ?? "video"} clip`, { reference_id: set.reference_id, hook_id: hook, type });
            continue;
        }
        if (tool === "build_offers") {
            const set = (call?.make.tool === "build_offers" && !!call.make.set) || /\boffer set\b/i.test(said);
            const count = Math.max(1, Math.min(set ? 14 : 8, Math.round(countOf(said) ?? numberIn(said) ?? a.count ?? (set ? 12 : 6))));
            push(tool, set ? `The offer set: ${count} offers, 1 for each buyer and stage` : `${count} offer draft${count === 1 ? "" : "s"}, built on the brand's numbers`, { set, count, notes: (a.brief || a.instruction).slice(0, 1200) });
            continue;
        }
        if (tool === "plan_sprint") {
            const picked = (tags.products.length ? tags.products : a.product_id ? [a.product_id] : []).filter((id) => names.products.some((p) => p.id === id));
            const products = picked.length ? picked : names.products.length === 1 ? [names.products[0].id] : [];
            if (!products.length) {
                question = { text: "Which product is the sprint for?", options: names.products.map((p) => p.name) };
                continue;
            }
            const size = Math.max(4, Math.min(60, Math.round(countOf(said) ?? numberIn(said) ?? a.count ?? 50)));
            const each = Math.floor(size / products.length);
            const split = Object.fromEntries(products.map((id, k) => [id, each + (k === 0 ? size - each * products.length : 0)]));
            const personas = (tags.personas.length ? tags.personas : a.persona_ids).filter((id) => names.personas.some((p) => p.id === id));
            push(tool, `A sprint of ${size} ads for ${products.map((id) => names.products.find((p) => p.id === id)?.name).join(" and ")}, planned${personas.length ? ` for ${personas.map((id) => names.personas.find((p) => p.id === id)?.name).join(" and ")}` : ""}. No brief or image is made until the plan is approved`, { size, split, personas, notes: (a.brief || a.instruction).slice(0, 2000) });
            continue;
        }
        if (tool === "audit_page") {
            const url = linkIn(said) ?? linkIn(a.text) ?? linkIn(a.instruction) ?? linkIn(a.brief);
            if (!url) {
                notes.push("Paste the link of the page to audit (https://...), and I will read it on a phone and check it.");
                continue;
            }
            push(tool, `The page ${url}, read on a phone and checked`, { url });
            continue;
        }
        if (tool === "audit_gaps") {
            push(tool, "The account's coverage: where the ads are thin, the winners to vary, the ads with 1 weak part", {});
            continue;
        }
        if (tool === "print_guide") {
            push(tool, "The brand guide and its tokens, rebuilt from the brand brain", {});
            continue;
        }
        if (tool === "list_angles") {
            push(tool, "The angle library: what buyers say most, the phrase with its source, the blind spots, the doubts", {});
            continue;
        }
        if (tool === "organic_plan") {
            push(tool, "The organic plan: the founder's 10 videos and which is next, and the creators list", {});
            continue;
        }
        if (tool === "video_editor") {
            const mode = a.format === "organic" ? "organic" : a.format === "ad" ? "ad" : /\borganic\b/i.test(said) ? "organic" : "ad";
            push(tool, `The ${mode === "organic" ? "organic content" : "ecommerce ad"} editor for your existing footage`, { mode });
            continue;
        }
        if (tool === "list_hooks") {
            const persona = (tags.personas.length ? tags.personas : a.persona_ids).find((id) => names.personas.some((p) => p.id === id)) ?? null;
            const stage = tags.stage ?? stageAsked(said) ?? null;
            push(tool, `The hook bank${persona ? ` for ${names.personas.find((p) => p.id === persona)?.name}` : ""}: who to name first, shapes that fit, the 5 founder hooks`, { persona_id: persona, stage });
            continue;
        }
        if (tool === "founder_questions") {
            push(tool, "Where the founder interview stands, and the next questions", {});
            continue;
        }
        if (tool === "draft_page") {
            const s = settle({ ...intentOf(a, "scripts"), count: 1 }, tags, names);
            if (s.question) {
                question = { text: s.question.text, options: s.question.options.map((o) => o.label) };
                continue;
            }
            const fixed = skillCall(tags.skill)?.make;
            const kind = fixed?.tool === "draft_page" && fixed.kind ? fixed.kind : pageKindAsked(said);
            const product = names.products.find((p) => p.id === s.intent.product_id);
            const who = names.personas.find((p) => p.id === s.intent.persona_ids[0]);
            push(tool, `A ${kind === "pdp" ? "product landing page" : kind === "listicle" ? "listicle page" : "advertorial page"} for ${product?.name ?? "the product"}${who ? `, written for ${who.name}` : ""}`, { kind, product_id: s.intent.product_id, persona_id: s.intent.persona_ids[0] ?? null, offer_id: s.intent.offer_id, angle: s.intent.brief.slice(0, 600) });
            continue;
        }
        if (tool === "transpose_script") {
            const tagged = tags.made.find((m) => m.type === "script");
            const script = ownScript(tagged?.id ?? a.target_id) ?? made.scripts[made.scripts.length - 1];
            if (!script) {
                notes.push("There is no script in this chat to retell yet. Write one first, or press Change on a script and ask again.");
                continue;
            }
            const v = voiceAsked(`${said} ${a.instruction}`);
            push(tool, `The script "${script.title}", told in ${v.person && v.tense ? VOICE_WORDS(v.person, v.tense) : v.person ? `the ${v.person} person` : v.tense ? `the ${v.tense} tense` : "another person and tense"}`, { script_id: script.id, person: v.person, tense: v.tense });
            continue;
        }
        if (tool === "join_clips") {
            const clips = names.references.filter((r) => r.kind === "video").map((r) => r.id);
            if (clips.length < 2) {
                notes.push("Attach 2 or more video clips to this message and I will join them in the order you attach them.");
                continue;
            }
            push(tool, `${clips.length} clips joined into 1 video`, { reference_ids: clips });
        }
    }
    return { actions: question ? [] : out, question, notes };
}
export function imageNumber(text: string): number | null {
    const t = text.toLowerCase();
    const d = /(?:image|ad|photo|number|no\.?|#)\s*(\d{1,2})\b/.exec(t);
    if (d)
        return Number(d[1]);
    const o = new RegExp(`\\b(${Object.keys(ORDINAL).join("|")})\\b`).exec(t);
    return o ? ORDINAL[o[1]] : null;
}
const CHANGE = /\b(change|make it|make the|bigger|smaller|bolder|brighter|darker|swap|replace|remove|fix|redo|again|instead|shorter|longer|rewrite|tweak|move the|less|more)\b/i;
const HELP = "Say what you want made and I will make it here: image ads, product page images, a photoshoot, scripts, headlines and ad copy, a carousel or a video from a script. I can change what I made when you tell me what is wrong, and check its claims against the brand's approved claims. Type @ to name a persona, a product, an offer or a reference.";
export function turnByRule(text: string, tags: ChatTags, names: AskContext, made: Made): {
    reply: string;
    actions: RawAction[];
    suggestions: string[];
} {
    const t = text.toLowerCase();
    const has = { sets: made.sets.length > 0, scripts: made.scripts.length > 0, jobs: made.jobs.length > 0 };
    const taggedImage = tags.made.find((m) => m.type === "image");
    if (/\bclaims?\b/.test(t) && /\b(check|read|verify|review|are|is)\b/.test(t))
        return { reply: "Reading the words against the brand's approved claims.", actions: [blank("check_claims", { target_id: tags.made[0]?.id ?? null, text: text.length > 200 ? text : "" })], suggestions: [] };
    if (/\b(join|stitch|merge|combine)\b/.test(t) && names.references.some((r) => r.kind === "video"))
        return { reply: "Joining the clips in the order you attached them.", actions: [blank("join_clips")], suggestions: [] };
    if (has.jobs && /\b(approve|approved|looks good|go ahead|carry on|continue|next step)\b/.test(t))
        return { reply: "Approved. Carrying on with the next step.", actions: [blank("job_step", { step: "approve" })], suggestions: [] };
    if (has.jobs && /\bskip\b.*\bmotion\b/.test(t))
        return { reply: "Finishing it without motion graphics.", actions: [blank("job_step", { step: "skip_motion" })], suggestions: [] };
    if (/\bcarousels?\b/.test(t))
        return { reply: "Making a carousel. The cards will appear here.", actions: [blank("make_from_script", { format: "carousel", target_id: tags.made.find((m) => m.type === "script")?.id ?? made.scripts[made.scripts.length - 1]?.id ?? null, brief: text, cards: /(\d)\s*cards?/.test(t) ? Number(/(\d)\s*cards?/.exec(t)![1]) : null })], suggestions: ["Check the claims"] };
    if ((taggedImage || has.sets) && CHANGE.test(t) && kindOf(t) === "unknown") {
        const set = made.sets.find((s) => s.id === taggedImage?.id) ?? made.sets[made.sets.length - 1];
        const n = imageNumber(t);
        const item = taggedImage?.item ?? (n ? set?.items[n === -1 ? set.items.length - 1 : n - 1]?.id : undefined) ?? null;
        return { reply: "Making that image again with your note.", actions: [blank("change_image", { target_id: set?.id ?? null, item_id: item, instruction: text })], suggestions: [] };
    }
    if (/\b(video edit(?:or|ing)?|edit (?:my|our|this|the|an?) (?:organic |ad |existing )?(?:video|footage|clips?))\b/.test(t))
        return { reply: "Open the editor to upload and cut your footage.", actions: [blank("video_editor", { format: /\borganic\b/.test(t) ? "organic" : "ad" })], suggestions: [] };
    if (/\bhooks?\b/.test(t) && /\bclip\b/.test(t) && (made.hooks ?? []).length)
        return { reply: "Making that hook as a clip. Its plan will wait for you here.", actions: [blank("make_hook_clip")], suggestions: [] };
    if (/\bhooks?\b/.test(t) && /\b(new|fresh|more|other|different)\b/.test(t) && (tags.references.length || /\b(this|that|the) (ad|video|reference)\b/.test(t)) && names.references.length)
        return { reply: "Writing new openings for the ad, each read against its body.", actions: [blank("write_hooks", { reference_id: tags.references[0] ?? names.references[0].id, count: countOf(text), instruction: text })], suggestions: ["Make a clip of hook 1"] };
    if (/\boffers?\b/.test(t) && /\b(build|design|propose|draft|write|make|new|create|set)\b/.test(t) && !/\b(ads?|scripts?|images?|headlines?|carousels?|videos?)\b/.test(t))
        return { reply: "Building the offers from the brand's numbers and its customers' words.", actions: [blank("build_offers", { count: countOf(text), brief: text })], suggestions: [] };
    if (/\bsprint\b/.test(t)) {
        const named = readByRule(text, tags, names);
        return { reply: "Planning the sprint. The plan waits for you before any brief or image is made.", actions: [blank("plan_sprint", { count: countOf(text), product_id: named.product_id, persona_ids: named.persona_ids, brief: text })], suggestions: [] };
    }
    if (/\b(audit|cro|conversion)\b/.test(t) && linkIn(text))
        return { reply: "Reading the page on a phone and checking it.", actions: [blank("audit_page", { text })], suggestions: [] };
    if (/\b(gaps?|coverage)\b/.test(t) && /\b(creative|account|ads?|where|what|show|find|audit)\b/.test(t) && !/\bimages?\b/.test(t))
        return { reply: "Reading the account for where the ads are thin.", actions: [blank("audit_gaps")], suggestions: [] };
    if (/\bbrand guide\b/.test(t))
        return { reply: "Rebuilding the brand guide from the brand brain.", actions: [blank("print_guide")], suggestions: [] };
    if (/\bfounder\b/.test(t) && /\b(interview|questions?|answers?)\b/.test(t))
        return { reply: "Reading where the founder interview stands.", actions: [blank("founder_questions")], suggestions: [] };
    if (/\blanding page\b|\blisticle\b|\badvertorial page\b/.test(t)) {
        const named = readByRule(text, tags, names);
        return { reply: "Drafting the page from the brand's own facts.", actions: [blank("draft_page", { product_id: named.product_id, persona_ids: named.persona_ids, offer_id: named.offer_id, brief: text })], suggestions: [] };
    }
    if ((has.scripts || tags.made.some((m) => m.type === "script")) && /\btranspose\b|\bretell\b|\b(first|second|third|1st|2nd|3rd)[ -]person\b|\b(past|present|future) tense\b/.test(t))
        return { reply: "Retelling the script in that voice, as a new script beside it.", actions: [blank("transpose_script", { target_id: tags.made.find((m) => m.type === "script")?.id ?? null, instruction: text })], suggestions: [] };
    if (/\b(headlines?|primary text|ad copy|captions?|descriptions?|angles?|hooks?)\b/.test(t) && !/\bscripts?\b/.test(t)) {
        const kind: CopyKind = /headline/.test(t) ? "headlines" : /hook/.test(t) ? "hooks" : /caption/.test(t) ? "captions" : /description/.test(t) ? "descriptions" : /angle/.test(t) ? "angles" : "primary_text";
        const named = readByRule(text, tags, names);
        return { reply: `Writing the ${COPY_KINDS[kind].label.toLowerCase()}.`, actions: [blank("write_copy", { copy_kind: kind, brief: text, product_id: named.product_id, persona_ids: named.persona_ids, offer_id: named.offer_id, audience: named.audience })], suggestions: ["Check the claims in these"] };
    }
    const read = readByRule(text, tags, names);
    if (read.kind === "unknown")
        return { reply: HELP, actions: [], suggestions: ["6 image ads for our best seller", "8 headlines for the main offer", "3 scripts of 30 seconds"] };
    const raw = blank(read.kind === "scripts" ? "write_scripts" : "make_images", { kind: read.kind, count: countOf(text), product_id: read.product_id, persona_ids: read.persona_ids, offer_id: read.offer_id, reference_id: read.reference_id, reference_mode: read.reference_mode, length: read.length, aspects: read.aspects, audience: read.audience, brief: read.brief });
    return { reply: isImageKind(read.kind) ? "Making them now. They will appear here as each one is rendered." : "Writing them now. They will appear here as each one is written.", actions: [raw], suggestions: ["Check the claims in these"] };
}
const clean = (xs: string[]) => [...new Set(xs.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 2 && s.length <= 90))].slice(0, 3);
export async function readTurn(brandId: string, message: ChatMessageRow, before: ChatMessageRow[], refId: string): Promise<Turn> {
    const tags = message.tags;
    const names = brandNames(brandId, tags.references);
    const made = madeIn(before);
    const asked = before[before.length - 1]?.role === "assistant" && before[before.length - 1].question ? before[before.length - 2] : undefined;
    const said = asked ? `${asked.text} ${message.text}` : message.text;
    const carried: ChatTags = asked ? { ...tags, personas: [...new Set([...asked.tags.personas, ...tags.personas])], products: tags.products.length ? tags.products : asked.tags.products, offers: tags.offers.length ? tags.offers : asked.tags.offers, references: [...new Set([...asked.tags.references, ...tags.references])], format: tags.format ?? asked.tags.format ?? null, skill: tags.skill ?? asked.tags.skill ?? null, stage: tags.stage ?? asked.tags.stage ?? null, angle: tags.angle ?? asked.tags.angle ?? null } : tags;
    const all = asked ? brandNames(brandId, carried.references) : names;
    if (!llmEnabled()) {
        const r = turnByRule(said, carried, all, made);
        const s = settleActions(r.actions, said, carried, all, made, brandId);
        const call = skillCall(carried.skill);
        const type = call ? undefined : creativeType(carried.format);
        const byType = !!(call || type) && s.actions.length > 0 && !r.actions.length;
        const editing = call?.make.tool === "video_editor";
        const reply = s.question ? s.question.text : editing ? `Open the ${callName(call!)} to upload and edit your footage.` : byType ? (call ? `Making it now, with ${callName(call)}.` : `Making it now: ${typeWords(type!).toLowerCase()}.`) : s.actions.length || !r.actions.length ? r.reply : "";
        return { reply: [reply, ...s.notes].filter(Boolean).join(" "), actions: s.actions, question: s.question, suggestions: editing ? [] : byType ? ["Check the claims in these"] : s.actions.length ? clean(r.suggestions) : !r.actions.length ? clean(r.suggestions) : [], sources: [], readBy: "rules", title: message.text.split(/\s+/).slice(0, 6).join(" ") };
    }
    const c = turnContext(brandId, said, carried, all);
    const p = renderPrompt("chat-turn", {
        brand_name: all.brandName,
        formats: MAKE_FORMATS.map((f) => `- \`${f.id}\`: ${f.label}`).join("\n"),
        ...c.stable,
        ...c.own,
        made: madeText(made),
        history: historyText(before),
        message: message.text.slice(0, 4000),
    });
    const out = await structuredJson({ brandId, task: "chat_turn", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: TurnOut, effort: "low", maxTokens: 2500, refType: "chat", refId });
    const s = settleActions(out.actions.map(tidy), said, carried, all, made, brandId);
    const question = s.question ?? ((skillCall(carried.skill) || creativeType(carried.format)) && s.actions.length ? null : out.question && out.question.text.trim() ? { text: out.question.text.trim(), options: out.question.options.map((o) => o.trim()).filter(Boolean).slice(0, 6) } : null);
    const reply = s.question ? s.question.text : out.reply.trim();
    return {
        reply: [reply, ...s.notes].filter(Boolean).join(" "),
        actions: question ? [] : s.actions,
        question,
        suggestions: question ? [] : clean(out.suggestions),
        sources: c.sources,
        readBy: "model",
        title: out.title.trim().slice(0, 60),
    };
}
