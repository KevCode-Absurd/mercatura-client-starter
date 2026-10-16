import { cn } from "@/lib/utils";
export const PLATFORM = "Mercatura";
export const MARK = { blue: "M7 6 27 24 0 42V24l7-3Z", ink: "M41 0v13l7 3v24L22 16.6Z" } as const;
export function LogoMark({ className }: {
    className?: string;
}) {
    return (<svg viewBox="0 0 48 42" className={cn("h-5 w-auto shrink-0", className)} aria-hidden="true">
      <path d={MARK.blue} className="fill-primary"/>
      <path d={MARK.ink} fill="currentColor"/>
    </svg>);
}
export function Logo({ className, markClassName }: {
    className?: string;
    markClassName?: string;
}) {
    return (<span className={cn("flex items-center gap-2 leading-none", className)}>
      <LogoMark className={markClassName}/>
      <span className="display">{PLATFORM}</span>
    </span>);
}
