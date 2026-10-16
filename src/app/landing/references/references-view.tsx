"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Card, LibraryDomain } from "@/lib/landing/library";
import type { SwipeNiche } from "@/lib/landing/references";
import { cn } from "@/lib/utils";
import { searchCardsAction } from "../actions";
interface Props {
    templates: {
        id: string;
        title: string;
        skill: string;
        for: string;
    }[];
    wireframes: {
        id: string;
        title: string;
    }[];
    swipe: SwipeNiche[];
    niche: string | null;
    buckets: {
        id: string;
        label: string;
        photos: number;
    }[];
    counts: Record<LibraryDomain, number>;
}
const DOMAIN_LABEL: Record<LibraryDomain, string> = { "landing-pages": "Landing pages", cro: "CRO", speed: "Speed", security: "Security" };
export function ReferencesView({ templates, wireframes, swipe, niche, buckets, counts }: Props) {
    const [tpl, setTpl] = useState(templates[0]?.id ?? "");
    const [open, setOpen] = useState<string>(niche && swipe.some((s) => s.niche === niche) ? niche : (swipe[0]?.niche ?? ""));
    const [q, setQ] = useState("");
    const [domains, setDomains] = useState<LibraryDomain[]>([]);
    const [cards, setCards] = useState<Card[] | null>(null);
    const [pending, start] = useTransition();
    const search = () => start(async () => {
        const res = await searchCardsAction(q, domains);
        setCards(res.ok ? res.cards : []);
    });
    return (<div className="px-6 pb-10 pt-5">
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Page templates</TabsTrigger>
          <TabsTrigger value="wireframes">Wireframes</TabsTrigger>
          <TabsTrigger value="swipe">Swipe library</TabsTrigger>
          <TabsTrigger value="images">Product images</TabsTrigger>
          <TabsTrigger value="cards" data-testid="refs-cards-tab">Knowledge cards</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-4">
          <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
            <ul className="grid content-start gap-2">
              {templates.map((t) => (<li key={t.id}>
                  <button type="button" onClick={() => setTpl(t.id)} className={cn("w-full rounded-md border-2 p-3 text-left text-sm", tpl === t.id ? "border-primary bg-secondary" : "border-border hover:border-foreground/40")}>
                    <div className="font-bold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.for}</div>
                  </button>
                </li>))}
            </ul>
            <div>
              <a href={`/api/landing/reference/${tpl}`} target="_blank" rel="noreferrer" className="mb-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Open full size <ExternalLink className="size-3.5"/>
              </a>
              <iframe title="Template" src={`/api/landing/reference/${tpl}`} className="h-[760px] w-full rounded-md border bg-white" sandbox="allow-scripts"/>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wireframes" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">Explore ThrillX page layouts, section by section. The grey bands show where to add customer proof, answer concerns and explain your offer.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {wireframes.map((w) => (<a key={w.id} href={`/api/landing/reference/${w.id}`} target="_blank" rel="noreferrer" className="block rounded-md border p-2 hover:border-foreground/40">
                <div className="mb-2 text-sm font-bold">{w.title}</div>

                <img src={`/api/landing/reference/${w.id}`} alt={w.title} className="max-h-[620px] w-full object-contain object-top" loading="lazy"/>
              </a>))}
          </div>
        </TabsContent>

        <TabsContent value="swipe" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">Store examples to learn from. {niche ? `Opened on ${niche}, the niche closest to this brand.` : ""} Study the niche closest to the brand first.</p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {swipe.map((s) => (<button key={s.niche} type="button" onClick={() => setOpen(s.niche)} className={cn("rounded-full border px-2.5 py-1 text-xs", open === s.niche ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}>
                {s.niche} ({s.brands.length})
              </button>))}
          </div>
          <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3 xl:grid-cols-5">
            {swipe
            .find((s) => s.niche === open)
            ?.brands.map((b) => (<li key={b.url}>
                  <a href={b.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {b.name}
                  </a>
                </li>))}
          </ul>
        </TabsContent>

        <TabsContent value="images" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">Every image slot on a page names the job its picture does, from the product image templates. The gallery is a mini landing page: benefits, proof, before and after, what is included. A slot with no photo is shown as a labelled box until one is added or made.</p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {buckets.map((b) => (<li key={b.id} className="rounded-md border p-3 text-sm">
                <div className="font-bold">{b.label}</div>
                <div className="text-xs text-muted-foreground">{b.photos ? `${b.photos} of the brand's photos look like this` : "No photo of this kind yet"}</div>
              </li>))}
          </ul>
          <Link href="/studio/new?kind=pdp" className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Make product page images in Creative Studio
          </Link>
        </TabsContent>

        <TabsContent value="cards" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">The ecomOS library: cards distilled from courses and talks, each a task with when to use it, the steps and the caveats. {Object.entries(counts).map(([d, n]) => `${n} ${DOMAIN_LABEL[d as LibraryDomain].toLowerCase()}`).join(", ")}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-96" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="sticky add to cart, free shipping threshold, LCP image..." data-testid="refs-q"/>
            {(Object.keys(DOMAIN_LABEL) as LibraryDomain[]).map((d) => (<label key={d} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={domains.includes(d)} onChange={() => setDomains(domains.includes(d) ? domains.filter((x) => x !== d) : [...domains, d])}/>
                {DOMAIN_LABEL[d]}
              </label>))}
            <Button size="sm" onClick={search} disabled={pending} data-testid="refs-search">
              {pending ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>} Search
            </Button>
          </div>
          {cards && (<ul className="mt-4 grid gap-2" data-testid="refs-results">
              {cards.length ? (cards.map((c) => (<li key={c.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-bold">{c.title}</span>
                      <span className="rounded-sm bg-muted px-1.5 text-[10px] uppercase">{DOMAIN_LABEL[c.domain]}</span>
                    </div>
                    <p className="text-muted-foreground">{c.summary}</p>
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-primary">When and how</summary>
                      <p className="mt-1">
                        <b>Use when:</b> {c.use_when}
                      </p>
                      <ol className="mt-1 list-decimal pl-4">
                        {c.steps.map((s, i) => (<li key={i}>{s}</li>))}
                      </ol>
                      {c.caveats.length > 0 && <p className="mt-1 text-muted-foreground">Caveats: {c.caveats.join(" ")}</p>}
                      {c.source_name && <p className="mt-1 text-muted-foreground">Source: {c.source_name}</p>}
                    </details>
                  </li>))) : (<li className="text-sm text-muted-foreground">No card matches.</li>)}
            </ul>)}
        </TabsContent>
      </Tabs>
    </div>);
}
