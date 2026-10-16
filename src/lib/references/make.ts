import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AdReferenceRow } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { ALL_BUYERS, CHOICE_LABEL, WHOLE_BRAND, isAllBuyers, isNoOffer, isWholeBrand } from "../choices";
import { enqueue } from "../jobs/queue";
import { loadCreativeKit } from "../production/kit";
import { adReferenceLabel } from "../studio/ad-refs";
import { createRun } from "../studio/engine";
import { productProfile, suggestLayouts } from "../studio/select";
import type { Taste } from "../taste/types";
import { AWARENESS_STAGES, LENGTH_PRESETS, type AwarenessStage, type LengthPreset } from "../taxonomy";
import { buildDirection, scriptsFromReference } from "./build";
import { formatsOf, pictureHere, storedReading } from "./reading";
import { CLOSENESS_INFO, MAX_STATICS, MAX_VIDEOS, STATIC_SIZES, VIDEO_SIZES, refFormat, type Closeness, type MadeFromReference, type MakeFromReference, type RefFormat } from "./reading-types";
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");
export const ALL_BUYERS_NOTE = "These ads are for all of the brand's buyers, not 1 persona: write to what its buyers share, and name no single kind of buyer as the one it is for.";
export function referenceInWords(ref: Pick<AdReferenceRow, "kind" | "title" | "analysis" | "tags" | "source">, closeness: Closeness): string {
    const a = (ref.analysis ?? {}) as Record<string, unknown>;
    const kindOfAd = [...(ref.tags?.format ?? []), ...(ref.tags?.approach ?? [])].slice(0, 4).join(", ");
    const never = "Its words, its claims, its people and its brand are never used.";
    const head = `A reference ad the person chose: "${clip(adReferenceLabel(ref), 80)}", a ${ref.kind} ad${kindOfAd ? ` (${kindOfAd})` : ""}.`;
    if (closeness === "loose")
        return `${head} Loose inspiration only. Why it works: ${clip(a.mechanism, 320)} Take only that. ${never}`;
    const best = storedReading(ref)?.best.slice(0, 3).map((b) => clip(b.part, 110)).join("; ");
    return [
        head,
        closeness === "recreate" ? "Stay as close to its idea, its hook and its order of argument as a still can: this is that ad, made for this brand." : "Keep what makes it work: its idea, its hook device and the way it persuades. The look is this brand's own.",
        `What happens in it: ${clip(a.observations, 420)}`,
        `Why it works: ${clip(a.mechanism, 300)}`,
        best ? `Its best parts: ${best}.` : "",
        never,
    ]
        .filter(Boolean)
        .join(" ");
}
const within = (n: number, most: number) => Math.max(1, Math.min(most, Math.round(n) || 1));
export function makeFromReference(brandId: string, input: MakeFromReference): MadeFromReference {
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, input.referenceId)).get();
    if (!ref)
        throw new Error("That reference is no longer in the library.");
    if (!ref.analyzed)
        throw new Error("Analyse this reference first: a new ad is built on what was found in it.");
    if (!input.statics && !input.videos)
        throw new Error("Choose what to make: a static ad, a video, or both.");
    const brand = loadBrandBrain(brandId);
    const formats = formatsOf(ref);
    const whole = isWholeBrand(input.productId);
    const product = whole ? null : (brand.products.find((p) => p.id === input.productId) ?? null);
    if (!whole && !product)
        throw new Error("Choose what the ad is about: a product, or the whole brand.");
    const persona = brand.personas.find((p) => p.id === input.personaId) ?? null;
    const everyone = isAllBuyers(input.personaId) || !persona;
    const noOffer = isNoOffer(input.offerId);
    const offer = noOffer ? null : (brand.offers.find((o) => o.id === input.offerId) ?? null);
    const stage = (AWARENESS_STAGES as readonly string[]).includes(input.stage) ? (input.stage as AwarenessStage) : undefined;
    const taste: Taste = { look: CLOSENESS_INFO[input.closeness].look };
    const subject = whole ? CHOICE_LABEL[WHOLE_BRAND] : product!.name;
    const said: string[] = [];
    const sets: string[] = [];
    let scripts = 0;
    const queue = (f: RefFormat, o: {
        count: number;
        size?: string;
        length?: LengthPreset;
        hooks?: number;
        keepWords?: boolean;
    }) => {
        const length = o.length && (LENGTH_PRESETS as readonly string[]).includes(o.length) && (!f.lengths || f.lengths.includes(o.length)) ? o.length : f.lengths?.[0];
        try {
            scripts += scriptsFromReference(brandId, {
                referenceId: ref.id,
                mode: o.keepWords ? "exact" : "structure",
                personaId: everyone ? ALL_BUYERS : persona!.id,
                offerId: input.offerId,
                productId: input.productId,
                note: input.note,
                count: within(o.count, MAX_VIDEOS),
                ...(length ? { length } : {}),
                ...(stage ? { stage } : {}),
                ...(typeof input.claimChecks === "boolean" ? { claimChecks: input.claimChecks } : {}),
                ...(o.hooks ? { hooks: o.hooks } : {}),
                taste,
                format: f.type,
                then: { type: f.type!, recipe: f.recipe!, ...(o.size ? { aspect: o.size } : {}) },
            }).queued;
        }
        catch (e) {
            said.push(`${f.label} was not started: ${e instanceof Error ? e.message : String(e)}`);
        }
    };
    if (input.statics) {
        const f = refFormat(formats, input.statics.formatId);
        if (!f || f.medium !== "image")
            throw new Error("Choose a format for the static ad.");
        const sizes = input.statics.sizes.filter((s) => (STATIC_SIZES as readonly string[]).includes(s));
        if (f.how === "script")
            queue(f, { count: input.statics.count, size: sizes[0] });
        else {
            const count = within(input.statics.count, MAX_STATICS);
            const onPicture = pictureHere(ref) && (f.how === "reference" || f.how === "look");
            const variant = (k: number) => buildDirection(input.note, everyone ? null : persona, k + 1, count);
            const label = adReferenceLabel(ref);
            const picks = onPicture
                ? Array.from({ length: count }, (_, k) => ({ refId: ref.id, direction: variant(k), label: `${label}${count > 1 ? ` · ${k + 1}` : ""}`.slice(0, 80), reason: "The reference you picked" }))
                : suggestLayouts(productProfile(brandId, brand, loadCreativeKit(brandId), input.productId), count, { stage, skipBrand: brand.brand.name.toLowerCase() }).map((s, k) => ({ refId: s.ref.id, direction: variant(k), reason: s.reason }));
            if (!picks.length)
                said.push("No static was made: the layout library is empty, and this reference has no picture to build on.");
            else {
                if (picks.length < count)
                    said.push(`The library had ${picks.length} layout${picks.length === 1 ? "" : "s"} that fit, so ${picks.length === 1 ? "1 static was" : `${picks.length} statics were`} started.`);
                const notes = [onPicture ? "" : referenceInWords(ref, input.closeness), everyone ? ALL_BUYERS_NOTE : ""].filter(Boolean).join("\n");
                const id = createRun({
                    brandId,
                    kind: "ad",
                    productId: input.productId,
                    picks,
                    ...(sizes.length ? { aspects: sizes } : {}),
                    notes,
                    title: `${subject}: from ${label}`.slice(0, 120),
                    auto: true,
                    ...(onPicture ? { taste } : {}),
                    productInPicture: input.statics.productInPicture ?? (onPicture ? "shown" : "auto"),
                    buyers: everyone ? [] : [persona!.id],
                    ...(offer ? { offer: offer.id } : {}),
                    ...(noOffer ? { noOffer: true } : {}),
                    ...(stage ? { stage } : {}),
                    formatLook: f.look ?? "none",
                    ...(typeof input.claimChecks === "boolean" ? { claimChecks: input.claimChecks } : {}),
                });
                enqueue(brandId, "studio", id, { op: "plan" });
                sets.push(id);
            }
        }
    }
    if (input.videos) {
        const f = refFormat(formats, input.videos.formatId);
        if (!f || f.medium !== "video" || f.how !== "script")
            throw new Error("Choose a format for the video.");
        queue(f, { count: input.videos.count, size: (VIDEO_SIZES as readonly string[]).includes(input.videos.size) ? input.videos.size : undefined, length: input.videos.length, hooks: input.videos.hooks, keepWords: input.videos.keepWords });
    }
    if (!sets.length && !scripts)
        throw new Error(said[0] ?? "Nothing could be made from that reference.");
    return { sets, scripts, said };
}
