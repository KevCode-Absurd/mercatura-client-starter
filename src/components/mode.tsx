"use client";
import { createContext, useCallback, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setModeAction } from "@/app/mode-actions";
import { NO_SWITCH, SECTIONS, modeOf, sectionOf, type Mode, type Modes, type SectionId } from "@/lib/ui-mode";
import { cn } from "@/lib/utils";
const Ctx = createContext<{
    modes: Modes;
    fallback: Mode;
    set: (s: SectionId, m: Mode) => void;
}>({ modes: {}, fallback: "advanced", set: () => { } });
export function ModeProvider({ modes: initial, fallback, children }: {
    modes: Modes;
    fallback: Mode;
    children: ReactNode;
}) {
    const [local, setLocal] = useState<Modes>({});
    const set = useCallback((s: SectionId, m: Mode) => setLocal((cur) => ({ ...cur, [s]: m })), []);
    const value = useMemo(() => ({ modes: { ...initial, ...local }, fallback, set }), [initial, local, fallback, set]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useMode(section?: SectionId): Mode {
    const { modes, fallback } = useContext(Ctx);
    const pathname = usePathname();
    return modeOf(modes, section ?? sectionOf(pathname), fallback);
}
export const useAdvanced = (section?: SectionId) => useMode(section) === "advanced";
export function Adv({ children, section }: {
    children: ReactNode;
    section?: SectionId;
}) {
    return useAdvanced(section) ? <>{children}</> : null;
}
export function Simple({ children, section }: {
    children: ReactNode;
    section?: SectionId;
}) {
    return useAdvanced(section) ? null : <>{children}</>;
}
export function ModeToggle() {
    const pathname = usePathname();
    const router = useRouter();
    const section = sectionOf(pathname);
    const { modes, fallback, set } = useContext(Ctx);
    const [pending, start] = useTransition();
    if (NO_SWITCH.includes(section))
        return null;
    const mode = modeOf(modes, section, fallback);
    const label = SECTIONS.find((s) => s.id === section)?.label ?? "";
    const pick = (m: Mode) => {
        if (m === mode)
            return;
        set(section, m);
        start(async () => {
            await setModeAction(section, m);
            router.refresh();
        });
    };
    return (<div className="flex items-center gap-2" data-testid="mode-toggle" data-section={section} data-mode={mode}>
      <span className="hidden text-muted-foreground 2xl:inline">{label}</span>
      <div role="radiogroup" aria-label={`View of ${label}`} className={cn("flex overflow-hidden rounded-full border bg-card p-0.5", pending && "opacity-80")}>
        {(["normal", "advanced"] as const).map((m) => (<button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => pick(m)} title={m === "normal" ? "Only what you need to make something and ship it" : "Every control, check, id and cost"} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", mode === m ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground")} data-testid={`mode-${m}`}>
            {m === "normal" ? "Normal" : "Advanced"}
          </button>))}
      </div>
    </div>);
}
