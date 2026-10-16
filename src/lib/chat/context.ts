import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChatMessageRow, ChatTags } from "@/db/schema";
import { writingBrain } from "../claims-through";
import { brandPack } from "../llm/context";
import { withBrain } from "../brain/brief";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import { KIND_INFO } from "../library/taxonomy";
import { listAngles } from "../builder/store";
import { listPersonas } from "../personas/store";
import { researchText } from "../studio/checks";
import { OUTPUT_INFO } from "../taxonomy";
import { creativeType, typeWords } from "./creative-types";
import { callName, skillCall } from "./skill-calls";
import { storedHooks } from "../references/hooks";
import { referenceDirection } from "./make";
import type { AskContext } from "./request-types";
export interface Made {
    sets: {
        id: string;
        title: string;
        kind: string;
        product: string;
        items: {
            n: number;
            id: string;
            title: string;
            texts: {
                role: string;
                text: string;
            }[];
            rendered: boolean;
        }[];
    }[];
    scripts: {
        id: string;
        title: string;
        seconds: number;
        opening: string;
    }[];
    jobs: {
        id: string;
        label: string;
        title: string;
        next: string;
        video: boolean;
    }[];
    copy: {
        what: string;
        options: string[];
    }[];
    hooks?: {
        reference_id: string;
        title: string;
        ids: string[];
    }[];
}
export function madeIn(messages: Pick<ChatMessageRow, "actions">[]): Made {
    const ids = { sets: [] as string[], scripts: [] as string[], jobs: [] as string[], refs: [] as string[] };
    const copy: Made["copy"] = [];
    const add = (list: string[], id?: string) => void (id && !list.includes(id) && list.push(id));
    for (const m of messages)
        for (const a of m.actions) {
            add(ids.sets, a.result.set_id);
            for (const s of a.result.script_ids ?? [])
                add(ids.scripts, s);
            for (const j of a.result.job_ids ?? [])
                add(ids.jobs, j);
            if (a.result.copy)
                copy.push({ what: a.result.copy.what, options: a.result.copy.options.map((o) => o.text) });
            if (a.tool === "write_hooks")
                add(ids.refs, a.result.reference_id);
        }
    const refs = ids.refs.length ? db.select({ id: schema.adReferences.id, title: schema.adReferences.title }).from(schema.adReferences).where(inArray(schema.adReferences.id, ids.refs)).all() : [];
    const sets = ids.sets.length ? db.select().from(schema.studioRuns).where(inArray(schema.studioRuns.id, ids.sets)).all() : [];
    const scripts = ids.scripts.length ? db.select().from(schema.scripts).where(inArray(schema.scripts.id, ids.scripts)).all() : [];
    const jobs = ids.jobs.length ? db.select().from(schema.outputJobs).where(inArray(schema.outputJobs.id, ids.jobs)).all() : [];
    const titles = new Map((jobs.length ? db.select({ id: schema.scripts.id, title: schema.scripts.title }).from(schema.scripts).where(inArray(schema.scripts.id, jobs.map((j) => j.script_id))).all() : []).map((s) => [s.id, s.title]));
    return {
        sets: ids.sets.flatMap((id) => sets.filter((s) => s.id === id)).map((s) => ({
            id: s.id,
            title: s.title,
            kind: KIND_INFO[s.kind].one,
            product: s.product_id ?? "",
            items: s.items.map((x, at) => ({ n: at + 1, id: x.id, title: x.plan?.title || x.label, texts: (x.plan?.text_elements ?? []).map((t) => ({ role: t.role, text: t.text })), rendered: x.outputs.length > 0 })),
        })),
        scripts: ids.scripts.flatMap((id) => scripts.filter((s) => s.id === id)).map((s) => ({ id: s.id, title: s.title, seconds: s.est_seconds ?? 0, opening: (s.lines.find((l) => l.text.trim())?.text ?? "").slice(0, 160) })),
        jobs: ids.jobs.flatMap((id) => jobs.filter((j) => j.id === id)).map((j) => ({ id: j.id, label: OUTPUT_INFO[j.output_type]?.label ?? j.output_type, title: titles.get(j.script_id) ?? j.script_id, next: j.production?.next ?? "done", video: j.output_type.startsWith("ai_") })),
        copy,
        hooks: ids.refs.flatMap((id) => refs.filter((r) => r.id === id)).map((r) => ({ reference_id: r.id, title: r.title, ids: (storedHooks(r.id)?.hooks ?? []).map((h) => h.id) })).filter((h) => h.ids.length),
    };
}
const NEXT_WORDS: Record<string, string> = {
    plan: "its plan is not written yet",
    brief: "its brief is not written yet",
    "approve:plan": "waiting for the person to approve the plan",
    "approve:character": "waiting for the person to approve the character sheet",
    "approve:look": "waiting for the person to approve the look frame",
    "approve:storyboard": "waiting for the person to approve the storyboard",
    render: "plan approved, images not rendered yet",
    character: "the character sheet is next",
    look: "the look frame is next",
    storyboard: "the storyboard is next",
    clips: "everything is approved, the video clips are next",
    finish: "the clips are made; joining them is next",
    motion: "joined and captioned; motion graphics are next, or can be skipped",
    done: "finished",
};
export const nextWords = (next: string) => NEXT_WORDS[next] ?? next;
export function madeText(made: Made): string {
    const out: string[] = [];
    made.sets.forEach((s, at) => {
        const whole = at >= made.sets.length - 2;
        out.push(`${s.id} | ${s.kind} set "${s.title}" | ${s.items.length} image${s.items.length === 1 ? "" : "s"}${s.product ? ` | product ${s.product}` : ""}`);
        if (whole)
            for (const i of s.items)
                out.push(`  image ${i.n} | item_id ${i.id} | "${i.title}"${i.rendered ? "" : " | not rendered"}${i.texts.length ? ` | words: ${i.texts.map((t) => `${t.role}: "${t.text.replace(/\s+/g, " ").slice(0, 140)}"`).join("; ")}` : ""}`);
    });
    for (const s of made.scripts)
        out.push(`${s.id} | script "${s.title}"${s.seconds ? ` | about ${s.seconds} seconds` : ""} | opens: "${s.opening}"`);
    for (const j of made.jobs)
        out.push(`${j.id} | ${j.label} from the script "${j.title}" | ${nextWords(j.next)}`);
    for (const h of made.hooks ?? [])
        out.push(`${h.reference_id} | reference ad "${h.title}" | ${h.ids.length} new hooks written here, numbered 1 to ${h.ids.length}`);
    const last = made.copy[made.copy.length - 1];
    if (last)
        out.push(`copy | the last ${last.what} written here:\n${last.options.map((o, k) => `  ${k + 1}. ${o.replace(/\s+/g, " ").slice(0, 220)}`).join("\n")}`);
    return out.length ? out.join("\n") : "(nothing yet)";
}
const lines = (rows: string[]) => (rows.length ? rows.join("\n") : "(none)");
export interface TurnContext {
    stable: {
        brand: string;
        brand_voice: string;
        lessons: string;
        products: string;
        personas: string;
        offers: string;
        concepts: string;
    };
    own: {
        focus: string;
        research: string;
        tagged: string;
    };
    sources: string[];
}
export function turnContext(brandId: string, text: string, tags: ChatTags, names: AskContext): TurnContext {
    const brand = writingBrain(brandId);
    const pack = brandPack(brand, "focused", { personaIds: tags.personas, offerId: tags.offers[0] ?? null, productId: null, about: text });
    const base = brandPack(brand, "focused", { about: "" });
    const profiles = listPersonas(brandId).filter((p) => tags.personas.includes(p.id));
    const buyers = profiles.map((p) => ({ id: p.id, name: p.name, who: p.who, summary: p.summary, problem: p.problem, wants: p.wants, objections: p.objections, angle: p.angle, awareness: p.awareness, their_words: [...p.language, ...p.sounds_like].slice(0, 10) }));
    const themes = db.select({ id: schema.themes.id }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).limit(1).all().length;
    const research = themes ? researchText(brandId, 5, 2, text) : "(no research imported for this brand yet)";
    const refs = names.references.map((r) => `${r.id} | ${r.kind} | "${r.title}" | ${referenceDirection(r.id)}`);
    const call = skillCall(tags.skill);
    const type = call ? undefined : creativeType(tags.format);
    const tagged = [
        ...(call ? [`skill "${callName(call)}": the person called this skill by name in the message box. Choose ${call.make.tool}${call.make.tool === "make_images" ? ` with kind ${call.make.kind}` : call.make.tool === "make_from_script" ? ` with format ${call.make.format}` : ""} and nothing else; the app runs exactly this skill. Read the message only for what it is about, who it is for, the stage and how many${call.make.tool === "audit_page" ? ", and keep the page's web address in text" : call.make.tool === "transpose_script" ? ", and keep the person and tense asked for in instruction" : ""}`] : []),
        ...(type ? [`creative type ${type.id} (${typeWords(type)}): the person chose this in the message box. Choose ${type.make.tool} with ${type.make.tool === "make_images" ? `kind ${type.make.kind}` : `format ${type.make.format}`} and nothing else; the app makes exactly this type`] : []),
        ...(tags.stage ? [`awareness stage ${tags.stage}: the person chose this in the box. Return it as stage; every ad or script is written for a buyer at this stage`] : []),
        ...names.products.filter((p) => tags.products.includes(p.id)).map((p) => `product ${p.id} (${p.name})`),
        ...names.personas.filter((p) => tags.personas.includes(p.id)).map((p) => `persona ${p.id} (${p.name})`),
        ...names.offers.filter((o) => tags.offers.includes(o.id)).map((o) => `offer ${o.id} (${o.name})`),
        ...listAngles(brandId).filter((a) => a.id === tags.angle).map((a) => `angle ${a.id} (${a.name}: ${a.line}): the person chose this in the box; it is what the ads are about`),
        ...refs.map((r) => `reference ${r}`),
        ...tags.made.map((m) => (m.type === "image" ? `the image item_id ${m.item} of set ${m.id}: the message is about this image` : `${m.type} ${m.id}: the message is about this`)),
    ];
    return {
        stable: {
            brand: JSON.stringify(withBrain(brandId, base.stable)),
            brand_voice: brandVoiceText(brandId, { surfaces: ["headline", "primary_text"] }),
            lessons: learnedRules(brandId, "writes"),
            products: lines(names.products.map((x) => `${x.id} | ${x.name}`)),
            personas: lines(names.personas.map((x) => `${x.id} | ${x.name} | ${[x.gender, x.age].filter(Boolean).join(", ")} | ${x.summary.slice(0, 140)}`)),
            offers: lines(names.offers.map((x) => `${x.id} | ${x.name}`)),
            concepts: lines(names.concepts.slice(-30).map((x) => `${x.id} | ${x.name} | for ${x.persona_id} | ${x.angle.slice(0, 120)}`)),
        },
        own: {
            focus: JSON.stringify({ ...(buyers.length ? { buyers_tagged: buyers } : {}), ...pack.own }),
            research,
            tagged: lines(tagged),
        },
        sources: ["Brand brain", ...profiles.map((p) => `Persona: ${p.name}`), ...(themes ? ["Customer research"] : []), ...names.references.map((r) => `Reference: ${r.title}`)],
    };
}
export function historyText(messages: ChatMessageRow[], keep = 10): string {
    const rows = messages.slice(-keep).map((m) => {
        if (m.role === "user")
            return `Person: ${m.text.replace(/\s+/g, " ").slice(0, 700)}`;
        const did = m.actions.map((a) => `${a.says}${a.status === "failed" ? ` (failed: ${a.error?.slice(0, 120) ?? ""})` : a.status === "done" ? " (done)" : ""}`).join("; ");
        return `You: ${m.text.replace(/\s+/g, " ").slice(0, 500)}${m.question ? ` [you asked: ${m.question.text}]` : ""}${did ? ` [you did: ${did}]` : ""}`;
    });
    return rows.length ? rows.join("\n") : "(this is the first message)";
}
