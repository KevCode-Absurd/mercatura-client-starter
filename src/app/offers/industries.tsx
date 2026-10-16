"use client";
import { useMemo, useState } from "react";
import { BedDouble, Bike, BookOpen, Car, ChefHat, Coffee, CreditCard, Diamond, Donut, Droplets, Dumbbell, ExternalLink, Factory, Film, Flower2, Gamepad2, Gem, Glasses, Globe, GraduationCap, Hammer, Headphones, House, Laptop, PawPrint, Pizza, Plane, Printer, Refrigerator, Rocket, Sandwich, Scissors, Search, Ship, Shirt, ShieldCheck, ShoppingCart, Smartphone, Sofa, Sparkles, Stethoscope, Ticket, ToyBrick, Truck, Tv, UtensilsCrossed, Wand2, Warehouse, Wine, Wrench, type LucideIcon, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import type { Industry, IndustryGroup } from "@/lib/offers/types";
import { cn } from "@/lib/utils";
const ICONS: Record<string, LucideIcon> = { BedDouble, Bike, BookOpen, Car, ChefHat, Coffee, CreditCard, Diamond, Donut, Droplets, Dumbbell, Factory, Film, Flower2, Gamepad2, Gem, Glasses, GraduationCap, Hammer, Headphones, House, Laptop, PawPrint, Pizza, Plane, Printer, Refrigerator, Rocket, Sandwich, Scissors, Ship, Shirt, ShieldCheck, ShoppingCart, Smartphone, Sofa, Sparkles, Stethoscope, Ticket, ToyBrick, Truck, Tv, UtensilsCrossed, Warehouse, Wine, Wrench };
const tone = (hue: number, k: number) => ({ background: `oklch(${0.955 - (k % 3) * 0.01} 0.03 ${hue})`, color: `oklch(0.27 0.09 ${hue})` });
const ink = (hue: number) => `oklch(0.42 0.16 ${hue})`;
interface Props {
    note: string;
    groups: IndustryGroup[];
    industries: Industry[];
    borrowed: Record<string, number>;
    brandName: string;
    category: string;
    live: boolean;
    busy: boolean;
    onBuild: (b: {
        industry: string;
        count: number;
        notes: string;
    }) => void;
    onResearch: (industry: string) => void;
}
export function IndustriesTab({ note, groups, industries, borrowed, brandName, category, live, busy, onBuild, onResearch }: Props) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        return s ? industries.filter((i) => `${i.name} ${i.patterns.map((p) => `${p.name} ${p.how}`).join(" ")}`.toLowerCase().includes(s)) : industries;
    }, [q, industries]);
    const current = industries.find((i) => i.id === open) ?? null;
    const hueOf = (i: Industry) => groups.find((g) => g.id === i.group)?.hue ?? 260;
    return (<div className="space-y-10" data-testid="industries">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="display text-3xl">Borrow an offer nobody in {category.split(":")[0].toLowerCase()} is running</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Brands in 1 category copy each other until every offer looks the same. What is ordinary for a gym, an airline or a games studio can be new here. Pick an industry, see what it does, and have its offers rebuilt for {brandName} as something an online store can deliver: shipped, downloaded, access granted, or done for the buyer.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground"/>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${industries.length} industries`} className="pl-8" data-testid="industry-search"/>
        </div>
      </div>

      {groups.map((g) => {
            const list = shown.filter((i) => i.group === g.id);
            if (!list.length)
                return null;
            return (<section key={g.id}>
            <div className="mb-4 flex items-baseline gap-2.5">
              <span className="size-2.5 self-center rounded-full" style={{ background: ink(g.hue) }}/>
              <h3 className="text-lg font-semibold">{g.name}</h3>
              <span className="text-sm text-muted-foreground">{list.length}</span>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((i, k) => {
                    const Icon = ICONS[i.icon] ?? Globe;
                    return (<li key={i.id}>
                    <button type="button" onClick={() => setOpen(i.id)} className="group relative flex h-full min-h-36 w-full flex-col justify-between gap-5 overflow-hidden rounded-xl border bg-card p-4 text-left transition duration-200 hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" data-testid={`industry-${i.id}`}>
                                            <div className="flex items-start justify-between">
                        <span className="flex size-10 items-center justify-center rounded-lg" style={tone(g.hue, k)}>
                          <Icon className="size-5"/>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          {i.researched && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Researched</span>}
                          {borrowed[i.id] > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">{borrowed[i.id]} borrowed</span>}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="font-semibold leading-snug group-hover:text-primary">{i.name}</div>
                        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{i.patterns[0]?.name}</div>
                      </div>
                    </button>
                  </li>);
                })}
            </ul>
          </section>);
        })}
      {!shown.length && <p className="text-sm text-muted-foreground">No industry matches &ldquo;{q}&rdquo;.</p>}
      <p className="max-w-3xl text-xs text-muted-foreground" data-testid="industries-note">
        {note}
      </p>

      {current && <IndustryDialog industry={current} hue={hueOf(current)} brandName={brandName} live={live} busy={busy} onClose={() => setOpen(null)} onBuild={onBuild} onResearch={onResearch}/>}
    </div>);
}
function IndustryDialog({ industry, hue, brandName, live, busy, onClose, onBuild, onResearch }: {
    industry: Industry;
    hue: number;
    brandName: string;
    live: boolean;
    busy: boolean;
    onClose: () => void;
    onBuild: Props["onBuild"];
    onResearch: Props["onResearch"];
}) {
    const [count, setCount] = useState(Math.min(4, industry.patterns.length));
    const [notes, setNotes] = useState("");
    const advanced = useAdvanced();
    const Icon = ICONS[industry.icon] ?? Globe;
    const host = (u: string) => {
        try {
            return new URL(u).hostname.replace(/^www\./, "");
        }
        catch {
            return u;
        }
    };
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl" data-testid="industry-dialog">
        <div className="relative overflow-hidden rounded-t-lg p-6" style={tone(hue, 0)}>
          <Icon className="absolute -right-6 -top-6 size-40 opacity-15" strokeWidth={1.25}/>
          <DialogHeader>
            <DialogTitle className="display text-3xl">{industry.name}</DialogTitle>
            <DialogDescription style={{ color: "inherit" }} className="max-w-xl opacity-85">
              {industry.researched ? industry.researched.summary : "What this industry is known for doing with its offers. Written from general knowledge: research it to add current examples with their sources."}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5 p-6 pt-4">
          <ol className="space-y-3" data-testid="industry-patterns">
            {industry.patterns.map((p, n) => (<li key={p.name} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: ink(hue) }}>
                  {n + 1}
                </span>
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-muted-foreground">{p.how}</div>
                  {p.example && (<div className="mt-0.5 text-xs">
                      {p.example}{" "}
                      {p.source && (<a href={p.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                          {host(p.source)}
                          <ExternalLink className="size-3"/>
                        </a>)}
                    </div>)}
                </div>
              </li>))}
          </ol>

          <div className="rounded-lg border border-input p-4">
            <div className="text-sm font-semibold">Rebuild these for {brandName}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Each offer takes 1 pattern above and translates it into something {brandName} can sell online, priced on its own numbers and tested against the 7 failures. They arrive as drafts.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                How many
                <Input type="number" min={1} max={6} value={count} onChange={(e) => setCount(Math.max(1, Math.min(6, Number(e.target.value) || 1)))} className="w-20" data-testid="industry-count"/>
              </label>
              <Textarea rows={1} className="min-h-9 flex-1" placeholder="Notes (optional): a pattern to start from, or something the brand can't do" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 600))} data-testid="industry-notes"/>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{live ? (advanced ? "About 3 cents, and about 2 minutes." : "About 2 minutes.") : "Not switched on for this account."}</span>
              <Button disabled={!live || busy} onClick={() => { onBuild({ industry: industry.id, count, notes }); onClose(); }} data-testid="industry-build">
                <Wand2 className="size-4"/>
                Design {count} borrowed offer{count === 1 ? "" : "s"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground" data-testid="industry-research-state">
              {industry.researched ? `Researched on the web, ${industry.researched.at}. ${industry.researched.sources.length} source${industry.researched.sources.length === 1 ? "" : "s"}.` : "Not researched yet."}
            </span>
            <Button variant="outline" size="sm" disabled={!live || busy} onClick={() => confirm(advanced ? `Search the web for what ${industry.name.toLowerCase()} are offering now? Up to 4 searches, about 20 cents. The result is kept and used by every brand.` : `Search the web for what ${industry.name.toLowerCase()} are offering now? The result is kept and used by every brand.`) && (onResearch(industry.id), onClose())} data-testid="industry-research">
              <Globe className="size-4"/>
              {industry.researched ? "Research again" : "Research on the web"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
