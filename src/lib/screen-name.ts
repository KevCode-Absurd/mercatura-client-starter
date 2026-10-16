export interface ScreenItem {
    href: string;
    label: string;
}
export function screenName(pathname: string, items: ScreenItem[]): string | null {
    const hit = items
        .filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(`${i.href}/`)))
        .sort((a, b) => b.href.length - a.href.length)[0];
    return hit?.label ?? null;
}
