import { OUTPUT_INFO, type OutputType } from "../taxonomy";
export type Verdict = "approved" | "rejected";
export const BUCKETS = ["format", "brand", "input", "one_off"] as const;
export type Bucket = (typeof BUCKETS)[number];
export type Family = "image" | "video" | "brief";
export const familyOf = (type: OutputType): Family => (type.startsWith("human_brief") ? "brief" : type.startsWith("ai_") ? "video" : "image");
export function formatName(type: OutputType): string {
    const label = OUTPUT_INFO[type].label;
    const f = familyOf(type);
    return f === "video" ? `${label} videos` : `${label}s`;
}
export const formatWords = (type: OutputType): string => formatName(type).replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase());
export function bucketInfo(type: OutputType): Record<Bucket, {
    label: string;
    hint: string;
}> {
    return {
        format: { label: "This kind of ad", hint: `True of ${formatWords(type)}. Kept for that format only.` },
        brand: { label: "The brand", hint: "True of anything made for this brand, whatever the format." },
        input: { label: "The script or copy it was made from", hint: "The words were the problem, not how they were made into an ad. Kept for script and copy writing." },
        one_off: { label: "Only this ad", hint: "Nothing to carry forward. Kept as a note on this ad, and no lesson is made." },
    };
}
const TICKS: Record<Family, string[]> = {
    image: ["The headline", "The picture", "The layout", "The product looks right", "The copy", "The offer"],
    video: ["The hook", "The script", "The character or creator", "The look", "The pacing", "The product looks right", "The ending"],
    brief: ["The hook", "The script", "The shot list", "Clear enough to shoot"],
};
export const ticksFor = (type: OutputType): string[] => TICKS[familyOf(type)];
export interface VerdictNote {
    verdict: Verdict;
    bucket?: Bucket;
    ticks: string[];
    note: string;
}
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export function verdictProblem(v: VerdictNote): string | null {
    const note = clean(v.note);
    if (v.verdict === "approved")
        return v.ticks.length || note.length >= 4 ? null : "Tick what went well, or say it in a few words.";
    if (!v.bucket)
        return "Say what kind of problem it is.";
    return note.length >= 4 ? null : "Say what went wrong, in a few words.";
}
export const learnsFrom = (v: VerdictNote) => clean(v.note).length >= 4 && !(v.verdict === "rejected" && v.bucket === "one_off");
export function verdictText(v: VerdictNote, type: OutputType): string {
    const note = clean(v.note);
    if (v.verdict === "approved")
        return clean(`Approved.${v.ticks.length ? ` Went well: ${v.ticks.map(lower).join(", ")}.` : ""} ${note}`);
    const b = v.bucket ?? "one_off";
    const about = b === "format" ? `a problem with ${formatWords(type)}` : b === "brand" ? "a problem for the whole brand" : b === "input" ? "a problem with the script or copy it was made from" : "a problem with this ad only";
    return clean(`Rejected: ${about}. ${note}`);
}
export function verdictAbout(v: VerdictNote, type: OutputType, scriptTitle: string): string {
    const piece = `${OUTPUT_INFO[type].label} made from the script "${scriptTitle}".`;
    if (v.verdict === "approved")
        return `${piece} The person APPROVED this piece on the Production board, and the note says what went well. Each lasting point is something to keep doing on the next ${lower(OUTPUT_INFO[type].label)}.`;
    const b = v.bucket ?? "one_off";
    return `${piece} The person REJECTED this piece on the Production board. They say it is ${b === "format" ? `a problem with this kind of ad (${formatWords(type)}), so write each rule for that kind of ad` : b === "brand" ? "a problem for the whole brand, whatever the format" : "a problem with the script or copy it was made from, so write each rule for whoever writes the words"}.`;
}
