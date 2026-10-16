"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AtSign, CornerDownLeft, LayoutGrid, Loader2, MessageSquarePlus, Paperclip, Pencil, Plus, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { useAdvanced } from "@/components/mode";
import { VoiceNote } from "@/components/voice-note";
import type { ChatMade } from "@/db/schema";
import { TYPE_GROUPS, type TypeGroup } from "@/lib/chat/creative-types";
import { NEED_WORDS, SKILL_GROUPS, STAGE_CHOICES, type SkillGroup, type SkillNeed } from "@/lib/chat/skill-calls";
import type { ChatListItem, ChatView } from "@/lib/chat/types";
import type { StepTime } from "@/lib/jobs/past-time";
import type { AwarenessStage } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { chatJobStepAction, chatViewAction, deleteChatAction, findReferencesAction, renameChatAction, retryChatAction, sendChatAction, type Mention } from "./actions";
import { Message, type CardHandlers } from "./cards";
export interface TypeOption {
    id: string;
    group: TypeGroup;
    label: string;
    what: string;
    thumb: string | null;
}
export interface SkillOption {
    id: string;
    group: SkillGroup;
    label: string;
    gives: string;
    needs: SkillNeed[];
}
const TYPE_WORD: Record<Mention["type"], string> = { persona: "Persona", product: "Product", offer: "Offer", reference: "Reference" };
const AT = /(?:^|\s)@([^\s@]{0,30})$/;
const SLASH = /(?:^|\s)\/([^/]{0,40})$/;
const when = (iso: string) => {
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    return days < 1 ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : days < 7 ? d.toLocaleDateString([], { weekday: "short" }) : d.toLocaleDateString([], { day: "numeric", month: "short" });
};
export function ChatScreen({ initial, chats: initialChats, mentions, types, skills, examples, live, turnTime }: {
    initial: ChatView | null;
    chats: ChatListItem[];
    mentions: Mention[];
    types: TypeOption[];
    skills: SkillOption[];
    examples: string[];
    live: boolean;
    turnTime?: StepTime;
}) {
    const advanced = useAdvanced();
    const router = useRouter();
    const [chat, setChat] = useState(initial);
    const [chats, setChats] = useState(initialChats);
    const [text, setText] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [tags, setTags] = useState<Mention[]>([]);
    const [attached, setAttached] = useState<Mention[]>([]);
    const [about, setAbout] = useState<{
        made: ChatMade;
        label: string;
    } | null>(null);
    const [menu, setMenu] = useState<{
        query: string;
        type: Mention["type"] | null;
        typed: boolean;
    } | null>(null);
    const [at, setAt] = useState(0);
    const [kind, setKind] = useState<TypeOption | null>(null);
    const [typeMenu, setTypeMenu] = useState(false);
    const [typeQuery, setTypeQuery] = useState("");
    const [skill, setSkill] = useState<SkillOption | null>(null);
    const [skillMenu, setSkillMenu] = useState<{
        query: string;
        typed: boolean;
    } | null>(null);
    const [stage, setStage] = useState<AwarenessStage | null>(null);
    const [stageMenu, setStageMenu] = useState(false);
    const [refs, setRefs] = useState<Mention[]>([]);
    const [uploading, setUploading] = useState(false);
    const [pending, start] = useTransition();
    const box = useRef<HTMLTextAreaElement>(null);
    const file = useRef<HTMLInputElement>(null);
    const end = useRef<HTMLDivElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const stick = useRef(true);
    const chatId = chat?.id ?? null;
    const busy = !!chat?.busy;
    const refresh = useCallback(async () => {
        const res = await chatViewAction(chatId);
        if (!res.ok)
            return;
        if (res.chat)
            setChat(res.chat);
        setChats(res.chats);
    }, [chatId]);
    useEffect(() => {
        if (!busy)
            return;
        return pollWhileVisible(refresh, 2500);
    }, [busy, refresh]);
    const size = chat ? chat.messages.length + chat.messages.reduce((n, m) => n + m.text.length + m.actions.reduce((k, a) => k + a.cards.length + (a.status === "done" ? 1 : 0), 0), 0) : 0;
    useEffect(() => {
        if (stick.current)
            end.current?.scrollIntoView({ block: "end" });
    }, [size]);
    const onScroll = () => {
        const el = scroller.current;
        if (el)
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    };
    useEffect(() => {
        if (!menu || (menu.type && menu.type !== "reference"))
            return;
        let off = false;
        const t = setTimeout(() => void findReferencesAction(menu.query).then((r) => !off && setRefs(r)), 150);
        return () => {
            off = true;
            clearTimeout(t);
        };
    }, [menu]);
    const options = useMemo(() => {
        if (!menu)
            return [];
        const q = menu.query.toLowerCase();
        const fits = (m: Mention) => (!menu.type || m.type === menu.type) && m.label.toLowerCase().includes(q);
        return [...mentions.filter(fits), ...refs.filter(fits)].slice(0, 9);
    }, [menu, mentions, refs]);
    const typeGroups = useMemo(() => {
        const q = typeQuery.trim().toLowerCase();
        const fits = types.filter((t) => !q || `${t.label} ${t.what}`.toLowerCase().includes(q));
        return TYPE_GROUPS.map((g) => ({ ...g, types: fits.filter((t) => t.group === g.id) })).filter((g) => g.types.length);
    }, [types, typeQuery]);
    const pickType = (t: TypeOption | null) => {
        setKind(t);
        setTypeMenu(false);
        setTypeQuery("");
        box.current?.focus();
    };
    const skillGroups = useMemo(() => {
        const q = (skillMenu?.query ?? "").trim().toLowerCase();
        const fits = skills.filter((s) => !q || `${s.label} ${s.gives}`.toLowerCase().includes(q));
        return SKILL_GROUPS.map((g) => ({ ...g, skills: fits.filter((s) => s.group === g.id) })).filter((g) => g.skills.length);
    }, [skills, skillMenu]);
    const firstSkill = useMemo(() => {
        const q = (skillMenu?.query ?? "").trim().toLowerCase();
        const shown = skillGroups.flatMap((g) => g.skills);
        return (q && shown.find((s) => s.label.toLowerCase().includes(q))) || shown[0];
    }, [skillGroups, skillMenu]);
    const pickSkill = (s: SkillOption | null) => {
        if (skillMenu?.typed) {
            const el = box.current;
            const caret = el?.selectionStart ?? text.length;
            const before = text.slice(0, caret);
            const hit = SLASH.exec(before);
            if (hit)
                setText(`${before.slice(0, before.length - hit[1].length - 1)}${text.slice(caret)}`.replace(/^\s+/, ""));
        }
        setSkill(s);
        if (s)
            setKind(null);
        setSkillMenu(null);
        box.current?.focus();
    };
    const openMenu = (type: Mention["type"]) => {
        setTypeMenu(false);
        setSkillMenu(null);
        setStageMenu(false);
        setMenu((cur) => (cur?.type === type && !cur.typed ? null : { query: "", type, typed: false }));
    };
    const typed = (value: string, caret: number) => {
        setText(value);
        setVia("typed");
        const head = value.slice(0, caret);
        const m = AT.exec(head);
        setMenu(m ? { query: m[1], type: null, typed: true } : null);
        const s = SLASH.exec(head);
        setSkillMenu(s ? { query: s[1], typed: true } : null);
        setAt(0);
    };
    const pick = (m: Mention) => {
        const el = box.current;
        const caret = el?.selectionStart ?? text.length;
        const before = text.slice(0, caret);
        const hit = menu?.typed ? AT.exec(before) : null;
        const head = hit ? before.slice(0, before.length - hit[1].length - 1) : `${before}${before && !/\s$/.test(before) ? " " : ""}`;
        setText(`${head}@${m.label} ${text.slice(caret)}`);
        setTags((cur) => (cur.some((t) => t.type === m.type && t.id === m.id) ? cur : [...cur, m]));
        setMenu(null);
        requestAnimationFrame(() => {
            el?.focus();
            const pos = head.length + m.label.length + 2;
            el?.setSelectionRange(pos, pos);
        });
    };
    const attach = async (files: File[]) => {
        setUploading(true);
        try {
            for (const f of files.slice(0, 6)) {
                const form = new FormData();
                form.set("file", f);
                const res = await fetch("/api/references/upload", { method: "POST", body: form });
                const out = (await res.json()) as {
                    ok: true;
                    id: string;
                    duplicate?: boolean;
                } | {
                    ok: false;
                    error: string;
                };
                if (!out.ok) {
                    toast.error(`${f.name}: ${out.error}`);
                    continue;
                }
                const name = f.name.replace(/\.[^.]+$/, "");
                const kind = /\.(mp4|mov|webm)$/i.test(f.name) ? ("video" as const) : ("image" as const);
                setAttached((cur) => (cur.some((t) => t.id === out.id) ? cur : [...cur, { type: "reference", id: out.id, label: name, kind, hint: "" }]));
            }
            box.current?.focus();
        }
        catch {
            toast.error("The file couldn't be sent. Check your connection and try again.");
        }
        finally {
            setUploading(false);
            if (file.current)
                file.current.value = "";
        }
    };
    const say = (words: string, opts: {
        via?: "typed" | "voice";
        plain?: boolean;
    } = {}) => {
        const said = words.trim();
        if (said.length < 2 || pending)
            return;
        const kept = opts.plain ? [] : tags.filter((t) => said.includes(`@${t.label}`));
        const of = (type: Mention["type"]) => kept.filter((t) => t.type === type).map((t) => t.id);
        const references = opts.plain ? [] : [...new Set([...of("reference"), ...attached.map((a) => a.id)])];
        stick.current = true;
        start(async () => {
            const res = await sendChatAction({ chatId, text: said, via: opts.via ?? "typed", tags: { personas: of("persona"), products: of("product"), offers: of("offer"), references, made: !opts.plain && about ? [about.made] : [], format: !opts.plain && kind ? kind.id : null, skill: !opts.plain && skill ? skill.id : null, stage: !opts.plain ? stage : null } });
            if (!res.ok)
                return void toast.error(res.error);
            setChat(res.chat);
            setChats(res.chats);
            if (!opts.plain) {
                setText("");
                setTags([]);
                setAttached([]);
                setAbout(null);
                setMenu(null);
                setKind(null);
                setTypeMenu(false);
                setSkill(null);
                setSkillMenu(null);
                setStage(null);
                setStageMenu(false);
            }
            if (!chatId)
                router.replace(`/chat?c=${res.chat.id}`, { scroll: false });
        });
    };
    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (skillMenu?.typed) {
            const first = firstSkill;
            if ((e.key === "Enter" || e.key === "Tab") && first) {
                e.preventDefault();
                pickSkill(first);
                return;
            }
            if (e.key === "Escape")
                return setSkillMenu(null);
        }
        if (menu && options.length) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setAt((n) => (n + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(options[Math.min(at, options.length - 1)]);
                return;
            }
        }
        if (e.key === "Escape" && menu)
            return setMenu(null);
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            say(text.trim().length >= 2 ? text : skill?.label ?? text, { via });
        }
    };
    const handlers: CardHandlers = {
        advanced,
        pending,
        turnTime,
        onAbout: (made, label) => {
            setAbout({ made, label });
            box.current?.focus();
        },
        onJob: (jobId, step, instruction, selected) => start(async () => {
            if (!chatId)
                return;
            const res = await chatJobStepAction(chatId, { jobId, step, instruction: instruction ?? "", ...(selected != null ? { selected } : {}) });
            if (!res.ok)
                return void toast.error(res.error);
            setChat(res.chat);
        }),
        onSay: (words) => say(words, { plain: true }),
    };
    const retry = (id: string) => start(async () => {
        const res = await retryChatAction(id);
        if (!res.ok)
            return void toast.error(res.error);
        setChat(res.chat);
        setChats(res.chats);
    });
    const rename = (c: ChatListItem) => {
        const title = window.prompt("Name this chat", c.title);
        if (!title?.trim())
            return;
        start(async () => {
            const res = await renameChatAction(c.id, title);
            if (!res.ok)
                return void toast.error(res.error);
            setChats(res.chats);
            if (chat?.id === c.id)
                setChat({ ...chat, title: title.trim() });
        });
    };
    const remove = (c: ChatListItem) => {
        if (!window.confirm(`Take "${c.title}" off the list? What it made stays on its own screens.`))
            return;
        start(async () => {
            const res = await deleteChatAction(c.id);
            if (!res.ok)
                return void toast.error(res.error);
            setChats(res.chats);
            if (chat?.id === c.id)
                router.push("/chat");
        });
    };
    const shownTags = tags.filter((t) => text.includes(`@${t.label}`));
    const last = chat?.messages[chat.messages.length - 1];
    const empty = !chat || chat.messages.length === 0;
    const pop = empty ? "bottom-full mb-1 md:bottom-auto md:top-full md:mb-0 md:mt-1 md:max-h-[min(28rem,38vh)]" : "bottom-full mb-1";
    const filled = (n: SkillNeed) => (n === "stage" ? !!stage : n === "reference" ? attached.length > 0 || shownTags.some((t) => t.type === "reference") : n === "link" ? /https?:\/\/\S+|\b[a-z0-9-]+\.[a-z]{2,}\b/i.test(text) : shownTags.some((t) => t.type === n));
    const askLink = () => {
        setMenu(null);
        setStageMenu(false);
        if (!/https?:\/\//i.test(text))
            setText((cur) => `${cur.trimEnd()}${cur.trim() ? " " : ""}https://`);
        box.current?.focus();
    };
    const missing = skill ? skill.needs.filter((n) => !filled(n)) : [];
    const stageLabel = STAGE_CHOICES.find((s) => s.id === stage)?.label;
    return (<div className="flex h-[calc(100vh-var(--top)-max(3rem,var(--dock))-var(--run-bar,0px))] min-h-[28rem] max-md:flex-col" data-testid="chat">

      <aside className="flex w-60 shrink-0 flex-col border-r border-rule max-md:w-full max-md:flex-row max-md:items-center max-md:border-b max-md:border-r-0" aria-label="Chats">
        <div className="p-4 max-md:shrink-0 max-md:p-3 max-md:pr-1">
          <Link href="/chat" className="flex h-10 max-md:px-3 items-center justify-center gap-2 rounded-lg border bg-card text-sm font-semibold text-primary hover:border-primary/50" data-testid="chat-new">
            <MessageSquarePlus className="size-4"/>
            New chat
          </Link>
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3 max-md:flex max-md:min-w-0 max-md:gap-1 max-md:space-y-0 max-md:overflow-x-auto max-md:py-3" data-testid="chat-list">
          {chats.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">Your chats will be listed here.</li>}
          {chats.map((c) => (<li key={c.id} className={cn("group flex items-center rounded-lg max-md:max-w-44 max-md:shrink-0", c.id === chatId ? "bg-secondary" : "hover:bg-muted")} data-testid="chat-list-item" data-active={c.id === chatId}>
              <Link href={`/chat?c=${c.id}`} className="min-w-0 flex-1 px-2.5 py-2">
                <span className="flex items-center gap-1.5">
                  {c.busy && <Loader2 className="size-3 shrink-0 animate-spin text-primary"/>}
                  <span className={cn("truncate text-sm", c.id === chatId && "font-semibold")}>{c.title}</span>
                </span>
                <span className="block text-xs text-muted-foreground max-md:hidden" suppressHydrationWarning>
                  {when(c.at)}
                </span>
              </Link>
              <span className="hidden shrink-0 items-center pr-1 group-focus-within:flex group-hover:flex">
                <button type="button" onClick={() => rename(c)} className="rounded p-2 text-muted-foreground hover:text-foreground" aria-label={`Rename ${c.title}`} data-testid="chat-rename">
                  <Pencil className="size-3.5"/>
                </button>
                <button type="button" onClick={() => remove(c)} className="rounded p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${c.title}`} data-testid="chat-delete">
                  <Trash2 className="size-3.5"/>
                </button>
              </span>
            </li>))}
        </ul>
      </aside>


      <section className={cn("flex min-w-0 flex-1 flex-col", empty && "md:justify-center md:pb-[12vh]")}>
        <div ref={scroller} onScroll={onScroll} className={cn("min-h-0 overflow-y-auto", empty ? "flex-none" : "flex-1")}>
          <div className={cn("mx-auto w-full max-w-4xl px-6 max-sm:px-4", empty ? "pb-2 pt-6" : "py-6")}>
            {empty ? (<div className="text-center max-md:pt-2" data-testid="chat-empty">
                <h1 className="display text-5xl text-balance max-md:text-4xl xl:text-6xl">What are we making?</h1>
              </div>) : (<>
                <h1 className="display mb-6 border-b pb-3 text-2xl" data-testid="chat-title">
                  {chat!.title}
                </h1>
                <ol className="space-y-6" data-testid="chat-thread">
                  {chat!.messages.map((m) => (<Message key={m.id} m={m} last={m.id === last?.id} h={handlers} onSay={(w) => say(w, { plain: true })} onRetry={retry}/>))}
                </ol>
              </>)}
            <div ref={end} className="h-4"/>
          </div>
        </div>


        <div className={cn("shrink-0 bg-background", empty ? "max-md:order-3 max-md:border-t max-md:border-rule" : "border-t border-rule")}>
          <div className="mx-auto w-full max-w-4xl px-6 py-4 max-sm:px-3 max-sm:py-3">
            <div className="relative rounded-xl border border-input bg-card shadow-sm focus-within:border-primary/50">
              {menu && (<ul role="listbox" aria-label="Tag" className={cn("absolute left-3 z-30 max-h-72 w-[min(28rem,calc(100%-1.5rem))] overflow-y-auto rounded-lg border border-input bg-card py-1 shadow-lg", pop)} data-testid="chat-menu">
                  {options.length ? (options.map((m, k) => (<li key={`${m.type}:${m.id}`} role="option" aria-selected={k === at}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m)} onMouseEnter={() => setAt(k)} className={cn("flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm", k === at && "bg-secondary")} data-testid={`chat-option-${m.type}`}>
                          <span className="w-16 shrink-0 text-xs text-muted-foreground first-letter:uppercase">{TYPE_WORD[m.type]}</span>
                          <span className="min-w-0 flex-1 truncate font-medium">{m.label}</span>
                          <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground sm:block">{m.hint}</span>
                        </button>
                      </li>))) : (<li className="px-3 py-2 text-sm text-muted-foreground">Nothing by that name{menu.type === "reference" ? " in the references" : ""}.</li>)}
                </ul>)}
              {typeMenu && (<div className={cn("absolute left-3 z-30 flex max-h-[min(28rem,60vh)] w-[min(34rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-input bg-card shadow-lg", pop)} data-testid="chat-type-menu">
                  <div className="shrink-0 border-b p-2">
                    <input autoFocus value={typeQuery} onChange={(e) => setTypeQuery(e.target.value)} onKeyDown={(e) => {
                if (e.key === "Escape")
                    pickType(kind);
                if (e.key === "Enter" && typeGroups[0]?.types[0]) {
                    e.preventDefault();
                    pickType(typeGroups[0].types[0]);
                }
            }} placeholder="Find a type: comic, photoshoot, UGC video, carousel" className="h-9 w-full rounded-md border px-2.5 text-sm outline-none focus:border-foreground" aria-label="Find a creative type" data-testid="chat-type-filter"/>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox" aria-label="Creative type">
                    {typeGroups.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No type by that name.</p>}
                    {typeGroups.map((g) => (<div key={g.id}>
                        <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">{g.label}</p>
                        {g.types.map((t) => (<button key={t.id} type="button" role="option" aria-selected={kind?.id === t.id} onClick={() => pickType(t)} className={cn("flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-secondary", kind?.id === t.id && "bg-secondary")} data-testid="chat-type-option" data-type={t.id}>
                            {t.thumb ? (<img src={`/api/assets/${t.thumb}?w=96`} alt="" className="size-11 shrink-0 rounded-md border object-cover" loading="lazy"/>) : (<span className="flex size-10 shrink-0 items-center justify-center rounded-sm border bg-muted text-sm font-bold text-muted-foreground">{t.label.slice(0, 1)}</span>)}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{t.label}</span>
                              <span className="line-clamp-2 block text-xs text-muted-foreground">{t.what}</span>
                            </span>
                          </button>))}
                      </div>))}
                  </div>
                </div>)}
              {skillMenu && (<div className={cn("absolute left-3 z-30 flex max-h-[min(28rem,60vh)] w-[min(34rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-lg border border-input bg-card shadow-lg", pop)} data-testid="chat-skill-menu">
                  {!skillMenu.typed && (<div className="shrink-0 border-b p-2">
                      <input autoFocus value={skillMenu.query} onChange={(e) => setSkillMenu({ query: e.target.value, typed: false })} onKeyDown={(e) => {
                    if (e.key === "Escape")
                        setSkillMenu(null);
                    if (e.key === "Enter" && firstSkill) {
                        e.preventDefault();
                        pickSkill(firstSkill);
                    }
                }} placeholder="Find a recipe: native story, photoshoot, podcast, carousel" className="h-9 w-full rounded-md border px-2.5 text-sm outline-none focus:border-foreground" aria-label="Find a recipe" data-testid="chat-skill-filter"/>
                    </div>)}
                  <div className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox" aria-label="Recipe">
                    {skillGroups.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No recipe by that name.</p>}
                    {skillGroups.map((g) => (<div key={g.id}>
                        <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">{g.label}</p>
                        {g.skills.map((s) => (<button key={s.id} type="button" role="option" aria-selected={skill?.id === s.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pickSkill(s)} className={cn("flex w-full items-start gap-3 px-3 py-1.5 text-left hover:bg-secondary", skill?.id === s.id && "bg-secondary")} data-testid="chat-skill-option" data-skill={s.id}>
                            <Wand2 className="mt-1 size-4 shrink-0 text-primary"/>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">{s.label}</span>
                              <span className="line-clamp-2 block text-xs text-muted-foreground">{s.gives}</span>
                            </span>
                          </button>))}
                      </div>))}
                  </div>
                </div>)}
              {stageMenu && (<ul role="listbox" aria-label="Stage" className={cn("absolute left-3 z-30 w-[min(24rem,calc(100%-1.5rem))] rounded-lg border border-input bg-card py-1 shadow-lg", pop)} data-testid="chat-stage-menu">
                  {STAGE_CHOICES.map((s) => (<li key={s.id} role="option" aria-selected={stage === s.id}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setStage(s.id); setStageMenu(false); box.current?.focus(); }} className={cn("flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary", stage === s.id && "bg-secondary")} data-testid="chat-stage-option" data-stage={s.id}>
                        <span className="w-28 shrink-0 font-medium">{s.label}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{s.hint}</span>
                      </button>
                    </li>))}
                </ul>)}
              {(skill || stage || kind || about || attached.length > 0 || shownTags.length > 0) && (<div className="flex flex-wrap gap-1.5 px-3 pt-2.5" data-testid="chat-tags">
                  {skill && (<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" data-testid="chat-skill-chip">
                      <Wand2 className="size-3"/>
                      {skill.label}
                      <button type="button" onClick={() => setSkill(null)} aria-label="No recipe">
                        <X className="size-3"/>
                      </button>
                    </span>)}
                  {stage && (<span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs" data-testid="chat-stage-chip">
                      <span className="text-muted-foreground">Stage</span>
                      <span className="font-semibold">{stageLabel}</span>
                      <button type="button" onClick={() => setStage(null)} aria-label="No stage">
                        <X className="size-3"/>
                      </button>
                    </span>)}

                  {missing.map((n) => (<button key={n} type="button" onClick={() => (n === "stage" ? (setMenu(null), setStageMenu((cur) => !cur)) : n === "link" ? askLink() : openMenu(n))} className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary" data-testid={`chat-need-${n}`}>
                      <Plus className="size-3"/>
                      {NEED_WORDS[n]}
                    </button>))}
                  {kind && (<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" data-testid="chat-type-chip">
                      {TYPE_GROUPS.find((g) => g.id === kind.group)?.label}: {kind.label}
                      <button type="button" onClick={() => setKind(null)} aria-label="No creative type">
                        <X className="size-3"/>
                      </button>
                    </span>)}
                  {about && (<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" data-testid="chat-about">
                      About: {about.label}
                      <button type="button" onClick={() => setAbout(null)} aria-label="Not about this">
                        <X className="size-3"/>
                      </button>
                    </span>)}
                  {attached.map((t) => (<span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs" data-testid="chat-attached">
                      <Paperclip className="size-3"/>
                      <span className="max-w-48 truncate font-semibold">{t.label}</span>
                      <button type="button" onClick={() => setAttached((cur) => cur.filter((x) => x.id !== t.id))} aria-label={`Remove ${t.label}`}>
                        <X className="size-3"/>
                      </button>
                    </span>))}
                  {shownTags.map((t) => (<span key={`${t.type}:${t.id}`} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                      <span className="text-muted-foreground">{TYPE_WORD[t.type]}</span>
                      <span className="font-semibold">{t.label}</span>
                    </span>))}
                </div>)}
              <textarea ref={box} value={text} onChange={(e) => typed(e.target.value, e.target.selectionStart ?? e.target.value.length)} onKeyDown={onKey} rows={2} placeholder={about ? `Say what should change in ${about.label.toLowerCase()}.` : skill ? `Say what it is about, who it is for and how many. ${skill.label} will make it.` : kind ? `Say what it is about, who it is for and how many. It will be made as: ${kind.label.toLowerCase()}.` : empty ? "Say what you want made" : "Ask for the next thing, or say what should change."} className="block max-h-48 w-full resize-none bg-transparent px-4 pt-3 text-base outline-none placeholder:text-muted-foreground" aria-label="Your message" data-testid="chat-text"/>
              <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-2">
                <button type="button" onClick={() => {
            setMenu(null);
            setTypeMenu(false);
            setStageMenu(false);
            setSkillMenu((cur) => (cur ? null : { query: "", typed: false }));
        }} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold hover:bg-muted", (skillMenu || skill) && "border-primary text-primary")} title="Pick 1 recipe by name" aria-expanded={!!skillMenu} data-testid="chat-skill">
                  <Wand2 className="size-3.5"/>
                  Recipe
                </button>
                <button type="button" onClick={() => {
            setMenu(null);
            setSkillMenu(null);
            setStageMenu(false);
            setTypeMenu((cur) => !cur);
        }} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold hover:bg-muted", (typeMenu || kind) && "border-primary text-primary")} title="Choose exactly what kind of creative is made" aria-expanded={typeMenu} data-testid="chat-type">
                  <LayoutGrid className="size-3.5"/>
                  Creative type
                </button>
                {(["persona", "product", "offer", "reference"] as const).map((type) => (<button key={type} type="button" onClick={() => openMenu(type)} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`chat-tag-${type}`}>
                    <AtSign className="size-3.5"/>
                    {TYPE_WORD[type]}
                  </button>))}
                <button type="button" onClick={() => file.current?.click()} disabled={uploading} className="inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" title="Attach images or videos as references" data-testid="chat-attach">
                  {uploading ? <Loader2 className="size-3.5 animate-spin"/> : <Paperclip className="size-3.5"/>}
                  Attach
                </button>
                <input ref={file} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm" className="hidden" onChange={(e) => e.target.files?.length && void attach([...e.target.files])} data-testid="chat-file-input"/>
                <VoiceNote testId="chat-voice" onText={(t) => {
            setText((cur) => (cur.trim() ? `${cur.trim()} ${t}` : t));
            setVia("voice");
        }}/>
                <button type="button" onClick={() => say(text.trim().length >= 2 ? text : skill?.label ?? text, { via })} disabled={pending || busy || (text.trim().length < 2 && !skill)} className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" title={busy ? "The last message is still being worked on" : ""} data-testid="chat-send">
                  {pending ? <Loader2 className="size-4 animate-spin"/> : <CornerDownLeft className="size-4"/>}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
        {empty && (<div className="mx-auto w-full max-w-4xl px-6 max-md:order-2 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-sm:px-4">
            {examples.length > 0 && (<div className="flex flex-wrap justify-center gap-2.5" data-testid="chat-examples">
                {examples.map((e) => (<button key={e} type="button" onClick={() => typed(e, e.length)} className="min-h-10 rounded-full border bg-card px-4 py-2 text-left text-sm transition hover:border-primary/50 hover:text-primary">
                    {e}
                  </button>))}
              </div>)}
            {!live && <p className="mt-5 text-center text-xs text-muted-foreground">Writing is switched off on this account, so what is made here is a sample.</p>}
          </div>)}
      </section>
    </div>);
}
