import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow, loadBrandBrain } from "../brands";
import { FOUNDER_HOOKS } from "../hooks/bank-info";
import { DEALS, PARTNERSHIP, RIGHTS, cleanHandle, seedingBrief, type Creator, type Deal } from "./creators";
import { FOUNDER_IDEAS, IDEA_STATUSES, founderIdea, ideaNote, type IdeaStatus } from "./ideas";
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));
const CreatorSchema = z.object({
    id: z.string(),
    handle: z.string().min(2).max(60),
    platform: z.enum(["instagram", "tiktok", "youtube"]).optional(),
    profile_url: z.string().url().max(2000).optional(),
    deal: z.enum(DEALS).default("gifted"),
    sent: day.default(""),
    posted: z.boolean().default(false),
    views: z.number().min(0).default(0),
    avg_views: z.number().min(0).default(0),
    rights: z.enum(RIGHTS).default("none"),
    rights_until: day.default(""),
    partnership: z.enum(PARTNERSHIP).default("none"),
    note: z.string().max(400).default(""),
});
const IdeaState = z.object({ idea: z.string(), status: z.enum(IDEA_STATUSES).default("todo"), href: z.string().max(200).default(""), note: z.string().max(400).default(""), updated_at: z.string().default("") });
const FileSchema = z.object({ handle: z.string().max(60).default(""), plan: z.array(IdeaState).default([]), creators: z.array(CreatorSchema).default([]) });
export type OrganicFile = z.infer<typeof FileSchema>;
export type IdeaRow = z.infer<typeof IdeaState>;
function fileOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return path.join(brandBrainDir(row.dir), "organic.json");
}
export function loadOrganic(brandId: string): OrganicFile {
    const f = fileOf(brandId);
    if (!fs.existsSync(f))
        return { handle: "", plan: [], creators: [] };
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf-8")));
    return parsed.success ? parsed.data : { handle: "", plan: [], creators: [] };
}
const save = (brandId: string, data: OrganicFile) => fs.writeFileSync(fileOf(brandId), `${JSON.stringify(data, null, 2)}\n`);
export function planRows(file: Pick<OrganicFile, "plan">): {
    idea: (typeof FOUNDER_IDEAS)[number];
    status: IdeaStatus;
    href: string;
    note: string;
}[] {
    return FOUNDER_IDEAS.map((idea) => {
        const s = file.plan.find((p) => p.idea === idea.id);
        return { idea, status: s?.status ?? "todo", href: s?.href ?? "", note: s?.note ?? "" };
    });
}
export function setIdea(brandId: string, ideaId: string, patch: {
    status?: IdeaStatus;
    href?: string;
    note?: string;
}): OrganicFile {
    if (!founderIdea(ideaId))
        throw new Error("That video is not in the plan.");
    const data = loadOrganic(brandId);
    const was = data.plan.find((p) => p.idea === ideaId);
    const next: IdeaRow = { idea: ideaId, status: patch.status ?? was?.status ?? "todo", href: patch.href ?? was?.href ?? "", note: (patch.note ?? was?.note ?? "").slice(0, 400), updated_at: new Date().toISOString() };
    const out = { ...data, plan: [...data.plan.filter((p) => p.idea !== ideaId), next] };
    save(brandId, out);
    return out;
}
export function setHandle(brandId: string, handle: string): OrganicFile {
    const out = { ...loadOrganic(brandId), handle: cleanHandle(handle) };
    save(brandId, out);
    return out;
}
export function saveCreator(brandId: string, input: Partial<Creator> & {
    handle: string;
}): OrganicFile {
    const data = loadOrganic(brandId);
    const handle = cleanHandle(input.handle);
    if (!handle)
        throw new Error("Give the creator's handle.");
    const was = input.id ? data.creators.find((c) => c.id === input.id) : undefined;
    if (!was && data.creators.some((c) => c.handle.toLowerCase() === handle.toLowerCase() && (!input.platform || !c.platform || input.platform === c.platform)))
        throw new Error(`${handle} is already on the list.`);
    const id = was?.id ?? `crt_${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, "0")}`;
    const next = CreatorSchema.parse({ ...was, ...input, id, handle });
    const out = { ...data, creators: was ? data.creators.map((c) => (c.id === id ? next : c)) : [...data.creators, next] };
    save(brandId, out);
    return out;
}
export function deleteCreator(brandId: string, id: string): OrganicFile {
    const data = loadOrganic(brandId);
    const out = { ...data, creators: data.creators.filter((c) => c.id !== id) };
    save(brandId, out);
    return out;
}
export function noteForIdea(ideaId: string): string {
    const idea = founderIdea(ideaId);
    if (!idea)
        throw new Error("That video is not in the plan.");
    return ideaNote(idea, idea.like ? (FOUNDER_HOOKS.find((h) => h.id === idea.like)?.beats ?? []) : []);
}
export function seedingBriefFor(brandId: string, productId: string | null, deal: Deal): string {
    const brand = loadBrandBrain(brandId);
    const product = brand.products.find((p) => p.id === productId) ?? brand.products[0];
    const about = product ? `${product.name}. ${product.format}`.replace(/\s+/g, " ").trim() : brand.brand.one_liner;
    return seedingBrief({ brand: brand.brand.name, product: about, handle: loadOrganic(brandId).handle, not_say: brand.forbidden_claims, deal });
}
