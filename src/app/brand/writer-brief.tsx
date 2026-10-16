"use client";
import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/brain/md";
import { SectionCard } from "./doc-view";
export interface BriefPart {
    key: string;
    title: string;
    lines: string[];
    cut: string;
    doc: string;
    section: Section | null;
    tab: {
        href: string;
        label: string;
    };
}
export function WriterBrief({ parts }: {
    parts: BriefPart[];
}) {
    const [editing, setEditing] = useState<string | null>(null);
    return (<div className="grid grid-cols-1 gap-x-12 gap-y-9 lg:grid-cols-2">
      {parts.map((p) => (<div key={p.key} className="min-w-0" data-testid={`brief-${p.key}`}>
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-rule pb-1.5">
            <h3 className="font-semibold">{p.title}</h3>
            {editing !== p.key &&
                (p.section ? (<Button variant="ghost" size="sm" onClick={() => setEditing(p.key)} data-testid={`brief-edit-${p.key}`}>
                  <Pencil className="size-3.5"/> Edit
                </Button>) : (<Link href={p.tab.href} className="text-sm text-primary hover:underline">
                  Write it in {p.tab.label}
                </Link>))}
          </div>
          {editing === p.key && p.section ? (<>
              <p className="mb-3 text-[13px] leading-snug text-muted-foreground">
                This is the whole section, from {p.tab.label}. {p.cut}
              </p>
              <SectionCard doc={p.doc} section={p.section} hideTitle startEditing onDone={() => setEditing(null)} className="border-primary/40" testId={`brief-form-${p.key}`}/>
            </>) : p.lines.length ? (<ul className="space-y-1.5 text-[15px] leading-relaxed">
              {p.lines.map((l, i) => (<li key={i} className="flex gap-2.5">
                  <span className="mt-[0.6em] size-1 shrink-0 rounded-full bg-foreground/40"/>
                  <span className="min-w-0">{l}</span>
                </li>))}
            </ul>) : (<p className="text-sm italic text-muted-foreground">Nothing written yet, so a writer is sent nothing here.</p>)}
        </div>))}
    </div>);
}
