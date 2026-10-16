import Link from "next/link";
import { BookOpen, Settings } from "lucide-react";
import { BrandSwitcher } from "./app-sidebar";
import { Logo } from "./logo";
import { ModeToggle } from "./mode";
import { ModuleNav } from "./module-nav";
import { ThemeToggle } from "./theme-toggle";
type Props = {
    brands: {
        id: string;
        name: string;
        is_demo: boolean;
    }[];
    activeBrandId: string;
};
export function SystemBar({ brands, activeBrandId }: Props) {
    return (<header className="sticky top-0 z-40 flex h-[var(--bar)] items-center border-b bg-background/95 text-sm backdrop-blur max-md:pl-12" data-testid="system-bar">
      <Link href="/" className="flex shrink-0 items-center gap-2 pl-6 pr-5 max-md:hidden">
        <Logo className="text-[1.35rem]" markClassName="h-[1.05rem]"/>
      </Link>
      <ModuleNav />
      <div className="ml-auto flex shrink-0 items-center gap-3 px-4 text-xs text-muted-foreground md:pr-6">
        <ModeToggle />

        <BrandSwitcher brands={brands} activeBrandId={activeBrandId} className="max-w-44 max-md:hidden"/>
        <ThemeToggle className="max-md:hidden"/>
        <Link href="/guide" title="Guide" aria-label="Guide" className="flex size-8 items-center justify-center rounded-full hover:bg-muted hover:text-foreground max-md:hidden">
          <BookOpen className="size-4"/>
        </Link>
        <Link href="/settings" title="Settings" aria-label="Settings" className="flex size-8 items-center justify-center rounded-full hover:bg-muted hover:text-foreground max-md:hidden">
          <Settings className="size-4"/>
        </Link>
      </div>
    </header>);
}
