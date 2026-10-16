"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, Brain, Calculator, Clapperboard, ChevronLeft, ChevronRight, Sprout, FileText, GraduationCap, Images, Inbox, FolderOpen, Home, LayoutDashboard, ListChecks, MessageSquare, Lightbulb, Menu, Plus, Receipt, ScanSearch, BookMarked, Settings, Target, Wand2, Users, Gift, Blocks, Gauge, LayoutTemplate, Library, ShieldCheck, TrendingUp } from "lucide-react";
import { setActiveBrandAction } from "@/app/brand-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { useAdvanced } from "./mode";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { moduleOf } from "./module-nav";
export const NAV_GROUPS = [
    {
        label: "Home",
        icon: Home,
        items: [{ href: "/", label: "Home", icon: Home }],
    },
    {
        label: "Create",
        icon: Wand2,
        items: [
            { href: "/studio", label: "Create", icon: Wand2, also: ["/formats"] },
            { href: "/chat", label: "Chat", icon: MessageSquare },
            { href: "/builder", label: "Script builder", icon: Blocks },
            { href: "/copy-builder", label: "Copy builder", icon: FileText },
            { href: "/organic", label: "Organic", icon: Sprout },
            { href: "/video-editing", label: "Video editing", icon: Clapperboard },
            { href: "/coverage", label: "Coverage", icon: Target },
            { href: "/creative-quality", label: "Creative quality", icon: ListChecks },
            { href: "/creative-lab", label: "Production lab", icon: Clapperboard },
        ],
    },
    {
        label: "Review",
        icon: ListChecks,
        items: [
            { href: "/production", label: "Production", icon: Clapperboard },
            { href: "/scripts", label: "Scripts", icon: FileText },
            { href: "/compliance", label: "Compliance", icon: ShieldCheck },
        ],
    },
    {
        label: "Library",
        icon: FolderOpen,
        items: [
            { href: "/references", label: "References", icon: Images },
            { href: "/concepts", label: "Concepts", icon: Lightbulb },
            { href: "/insights", label: "Insights", icon: BarChart3 },
            { href: "/sources", label: "Sources", icon: Inbox },
        ],
    },
    {
        label: "Learning",
        icon: GraduationCap,
        items: [
            { href: "/learning", label: "Learning", icon: GraduationCap },
        ],
    },
    {
        label: "Brand",
        icon: Brain,
        items: [
            { href: "/brand", label: "Brand brain", icon: Brain },
            { href: "/personas", label: "Personas", icon: Users },
            { href: "/offers", label: "Offers", icon: Gift },
            { href: "/lessons", label: "Lessons", icon: GraduationCap },
        ],
    },
    {
        label: "Run",
        icon: Settings,
        dock: false,
        items: [
            { href: "/settings", label: "Settings", icon: Settings },
            { href: "/planner", label: "Planner", icon: Calculator },
            { href: "/costs", label: "Costs", icon: Receipt },
            { href: "/inspect", label: "Inspect", icon: ScanSearch },
            { href: "/skills", label: "Skills", icon: BookMarked },
            { href: "/guide", label: "Guide", icon: BookOpen },
        ],
    },
] as const;
export const NAV = NAV_GROUPS.flatMap((g) => [...g.items]);
export const LANDING_NAV_GROUPS = [
    {
        label: "Landing pages",
        icon: LayoutTemplate,
        items: [
            { href: "/landing", label: "CRO Studio", icon: LayoutTemplate, also: ["/landing/studio"] },
            { href: "/landing/quality", label: "Page quality", icon: ListChecks },
            { href: "/landing/images", label: "PDP images", icon: Images },
            { href: "/landing/inspiration", label: "Inspiration", icon: Library },
            { href: "/landing/articles", label: "Articles & listicles", icon: FileText },
            { href: "/landing/cro", label: "Calculators", icon: TrendingUp },
            { href: "/landing/speed", label: "Page speed", icon: Gauge },
            { href: "/landing/security", label: "Security scan", icon: ShieldCheck },
            { href: "/landing/references", label: "References", icon: Library },
            { href: "/landing/pages", label: "Earlier pages", icon: LayoutTemplate },
            { href: "/learning/landing-pages", label: "Learning", icon: GraduationCap },
        ],
    },
    {
        label: "Shared context",
        icon: Brain,
        items: [
            { href: "/brand", label: "Brand brain", icon: Brain },
            { href: "/personas", label: "Personas", icon: Users },
            { href: "/offers", label: "Offers", icon: Gift },
            { href: "/insights", label: "Insights", icon: BarChart3 },
            { href: "/studio", label: "Creative Studio ads", icon: Wand2 },
        ],
    },
] as const;
type SidebarProps = {
    brands: {
        id: string;
        name: string;
        is_demo: boolean;
    }[];
    activeBrandId: string;
};
export const SEO_NAV_GROUPS = [
    { label: "SEO", icon: ScanSearch, items: [
            { href: "/seo", label: "Overview", icon: LayoutDashboard },
            { href: "/seo/strategy", label: "Customer strategy", icon: Target },
            { href: "/seo/priorities", label: "Growth plan", icon: ListChecks },
            { href: "/seo/audits", label: "Audits", icon: ShieldCheck },
            { href: "/seo/planning", label: "Search planner", icon: Target },
            { href: "/seo/optimize", label: "Page optimizer", icon: FileText },
            { href: "/seo/measurement", label: "Measurement", icon: BarChart3 },
            { href: "/seo/opportunities", label: "Keywords", icon: Target },
            { href: "/seo/content", label: "Blog studio", icon: FileText },
            { href: "/seo/editorial-quality", label: "Editorial quality", icon: ListChecks },
            { href: "/seo/aeo", label: "AEO", icon: MessageSquare },
            { href: "/seo/geo", label: "GEO", icon: ScanSearch },
            { href: "/seo/outreach", label: "Citation outreach", icon: MessageSquare },
            { href: "/seo/agents", label: "Agent shopping", icon: Wand2 },
            { href: "/seo/changes", label: "Handoff", icon: ListChecks },
            { href: "/seo/learn", label: "Learn", icon: GraduationCap },
        ] },
    { label: "Shared context", icon: Brain, items: [
            { href: "/brand", label: "Brand brain", icon: Brain },
            { href: "/sources", label: "Sources", icon: Inbox },
            { href: "/personas", label: "Personas", icon: Users },
        ] },
] as const;
type Item = {
    href: string;
    label: string;
    icon: typeof Home;
    also?: readonly string[];
    advanced?: boolean;
};
type Group = {
    label: string;
    icon: typeof Home;
    dock?: boolean;
    items: readonly Item[];
};
function useHideOnScroll(): boolean {
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        let last = window.scrollY, timer: ReturnType<typeof setTimeout> | undefined;
        const onScroll = () => {
            const y = window.scrollY;
            if (y > last + 6 && y > 120)
                setHidden(true);
            else if (y < last - 6)
                setHidden(false);
            last = y;
            clearTimeout(timer);
            timer = setTimeout(() => setHidden(false), 700);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
    }, []);
    return hidden;
}
const under = (pathname: string, item: Item) => (item.href === "/" || item.href === "/landing" || item.href === "/seo" ? pathname === item.href || (item.also ?? []).some(h => pathname === h || pathname.startsWith(`${h}/`)) : [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`)));
const groupsOf = (pathname: string): readonly Group[] => (moduleOf(pathname) === "SEO" ? SEO_NAV_GROUPS : moduleOf(pathname) === "Landing pages" ? LANDING_NAV_GROUPS : NAV_GROUPS);
function groupOf(pathname: string): Group | undefined {
    let best: {
        g: Group;
        n: number;
    } | undefined;
    for (const g of groupsOf(pathname))
        for (const i of g.items)
            if (under(pathname, i) && (!best || i.href.length > best.n))
                best = { g, n: i.href.length };
    return best?.g;
}
export function AppSidebar(props: SidebarProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname() ?? "/";
    const dock = useRef<HTMLElement>(null);
    const tucked = useHideOnScroll();
    const [edges, setEdges] = useState({ left: false, right: false });
    useEffect(() => {
        const nav = dock.current;
        if (!nav)
            return;
        const measure = () => setEdges({ left: nav.scrollLeft > 2, right: nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2 });
        const reveal = () => {
            const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
            if (active && nav.clientWidth) {
                const box = nav.getBoundingClientRect(), item = active.getBoundingClientRect();
                if (item.left < box.left || item.right > box.right)
                    nav.scrollLeft += item.left - box.left - (box.width - item.width) / 2;
            }
            measure();
        };
        const observer = new ResizeObserver(reveal);
        observer.observe(nav);
        nav.addEventListener("scroll", measure, { passive: true });
        reveal();
        return () => { observer.disconnect(); nav.removeEventListener("scroll", measure); };
    }, [pathname]);
    useEffect(() => {
        const wide = window.matchMedia("(min-width: 768px)");
        const close = () => wide.matches && setOpen(false);
        wide.addEventListener("change", close);
        return () => wide.removeEventListener("change", close);
    }, []);
    const landing = moduleOf(pathname) === "Landing pages";
    const seo = moduleOf(pathname) === "SEO";
    const here = groupOf(pathname);
    const links: {
        href: string;
        label: string;
        icon: typeof Home;
        on: boolean;
    }[] = seo
        ? SEO_NAV_GROUPS[0].items.map((i) => ({ ...i, on: under(pathname, i) }))
        : landing
            ? LANDING_NAV_GROUPS[0].items.map((i) => ({ href: i.href, label: i.label, icon: i.icon, on: under(pathname, i) }))
            : (NAV_GROUPS as readonly Group[]).filter((g) => g.dock !== false).map((g) => ({ href: g.items[0].href, label: g.label, icon: g.icon, on: here === g }));
    return (<>
      <div className={cn("fixed bottom-[calc(var(--run-bar,0px)+1.25rem)] left-1/2 z-30 hidden max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center rounded-full border bg-card p-1.5 shadow-[0_10px_28px_-8px_rgba(40,30,10,0.22),0_1px_2px_rgba(40,30,10,0.06)] transition-transform duration-300 motion-reduce:transition-none md:flex", tucked && "translate-y-[calc(100%+2rem)]")} data-testid="dock" data-tucked={tucked ? "true" : "false"}>
      {(edges.left || edges.right) && <button type="button" aria-label="Show earlier navigation items" disabled={!edges.left} onClick={() => dock.current?.scrollBy({ left: -320 })} className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-4"/></button>}
      <nav ref={dock} aria-label="Main" className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map(({ href, label, icon: Icon, on }) => (<Link key={href} href={href} aria-current={on ? "page" : undefined} className={cn("flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-muted hover:text-foreground", on && "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>
            <Icon className="size-4 shrink-0"/>
            {label}
          </Link>))}
      </nav>
      {(edges.left || edges.right) && <button type="button" aria-label="Show more navigation items" disabled={!edges.right} onClick={() => dock.current?.scrollBy({ left: 320 })} className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted disabled:opacity-30"><ChevronRight className="size-4"/></button>}
      </div>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} className="fixed left-0 top-0 z-50 flex size-12 items-center justify-center text-foreground md:hidden" data-testid="menu-button">
        <Menu className="size-5"/>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" aria-describedby={undefined} className="w-64 max-w-[85vw] gap-0 overflow-y-auto bg-background md:hidden" data-testid="menu-sheet">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetBody {...props} onNavigate={() => setOpen(false)}/>
        </SheetContent>
      </Sheet>
    </>);
}
export function SectionNav() {
    const pathname = usePathname() ?? "/";
    const row = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const reveal = () => revealSectionLink(row.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null);
        reveal();
        window.addEventListener("resize", reveal);
        return () => window.removeEventListener("resize", reveal);
    }, [pathname]);
    if (moduleOf(pathname) === "Landing pages" || moduleOf(pathname) === "SEO")
        return null;
    const here = groupOf(pathname);
    const advanced = useAdvanced();
    if (!here || here.items.length < 2)
        return null;
    const items = here.items.filter((item) => !item.advanced || advanced);
    return (<nav aria-label={here.label} className="sticky top-[var(--bar)] z-30 hidden h-11 border-b bg-background/95 backdrop-blur md:block" data-testid="section-nav">
      <div ref={row} className="mx-auto flex h-full max-w-[80rem] items-center gap-1 overflow-x-auto px-6">
      <span className="mr-3 shrink-0 font-serif text-lg leading-none">{here.label}</span>
      {items.map((item) => {
            const on = under(pathname, item);
            const Icon = item.icon;
            return (<Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} onFocus={event => revealSectionLink(event.currentTarget)} className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground", on && "bg-accent font-semibold text-primary hover:bg-accent hover:text-primary")}>
            <Icon className="size-3.5 shrink-0"/>
            {item.label}
          </Link>);
        })}
      </div>
    </nav>);
}
function revealSectionLink(item: HTMLElement | null) {
    const row = item?.parentElement;
    if (!item || !row?.clientWidth)
        return;
    const bounds = row.getBoundingClientRect(), link = item.getBoundingClientRect();
    if (link.left < bounds.left + 8)
        row.scrollLeft -= bounds.left + 8 - link.left;
    else if (link.right > bounds.right - 8)
        row.scrollLeft += link.right - bounds.right + 8;
}
export function BrandSwitcher({ brands, activeBrandId, className }: Pick<SidebarProps, "brands" | "activeBrandId"> & {
    className?: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const active = brands.find((b) => b.id === activeBrandId);
    const switchBrand = (id: string) => start(async () => {
        await setActiveBrandAction(id);
        router.refresh();
    });
    return (<Select value={activeBrandId} onValueChange={switchBrand} disabled={pending}>
      <SelectTrigger size="sm" className={cn("bg-card font-semibold", className)} aria-label="Brand" data-testid="brand-switcher">

        <SelectValue>
          {active?.name}
          {active?.is_demo && <span className="text-xs text-muted-foreground"> (demo)</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {brands.map((b) => (<SelectItem key={b.id} value={b.id}>
            {b.name}
            {b.is_demo && <span className="text-xs text-muted-foreground"> (demo)</span>}
          </SelectItem>))}
      </SelectContent>
    </Select>);
}
function SheetBody({ brands, activeBrandId, onNavigate }: SidebarProps & {
    onNavigate?: () => void;
}) {
    const pathname = usePathname() ?? "/";
    const mod = moduleOf(pathname);
    return (<>
      <div className="space-y-3 px-4 pb-3 pt-5">
        <Link href={mod === "SEO" ? "/seo" : mod === "Landing pages" ? "/landing" : "/"} onClick={onNavigate} className="block leading-none">
          <Logo className="text-[1.7rem]" markClassName="h-[1.3rem]"/>
          <span className="mt-1 block text-sm font-medium text-muted-foreground">{mod}</span>
        </Link>
        <BrandSwitcher brands={brands} activeBrandId={activeBrandId} className="w-full"/>
        <Link href="/brands" onClick={onNavigate} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <Plus className="size-3"/> Manage brands
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-px px-3" aria-label="Main">
        {groupsOf(pathname).map((group) => (<div key={group.label} className="mb-2 flex flex-col gap-px">
            {group.items.length > 1 && <div className="px-2.5 pb-0.5 pt-1 text-[10px] font-semibold tracking-wider text-foreground/50 uppercase">{group.label}</div>}
            {group.items.map((item: Item) => {
                const { href, label, icon: Icon } = item;
                const active = under(pathname, item);
                return (<Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground", active && "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground")}>
                  <Icon className="size-4 shrink-0"/>
                  {label}
                </Link>);
            })}
          </div>))}
        <ThemeToggle label className="mb-3"/>
      </nav>
    </>);
}
