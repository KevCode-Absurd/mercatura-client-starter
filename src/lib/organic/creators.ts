export const DEALS = ["gifted", "commission", "paid"] as const;
export type Deal = (typeof DEALS)[number];
export const DEAL_LABEL: Record<Deal, string> = { gifted: "Gifted", commission: "Commission", paid: "Paid" };
export const RIGHTS = ["none", "asked", "agreed"] as const;
export type Rights = (typeof RIGHTS)[number];
export const RIGHTS_LABEL: Record<Rights, string> = { none: "Not asked", asked: "Asked", agreed: "Agreed" };
export const PARTNERSHIP = ["none", "asked", "approved"] as const;
export type Partnership = (typeof PARTNERSHIP)[number];
export const PARTNERSHIP_LABEL: Record<Partnership, string> = { none: "Not asked", asked: "Request sent", approved: "Approved" };
export interface Creator {
    id: string;
    handle: string;
    platform?: "instagram" | "tiktok" | "youtube";
    profile_url?: string;
    deal: Deal;
    sent: string;
    posted: boolean;
    views: number;
    avg_views: number;
    rights: Rights;
    rights_until: string;
    partnership: Partnership;
    note: string;
}
export const WINNER_MULTIPLE = 2;
export const isWinner = (c: Pick<Creator, "posted" | "views" | "avg_views">) => c.posted && c.avg_views > 0 && c.views >= c.avg_views * WINNER_MULTIPLE;
export type Tier = "A" | "B" | "C";
export const TIER_INFO: Record<Tier, {
    what: string;
    next: string;
}> = {
    A: { what: "Posted, at twice their usual views or more", next: "Ask to run it as a partnership ad, and offer to keep working together." },
    B: { what: "Posted", next: "Keep for the next round." },
    C: { what: "Did not post", next: "Do not send again." },
};
export const WAIT_DAYS = 30;
const day = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
export function tierOf(c: Pick<Creator, "posted" | "views" | "avg_views" | "sent">, today: string): Tier | null {
    if (c.posted)
        return isWinner(c) ? "A" : "B";
    const sent = day(c.sent);
    const now = day(today);
    if (sent == null || now == null)
        return null;
    return (now - sent) / 86400000 >= WAIT_DAYS ? "C" : null;
}
export function nextStep(c: Creator, today: string): string {
    const until = day(c.rights_until);
    const now = day(today);
    if (c.rights === "agreed" && until != null && now != null && until < now)
        return "The agreed use has ended: take their content out of ads, or agree it again.";
    const tier = tierOf(c, today);
    if (!c.sent)
        return "Send the product, with a handwritten note and the half-page brief.";
    if (tier === "A") {
        if (c.rights !== "agreed")
            return "A winner. Agree the use of the post in ads, in writing, before anything runs.";
        if (c.partnership === "none")
            return "A winner, and the use is agreed. Send the partnership ad request.";
        if (c.partnership === "asked")
            return "Waiting for them to approve the request, in their app.";
        return "Running from their handle. When it tires, test their next post.";
    }
    if (tier === "B")
        return TIER_INFO.B.next;
    if (tier === "C")
        return TIER_INFO.C.next;
    return "Wait for the post. No reminder asking for one: sharing is their choice.";
}
export const SEED_RATES = { post: [0.4, 0.5], usable: [0.1, 0.15] } as const;
export function seedExpectation(n: number): {
    posts: [
        number,
        number
    ];
    usable: [
        number,
        number
    ];
} {
    const k = Math.max(0, Math.round(n));
    const posts: [
        number,
        number
    ] = [Math.round(k * SEED_RATES.post[0]), Math.round(k * SEED_RATES.post[1])];
    return { posts, usable: [Math.round(k * SEED_RATES.post[0] * SEED_RATES.usable[0] * 10) / 10, Math.round(k * SEED_RATES.post[1] * SEED_RATES.usable[1] * 10) / 10] };
}
export function creatorSummary(list: Creator[], today: string): {
    sent: number;
    posted: number;
    winners: number;
    running: number;
    noRights: number;
} {
    return {
        sent: list.filter((c) => c.sent).length,
        posted: list.filter((c) => c.posted).length,
        winners: list.filter((c) => isWinner(c)).length,
        running: list.filter((c) => c.partnership === "approved").length,
        noRights: list.filter((c) => tierOf(c, today) === "A" && c.rights !== "agreed").length,
    };
}
export const PARTNERSHIP_STEPS = [
    "The creator sends the clip to 1 shared place (a folder, a board).",
    "Pick the posts that did twice the creator's usual views.",
    "In the ad account, at the ad level, choose \"Partnership ad\" under identity and enter the creator's handle.",
    "Send the request. The creator approves it with 1 tap in their app.",
    "Once approved, the ad runs from their handle on the brand's spend. They do not need to post it again.",
    "Test it on its own for 7 to 14 days. What holds moves to the campaigns that scale.",
] as const;
export const BRIEF_KINDS = [
    { id: "problem_solution", label: "Problem, then the fix", note: "CREATOR BRIEF, problem then solution, 30 to 60 seconds. Opens in the first 3 seconds on the problem. Then: show the problem lightly (5 to 10 seconds), bring the product in naturally, show 1 or 2 things it does, show the result. Close in the last 3 to 5 seconds. Send the full unedited clip: no transitions, no music, and both a tall and a wide version if possible. Not read stiffly from a script, not filmed in the dark." },
    { id: "unboxing", label: "Unboxing, first impression", note: "CREATOR BRIEF, unboxing and first impression. Opens with the package being opened on camera, the reaction first. Then: a real reaction to the packaging and the quality, trying it on screen, 1 thing that surprised them. Natural and personal, not like a paid ad." },
    { id: "lifestyle", label: "Part of their day", note: "CREATOR BRIEF, part of their day. Opens mid-activity, no introduction. Then: the product inside their own routine, what it feels like or does for them rather than its features, 1 line on why this brand. A soft close. No price and no discount is mentioned." },
] as const;
export type BriefKind = (typeof BRIEF_KINDS)[number]["id"];
export const DISCLOSURE: Record<Deal, string> = {
    gifted: "We sent you this for free. If you post, say so in the post itself (\"gifted by [brand]\"): it is the rule, and it is ours to check.",
    commission: "You earn a commission on sales from your link. Say so in the post itself (\"I earn from this link\").",
    paid: "This is paid work. Mark it as a paid partnership in the post itself.",
};
export interface SeedingBriefInput {
    brand: string;
    product: string;
    handle: string;
    not_say: string[];
    deal: Deal;
}
export function seedingBrief(i: SeedingBriefInput): string {
    return [
        `${i.brand}: a note for creators`,
        "",
        `What we make: ${i.product.trim()}`,
        "",
        "Ideas, if you want one (pick one, or do your own thing):",
        "- Opening it for the first time, and what you really think.",
        "- Where it fits in your morning or your evening.",
        "- An honest review after a week.",
        "",
        notSayLine(i.not_say),
        "",
        "The only rule: film it however feels natural to you. Your take, not an ad we wrote.",
        "",
        `If you post, tag us ${i.handle.trim() || "[our handle]"} so we can find it. Posting is your choice: there are no strings on the product.`,
        "",
        DISCLOSURE[i.deal].replace("[brand]", i.brand),
    ].join("\n");
}
function notSayLine(list: string[]): string {
    const items = list.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!items.length)
        return "There is nothing we need you to say or avoid, beyond what is true for you.";
    if (items.every((x) => x.split(" ").length <= 3))
        return `The one thing we ask: please do not use these words about it: ${items.slice(0, 6).join(", ")}.`;
    return `The one thing we ask you not to say: ${items[0]}`;
}
export const cleanHandle = (s: string) => {
    const h = s.trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, "").replace(/[/?].*$/, "").replace(/^@+/, "").replace(/\s+/g, "");
    return h ? `@${h}` : "";
};
