"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
export const MODULES = [
    { label: "Data" },
    { label: "Insights" },
    { label: "Creative Studio", href: "/" },
    { label: "Ad monitoring" },
    { label: "Experiments" },
    { label: "Landing pages", href: "/landing" },
    { label: "Retention" },
    { label: "Customer experience" },
    { label: "SEO", href: "/seo" },
] as const;
export const moduleOf = (pathname: string) => (pathname === "/seo" || pathname.startsWith("/seo/") ? "SEO" : pathname === "/learning" || pathname.startsWith("/learning/") ? "Learning" : pathname === "/landing" || pathname.startsWith("/landing/") ? "Landing pages" : "Creative Studio");
export function ModuleNav() {
    const open = moduleOf(usePathname() ?? "/");
    const nav = useRef<HTMLElement>(null);
    useEffect(() => {
        const reveal = () => nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
        reveal();
        window.addEventListener("resize", reveal);
        return () => window.removeEventListener("resize", reveal);
    }, [open]);
    return (<nav ref={nav} aria-label="Modules" className="flex min-w-0 items-center gap-0.5 overflow-x-auto max-2xl:text-[13px]">
      {MODULES.map((m) => "href" in m ? (<Link key={m.label} href={m.href} aria-current={open === m.label ? "page" : undefined} className={cn("flex items-center whitespace-nowrap rounded-md px-2.5 py-1.5", open === m.label ? "bg-accent font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")} data-testid={`module-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            {m.label}
          </Link>) : null)}
    </nav>);
}
