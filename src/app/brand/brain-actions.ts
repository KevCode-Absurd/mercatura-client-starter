"use server";
import { revalidatePath } from "next/cache";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { clearBriefCache } from "@/lib/brain/brief";
import { addCompetitor, draftCompetitor, readCompetitorSite, removeCompetitor, saveCompetitor } from "@/lib/brain/competitors";
import { addDocSection, addLearning, ensureDocs, isDocId, logChange, removeDocSection, saveSection, type LearningKind } from "@/lib/brain/docs";
import { lookIntoGuidelines, writeTokens } from "@/lib/brain/guide";
import { WINNER_KINDS, addWinner, applyLearning, dismissLearning, learn, restoreLearning, revertLearning, type WinnerInput } from "@/lib/brain/learn";
import { addProduct, pullStore } from "@/lib/brain/products";
import { pullSiteImages, refileSiteImages } from "@/lib/brain/site-images";
import { geminiEnabled } from "@/lib/llm/gemini";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { followMoves, inventory, unreadAssets } from "@/lib/sprint/assets";
import { clearPhotoSheets } from "@/lib/studio/photos";
import { setSetting } from "@/lib/settings";
import { errorText } from "@/lib/plain-message";
type Done<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
async function run<T extends object>(fn: (brandId: string) => Promise<T> | T): Promise<Done<T>> {
    try {
        const row = await activeBrand();
        const out = await fn(row.id);
        clearBriefCache();
        revalidatePath("/brand", "layout");
        return { ok: true, ...out };
    }
    catch (e) {
        return { ok: false, error: errorText(e).slice(0, 400) };
    }
}
const docId = (v: string) => {
    if (!isDocId(v))
        throw new Error("Unknown document.");
    return v;
};
export const saveSectionAction = async (doc: string, sectionId: string, title: string, blocks: unknown) => run((id) => (saveSection(id, docId(doc), sectionId, { title, blocks }), {}));
export const addSectionAction = async (doc: string, title: string, under?: string, level?: number) => run((id) => (addDocSection(id, docId(doc), { title, under, level }), {}));
export const removeSectionAction = async (doc: string, sectionId: string) => run((id) => (removeDocSection(id, docId(doc), sectionId), {}));
export const ensureDocsAction = async () => run((id) => ({ made: ensureDocs(id) }));
export const logChangeAction = async (type: string, description: string, date?: string) => run((id) => (logChange(id, { type, description, date }), {}));
export const addLearningAction = async (kind: string, text: string) => run((id) => {
    if (!["works", "avoid", "questions", "ideas", "productNotes"].includes(kind))
        throw new Error("Unknown kind.");
    addLearning(id, kind as LearningKind, text);
    return {};
});
export const learnNowAction = async () => run((id) => {
    const r = learn(id);
    return { added: r.added, updated: r.updated, pending: r.pending.length };
});
export const applyLearningAction = async (subject: string) => run((id) => (applyLearning(id, subject), {}));
export const dismissLearningAction = async (subject: string) => run((id) => (dismissLearning(id, subject), {}));
export const revertLearningAction = async (subject: string) => run((id) => (revertLearning(id, subject), {}));
export const restoreLearningAction = async (subject: string) => run((id) => (restoreLearning(id, subject), {}));
export const setAutoLearnAction = async (auto: boolean) => run((id) => (setSetting(id, "brain_learning", { auto: !!auto }), {}));
export const addWinnerAction = async (w: {
    kind: string;
    name: string;
    result: string;
    says: string;
    why: string;
    link: string;
}) => run((id) => {
    if (!(WINNER_KINDS as readonly string[]).includes(w.kind))
        throw new Error("Unknown kind.");
    addWinner(id, w as WinnerInput);
    return {};
});
export const addCompetitorAction = async (name: string, url: string) => run((id) => ({ id: addCompetitor(id, { name, url }) }));
export const removeCompetitorAction = async (sectionId: string) => run((id) => (removeCompetitor(id, sectionId), {}));
export const saveCompetitorAction = async (sectionId: string, fields: Record<string, string>) => run((id) => (saveCompetitor(id, sectionId, fields), {}));
export const readCompetitorSiteAction = async (sectionId: string) => run((id) => readCompetitorSite(id, sectionId));
export const draftCompetitorAction = async (sectionId: string) => run((id) => draftCompetitor(id, sectionId));
export const addProductAction = async (name: string) => run((id) => ({ id: addProduct(id, name) }));
export const pullStoreAction = async (url: string, images: boolean) => run(async (id) => {
    if (!url.trim())
        throw new Error("Give the store's address.");
    let currency = "USD";
    try {
        currency = loadBrandBrain(id).brand.currency;
    }
    catch {
    }
    const res = await pullStore(id, url.trim(), { images, currency });
    if (res.added.length)
        logChange(id, { type: "Setup", description: `Catalogue pulled from the store: ${res.added.length} products added, ${res.refreshed.length} refreshed.` });
    return res;
});
export const pullSiteImagesAction = async (url: string) => run(async (id) => {
    if (!url.trim())
        throw new Error("Give the site's address.");
    const res = await pullSiteImages(id, url.trim());
    clearPhotoSheets();
    if (res.saved)
        logChange(id, { type: "Setup", description: `Pictures pulled from the site's pages: ${res.saved} saved, ${res.saved - res.forBrand} with a product and ${res.forBrand} for the whole brand.` });
    return { ...res, waiting: unreadAssets(id), canLook: geminiEnabled() };
});
export const lookAtImagesAction = async () => run(async (id) => {
    const before = unreadAssets(id);
    if (!before)
        return { looked: 0, moved: 0, waiting: 0 };
    if (!geminiEnabled())
        throw new Error("Looking at pictures is switched off on this account. The pictures are saved, and the first set of images you make will look at them.");
    const kit = loadCreativeKit(id);
    const assets = await inventory(id, loadBrandBrain(id), kit, "site_images");
    const moves = await refileSiteImages(id, assets, (productId) => productImageChoices(id, kit, productId).folder);
    followMoves(id, moves);
    clearPhotoSheets();
    const waiting = unreadAssets(id);
    return { looked: before - waiting, moved: moves.length, waiting };
});
export const lookIntoGuidelinesAction = async () => run((id) => lookIntoGuidelines(id));
export const writeTokensAction = async () => run((id) => ({ file: writeTokens(id) }));
