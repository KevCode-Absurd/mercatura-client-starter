import { RunStoppedError } from "../llm/run-control";
import { getChat, getMessage, listMessages, patchAction, renameChat, updateMessage } from "./store";
import { runAction } from "./tools";
import { readTurn } from "./turn";
function nextSteps(tools: string[], checked: boolean): string[] {
    const out: string[] = [];
    if (!checked && tools.some((t) => t === "make_images" || t === "write_scripts" || t === "write_copy" || t === "make_from_script"))
        out.push("Check the claims in these");
    if (tools.includes("make_images"))
        out.push("Write headlines and primary text for these");
    if (tools.includes("write_scripts"))
        out.push("Make the first script into a carousel");
    if (tools.includes("write_hooks"))
        out.push("Make a clip of hook 1");
    if (tools.includes("transpose_script"))
        out.push("Make it into a UGC video");
    return out;
}
export async function runChatTurn(messageId: string): Promise<void> {
    const reply = getMessage(messageId);
    if (!reply || reply.role !== "assistant")
        throw new Error("That message is gone.");
    const chat = getChat(reply.chat_id);
    if (!chat)
        throw new Error("That chat is gone.");
    const all = listMessages(chat.id);
    const at = all.findIndex((m) => m.id === messageId);
    const asked = all[at - 1];
    if (!asked || asked.role !== "user")
        throw new Error("There is no message to answer.");
    try {
        if (reply.status === "thinking") {
            const turn = await readTurn(chat.brand_id, asked, all.slice(0, at - 1), messageId);
            updateMessage(messageId, { text: turn.reply, actions: turn.actions, question: turn.question, suggestions: turn.suggestions, sources: turn.sources, read_by: turn.readBy, status: turn.actions.length ? "working" : "done", error: null });
            if (!chat.title_locked && chat.title === "New chat" && turn.title)
                renameChat(chat.id, turn.title, false);
        }
        else
            updateMessage(messageId, { status: "working", error: null });
        for (const a of getMessage(messageId)!.actions) {
            if (a.status === "done")
                continue;
            patchAction(messageId, a.id, { status: "running", error: undefined });
            try {
                await runAction(chat.brand_id, chat.id, a, (result) => void patchAction(messageId, a.id, { result }), messageId);
                patchAction(messageId, a.id, { status: "done" });
            }
            catch (e) {
                if (e instanceof RunStoppedError) {
                    patchAction(messageId, a.id, { status: "waiting" });
                    throw e;
                }
                patchAction(messageId, a.id, { status: "failed", error: (e as Error).message.slice(0, 500) });
                break;
            }
        }
        const done = getMessage(messageId)!;
        const tools = done.actions.filter((a) => a.status === "done").map((a) => a.tool);
        const failed = done.actions.some((a) => a.status === "failed");
        const suggestions = failed ? [] : done.suggestions.length ? done.suggestions : nextSteps(tools, tools.includes("check_claims"));
        updateMessage(messageId, { status: "done", suggestions });
    }
    catch (e) {
        if (e instanceof RunStoppedError)
            updateMessage(messageId, { status: "stopped" });
        else
            updateMessage(messageId, { status: "failed", error: (e as Error).message.slice(0, 500) });
        throw e;
    }
}
