"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
export interface CreatePart {
    id: string;
    label: string;
    count?: number;
}
const LINE = 150;
export function CreatePills({ parts }: {
    parts: CreatePart[];
}) {
    const ids = parts.map((p) => p.id).join(" ");
    const [on, setOn] = useState(parts[0]?.id ?? "");
    useEffect(() => {
        const els = ids
            .split(" ")
            .map((id) => document.getElementById(id))
            .filter((e): e is HTMLElement => !!e);
        const pick = () => {
            let cur = els[0]?.id ?? "";
            for (const el of els)
                if (el.getBoundingClientRect().top <= LINE)
                    cur = el.id;
            if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
                cur = els[els.length - 1]?.id ?? cur;
            setOn(cur);
        };
        pick();
        window.addEventListener("scroll", pick, { passive: true });
        window.addEventListener("resize", pick);
        return () => {
            window.removeEventListener("scroll", pick);
            window.removeEventListener("resize", pick);
        };
    }, [ids]);
    const go = (e: React.MouseEvent, id: string) => {
        const el = document.getElementById(id);
        if (!el)
            return;
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
    };
    return (<nav aria-label="Parts of this screen" className="sticky top-[var(--top)] z-20 mx-6 flex gap-2 overflow-x-auto border-b bg-background/95 py-2.5 backdrop-blur" data-testid="create-pills">
      {parts.map((p) => (<a key={p.id} href={`#${p.id}`} onClick={(e) => go(e, p.id)} aria-current={on === p.id ? "true" : undefined} className={cn("whitespace-nowrap rounded-full border px-3.5 py-1 text-sm", on === p.id ? "border-primary bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-muted")} data-testid={`create-pill-${p.id}`}>
          {p.label}
          {p.count !== undefined && <span className={cn("ml-1.5 tabular-nums", on === p.id ? "text-primary-foreground/80" : "text-muted-foreground")}>{p.count}</span>}
        </a>))}
    </nav>);
}
