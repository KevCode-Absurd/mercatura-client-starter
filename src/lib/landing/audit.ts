import type { LandingPageRow } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import type { Capture } from "./capture";
import { checkPage, result, scoreOf } from "./checks";
import { landingContext } from "./context";
import { searchCards, type Card } from "./library";
import { factsOf } from "./store";
import type { CheckResult } from "./types";
const TABLE_STAKES = /free shipping|fast (delivery|shipping)|great (customer )?service|secure checkout/i;
const URGENCY = /only \d+ left|ends (tonight|today|soon|at midnight)|hurry|last chance|selling out fast|limited time only/i;
const OUTCOME = /\b(you|your|get|feel|stop|never|no more|without|finally|keep|save|sleep|wake|lose|gain|enjoy|love|easy|easier|better|less|fewer|stick|fix|ditch|done)\b/i;
const GENERIC = /shipping policy|return policy|about us|our story|who we are/i;
const PRICE = /(?:[$£€₹¥]|[A-Z]{3} ?)\s?\d/;
const PROOF = /\b\d[\d,.]*\s*\+?\s*(?:k\s*)?(?:reviews|ratings|customers|sold)|★|\bstars?\b/i;
export function checkCapture(c: Capture, brand: BrandBrain | null): CheckResult[] {
    const out: CheckResult[] = [];
    const fold = c.above_fold;
    const h1 = c.h1[0] ?? "";
    const names = brand ? [brand.brand.name, ...brand.products.map((p) => p.name)].map((s) => s.toLowerCase()) : [];
    if (!h1)
        out.push(result("atf_what", "fail", "The page has no main headline (h1)."));
    else if (names.includes(h1.toLowerCase()) || h1.split(/\s+/).length < 3)
        out.push(result("atf_what", "fail", `The headline "${h1}" names the product; it does not say what the buyer gets.`));
    else
        out.push(result("atf_what", "pass", `The headline: "${h1}".`));
    const foldWords = fold.split(/\s+/).length;
    out.push(foldWords >= 25 ? result("atf_why_this", "pass", "The first screen has words beyond the headline to say why this one.") : result("atf_why_this", "warn", `The first screen holds ${foldWords} words: no room to say why this one.`));
    out.push(PRICE.test(fold) && /a day|per day|save|free|gift|bundle|off\b/i.test(fold) ? result("atf_why_now", "pass", "The first screen gives a reason to buy now.") : result("atf_why_now", "warn", "Nothing in the first screen says why today: no offer, saving or price a day."));
    out.push(PROOF.test(fold) ? result("atf_trust", "pass", "Proof in the first screen.") : result("atf_trust", "warn", c.proof.length ? `Proof is on the page ("${c.proof[0].slice(0, 60)}") but not in the first screen.` : "No proof on the page: no rating, review count or customer count."));
    const foldButtons = c.buttons.filter((b) => b.top < 844);
    out.push(foldButtons.length === 0 ? result("one_cta", "warn", "No button in the first screen on a phone.") : foldButtons.length > 3 ? result("one_cta", "warn", `${foldButtons.length} buttons in the first screen compete: ${foldButtons.slice(0, 4).map((b) => `"${b.text}"`).join(", ")}.`) : result("one_cta", "pass", `First-screen button: "${foldButtons[0].text}".`));
    out.push(PRICE.test(fold) ? result("price_visible", "pass", "The price is in the first screen.") : result("price_visible", c.prices.length ? "fail" : "warn", c.prices.length ? `The price (${c.prices[0]}) is below the first screen on a phone.` : "No price found on the page."));
    const heads = c.headings.filter((h) => h.level >= 2).map((h) => h.text);
    const flat = heads.filter((h) => !OUTCOME.test(h));
    out.push(!heads.length ? result("so_what", "warn", "No section headings: a skimmer gets nothing from the page.") : flat.length > heads.length / 2 ? result("so_what", "warn", `${flat.length} of ${heads.length} headings read as features: ${flat.slice(0, 2).map((h) => `"${h}"`).join(", ")}.`) : result("so_what", "pass", "Most headings say what the buyer gets."));
    const stakes = [h1, ...heads].filter((h) => TABLE_STAKES.test(h));
    out.push(stakes.length ? result("table_stakes_low", "warn", `A table stake is a headline: "${stakes[0]}".`) : result("table_stakes_low", "pass", "No table stakes in the headlines."));
    out.push(!c.faq ? result("faq_objections", "warn", "No FAQ: objections go unanswered on the page.") : heads.some((h) => GENERIC.test(h)) ? result("faq_objections", "warn", "The FAQ includes generic questions.") : result("faq_objections", "pass", "There is an FAQ."));
    out.push(c.prices.length > 1 || /bundle|subscribe|save \d|gift/i.test(fold) ? result("offer_present", "pass", `${c.prices.length} prices on the page.`) : result("offer_present", "warn", "1 price and no bundle, subscription or gift: nothing to raise the order value."));
    out.push(c.proof.some((p) => /review|rating/i.test(p)) ? result("reviews_present", "pass", `Proof: "${c.proof.find((p) => /review|rating/i.test(p))!.slice(0, 70)}".`) : result("reviews_present", "fail", "No reviews or ratings found on the page."));
    out.push(c.guarantee.length ? result("risk_reversal_near_cta", PROOF.test(fold) || /guarantee|return|refund/i.test(fold) ? "pass" : "warn", /guarantee|return|refund/i.test(fold) ? "A guarantee is in the first screen." : `A guarantee is on the page ("${c.guarantee[0].slice(0, 60)}") but not near the first button.`) : result("risk_reversal_near_cta", "warn", "No guarantee, free returns or refund line on the page."));
    out.push(c.sticky_cta ? result("sticky_cta", "pass", "A buy button stays on screen on a phone.") : result("sticky_cta", "warn", "No sticky buy button on a phone."));
    out.push(c.overlays.length ? result("no_popup_on_load", "warn", `Something covers ${Math.round(c.overlays[0].share * 100)}% of the screen on arrival${c.overlays[0].text ? `: "${c.overlays[0].text.slice(0, 50)}"` : ""}.`) : result("no_popup_on_load", "pass", "Nothing covers the page on arrival."));
    const text = `${fold} ${heads.join(" ")} ${c.proof.join(" ")}`;
    const forbidden = brand ? brand.forbidden_claims.filter((f) => f.trim() && new RegExp(`\\b${f.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) : [];
    out.push(forbidden.length ? result("forbidden_claims", "fail", `Words the brand forbids: ${forbidden.map((f) => `"${f}"`).join(", ")}.`) : result("forbidden_claims", "pass", "None of the brand's forbidden claims in what was read."));
    out.push(URGENCY.test(text) ? result("no_fake_urgency", "warn", "Urgency on the page: check it is real and enforced.") : result("no_fake_urgency", "pass", "No urgency lines found."));
    return out;
}
const HYPOTHESIS: Record<string, {
    change: string;
    why: string;
    lift: string;
}> = {
    atf_what: { change: "rewrite the headline as the outcome for the buyer (dream outcome, benefit with a timeframe, mechanism)", why: "a stranger decides in seconds whether the page is for them", lift: "add-to-cart rate and RPV" },
    atf_why_this: { change: "add a sub-line naming the mechanism or the one-of-one difference", why: "the visitor has seen the category before and needs a reason to choose this one", lift: "add-to-cart rate" },
    atf_why_now: { change: "put the offer, saving or price a day beside the price", why: "without a reason to act today the visitor leaves to think", lift: "conversion rate" },
    atf_trust: { change: "put the rating and review count, or 1 customer's words that prove the promise, under the headline", why: "proof is the biggest trust signal and belongs where the decision starts", lift: "conversion rate" },
    one_cta: { change: "keep 1 primary button in the first screen and make the rest links", why: "equal choices cause decision paralysis", lift: "click-through to cart" },
    price_visible: { change: "move the price and the button above the fold on a phone", why: "a visitor who must scroll to learn the price often does not", lift: "add-to-cart rate" },
    page_type_fits: { change: "send this buyer to the page type their awareness calls for", why: "a cold buyer needs the story before the buy box", lift: "RPV on cold traffic" },
    continuity: { change: "put the ad's headline words in the hero, for the ad's buyer", why: "a page that continues the ad keeps the visitor's intent", lift: "conversion rate on that ad's traffic" },
    one_angle: { change: "cut the benefits that belong to another buyer's page", why: "a page that promises everything is believed by nobody", lift: "conversion rate" },
    so_what: { change: "rewrite each heading as what the buyer gets, with the feature as the reason", why: "skimmers read only headings", lift: "scroll depth and add-to-cart rate" },
    table_stakes_low: { change: "move shipping and service lines into small print and headline what is unique", why: "table stakes do not differentiate", lift: "conversion rate" },
    faq_objections: { change: "replace generic FAQ questions with the top objections from reviews and tickets", why: "unanswered objections send visitors to search elsewhere", lift: "conversion rate" },
    offer_present: { change: "test a bundle, routine or gift with purchase against the single unit", why: "the offer is the biggest lever on the page", lift: "AOV and RPV" },
    discount_depth: { change: "test a gift or bundle in place of the deep discount", why: "deep discounts erode margin and train buyers to wait", lift: "contribution per visitor" },
    saving_in_money: { change: "state savings in money beside any percent", why: "an amount reads as real; a percent needs maths", lift: "conversion rate" },
    reviews_present: { change: "add real reviews, photos and video first, near the buy box", why: "going from no reviews to about 80 can double conversion", lift: "conversion rate" },
    proof_matches_claim: { change: "pick the reviews that prove the headline's promise", why: "5 relevant reviews beat 400 generic ones", lift: "conversion rate" },
    reviews_real: { change: "remove any quote that is not a customer's real words", why: "invented proof is a legal and trust risk", lift: "trust (and avoids chargebacks)" },
    risk_reversal_near_cta: { change: "put the guarantee or free returns in 1 line under the main button", why: "risk reversal at the point of action removes the last doubt", lift: "add-to-cart rate" },
    sticky_cta: { change: "add a sticky buy button on phones once the hero scrolls away", why: "the button should never be more than a tap away", lift: "add-to-cart rate on mobile" },
    no_popup_on_load: { change: "trigger the pop-up on exit intent or scroll depth, not on arrival", why: "an arrival pop-up hides the page before it is read", lift: "bounce rate and conversion rate" },
    numbers_known: { change: "remove or source every number the brand does not state", why: "an unbacked number is a claim the brand cannot defend", lift: "trust" },
    forbidden_claims: { change: "remove the forbidden claim", why: "it breaks the brand's compliance rules", lift: "risk, not conversion" },
    no_em_dash: { change: "replace the dashes", why: "house style", lift: "none" },
    no_fake_urgency: { change: "remove urgency that is not wired to a real deadline or stock count", why: "fake urgency risks FTC action and trust", lift: "trust" },
    images_filled: { change: "fill every image slot with a real photo of the product or a customer", why: "the gallery is a mini landing page", lift: "add-to-cart rate" },
};
export interface BacklogItem extends CheckResult {
    hypothesis: string;
    cards: Pick<Card, "id" | "title" | "summary" | "use_when" | "domain">[];
}
export interface AuditResult {
    subject: "page" | "link";
    page_id: string | null;
    capture_id: string | null;
    url: string;
    title: string;
    checks: CheckResult[];
    score: number;
    backlog: BacklogItem[];
    shot: string | null;
    at: string;
}
export function backlogOf(checks: CheckResult[]): BacklogItem[] {
    return checks
        .filter((c) => c.status === "fail" || c.status === "warn")
        .sort((a, b) => (a.status === b.status ? b.ice - a.ice : a.status === "fail" ? -1 : 1))
        .map((c) => {
        const h = HYPOTHESIS[c.id];
        return {
            ...c,
            hypothesis: h ? `Change: ${h.change[0].toUpperCase()}${h.change.slice(1)}, because ${h.why}. Expected to lift: ${h.lift}.` : c.fix,
            cards: searchCards(`${c.label} ${c.fix}`, ["landing-pages", "cro"], 2).map(({ id, title, summary, use_when, domain }) => ({ id, title, summary, use_when, domain })),
        };
    });
}
export function auditPage(page: LandingPageRow): AuditResult {
    const ctx = landingContext(page.brand_id);
    const checks = checkPage({ kind: page.kind, brief: page.brief, ad: page.ad, sections: page.sections }, factsOf(ctx));
    return { subject: "page", page_id: page.id, capture_id: null, url: `/landing/pages/${page.id}`, title: page.title, checks, score: scoreOf(checks).score, backlog: backlogOf(checks), shot: null, at: new Date().toISOString() };
}
export function auditCapture(captureId: string, c: Capture, brand: BrandBrain | null): AuditResult {
    const checks = checkCapture(c, brand);
    return { subject: "link", page_id: null, capture_id: captureId, url: c.final_url, title: c.title || c.final_url, checks, score: scoreOf(checks).score, backlog: backlogOf(checks), shot: c.shot_fold, at: new Date().toISOString() };
}
