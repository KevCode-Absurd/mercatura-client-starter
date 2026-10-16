"use server";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { creativeType } from "@/lib/chat/creative-types";
import { brandNames } from "@/lib/chat/names";
import { listAngles } from "@/lib/builder/store";
import { skillCall } from "@/lib/chat/skill-calls";
import { AWARENESS_STAGES } from "@/lib/taxonomy";
import { addMessage, createChat, deleteChat, getMessage, listChats, liveMessageIds, listMessages, ownChat, renameChat, updateMessage } from "@/lib/chat/store";
import type { ChatListItem, ChatView } from "@/lib/chat/types";
import { chatView } from "@/lib/chat/view";
import { enqueue } from "@/lib/jobs/queue";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you typed.") : errorText(e) });
function busyChats(brandId: string): Set<string> {
    const rows = db.select({ id: schema.chatMessages.id, chat: schema.chatMessages.chat_id }).from(schema.chatMessages).where(and(eq(schema.chatMessages.brand_id, brandId), inArray(schema.chatMessages.status, ["thinking", "working"]))).all();
    const live = liveMessageIds(rows.map((r) => r.id));
    return new Set(rows.filter((r) => live.has(r.id)).map((r) => r.chat));
}
async function chatList(brandId: string): Promise<ChatListItem[]> {
    const busy = busyChats(brandId);
    return listChats(brandId).map((c) => ({ id: c.id, title: c.title, at: c.updated_at, busy: busy.has(c.id) }));
}
const ids = z.array(z.string().max(80)).max(12).default([]);
const Send = z.object({
    chatId: z.string().max(40).nullable().default(null),
    text: z.string().trim().min(2, "Say what you want.").max(6000),
    via: z.enum(["typed", "voice"]).default("typed"),
    tags: z
        .object({ personas: ids, products: ids, offers: ids, references: ids, made: z.array(z.object({ type: z.enum(["set", "image", "script", "job"]), id: z.string().max(80), item: z.string().max(80).optional() })).max(6).default([]), format: z.string().max(60).nullable().optional(), skill: z.string().max(60).nullable().optional(), stage: z.enum(AWARENESS_STAGES).nullable().optional(), angle: z.string().max(80).nullable().optional() })
        .default({ personas: [], products: [], offers: [], references: [], made: [] }),
});
export async function sendChatAction(input: z.input<typeof Send>): Promise<Result<{
    chat: ChatView;
    chats: ChatListItem[];
}>> {
    try {
        const o = Send.parse(input);
        const brandId = await activeBrandId();
        const chat = o.chatId ? ownChat(brandId, o.chatId) : createChat(brandId);
        if (busyChats(brandId).has(chat.id))
            return { ok: false, error: "The last message is still being worked on. Wait for it, or stop it from the bar at the bottom." };
        const names = brandNames(brandId, o.tags.references);
        const tags = {
            personas: o.tags.personas.filter((id) => names.personas.some((p) => p.id === id)),
            products: o.tags.products.filter((id) => names.products.some((p) => p.id === id)),
            offers: o.tags.offers.filter((id) => names.offers.some((x) => x.id === id)),
            references: names.references.map((r) => r.id),
            made: o.tags.made,
            ...(creativeType(o.tags.format) ? { format: o.tags.format! } : {}),
            ...(skillCall(o.tags.skill) ? { skill: o.tags.skill! } : {}),
            ...(o.tags.stage ? { stage: o.tags.stage } : {}),
            ...(o.tags.angle && listAngles(brandId).some((a) => a.id === o.tags.angle) ? { angle: o.tags.angle } : {}),
        };
        addMessage(chat, { role: "user", text: o.text, via: o.via, tags });
        const reply = addMessage(chat, { role: "assistant", status: "thinking" });
        enqueue(brandId, "chat", reply.id, { op: "turn" });
        revalidatePath("/chat");
        return { ok: true, chat: chatView(ownChat(brandId, chat.id)), chats: await chatList(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function chatViewAction(chatId: string | null): Promise<Result<{
    chat: ChatView | null;
    chats: ChatListItem[];
}>> {
    try {
        const brandId = await activeBrandId();
        return { ok: true, chat: chatId ? chatView(ownChat(brandId, chatId)) : null, chats: await chatList(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function retryChatAction(messageId: string): Promise<Result<{
    chat: ChatView;
    chats: ChatListItem[];
}>> {
    try {
        const brandId = await activeBrandId();
        const m = getMessage(messageId);
        if (!m || m.brand_id !== brandId || m.role !== "assistant")
            return { ok: false, error: "That message is gone." };
        if (liveMessageIds([m.id]).has(m.id))
            return { ok: false, error: "It is already being worked on." };
        const unread = !m.actions.length && !m.text.trim() && !m.question;
        updateMessage(m.id, { status: unread ? "thinking" : "working", error: null, actions: m.actions.map((a) => (a.status === "done" ? a : { ...a, status: "waiting" as const, error: undefined })) });
        enqueue(brandId, "chat", m.id, { op: "turn" });
        return { ok: true, chat: chatView(ownChat(brandId, m.chat_id)), chats: await chatList(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
const Step = z.object({ jobId: z.string().max(40), step: z.enum(["approve", "run", "redo", "skip_motion"]), instruction: z.string().trim().max(1200).default(""), selected: z.number().int().min(0).max(12).optional() });
export async function chatJobStepAction(chatId: string, input: z.input<typeof Step>): Promise<Result<{
    chat: ChatView;
}>> {
    try {
        const o = Step.parse(input);
        const brandId = await activeBrandId();
        const chat = ownChat(brandId, chatId);
        const job = db.select({ brand: schema.outputJobs.brand_id }).from(schema.outputJobs).where(eq(schema.outputJobs.id, o.jobId)).get();
        if (!job || job.brand !== brandId)
            return { ok: false, error: "That ad no longer exists." };
        if (!listMessages(chat.id).some((m) => m.actions.some((a) => a.result.job_ids?.includes(o.jobId))))
            return { ok: false, error: "That ad was not made in this chat." };
        const running = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(inArray(schema.jobs.kind, ["chat", "production"]), eq(schema.jobs.ref_id, o.jobId), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (running)
            return { ok: false, error: "It is already being worked on." };
        if (o.step === "redo" && o.instruction.length < 4)
            return { ok: false, error: "Say what should be different." };
        enqueue(brandId, "chat", o.jobId, { op: "job_step", step: o.step, instruction: o.instruction, ...(o.selected != null ? { selected: o.selected } : {}) });
        revalidatePath("/production");
        return { ok: true, chat: chatView(chat) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function renameChatAction(chatId: string, title: string): Promise<Result<{
    chats: ChatListItem[];
}>> {
    try {
        const brandId = await activeBrandId();
        ownChat(brandId, chatId);
        if (title.trim().length < 1)
            return { ok: false, error: "Give it a name." };
        renameChat(chatId, title);
        return { ok: true, chats: await chatList(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteChatAction(chatId: string): Promise<Result<{
    chats: ChatListItem[];
}>> {
    try {
        const brandId = await activeBrandId();
        ownChat(brandId, chatId);
        if (busyChats(brandId).has(chatId))
            return { ok: false, error: "It is working. Stop it from the bar at the bottom first." };
        deleteChat(chatId);
        revalidatePath("/chat");
        return { ok: true, chats: await chatList(brandId) };
    }
    catch (e) {
        return fail(e);
    }
}
export interface Mention {
    type: "persona" | "product" | "offer" | "reference";
    id: string;
    label: string;
    hint: string;
    kind?: "image" | "video";
}
export async function findReferencesAction(q: string): Promise<Mention[]> {
    const t = schema.adReferences;
    const term = q.trim().slice(0, 40);
    const rows = db
        .select({ id: t.id, title: t.title, kind: t.kind, source: t.source })
        .from(t)
        .where(term ? like(t.title, `%${term.replace(/[%_]/g, "")}%`) : eq(t.source, "user"))
        .orderBy(desc(t.source), desc(t.synced_at))
        .limit(8)
        .all();
    return rows.map((r) => ({ type: "reference" as const, id: r.id, label: r.title, kind: r.kind, hint: `${r.kind === "video" ? "Video" : "Image"} reference${r.source === "user" ? ", added by you" : ""}` }));
}
