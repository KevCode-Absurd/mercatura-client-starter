import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { AppSidebar, SectionNav } from "@/components/app-sidebar";
import { PLATFORM } from "@/components/logo";
import { ModeProvider } from "@/components/mode";
import { NavProgress } from "@/components/nav-progress";
import { RunBar } from "@/components/run-bar";
import { SystemBar } from "@/components/system-bar";
import { TabTitle } from "@/components/tab-title";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { optionalActiveBrand } from "@/lib/brand-context";
import { listBrands } from "@/lib/brands";
import { activity } from "@/lib/jobs/activity";
import { THEME_COOKIE, themeOf } from "@/lib/theme";
import { allModes } from "@/lib/ui-mode-server";
import "./globals.css";
const text = DM_Sans({ subsets: ["latin"], variable: "--font-text", display: "swap" });
const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
export const metadata: Metadata = {
    title: `Creative Studio · ${PLATFORM}`,
    description: "Customer research to Meta ad scripts and assets",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    const active = await optionalActiveBrand();
    const brands = listBrands().map((b) => ({ id: b.id, name: b.name, is_demo: b.is_demo }));
    const view = await allModes();
    const theme = themeOf((await cookies()).get(THEME_COOKIE)?.value);
    return (<html lang="en" className={`${text.variable} ${serif.variable}${theme === "dark" ? " dark" : ""}`}>
      <body className="antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">Skip to content</a>
        <TooltipProvider delayDuration={200}>
         <ModeProvider modes={view.modes} fallback={view.fallback}>
          {active && <SystemBar brands={brands} activeBrandId={active.id}/>}
          <Suspense fallback={null}><NavProgress /></Suspense>
          {active && <RunBar initial={activity()}/>}
          <TabTitle />
          {active && <SectionNav />}
          {active && <AppSidebar brands={brands} activeBrandId={active.id}/>}

          <main id="main-content" tabIndex={-1} className="min-h-[calc(100vh-var(--top))] min-w-0 scroll-mt-[var(--top)] pb-[calc(var(--dock)+3rem)] outline-none">{children}</main>
          <Toaster richColors position="bottom-right" theme={theme}/>
         </ModeProvider>
        </TooltipProvider>
      </body>
    </html>);
}
