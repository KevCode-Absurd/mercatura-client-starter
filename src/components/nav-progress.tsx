"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
export function startsNavigation(anchor: {
    href: string;
    target: string;
    hasDownload: boolean;
    origin: string;
    currentHref: string;
}, event: {
    button: number;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    defaultPrevented: boolean;
}): boolean {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return false;
    if (anchor.hasDownload || (anchor.target && anchor.target !== "_self"))
        return false;
    if (!anchor.href.startsWith(anchor.origin + "/"))
        return false;
    return anchor.href.split("#")[0] !== anchor.currentHref.split("#")[0];
}
export function NavProgress() {
    const pathname = usePathname();
    const search = useSearchParams()?.toString();
    const [pending, setPending] = useState(false);
    useEffect(() => { setPending(false); }, [pathname, search]);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const arm = () => {
            setPending(true);
            clearTimeout(timer);
            timer = setTimeout(() => setPending(false), 20000);
        };
        const onClick = (event: MouseEvent) => {
            const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor)
                return;
            if (startsNavigation({ href: anchor.href, target: anchor.target, hasDownload: anchor.hasAttribute("download"), origin: location.origin, currentHref: location.href }, event))
                arm();
        };
        const onPop = () => arm();
        document.addEventListener("click", onClick, true);
        window.addEventListener("popstate", onPop);
        return () => { clearTimeout(timer); document.removeEventListener("click", onClick, true); window.removeEventListener("popstate", onPop); };
    }, []);
    return (<div aria-hidden={!pending} role="progressbar" aria-label="Opening the screen" aria-busy={pending} data-testid="nav-progress" data-pending={pending ? "true" : "false"} className="pointer-events-none fixed left-0 right-0 top-[var(--bar)] z-50 h-0.5 overflow-hidden">
      {pending && <div className="h-full w-1/3 animate-[nav-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary"/>}
    </div>);
}
