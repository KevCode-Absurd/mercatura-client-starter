export interface CutClaim {
    item: string;
    point: string;
}
const key = (c: CutClaim) => c.point.toLowerCase().replace(/[^a-z0-9% ]+/g, " ").replace(/\s+/g, " ").trim();
export function logCuts(log: CutClaim[] | undefined, add: CutClaim[]): CutClaim[] {
    const seen = new Set((log ?? []).map(key));
    const out = [...(log ?? [])];
    for (const c of add) {
        const point = c.point.replace(/\s+/g, " ").trim().slice(0, 300);
        if (!point || seen.has(key({ ...c, point })))
            continue;
        seen.add(key({ ...c, point }));
        out.push({ item: c.item, point });
    }
    return out.slice(-40);
}
export function cutRule(log: CutClaim[] | undefined): string {
    if (!log?.length)
        return "";
    return `CUT FROM THIS SET EARLIER. Each of these was taken out because the brand cannot hold it. Do not bring any of them back, in these words or others, on any image. Where one left a slot empty, the slot takes a fact the brand does hold or stays empty: never a made-up credential.\n${log.map((c) => `- ${c.point}`).join("\n")}`;
}
