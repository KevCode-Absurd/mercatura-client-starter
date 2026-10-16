"use client";
import { useEffect } from "react";
import { startsNavigation } from "./nav-progress";
export const LEAVE_QUESTION = "You have unsaved edits. Leave this screen and lose them?";
export const WRITE_AGAIN_QUESTION = "This ad was edited by hand. Write it again and lose those edits?";
type Anchor = Parameters<typeof startsNavigation>[0];
type Press = Parameters<typeof startsNavigation>[1];
export function stopsLeaving(dirty: boolean, anchor: Anchor, press: Press): boolean {
    return dirty && startsNavigation(anchor, press);
}
export function confirmWriteAgain(editedByHand: boolean, ask: (question: string) => boolean = (q) => window.confirm(q)): boolean {
    return !editedByHand || ask(WRITE_AGAIN_QUESTION);
}
export function useUnsavedWarning(dirty: boolean) {
    useEffect(() => {
        if (!dirty)
            return;
        const onUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        const onClick = (e: MouseEvent) => {
            const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
            if (!anchor)
                return;
            if (!stopsLeaving(true, { href: anchor.href, target: anchor.target, hasDownload: anchor.hasAttribute("download"), origin: location.origin, currentHref: location.href }, e))
                return;
            if (!window.confirm(LEAVE_QUESTION))
                e.preventDefault();
        };
        window.addEventListener("beforeunload", onUnload);
        window.addEventListener("click", onClick, true);
        return () => {
            window.removeEventListener("beforeunload", onUnload);
            window.removeEventListener("click", onClick, true);
        };
    }, [dirty]);
}
