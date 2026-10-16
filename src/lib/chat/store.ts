import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ChatAction, ChatActionResult, ChatMessageRow, ChatRow, ChatTags } from "@/db/schema";
const nextChatId = () => {
    const all = db.select({ id: schema.chats.id }).from(schema.chats).all();
    return `chat_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
export const getChat = (id: string): ChatRow | undefined => db.select().from(schema.chats).where(eq(schema.chats.id, id)).get();
export function ownChat(brandId: string, id: string): ChatRow {
    const row = getChat(id);
    if (!row || row.brand_id !== brandId)
        throw new Error("That chat is not one of this brand's.");
    return row;
}
export function createChat(brandId: string, title = "New chat"): ChatRow {
    const id = nextChatId();
    db.insert(schema.chats).values({ id, brand_id: brandId, title: title.slice(0, 80) }).run();
    return getChat(id)!;
}
export function listChats(brandId: string, limit = 60): ChatRow[] {
    return db.select().from(schema.chats).where(eq(schema.chats.brand_id, brandId)).orderBy(desc(schema.chats.updated_at)).limit(limit).all();
}
export function renameChat(id: string, title: string, locked = true) {
    db.update(schema.chats).set({ title: title.trim().slice(0, 80) || "New chat", title_locked: locked }).where(eq(schema.chats.id, id)).run();
}
export function deleteChat(id: string) {
    db.delete(schema.chatMessages).where(eq(schema.chatMessages.chat_id, id)).run();
    db.delete(schema.chats).where(eq(schema.chats.id, id)).run();
}
export const getMessage = (id: string): ChatMessageRow | undefined => db.select().from(schema.chatMessages).where(eq(schema.chatMessages.id, id)).get();
export function listMessages(chatId: string): ChatMessageRow[] {
    return db.select().from(schema.chatMessages).where(eq(schema.chatMessages.chat_id, chatId)).orderBy(asc(schema.chatMessages.seq)).all();
}
export function addMessage(chat: ChatRow, m: {
    role: "user" | "assistant";
    text?: string;
    via?: "typed" | "voice";
    tags?: ChatTags;
    status?: ChatMessageRow["status"];
}): ChatMessageRow {
    const last = db.select({ seq: schema.chatMessages.seq }).from(schema.chatMessages).where(eq(schema.chatMessages.chat_id, chat.id)).orderBy(desc(schema.chatMessages.seq)).limit(1).get();
    const seq = (last?.seq ?? 0) + 1;
    const id = `${chat.id}_m${seq}`;
    db.insert(schema.chatMessages)
        .values({ id, brand_id: chat.brand_id, chat_id: chat.id, seq, role: m.role, text: (m.text ?? "").slice(0, 6000), via: m.via ?? "typed", tags: m.tags ?? { personas: [], products: [], offers: [], references: [], made: [] }, status: m.status ?? "done", actions: [], question: null, suggestions: [], sources: [] })
        .run();
    db.update(schema.chats).set({ updated_at: new Date().toISOString() }).where(eq(schema.chats.id, chat.id)).run();
    return getMessage(id)!;
}
export function updateMessage(id: string, set: Partial<Pick<ChatMessageRow, "text" | "status" | "actions" | "question" | "suggestions" | "sources" | "read_by" | "error">>): ChatMessageRow {
    db.update(schema.chatMessages).set({ ...set, updated_at: new Date().toISOString() }).where(eq(schema.chatMessages.id, id)).run();
    return getMessage(id)!;
}
export function patchAction(messageId: string, actionId: string, patch: Partial<Omit<ChatAction, "result">> & {
    result?: Partial<ChatActionResult>;
}): ChatAction | undefined {
    const row = getMessage(messageId);
    if (!row)
        return undefined;
    const actions = row.actions.map((a) => (a.id === actionId ? { ...a, ...patch, result: { ...a.result, ...(patch.result ?? {}) } } : a));
    updateMessage(messageId, { actions });
    return actions.find((a) => a.id === actionId);
}
export function liveMessageIds(ids: string[]): Set<string> {
    if (!ids.length)
        return new Set();
    const rows = db.select({ ref: schema.jobs.ref_id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "chat"), inArray(schema.jobs.ref_id, ids), inArray(schema.jobs.status, ["queued", "running", "paused"]))).all();
    return new Set(rows.map((r) => r.ref!));
}
