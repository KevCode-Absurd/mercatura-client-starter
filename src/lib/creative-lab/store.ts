import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../env";
import { reviewDraft } from "./engine";
import type { LabDraft, LabRevision } from "./types";
const text = z.string().max(20000);
const small = z.string().max(2000);
const art = z.object({ mood: small, palette: small, typography: small, lighting: small, prominence: small, composition: small, setting: small, style: small, camera: small });
const arm = z.object({ headline: text, opening: text, proof: text, layout: text, argument: text, product: small, offer: text, qualification: text });
export const LabDraftSchema = z.object({
    name: small, productId: small, sourceScriptId: small, buyer: text, argument: text, facts: text, qualification: text,
    mode: z.enum(["static", "video", "silent_video"]), body: text, lockedBody: text, bodyLocked: z.boolean(),
    hooks: z.array(z.object({ id: small, spoken: text, visual: text, overlay: text, promise: text, deliveredIn: text, bodyStart: z.number().int().min(0).max(100).default(0) })).max(30), selectedHook: small,
    imageJob: text, headline: text, caption: text, proofPlacement: text, textMode: z.enum(["image_first", "copy_first", "text_free"]), approvedHandoff: small,
    cards: z.array(z.object({ id: small, question: text, newInformation: text, proof: text, transition: text, qualification: text })).max(30),
    targetSeconds: z.number().min(1).max(3600), wordsPerMinute: z.number().min(40).max(300), measuredSeconds: z.number().min(0).max(7200).nullable(), measuredReadName: small,
    readTimings: z.array(z.object({ sceneId: small, speechSeconds: z.number().min(0).max(3600), pauseSeconds: z.number().min(0).max(3600) })).max(100),
    cutdowns: z.array(z.object({ targetSeconds: z.number().min(1).max(3600), hook: text, visual: text, body: text, qualification: text, findings: z.array(small).max(50), sourceBodyHash: small.default(""), callId: small.optional(), providerOutputHash: small.optional(), edited: z.boolean().optional() })).max(30).default([]),
    displayReviews: z.array(z.object({ assetUrl: small, width: z.number().min(100).max(1600), expectedText: text, observedText: text, addedText: text.optional(), packagingText: text.optional(), classification: z.enum(["clear", "uncertain"]).optional(), callId: small.optional(), clipped: z.boolean(), collision: z.boolean(), contrast: z.enum(["readable", "uncertain", "unreadable"]), qualificationVisible: z.boolean(), region: text, source: z.enum(["model", "human"]) })).max(100).default([]),
    grammar: z.enum(["talking", "demonstration", "b_roll", "conversation"]), speaker: z.enum(["illustrative", "real"]),
    scenes: z.array(z.object({ id: small, visual: text, speech: text, overlay: text, seconds: z.number().min(.1).max(3600), pause: z.number().min(0).max(3600), proof: text, objects: z.array(z.object({ name: small, entering: small, leaving: small })).max(30) })).max(100),
    mediaUrl: small.refine(s => !s || /^\/api\/(assets|brand-file)\//.test(s), "Use an existing local asset URL; temporary uploads are preview-only."), mediaKind: z.enum(["image", "video", "audio"]),
    playback: z.array(z.object({ mode: z.enum(["silent", "listening"]), at: z.number().min(0).max(7200), observation: text, issue: text, media: small, actualPlayback: z.boolean() })).max(100),
    art, artBaseline: art, locks: z.array(z.enum(["mood", "palette", "typography", "lighting", "prominence", "composition", "setting", "style", "camera"])).max(9), aspects: z.array(z.enum(["1:1", "4:5", "9:16", "16:9"])).min(1).max(4),
    world: z.object({ location: text, surfaces: text, props: text, casting: text, productReferences: text, illustrationReferences: text, parentVersion: small }), photoReferences: text, selectedPhotoJobs: z.array(z.enum(["identity", "scale", "detail", "use", "contents", "fit", "care"])).max(7),
    reference: z.object({ source: text, fidelity: z.enum(["exact", "structure", "loose"]), device: text, reason: text, preserve: text, change: text, cannotTransfer: text, outputObservation: text }),
    repair: z.object({ region: z.enum(["trigger", "emotion", "evidence", "payoff", "bridge", "action"]), before: text, after: text, observed: text, support: text, preserved: text, applied: z.boolean(), callId: small.optional() }),
    comparison: z.object({ hypothesis: text, variable: z.enum(["headline", "opening", "proof", "layout"]), baseline: arm, variant: arm, assets: z.object({ baseline: small, variant: small }).default({ baseline: "", variant: "" }), preference: text, reason: text }),
});
function file(brandId: string, root: string) { if (!/^[a-zA-Z0-9_-]+$/.test(brandId))
    throw new Error("Invalid brand identity."); return path.join(root, "creative-lab", `${brandId}.json`); }
export function readLab(brandId: string, root = env.DATA_DIR): LabRevision[] {
    const p = file(brandId, root);
    if (!fs.existsSync(p))
        return [];
    const rows = JSON.parse(fs.readFileSync(p, "utf8")) as LabRevision[];
    if (!Array.isArray(rows))
        throw new Error("Creative Lab history is unreadable; its file has been preserved.");
    return rows.map(r => ({ ...r, draft: LabDraftSchema.parse(r.draft) }));
}
export function saveLab(brandId: string, input: unknown, expectedVersion: number, root = env.DATA_DIR): LabRevision {
    const draft: LabDraft = LabDraftSchema.parse(input);
    const p = file(brandId, root);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const lock = `${p}.lock`;
    let fd: number;
    try {
        fd = fs.openSync(lock, "wx");
    }
    catch {
        throw new Error("Another save is in progress. Try again after it finishes.");
    }
    try {
        const rows = readLab(brandId, root);
        const version = rows.at(-1)?.version ?? 0;
        if (version !== expectedVersion)
            throw new Error("A newer revision was saved elsewhere. Reload before saving to keep both versions.");
        const last = rows.at(-1)?.draft;
        if (last?.bodyLocked && draft.bodyLocked && draft.body !== last.lockedBody)
            throw new Error("Unlock the body explicitly before changing it.");
        if (draft.bodyLocked && draft.body !== draft.lockedBody)
            throw new Error("The body lock baseline must equal the actual body.");
        if (draft.bodyLocked && draft.scenes.length && draft.scenes.map(s => s.speech).join(" ").replace(/\s+/g, " ").trim() !== draft.body.replace(/\s+/g, " ").trim())
            throw new Error("Shot dialogue differs from the locked body. Unlock the body explicitly before changing the spoken script.");
        const retainedLocks = last?.locks.filter(k => draft.locks.includes(k) && draft.art[k] !== last.art[k]) ?? [];
        if (retainedLocks.length)
            throw new Error(`Previously locked art changed: ${retainedLocks.join(", ")}. Deliberately unlock those fields before editing.`);
        const lockedChanges = draft.locks.filter(k => draft.art[k] !== draft.artBaseline[k]);
        if (lockedChanges.length)
            throw new Error(`Locked art direction changed: ${lockedChanges.join(", ")}. Restore or unlock those fields.`);
        const revision = { id: randomUUID(), version: version + 1, createdAt: new Date().toISOString(), draft, findings: reviewDraft(draft) };
        const temp = `${p}.${randomUUID()}.tmp`;
        fs.writeFileSync(temp, JSON.stringify([...rows, revision], null, 2) + "\n", "utf8");
        try {
            fs.renameSync(temp, p);
        }
        finally {
            if (fs.existsSync(temp))
                fs.unlinkSync(temp);
        }
        return revision;
    }
    finally {
        fs.closeSync(fd);
        fs.unlinkSync(lock);
    }
}
