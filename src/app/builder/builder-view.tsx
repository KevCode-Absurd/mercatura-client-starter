"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Info, Loader2, MessageSquare, Minus, Pencil, Plus, RotateCcw, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { match, totalOf, why, withEdits } from "@/lib/builder/plan";
import { sharedAge } from "@/lib/copy/stage";
import { MAX_PICTURES, MAX_SCRIPTS, MAX_TEXTS, NO_OFFER, type Chosen, type Combo, type PictureWords } from "@/lib/builder/types";
import { AWARENESS_LABEL, PERSONA_AWARENESS, type PersonaAwareness } from "@/lib/personas/types";
import { AWARENESS_INFO, AWARENESS_STAGES, type AwarenessStage, type LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { HooksPicker } from "@/components/hooks-picker";
import { LengthChoice } from "@/components/length-choice";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { builderStateAction, deleteAngleAction, deleteFormatAction, deleteOfferAction, dropFailedScriptAction, retryScriptAction, reviewScriptAction, saveAngleAction, saveFormatAction, saveOfferAction, savePersonaAction, startBuilderAction, writeOffersAction, writeStarterAction, type BuilderState } from "./actions";
import { ReviewDialog, RunProgressList, ScriptCard, ScriptRow, allText, verdictOf, type Verdict } from "./run-review";
import { scriptHas } from "./script-text";
type Editing = {
    kind: "persona";
    d: {
        id?: string;
        name: string;
        summary: string;
        identity: string;
        problem: string;
        wants: string;
        trigger: string;
        language: string;
        notes: string;
        awareness: PersonaAwareness;
    };
} | {
    kind: "angle";
    d: {
        id?: string;
        name: string;
        line: string;
        persona_ids: string[];
        stages: string[];
        notes: string;
    };
} | {
    kind: "offer";
    d: {
        id?: string;
        name: string;
        price: string;
        terms: string;
        say: string;
        persona_ids: string[];
        stages: string[];
    };
} | {
    kind: "format";
    d: {
        id?: string;
        name: string;
        how: string;
        base: string;
    };
};
const toggle = (xs: string[], id: string) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);
const LISTS = ["products", "stages", "personas", "angles", "offers", "formats"] as const;
type ListKey = (typeof LISTS)[number];
type Sel = Record<ListKey, {
    off: string[];
    n: Record<string, number>;
}>;
const hasFitted = (offers: BuilderState["offers"]) => offers.some((o) => o.fitted && o.id !== NO_OFFER);
const unfitted = (offers: BuilderState["offers"]) => (hasFitted(offers) ? offers.filter((o) => !o.fitted).map((o) => o.id) : []);
const fresh = (offers: BuilderState["offers"]): Sel => ({ products: { off: [], n: {} }, stages: { off: [], n: {} }, personas: { off: [], n: {} }, angles: { off: [], n: {} }, offers: { off: unfitted(offers), n: {} }, formats: { off: [], n: {} } });
type Exact = Record<ListKey, string>;
const FIELD: Record<ListKey, Exclude<keyof Combo, "note">> = { products: "product_id", stages: "stage", personas: "persona_id", angles: "angle_id", offers: "offer_id", formats: "format_id" };
interface Item {
    id: string;
    name: string;
    about: string[];
    edit?: () => void;
}
export function BuilderView({ initial, live }: {
    initial: BuilderState;
    live: boolean;
}) {
    const [state, setState] = useState(initial);
    const [mode, setMode] = useState<"basic" | "advanced">("basic");
    const [sel, setSel] = useState<Sel>(() => fresh(initial.offers));
    const [exact, setExact] = useState<Exact>({ products: "", stages: "", personas: "", angles: "", offers: "", formats: "" });
    const [count, setCount] = useState(5);
    const [texts, setTexts] = useState(1);
    const [pictures, setPictures] = useState(0);
    const [words, setWords] = useState<PictureWords>("without");
    const [notes, setNotes] = useState("");
    const [noting, setNoting] = useState<{
        i: number;
        text: string;
    } | null>(null);
    const [edits, setEdits] = useState<Record<number, Combo>>({});
    const [research, setResearch] = useState(false);
    const [hooks, setHooks] = useState(1);
    const [length, setLength] = useState<LengthPreset | null>(null);
    const [taste, setTaste] = useState<Taste>({});
    const [shown, setShown] = useState<Partial<Record<ListKey, string>>>({});
    const [editing, setEditing] = useState<Editing | null>(null);
    const [busy, start] = useTransition();
    const [review, setReview] = useState<string | null>(null);
    const [showDown, setShowDown] = useState<string[]>([]);
    const [find, setFind] = useState("");
    const [unfolded, setUnfolded] = useState<string[] | null>(null);
    const [siteNote, setSiteNote] = useState(false);
    const siteKey = `ce_site_only_note:${state.brand.id}`;
    useEffect(() => {
        try {
            setSiteNote(localStorage.getItem(siteKey) !== "closed");
        }
        catch {
            setSiteNote(true);
        }
    }, [siteKey]);
    const closeSiteNote = () => {
        setSiteNote(false);
        try {
            localStorage.setItem(siteKey, "closed");
        }
        catch {
        }
    };
    const waiting = state.writing > 0 || state.offersWriting || state.starterWriting;
    useEffect(() => {
        if (!waiting)
            return;
        const t = setInterval(async () => {
            const r = await builderStateAction();
            if (r.ok)
                setState(r.state);
        }, 5000);
        return () => clearInterval(t);
    }, [waiting]);
    const personaName = (id: string) => state.personas.find((p) => p.id === id)?.name ?? id;
    const stageName = (s: string) => AWARENESS_INFO[s as AwarenessStage]?.label ?? s;
    const isOn = (key: ListKey, id: string) => !sel[key].off.includes(id);
    const personasOn = state.personas.filter((p) => isOn("personas", p.id));
    const lists = LISTS.filter((k) => k !== "products" || state.products.length > 0);
    const buys = (personaId: string) => {
        const named = state.match.personas.find((p) => p.id === personaId)?.product_ids ?? [];
        return named.length ? named : state.products.slice(0, 1).map((p) => p.id);
    };
    const items: Record<ListKey, Item[]> = {
        products: state.products.map((p) => ({ id: p.id, name: p.name, about: [p.format, "Products are kept in the brand brain, and changed there."].filter(Boolean) })),
        stages: AWARENESS_STAGES.map((s) => ({ id: s, name: AWARENESS_INFO[s].label, about: [AWARENESS_LABEL[s]] })),
        personas: state.personas.map((p) => ({
            id: p.id,
            name: p.name,
            about: [p.summary, p.problem && `Problem: ${p.problem}`, p.wants && `Desire: ${p.wants}`, p.trigger && `Buying trigger: ${p.trigger}`, `Usually: ${stageName(p.awareness).toLowerCase()}`].filter(Boolean) as string[],
            edit: () => setEditing({ kind: "persona", d: { id: p.id, name: p.name, summary: p.summary, identity: p.identity, problem: p.problem, wants: p.wants, trigger: p.trigger, language: p.language.join("\n"), notes: p.notes, awareness: p.awareness } }),
        })),
        angles: state.angles
            .filter((a) => mode === "advanced" || !a.persona_ids.length || a.persona_ids.some((id) => isOn("personas", id)) || (sel.angles.n[a.id] ?? 0) > 0)
            .map((a) => ({ id: a.id, name: a.name, about: [a.line, `Written for ${a.persona_ids.length ? a.persona_ids.map(personaName).join(", ") : "any persona"}.`, a.stages?.length ? `Suits best: ${a.stages.map((x) => stageName(x).toLowerCase()).join(", ")}.` : "Suits any stage."], edit: () => setEditing({ kind: "angle", d: { id: a.id, name: a.name, line: a.line, persona_ids: a.persona_ids, stages: a.stages ?? [], notes: a.notes } }) })),
        offers: state.offers.map((o) => ({
            id: o.id,
            name: o.name,
            about: o.id === NO_OFFER
                ? [o.say, "Recommended for a buyer who does not yet see the problem. Any offer can still be chosen for them."]
                : ([
                    o.say,
                    `${state.currency} ${o.price}. ${o.terms}`,
                    o.running ? "The brand runs this today." : `A proposal: the brand does not run this yet.${o.needs ? ` Needed first: ${o.needs}` : ""}`,
                    (o.persona_ids.length || o.stages.length) && `Recommended for ${[o.persona_ids.map(personaName).join(", "), o.stages.map((x) => stageName(x).toLowerCase()).join(", ")].filter(Boolean).join("; ")}.`,
                    !o.fitted && (o.own ? "Not matched to a persona or a stage yet, so it is never recommended. Change it to say whom it suits, or tap it to use it as it is." : "Designed on the Offers screen: change it there. It is not matched to a persona or a stage, so it is never recommended."),
                ].filter(Boolean) as string[]),
            edit: o.own ? () => setEditing({ kind: "offer", d: { id: o.id, name: o.name, price: String(o.price), terms: o.terms, say: o.say, persona_ids: o.persona_ids, stages: o.stages } }) : undefined,
        })),
        formats: state.formats.map((f) => {
            const own = state.custom.find((c) => c.id === f.id);
            return { id: f.id, name: f.name, about: [f.note, f.stages.length ? `Suits best: ${f.stages.map((x) => stageName(x).toLowerCase()).join(", ")}.` : "Suits any stage."], edit: own ? () => setEditing({ kind: "format", d: { ...own } }) : undefined };
        }),
    };
    const chosen = (key: ListKey): Chosen => Object.fromEntries(items[key].filter((x) => isOn(key, x.id)).map((x) => [x.id, sel[key].n[x.id] ?? 0]));
    const pick = mode === "basic"
        ? { products: chosen("products"), stages: chosen("stages"), personas: chosen("personas"), angles: chosen("angles"), offers: chosen("offers"), formats: chosen("formats"), count }
        : { products: exact.products ? { [exact.products]: 1 } : {}, stages: exact.stages ? { [exact.stages]: 1 } : {}, personas: exact.personas ? { [exact.personas]: 1 } : {}, angles: exact.angles ? { [exact.angles]: 1 } : {}, offers: exact.offers ? { [exact.offers]: 1 } : {}, formats: exact.formats ? { [exact.formats]: 1 } : {}, count: 1 };
    const total = totalOf(pick);
    const plan = useMemo(() => match(pick, state.match), [JSON.stringify(pick), state.match]);
    const rows = useMemo(() => (mode === "basic" ? withEdits(plan, edits) : plan), [mode, plan, edits]);
    const edited = mode === "basic" ? rows.filter((_, i) => edits[i]).length : 0;
    const setCell = (i: number, key: ListKey, id: string) => setEdits((e) => ({ ...e, [i]: { ...(e[i] ?? plan[i]), [FIELD[key]]: id } as Combo }));
    const undoRow = (i: number) => setEdits(({ [i]: _gone, ...rest }) => rest);
    const options = (key: ListKey, row: Combo): {
        label?: string;
        items: {
            id: string;
            name: string;
        }[];
    }[] => {
        const all = items[key].length || key === "stages" ? (key === "angles" ? state.angles.map((a) => ({ id: a.id, name: a.name })) : items[key].map((x) => ({ id: x.id, name: x.name }))) : [];
        if (key === "stages" || key === "personas")
            return [{ items: all }];
        const good = all.filter((x) => why(key, x.id, row, state.match).length > 0);
        return good.length && good.length < all.length ? [{ label: "Recommended for this row", items: good }, { label: "Everything else", items: all.filter((x) => !good.includes(x)) }] : [{ items: all }];
    };
    const oneStage = new Set(rows.map((r) => r.stage)).size === 1 ? rows[0].stage : null;
    const asksFor = rows.length * pictures * (words === "both" ? 2 : 1);
    const lacking = lists.filter((k) => !Object.keys(pick[k]).length).map((k) => ({ products: "a product", stages: "a stage", personas: "a persona", angles: "an angle", offers: "an offer", formats: "a format" })[k]);
    const focusOf = (key: "personas" | "stages", ids: string[]) => {
        const asked = ids.filter((id) => (sel[key].n[id] ?? 0) > 0);
        return asked.length ? asked : sel[key].off.length ? ids.filter((id) => isOn(key, id)) : [];
    };
    const focusP = mode === "basic" ? focusOf("personas", state.personas.map((p) => p.id)) : [exact.personas].filter(Boolean);
    const focusS = mode === "basic" ? focusOf("stages", [...AWARENESS_STAGES]) : [exact.stages].filter(Boolean);
    const usual = focusP.map((id) => state.personas.find((p) => p.id === id)?.awareness).filter(Boolean) as string[];
    const stagesFor = focusS.length ? focusS : usual;
    const chose = { product_id: exact.products, stage: exact.stages, persona_id: exact.personas };
    const recommended = (key: ListKey, id: string): boolean => {
        if (key === "stages" || key === "personas")
            return false;
        if (mode === "advanced")
            return why(key, id, chose, state.match).length > 0;
        if (!focusP.length && !stagesFor.length)
            return false;
        return (focusP.length ? focusP : [""]).some((p) => (stagesFor.length ? stagesFor : [""]).some((s) => why(key, id, { product_id: "", stage: s, persona_id: p }, state.match).length > 0));
    };
    const change = (key: ListKey, next: (l: Sel[ListKey]) => Sel[ListKey]) => setSel((s) => ({ ...s, [key]: next(s[key]) }));
    const tap = (key: ListKey, id: string) => {
        setShown((s) => ({ ...s, [key]: id }));
        change(key, (l) => (l.off.includes(id) ? { ...l, off: l.off.filter((x) => x !== id) } : { ...l, n: { ...l.n, [id]: Math.min(MAX_SCRIPTS, (l.n[id] ?? 0) + 1) } }));
    };
    const less = (key: ListKey, id: string) => change(key, (l) => ({ ...l, n: { ...l.n, [id]: Math.max(0, (l.n[id] ?? 0) - 1) } }));
    const clear = (key: ListKey, id: string) => change(key, (l) => ((l.n[id] ?? 0) > 0 ? { ...l, n: { ...l.n, [id]: 0 } } : { ...l, off: [...l.off, id] }));
    function write() {
        start(async () => {
            const r = await startBuilderAction({ ...pick, count: Math.min(MAX_SCRIPTS, total), texts, pictures, words, notes: notes.trim(), research, hooks, ...(length ? { length } : {}), taste, rows });
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
            toast.success(r.said);
        });
    }
    function save() {
        if (!editing)
            return;
        start(async () => {
            const e = editing;
            const r = e.kind === "persona"
                ? await savePersonaAction({ ...e.d, language: e.d.language.split("\n").map((x) => x.trim()).filter(Boolean) })
                : e.kind === "angle"
                    ? await saveAngleAction(e.d)
                    : e.kind === "offer"
                        ? await saveOfferAction({ ...e.d, price: Number(e.d.price) })
                        : await saveFormatAction(e.d);
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
            setEditing(null);
        });
    }
    function remove() {
        if (!editing?.d.id || editing.kind === "persona")
            return;
        const { kind, d } = editing;
        start(async () => {
            const r = kind === "angle" ? await deleteAngleAction(d.id!) : kind === "offer" ? await deleteOfferAction(d.id!) : await deleteFormatAction(d.id!);
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
            setEditing(null);
        });
    }
    function moreOffers() {
        start(async () => {
            const r = await writeOffersAction(hasFitted(state.offers) ? 6 : 12);
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
            toast.success("Offers are being written from the brand brain. They appear here in about a minute.");
        });
    }
    function writeStarter() {
        start(async () => {
            const r = await writeStarterAction();
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
            toast.success(r.said);
        });
    }
    function decide(id: string, v: Verdict) {
        setState((st) => ({ ...st, scripts: st.scripts.map((x) => (x.id !== id ? x : { ...x, status: v === "approved" ? "approved" : x.status === "approved" ? "draft" : x.status, kit: { ...x.kit, review: v === "rejected" ? ("rejected" as const) : undefined } })) }));
        start(async () => {
            const r = await reviewScriptAction(id, v);
            if (!r.ok)
                return void toast.error(r.error);
            setState(r.state);
        });
    }
    function againOrDrop(ids: string[], what: "retry" | "drop") {
        if (!ids.length)
            return;
        start(async () => {
            let last: BuilderState | null = null;
            for (const id of ids) {
                const r = what === "retry" ? await retryScriptAction(id) : await dropFailedScriptAction(id);
                if (!r.ok)
                    return void toast.error(r.error);
                last = r.state;
            }
            if (last)
                setState(last);
            if (what === "retry")
                toast.success(ids.length === 1 ? "It is being written again." : `${ids.length} scripts are being written again.`);
        });
    }
    const adders: Partial<Record<ListKey, () => void>> = {
        personas: () => setEditing({ kind: "persona", d: { name: "", summary: "", identity: "", problem: "", wants: "", trigger: "", language: "", notes: "", awareness: "problem_aware" } }),
        angles: () => setEditing({ kind: "angle", d: { name: "", line: "", persona_ids: focusP, stages: [], notes: "" } }),
        offers: () => setEditing({ kind: "offer", d: { name: "", price: "", terms: "", say: "", persona_ids: focusP, stages: [] } }),
        formats: () => setEditing({ kind: "format", d: { name: "", how: "", base: state.bases[0]?.id ?? "" } }),
    };
    const TITLES: Record<ListKey, {
        title: string;
        hint: string;
    }> = {
        products: { title: "Product", hint: "What the script sells." },
        stages: { title: "Buyer's stage", hint: "How much the buyer already knows." },
        personas: { title: "Persona", hint: "A problem, a desire and a buying trigger." },
        angles: { title: "Angle", hint: "The way into the product for a persona." },
        offers: { title: "Offer", hint: "What the buyer gets and pays." },
        formats: { title: "Format", hint: "What the script is written for." },
    };
    const nameOf = (key: ListKey, id: string) => items[key].find((x) => x.id === id)?.name ?? (key === "angles" ? state.angles.find((a) => a.id === id)?.name : undefined) ?? id;
    const working = useMemo(() => state.personas.slice(0, 3).map((p, i) => {
        const angle = state.angles.find((a) => a.persona_ids.includes(p.id));
        return { persona: p, angle, group: ["Women 45 to 54", "Women 25 to 34", "Men 35 to 44"][i], roas: [3.4, 2.8, 2.1][i], share: [38, 27, 14][i] };
    }), [state.personas, state.angles]);
    const runs = useMemo(() => {
        const by = new Map<string, BuilderState["scripts"]>();
        for (const s of state.scripts)
            by.set(s.kit.run, [...(by.get(s.kit.run) ?? []), s]);
        return [...by.entries()];
    }, [state.scripts]);
    const listed = useMemo(() => runs.flatMap(([, list]) => list), [runs]);
    const found = useMemo(() => (find.trim() ? listed.filter((s) => scriptHas(s, find)) : null), [listed, find]);
    const walked = found ?? listed;
    const when = (at: string) => new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const fold = (run: string) => setUnfolded((u) => toggle(u ?? (runs[0] ? [runs[0][0]] : []), run));
    const isOpenAt = (runAt: number) => (unfolded ? unfolded.includes(runs[runAt][0]) : runAt === 0);
    const oneLineAt = (runAt: number) => runAt >= 0 && runs[runAt][1].length === 1 && verdictOf(runs[runAt][1][0]) !== "rejected" && !isOpenAt(runAt);
    return (<div className="space-y-8 px-6 pb-6 pt-8 max-md:space-y-6" data-testid="builder">
      {(state.gaps.any || state.starterWriting) && (<section className="rounded-xl border border-primary/30 bg-primary/5 p-6" data-testid="builder-gaps">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-72">
              <h2 className="display text-2xl">{state.starterWriting ? `Writing ${state.brand.name}'s personas, angles and offers` : `${state.brand.name} is missing a few things a script is built from`}</h2>
              {state.starterWriting ? (<p className="mt-1 text-sm text-muted-foreground">This takes about a minute. The lists below fill in on their own. You can write scripts with what is there in the meantime.</p>) : (<>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {state.gaps.personas && <li>No persona yet: who the scripts are for.</li>}
                    {state.gaps.personaFields > 0 && (<li>
                        {state.gaps.personaFields === 1 ? "1 persona has" : `${state.gaps.personaFields} personas have`} no desire or no buying trigger, so scripts for {state.gaps.personaFields === 1 ? "it" : "them"} have less to work with.
                      </li>)}
                    {state.gaps.angles && <li>No angle yet: the way into the product for each persona.</li>}
                    {state.gaps.starterAngles && <li>The angles below are simple ones made from each persona&apos;s problem. Fuller ones, tuned to each persona, can be written.</li>}
                    {state.gaps.offers && <li>No offer has been matched to a persona or a stage yet.</li>}
                  </ul>
                  <p className="mt-1 text-sm text-muted-foreground">Nothing is blocked: you can write scripts now. They get better once these are written.</p>
                </>)}
            </div>
            <Button onClick={writeStarter} disabled={busy || state.starterWriting} data-testid="builder-write-starter">
              {state.starterWriting ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
              {state.starterWriting ? "Writing" : "Write these for me"}
            </Button>
          </div>
          {!live && !state.starterWriting && <p className="mt-2 text-xs text-amber-800">Writing is switched off on this account, so these are simple angles made from the personas.</p>}
        </section>)}

      {state.websiteOnly && siteNote && (<section className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm" role="note" data-testid="builder-site-only">
          <Info className="mt-0.5 size-4 shrink-0"/>
          <div className="min-w-0 flex-1">
            <p>These were written from your website alone. Add your ads, reviews and other sources to the brand brain and they get much richer.</p>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              <Link href="/sources" className="underline underline-offset-2" data-testid="builder-add-sources">
                Add reviews and other customer sources
              </Link>
              <Link href="/references" className="underline underline-offset-2">
                Add your ads
              </Link>
              <Link href="/brand" className="underline underline-offset-2">
                Open the brand brain
              </Link>
            </p>
          </div>
          <button type="button" onClick={closeSiteNote} aria-label="Close this note" className="rounded p-2 hover:bg-primary/10" data-testid="builder-site-only-close">
            <X className="size-4"/>
          </button>
        </section>)}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-card p-1" role="tablist">
          {(["basic", "advanced"] as const).map((m) => (<button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("rounded-md px-4 py-1.5 text-sm font-medium", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")} data-testid={`builder-mode-${m}`}>
              {m === "basic" ? "Basic" : "Advanced"}
            </button>))}
        </div>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{mode === "basic" ? "Say how many scripts. Everything is in play and matched for you; narrow any list if you want to." : "Choose exactly 1 of each, and 1 script is written from it."}</p>
      </div>

      <details className="rounded-xl border bg-card px-6 py-4 text-sm" data-testid="builder-how">
        <summary className="cursor-pointer font-medium">How things are recommended</summary>
        <div className="mt-3 max-w-3xl space-y-1.5 text-sm text-muted-foreground">
          <p>The stage and the persona are yours to choose: nothing is recommended for them. Everything else follows from them, and changes the moment you change a choice.</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li><span className="font-medium text-foreground">Product</span>: what the persona buys. Where none is named on the persona, the brand&apos;s main product.</li>
            <li><span className="font-medium text-foreground">Angle</span>: the angles written for the persona, and among them the ones that suit the stage, where an angle names a stage.</li>
            <li><span className="font-medium text-foreground">Offer</span>: for an unaware buyer, no offer. For everyone else, the offers for the product, written for the persona and suited to the stage.</li>
            <li><span className="font-medium text-foreground">Format</span>: the formats that suit the stage.</li>
          </ul>
          <p>Nothing is blocked: anything can be chosen with anything. To change what an item is recommended for, open it with the pencil and tick the personas and stages it suits.</p>
        </div>
      </details>

      {mode === "basic" && (<section className="rounded-xl border bg-card p-6">
          <Label htmlFor="builder-count" className="display text-2xl">
            How many scripts
          </Label>
          <div className="mt-4 flex items-center gap-4">
            <Slider min={1} max={MAX_SCRIPTS} step={1} value={[Math.min(MAX_SCRIPTS, total)]} onValueChange={([v]) => setCount(v)} className="max-w-md flex-1" data-testid="builder-slider"/>
            <Input id="builder-count" type="number" min={1} max={MAX_SCRIPTS} value={Math.min(MAX_SCRIPTS, total)} onChange={(e) => setCount(Math.max(1, Math.min(MAX_SCRIPTS, Number(e.target.value) || 1)))} className="w-20" data-testid="builder-count"/>
          </div>
          {total > count && <p className="mt-1 text-xs text-muted-foreground">Raised to {total}, because the numbers you set on a list add up to that.</p>}
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">Tap an item to add 1 script that uses it. The cross clears its number. On an item with no number, the cross takes it out. A dot marks what suits your other choices. You can still pick anything.</p>
        </section>)}

      <div className={cn("grid gap-5", mode === "basic" ? "lg:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {lists.map((key) => {
            const i = LISTS.indexOf(key);
            const list = items[key];
            const about = list.find((x) => x.id === (mode === "basic" ? shown[key] : exact[key]));
            return (<section key={key} className={cn("flex min-w-0 flex-col rounded-xl border bg-card", mode === "basic" && (key === "angles" || (key === "personas" && lists.length % 2 === 0)) && "lg:col-span-2")} data-testid={`builder-col-${i}`} data-list={key}>
              <header className="flex flex-wrap items-start justify-between gap-2 px-6 pb-3 pt-5">
                <div className="min-w-0">
                  <h2 className="display text-2xl">{TITLES[key].title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{TITLES[key].hint}</p>
                </div>
                <div className="flex min-w-0 flex-wrap justify-end gap-1">
                  {mode === "basic" && (<>
                      <Button size="sm" variant="ghost" onClick={() => change(key, () => ({ off: [], n: {} }))}>
                        All
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => change(key, () => ({ off: list.map((x) => x.id), n: {} }))}>
                        None
                      </Button>
                    </>)}
                  {key === "offers" && (<Button asChild size="sm" variant="ghost">
                      <Link href="/offers" title="Every offer of the brand, with its numbers">
                        Manage
                      </Link>
                    </Button>)}
                  {key === "offers" && (<Button size="sm" variant="outline" onClick={moreOffers} disabled={busy || state.offersWriting || !live} data-testid="builder-write-offers">
                      {state.offersWriting ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}
                      {state.offersWriting ? "Writing" : "Write offers"}
                    </Button>)}
                  {adders[key] && (<Button size="sm" variant="outline" onClick={adders[key]} data-testid={`builder-add-${i}`}>
                      <Plus className="size-4"/>
                      Add
                    </Button>)}
                </div>
              </header>
              {mode === "basic" ? (<div className="flex flex-wrap gap-2 px-6 pb-5">
                  {list.map((x) => (<Chip key={x.id} testid={`${key}-${x.id}`} name={x.name} on={isOn(key, x.id)} n={sel[key].n[x.id] ?? 0} recommended={recommended(key, x.id)} tap={() => tap(key, x.id)} less={() => less(key, x.id)} clear={() => clear(key, x.id)} edit={x.edit}/>))}
                  {key === "products" && list.length === 1 && <p className="w-full pt-1 text-xs text-muted-foreground">The brand has 1 product on file, so every script sells it.</p>}
                  {!list.length && <p className="py-2 text-sm text-muted-foreground">{key === "offers" ? "No offers yet. Write them from the brand brain, or add one." : key === "angles" || key === "personas" ? "None yet. Press Write these for me at the top, or add one." : "None yet. Add one."}</p>}
                </div>) : (<div className="px-6 pb-5">
                  {(() => {
                        const rec = list.filter((x) => recommended(key, x.id));
                        const split = rec.length > 0 && rec.length < list.length;
                        const item = (x: Item) => (<SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>);
                        const reasons = exact[key] && key !== "stages" && key !== "personas" ? why(key, exact[key], chose, state.match) : [];
                        return (<>
                        <Select value={exact[key]} onValueChange={(v) => setExact({ ...exact, [key]: v })}>
                          <SelectTrigger className="w-full min-w-0 *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate" data-testid={`builder-exact-${key}`}>
                            <SelectValue placeholder="Choose 1"/>
                          </SelectTrigger>
                          <SelectContent>
                            {split ? (<>
                                <SelectGroup>
                                  <SelectLabel>Recommended for what you chose</SelectLabel>
                                  {rec.map(item)}
                                </SelectGroup>
                                <SelectGroup>
                                  <SelectLabel>Everything else</SelectLabel>
                                  {list.filter((x) => !rec.includes(x)).map(item)}
                                </SelectGroup>
                              </>) : (list.map(item))}
                          </SelectContent>
                        </Select>
                        {exact[key] && key !== "stages" && key !== "personas" && (<p className="mt-1.5 text-xs text-muted-foreground" data-testid={`builder-why-${key}`}>
                            {reasons.length ? `Recommended: ${reasons.join(", ")}.` : split ? `Your own pick. ${rec.length} on this list ${rec.length === 1 ? "is" : "are"} recommended for what you chose.` : "Nothing on this list is recommended over the rest for what you chose."}
                          </p>)}
                      </>);
                    })()}
                </div>)}
              {about && (<div className="mt-auto space-y-1 border-t px-6 py-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{about.name}</p>
                  {about.about.filter(Boolean).map((line, j) => (<p key={j}>{line}</p>))}
                  {mode === "advanced" && about.edit && (<button className="underline" onClick={about.edit}>
                      Change it
                    </button>)}
                </div>)}
            </section>);
        })}
      </div>

      <div className="space-y-5">
        <section className="min-w-0 rounded-xl border bg-card p-6" data-testid="builder-plan">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="display text-2xl">{mode === "basic" ? `What will be written (${rows.length})` : "The script that will be written"}</h2>
            {edited > 0 && (<Button size="sm" variant="ghost" onClick={() => setEdits({})} data-testid="builder-plan-reset">
                <RotateCcw className="size-4"/>
                Undo {edited === 1 ? "my 1 change" : `my ${edited} changes`}
              </Button>)}
          </div>
          {lacking.length > 0 ? (<p className="mt-2 text-sm text-muted-foreground">{mode === "basic" ? `Keep at least ${lacking.join(", ")}.` : `Choose ${lacking.join(", ")}.`}</p>) : (<>
              {mode === "basic" && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">Matched for you. Change anything in a row. Each list shows every choice, with the ones that suit the rest of the row first. The speech mark adds a note for that script. A row you change stays as you set it.</p>}
              <div className="mt-4 max-h-[28rem] overflow-auto">
                <table className="w-full min-w-[46rem] table-fixed text-left text-[13px]">
                  <thead className="sticky top-0 z-10 bg-card text-muted-foreground">
                    <tr>
                      <th className="w-8 py-2 pr-2 font-medium">#</th>
                      {lists.map((key) => (<th key={key} className="py-2 pr-2 font-medium">
                          {key === "stages" ? "Stage" : TITLES[key].title}
                        </th>))}
                      {mode === "basic" && <th className="w-14"/>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c, i) => (<tr key={i} className={cn("border-t align-middle", mode === "basic" && edits[i] && "bg-primary/5")} data-testid={`plan-row-${i + 1}`} data-edited={mode === "basic" && !!edits[i]}>
                        <td className="py-1 pr-2 tabular-nums text-muted-foreground">{i + 1}</td>
                        {lists.map((key) => (<td key={key} className="py-0.5 pr-2">
                            {mode === "basic" ? (<Cell label={`${TITLES[key].title} of script ${i + 1}`} testid={`plan-${i + 1}-${key}`} value={c[FIELD[key]]} name={key === "stages" ? stageName(c.stage) : nameOf(key, c[FIELD[key]])} groups={options(key, c)} set={(id) => setCell(i, key, id)}/>) : (<span className="block truncate py-1">{key === "stages" ? stageName(c.stage) : nameOf(key, c[FIELD[key]])}</span>)}
                          </td>))}
                        {mode === "basic" && (<td className="whitespace-nowrap py-0.5">
                            <button type="button" onClick={() => setNoting({ i, text: c.note ?? "" })} aria-label={c.note ? `Change the note on script ${i + 1}` : `Add a note to script ${i + 1}`} title={c.note || "Add a note for the writer of this script"} className={cn("rounded p-1 hover:text-foreground", c.note ? "text-primary" : "text-muted-foreground")} data-testid={`plan-note-${i + 1}`} data-has={!!c.note}>
                              <MessageSquare className={cn("size-3.5", c.note && "fill-primary/20")}/>
                            </button>
                            {edits[i] && (<button type="button" onClick={() => undoRow(i)} aria-label={`Put script ${i + 1} back as it was matched`} title="Put this row back as it was matched" className="rounded p-1 text-muted-foreground hover:text-foreground" data-testid={`plan-undo-${i + 1}`}>
                                <RotateCcw className="size-3.5"/>
                              </button>)}
                          </td>)}
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </>)}
        </section>

        <section className="grid gap-5 rounded-xl border bg-card p-6 md:grid-cols-3" data-testid="builder-write">
          <h2 className="display text-2xl md:col-span-3">Write</h2>
          <HooksPicker id="builder-hooks" value={hooks} onChange={setHooks} className="md:col-span-3 md:max-w-xl"/>
          <div className="min-w-0 md:col-span-3 md:max-w-xl" data-testid="builder-length-picker">
            <span className="text-sm font-medium">Length of each script</span>
            <LengthChoice id="builder-length" value={length} onChange={setLength} stages={rows.map((r) => r.stage)} speakerAge={sharedAge(rows.map((r) => state.speakerAges[r.persona_id]))} className="mt-1"/>
          </div>
          <TasteBar id="builder-taste" surface="script" stage={oneStage} view={mode === "basic" ? "normal" : "advanced"} value={taste} onChange={setTaste} className="md:col-span-3 md:max-w-xl"/>
          {pictures > 0 && <TasteBar id="builder-taste-pictures" surface="image_ad" stage={oneStage} view={mode === "basic" ? "normal" : "advanced"} hide={["look", "words", "sell", "spread"]} value={taste} onChange={setTaste} className="md:col-span-3 md:max-w-xl"/>}
          <Count id="builder-texts" label="Primary text and headline" hint="The words that run with each script in the feed. More than 1: each version opens a different way, to test against the others." value={texts} set={setTexts} max={MAX_TEXTS} one="version" many="versions"/>
          <div className="space-y-3">
            <Count id="builder-pictures" label="Pictures" hint={`Made for each script, from moments the script tells${asksFor > 0 && rows.length > 1 ? `: ${asksFor} in all` : ""}. The description each picture was made from is kept with it.`} value={pictures} set={setPictures} max={MAX_PICTURES} one="picture" many="pictures"/>
            {pictures > 0 && (<div className="pl-[4.75rem]">
                <Label htmlFor="builder-words" className="text-xs font-medium">
                  Words on the pictures
                </Label>
                <Select value={words} onValueChange={(v) => setWords(v as PictureWords)}>
                  <SelectTrigger id="builder-words" size="sm" className="mt-1 w-full max-w-64" data-testid="builder-words">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="without">Without words</SelectItem>
                    <SelectItem value="with">With words on them</SelectItem>
                    <SelectItem value="both">Both: each picture without and with</SelectItem>
                  </SelectContent>
                </Select>
              </div>)}
          </div>
          <Toggle id="builder-research" on={research} set={setResearch} label="Use customer research" hint="Also hand the writer what the brand's sources hold: calls, reviews and tickets. Off: it writes from the persona, the angle and the brand brain."/>
          {asksFor > state.imagesLeft && (<p className="text-xs text-amber-800 md:col-span-3" data-testid="builder-images-cap">
              The image cap has room for {state.imagesLeft} more {state.imagesLeft === 1 ? "picture" : "pictures"}, and this asks for {asksFor}. The rest will not be made. Raise the cap in <Link href="/settings" className="underline">Settings</Link>.
            </p>)}
          <div className="space-y-1 md:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="builder-notes" className="text-sm font-medium">
                Anything else the writer should know
              </Label>
              <VoiceNote onText={(t) => setNotes((n) => `${n}${n ? " " : ""}${t}`.slice(0, 1500))} testId="builder-notes-voice"/>
            </div>
            <Textarea id="builder-notes" rows={2} maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "basic" ? "Type it or say it. It is told to the writer of every script in this go: something to stress, a season, a line to avoid." : "Type it or say it. It is told to the writer of this script: something to stress, a season, a line to avoid."} data-testid="builder-notes"/>
          </div>
          <Button onClick={write} disabled={busy || lacking.length > 0 || total > MAX_SCRIPTS} size="lg" className="h-11 text-base md:col-span-3 md:w-72 md:justify-self-start" data-testid="builder-go">
            {busy && <Loader2 className="size-4 animate-spin"/>}
            Write {rows.length || 1} {rows.length === 1 || !rows.length ? "script" : "scripts"}
          </Button>
          {total > MAX_SCRIPTS && <p className="text-xs text-amber-800 md:col-span-3">1 go writes {MAX_SCRIPTS} scripts at most. Lower a number on a list.</p>}
          {!live && <p className="text-xs text-amber-800 md:col-span-3">Writing is switched off on this account: the scripts are planned and none is written.</p>}
        </section>
      </div>

      <section className="space-y-5 pt-6" data-testid="builder-scripts">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 className="display text-3xl">Scripts written here</h2>
          {listed.length > 0 && (<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <div className="relative min-w-0 flex-1 basis-64 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search the scripts: a word, a persona, an angle" aria-label="Search the scripts written here" className="h-10 bg-card pl-9" data-testid="builder-find"/>
              </div>
              {walked.length > 1 && (<Button onClick={() => setReview((walked.find((x) => verdictOf(x) === "undecided") ?? walked[0]).id)} data-testid="builder-review-all">
                  Review {found ? `these ${walked.length}` : `all ${walked.length}`}, 1 at a time
                </Button>)}
            </div>)}
        </div>
        {state.progress.map((p) => (<RunProgressList key={p.run} p={p} busy={busy} live={live} onRetry={(ids) => againOrDrop(ids, "retry")} onDrop={(ids) => againOrDrop(ids, "drop")}/>))}
        {!runs.length && !state.progress.length && <p className="text-sm text-muted-foreground">None yet. Say how many above and write your first scripts.</p>}
        {found && (<div className="space-y-4" data-testid="builder-found">
            <p className="text-sm text-muted-foreground" data-testid="builder-found-count">
              {found.length === 0 ? `No script has "${find.trim()}" in it.` : `${found.length} of ${listed.length} scripts have "${find.trim()}" in them.`}{" "}
              <button type="button" onClick={() => setFind("")} className="font-medium text-primary hover:underline">
                Show all
              </button>
            </p>
            {found.map((s) => (<ScriptCard key={s.id} s={s} busy={busy} making={state.writing > 0} onVerdict={(v) => decide(s.id, v)} onReview={() => setReview(s.id)}/>))}
          </div>)}
        {!found && runs.map(([run, list], runAt) => {
            const down = list.filter((x) => verdictOf(x) === "rejected");
            const isOpen = isOpenAt(runAt);
            if (oneLineAt(runAt))
                return (<div key={run} className={cn("flex items-center gap-1.5", oneLineAt(runAt - 1) && "-mt-3")} data-testid="builder-run" data-one-line="true">
                <ScriptRow s={list[0]} when={when(list[0].at)} onOpen={() => setReview(list[0].id)}/>
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => fold(run)} aria-expanded={false} data-testid="builder-run-fold">
                  Show in full
                </Button>
              </div>);
            const shown = showDown.includes(run) ? list : list.filter((x) => verdictOf(x) !== "rejected");
            const approved = list.filter((x) => verdictOf(x) === "approved").length;
            const open = list.length - approved - down.length;
            return (<div key={run} className={cn("space-y-3", runAt > 0 && !oneLineAt(runAt - 1) && "border-t pt-5")} data-testid="builder-run">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {when(list[0].at)} · {list.length} {list.length === 1 ? "script" : "scripts"}
                  {approved > 0 && ` · ${approved} approved`}
                  {down.length > 0 && ` · ${down.length} turned down`}
                  {open > 0 && (approved > 0 || down.length > 0) && ` · ${open} to decide`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {list.length > 1 && (<Button size="sm" variant="outline" onClick={() => setReview((list.find((x) => verdictOf(x) === "undecided") ?? list[0]).id)} data-testid="builder-review-open">
                      Review from here
                    </Button>)}
                  <Button size="sm" variant="outline" onClick={() => {
                    const keep = list.filter((x) => verdictOf(x) !== "rejected");
                    navigator.clipboard.writeText(keep.map(allText).join("\n\n----------\n\n")).then(() => toast.success(`${keep.length === 1 ? "1 script" : `${keep.length} scripts`} copied, each with its headline and primary text.`), () => toast.error("Could not copy."));
                }}>
                    <Copy className="size-4"/>
                    {list.length - down.length === 1 ? "Copy it" : `Copy all ${list.length - down.length}`}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => fold(run)} aria-expanded={isOpen} data-testid="builder-run-fold">
                    {isOpen ? "Fold away" : shown.length === 1 ? "Show it in full" : `Show all ${shown.length} in full`}
                  </Button>
                  {down.length > 0 && (<Button size="sm" variant="ghost" onClick={() => setShowDown((x) => toggle(x, run))}>
                      {showDown.includes(run) ? "Hide" : "Show"} the {down.length} turned down
                    </Button>)}
                </div>
              </div>

              <div className={isOpen ? "space-y-5" : "space-y-1.5"} data-testid="builder-run-scripts" data-open={isOpen}>
                {shown.map((s) => (isOpen ? <ScriptCard key={s.id} s={s} busy={busy} making={state.writing > 0} onVerdict={(v) => decide(s.id, v)} onReview={() => setReview(s.id)}/> : <ScriptRow key={s.id} s={s} onOpen={() => setReview(s.id)}/>))}
              </div>
            </div>);
        })}
      </section>

      <ReviewDialog scripts={walked} startAt={review} busy={busy} making={state.writing > 0} onVerdict={decide} onClose={() => setReview(null)}/>

      <details className="rounded-xl border border-dashed bg-card px-6 py-4" data-testid="builder-working">
        <summary className="cursor-pointer text-sm font-semibold">
          Example only: what &quot;What is working&quot; will show once an ad account is connected <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">made-up numbers</span>
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">No ad account is connected, so every number below is made up. Once one is, this shows which group of buyers, persona and angle bring the sales, so you can write more for them or split the group into a persona of its own.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {working.map((w) => (<div key={w.persona.id} className="min-w-0 rounded-md border p-3 text-sm">
              <p className="font-medium">{w.group}</p>
              <p className="text-xs text-muted-foreground">
                {w.persona.name}
                {w.angle ? ` · ${w.angle.name}` : ""}
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                Return on ad spend {w.roas} · {w.share}% of sales
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => {
                setMode("basic");
                setSel((s) => ({ ...s, personas: { off: s.personas.off.filter((x) => x !== w.persona.id), n: { ...s.personas.n, [w.persona.id]: 3 } }, ...(w.angle ? { angles: { off: s.angles.off.filter((x) => x !== w.angle!.id), n: { ...s.angles.n, [w.angle.id]: 2 } } } : {}) }));
            }}>
                  Write more for them
                </Button>
                <Button size="sm" variant="ghost" className="h-auto max-w-full whitespace-normal text-left" onClick={() => setEditing({ kind: "persona", d: { name: `${w.persona.name}, ${w.group.toLowerCase()}`.slice(0, 60), summary: w.persona.summary, identity: w.persona.identity, problem: w.persona.problem, wants: w.persona.wants, trigger: w.persona.trigger, language: w.persona.language.join("\n"), notes: `Split from ${w.persona.name}: ${w.group.toLowerCase()} respond best. Rewrite the lines above for this group.`, awareness: w.persona.awareness } })}>
                  Make a persona for this group
                </Button>
              </div>
            </div>))}
        </div>
      </details>

      <Dialog open={!!noting} onOpenChange={(o) => !o && setNoting(null)}>
        <DialogContent className="sm:max-w-lg">
          {noting && (<>
              <DialogHeader>
                <DialogTitle>A note for script {noting.i + 1}</DialogTitle>
                <DialogDescription>Type it or say it. It is told to the writer of this 1 script, on top of the note for the whole go.</DialogDescription>
              </DialogHeader>
              <Textarea rows={4} maxLength={600} value={noting.text} onChange={(e) => setNoting({ ...noting, text: e.target.value })} placeholder="Open on the kitchen counter. Keep the price out." data-testid="plan-note-text"/>
              <div className="flex items-center justify-between gap-2">
                <VoiceNote onText={(t) => setNoting((n) => (n ? { ...n, text: `${n.text}${n.text ? " " : ""}${t}`.slice(0, 600) } : n))} testId="plan-note-voice"/>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setNoting(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                const { i, text } = noting;
                setEdits((e) => ({ ...e, [i]: { ...(e[i] ?? plan[i]), note: text.trim() || undefined } }));
                setNoting(null);
            }} data-testid="plan-note-save">
                    Save the note
                  </Button>
                </div>
              </div>
            </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {editing && (<>
              <DialogHeader>
                <DialogTitle>
                  {editing.d.id ? "Change" : "Add"} {editing.kind === "persona" ? "a persona" : editing.kind === "angle" ? "an angle" : editing.kind === "offer" ? "an offer" : "a format"}
                </DialogTitle>
                <DialogDescription>
                  {editing.kind === "persona" ? "Write it in plain words, so a stranger could picture the person." : editing.kind === "angle" ? "1 way into the product: what the ad makes the buyer see or feel." : editing.kind === "offer" ? "What the buyer gets and what they pay." : "A format of your own, made as one of the built-in formats."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {editing.kind === "persona" && (<>
                    <F label="Name">
                      <Input value={editing.d.name} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, name: e.target.value } })} placeholder="The Daily Commuter" data-testid="edit-name"/>
                    </F>
                    <F label="Who they are, in 1 or 2 sentences">
                      <Textarea rows={2} value={editing.d.summary} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, summary: e.target.value } })} data-testid="edit-summary"/>
                    </F>
                    <F label="How they see themselves" hint="The identity tied to the problem.">
                      <Textarea rows={2} value={editing.d.identity} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, identity: e.target.value } })}/>
                    </F>
                    <F label="The problem" hint="Where they are now.">
                      <Textarea rows={2} value={editing.d.problem} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, problem: e.target.value } })} data-testid="edit-problem"/>
                    </F>
                    <F label="The desire" hint="Where they want to be.">
                      <Textarea rows={2} value={editing.d.wants} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, wants: e.target.value } })}/>
                    </F>
                    <F label="The buying trigger" hint="The moment that makes them buy now.">
                      <Textarea rows={2} value={editing.d.trigger} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, trigger: e.target.value } })}/>
                    </F>
                    <F label="Their own words" hint="1 phrase a line, word for word from reviews, ads or the site.">
                      <Textarea rows={3} value={editing.d.language} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, language: e.target.value } })}/>
                    </F>
                    <F label="Where they usually are">
                      <Select value={editing.d.awareness} onValueChange={(v) => setEditing({ ...editing, d: { ...editing.d, awareness: v as PersonaAwareness } })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERSONA_AWARENESS.map((s) => (<SelectItem key={s} value={s}>
                              {AWARENESS_INFO[s].label}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </F>
                    <F label="Notes" hint="Anything else a writer should know.">
                      <Textarea rows={2} value={editing.d.notes} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, notes: e.target.value } })}/>
                    </F>
                  </>)}
                {editing.kind === "angle" && (<>
                    <F label="Name">
                      <Input value={editing.d.name} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, name: e.target.value } })} placeholder="The tub you stopped opening" data-testid="edit-name"/>
                    </F>
                    <F label="The angle, in 1 sentence" hint="What the ad makes the buyer see or feel, and why that leads to the product.">
                      <Textarea rows={3} value={editing.d.line} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, line: e.target.value } })} data-testid="edit-line"/>
                    </F>
                    <F label="Personas it is for" hint="None ticked: it fits any persona.">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {state.personas.map((p) => (<label key={p.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={editing.d.persona_ids.includes(p.id)} onCheckedChange={() => setEditing({ ...editing, d: { ...editing.d, persona_ids: toggle(editing.d.persona_ids, p.id) } })}/>
                            {p.name}
                          </label>))}
                      </div>
                    </F>
                    <F label="Stages it suits best" hint="None ticked: any stage. A recommendation only: any angle can be written at any stage.">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {AWARENESS_STAGES.map((st) => (<label key={st} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={editing.d.stages.includes(st)} onCheckedChange={() => setEditing({ ...editing, d: { ...editing.d, stages: toggle(editing.d.stages, st) } })}/>
                            {AWARENESS_INFO[st].label}
                          </label>))}
                      </div>
                    </F>
                    <F label="Notes">
                      <Textarea rows={2} value={editing.d.notes} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, notes: e.target.value } })}/>
                    </F>
                  </>)}
                {editing.kind === "offer" && (<>
                    <F label="Name">
                      <Input value={editing.d.name} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, name: e.target.value } })} placeholder="First order for less" data-testid="edit-name"/>
                    </F>
                    <F label={`Price (${state.currency})`} hint="What the buyer pays for this offer.">
                      <Input type="number" min={0} step="0.01" value={editing.d.price} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, price: e.target.value } })} className="w-32" data-testid="edit-price"/>
                    </F>
                    <F label="Said simply" hint="The offer in 1 sentence, the way a customer would tell a friend.">
                      <Textarea rows={2} value={editing.d.say} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, say: e.target.value } })}/>
                    </F>
                    <F label="The terms" hint="What they get, what it becomes after, any gift, guarantee or deadline.">
                      <Textarea rows={3} value={editing.d.terms} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, terms: e.target.value } })} data-testid="edit-terms"/>
                    </F>
                    <F label="Recommended for" hint="None ticked: it suits any persona. A recommendation only: any offer can go with any persona.">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {state.personas.map((p) => (<label key={p.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={editing.d.persona_ids.includes(p.id)} onCheckedChange={() => setEditing({ ...editing, d: { ...editing.d, persona_ids: toggle(editing.d.persona_ids, p.id) } })}/>
                            {p.name}
                          </label>))}
                      </div>
                    </F>
                    <F label="Recommended at" hint="None ticked: any stage.">
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {AWARENESS_STAGES.map((st) => (<label key={st} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={editing.d.stages.includes(st)} onCheckedChange={() => setEditing({ ...editing, d: { ...editing.d, stages: toggle(editing.d.stages, st) } })}/>
                            {AWARENESS_INFO[st].label}
                          </label>))}
                      </div>
                    </F>
                  </>)}
                {editing.kind === "format" && (<>
                    <F label="Name">
                      <Input value={editing.d.name} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, name: e.target.value } })} placeholder="Street interview" data-testid="edit-name"/>
                    </F>
                    <F label="How it plays" hint="Who is on screen, what happens, how it opens and ends.">
                      <Textarea rows={3} value={editing.d.how} onChange={(e) => setEditing({ ...editing, d: { ...editing.d, how: e.target.value } })} data-testid="edit-how"/>
                    </F>
                    <F label="Made as" hint="The built-in format closest to it. Its length and its way to video are used.">
                      <Select value={editing.d.base} onValueChange={(v) => setEditing({ ...editing, d: { ...editing.d, base: v } })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {state.bases.map((b) => (<SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                    </F>
                  </>)}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                {editing.d.id && (editing.kind === "angle" || editing.kind === "format" || (editing.kind === "offer" && state.offers.find((o) => o.id === editing.d.id)?.removable)) ? (<Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
                    <Trash2 className="size-4"/>
                    Delete
                  </Button>) : (<span />)}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                  <Button onClick={save} disabled={busy} data-testid="edit-save">
                    {busy && <Loader2 className="size-4 animate-spin"/>}
                    Save
                  </Button>
                </div>
              </div>
            </>)}
        </DialogContent>
      </Dialog>
    </div>);
}
function Chip({ testid, name, on, n, recommended, tap, less, clear, edit }: {
    testid: string;
    name: string;
    on: boolean;
    n: number;
    recommended: boolean;
    tap: () => void;
    less: () => void;
    clear: () => void;
    edit?: () => void;
}) {
    return (<span className={cn("inline-flex max-w-full items-center rounded-full border text-sm", !on && "border-dashed text-muted-foreground/70", on && n === 0 && "bg-muted", n > 0 && "border-primary bg-primary text-primary-foreground")} data-testid={testid} data-on={on} data-n={n}>
      <button type="button" onClick={tap} className="flex min-w-0 items-center gap-1.5 py-1 pl-3 pr-1.5" aria-pressed={on}>
        {recommended && on && <span className={cn("size-1.5 shrink-0 rounded-full", n > 0 ? "bg-primary-foreground" : "bg-primary")} title="Recommended"/>}
        <span className="truncate">{name}</span>
      </button>
      {n > 0 && (<>
          <button type="button" onClick={less} aria-label={`1 fewer with ${name}`} className="rounded-full p-0.5 hover:bg-primary-foreground/20">
            <Minus className="size-3"/>
          </button>
          <span className="px-1 text-xs font-semibold tabular-nums">{n}</span>
        </>)}
      {edit && (<button type="button" onClick={edit} aria-label={`Change ${name}`} className="rounded-full p-1 opacity-50 hover:opacity-100">
          <Pencil className="size-3"/>
        </button>)}
      {on && (<button type="button" onClick={clear} aria-label={n > 0 ? `Clear the number on ${name}` : `Take out ${name}`} className="mr-1 rounded-full p-1 opacity-60 hover:opacity-100">
          <X className="size-3"/>
        </button>)}
    </span>);
}
function Cell({ label, testid, value, name, groups, set }: {
    label: string;
    testid: string;
    value: string;
    name: string;
    groups: {
        label?: string;
        items: {
            id: string;
            name: string;
        }[];
    }[];
    set: (id: string) => void;
}) {
    const known = groups.some((g) => g.items.some((x) => x.id === value));
    const opt = (x: {
        id: string;
        name: string;
    }) => (<option key={x.id} value={x.id}>
      {x.name}
    </option>);
    return (<select aria-label={label} title={name} value={value} onChange={(e) => set(e.target.value)} data-testid={testid} className="w-full min-w-0 cursor-pointer truncate rounded border border-transparent bg-transparent py-1 pl-1 pr-1 text-xs hover:border-input focus-visible:border-ring focus-visible:outline-none">
      {!known && <option value={value}>{name}</option>}
      {groups.map((g, i) => g.label ? (<optgroup key={i} label={g.label}>
            {g.items.map(opt)}
          </optgroup>) : (g.items.map(opt)))}
    </select>);
}
function Count({ id, label, hint, value, set, max, one, many }: {
    id: string;
    label: string;
    hint: string;
    value: number;
    set: (n: number) => void;
    max: number;
    one: string;
    many: string;
}) {
    return (<div className="flex items-start gap-3">
      <Select value={String(value)} onValueChange={(v) => set(Number(v))}>
        <SelectTrigger id={id} size="sm" className="w-16 shrink-0" aria-label={label} data-testid={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: max + 1 }, (_, n) => (<SelectItem key={n} value={String(n)} textValue={String(n)}>
              {n}
              <span className="sr-only"> {n === 0 ? `: no ${many}` : n === 1 ? one : many}</span>
            </SelectItem>))}
        </SelectContent>
      </Select>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>);
}
function Toggle({ id, on, set, label, hint }: {
    id: string;
    on: boolean;
    set: (v: boolean) => void;
    label: string;
    hint: string;
}) {
    return (<div className="flex items-start gap-3">
      <Switch id={id} checked={on} onCheckedChange={set} className="mt-0.5" data-testid={id}/>
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>);
}
function F({ label, hint, children }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (<div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>);
}
