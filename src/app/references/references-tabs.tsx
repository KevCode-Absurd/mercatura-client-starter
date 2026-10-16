"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
export function ReferencesTabs() {
    const pathname = usePathname();
    return (<nav aria-label="Reference libraries" className="mx-6 flex gap-6 overflow-x-auto border-b border-rule">
      {[
            { href: "/references", label: "References" },
            { href: "/references/add", label: "Add references" },
            { href: "/references/avatars", label: "Avatar references" },
            { href: "/references/competitors", label: "Competitor playbook" },
        ].map(({ href, label }) => (<Link key={href} href={href} aria-current={(pathname === href || (href === "/references/avatars" && pathname.startsWith(`${href}/`))) ? "page" : undefined} className={cn("whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors", pathname === href || (href === "/references/avatars" && pathname.startsWith(`${href}/`)) ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {label}
        </Link>))}
    </nav>);
}
