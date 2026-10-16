"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { THEME_COOKIE, themeOf, type Theme } from "@/lib/theme";
import { MODE_COOKIE, SECTIONS, parseModes, type Mode, type SectionId } from "@/lib/ui-mode";
export async function setModeAction(section: SectionId, mode: Mode) {
    if (!SECTIONS.some((s) => s.id === section) || (mode !== "normal" && mode !== "advanced"))
        return;
    const jar = await cookies();
    const modes = { ...parseModes(jar.get(MODE_COOKIE)?.value), [section]: mode };
    jar.set(MODE_COOKIE, JSON.stringify(modes), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
}
export async function setAllModesAction(mode: Mode) {
    if (mode !== "normal" && mode !== "advanced")
        return;
    const jar = await cookies();
    jar.set(MODE_COOKIE, JSON.stringify(Object.fromEntries(SECTIONS.map((s) => [s.id, mode]))), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
}
export async function setThemeAction(theme: Theme) {
    (await cookies()).set(THEME_COOKIE, themeOf(theme), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    revalidatePath("/", "layout");
}
