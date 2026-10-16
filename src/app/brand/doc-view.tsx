"use client";
import { Fragment, useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TAB_OF_FILE, fileName } from "@/lib/brain/file-names";
import { field, fieldItem, type Block, type Section } from "@/lib/brain/md";
import { cn } from "@/lib/utils";
import { addSectionAction, removeSectionAction, saveSectionAction } from "./brain-actions";
export function Inline({ text }: {
    text: string;
}) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|(?<![*\w])\*[^*\n]+\*(?![*\w]))/g);
    return (<>
      {parts.map((p, i) => {
            if (fileName().test(p) && !/^\[/.test(p)) {
                const bare = p.replace(/^(\*\*|`|\*)|(\*\*|`|\*)$/g, "");
                return (<Fragment key={i}>
              {bare.split(fileName()).map((x, k) => (TAB_OF_FILE[x] ? <Link key={k} href={TAB_OF_FILE[x].href} className="text-primary underline underline-offset-2">the {TAB_OF_FILE[x].label} tab</Link> : <Fragment key={k}>{x}</Fragment>))}
            </Fragment>);
            }
            if (/^\*\*[^*]+\*\*$/.test(p))
                return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
            if (/^`[^`]+`$/.test(p))
                return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{p.slice(1, -1)}</code>;
            const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
            if (link)
                return /^https?:\/\//.test(link[2]) ? <a key={i} href={link[2]} target="_blank" rel="noreferrer" className="text-primary underline">{link[1]}</a> : <span key={i}>{link[1]}</span>;
            if (/^\*[^*\n]+\*$/.test(p))
                return <em key={i}>{p.slice(1, -1)}</em>;
            return <Fragment key={i}>{p}</Fragment>;
        })}
    </>);
}
const isFields = (b: Block) => b.kind === "list" && b.items.length > 0 && b.items.every((it) => !!field(it));
const NAMES = "sm:grid-cols-[13rem_1fr]";
const NAME_COL = "sm:w-[14rem]";
const HEX = /^#[0-9a-f]{6}$/i;
export function Blocks({ blocks, quietWhenEmpty = false }: {
    blocks: Block[];
    quietWhenEmpty?: boolean;
}) {
    const shown = blocks.filter((b) => b.kind !== "rule");
    if (!shown.length)
        return quietWhenEmpty ? null : <p className="text-sm italic text-muted-foreground">Nothing written yet.</p>;
    return (<div className="space-y-3 text-sm">
      {shown.map((b, i) => {
            if (b.kind === "para")
                return <p key={i} className="whitespace-pre-line leading-relaxed"><Inline text={b.text}/></p>;
            if (b.kind === "quote")
                return <blockquote key={i} className="whitespace-pre-line border-l border-rule pl-3 text-muted-foreground"><Inline text={b.text}/></blockquote>;
            if (b.kind === "code")
                return <pre key={i} className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{b.text}</pre>;
            if (b.kind === "table")
                return (<div key={i} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>{b.head.map((h, k) => <th key={k} className={cn("border-b border-rule py-1.5 pr-4 text-left text-xs font-semibold text-muted-foreground [overflow-wrap:normal]", k === 0 && NAME_COL)}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {b.rows.map((r, n) => (<tr key={n} className="border-b align-top last:border-b-0">
                      {b.head.map((_, k) => (<td key={k} className={cn("py-2 pr-4", k === 0 && "font-medium [overflow-wrap:normal]")}>

                          {HEX.test((r[k] ?? "").trim()) ? (<span className="inline-flex items-center gap-2 whitespace-nowrap font-mono text-[13px]">
                              <span className="size-5 rounded-full border" style={{ background: (r[k] ?? "").trim() }}/>
                              {(r[k] ?? "").trim().toUpperCase()}
                            </span>) : (<Inline text={r[k] ?? ""}/>)}
                        </td>))}
                    </tr>))}
                  {!b.rows.length && <tr><td colSpan={b.head.length} className="py-2 italic text-muted-foreground">No rows yet.</td></tr>}
                </tbody>
              </table>
            </div>);
            if (b.kind === "list" && isFields(b))
                return (<dl key={i} className={cn("grid grid-cols-1 gap-x-4 gap-y-2", NAMES)}>
              {b.items.map((it, n) => {
                        const f = field(it)!;
                        return (<Fragment key={n}>
                    <dt className="text-muted-foreground">{f.key}</dt>
                    <dd className={cn("whitespace-pre-line", !f.value && "italic text-muted-foreground")}>{f.value ? <Inline text={f.value}/> : "Blank"}</dd>
                  </Fragment>);
                    })}
            </dl>);
            if (b.kind === "list") {
                const L = b.ordered ? "ol" : "ul";
                return (<L key={i} className={cn("space-y-1 pl-5", b.ordered ? "list-decimal" : "list-disc")}>
              {b.items.map((it, n) => <li key={n} className="whitespace-pre-line leading-relaxed"><Inline text={it}/></li>)}
            </L>);
            }
            return null;
        })}
    </div>);
}
function BlockEditor({ block, onChange, onRemove }: {
    block: Block;
    onChange: (b: Block) => void;
    onRemove: () => void;
}) {
    const remove = (<button type="button" onClick={onRemove} className="text-xs text-muted-foreground hover:text-red-600" title="Remove this part">
      Remove this part
    </button>);
    if (block.kind === "rule")
        return null;
    if (block.kind === "para" || block.kind === "quote" || block.kind === "code")
        return (<div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{block.kind === "para" ? "Text" : block.kind === "quote" ? "Note" : "Code"}</span>{remove}</div>
        <Textarea value={block.text} rows={Math.min(12, Math.max(2, block.text.split("\n").length + 1))} onChange={(e) => onChange({ ...block, text: e.target.value })} data-testid="edit-text"/>
      </div>);
    if (block.kind === "list" && isFields(block))
        return (<div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Fields</span>{remove}</div>
        {block.items.map((it, n) => {
                const f = field(it)!;
                return (<div key={n} className={cn("grid grid-cols-1 gap-x-4 gap-y-1", NAMES)}>
              <label className="pt-2 text-sm text-muted-foreground">{f.key}</label>
              <Textarea value={f.value} rows={Math.min(8, Math.max(1, Math.ceil(f.value.length / 90)))} data-testid={`edit-field-${f.key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === n ? fieldItem(f.key, e.target.value.replace(/\n+/g, " ")) : x)) })}/>
            </div>);
            })}
      </div>);
    if (block.kind === "list")
        return (<div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{block.ordered ? "Numbered list, in order of importance" : "List"}</span>{remove}</div>
        {block.items.map((it, n) => (<div key={n} className="flex gap-1.5">
            <Textarea value={it} rows={Math.min(6, Math.max(1, Math.ceil(it.length / 100)))} data-testid="edit-item" onChange={(e) => onChange({ ...block, items: block.items.map((x, k) => (k === n ? e.target.value : x)) })}/>
            <Button type="button" variant="ghost" size="icon" title="Remove this line" onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== n) })}><X className="size-4"/></Button>
          </div>))}
        <Button type="button" variant="outline" size="sm" data-testid="edit-add-item" onClick={() => onChange({ ...block, items: [...block.items, ""] })}><Plus className="size-3.5"/> Add a line</Button>
      </div>);
    return (<div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Table</span>{remove}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead><tr>{block.head.map((h, k) => <th key={k} className="pb-1 pr-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>)}<th /></tr></thead>
          <tbody>
            {block.rows.map((r, n) => (<tr key={n} className="align-top">
                {block.head.map((_, k) => (<td key={k} className="pb-1.5 pr-1.5">
                    <Textarea value={r[k] ?? ""} rows={Math.min(5, Math.max(1, Math.ceil((r[k] ?? "").length / 34)))} className="min-h-9" data-testid="edit-cell" onChange={(e) => onChange({ ...block, rows: block.rows.map((x, j) => (j === n ? block.head.map((__, c) => (c === k ? e.target.value.replace(/\n+/g, " ") : (x[c] ?? ""))) : x)) })}/>
                  </td>))}
                <td><Button type="button" variant="ghost" size="icon" title="Remove this row" onClick={() => onChange({ ...block, rows: block.rows.filter((_, j) => j !== n) })}><X className="size-4"/></Button></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" data-testid="edit-add-row" onClick={() => onChange({ ...block, rows: [...block.rows, block.head.map(() => "")] })}><Plus className="size-3.5"/> Add a row</Button>
    </div>);
}
export function SectionCard({ doc, section, removable = false, className, hideTitle = false, startEditing = false, onDone, testId, quietWhenEmpty = false, }: {
    doc: string;
    section: Section;
    removable?: boolean;
    className?: string;
    hideTitle?: boolean;
    startEditing?: boolean;
    onDone?: () => void;
    testId?: string;
    quietWhenEmpty?: boolean;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState(startEditing);
    const [title, setTitle] = useState(section.title);
    const [blocks, setBlocks] = useState<Block[]>(startEditing ? section.blocks.filter((b) => b.kind !== "rule") : section.blocks);
    const [busy, start] = useTransition();
    useUnsavedWarning(editing && (title !== section.title || JSON.stringify(blocks) !== JSON.stringify(section.blocks.filter((b) => b.kind !== "rule"))));
    const close = () => {
        setEditing(false);
        onDone?.();
    };
    const open = () => {
        setTitle(section.title);
        setBlocks(section.blocks.filter((b) => b.kind !== "rule"));
        setEditing(true);
    };
    const save = () => start(async () => {
        const res = await saveSectionAction(doc, section.id, title, blocks);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Saved");
        router.refresh();
        close();
    });
    const remove = () => {
        if (!window.confirm(`Remove "${section.title}" and everything under it?`))
            return;
        start(async () => {
            const res = await removeSectionAction(doc, section.id);
            if (!res.ok)
                return void toast.error(res.error);
            router.refresh();
        });
    };
    const H = section.level <= 2 ? "h2" : "h3";
    return (<section className={cn("min-w-0 rounded-lg border bg-card p-6 max-md:p-4", section.level > 2 && "border-dashed", className)} data-testid={testId ?? `section-${section.id}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        {editing && !startEditing ? <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-md font-semibold" aria-label="Section title"/> : hideTitle ? <span /> : <H className={section.level <= 2 ? "display text-2xl" : "text-base font-semibold"}><Inline text={section.title}/></H>}
        {!editing && (<div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={open} data-testid="section-edit"><Pencil className="size-3.5"/> Edit</Button>
            {removable && <Button variant="ghost" size="icon" onClick={remove} disabled={busy} title="Remove this section" aria-label="Remove this section"><Trash2 className="size-3.5"/></Button>}
          </div>)}
      </div>
      {!editing ? (<Blocks blocks={section.blocks} quietWhenEmpty={quietWhenEmpty}/>) : (<div className="space-y-4">
          {blocks.map((b, i) => (<BlockEditor key={i} block={b} onChange={(nb) => setBlocks(blocks.map((x, k) => (k === i ? nb : x)))} onRemove={() => setBlocks(blocks.filter((_, k) => k !== i))}/>))}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">Add:</span>
            <Button type="button" variant="outline" size="sm" data-testid="add-text" onClick={() => setBlocks([...blocks, { kind: "para", text: "" }])}>Text</Button>
            <Button type="button" variant="outline" size="sm" data-testid="add-list" onClick={() => setBlocks([...blocks, { kind: "list", ordered: false, items: [""] }])}>List</Button>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={busy} data-testid="section-save">{busy ? "Saving" : "Save"}</Button>
            </div>
          </div>
        </div>)}
    </section>);
}
export function AddSection({ doc, under, level = 2, label = "Add a section" }: {
    doc: string;
    under?: string;
    level?: number;
    label?: string;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [busy, start] = useTransition();
    const add = () => start(async () => {
        const res = await addSectionAction(doc, title, under, level);
        if (!res.ok)
            return void toast.error(res.error);
        setTitle("");
        setOpen(false);
        router.refresh();
    });
    if (!open)
        return <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="add-section"><Plus className="size-3.5"/> {label}</Button>;
    return (<div className="flex max-w-xl gap-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Its title" autoFocus onKeyDown={(e) => e.key === "Enter" && title.trim() && add()} data-testid="add-section-title"/>
      <Button size="sm" onClick={add} disabled={busy || !title.trim()} data-testid="add-section-save">Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>);
}
export function DocView({ doc, sections, skip = [], removable = true, slots = {} }: {
    doc: string;
    sections: Section[];
    skip?: string[];
    removable?: boolean;
    slots?: Record<string, React.ReactNode>;
}) {
    const hidden = new Set<string>();
    for (const [i, s] of sections.entries()) {
        if (!skip.includes(s.id))
            continue;
        hidden.add(s.id);
        for (const x of sections.slice(i + 1)) {
            if (x.level <= s.level)
                break;
            hidden.add(x.id);
        }
    }
    const shown = sections.filter((s) => !hidden.has(s.id));
    const groups: {
        head: Section;
        parts: Section[];
    }[] = [];
    for (const s of shown) {
        const last = groups.at(-1);
        if (last && s.level > last.head.level)
            last.parts.push(s);
        else
            groups.push({ head: s, parts: [] });
    }
    const bare = "rounded-none border-0 bg-transparent p-0 max-md:p-0";
    return (<div className="space-y-5" data-testid={`doc-${doc}`}>
      {groups.map(({ head, parts }) => (<div key={head.id} className="min-w-0 rounded-xl border bg-card p-7 max-md:p-4">
          <SectionCard doc={doc} section={head} removable={removable} className={bare} quietWhenEmpty={parts.length > 0 || !!slots[head.id]}/>
          {slots[head.id] && <div className="mt-2">{slots[head.id]}</div>}
          {parts.map((s) => (<div key={s.id} className="mt-6 border-t pt-5">
              <SectionCard doc={doc} section={s} removable={removable} className={bare}/>
            </div>))}
        </div>))}
      {!shown.length && <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Nothing written here yet.</p>}
      <AddSection doc={doc}/>
    </div>);
}
