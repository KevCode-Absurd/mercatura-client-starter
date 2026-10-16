"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { setThemeAction } from "@/app/mode-actions";
import { cn } from "@/lib/utils";
export function ThemeToggle({ label = false, className }: {
    label?: boolean;
    className?: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const flip = () => {
        const dark = document.documentElement.classList.toggle("dark");
        start(async () => {
            await setThemeAction(dark ? "dark" : "light");
            router.refresh();
        });
    };
    return (<button type="button" onClick={flip} disabled={pending} title="Switch between the light and the dark look" aria-label="Switch between the light and the dark look" data-testid="theme-toggle" className={cn(label ? "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground" : "flex size-8 items-center justify-center rounded-full hover:bg-muted hover:text-foreground", className)}>
      <Moon className="size-4 shrink-0 dark:hidden"/>
      <Sun className="hidden size-4 shrink-0 dark:block"/>
      {label && (<>
          <span className="dark:hidden">Dark look</span>
          <span className="hidden dark:inline">Light look</span>
        </>)}
    </button>);
}
