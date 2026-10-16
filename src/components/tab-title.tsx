"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { screenName, type ScreenItem } from "@/lib/screen-name";
import { LANDING_NAV_GROUPS, SEO_NAV_GROUPS, NAV } from "./app-sidebar";
import { PLATFORM } from "./logo";
import { moduleOf } from "./module-nav";
const lite = (items: readonly {
    href: string;
    label: string;
}[]): ScreenItem[] => items.map((i) => ({ href: i.href, label: i.label }));
const EXTRA: ScreenItem[] = [
    { href: "/studio/sprint", label: "100-ad sprint" },
    { href: "/formats", label: "Create" },
    { href: "/brands", label: "Brands" },
];
const STUDIO = [...lite(NAV), ...EXTRA];
const LANDING = lite(LANDING_NAV_GROUPS[0].items);
export function TabTitle() {
    const pathname = usePathname() ?? "/";
    useEffect(() => {
        const mod = moduleOf(pathname);
        const name = screenName(pathname, mod === "SEO" ? lite(SEO_NAV_GROUPS[0].items) : mod === "Landing pages" ? LANDING : STUDIO);
        const title = mod === "Learning" ? `${name ?? "Learning"} · ${PLATFORM}` : name ? `${name} · ${mod}` : `${mod} · ${PLATFORM}`;
        document.title = title;
        const again = setTimeout(() => {
            if (document.title !== title)
                document.title = title;
        }, 600);
        return () => clearTimeout(again);
    }, [pathname]);
    return null;
}
