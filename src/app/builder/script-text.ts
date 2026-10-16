import { AWARENESS_INFO } from "@/lib/taxonomy";
import type { BuilderScript } from "./actions";
export const metaOf = (s: BuilderScript) => [s.kit.product, AWARENESS_INFO[s.stage].label, s.persona, s.kit.angle, s.kit.offer, s.kit.format].filter(Boolean).join(" · ");
const plain = (s: string) => s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
export const searchText = (s: BuilderScript) => plain([s.title, metaOf(s), ...s.lines, ...(s.versions ?? []).flatMap((v) => v.lines), s.kit.headline ?? "", s.kit.primary_text ?? "", ...(s.kit.more_texts ?? []).flatMap((t) => [t.headline, t.primary_text])].join("\n"));
export function scriptHas(s: BuilderScript, find: string): boolean {
    const words = plain(find).split(/\s+/).filter(Boolean);
    if (!words.length)
        return true;
    const text = searchText(s);
    return words.every((w) => text.includes(w));
}
