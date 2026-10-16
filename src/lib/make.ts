import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AskIntent, ConceptRow } from "@/db/schema";
import { loadBrandBrain } from "./brands";
import { formatById } from "./catalogue";
import { conceptFromRequest } from "./chat/make";
import { FORMAT_RECIPES } from "./formats";
import { enqueue } from "./jobs/queue";
import { llmEnabled } from "./llm/gateway";
import { offerForPersona } from "./offers/book";
import { avatarForJob, createJob } from "./production/engine";
import { productForConcept } from "./production/kit";
import type { ProductInPicture } from "./product-in-picture";
import { pickPlans } from "./scripts/axes";
import { scriptFields } from "./taste/apply";
import { compactTaste } from "./taste/schema";
import type { Taste } from "./taste/types";
import { LENGTH_PRESETS, type LengthPreset } from "./taxonomy";
export interface MakeRequest {
    workflow?: "guided" | "automatic";
    formatId: string;
    productId: string | null;
    personaId: string | null;
    offerId: string | null;
    conceptId: string | null;
    brief: string;
    length: LengthPreset;
    claimChecks?: boolean;
    hooks?: number;
    variety?: number;
    productInPicture?: ProductInPicture;
    taste?: Taste;
    avatarId?: string | null;
}
export function avatarProblem(brandId: string, avatarId: string, recipeId: string): string | null {
    const recipe = FORMAT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe)
        return "This format has no single person or character on screen, so it can't use a saved avatar. Make it with a new character.";
    try {
        avatarForJob(brandId, avatarId, recipe);
        return null;
    }
    catch (e) {
        return (e as Error).message;
    }
}
export interface MakeStarted {
    conceptId: string;
    jobId: string | null;
    said: string;
}
export function startMake(brandId: string, r: MakeRequest): MakeStarted {
    const format = formatById(r.formatId);
    if (!format || format.start.how !== "script")
        throw new Error("That format is not started from here.");
    const start = format.start;
    const length = (LENGTH_PRESETS as readonly string[]).includes(r.length) && start.lengths.includes(r.length) ? r.length : start.lengths[0];
    const brand = loadBrandBrain(brandId);
    const product = brand.products.find((p) => p.id === r.productId) ?? null;
    const taste = compactTaste(r.taste);
    const avatarId = start.type.startsWith("ai_") && r.avatarId ? r.avatarId : null;
    const refused = avatarId ? avatarProblem(brandId, avatarId, start.recipe) : null;
    const cast: {
        avatarId?: string | null;
    } = avatarId ? { avatarId } : r.avatarId === null && start.type.startsWith("ai_") ? { avatarId: null } : {};
    if (refused)
        throw new Error(refused);
    const then = { type: start.type, recipe: start.recipe, workflow: r.workflow, notes: r.brief.trim().slice(0, 2000) || undefined, ...(product ? { productId: product.id } : {}), ...(r.productInPicture && r.productInPicture !== "auto" ? { productInPicture: r.productInPicture } : {}), ...(Object.keys(taste).length ? { taste } : {}), ...cast };
    if (!llmEnabled()) {
        const script = db.select({ id: schema.scripts.id, concept: schema.scripts.concept_id }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.created_at)).limit(1).get();
        if (!script)
            throw new Error("Writing a script needs live mode, and this brand has no script yet to stand in for one.");
        const jobId = createJob({ scriptId: script.id, type: then.type, recipe: then.recipe, notes: then.notes, productId: then.productId, productInPicture: then.productInPicture, taste, avatarId: then.avatarId, workflow: then.workflow, tag: "net_new", ...(typeof r.claimChecks === "boolean" ? { claimChecks: r.claimChecks } : {}) });
        enqueue(brandId, "production", jobId, { op: "run" });
        return { conceptId: script.concept, jobId, said: `Mock mode: the newest script stands in, and its ${format.label.toLowerCase()} job is on the board.` };
    }
    const existing = r.conceptId ? db.select().from(schema.concepts).where(and(eq(schema.concepts.id, r.conceptId), eq(schema.concepts.brand_id, brandId))).get() : undefined;
    let concept: ConceptRow;
    if (existing)
        concept = existing;
    else {
        const offerId = r.offerId ?? offerForPersona(brandId, { persona_id: r.personaId ?? brand.personas[0]?.id, product_id: product?.id, angle: r.brief })?.id ?? (product ? brand.offers.find((o) => productForConcept(brand, { offer_id: o.id } as ConceptRow) === product.id)?.id : undefined) ?? null;
        const intent: AskIntent = {
            kind: "scripts",
            count: 1,
            product_id: product?.id ?? null,
            persona_ids: r.personaId ? [r.personaId] : [],
            offer_id: offerId,
            concept_id: null,
            reference_id: null,
            reference_mode: null,
            length,
            aspects: [],
            audience: "",
            brief: [product ? `For ${product.name}.` : "", r.brief.trim()].filter(Boolean).join(" "),
            title: `${format.label}${product ? `: ${product.name}` : ""}`,
        };
        concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, conceptFromRequest(brandId, intent))).get()!;
    }
    const plan = pickPlans(1, length, [], { stage: concept.awareness_stage })[0];
    if (!plan)
        throw new Error("No script type fits that length. Pick a longer one.");
    const variety = scriptFields(taste, false).variety ?? r.variety;
    const axes = { ...plan, ...(typeof r.claimChecks === "boolean" ? { claim_checks: r.claimChecks } : {}), ...(r.hooks && r.hooks > 1 ? { hooks: Math.min(5, Math.round(r.hooks)) } : {}), ...(variety ? { variety: Math.min(5, Math.max(1, Math.round(variety))) } : {}), ...(Object.keys(taste).length ? { taste } : {}) };
    enqueue(brandId, "script", concept.id, { axes, turn: 0, format: start.type, then });
    return { conceptId: concept.id, jobId: null, said: r.workflow === "automatic" ? "AI is writing the script, then creating the finished video. You can pause in the run bar." : r.workflow === "guided" ? "The script is being written. Review it in Production to start the next step." : `The script for your ${format.label.toLowerCase()} is being written. Its job appears on the board when it is ready, with the plan to approve.` };
}
