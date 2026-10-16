"use server";
import { versionsOf } from "@/lib/scripts/versions";
import { activeBrandId } from "@/lib/brand-context";
import { claimsHeld } from "@/lib/claims-through";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage, videoModel } from "@/lib/media/providers";
import { DEFAULT_RECIPE } from "@/lib/production/engine";
import { loadBrandBrain } from "@/lib/brands";
import { loadCreativeKit, productForScript } from "@/lib/production/kit";
import { avatarKindFor, clipsForScript } from "@/lib/production/prompts";
import { acceptedLengths, videoModelInfo } from "@/lib/media/models";
import { scriptClipLayout } from "@/lib/video/clips-from-script";
import { getConcepts, getScripts } from "@/lib/queries";
import { scriptPace } from "@/lib/scripts/pace";
import { avatarsFor, listAvatars } from "@/lib/avatars/store";
import { avatarLine, type Avatar } from "@/lib/avatars/types";
import { voiceLabel } from "@/lib/avatars/voices";
import { listPackReferences } from "@/lib/avatar-packs/engine";
import { FORMAT_RECIPES } from "@/lib/formats";
import { isVideoRecipe } from "./shared";
export async function pickerDataAction() {
    const brandId = await activeBrandId();
    const concepts = new Map(getConcepts(brandId).map((c) => [c.id, c]));
    const brand = loadBrandBrain(brandId);
    const rates = new Map<string, number>();
    const rateOf = (personaId: string | null) => {
        const key = personaId ?? "";
        if (!rates.has(key))
            rates.set(key, scriptPace(brandId, personaId).rate);
        return rates.get(key)!;
    };
    const scripts = getScripts(brandId).map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        concept_id: s.concept_id,
        concept_name: concepts.get(s.concept_id)?.name ?? s.concept_id,
        beat: s.load_bearing_beat as string,
        awareness: (concepts.get(s.concept_id)?.awareness_stage ?? s.awareness_stage) as string,
        clips: (s.reference_mode !== "exact" && scriptClipLayout(s.lines, s.est_seconds, { rate: rateOf(concepts.get(s.concept_id)?.persona_id ?? null), lengths: acceptedLengths(videoModelInfo(videoModel())) })?.lengths.length) || clipsForScript(s.lines, undefined, rateOf(concepts.get(s.concept_id)?.persona_id ?? null)),
        hasReference: s.reference_ids.length > 0,
        claims: s.axes.claim_checks ?? null,
        versions: versionsOf(s).map((v) => ({ n: v.n, id: v.n === 1 ? "" : (v.hook?.id ?? ""), opens: v.opens })),
        product_id: concepts.has(s.concept_id) ? productForScript(brand, concepts.get(s.concept_id)!, s) : (brand.products[0]?.id ?? null),
        persona_id: concepts.get(s.concept_id)?.persona_id ?? null,
    }));
    const described = (a: Avatar) => !!avatarLine(a);
    const avatars = listAvatars(brandId).filter(described).map((a) => ({ id: a.id, name: a.name, kind: a.kind, persona_id: a.persona_id, portrait: a.portrait, voice: voiceLabel(a.voice) }));
    const avatarsByFormat: Record<string, string[]> = {};
    for (const r of avatars.length ? FORMAT_RECIPES : []) {
        const kind = isVideoRecipe(r) ? avatarKindFor(r) : null;
        const fit = kind ? avatarsFor(brandId, { kind, style: r.id }).filter(described).map((a) => a.id) : [];
        if (fit.length)
            avatarsByFormat[r.id] = fit;
    }
    return { scripts, products: brand.products.map((p) => ({ id: p.id, name: p.name })), avatars, avatarsByFormat, avatarReferences: listPackReferences(brandId), videoModel: videoModel(), defaults: DEFAULT_RECIPE, usage: mediaUsage(), live: llmEnabled(), kit: !!loadCreativeKit(brandId), claims: claimsHeld(brandId) };
}
export type PickerData = Awaited<ReturnType<typeof pickerDataAction>>;
