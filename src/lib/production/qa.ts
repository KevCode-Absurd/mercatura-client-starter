export type QaGroup = "basics" | "boosters" | "image" | "versions";
export const QA_GROUP_LABEL: Record<QaGroup, string> = { basics: "The basics", boosters: "What lifts it", image: "The picture", versions: "Versions and the reference" };
export type QaState = "ok" | "look" | "ask";
export interface QaItem {
    id: string;
    group: QaGroup;
    label: string;
    state: QaState;
    note: string;
}
export interface QaJob {
    medium: "video" | "image" | "brief";
    aspect: string;
    scenes?: {
        seconds: number;
        visual: string;
        dialogue: string;
        overlay: string;
    }[];
    cards?: {
        text: string;
        role: string;
    }[][];
    cta?: string;
    captions?: boolean;
    versions: number;
    referenced: boolean;
}
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
export const MAX_VERSIONS = 4;
export const REELS_SECONDS = 30;
export const STORY_SECONDS = 15;
export const HOOK_SECONDS = 3;
export const OVERLAY_SECONDS = 2;
export const FILLER = ["really", "very", "just", "actually", "unique", "amazing", "incredible", "high-quality", "game-changing"] as const;
export function fillerIn(text: string): string[] {
    const t = ` ${text.toLowerCase().replace(/[^a-z-]+/g, " ")} `;
    return FILLER.filter((f) => t.includes(` ${f} `));
}
export const OPENING_TIPS = [
    "Open on the result the buyer wants, and bring the product in on the second shot.",
    "Or open very close on the product, so they wonder what it is.",
    "Open on why they are never going back to the slow, costly or worse way.",
    "Bright natural light and music with some pace. The same ad in a dull room is hard to watch.",
    "In season, show it as part of what people already do then.",
    "A voice over it usually does better than none. The tone of the voice decides it.",
    "A real buyer saying what made them buy it.",
    "A human face first usually beats the product first.",
] as const;
export function qaCard(j: QaJob): QaItem[] {
    const out: QaItem[] = [];
    const add = (id: string, group: QaGroup, label: string, state: QaState, note: string) => out.push({ id, group, label, state, note });
    const tall = j.aspect === "9:16";
    if (j.medium === "video") {
        const scenes = j.scenes ?? [];
        const seconds = scenes.reduce((n, s) => n + (s.seconds || 0), 0);
        const first = scenes[0];
        const last = scenes[scenes.length - 1];
        const said = scenes.map((s) => `${s.dialogue} ${s.overlay}`).join(" ");
        add("watch", "basics", "Watch it whole, once, with headphones", "ask", "Start to end, sound on. Is the sound clean? Would you be happy to put your name on it?");
        add("size", "basics", "The size", tall ? "ok" : "look", tall ? "9:16, the shape of Reels, TikTok and Stories." : `${j.aspect}. Reels, TikTok and Stories are 9:16, and each size is built for its own shape, never cropped from another.`);
        if (seconds)
            add("length", "basics", "The length", seconds <= REELS_SECONDS ? "ok" : "look", seconds <= REELS_SECONDS ? `${seconds} seconds: under the ${REELS_SECONDS} a Reel holds. A story takes ${STORY_SECONDS} at most.` : `${seconds} seconds. A Reel does best under ${REELS_SECONDS}, a story takes ${STORY_SECONDS} at most, and TikTok runs 15 to 60. Fine if this is for a placement that holds it.`);
        add("safe", "basics", "Nothing under the app's own buttons", "ask", "On a real phone: no words under the name bar at the bottom or the icons on the right.");
        add("captions", "basics", "Captions", j.captions ? "ok" : "look", j.captions ? "The on-screen words are drawn in. Read them once for spelling." : "This video is delivered clean, with no captions drawn in. TikTok needs them: add them where it is edited or run.");
        add("mute", "basics", `The first ${HOOK_SECONDS} seconds, on mute`, "ask", `Would a person who has never heard of the brand stop? The words on screen should land in under ${OVERLAY_SECONDS} seconds.`);
        add("cta", "basics", "A call to action", j.cta?.trim() || (last && (last.dialogue.trim() || last.overlay.trim())) ? "ok" : "look", j.cta?.trim() ? `The feed button says "${j.cta.trim()}".` : last && (last.dialogue.trim() || last.overlay.trim()) ? "The last shot says or shows something to do." : "The last shot neither says nor shows what to do next.");
        if (first) {
            const layers = [first.visual.trim() ? "a picture" : "", first.overlay.trim() ? "words on screen" : "", first.dialogue.trim() ? "a spoken line" : ""].filter(Boolean);
            const both = !!first.visual.trim() && (!!first.overlay.trim() || !!first.dialogue.trim());
            add("hook_layers", "boosters", "The hook works on 2 layers", both && first.overlay.trim() ? "ok" : "look", both && first.overlay.trim() ? "The opening has something to see and words on screen with it." : `The opening has ${layers.join(" and ") || "nothing"}. A hook stops more people when the picture and the words on screen both do the work.`);
            if (first.overlay.trim() && words(first.overlay) > 8)
                add("hook_words", "boosters", "Fewer words on the opening", "look", `${words(first.overlay)} words on screen in the first shot. Can any be cut, so it reads in under ${OVERLAY_SECONDS} seconds?`);
        }
        const longest = Math.max(0, ...scenes.map((s) => s.seconds || 0));
        add("pacing", "boosters", "The pace", "ask", `${scenes.length} shot${scenes.length === 1 ? "" : "s"}${longest ? `, the longest ${longest} seconds` : ""}. Cut every pause. Change the frame often: the playbook's guide is about 2 seconds a frame.`);
        add("story", "boosters", "Hook, then story, then what to do", "ask", "Can you point at each? If 1 is missing, say why it is better without it.");
        add("one_job", "boosters", "One ad, one job", "ask", `Say its 1 message in 1 sentence. With the last ${HOOK_SECONDS} seconds cut off, does it still land?`);
        add("desire", "boosters", "The desire it touches", "ask", "Which 1 thing the buyer wants does it speak to? If you cannot name it, neither can they.");
        const filler = fillerIn(said);
        if (filler.length)
            add("filler", "boosters", "Filler to cut", "look", `It says ${filler.map((f) => `"${f}"`).join(", ")}. Put a number the brand holds or a customer's words in its place, or nothing.`);
        add("person", "boosters", "It sounds like a person", "ask", "Read it out loud. Would a customer say that to a friend?");
    }
    if (j.medium === "image") {
        const cards = j.cards ?? [];
        const all = cards.flat();
        const headline = all.find((t) => t.role === "headline")?.text ?? "";
        const total = all.reduce((n, t) => n + words(t.text), 0);
        add("size", "basics", "The size", "ask", `${j.aspect ? `${j.aspect}. ` : ""}Each size is built for its own shape, never cropped from another.`);
        add("read", "basics", "Every word, read at full size", "ask", "Open it at 100%, not as a thumbnail. Each word letter by letter; no stray mark at the end of a line; the button has its words in it.");
        if (tall)
            add("safe", "basics", "Nothing under the app's own buttons", "ask", "On a real phone: no words under the name bar at the bottom.");
        add("cta", "basics", "A call to action", j.cta?.trim() || all.some((t) => /cta|button/.test(t.role)) ? "ok" : "look", j.cta?.trim() ? `The feed button says "${j.cta.trim()}".` : all.some((t) => /cta|button/.test(t.role)) ? "The picture carries a button." : "No button on the picture and none in the feed copy.");
        add("eyes", "image", "Where the eye goes first", "ask", "Is that where you meant it to go?");
        add("phone", "image", "Easy to read on a phone", total > 30 ? "look" : "ask", total > 30 ? `${total} words on the picture. Can any be cut?` : "At arm's length, on your own phone. Can any word be cut?");
        add("visual", "image", "The right picture", "ask", "Does it fight the words? Can you find the 1 thing to look at? Is it too crowded?");
        if (headline)
            add("headline", "image", "The headline", words(headline) <= 10 ? "ok" : "look", words(headline) <= 10 ? `${words(headline)} word${words(headline) === 1 ? "" : "s"}.` : `${words(headline)} words. A static's headline does its work in 6 to 10: can it lose some?`);
        const filler = fillerIn(all.map((t) => t.text).join(" "));
        if (filler.length)
            add("filler", "image", "Filler to cut", "look", `It says ${filler.map((f) => `"${f}"`).join(", ")}. Put a number the brand holds or a customer's words in its place, or nothing.`);
    }
    if (j.medium !== "brief") {
        add("versions", "versions", "How many versions", j.versions <= MAX_VERSIONS ? "ok" : "look", j.versions <= MAX_VERSIONS ? `${j.versions} version${j.versions === 1 ? "" : "s"}. 3 to ${MAX_VERSIONS} at most, each changing 1 thing you can name.` : `${j.versions} versions. 3 to ${MAX_VERSIONS} at most: a new colour or 1 changed word is not a new ad. Each should change 1 thing you can name.`);
        if (j.referenced)
            add("reference", "versions", "Against the ad it was built on", "ask", "Put them side by side. Is yours better or worse, and what 1 change would improve it?");
    }
    return out;
}
export const qaCounts = (items: QaItem[]) => ({ ok: items.filter((i) => i.state === "ok").length, look: items.filter((i) => i.state === "look").length, ask: items.filter((i) => i.state === "ask").length });
