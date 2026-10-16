import { BrandBrainError, type BrandBrain } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { CREATIVE_TYPES } from "@/lib/chat/creative-types";
import { callName, SKILL_CALLS } from "@/lib/chat/skill-calls";
import { getChat, listChats } from "@/lib/chat/store";
import { chatView } from "@/lib/chat/view";
import { llmEnabled } from "@/lib/llm/gateway";
import { pastTime } from "@/lib/jobs/past-time-server";
import { exampleOf } from "../formats/examples";
import { offerBook } from "@/lib/offers/book";
import type { Mention } from "./actions";
import { ChatScreen } from "./chat-screen";
export default async function ChatPage({ searchParams }: {
    searchParams: Promise<{
        c?: string;
    }>;
}) {
    const brand = await activeBrand();
    const sp = await searchParams;
    let brain: BrandBrain | null = null;
    try {
        brain = loadBrandBrain(brand.id);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    if (!brain)
        return (<div className="px-6 pt-7">
        <h1 className="display text-4xl">Chat</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">This brand has no brand brain yet, so there is nothing for the chat to read. Set the brand up on the Brand brain screen first.</p>
      </div>);
    const row = sp.c ? getChat(sp.c) : undefined;
    const active = row && row.brand_id === brand.id ? row : undefined;
    const mentions: Mention[] = [
        ...brain.personas.map((x) => ({ type: "persona" as const, id: x.id, label: x.name, hint: x.summary })),
        ...brain.products.map((x) => ({ type: "product" as const, id: x.id, label: x.name, hint: x.format })),
        ...offerBook(brand.id, brain).map((x) => ({ type: "offer" as const, id: x.id, label: x.name, hint: x.say || x.terms })),
    ];
    const product = brain.products[0]?.name;
    const persona = brain.personas[0]?.name;
    const examples = [product ? `6 image ads for ${product}` : "", persona ? `3 scripts, 30 seconds each, for ${persona}` : "", product ? `8 headlines for ${product}` : "", persona ? `What stops ${persona} from buying?` : "", product ? `A carousel about ${product}` : ""].filter(Boolean);
    const types = CREATIVE_TYPES.map((t) => ({ id: t.id, group: t.group, label: t.label, what: t.what, thumb: t.example ? exampleOf(t.example) : null }));
    const skills = SKILL_CALLS.map((c) => ({ id: c.skill, group: c.group, label: callName(c), gives: c.gives, needs: c.needs }));
    const chats = listChats(brand.id).map((c) => ({ id: c.id, title: c.title, at: c.updated_at, busy: false }));
    return <ChatScreen key={`${brand.id}:${active?.id ?? "new"}`} initial={active ? chatView(active) : null} chats={chats} mentions={mentions} types={types} skills={skills} examples={examples} live={llmEnabled()} turnTime={pastTime("chat", "turn")}/>;
}
