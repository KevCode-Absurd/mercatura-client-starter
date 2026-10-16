export const FAMILY_IDS = ["interface", "authority", "comparison", "list", "negation", "offer", "craft"] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];
export interface Family {
    id: FamilyId;
    label: string;
    what: string;
    reach_when: string;
    breaks_when: string;
    examples: string;
    make: {
        href: string;
        label: string;
    };
}
export const FAMILIES: Family[] = [
    { id: "interface", label: "Borrowed interface", what: "It looks like a screen or a printed surface the viewer already trusts: a note, a message, a search, a story.", reach_when: "Cold traffic is lost in the first second.", breaks_when: "The borrowed screen is not exact (the type, the bar, the time): the viewer catches the fake instead of reading. It is never a real platform's own interface or logo.", examples: "notes, a search bar, a forum post, a story frame, an email, a text thread", make: { href: "/formats/native", label: "Native ad" } },
    { id: "authority", label: "Borrowed authority", what: "Someone other than the brand appears to be talking: a customer, the press, a reviewer.", reach_when: "The doubt is trust, not interest.", breaks_when: "The source did not say it. The 1 family that can cost more than a lost test: the words are real, word for word, with their source.", examples: "a review, a testimonial, a news front, a podcast clip, a whiteboard", make: { href: "/formats/ad-proof", label: "Proof ads" } },
    { id: "comparison", label: "The comparison", what: "2 states in 1 frame. The viewer does the sum, and so believes the answer.", reach_when: "There is a real difference and nobody is doing the sum.", breaks_when: "The 2 states are not shown the same way: then it compares the lighting, not the product.", examples: "this against the usual way, old against new, problem against solution, myth against fact, before and after", make: { href: "/formats/ad-proof", label: "Proof ads" } },
    { id: "list", label: "The list", what: "A counted or ranked structure that promises a short read. The number is the hook.", reach_when: "The product needs several reasons, not 1.", breaks_when: "The number is padded: 7 weak reasons do worse than 3 real ones.", examples: "reasons why, signs that, a tier list, labelled callouts, a spec sheet", make: { href: "/formats/ad-proof", label: "Proof ads" } },
    { id: "negation", label: "The negation", what: "The ad argues against itself, so the viewer stops defending.", reach_when: "The audience knows the product and is sceptical.", breaks_when: "The negation is not answered in the same frame: the viewer is left holding the objection.", examples: "don't buy this, a warning, a side effect, we're sorry, not for everyone, a zero-star review", make: { href: "/formats/review-ad", label: "Ad from a review" } },
    { id: "offer", label: "The offer", what: "The price is the creative. It needs no new idea.", reach_when: "Inside a window with a real start and end. Then it comes down.", breaks_when: "It runs all the time: a permanent sale is a price cut the margin has to carry.", examples: "the offer, the bundle", make: { href: "/formats/ad-offer", label: "Offer ads" } },
    { id: "craft", label: "The craft object", what: "Visibly made by a hand. It reads as effort, which money cannot fake.", reach_when: "Everything around it in the feed looks rendered.", breaks_when: "The craft is too clean: the point is that a person made it.", examples: "clay, a doodle, a handwritten note, a meme, text set on a close-up", make: { href: "/formats/review-ad", label: "Ad from a review" } },
];
export const family = (id: FamilyId | null | undefined) => FAMILIES.find((f) => f.id === id);
const FILED: Record<string, FamilyId> = {
    "myth-bust": "comparison",
    "comparison-table": "comparison",
    side_by_side: "comparison",
    "customer-words": "authority",
    "last-review": "authority",
    quote_card: "authority",
    qa_card: "authority",
    "press-quote": "authority",
    "number-proof": "list",
    "feature-annotation": "list",
    "worth-it": "list",
    "benefit-list": "list",
    "price-per-use": "comparison",
    "price-anchor": "offer",
    "bundle-stack": "offer",
    "urgency-stamp": "offer",
    negative_qualifier: "negation",
    strikethrough: "negation",
    taped_note: "craft",
    poll_sticker: "interface",
    "native-format-mimicry": "interface",
    "review-and-testimonial": "authority",
    "press-and-authority": "authority",
    "comparison-and-us-vs-them": "comparison",
    "before-and-after": "comparison",
    "problem-and-symptom-framing": "comparison",
    "callout-diagram": "list",
    "ingredient-stat-and-spec": "list",
    "offer-sale-and-promo": "offer",
    "bundle-kit-and-range": "offer",
    "handmade-and-anti-design": "craft",
    "conceptual-and-scale": "craft",
    "notes-app": "interface",
    "phone-reminder": "interface",
    "text-bubbles": "interface",
    "whatsapp-chat": "interface",
    "breaking-news": "authority",
    "one-star-review": "negation",
    "dont-buy-this": "negation",
    "handwritten-note": "craft",
    "sticky-note": "craft",
    "illustration-chronicle": "craft",
    "annotated-photo": "craft",
};
export const familyOf = (formatId: string | null | undefined): FamilyId | null => (formatId ? (FILED[formatId] ?? null) : null);
export const familyOfItem = (item: {
    archetype?: string | null;
    type?: string | null;
}): FamilyId | null => familyOf(item.archetype) ?? familyOf(item.type);
export const formatsIn = (id: FamilyId): string[] => Object.keys(FILED).filter((k) => FILED[k] === id);
export interface FamilyTally {
    counts: Record<FamilyId, number>;
    plain: number;
    total: number;
    empty: FamilyId[];
}
export function tallyFamilies(items: {
    archetype?: string | null;
    type?: string | null;
}[]): FamilyTally {
    const counts = Object.fromEntries(FAMILY_IDS.map((f) => [f, 0])) as Record<FamilyId, number>;
    let plain = 0;
    for (const i of items) {
        const f = familyOfItem(i);
        if (f)
            counts[f]++;
        else
            plain++;
    }
    return { counts, plain, total: items.length, empty: FAMILY_IDS.filter((f) => counts[f] === 0) };
}
export const GAP_PICKS: {
    when: string;
    reach: FamilyId[];
    because: string;
}[] = [
    { when: "Everything running is product or lifestyle photography", reach: ["comparison", "list"], because: "Atmosphere without an argument. These put a reason to buy into the frame." },
    { when: "Cold traffic never gets past 2 seconds", reach: ["interface"], because: "It does not read as an ad for long enough for the hook to land." },
    { when: "People like the product and still do not buy", reach: ["negation"], because: "There is an objection nobody says. Raise it first, then answer it." },
    { when: "You are the expensive option", reach: ["authority", "comparison"], because: "A doubt about price is settled by someone else saying it, or by the sum." },
    { when: "Retargeting is tired and discounts cover for it", reach: ["craft"], because: "Effort is a reason to look again. A 4th discount card is not." },
    { when: "Reviews hold a real, specific, repeated complaint", reach: ["negation"], because: "Saying it first turns the complaint into credibility." },
];
const TESTABLE = (f: FamilyId) => f !== "offer";
export function familyAdvice(t: FamilyTally): {
    test: FamilyId[];
    line: string;
} {
    const empty: FamilyId[] = t.empty.filter(TESTABLE);
    const thin: FamilyId[] = FAMILY_IDS.filter(TESTABLE).sort((a, b) => t.counts[a] - t.counts[b]);
    const lead = t.total > 0 && t.plain / t.total > 0.6 ? (["comparison", "list"] as FamilyId[]).filter((f) => empty.includes(f)) : [];
    const test = [...new Set([...lead, ...empty, ...thin])].slice(0, 2);
    const names = test.map((f) => family(f)!.label.toLowerCase()).join(" and ");
    const line = !t.total
        ? `No static ad has been made yet. Start with 2 formats from 2 different families, such as ${names}.`
        : empty.length
            ? empty.length === 1
                ? `1 of the ${FAMILY_IDS.length - 1} families to test has no ad: ${family(empty[0])!.label.toLowerCase()}. Test it and the thinnest of the rest (${family(test[1])!.label.toLowerCase()}), each against what already runs, not against each other.`
                : `${empty.length} of the ${FAMILY_IDS.length - 1} families to test have no ad: ${empty.map((f) => family(f)!.label.toLowerCase()).join(", ")}. Test 2 formats from 2 of them (${names}), each against what already runs, not against each other.`
            : `Every family has an ad. The thinnest are ${names}: test 1 format from each against what already runs.`;
    return { test, line };
}
export interface FormatBrief {
    format: string;
    artifact: string;
    one_line: string;
    goes_wrong: string;
    might_work: string;
}
export function formatBrief(i: {
    label: string;
    family: FamilyId | null;
    picture: string;
    headline: string;
    argument: string;
    reason: string;
}): FormatBrief {
    const f = family(i.family);
    return {
        format: f ? `${i.label}, ${f.label.toLowerCase()}` : `${i.label}, plain product or lifestyle photography (no family)`,
        artifact: i.picture.trim() || "Not said yet: the plan describes the picture.",
        one_line: i.headline.trim() || "No words on this one. If it needs 3 lines to work, it is the wrong format.",
        goes_wrong: f ? f.breaks_when : "A picture with no argument in the frame: it has to be carried by the copy beside it.",
        might_work: [i.argument.trim(), i.reason.trim()].filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : `${x}.`)).join(" ") || "Not traced to anything yet: a review theme, a repeat rate, an objection buyers raise. Never \"it is trending\".",
    };
}
