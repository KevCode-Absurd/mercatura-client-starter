import fs from "node:fs";
import path from "node:path";
import type { BrandBrain } from "../brand-brain";
import { env } from "../env";
import type { PersonaProfile } from "../personas/types";
import { kindForAwareness, type AdSnapshot, type Brief, type CheckResult, type PageKind, type Quote, type Section } from "./types";
interface ChecklistEntry {
    id: string;
    area: CheckResult["area"];
    applies: ("page" | "url")[];
    level: "fail" | "warn";
    label: string;
    fix: string;
    ice: [
        number,
        number,
        number
    ];
    only?: PageKind[];
}
let cached: ChecklistEntry[] | null = null;
export function checklist(): ChecklistEntry[] {
    if (!cached)
        cached = (JSON.parse(fs.readFileSync(path.join(env.SKILLS_DIR, "landing-pages", "checklist.json"), "utf-8")) as {
            checks: ChecklistEntry[];
        }).checks;
    return cached;
}
export interface PageFacts {
    brand: BrandBrain;
    personas: PersonaProfile[];
    knownQuotes: string[];
}
export interface CheckablePage {
    kind: PageKind;
    brief: Brief;
    ad: AdSnapshot | null;
    sections: Section[];
}
const STOP = new Set("the and for with that this your you are was have has not but from they them their what when will just more most into than then over only about after before also each every very much some such been were it's its our out get got one".split(" "));
export const contentWords = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
export function copyOf(sections: Section[]): {
    where: string;
    text: string;
}[] {
    const out: {
        where: string;
        text: string;
    }[] = [];
    const walk = (v: unknown, where: string) => {
        if (typeof v === "string") {
            if (v.trim())
                out.push({ where, text: v });
        }
        else if (Array.isArray(v))
            v.forEach((x) => walk(x, where));
        else if (v && typeof v === "object") {
            for (const [k, x] of Object.entries(v)) {
                if (["id", "type", "src", "offer_id", "bucket", "quote", "quotes", "who", "source", "ref"].includes(k))
                    continue;
                walk(x, where);
            }
        }
    };
    for (const s of sections.filter((x) => x.on))
        walk(s, s.type);
    return out;
}
export function quotesOf(sections: Section[]): Quote[] {
    const out: Quote[] = [];
    for (const s of sections.filter((x) => x.on)) {
        if (s.type === "reviews")
            out.push(...s.quotes);
        if (s.type === "reasons")
            for (const it of s.items)
                if (it.quote)
                    out.push(it.quote);
    }
    return out;
}
export function numbersIn(s: string): string[] {
    return (s.match(/\d[\d,]*(?:\.\d+)?\s*[kKmM]?\b/g) ?? []).map((n) => {
        const t = n.replace(/[,\s]/g, "").toLowerCase();
        const m = t.match(/^(\d+(?:\.\d+)?)([km]?)$/);
        if (!m)
            return t;
        return `${String(Number(m[1]))}${m[2]}`;
    });
}
export function knownNumbers(facts: PageFacts, page: CheckablePage): Set<string> {
    const b = facts.brand;
    const texts = [
        b.brand.one_liner,
        ...b.products.flatMap((p) => [p.name, p.format, ...(p.specs ?? []).map((x) => `${x.name} ${x.value}`), ...(p.ingredients ?? []).map((x) => `${x.name} ${x.dose}`), ...(p.variants ?? [])]),
        ...b.offers.flatMap((o) => [o.name, String(o.price), String(o.per_day ?? ""), o.notes ?? ""]),
        b.guarantee ? `${b.guarantee.text} ${b.guarantee.window_days}` : "",
        ...b.claims.filter((c) => c.status !== "rejected").map((c) => c.text),
        ...b.proof_assets,
        ...facts.personas.flatMap((p) => [p.angle, p.wants, p.summary, p.problem, p.name]),
        page.ad ? [page.ad.headline, ...page.ad.hooks, page.ad.primary_text].join(" ") : "",
        page.brief.rating ? `${page.brief.rating.value} ${page.brief.rating.count}` : "",
    ];
    const known = new Set(texts.flatMap(numbersIn));
    const prices = b.offers.map((o) => o.price);
    for (const a of prices)
        for (const c of prices)
            if (c > a)
                known.add(String(Math.round((c - a) * 100) / 100));
    for (const s of page.sections)
        if (s.type === "reasons")
            known.add(String(s.items.length));
    for (const n of ["1", "2", "3"])
        known.add(n);
    return known;
}
const GENERIC_FAQ = /shipping policy|return policy|about us|our story|who (are|is) (we|you)|how did .* (start|begin)|where (are|is) .* (based|located)|what payment|do you ship|track my order/i;
const TABLE_STAKES = /free shipping|fast (delivery|shipping)|great (customer )?service|customer service|secure checkout/i;
const URGENCY = /only \d+ left|ends (tonight|today|soon|at midnight)|hurry|last chance|countdown|selling out fast|limited time only|while (stocks|supplies) last/i;
const OUTCOME = /\b(you|your|get|feel|stop|never|no more|without|finally|keep|save|sleep|wake|lose|gain|enjoy|love|easy|easier|better|less|fewer|stick|quit|skip|end|fix|ditch|done|ready|covered|handled|in (a|1|one) )\b/i;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ent = (id: string) => checklist().find((c) => c.id === id);
export function result(id: string, status: CheckResult["status"], message: string): CheckResult {
    const e = ent(id);
    if (!e)
        throw new Error(`Check ${id} is not in checklist.json`);
    return { id, area: e.area, status, label: e.label, message, fix: status === "pass" || status === "na" ? "" : e.fix, ice: e.ice[0] * e.ice[1] * e.ice[2] };
}
const failOr = (id: string) => (ent(id)?.level === "fail" ? "fail" : "warn");
export function checkPage(page: CheckablePage, facts: PageFacts): CheckResult[] {
    const on = page.sections.filter((s) => s.on);
    const hero = on.find((s): s is Extract<Section, {
        type: "hero";
    }> => s.type === "hero");
    const copy = copyOf(page.sections);
    const all = copy.map((c) => c.text).join(" \n ");
    const quotes = quotesOf(page.sections);
    const brand = facts.brand;
    const out: CheckResult[] = [];
    const pdp = page.kind === "pdp";
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!hero || !hero.headline.trim())
        out.push(result("atf_what", "fail", "The page has no hero headline."));
    else {
        const h = norm(hero.headline);
        const names = [brand.brand.name, ...brand.products.map((p) => p.name)].map(norm);
        const words = hero.headline.trim().split(/\s+/).length;
        if (names.includes(h) || words < 3)
            out.push(result("atf_what", "fail", `The headline "${hero.headline}" names the product; it does not say what the buyer gets.`));
        else if (words > 18)
            out.push(result("atf_what", "warn", `The headline is ${words} words. A stranger reads about 10 at a glance.`));
        else
            out.push(result("atf_what", "pass", "The headline states an outcome."));
    }
    out.push(hero && hero.subhead.trim().split(/\s+/).length >= 6 ? result("atf_why_this", "pass", "A sub-line says why this one.") : result("atf_why_this", "warn", "No sub-line under the headline to say why this one: the mechanism or the difference."));
    if (pdp) {
        const now = !!hero && (hero.why_now.trim() || /a day/i.test(hero.price_line) || hero.options.some((o) => o.compare_at || o.per_day));
        out.push(now ? result("atf_why_now", "pass", "The first screen gives a reason to buy now (the offer or the price a day).") : result("atf_why_now", "warn", "Nothing in the first screen says why today: no offer, saving or price a day."));
    }
    else
        out.push(result("atf_why_now", "na", "A story page earns the offer lower down."));
    out.push(hero?.proof_line.trim() ? result("atf_trust", "pass", `Proof under the headline: "${hero.proof_line}".`) : result("atf_trust", "warn", "No proof under the headline: a rating, a count the brand states, or a customer's words."));
    if (page.kind === "advertorial")
        out.push(result("one_cta", "na", "An advertorial earns its call to action later."));
    else
        out.push(hero?.cta.trim() ? result("one_cta", "pass", `1 button in the first screen: "${hero.cta}".`) : result("one_cta", "warn", "The hero has no button."));
    if (pdp)
        out.push(hero && (hero.price_line.trim() || hero.options.length) ? result("price_visible", "pass", "The price is in the first screen.") : result("price_visible", "fail", "No price in the first screen of a product page."));
    const fits = kindForAwareness(page.brief.awareness);
    const named = (k: PageKind) => ({ pdp: "a product page", listicle: "a listicle", advertorial: "an advertorial" })[k];
    out.push(page.brief.taskBrief ? result("page_type_fits", "pass", `Chosen ${page.brief.taskBrief.structure} structure for the stated buying task: ${page.brief.taskBrief.buyerQuestion}. Awareness remains an editable assumption.`) : fits === page.kind ? result("page_type_fits", "pass", `${cap(named(page.kind))} suits a buyer who is ${page.brief.awareness.replace(/_/g, " ")}.`) : result("page_type_fits", "warn", `The buyer is ${page.brief.awareness.replace(/_/g, " ")}: ${named(fits)} usually suits them better than ${named(page.kind)}.`));
    if (page.ad) {
        const adWords = new Set(contentWords([page.ad.headline, ...page.ad.hooks.slice(0, 1)].join(" ")));
        const heroWords = new Set(contentWords(hero ? `${hero.headline} ${hero.subhead} ${hero.eyebrow}` : ""));
        const shared = [...adWords].filter((w) => heroWords.has(w));
        const need = Math.min(3, Math.max(1, Math.ceil(adWords.size / 2)));
        out.push(shared.length >= need ? result("continuity", "pass", `The hero carries the ad's words: ${shared.slice(0, 5).join(", ")}.`) : result("continuity", "fail", `The ad says "${page.ad.headline}"; the hero shares ${shared.length ? shared.join(", ") : "none of its words"}.`));
    }
    else
        out.push(result("continuity", "na", "Not built for an ad."));
    const benefitCount = on.filter((s) => s.type === "benefits").reduce((n, s) => n + (s.type === "benefits" ? s.items.length : 0), 0);
    out.push(benefitCount > 6 ? result("one_angle", "warn", `${benefitCount} benefits listed. A buyer who came for 1 believes it less when the page promises everything.`) : result("one_angle", "pass", `${benefitCount} benefits in the strip.`));
    const headings = on.flatMap((s) => (s.type === "value_prop" ? [s.headline] : s.type === "differentiators" ? s.items.map((i) => i.title) : s.type === "reasons" ? s.items.map((i) => i.title) : [])).filter((h) => h.trim());
    const flat = headings.filter((h) => !OUTCOME.test(h));
    out.push(!headings.length ? result("so_what", "na", "No section headings to read.") : flat.length > headings.length / 2 ? result("so_what", "warn", `${flat.length} of ${headings.length} headings read as features: ${flat.slice(0, 2).map((h) => `"${h}"`).join(", ")}.`) : result("so_what", "pass", "Most headings say what the buyer gets."));
    const stakes = [hero?.headline ?? "", ...headings].filter((h) => TABLE_STAKES.test(h));
    out.push(stakes.length ? result("table_stakes_low", "warn", `A table stake is a headline: "${stakes[0]}".`) : result("table_stakes_low", "pass", "No table stakes in the headlines."));
    const faq = on.find((s): s is Extract<Section, {
        type: "faq";
    }> => s.type === "faq");
    if (!faq || faq.items.length < 3)
        out.push(result("faq_objections", "warn", `${faq ? faq.items.length : "No"} FAQ answers. Answer at least the 3 reasons this buyer does not buy.`));
    else {
        const generic = faq.items.filter((f) => GENERIC_FAQ.test(f.q));
        out.push(generic.length ? result("faq_objections", "warn", `Generic questions in the FAQ: ${generic.map((g) => `"${g.q}"`).join(", ")}.`) : result("faq_objections", "pass", `${faq.items.length} questions, none of them generic.`));
    }
    const options = on.flatMap((s) => (s.type === "hero" || s.type === "offer" ? s.options : []));
    out.push(options.length || on.some((s) => s.type === "offer") ? result("offer_present", "pass", `${options.length} buying option${options.length === 1 ? "" : "s"} on the page.`) : result("offer_present", "warn", "No offer or buying options on the page."));
    const deep = options.filter((o) => o.compare_at && 1 - o.price / o.compare_at > 0.3);
    out.push(deep.length ? result("discount_depth", "warn", `"${deep[0].label}" is ${Math.round((1 - deep[0].price / deep[0].compare_at!) * 100)}% under the other price. Deep cuts train buyers to wait for sales; is there a gift or a bundle that does the job?`) : result("discount_depth", "pass", "No discount deeper than 30%."));
    const pctOnly = copy.filter((c) => /\d+\s*%\s*off|save\s*\d+\s*%/i.test(c.text) && !/[$£€₹¥]\s*\d/.test(c.text));
    out.push(pctOnly.length ? result("saving_in_money", "warn", `A saving shown only as a percent: "${pctOnly[0].text.slice(0, 80)}".`) : result("saving_in_money", "pass", "Savings are shown in money."));
    out.push(quotes.length >= 3 ? result("reviews_present", "pass", `${quotes.length} customer quotes.`) : result("reviews_present", "fail", quotes.length ? `Only ${quotes.length} customer quote${quotes.length === 1 ? "" : "s"}.` : "No customer quotes on the page."));
    const known = new Set(facts.knownQuotes.map(norm));
    const unreal = quotes.filter((q) => q.source !== "person" && !known.has(norm(q.text)));
    out.push(!quotes.length ? result("reviews_real", "na", "No quotes to check.") : unreal.length ? result("reviews_real", "fail", `${unreal.length} quote${unreal.length === 1 ? " is" : "s are"} not found word for word in the research or the brand's documents: "${unreal[0].text.slice(0, 70)}".`) : result("reviews_real", "pass", `Every quote is found word for word${quotes.some((q) => q.source === "person") ? " (or was entered by a person)" : ""}.`));
    const promise = new Set(contentWords(`${hero?.headline ?? ""} ${hero?.subhead ?? ""} ${page.brief.promise}`));
    const matching = quotes.filter((q) => contentWords(q.text).filter((w) => promise.has(w)).length >= 2);
    out.push(!quotes.length ? result("proof_matches_claim", "na", "No quotes yet.") : matching.length ? result("proof_matches_claim", "pass", `${matching.length} quote${matching.length === 1 ? " speaks" : "s speak"} to the page's promise.`) : result("proof_matches_claim", "warn", "No quote is about the page's promise. 5 relevant reviews beat 400 generic ones."));
    if (page.kind === "advertorial")
        out.push(result("risk_reversal_near_cta", on.some((s) => s.type === "offer" && s.risk_line.trim()) || on.some((s) => s.type === "guarantee") ? "pass" : "warn", "The guarantee sits with the offer at the end of the story."));
    else
        out.push(hero?.risk_line.trim() ? result("risk_reversal_near_cta", "pass", `Under the button: "${hero.risk_line}".`) : result("risk_reversal_near_cta", "warn", "Nothing under the main button to take the risk away."));
    out.push(on.some((s) => s.type === "sticky_cta") ? result("sticky_cta", "pass", "A button follows the visitor once the hero is gone.") : result("sticky_cta", "warn", "No sticky button for phones."));
    const nums = knownNumbers(facts, page);
    const unknown = copy.flatMap((c) => numbersIn(c.text).filter((n) => !nums.has(n)).map((n) => ({ n, where: c.where, text: c.text })));
    out.push(unknown.length ? result("numbers_known", failOr("numbers_known"), `${unknown.length} number${unknown.length === 1 ? "" : "s"} the brand does not state: ${[...new Set(unknown.map((u) => u.n))].slice(0, 4).join(", ")} (in ${unknown[0].where}: "${unknown[0].text.slice(0, 70)}").`) : result("numbers_known", "pass", "Every number is one the brand states."));
    const allWithQuotes = `${all} \n ${quotes.map((q) => q.text).join(" \n ")}`;
    const forbidden = brand.forbidden_claims.filter((f) => f.trim() && new RegExp(`\\b${f.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(allWithQuotes));
    out.push(forbidden.length ? result("forbidden_claims", "fail", `Forbidden by the brand: ${forbidden.map((f) => `"${f}"`).join(", ")}.`) : result("forbidden_claims", "pass", "None of the brand's forbidden claims."));
    const dashes = copy.filter((c) => /[—–]/.test(c.text));
    out.push(dashes.length ? result("no_em_dash", "warn", `${dashes.length} line${dashes.length === 1 ? " has" : "s have"} a dash: "${dashes[0].text.slice(0, 60)}".`) : result("no_em_dash", "pass", "No em dashes."));
    const facts_ = [brand.brand.one_liner, ...brand.offers.map((o) => o.notes ?? ""), ...brand.claims.map((c) => c.text)].join(" ");
    const urgent = copy.filter((c) => URGENCY.test(c.text) && !URGENCY.test(facts_));
    out.push(urgent.length ? result("no_fake_urgency", "fail", `Urgency the brand does not state: "${urgent[0].text.slice(0, 70)}".`) : result("no_fake_urgency", "pass", "No invented urgency."));
    if (page.kind === "advertorial") {
        const reasons = on.find((s): s is Extract<Section, {
            type: "reasons";
        }> => s.type === "reasons");
        const n = reasons?.items.length ?? 0;
        out.push(n ? result("five_reasons", "pass", `${n} supported reason${n === 1 ? "" : "s"}; evidence determines the count.`) : result("five_reasons", "na", "No separate reasons block. The chosen buying task may need a focused answer instead."));
        const at = (k: number) => !!reasons?.items[k]?.quote;
        out.push(!reasons ? result("proof_at_doubt", "na", "No reasons to place proof after.") : at(1) && at(3) ? result("proof_at_doubt", "pass", "A customer's words follow reasons 2 and 4.") : result("proof_at_doubt", "warn", `Proof is ${at(1) || at(3) ? "after only 1 of reasons 2 and 4" : "not placed after reasons 2 and 4"}: put a real quote where doubt peaks.`));
        const early = on.filter((s) => ["hero", "story", "problem", "reasons", "value_prop"].includes(s.type));
        const priced = copyOf(early).filter((c) => !/^["“]/.test(c.text.trim()) && /[$£€₹¥]\s*\d|\d+(\.\d+)?\s*(a|per) day\b/i.test(c.text));
        out.push(priced.length ? result("price_once_late", "warn", `A price before the buy box, in the ${priced[0].where}: "${priced[0].text.slice(0, 60)}".`) : result("price_once_late", "pass", "No price before the buy box."));
        const story = on.find((s): s is Extract<Section, {
            type: "story";
        }> => s.type === "story");
        const names = [brand.brand.name, ...brand.products.map((p) => p.name)].filter((x) => x.trim().length > 2);
        const named = story ? story.paragraphs.slice(0, 2).filter((para) => names.some((x) => para.toLowerCase().includes(x.toLowerCase()))) : [];
        out.push(!story ? result("lede_no_product", "na", "No lede.") : named.length ? result("lede_no_product", "warn", `The lede names the product: "${named[0].slice(0, 60)}". It enters at reason 1.`) : result("lede_no_product", "pass", "The lede describes her situation and names nothing."));
        const hw = hero ? hero.headline.trim().split(/\s+/).filter(Boolean).length : 0;
        out.push(!hero ? result("headline_formula", "na", "No headline.") : hw >= 8 && hw <= 14 ? result("headline_formula", "pass", `${hw} words.`) : result("headline_formula", "warn", `The headline is ${hw} words; a formula headline is 8 to 14, naming the audience and the problem.`));
        const fq = on.find((s): s is Extract<Section, {
            type: "faq";
        }> => s.type === "faq")?.items.length ?? 0;
        out.push(fq >= 6 && fq <= 8 ? result("faq_six_to_eight", "pass", `${fq} questions.`) : result("faq_six_to_eight", "warn", `${fq} question${fq === 1 ? "" : "s"} in the FAQ; 6 to 8 real ones clear the last doubts.`));
    }
    else
        for (const id of ["five_reasons", "proof_at_doubt", "price_once_late", "lede_no_product", "headline_formula", "faq_six_to_eight"])
            out.push(result(id, "na", "An advertorial's check."));
    const slots = on.flatMap((s) => (s.type === "hero" ? s.images : "image" in s ? [s.image] : s.type === "reasons" ? s.items.map((i) => i.image) : []));
    const empty = slots.filter((x) => !x.src.trim()).length;
    out.push(empty ? result("images_filled", "warn", `${empty} of ${slots.length} image slots still to fill.`) : result("images_filled", "pass", `All ${slots.length} images are in place.`));
    return out;
}
export function scoreOf(checks: CheckResult[]): {
    score: number;
    fails: number;
    warns: number;
} {
    const live = checks.filter((c) => c.status !== "na");
    const fails = live.filter((c) => c.status === "fail").length;
    const warns = live.filter((c) => c.status === "warn").length;
    const weight = live.length + fails;
    return { score: weight ? Math.round(((live.length - fails - warns) / weight) * 100) : 0, fails, warns };
}
