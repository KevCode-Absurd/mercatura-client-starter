import { cookies } from "next/headers";
import { env } from "./env";
import { MODE_COOKIE, modeOf, parseModes, type Mode, type Modes, type SectionId } from "./ui-mode";
export const defaultMode = (): Mode => env.UI_MODE_DEFAULT;
export async function allModes(): Promise<{
    modes: Modes;
    fallback: Mode;
}> {
    return { modes: parseModes((await cookies()).get(MODE_COOKIE)?.value), fallback: defaultMode() };
}
export async function modeFor(section: SectionId): Promise<Mode> {
    const { modes, fallback } = await allModes();
    return modeOf(modes, section, fallback);
}
export const isAdvanced = async (section: SectionId) => (await modeFor(section)) === "advanced";
